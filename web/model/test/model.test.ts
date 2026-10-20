import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Block, Inline } from '../src/index.js';
import { BLOCK_TYPES, BlockSchema, BookSchema, PageMapSchema } from '../src/index.js';

const loc = { file: 'parties/partie1.tex', line: 3 };
const version = { sha: 'abc1234', date: '2026-10-20T10:00:00Z', subject: 'x', tags: [] };
const paragraph = (id: string) => ({
  type: 'paragraph',
  id,
  dialogue: false,
  segments: [{ loc, content: [{ type: 'text', text: 'Bonjour.' }], spaceAfter: true }],
});

const book = {
  schemaVersion: 1,
  meta: { title: 'T', author: null, runningTitle: 'T', version },
  front: { epigraph: null, dedication: null },
  parts: [
    {
      id: 'p1', ordinal: 1, label: 'Partie I', narrator: 'N', epigraph: null, loc, intro: [],
      chapters: [{ id: 'c1', number: 1, numeral: 'I', title: null, loc, blocks: [paragraph('c1.b1')] }],
    },
  ],
  characters: { title: null, groups: [] },
};

describe('model', () => {
  it('accepts a minimal valid book', () => {
    expect(() => BookSchema.parse(book)).not.toThrow();
  });

  it('rejects an unknown block type', () => {
    expect(BlockSchema.safeParse({ type: 'video', id: 'x' }).success).toBe(false);
  });

  it('parses nested blocks', () => {
    const letter = {
      type: 'letter', id: 'c1.b2', place: null, salutation: [{ type: 'text', text: 'Cher' }],
      body: [paragraph('c1.b2.1'), { type: 'signature', id: 'c1.b2.2', content: [{ type: 'text', text: 'A.' }] }],
    };
    expect(BlockSchema.safeParse(letter).success).toBe(true);
  });

  it('BLOCK_TYPES lists every block type', () => {
    const literals = new Set(BlockSchema.options.map((o) => o.shape.type.value));
    expect(new Set(BLOCK_TYPES)).toEqual(literals);
  });

  it('rejects a page map with a zero page', () => {
    expect(PageMapSchema.safeParse({ parts: [0], chapters: [] }).success).toBe(false);
  });

  it('every block and inline type resolves through Extract', () => {
    type NoNever<T> = [T] extends [never] ? false : true;
    type AllBlocks = { [K in Block['type']]: NoNever<Extract<Block, { type: K }>> }[Block['type']];
    type AllInlines = { [K in Inline['type']]: NoNever<Extract<Inline, { type: K }>> }[Inline['type']];
    expectTypeOf<AllBlocks>().toEqualTypeOf<true>();
    expectTypeOf<AllInlines>().toEqualTypeOf<true>();
    expectTypeOf<Extract<Block, { type: 'end' }>>().not.toBeNever();
    expectTypeOf<Extract<Block, { type: 'signature' }>>().not.toBeNever();
    expectTypeOf<Extract<Inline, { type: 'bold' }>>().not.toBeNever();
  });
});
