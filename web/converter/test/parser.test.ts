import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/lexer.js';
import { parse, type Grammar, type Node } from '../src/parser.js';

const g: Grammar = {
  commands: { partie: ['o', 'm', 'm'], textbf: ['m'], ldots: [], rep: [] },
  environments: { lettre: ['m'], plain: [] },
};
const p = (text: string, grammar: Grammar = g) => parse(tokenize('p.tex', text), grammar);
const strip = (nodes: Node[]): unknown =>
  nodes.map((n) => {
    const { loc: _loc, ...rest } = n;
    const r = rest as Record<string, unknown>;
    if ('children' in r) r.children = strip(r.children as Node[]);
    if ('body' in r) r.body = strip(r.body as Node[]);
    if ('args' in r) r.args = (r.args as (Node[] | null)[]).map((a) => (a ? strip(a) : null));
    return r;
  });

describe('parse', () => {
  it('parses mandatory and optional args', () => {
    const [n] = p('\\partie[Epi]{Ouverture}{Seraphina}');
    expect(strip([n!])).toEqual([
      {
        kind: 'command',
        name: 'partie',
        args: [
          [{ kind: 'text', value: 'Epi' }],
          [{ kind: 'text', value: 'Ouverture' }],
          [{ kind: 'text', value: 'Seraphina' }],
        ],
      },
    ]);
    const [m] = p('\\partie{Ouverture}{Seraphina}');
    expect((m as Extract<Node, { kind: 'command' }>).args[0]).toBeNull();
  });

  it('optional argument may contain braces hiding a bracket', () => {
    const [n] = p('\\partie[a{]}b]{x}{y}');
    const args = (n as Extract<Node, { kind: 'command' }>).args;
    expect(args[0]).not.toBeNull();
    expect(args[1]).toEqual([expect.objectContaining({ kind: 'text', value: 'x' })]);
  });

  it('keeps the space after a command without optional argument', () => {
    expect(strip(p('\\textbf{a} b'))).toEqual([
      { kind: 'command', name: 'textbf', args: [[{ kind: 'text', value: 'a' }]] },
      { kind: 'space' },
      { kind: 'text', value: 'b' },
    ]);
  });

  it('skips spaces and newlines before a mandatory argument', () => {
    const [n] = p('\\textbf\n  {a}');
    expect((n as Extract<Node, { kind: 'command' }>).args[0]).toHaveLength(1);
  });

  it('missing mandatory argument throws', () => {
    expect(() => p('\\textbf x')).toThrow('p.tex:1:9: missing argument for \\textbf');
    expect(() => p('\\begin{lettre} x')).toThrow('p.tex:1:16: missing argument for \\begin{lettre}');
  });

  it('parses environments with args', () => {
    expect(strip(p('\\begin{lettre}{Cher}\nbonjour\\end{lettre}'))).toEqual([
      {
        kind: 'env',
        name: 'lettre',
        args: [[{ kind: 'text', value: 'Cher' }]],
        body: [
          { kind: 'newline', space: true },
          { kind: 'text', value: 'bonjour' },
        ],
      },
    ]);
  });

  it('parses groups', () => {
    expect(strip(p('{a}'))).toEqual([
      { kind: 'group', children: [{ kind: 'text', value: 'a' }] },
    ]);
  });

  it('unknown command throws with location', () => {
    expect(() => p('x\n\\foo')).toThrow('p.tex:2:1: unknown command \\foo');
  });

  it('unknown command inside an argument throws', () => {
    expect(() => p('\\textbf{\\foo}')).toThrow('p.tex:1:9: unknown command \\foo');
  });

  it('unknown environment throws', () => {
    expect(() => p('\\begin{nope}\\end{nope}')).toThrow('p.tex:1:1: unknown environment nope');
  });

  it('mismatched end throws', () => {
    expect(() => p('\\begin{plain}\\end{lettre}')).toThrow(
      'p.tex:1:14: \\end{lettre} does not match \\begin{plain}',
    );
  });

  it('missing end throws', () => {
    expect(() => p('\\begin{plain} x')).toThrow('p.tex:1:1: missing \\end{plain}');
  });

  it('unbalanced braces throws', () => {
    expect(() => p('{a')).toThrow('p.tex:1:1: unbalanced braces');
    expect(() => p('a}')).toThrow('p.tex:1:2: unbalanced braces');
  });
});
