import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Aviso junto al botón de pago (art. 97 y 98 TRLGDCU; art. 27 LSSI-CE): el botón
 * implica obligación de pago, y se enlazan las condiciones de venta, el derecho de
 * desistimiento y la política de privacidad.
 */
export default function PreContractNotice({ homeUrl }: { homeUrl: string }) {
  const base = String(homeUrl || '').replace(/\/+$/, '');
  const link = (href: string, text: string) => (
    <a href={`${base}${href}`} className="underline" target="_blank" rel="noopener">
      {text}
    </a>
  );
  return (
    <p className="tienda-precontract mb-3 text-center text-xs leading-relaxed text-muted-foreground">
      {_('By clicking “Pay now” you place an order with an obligation to pay and accept the')}{' '}
      {link('/condiciones-de-venta', _('terms of sale'))}.{' '}
      {_('You have 14 days to withdraw')} ({link('/desistimiento', _('withdrawal'))}).{' '}
      {_('We process your data as described in the')} {link('/politica-de-privacidad', _('privacy policy'))}.
    </p>
  );
}

export const layout = {
  areaId: 'checkoutButtonBefore',
  sortOrder: 10
};

export const query = `
  query Query {
    homeUrl: url(routeId: "homepage")
  }
`;
