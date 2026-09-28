import { execute } from '@evershop/postgres-query-builder';

/** Cuentas de Google vinculadas a clientes de la tienda (inicio de sesión con Google). */
export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "tienda_google_account" (
      "google_sub" varchar PRIMARY KEY,
      "customer_id" INT NOT NULL REFERENCES "customer" ("customer_id") ON DELETE CASCADE,
      "email" varchar NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
};
