import { useAppState } from '@components/common/context/app.js';

/**
 * Enlaces internos en el idioma actual: la tienda sirve el español sin prefijo
 * y el árabe y el inglés con /ar/… y /en/…. Los enlaces a otras webs no cambian.
 */
export function localizeHref(href: string, locale?: string, defaultLocale?: string): string {
  if (!href.startsWith('/') || href.startsWith('//') || !locale || locale === defaultLocale) return href;
  if (href === '/') return `/${locale}`;
  if (href.startsWith('/#') || href.startsWith('/?')) return `/${locale}${href.slice(1) ? `/${href.slice(1)}` : ''}`;
  return `/${locale}${href}`;
}

export function useLocale() {
  const { locale = '', defaultLocale = '' } = (useAppState() || {}) as { locale?: string; defaultLocale?: string };
  return {
    locale: locale || defaultLocale || 'es',
    isRtl: (locale || '').startsWith('ar'),
    href: (h: string) => localizeHref(h, locale, defaultLocale)
  };
}
