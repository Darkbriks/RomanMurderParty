import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/lexer.js';

const strip = (t: ReturnType<typeof tokenize>) =>
  t.map(({ loc: _loc, ...rest }) => rest);

describe('tokenize', () => {
  it('comment text never appears in tokens', () => {
    const tokens = tokenize('f', 'Avant % secret\nApres');
    expect(JSON.stringify(tokens)).not.toContain('secret');
  });

  it('keeps the space before a comment and drops the next line indentation', () => {
    expect(strip(tokenize('f', 'a % c\n   b'))).toEqual([
      { kind: 'text', value: 'a' },
      { kind: 'space' },
      { kind: 'text', value: 'b' },
    ]);
  });

  it('escaped percent is literal', () => {
    expect(strip(tokenize('f', '50 \\% de'))).toEqual([
      { kind: 'text', value: '50' },
      { kind: 'space' },
      { kind: 'command', name: '%' },
      { kind: 'space' },
      { kind: 'text', value: 'de' },
    ]);
  });

  it('comment-only line does not break the paragraph', () => {
    const tokens = tokenize('f', 'a\n% x\nb');
    expect(tokens.some((t) => t.kind === 'parbreak')).toBe(false);
  });

  it('blank lines produce one parbreak', () => {
    const tokens = tokenize('f', 'a\n\n  \n\t\nb');
    expect(tokens.filter((t) => t.kind === 'parbreak')).toHaveLength(1);
    expect(strip(tokens)).toEqual([
      { kind: 'text', value: 'a' },
      { kind: 'newline', space: true },
      { kind: 'parbreak' },
      { kind: 'text', value: 'b' },
    ]);
  });

  it('space after a control word is skipped', () => {
    expect(strip(tokenize('f', '\\ldots je'))).toEqual([
      { kind: 'command', name: 'ldots' },
      { kind: 'text', value: 'je' },
    ]);
  });

  it('newline after a control word has space=false', () => {
    expect(strip(tokenize('f', 'monter\\ldots\nje'))).toEqual([
      { kind: 'text', value: 'monter' },
      { kind: 'command', name: 'ldots' },
      { kind: 'newline', space: false },
      { kind: 'text', value: 'je' },
    ]);
  });

  it('newline after ordinary text has space=true and trailing spaces are dropped', () => {
    expect(strip(tokenize('f', 'a  \nb'))).toEqual([
      { kind: 'text', value: 'a' },
      { kind: 'newline', space: true },
      { kind: 'text', value: 'b' },
    ]);
  });

  it('control symbols: name is the single character, spaces after are kept', () => {
    expect(strip(tokenize('f', '\\\\ x \\, y'))).toEqual([
      { kind: 'command', name: '\\' },
      { kind: 'space' },
      { kind: 'text', value: 'x' },
      { kind: 'space' },
      { kind: 'command', name: ',' },
      { kind: 'space' },
      { kind: 'text', value: 'y' },
    ]);
  });

  it('star belongs to a control word name', () => {
    expect(strip(tokenize('f', '\\vspace*{1}'))[0]).toEqual({ kind: 'command', name: 'vspace*' });
  });

  it('braces, tilde and brackets', () => {
    expect(strip(tokenize('f', '{a~[b]}'))).toEqual([
      { kind: 'open' },
      { kind: 'text', value: 'a' },
      { kind: 'tilde' },
      { kind: 'text', value: '[' },
      { kind: 'text', value: 'b' },
      { kind: 'text', value: ']' },
      { kind: 'close' },
    ]);
  });

  it('locations are 1-based line and column', () => {
    const tokens = tokenize('f', 'ab\n  \\foo');
    expect(tokens[0]!.loc).toEqual({ file: 'f', line: 1, column: 1 });
    const cmd = tokens.find((t) => t.kind === 'command')!;
    expect(cmd.loc).toEqual({ file: 'f', line: 2, column: 3 });
  });
});
