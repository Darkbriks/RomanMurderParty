import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { buildArchive, parsePageMap } from '@rmp/converter';
import {
  BookSchema,
  DownloadsSchema,
  PageMapsSchema,
  type Book,
  type DownloadItem,
  type PageMap,
} from '@rmp/model';

const run = promisify(execFile);
const VARIANTS = ['final', 'brouillon'] as const;

export type BuildDataOptions = { repo: string; pdfDir: string; out: string; workingTree: boolean };

function checkAgainstBook(variant: string, map: PageMap, book: Book): void {
  const chapters = book.parts.reduce((n, p) => n + p.chapters.length, 0);
  if (map.parts.length !== book.parts.length) {
    throw new Error(
      `page map and book disagree (PDF ${variant}: ${map.parts.length} parts, model: ${book.parts.length})`,
    );
  }
  if (map.chapters.length !== chapters) {
    throw new Error(
      `page map and book disagree (PDF ${variant}: ${map.chapters.length} chapters, model: ${chapters})`,
    );
  }
}

/** Resolves `rel` under `base`, refusing anything that ends up outside it. */
export function resolveInside(base: string, rel: string): string {
  const root = path.resolve(base);
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`path escapes ${base}: ${rel}`);
  return full;
}

/** Reads a file of the repository as it is in HEAD, or in the working tree. */
export async function copyRepoFile(repo: string, src: string, out: string, workingTree: boolean): Promise<void> {
  const from = resolveInside(repo, src);
  const dest = resolveInside(out, src);
  await mkdir(path.dirname(dest), { recursive: true });
  if (workingTree) {
    await copyFile(from, dest);
    return;
  }
  const { stdout } = await run('git', ['cat-file', 'blob', `HEAD:${src}`], {
    cwd: repo,
    encoding: 'buffer',
    maxBuffer: 256 * 1024 * 1024,
  });
  await writeFile(dest, stdout);
}

export async function buildData(opts: BuildDataOptions): Promise<{ versions: number; available: number; latest: string }> {
  const { repo, pdfDir, out, workingTree } = opts;
  const dataDir = path.join(out, 'data');
  const downloadsDir = path.join(out, 'downloads');
  await Promise.all(['data', 'downloads', 'figures'].map((d) => rm(path.join(out, d), { recursive: true, force: true })));
  await mkdir(dataDir, { recursive: true });
  await mkdir(downloadsDir, { recursive: true });

  const index = await buildArchive(repo, dataDir, { workingTree });
  const latestEntry = index.versions.find((v) => v.sha === index.latest);
  if (!latestEntry?.model) throw new Error(`latest version ${index.latest} has no model`);
  const book = BookSchema.parse(JSON.parse(await readFile(path.join(dataDir, latestEntry.model), 'utf8')));

  const maps: Partial<Record<(typeof VARIANTS)[number], PageMap>> = {};
  for (const variant of VARIANTS) {
    const file = path.join(pdfDir, variant, 'roman.mpmap');
    const map = parsePageMap(await readFile(file, 'utf8'));
    checkAgainstBook(variant, map, book);
    maps[variant] = map;
  }
  await writeFile(path.join(dataDir, 'pagemaps.json'), JSON.stringify(PageMapsSchema.parse(maps), null, 2));

  const items: DownloadItem[] = [];
  for (const variant of VARIANTS) {
    const target = path.join(downloadsDir, `roman-${variant}.pdf`);
    await copyFile(path.join(pdfDir, variant, 'roman.pdf'), target);
    items.push({
      format: 'pdf',
      variant,
      url: `downloads/roman-${variant}.pdf`,
      bytes: (await stat(target)).size,
      filename: variant === 'final' ? `${book.meta.title}.pdf` : `${book.meta.title} (brouillon).pdf`,
    });
  }
  await writeFile(
    path.join(dataDir, 'downloads.json'),
    JSON.stringify(DownloadsSchema.parse({ schemaVersion: 1, items }), null, 2),
  );

  const sources = new Set<string>();
  const collect = (blocks: Book['parts'][number]['intro']): void => {
    for (const b of blocks) {
      if (b.type === 'image') sources.add(b.src);
      else if ('body' in b && Array.isArray(b.body)) collect(b.body as typeof blocks);
    }
  };
  for (const part of book.parts) {
    collect(part.intro);
    for (const chapter of part.chapters) collect(chapter.blocks);
  }
  for (const src of sources) await copyRepoFile(repo, src, out, workingTree);

  return {
    versions: index.versions.length,
    available: index.versions.filter((v) => v.available).length,
    latest: index.latest,
  };
}

function parseArgs(argv: string[]): BuildDataOptions {
  const values: Record<string, string> = {};
  let workingTree = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--working-tree') workingTree = true;
    else if (arg === '--repo' || arg === '--pdf-dir' || arg === '--out') {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      values[arg] = value;
    } else throw new Error(`unknown argument ${arg}`);
  }
  const need = (k: string): string => values[k] ?? (() => { throw new Error(`missing ${k}`); })();
  return { repo: need('--repo'), pdfDir: need('--pdf-dir'), out: need('--out'), workingTree };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = await buildData(parseArgs(process.argv.slice(2)));
    console.log(`${r.versions} versions, ${r.available} available, latest ${r.latest}`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
