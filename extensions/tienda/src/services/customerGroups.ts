import { pool } from '@evershop/evershop/lib/postgres';

/**
 * Grupos de clientes en los cupones.
 *
 * EverShop 2.2.1 guarda los grupos del cupón en user_condition.groups, pero su
 * validador lee otros campos (user_condition.group / condition.customer_group), así
 * que un cupón limitado a un grupo lo podía usar cualquiera. Este validador lo
 * comprueba con el grupo actual del cliente (no el que se copió al carrito).
 */
export async function customerGroupCouponValidator(cart: any, coupon: any): Promise<boolean> {
  const raw = coupon?.user_condition?.groups;
  const groups = (Array.isArray(raw) ? raw : [])
    .map((g) => parseInt(String(g), 10))
    .filter((g) => Number.isInteger(g) && g > 0);
  if (groups.length === 0) return true; // sin grupos: vale para todos
  const customerId = cart.getData('customer_id');
  if (!customerId) return false; // los invitados no pertenecen a ningún grupo
  const { rows } = await pool.query('SELECT group_id FROM customer WHERE customer_id = $1 AND status = 1', [customerId]);
  return rows.length > 0 && groups.includes(Number(rows[0].group_id));
}

export async function setCustomerGroup(customerUuid: string, groupId: number) {
  const group = await pool.query('SELECT customer_group_id, group_name FROM customer_group WHERE customer_group_id = $1', [groupId]);
  if (!group.rows[0]) return null;
  const updated = await pool.query('UPDATE customer SET group_id = $1 WHERE uuid = $2 RETURNING customer_id', [groupId, customerUuid]);
  if (!updated.rows[0]) return null;
  // Los carritos abiertos del cliente toman el grupo nuevo.
  await pool.query('UPDATE cart SET customer_group_id = $1 WHERE customer_id = $2 AND status = true', [
    groupId,
    updated.rows[0].customer_id
  ]);
  return group.rows[0];
}
