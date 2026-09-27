import { sendOrderToPacklink } from '../../services/packlink.js';

/** Pedido confirmado (con Redsys, al llegar el pago): se crea su envío en Packlink PRO. */
export default async function sendToPacklink(data: { order_id?: number }) {
  if (data?.order_id) await sendOrderToPacklink(Number(data.order_id));
}
