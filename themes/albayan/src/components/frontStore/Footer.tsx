import Area from '@components/common/Area.js';
import React from 'react';
import { contact, footerLinks, owner, tagline } from './brand.js';

interface FooterProps {
  copyRight: string;
}

function PaymentBadges() {
  return (
    <div className="flex items-center gap-2" aria-label="Pago seguro">
      <span className="albayan-badge">VISA</span>
      <span className="albayan-badge">Mastercard</span>
      <span className="albayan-badge">Bizum</span>
      <span className="albayan-footer__muted text-xs">Pago seguro con Redsys</span>
    </div>
  );
}

export function Footer({ copyRight }: FooterProps) {
  return (
    <footer className="footer albayan-footer mt-20">
      <Area id="footerTop" className="footer__top" isGlobal editableInPageBuilder />
      <div className="page-width grid grid-cols-1 gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="albayan-footer__brand">
            Instituto Al-Bayān
            <span className="block text-left albayan-footer__arabic" lang="ar" dir="rtl">
              معهد البيان
            </span>
          </div>
          <p className="albayan-footer__muted mt-3 text-sm leading-relaxed">{tagline}</p>
          <address className="albayan-footer__muted mt-3 text-xs not-italic leading-relaxed">
            {owner.name}
            <br />
            {owner.address}
            <br />
            CIF {owner.taxId}
          </address>
          <div className="mt-4 flex flex-col gap-1 text-sm">
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
        </div>
        {footerLinks.map((column) => (
          <div key={column.title}>
            <h3 className="albayan-footer__title">{column.title}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="albayan-footer__link">
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
                <div className="page-width flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
                  <PaymentBadges />
                  <div className="albayan-footer__muted text-center text-sm md:text-right">
                    {copyRight}
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
