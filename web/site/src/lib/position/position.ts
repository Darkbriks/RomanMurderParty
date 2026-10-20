import type { Block, Book, Chapter } from '@rmp/model';
import { plainText } from '#lib/render/text.ts';
import { chapterByNumber } from '#lib/render/visibility.ts';

// Pure reading-position logic (no runes, no $app imports) so it can be unit tested.
export interface SavedPosition {
  chapter: number;
  blockId: string | null;
  chapterTitle: string | null;
  sha: string;
  savedAt: string;
}

export const STORAGE_KEY = 'rmp.position.v1';

export function readPosition(storage: Pick<Storage, 'getItem'> | null): SavedPosition | null {
  let raw: string | null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof o !== 'object' || o === null) return null;
  const s = o as Record<string, unknown>;
  if (!Number.isInteger(s.chapter) || (s.chapter as number) < 1) return null;
  if (s.blockId !== null && typeof s.blockId !== 'string') return null;
  if (s.chapterTitle !== null && typeof s.chapterTitle !== 'string') return null;
  if (typeof s.sha !== 'string' || typeof s.savedAt !== 'string') return null;
  return { chapter: s.chapter as number, blockId: s.blockId, chapterTitle: s.chapterTitle, sha: s.sha, savedAt: s.savedAt };
}

export function writePosition(storage: Pick<Storage, 'setItem'> | null, p: SavedPosition): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable or full: the reader simply cannot resume
  }
}

/** The plain title of a chapter, or null when it has none (it is then known by its numeral only). */
export const chapterTitleOf = (chapter: Chapter): string | null => (chapter.title ? plainText(chapter.title) : null);

function hasBlock(blocks: Block[], id: string): boolean {
  return blocks.some((b) => b.id === id || ('body' in b && hasBlock(b.body, id)));
}

export function resolveResume(book: Book, saved: SavedPosition | null): { chapter: number; blockId: string | null } | null {
  if (!saved) return null;
  const chapters = book.parts.flatMap((p) => p.chapters);
  const same = chapterByNumber(book, saved.chapter)?.chapter;
  if (same && chapterTitleOf(same) === saved.chapterTitle) {
    return { chapter: same.number, blockId: saved.blockId && hasBlock(same.blocks, saved.blockId) ? saved.blockId : null };
  }
  const byTitle = saved.chapterTitle === null ? [] : chapters.filter((c) => chapterTitleOf(c) === saved.chapterTitle);
  if (byTitle.length === 1) return { chapter: byTitle[0]!.number, blockId: null };
  if (same) return { chapter: same.number, blockId: null };
  return { chapter: 1, blockId: null };
}
