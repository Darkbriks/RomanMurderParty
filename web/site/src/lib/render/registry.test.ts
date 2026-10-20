import { BLOCK_TYPES, INLINE_TYPES } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { blockRenderers, inlineRenderers } from './registry.ts';

describe('registry', () => {
  it('registry covers every model type', () => {
    expect(Object.keys(blockRenderers).sort()).toEqual([...BLOCK_TYPES].sort());
    expect(Object.keys(inlineRenderers).sort()).toEqual([...INLINE_TYPES].sort());
  });

  it('every renderer is a component', () => {
    for (const r of [...Object.values(blockRenderers), ...Object.values(inlineRenderers)]) {
      expect(typeof r).toBe('function');
    }
  });
});
