import React from 'react';

/** Banner de bienvenida de la portada de la tienda. */
export default function AlbayanHero() {
  return (
    <section className="albayan-hero my-8 px-6 py-14 md:px-14 md:py-20">
      <div className="max-w-2xl">
        <p className="albayan-hero__arabic text-3xl text-left" lang="ar" dir="rtl">
          معهد البيان
        </p>
        <h1 className="mt-2 text-4xl md:text-5xl font-bold leading-tight">
          Tienda del Instituto Al-Bayān
        </h1>
        <p className="mt-4 text-lg text-white/85">
          Libros, material didáctico del Método Andalusí y recursos para
          aprender árabe y cultura islámica en español.
        </p>
        <a href="#productos" className="albayan-hero__cta mt-8">
          Ver productos
        </a>
      </div>
    </section>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};
