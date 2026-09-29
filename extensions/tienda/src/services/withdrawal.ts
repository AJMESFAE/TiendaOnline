import fs from 'fs/promises';
import path from 'path';
import { emit } from '@evershop/evershop/lib/event';
import { error } from '@evershop/evershop/lib/log';
import { translate } from '@evershop/evershop/lib/locale/translate/translate';
import { sendEmail } from '@evershop/evershop/lib/mail/emailHelper';
import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { productName } from './content.js';
import { orderFromToken } from './withdrawalLink.js';

/**
 * Desistimiento en línea (Directiva (UE) 2023/2673, art. 11 bis de la Directiva
 * 2011/83/UE): el cliente indica su nombre, el pedido y el correo en el que recibe
 * el acuse; al confirmar se registra, se anota en el pedido, se le envía el acuse
 * de recibo (contenido, fecha y hora) y se avisa a la tienda. No cancela ni
 * reembolsa nada por sí solo: la devolución y el reembolso se gestionan como hasta ahora.
 */
export interface WithdrawalInput {
  /** Enlace firmado de los correos del pedido; si no, número de pedido y email. */
  token?: string;
  orderNumber?: string;
  email?: string;
  fullName: string;
  items?: string;
  comment?: string;
  locale: string;
}

export class OrderNotFoundError extends Error {}

const SUPPORTED = ['es', 'en', 'ar'];

export async function registerWithdrawal(input: WithdrawalInput) {
  const locale = SUPPORTED.includes(input.locale) ? input.locale : 'es';
  let order: any = null;
  if (input.token) {
    order = await orderFromToken(input.token);
  } else if (input.orderNumber && input.email) {
    const { rows } = await pool.query(
      `SELECT order_id, uuid, order_number, customer_email FROM "order"
       WHERE order_number = $1 AND lower(customer_email) = lower($2) LIMIT 1`,
      [input.orderNumber.trim().replace(/^#/, ''), input.email.trim()]
    );
    order = rows[0];
  }
  if (!order) throw new OrderNotFoundError('Pedido no encontrado');
  const items = input.items?.trim() || null;
  const comment = input.comment?.trim() || null;
  const inserted = await pool.query(
    `INSERT INTO tienda_withdrawal (order_id, email, full_name, items, comment, locale)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING withdrawal_id, created_at`,
    [order.order_id, order.customer_email, input.fullName.trim(), items, comment, locale]
  );
  const { withdrawal_id: id, created_at: createdAt } = inserted.rows[0];
  await pool.query(
    `INSERT INTO order_activity (order_activity_order_id, comment, customer_notified) VALUES ($1, $2, true)`,
    [order.order_id, `Desistimiento n.º ${id} recibido por la función de desistimiento (${items ? `productos: ${items}` : 'todo el pedido'})${comment ? `. Comentario: ${comment}` : ''}`]
  );
  const products = await orderProducts(order.order_id, locale);
  const receivedAt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid'
  }).format(new Date(createdAt));
  const data = {
    withdrawal: { id, receivedAt, fullName: input.fullName.trim(), email: order.customer_email, items, comment },
    order: { order_number: order.order_number },
    products
  };
  await sendAcknowledgement(data, locale).catch((e) => error(e));
  await notifyShop(data).catch((e) => error(e));
  // Aviso en la app de gestión (extensions/mobile-app, suscriptor tienda_withdrawal_registered).
  await emit('tienda_withdrawal_registered', {
    withdrawal_id: id,
    order_id: order.order_id,
    order_uuid: order.uuid,
    order_number: order.order_number,
    full_name: input.fullName.trim(),
    email: order.customer_email,
    items
  }).catch((e) => error(e));
  return { id, orderNumber: order.order_number, receivedAt, email: order.customer_email };
}

async function orderProducts(orderId: number, locale: string) {
  const { rows } = await pool.query(
    'SELECT product_sku, product_name, qty FROM order_item WHERE order_item_order_id = $1 ORDER BY order_item_id',
    [orderId]
  );
  return rows.map((r) => ({ product_name: productName(r.product_sku, r.product_name, locale), qty: r.qty }));
}

async function sendAcknowledgement(data: any, locale: string) {
  const template = await fs.readFile(path.resolve(process.cwd(), 'emails', locale, 'withdrawal-received.html'), 'utf8');
  await sendEmail('withdrawal_received', {
    to: data.withdrawal.email,
    subject: translate('Withdrawal received · Order #${number}', { number: String(data.order.order_number) }, locale),
    template,
    data,
    locale
  });
}

/** Aviso a la tienda (a la dirección de los correos de la tienda o a TIENDA_WITHDRAWAL_EMAIL). */
async function notifyShop(data: any) {
  const from = String(process.env.MAIL_FROM || getConfig('system.notification_emails.from', '') || '');
  const to = process.env.TIENDA_WITHDRAWAL_EMAIL || from.match(/<([^>]+)>/)?.[1] || from;
  if (!to) return;
  const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const w = data.withdrawal;
  const body = `<p>Se ha recibido un <b>desistimiento</b> por la función de desistimiento de la tienda.</p>
<ul>
<li><b>Pedido:</b> #${esc(data.order.order_number)}</li>
<li><b>Recibido:</b> ${esc(w.receivedAt)} (n.º ${esc(w.id)})</li>
<li><b>Cliente:</b> ${esc(w.fullName)} &lt;${esc(w.email)}&gt;</li>
<li><b>Productos:</b> ${w.items ? esc(w.items) : 'todo el pedido'}</li>
${w.comment ? `<li><b>Comentario:</b> ${esc(w.comment)}</li>` : ''}
</ul>
<p>Se le ha enviado el acuse de recibo. Queda anotado en el historial del pedido. Recuerda reembolsar en un máximo de 14 días (se puede esperar a recibir el producto o el justificante de envío).</p>`;
  await sendEmail('withdrawal_notice', {
    to,
    subject: `Desistimiento del pedido #${data.order.order_number}`,
    // El cuerpo ya está hecho; «template» no puede ir vacío, pero con «body» no se usa.
    template: body,
    body,
    data: {},
    locale: 'es'
  });
}
