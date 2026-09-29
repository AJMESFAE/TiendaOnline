import fs from 'fs';
import path from 'path';
import { contentLocale } from './content.js';

/** Datos de seguridad de cada producto (GPSR, art. 19): ver content/product-safety.json. */
const FILE = path.resolve(import.meta.dirname, '..', '..', 'content', 'product-safety.json');

type Entry = { manufacturer?: string; address?: string; email?: string; warnings?: Record<string, string> };
let data: { default: Entry; products: Record<string, Entry> } = { default: {}, products: {} };
try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  // sin archivo: no se muestran datos
}

export function productSafety(sku: string | null | undefined) {
  const own = (sku && data.products?.[sku]) || {};
  const base = data.default || {};
  const warnings = own.warnings || {};
  const locale = contentLocale() || 'es';
  return {
    manufacturer: own.manufacturer || base.manufacturer || null,
    address: own.address || base.address || null,
    email: own.email || base.email || null,
    warnings: warnings[locale] || warnings.es || null
  };
}
