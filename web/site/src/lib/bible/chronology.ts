import type { ChronoEvent, Chronology } from './shapes.ts';

export interface GridRow {
  id: string;
  /** One cell per phase, in the order of the phases. */
  cells: ChronoEvent[][];
}

/**
 * The chronology as a grid: one section per group of `groupes`, then a last section (label null)
 * for the ids that have events without belonging to a group, unknown ids included, in order of
 * appearance. Everyone's events (`tous`) get a row of their own.
 */
export function chronologyGrid(chrono: Chronology): { sections: { label: string | null; rows: GridRow[] }[]; all: ChronoEvent[][] } {
  const cells = (events: ChronoEvent[]): ChronoEvent[][] => chrono.phases.map((p) => events.filter((e) => e.phases.includes(p.id)));
  const row = (id: string): GridRow => ({ id, cells: cells(chrono.events.filter((e) => e.who.includes(id))) });
  const grouped = new Set(chrono.groups.flatMap((g) => g.members));
  const others = [...new Set(chrono.events.flatMap((e) => e.who))].filter((id) => !grouped.has(id));
  const sections = chrono.groups.map((g) => ({ label: g.label as string | null, rows: g.members.map(row) }));
  if (others.length > 0) sections.push({ label: null, rows: others.map(row) });
  return { sections, all: cells(chrono.all) };
}
