import { error } from '@evershop/evershop/lib/log';
import { restorePendingRedsysCart } from '../../../services/restorePendingCart.js';

/** Vuelta a la tienda sin completar el pago en Redsys: recupera el carrito. */
export default async (request, response, next) => {
  try {
    await restorePendingRedsysCart(request.sessionID);
  } catch (e) {
    error(e);
  }
  next();
};
