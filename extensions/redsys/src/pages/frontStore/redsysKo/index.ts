import { select } from '@evershop/postgres-query-builder';
import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { buildUrl } from '@evershop/evershop/lib/router';
import { processRedsysResponse } from '../../../services/processRedsysResponse.js';
import { cancelAndRestoreCart } from '../../../services/restorePendingCart.js';

/**
 * URL KO: el pago se ha denegado o el cliente lo ha cancelado en el TPV.
 * Se cancela el pedido (reponiendo stock, sin factura) y se reactiva el carrito:
 * el cliente vuelve al carrito con sus productos para intentarlo de nuevo.
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
    .and('sid', '=', request.sessionID || '')
    .load(pool);

  if (!order) {
    response.redirect(302, buildUrl('homepage'));
    return;
  }
  if (order.payment_status === 'redsys_captured') {
    // El pago se completó (p. ej. tras un reintento en el TPV).
    response.redirect(302, `${buildUrl('checkoutSuccess')}/${order_id}`);
    return;
  }
  await cancelAndRestoreCart(order, 'Pago no completado en Redsys');
  response.redirect(302, `${buildUrl('cart')}?payment=failed`);
};
