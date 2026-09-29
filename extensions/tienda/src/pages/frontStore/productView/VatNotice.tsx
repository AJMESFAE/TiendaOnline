import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/** «IVA incluido» y gastos de envío junto al precio (art. 20 y 97 TRLGDCU). */
export default function VatNotice({ homeUrl }: { homeUrl: string }) {
  const base = String(homeUrl || '').replace(/\/+$/, '');
  return (
    <p className="tienda-vat -mt-2 text-sm text-muted-foreground">
      {_('VAT included')} ·{' '}
      <a className="underline" href={`${base}/envios-y-devoluciones`}>
        {_('Shipping: €4.95, free from €30')}
      </a>
    </p>
  );
}

export const layout = {
  areaId: 'productSinglePageForm',
  sortOrder: 6
};

export const query = `
  query Query {
    homeUrl: url(routeId: "homepage")
  }
`;
