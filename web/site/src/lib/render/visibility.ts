import type { Block, Book, Chapter, Inline, Part } from '@rmp/model';

/** True when the inlines print something once working notes are hidden. */
function hasVisibleContent(nodes: Inline[]): boolean {
  return nodes.some((node) => {
    switch (node.type) {
      case 'text':
        return node.text.trim() !== '';
      case 'lineBreak':
      case 'note':
        return false;
      case 'dropCap':
        return true;
      default:
        return hasVisibleContent(node.children);
    }
  });
}

/**
 * Whether a block is rendered. A paragraph that holds nothing but working notes disappears when
 * notes are hidden, as in the final PDF, so a placeholder chapter shows no empty paragraph.
 */
export function isBlockVisible(block: Block, notes: boolean): boolean {
  if (notes || block.type !== 'paragraph') return true;
  return block.segments.some((s) => hasVisibleContent(s.content));
}

/** The chapter with continuous number `n`, its part, and whether it opens that part. */
export function chapterByNumber(book: Book, n: number): { part: Part; chapter: Chapter; isFirstOfPart: boolean } | null {
  for (const part of book.parts) {
    const index = part.chapters.findIndex((c) => c.number === n);
    if (index >= 0) return { part, chapter: part.chapters[index]!, isFirstOfPart: index === 0 };
  }
  return null;
}

/**
 * Parts without any chapter have no page of their own, so a chapter page shows them: `before` are
 * the chapterless parts right before the part that chapter `n` opens, `after` are the chapterless
 * parts at the end of the book, shown only after the book's last chapter.
 */
export function chapterlessParts(book: Book, n: number): { before: Part[]; after: Part[] } {
  const before: Part[] = [];
  let pending: Part[] = [];
  let lastChapter: number | null = null;
  for (const part of book.parts) {
    if (part.chapters.length === 0) {
      pending.push(part);
      continue;
    }
    if (part.chapters[0]!.number === n) before.push(...pending);
    pending = [];
    lastChapter = part.chapters[part.chapters.length - 1]!.number;
  }
  return { before, after: lastChapter === n ? pending : [] };
}
