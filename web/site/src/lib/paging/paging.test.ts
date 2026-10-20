import { describe, expect, it } from 'vitest';
import { pageCount, pageLayout, pageOfOffset } from './paging';

describe('pageCount', () => {
  it('pageCount is at least 1', () => {
    expect(pageCount(0, 600, 40)).toBe(1);
    expect(pageCount(-5, 600, 40)).toBe(1);
  });
  it('pageCount on exact multiples', () => {
    expect(pageCount(1280, 600, 40)).toBe(2);
    expect(pageCount(1920, 600, 40)).toBe(3);
  });
  it('counts a strip that ends with its last column, without the trailing gap', () => {
    // Chromium reports n columns as n × width + (n − 1) × gap.
    expect(pageCount(600, 600, 40)).toBe(1);
    expect(pageCount(1240, 600, 40)).toBe(2);
    expect(pageCount(1880, 600, 40)).toBe(3);
  });
  it('a last page that holds only its first column still counts', () => {
    // Two columns of 600 per page: page 2 starts at 1280 and its first column ends at 1880.
    expect(pageCount(1880, 2 * 600 + 40, 40)).toBe(2);
  });
  it('rounding never adds a blank page', () => {
    expect(pageCount(1281, 600, 40)).toBe(2);
  });
});

describe('pageOfOffset', () => {
  it('pageOfOffset clamps', () => {
    expect(pageOfOffset(-30, 600, 40, 3)).toBe(0);
    expect(pageOfOffset(5000, 600, 40, 3)).toBe(2);
    expect(pageOfOffset(640, 600, 40, 1)).toBe(0);
  });
  it('finds the page whose columns hold the offset', () => {
    expect(pageOfOffset(0, 600, 40, 3)).toBe(0);
    expect(pageOfOffset(599, 600, 40, 3)).toBe(0);
    expect(pageOfOffset(640, 600, 40, 3)).toBe(1);
    expect(pageOfOffset(1280, 600, 40, 3)).toBe(2);
  });
  it('tolerates sub-pixel offsets just before a page start', () => {
    expect(pageOfOffset(639.6, 600, 40, 3)).toBe(1);
  });
});

describe('pageLayout', () => {
  const em = 18;

  it('a phone gets one column with side margins', () => {
    const l = pageLayout(390, 750, em);
    expect(l.columns).toBe(1);
    expect(l.frameWidth).toBe(390);
    expect(l.columnWidth).toBe(390 - l.gap);
    expect(l.gap).toBeGreaterThanOrEqual(2 * 16);
  });
  it('one column never grows past a comfortable measure', () => {
    const l = pageLayout(800, 950, em);
    expect(l.columns).toBe(1);
    expect(l.columnWidth).toBe(34 * em);
    expect(l.frameWidth).toBe(l.columnWidth + l.gap);
  });
  it('a wide landscape area gets two columns side by side', () => {
    const l = pageLayout(1000, 700, em);
    expect(l.columns).toBe(2);
    expect(l.columnWidth).toBeGreaterThanOrEqual(22 * em);
    expect(l.frameWidth).toBeLessThanOrEqual(1000);
  });
  it('two columns keep a comfortable measure on very wide screens', () => {
    const l = pageLayout(1900, 1000, em);
    expect(l.columns).toBe(2);
    expect(l.columnWidth).toBe(30 * em);
  });
  it('a portrait area keeps one column, however wide', () => {
    expect(pageLayout(1000, 1300, em).columns).toBe(1);
  });
  it('a larger font needs more room for two columns', () => {
    expect(pageLayout(1000, 700, 25).columns).toBe(1);
  });
  it('a page is its columns and the gaps between them; turning moves by a whole frame', () => {
    for (const l of [pageLayout(390, 750, em), pageLayout(1000, 700, em), pageLayout(1900, 1000, 25)]) {
      expect(l.pageWidth).toBe(l.columns * l.columnWidth + (l.columns - 1) * l.gap);
      expect(l.pageWidth + l.gap).toBe(l.frameWidth);
      for (const v of [l.columnWidth, l.gap, l.pageWidth, l.frameWidth]) expect(Number.isInteger(v)).toBe(true);
      // Half a gap is the margin on each side of a column: a whole pixel keeps the text crisp.
      expect(l.gap % 2).toBe(0);
    }
  });
  it('never returns an empty column', () => {
    expect(pageLayout(10, 10, em).columnWidth).toBeGreaterThanOrEqual(1);
  });
});
