import { error } from '@evershop/evershop/lib/log';
import { saveCustomerLocale } from '../../services/customerLocale.js';

/** Al crear la cuenta se guarda el idioma de la web (correo de bienvenida y siguientes). */
export default async (request, response, next) => {
  try {
    await saveCustomerLocale(request.body?.email, request.locale);
  } catch (e) {
    error(e);
  }
  next();
};
