// Pure pagination arithmetic for the paged reading mode (no DOM), so it can be unit tested.
//
// The chapter is laid out as CSS columns of a fixed height that overflow sideways. A page (one
// screen) shows `columns` of them, `gap` apart, and turning a page moves the strip by a whole page
// plus one gap. Offsets are measured from the left edge of the strip's first column.

/** The geometry of the pages for a reading area, in whole CSS pixels. */
export interface PageLayout {
  /** Columns side by side on one page: two on a wide landscape screen, like an open book. */
  columns: 1 | 2;
  columnWidth: number;
  /** Between two columns, on a page or across a page turn; half of it is the margin at each side. */
  gap: number;
  /** Width of the columns of one page and the gaps between them. */
  pageWidth: number;
  /** The visible frame: one page plus half a gap on each side. A page turn moves by this much. */
  frameWidth: number;
}

/** Number of pages of a strip `scrollWidth` wide (its last column included, not a trailing gap); at least 1. */
export function pageCount(scrollWidth: number, pageWidth: number, gap: number): number {
  // The pixel of tolerance absorbs rounding: a strip that ends exactly on a page boundary never
  // gets a blank page after it.
  return Math.max(1, Math.ceil((scrollWidth - 1) / (pageWidth + gap)));
}

/** The 0-based page that holds an element starting `offsetLeft` from the strip's start, within [0, count − 1]. */
export function pageOfOffset(offsetLeft: number, pageWidth: number, gap: number, count: number): number {
  const page = Math.floor((offsetLeft + 0.5) / (pageWidth + gap));
  return Math.min(Math.max(page, 0), Math.max(count - 1, 0));
}

const ONE_COLUMN_MAX = 34; // em: the measure of the scroll mode
const TWO_COLUMNS_MAX = 30; // em
const TWO_COLUMNS_MIN = 22; // em: below this, two columns are too narrow to read comfortably
const TWO_COLUMNS_GAP = 4; // em: the gutter of an open book; half of it on the outer edges
const SIDE_MARGIN = 1.25; // em, but never under 16 px

function layout(columns: 1 | 2, columnWidth: number, gap: number): PageLayout {
  const pageWidth = columns * columnWidth + (columns - 1) * gap;
  return { columns, columnWidth, gap, pageWidth, frameWidth: pageWidth + gap };
}

/**
 * The pages for a reading area of `areaWidth` × `areaHeight` pixels and a body font of `em`
 * pixels. Two columns when the area is in landscape and wide enough for two comfortable ones,
 * otherwise one column, never wider than the scroll mode's measure.
 */
export function pageLayout(areaWidth: number, areaHeight: number, em: number): PageLayout {
  // Gaps are even, so that the margin on each side of a column is a whole pixel.
  const twoColumnsGap = 2 * Math.round((TWO_COLUMNS_GAP / 2) * em);
  if (areaWidth > areaHeight && areaWidth >= 2 * (TWO_COLUMNS_MIN + TWO_COLUMNS_GAP) * em) {
    const width = Math.min(Math.round(TWO_COLUMNS_MAX * em), Math.floor((areaWidth - 2 * twoColumnsGap) / 2));
    return layout(2, Math.max(1, width), twoColumnsGap);
  }
  const gap = 2 * Math.max(16, Math.round(SIDE_MARGIN * em));
  return layout(1, Math.max(1, Math.min(Math.round(ONE_COLUMN_MAX * em), areaWidth - gap)), gap);
}
