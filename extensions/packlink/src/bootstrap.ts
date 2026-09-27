import path from 'path';
import { registerJob } from '@evershop/evershop/lib/cronjob';
import { warning } from '@evershop/evershop/lib/log';
import { addProcessor } from '@evershop/evershop/lib/util/registry';
import { registerCarrier } from '@evershop/evershop/oms/services';
import { packlinkEnabled, registerWebhook } from './services/packlink.js';

export default () => {
  // Transportista «Packlink PRO» de los envíos que crea esta extensión: el enlace
  // «Seguir envío» del panel y de los correos usa la URL que da Packlink.
  registerCarrier({
    code: 'packlink',
    name: 'Packlink PRO',
    description: 'Envíos gestionados en Packlink PRO',
    generateTrackingUrl: (ctx) => (ctx.metadata?.tracking_url as string) || null
  });

  // En el correo «Tu pedido está en camino», el transportista real (Correos, SEUR…).
  addProcessor('shipmentCreatedEmailData', (data: any) => {
    const meta = data?.shipment?.carrier_metadata;
    if (data?.shipment?.carrier === 'packlink' && meta?.carrier) data.carrierName = meta.carrier;
    return data;
  });

  if (!packlinkEnabled()) {
    warning('[packlink] PACKLINK_API_KEY sin configurar: los pedidos no se envían a Packlink PRO.');
    return;
  }

  // Si se pierde un aviso del webhook, el cron pone al día los envíos abiertos.
  registerJob({
    name: 'packlinkSyncShipments',
    schedule: process.env.PACKLINK_SYNC_SCHEDULE || '*/30 * * * *',
    resolve: path.resolve(import.meta.dirname, 'crons', 'syncShipments.js'),
    enabled: true
  });

  // Alta del webhook (idempotente) solo en el proceso web, unos segundos después del arranque.
  const home = process.env.EVERSHOP_HOME_URL;
  if (home && !process.argv.some((a) => /event-manager|cronjob/.test(a))) {
    setTimeout(() => {
      registerWebhook(home).catch((e) => warning(`[packlink] No se pudo registrar el webhook: ${e.message}`));
    }, 15000).unref();
  }
};
