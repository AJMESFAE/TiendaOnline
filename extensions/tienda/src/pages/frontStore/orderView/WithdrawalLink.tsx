import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/** «Desistir del contrato aquí» en el detalle del pedido de la cuenta del cliente. */
export default function WithdrawalLink({ order, homeUrl }: { order?: { orderNumber?: string }; homeUrl: string }) {
  if (!order?.orderNumber) return null;
  const href = `${String(homeUrl || '').replace(/\/+$/, '')}/desistimiento?order=${encodeURIComponent(order.orderNumber)}`;
  return (
    <div className="page-width mb-10 text-sm">
      <a href={href} className="font-semibold underline">
        {_('Withdraw from contract here')}
      </a>
      <span className="text-muted-foreground"> · {_('within 14 days of receiving your order')}</span>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderUuid")) {
      orderNumber
    }
    homeUrl: url(routeId: "homepage")
  }
`;
