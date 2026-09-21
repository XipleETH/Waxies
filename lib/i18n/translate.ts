import messages from './en.json';
import { getLocale, type Locale } from './locale';
const english: Record<string, string> = messages;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(english)
  .filter(([key]) => /\{\d+\}/.test(key))
  .sort(
    ([a], [b]) =>
      b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length,
  )
  .map(([key, value]) => {
    const slots: string[] = [];
    const pattern = key
      .split(/(\{\d+\})/)
      .map((part) => {
        if (/^\{\d+\}$/.test(part)) {
          slots.push(part);
          return '(.*?)';
        }
        return escape(part);
      })
      .join('');
    return { pattern: new RegExp('^' + pattern + '$'), value, slots };
  });
const cache = new Map<string, string>();
/** Translate presentation text only. IDs, saved levels and replay certificates stay unchanged. */
export function t<T>(value: T, locale: Locale = getLocale()): T {
  if (locale === 'es' || typeof value !== 'string' || !value.trim())
    return value;
  const key = value.trim().replace(/\s+/g, ' ');
  let translated = english[key] ?? cache.get(key);
  if (translated === undefined) {
    for (const template of templates) {
      const match = template.pattern.exec(key);
      if (!match) continue;
      translated = template.value.replace(/\{\d+\}/g, (slot) => {
        const part = match[template.slots.indexOf(slot) + 1] ?? '';
        return english[part] ?? part;
      });
      break;
    }
    translated ??= key;
    if (cache.size > 1000) cache.clear();
    cache.set(key, translated);
  }
  if (translated === key) return value;
  // Preserve intentional whitespace between inline JSX fragments.
  return (value.match(/^\s*/)?.[0] +
    translated +
    value.match(/\s*$/)?.[0]) as T;
}
