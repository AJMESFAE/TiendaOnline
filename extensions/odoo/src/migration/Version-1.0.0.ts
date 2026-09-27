import { execute } from '@evershop/postgres-query-builder';

/** Relación pedido ↔ factura de Odoo (evita facturar dos veces el mismo pedido). */
export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "odoo_invoice" (
      "odoo_invoice_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "order_id" INT NOT NULL REFERENCES "order" ("order_id") ON DELETE CASCADE,
      "move_type" varchar NOT NULL DEFAULT 'out_invoice',
      "invoice_id" INT NOT NULL,
      "invoice_name" varchar DEFAULT NULL,
      "amount" decimal(12,4) DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await execute(
    connection,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ODOO_INVOICE_ORDER_UNIQUE" ON "odoo_invoice" ("order_id") WHERE "move_type" = 'out_invoice'`
  );
};
