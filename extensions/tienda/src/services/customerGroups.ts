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

/**
 * Sustituye a requiredProductByPriceValidator de EverShop 2.2.1, que comprueba que el
 * valor de CADA producto obligatorio sea un número antes de mirar si la condición es
 * de precio: con una condición por SKU (valor = lista de SKU) el cupón era siempre
 * «no válido». Aquí solo se evalúan las condiciones de precio.
 */
export function requiredProductByPriceValidator(cart: any, coupon: any): boolean {
  const required = (coupon?.condition?.required_products || []).filter((c: any) => c?.key === 'price');
  if (required.length === 0) return true;
  for (const condition of required) {
    const value = parseFloat(condition.value);
    if (!Number.isFinite(value) || value < 0) return false;
    const minQty = parseInt(condition.qty, 10) || 1;
    const compare: Record<string, (a: number, b: number) => boolean> = {
      '=': (a, b) => a === b,
      '!=': (a, b) => a !== b,
      '>': (a, b) => a > b,
      '>=': (a, b) => a >= b,
      '<': (a, b) => a < b,
      '<=': (a, b) => a <= b
    };
    const op = compare[condition.operator];
    if (!op) return false;
    let qty = 0;
    for (const item of cart.getItems()) {
      // La tienda trabaja con precios con IVA incluido.
      const price = Number(item.getData('final_price_incl_tax'));
      if (op(price, value)) qty += Number(item.getData('qty')) || 0;
    }
    if (qty < minQty) return false;
  }
  return true;
}
