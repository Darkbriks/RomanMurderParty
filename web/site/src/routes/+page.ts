import { resolve } from '$app/paths';
import { loadSiteInfo } from '#lib/data/load.ts';
import type { PageLoad } from './$types';

// The cover's presentation and whether the bible exists (data/site.json).
export const load: PageLoad = async ({ fetch }) => {
  const base = resolve('/').replace(/\/$/, '');
  return { site: await loadSiteInfo(fetch, base) };
};
