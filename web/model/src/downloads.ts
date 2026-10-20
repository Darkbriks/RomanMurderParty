import { z } from 'zod';

export const DownloadItemSchema = z.object({
  format: z.literal('pdf'),
  variant: z.enum(['final', 'brouillon']),
  url: z.string(),
  bytes: z.number().int().nonnegative(),
  filename: z.string(),
});
export type DownloadItem = z.infer<typeof DownloadItemSchema>;

export const DownloadsSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(DownloadItemSchema),
});
export type Downloads = z.infer<typeof DownloadsSchema>;
