// Expectations for the bible and the cover's site info, read from the built data (static/data).
import type { Bible, SiteInfo } from '@rmp/model';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DATA = fileURLToPath(new URL('../static/data/', import.meta.url));

export const siteInfo = JSON.parse(readFileSync(`${DATA}site.json`, 'utf8')) as SiteInfo;

/** The bible the site was built with, or null when the repository has none (yet). */
export const bible: Bible | null = existsSync(`${DATA}bible.json`)
  ? (JSON.parse(readFileSync(`${DATA}bible.json`, 'utf8')) as Bible)
  : null;
