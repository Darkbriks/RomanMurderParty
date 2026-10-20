import type { PageMap } from '@rmp/model';

// Pure page arithmetic for book pages mode (no DOM, no pdf.js), so it can be unit tested. Pages are
// 1-based, as in the PDF and the page maps.

const clamp = (page: number, count: number) => Math.min(Math.max(1, Math.round(page)), Math.max(1, count));

/**
 * The pages shown with `page`. Narrow screens show that page alone. Wide screens show an open book:
 * page 1 alone on the right (it is a recto), then even-odd pairs, the last even page alone.
 */
export function spreadFor(page: number, count: number, wide: boolean): number[] {
  const p = clamp(page, count);
  if (!wide || p === 1) return [p];
  const left = p - (p % 2);
  return left + 1 <= count ? [left, left + 1] : [left];
}

/** The first page of the spread after the one holding `page`, or null on the last spread. */
export function nextSpreadStart(page: number, count: number, wide: boolean): number | null {
  const spread = spreadFor(page, count, wide);
  const last = spread[spread.length - 1]!;
  return last < count ? last + 1 : null;
}

/** The first page of the spread before the one holding `page`, or null on the first spread. */
export function prevSpreadStart(page: number, count: number, wide: boolean): number | null {
  const first = spreadFor(page, count, wide)[0]!;
  return first > 1 ? spreadFor(first - 1, count, wide)[0]! : null;
}

/** The chapter a page belongs to: the last chapter starting at or before it; 1 before the first. */
export function chapterForPage(map: PageMap, page: number): number {
  let chapter = 1;
  map.chapters.forEach((start, i) => {
    if (start <= page) chapter = i + 1;
  });
  return chapter;
}

/**
 * The page of the other PDF (`to`, with `count` pages) that matches `page` of `from`: the same
 * chapter, as far into it as the page was, without running into the next chapter. Pages before
 * the first chapter (title, front matter) keep their number.
 */
export function samePlace(from: PageMap, to: PageMap, page: number, count: number): number {
  const firstChapter = from.chapters[0];
  if (firstChapter === undefined || page < firstChapter) {
    const before = to.chapters[0] === undefined ? count : to.chapters[0] - 1;
    return clamp(Math.min(page, before), count);
  }
  const chapter = chapterForPage(from, page);
  const start = to.chapters[chapter - 1];
  if (start === undefined) return clamp(to.chapters[to.chapters.length - 1] ?? 1, count);
  const end = to.chapters[chapter] === undefined ? count : to.chapters[chapter] - 1;
  const offset = page - from.chapters[chapter - 1]!;
  return clamp(Math.min(start + offset, end), count);
}
