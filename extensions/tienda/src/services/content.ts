import fs from 'fs';
import path from 'path';
import { pool } from '@evershop/evershop/lib/postgres';
import { getActiveLocale, getLocaleContext } from '@evershop/evershop/lib/locale/localeContext';

/**
 * Contenido traducido de la tienda (el español es el del panel):
 *  - Nombres de producto: extensions/tienda/content/products.json, por SKU.
 *  - Páginas de contenido: la versión de cada idioma es otra página con la
 *    clave «<url_key>-en» / «<url_key>-ar» (las crea scripts/create-pages.mjs);
 *    /en/aviso-legal muestra el contenido de «aviso-legal-en».
 */
const PRODUCTS_FILE = path.resolve(import.meta.dirname, '..', '..', 'content', 'products.json');
let products: Record<string, Record<string, string>> = {};
try {
  products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
} catch {
  products = {};
}

/** Idioma de la petición si no es el de por defecto (español); si no, null. */
export function contentLocale(): string | null {
  const ctx = getLocaleContext();
  if (!ctx || ctx.isAdmin) return null;
  const locale = getActiveLocale();
  return locale && locale !== ctx.defaultLocale ? locale : null;
}

export function productName(sku: string | null | undefined, name: string, locale = contentLocale()): string {
  if (!locale || !sku) return name;
  return products[sku]?.[locale] || name;
}

type PageTexts = { name: string; content: string; metaTitle: string | null; metaDescription: string | null };
const cache = new Map<string, { at: number; page: PageTexts | null }>();

export async function translatedPage(urlKey: string, locale = contentLocale()): Promise<PageTexts | null> {
  if (!locale || !urlKey || /-(en|ar)$/.test(urlKey)) return null;
  const key = `${urlKey}-${locale}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.page;
  const { rows } = await pool.query(
    `SELECT d.name, d.content, d.meta_title, d.meta_description
     FROM cms_page_description d JOIN cms_page p ON p.cms_page_id = d.cms_page_description_cms_page_id
     WHERE d.url_key = $1 AND p.status = TRUE LIMIT 1`,
    [key]
  );
  const r = rows[0];
  const page = r ? { name: r.name, content: r.content, metaTitle: r.meta_title, metaDescription: r.meta_description } : null;
  cache.set(key, { at: Date.now(), page });
  return page;
}
