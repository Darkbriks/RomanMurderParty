import { z } from 'zod';

/** `data/site.json`: what the cover needs besides the book. */
export const SiteInfoSchema = z.object({
  schemaVersion: z.literal(1),
  /** presentation.md rendered to HTML, or null without the file. */
  presentation: z.string().nullable(),
  /** Whether data/bible.json exists. */
  bible: z.boolean(),
});
export type SiteInfo = z.infer<typeof SiteInfoSchema>;
