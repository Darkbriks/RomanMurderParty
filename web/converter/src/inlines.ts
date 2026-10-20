import type { Inline } from '@rmp/model';
import { ConversionError, type Loc } from './errors.js';
import type { Node } from './parser.js';
import { frenchSpacing, ligatures, NBSP, NNBSP } from './typography.js';
import { IGNORED_LAYOUT } from './vocabulary.js';

type Command = Extract<Node, { kind: 'command' }>;
type WrapperType = Extract<Inline, { children: Inline[] }>['type'];

const WRAPPERS = new Map<string, Exclude<WrapperType, 'note'>>([
  ['pensee', 'thought'],
  ['enquote', 'quote'],
  ['emph', 'emphasis'],
  ['textit', 'emphasis'],
  ['textsc', 'smallCaps'],
  ['textbf', 'bold'],
]);

const NOTES = new Map<string, 'rework' | 'author'>([
  ['areprendre', 'rework'],
  ['noteauteur', 'author'],
]);

/** Commands and control symbols that stand for a character. */
const SYMBOLS = new Map<string, string>([
  ['ldots', '…'],
  ['textemdash', '—'],
  ['textendash', '–'],
  ['nobreakspace', NBSP],
  [',', NNBSP],
  [' ', ' '],
  ['-', '­'],
  ['%', '%'],
  ['&', '&'],
  ['#', '#'],
  ['_', '_'],
]);

function pushText(out: Inline[], text: string): void {
  if (text === '') return;
  const last = out[out.length - 1];
  if (last?.type === 'text') out[out.length - 1] = { type: 'text', text: last.text + text };
  else out.push({ type: 'text', text });
}

/** A mandatory argument; the parser guarantees it is present. */
const arg = (node: Command, i: number): Node[] => node.args[i] ?? [];

function convertCommand(node: Command, out: Inline[]): void {
  const { name } = node;
  const wrapper = WRAPPERS.get(name);
  if (wrapper) {
    out.push({ type: wrapper, children: convert(arg(node, 0)) });
    return;
  }
  const kind = NOTES.get(name);
  if (kind) {
    out.push({ type: 'note', kind, children: convert(arg(node, 0)) });
    return;
  }
  const symbol = SYMBOLS.get(name);
  if (symbol !== undefined) {
    pushText(out, symbol);
    return;
  }
  if (name === 'debut') {
    const letter = plainText(convert(arg(node, 0)), node.loc);
    out.push({ type: 'dropCap', letter, rest: convert(arg(node, 1)) });
  } else if (name === '\\') {
    out.push({ type: 'lineBreak' }); // its optional vertical space is layout
  } else if (!IGNORED_LAYOUT.has(name)) {
    throw new ConversionError(node.loc, `unexpected \\${name}`);
  }
}

/**
 * Maps nodes to inlines: TeX ligatures on each source text node (a group
 * still breaks a ligature, as in TeX), then adjacent texts are merged.
 */
function convert(nodes: Node[], out: Inline[] = []): Inline[] {
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        pushText(out, ligatures(node.value, node.loc));
        break;
      case 'space':
        pushText(out, ' ');
        break;
      case 'newline':
        if (node.space) pushText(out, ' ');
        break;
      case 'tilde':
        pushText(out, NBSP);
        break;
      case 'group':
        convert(node.children, out);
        break;
      case 'parbreak':
        throw new ConversionError(node.loc, 'paragraph break inside an argument');
      case 'env':
        throw new ConversionError(node.loc, `unexpected \\begin{${node.name}}`);
      case 'command':
        convertCommand(node, out);
        break;
    }
  }
  return out;
}

/** Removes ordinary spaces at both ends; the renderer adds the spaces between segments. */
function trimEdges(inlines: Inline[]): Inline[] {
  const out = [...inlines];
  const first = out[0];
  if (first?.type === 'text') {
    const text = first.text.replace(/^ +/, '');
    if (text) out[0] = { type: 'text', text };
    else out.shift();
  }
  const last = out[out.length - 1];
  if (last?.type === 'text') {
    const text = last.text.replace(/ +$/, '');
    if (text) out[out.length - 1] = { type: 'text', text };
    else out.pop();
  }
  return out;
}

/**
 * Builds one unit of inline content (a segment, a title, an epigraph):
 * ligatures, merged texts, trimmed ends, then French spacing over the whole
 * unit. Block-level commands and paragraph breaks are errors here.
 */
export function buildInlines(nodes: Node[]): Inline[] {
  return frenchSpacing(trimEdges(convert(nodes)));
}

/**
 * Flattens inlines to a string, for labels and names. A line break becomes a
 * space. A quote keeps the marks csquotes prints in French: guillemets with
 * no-break spaces, and English double quotes for a quote inside a quote. A
 * working note has no place in a plain string, so it is an error, reported at
 * `at` (the command that holds the field).
 */
export function plainText(inlines: Inline[], at: Loc | null = null): string {
  return flatten(inlines, at, false);
}

function flatten(inlines: Inline[], at: Loc | null, inQuote: boolean): string {
  let out = '';
  for (const node of inlines) {
    switch (node.type) {
      case 'text':
        out += node.text;
        break;
      case 'lineBreak':
        out += ' ';
        break;
      case 'dropCap':
        out += node.letter + flatten(node.rest, at, inQuote);
        break;
      case 'note':
        throw new ConversionError(at, 'a working note cannot appear in a label or name');
      case 'quote': {
        const inner = flatten(node.children, at, true);
        out += inQuote ? `“${inner}”` : `«${NBSP}${inner}${NBSP}»`;
        break;
      }
      default:
        out += flatten(node.children, at, inQuote);
    }
  }
  return out;
}
