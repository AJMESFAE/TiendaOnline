import { execute } from '@evershop/postgres-query-builder';

/** Móviles con la app de gestión que reciben el aviso de pedido nuevo (token de Expo Push). */
export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "mobile_push_token" (
      "mobile_push_token_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "token" varchar NOT NULL UNIQUE,
      "admin_user_id" INT DEFAULT NULL REFERENCES "admin_user" ("admin_user_id") ON DELETE CASCADE,
      "platform" varchar DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
};
