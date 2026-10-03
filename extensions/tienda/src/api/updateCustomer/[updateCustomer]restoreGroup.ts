import { error } from '@evershop/evershop/lib/log';
import { pool } from '@evershop/evershop/lib/postgres';

/** Restaura el grupo que tenía el cliente antes de guardarlo (ver rememberGroup). */
export default async (request, response, next) => {
  const previous = response.locals.tiendaPreviousGroup;
  if (previous && response.statusCode < 400) {
    try {
      await pool.query('UPDATE customer SET group_id = $1 WHERE uuid = $2', [previous, request.params.id]);
      if (response.$body?.data) response.$body.data.group_id = previous;
    } catch (e) {
      error(e);
    }
  }
  next();
};
