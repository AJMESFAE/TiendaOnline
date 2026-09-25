import {
  commit,
  insertOnUpdate,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '@evershop/evershop/lib/event';
import { debug, error, warning } from '@evershop/evershop/lib/log';
import { getConnection, pool } from '@evershop/evershop/lib/postgres';
import {
  addOrderActivityLog,
  updatePaymentStatus
} from '@evershop/evershop/oms/services';
import { getRedsysConfig } from './getRedsysConfig.js';
import {
  decodeMerchantParameters,
  getOrderFromParameters,
  isAuthorizedResponse,
  toRedsysAmount,
  verifySignature
} from './signature.js';

export class RedsysSignatureError extends Error {}

export interface RedsysSignedResponse {
  Ds_SignatureVersion?: string;
  Ds_MerchantParameters?: string;
  Ds_Signature?: string;
}

export type ProcessResult =
  | { outcome: 'paid'; order: any }
  | { outcome: 'already_paid'; order: any }
  | { outcome: 'failed'; order: any; code: string }
  | { outcome: 'ignored'; order: any | null; reason: string };

const PAID_STATUSES = [
  'redsys_captured',
  'redsys_refunded',
  'redsys_partial_refunded'
];

/**
 * Verifica y aplica una respuesta de Redsys (notificación online o parámetros
 * añadidos a la URL OK/KO). Es idempotente: la notificación y el retorno del
 * navegador pueden llegar en cualquier orden, o repetidos, y el pedido solo se
 * marca como pagado (y se emite `order_placed`, que envía el email de
 * confirmación) una única vez.
 */
export async function processRedsysResponse(
  body: RedsysSignedResponse
): Promise<ProcessResult> {
  const { Ds_MerchantParameters, Ds_Signature, Ds_SignatureVersion } = body;
  if (!Ds_MerchantParameters || !Ds_Signature) {
    throw new RedsysSignatureError('Respuesta de Redsys incompleta');
  }
  if (Ds_SignatureVersion && Ds_SignatureVersion !== 'HMAC_SHA256_V1') {
    throw new RedsysSignatureError(
      `Versión de firma no soportada: ${Ds_SignatureVersion}`
    );
  }
  const redsys = await getRedsysConfig();
  const params = decodeMerchantParameters(Ds_MerchantParameters);
  const redsysOrder = getOrderFromParameters(params);
  if (
    !verifySignature(
      redsys.secretKey,
      redsysOrder,
      Ds_MerchantParameters,
      Ds_Signature
    )
  ) {
    throw new RedsysSignatureError(
      `Firma de Redsys no válida para el pedido ${redsysOrder}`
    );
  }

  const connection = await getConnection();
  await startTransaction(connection);
  // commit/rollback liberan la conexión: nunca hacer rollback tras cerrarla.
  let open = true;
  const finish = async (ok: boolean) => {
    open = false;
    await (ok ? commit(connection) : rollback(connection));
  };
  try {
    // Bloqueo de fila: notificación y retorno concurrentes se serializan aquí.
    const locked = await (connection as any).query(
      `SELECT order_id FROM "order" WHERE integration_order_id = $1 AND payment_method = 'redsys' FOR UPDATE`,
      [redsysOrder]
    );
    if (locked.rows.length === 0) {
      await finish(false);
      return { outcome: 'ignored', order: null, reason: 'order_not_found' };
    }
    const order = await select()
      .from('order')
      .where('order_id', '=', locked.rows[0].order_id)
      .load(connection, false);

    if (PAID_STATUSES.includes(order.payment_status)) {
      await finish(false);
      return { outcome: 'already_paid', order };
    }

    const code = params.Ds_Response ?? '';
    const expectedAmount = toRedsysAmount(order.grand_total);
    const mismatches: string[] = [];
    if (String(params.Ds_Amount) !== expectedAmount) {
      mismatches.push(`importe ${params.Ds_Amount} ≠ ${expectedAmount}`);
    }
    if (String(params.Ds_Currency) !== String(redsys.currency)) {
      mismatches.push(`moneda ${params.Ds_Currency} ≠ ${redsys.currency}`);
    }
    if (
      params.Ds_MerchantCode &&
      String(params.Ds_MerchantCode) !== String(redsys.merchantCode)
    ) {
      mismatches.push(`comercio ${params.Ds_MerchantCode}`);
    }

    if (isAuthorizedResponse(code) && mismatches.length === 0) {
      if (order.payment_status === 'canceled' || order.status === 'canceled') {
        // Pago tardío sobre un pedido ya cancelado (p. ej. por el cron de
        // abandonados). No se reabre el pedido: se deja constancia para que
        // la administración lo revise y devuelva el importe si procede.
        await addOrderActivityLog(
          order.order_id,
          `ATENCIÓN: Redsys ha autorizado el pago (${params.Ds_AuthorisationCode}) de un pedido ya cancelado. Revise el pedido y realice la devolución si corresponde.`,
          false,
          connection
        );
        await finish(true);
        warning(`Redsys: pago autorizado para el pedido cancelado ${order.uuid}`);
        return { outcome: 'ignored', order, reason: 'order_canceled' };
      }
      await insertOnUpdate('payment_transaction', [
        'transaction_id',
        'payment_transaction_order_id'
      ])
        .given({
          payment_transaction_order_id: order.order_id,
          transaction_id: redsysOrder,
          amount: Number(params.Ds_Amount) / 100,
          payment_action: 'capture',
          transaction_type: 'online',
          additional_information: JSON.stringify(params)
        })
        .execute(connection);
      await updatePaymentStatus(order.order_id, 'redsys_captured', connection);
      await addOrderActivityLog(
        order.order_id,
        `Pago con Redsys autorizado. Pedido TPV: ${redsysOrder}. Código de autorización: ${
          params.Ds_AuthorisationCode ?? '-'
        }${params.Ds_Card_Brand ? `. Marca: ${params.Ds_Card_Brand}` : ''}`,
        false,
        connection
      );
      await finish(true);

      const freshOrder = await select()
        .from('order')
        .where('order_id', '=', order.order_id)
        .load(pool);
      try {
        await emit('order_placed', { ...(freshOrder ?? order) });
      } catch (e) {
        error(e);
      }
      return { outcome: 'paid', order: freshOrder ?? order };
    }

    // Pago denegado (o respuesta autorizada con datos que no cuadran).
    if (order.payment_status === 'pending') {
      await updatePaymentStatus(order.order_id, 'redsys_failed', connection);
    }
    await addOrderActivityLog(
      order.order_id,
      mismatches.length > 0
        ? `Respuesta de Redsys rechazada por discrepancia: ${mismatches.join(', ')} (Ds_Response ${code})`
        : `Pago con Redsys denegado (Ds_Response ${code})`,
      false,
      connection
    );
    await finish(true);
    debug(`Redsys: pago denegado para el pedido ${order.uuid} (${code})`);
    return { outcome: 'failed', order, code };
  } catch (e) {
    if (open) {
      await rollback(connection);
    }
    throw e;
  }
}
