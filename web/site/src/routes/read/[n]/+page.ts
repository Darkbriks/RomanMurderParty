import { error } from '@sveltejs/kit';
import { chapterByNumber } from '#lib/render/visibility.ts';
import type { PageLoad } from './$types';

// Chapter pages are found by the prerender crawl (cover → chapter 1 → TOC and next links).
export const load: PageLoad = async ({ params, parent }) => {
  const n = /^[1-9]\d*$/.test(params.n) ? Number(params.n) : NaN;
  const { book } = await parent();
  const found = chapterByNumber(book, n);
  if (!found) error(404, `No chapter ${params.n}`);
  return { n, ...found };
};
