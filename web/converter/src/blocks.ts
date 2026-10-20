import type { Block, Segment } from '@rmp/model';
import { ConversionError, type Loc } from './errors.js';
import { buildInlines } from './inlines.js';
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
]);

/** Block-level environments. */
const ENVIRONMENTS = new Map<string, (node: EnvNode, b: BlockBuilder) => void>();

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
