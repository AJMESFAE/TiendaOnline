import { select } from '@evershop/postgres-query-builder';
import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { addFinalProcessor, addProcessor } from '@evershop/evershop/lib/util/registry';
import { customerGroupCouponValidator, requiredProductByPriceValidator } from './services/customerGroups.js';
import { registerEmailCurrency } from './services/emailCurrency.js';
import {
  orderConfirmationArgs,
  resetPasswordArgs,
  shipmentArgs,
  welcomeArgs
} from './services/emailLocale.js';

/**
 * Ajustes propios de la tienda de la Fundación Andalusí.
 *
 * Envío gratuito según el importe con IVA: las tarifas por importe del envío
 * estándar (Admin → Configuración → Envíos: 4,95 € desde 0 €, 0 € desde 30 €) se
 * comparan en EverShop con el subtotal SIN IVA. Como los precios publicados
 * llevan el IVA incluido, aquí se envuelve el proveedor de envíos «core» para
 * que compare con el subtotal CON IVA, que es el que ve el cliente: un carrito
 * de 30 € tiene el envío gratis.
 *
 * Correo de confirmación (emails/order-confirmation.html):
 *  - Miniaturas: EverShop antepone la URL de la tienda a la imagen de cada
 *    artículo; con las imágenes en Azure Blob Storage la URL ya es absoluta y
 *    quedaba «https://tienda…https://…blob…» (imagen rota). Se deja la absoluta.
 *  - Importes como número: "0.0000" es verdadero para {{#if}} de Handlebars; como
 *    número, 0 oculta el descuento y muestra «Gratis» en el envío.
 */

type Item = { productId: number; qty: number; lineTotal: number };
type Ctx = { items: Item[]; totalValue: number; destination?: { country?: string; province?: string; postcode?: string } };
type Provider = { code: string; getMethods: (ctx: Ctx) => Promise<unknown[]>; [k: string]: unknown };

/**
 * Subtotal del carrito con IVA incluido: precio de catálogo (ya lleva el IVA) por
 * cantidad. No se parte de lineTotal: según el momento, EverShop lo da sin IVA o,
 * si aún no conoce la dirección, con él, y volver a sumarle el IVA daba envío
 * gratis a un libro de 29,90 € (29,90 × 1,04 = 31,10).
 */
async function subtotalWithTax(ctx: Ctx): Promise<number> {
  const ids = [...new Set(ctx.items.map((i) => i.productId).filter(Boolean))];
  if (!ids.length) return ctx.totalValue;
  const products = await select('product_id', 'price').from('product').where('product_id', 'IN', ids).execute(pool);
  const priceOf = new Map(products.map((p) => [p.product_id, Number(p.price)]));
  const total = ctx.items.reduce((sum, i) => {
    const price = priceOf.get(i.productId);
    return sum + (price !== undefined && Number.isFinite(price) ? price * (Number(i.qty) || 0) : Number(i.lineTotal) || 0);
  }, 0);
  return Math.round(total * 100) / 100;
}

/** «https://tienda.xhttps://blob.y/img.jpg» → «https://blob.y/img.jpg». */
export function fixThumbnail(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  const inner = url.slice(1).search(/https?:\/\//);
  return inner >= 0 ? url.slice(inner + 1) : url;
}

export default () => {
  registerEmailCurrency();
  // Cupones limitados a grupos de clientes (ver services/customerGroups).
  // Además, el validador de precio de EverShop invalidaba todo cupón con productos
  // obligatorios por SKU: se cambia por uno corregido.
  addFinalProcessor('couponValidatorFunctions', (fns: any[]) => [
    ...(fns || []).filter((f) => f?.name !== 'requiredProductByPriceValidator'),
    requiredProductByPriceValidator,
    customerGroupCouponValidator
  ]);
  // Correos en el idioma del cliente (ver services/emailLocale).
  const safe = (fn: (args: any, ctx: any) => Promise<any>) =>
    async function (this: any, args: any) {
      try {
        return await fn(args, this || {});
      } catch (e) {
        error(`[tienda] Idioma del correo: ${e.message}`);
        return args;
      }
    };
  addProcessor('orderConfirmationEmailArguments', safe((args, ctx) => orderConfirmationArgs(args, ctx.order)), 5);
  addProcessor('shipmentCreatedEmailArguments', safe((args, ctx) => shipmentArgs(args, ctx.order, 'created')), 5);
  addProcessor('shipmentDeliveredEmailArguments', safe((args, ctx) => shipmentArgs(args, ctx.order, 'delivered')), 5);
  addProcessor('customerWelcomeEmailArguments', safe((args) => welcomeArgs(args)), 5);
  addProcessor('resetPasswordEmailArguments', safe((args) => resetPasswordArgs(args)), 5);

  addFinalProcessor('orderConfirmationEmailData', (data: any) => {
    const order = data?.order;
    if (order) {
      for (const key of ['discount_amount', 'shipping_fee_incl_tax']) order[key] = Number(order[key]) || 0;
      for (const item of order.items || []) item.thumbnail = fixThumbnail(item.thumbnail);
    }
    return data;
  });

  addFinalProcessor('shippingProviders', (providers: Provider[]) =>
    providers.map((provider) =>
      provider.code !== 'core'
        ? provider
        : {
            ...provider,
            async getMethods(ctx: Ctx) {
              let totalValue = ctx.totalValue;
              try {
                totalValue = await subtotalWithTax(ctx);
              } catch (e) {
                error(`[tienda] No se pudo calcular el subtotal con IVA para el envío: ${e.message}`);
              }
              return provider.getMethods({ ...ctx, totalValue });
            }
          }
    )
  );
};
