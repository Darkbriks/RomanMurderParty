import type { BibleValue } from '@rmp/model';
import { isRecord } from './catalog.ts';

// The shapes the dedicated views recognise. Each reader returns null as soon as the data differs
// from what its view expects: the file then shows through the generic view, never broken.

export interface Phase {
  id: string;
  title: string;
  summary: string | null;
}

export interface ChronoEvent {
  who: string[];
  phases: string[];
  what: string;
  time: string | null;
  status: string | null;
  source: string | null;
  path: (string | number)[];
  raw: Record<string, BibleValue>;
}

export interface Chronology {
  phases: Phase[];
  groups: { label: string; members: string[] }[];
  events: ChronoEvent[];
  /** The events of `tous`, for everyone. */
  all: ChronoEvent[];
}

/** The keys of the chronology its grid shows; the others go through the generic view. */
export const CHRONOLOGY_KEYS: readonly string[] = ['phases', 'groupes', 'tous', 'evenements'];

const str = (v: BibleValue | undefined): string | null =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null;

/** A string, or a list of strings; anything else is null. */
function strings(v: BibleValue | undefined): string[] | null {
  if (v === undefined || v === null) return [];
  if (typeof v === 'string') return [v];
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null;
}

function event(raw: BibleValue, path: (string | number)[]): ChronoEvent | null {
  if (!isRecord(raw)) return null;
  const who = strings(raw.qui);
  const phases = strings(raw.phase);
  const what = str(raw.quoi);
  if (!who || !phases || phases.length === 0 || what === null) return null;
  return { who, phases, what, time: str(raw.heure), status: str(raw.statut), source: str(raw.source), path, raw };
}

/** A list of events, or null if one of them is not an event. */
function events(list: BibleValue | undefined, key: string): ChronoEvent[] | null {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return null;
  const out = list.map((e, i) => event(e, [key, i]));
  return out.every((e) => e !== null) ? (out as ChronoEvent[]) : null;
}

export function asChronology(data: BibleValue): Chronology | null {
  if (!isRecord(data) || !Array.isArray(data.phases) || !Array.isArray(data.evenements)) return null;
  const phases: Phase[] = [];
  for (const p of data.phases) {
    if (!isRecord(p) || typeof p.id !== 'string' || typeof p.titre !== 'string') return null;
    phases.push({ id: p.id, title: p.titre, summary: str(p.resume) });
  }
  const groups: Chronology['groups'] = [];
  if (data.groupes !== undefined) {
    if (!Array.isArray(data.groupes)) return null;
    for (const g of data.groupes) {
      const members = isRecord(g) ? strings(g.personnages) : null;
      if (!isRecord(g) || typeof g.groupe !== 'string' || !members) return null;
      groups.push({ label: g.groupe, members });
    }
  }
  const evs = events(data.evenements, 'evenements');
  const all = events(data.tous, 'tous');
  return evs && all ? { phases, groups, events: evs, all } : null;
}

export interface Relation {
  from: string;
  to: string;
  valence: number;
  label: string | null;
  note: string | null;
  source: string | null;
  ambivalent: boolean;
  path: (string | number)[];
  raw: Record<string, BibleValue>;
}

export const RELATIONS_KEYS: readonly string[] = ['relations'];

export function asRelations(data: BibleValue): Relation[] | null {
  if (!isRecord(data) || !Array.isArray(data.relations)) return null;
  const out: Relation[] = [];
  for (const [i, r] of data.relations.entries()) {
    if (!isRecord(r) || typeof r.de !== 'string' || typeof r.vers !== 'string' || typeof r.valence !== 'number') return null;
    out.push({
      from: r.de,
      to: r.vers,
      valence: r.valence,
      label: str(r.libelle),
      note: str(r.note),
      source: str(r.source),
      ambivalent: r.ambivalent === true,
      path: ['relations', i],
      raw: r,
    });
  }
  return out;
}

export interface Room {
  num: string;
  raw: Record<string, BibleValue>;
  path: (string | number)[];
}

export interface Level {
  title: string;
  raw: Record<string, BibleValue>;
  path: (string | number)[];
  rooms: Room[];
}

/** Fields of a room that only feed the TikZ plan generator. */
export const HOUSE_HIDDEN: ReadonlySet<string> = new Set(['rect', 'portes', 'tikz_extra', 'etiquette']);

export function asHouse(data: BibleValue): Level[] | null {
  if (!isRecord(data) || !Array.isArray(data.niveaux)) return null;
  const levels: Level[] = [];
  for (const [i, l] of data.niveaux.entries()) {
    if (!isRecord(l) || typeof l.titre !== 'string' || !Array.isArray(l.pieces)) return null;
    const rooms: Room[] = [];
    for (const [j, r] of l.pieces.entries()) {
      if (!isRecord(r) || str(r.num) === null || typeof r.nom !== 'string') return null;
      rooms.push({ num: str(r.num)!, raw: r, path: ['niveaux', i, 'pieces', j] });
    }
    levels.push({ title: l.titre, raw: l, path: ['niveaux', i], rooms });
  }
  return levels;
}
