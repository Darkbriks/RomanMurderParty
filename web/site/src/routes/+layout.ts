import { resolve } from '$app/paths';
import { loadBook, loadDownloads, loadPageMaps, loadVersionIndex } from '#lib/data/load.ts';
import type { LayoutLoad } from './$types';

export const prerender = true;
export const trailingSlash = 'always';

export const load: LayoutLoad = async ({ fetch }) => {
  // SvelteKit 3 no longer types `base`; with paths.relative = false, resolve('/') is `${base}/`.
  const base = resolve('/').replace(/\/$/, '');
  const index = await loadVersionIndex(fetch, base);
  const [book, pageMaps, downloads] = await Promise.all([
    loadBook(fetch, base, index.latest),
    loadPageMaps(fetch, base),
    loadDownloads(fetch, base),
  ]);
  return { index, book, pageMaps, downloads };
};
