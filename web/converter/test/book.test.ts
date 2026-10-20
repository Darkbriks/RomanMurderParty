import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BookSchema, type VersionInfo } from '@rmp/model';
import { afterAll, describe, expect, it } from 'vitest';
import { convertBook } from '../src/book.js';
import { ConversionError } from '../src/errors.js';
import { FsSource } from '../src/source.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, 'fixtures', 'book');
const repoRoot = path.resolve(here, '..', '..', '..');
const version: VersionInfo = { sha: 'abc1234', date: '2026-10-20T12:00:00+02:00', subject: 'Test', tags: [] };

describe('convertBook on the frozen fixture', () => {
  it('assembles the book', async () => {
    const book = await convertBook(new FsSource(fixture), version);
    expect(book.parts.map((p) => p.narrator)).toEqual([
      'Seraphina', 'Narrateur à choisir', 'Narrateur à choisir', 'Reginald',
      'Narrateur à choisir', 'Narrateur à choisir', 'To Define', 'Vivienne',
    ]);
    expect(book.parts[0]!.chapters[0]!.title).toEqual([{ type: 'text', text: 'Valse (provisoire)' }]);
    expect(book.parts[0]!.chapters[1]!.title).toEqual([{ type: 'text', text: 'Seule' }]);
    expect(book.meta).toEqual({ title: 'Titre provisoire', author: 'Antoine', runningTitle: 'Titre provisoire', version });
    expect(book.front).toEqual({ epigraph: null, dedication: null });
    expect(book.characters.groups).toHaveLength(2);
  });

  it('repository snapshot', async () => {
    expect(await convertBook(new FsSource(fixture), version)).toMatchSnapshot();
  });
});

describe('convertBook on the live repository', () => {
  it('converts and passes the schema', async () => {
    const book = await convertBook(new FsSource(repoRoot), version);
    expect(() => BookSchema.parse(book)).not.toThrow();
  });

  it('no comment text in the repository model', async () => {
    const json = JSON.stringify(await convertBook(new FsSource(repoRoot), version));
    for (const s of ['Opera, piece, valse, comedie', 'flash back',
      "En effet, la veuve semblait visiblement s'être mise en tête que Mary Fletcher"]) {
      expect(json).not.toContain(s);
    }
  });
});

describe('convertBook on a synthetic root', () => {
  const dirs: string[] = [];
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
  const make = (roman: string): FsSource => {
    const d = mkdtempSync(path.join(tmpdir(), 'rmp-book-'));
    dirs.push(d);
    mkdirSync(path.join(d, 'parties'));
    writeFileSync(path.join(d, 'roman.tex'), roman);
    writeFileSync(path.join(d, 'parties', 'a.tex'), '\\partie{P}{N}\n\\chapitre{T}\nTexte.\n');
    return new FsSource(d);
  };
  const doc = (preamble: string) =>
    `${preamble}\n\\begin{document}\n\\mainmatter\n\\include{parties/a}\n\\end{document}\n`;

  it('epigraph and dedication reach front', async () => {
    const book = await convertBook(
      make(doc('\\titre{T}\n\\dedicace{Pour X.}\n\\epigraphe[Auteur]{Un mot.}')), version);
    expect(book.front.dedication).toEqual([{ type: 'text', text: 'Pour X.' }]);
    expect(book.front.epigraph).toEqual({
      text: [{ type: 'text', text: 'Un mot.' }], source: [{ type: 'text', text: 'Auteur' }],
    });
    expect(book.meta.author).toBeNull();
  });

  it('running title falls back to the title, and the title to the running title', async () => {
    const a = await convertBook(make(doc('\\titre{T}')), version);
    expect(a.meta.runningTitle).toBe('T');
    const b = await convertBook(make(doc('\\titrecourant{R}')), version);
    expect([b.meta.title, b.meta.runningTitle]).toEqual(['R', 'R']);
  });

  it('no title is an error', async () => {
    await expect(convertBook(make(doc('')), version)).rejects.toThrow(/no \\titre in roman.tex/);
    await expect(convertBook(make(doc('')), version)).rejects.toBeInstanceOf(ConversionError);
  });
});
