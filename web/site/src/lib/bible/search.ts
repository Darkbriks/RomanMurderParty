import type { Bible, BibleValue } from '@rmp/model';
import { anchorFor, entryTitle, humanizeKey, isRecord, refOf, type CharacterIndex } from './catalog.ts';

// Search through the whole bible, in the browser. At this size (a few thousand lines) a substring
// search over prepared documents is instant; no index library needed.

/** One searchable unit: an entry of a YAML list (any depth), a top-level value, a Markdown section. */
export interface SearchDoc {
  slug: string;
  fileTitle: string;
  /** The HTML id the views give this unit. */
  anchor: string;
  title: string;
  text: string;
}

export interface SearchHit {
  doc: SearchDoc;
  before: string;
  match: string;
  after: string;
}

/**
 * `s` without case, accents nor curly apostrophes, blanks collapsed; `map[i]` is the index in `s`
 * of the character the i-th folded character comes from.
 */
export function foldForSearch(s: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; ) {
    const ch = String.fromCodePoint(s.codePointAt(i)!);
    let f = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’‘]/g, "'");
    if (/^\s$/.test(f)) f = folded.endsWith(' ') ? '' : ' ';
    for (const c of f) {
      folded += c;
      map.push(i);
    }
    i += ch.length;
  }
  return { folded, map };
}

const isEntryList = (v: BibleValue | undefined): boolean => Array.isArray(v) && v.some(isRecord);

/** The text of a value for search; ids also give their character's names, entry lists are left out. */
function textOf(v: BibleValue, index: CharacterIndex): string {
  if (typeof v === 'string') {
    const ref = refOf(v, index);
    return ref ? `${v} ${ref.character.short} ${ref.character.name}` : v;
  }
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return isEntryList(v) ? '' : v.map((x) => textOf(x, index)).join(' ');
  if (isRecord(v)) return Object.values(v).map((x) => (isEntryList(x) ? '' : textOf(x, index))).join(' ');
  return '';
}

export function searchDocs(bible: Bible, index: CharacterIndex): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const file of bible.files) {
    const doc = (anchor: string, title: string, text: string) =>
      docs.push({ slug: file.slug, fileTitle: file.title, anchor, title, text });
    if (file.kind === 'markdown') {
      for (const s of file.sections) doc(s.id, s.heading || file.title, s.text);
      continue;
    }
    // Every object in a list, at any depth, is a document of its own (the views give it an anchor).
    const walkList = (list: BibleValue[], path: (string | number)[], fallback: string): void => {
      list.forEach((item, i) => {
        if (Array.isArray(item)) return walkValue(item, [...path, i], fallback);
        if (!isRecord(item)) return;
        doc(anchorFor(file.slug, [...path, i], item), entryTitle(item, index) ?? fallback, textOf(item, index));
        for (const [key, v] of Object.entries(item)) walkValue(v, [...path, i, key], humanizeKey(key));
      });
    };
    const walkValue = (v: BibleValue, path: (string | number)[], fallback: string): void => {
      if (Array.isArray(v)) walkList(v, path, fallback);
      else if (isRecord(v)) for (const [key, x] of Object.entries(v)) walkValue(x, [...path, key], humanizeKey(key));
    };
    const data = file.data;
    if (isRecord(data)) {
      for (const [key, v] of Object.entries(data)) {
        if (!isEntryList(v)) doc(anchorFor(file.slug, [key]), humanizeKey(key), textOf(v, index));
        walkValue(v, [key], humanizeKey(key));
      }
    } else if (Array.isArray(data)) {
      walkList(data, [], file.title);
    } else {
      doc(file.slug, file.title, textOf(data, index));
    }
  }
  return docs;
}

const CONTEXT = 40;
const folds = new WeakMap<SearchDoc, { title: ReturnType<typeof foldForSearch>; text: ReturnType<typeof foldForSearch> }>();

/** Up to CONTEXT characters on each side of the match, cut at a blank, with … where cut. */
function excerpt(s: string, start: number, end: number): Omit<SearchHit, 'doc'> {
  let before = s.slice(0, start);
  let after = s.slice(end);
  if (before.length > CONTEXT) {
    const cut = before.slice(-CONTEXT);
    const blank = cut.search(/\s/);
    before = `…${blank >= 0 ? cut.slice(blank + 1) : cut}`;
  }
  if (after.length > CONTEXT) {
    const cut = after.slice(0, CONTEXT);
    const blank = cut.search(/\s\S*$/);
    after = `${blank > 0 ? cut.slice(0, blank) : cut}…`;
  }
  return { before, match: s.slice(start, end), after };
}

/** The documents containing `query` (two characters at least), in bible order, at most `limit`. */
export function search(docs: SearchDoc[], query: string, limit = 50): SearchHit[] {
  const q = foldForSearch(query.trim()).folded;
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    let f = folds.get(doc);
    if (!f) folds.set(doc, (f = { title: foldForSearch(doc.title), text: foldForSearch(doc.text) }));
    for (const [source, { folded, map }] of [[doc.text, f.text], [doc.title, f.title]] as const) {
      const at = folded.indexOf(q);
      if (at < 0) continue;
      const end = at + q.length < map.length ? map[at + q.length]! : source.length;
      hits.push({ doc, ...excerpt(source, map[at]!, end) });
      break;
    }
    if (hits.length >= limit) break;
  }
  return hits;
}
