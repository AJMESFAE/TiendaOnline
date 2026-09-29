/**
 * Datos de marca de la Fundación Andalusí de España (tomados de
 * fundacionandalusi.org) usados por la cabecera, el pie y la portada.
 * Colores y tipografías: `src/pages/all/albayan.css`. Imágenes: `public/brand/`.
 */
export const MAIN_SITE_URL = 'https://fundacionandalusi.org';
export const DONATE_URL = `${MAIN_SITE_URL}/donaciones/`;
export const LOGO_SRC = '/brand/logo-fundacion.png';
export const LOGO_WHITE_SRC = '/brand/logo-fundacion-blanco.png';
export const STORE_NAME = 'Fundación Andalusí Shop';

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  children?: NavLink[];
}

/**
 * Menú principal: el mismo que fundacionandalusi.org, con la tienda en local.
 * Los textos son claves en inglés: se traducen con _() (translations/es|ar/tienda.csv).
 */
export const mainNav: NavLink[] = [
  { label: 'About us', href: `${MAIN_SITE_URL}/conocenos/`, external: true },
  {
    label: 'Projects',
    href: `${MAIN_SITE_URL}/fundacion-proyectos/`,
    external: true,
    children: [
      { label: 'Andalusi Method', href: `${MAIN_SITE_URL}/proyectos/metodo-andalusi/`, external: true },
      { label: 'Al-Waqf Project', href: `${MAIN_SITE_URL}/proyectos/proyecto-al-waqf/`, external: true },
      { label: 'Publishing house', href: `${MAIN_SITE_URL}/proyectos/editorial/`, external: true }
    ]
  },
  { label: 'Activity', href: `${MAIN_SITE_URL}/actividad/`, external: true },
  { label: 'Blog', href: `${MAIN_SITE_URL}/blogs/`, external: true },
  { label: 'Online shop', href: '/#productos' },
  { label: 'Contact us', href: `${MAIN_SITE_URL}/contactanos/`, external: true }
];

/** Columnas del pie (mismo esquema que el pie de fundacionandalusi.org). */
export const footerLinks: { title: string; links: NavLink[] }[] = [
  {
    title: 'Quick links',
    links: [
      { label: 'About us', href: `${MAIN_SITE_URL}/conocenos/`, external: true },
      { label: 'Projects', href: `${MAIN_SITE_URL}/fundacion-proyectos/`, external: true },
      { label: 'Activity', href: `${MAIN_SITE_URL}/actividad/`, external: true },
      { label: 'Blog', href: `${MAIN_SITE_URL}/blogs/`, external: true },
      { label: 'Contact us', href: `${MAIN_SITE_URL}/contactanos/`, external: true }
    ]
  },
  {
    title: 'Shop',
    links: [
      { label: 'Products', href: '/#productos' },
      { label: 'My account', href: '/account' },
      { label: 'Cart', href: '/cart' },
      { label: 'Terms of sale', href: '/condiciones-de-venta' },
      { label: 'Shipping and returns', href: '/envios-y-devoluciones' },
      { label: 'Withdraw from contract here', href: '/desistimiento' }
    ]
  }
];

/** Titular de la tienda (aviso legal, pie de página). */
export const owner = {
  name: 'Fundación Método Andalusí de España',
  taxId: 'G42979898',
  address: 'Calle Anastasio Herrero 5, 28020 Madrid',
  url: MAIN_SITE_URL
};

/** Datos de contacto de la tienda. */
export const contact = {
  email: 'tienda@fundacionandalusi.org',
  phone: '',
  instagram: 'https://www.instagram.com/fundacion.andalusi/'
};

/** Páginas legales de la tienda (se crean solas al arrancar). */
export const legalPages = [
  { urlKey: 'aviso-legal', label: 'Legal notice' },
  { urlKey: 'politica-de-privacidad', label: 'Privacy policy' },
  { urlKey: 'politica-de-cookies', label: 'Cookie policy' },
  { urlKey: 'condiciones-de-venta', label: 'Terms of sale' },
  { urlKey: 'envios-y-devoluciones', label: 'Shipping and returns' }
];

/** Función de desistimiento (Directiva (UE) 2023/2673): siempre visible en el pie. */
export const WITHDRAWAL_PATH = '/desistimiento';

export const tagline =
  'The Foundation’s mission is to promote the teaching of Arabic and to preserve the Islamic heritage of Spain.';
