import { pool } from '@evershop/evershop/lib/postgres';
import { removePushToken } from '../../services/pushNotifications.js';

/** Al cerrar sesión en la app, el móvil deja de recibir avisos. */
export default async (request, response) => {
  try {
    await removePushToken(pool, request.body.token);
    response.status(200).json({ data: { token: request.body.token } });
  } catch (e) {
    response.status(500).json({ error: { status: 500, message: (e as Error).message } });
  }
};
