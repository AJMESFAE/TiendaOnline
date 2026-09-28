import { error } from '@evershop/evershop/lib/log';
import { getBaseUrl } from '@evershop/evershop/lib/util/getBaseUrl';
import { getEnabledLanguages } from '@evershop/evershop/setting/services';
import { googleLoginEnabled, safeReturnPath, startLogin, STATE_COOKIE } from '../../../services/googleAuth.js';
import { localePrefix, loginPageUrl } from '../../../services/googleLoginRoutes.js';

/** /auth/google?redirect=/ruta → pantalla de Google para elegir la cuenta. */
export default async (request, response) => {
  try {
    const returnTo = safeReturnPath(request.query?.redirect, `${await localePrefix(request.locale)}/`);
    // Idioma de la página desde la que se entra (/ar/…, /en/…): el de la cuenta y los correos.
    const enabled: string[] = await getEnabledLanguages();
    const prefix = returnTo.match(/^\/([a-z]{2})(?=[/?#]|$)/)?.[1];
    const locale = prefix && enabled.includes(prefix) ? prefix : request.locale;
    if (!googleLoginEnabled()) return response.redirect(302, await loginPageUrl(locale));
    if (request.isCustomerLoggedIn()) return response.redirect(302, returnTo);
    const { url, saved } = startLogin(returnTo, locale || 'es');
    response.cookie(STATE_COOKIE, JSON.stringify(saved), {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: getBaseUrl().startsWith('https://'),
      maxAge: 10 * 60 * 1000,
      path: '/auth/google'
    });
    response.redirect(302, url);
  } catch (e) {
    error(e);
    response.redirect(302, await loginPageUrl(request.locale, 'failed'));
  }
};
