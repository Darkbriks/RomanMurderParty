import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BookSchema, DownloadsSchema, PageMapsSchema } from '@rmp/model';
import { afterAll, describe, expect, it } from 'vitest';
import { buildData } from '../../scripts/build-data.js';
import { convertBook, FsSource } from '../src/index.js';
import { bookFiles } from './helpers/book-files.js';
import { makeRepo } from './helpers/git-repo.js';

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = (): string => {
  const d = mkdtempSync(path.join(tmpdir(), 'rmp-bd-'));
  dirs.push(d);
  return d;
};

const fixtureDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures', 'book');

async function counts() {
  const book = await convertBook(new FsSource(fixtureDir), { sha: 'x', date: '2026-10-20T12:00:00+02:00', subject: 's', tags: [] });
  return { parts: book.parts.length, chapters: book.parts.reduce((n, p) => n + p.chapters.length, 0) };
}

function mpmap(parts: number, chapters: number): string {
  const lines: string[] = [];
  for (let i = 1; i <= parts; i++) lines.push(`part ${i} ${i}`);
  for (let i = 1; i <= chapters; i++) lines.push(`chapter ${i} ${i}`);
  return lines.join('\n') + '\n';
}

function pdfDir(parts: number, chapters: number): string {
  const d = tmp();
  for (const v of ['final', 'brouillon']) {
    mkdirSync(path.join(d, v));
    writeFileSync(path.join(d, v, 'roman.mpmap'), mpmap(parts, chapters));
    writeFileSync(path.join(d, v, 'roman.pdf'), v === 'final' ? '%PDF-final' : '%PDF-brouillon!');
  }
  return d;
}

describe('build-data', () => {
  it('fails when the page map disagrees with the book', async () => {
    const { parts, chapters } = await counts();
    const { dir } = await makeRepo([{ files: bookFiles(), message: 'one' }]);
    await expect(
      buildData({ repo: dir, pdfDir: pdfDir(parts, chapters - 1), out: tmp(), workingTree: false }),
    ).rejects.toThrow(`page map and book disagree (PDF final: ${chapters - 1} chapters, model: ${chapters})`);
  });

  it('writes downloads with sizes and filenames, page maps and images', async () => {
    const { parts, chapters } = await counts();
    const { dir } = await makeRepo([
      {
        files: bookFiles({
          'figures/plan.png': 'PNGDATA',
          'parties/coda.tex': '\\partie{Coda}{Vivienne}\n\\chapitre{}\n\\plan{figures/plan.png}{Le plan}\n',
        }),
        message: 'one',
      },
    ]);
    const out = tmp();
    mkdirSync(path.join(out, 'data'));
    writeFileSync(path.join(out, 'data', 'stale.json'), '{}');
    const r = await buildData({ repo: dir, pdfDir: pdfDir(parts, chapters), out, workingTree: false });
    expect(r.versions).toBe(1);
    expect(existsSync(path.join(out, 'data', 'stale.json'))).toBe(false);

    const downloads = DownloadsSchema.parse(JSON.parse(readFileSync(path.join(out, 'data', 'downloads.json'), 'utf8')));
    expect(downloads.items).toEqual([
      { format: 'pdf', variant: 'final', url: 'downloads/roman-final.pdf', bytes: 10, filename: 'Titre provisoire.pdf' },
      {
        format: 'pdf', variant: 'brouillon', url: 'downloads/roman-brouillon.pdf', bytes: 15,
        filename: 'Titre provisoire (brouillon).pdf',
      },
    ]);
    expect(readFileSync(path.join(out, 'downloads', 'roman-final.pdf'), 'utf8')).toBe('%PDF-final');
    const maps = PageMapsSchema.parse(JSON.parse(readFileSync(path.join(out, 'data', 'pagemaps.json'), 'utf8')));
    expect(maps.final.chapters).toHaveLength(chapters);
    expect(readFileSync(path.join(out, 'figures', 'plan.png'), 'utf8')).toBe('PNGDATA');
    BookSchema.parse(JSON.parse(readFileSync(path.join(out, 'data', 'versions', `${r.latest}.json`), 'utf8')));
  });
});
