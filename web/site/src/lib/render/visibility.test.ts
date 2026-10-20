import type { Block, Book, Chapter, Inline, Part } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { chapterByNumber, chapterlessParts, isBlockVisible } from './visibility.ts';

const loc = { file: 'parties/x.tex', line: 1 };
const text = (t: string): Inline => ({ type: 'text', text: t });
const note = (t: string): Inline => ({ type: 'note', kind: 'rework', children: [text(t)] });
const para = (...segments: Inline[][]): Block => ({
  type: 'paragraph',
  id: 'c1.b1',
  dialogue: false,
  segments: segments.map((content) => ({ loc, content, spaceAfter: true })),
});

const chapter = (number: number): Chapter => ({
  id: `c${number}`, number, numeral: 'I'.repeat(number), title: null, loc, blocks: [],
});
const part = (ordinal: number, chapters: Chapter[]): Part => ({
  id: `p${ordinal}`, ordinal, label: `Part ${ordinal}`, narrator: 'N', epigraph: null, loc, intro: [], chapters,
});
const book = (parts: Part[]): Book => ({
  schemaVersion: 1,
  meta: {
    title: 'T', author: null, runningTitle: 'T',
    version: { sha: 'x', date: '2026-10-20T00:00:00+02:00', subject: 's', tags: [] },
  },
  front: { epigraph: null, dedication: null },
  parts,
  characters: { title: null, groups: [] },
});

describe('isBlockVisible', () => {
  it('hides a paragraph that holds only a note when notes are off', () => {
    const p = para([note('Titre ?')]);
    expect(isBlockVisible(p, false)).toBe(false);
    expect(isBlockVisible(p, true)).toBe(true);
  });

  it('hides notes spread over several segments, with blank text and line breaks around them', () => {
    const p = para([note('a')], [text(' '), { type: 'lineBreak' }, note('b')], [{ type: 'emphasis', children: [note('c')] }]);
    expect(isBlockVisible(p, false)).toBe(false);
  });

  it('always shows a mixed paragraph', () => {
    const p = para([text('pousser '), note('Titre ?'), text(' Maître')]);
    expect(isBlockVisible(p, false)).toBe(true);
    expect(isBlockVisible(p, true)).toBe(true);
  });

  it('shows a paragraph that opens with a drop cap', () => {
    expect(isBlockVisible(para([{ type: 'dropCap', letter: 'B', rest: [] }]), false)).toBe(true);
  });

  it('always shows other blocks', () => {
    expect(isBlockVisible({ type: 'sceneBreak', id: 'c1.b2' }, false)).toBe(true);
  });
});

describe('chapterByNumber', () => {
  const b = book([part(1, [chapter(1), chapter(2)]), part(2, [chapter(3)])]);

  it('finds a chapter and its part', () => {
    const r = chapterByNumber(b, 2);
    expect(r?.chapter.id).toBe('c2');
    expect(r?.part.id).toBe('p1');
    expect(r?.isFirstOfPart).toBe(false);
    expect(chapterByNumber(b, 3)?.isFirstOfPart).toBe(true);
    expect(chapterByNumber(b, 1)?.isFirstOfPart).toBe(true);
  });

  it('returns null for a missing chapter', () => {
    expect(chapterByNumber(b, 0)).toBeNull();
    expect(chapterByNumber(b, 4)).toBeNull();
    expect(chapterByNumber(b, 1.5)).toBeNull();
  });
});

describe('chapterlessParts', () => {
  // p1 has no chapter, p2 holds c1, p3 none, p4 holds c2, p5 and p6 none.
  const b = book([part(1, []), part(2, [chapter(1)]), part(3, []), part(4, [chapter(2)]), part(5, []), part(6, [])]);
  const ids = (ps: Part[]) => ps.map((p) => p.id);

  it('shows parts without chapters before the first chapter of the next part', () => {
    expect(ids(chapterlessParts(b, 1).before)).toEqual(['p1']);
    expect(ids(chapterlessParts(b, 2).before)).toEqual(['p3']);
  });

  it('shows trailing parts without chapters after the last chapter only', () => {
    expect(ids(chapterlessParts(b, 1).after)).toEqual([]);
    expect(ids(chapterlessParts(b, 2).after)).toEqual(['p5', 'p6']);
  });

  it('gives trailing parts only to the very last chapter when the last part has several chapters', () => {
    const multi = book([part(1, [chapter(1)]), part(2, [chapter(2), chapter(3)]), part(3, [])]);
    expect(chapterlessParts(multi, 1)).toEqual({ before: [], after: [] });
    expect(chapterlessParts(multi, 2)).toEqual({ before: [], after: [] });
    expect(ids(chapterlessParts(multi, 3).after)).toEqual(['p3']);
    expect(chapterlessParts(multi, 3).before).toEqual([]);
  });

  it('shows a chapterless part between two parts with chapters once, before the next part', () => {
    const between = book([part(1, [chapter(1), chapter(2)]), part(2, []), part(3, [chapter(3), chapter(4)])]);
    expect(chapterlessParts(between, 1)).toEqual({ before: [], after: [] });
    expect(chapterlessParts(between, 2)).toEqual({ before: [], after: [] });
    expect(ids(chapterlessParts(between, 3).before)).toEqual(['p2']);
    expect(chapterlessParts(between, 4)).toEqual({ before: [], after: [] });
  });

  it('is empty for a chapter that does not exist', () => {
    expect(chapterlessParts(b, 99)).toEqual({ before: [], after: [] });
  });

  it('is empty for a book where every part has chapters', () => {
    const full = book([part(1, [chapter(1)]), part(2, [chapter(2)])]);
    expect(chapterlessParts(full, 2)).toEqual({ before: [], after: [] });
  });
});
