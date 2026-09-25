import React from 'react';

interface LogoProps {
  setting?: {
    logo?: string | null;
    logoWidth?: string | null;
    logoHeight?: string | null;
    storeName?: string | null;
  };
}

/**
 * Logo de la tienda. Si se sube un logo en Admin → Configuración → Tienda →
 * Marca, se usa esa imagen; si no, se muestra el logotipo tipográfico del
 * instituto (Al-Bayān + البيان).
 */
export default function Logo({ setting }: LogoProps) {
  const logo = setting?.logo;
  const width = Number(setting?.logoWidth) || undefined;
  const height = Number(setting?.logoHeight) || undefined;
  const storeName = setting?.storeName || 'Instituto Al-Bayān';
  return (
    <div className="logo flex items-center">
      <a href="/" className="logo-icon flex items-center gap-3" aria-label={`${storeName} – inicio`}>
        {logo ? (
          <img
            src={`/images?src=${encodeURIComponent(logo)}&w=${Math.min(width || 480, 768)}&q=90&f=webp`}
            alt={storeName}
            width={width}
            height={height}
            className="max-h-14 w-auto max-w-full"
          />
        ) : (
          <>
            <span
              className="albayan-hero__arabic text-3xl leading-none"
              lang="ar"
              dir="rtl"
              aria-hidden="true"
            >
              البيان
            </span>
            <span className="flex flex-col">
              <span className="albayan-logo__name">Al-Bayān</span>
              <span className="albayan-logo__sub">Tienda del Instituto</span>
            </span>
          </>
        )}
      </a>
    </div>
  );
}

export const layout = {
  areaId: 'headerMiddleCenter',
  sortOrder: 10
};

export const query = `
  query query {
    setting {
      logo
      logoWidth
      logoHeight
      storeName
    }
  }
`;
