import { z } from 'zod';
import { VersionInfoSchema } from './book.js';

export const VersionEntrySchema = VersionInfoSchema.extend({
  available: z.boolean(),
  error: z.string().nullable(),
  model: z.string().nullable(), // 'versions/<sha>.json'
});
export type VersionEntry = z.infer<typeof VersionEntrySchema>;

export const VersionIndexSchema = z.object({
  schemaVersion: z.literal(1),
  latest: z.string(),
  versions: z.array(VersionEntrySchema), // newest first
});
export type VersionIndex = z.infer<typeof VersionIndexSchema>;
