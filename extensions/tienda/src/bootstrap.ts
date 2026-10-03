import { select } from '@evershop/postgres-query-builder';
import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { addFinalProcessor, addProcessor } from '@evershop/evershop/lib/util/registry';
import { customerGroupCouponValidator } from './services/customerGroups.js';
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

type Item = { productId: number; lineTotal: number };
type Ctx = { items: Item[]; totalValue: number; destination?: { country?: string; province?: string; postcode?: string } };
type Provider = { code: string; getMethods: (ctx: Ctx) => Promise<unknown[]>; [k: string]: unknown };

const splitList = (v: unknown) =>
  String(v ?? '*')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** % de IVA de cada clase de impuesto para la dirección de envío (misma regla que EverShop). */
async function taxPercentByClass(classIds: number[], dest: Ctx['destination']): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (!classIds.length || !dest?.country) return result;
  const rates = await select().from('tax_rate').where('tax_class_id', 'IN', classIds).execute(pool);
  for (const r of rates) {
    const countries = splitList(r.country);
    const provinces = splitList(r.province);
    const postcodes = splitList(r.postcode);
    const match =
      (countries.includes('*') || countries.includes(dest.country)) &&
      (provinces.includes('*') || !dest.province || provinces.includes(dest.province)) &&
      (postcodes.includes('*') || !dest.postcode || postcodes.includes(dest.postcode));
    if (match) result.set(r.tax_class_id, (result.get(r.tax_class_id) || 0) + Number(r.rate));
  }
  return result;
}

/** Subtotal del carrito con IVA incluido. */
async function subtotalWithTax(ctx: Ctx): Promise<number> {
  const ids = [...new Set(ctx.items.map((i) => i.productId).filter(Boolean))];
  if (!ids.length) return ctx.totalValue;
  const products = await select('product_id', 'tax_class').from('product').where('product_id', 'IN', ids).execute(pool);
  const classOf = new Map(products.map((p) => [p.product_id, Number(p.tax_class) || 0]));
  const percent = await taxPercentByClass([...new Set([...classOf.values()].filter(Boolean))], ctx.destination);
  const total = ctx.items.reduce((sum, i) => sum + i.lineTotal * (1 + (percent.get(classOf.get(i.productId) || 0) || 0) / 100), 0);
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
  addFinalProcessor('couponValidatorFunctions', (fns: any[]) => [...(fns || []), customerGroupCouponValidator]);
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
