import { useAppState } from '@components/common/context/app.js';
import { useEffect } from 'react';

/** dir="rtl" en <html> para el árabe (las variantes rtl: de Tailwind lo necesitan). */
export default function RtlDirection() {
  const { locale = '' } = (useAppState() || {}) as { locale?: string };
  useEffect(() => {
    document.documentElement.dir = locale.startsWith('ar') ? 'rtl' : 'ltr';
  }, [locale]);
  return null;
}

export const layout = {
  areaId: 'body',
  sortOrder: 3
};
