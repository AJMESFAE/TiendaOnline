#!/usr/bin/env node
// Crea (o actualiza, si ya existen) las páginas legales de la tienda con la
// API del panel de administración. Contenido: scripts/legal-pages.mjs.
//
//   node scripts/create-pages.mjs --to https://<tienda> --email <admin> --password '...'
//     [--contact-email tienda@…] [--phone …] [--registry "Registro de Fundaciones…, n.º …"]
//     [--shipping-cost "4,95 € IVA incluido"] [--shipping-days "2 a 5 días laborables"]
//     [--prep-days "24-48 horas laborables"] [--free-shipping-from "50 €"] [--dry-run]
//     [--only-missing]   crea solo las páginas que no existan (no toca las demás;
//                        lo usa scripts/start.mjs en cada arranque)
import { buildLegalPages } from './legal-pages.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) {
      const next = all[i + 1];
      acc.push([a.slice(2), next && !next.startsWith('--') ? next : true]);
    }
    return acc;
  }, [])
);
const TO = String(args.to || process.env.TIENDA_URL || '').replace(/\/$/, '');
const EMAIL = args.email || process.env.ADMIN_EMAIL;
const PASSWORD = args.password || process.env.ADMIN_PASSWORD;

const pages = buildLegalPages({
  email: args['contact-email'] || process.env.CONTACT_EMAIL,
  phone: args.phone || process.env.CONTACT_PHONE,
  registry: args.registry || process.env.FOUNDATION_REGISTRY,
  shippingCost: args['shipping-cost'] || process.env.SHIPPING_COST,
  shippingDays: args['shipping-days'] || process.env.SHIPPING_DAYS,
  prepDays: args['prep-days'] || process.env.SHIPPING_PREP_DAYS,
  freeShippingFrom: args['free-shipping-from'] || process.env.FREE_SHIPPING_FROM,
  storeUrl: args['store-url'] || process.env.STORE_PUBLIC_URL || 'https://tienda.institutoalbayan.com'
});
const ONLY_MISSING = Boolean(args['only-missing']);

const pending = [...new Set(JSON.stringify(pages).match(/\[COMPLETAR: [^\]]+\]/g) || [])];

if (args['dry-run']) {
  for (const p of pages) console.log(`· ${p.name} (/${p.url_key}) — ${p.content[0].columns[0].data.blocks.length} bloques`);
  if (pending.length) console.log(`\nDatos pendientes:\n  ${pending.join('\n  ')}`);
  process.exit(0);
}
if (!TO || !EMAIL || !PASSWORD) {
  console.error('Faltan datos: --to <url de la tienda> --email <admin> --password <contraseña>');
  process.exit(1);
}

let cookie = '';
async function api(path, method, json) {
  const res = await fetch(`${TO}${path}`, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: json ? JSON.stringify(json) : undefined
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok || body.error) throw new Error(body.error?.message || `${method} ${path} → HTTP ${res.status}`);
  return body;
}

await api('/admin/user/login', 'POST', { email: EMAIL, password: PASSWORD });
const { data } = await api('/api/admin/graphql', 'POST', { query: '{ cmsPages { items { uuid urlKey } } }' });
const existing = new Map(data.cmsPages.items.map((p) => [p.urlKey, p.uuid]));

for (const page of pages) {
  const uuid = existing.get(page.url_key);
  if (uuid && ONLY_MISSING) {
    continue;
  }
  if (uuid) {
    await api(`/api/pages/${uuid}`, 'PATCH', page);
    console.log(`✓ actualizada: ${page.name}  →  ${TO}/${page.url_key}`);
  } else {
    await api('/api/pages', 'POST', page);
    console.log(`✓ creada:      ${page.name}  →  ${TO}/${page.url_key}`);
  }
}
if (pending.length) {
  console.log(`\nQuedan datos por completar (se ven en las páginas como [COMPLETAR: …]):\n  ${pending.join('\n  ')}`);
  console.log('Vuelva a ejecutar el script con esos datos para actualizar las páginas.');
}
