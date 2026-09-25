import Area from '@components/common/Area.js';
import React, { useState } from 'react';
import { contact, MAIN_SITE_URL, mainNav } from './brand.js';

/**
 * Cabecera de la tienda con la estructura de institutoalbayan.com:
 * franja superior con acceso a la web principal y cabecera con logo, menú
 * principal e iconos de búsqueda, cuenta y carrito (áreas de EverShop).
 */
export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="header albayan-header">
      <div className="albayan-topbar">
        <div className="page-width flex items-center justify-between gap-4 py-2 text-xs sm:text-sm">
          <a href={MAIN_SITE_URL} className="albayan-topbar__link">
            ← Volver a institutoalbayan.com
          </a>
          <div className="hidden sm:flex items-center gap-4">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="albayan-topbar__link">
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="albayan-topbar__link">
                {contact.phone}
              </a>
            )}
            <span className="albayan-topbar__arabic" lang="ar" dir="rtl">
              معهد البيان
            </span>
          </div>
        </div>
      </div>
      <Area
        id="headerTop"
        className="header__top"
        isGlobal
        editableInPageBuilder
      />
      <div className="albayan-header__main">
        <div className="header__middle page-width flex items-center gap-4 md:gap-8 py-4">
          <button
            type="button"
            className="albayan-menu-toggle md:hidden"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
          <Area
            id="headerMiddleCenter"
            className="header__middle__center flex shrink-0 items-center"
            isGlobal
            editableInPageBuilder
          />
          <nav className="albayan-nav hidden md:flex" aria-label="Menú principal">
            {mainNav.map((link) => (
              <a key={link.href} href={link.href} className="albayan-nav__link">
                {link.label}
              </a>
            ))}
          </nav>
          <Area
            id="headerMiddleLeft"
            className="header__middle__left flex items-center"
            isGlobal
            editableInPageBuilder
          />
          <Area
            id="headerMiddleRight"
            className="header__middle__right ml-auto flex items-center gap-1"
            isGlobal
            editableInPageBuilder
          />
        </div>
        {open && (
          <nav className="albayan-nav-mobile md:hidden page-width pb-4" aria-label="Menú principal">
            {mainNav.map((link) => (
              <a key={link.href} href={link.href} className="albayan-nav-mobile__link">
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
      <Area
        id="headerBottom"
        className="header__bottom"
        isGlobal
        editableInPageBuilder
      />
    </header>
  );
}
