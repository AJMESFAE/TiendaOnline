import { colors } from './theme';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type Label = { label: string; tone: Tone };

// Nombres en español de los estados de EverShop y de la extensión Redsys.
const payment: Record<string, Label> = {
  pending: { label: 'Pago pendiente', tone: 'warning' },
  paid: { label: 'Pagado', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
  refunded: { label: 'Reembolsado', tone: 'danger' },
  partial_refunded: { label: 'Reembolso parcial', tone: 'danger' },
  redsys_captured: { label: 'Pagado', tone: 'success' },
  redsys_failed: { label: 'Pago fallido', tone: 'danger' },
  redsys_refunded: { label: 'Reembolsado', tone: 'danger' },
  redsys_partial_refunded: { label: 'Reembolso parcial', tone: 'danger' }
};

const shipment: Record<string, Label> = {
  pending: { label: 'Sin enviar', tone: 'warning' },
  processing: { label: 'Preparando', tone: 'info' },
  partially_shipped: { label: 'Enviado en parte', tone: 'info' },
  shipped: { label: 'Enviado', tone: 'info' },
  partially_delivered: { label: 'Entregado en parte', tone: 'info' },
  delivered: { label: 'Entregado', tone: 'success' },
  partially_canceled: { label: 'Cancelado en parte', tone: 'danger' },
  canceled: { label: 'Cancelado', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'danger' }
};

const order: Record<string, Label> = {
  new: { label: 'Nuevo', tone: 'warning' },
  processing: { label: 'En curso', tone: 'info' },
  completed: { label: 'Completado', tone: 'success' },
  closed: { label: 'Cerrado', tone: 'neutral' },
  canceled: { label: 'Cancelado', tone: 'danger' }
};

type Status = { code?: string | null; name?: string | null } | null | undefined;

function pick(map: Record<string, Label>, s: Status): Label {
  const code = s?.code ?? '';
  return map[code] ?? { label: s?.name || code || '—', tone: 'neutral' };
}

export const paymentLabel = (s: Status) => pick(payment, s);
export const shipmentLabel = (s: Status) => pick(shipment, s);
export const orderLabel = (s: Status) => pick(order, s);

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: colors.brandInk, bg: colors.brandSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  neutral: { fg: colors.inkSoft, bg: colors.smoke }
};

/** Pagado y todavía se puede devolver con el TPV de Redsys. */
export const isRedsysRefundable = (paymentMethod?: string | null, code?: string | null) =>
  paymentMethod === 'redsys' &&
  (code === 'redsys_captured' || code === 'redsys_partial_refunded');
