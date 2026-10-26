import type { CharacterIndex } from './catalog.ts';
import type { Relation } from './shapes.ts';

/**
 * Relations as a matrix: who thinks in rows, who is thought of in columns, both ordered like the
 * characters, then the unknown ids in order of appearance. A missing pair: the sources say nothing.
 */
export function relationsMatrix(rels: Relation[], index: CharacterIndex): { rows: string[]; cols: string[]; at(from: string, to: string): Relation | null } {
  const order = (ids: string[]): string[] => {
    const present = new Set(ids);
    const known = index.list.map((c) => c.id).filter((id) => present.has(id));
    return [...known, ...[...present].filter((id) => !index.byId.has(id))];
  };
  const pairs = new Map<string, Relation>();
  for (const r of rels) if (!pairs.has(`${r.from}>${r.to}`)) pairs.set(`${r.from}>${r.to}`, r);
  return {
    rows: order(rels.map((r) => r.from)),
    cols: order(rels.map((r) => r.to)),
    at: (from, to) => pairs.get(`${from}>${to}`) ?? null,
  };
}
