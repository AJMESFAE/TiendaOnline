/**
 * Mensajes de Expo Push para los avisos de pedido nuevo. Sin dependencias de
 * EverShop, para poder probarlo aislado (tests/push.test.mjs).
 *
 * Si en expo.dev se activa «Enhanced security for push notifications», hay
 * que definir EXPO_ACCESS_TOKEN con un token de acceso de Expo.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100; // máximo de mensajes por petición a Expo

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR' }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: string;
  data: Record<string, unknown>;
};

export function buildNewOrderMessages(
  order: { uuid: string; order_number: string; grand_total: number | string; currency: string; customer_full_name?: string | null; customer_email?: string | null; total_qty?: number | null },
  tokens: string[]
): PushMessage[] {
  const qty = Number(order.total_qty || 0);
  const who = order.customer_full_name || order.customer_email || 'Cliente';
  const body = `${who} · ${money(Number(order.grand_total), order.currency)}${qty ? ` · ${qty} ${qty === 1 ? 'artículo' : 'artículos'}` : ''}`;
  return tokens.map((to) => ({
    to,
    title: `Nuevo pedido #${order.order_number}`,
    body,
    sound: 'default',
    channelId: 'pedidos',
    data: { orderUuid: order.uuid }
  }));
}

/** Aviso de desistimiento (función «Desistir del contrato aquí» de la tienda): abre el pedido en la app. */
export function buildWithdrawalMessages(
  w: { order_uuid: string; order_number: string; full_name?: string | null; email?: string | null; items?: string | null },
  tokens: string[]
): PushMessage[] {
  const who = w.full_name || w.email || 'Cliente';
  const what = w.items ? w.items.replace(/\s+/g, ' ').slice(0, 80) : 'todo el pedido';
  return tokens.map((to) => ({
    to,
    title: `Desistimiento del pedido #${w.order_number}`,
    body: `${who} · ${what}`,
    sound: 'default',
    channelId: 'pedidos',
    data: { orderUuid: w.order_uuid }
  }));
}

/** Envía los mensajes y devuelve los tokens que Expo da por caducados (app desinstalada o sin permiso). */
export async function sendPushMessages(
  messages: PushMessage[],
  fetchImpl: typeof fetch = fetch,
  onWarning: (message: string) => void = console.warn
): Promise<string[]> {
  const invalid: string[] = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    const res = await fetchImpl(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {})
      },
      body: JSON.stringify(chunk)
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.errors?.[0]?.message || `Expo Push respondió HTTP ${res.status}`);
    }
    (body.data ?? []).forEach((ticket: any, j: number) => {
      if (ticket?.status !== 'error') return;
      if (ticket.details?.error === 'DeviceNotRegistered') invalid.push(chunk[j].to);
      else onWarning(`[mobile-app] Aviso no enviado a ${chunk[j].to}: ${ticket.message}`);
    });
  }
  return invalid;
}
