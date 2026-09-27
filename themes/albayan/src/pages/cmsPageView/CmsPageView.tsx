import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import React from 'react';
import { legalPages } from '../../components/frontStore/brand.js';

interface CmsPageViewProps {
  page: {
    name: string;
    urlKey: string;
    content: Row[];
  };
}

/**
 * Páginas de contenido (aviso legal, privacidad, condiciones…) con la
 * identidad de la Fundación: cabecera en la franja verde de
 * fundacionandalusi.org y un índice lateral con el resto de páginas legales.
 */
export default function CmsPageView({ page }: CmsPageViewProps) {
  const isLegal = legalPages.some((l) => l.urlKey === page.urlKey);
  return (
    <div className="albayan-page mb-8">
      <header className="albayan-page__hero">
        <div className="page-width py-14 md:py-20">
          <p className="albayan-badge-pill albayan-badge-pill--light">
            {isLegal ? 'Información legal' : 'Fundación Andalusí'}
          </p>
          <h1 className="albayan-hero-title mt-5 !text-4xl md:!text-5xl">{page.name}</h1>
        </div>
      </header>
      <div className="mt-10 grid gap-10 md:grid-cols-[220px_1fr]">
        {isLegal && (
          <nav className="albayan-page__nav" aria-label="Información legal">
            <p className="albayan-page__nav-title">Información legal</p>
            <ul>
              {legalPages.map((l) => (
                <li key={l.urlKey}>
                  <a
                    href={`/${l.urlKey}`}
                    aria-current={l.urlKey === page.urlKey ? 'page' : undefined}
                    className="albayan-page__nav-link"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <article className={`albayan-page__content ${isLegal ? '' : 'md:col-span-2'}`}>
          <Editor rows={page.content} />
        </article>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};

export const query = `
  query Query {
    page: currentCmsPage {
      name
      urlKey
      content
    }
  }
`;
