import { timingSafeEqual } from 'crypto';
import { error, warning } from '@evershop/evershop/lib/log';
import { syncPacklinkShipment, webhookToken } from '../../services/packlink.js';

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Aviso de Packlink PRO («shipment.label.ready», «shipment.tracking.update»,
 * «shipment.delivered»…). Solo trae la referencia: el estado se vuelve a pedir
 * a la API, así que un aviso falso no puede cambiar nada por sí mismo.
 */
export default async (request, response) => {
  if (!same(String(request.query?.token || ''), webhookToken())) {
    response.status(401);
    return response.json({ error: 'token no válido' });
  }
  const reference = request.body?.data?.shipment_reference;
  if (!reference) {
    response.status(200);
    return response.json({ ok: true });
  }
  try {
    await syncPacklinkShipment(String(reference));
  } catch (e) {
    error(e);
    warning(`[packlink] Webhook ${request.body?.event} de ${reference} no procesado: ${e.message}`);
  }
  response.status(200);
  return response.json({ ok: true });
};
