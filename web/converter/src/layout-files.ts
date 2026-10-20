import type { Book } from '@rmp/model';
import { ConversionError, type Loc } from './errors.js';
import { buildInlines, plainText } from './inlines.js';
import type { ArgSpec, Grammar, Node } from './parser.js';
import { LENGTHS } from './vocabulary.js';

/*
 * Front and back files are print layout: title pages, spacing, fonts. Nothing
 * in them is published except the dramatis personae, so they are checked
 * strictly instead of being converted.
 */

/** The only literal words a layout file may contain (printed by the layout). */
export const LAYOUT_LITERALS: readonly string[] = ['roman', 'Les personnages'];

const none: ArgSpec[] = [];
/** Allowed layout commands with their arguments; arguments are dropped. */
const LAYOUT_COMMANDS: Record<string, ArgSpec[]> = {
  thispagestyle: ['m'], null: none, vfill: none, vspace: ['m'], 'vspace*': ['m'],
  cleardoublepage: none, clearpage: none, par: none, bigskip: none, medskip: none, smallskip: none,
  Large: none, large: none, small: none, normalsize: none, fontsize: ['m', 'm'], selectfont: none,
  itshape: none, scshape: none, upshape: none, centering: none, raggedleft: none, '\\': ['o'],
  ornementpartie: none, ornementchapitre: none, ornementscene: none, ornementfin: none,
  // Book-level printers: they print what roman.tex defines, which is read there.
  letitre: none, lauteur: none, imprimerdedicace: none, imprimerepigraphe: none,
};

export const LAYOUT_GRAMMAR: Grammar = {
  commands: {
    ...LAYOUT_COMMANDS,
    ...Object.fromEntries([...LENGTHS].map((name): [string, ArgSpec[]] => [name, none])),
    groupe: ['m'],
    personnage: ['m', 'm', 'm'],
  },
  environments: { center: none, flushright: none, minipage: ['m'], personnages: ['o'] },
};

const HEADING = 'Les personnages';

type EnvNode = Extract<Node, { kind: 'env' }>;

const isBlank = (n: Node): boolean =>
  n.kind === 'space' || n.kind === 'newline' || n.kind === 'parbreak';

/** Walks a layout file, rejecting anything that could be published by mistake. */
function check(
  nodes: Node[],
  onPersonnages: ((env: EnvNode) => void) | null,
  seen: Set<string> = new Set(),
  allowed: readonly string[] = [],
): void {
  // Words are separate text nodes; a run of text and spaces is one literal.
  let run = '';
  let runLoc: Loc | null = null;
  const flush = (): void => {
    const literal = run.trim().replace(/\s+/g, ' ');
    if (literal !== '') {
      if (!LAYOUT_LITERALS.includes(literal) && !allowed.includes(literal)) {
        throw new ConversionError(runLoc, `text in a layout file is not published on the site: "${literal}"`);
      }
      seen.add(literal);
    }
    run = '';
    runLoc = null;
  };
  for (const node of nodes) {
    if (node.kind === 'text') {
      runLoc ??= node.loc;
      run += node.value;
      continue;
    }
    if (node.kind === 'space' || node.kind === 'tilde' || (node.kind === 'newline' && node.space)) {
      run += ' ';
      continue;
    }
    if (node.kind === 'newline') continue;
    flush();
    switch (node.kind) {
      case 'parbreak':
        break;
      case 'group':
        check(node.children, onPersonnages, seen, allowed);
        break;
      case 'command':
        if (!(node.name in LAYOUT_COMMANDS) && !LENGTHS.has(node.name)) {
          throw new ConversionError(node.loc, `unexpected \\${node.name} in a layout file`);
        }
        break;
      case 'env':
        if (node.name === 'personnages') {
          if (!onPersonnages) throw new ConversionError(node.loc, 'unexpected \\begin{personnages} in a front file');
          onPersonnages(node);
        } else {
          check(node.body, onPersonnages, seen, allowed);
        }
        break;
    }
  }
  flush();
}

/**
 * Throws unless the front file only lays out the pages the site rebuilds itself. `bookTexts` are the
 * book's title, running title and author: older layouts typeset them as literals, and the site
 * already shows them from roman.tex.
 */
export function checkFrontFile(_file: string, nodes: Node[], bookTexts: readonly string[] = []): void {
  check(nodes, null, new Set(), bookTexts.map((t) => t.trim().replace(/\s+/g, ' ')).filter((t) => t !== ''));
}

/** Reads the dramatis personae from a back file, or null if it has none. */
export function readBackFile(_file: string, nodes: Node[]): Book['characters'] | null {
  let found: Book['characters'] | null = null;
  const seen = new Set<string>();
  check(nodes, (env) => {
    if (found) throw new ConversionError(env.loc, 'more than one personnages environment');
    found = readCharacters(env);
  }, seen);
  if (found === null) return null;
  const characters: Book['characters'] = found;
  // The heading is printed by the layout of the back file.
  return { ...characters, title: characters.title ?? (seen.has(HEADING) ? HEADING : null) };
}

function readCharacters(env: EnvNode): Book['characters'] {
  const groups: Book['characters']['groups'] = [];
  const label = (n: Extract<Node, { kind: 'command' }>, i: number): string =>
    plainText(buildInlines(n.args[i] ?? []), n.loc).trim();
  for (const node of env.body) {
    if (isBlank(node)) continue;
    if (node.kind !== 'command') {
      throw new ConversionError(node.loc, 'unexpected content in personnages');
    }
    if (node.name === 'groupe') {
      groups.push({ id: `g${groups.length + 1}`, name: label(node, 0), people: [] });
    } else if (node.name === 'personnage') {
      let group = groups[groups.length - 1];
      if (!group) {
        group = { id: 'g1', name: null, people: [] };
        groups.push(group);
      }
      group.people.push({
        id: `${group.id}.${group.people.length + 1}`,
        name: label(node, 0),
        details: label(node, 1),
        description: buildInlines(node.args[2] ?? []),
      });
    } else {
      throw new ConversionError(node.loc, `unexpected \\${node.name} in personnages`);
    }
  }
  // The optional argument is the heading the PDF prints above the list.
  const given = env.args[0] ? plainText(buildInlines(env.args[0]), env.loc).trim() : '';
  return { title: given === '' ? null : given, groups };
}
