import { select } from '@evershop/postgres-query-builder';
import { getContextValue, setContextValue } from '@evershop/evershop/graphql/services';
import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { contentLocale, productName } from '../../../services/content.js';

/** Título de la pestaña del producto en el idioma de la visita (/ar/alifato…). */
export default async (request, response, next) => {
  try {
    const locale = contentLocale();
    const productId = getContextValue(request, 'productId');
    if (locale && productId) {
      const product = await select('sku').from('product').where('product_id', '=', productId).load(pool);
      const name = product && productName(product.sku, '', locale);
      if (name) {
        const current = getContextValue(request, 'pageInfo', {}) as Record<string, unknown>;
        setContextValue(request, 'pageInfo', { ...current, title: name, description: name });
      }
    }
  } catch (e) {
    error(e);
  }
  next();
};
