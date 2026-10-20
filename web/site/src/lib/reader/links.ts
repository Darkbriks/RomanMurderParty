import { resolve } from '$app/paths';

/** URL of chapter `n`, with the trailing slash the prerendered site uses (trailingSlash: 'always'). */
export function chapterHref(n: number): string {
  return `${resolve('/read/[n]', { n: String(n) })}/`;
}
