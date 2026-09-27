import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { MAIN_SITE_URL } from '../../components/frontStore/brand.js';

/**
 * Portada de la tienda con la composición de fundacionandalusi.org: imagen a
 * todo el ancho con el título centrado en blanco, etiqueta en píldora, dos
 * botones y, debajo, la franja verde con tres datos destacados.
 */
export default function AlbayanHero() {
  return (
    <>
      <section className="albayan-hero-section">
        <div className="albayan-hero__bg" aria-hidden="true" />
        <div className="page-width relative flex min-h-[560px] flex-col items-center justify-center py-20 text-center md:min-h-[620px]">
          <p className="albayan-badge-pill albayan-badge-pill--solid">{_('The Foundation’s online shop')}</p>
          <h1 className="albayan-hero-title mt-6 max-w-4xl text-balance">
            {_('Books and materials to learn Arabic and Islamic culture')}
          </h1>
          <p className="albayan-hero-lead mt-6 max-w-2xl">
            {_('The original materials of the Andalusi Method and the publications of our publishing house, created in Spanish for an education of excellence.')}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a href="#productos" className="albayan-btn">
              {_('View products')} <span className="arrow" aria-hidden="true">→</span>
            </a>
            <a href={`${MAIN_SITE_URL}/proyectos/metodo-andalusi/`} className="albayan-btn albayan-btn--ghost">
              {_('Andalusi Method')} <span className="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>
      <section className="albayan-band" aria-label={_('Shop advantages')}>
        <div className="page-width grid gap-6 py-8 text-center sm:grid-cols-3">
          <div>
            <p className="albayan-band__value">{_('Shipping')}</p>
            <p className="albayan-band__label">{_('across Spain')}</p>
          </div>
          <div>
            <p className="albayan-band__value">{_('Secure payment')}</p>
            <p className="albayan-band__label">{_('by card or Bizum')}</p>
          </div>
          <div>
            <p className="albayan-band__value">{_('Original materials')}</p>
            <p className="albayan-band__label">{_('in Spanish')}</p>
          </div>
        </div>
      </section>
    </>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};
