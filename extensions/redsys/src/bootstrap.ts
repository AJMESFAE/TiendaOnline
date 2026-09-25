import path from 'path';
import config from 'config';
import { registerPaymentMethod } from '@evershop/evershop/checkout/services';
import { registerJob } from '@evershop/evershop/lib/cronjob';
import { getRedsysConfig, redsysOption } from './services/getRedsysConfig.js';

export default async () => {
  // Estados de pago propios de Redsys. El pedido nace en `pending` (estado por
  // defecto de EverShop) y solo pasa a `redsys_captured` cuando llega una
  // notificación firmada y válida desde Redsys.
  config.util.setModuleDefaults('oms', {
    order: {
      paymentStatus: {
        redsys_captured: {
          name: 'Paid',
          badge: 'success',
          isDefault: false,
          isCancelable: false
        },
        redsys_failed: {
          name: 'Failed',
          badge: 'critical',
          isDefault: false,
          isCancelable: true
        },
        redsys_refunded: {
          name: 'Refunded',
          badge: 'destructive',
          isDefault: false,
          isCancelable: false
        },
        redsys_partial_refunded: {
          name: 'Partial Refunded',
          badge: 'destructive',
          isDefault: false,
          isCancelable: false
        }
      },
      psoMapping: {
        'redsys_captured:*': 'processing',
        'redsys_captured:delivered': 'completed',
        'redsys_failed:*': 'new',
        'redsys_refunded:*': 'closed',
        'redsys_partial_refunded:*': 'processing',
        'redsys_partial_refunded:delivered': 'completed'
      }
    }
  });

  registerPaymentMethod({
    init: async () => ({
      code: 'redsys',
      name: (await getRedsysConfig()).displayName
    }),
    validator: async () => {
      const redsys = await getRedsysConfig();
      return redsys.enabled && !!redsys.merchantCode && !!redsys.secretKey;
    }
  });

  // Pedidos Redsys que se quedaron en `pending` (el cliente cerró la ventana del
  // TPV sin pagar): se cancelan y se repone el stock.
  registerJob({
    name: 'redsysCancelAbandonedOrders',
    schedule: String(redsysOption('abandonedSchedule', '*/15 * * * *')),
    resolve: path.resolve(
      import.meta.dirname,
      'crons',
      'cancelAbandonedOrders.js'
    ),
    enabled: true
  });
};
