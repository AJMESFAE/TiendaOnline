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
    <section id="productos" className="albayan-products my-12 scroll-mt-8">
      <div className="mb-10 flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="albayan-eyebrow">Tienda online</p>
          <h2 className="mt-3 text-3xl md:text-4xl">Libros y materiales</h2>
        </div>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </span>
        )}
      </div>
      <ProductList
        products={items}
        gridColumns={3}
        showAddToCart
        emptyMessage="Muy pronto encontrarás aquí los libros y materiales del instituto."
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
