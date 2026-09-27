import { pool } from '@evershop/evershop/lib/postgres';
import { getLocaleContext } from '@evershop/evershop/lib/locale/localeContext';

const SUPPORTED = ['es', 'ar', 'en'];
const clean = (l: unknown) => (typeof l === 'string' && SUPPORTED.includes(l) ? l : null);

/** Idioma de la petición actual de la tienda (null en el panel o fuera de una petición). */
export function requestLocale(): string | null {
  const ctx = getLocaleContext();
  return ctx && !ctx.isAdmin ? clean(ctx.locale) : null;
}

export async function saveCartLocale(cartUuid: string, locale: unknown) {
  const l = clean(locale);
  if (!l || !cartUuid) return;
  await pool.query(
    `INSERT INTO tienda_cart_locale (cart_id, locale)
     SELECT cart_id, $2 FROM cart WHERE uuid = $1
     ON CONFLICT (cart_id) DO UPDATE SET locale = EXCLUDED.locale`,
    [cartUuid, l]
  );
  const { rows } = await pool.query('SELECT customer_email FROM cart WHERE uuid = $1', [cartUuid]);
  if (rows[0]?.customer_email) await saveCustomerLocale(rows[0].customer_email, l);
}

export async function saveCustomerLocale(email: unknown, locale: unknown) {
  const l = clean(locale);
  if (!l || typeof email !== 'string' || !email) return;
  await pool.query(
    `INSERT INTO tienda_customer_locale (email, locale) VALUES (lower($1), $2)
     ON CONFLICT (email) DO UPDATE SET locale = EXCLUDED.locale, updated_at = now()`,
    [email, l]
  );
}

/** Idioma de un pedido: el del carrito con que se compró; si no, el del cliente; si no, español. */
export async function orderLocale(order: any): Promise<string> {
  if (order?.cart_id) {
    const { rows } = await pool.query('SELECT locale FROM tienda_cart_locale WHERE cart_id = $1', [order.cart_id]);
    if (clean(rows[0]?.locale)) return rows[0].locale;
  }
  return customerLocale(order?.customer_email);
}

export async function customerLocale(email: unknown): Promise<string> {
  if (typeof email === 'string' && email) {
    const { rows } = await pool.query('SELECT locale FROM tienda_customer_locale WHERE email = lower($1)', [email]);
    if (clean(rows[0]?.locale)) return rows[0].locale;
  }
  return 'es';
}
