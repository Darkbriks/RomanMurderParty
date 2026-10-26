import { describe, expect, it } from 'vitest';
import { characterIndex } from './catalog.ts';
import { foldForSearch, search, searchDocs, type SearchDoc } from './search.ts';
import { fixtureBible } from './test-fixture.ts';

const bible = fixtureBible();
const docs = searchDocs(bible, characterIndex(bible));

describe('foldForSearch', () => {
  it('drops case, accents and curly apostrophes, and maps back to the original', () => {
    const { folded, map } = foldForSearch('À l’Été');
    expect(folded).toBe("a l'ete");
    expect(map).toHaveLength(folded.length);
    expect(map[2]).toBe(2);
  });
});

describe('search', () => {
  it('ignores case, accents and typographic apostrophes', () => {
    expect(search(docs, 'FIACRE').map((h) => h.doc.anchor)).toEqual(['chronologie-evenements-4']);
    expect(search(docs, "a l'heure").map((h) => h.doc.anchor)).toEqual(['chronologie-evenements-4']);
  });

  it('finds an entry by the name of a character it names by id', () => {
    expect(search(docs, 'Blackstone').map((h) => h.doc.anchor)).toContain('chronologie-evenements-4');
  });

  it('titles a result after its entry, and its file', () => {
    const [hit] = search(docs, 'fiacre');
    expect(hit!.doc.title).toBe('Sir Edmund');
    expect(hit!.doc.fileTitle).toBe('Chronologie');
    expect(hit!.doc.slug).toBe('chronologie');
  });

  it('needs two characters', () => {
    expect(search(docs, 'x')).toEqual([]);
    expect(search(docs, '  ')).toEqual([]);
  });

  it('cuts an excerpt around the match, in the original spelling', () => {
    const doc: SearchDoc = { slug: 'x', fileTitle: 'X', anchor: 'x', title: 'T', text: 'Lady Évangéline arrive enfin.' };
    const [hit] = search([doc], 'evangeline');
    expect(hit!.match).toBe('Évangéline');
    expect(hit!.before.endsWith('Lady ')).toBe(true);
    expect(hit!.after).toBe(' arrive enfin.');
  });

  it('shortens long excerpts at a blank, with an ellipsis', () => {
    const doc: SearchDoc = { slug: 'x', fileTitle: 'X', anchor: 'x', title: 'T', text: `${'mot '.repeat(30)}cible ${'mot '.repeat(30)}` };
    const [hit] = search([doc], 'cible');
    expect(hit!.before.startsWith('…')).toBe(true);
    expect(hit!.after.endsWith('…')).toBe(true);
    expect(hit!.before.length).toBeLessThanOrEqual(42);
  });

  it('finds Markdown sections and top-level values', () => {
    expect(search(docs, 'haute tension').map((h) => h.doc.anchor)).toEqual(['notes-de-scene-seraphina']);
    expect(search(docs, 'neige').map((h) => h.doc.anchor)).toEqual(['chronologie-meteo']);
  });

  it('finds nested entries on their own anchor', () => {
    expect(search(docs, 'majordome').map((h) => h.doc.anchor)).toEqual(['maison-s2']);
  });

  it('reaches entry lists nested in objects and in lists', () => {
    const extra = fixtureBible([
      {
        kind: 'yaml', path: 'bible/donnees/extra.yaml', slug: 'extra', title: 'Extra', legend: null, pdfs: [],
        data: { a: { b: [{ titre: 'Profond', x: 'abysse' }] }, l: [[{ titre: 'Liste', x: 'gouffre' }]] },
      },
    ]);
    const more = searchDocs(extra, characterIndex(extra));
    expect(search(more, 'abysse').map((h) => h.doc.anchor)).toEqual(['extra-a-b-0']);
    expect(search(more, 'gouffre').map((h) => h.doc.anchor)).toEqual(['extra-l-0-0']);
  });

  it('gives unique anchors even when a file repeats ids', () => {
    const extra = fixtureBible([
      {
        kind: 'yaml', path: 'bible/donnees/fiches.yaml', slug: 'fiches', title: 'Fiches', legend: null, pdfs: [],
        data: { avant: [{ id: 'SER', note: 'un' }], apres: [{ id: 'SER', note: 'deux' }, { id: 'WHI', note: 'trois' }] },
      },
    ]);
    const anchors = searchDocs(extra, characterIndex(extra)).filter((d) => d.slug === 'fiches').map((d) => d.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(anchors).toContain('fiches-whi');
  });
});
