import { execute } from '@evershop/postgres-query-builder';

/** Desistimientos recibidos con la función «Desistir del contrato aquí». */
export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "tienda_withdrawal" (
      "withdrawal_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "order_id" INT NOT NULL REFERENCES "order" ("order_id") ON DELETE CASCADE,
      "email" varchar NOT NULL,
      "full_name" varchar NOT NULL,
      "items" text,
      "comment" text,
      "locale" varchar NOT NULL DEFAULT 'es',
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
};
