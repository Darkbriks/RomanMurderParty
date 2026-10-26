import type { BibleYamlFile } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { asChronology, asHouse, asRelations } from './shapes.ts';
import { fixtureBible } from './test-fixture.ts';

const data = (slug: string) => (fixtureBible().files.find((f) => f.slug === slug) as BibleYamlFile).data;

describe('asChronology', () => {
  const chrono = asChronology(data('chronologie'))!;

  it('reads phases, groups, events and the events of everyone', () => {
    expect(chrono.phases.map((p) => [p.id, p.title, p.summary])).toEqual([
      ['P0', 'Après-midi', 'Préparatifs'],
      ['P1', 'Les arrivées', 'De 21 h au dernier invité'],
    ]);
    expect(chrono.groups).toEqual([{ label: 'La maison', members: ['WHI', 'SER'] }]);
    expect(chrono.all.map((e) => e.what)).toEqual(['Tout le monde arrive.']);
    expect(chrono.all[0]!.path).toEqual(['tous', 0]);
  });

  it('turns single values of qui and phase into lists', () => {
    expect(chrono.events[1]).toMatchObject({ who: ['MON', 'REG'], phases: ['P1'], time: '21:22', status: 'decide' });
    expect(chrono.events[2]).toMatchObject({ who: ['SER'], phases: ['P0', 'P1'], time: null, source: null });
    expect(chrono.events[2]!.path).toEqual(['evenements', 2]);
  });

  it('refuses data of another shape', () => {
    expect(asChronology({ evenements: [] })).toBeNull();
    expect(asChronology({ phases: [{ id: 'P0', titre: 'x' }], evenements: [{ qui: 'A' }] })).toBeNull();
    expect(asChronology('x')).toBeNull();
  });
});

describe('asRelations', () => {
  it('reads relations', () => {
    const rels = asRelations(data('relations'))!;
    expect(rels).toHaveLength(4);
    expect(rels[0]).toMatchObject({ from: 'SER', to: 'WHI', valence: -2, ambivalent: true, label: 'Menace maternelle', source: 'fiche', note: null, path: ['relations', 0] });
  });

  it('refuses a valence that is not a number', () => {
    expect(asRelations({ relations: [{ de: 'A', vers: 'B', valence: 'fort' }] })).toBeNull();
    expect(asRelations({ autre: [] })).toBeNull();
  });
});

describe('asHouse', () => {
  it('reads levels and rooms', () => {
    const house = asHouse(data('maison'))!;
    expect(house.map((l) => l.title)).toEqual(['Sous-sol']);
    expect(house[0]!.rooms.map((r) => r.num)).toEqual(['S1', 'S2']);
    expect(house[0]!.rooms[1]!.path).toEqual(['niveaux', 0, 'pieces', 1]);
  });

  it('refuses data of another shape', () => {
    expect(asHouse({ niveaux: 'x' })).toBeNull();
    expect(asHouse({ niveaux: [{ titre: 'A', pieces: [{ nom: 'sans numéro' }] }] })).toBeNull();
  });
});
