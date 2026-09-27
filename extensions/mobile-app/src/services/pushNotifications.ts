import { info, warning } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { buildNewOrderMessages, sendPushMessages } from './pushMessages.js';

/**
 * Avisos de pedido nuevo en la app de gestión (mobile/), con el servicio
 * Expo Push: Expo los reenvía a Apple (APNs) y a Google (FCM) según el móvil.
 */

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export async function savePushToken(db: Queryable, token: string, adminUserId: number | null, platform: string | null) {
  await db.query(
    `INSERT INTO mobile_push_token (token, admin_user_id, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE
       SET admin_user_id = EXCLUDED.admin_user_id, platform = EXCLUDED.platform, updated_at = CURRENT_TIMESTAMP`,
    [token, adminUserId, platform]
  );
}

export async function removePushToken(db: Queryable, token: string) {
  await db.query('DELETE FROM mobile_push_token WHERE token = $1', [token]);
}

export async function notifyNewOrder(orderId: number) {
  const { rows: orders } = await pool.query(
    `SELECT uuid, order_number, grand_total, currency, customer_full_name, customer_email, total_qty
       FROM "order" WHERE order_id = $1`,
    [orderId]
  );
  const order = orders[0];
  if (!order) return;
  // La app renueva su registro cada vez que se abre con la sesión iniciada: un
  // móvil que lleva 30 días sin hacerlo (perdido, o sesión caducada) deja de recibir avisos.
  await pool.query(`DELETE FROM mobile_push_token WHERE updated_at < NOW() - INTERVAL '30 days'`);
  const { rows } = await pool.query('SELECT token FROM mobile_push_token');
  if (rows.length === 0) return;
  const invalid = await sendPushMessages(buildNewOrderMessages(order, rows.map((r) => r.token)), fetch, warning);
  // La app se desinstaló o se revocó el permiso: el token ya no sirve.
  for (const token of invalid) await removePushToken(pool, token);
  info(`[mobile-app] Aviso del pedido #${order.order_number} enviado a ${rows.length - invalid.length} móvil(es)`);
}
