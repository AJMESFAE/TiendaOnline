import Area from '@components/common/Area.js';
import React, { useState } from 'react';
import { DONATE_URL, mainNav } from './brand.js';

const Caret = () => (
  <svg className="albayan-nav__caret" viewBox="0 0 320 512" aria-hidden="true">
    <path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z" />
  </svg>
);

const Arrow = () => (
  <svg className="albayan-donar__icon" viewBox="0 0 448 512" aria-hidden="true">
    <path d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L441 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z" />
  </svg>
);

/**
 * Cabecera copiada de fundacionandalusi.org: fondo blanco con línea inferior,
 * logotipo a la izquierda y, a la derecha, el menú en mayúsculas (Inter 14px)
 * con el desplegable de «Proyectos» y el botón verde «DONAR». En móvil, como
 * en la web de la Fundación, el botón de menú va a la derecha y «DONAR» se
 * oculta. Búsqueda, cuenta y carrito van en una barra flotante (abajo a la
 * derecha) para no añadir nada a la cabecera.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="header albayan-header">
      <Area id="headerTop" className="header__top" isGlobal editableInPageBuilder />
      <div className="header__middle albayan-header__inner">
        <Area
          id="headerMiddleCenter"
          className="header__middle__center flex shrink-0 items-center"
          isGlobal
          editableInPageBuilder
        />
        <nav className="albayan-nav" aria-label="Menú principal">
          <ul className="albayan-nav__list">
            {mainNav.map((link) => (
              <li key={link.href} className={link.children ? 'albayan-nav__item has-children' : 'albayan-nav__item'}>
                <a href={link.href} className="albayan-nav__link">
                  {link.label}
                  {link.children && <Caret />}
                </a>
                {link.children && (
                  <ul className="albayan-nav__sub">
                    {link.children.map((child) => (
                      <li key={child.href}>
                        <a href={child.href} className="albayan-nav__sublink">
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <Area
          id="headerMiddleLeft"
          className="header__middle__left flex items-center"
          isGlobal
          editableInPageBuilder
        />
        <div className="albayan-header__actions">
          <a href={DONATE_URL} className="albayan-donar">
            <span>DONAR</span>
            <Arrow />
          </a>
          <button
            type="button"
            className="albayan-menu-toggle"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="albayan-nav-mobile" aria-label="Menú principal">
          {mainNav.map((link) => (
            <React.Fragment key={link.href}>
              <a href={link.href} className="albayan-nav-mobile__link">
                {link.label}
              </a>
              {link.children?.map((child) => (
                <a key={child.href} href={child.href} className="albayan-nav-mobile__link albayan-nav-mobile__link--sub">
                  {child.label}
                </a>
              ))}
            </React.Fragment>
          ))}
          <a href={DONATE_URL} className="albayan-nav-mobile__link">
            Donar
          </a>
        </nav>
      )}
      <Area id="headerBottom" className="header__bottom" isGlobal editableInPageBuilder />
      {/* Búsqueda, cuenta y carrito de EverShop: fuera de la cabecera, en una
          barra flotante, para que la cabecera sea idéntica a la de la Fundación. */}
      <Area
        id="headerMiddleRight"
        className="header__middle__right albayan-shopbar"
        isGlobal
        editableInPageBuilder
      />
    </header>
  );
}
