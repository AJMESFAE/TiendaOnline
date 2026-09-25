import { select, update } from '@evershop/postgres-query-builder';
import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { buildAbsoluteUrl } from '@evershop/evershop/lib/router';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import {
  assertConfigured,
  getRedsysConfig,
  REDSYS_ENDPOINTS
} from '../../services/getRedsysConfig.js';
import {
  buildRedsysOrderNumber,
  MerchantParameters,
  signRequest,
  toRedsysAmount
} from '../../services/signature.js';

/** Redsys solo admite texto plano: quitamos diacríticos (ā → a) y símbolos raros. */
function plain(text: string, max: number): string {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.,\-ñÑçÇ]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * Prepara el formulario firmado que el navegador envía (POST) al TPV de Redsys.
 * Se llama desde el checkout justo después de crear el pedido en EverShop.
 */
export default async (request, response, next) => {
  try {
    const { order_id } = request.body;
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', '=', 'redsys')
      .and('payment_status', '=', 'pending')
      .load(pool);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        error: { status: INVALID_PAYLOAD, message: 'Pedido no válido' }
      });
    }

    const redsys = await getRedsysConfig();
    assertConfigured(redsys);

    // Número de operación único por intento (Redsys no admite repetirlo).
    const redsysOrder = buildRedsysOrderNumber(order.order_number);
    const params: MerchantParameters = {
      DS_MERCHANT_AMOUNT: toRedsysAmount(order.grand_total),
      DS_MERCHANT_ORDER: redsysOrder,
      DS_MERCHANT_MERCHANTCODE: redsys.merchantCode,
      DS_MERCHANT_CURRENCY: redsys.currency,
      DS_MERCHANT_TRANSACTIONTYPE: '0',
      DS_MERCHANT_TERMINAL: redsys.terminal,
      DS_MERCHANT_MERCHANTURL: buildAbsoluteUrl('redsysNotification'),
      DS_MERCHANT_URLOK: buildAbsoluteUrl('redsysOk', { order_id }),
      DS_MERCHANT_URLKO: buildAbsoluteUrl('redsysKo', { order_id }),
      DS_MERCHANT_MERCHANTNAME: plain(redsys.merchantName, 25),
      DS_MERCHANT_CONSUMERLANGUAGE: redsys.consumerLanguage,
      DS_MERCHANT_PRODUCTDESCRIPTION: plain(`Pedido ${order.order_number}`, 125),
      DS_MERCHANT_MERCHANTDATA: order.uuid
    };
    if (order.customer_full_name) {
      params.DS_MERCHANT_TITULAR = plain(order.customer_full_name, 60);
    }
    if (redsys.payMethods) {
      params.DS_MERCHANT_PAYMETHODS = redsys.payMethods;
    }

    await update('order')
      .given({ integration_order_id: redsysOrder })
      .where('order_id', '=', order.order_id)
      .execute(pool);

    response.status(OK);
    return response.json({
      data: {
        action: REDSYS_ENDPOINTS[redsys.environment].redirect,
        fields: signRequest(redsys.secretKey, params)
      }
    });
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: 'No se ha podido iniciar el pago con Redsys'
      }
    });
  }
};
