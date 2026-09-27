import { execute } from '@evershop/postgres-query-builder';

/** Idioma en que compró o se registró cada cliente (para los correos). */
export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "tienda_cart_locale" (
      "cart_id" INT PRIMARY KEY,
      "locale" varchar NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "tienda_customer_locale" (
      "email" varchar PRIMARY KEY,
      "locale" varchar NOT NULL,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
};
