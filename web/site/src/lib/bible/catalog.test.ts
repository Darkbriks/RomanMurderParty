import type { BibleValue } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { ambiguousIds, anchorFor, characterIndex, entryTitle, humanizeKey, orderedFiles, refOf, shortName, titleKey } from './catalog.ts';
import { fixtureBible } from './test-fixture.ts';

const bible = fixtureBible();
const index = characterIndex(bible);
const byId = (id: string) => index.byId.get(id)!;

describe('characterIndex', () => {
  it('lists the characters by group, in file order', () => {
    expect(index.list.map((c) => c.id)).toEqual(['SER', 'WHI', 'EVA', 'MON', 'REG', 'BLA', 'DOM']);
    expect(byId('SER').group).toBe('Personnages');
    expect(byId('DOM').group).toBe('Absents et figurants');
    expect(byId('SER').name).toBe('Seraphina Blackwood');
  });

  it('is empty without a characters file', () => {
    expect(characterIndex({ schemaVersion: 1, files: [] }).list).toEqual([]);
  });
});

describe('shortName', () => {
  it('takes the first form of usuel, without the nickname, else the name', () => {
    expect(byId('SER').short).toBe('Seraphina');
    expect(byId('WHI').short).toBe('Lady Whitmore');
    expect(byId('MON').short).toBe('Lady Fairfax');
    expect(byId('DOM').short).toBe('Le domestique hypnotisé');
    expect(shortName({ id: 'ZZZ' })).toBe('ZZZ');
  });
});

describe('refOf', () => {
  it('recognises known ids and suit:<id>', () => {
    expect(refOf('SER', index)).toEqual({ character: byId('SER'), follows: false });
    expect(refOf('suit:WHI', index)).toEqual({ character: byId('WHI'), follows: true });
  });

  it('leaves anything else alone, unknown ids included', () => {
    for (const v of ['XYZ', 'suit:XYZ', 'Seraphina', 3, null, true]) expect(refOf(v, index)).toBeNull();
  });
});

describe('humanizeKey', () => {
  it('restores accents for known keys, and spaces otherwise', () => {
    expect(humanizeKey('raison_cachee')).toBe('Raison cachée');
    expect(humanizeKey('cle_inedite')).toBe('Cle inedite');
    expect(humanizeKey('absents_et_figurants')).toBe('Absents et figurants');
  });
});

describe('entryTitle', () => {
  it('uses the first title-like key, with character names', () => {
    expect(entryTitle({ qui: ['MON', 'REG'], invitation: 'x' }, index)).toBe('Lady Fairfax et Lord Fairfax');
    expect(entryTitle({ sujet: 'Arsenic', titre: 'T' }, index)).toBe('T');
    expect(entryTitle({ qui: 'XYZ' }, index)).toBe('XYZ');
    expect(entryTitle({ detail: 1 }, index)).toBeNull();
  });
});

describe('anchorFor', () => {
  it('uses an id or a number when the entry has one, its path otherwise', () => {
    expect(anchorFor('personnages', ['personnages', 0], { id: 'SER' })).toBe('personnages-ser');
    expect(anchorFor('maison', ['niveaux', 0, 'pieces', 2], { num: 'S3' })).toBe('maison-s3');
    expect(anchorFor('vote', ['votes', 4], { qui: 'SER' })).toBe('vote-votes-4');
    expect(anchorFor('vote', ['contexte'])).toBe('vote-contexte');
  });
});

describe('orderedFiles', () => {
  it('puts the known files first, then the others by title', () => {
    const extra = fixtureBible([
      { kind: 'yaml', path: 'bible/donnees/zeta.yaml', slug: 'zeta', title: 'Zeta', legend: null, data: {}, pdfs: [] },
      { kind: 'yaml', path: 'bible/donnees/alpha.yaml', slug: 'alpha', title: 'Alpha', legend: null, data: {}, pdfs: [] },
    ]);
    expect(orderedFiles(extra).map((f) => f.slug)).toEqual([
      'personnages', 'chronologie', 'relations', 'vote', 'maison', 'notes-de-scene', 'alpha', 'zeta',
    ]);
  });
});

describe('anchors stay unique when ids repeat', () => {
  it('lists the id and num values a file repeats, as anchors (so SER and ser collide too)', () => {
    const data: BibleValue = { a: [{ id: 'SER' }, { id: 'WHI' }], b: [{ id: 'ser' }, { num: 'S1' }, { num: 'S1' }] };
    expect([...ambiguousIds(data)].sort()).toEqual(['s1', 'ser']);
  });

  it('falls back to the path for a repeated id', () => {
    const ambiguous = new Set(['ser']);
    expect(anchorFor('f', ['a', 0], { id: 'SER' }, ambiguous)).toBe('f-a-0');
    expect(anchorFor('f', ['a', 1], { id: 'WHI' }, ambiguous)).toBe('f-whi');
  });
});

describe('titles never print an object', () => {
  it('skips title keys that hold objects', () => {
    expect(titleKey({ titre: { a: 1 }, nom: 'B' })).toBe('nom');
    expect(entryTitle({ titre: { a: 1 }, nom: 'B' }, index)).toBe('B');
    expect(entryTitle({ titre: [{ a: 1 }] }, index)).toBeNull();
    expect(entryTitle({ qui: ['SER', 'WHI'] }, index)).toBe('Seraphina et Lady Whitmore');
  });
});
