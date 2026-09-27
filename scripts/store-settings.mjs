#!/usr/bin/env node
// Pone el nombre y la descripción de la tienda (títulos de página, emails,
// ruta de navegación…) si siguen con los valores de fábrica de EverShop.
// Si ya se cambiaron desde el panel, no se tocan (salvo con --force).
//
//   node scripts/store-settings.mjs --to <url> --email <admin> --password '...' [--force]
// Nombre: STORE_NAME (por defecto «Tienda de Instituto Al-Bayān»).
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) {
      const next = all[i + 1];
      acc.push([a.slice(2), next && !next.startsWith('--') ? next : true]);
    }
    return acc;
  }, [])
);
const TO = String(args.to || '').replace(/\/$/, '');
const NAME = process.env.STORE_NAME || 'Tienda de Instituto Al-Bayān';
const DESCRIPTION =
  process.env.STORE_DESCRIPTION ||
  'Libros, material didáctico del Método Andalusí y recursos para aprender árabe y cultura islámica en español.';
const FACTORY_NAMES = ['', 'evershop'];

let cookie = '';
async function api(path, method, json) {
  const res = await fetch(`${TO}${path}`, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: json ? JSON.stringify(json) : undefined
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error?.message || `${method} ${path} → HTTP ${res.status}`);
  return body;
}

await api('/admin/user/login', 'POST', { email: args.email, password: args.password });
const { data } = await api('/api/graphql', 'POST', { query: '{ setting { storeName storeDescription } }' });
const current = data?.setting || {};
const update = {};
if (args.force || FACTORY_NAMES.includes(String(current.storeName || '').trim().toLowerCase())) {
  update.storeName = NAME;
}
if (args.force || !String(current.storeDescription || '').trim()) {
  update.storeDescription = DESCRIPTION;
}
if (Object.keys(update).length === 0) {
  console.log(`Nombre de la tienda: «${current.storeName}» (sin cambios)`);
} else {
  await api('/api/settings', 'POST', update);
  console.log(`✓ Ajustes de la tienda: ${Object.entries(update).map(([k, v]) => `${k} = «${v}»`).join(', ')}`);
}
