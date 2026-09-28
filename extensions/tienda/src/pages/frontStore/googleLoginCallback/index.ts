import { error } from '@evershop/evershop/lib/log';
import {
  CustomerDisabledError,
  findOrCreateCustomer,
  finishLogin,
  OAuthState,
  safeReturnPath,
  STATE_COOKIE
} from '../../../services/googleAuth.js';
import { loginPageUrl } from '../../../services/googleLoginRoutes.js';
import { saveCustomerLocale } from '../../../services/customerLocale.js';

/** Vuelta desde Google: valida, busca o crea el cliente, inicia su sesión y vuelve a la tienda. */
export default async (request, response) => {
  let saved: OAuthState | null = null;
  try {
    saved = JSON.parse(request.signedCookies?.[STATE_COOKIE] || 'null');
  } catch {
    saved = null;
  }
  response.clearCookie(STATE_COOKIE, { path: '/auth/google' });
  const locale = saved?.locale;
  try {
    const { code, state } = request.query || {};
    if (!saved || typeof state !== 'string' || state !== saved.state) {
      return response.redirect(302, await loginPageUrl(locale, 'failed'));
    }
    // El cliente canceló en la pantalla de Google.
    if (request.query.error || typeof code !== 'string') {
      return response.redirect(302, await loginPageUrl(locale));
    }
    const profile = await finishLogin(code, saved);
    await saveCustomerLocale(profile.email, locale);
    const { customerId } = await findOrCreateCustomer(profile);
    request.session.customerID = customerId;
    request.session.save((e) => {
      if (e) {
        error(e);
        loginPageUrl(locale, 'failed').then((u) => response.redirect(302, u));
      } else {
        response.redirect(302, safeReturnPath(saved!.returnTo));
      }
    });
  } catch (e) {
    error(e);
    const reason = e instanceof CustomerDisabledError ? 'disabled' : 'failed';
    response.redirect(302, await loginPageUrl(locale, reason));
  }
};
