import { ConversionError, type Loc } from './errors.js';
import type { Token } from './lexer.js';

export type ArgSpec = 'm' | 'o';
export interface Grammar {
  commands: Record<string, ArgSpec[]>;
  environments: Record<string, ArgSpec[]>;
}

export type Node =
  | { kind: 'text'; value: string; loc: Loc }
  | { kind: 'space'; loc: Loc }
  | { kind: 'newline'; space: boolean; loc: Loc }
  | { kind: 'parbreak'; loc: Loc }
  | { kind: 'tilde'; loc: Loc }
  | { kind: 'group'; children: Node[]; loc: Loc }
  | { kind: 'command'; name: string; args: (Node[] | null)[]; loc: Loc }
  | { kind: 'env'; name: string; args: (Node[] | null)[]; body: Node[]; loc: Loc };

type Mode = 'top' | 'group' | 'optional' | 'env';

export function parse(tokens: Token[], grammar: Grammar): Node[] {
  let pos = 0;
  const lastLoc = (): Loc | null => tokens[tokens.length - 1]?.loc ?? null;
  const isSkippable = (t: Token | undefined) => t?.kind === 'space' || t?.kind === 'newline';
  const skipSpaces = () => {
    while (isSkippable(tokens[pos])) pos++;
  };

  /** Reads `{name}` and returns the plain text inside the braces. */
  function readName(what: string, at: Loc): string {
    skipSpaces();
    const t = tokens[pos];
    if (t?.kind !== 'open') throw new ConversionError(t?.loc ?? at, `missing argument for ${what}`);
    pos++;
    let name = '';
    for (;;) {
      const u = tokens[pos];
      if (!u) throw new ConversionError(t.loc, 'unbalanced braces');
      pos++;
      if (u.kind === 'close') return name;
      if (u.kind === 'text') name += u.value;
      else throw new ConversionError(u.loc, `invalid name in ${what}`);
    }
  }

  function parseArgs(specs: ArgSpec[], what: string, at: Loc): (Node[] | null)[] {
    const args: (Node[] | null)[] = [];
    for (const spec of specs) {
      if (spec === 'o') {
        const save = pos;
        skipSpaces();
        const t = tokens[pos];
        if (t?.kind === 'text' && t.value === '[') {
          pos++;
          const nodes = parseSeq('optional', t.loc);
          args.push(nodes);
        } else {
          pos = save;
          args.push(null);
        }
      } else {
        skipSpaces();
        const t = tokens[pos];
        if (t?.kind !== 'open') {
          throw new ConversionError(t?.loc ?? lastLoc() ?? at, `missing argument for ${what}`);
        }
        pos++;
        args.push(parseSeq('group', t.loc));
      }
    }
    return args;
  }

  function parseSeq(mode: Mode, openLoc: Loc): Node[] {
    const out: Node[] = [];
    for (;;) {
      const t = tokens[pos];
      if (!t) {
        if (mode === 'group') throw new ConversionError(openLoc, 'unbalanced braces');
        if (mode === 'optional') throw new ConversionError(openLoc, 'unbalanced brackets');
        return out; // 'top' ends normally; 'env' is checked by the caller
      }
      switch (t.kind) {
        case 'close':
          if (mode === 'group') {
            pos++;
            return out;
          }
          throw new ConversionError(t.loc, 'unbalanced braces');
        case 'open': {
          pos++;
          out.push({ kind: 'group', children: parseSeq('group', t.loc), loc: t.loc });
          break;
        }
        case 'text':
          if (mode === 'optional' && t.value === ']') {
            pos++;
            return out;
          }
          out.push({ kind: 'text', value: t.value, loc: t.loc });
          pos++;
          break;
        case 'space':
        case 'parbreak':
        case 'tilde':
          out.push({ kind: t.kind, loc: t.loc });
          pos++;
          break;
        case 'newline':
          out.push({ kind: 'newline', space: t.space, loc: t.loc });
          pos++;
          break;
        case 'command': {
          if (t.name === 'begin') {
            pos++;
            out.push(parseEnv(t.loc));
          } else if (t.name === 'end') {
            if (mode === 'env') return out; // handled by parseEnv
            pos++;
            const name = readName('\\end', t.loc);
            throw new ConversionError(t.loc, `\\end{${name}} without matching \\begin`);
          } else {
            const specs = grammar.commands[t.name];
            if (!specs) throw new ConversionError(t.loc, `unknown command \\${t.name}`);
            pos++;
            out.push({
              kind: 'command',
              name: t.name,
              args: parseArgs(specs, `\\${t.name}`, t.loc),
              loc: t.loc,
            });
          }
          break;
        }
      }
    }
  }

  function parseEnv(beginLoc: Loc): Node {
    const name = readName('\\begin', beginLoc);
    const specs = grammar.environments[name];
    if (!specs) throw new ConversionError(beginLoc, `unknown environment ${name}`);
    const args = parseArgs(specs, `\\begin{${name}}`, beginLoc);
    const body = parseSeq('env', beginLoc);
    const end = tokens[pos];
    if (!end) throw new ConversionError(beginLoc, `missing \\end{${name}}`);
    pos++; // the \end command
    const endName = readName('\\end', end.loc);
    if (endName !== name) {
      throw new ConversionError(end.loc, `\\end{${endName}} does not match \\begin{${name}}`);
    }
    return { kind: 'env', name, args, body, loc: beginLoc };
  }

  return parseSeq('top', { file: '', line: 1, column: 1 });
}
