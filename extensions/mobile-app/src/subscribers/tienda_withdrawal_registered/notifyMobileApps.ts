import { error } from '@evershop/evershop/lib/log';
import { notifyWithdrawal } from '../../services/pushNotifications.js';

/** Desistimiento recibido por la función «Desistir del contrato aquí» (extensión tienda): aviso a los móviles. */
export default async function notifyMobileApps(data: {
  withdrawal_id?: number;
  order_uuid?: string;
  order_number?: string;
  full_name?: string | null;
  email?: string | null;
  items?: string | null;
}) {
  if (!data?.order_uuid || !data?.order_number) return;
  try {
    await notifyWithdrawal({
      order_uuid: data.order_uuid,
      order_number: String(data.order_number),
      full_name: data.full_name,
      email: data.email,
      items: data.items
    });
  } catch (e) {
    error(`[mobile-app] No se pudo enviar el aviso del desistimiento ${data.withdrawal_id}: ${(e as Error).message}`);
  }
}
