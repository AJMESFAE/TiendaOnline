import { error } from '@evershop/evershop/lib/log';
import { saveCartLocale, saveCustomerLocale } from '../../services/customerLocale.js';

/** Al realizar el pedido se guarda el idioma en que se ha comprado (el de la web). */
export default async (request, response, next) => {
  try {
    await saveCartLocale(request.params?.cart_id, request.locale);
    if (request.body?.email) await saveCustomerLocale(request.body.email, request.locale);
  } catch (e) {
    error(e);
  }
  next();
};
