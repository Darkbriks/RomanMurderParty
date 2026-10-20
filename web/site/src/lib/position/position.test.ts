import type { Book } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { readPosition, resolveResume, STORAGE_KEY, writePosition, type SavedPosition } from './position';

const para = (id: string) => ({ type: 'paragraph' as const, id, dialogue: false, segments: [{ content: [{ type: 'text' as const, text: 'x' }], spaceAfter: false }] });
const chapter = (number: number, title: string | null, blocks: string[]) => ({
  id: `c${number}`,
  number,
  numeral: String(number),
  title: title === null ? null : [{ type: 'text' as const, text: title }],
  loc: { file: 'a.tex', line: 1 },
  blocks: blocks.map(para),
});
const bookOf = (...chapters: ReturnType<typeof chapter>[]) => ({ parts: [{ chapters }] }) as unknown as Book;
const saved = (over: Partial<SavedPosition>): SavedPosition => ({
  chapter: 2,
  blockId: 'b2',
  chapterTitle: 'Seule',
  sha: 'abc',
  savedAt: '2026-10-20T10:00:00Z',
  ...over,
});
const book = bookOf(chapter(1, 'Valse', ['a1']), chapter(2, 'Seule', ['b1', 'b2']), chapter(3, 'Fin', ['c1']));

describe('resolveResume', () => {
  it('null without a saved position', () => {
    expect(resolveResume(book, null)).toBeNull();
  });
  it('exact match keeps the block', () => {
    expect(resolveResume(book, saved({}))).toEqual({ chapter: 2, blockId: 'b2' });
  });
  it('missing block falls back to chapter start', () => {
    expect(resolveResume(book, saved({ blockId: 'gone' }))).toEqual({ chapter: 2, blockId: null });
  });
  it('renumbered chapter is found by title', () => {
    const renumbered = bookOf(chapter(1, 'Nouveau', []), chapter(2, 'Valse', ['a1']), chapter(3, 'Seule', ['b2']));
    expect(resolveResume(renumbered, saved({}))).toEqual({ chapter: 3, blockId: null });
  });
  it('same number with another title and no unique match keeps the number', () => {
    const renamed = bookOf(chapter(1, 'A', []), chapter(2, 'B', []));
    expect(resolveResume(renamed, saved({}))).toEqual({ chapter: 2, blockId: null });
  });
  it('unknown title and missing number fall back to chapter 1', () => {
    expect(resolveResume(book, saved({ chapter: 9, chapterTitle: 'Inconnu' }))).toEqual({ chapter: 1, blockId: null });
  });
  it('working-tree sha is accepted', () => {
    expect(resolveResume(book, saved({ sha: 'working-tree' }))).toEqual({ chapter: 2, blockId: 'b2' });
  });
});

describe('position storage', () => {
  it('round trip under rmp.position.v1', () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    writePosition(s, saved({}));
    expect(STORAGE_KEY).toBe('rmp.position.v1');
    expect(m.has('rmp.position.v1')).toBe(true);
    expect(readPosition(s)).toEqual(saved({}));
  });
  it('throwing storage reads as null and writes silently', () => {
    const bad = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(readPosition(bad)).toBeNull();
    expect(() => writePosition(bad, saved({}))).not.toThrow();
    expect(readPosition(null)).toBeNull();
  });
  it('garbage reads as null', () => {
    expect(readPosition({ getItem: () => 'nope' })).toBeNull();
    expect(readPosition({ getItem: () => '{"chapter":"x"}' })).toBeNull();
  });
});
