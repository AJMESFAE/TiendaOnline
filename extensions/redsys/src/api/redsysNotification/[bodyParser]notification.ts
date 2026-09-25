import { error, warning } from '@evershop/evershop/lib/log';
import {
  processRedsysResponse,
  RedsysSignatureError
} from '../../services/processRedsysResponse.js';

/**
 * Notificación online (servidor a servidor) de Redsys: es la fuente de verdad
 * del pago. Redsys reintenta si no recibe HTTP 200, así que solo devolvemos
 * error cuando queremos que lo vuelva a intentar (fallo interno).
 */
export default async (request, response, next) => {
  try {
    await processRedsysResponse(request.body || {});
    response.status(200);
    return response.send('OK');
  } catch (e) {
    if (e instanceof RedsysSignatureError) {
      warning(`Notificación Redsys rechazada: ${e.message}`);
      response.status(400);
      return response.send('KO');
    }
    error(e);
    response.status(500);
    return response.send('ERROR');
  }
};
