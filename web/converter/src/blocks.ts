import path from 'node:path';
import type { Block, Inline, Segment } from '@rmp/model';
import { ConversionError, type Loc } from './errors.js';
import { buildInlines, plainText } from './inlines.js';
import type { Node } from './parser.js';
import { IGNORED_LAYOUT } from './vocabulary.js';

export interface BlockContext {
  /** Block ids are `<idPrefix><n>`, numbered from 1 in document order. */
  idPrefix: string;
  /** `\signature` and `\postscriptum` are allowed (inside `lettre` only). */
  allowLetterParts: boolean;
}

type CommandNode = Extract<Node, { kind: 'command' }>;
type EnvNode = Extract<Node, { kind: 'env' }>;

/** What a block-level handler can do while blocks are being built. */
interface BlockBuilder {
  readonly ctx: BlockContext;
  /** Ends the current paragraph; an empty paragraph is not emitted. */
  endParagraph(): void;
  /** Ends the current paragraph and opens a new one. */
  startParagraph(dialogue: boolean): void;
  /** Ends the current paragraph, then emits a block made with the next id. */
  emit(make: (id: string) => Block): void;
}

/** Block-level commands. Any other command is inline content. */
const COMMANDS = new Map<string, (node: CommandNode, b: BlockBuilder) => void>([
  ['par', (_, b) => b.endParagraph()],
  ['rep', (_, b) => b.startParagraph(true)],
  ['separation', (_, b) => b.emit((id) => ({ type: 'sceneBreak', id }))],
  ['fin', (_, b) => b.emit((id) => ({ type: 'end', id }))],
  ['signature', (n, b) => {
    requireLetter(n, b);
    b.emit((id) => ({ type: 'signature', id, content: inlinesOf(n, 0) }));
  }],
  ['postscriptum', (n, b) => {
    requireLetter(n, b);
    b.emit((id) => ({ type: 'postscript', id, content: inlinesOf(n, 0) }));
  }],
  ['plan', (n, b) => b.emit((id) => makeImage(n, id, false, parseWidth(n.args[0] ?? null)))],
  ['planpleinepage', (n, b) => b.emit((id) => makeImage(n, id, true, null))],
  ['pageannexe', (n, b) =>
    b.emit((id) => ({ type: 'annexPage', id, title: inlinesOf(n, 0), body: nested(n.args[1] ?? [], id, false) }))],
]);

// \chapitre and \partie are not handled here: inside a document they fall through
// to buildInlines, which rejects them (parts.ts consumes them at the top level).
function requireLetter(node: CommandNode, b: BlockBuilder): void {
  if (!b.ctx.allowLetterParts) throw new ConversionError(node.loc, `\\${node.name} outside lettre`);
}

const inlinesOf = (node: CommandNode | EnvNode, i: number): Inline[] => buildInlines(node.args[i] ?? []);

/** Blocks of a document body or annex page, ids prefixed by the parent's. */
const nested = (nodes: Node[], parentId: string, allowLetterParts: boolean): Block[] =>
  buildBlocks(nodes, { idPrefix: `${parentId}.`, allowLetterParts });

/** `0.6\linewidth` or `0.6\textwidth` gives 0.6; anything else gives null. */
function parseWidth(arg: Node[] | null): number | null {
  if (!arg) return null;
  const nodes = arg.filter((n) => n.kind !== 'space');
  const [num, unit, ...rest] = nodes;
  if (num?.kind !== 'text' || unit?.kind !== 'command' || rest.length > 0) return null;
  if (unit.name !== 'linewidth' && unit.name !== 'textwidth') return null;
  if (!/^(\d+\.?\d*|\.\d+)$/.test(num.value)) return null;
  const value = Number(num.value);
  return value > 0 ? value : null;
}

const IMAGE_EXTENSION = /\.(png|jpe?g|svg)$/i;

function makeImage(node: CommandNode, id: string, fullPage: boolean, widthFraction: number | null): Block {
  const src = plainText(inlinesOf(node, 1), node.loc).trim();
  if (!IMAGE_EXTENSION.test(src)) {
    throw new ConversionError(node.loc, `image ${src}: use a .png, .jpg or .svg file (the site cannot show other formats)`);
  }
  if (src.startsWith('/') || /^[A-Za-z]:/.test(src) || path.posix.normalize(src.replaceAll('\\', '/')).split('/')[0] === '..') {
    throw new ConversionError(node.loc, `image ${src}: use a path inside the repository`);
  }
  return { type: 'image', id, src, caption: inlinesOf(node, 2), fullPage, widthFraction };
}

/** Block-level environments. */
const ENVIRONMENTS = new Map<string, (node: EnvNode, b: BlockBuilder) => void>([
  ['lettre', (n, b) => b.emit((id) => ({
    type: 'letter', id,
    place: n.args[0] ? inlinesOf(n, 0) : null,
    salutation: inlinesOf(n, 1),
    body: nested(n.body, id, true),
  }))],
  ['telegramme', (n, b) => b.emit((id) => ({
    type: 'telegram', id,
    office: inlinesOf(n, 0), time: inlinesOf(n, 1), recipient: inlinesOf(n, 2),
    body: nested(n.body, id, false),
  }))],
  ['coupure', (n, b) => b.emit((id) => ({
    type: 'clipping', id,
    newspaper: inlinesOf(n, 0), headline: inlinesOf(n, 1),
    date: n.args[2] ? inlinesOf(n, 2) : null,
    body: nested(n.body, id, false),
  }))],
  ['journal', (n, b) => b.emit((id) => ({
    type: 'diary', id, heading: inlinesOf(n, 0), body: nested(n.body, id, false),
  }))],
  ['carton', (n, b) => b.emit((id) => ({ type: 'card', id, body: nested(n.body, id, false) }))],
]);

/**
 * Builds blocks from a sequence of nodes. Paragraphs end at a blank line,
 * `\par`, `\rep` or another block; within a paragraph, each top-level newline
 * ends a segment, so a segment is one source line.
 */
export function buildBlocks(nodes: Node[], ctx: BlockContext): Block[] {
  const blocks: Block[] = [];
  const nextId = (): string => `${ctx.idPrefix}${blocks.length + 1}`;

  let dialogue = false;
  let segments: Segment[] = [];
  let pending: Node[] = []; // nodes of the current segment
  let pendingLoc: Loc | null = null; // its first non-space node

  const endSegment = (spaceAfter: boolean): void => {
    if (pending.length === 0) return;
    const content = buildInlines(pending);
    const loc = pendingLoc ?? pending[0]!.loc;
    if (content.length > 0) segments.push({ loc: { file: loc.file, line: loc.line }, content, spaceAfter });
    pending = [];
    pendingLoc = null;
  };

  const endParagraph = (): void => {
    endSegment(false);
    const last = segments[segments.length - 1];
    if (last) {
      segments[segments.length - 1] = { ...last, spaceAfter: false };
      blocks.push({ type: 'paragraph', id: nextId(), dialogue, segments });
    }
    segments = [];
    dialogue = false;
  };

  const builder: BlockBuilder = {
    ctx,
    endParagraph,
    startParagraph(d) {
      endParagraph();
      dialogue = d;
    },
    emit(make) {
      endParagraph();
      blocks.push(make(nextId()));
    },
  };

  const visit = (list: Node[]): void => {
    for (const node of list) {
      switch (node.kind) {
        case 'group':
          visit(node.children); // a bare group has no meaning in prose
          break;
        case 'parbreak':
          endParagraph();
          break;
        case 'newline':
          endSegment(node.space);
          break;
        case 'env': {
          const handler = ENVIRONMENTS.get(node.name);
          if (!handler) throw new ConversionError(node.loc, `unexpected \\begin{${node.name}}`);
          handler(node, builder);
          break;
        }
        case 'command': {
          if (IGNORED_LAYOUT.has(node.name)) break;
          const handler = COMMANDS.get(node.name);
          if (handler) {
            handler(node, builder);
            break;
          }
          // Inline content; buildInlines rejects what is not.
          pendingLoc ??= node.loc;
          pending.push(node);
          break;
        }
        default:
          if (node.kind !== 'space') pendingLoc ??= node.loc;
          pending.push(node);
      }
    }
  };

  visit(nodes);
  endParagraph();
  return blocks;
}
