import { z } from 'zod';

export const SourceLocationSchema = z.object({ file: z.string(), line: z.number().int().min(1) });
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'emphasis'; children: Inline[] }
  | { type: 'smallCaps'; children: Inline[] }
  | { type: 'bold'; children: Inline[] }
  | { type: 'quote'; children: Inline[] }
  | { type: 'thought'; children: Inline[] }
  | { type: 'note'; kind: 'rework' | 'author'; children: Inline[] }
  | { type: 'dropCap'; letter: string; rest: Inline[] }
  | { type: 'lineBreak' };

// Recursive schemas use getters (zod 4); they keep `.options` and `.shape` introspectable.
const wrapper = <T extends 'emphasis' | 'smallCaps' | 'bold' | 'quote' | 'thought'>(type: T) =>
  z.object({
    type: z.literal(type),
    get children(): z.ZodType<Inline[]> {
      return z.array(InlineSchema);
    },
  });

export const InlineSchema: z.ZodType<Inline> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  wrapper('emphasis'),
  wrapper('smallCaps'),
  wrapper('bold'),
  wrapper('quote'),
  wrapper('thought'),
  z.object({
    type: z.literal('note'),
    kind: z.enum(['rework', 'author']),
    get children(): z.ZodType<Inline[]> {
      return z.array(InlineSchema);
    },
  }),
  z.object({
    type: z.literal('dropCap'),
    letter: z.string(),
    get rest(): z.ZodType<Inline[]> {
      return z.array(InlineSchema);
    },
  }),
  z.object({ type: z.literal('lineBreak') }),
]) as z.ZodType<Inline>;

export const INLINE_TYPES = [
  'text', 'emphasis', 'smallCaps', 'bold', 'quote', 'thought', 'note', 'dropCap', 'lineBreak',
] as const satisfies readonly Inline['type'][];

export type Segment = { loc: SourceLocation; content: Inline[]; spaceAfter: boolean };
export const SegmentSchema: z.ZodType<Segment> = z.object({
  loc: SourceLocationSchema,
  content: z.array(InlineSchema),
  spaceAfter: z.boolean(),
});

export type Block =
  | { type: 'paragraph'; id: string; dialogue: boolean; segments: Segment[] }
  | { type: 'sceneBreak'; id: string }
  | { type: 'end'; id: string }
  | { type: 'letter'; id: string; place: Inline[] | null; salutation: Inline[]; body: Block[] }
  | { type: 'signature'; id: string; content: Inline[] }
  | { type: 'postscript'; id: string; content: Inline[] }
  | { type: 'telegram'; id: string; office: Inline[]; time: Inline[]; recipient: Inline[]; body: Block[] }
  | { type: 'clipping'; id: string; newspaper: Inline[]; headline: Inline[]; date: Inline[] | null; body: Block[] }
  | { type: 'diary'; id: string; heading: Inline[]; body: Block[] }
  | { type: 'card'; id: string; body: Block[] }
  | {
      type: 'image'; id: string; src: string; caption: Inline[]; fullPage: boolean;
      widthFraction: number | null;
    }
  | { type: 'annexPage'; id: string; title: Inline[]; body: Block[] }
  | { type: 'dateline'; id: string; place: Inline[]; date: Inline[] };

const inl = z.array(InlineSchema);
const inlOrNull = inl.nullable();
const id = z.string().min(1);
// z.lazy defers the self-reference; a getter would be evaluated by the spread below.
const bodyField = { body: z.lazy((): z.ZodType<Block[]> => z.array(BlockSchema)) };

export const BlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), id, dialogue: z.boolean(), segments: z.array(SegmentSchema) }),
  z.object({ type: z.literal('sceneBreak'), id }),
  z.object({ type: z.literal('end'), id }),
  z.object({ type: z.literal('letter'), id, place: inlOrNull, salutation: inl, ...bodyField }),
  z.object({ type: z.literal('signature'), id, content: inl }),
  z.object({ type: z.literal('postscript'), id, content: inl }),
  z.object({
    type: z.literal('telegram'), id, office: inl, time: inl, recipient: inl, ...bodyField,
  }),
  z.object({
    type: z.literal('clipping'), id, newspaper: inl, headline: inl, date: inlOrNull, ...bodyField,
  }),
  z.object({ type: z.literal('diary'), id, heading: inl, ...bodyField }),
  z.object({ type: z.literal('card'), id, ...bodyField }),
  z.object({
    type: z.literal('image'), id, src: z.string(), caption: inl, fullPage: z.boolean(),
    widthFraction: z.number().positive().nullable(),
  }),
  z.object({ type: z.literal('annexPage'), id, title: inl, ...bodyField }),
  z.object({ type: z.literal('dateline'), id, place: inl, date: inl }),
]) as unknown as z.ZodType<Block> & { options: readonly { shape: { type: { value: Block['type'] } } }[] };

export const BLOCK_TYPES = [
  'paragraph', 'sceneBreak', 'end', 'letter', 'signature', 'postscript', 'telegram', 'clipping',
  'diary', 'card', 'image', 'annexPage', 'dateline',
] as const satisfies readonly Block['type'][];

export const ChapterSchema = z.object({
  id, number: z.number().int().min(1), numeral: z.string(), title: inlOrNull,
  loc: SourceLocationSchema, blocks: z.array(BlockSchema),
});
export type Chapter = z.infer<typeof ChapterSchema>;

export const PartSchema = z.object({
  id, ordinal: z.number().int().min(1), label: z.string(), narrator: z.string(),
  epigraph: inlOrNull, loc: SourceLocationSchema, intro: z.array(BlockSchema),
  chapters: z.array(ChapterSchema),
});
export type Part = z.infer<typeof PartSchema>;

export const VersionInfoSchema = z.object({
  sha: z.string().min(1),
  date: z.iso.datetime({ offset: true }),
  subject: z.string(),
  tags: z.array(z.string()),
});
export type VersionInfo = z.infer<typeof VersionInfoSchema>;

export const BookSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({
    title: z.string(), author: z.string().nullable(), runningTitle: z.string(), version: VersionInfoSchema,
  }),
  front: z.object({
    epigraph: z.object({ text: inl, source: inlOrNull }).nullable(),
    dedication: inlOrNull,
  }),
  parts: z.array(PartSchema),
  characters: z.object({
    title: z.string().nullable(),
    groups: z.array(z.object({
      id, name: z.string().nullable(),
      people: z.array(z.object({ id, name: z.string(), details: z.string(), description: inl })),
    })),
  }),
});
export type Book = z.infer<typeof BookSchema>;
