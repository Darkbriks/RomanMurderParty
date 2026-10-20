import type { Inline } from '@rmp/model';

const NBSP = ' ';

/**
 * Flattens inlines to a plain string (image alt text, link labels). Quotes keep their French marks,
 * as the renderer prints them; working notes are left out.
 */
export function plainText(nodes: Inline[], inQuote = false): string {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.text;
        break;
      case 'lineBreak':
        out += ' ';
        break;
      case 'note':
        break;
      case 'dropCap':
        out += node.letter + plainText(node.rest, inQuote);
        break;
      case 'quote': {
        const inner = plainText(node.children, true);
        out += inQuote ? `“${inner}”` : `«${NBSP}${inner}${NBSP}»`;
        break;
      }
      default:
        out += plainText(node.children, inQuote);
    }
  }
  return out;
}
