#!/usr/bin/env node
// Importa los productos de la tienda Shopify actual (tienda.institutoalbayan.com)
// a la tienda EverShop nueva, usando la API del panel de administración.
//
//   node scripts/import-shopify.mjs \
//     --to https://<app>.azurewebsites.net \
//     --email admin@institutoalbayan.com --password '...' \
//     [--from https://tienda.institutoalbayan.com] [--handles a,b,c] [--dry-run]
//
// También lee TIENDA_URL, ADMIN_EMAIL y ADMIN_PASSWORD del entorno.
//
// Por cada producto: descarga sus imágenes y las sube a la tienda nueva (van al
// almacenamiento configurado: Blob Storage en Azure), crea la categoría a partir
// del "tipo de producto" de Shopify y crea el producto con precio, SKU, peso,
// descripción e imágenes. Si un SKU ya existe en la tienda nueva, se omite:
// se puede ejecutar varias veces sin duplicar nada.
//
// Solo usa Node.js 20+ (sin dependencias).

import { writeFile } from 'node:fs/promises';

// ---------------------------------------------------------------- argumentos
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) {
      const next = all[i + 1];
      acc.push([a.slice(2), next && !next.startsWith('--') ? next : true]);
    }
    return acc;
  }, [])
);
const FROM = String(args.from || 'https://tienda.institutoalbayan.com').replace(/\/$/, '');
const TO = String(args.to || process.env.TIENDA_URL || '').replace(/\/$/, '');
const EMAIL = args.email || process.env.ADMIN_EMAIL;
const PASSWORD = args.password || process.env.ADMIN_PASSWORD;
const DRY_RUN = Boolean(args['dry-run']);
const HANDLES = args.handles ? String(args.handles).split(',').map((h) => h.trim()).filter(Boolean) : null;

if (!DRY_RUN && (!TO || !EMAIL || !PASSWORD)) {
  console.error('Faltan datos: --to <url de la tienda nueva> --email <admin> --password <contraseña>');
  process.exit(1);
}

const log = (...m) => console.log(...m);

// ------------------------------------------------------------------ Shopify
async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'albayan-import/1.0' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function fetchShopifyProducts() {
  if (HANDLES) {
    const list = [];
    for (const h of HANDLES) list.push((await getJson(`${FROM}/products/${h}.json`)).product);
    return list;
  }
  const list = [];
  for (let page = 1; page < 50; page++) {
    const { products } = await getJson(`${FROM}/products.json?limit=250&page=${page}`);
    if (!products || products.length === 0) break;
    list.push(...products);
    if (products.length < 250) break;
  }
  return list;
}

// --------------------------------------- HTML de Shopify → bloques de EditorJS
const INLINE_OK = /<\/?(b|strong|i|em|u|a|br)(\s[^>]*)?>/gi;
function decodeEntities(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function cleanInline(html) {
  // Conserva negrita, cursiva, subrayado y enlaces; quita el resto de etiquetas.
  const kept = [];
  const marked = html.replace(INLINE_OK, (tag) => {
    kept.push(tag.replace(/\s(style|class|data-[\w-]+)="[^"]*"/gi, ''));
    return `\u0000${kept.length - 1}\u0000`;
  });
  return decodeEntities(marked.replace(/<[^>]+>/g, ''))
    .replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)])
    .replace(/\s+/g, ' ')
    .trim();
}
export function htmlToEditorJs(html, key) {
  const blocks = [];
  const source = String(html || '')
    .replace(/\r/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  const re = /<(h[1-6]|p|li|div|blockquote)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m;
  let matched = false;
  while ((m = re.exec(source))) {
    matched = true;
    const tag = m[1].toLowerCase();
    for (const part of m[3].split(/<br\s*\/?>\s*<br\s*\/?>/i)) {
      const text = cleanInline(part);
      if (!text) continue;
      if (tag.startsWith('h')) {
        blocks.push({ type: 'header', data: { text, level: Math.min(Math.max(Number(tag[1]), 2), 4) } });
      } else {
        blocks.push({ type: 'paragraph', data: { text: tag === 'li' ? `• ${text}` : text } });
      }
    }
  }
  if (!matched) {
    for (const part of source.split(/<br\s*\/?>\s*<br\s*\/?>|\n{2,}/i)) {
      const text = cleanInline(part);
      if (text) blocks.push({ type: 'paragraph', data: { text } });
    }
  }
  return [
    {
      id: `r_${key}`,
      size: 1,
      className: 'md:grid-cols-1',
      columns: [
        {
          id: `c_${key}`,
          size: 1,
          data: {
            time: Date.now(),
            version: '2.31.0',
            blocks: blocks.map((b, i) => ({ id: `${key}_${i}`, ...b }))
          }
        }
      ]
    }
  ];
}

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ------------------------------------------ Shopify → productos de EverShop
export function mapProduct(p) {
  const variants = p.variants?.length ? p.variants : [{}];
  return variants.map((v, i) => {
    const multi = variants.length > 1;
    const suffix = multi ? ` - ${v.title}` : '';
    const handle = multi ? `${p.handle}-${slugify(v.title || i + 1)}` : p.handle;
    const price = Number(v.price ?? 0);
    const compareAt = Number(v.compare_at_price || 0);
    const grams = Number(v.grams || 0);
    return {
      handle,
      name: `${p.title}${suffix}`,
      sku: (v.sku && String(v.sku).trim()) || `SHOP-${handle}`.toUpperCase().slice(0, 60),
      price,
      oldPrice: compareAt > price ? compareAt : null,
      weightKg: grams > 0 ? grams / 1000 : 0.5,
      requiresShipping: v.requires_shipping !== false,
      available: v.available !== false,
      category: p.product_type || null,
      tags: Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      bodyHtml: p.body_html || '',
      images: (p.images || []).map((img) => img.src).filter(Boolean),
      sourceUrl: `${FROM}/products/${p.handle}`
    };
  });
}

// ------------------------------------------------------------ API EverShop
let cookie = '';
async function api(path, { method = 'GET', json, form } = {}) {
  const res = await fetch(`${TO}${path}`, {
    method,
    headers: { Cookie: cookie, ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : form
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
  if (!res.ok || body.error) {
    throw new Error(body.error?.message || `${method} ${path} → HTTP ${res.status}`);
  }
  return body;
}
const adminGraphql = (query) => api('/api/admin/graphql', { method: 'POST', json: { query } }).then((r) => r.data);

async function login() {
  await api('/admin/user/login', { method: 'POST', json: { email: EMAIL, password: PASSWORD } });
  if (!cookie) throw new Error('El inicio de sesión no devolvió cookie de sesión');
}

async function ensurePackage() {
  const { packages } = await adminGraphql('{ packages { packageId name isDefault } }');
  const existing = packages.find((p) => p.name === 'Libro / material impreso') || packages.find((p) => p.isDefault);
  if (existing) return existing.packageId;
  const { data } = await api('/api/packages', {
    method: 'POST',
    json: { name: 'Libro / material impreso', length: 30, width: 22, height: 5, weight: 0.05, is_default: true }
  });
  return data.package_id;
}

const categoryCache = new Map();
async function ensureCategory(name) {
  if (!name) return null;
  const urlKey = slugify(name);
  if (categoryCache.has(urlKey)) return categoryCache.get(urlKey);
  const { categories } = await adminGraphql('{ categories { items { categoryId urlKey } } }');
  let found = categories.items.find((c) => c.urlKey === urlKey);
  if (!found) {
    const { data } = await api('/api/categories', {
      method: 'POST',
      json: { name, url_key: urlKey, status: 1, include_in_nav: 1, show_products: 1, description: [] }
    });
    found = { categoryId: data.category_id };
    log(`  + categoría creada: ${name}`);
  }
  categoryCache.set(urlKey, found.categoryId);
  return found.categoryId;
}

async function uploadImages(handle, urls) {
  const uploaded = [];
  for (const [i, url] of urls.entries()) {
    const res = await fetch(url);
    if (!res.ok) {
      log(`  ! no se pudo descargar la imagen ${url} (HTTP ${res.status})`);
      continue;
    }
    const type = res.headers.get('content-type') || 'image/jpeg';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
    const form = new FormData();
    form.append('images', new Blob([await res.arrayBuffer()], { type }), `${slugify(handle)}-${i + 1}.${ext}`);
    const folder = `catalog/importacion/${slugify(handle) || 'producto'}`;
    const { data } = await api(`/api/images/${folder}`, { method: 'POST', form });
    uploaded.push(...data.files.map((f) => f.url));
  }
  return uploaded;
}

async function existingSkus() {
  const { products } = await adminGraphql('{ products(filters: [{key: "limit", operation: eq, value: "1000"}]) { items { sku } } }');
  return new Set(products.items.map((p) => p.sku));
}

// --------------------------------------------------------------------- main
async function main() {
  log(`Leyendo productos de ${FROM} …`);
  const shopify = await fetchShopifyProducts();
  const items = shopify.flatMap(mapProduct);
  log(`Encontrados ${shopify.length} productos (${items.length} fichas a crear).`);
  await writeFile('productos-shopify.json', JSON.stringify({ shopify, items }, null, 2));
  log('Copia de los datos originales guardada en productos-shopify.json');
  for (const it of items) {
    log(`  · ${it.name} — ${it.price.toFixed(2)} € — SKU ${it.sku} — ${it.images.length} imagen(es)${it.requiresShipping ? '' : ' — sin envío'}`);
  }
  if (DRY_RUN) {
    log('\nModo prueba (--dry-run): no se ha creado nada.');
    return;
  }

  log(`\nConectando con ${TO} …`);
  await login();
  const packageId = await ensurePackage();
  const skus = await existingSkus();
  let created = 0;
  let skipped = 0;
  const failed = [];

  for (const it of items) {
    log(`\n→ ${it.name}`);
    if (skus.has(it.sku)) {
      log('  = ya existe (mismo SKU), se omite');
      skipped++;
      continue;
    }
    try {
      const images = await uploadImages(it.handle, it.images);
      const categoryId = await ensureCategory(it.category);
      const payload = {
        name: it.name,
        sku: it.sku,
        url_key: slugify(it.handle),
        price: it.price,
        qty: it.available ? 100 : 0,
        manage_stock: 1,
        stock_availability: it.available ? 1 : 0,
        status: 1,
        visibility: 1,
        group_id: 1,
        weight: it.requiresShipping ? it.weightKg : 0,
        no_shipping_required: !it.requiresShipping,
        ...(it.requiresShipping ? { package_id: packageId } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
        images,
        description: htmlToEditorJs(it.bodyHtml, slugify(it.handle).replace(/-/g, '_')),
        meta_title: it.name,
        meta_description: it.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160),
        meta_keywords: it.tags.join(', ')
      };
      await api('/api/products', { method: 'POST', json: payload });
      log(`  ✓ creado (${images.length} imagen(es)${categoryId ? ', con categoría' : ''})`);
      if (it.oldPrice) log(`  i en Shopify tenía precio tachado ${it.oldPrice.toFixed(2)} €: revíselo en el panel`);
      created++;
    } catch (e) {
      log(`  ✗ error: ${e.message}`);
      failed.push(it.name);
    }
  }

  log(`\nResumen: ${created} creados, ${skipped} ya existían, ${failed.length} con error.`);
  if (failed.length) {
    log(`Con error: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
  log('Revise en el panel el stock (se pone 100 si está disponible: Shopify no publica la cantidad real).');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`\nError: ${e.message}`);
    process.exit(1);
  });
}
