import { BibleSchema, type BibleMarkdownFile, type BibleYamlFile } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { buildBible, fileTitle, headerLegend, selectBibleFiles } from '../src/bible.js';
import { ConversionError } from '../src/errors.js';
import { bibleFiles } from './helpers/bible-files.js';

const files = bibleFiles();
const { sources, pdfs } = selectBibleFiles(Object.keys(files));
const bible = buildBible(sources.map((p) => ({ path: p, text: files[p]! })), pdfs);
const yaml = (slug: string) => bible.files.find((f) => f.slug === slug) as BibleYamlFile;
const md = (slug: string) => bible.files.find((f) => f.slug === slug) as BibleMarkdownFile;

describe('selectBibleFiles', () => {
  it('keeps YAML at any depth, top-level Markdown but the README, and PDFs apart', () => {
    expect(selectBibleFiles(['bible/a.yaml', 'bible/x/b.yml', 'bible/README.md', 'bible/n.md', 'bible/x/m.md', 'bible/x/p.pdf', 'bible/g.py'])).toEqual({
      sources: ['bible/a.yaml', 'bible/n.md', 'bible/x/b.yml'],
      pdfs: ['bible/x/p.pdf'],
    });
  });
});

describe('buildBible', () => {
  it('sorts files by path', () => {
    expect(bible.files.map((f) => f.slug)).toEqual(['bible', 'chronologie', 'inconnu', 'personnages', 'relations', 'vote', 'maison', 'notes-de-scene']);
  });

  it('titles files, with accents for the known ones', () => {
    expect(fileTitle('reperes-historiques')).toBe('Repères historiques');
    expect(fileTitle('notes-de-scene')).toBe('Notes de scène');
    expect(fileTitle('nouveau-fichier')).toBe('Nouveau fichier');
    expect(yaml('personnages').title).toBe('Personnages');
  });

  it('keeps the header comment as the legend', () => {
    expect(headerLegend('# Un.\n#   Deux\n#\n\na: 1\n# pas ici\n')).toBe('Un.\n  Deux\n');
    expect(yaml('relations').legend).toBe('Relations de la fixture.\nvalence  -2 à +2');
    expect(yaml('inconnu').legend).toBeNull();
  });

  it('reads YAML 1.2: an unquoted date stays a string', () => {
    expect(yaml('inconnu').data).toEqual({ verifie_le: '2026-10-10', liste: ['a', 'b'], objets: [{ titre: 'X', detail: { sous: 1 } }] });
  });

  it('attaches the PDFs of the same folder', () => {
    expect(yaml('maison').pdfs).toEqual([{ name: 'plans.pdf', url: 'downloads/bible/lieu/plans.pdf' }]);
    expect(yaml('vote').pdfs).toEqual([]);
  });

  it('rewrites the links of the Markdown files', () => {
    const html = md('bible').sections.map((s) => s.html).join('');
    expect(html).toContain('href="?vue=personnages"');
    expect(html).not.toContain('ouverture.tex');
    expect(html).toContain('la source et');
    expect(html).toContain('href="https://example.com"');
  });

  it('cuts the scene notes by character heading', () => {
    expect(md('notes-de-scene').sections.filter((s) => s.level === 2).map((s) => s.heading)).toEqual([
      'Seraphina', 'Lady Whitmore', 'Evangeline', 'Blackstone', 'Monica et Reginald', 'Personne',
    ]);
  });

  it('fails on invalid YAML with the file and line', () => {
    let err: unknown;
    try {
      buildBible([{ path: 'bible/donnees/x.yaml', text: 'a: 1\nb: [c\n' }], []);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConversionError);
    expect((err as ConversionError).loc?.file).toBe('bible/donnees/x.yaml');
    expect([2, 3]).toContain((err as ConversionError).loc?.line);
  });

  it('fails when two files share a name', () => {
    expect(() => buildBible([{ path: 'bible/a/x.yaml', text: 'a: 1' }, { path: 'bible/b/x.yaml', text: 'b: 2' }], [])).toThrow(
      /bible\/a\/x\.yaml.*bible\/b\/x\.yaml/,
    );
  });

  it('matches the model schema', () => {
    expect(() => BibleSchema.parse(bible)).not.toThrow();
  });
});
