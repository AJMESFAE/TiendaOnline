/**
 * Datos de marca de la Fundación Andalusí de España (tomados de
 * fundacionandalusi.org) usados por la cabecera, el pie y la portada.
 * Colores y tipografías: `src/pages/all/albayan.css`. Imágenes: `public/brand/`.
 */
export const MAIN_SITE_URL = 'https://fundacionandalusi.org';
export const DONATE_URL = `${MAIN_SITE_URL}/donaciones/`;
export const LOGO_SRC = '/brand/logo-fundacion.png';
export const LOGO_WHITE_SRC = '/brand/logo-fundacion-blanco.png';
export const STORE_NAME = 'Tienda de la Fundación Andalusí';

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  children?: NavLink[];
}

/** Menú principal: el mismo que fundacionandalusi.org, con la tienda en local. */
export const mainNav: NavLink[] = [
  { label: 'Conócenos', href: `${MAIN_SITE_URL}/conocenos/`, external: true },
  {
    label: 'Proyectos',
    href: `${MAIN_SITE_URL}/fundacion-proyectos/`,
    external: true,
    children: [
      { label: 'Método Andalusí', href: `${MAIN_SITE_URL}/proyectos/metodo-andalusi/`, external: true },
      { label: 'Proyecto Al-Waqf', href: `${MAIN_SITE_URL}/proyectos/proyecto-al-waqf/`, external: true },
      { label: 'Editorial', href: `${MAIN_SITE_URL}/proyectos/editorial/`, external: true }
    ]
  },
  { label: 'Actividad', href: `${MAIN_SITE_URL}/actividad/`, external: true },
  { label: 'Blog', href: `${MAIN_SITE_URL}/blogs/`, external: true },
  { label: 'Tienda online', href: '/#productos' },
  { label: 'Contáctanos', href: `${MAIN_SITE_URL}/contactanos/`, external: true }
];

/** Columnas del pie (mismo esquema que el pie de fundacionandalusi.org). */
export const footerLinks: { title: string; links: NavLink[] }[] = [
  {
    title: 'Accesos rápidos',
    links: [
      { label: 'Conócenos', href: `${MAIN_SITE_URL}/conocenos/`, external: true },
      { label: 'Proyectos', href: `${MAIN_SITE_URL}/fundacion-proyectos/`, external: true },
      { label: 'Actividad', href: `${MAIN_SITE_URL}/actividad/`, external: true },
      { label: 'Blog', href: `${MAIN_SITE_URL}/blogs/`, external: true },
      { label: 'Contáctanos', href: `${MAIN_SITE_URL}/contactanos/`, external: true }
    ]
  },
  {
    title: 'Tienda',
    links: [
      { label: 'Productos', href: '/#productos' },
      { label: 'Mi cuenta', href: '/account' },
      { label: 'Carrito', href: '/cart' },
      { label: 'Condiciones de venta', href: '/condiciones-de-venta' },
      { label: 'Envíos y devoluciones', href: '/envios-y-devoluciones' }
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
  { urlKey: 'aviso-legal', label: 'Aviso legal' },
  { urlKey: 'politica-de-privacidad', label: 'Política de privacidad' },
  { urlKey: 'politica-de-cookies', label: 'Política de cookies' },
  { urlKey: 'condiciones-de-venta', label: 'Condiciones de venta' },
  { urlKey: 'envios-y-devoluciones', label: 'Envíos y devoluciones' }
];

export const tagline =
  'La misión de la Fundación es promover la enseñanza del árabe y preservar el patrimonio islámico en España.';
