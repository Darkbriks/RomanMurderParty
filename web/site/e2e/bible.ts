// Expectations for the bible and the cover's site info, read from the built data (static/data).
import type { Bible, BibleFile, SiteInfo } from '@rmp/model';
import { existsSync, readFileSync } from 'node:fs';
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

/** Whether the site shows this file through a dedicated view rather than the generic one. */
export const hasDedicatedView = (_file: BibleFile): boolean => false;
