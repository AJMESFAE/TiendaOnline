import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { FINAL_STATES, packlinkEnabled, syncPacklinkShipment } from '../services/packlink.js';

/** Pone al día los envíos de Packlink PRO abiertos de los últimos 60 días. */
export default async function syncPacklinkShipments() {
  if (!packlinkEnabled()) return;
  const { rows } = await pool.query(
    `SELECT reference FROM packlink_shipment
     WHERE (state IS NULL OR state <> ALL($1)) AND created_at > now() - interval '60 days'
     ORDER BY packlink_shipment_id`,
    [FINAL_STATES]
  );
  for (const { reference } of rows) {
    try {
      await syncPacklinkShipment(reference);
    } catch (e) {
      error(`[packlink] ${reference}: ${e.message}`);
    }
  }
}
