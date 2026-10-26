import type { BibleYamlFile } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { chronologyGrid } from './chronology.ts';
import { asChronology, type Chronology } from './shapes.ts';
import { fixtureBible } from './test-fixture.ts';

const bible = fixtureBible();
const chrono = asChronology((bible.files.find((f) => f.slug === 'chronologie') as BibleYamlFile).data)!;
const grid = chronologyGrid(chrono);

describe('chronologyGrid', () => {
  it('follows the groups, then the others in order of appearance, unknown ids included', () => {
    expect(grid.sections.map((s) => s.label)).toEqual(['La maison', null]);
    expect(grid.sections[0]!.rows.map((r) => r.id)).toEqual(['WHI', 'SER']);
    expect(grid.sections[1]!.rows.map((r) => r.id)).toEqual(['MON', 'REG', 'XYZ', 'BLA']);
  });

  it('puts an event in every cell of its people and phases', () => {
    const ser = grid.sections[0]!.rows[1]!;
    expect(ser.cells.map((c) => c.map((e) => e.what))).toEqual([['Répète toute la journée.'], ['Répète toute la journée.']]);
    const reg = grid.sections[1]!.rows[1]!;
    expect(reg.cells.map((c) => c.length)).toEqual([0, 1]);
  });

  it('gives the events of everyone their own row', () => {
    expect(grid.all.map((c) => c.map((e) => e.what))).toEqual([[], ['Tout le monde arrive.']]);
  });

  it('leaves out characters with no event and no group', () => {
    expect(grid.sections.flatMap((s) => s.rows.map((r) => r.id))).not.toContain('EVA');
  });

  it('keeps the events it cannot place: unknown phase, nobody', () => {
    const orphan = (what: string, who: string[], phases: string[]) => ({ ...chrono.events[0]!, what, who, phases });
    const more: Chronology = {
      ...chrono,
      events: [...chrono.events, orphan('Phase inconnue.', ['WHI'], ['P42']), orphan('Personne.', [], ['P0'])],
    };
    expect(chronologyGrid(more).orphans.map((e) => e.what)).toEqual(['Phase inconnue.', 'Personne.']);
    expect(grid.orphans).toEqual([]);
  });
});
