import type { Inline } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { frenchSpacing, ligatures, NBSP, NNBSP } from '../src/typography.js';

const t = (text: string): Inline => ({ type: 'text', text });
const one = (s: string): string => {
  const out = frenchSpacing([t(s)]);
  expect(out).toHaveLength(1);
  return (out[0] as { text: string }).text;
};

describe('constants', () => {
  it('uses the exact code points', () => {
    expect(NNBSP).toBe(' ');
    expect(NBSP).toBe(' ');
  });
});

describe('ligatures', () => {
  it('converts dashes, quotes and apostrophes', () => {
    expect(ligatures("a---b--c l'air")).toBe('a—b–c l’air');
    expect(ligatures("``x'' `y'")).toBe('“x” ‘y’');
  });
});

describe('frenchSpacing in a single text', () => {
  it('replaces the space before a question mark', () => {
    expect(one('froid ?')).toBe('froid ?');
  });
  it('adds a missing space', () => {
    expect(one('froid?')).toBe('froid ?');
    expect(one('Oh;')).toBe('Oh ;');
    expect(one('Non!')).toBe('Non !');
  });
  it('colon gets a full no-break space', () => {
    expect(one('dit :')).toBe('dit :');
    expect(one('dit:')).toBe('dit :');
  });
  it('collapses runs of whitespace and normalises typed NBSP', () => {
    expect(one('froid  \t?')).toBe('froid ?');
    expect(one('froid ?')).toBe('froid ?');
    expect(one('dit :')).toBe('dit :');
  });
  it('only the first mark of a run', () => {
    expect(one('Quoi ?!')).toBe('Quoi ?!');
    expect(one('Quoi?!')).toBe('Quoi ?!');
    expect(one('Quoi !!')).toBe('Quoi !!');
  });
  it('guillemets typed directly', () => {
    expect(one('« Les Perles »')).toBe('« Les Perles »');
    expect(one('«Les Perles»')).toBe('« Les Perles »');
  });
  it('never inserts at the start of the segment', () => {
    expect(one('?')).toBe('?');
    expect(one('!x')).toBe('!x');
  });
});

describe('frenchSpacing across nodes', () => {
  it('spaces after a thought node', () => {
    const out = frenchSpacing([{ type: 'thought', children: [t('Que le diable')] }, t(' ?')]);
    expect(out[1]).toEqual(t(' ?'));
  });
  it('adds a space to a bare mark right after a node', () => {
    const out = frenchSpacing([{ type: 'emphasis', children: [t('mot')] }, t('?')]);
    expect(out[1]).toEqual(t(' ?'));
  });
  it('normalises whitespace at the end of the previous node', () => {
    expect(frenchSpacing([t('froid '), t('?')])).toEqual([t('froid ?')]);
    const note: Inline = { type: 'note', kind: 'author', children: [t('x')] };
    expect(frenchSpacing([t('tête '), note, t(' ?')])).toEqual([t('tête '), note, t(' ?')].map((n, i) => (i === 0 ? n : n)));
  });
  it('strips ordinary space at the end of an inner node', () => {
    const out = frenchSpacing([{ type: 'emphasis', children: [t('mot ')] }, t('?')]);
    expect(out).toEqual([{ type: 'emphasis', children: [t('mot')] }, t(' ?')]);
  });
  it('recurses into children', () => {
    const out = frenchSpacing([{ type: 'emphasis', children: [t('Quoi?')] }]);
    expect(out).toEqual([{ type: 'emphasis', children: [t('Quoi ?')] }]);
  });
  it('recurses into dropCap.rest', () => {
    const out = frenchSpacing([{ type: 'dropCap', letter: 'Q', rest: [t('uoi?')] }]);
    expect(out).toEqual([{ type: 'dropCap', letter: 'Q', rest: [t('uoi ?')] }]);
  });
  it('context crosses into the dropCap after its letter', () => {
    const out = frenchSpacing([{ type: 'dropCap', letter: 'Q', rest: [t('?')] }]);
    expect(out).toEqual([{ type: 'dropCap', letter: 'Q', rest: [t(' ?')] }]);
  });
  it('lineBreak counts as a start', () => {
    const out = frenchSpacing([t('a'), { type: 'lineBreak' }, t('?')]);
    expect(out[2]).toEqual(t('?'));
  });
  it('guillemets across nodes', () => {
    const out = frenchSpacing([t('« '), { type: 'emphasis', children: [t('x')] }, t(' »')]);
    expect(out).toEqual([t('« '), { type: 'emphasis', children: [t('x')] }, t(' »')]);
  });
  it('merges adjacent text nodes', () => {
    expect(frenchSpacing([t('['), t('a'), t(']')])).toEqual([t('[a]')]);
  });
  it('does not mutate the input', () => {
    const input: Inline[] = [{ type: 'emphasis', children: [t('mot ')] }, t('?')];
    const copy = structuredClone(input);
    frenchSpacing(input);
    expect(input).toEqual(copy);
  });
});
