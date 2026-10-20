import type { Block, Chapter, Part } from '@rmp/model';
import { buildBlocks } from './blocks.js';
import { ConversionError } from './errors.js';
import { buildInlines, plainText } from './inlines.js';
import type { Node } from './parser.js';
import { IGNORED_LAYOUT } from './vocabulary.js';

type CommandNode = Extract<Node, { kind: 'command' }>;

/** Nodes allowed before the first `\partie`: whitespace and layout. */
const isBlank = (node: Node): boolean =>
  node.kind === 'space' ||
  node.kind === 'newline' ||
  node.kind === 'parbreak' ||
  (node.kind === 'command' && (IGNORED_LAYOUT.has(node.name) || node.name === 'par'));

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function roman(n: number): string {
  let out = '';
  for (const [value, digits] of ROMAN) {
    for (; n >= value; n -= value) out += digits;
  }
  return out;
}

/** A plain-text field (label, narrator): flattened and trimmed. */
const plainField = (node: CommandNode, i: number): string =>
  plainText(buildInlines(node.args[i] ?? []), node.loc).trim();

function makePart(node: CommandNode, ordinal: number): Part {
  const epigraph = node.args[0] ? buildInlines(node.args[0]) : [];
  return {
    id: `p${ordinal}`,
    ordinal,
    label: plainField(node, 1),
    narrator: plainField(node, 2),
    epigraph: epigraph.length > 0 ? epigraph : null,
    loc: { file: node.loc.file, line: node.loc.line },
    intro: [],
    chapters: [],
  };
}

function makeChapter(node: CommandNode, number: number): Chapter {
  const title = buildInlines(node.args[0] ?? []);
  return {
    id: `c${number}`,
    number,
    numeral: roman(number),
    title: title.length > 0 ? title : null,
    loc: { file: node.loc.file, line: node.loc.line },
    blocks: [],
  };
}

/** Nodes waiting to be built into the blocks of a part intro or a chapter. */
interface Section {
  nodes: Node[];
  idPrefix: string;
  out: Block[];
}

/**
 * Builds the parts of the book from the part files, in book order. Chapters
 * are numbered continuously across parts. A file that does not start with
 * `\partie` continues the current part or chapter in a new paragraph.
 */
export function buildParts(files: { file: string; nodes: Node[] }[]): Part[] {
  const parts: Part[] = [];
  let section: Section | null = null;
  let chapterCount = 0;

  const finish = (): void => {
    if (!section) return;
    section.out.push(...buildBlocks(section.nodes, { idPrefix: section.idPrefix, allowLetterParts: false }));
  };

  for (const { file, nodes } of files) {
    for (const node of nodes) {
      if (node.kind === 'command' && node.name === 'partie') {
        finish();
        const part = makePart(node, parts.length + 1);
        parts.push(part);
        section = { nodes: [], idPrefix: `${part.id}.b`, out: part.intro };
      } else if (node.kind === 'command' && node.name === 'chapitre') {
        const part = parts[parts.length - 1];
        if (!part) throw new ConversionError(node.loc, 'content before \\partie');
        finish();
        const chapter = makeChapter(node, ++chapterCount);
        part.chapters.push(chapter);
        section = { nodes: [], idPrefix: `${chapter.id}.b`, out: chapter.blocks };
      } else if (section) {
        section.nodes.push(node);
      } else if (!isBlank(node)) {
        throw new ConversionError(node.loc, 'content before \\partie');
      }
    }
    // \include starts each file on a new page, which ends the paragraph.
    section?.nodes.push({ kind: 'parbreak', loc: { file, line: 1, column: 1 } });
  }
  finish();
  return parts;
}
