import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'bible');

function walk(prefix = ''): string[] {
  return readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap((e) => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    return e.isDirectory() ? walk(rel) : [rel];
  });
}

/** The files of the frozen bible fixture, keyed by their path in a repository (`bible/...`). */
export const bibleFiles = (): Record<string, string> =>
  Object.fromEntries(walk().map((rel) => [`bible/${rel}`, readFileSync(path.join(root, rel), 'utf8')]));
