import { en } from './en';
import { fr } from './fr';

export type Lang = 'fr' | 'en';
export type MessageKey = keyof typeof fr;

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { fr, en };

export function t(lang: Lang, key: MessageKey, params?: Record<string, string | number>): string {
  const template = MESSAGES[lang][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

export function formatDate(lang: Lang, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(d);
}

/** A file size in the units of the language: « 1,2 Mo » in French, « 1.2 MB » in English. */
export function formatBytes(lang: Lang, bytes: number): string {
  const [kilo, mega] = lang === 'fr' ? ['Ko', 'Mo'] : ['KB', 'MB'];
  const number = (n: number, digits: number) =>
    new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
  if (bytes >= 1_000_000) return `${number(bytes / 1_000_000, 1)} ${mega}`;
  return `${number(Math.max(1, Math.round(bytes / 1000)), 0)} ${kilo}`;
}
