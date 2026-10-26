import type { BibleYamlFile } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { characterIndex } from './catalog.ts';
import { mentions, mentionsIn, noteHeadingMatches, relationsOf, sceneNotesFor, timelineOf } from './character.ts';
import { asChronology, asRelations } from './shapes.ts';
import { fixtureBible } from './test-fixture.ts';

const bible = fixtureBible();
const index = characterIndex(bible);
const file = (slug: string) => bible.files.find((f) => f.slug === slug) as BibleYamlFile;

describe('noteHeadingMatches', () => {
  it('matches everyday names and the words of a name nobody else bears', () => {
    expect(noteHeadingMatches('Blackstone', index)).toEqual(['BLA']);
    expect(noteHeadingMatches('Monica et Reginald', index)).toEqual(['MON', 'REG']);
    expect(noteHeadingMatches('Lady Whitmore', index)).toEqual(['WHI']);
    expect(noteHeadingMatches('Evangeline', index)).toEqual(['EVA']);
    expect(noteHeadingMatches('Séraphina', index)).toEqual(['SER']);
    expect(noteHeadingMatches('Personne', index)).toEqual([]);
  });
});

describe('sceneNotesFor', () => {
  it('gives the level-2 sections that name the character', () => {
    expect(sceneNotesFor(bible, index, 'REG').map((s) => s.heading)).toEqual(['Monica et Reginald']);
    expect(sceneNotesFor(bible, index, 'DOM')).toEqual([]);
  });
});

describe('relationsOf', () => {
  it('splits what they think of others from what others think of them', () => {
    const { from, to } = relationsOf(asRelations(file('relations').data)!, 'SER');
    expect(from.map((r) => r.to)).toEqual(['WHI', 'EVA', 'XYZ']);
    expect(to.map((r) => r.from)).toEqual(['WHI']);
  });
});

describe('timelineOf', () => {
  it('lists every phase, with their own events and those of everyone', () => {
    const line = timelineOf(asChronology(file('chronologie').data)!, 'MON');
    expect(line.map((p) => p.phase.id)).toEqual(['P0', 'P1']);
    expect(line[0]!.events).toEqual([]);
    expect(line[1]!.events.map((e) => e.what)).toEqual(['Arrivée calculée.']);
    expect(line[1]!.all.map((e) => e.what)).toEqual(['Tout le monde arrive.']);
  });
});

describe('mentions', () => {
  it('finds an id or suit:<id> at any depth', () => {
    expect(mentions({ a: [{ b: 'SER' }] }, 'SER')).toBe(true);
    expect(mentions({ vote: 'suit:SER' }, 'SER')).toBe(true);
    expect(mentions({ texte: 'SER et WHI' }, 'SER')).toBe(false);
  });

  it('collects the top-level entries of a file that mention the character', () => {
    expect(mentionsIn(file('vote'), 'SER').map((m) => m.anchor)).toEqual(['vote-votes-0', 'vote-votes-1']);
    expect(mentionsIn(file('personnages'), 'SER')).toEqual([]);
  });

  it('leaves out what a dedicated section already shows', () => {
    expect(mentionsIn(file('relations'), 'SER')).toEqual([]);
    expect(mentionsIn(file('chronologie'), 'SER')).toEqual([]);
  });
});
