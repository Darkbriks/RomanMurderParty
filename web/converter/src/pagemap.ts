import { PageMapSchema, type PageMap } from '@rmp/model';

/** Reads the `.mpmap` sidecar written by the LaTeX build: `part <ordinal> <page>` and `chapter <number> <page>`. */
export function parsePageMap(text: string): PageMap {
  const parts: number[] = [];
  const chapters: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (line === '') return;
    const m = /^(part|chapter) (\d+) (\d+)$/.exec(line);
    if (!m) throw new Error(`page map line ${i + 1}: cannot read "${line}"`);
    const kind = m[1]!;
    const target = kind === 'part' ? parts : chapters;
    const number = Number(m[2]);
    const page = Number(m[3]);
    if (number !== target.length + 1) {
      throw new Error(`page map line ${i + 1}: ${kind} ${number} found, expected ${kind} ${target.length + 1}`);
    }
    if (page < 1) throw new Error(`page map line ${i + 1}: page must be at least 1`);
    target.push(page);
  });
  return PageMapSchema.parse({ parts, chapters });
}
