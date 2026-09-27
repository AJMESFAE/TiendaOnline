#!/usr/bin/env node
// Configura el IVA de la tienda según el tipo de producto:
//   · «IVA superreducido 4 % (libros)»   → libros
//   · «IVA general 21 % (juguetes y otros)» → juguetes, láminas y resto de productos
//
// Los precios publicados y el envío ya llevan el IVA incluido
// (priceIncludingTax = 1). El envío tributa en proporción al IVA de los
// productos del carrito (4 % si solo hay libros; mezcla si hay de los dos).
// El IVA se calcula con la dirección de envío. Canarias, Ceuta y Melilla no
// llevan IVA (no se les aplica ninguna tasa).
//
//   node scripts/tax-settings.mjs --to <url> --email <admin> --password '...' [--force] [--dry-run]
//
// Cada producto se asigna por su url_key (lista BOOKS/OTHERS de abajo). Solo se
// tocan los productos sin clase de IVA; con --force se reasignan todos los de la
// lista. Los productos nuevos se crean con el 21 % por defecto: al dar de alta un
// libro, elija «IVA superreducido 4 % (libros)» en su ficha.
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
  console.error("Uso: node scripts/tax-settings.mjs --to <url> --email <admin> --password '...' [--force] [--dry-run]");
  process.exit(1);
}
const DRY = Boolean(args['dry-run']);

const BOOKS_CLASS = 'IVA superreducido 4 % (libros)';
const OTHERS_CLASS = 'IVA general 21 % (juguetes y otros)';
// Península y Baleares (sin Canarias ES-CN, Ceuta ES-CE ni Melilla ES-ML).
const IVA_PROVINCES = [
  'ES-AN', 'ES-AR', 'ES-AS', 'ES-CB', 'ES-CL', 'ES-CM', 'ES-CT', 'ES-EX', 'ES-GA',
  'ES-IB', 'ES-RI', 'ES-MD', 'ES-MC', 'ES-NC', 'ES-PV', 'ES-VC'
].join(',');
const CLASSES = [
  { name: BOOKS_CLASS, rate: { name: 'IVA 4 %', rate: 4 } },
  { name: OTHERS_CLASS, rate: { name: 'IVA 21 %', rate: 21 } }
];
// Productos actuales. Añada aquí los nuevos si se quieren asignar con el script.
const BOOKS = ['el-metodo-andalusi-nivel-basico', 'luces-sobre-el-estudio-de-la-sirah'];
const OTHERS = ['alifato']; // lámina del alifato: no es un libro → 21 %

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
  if (!res.ok || body.error || body.errors) {
    throw new Error(body.error?.message || body.errors?.[0]?.message || `${method} ${path} → HTTP ${res.status}`);
  }
  return body;
}
const gql = async (query) => (await api('/api/admin/graphql', 'POST', { query })).data;
const write = async (label, fn) => {
  if (DRY) return console.log(`(simulación) ${label}`);
  await fn();
  console.log(`✓ ${label}`);
};

await api('/admin/user/login', 'POST', { email: args.email, password: args.password });

// 1. Clases de IVA y sus tasas
const loadClasses = async () =>
  (await gql('{ taxClasses { items { taxClassId uuid name rates { name rate country province } } } }'))
    .taxClasses.items;
let classes = await loadClasses();
for (const def of CLASSES) {
  let cls = classes.find((c) => c.name === def.name);
  if (!cls) {
    await write(`Clase de IVA «${def.name}»`, () => api('/api/tax/classes', 'POST', { name: def.name }));
    classes = DRY ? classes : await loadClasses();
    cls = classes.find((c) => c.name === def.name);
  }
  if (cls && !(cls.rates || []).some((r) => Number(r.rate) === def.rate.rate && r.country === 'ES')) {
    await write(`Tasa ${def.rate.name} en «${def.name}» (península y Baleares)`, () =>
      api(`/api/tax/classes/${cls.uuid}/rates`, 'POST', {
        name: def.rate.name,
        country: 'ES',
        province: IVA_PROVINCES,
        postcode: '*',
        rate: def.rate.rate,
        is_compound: 0,
        priority: 0
      })
    );
  }
}
const idOf = (name) => classes.find((c) => c.name === name)?.taxClassId;

// 2. Ajustes: precios con IVA incluido, envío proporcional, dirección de envío
if (idOf(OTHERS_CLASS)) {
  await write('Ajustes de IVA (precios y envío con IVA incluido)', () =>
    api('/api/settings', 'POST', {
      priceIncludingTax: 1,
      defaultShippingTaxClassId: -1,
      defaultProductTaxClassId: idOf(OTHERS_CLASS),
      baseCalculationAddress: 'shippingAddress'
    })
  );
}

// 3. Clase de IVA de cada producto
const products = (
  await gql('{ products(filters: [{ key: "limit", operation: eq, value: "500" }]) { items { uuid name urlKey taxClass } } }')
).products.items;
for (const [keys, className] of [[BOOKS, BOOKS_CLASS], [OTHERS, OTHERS_CLASS]]) {
  const classId = idOf(className);
  for (const key of keys) {
    const p = products.find((x) => x.urlKey === key);
    if (!p) {
      console.log(`· ${key}: no existe en la tienda`);
      continue;
    }
    if (!classId || (p.taxClass && !args.force) || Number(p.taxClass) === classId) {
      console.log(`· ${p.name}: sin cambios`);
      continue;
    }
    await write(`${p.name} → ${className}`, () => api(`/api/products/${p.uuid}`, 'PATCH', { tax_class: classId }));
  }
}
const pending = products.filter((p) => !p.taxClass && ![...BOOKS, ...OTHERS].includes(p.urlKey));
if (pending.length) {
  console.log(`\nProductos sin clase de IVA (asígnela en su ficha): ${pending.map((p) => p.name).join(', ')}`);
}
