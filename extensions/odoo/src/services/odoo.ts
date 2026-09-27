import { randomUUID } from 'crypto';
import { insert, select } from '@evershop/postgres-query-builder';
import { error, info, warning } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { addOrderActivityLog } from '@evershop/evershop/oms/services';

/**
 * Facturación en Odoo vía la API JSON-2 (igual que en VillaDelCasar,
 * lib/odoo.ts): autenticación por clave de API (`Authorization: bearer`),
 * sin sesión ni paquetes externos, solo `fetch`. Se evitan XML-RPC/JSON-RPC
 * clásicos porque Odoo los retira a partir de la versión 20.
 *
 * Flujo por pedido pagado:
 *   1. Busca o crea el cliente (res.partner) por email, con su dirección.
 *   2. Crea la factura (account.move, out_invoice): una línea por artículo,
 *      otra para el envío y, si hace falta, una de ajuste para que el total
 *      coincida exactamente con lo cobrado por Redsys.
 *   3. La valida (action_post): queda como factura definitiva con número.
 *      No se registra ningún pago en Odoo: el cobro real lo hizo Redsys.
 *   4. Descarga el PDF por el portal de clientes con un access_token (la API
 *      JSON-2 no permite descargar el informe con clave de API).
 *
 * Precios: los de la tienda, con IVA incluido. El impuesto lo decide el
 * producto de Odoo configurado (ODOO_PRODUCT_ID): debe tener un impuesto
 * marcado como «incluido en el precio» (libros: IVA superreducido del 4 %)
 * para no duplicar el IVA. Revisadlo con quien lleve la contabilidad.
 *
 * Diseño defensivo: si falta configuración o Odoo falla, se registra en el
 * log y en el historial del pedido, y el pedido y su correo siguen adelante
 * sin factura. Nunca lanza.
 *
 * Variables de entorno:
 *   ODOO_URL                 https://<empresa>.odoo.com
 *   ODOO_API_KEY             clave de API (Perfil → Seguridad → Nueva clave de API)
 *   ODOO_PRODUCT_ID          producto de Odoo para los artículos de la tienda
 *   ODOO_SHIPPING_PRODUCT_ID producto para los gastos de envío (opcional;
 *                            por defecto, el mismo ODOO_PRODUCT_ID)
 *   ODOO_JOURNAL_ID          diario de ventas (opcional; por defecto el de Odoo)
 */

type OdooConfig = {
  url: string;
  apiKey: string;
  productId: number;
  shippingProductId: number;
  journalId: number | null;
};

const num = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : null;
};

export function getOdooConfig(): OdooConfig | null {
  const url = process.env.ODOO_URL?.replace(/\/$/, '');
  const apiKey = process.env.ODOO_API_KEY;
  const productId = num(process.env.ODOO_PRODUCT_ID);
  if (!url || !apiKey) {
    return null;
  }
  if (!productId) {
    warning('[odoo] Falta ODOO_PRODUCT_ID (producto de Odoo para facturar), no se genera factura');
    return null;
  }
  return {
    url,
    apiKey,
    productId,
    shippingProductId: num(process.env.ODOO_SHIPPING_PRODUCT_ID) ?? productId,
    journalId: num(process.env.ODOO_JOURNAL_ID)
  };
}

async function callOdoo<T>(
  config: OdooConfig,
  model: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${config.url}/json/2/${model}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `bearer ${config.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`Odoo ${model}.${method} (HTTP ${res.status}): ${text.slice(0, 500)}`);
  }
  return data as T;
}

async function findId(config: OdooConfig, model: string, domain: unknown[]): Promise<number | null> {
  const found = await callOdoo<{ id: number }[]>(config, model, 'search_read', {
    domain,
    fields: ['id'],
    limit: 1
  });
  return found[0]?.id ?? null;
}

interface Address {
  full_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  postcode?: string;
  province?: string;
  country?: string;
  telephone?: string;
}

/** Busca por email o crea el cliente de Odoo, con la dirección de facturación del pedido. */
async function findOrCreatePartner(config: OdooConfig, order: any, address: Address | null): Promise<number> {
  const email = String(order.customer_email || '').trim();
  if (email) {
    const existing = await findId(config, 'res.partner', [['email', '=ilike', email]]);
    if (existing) return existing;
  }
  let countryId: number | null = null;
  let stateId: number | null = null;
  if (address?.country) {
    countryId = await findId(config, 'res.country', [['code', '=', address.country.toUpperCase()]]);
  }
  if (address?.province) {
    try {
      const { provinces } = await import('@evershop/evershop/lib/locale/provinces');
      const name = provinces.find((p: any) => p.code === address.province)?.name;
      const domain: unknown[] = [['name', '=ilike', name || address.province]];
      if (countryId) domain.push(['country_id', '=', countryId]);
      stateId = await findId(config, 'res.country.state', domain);
    } catch {
      // Provincia sin equivalente en Odoo: se deja solo la dirección en texto.
    }
  }
  const street = [address?.address_1, address?.address_2].filter(Boolean).join(', ');
  const created = await callOdoo<number[]>(config, 'res.partner', 'create', {
    vals_list: [
      {
        name: address?.full_name || order.customer_full_name || email || `Cliente pedido ${order.order_number}`,
        email: email || undefined,
        phone: address?.telephone || undefined,
        street: street || undefined,
        city: address?.city || undefined,
        zip: address?.postcode || undefined,
        state_id: stateId ?? undefined,
        country_id: countryId ?? undefined,
        company_type: 'person'
      }
    ]
  });
  return created[0];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Líneas de la factura: artículos, envío y un ajuste final para cuadrar con lo cobrado. */
export function buildInvoiceLines(order: any, items: any[], config: OdooConfig) {
  const lines: Array<Record<string, unknown>> = [];
  let sum = 0;
  for (const item of items) {
    const qty = Number(item.qty) || 1;
    const lineTotal = Number(
      item.line_total_with_discount_incl_tax ?? item.line_total_incl_tax ?? Number(item.final_price_incl_tax) * qty
    );
    sum += lineTotal;
    lines.push({
      product_id: config.productId,
      name: `${item.product_name}${item.product_sku ? ` (${item.product_sku})` : ''}`,
      quantity: qty,
      price_unit: round2(lineTotal / qty)
    });
  }
  const shipping = Number(order.shipping_fee_incl_tax || 0);
  if (shipping > 0) {
    sum += shipping;
    lines.push({
      product_id: config.shippingProductId,
      name: 'Gastos de envío',
      quantity: 1,
      price_unit: round2(shipping)
    });
  }
  // Descuentos de pedido o redondeos: la factura debe sumar lo cobrado.
  const diff = round2(Number(order.grand_total) - sum);
  if (Math.abs(diff) >= 0.01) {
    lines.push({
      product_id: config.productId,
      name: diff < 0 ? 'Descuento' : 'Ajuste',
      quantity: 1,
      price_unit: diff
    });
  }
  return lines;
}

async function fetchInvoicePdf(config: OdooConfig, invoiceId: number): Promise<Buffer> {
  const accessToken = randomUUID();
  await callOdoo(config, 'account.move', 'write', { ids: [invoiceId], vals: { access_token: accessToken } });
  const res = await fetch(
    `${config.url}/my/invoices/${invoiceId}?access_token=${accessToken}&report_type=pdf&download=true`,
    { signal: AbortSignal.timeout(60000) }
  );
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.includes('pdf')) {
    throw new Error(`No se pudo descargar el PDF de la factura ${invoiceId} (HTTP ${res.status}, ${type})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function invoiceName(config: OdooConfig, invoiceId: number): Promise<string | null> {
  const rows = await callOdoo<{ name?: string }[]>(config, 'account.move', 'read', {
    ids: [invoiceId],
    fields: ['name']
  });
  return rows[0]?.name || null;
}

export interface InvoicePdf {
  filename: string;
  content: Buffer;
  invoiceId: number;
  invoiceName: string | null;
}

const pdfName = (name: string | null, fallback: string | number) =>
  `factura-${String(name || fallback).replace(/[^\w.-]+/g, '-')}.pdf`;

/**
 * Factura de un pedido pagado. Idempotente: si el pedido ya tiene factura
 * (tabla odoo_invoice) solo vuelve a descargar su PDF. Nunca lanza.
 */
export async function getOrCreateOrderInvoice(orderId: number): Promise<InvoicePdf | null> {
  const config = getOdooConfig();
  if (!config) return null;
  try {
    const order = await select().from('order').where('order_id', '=', orderId).load(pool);
    if (!order) return null;

    const existing = await select()
      .from('odoo_invoice')
      .where('order_id', '=', orderId)
      .and('move_type', '=', 'out_invoice')
      .load(pool);
    if (existing) {
      const content = await fetchInvoicePdf(config, existing.invoice_id);
      return {
        filename: pdfName(existing.invoice_name, order.order_number),
        content,
        invoiceId: existing.invoice_id,
        invoiceName: existing.invoice_name
      };
    }

    const items = await select().from('order_item').where('order_item_order_id', '=', orderId).execute(pool);
    const addressId = order.billing_address_id || order.shipping_address_id;
    const address = addressId
      ? await select().from('order_address').where('order_address_id', '=', addressId).load(pool)
      : null;

    const partnerId = await findOrCreatePartner(config, order, address);
    const vals: Record<string, unknown> = {
      move_type: 'out_invoice',
      partner_id: partnerId,
      invoice_date: new Date().toISOString().slice(0, 10),
      ref: `Pedido ${order.order_number}`,
      invoice_origin: `Tienda online · pedido ${order.order_number}`,
      invoice_line_ids: buildInvoiceLines(order, items, config).map((line) => [0, 0, line])
    };
    if (config.journalId) vals.journal_id = config.journalId;

    const [invoiceId] = await callOdoo<number[]>(config, 'account.move', 'create', { vals_list: [vals] });
    // Sin action_post Odoo la imprimiría como «PRO-FORMA».
    await callOdoo(config, 'account.move', 'action_post', { ids: [invoiceId] });
    const name = await invoiceName(config, invoiceId);

    await insert('odoo_invoice')
      .given({
        order_id: orderId,
        move_type: 'out_invoice',
        invoice_id: invoiceId,
        invoice_name: name,
        amount: Number(order.grand_total)
      })
      .execute(pool);
    await addOrderActivityLog(orderId, `Factura ${name ?? invoiceId} generada en Odoo`, false, pool as any);
    info(`[odoo] Factura ${name ?? invoiceId} creada para el pedido ${order.order_number}`);

    const content = await fetchInvoicePdf(config, invoiceId);
    return { filename: pdfName(name, order.order_number), content, invoiceId, invoiceName: name };
  } catch (e) {
    error(`[odoo] No se pudo generar la factura del pedido ${orderId}: ${e.message}`);
    try {
      await addOrderActivityLog(orderId, `No se pudo generar la factura en Odoo: ${e.message}`.slice(0, 500), false, pool as any);
    } catch {
      // sin historial
    }
    return null;
  }
}

/**
 * Factura rectificativa (out_refund) por una devolución, enlazada a la
 * factura original con reversed_entry_id. Nunca lanza.
 */
export async function createRectifyingInvoice(orderId: number, amount: number): Promise<number | null> {
  const config = getOdooConfig();
  if (!config || !(amount > 0)) return null;
  try {
    const original = await select()
      .from('odoo_invoice')
      .where('order_id', '=', orderId)
      .and('move_type', '=', 'out_invoice')
      .load(pool);
    if (!original) {
      warning(`[odoo] El pedido ${orderId} no tiene factura original: no se emite rectificativa`);
      return null;
    }
    const [move] = await callOdoo<{ partner_id: [number, string] }[]>(config, 'account.move', 'read', {
      ids: [original.invoice_id],
      fields: ['partner_id']
    });
    const [refundId] = await callOdoo<number[]>(config, 'account.move', 'create', {
      vals_list: [
        {
          move_type: 'out_refund',
          partner_id: move.partner_id[0],
          invoice_date: new Date().toISOString().slice(0, 10),
          reversed_entry_id: original.invoice_id,
          ref: `Devolución de ${original.invoice_name ?? original.invoice_id}`,
          invoice_line_ids: [
            [0, 0, { product_id: config.productId, name: `Devolución · factura ${original.invoice_name ?? ''}`.trim(), quantity: 1, price_unit: round2(amount) }]
          ]
        }
      ]
    });
    await callOdoo(config, 'account.move', 'action_post', { ids: [refundId] });
    const name = await invoiceName(config, refundId);
    await insert('odoo_invoice')
      .given({ order_id: orderId, move_type: 'out_refund', invoice_id: refundId, invoice_name: name, amount })
      .execute(pool);
    await addOrderActivityLog(orderId, `Factura rectificativa ${name ?? refundId} generada en Odoo (${amount.toFixed(2)} €)`, false, pool as any);
    return refundId;
  } catch (e) {
    error(`[odoo] No se pudo generar la factura rectificativa del pedido ${orderId}: ${e.message}`);
    return null;
  }
}
