// Expectations for the bible and the cover's site info, read from the built data (static/data).
import type { Bible, BibleFile, SiteInfo } from '@rmp/model';
import { existsSync, readFileSync } from 'node:fs';
import { asChronology, asHouse, asRelations, CHRONOLOGY_KEYS, RELATIONS_KEYS } from '../src/lib/bible/shapes.ts';
import { fileURLToPath } from 'node:url';

const DATA = fileURLToPath(new URL('../static/data/', import.meta.url));

export const siteInfo = JSON.parse(readFileSync(`${DATA}site.json`, 'utf8')) as SiteInfo;

/** The bible the site was built with, or null when the repository has none (yet). */
export const bible: Bible | null = existsSync(`${DATA}bible.json`)
  ? (JSON.parse(readFileSync(`${DATA}bible.json`, 'utf8')) as Bible)
  : null;

/** Every `secret` of the characters file: text that must never be readable before consent. */
export const secrets: string[] = (() => {
  const file = bible?.files.find((f) => f.slug === 'personnages');
  if (!file || file.kind !== 'yaml' || typeof file.data !== 'object' || file.data === null || Array.isArray(file.data)) return [];
  return Object.values(file.data)
    .flatMap((v) => (Array.isArray(v) ? v : []))
    .flatMap((e) => (e && typeof e === 'object' && !Array.isArray(e) && typeof e.secret === 'string' ? [e.secret] : []));
})();

/** The top-level keys a dedicated view shows; the generic view shows the others. */
export const handledKeys = (file: BibleFile): readonly string[] => {
  if (file.kind !== 'yaml') return [];
  if (asChronology(file.data)) return CHRONOLOGY_KEYS;
  if (asRelations(file.data)) return RELATIONS_KEYS;
  if (asHouse(file.data)) return ['niveaux'];
  return [];
};
