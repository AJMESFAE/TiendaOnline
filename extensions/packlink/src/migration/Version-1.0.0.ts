import { execute } from '@evershop/postgres-query-builder';

/** Relación pedido ↔ envío de Packlink PRO (un envío por pedido). */
export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "packlink_shipment" (
      "packlink_shipment_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "order_id" INT NOT NULL UNIQUE REFERENCES "order" ("order_id") ON DELETE CASCADE,
      "reference" varchar NOT NULL,
      "state" varchar DEFAULT NULL,
      "tracking_number" varchar DEFAULT NULL,
      "tracking_url" text DEFAULT NULL,
      "carrier" varchar DEFAULT NULL,
      "shipment_uuid" varchar DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
};
