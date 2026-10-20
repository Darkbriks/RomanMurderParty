// Derives the `%` comment fragments of the live sources, so tests follow the author's edits instead
// of pinning today's comment strings. Same rules as web/site/e2e/book.ts commentFragments().
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Collapses the differences between LaTeX source and printed text: apostrophes, French spacing. */
export function normalize(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[  \s]+/g, ' ')
    .replace(/ ([?!:;»])/g, '$1')
    .replace(/« /g, '«')
    .trim();
}

const latexToText = (s: string): string => s.replace(/\\[a-zA-Z]+\*?/g, ' ').replace(/[{}~]/g, ' ');

/**
 * Text after an unescaped `%` in the part and annex files of `root`, normalised. Left out: fragments
 * shorter than 12 characters, without letters, or that also occur in the uncommented source (a
 * sentence kept both ways) or in `labels` (what the site composes from the structure).
 */
export function commentFragments(root: string, labels = ''): string[] {
  const files = ['parties', 'annexes'].flatMap((dir) =>
    readdirSync(path.join(root, dir))
      .filter((f) => f.endsWith('.tex'))
      .map((f) => readFileSync(path.join(root, dir, f), 'utf8')),
  );
  const comments: string[] = [];
  const kept: string[] = [];
  for (const line of files.flatMap((f) => f.split('\n'))) {
    const at = line.search(/(?<!\\)%/);
    kept.push(at < 0 ? line : line.slice(0, at));
    if (at >= 0) comments.push(normalize(latexToText(line.slice(at + 1))));
  }
  const source = normalize(latexToText(kept.join(' ')));
  const lab = normalize(labels);
  return [...new Set(comments)].filter((c) => c.length >= 12 && /\p{L}/u.test(c) && !source.includes(c) && !lab.includes(c));
}
