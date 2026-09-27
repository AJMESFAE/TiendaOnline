import { createHmac } from 'crypto';
import { commit, insert, rollback, select, startTransaction, update } from '@evershop/postgres-query-builder';
import { error, info, warning } from '@evershop/evershop/lib/log';
import { getConnection, pool } from '@evershop/evershop/lib/postgres';
import { addOrderActivityLog, createShipment, markDelivered } from '@evershop/evershop/oms/services';

/**
 * Integración con Packlink PRO (API REST https://api.packlink.com/v1, la misma que
 * usan los módulos oficiales de Packlink: github.com/packlink-dev/ecommerce_module_core).
 *
 *  1. Pedido pagado (evento order_placed) → se crea el envío en Packlink PRO como
 *     borrador (POST /shipments), con el almacén por defecto de la cuenta como
 *     remitente. En Packlink PRO se elige transportista, se paga y se imprime la
 *     etiqueta, como siempre.
 *  2. Packlink avisa por webhook (POST /api/packlink/webhook) y, por si se pierde
 *     un aviso, un cron consulta cada 30 minutos los envíos abiertos: con el
 *     número de seguimiento se crea el envío del pedido en la tienda (el cliente
 *     recibe «Tu pedido está en camino» con el enlace de seguimiento) y, al
 *     entregarse, se marca como entregado.
 *
 * Variables de entorno:
 *   PACKLINK_API_KEY           clave de API (Packlink PRO → Configuración → Packlink PRO clave de API)
 *   PACKLINK_SERVICE_ID        opcional: servicio (transportista) fijo; sin él se elige en Packlink PRO
 *   PACKLINK_DEFAULT_WEIGHT    peso (kg) de los artículos sin peso (0.5)
 *   PACKLINK_DEFAULT_PARCEL    medidas del paquete en cm, «largo x ancho x alto» (30x20x5)
 *   PACKLINK_SOURCE            identificador de la integración (module_evershop)
 *   PACKLINK_WEBHOOK_TOKEN     opcional: token del webhook (por defecto se deriva de otra clave)
 */

const API = (process.env.PACKLINK_API_URL || 'https://api.packlink.com/v1').replace(/\/$/, '');

export const packlinkEnabled = () => Boolean(process.env.PACKLINK_API_KEY?.trim());

/** Estados de Packlink a partir de los cuales la etiqueta está comprada y hay seguimiento. */
const SHIPPED_STATES = ['READY_TO_PRINT', 'READY_FOR_COLLECTION', 'COMPLETED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
export const FINAL_STATES = ['DELIVERED', 'CANCELED', 'RETURNED_TO_SENDER'];

async function packlink<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: process.env.PACKLINK_API_KEY!.trim() // la clave tal cual, sin «Bearer»
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // respuesta sin JSON
  }
  if (!res.ok) {
    const msg = json?.messages?.map((m: any) => m.message).join('; ') || json?.message || text.slice(0, 300);
    throw new Error(`Packlink ${method} ${path} → HTTP ${res.status}: ${msg}`);
  }
  return json as T;
}

/** Token del webhook: fijo en PACKLINK_WEBHOOK_TOKEN o derivado (estable entre reinicios). */
export function webhookToken(): string {
  if (process.env.PACKLINK_WEBHOOK_TOKEN) return process.env.PACKLINK_WEBHOOK_TOKEN;
  const seed = process.env.DB_PASSWORD || process.env.PACKLINK_API_KEY || 'packlink';
  return createHmac('sha256', seed).update('packlink-webhook').digest('hex').slice(0, 32);
}

/** Da de alta en Packlink PRO la URL a la que avisa de los cambios de los envíos. */
export async function registerWebhook(homeUrl: string) {
  const url = `${homeUrl.replace(/\/$/, '')}/api/packlink/webhook?token=${webhookToken()}`;
  await packlink('POST', '/shipments/callback', { url });
  info('[packlink] Webhook de Packlink PRO registrado');
}

type Address = {
  name: string;
  surname: string;
  company: string;
  street1: string;
  street2: string;
  zip_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
};

/** Remitente: el almacén por defecto de Packlink PRO (o, si no hay, la Fundación). */
async function senderAddress(): Promise<Address> {
  try {
    const list = await packlink<any[]>('GET', '/clients/warehouses');
    const w = (list || []).find((x) => x.default_selection) || (list || [])[0];
    if (w) {
      // postal_code puede venir como «28020 - Madrid».
      const [zip, cityFromZip] = String(w.postal_code || '').split(' - ');
      return {
        name: w.name || '',
        surname: w.surname || '',
        company: w.company || '',
        street1: w.address || '',
        street2: w.address2 || '',
        zip_code: zip.trim(),
        city: w.city || cityFromZip?.trim() || '',
        country: w.country || 'ES',
        phone: w.phone || '',
        email: w.email || ''
      };
    }
  } catch (e) {
    warning(`[packlink] No se pudo leer el almacén de Packlink PRO: ${e.message}`);
  }
  return {
    name: 'Fundación',
    surname: 'Método Andalusí',
    company: 'Fundación Método Andalusí de España',
    street1: 'Calle Anastasio Herrero 5',
    street2: '',
    zip_code: '28020',
    city: 'Madrid',
    country: 'ES',
    phone: process.env.PACKLINK_FROM_PHONE || '',
    email: 'tienda@fundacionandalusi.org'
  };
}

function splitName(fullName: string) {
  const parts = String(fullName || '').trim().split(/\s+/);
  return { name: parts.shift() || '', surname: parts.join(' ') };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Un paquete con el peso de todos los artículos y las medidas mayores (o las de por defecto). */
function parcel(items: any[]) {
  const defaultWeight = Number(process.env.PACKLINK_DEFAULT_WEIGHT) || 0.5;
  const [dl, dw, dh] = String(process.env.PACKLINK_DEFAULT_PARCEL || '30x20x5')
    .split(/x/i)
    .map((n) => Number(n) || 0);
  let weight = 0;
  let length = 0;
  let width = 0;
  let height = 0;
  for (const i of items) {
    const qty = Number(i.qty) || 1;
    weight += (Number(i.product_weight) > 0 ? Number(i.product_weight) : defaultWeight) * qty;
    length = Math.max(length, Number(i.package_length) || 0);
    width = Math.max(width, Number(i.package_width) || 0);
    height += (Number(i.package_height) || 0) * qty;
  }
  return {
    weight: Math.max(0.1, round2(weight)),
    length: Math.ceil(length || dl || 30),
    width: Math.ceil(width || dw || 20),
    height: Math.ceil(height || dh || 5)
  };
}

/**
 * Crea el envío del pedido en Packlink PRO (una sola vez por pedido). Nunca lanza
 * error: si falla lo deja en el historial del pedido para crearlo a mano.
 */
export async function sendOrderToPacklink(orderId: number): Promise<string | null> {
  if (!packlinkEnabled()) return null;
  try {
    const existing = await select().from('packlink_shipment').where('order_id', '=', orderId).load(pool);
    if (existing) return existing.reference;
    const order = await select().from('order').where('order_id', '=', orderId).load(pool);
    if (!order || order.no_shipping_required || !order.shipping_address_id) return null;
    const allItems = await select().from('order_item').where('order_item_order_id', '=', orderId).execute(pool);
    const items = allItems.filter((i) => !i.no_shipping_required);
    if (!items.length) return null;
    const address = await select().from('order_address').where('order_address_id', '=', order.shipping_address_id).load(pool);
    if (!address) return null;

    const to: Address = {
      ...splitName(address.full_name),
      company: '',
      street1: address.address_1 || '',
      street2: address.address_2 || '',
      zip_code: String(address.postcode || '').trim(),
      city: address.city || '',
      country: address.country || 'ES',
      phone: address.telephone || '',
      email: order.customer_email || ''
    };
    const serviceId = Number(process.env.PACKLINK_SERVICE_ID) || undefined;
    const draft = {
      source: process.env.PACKLINK_SOURCE || 'module_evershop',
      platform_country: 'ES',
      ...(serviceId ? { service_id: serviceId } : {}),
      content: items.map((i) => `${Number(i.qty)} × ${i.product_name}`).join(', ').slice(0, 250),
      contentvalue: round2(Number(order.sub_total_incl_tax ?? order.grand_total ?? 0)),
      contentValue_currency: order.currency || 'EUR',
      content_second_hand: false,
      shipment_custom_reference: String(order.order_number),
      priority: false,
      has_customs: false,
      from: await senderAddress(),
      to,
      packages: [parcel(items)],
      additional_data: {
        order_id: String(order.order_number),
        items: items.map((i) => ({
          title: i.product_name,
          quantity: Number(i.qty),
          price: round2(Number(i.final_price_incl_tax ?? i.final_price ?? 0))
        }))
      }
    };
    const res = await packlink<{ reference?: string }>('POST', '/shipments', draft);
    if (!res?.reference) throw new Error('Packlink no devolvió la referencia del envío');
    await insert('packlink_shipment').given({ order_id: orderId, reference: res.reference }).execute(pool);
    await addOrderActivityLog(
      orderId,
      `Envío creado en Packlink PRO (${res.reference}). Elija transportista y pague la etiqueta en pro.packlink.es`,
      false,
      pool as any
    );
    info(`[packlink] Pedido ${order.order_number} enviado a Packlink PRO: ${res.reference}`);
    return res.reference;
  } catch (e) {
    error(`[packlink] No se pudo crear el envío del pedido ${orderId}: ${e.message}`);
    try {
      await addOrderActivityLog(orderId, `No se pudo crear el envío en Packlink PRO: ${e.message}`.slice(0, 500), false, pool as any);
    } catch {
      // sin historial
    }
    return null;
  }
}

/**
 * Actualiza un envío con lo que dice Packlink PRO: guarda estado y seguimiento, crea
 * el envío del pedido en la tienda cuando hay número de seguimiento y lo marca
 * como entregado al entregarse.
 */
export async function syncPacklinkShipment(reference: string): Promise<void> {
  const row = await select().from('packlink_shipment').where('reference', '=', reference).load(pool);
  if (!row) return;
  const s = await packlink<any>('GET', `/shipments/${encodeURIComponent(reference)}`);
  const state = String(s?.state || '');
  const trackingNumber = (Array.isArray(s?.trackings) ? s.trackings[0] : s?.tracking_number) || row.tracking_number || null;
  const trackingUrl = s?.tracking_url || row.tracking_url || null;
  const carrier = s?.carrier || s?.service?.carrier_name || s?.carrier_name || row.carrier || null;

  let shipmentUuid = row.shipment_uuid;
  const order = await select().from('order').where('order_id', '=', row.order_id).load(pool);
  if (order && !shipmentUuid && trackingNumber && SHIPPED_STATES.includes(state) && order.status !== 'canceled') {
    const items = (await select().from('order_item').where('order_item_order_id', '=', row.order_id).execute(pool))
      .filter((i) => !i.no_shipping_required)
      .map((i) => ({ order_item_id: i.order_item_id, qty: Number(i.qty) }));
    // En una transacción propia: el evento shipment_created (correo «Tu pedido está
    // en camino») se guarda con ella y sale ya con la URL de seguimiento.
    const connection = await getConnection();
    try {
      await startTransaction(connection);
      const { shipment } = await createShipment(
        order.uuid,
        { items, carrier: 'packlink', tracking_number: String(trackingNumber) },
        connection
      );
      shipmentUuid = (shipment as any).uuid;
      await update('shipment')
        .given({
          tracking_url: trackingUrl,
          carrier_shipment_id: reference,
          carrier_metadata: { tracking_url: trackingUrl, carrier, packlink_reference: reference }
        })
        .where('uuid', '=', shipmentUuid)
        .execute(connection);
      await commit(connection);
    } catch (e) {
      await rollback(connection).catch(() => {});
      shipmentUuid = null;
      // p. ej. ya se registró el envío a mano en la tienda
      warning(`[packlink] No se pudo crear el envío del pedido ${order.order_number} en la tienda: ${e.message}`);
    }
    if (shipmentUuid) {
      await addOrderActivityLog(
        row.order_id,
        `Enviado con ${carrier || 'Packlink PRO'}: seguimiento ${trackingNumber}`,
        false,
        pool as any
      ).catch(() => {});
    }
  }
  if (shipmentUuid && state === 'DELIVERED' && row.state !== 'DELIVERED') {
    try {
      await markDelivered(shipmentUuid);
    } catch (e) {
      warning(`[packlink] No se pudo marcar como entregado el envío ${reference}: ${e.message}`);
    }
  }
  await update('packlink_shipment')
    .given({
      state,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      carrier,
      shipment_uuid: shipmentUuid,
      updated_at: new Date()
    })
    .where('packlink_shipment_id', '=', row.packlink_shipment_id)
    .execute(pool);
}
