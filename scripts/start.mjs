// Arranque del contenedor en Azure:
//   1. Lanza `evershop start` (aplica las migraciones y sirve la tienda).
//   2. Cuando la tienda responde, crea el administrador ADMIN_EMAIL /
//      ADMIN_PASSWORD si todavía no existe (solo la primera vez: después se
//      gestiona desde el panel y no se vuelve a tocar).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import pg from 'pg';

const port = process.env.PORT || '3000';
// Se lanza el CLI con `node` directamente (no con npx): npx no reenvía SIGTERM
// y, al reiniciar el App Service, dejaría procesos huérfanos.
const require = createRequire(import.meta.url);
const cli = path.join(
  path.dirname(require.resolve('@evershop/evershop/package.json')),
  'dist/bin/evershop.js'
);
const run = (args, options = {}) =>
  spawn(process.execPath, [cli, ...args], {
    stdio: 'inherit',
    env: process.env,
    ...options
  });

// `evershop start` lanza a su vez los procesos de eventos y cron, pero no los
// detiene al recibir SIGTERM. Va en su propio grupo de procesos para poder
// parar el grupo entero.
const server = run(['start'], { detached: true });
const stopAll = (signal) => {
  try {
    process.kill(-server.pid, signal);
  } catch {
    // ya terminado
  }
};
server.on('exit', (code) => {
  stopAll('SIGTERM');
  process.exit(code ?? 1);
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => stopAll(signal));
}

async function waitForServer() {
  for (let i = 0; i < 180; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status < 500) return true;
    } catch {
      // todavía arrancando
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function ensureAdmin() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) return;
  if (!(await waitForServer())) {
    console.error('[start] La tienda no respondió; no se crea el administrador.');
    return;
  }
  const ssl = ['require', 'prefer', 'verify-ca', 'verify-full'].includes(
    process.env.DB_SSLMODE || ''
  );
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: ssl ? { rejectUnauthorized: true } : false
  });
  try {
    await client.connect();
    const { rowCount } = await client.query(
      'SELECT 1 FROM admin_user WHERE email = $1',
      [email]
    );
    if (rowCount > 0) return;
  } catch (e) {
    console.error('[start] No se pudo comprobar el administrador:', e.message);
    return;
  } finally {
    await client.end().catch(() => {});
  }
  console.log(`[start] Creando el administrador ${email}`);
  run([
    'user:create',
    '--name',
    process.env.ADMIN_FULLNAME || 'Administrador',
    '--email',
    email,
    '--password',
    password
  ]);
}

ensureAdmin();
