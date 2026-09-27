/**
 * Autocompletado de direcciones con Google Places (API «New»: AutocompleteSuggestion
 * y Place.fetchFields). La clave de navegador llega de GOOGLE_MAPS_API_KEY
 * (pages/all/GoogleMapsKey.tsx la deja en window.__albayanGmapsKey). Sin clave, o
 * si Google falla, el formulario funciona como siempre, sin sugerencias.
 */
declare global {
  interface Window {
    __albayanGmapsKey?: string | null;
    __albayanGmapsReady?: Promise<any>;
    google?: any;
  }
}

export interface AddressSuggestion {
  main: string;
  secondary: string;
  prediction: any;
}

export interface ParsedAddress {
  address1: string;
  city: string;
  postcode: string;
  country: string;
  provinceHint: { code?: string; name?: string };
}

export const hasGoogleKey = () => typeof window !== 'undefined' && Boolean(window.__albayanGmapsKey);

function loadGoogle(): Promise<any> {
  if (window.__albayanGmapsReady) return window.__albayanGmapsReady;
  window.__albayanGmapsReady = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) return resolve(window.google.maps);
    const cb = `__albayanGmapsCb${Date.now()}`;
    (window as any)[cb] = () => resolve(window.google.maps);
    const s = document.createElement('script');
    s.async = true;
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.__albayanGmapsKey || '')}` +
      `&v=weekly&loading=async&language=es&region=ES&callback=${cb}`;
    s.onerror = () => {
      window.__albayanGmapsReady = undefined;
      reject(new Error('No se pudo cargar Google Maps'));
    };
    document.head.appendChild(s);
  });
  return window.__albayanGmapsReady;
}

let places: any = null;
async function placesLib() {
  if (!places) places = await (await loadGoogle()).importLibrary('places');
  return places;
}

/** Token de sesión: agrupa las búsquedas y el detalle final en una sola sesión de Google. */
export async function newSessionToken() {
  const lib = await placesLib();
  return new lib.AutocompleteSessionToken();
}

export async function fetchSuggestions(input: string, country: string, sessionToken: any): Promise<AddressSuggestion[]> {
  const lib = await placesLib();
  const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
    language: 'es',
    region: 'es',
    ...(country ? { includedRegionCodes: [country.toLowerCase()] } : {})
  });
  return (suggestions || [])
    .filter((s: any) => s.placePrediction)
    .slice(0, 5)
    .map((s: any) => ({
      main: s.placePrediction.mainText?.text || s.placePrediction.text?.text || '',
      secondary: s.placePrediction.secondaryText?.text || '',
      prediction: s.placePrediction
    }));
}

export async function resolveSuggestion(s: AddressSuggestion): Promise<ParsedAddress> {
  const place = s.prediction.toPlace();
  await place.fetchFields({ fields: ['addressComponents'] });
  const get = (type: string, short = false) => {
    const c = (place.addressComponents || []).find((x: any) => x.types.includes(type));
    return c ? (short ? c.shortText : c.longText) || '' : '';
  };
  const route = get('route');
  const number = get('street_number');
  const premise = get('premise');
  return {
    address1: [route || premise || s.main, number].filter(Boolean).join(', '),
    city: get('locality') || get('postal_town') || get('administrative_area_level_3') || get('administrative_area_level_2'),
    postcode: get('postal_code'),
    country: get('country', true).toUpperCase(),
    provinceHint: { code: get('administrative_area_level_1', true), name: get('administrative_area_level_1') }
  };
}

/** Provincia (2 primeras cifras del código postal) → comunidad autónoma de EverShop (ES-XX). */
const ES_POSTCODE_COMMUNITY: Record<string, string> = {
  '01': 'PV', '02': 'CM', '03': 'VC', '04': 'AN', '05': 'CL', '06': 'EX', '07': 'IB', '08': 'CT',
  '09': 'CL', '10': 'EX', '11': 'AN', '12': 'VC', '13': 'CM', '14': 'AN', '15': 'GA', '16': 'CM',
  '17': 'CT', '18': 'AN', '19': 'CM', '20': 'PV', '21': 'AN', '22': 'AR', '23': 'AN', '24': 'CL',
  '25': 'CT', '26': 'RI', '27': 'GA', '28': 'MD', '29': 'AN', '30': 'MC', '31': 'NC', '32': 'GA',
  '33': 'AS', '34': 'CL', '35': 'CN', '36': 'GA', '37': 'CL', '38': 'CN', '39': 'CB', '40': 'CL',
  '41': 'AN', '42': 'CL', '43': 'CT', '44': 'AR', '45': 'CM', '46': 'VC', '47': 'CL', '48': 'PV',
  '49': 'CL', '50': 'AR', '51': 'CE', '52': 'ML'
};

const normalize = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

/** Código de provincia/comunidad de EverShop que corresponde a la dirección de Google. */
export function matchProvince(
  parsed: ParsedAddress,
  provinces: { value: string; label: string }[]
): string {
  if (!provinces.length) return '';
  const has = (code: string) => provinces.some((p) => p.value === code);
  if (parsed.country === 'ES') {
    const byPostcode = ES_POSTCODE_COMMUNITY[parsed.postcode.slice(0, 2)];
    if (byPostcode && has(`ES-${byPostcode}`)) return `ES-${byPostcode}`;
  }
  const code = `${parsed.country}-${parsed.provinceHint.code || ''}`;
  if (parsed.provinceHint.code && has(code)) return code;
  const name = normalize(parsed.provinceHint.name || '');
  const byName = name && provinces.find((p) => normalize(p.label).includes(name) || name.includes(normalize(p.label)));
  return byName ? byName.value : '';
}
