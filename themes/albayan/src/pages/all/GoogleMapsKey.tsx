import React from 'react';

interface Props {
  setting: { googleMapsApiKey?: string | null };
}

/**
 * Deja la clave de navegador de Google Maps (GOOGLE_MAPS_API_KEY) al alcance del
 * autocompletado de direcciones (components/frontStore/customer/address/addressForm).
 * El script de Google solo se carga cuando el cliente empieza a escribir una dirección.
 */
export default function GoogleMapsKey({ setting }: Props) {
  if (typeof window !== 'undefined') {
    window.__albayanGmapsKey = setting?.googleMapsApiKey || null;
  }
  return null;
}

export const layout = {
  areaId: 'body',
  sortOrder: 2
};

export const query = `
  query Query {
    setting {
      googleMapsApiKey
    }
  }
`;
