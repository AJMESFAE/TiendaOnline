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
          <p className="albayan-badge-pill albayan-badge-pill--solid">Tienda online de la Fundación</p>
          <h1 className="albayan-hero-title mt-6 max-w-4xl text-balance">
            Libros y materiales para aprender árabe y cultura islámica
          </h1>
          <p className="albayan-hero-lead mt-6 max-w-2xl">
            Los materiales originales del Método Andalusí y las publicaciones de nuestra editorial,
            creados en castellano para una educación de excelencia.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a href="#productos" className="albayan-btn">
              Ver productos <span className="arrow" aria-hidden="true">→</span>
            </a>
            <a href={`${MAIN_SITE_URL}/proyectos/metodo-andalusi/`} className="albayan-btn albayan-btn--ghost">
              Método Andalusí <span className="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>
      <section className="albayan-band" aria-label="Ventajas de la tienda">
        <div className="page-width grid gap-6 py-8 text-center sm:grid-cols-3">
          <div>
            <p className="albayan-band__value">Envíos</p>
            <p className="albayan-band__label">a toda España</p>
          </div>
          <div>
            <p className="albayan-band__value">Pago seguro</p>
            <p className="albayan-band__label">con tarjeta o Bizum</p>
          </div>
          <div>
            <p className="albayan-band__value">Materiales originales</p>
            <p className="albayan-band__label">en castellano</p>
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
