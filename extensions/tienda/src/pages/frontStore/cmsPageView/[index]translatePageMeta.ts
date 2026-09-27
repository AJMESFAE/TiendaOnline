import { error } from '@evershop/evershop/lib/log';
import { getContextValue, setContextValue } from '@evershop/evershop/graphql/services';
import { contentLocale, translatedPage } from '../../../services/content.js';

/** Título de la pestaña y ruta de navegación de la página traducida (/en/aviso-legal…). */
export default async (request, response, next) => {
  try {
    const locale = contentLocale();
    const urlKey = request.params?.url_key;
    if (locale && urlKey) {
      const page = await translatedPage(urlKey, locale);
      if (page) {
        const current = getContextValue(request, 'pageInfo', {}) as Record<string, unknown>;
        setContextValue(request, 'pageInfo', {
          ...current,
          title: page.metaTitle || page.name,
          description: page.metaDescription || page.metaTitle || current.description
        });
      }
    }
  } catch (e) {
    error(e);
  }
  next();
};
