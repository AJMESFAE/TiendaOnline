import { addProcessor } from '@evershop/evershop/lib/util/registry';

/**
 * Filtro `to_ship` de la lista de pedidos (GraphQL `orders(filters: [{key: "to_ship",
 * operation: eq, value: "1"}])`), que usa la app móvil en «Por enviar».
 *
 * Con los filtros de serie no se puede pedir «lo que hay que preparar»: un
 * pedido cancelado o uno de Redsys abandonado sin pagar siguen con el envío en
 * `pending`. Aquí solo entran los pedidos con envío pendiente o parcial, que no
 * están cancelados ni cerrados, y que están cobrados (o son contra reembolso).
 */
const PAID_STATUSES = ['paid', 'partial_refunded', 'redsys_captured', 'redsys_partial_refunded'];

export default () => {
  addProcessor(
    'orderCollectionFilters',
    (filters: any[]) => [
      ...filters,
      {
        key: 'to_ship',
        operation: ['eq'],
        callback: (query: any, operation: string, value: string, currentFilters: any[]) => {
          if (value !== '1') return;
          query.getWhere().addRaw(
            'AND',
            `"order".shipment_status IN ('pending', 'partially_shipped')
             AND "order".status NOT IN ('canceled', 'closed', 'completed')
             AND ("order".payment_method = 'cod'
                  OR "order".payment_status IN (${PAID_STATUSES.map((s) => `'${s}'`).join(', ')}))`
          );
          currentFilters.push({ key: 'to_ship', operation, value });
        }
      }
    ],
    // Después de los filtros de serie (1) y de paginación (2).
    3
  );
};
