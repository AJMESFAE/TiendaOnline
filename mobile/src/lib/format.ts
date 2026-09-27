const dateFormat = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

/** EverShop devuelve las fechas como `{ value, text }` o como cadena ISO. */
export function formatDate(value: unknown): string {
  const raw =
    value && typeof value === 'object' && 'value' in value
      ? (value as { value: string }).value
      : value;
  if (!raw) return '';
  // Algunas fechas llegan como milisegundos en texto ("1790516640096").
  const d = /^\d{11,}$/.test(String(raw)) ? new Date(Number(raw)) : new Date(String(raw));
  return Number.isNaN(d.getTime()) ? String(raw) : dateFormat.format(d);
}

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const formatMoney = (n: number) => money.format(n);

/** Igual que slugify() de scripts/import-shopify.mjs, para que las URL coincidan. */
export function slugify(text: string): string {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Acepta "12,50" y "12.50". Devuelve NaN si no es un número. */
export function parseDecimal(text: string): number {
  const clean = text.trim().replace(/\s/g, '').replace(',', '.');
  return clean === '' ? NaN : Number(clean);
}
