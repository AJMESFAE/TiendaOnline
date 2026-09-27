import React from 'react';
import { LOGO_SRC, STORE_NAME } from '../../components/frontStore/brand.js';

interface LogoProps {
  setting?: {
    logo?: string | null;
    logoWidth?: string | null;
    logoHeight?: string | null;
    storeName?: string | null;
  };
}

/**
 * Logotipo de la tienda: el de la Fundación Andalusí (public/brand). Si se sube
 * otro en Admin → Configuración → Tienda → Marca, se usa ese.
 */
export default function Logo({ setting }: LogoProps) {
  const custom = setting?.logo;
  const width = Number(setting?.logoWidth) || undefined;
  const height = Number(setting?.logoHeight) || undefined;
  const src = custom
    ? `/images?src=${encodeURIComponent(custom)}&w=${Math.min(width || 480, 768)}&q=90&f=webp`
    : LOGO_SRC;
  return (
    <div className="logo flex items-center">
      <a href="/" className="logo-icon flex items-center" aria-label={`${STORE_NAME} – inicio`}>
        <img
          src={src}
          alt="Fundación Andalusí de España"
          width={custom ? width : 151}
          height={custom ? height : 56}
          className="h-auto"
        />
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
