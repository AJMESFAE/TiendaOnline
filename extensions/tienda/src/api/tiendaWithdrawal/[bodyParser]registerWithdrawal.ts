import { error } from '@evershop/evershop/lib/log';
import { translate } from '@evershop/evershop/lib/locale/translate/translate';
import { OrderNotFoundError, registerWithdrawal } from '../../services/withdrawal.js';

/** POST /api/tienda/withdrawals — confirma el desistimiento (ver services/withdrawal). */
export default async (request, response) => {
  const { token, orderNumber, email, fullName, items, comment } = request.body || {};
  try {
    const result = await registerWithdrawal({ token, orderNumber, email, fullName, items, comment, locale: request.locale });
    response.status(200).json({ data: result });
  } catch (e) {
    if (e instanceof OrderNotFoundError) {
      return response.status(404).json({
        error: { status: 404, message: translate('We could not find an order with that number and email address.') }
      });
    }
    error(e);
    response.status(500).json({ error: { status: 500, message: translate('Something went wrong. Please try again or write to us.') } });
  }
};
