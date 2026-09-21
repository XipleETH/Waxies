'use client';
import { useLocale } from '@/lib/i18n/use-locale';
import { setLocale } from '@/lib/i18n/locale';
export function LanguageSelector() {
  const locale = useLocale();
  return (
    <fieldset
      className="language-selector"
      aria-label={locale === 'en' ? 'Game language' : 'Idioma del juego'}
    >
      {(['en', 'es'] as const).map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          aria-label={language === 'en' ? 'English' : 'Español'}
          aria-pressed={locale === language}
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('lang', language);
            window.history.replaceState(null, '', url);
            setLocale(language);
          }}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </fieldset>
  );
}
