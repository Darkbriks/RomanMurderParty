import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'book');

function walk(dir: string, prefix = ''): Record<string, string> {
  const files: Record<string, string> = {};
  for (const e of readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) Object.assign(files, walk(dir, rel));
    else files[rel] = readFileSync(path.join(dir, rel), 'utf8');
  }
  return files;
}

/** The files of the frozen book fixture, with optional overrides. */
export const bookFiles = (overrides: Record<string, string> = {}): Record<string, string> => ({
  ...walk(root),
  ...overrides,
});
