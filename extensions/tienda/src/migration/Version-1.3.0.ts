import { execute } from '@evershop/postgres-query-builder';

/** Grupo de clientes INSTITUTO (cupones solo para alumnos y personal del Instituto). */
export default async (connection) => {
  await execute(
    connection,
    `INSERT INTO customer_group (group_name)
     SELECT 'INSTITUTO' WHERE NOT EXISTS (SELECT 1 FROM customer_group WHERE upper(group_name) = 'INSTITUTO')`
  );
};
