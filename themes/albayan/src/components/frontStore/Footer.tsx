import Area from '@components/common/Area.js';
import React from 'react';
import { AULA_URL, contact, footerLinks, legalPages, LOGO_SRC, owner, tagline } from './brand.js';

interface FooterProps {
  copyRight: string;
}

/** Pie con el mismo esquema que www.institutoalbayan.com (fondo gris claro, 4 columnas). */
export function Footer({ copyRight }: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer albayan-footer mt-24">
      <Area id="footerTop" className="footer__top" isGlobal editableInPageBuilder />
      <div className="page-width grid gap-12 pb-10 pt-16 md:grid-cols-2 md:pt-20 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
        <div>
          <a href="/" aria-label="Tienda de Instituto Al-Bayān – inicio">
            <img src={LOGO_SRC} alt="Instituto Al-Bayān" className="h-20 w-auto" width={158} height={80} />
          </a>
          <p className="albayan-footer__muted mt-5 max-w-xs text-sm leading-relaxed">{tagline}</p>
          <address className="albayan-footer__muted mt-4 text-xs not-italic leading-relaxed">
            <a href={owner.url} className="albayan-footer__link text-xs">
              {owner.name}
            </a>
            <br />
            {owner.address} · CIF {owner.taxId}
          </address>
          <div className="mt-5 flex flex-col gap-1">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="albayan-footer__link">
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="albayan-footer__link">
                {contact.phone}
              </a>
            )}
            {contact.instagram && (
              <a href={contact.instagram} className="albayan-footer__link" rel="noopener" target="_blank">
                Instagram
              </a>
            )}
          </div>
          <a href={`${AULA_URL}register`} className="albayan-btn mt-6">
            Inscríbete <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
        {footerLinks.map((column) => (
          <div key={column.title}>
            <h3 className="albayan-footer__title mb-4">{column.title}</h3>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="albayan-footer__link inline-block py-1">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="footer__middle page-width flex flex-wrap items-start justify-between gap-10">
        <Area id="footerMiddleLeft" className="footer__middle__left" isGlobal editableInPageBuilder />
        <Area id="footerMiddleCenter" className="footer__middle__center" isGlobal editableInPageBuilder />
        <Area id="footerMiddleRight" className="footer__middle__right" isGlobal editableInPageBuilder />
      </div>
      <Area
        id="footerBottom"
        className="footer__bottom albayan-footer__bottom"
        isGlobal
        editableInPageBuilder
        coreComponents={[
          {
            component: {
              default: (
                <div className="page-width flex flex-col gap-4 py-6 text-xs md:flex-row md:items-center md:justify-between">
                  <div className="albayan-footer__muted">
                    © {year} Instituto Al-Bayān · {copyRight}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {legalPages.slice(0, 3).map((l) => (
                      <a key={l.urlKey} href={`/${l.urlKey}`} className="albayan-footer__link text-xs">
                        {l.label}
                      </a>
                    ))}
                    <span className="flex items-center gap-1.5" aria-label="Pago seguro con Redsys">
                      <span className="albayan-badge">VISA</span>
                      <span className="albayan-badge">Mastercard</span>
                      <span className="albayan-badge">Bizum</span>
                    </span>
                  </div>
                </div>
              )
            },
            sortOrder: 10
          }
        ]}
      />
    </footer>
  );
}
