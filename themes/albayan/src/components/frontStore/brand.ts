/**
 * Datos de marca de Instituto Al-Bayān (tomados de www.institutoalbayan.com)
 * usados por la cabecera, el pie y la portada. Colores y tipografías:
 * `src/pages/all/albayan.css`. Imágenes: `public/brand/`.
 */
export const MAIN_SITE_URL = 'https://www.institutoalbayan.com';
export const AULA_URL = 'https://aula.institutoalbayan.com/';
export const LOGO_SRC = '/brand/lockup-horizontal.png';

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

/** Menú principal: el mismo que la web del instituto, más la tienda. */
export const mainNav: NavLink[] = [
  { label: 'Cursos', href: `${MAIN_SITE_URL}/cursos`, external: true },
  { label: 'El proyecto', href: `${MAIN_SITE_URL}/sobre-nosotros`, external: true },
  { label: 'Eventos', href: `${MAIN_SITE_URL}/eventos`, external: true },
  { label: 'Inscripción', href: `${MAIN_SITE_URL}/inscripcion`, external: true },
  { label: 'Contacto', href: `${MAIN_SITE_URL}/contacto`, external: true },
  { label: 'Tienda', href: '/#productos' }
];

/** Columnas del pie (mismo esquema que el pie de la web del instituto). */
export const footerLinks: { title: string; links: NavLink[] }[] = [
  {
    title: 'Oferta académica',
    links: [
      { label: 'Árabe', href: `${MAIN_SITE_URL}/cursos-de-arabe`, external: true },
      { label: 'Ciencias islámicas', href: `${MAIN_SITE_URL}/ciencias-islamicas`, external: true },
      { label: 'Cultura islámica', href: `${MAIN_SITE_URL}/cultura-islamica`, external: true },
      { label: 'Clubes de lectura', href: `${MAIN_SITE_URL}/clubes-de-lectura`, external: true },
      { label: 'Todos los cursos', href: `${MAIN_SITE_URL}/cursos`, external: true }
    ]
  },
  {
    title: 'El instituto',
    links: [
      { label: 'El proyecto Al-Bayān', href: `${MAIN_SITE_URL}/sobre-nosotros`, external: true },
      { label: 'Eventos', href: `${MAIN_SITE_URL}/eventos`, external: true },
      { label: 'Proceso de inscripción', href: `${MAIN_SITE_URL}/inscripcion`, external: true },
      { label: 'Contacto', href: `${MAIN_SITE_URL}/contacto`, external: true },
      { label: 'Aula virtual', href: AULA_URL, external: true }
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
  url: 'https://fundacionandalusi.org'
};

/** Datos de contacto (los publicados en www.institutoalbayan.com). */
export const contact = {
  email: 'secretaria@institutoalbayan.com',
  phone: '',
  instagram: 'https://www.instagram.com/institutoalbayan'
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
  'El Instituto Al-Bayān es un proyecto de la Fundación Método Andalusí de España.';
