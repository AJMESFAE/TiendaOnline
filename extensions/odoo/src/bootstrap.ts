import { warning } from '@evershop/evershop/lib/log';
import { addProcessor } from '@evershop/evershop/lib/util/registry';
import { getOdooConfig, getOrCreateOrderInvoice } from './services/odoo.js';

/**
 * Factura de Odoo adjunta al correo de confirmación del pedido.
 *
 * EverShop envía la confirmación al emitirse `order_placed` (con Redsys, en
 * cuanto llega la notificación de pago). Justo antes de enviarla pasa los
 * datos del correo por el procesador `orderConfirmationEmailArguments`: ahí
 * se genera (o se recupera, si ya existía) la factura del pedido y se añade
 * su PDF como adjunto. Si Odoo no está configurado o falla, el correo sale
 * igualmente, sin factura.
 */
export default () => {
  if (!getOdooConfig()) {
    warning('[odoo] ODOO_URL / ODOO_API_KEY / ODOO_PRODUCT_ID sin configurar: los pedidos no se facturan en Odoo.');
  }
  addProcessor('orderConfirmationEmailArguments', async function attachOdooInvoice(args: any) {
    const order = (this as any)?.order;
    if (!order?.order_id || !getOdooConfig()) return args;
    const invoice = await getOrCreateOrderInvoice(Number(order.order_id));
    if (!invoice) return args;
    return {
      ...args,
      // El correo menciona la factura adjunta (plantilla emails/order-confirmation.html).
      data: { ...((args.data as object) || {}), invoiceName: invoice.invoiceName },
      attachments: [
        ...((args.attachments as unknown[]) || []),
        { filename: invoice.filename, content: invoice.content, contentType: 'application/pdf' }
      ]
    };
  });
};
