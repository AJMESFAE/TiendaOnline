// Consultas y acciones sobre la API de administración de EverShop 2.2.1.
import { graphql, request } from './api';

type Price = { value: number; text: string };
type StatusRef = { code: string | null; name: string | null };
type Filter = { key: string; operation: 'eq' | 'like'; value: string };

export const PAGE_SIZE = 20;

// ------------------------------------------------------------------ pedidos
export type OrderSummary = {
  uuid: string;
  orderNumber: string;
  createdAt: { value: string; text: string };
  customerFullName: string | null;
  customerEmail: string | null;
  grandTotal: Price;
  totalQty: number;
  paymentStatus: StatusRef | null;
  shipmentStatus: StatusRef | null;
  status: StatusRef | null;
};

export type OrderFilter = 'all' | 'toShip' | 'paid' | 'shipped' | 'canceled';

export const ORDER_FILTERS: { key: OrderFilter; label: string; filters: Filter[] }[] = [
  { key: 'all', label: 'Todos', filters: [] },
  // `to_ship` lo añade extensions/mobile-app: cobrados (o contra reembolso), sin cancelar y sin enviar del todo.
  { key: 'toShip', label: 'Por enviar', filters: [{ key: 'to_ship', operation: 'eq', value: '1' }] },
  { key: 'paid', label: 'Pagados', filters: [{ key: 'payment_status', operation: 'eq', value: 'redsys_captured' }] },
  { key: 'shipped', label: 'Enviados', filters: [{ key: 'shipment_status', operation: 'eq', value: 'shipped' }] },
  // Al cancelar, EverShop pone el pago en `canceled` (el envío puede seguir en `pending`).
  { key: 'canceled', label: 'Cancelados', filters: [{ key: 'payment_status', operation: 'eq', value: 'canceled' }] }
];

const ORDER_SUMMARY_FIELDS = `
  uuid orderNumber createdAt { value text } customerFullName customerEmail totalQty
  grandTotal { value text }
  paymentStatus { code name } shipmentStatus { code name } status { code name }
`;

export async function fetchOrders(opts: { filter: OrderFilter; keyword?: string; page: number; limit?: number }) {
  const filters: Filter[] = [
    ...(ORDER_FILTERS.find((f) => f.key === opts.filter)?.filters ?? []),
    { key: 'page', operation: 'eq', value: String(opts.page) },
    { key: 'limit', operation: 'eq', value: String(opts.limit ?? PAGE_SIZE) }
  ];
  if (opts.keyword?.trim()) filters.push({ key: 'keyword', operation: 'eq', value: opts.keyword.trim() });
  const data = await graphql<{ orders: { items: OrderSummary[]; total: number } }>(
    `query Orders($filters: [FilterInput]) { orders(filters: $filters) { total items { ${ORDER_SUMMARY_FIELDS} } } }`,
    { filters }
  );
  return { items: data.orders.items, total: Number(data.orders.total), page: opts.page };
}

type Address = {
  fullName: string | null;
  telephone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  postcode: string | null;
  province: { name: string } | null;
  country: { name: string } | null;
};

export type OrderItem = {
  orderItemId: string;
  productName: string | null;
  productSku: string;
  thumbnail: string | null;
  qty: number;
  finalPriceInclTax: Price;
  lineTotalInclTax: Price;
  fulfillmentBadge: string;
};

export type Shipment = {
  uuid: string;
  carrierName: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  phase: string;
  status: StatusRef;
  shippedAt: { value: string } | null;
  deliveredAt: { value: string } | null;
  items: { productName: string | null; qty: number }[];
};

export type OrderDetail = OrderSummary & {
  currency: string;
  coupon: string | null;
  shippingNote: string | null;
  paymentMethod: string | null;
  paymentMethodName: string | null;
  shippingMethodName: string | null;
  noShippingRequired: boolean;
  paymentStatus: (StatusRef & { isCancelable: boolean | null }) | null;
  items: OrderItem[];
  shippingAddress: Address | null;
  billingAddress: Address | null;
  subTotalInclTax: Price;
  shippingFeeInclTax: Price;
  discountAmount: Price;
  totalTaxAmount: Price;
  shipments: Shipment[];
  unshippedItems: { orderItemId: number; productName: string; qtyUnshipped: number }[];
  activities: { comment: string | null; createdAt: { value: string } | null }[] | null;
};

const ADDRESS = `fullName telephone address1 address2 city postcode province { name } country { name }`;

export async function fetchOrder(uuid: string) {
  const data = await graphql<{ order: OrderDetail | null }>(
    `query Order($uuid: String!) {
      order(uuid: $uuid) {
        ${ORDER_SUMMARY_FIELDS}
        currency coupon shippingNote paymentMethod paymentMethodName shippingMethodName noShippingRequired
        paymentStatus { code name isCancelable }
        items { orderItemId productName productSku thumbnail qty fulfillmentBadge
                finalPriceInclTax { value text } lineTotalInclTax { value text } }
        shippingAddress { ${ADDRESS} }
        billingAddress { ${ADDRESS} }
        subTotalInclTax { value text } shippingFeeInclTax { value text }
        discountAmount { value text } totalTaxAmount { value text }
        shipments { uuid carrier carrierName trackingNumber trackingUrl phase status { code name }
                    shippedAt { value } deliveredAt { value } items { productName qty } }
        unshippedItems { orderItemId productName qtyUnshipped }
        activities { comment createdAt { value } }
      }
    }`,
    { uuid }
  );
  if (!data.order) throw new Error('Pedido no encontrado');
  return data.order;
}

export async function fetchCarriers() {
  const data = await graphql<{ carriers: { code: string; name: string }[] }>('{ carriers { code name } }');
  return data.carriers;
}

export function createShipment(
  order: OrderDetail,
  opts: { carrier: string; trackingNumber?: string; notifyCustomer: boolean }
) {
  return request(`/api/orders/${order.uuid}/shipments`, {
    method: 'POST',
    json: {
      items: order.unshippedItems.map((i) => ({ order_item_id: Number(i.orderItemId), qty: i.qtyUnshipped })),
      carrier: opts.carrier,
      ...(opts.trackingNumber?.trim() ? { tracking_number: opts.trackingNumber.trim() } : {}),
      notifyCustomer: opts.notifyCustomer
    }
  });
}

export const markShipmentDelivered = (shipmentUuid: string) =>
  request(`/api/shipments/${shipmentUuid}/markDelivered`, { method: 'POST', json: {} });

export const cancelOrder = (uuid: string, reason: string) =>
  request(`/api/orders/${uuid}/cancel`, { method: 'POST', json: { reason } });

/** Devolución por el TPV de Redsys (extensions/redsys). */
export const refundRedsys = (uuid: string, amount: number) =>
  request<{ data: { amount: number } }>('/api/redsys/refunds', {
    method: 'POST',
    json: { order_id: uuid, amount: amount.toFixed(2) }
  });

// ------------------------------------------------------------- estadísticas
export type LifetimeSales = {
  orders: number;
  total: string;
  completed_percentage: number;
  cancelled_percentage: number;
};

export const fetchLifetimeSales = () => request<LifetimeSales>('/api/lifetimesales');

export const fetchSalesStatistic = (period: 'daily' | 'weekly' | 'monthly') =>
  request<{ total: number | string; count: number | string; time: string }[]>(
    `/api/salestatistic?period=${period}`
  );

// ---------------------------------------------------------------- productos
export type ProductSummary = {
  productId: number;
  uuid: string;
  name: string;
  sku: string;
  status: number;
  price: { regular: Price };
  inventory: { qty: number; isInStock: boolean; manageStock: number };
  image: { url: string } | null;
};

const PRODUCT_SUMMARY_FIELDS = `
  productId uuid name sku status
  price { regular { value text } }
  inventory { qty isInStock manageStock }
  image { url }
`;

export async function fetchProducts(opts: { keyword?: string; page: number; limit?: number }) {
  const filters: Filter[] = [
    { key: 'page', operation: 'eq', value: String(opts.page) },
    { key: 'limit', operation: 'eq', value: String(opts.limit ?? PAGE_SIZE) }
  ];
  if (opts.keyword?.trim()) filters.push({ key: 'keyword', operation: 'eq', value: opts.keyword.trim() });
  const data = await graphql<{ products: { items: ProductSummary[]; total: number } }>(
    `query Products($filters: [FilterInput]) { products(filters: $filters) { total items { ${PRODUCT_SUMMARY_FIELDS} } } }`,
    { filters }
  );
  return { items: data.products.items, total: Number(data.products.total), page: opts.page };
}

export type ProductDetail = ProductSummary & {
  urlKey: string | null;
  description: unknown;
  visibility: number | null;
  taxClass: number | null;
  noShippingRequired: boolean | null;
  weight: { value: number; unit: string };
  category: { categoryId: number; name: string } | null;
  package: { packageId: number } | null;
  gallery: { url: string }[] | null;
};

export async function fetchProduct(productId: number) {
  const data = await graphql<{ product: ProductDetail | null }>(
    `query Product($id: ID) {
      product(id: $id) {
        ${PRODUCT_SUMMARY_FIELDS}
        urlKey description visibility taxClass noShippingRequired
        weight { value unit }
        category { categoryId name }
        package { packageId }
        gallery { url }
      }
    }`,
    { id: productId }
  );
  if (!data.product) throw new Error('Artículo no encontrado');
  return data.product;
}

export type CatalogOptions = {
  categories: { categoryId: number; name: string }[];
  taxClasses: { taxClassId: number; name: string }[];
  packages: { packageId: number; name: string; isDefault: boolean }[];
};

export async function fetchCatalogOptions(): Promise<CatalogOptions> {
  const data = await graphql<{
    categories: { items: CatalogOptions['categories'] };
    taxClasses: { items: CatalogOptions['taxClasses'] };
    packages: CatalogOptions['packages'];
  }>(
    `{
      categories(filters: [{ key: "limit", operation: eq, value: "500" }]) { items { categoryId name } }
      taxClasses { items { taxClassId name } }
      packages { packageId name isDefault }
    }`
  );
  return {
    categories: data.categories.items,
    taxClasses: data.taxClasses.items,
    packages: data.packages
  };
}

/** Campos del producto tal y como los espera POST/PATCH /api/products. */
export type ProductPayload = {
  name: string;
  sku: string;
  price: number;
  qty: number;
  manage_stock: 0 | 1;
  stock_availability: 0 | 1;
  status: 0 | 1;
  visibility: 0 | 1;
  weight: number;
  no_shipping_required: boolean;
  package_id?: number;
  category_id?: number | null;
  tax_class?: number | null;
  images: string[];
  url_key?: string;
  group_id?: number;
  description?: unknown;
  meta_title?: string;
};

export const createProduct = (payload: ProductPayload) =>
  request<{ data: { uuid: string; product_id: number } }>('/api/products', { method: 'POST', json: payload });

export const updateProduct = (uuid: string, payload: Partial<ProductPayload>) =>
  request(`/api/products/${uuid}`, { method: 'PATCH', json: payload });

export const deleteProduct = (uuid: string) => request(`/api/products/${uuid}`, { method: 'DELETE' });
