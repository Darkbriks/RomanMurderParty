import type { Bible, BibleValue, BibleYamlFile, MarkdownSection } from '@rmp/model';
import { anchorFor, isRecord, usualForms, type CharacterIndex } from './catalog.ts';
import { foldForSearch } from './search.ts';
import { asChronology, asRelations, CHRONOLOGY_KEYS, RELATIONS_KEYS, type ChronoEvent, type Chronology, type Phase, type Relation } from './shapes.ts';

// What a character page gathers from the whole bible.

/** Whether a value names the character, at any depth: their id, or `suit:<id>`. */
export function mentions(value: BibleValue, id: string): boolean {
  if (typeof value === 'string') return value === id || value === `suit:${id}`;
  if (Array.isArray(value)) return value.some((v) => mentions(v, id));
  if (isRecord(value)) return Object.values(value).some((v) => mentions(v, id));
  return false;
}

export function relationsOf(relations: Relation[], id: string): { from: Relation[]; to: Relation[] } {
  return { from: relations.filter((r) => r.from === id), to: relations.filter((r) => r.to === id) };
}

/**
 * Every phase, with the character's own events (none: a gap to fill) and those of everyone, kept
 * apart so that a phase where only everyone does something still shows as a gap.
 */
export function timelineOf(chrono: Chronology, id: string): { phase: Phase; events: ChronoEvent[]; all: ChronoEvent[] }[] {
  return chrono.phases.map((phase) => ({
    phase,
    events: chrono.events.filter((e) => e.who.includes(id) && e.phases.includes(phase.id)),
    all: chrono.all.filter((e) => e.phases.includes(phase.id)),
  }));
}

/**
 * The entries of a file's top-level lists that mention the character, except in the characters
 * file and in what the page's dedicated sections already show (relations, the evening).
 */
export function mentionsIn(file: BibleYamlFile, id: string): { anchor: string; key: string; value: Record<string, BibleValue> }[] {
  if (file.slug === 'personnages' || !isRecord(file.data)) return [];
  const shown = new Set([
    ...(asChronology(file.data) ? CHRONOLOGY_KEYS : []),
    ...(asRelations(file.data) ? RELATIONS_KEYS : []),
  ]);
  const out: { anchor: string; key: string; value: Record<string, BibleValue> }[] = [];
  for (const [key, list] of Object.entries(file.data)) {
    if (shown.has(key) || !Array.isArray(list)) continue;
    list.forEach((entry, i) => {
      if (isRecord(entry) && mentions(entry, id)) out.push({ anchor: anchorFor(file.slug, [key, i], entry), key, value: entry });
    });
  }
  return out;
}

const fold = (s: string): string => foldForSearch(s).folded;
const words = (s: string): string[] => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The characters a scene-notes heading names: one of their everyday names (`usuel`), or a word of
 * four letters or more of their `nom` that no other character bears (« Blackstone », not « Whitmore »).
 */
export function noteHeadingMatches(heading: string, index: CharacterIndex): string[] {
  const counts = new Map<string, number>();
  for (const c of index.list) for (const w of new Set(words(c.name))) counts.set(w, (counts.get(w) ?? 0) + 1);
  const h = fold(heading);
  return index.list
    .filter((c) => {
      const forms = [...usualForms(c.entry).map(fold), ...words(c.name).filter((w) => w.length >= 4 && counts.get(w) === 1)];
      return forms.some((f) => f && new RegExp(`(^|[^\\p{L}\\p{N}])${escape(f)}($|[^\\p{L}\\p{N}])`, 'u').test(h));
    })
    .map((c) => c.id);
}

export function sceneNotesFor(bible: Bible, index: CharacterIndex, id: string): MarkdownSection[] {
  const file = bible.files.find((f) => f.slug === 'notes-de-scene');
  if (file?.kind !== 'markdown') return [];
  return file.sections.filter((s) => s.level === 2 && noteHeadingMatches(s.heading, index).includes(id));
}
