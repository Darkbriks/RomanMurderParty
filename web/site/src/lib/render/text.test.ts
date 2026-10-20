import { describe, expect, it } from 'vitest';
import { plainText } from './text.ts';

describe('plainText', () => {
  it('flattens nested inlines, quotes and line breaks', () => {
    expect(
      plainText([
        { type: 'dropCap', letter: 'B', rest: [{ type: 'text', text: 'elgravia' }] },
        { type: 'lineBreak' },
        { type: 'emphasis', children: [{ type: 'quote', children: [{ type: 'quote', children: [{ type: 'text', text: 'x' }] }] }] },
      ]),
    ).toBe('Belgravia « “x” »');
  });

  it('leaves working notes out', () => {
    expect(plainText([{ type: 'text', text: 'a' }, { type: 'note', kind: 'author', children: [{ type: 'text', text: 'n' }] }])).toBe('a');
  });
});
