import { pool } from '@evershop/evershop/lib/postgres';
import { savePushToken } from '../../services/pushNotifications.js';

/** La app registra el móvil al iniciar sesión: a partir de ahí recibe los avisos de pedido nuevo. */
export default async (request, response) => {
  try {
    const { token, platform } = request.body;
    const user = request.getCurrentUser?.() ?? request.locals?.user;
    await savePushToken(pool, token, user?.admin_user_id ?? null, platform ?? null);
    response.status(200).json({ data: { token } });
  } catch (e) {
    response.status(500).json({ error: { status: 500, message: (e as Error).message } });
  }
};
