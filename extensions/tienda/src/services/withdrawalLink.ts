import crypto from 'crypto';
import { pool } from '@evershop/evershop/lib/postgres';
import { getBaseUrl } from '@evershop/evershop/lib/util/getBaseUrl';

/**
 * Enlace «Desistir del contrato aquí» de los correos del pedido: lleva el pedido
 * firmado (HMAC), de modo que el cliente solo tiene que confirmar, sin escribir el
 * número de pedido ni el email. La clave es TIENDA_LINK_SECRET o, si no está, una
 * derivada de DB_PASSWORD (como los secretos de scripts/start.mjs).
 */
const secret = () =>
  process.env.TIENDA_LINK_SECRET ||
  crypto
    .createHash('sha256')
    .update(`tienda-withdrawal:${process.env.DB_PASSWORD || ''}:${process.env.DB_NAME || ''}`)
    .digest('hex');

const sign = (uuid: string) => crypto.createHmac('sha256', secret()).update(`withdrawal:${uuid}`).digest('base64url').slice(0, 32);

export function withdrawalToken(orderUuid: string): string {
  return `${orderUuid}.${sign(orderUuid)}`;
}

/** uuid del pedido si el token es válido; si no, null. */
export function verifyWithdrawalToken(token: unknown): string | null {
  if (typeof token !== 'string' || token.length > 100) return null;
  const [uuid, sig] = token.split('.');
  if (!uuid || !sig || !/^[0-9a-f-]{36}$/i.test(uuid)) return null;
  const expected = Buffer.from(sign(uuid));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? uuid : null;
}

export function withdrawalUrl(orderUuid: string, locale = 'es'): string {
  const prefix = locale && locale !== 'es' ? `/${locale}` : '';
  return `${getBaseUrl()}${prefix}/desistimiento?t=${encodeURIComponent(withdrawalToken(orderUuid))}`;
}

export async function orderFromToken(token: unknown) {
  const uuid = verifyWithdrawalToken(token);
  if (!uuid) return null;
  const { rows } = await pool.query(
    // Los pedidos como invitado no guardan el nombre del cliente: se usa el de la dirección de envío.
    `SELECT o.order_id, o.uuid, o.order_number, o.customer_email,
            COALESCE(NULLIF(o.customer_full_name, ''), a.full_name) AS customer_full_name
       FROM "order" o LEFT JOIN order_address a ON a.order_address_id = o.shipping_address_id
      WHERE o.uuid = $1`,
    [uuid]
  );
  return rows[0] || null;
}
