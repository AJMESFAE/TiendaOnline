import Handlebars from 'handlebars';
import '@evershop/evershop/lib/mail/emailHelper';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getStoreCurrency } from '@evershop/evershop/setting/services';

/**
 * Importes de los correos siempre con dos decimales (29,90 € y no 29,9 €). El
 * ayudante «currency» del núcleo usa minimumFractionDigits: 0; se registra de
 * nuevo después de cargar el del núcleo.
 */
function safeLocale(candidate: unknown): string {
  const locale = (typeof candidate === 'string' && candidate) || getConfig('shop.language', 'es');
  try {
    Intl.getCanonicalLocales(locale);
    return locale;
  } catch {
    return 'es';
  }
}

export function registerEmailCurrency() {
  Handlebars.registerHelper('currency', function (value: unknown) {
    if (value == null || value === '') return '';
    const options = arguments[arguments.length - 1];
    return new Intl.NumberFormat(safeLocale(options?.data?.locale), {
      style: 'currency',
      currency: getStoreCurrency(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value));
  });
}
