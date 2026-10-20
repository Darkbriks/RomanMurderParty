import type { Loc } from './errors.js';

export type Token =
  | { kind: 'command'; name: string; loc: Loc }
  | { kind: 'text'; value: string; loc: Loc }
  | { kind: 'space'; loc: Loc }
  | { kind: 'newline'; space: boolean; loc: Loc }
  | { kind: 'parbreak'; loc: Loc }
  | { kind: 'open' | 'close' | 'tilde'; loc: Loc };

const isLetter = (c: string) => /[A-Za-z@]/.test(c);
const isBlank = (c: string) => c === ' ' || c === '\t';
// Characters that end a text run. '[' and ']' are single-character text tokens
// so that the parser can find optional arguments without splitting text.
const isSpecial = (c: string) => '\\%{}~[]'.includes(c) || isBlank(c);

/**
 * Tokenizes the restricted LaTeX dialect following TeX's input rules.
 *
 * Line handling: every non-blank line that does not end in a comment emits a
 * `newline` token at its end (`space` is false right after a control word, as
 * TeX swallows that end of line). A run of blank lines (only spaces/tabs)
 * emits exactly one `parbreak`. A comment-only line is neither blank nor
 * non-blank: it produces nothing and never splits a paragraph.
 */
export function tokenize(file: string, text: string): Token[] {
  const tokens: Token[] = [];
  const lines = text.split('\n');
  let inBlankRun = false;

  lines.forEach((raw, lineIndex) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const lineNo = lineIndex + 1;
    const loc = (i: number): Loc => ({ file, line: lineNo, column: i + 1 });

    let i = 0;
    while (i < line.length && isBlank(line[i]!)) i++;

    if (i === line.length) {
      // Blank line (an empty last line after a final '\n' is not a blank line).
      if (lineIndex < lines.length - 1 || line.length > 0) {
        if (!inBlankRun) tokens.push({ kind: 'parbreak', loc: loc(0) });
        inBlankRun = true;
      }
      return;
    }

    let pendingSpace: number | null = null; // column index of a collapsed space run
    let afterWord = false; // spaces are skipped right after a control word
    let commented = false;
    let produced = false;

    const flushSpace = () => {
      if (pendingSpace !== null) {
        tokens.push({ kind: 'space', loc: loc(pendingSpace) });
        pendingSpace = null;
      }
    };
    const emit = (t: Token) => {
      flushSpace();
      tokens.push(t);
      produced = true;
    };

    while (i < line.length) {
      const c = line[i]!;
      if (c === '%') {
        commented = true;
        flushSpace();
        break;
      }
      if (isBlank(c)) {
        if (!afterWord && pendingSpace === null) pendingSpace = i;
        i++;
        continue;
      }
      if (c === '\\') {
        const start = i;
        i++;
        if (i >= line.length) {
          // A backslash at the end of a line is a control space in TeX.
          emit({ kind: 'command', name: ' ', loc: loc(start) });
          afterWord = false;
          continue;
        }
        if (isLetter(line[i]!)) {
          let j = i;
          while (j < line.length && isLetter(line[j]!)) j++;
          if (line[j] === '*') j++;
          emit({ kind: 'command', name: line.slice(i, j), loc: loc(start) });
          i = j;
          afterWord = true;
        } else {
          emit({ kind: 'command', name: line[i]!, loc: loc(start) });
          i++;
          afterWord = false;
        }
        continue;
      }
      afterWord = false;
      if (c === '{') emit({ kind: 'open', loc: loc(i++) });
      else if (c === '}') emit({ kind: 'close', loc: loc(i++) });
      else if (c === '~') emit({ kind: 'tilde', loc: loc(i++) });
      else if (c === '[' || c === ']') emit({ kind: 'text', value: c, loc: loc(i++) });
      else {
        let j = i;
        while (j < line.length && !isSpecial(line[j]!)) j++;
        emit({ kind: 'text', value: line.slice(i, j), loc: loc(i) });
        i = j;
      }
    }

    if (produced) inBlankRun = false;
    // The last line gets no newline token when the text has no final '\n'.
    if (!commented && lineIndex < lines.length - 1) {
      // Trailing spaces are dropped (TeX strips them before the end of line).
      tokens.push({ kind: 'newline', space: !afterWord, loc: loc(line.length) });
    }
  });

  return tokens;
}
