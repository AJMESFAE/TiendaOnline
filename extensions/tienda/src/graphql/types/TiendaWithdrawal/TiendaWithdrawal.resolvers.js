import { orderFromToken } from '../../../services/withdrawalLink.js';

export default {
  Query: {
    tiendaWithdrawalOrder: async (_, { token }) => {
      const order = await orderFromToken(token);
      if (!order) return null;
      return {
        orderNumber: order.order_number,
        email: order.customer_email,
        fullName: order.customer_full_name,
        token
      };
    }
  }
};
