import { translate } from '@evershop/evershop/lib/locale/translate/translate';
import { contentLocale, productName, translatedPage } from '../../../services/content.js';

/** Nombre del método de envío (se guarda en español en el panel). */
const shippingName = (name) => {
  const locale = contentLocale();
  return name && locale ? translate(name, {}, locale) : name;
};

/** Nombres de producto y páginas de contenido en el idioma de la visita (ver services/content). */
export default {
  Product: {
    name: (product) => productName(product.sku, product.name)
  },
  CartItem: {
    productName: (item) => productName(item.productSku, item.productName)
  },
  AvailableShippingMethod: {
    name: (method) => shippingName(method.name)
  },
  Cart: {
    shippingMethodName: (cart) => shippingName(cart.shippingMethodData?.snapshot?.name ?? null)
  },
  Order: {
    shippingMethodName: (order) => shippingName(order.shippingMethodName ?? null)
  },
  OrderItem: {
    productName: (item) => productName(item.productSku, item.productName)
  },
  CmsPage: {
    name: async (page) => (await translatedPage(page.urlKey))?.name ?? page.name,
    metaTitle: async (page) => (await translatedPage(page.urlKey))?.metaTitle ?? page.metaTitle,
    metaDescription: async (page) => (await translatedPage(page.urlKey))?.metaDescription ?? page.metaDescription,
    content: async (page) => {
      const translated = await translatedPage(page.urlKey);
      for (const raw of [translated?.content, page.content]) {
        if (!raw) continue;
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          // contenido que no es JSON: se prueba el original
        }
      }
      return [];
    }
  }
};
