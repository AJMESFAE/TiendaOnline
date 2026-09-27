import { createRectifyingInvoice } from '../../services/odoo.js';

/** Devolución registrada (p. ej. desde el botón Reembolso de Redsys): factura rectificativa en Odoo. */
export default async function createRectifyingInvoiceOnRefund(data: { order_id?: number; amount?: number }) {
  if (data?.order_id && Number(data.amount) > 0) {
    await createRectifyingInvoice(Number(data.order_id), Number(data.amount));
  }
}
