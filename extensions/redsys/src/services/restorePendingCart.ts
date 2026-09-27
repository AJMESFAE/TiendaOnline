import { select, update } from '@evershop/postgres-query-builder';
import { error, info } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';
import { cancelOrder } from '@evershop/evershop/oms/services';

/** Estados de pago de un pedido Redsys que no se ha llegado a cobrar. */
const UNPAID = ['pending', 'redsys_failed'];
/** Solo pedidos recientes: los antiguos los cancela el cron de abandonados. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Pago no completado en Redsys: cancela el pedido (repone el stock y no se
 * factura, porque la factura solo se emite con el pago confirmado) y reactiva
 * su carrito, para que el cliente vuelva al carrito tal como lo tenía.
 */
export async function cancelAndRestoreCart(order: any, reason: string): Promise<boolean> {
  if (!order || !UNPAID.includes(order.payment_status) || order.status === 'canceled') return false;
  try {
    await cancelOrder(order.uuid, reason);
  } catch (e) {
    // El cron de pedidos abandonados lo reintentará.
    error(e);
  }
  if (order.cart_id) {
    await update('cart').given({ status: 1 }).where('cart_id', '=', order.cart_id).execute(pool);
  }
  info(`Redsys: pedido ${order.order_number} cancelado (${reason}); carrito recuperado`);
  return true;
}

/**
 * El cliente vuelve a la tienda sin pagar y sin pasar por la URL KO (botón
 * «atrás» del navegador, pestaña cerrada…): si no tiene carrito activo y su
 * último pedido con Redsys sigue sin pagar, se cancela y se recupera el carrito.
 */
export async function restorePendingRedsysCart(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;
  const active = await select().from('cart').where('status', '=', 1).and('sid', '=', sid).load(pool);
  if (active) return false;
  const query = select().from('order');
  query.where('sid', '=', sid).and('payment_method', '=', 'redsys');
  query.orderBy('order_id', 'DESC');
  const order = await query.load(pool);
  if (!order || Date.now() - new Date(order.created_at).getTime() > MAX_AGE_MS) return false;
  return cancelAndRestoreCart(order, 'Pago no completado en Redsys: el cliente ha vuelto a la tienda');
}
