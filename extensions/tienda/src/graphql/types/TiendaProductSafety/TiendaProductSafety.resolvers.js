import { productSafety } from '../../../services/productSafety.js';

export default {
  Product: {
    safetyInfo: (product) => productSafety(product.sku)
  }
};
