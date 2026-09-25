import { error, info } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { cancelOrder } from '@evershop/evershop/oms/services';
import { getRedsysConfig } from '../services/getRedsysConfig.js';

/**
 * Cancela (y repone stock de) los pedidos Redsys que siguen sin pagar pasado
 * el plazo configurado (`system.redsys.abandonedAfterHours`, 3 h por defecto):
 * el cliente abandonó el TPV sin volver a la tienda.
 */
export default async function cancelAbandonedRedsysOrders() {
  try {
    const { abandonedAfterHours } = await getRedsysConfig();
    const hours = Number.isFinite(abandonedAfterHours) && abandonedAfterHours > 0
      ? abandonedAfterHours
      : 3;
    const { rows } = await pool.query(
      `SELECT uuid FROM "order"
       WHERE payment_method = 'redsys'
         AND payment_status IN ('pending', 'redsys_failed')
         AND status <> 'canceled'
         AND created_at < NOW() - ($1::text || ' hours')::interval
       LIMIT 100`,
      [String(hours)]
    );
    for (const row of rows) {
      try {
        await cancelOrder(row.uuid, 'Pago Redsys no completado (pedido abandonado)');
        info(`Redsys: pedido abandonado ${row.uuid} cancelado`);
      } catch (e) {
        error(e);
      }
    }
  } catch (e) {
    error(e);
  }
}
