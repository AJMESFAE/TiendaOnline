import Area from '@components/common/Area.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { contact, footerLinks, legalPages, LOGO_WHITE_SRC, owner, STORE_NAME, tagline } from './brand.js';
import { useLocale } from './i18n.js';
import { LanguageLinks } from './LanguageLinks.js';

interface FooterProps {
  copyRight: string;
}

/** Pie con el mismo esquema que fundacionandalusi.org (fondo verde, logotipo en blanco, 4 columnas). */
export function Footer({ copyRight }: FooterProps) {
  const year = new Date().getFullYear();
  const loc = useLocale();
  return (
    <footer className="footer albayan-footer mt-24">
      <Area id="footerTop" className="footer__top" isGlobal editableInPageBuilder />
      <div className="page-width grid gap-12 pb-10 pt-16 md:grid-cols-2 md:pt-20 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <a href={loc.href('/')} aria-label={`${_(STORE_NAME)} – ${_('Home')}`}>
            <img
              src={LOGO_WHITE_SRC}
              alt={_('Fundación Andalusí de España')}
              className="h-16 w-auto"
              width={172}
              height={64}
            />
          </a>
          <p className="albayan-footer__lead mt-5 max-w-xs">{_(tagline)}</p>
        </div>
        {footerLinks.map((column) => (
          <div key={column.title}>
            <h3 className="albayan-footer__title mb-4">{_(column.title)}</h3>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a href={loc.href(link.href)} className="albayan-footer__link inline-block py-1">
                    {_(link.label)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="albayan-footer__title mb-4">{_('Contact info')}</h3>
          <ul className="albayan-footer__contact space-y-3">
            {contact.email && (
              <li>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 6h18v12H3zM3 6l9 7 9-7" />
                </svg>
                <a href={`mailto:${contact.email}`} className="albayan-footer__link">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && (
              <li>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
                </svg>
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="albayan-footer__link">
                  {contact.phone}
                </a>
              </li>
            )}
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              <address className="not-italic">
                <a href={owner.url} className="albayan-footer__link">
                  {owner.name}
                </a>
                <br />
                {owner.address}
              </address>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18v12H3zM7 10h4M7 14h6M15 10h2" />
              </svg>
              <span>CIF {owner.taxId}</span>
            </li>
          </ul>
          {contact.instagram && (
            <a
              href={contact.instagram}
              className="albayan-footer__social mt-5"
              rel="noopener"
              target="_blank"
              aria-label={_('Fundación Andalusí on Instagram')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="0.6" />
              </svg>
            </a>
          )}
        </div>
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
                  <div>
                    © {year} {_('Fundación Andalusí de España')} · {_(copyRight)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {legalPages.slice(0, 3).map((l) => (
                      <a key={l.urlKey} href={loc.href(`/${l.urlKey}`)} className="albayan-footer__link text-xs">
                        {_(l.label)}
                      </a>
                    ))}
                    <LanguageLinks />
                    <span className="flex items-center gap-1.5" aria-label={_('Secure payment with Redsys')}>
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
