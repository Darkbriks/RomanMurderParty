import { z } from 'zod';

/** Any value a YAML file of the bible holds once parsed (YAML 1.2 core schema: JSON values). */
export type BibleValue = string | number | boolean | null | BibleValue[] | { [key: string]: BibleValue };
export const BibleValueSchema: z.ZodType<BibleValue> = z.json() as z.ZodType<BibleValue>;

/** A part of a Markdown file, from one heading to the next (level 0: the text before the first heading). */
export const MarkdownSectionSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().min(0).max(6),
  heading: z.string(),
  html: z.string(),
  text: z.string(),
});
export type MarkdownSection = z.infer<typeof MarkdownSectionSchema>;

const fileFields = { path: z.string().min(1), slug: z.string().min(1), title: z.string() };

export const BibleFileSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('yaml'),
    ...fileFields,
    /** The comment lines at the top of the file, which explain its codes. */
    legend: z.string().nullable(),
    data: BibleValueSchema,
    /** PDFs of the same folder, under the site's base. */
    pdfs: z.array(z.object({ name: z.string(), url: z.string() })),
  }),
  z.object({ kind: z.literal('markdown'), ...fileFields, sections: z.array(MarkdownSectionSchema) }),
]);
export type BibleFile = z.infer<typeof BibleFileSchema>;
export type BibleYamlFile = Extract<BibleFile, { kind: 'yaml' }>;
export type BibleMarkdownFile = Extract<BibleFile, { kind: 'markdown' }>;

/** `data/bible.json`: the files of `bible/` as of the latest commit (or the working tree). */
export const BibleSchema = z.object({ schemaVersion: z.literal(1), files: z.array(BibleFileSchema) });
export type Bible = z.infer<typeof BibleSchema>;
