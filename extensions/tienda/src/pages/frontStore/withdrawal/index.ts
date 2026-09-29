import { translate } from '@evershop/evershop/lib/locale/translate/translate';
import { getContextValue, setContextValue } from '@evershop/evershop/graphql/services';

/** Página «Desistir del contrato» (ver services/withdrawal). */
export default (request, response, next) => {
  // Enlace firmado de los correos del pedido (?t=…): lo valida la consulta tiendaWithdrawalOrder.
  const token = typeof request.query?.t === 'string' ? request.query.t.slice(0, 100) : '';
  setContextValue(request, 'withdrawalToken', token);
  const current = getContextValue(request, 'pageInfo', {}) as Record<string, unknown>;
  setContextValue(request, 'pageInfo', {
    ...current,
    title: translate('Withdraw from the contract'),
    description: translate('Withdraw from your purchase within 14 days')
  });
  next();
};
