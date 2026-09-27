import Area from '@components/common/Area.js';
import React, { useState } from 'react';
import { DONATE_URL, mainNav } from './brand.js';

/**
 * Cabecera con la estructura de fundacionandalusi.org: logotipo a la
 * izquierda y, a la derecha, el menú de la Fundación, búsqueda, cuenta y
 * carrito (áreas de EverShop) y el botón «Donar».
 */
export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="header albayan-header">
      <Area id="headerTop" className="header__top" isGlobal editableInPageBuilder />
      <div className="header__middle page-width flex h-16 items-center gap-6 md:h-20">
        <button
          type="button"
          className="albayan-menu-toggle lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
        <Area
          id="headerMiddleCenter"
          className="header__middle__center flex shrink-0 items-center"
          isGlobal
          editableInPageBuilder
        />
        <nav className="albayan-nav ml-auto hidden lg:flex" aria-label="Menú principal">
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
        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <Area
            id="headerMiddleRight"
            className="header__middle__right flex items-center gap-1"
            isGlobal
            editableInPageBuilder
          />
          <a href={DONATE_URL} className="albayan-btn albayan-header__donar">
            Donar <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
      {open && (
        <nav className="albayan-nav-mobile page-width pb-5 lg:hidden" aria-label="Menú principal">
          {mainNav.map((link) => (
            <a key={link.href} href={link.href} className="albayan-nav-mobile__link">
              {link.label}
            </a>
          ))}
          <a href={DONATE_URL} className="albayan-nav-mobile__link">
            Donar
          </a>
        </nav>
      )}
      <Area id="headerBottom" className="header__bottom" isGlobal editableInPageBuilder />
    </header>
  );
}
