import { z } from 'zod';

const page = z.number().int().min(1); // 1-based PDF page

/** index = ordinal-1 (parts) / number-1 (chapters) */
export const PageMapSchema = z.object({ parts: z.array(page), chapters: z.array(page) });
export type PageMap = z.infer<typeof PageMapSchema>;

export const PageMapsSchema = z.object({ final: PageMapSchema, brouillon: PageMapSchema });
export type PageMaps = z.infer<typeof PageMapsSchema>;
