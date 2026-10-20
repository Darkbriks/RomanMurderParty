import { describe, expect, it } from 'vitest';
import { parsePageMap } from '../src/pagemap.js';

describe('parsePageMap', () => {
  it('reads parts and chapters', () => {
    expect(parsePageMap('part 1 5\nchapter 1 5\nchapter 2 9\npart 2 12\nchapter 3 12\n')).toEqual({
      parts: [5, 12],
      chapters: [5, 9, 12],
    });
  });

  it('rejects gaps and garbage', () => {
    expect(() => parsePageMap('part 1 5\nchapter 2 9\n')).toThrow(/line 2/);
    expect(() => parsePageMap('part 2 5\n')).toThrow(/line 1/);
    expect(() => parsePageMap('part 1 5\npart 1 6\n')).toThrow(/line 2/);
    expect(() => parsePageMap('part 1 5\nfoo bar\n')).toThrow(/line 2/);
    expect(() => parsePageMap('part 1 0\n')).toThrow(/line 1/);
  });
});
