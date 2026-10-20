import { ConversionError } from './errors.js';
import { tokenize } from './lexer.js';
import { parse, type ArgSpec, type Grammar, type Node } from './parser.js';

export interface RootInfo {
  title: Node[] | null;
  author: Node[] | null;
  runningTitle: Node[] | null;
  epigraph: { text: Node[]; source: Node[] | null } | null;
  dedication: Node[] | null;
  /** `.tex` paths in book order, by section. */
  front: string[];
  parts: string[];
  back: string[];
}

const ROOT_GRAMMAR: Grammar = {
  commands: {
    documentclass: ['o', 'm'], usepackage: ['o', 'm'], newif: [],
    titrecourant: ['m'], titre: ['m'], auteur: ['m'], epigraphe: ['o', 'm'], dedicace: ['m'],
    includeonly: ['m'], frontmatter: [], mainmatter: [], backmatter: [],
    input: ['m'], include: ['m'], cleardoublepage: [], clearpage: [], 'tableofcontents*': [],
    // The demonstration switch of roman.tex.
    ifdemonstration: [], fi: [], demonstrationfalse: [], demonstrationtrue: [],
  } satisfies Record<string, ArgSpec[]>,
  environments: { document: [] },
};

const INERT = new Set([
  'documentclass', 'usepackage', 'includeonly', 'cleardoublepage', 'clearpage', 'tableofcontents*',
  'demonstrationfalse',
]);

const isBlank = (n: Node): boolean =>
  n.kind === 'space' || n.kind === 'newline' || n.kind === 'parbreak';

/** The text of a path argument: a single plain text, no markup. */
function pathOf(node: Extract<Node, { kind: 'command' }>): string {
  let out = '';
  for (const n of node.args[0] ?? []) {
    if (n.kind !== 'text') throw new ConversionError(n.loc, `invalid path in \\${node.name}`);
    out += n.value;
  }
  out = out.trim();
  if (out === '') throw new ConversionError(node.loc, `empty path in \\${node.name}`);
  return out.endsWith('.tex') ? out : `${out}.tex`;
}

/** Reads the root file: metadata and the ordered lists of files, by section. */
export function readRoot(text: string, file = 'roman.tex'): RootInfo {
  const info: RootInfo = {
    title: null, author: null, runningTitle: null, epigraph: null, dedication: null,
    front: [], parts: [], back: [],
  };
  let section: 'front' | 'parts' | 'back' | null = null;

  const walk = (nodes: Node[]): void => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      if (isBlank(node)) continue;
      if (node.kind === 'env') {
        walk(node.body);
        continue;
      }
      if (node.kind !== 'command') {
        throw new ConversionError(node.loc, 'unexpected content in the root file');
      }
      const { name } = node;
      if (INERT.has(name)) continue;
      switch (name) {
        case 'newif': {
          // Consumes the next control sequence, which declares the switch.
          let next = nodes[i + 1];
          while (next && isBlank(next)) next = nodes[++i + 1];
          if (next?.kind !== 'command') throw new ConversionError(node.loc, 'missing switch after \\newif');
          i++;
          break;
        }
        case 'ifdemonstration': {
          // The switch is false: skip to the matching \fi.
          let j = i + 1;
          while (j < nodes.length && !(nodes[j]!.kind === 'command' && (nodes[j] as { name: string }).name === 'fi')) j++;
          if (j >= nodes.length) throw new ConversionError(node.loc, 'missing \\fi');
          i = j;
          break;
        }
        case 'demonstrationtrue':
          throw new ConversionError(node.loc, 'demonstration mode is not supported by the web converter');
        case 'fi':
          throw new ConversionError(node.loc, '\\fi without matching \\ifdemonstration');
        case 'titre': info.title = node.args[0]!; break;
        case 'auteur': info.author = node.args[0]!; break;
        case 'titrecourant': info.runningTitle = node.args[0]!; break;
        case 'dedicace': info.dedication = node.args[0]!; break;
        case 'epigraphe': info.epigraph = { text: node.args[1]!, source: node.args[0] ?? null }; break;
        case 'frontmatter': section = 'front'; break;
        case 'mainmatter': section = 'parts'; break;
        case 'backmatter': section = 'back'; break;
        case 'input':
        case 'include':
          if (!section) throw new ConversionError(node.loc, `\\${name} before \\frontmatter, \\mainmatter or \\backmatter`);
          info[section].push(pathOf(node));
          break;
        default:
          throw new ConversionError(node.loc, `unexpected \\${name}`);
      }
    }
  };

  walk(parse(tokenize(file, text), ROOT_GRAMMAR));
  return info;
}
