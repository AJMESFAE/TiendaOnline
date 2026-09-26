/**
 * Datos de marca de Instituto Al-Bayān usados por la cabecera y el pie.
 * Edite aquí los enlaces y datos de contacto; los colores y tipografías están
 * en `src/pages/all/albayan.css`.
 */
export const MAIN_SITE_URL = 'https://institutoalbayan.com';

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

/** Menú principal: replica la navegación de la web del instituto. */
export const mainNav: NavLink[] = [
  { label: 'Inicio', href: `${MAIN_SITE_URL}/`, external: true },
  { label: 'Sobre nosotros', href: `${MAIN_SITE_URL}/sobre-nosotros/`, external: true },
  { label: 'Inscripción', href: `${MAIN_SITE_URL}/inscripcion/`, external: true },
  { label: 'Tienda', href: '/' }
];

/** Enlaces del pie de página. Las páginas legales se crean en Admin → CMS → Páginas. */
export const footerLinks: { title: string; links: NavLink[] }[] = [
  {
    title: 'Instituto',
    links: [
      { label: 'Web del instituto', href: `${MAIN_SITE_URL}/`, external: true },
      { label: 'Sobre nosotros', href: `${MAIN_SITE_URL}/sobre-nosotros/`, external: true },
      { label: 'Inscripción', href: `${MAIN_SITE_URL}/inscripcion/`, external: true }
    ]
  },
  {
    title: 'Tienda',
    links: [
      { label: 'Mi cuenta', href: '/account' },
      { label: 'Carrito', href: '/cart' },
      { label: 'Condiciones de venta', href: '/condiciones-de-venta' },
      { label: 'Envíos y devoluciones', href: '/envios-y-devoluciones' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Aviso legal', href: '/aviso-legal' },
      { label: 'Política de privacidad', href: '/politica-de-privacidad' },
      { label: 'Política de cookies', href: '/politica-de-cookies' }
    ]
  }
];

/** Titular de la tienda (aviso legal, pie de página). */
export const owner = {
  name: 'Fundación Método Andalusí de España',
  taxId: 'G42979898',
  address: 'Calle Anastasio Herrero 5, 28020 Madrid'
};

/** Datos de contacto. Deje una cadena vacía para ocultar un dato. */
export const contact = {
  email: '',
  phone: '',
  instagram: 'https://www.instagram.com/institutoalbayan/'
};

/** Páginas legales (se crean con infra/create-pages.sh). */
export const legalPages = [
  { urlKey: 'aviso-legal', label: 'Aviso legal' },
  { urlKey: 'politica-de-privacidad', label: 'Política de privacidad' },
  { urlKey: 'politica-de-cookies', label: 'Política de cookies' },
  { urlKey: 'condiciones-de-venta', label: 'Condiciones de venta' },
  { urlKey: 'envios-y-devoluciones', label: 'Envíos y devoluciones' }
];

export const tagline =
  'Academia online de árabe y cultura islámica en español. Un proyecto de la Fundación Método Andalusí.';
