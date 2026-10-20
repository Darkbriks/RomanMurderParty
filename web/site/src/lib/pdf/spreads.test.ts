import { describe, expect, it } from 'vitest';
import { chapterForPage, nextSpreadStart, prevSpreadStart, samePlace, spreadFor } from './spreads';

describe('spreadFor', () => {
  it('narrow shows one page', () => {
    expect(spreadFor(1, 44, false)).toEqual([1]);
    expect(spreadFor(2, 44, false)).toEqual([2]);
    expect(spreadFor(3, 44, false)).toEqual([3]);
    expect(spreadFor(44, 44, false)).toEqual([44]);
  });
  it('wide: page 1 alone, then even-odd pairs', () => {
    expect(spreadFor(1, 44, true)).toEqual([1]);
    expect(spreadFor(2, 44, true)).toEqual([2, 3]);
    expect(spreadFor(3, 44, true)).toEqual([2, 3]);
    expect(spreadFor(44, 44, true)).toEqual([44]);
    expect(spreadFor(44, 45, true)).toEqual([44, 45]);
    expect(spreadFor(45, 45, true)).toEqual([44, 45]);
  });
  it('a one-page document is a single page either way', () => {
    expect(spreadFor(1, 1, true)).toEqual([1]);
    expect(spreadFor(1, 1, false)).toEqual([1]);
  });
  it('clamps pages outside the document', () => {
    expect(spreadFor(0, 44, false)).toEqual([1]);
    expect(spreadFor(99, 44, false)).toEqual([44]);
    expect(spreadFor(99, 44, true)).toEqual([44]);
  });
});

describe('nextSpreadStart and prevSpreadStart', () => {
  it('next and prev spread starts at the ends are null', () => {
    expect(nextSpreadStart(44, 44, false)).toBeNull();
    expect(nextSpreadStart(44, 44, true)).toBeNull();
    expect(nextSpreadStart(44, 45, true)).toBeNull();
    expect(nextSpreadStart(45, 45, true)).toBeNull();
    expect(prevSpreadStart(1, 44, false)).toBeNull();
    expect(prevSpreadStart(1, 44, true)).toBeNull();
    expect(nextSpreadStart(1, 1, true)).toBeNull();
    expect(prevSpreadStart(1, 1, true)).toBeNull();
  });
  it('narrow moves one page at a time', () => {
    expect(nextSpreadStart(1, 44, false)).toBe(2);
    expect(nextSpreadStart(43, 44, false)).toBe(44);
    expect(prevSpreadStart(2, 44, false)).toBe(1);
    expect(prevSpreadStart(44, 44, false)).toBe(43);
  });
  it('wide moves one spread at a time, from any page of the spread', () => {
    expect(nextSpreadStart(1, 44, true)).toBe(2);
    expect(nextSpreadStart(2, 44, true)).toBe(4);
    expect(nextSpreadStart(3, 44, true)).toBe(4);
    expect(nextSpreadStart(42, 44, true)).toBe(44);
    expect(prevSpreadStart(2, 44, true)).toBe(1);
    expect(prevSpreadStart(3, 44, true)).toBe(1);
    expect(prevSpreadStart(5, 44, true)).toBe(2);
    expect(prevSpreadStart(44, 44, true)).toBe(42);
  });
});

describe('chapterForPage', () => {
  const map = { parts: [5], chapters: [7, 12] };
  it('chapterForPage: the last chapter starting at or before the page, 1 before the first', () => {
    expect(chapterForPage(map, 3)).toBe(1);
    expect(chapterForPage(map, 7)).toBe(1);
    expect(chapterForPage(map, 11)).toBe(1);
    expect(chapterForPage(map, 12)).toBe(2);
    expect(chapterForPage(map, 40)).toBe(2);
  });
  it('a map without chapters gives chapter 1', () => {
    expect(chapterForPage({ parts: [], chapters: [] }, 5)).toBe(1);
  });
});

describe('samePlace', () => {
  // The draft has notes, so its chapters start later and run longer.
  const final = { parts: [5, 13], chapters: [7, 11, 15] };
  const draft = { parts: [5, 15], chapters: [7, 12, 17] };
  it("keeps the chapter's first page", () => {
    expect(samePlace(final, draft, 11, 30)).toBe(12);
    expect(samePlace(draft, final, 17, 20)).toBe(15);
  });
  it('keeps the distance from the chapter start, within the chapter', () => {
    expect(samePlace(final, draft, 12, 30)).toBe(13);
    // Chapter 2 of the draft runs from 12 to 16: page 14 of the final edition stays in it.
    expect(samePlace(draft, final, 16, 20)).toBe(14);
    expect(samePlace(final, draft, 14, 30)).toBe(15);
    expect(samePlace(draft, final, 11, 20)).toBe(10);
  });
  it('never goes past the last page', () => {
    expect(samePlace(final, draft, 25, 22)).toBe(22);
  });
  it('pages before the first chapter stay where they are', () => {
    expect(samePlace(final, draft, 3, 30)).toBe(3);
  });
  it('a chapter the other map lacks falls back to the last chapter it has', () => {
    expect(samePlace(final, { parts: [5], chapters: [7, 12] }, 15, 30)).toBe(12);
  });
});
