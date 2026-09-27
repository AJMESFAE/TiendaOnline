import { error } from '@evershop/evershop/lib/log';
import { switchLocalePath } from '@evershop/evershop/lib/locale/localeResolution';
import { getEnabledLanguages, getStoreLanguage } from '@evershop/evershop/setting/services';
import { deviceLanguage, LANG_COOKIE } from '../../../services/language.js';

const YEAR = 365 * 24 * 60 * 60 * 1000;

/**
 * Abre la tienda en el idioma del dispositivo y recuerda la elección.
 *
 *  - Primera visita (sin cookie): idioma del dispositivo (ver deviceLanguage);
 *    si no es el español (idioma por defecto, sin prefijo), redirige a /ar/… o /en/….
 *  - Visitas siguientes a una página en español: si la preferencia guardada es otra,
 *    redirige a ella (p. ej. al volver de Redsys o desde fundacionandalusi.org).
 *  - Cambiar de idioma con el selector, o con ?lang=xx, guarda la nueva preferencia.
 */
export default async (request, response, next) => {
  try {
    if (request.method !== 'GET') return next();
    const enabled: string[] = await getEnabledLanguages();
    if (enabled.length < 2) return next();
    const def: string = await getStoreLanguage();
    const current: string = request.locale || def;
    const [path, search = ''] = String(request.originalUrl).split('?');
    const query = new URLSearchParams(search);
    const remember = (lang: string) =>
      response.cookie(LANG_COOKIE, lang, { maxAge: YEAR, sameSite: 'lax', path: '/', httpOnly: false });
    const withQuery = (p: string) => (query.toString() ? `${p}?${query.toString()}` : p);

    // Elección explícita: ?lang=ar|es|en
    const explicit = query.get('lang');
    if (explicit && enabled.includes(explicit)) {
      remember(explicit);
      query.delete('lang');
      return response.redirect(302, withQuery(switchLocalePath(path, explicit, def, enabled)));
    }

    const saved = enabled.includes(request.cookies?.[LANG_COOKIE]) ? request.cookies[LANG_COOKIE] : null;
    // Página con prefijo (/ar/…, /en/…): se sirve tal cual.
    if (current !== def) {
      if (saved !== current) remember(current);
      return next();
    }
    // Página en español: el cliente ha llegado desde la propia tienda (selector de
    // idioma o un enlace en español) → esa es su elección.
    let sameSite = false;
    try {
      sameSite = new URL(String(request.headers.referer || '')).host === request.headers.host;
    } catch {
      // sin referer
    }
    if (saved && saved !== def && sameSite) {
      remember(def);
      return next();
    }
    const preferred = saved || deviceLanguage(request.headers['accept-language']) || def;
    if (!saved) remember(preferred);
    if (preferred !== def && enabled.includes(preferred)) {
      response.setHeader('Vary', 'Accept-Language, Cookie');
      return response.redirect(302, withQuery(switchLocalePath(path, preferred, def, enabled)));
    }
  } catch (e) {
    error(e);
  }
  next();
};
