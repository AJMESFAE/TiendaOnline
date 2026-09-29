import fs from 'fs/promises';
import path from 'path';
import { translate } from '@evershop/evershop/lib/locale/translate/translate';
import { productName } from './content.js';
import { customerLocale, orderLocale, requestLocale } from './customerLocale.js';
import { withdrawalUrl } from './withdrawalLink.js';

/**
 * Correos en el idioma del cliente: el del carrito con que compró (pedido, envío,
 * entrega) o con que se registró (bienvenida, contraseña). Cambia la plantilla
 * (emails/<idioma>/…), el asunto, el formato de importes y fechas, y los nombres
 * de producto. En español no cambia nada.
 */
const EMAILS_DIR = path.resolve(process.cwd(), 'emails');
const templates = new Map<string, string>();

async function template(locale: string, file: string): Promise<string | null> {
  const key = `${locale}/${file}`;
  if (!templates.has(key)) {
    try {
      templates.set(key, await fs.readFile(path.join(EMAILS_DIR, locale, file), 'utf8'));
    } catch {
      return null;
    }
  }
  return templates.get(key)!;
}

type Args = Record<string, any>;

async function localize(args: Args, locale: string, file: string, subject: string, vars: Record<string, string> = {}) {
  if (!locale || locale === 'es') return args;
  const html = await template(locale, file);
  return {
    ...args,
    locale,
    subject: translate(subject, vars, locale),
    ...(html ? { template: html } : {})
  };
}

/** Enlace «Desistir del contrato aquí» del pedido (firmado: el cliente solo confirma). */
const withWithdrawalUrl = (args: Args, order: any, locale: string): Args =>
  order?.uuid ? { ...args, data: { ...(args.data || {}), withdrawalUrl: withdrawalUrl(order.uuid, locale) } } : args;

const translateItems = (items: any[] | undefined, locale: string) =>
  (items || []).map((i) => ({ ...i, product_name: productName(i.product_sku, i.product_name, locale) }));

export async function orderConfirmationArgs(args: Args, order: any) {
  const locale = await orderLocale(order);
  const out = withWithdrawalUrl(await localize(args, locale, 'order-confirmation.html', 'Your order has been confirmed!'), order, locale);
  if (locale !== 'es' && out.data?.order) {
    const o = out.data.order;
    out.data = {
      ...out.data,
      order: {
        ...o,
        items: translateItems(o.items, locale),
        payment_method_name: o.payment_method_name && translate(o.payment_method_name, {}, locale)
      }
    };
  }
  return out;
}

export async function shipmentArgs(args: Args, order: any, kind: 'created' | 'delivered') {
  const locale = await orderLocale(order);
  const out = withWithdrawalUrl(
    await localize(
      args,
      locale,
      kind === 'created' ? 'shipment-created.html' : 'shipment-delivered.html',
      kind === 'created' ? 'Your order #${number} is on the way' : 'Your order #${number} has been delivered',
      { number: String(order?.order_number ?? '') }
    ),
    order,
    locale
  );
  if (locale !== 'es' && out.data?.items) out.data = { ...out.data, items: translateItems(out.data.items, locale) };
  return out;
}

export async function welcomeArgs(args: Args) {
  const locale = (await customerLocale(args.to)) || 'es';
  return localize(args, locale, 'customer-welcome.html', 'Welcome to our store!');
}

export async function resetPasswordArgs(args: Args) {
  const locale = requestLocale() || (await customerLocale(args.to));
  return localize(args, locale, 'reset-password.html', 'Reset your password');
}
