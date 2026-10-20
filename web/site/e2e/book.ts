// Expectations for the e2e tests, derived from the data the site is built from (static/data) and
// from the LaTeX sources, so the tests follow the author's edits instead of pinning today's text.
import type { Block, Book, Chapter, Inline, Part } from '@rmp/model';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

const DATA = fileURLToPath(new URL('../static/data/', import.meta.url));
const REPO = fileURLToPath(new URL('../../../', import.meta.url));

const index = JSON.parse(readFileSync(`${DATA}versions.json`, 'utf8')) as {
  latest: string;
  versions: { sha: string; model: string; date?: string }[];
};
const latest = index.versions.find((v) => v.sha === index.latest);
if (!latest) throw new Error(`static/data/versions.json: no entry for latest ${index.latest} (run npm run data)`);
export const bookJson = readFileSync(`${DATA}${latest.model}`, 'utf8');
export const book = JSON.parse(bookJson) as Book;

export interface ChapterInfo {
  part: Part;
  chapter: Chapter;
  isFirstOfPart: boolean;
}
export const chapters: ChapterInfo[] = book.parts.flatMap((part) =>
  part.chapters.map((chapter, i) => ({ part, chapter, isFirstOfPart: i === 0 })),
);
export const lastChapter = chapters[chapters.length - 1]!.chapter.number;
export const chapterByNumber = (n: number): ChapterInfo => chapters.find((c) => c.chapter.number === n)!;

/** Text as the site prints it (textContent): quotes with their French marks, notes left out. */
export function plain(nodes: Inline[], inQuote = false): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.text;
        case 'lineBreak':
        case 'note':
          return '';
        case 'dropCap':
          return node.letter + plain(node.rest, inQuote);
        case 'quote':
          return inQuote ? `“${plain(node.children, true)}”` : `« ${plain(node.children, true)} »`;
        default:
          return plain(node.children, inQuote);
      }
    })
    .join('');
}

/** What a chapter heading shows: its title, or its numeral when it has none. */
export const headingText = (c: Chapter): string => (c.title ? plain(c.title) : c.numeral);

function* inlinesOf(block: Block): Generator<Inline[]> {
  switch (block.type) {
    case 'paragraph':
      for (const s of block.segments) yield s.content;
      break;
    case 'letter':
      if (block.place) yield block.place;
      yield block.salutation;
      break;
    case 'signature':
    case 'postscript':
      yield block.content;
      break;
    case 'telegram':
      yield block.office;
      yield block.time;
      yield block.recipient;
      break;
    case 'clipping':
      yield block.newspaper;
      yield block.headline;
      if (block.date) yield block.date;
      break;
    case 'diary':
      yield block.heading;
      break;
    case 'image':
      yield block.caption;
      break;
    case 'annexPage':
      yield block.title;
      break;
  }
}

function* walkBlocks(blocks: Block[]): Generator<Block> {
  for (const block of blocks) {
    yield block;
    if ('body' in block) yield* walkBlocks(block.body);
  }
}

function* walkInlines(nodes: Inline[]): Generator<Inline> {
  for (const node of nodes) {
    yield node;
    if (node.type === 'dropCap') yield* walkInlines(node.rest);
    else if ('children' in node) yield* walkInlines(node.children);
  }
}

/** The first working note of a kind, with the chapter and the innermost block that holds it. */
export function firstNote(kind?: 'rework' | 'author'): { n: number; blockId: string; note: Extract<Inline, { type: 'note' }> } | null {
  for (const { chapter } of chapters) {
    for (const block of walkBlocks(chapter.blocks)) {
      for (const content of inlinesOf(block)) {
        for (const node of walkInlines(content)) {
          if (node.type === 'note' && (!kind || node.kind === kind)) return { n: chapter.number, blockId: block.id, note: node };
        }
      }
    }
  }
  return null;
}

const hasVisibleText = (nodes: Inline[]): boolean =>
  nodes.some((node) =>
    node.type === 'text' ? node.text.trim() !== '' : node.type === 'dropCap' ? true : 'children' in node && node.type !== 'note' ? hasVisibleText(node.children) : false,
  );

/** Ids of the top-level blocks a chapter body shows when notes are hidden. */
export const visibleBlockIds = (c: Chapter): string[] =>
  c.blocks.filter((b) => b.type !== 'paragraph' || b.segments.some((s) => hasVisibleText(s.content))).map((b) => b.id);

/** The first dialogue paragraph that still prints text when notes are hidden. */
export function firstDialogue(): { n: number; block: Extract<Block, { type: 'paragraph' }> } | null {
  for (const { chapter } of chapters) {
    for (const block of chapter.blocks) {
      if (block.type === 'paragraph' && block.dialogue && block.segments.some((s) => hasVisibleText(s.content))) {
        return { n: chapter.number, block };
      }
    }
  }
  return null;
}

/** The first chapter made only of note paragraphs: with notes hidden, its body is empty. */
export function firstPlaceholder(): ChapterInfo | null {
  return (
    chapters.find(({ chapter }) =>
      chapter.blocks.every((b) => b.type === 'paragraph' && !b.segments.some((s) => hasVisibleText(s.content))),
    ) ?? null
  );
}

/** The ornaments a chapter page shows, hence requests. */
export function ornamentsOf(info: ChapterInfo): string[] {
  const names = new Set(['chapitre']);
  if (info.isFirstOfPart) names.add('partie');
  for (const block of walkBlocks(info.chapter.blocks)) {
    if (block.type === 'sceneBreak' || block.type === 'annexPage') names.add('scene');
    if (block.type === 'end') names.add('fin');
  }
  if (info.isFirstOfPart) for (const block of walkBlocks(info.part.intro)) if (block.type === 'sceneBreak' || block.type === 'annexPage') names.add('scene');
  return [...names];
}

/** Collapses the differences between LaTeX source and printed text: apostrophes, French spacing. */
export function normalize(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[  \s]+/g, ' ')
    .replace(/ ([?!:;»])/g, '$1')
    .replace(/« /g, '«')
    .trim();
}

const latexToText = (s: string) => s.replace(/\\[a-zA-Z]+\*?/g, ' ').replace(/[{}~]/g, ' ');

/**
 * Text of the `%` comments in the part and annex files, as it would read if it leaked: LaTeX
 * commands dropped, normalised. Left out: fragments shorter than 12 characters, fragments that also
 * occur in the uncommented source (a sentence kept both ways), and fragments that only repeat labels
 * the site composes from the structure (a `% Ouverture — Seraphina` header next to \partie).
 */
export function commentFragments(): string[] {
  const files = ['parties', 'annexes'].flatMap((dir) =>
    readdirSync(`${REPO}${dir}`)
      .filter((f) => f.endsWith('.tex'))
      .map((f) => readFileSync(`${REPO}${dir}/${f}`, 'utf8')),
  );
  const comments: string[] = [];
  const kept: string[] = [];
  for (const line of files.flatMap((f) => f.split('\n'))) {
    const at = line.search(/(?<!\\)%/);
    kept.push(at < 0 ? line : line.slice(0, at));
    if (at >= 0) comments.push(normalize(latexToText(line.slice(at + 1))));
  }
  const source = normalize(latexToText(kept.join(' ')));
  const labels = normalize(
    [book.meta.title, ...book.parts.map((p) => `${p.label} — ${p.narrator}`), ...chapters.map((c) => headingText(c.chapter))].join('\n'),
  );
  return [...new Set(comments)].filter((c) => c.length >= 12 && /\p{L}/u.test(c) && !source.includes(c) && !labels.includes(c));
}

/** Navigates and waits until the page is hydrated with the stored preferences applied. */
export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready', '');
}

export async function reloadReady(page: Page): Promise<void> {
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ready', '');
}

export interface DownloadItem {
  variant: 'final' | 'brouillon';
  url: string;
  bytes: number;
  filename: string;
}
/** The downloads the site lists; empty when downloads.json is missing, so a spec can skip instead of failing at import. */
export function loadDownloads(): DownloadItem[] {
  try {
    return (JSON.parse(readFileSync(`${DATA}downloads.json`, 'utf8')) as { items: DownloadItem[] }).items;
  } catch {
    return [];
  }
}

/** The date the cover shows as « Mis à jour le … », or null when the latest version is the working tree. */
export function updateDate(lang: 'fr' | 'en'): string | null {
  if (index.latest === 'working-tree') return null;
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date(latest?.date ?? book.meta.version.date)); // as the cover does
}

/** What the cover's resume line reads for a chapter visited in the French interface. */
export function resumeLabel(info: ChapterInfo): string {
  const { part, chapter } = info;
  return `${part.label}, chapitre ${chapter.numeral}${chapter.title ? `, « ${plain(chapter.title)} »` : ''}`;
}
