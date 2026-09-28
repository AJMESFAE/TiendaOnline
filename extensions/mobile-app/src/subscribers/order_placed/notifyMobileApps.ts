import { error } from '@evershop/evershop/lib/log';
import { notifyNewOrder } from '../../services/pushNotifications.js';

/** Pedido confirmado (con Redsys, al llegar el pago; contra reembolso, al crearse): aviso a los móviles. */
export default async function notifyMobileApps(data: { order_id?: number }) {
  if (!data?.order_id) return;
  try {
    await notifyNewOrder(Number(data.order_id));
  } catch (e) {
    error(`[mobile-app] No se pudo enviar el aviso del pedido ${data.order_id}: ${(e as Error).message}`);
  }
}
