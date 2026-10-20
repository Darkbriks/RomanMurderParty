import type { ArgSpec, Grammar } from './parser.js';

/*
 * The part-file vocabulary: every command and environment a part file may use,
 * with its argument specification. The parser rejects anything else, and the
 * builders (inlines.ts, blocks.ts, parts.ts) map each entry.
 */

/** Page and spacing commands of the PDF layout, with their arguments. */
const layout: Record<string, ArgSpec[]> = {
  clearpage: [], cleardoublepage: [], newpage: [], thispagestyle: ['m'], bigskip: [], medskip: [],
  smallskip: [], vspace: ['m'], 'vspace*': ['m'], noindent: [],
};

/** Layout commands dropped together with their arguments. */
export const IGNORED_LAYOUT: ReadonlySet<string> = new Set(Object.keys(layout));

/**
 * Lengths. They are legitimate only inside arguments that are dropped (layout
 * commands) or read as a width (image options); anywhere else they are an error.
 */
export const LENGTHS: ReadonlySet<string> = new Set([
  'linewidth', 'textwidth', 'textheight', 'baselineskip', 'onelineskip',
]);

const structure: Record<string, ArgSpec[]> = {
  partie: ['o', 'm', 'm'],
  chapitre: ['m'],
};

const blocks: Record<string, ArgSpec[]> = {
  par: [], rep: [], separation: [], fin: [],
  signature: ['m'], postscriptum: ['m'],
  plan: ['o', 'm', 'm'], planpleinepage: ['o', 'm', 'm'],
  pageannexe: ['m', 'm'],
};

/** Inserted documents. The body of each is the environment body. */
const documents: Record<string, ArgSpec[]> = {
  lettre: ['o', 'm'],
  telegramme: ['m', 'm', 'm'],
  coupure: ['m', 'm', 'o'],
  journal: ['m'],
  carton: [],
};

const inlines: Record<string, ArgSpec[]> = {
  pensee: ['m'], areprendre: ['m'], noteauteur: ['m'], enquote: ['m'],
  emph: ['m'], textit: ['m'], textsc: ['m'], textbf: ['m'],
  debut: ['m', 'm'],
  ldots: [], textemdash: [], textendash: [], nobreakspace: [],
  // Control symbols. `\\` reads LaTeX's optional vertical space, which is dropped.
  ',': [], ' ': [], '-': [], '%': [], '&': [], '#': [], '_': [], '\\': ['o'],
};

export const PART_GRAMMAR: Grammar = {
  commands: {
    ...structure,
    ...blocks,
    ...inlines,
    ...layout,
    ...Object.fromEntries([...LENGTHS].map((name): [string, ArgSpec[]] => [name, []])),
  },
  environments: documents,
};
