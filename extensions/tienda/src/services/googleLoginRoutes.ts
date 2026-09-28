import { getStoreLanguage } from '@evershop/evershop/setting/services';

/** Prefijo de idioma de las URL de la tienda ('' en español, '/ar', '/en'). */
export async function localePrefix(locale: string | undefined): Promise<string> {
  const def = await getStoreLanguage();
  return locale && locale !== def ? `/${locale}` : '';
}

export async function loginPageUrl(locale: string | undefined, error?: string): Promise<string> {
  return `${await localePrefix(locale)}/account/login${error ? `?google_error=${error}` : ''}`;
}
