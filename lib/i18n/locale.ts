export type Locale = 'en' | 'es';
export const LOCALE_KEY = 'vault-raiders.locale.v1';
let locale: Locale = 'en';
let initialized = false;
const listeners = new Set<() => void>();
export const getLocale = () => locale;
export const getServerLocale = (): Locale => 'en';
export function resolveLocale(
  query: string | null,
  saved: string | null,
  browser = 'en',
): Locale {
  if (query === 'en' || query === 'es') return query;
  if (saved === 'en' || saved === 'es') return saved;
  return browser.toLowerCase().startsWith('es') ? 'es' : 'en';
}
export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setLocale(next: Locale) {
  if (next !== 'en' && next !== 'es') return;
  const changed = locale !== next;
  locale = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* In-memory choice still works. */
    }
  }
  if (changed) for (const listener of listeners) listener();
}
export function initializeLocale() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LOCALE_KEY);
  } catch {
    /* Storage can be disabled. */
  }
  setLocale(
    resolveLocale(
      new URLSearchParams(location.search).get('lang'),
      saved,
      navigator.language,
    ),
  );
}
