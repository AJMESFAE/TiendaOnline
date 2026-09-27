#!/usr/bin/env node
// Tarifa del envío estándar: 4,95 € (IVA incluido) y gratis a partir de 30 €.
//
//   node scripts/shipping-settings.mjs --to <url> --email <admin> --password '...' [--dry-run]
//
// Pone en cada tarifa activa de los métodos de envío una tabla por importe
// (0 € → 4,95 €; 30 € → 0 €). El importe se compara con el subtotal con IVA
// (extensions/tienda). Se revisa y edita en Admin → Configuración → Envíos.
// Otros valores: SHIPPING_COST (4.95) y FREE_SHIPPING_FROM (30).
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
if (!TO || !args.email || !args.password) {
  console.error("Uso: node scripts/shipping-settings.mjs --to <url> --email <admin> --password '...' [--dry-run]");
  process.exit(1);
}
const COST = Number(process.env.SHIPPING_COST || 4.95);
const FREE_FROM = Number(process.env.FREE_SHIPPING_FROM || 30);
// Sin SHIPPING_METHOD_NAME se aplica a todos los métodos de envío activos.
const METHOD = process.env.SHIPPING_METHOD_NAME || null;

let cookie = '';
async function api(path, method, json) {
  const res = await fetch(path.startsWith('http') ? path : `${TO}${path}`, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: json ? JSON.stringify(json) : undefined
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error || body.errors) {
    throw new Error(body.error?.message || body.errors?.[0]?.message || `${method} ${path} → HTTP ${res.status}`);
  }
  return body;
}

await api('/admin/user/login', 'POST', { email: args.email, password: args.password });
const { data } = await api('/api/admin/graphql', 'POST', {
  query: `{ coreShippingMethods { name isEnabled rates { uuid isEnabled updateApi zone { name }
    cost { value } priceBasedCost { minPrice { value } cost { value } } } } }`
});
const methods = data.coreShippingMethods.filter((m) => (METHOD ? m.name === METHOD : m.isEnabled));
if (!methods.length) {
  console.error(`No hay ningún método de envío${METHOD ? ` «${METHOD}»` : ' activo'}. Créelo en Admin → Configuración → Envíos.`);
  process.exit(1);
}
const tiers = [
  { min_price: 0, cost: COST },
  { min_price: FREE_FROM, cost: 0 }
];
for (const { name, rate } of methods.flatMap((m) => m.rates.map((rate) => ({ name: m.name, rate }))).filter((x) => x.rate.isEnabled)) {
  const current = (rate.priceBasedCost || []).map((t) => `${t.minPrice.value}:${t.cost.value}`).join(',');
  if (rate.cost === null && current === tiers.map((t) => `${t.min_price}:${t.cost}`).join(',')) {
    console.log(`· ${name} (${rate.zone?.name}): sin cambios`);
    continue;
  }
  if (args['dry-run']) {
    console.log(`(simulación) ${name} (${rate.zone?.name}): ${COST} € y gratis desde ${FREE_FROM} €`);
    continue;
  }
  await api(rate.updateApi, 'PATCH', { cost: null, price_based_cost: tiers });
  console.log(`✓ ${name} (${rate.zone?.name}): ${COST} € y gratis desde ${FREE_FROM} €`);
}
