import { insert, select } from '@evershop/postgres-query-builder';
import { emit } from '@evershop/evershop/lib/event';
import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import {
  addOrderActivityLog,
  updatePaymentStatus
} from '@evershop/evershop/oms/services';
import {
  assertConfigured,
  getRedsysConfig,
  REDSYS_ENDPOINTS
} from '../../services/getRedsysConfig.js';
import {
  decodeMerchantParameters,
  isRefundAccepted,
  signRequest,
  toRedsysAmount,
  verifySignature
} from '../../services/signature.js';

function fail(response, status: number, message: string) {
  response.status(status);
  return response.json({ error: { status, message } });
}

/**
 * Devolución total o parcial de un pedido pagado con Redsys, mediante la API
 * REST del TPV (Ds_Merchant_TransactionType = 3). Solo administradores.
 */
export default async (request, response, next) => {
  try {
    const { order_id, amount } = request.body;
    const order = await select()
      .from('order')
      .where('uuid', '=', String(order_id))
      .and('payment_method', '=', 'redsys')
      .load(pool);
    if (
      !order ||
      !['redsys_captured', 'redsys_partial_refunded'].includes(
        order.payment_status
      ) ||
      !order.integration_order_id
    ) {
      return fail(response, INVALID_PAYLOAD, 'Pedido no válido para devolución');
    }

    const refunds = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .and('payment_action', '=', 'refund')
      .execute(pool);
    const alreadyRefunded = refunds.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );
    const requested = Math.round(Number(amount) * 100) / 100;
    const refundable =
      Math.round((Number(order.grand_total) - alreadyRefunded) * 100) / 100;
    if (!(requested > 0) || requested > refundable) {
      return fail(
        response,
        INVALID_PAYLOAD,
        `El importe debe estar entre 0,01 y ${refundable.toFixed(2)} ${order.currency}`
      );
    }

    const redsys = await getRedsysConfig();
    assertConfigured(redsys);
    const body = signRequest(redsys.secretKey, {
      DS_MERCHANT_AMOUNT: toRedsysAmount(requested),
      DS_MERCHANT_ORDER: order.integration_order_id,
      DS_MERCHANT_MERCHANTCODE: redsys.merchantCode,
      DS_MERCHANT_CURRENCY: redsys.currency,
      DS_MERCHANT_TRANSACTIONTYPE: '3',
      DS_MERCHANT_TERMINAL: redsys.terminal
    });

    const res = await fetch(REDSYS_ENDPOINTS[redsys.environment].rest, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
    const data = (await res.json()) as Record<string, string>;
    if (data.errorCode) {
      return fail(
        response,
        INVALID_PAYLOAD,
        `Redsys ha rechazado la devolución (${data.errorCode})`
      );
    }
    const params = decodeMerchantParameters(data.Ds_MerchantParameters || '');
    if (
      !verifySignature(
        redsys.secretKey,
        params.Ds_Order,
        data.Ds_MerchantParameters,
        data.Ds_Signature
      )
    ) {
      throw new Error('Firma no válida en la respuesta de devolución de Redsys');
    }
    if (!isRefundAccepted(params.Ds_Response)) {
      return fail(
        response,
        INVALID_PAYLOAD,
        `Redsys no ha aceptado la devolución (Ds_Response ${params.Ds_Response})`
      );
    }

    const refunded = Number(params.Ds_Amount) / 100;
    await insert('payment_transaction')
      .given({
        payment_transaction_order_id: order.order_id,
        transaction_id: `${order.integration_order_id}-R${Date.now()}`,
        parent_transaction_id: order.integration_order_id,
        amount: refunded,
        payment_action: 'refund',
        transaction_type: 'online',
        additional_information: JSON.stringify(params)
      })
      .execute(pool);
    const fullyRefunded =
      alreadyRefunded + refunded >= Number(order.grand_total) - 0.001;
    await updatePaymentStatus(
      order.order_id,
      fullyRefunded ? 'redsys_refunded' : 'redsys_partial_refunded'
    );
    await addOrderActivityLog(
      order.order_id,
      `Devolución Redsys de ${refunded.toFixed(2)} ${order.currency}`,
      false,
      pool as any
    );

    // Otras extensiones (p. ej. Odoo: factura rectificativa) reaccionan a la devolución.
    await emit('order_refunded', { order_id: order.order_id, amount: refunded });

    response.status(OK);
    return response.json({ data: { amount: refunded } });
  } catch (e) {
    error(e);
    return fail(response, INTERNAL_SERVER_ERROR, e.message);
  }
};
