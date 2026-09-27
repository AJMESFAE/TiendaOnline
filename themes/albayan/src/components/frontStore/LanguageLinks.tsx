import React from 'react';
import { useLocale } from './i18n.js';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' }
];

/**
 * Selector de idioma («Español · العربية · English»). «?lang=xx» lo atiende la
 * extensión tienda (pages/frontStore/all/detectLanguage): guarda la elección y
 * lleva a la misma página en ese idioma.
 */
export function LanguageLinks({ className = '' }: { className?: string }) {
  const { locale } = useLocale();
  return (
    <nav className={`albayan-langs ${className}`} aria-label="Idioma / اللغة / Language">
      {LANGUAGES.map((l) => (
        <a
          key={l.code}
          href={`?lang=${l.code}`}
          lang={l.code}
          hrefLang={l.code}
          aria-current={locale === l.code ? 'true' : undefined}
          className="albayan-langs__link"
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
