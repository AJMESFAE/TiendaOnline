import React from 'react';
import { MAIN_SITE_URL } from '../../components/frontStore/brand.js';

/**
 * Portada de la tienda con la composición de www.institutoalbayan.com:
 * trama caligráfica de fondo, título ligero con subrayado verde y una
 * imagen recortada en arco andalusí con sombra verde salvia.
 */
export default function AlbayanHero() {
  return (
    <section className="albayan-hero-section">
      <div className="albayan-trama" aria-hidden="true" />
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id="albayan-arco" clipPathUnits="objectBoundingBox">
            <path d="M0.105,1 L0.105,0.46 A0.40,0.40 0 1 1 0.895,0.46 L0.895,1 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="page-width grid items-center gap-12 pb-16 pt-14 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-24">
        <div>
          <p className="albayan-badge-pill">Tienda online · Fundación Método Andalusí de España</p>
          <h1 className="albayan-hero-title mt-6 text-balance">
            Libros y materiales para aprender{' '}
            <span className="albayan-underline">
              árabe
              <svg viewBox="0 0 320 12" fill="none" aria-hidden="true">
                <path
                  d="M4 8 C 80 2, 240 2, 316 7"
                  stroke="var(--albayan-brand)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{' '}
            en español
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
            El material del Método Andalusí y las lecturas de nuestros cursos, para que sigas
            aprendiendo en casa, a tu ritmo.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <a href="#productos" className="albayan-btn">
              Ver productos <span className="arrow" aria-hidden="true">→</span>
            </a>
            <a href={`${MAIN_SITE_URL}/cursos`} className="albayan-link-arrow">
              Explorar cursos <span className="arrow" aria-hidden="true">→</span>
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Envíos a toda España · Pago seguro con tarjeta o Bizum
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[420px] pb-6 lg:max-w-[460px]">
          <div className="albayan-arch">
            <div className="albayan-arch__shadow" aria-hidden="true" />
            <div className="albayan-arch__img">
              <img
                src="/brand/card-coran.webp"
                alt="Manos sosteniendo un ejemplar abierto del Corán durante la lectura"
                width={800}
                height={1000}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};
