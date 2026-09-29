import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface Props {
  product?: {
    sku?: string;
    safetyInfo?: { manufacturer?: string; address?: string; email?: string; warnings?: string } | null;
  };
}

/** Fabricante, identificación y advertencias del producto (Reglamento (UE) 2023/988, art. 19). */
export default function ProductSafety({ product }: Props) {
  const s = product?.safetyInfo;
  if (!s?.manufacturer) return null;
  return (
    <section className="tienda-safety page-width mt-10 rounded-lg border border-border p-5 text-sm leading-relaxed">
      <h2 className="mb-2 text-base font-semibold">{_('Product safety information')}</h2>
      <p>
        <strong>{_('Manufacturer')}:</strong> {s.manufacturer}
        {s.address && <> · {s.address}</>}
        {s.email && (
          <>
            {' · '}
            <a className="underline" href={`mailto:${s.email}`} dir="ltr">
              {s.email}
            </a>
          </>
        )}
      </p>
      {product?.sku && (
        <p>
          <strong>{_('Reference')}:</strong> <span dir="ltr">{product.sku}</span>
        </p>
      )}
      {s.warnings && (
        <p className="mt-2">
          <strong>{_('Warnings')}:</strong> {s.warnings}
        </p>
      )}
    </section>
  );
}

export const layout = {
  areaId: 'productPageBottom',
  sortOrder: 5
};

export const query = `
  query Query {
    product: currentProduct {
      sku
      safetyInfo {
        manufacturer
        address
        email
        warnings
      }
    }
  }
`;
