import { pool } from '@evershop/evershop/lib/postgres';

/**
 * EverShop 2.2.1 pone siempre group_id = 1 al guardar un cliente desde el panel
 * (updateCustomer.js, «TODO: fix me»), lo que sacaría al cliente de su grupo
 * (p. ej. INSTITUTO). Se guarda aquí el grupo y se restaura en restoreGroup.
 */
export default async (request, response, next) => {
  try {
    const { rows } = await pool.query('SELECT group_id FROM customer WHERE uuid = $1', [request.params.id]);
    response.locals.tiendaPreviousGroup = rows[0]?.group_id ?? null;
  } catch {
    response.locals.tiendaPreviousGroup = null;
  }
  next();
};
