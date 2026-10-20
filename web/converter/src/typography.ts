import type { Inline } from '@rmp/model';

/** Narrow no-break space: babel-french puts it before `;`, `!` and `?`. */
export const NNBSP = ' ';
/** No-break space: before `:` and inside guillemets. */
export const NBSP = ' ';

/** Reproduces the TeX ligatures of fontspec `Ligatures=TeX`; longer patterns first. */
export function ligatures(text: string): string {
  return text
    .replaceAll('---', '—')
    .replaceAll('--', '–')
    .replaceAll('``', '“')
    .replaceAll("''", '”')
    .replaceAll('`', '‘')
    .replaceAll("'", '’');
}

const BREAK = '\u0001';
const isSpace = (c: string): boolean => c === ' ' || c === '\t' || c === NBSP || c === NNBSP;
const isHigh = (c: string): boolean => c === ';' || c === '!' || c === '?' || c === ':';

interface Cell {
  ch: string;
  leaf: number;
}

/** Text carriers in reading order: text nodes and drop cap letters. */
function collect(nodes: Inline[], cells: Cell[], counter: { n: number }): void {
  for (const node of nodes) {
    if (node.type === 'text') {
      const leaf = counter.n++;
      for (const ch of node.text) cells.push({ ch, leaf });
    } else if (node.type === 'lineBreak') {
      cells.push({ ch: BREAK, leaf: -1 });
    } else if (node.type === 'dropCap') {
      const leaf = counter.n++;
      for (const ch of node.letter) cells.push({ ch, leaf });
      collect(node.rest, cells, counter);
    } else {
      collect(node.children, cells, counter);
    }
  }
}

const hasContent = (out: Cell[]): boolean => out.length > 0 && out[out.length - 1]!.ch !== BREAK;

function transform(cells: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const c = cell.ch;
    if (isHigh(c)) {
      const prev = out[out.length - 1];
      if (prev && isHigh(prev.ch)) {
        out.push(cell);
        continue;
      }
      const stripped: Cell[] = [];
      while (out.length > 0 && isSpace(out[out.length - 1]!.ch)) stripped.push(out.pop()!);
      if (hasContent(out)) {
        out.push({ ch: c === ':' ? NBSP : NNBSP, leaf: cell.leaf });
      } else {
        out.push(...stripped.reverse());
      }
      out.push(cell);
    } else if (c === '«') {
      out.push(cell);
      while (i + 1 < cells.length && isSpace(cells[i + 1]!.ch)) i++;
      const next = cells[i + 1];
      if (next && next.ch !== BREAK) out.push({ ch: NBSP, leaf: cell.leaf });
    } else if (c === '»') {
      const stripped: Cell[] = [];
      while (out.length > 0 && isSpace(out[out.length - 1]!.ch)) stripped.push(out.pop()!);
      if (hasContent(out)) {
        out.push({ ch: NBSP, leaf: cell.leaf });
      } else {
        out.push(...stripped.reverse());
      }
      out.push(cell);
    } else {
      out.push(cell);
    }
  }
  return out;
}

function rebuild(nodes: Inline[], texts: string[], counter: { n: number }): Inline[] {
  const result: Inline[] = [];
  const pushText = (text: string): void => {
    if (text === '') return;
    const last = result[result.length - 1];
    if (last && last.type === 'text') result[result.length - 1] = { type: 'text', text: last.text + text };
    else result.push({ type: 'text', text });
  };
  for (const node of nodes) {
    if (node.type === 'text') {
      pushText(texts[counter.n++]!);
    } else if (node.type === 'lineBreak') {
      result.push({ type: 'lineBreak' });
    } else if (node.type === 'dropCap') {
      const letter = texts[counter.n++]!;
      result.push({ type: 'dropCap', letter, rest: rebuild(node.rest, texts, counter) });
    } else {
      result.push({ ...node, children: rebuild(node.children, texts, counter) });
    }
  }
  return result;
}

/** babel-french spacing for one segment, applied across node boundaries. Returns new nodes. */
export function frenchSpacing(inlines: Inline[]): Inline[] {
  const cells: Cell[] = [];
  const counter = { n: 0 };
  collect(inlines, cells, counter);
  const texts = Array.from({ length: counter.n }, () => '');
  for (const { ch, leaf } of transform(cells)) if (leaf >= 0) texts[leaf] += ch;
  return rebuild(inlines, texts, { n: 0 });
}
