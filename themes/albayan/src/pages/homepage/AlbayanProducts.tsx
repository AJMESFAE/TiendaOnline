import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';

interface AlbayanProductsProps {
  products?: {
    items: ProductData[];
  };
}

/** Catálogo completo en la portada (debajo del banner de bienvenida). */
export default function AlbayanProducts({ products }: AlbayanProductsProps) {
  const items = products?.items || [];
  return (
    <section id="productos" className="albayan-products my-16 scroll-mt-24">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="albayan-section-title">{_('Our products')}</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {_('Books, posters and teaching materials to learn Arabic and discover Islamic culture.')}
          </p>
        </div>
        {items.length > 0 && (
          <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
            {items.length === 1 ? _('1 product') : _('${count} products', { count: String(items.length) })}
          </span>
        )}
      </div>
      <ProductList
        products={items}
        gridColumns={3}
        showAddToCart
        emptyMessage={_('Soon you will find the Foundation’s books and materials here.')}
      />
    </section>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    products(filters: [{key: "limit", operation: eq, value: "48"}]) {
      items {
        ...Product
      }
    }
  }
`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;
