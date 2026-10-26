import {
  BookSchema,
  DownloadsSchema,
  PageMapsSchema,
  SiteInfoSchema,
  VersionIndexSchema,
  type Book,
  type Downloads,
  type PageMaps,
  type SiteInfo,
  type VersionIndex,
} from '@rmp/model';
import type { ZodType } from 'zod';

type Fetch = typeof globalThis.fetch;

async function getJson<T>(fetch: Fetch, url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cannot load ${url}: HTTP ${res.status}`);
  return schema.parse(await res.json());
}

export const loadVersionIndex = (fetch: Fetch, base: string): Promise<VersionIndex> =>
  getJson(fetch, `${base}/data/versions.json`, VersionIndexSchema);

export const loadBook = (fetch: Fetch, base: string, sha: string): Promise<Book> =>
  getJson(fetch, `${base}/data/versions/${sha}.json`, BookSchema);

export const loadPageMaps = (fetch: Fetch, base: string): Promise<PageMaps> =>
  getJson(fetch, `${base}/data/pagemaps.json`, PageMapsSchema);

export const loadDownloads = (fetch: Fetch, base: string): Promise<Downloads> =>
  getJson(fetch, `${base}/data/downloads.json`, DownloadsSchema);

export const loadSiteInfo = (fetch: Fetch, base: string): Promise<SiteInfo> =>
  getJson(fetch, `${base}/data/site.json`, SiteInfoSchema);
