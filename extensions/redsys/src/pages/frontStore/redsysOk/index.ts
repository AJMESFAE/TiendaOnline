import { select } from '@evershop/postgres-query-builder';
import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { buildUrl } from '@evershop/evershop/lib/router';
import { processRedsysResponse } from '../../../services/processRedsysResponse.js';

/**
 * URL OK: el cliente vuelve del TPV tras un pago autorizado. La confirmación
 * real llega por la notificación online; si Redsys añade los parámetros
 * firmados a la URL, los procesamos también (idempotente) por si la
 * notificación se retrasa.
 *
 * El tercer parámetro (next) es necesario aunque no se use: un middleware de
 * página con dos parámetros se trata como pasivo y continúa el renderizado.
 */
export default async (request, response, next) => {
  const { order_id } = request.params;
  try {
    if (request.query?.Ds_MerchantParameters && request.query?.Ds_Signature) {
      await processRedsysResponse({
        Ds_SignatureVersion: String(request.query.Ds_SignatureVersion || ''),
        Ds_MerchantParameters: String(request.query.Ds_MerchantParameters),
        Ds_Signature: String(request.query.Ds_Signature)
      });
    }
  } catch (e) {
    error(e);
  }

  const order = await select()
    .from('order')
    .where('uuid', '=', order_id)
    .and('payment_method', '=', 'redsys')
    .load(pool);
  if (!order) {
    response.redirect(302, buildUrl('homepage'));
    return;
  }
  if (order.payment_status === 'redsys_failed') {
    response.redirect(302, buildUrl('redsysKo', { order_id }));
    return;
  }
  response.redirect(302, `${buildUrl('checkoutSuccess')}/${order_id}`);
};
