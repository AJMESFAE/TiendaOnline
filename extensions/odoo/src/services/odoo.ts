import { randomUUID } from 'crypto';
import { del, insert, select } from '@evershop/postgres-query-builder';
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
 *   ODOO_DB                  base de datos de Odoo (opcional; cabecera X-Odoo-Database)
 *   ODOO_PAYMENT_JOURNAL_ID  diario donde se registra el cobro con tarjeta de Redsys
 *                            (opcional; por defecto, el diario llamado «Tarjeta»).
 *                            ODOO_PAYMENT=false no registra cobros.
 *   ODOO_TAX_IDS             impuesto de Odoo para cada tipo de IVA de la tienda,
 *                            p. ej. "4:12,21:1" (IVA 4 % → impuesto 12, IVA 21 %
 *                            → impuesto 1). Deben ser impuestos «incluidos en el
 *                            precio». Opcional: sin él, cada línea lleva el
 *                            impuesto del producto de Odoo.
 */

type OdooConfig = {
  url: string;
  apiKey: string;
  productId: number;
  shippingProductId: number;
  journalId: number | null;
  /** Diario del cobro con tarjeta (Redsys); null = buscar el diario «Tarjeta». */
  paymentJournalId: number | null;
  db: string | null;
  /** Tipo de IVA de la tienda (4, 21…) → id del impuesto en Odoo. */
  taxIds: Map<number, number>;
};

/** "4:12,21:1" → {4 → 12, 21 → 1}. */
function parseTaxIds(value: string | undefined): Map<number, number> {
  const map = new Map<number, number>();
  for (const pair of (value || '').split(',')) {
    const [rate, id] = pair.split(':').map((x) => Number(x.trim()));
    if (Number.isFinite(rate) && rate >= 0 && Number.isInteger(id) && id > 0) map.set(rate, id);
  }
  return map;
}

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
    journalId: num(process.env.ODOO_JOURNAL_ID),
    paymentJournalId: num(process.env.ODOO_PAYMENT_JOURNAL_ID),
    db: process.env.ODOO_DB?.trim() || null,
    taxIds: parseTaxIds(process.env.ODOO_TAX_IDS)
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${config.apiKey}`,
      // Base de datos de Odoo (necesaria si el servidor aloja varias).
      ...(config.db ? { 'X-Odoo-Database': config.db } : {})
    },
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

/**
 * Impuestos de una línea. Con ODOO_TAX_IDS se fija el impuesto que corresponde al
 * tipo de IVA de la tienda; un tipo 0 (Canarias, Ceuta, Melilla) va sin impuesto.
 * Sin correspondencia, la línea usa el impuesto del producto de Odoo.
 */
function taxFields(config: OdooConfig, rate: number): Record<string, unknown> {
  if (config.taxIds.size === 0) return {};
  const key = round2(rate);
  const id = config.taxIds.get(key);
  if (id) return { tax_ids: [[6, 0, [id]]] };
  if (key === 0) return { tax_ids: [[6, 0, []]] };
  warning(`[odoo] ODOO_TAX_IDS no tiene impuesto para el IVA del ${key} %: se usa el del producto de Odoo`);
  return {};
}

/**
 * IVA del envío tal como lo cobró la tienda (21 %; 0 % en Canarias, Ceuta y
 * Melilla), redondeado al tipo más cercano de los habituales en España.
 */
function shippingRate(order: any): number {
  const base = Number(order.shipping_fee_excl_tax || 0);
  const tax = Number(order.shipping_tax_amount || 0);
  if (!(base > 0)) return 0;
  const rate = (tax / base) * 100;
  return [0, 4, 10, 21].reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best), 0);
}

/**
 * Líneas de la factura: artículos (cada uno con su IVA), envío (con el IVA que
 * cobró la tienda, el 21 %) y un ajuste final para cuadrar con lo cobrado.
 */
export function buildInvoiceLines(order: any, items: any[], config: OdooConfig) {
  const lines: Array<Record<string, unknown>> = [];
  let sum = 0;
  const baseByRate = new Map<number, number>();
  for (const item of items) {
    const qty = Number(item.qty) || 1;
    const rate = round2(Number(item.tax_percent) || 0);
    const lineTotal = Number(
      item.line_total_with_discount_incl_tax ?? item.line_total_incl_tax ?? Number(item.final_price_incl_tax) * qty
    );
    sum += lineTotal;
    baseByRate.set(rate, (baseByRate.get(rate) || 0) + lineTotal / (1 + rate / 100));
    lines.push({
      product_id: config.productId,
      name: `${item.product_name}${item.product_sku ? ` (${item.product_sku})` : ''}`,
      quantity: qty,
      price_unit: round2(lineTotal / qty),
      ...taxFields(config, rate)
    });
  }
  const shipping = round2(Number(order.shipping_fee_incl_tax || 0));
  if (shipping > 0) {
    sum += shipping;
    lines.push({
      product_id: config.shippingProductId,
      name: 'Gastos de envío',
      quantity: 1,
      price_unit: shipping,
      ...taxFields(config, shippingRate(order))
    });
  }
  // Descuentos de pedido o redondeos: la factura debe sumar lo cobrado.
  const diff = round2(Number(order.grand_total) - sum);
  if (Math.abs(diff) >= 0.01) {
    const mainRate = [...baseByRate.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? 0;
    lines.push({
      product_id: config.productId,
      name: diff < 0 ? 'Descuento' : 'Ajuste',
      quantity: 1,
      price_unit: diff,
      ...taxFields(config, mainRate)
    });
  }
  return lines;
}

/**
 * Líneas de una rectificativa por `amount`: las de la factura original a escala
 * (devolución total = mismas líneas; parcial = cada línea en proporción), para que
 * cada tipo de IVA se rectifique en la parte que le toca.
 */
function buildRefundLines(order: any, items: any[], config: OdooConfig, amount: number, invoiceName: string) {
  const original = buildInvoiceLines(order, items, config);
  const total = original.reduce((x, l) => x + Number(l.price_unit) * Number(l.quantity), 0);
  const factor = total > 0 ? Math.min(1, amount / total) : 0;
  const lines: Array<Record<string, unknown>> = [];
  let assigned = 0;
  original.forEach((l, i) => {
    const lineTotal =
      i === original.length - 1
        ? round2(amount - assigned)
        : round2(Number(l.price_unit) * Number(l.quantity) * factor);
    assigned = round2(assigned + lineTotal);
    if (lineTotal === 0) return;
    const { quantity, price_unit, ...rest } = l;
    lines.push({ ...rest, name: `Devolución · ${l.name}${invoiceName ? ` · ${invoiceName}` : ''}`, quantity: 1, price_unit: lineTotal });
  });
  return lines;
}

/** Informe de Odoo «PDF without Payment» (factura sin pagos): el que se adjunta. */
const INVOICE_REPORT = 'account.report_invoice';

/**
 * PDF oficial de la factura, como «Enviar e imprimir» de Odoo con el informe
 * «PDF without Payment»: el asistente account.move.send.wizard lo genera y lo
 * guarda en la factura (invoice_pdf_report_id), sin enviar ningún correo desde
 * Odoo. Así el PDF dice «Factura» y no «Factura proforma» (la vista previa del
 * portal, que Odoo usa mientras no existe el PDF oficial). Si el asistente falla,
 * se descarga la vista previa del portal para no dejar el correo sin factura.
 */
async function fetchInvoicePdf(config: OdooConfig, invoiceId: number): Promise<Buffer> {
  try {
    const official = await officialInvoicePdf(config, invoiceId);
    if (official) return official;
  } catch (e) {
    warning(`[odoo] No se pudo generar el PDF oficial de la factura ${invoiceId}: ${e.message}. Se adjunta la vista previa.`);
  }
  return portalInvoicePdf(config, invoiceId);
}

async function readAttachment(config: OdooConfig, attachmentId: number): Promise<Buffer | null> {
  const [att] = await callOdoo<{ datas?: string }[]>(config, 'ir.attachment', 'read', {
    ids: [attachmentId],
    fields: ['datas']
  });
  return att?.datas ? Buffer.from(att.datas, 'base64') : null;
}

async function officialInvoicePdf(config: OdooConfig, invoiceId: number): Promise<Buffer | null> {
  const pdfField = async () =>
    (
      await callOdoo<{ invoice_pdf_report_id: [number, string] | false }[]>(config, 'account.move', 'read', {
        ids: [invoiceId],
        fields: ['invoice_pdf_report_id']
      })
    )[0]?.invoice_pdf_report_id;
  // Ya generado (p. ej. al reenviar el correo): se reutiliza.
  const existing = await pdfField();
  if (existing) return readAttachment(config, existing[0]);

  const [report] = await callOdoo<{ id: number }[]>(config, 'ir.actions.report', 'search_read', {
    domain: [['report_name', '=', INVOICE_REPORT], ['model', '=', 'account.move']],
    fields: ['id'],
    limit: 1
  });
  const context = { active_model: 'account.move', active_ids: [invoiceId], active_id: invoiceId };
  const [wizardId] = await callOdoo<number[]>(config, 'account.move.send.wizard', 'create', {
    vals_list: [{ move_id: invoiceId, sending_methods: [], ...(report ? { pdf_report_id: report.id } : {}) }],
    context
  });
  // Seguridad: el asistente no debe enviar el correo de Odoo al cliente (lo envía la tienda).
  const [wizard] = await callOdoo<{ sending_methods: unknown }[]>(config, 'account.move.send.wizard', 'read', {
    ids: [wizardId],
    fields: ['sending_methods'],
    context
  });
  const methods = Array.isArray(wizard?.sending_methods) ? wizard.sending_methods : [];
  if (methods.length > 0) {
    await callOdoo(config, 'account.move.send.wizard', 'unlink', { ids: [wizardId] }).catch(() => {});
    throw new Error(`el asistente de envío quería enviar por ${methods.join(', ')}`);
  }
  await callOdoo(config, 'account.move.send.wizard', 'action_send_and_print', { ids: [wizardId], context });
  const generated = await pdfField();
  return generated ? readAttachment(config, generated[0]) : null;
}

async function portalInvoicePdf(config: OdooConfig, invoiceId: number): Promise<Buffer> {
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
/** Pedido cobrado por Redsys (el pago ya está confirmado cuando se factura). */
function isPaidByCard(order: any): boolean {
  return order.payment_method === 'redsys' && /captured|paid/.test(String(order.payment_status || ''));
}

async function paymentJournal(config: OdooConfig): Promise<number | null> {
  if (config.paymentJournalId) return config.paymentJournalId;
  const [journal] = await callOdoo<{ id: number }[]>(config, 'account.journal', 'search_read', {
    domain: [['name', '=ilike', 'tarjeta'], ['type', 'in', ['bank', 'cash', 'credit']]],
    fields: ['id'],
    limit: 1
  });
  return journal?.id ?? null;
}

/**
 * Registra en Odoo el cobro (o la devolución) con tarjeta de una factura o
 * rectificativa, con el asistente «Registrar pago» en el diario de Tarjeta.
 * No hace nada si ya está pagada. Nunca lanza error: lo deja en el historial.
 */
async function registerCardPayment(config: OdooConfig, orderId: number, moveId: number, reference: string) {
  if (process.env.ODOO_PAYMENT === 'false') return;
  try {
    const [move] = await callOdoo<{ payment_state: string; amount_residual: number; name: string }[]>(
      config,
      'account.move',
      'read',
      { ids: [moveId], fields: ['payment_state', 'amount_residual', 'name'] }
    );
    if (!move || !(move.amount_residual > 0) || ['paid', 'in_payment', 'reversed'].includes(move.payment_state)) return;
    const journalId = await paymentJournal(config);
    if (!journalId) {
      warning('[odoo] No hay diario «Tarjeta» (ni ODOO_PAYMENT_JOURNAL_ID): no se registra el cobro');
      return;
    }
    const context = { active_model: 'account.move', active_ids: [moveId], active_id: moveId };
    const [wizardId] = await callOdoo<number[]>(config, 'account.payment.register', 'create', {
      vals_list: [
        {
          journal_id: journalId,
          payment_date: new Date().toISOString().slice(0, 10),
          amount: move.amount_residual,
          communication: reference
        }
      ],
      context
    });
    await callOdoo(config, 'account.payment.register', 'action_create_payments', { ids: [wizardId], context });
    await addOrderActivityLog(orderId, `Cobro con tarjeta de ${move.name} registrado en Odoo`, false, pool as any);
    info(`[odoo] Cobro registrado en el diario ${journalId} para ${move.name}`);
  } catch (e) {
    error(`[odoo] No se pudo registrar el cobro de la factura ${moveId}: ${e.message}`);
    try {
      await addOrderActivityLog(orderId, `No se pudo registrar el cobro en Odoo: ${e.message}`.slice(0, 500), false, pool as any);
    } catch {
      // sin historial
    }
  }
}

export async function getOrCreateOrderInvoice(orderId: number): Promise<InvoicePdf | null> {
  const config = getOdooConfig();
  if (!config) return null;
  try {
    const order = await select().from('order').where('order_id', '=', orderId).load(pool);
    if (!order) return null;
    // Los pedidos gratuitos (0 €) no se facturan.
    if (!(round2(Number(order.grand_total)) > 0)) {
      info(`[odoo] Pedido ${order.order_number} de 0 €: no se emite factura`);
      return null;
    }

    const existing = await select()
      .from('odoo_invoice')
      .where('order_id', '=', orderId)
      .and('move_type', '=', 'out_invoice')
      .load(pool);
    // Si la factura se borró en Odoo, se olvida y se emite una nueva.
    const alive =
      existing &&
      (await callOdoo<number>(config, 'account.move', 'search_count', { domain: [['id', '=', existing.invoice_id]] })) > 0;
    if (existing && !alive) {
      warning(`[odoo] La factura ${existing.invoice_name ?? existing.invoice_id} del pedido ${order.order_number} ya no existe en Odoo: se emite una nueva`);
      await del('odoo_invoice').where('odoo_invoice_id', '=', existing.odoo_invoice_id).execute(pool);
    }
    if (existing && alive) {
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
    if (isPaidByCard(order)) {
      await registerCardPayment(config, orderId, invoiceId, `Redsys · pedido ${order.order_number}`);
    }

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
    const order = await select().from('order').where('order_id', '=', orderId).load(pool);
    const items = await select().from('order_item').where('order_item_order_id', '=', orderId).execute(pool);
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
          invoice_line_ids: buildRefundLines(order, items, config, amount, original.invoice_name ?? '').map((l) => [0, 0, l])
        }
      ]
    });
    await callOdoo(config, 'account.move', 'action_post', { ids: [refundId] });
    const name = await invoiceName(config, refundId);
    await insert('odoo_invoice')
      .given({ order_id: orderId, move_type: 'out_refund', invoice_id: refundId, invoice_name: name, amount })
      .execute(pool);
    await addOrderActivityLog(orderId, `Factura rectificativa ${name ?? refundId} generada en Odoo (${amount.toFixed(2)} €)`, false, pool as any);
    // La devolución se hizo por Redsys a la misma tarjeta: se registra el pago de la rectificativa.
    if (order?.payment_method === 'redsys') {
      await registerCardPayment(config, orderId, refundId, `Devolución Redsys · pedido ${order.order_number}`);
    }
    return refundId;
  } catch (e) {
    error(`[odoo] No se pudo generar la factura rectificativa del pedido ${orderId}: ${e.message}`);
    return null;
  }
}
