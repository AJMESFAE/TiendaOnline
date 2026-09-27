/**
 * Idioma de la tienda según el dispositivo: árabe → árabe, español (y catalán,
 * gallego, euskera) → español, cualquier otro → inglés. Se mira solo el idioma
 * principal del dispositivo (el primero de Accept-Language).
 */
export const LANG_COOKIE = 'tienda_lang';

export function deviceLanguage(acceptLanguage: string | undefined): string | null {
  const first = String(acceptLanguage || '')
    .split(',')[0]
    ?.trim()
    .split(';')[0]
    .toLowerCase();
  if (!first || first === '*') return null;
  const primary = first.split('-')[0];
  if (primary === 'ar') return 'ar';
  if (['es', 'ca', 'gl', 'eu'].includes(primary)) return 'es';
  return 'en';
}
