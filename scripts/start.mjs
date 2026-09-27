// Arranque del contenedor en Azure:
//   1. Lanza `evershop start` (aplica las migraciones y sirve la tienda).
//   2. Cuando la tienda responde, crea el administrador ADMIN_EMAIL /
//      ADMIN_PASSWORD si todavía no existe (solo la primera vez: después se
//      gestiona desde el panel y no se vuelve a tocar).
//   3. Crea las páginas legales que falten (scripts/create-pages.mjs
//      --only-missing). Las que ya existen no se modifican.
//   4. Si la tienda no tiene ningún producto, importa los de la tienda
//      Shopify actual (scripts/import-shopify.mjs). Desactivar con
//      SHOPIFY_IMPORT=false.
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

function dbClient() {
  const ssl = ['require', 'prefer', 'verify-ca', 'verify-full'].includes(
    process.env.DB_SSLMODE || ''
  );
  return new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: ssl ? { rejectUnauthorized: true } : false
  });
}

function runScript(name, args) {
  const script = path.join(path.dirname(new URL(import.meta.url).pathname), name);
  return new Promise((resolve) =>
    spawn(process.execPath, [script, ...args], { stdio: 'inherit', env: process.env })
      .on('exit', (code) => resolve(code))
      .on('error', () => resolve(1))
  );
}

async function ensureAdmin() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) return;
  if (!(await waitForServer())) {
    console.error('[start] La tienda no respondió; no se crea el administrador.');
    return;
  }
  const client = dbClient();
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
  await new Promise((resolve) =>
    run([
      'user:create',
      '--name',
      process.env.ADMIN_FULLNAME || 'Administrador',
      '--email',
      email,
      '--password',
      password
    ]).on('exit', resolve)
  );
}

// Páginas legales: se crean las que falten, con la API local de la tienda.
async function ensureLegalPages() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password || process.env.SKIP_LEGAL_PAGES === 'true') return;
  const code = await runScript('create-pages.mjs', [
    '--to', `http://127.0.0.1:${port}`, '--email', email, '--password', password, '--only-missing'
  ]);
  if (code !== 0) {
    console.error('[start] No se pudieron crear las páginas legales (¿cambió la contraseña del administrador?). Use infra/create-pages.sh.');
  }
}

// Catálogo: si la tienda está vacía, se importan los productos de Shopify.
async function ensureProducts() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password || process.env.SHOPIFY_IMPORT === 'false') return;
  const client = dbClient();
  let count = 1;
  try {
    await client.connect();
    count = Number((await client.query('SELECT count(*) AS n FROM product')).rows[0].n);
  } catch (e) {
    console.error('[start] No se pudo contar los productos:', e.message);
    return;
  } finally {
    await client.end().catch(() => {});
  }
  if (count > 0) return;
  const from = process.env.SHOPIFY_IMPORT_URL || 'https://tienda.institutoalbayan.com';
  console.log(`[start] La tienda no tiene productos: importando desde ${from}`);
  const code = await runScript('import-shopify.mjs', [
    '--from', from, '--to', `http://127.0.0.1:${port}`, '--email', email, '--password', password
  ]);
  if (code !== 0) {
    console.error('[start] La importación de productos no terminó bien. Use infra/import-products.sh.');
  }
}

(async () => {
  await ensureAdmin();
  if (await waitForServer()) {
    await ensureLegalPages();
    await ensureProducts();
  }
})();
