import { slugify, type Bible, type BibleFile, type BibleValue } from '@rmp/model';

// What every bible view shares: the characters (from the file `personnages`), how a value refers
// to one of them, labels for keys, titles and anchors for entries. Pure, so it is unit tested.

export interface BibleCharacter {
  id: string;
  /** `nom`, or the id. */
  name: string;
  /** The everyday name: the first form of `usuel`, else `nom`. */
  short: string;
  /** The key of `personnages.yaml` that lists them, made readable. */
  group: string;
  entry: Record<string, BibleValue>;
}

export interface CharacterIndex {
  list: BibleCharacter[];
  byId: ReadonlyMap<string, BibleCharacter>;
}

export const isRecord = (v: BibleValue | undefined): v is Record<string, BibleValue> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text = (v: BibleValue | undefined): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

/** The forms of `usuel`: « Lady Fairfax, Monica » gives both, nicknames in « » dropped. */
export function usualForms(entry: Record<string, BibleValue>): string[] {
  return (text(entry.usuel) ?? '')
    .split(/[,;]/)
    .map((f) => f.replace(/«[^»]*»/g, '').trim())
    .filter(Boolean);
}

export function shortName(entry: Record<string, BibleValue>): string {
  return usualForms(entry)[0] ?? text(entry.nom) ?? text(entry.id) ?? '';
}

export function characterIndex(bible: Bible): CharacterIndex {
  const file = bible.files.find((f) => f.slug === 'personnages');
  const list: BibleCharacter[] = [];
  if (file?.kind === 'yaml' && isRecord(file.data)) {
    for (const [key, value] of Object.entries(file.data)) {
      if (!Array.isArray(value)) continue;
      for (const entry of value) {
        if (!isRecord(entry) || typeof entry.id !== 'string') continue;
        list.push({ id: entry.id, name: text(entry.nom) ?? entry.id, short: shortName(entry), group: humanizeKey(key), entry });
      }
    }
  }
  return { list, byId: new Map(list.map((c) => [c.id, c])) };
}

/** A value that names a known character: its id, or `suit:<id>` (a vote that follows theirs). */
export function refOf(value: BibleValue, index: CharacterIndex): { character: BibleCharacter; follows: boolean } | null {
  if (typeof value !== 'string') return null;
  const follows = value.startsWith('suit:');
  const character = index.byId.get(follows ? value.slice(5) : value);
  return character ? { character, follows } : null;
}

const LABELS: Record<string, string> = {
  a_placer: 'À placer',
  a_verifier: 'À vérifier',
  absents_et_figurants: 'Absents et figurants',
  age: 'Âge',
  au_coeur: 'Au cœur',
  consequence: 'Conséquence',
  debut_reception: 'Début de la réception',
  desc: 'Description',
  etat: 'État',
  evenements: 'Événements',
  heures_absolues: 'Heures absolues',
  hotesse: 'Hôtesse',
  hotesse_raison_cachee: 'Raison cachée de l’hôtesse',
  invites: 'Invités',
  libelle: 'Libellé',
  libertes: 'Libertés',
  lien_avec_marcus: 'Lien avec Marcus',
  lieux_fixes: 'Lieux fixés',
  meteo: 'Météo',
  nom_de_naissance: 'Nom de naissance',
  pieces: 'Pièces',
  pourquoi_londres: 'Pourquoi Londres',
  raison_cachee: 'Raison cachée',
  resume: 'Résumé',
  role: 'Rôle',
  role_recit: 'Rôle dans le récit',
  soupconnent: 'Soupçonnent',
  verifie_le: 'Vérifié le',
  verifies: 'Vérifiés',
};

/** A key as a label: known keys get their accents back, others just lose their underscores. */
export function humanizeKey(key: string): string {
  const plain = key.replace(/_+/g, ' ').trim();
  return LABELS[key] ?? plain.charAt(0).toUpperCase() + plain.slice(1);
}

const TITLE_KEYS = ['titre', 'nom', 'sujet', 'qui', 'id'];

/** The key that titles an entry: the first of titre, nom, sujet, qui, id it has. */
export const titleKey = (obj: Record<string, BibleValue>): string | null =>
  TITLE_KEYS.find((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '') ?? null;

/** The title of an entry: its first title-like key, ids replaced by names. */
export function entryTitle(obj: Record<string, BibleValue>, index: CharacterIndex): string | null {
  const key = titleKey(obj);
  if (!key) return null;
  const name = (v: BibleValue): string => refOf(v, index)?.character.short ?? String(v);
  const value = obj[key]!;
  return Array.isArray(value) ? value.map(name).join(' et ') : name(value);
}

/** The HTML id of an entry or a section: from its `id` or `num` when it has one, else its path. */
export function anchorFor(slug: string, path: readonly (string | number)[], obj?: Record<string, BibleValue>): string {
  const own = obj?.id ?? obj?.num;
  if (typeof own === 'string' || typeof own === 'number') return `${slug}-${slugify(String(own))}`;
  return [slug, ...path.map((p) => slugify(String(p)))].join('-');
}

/** Keys shown as small labels (status, source, vote…). */
export const STATUS_KEYS: ReadonlySet<string> = new Set(['statut', 'etat', 'triplet', 'source', 'vote', 'role_recit']);

const ORDER = [
  'personnages', 'chronologie', 'relations', 'intrigues', 'invitations', 'vote', 'reperes-historiques', 'maison',
  'bible', 'notes-de-scene',
];

/** The files in reading order: the known ones first, the others by title. */
export function orderedFiles(bible: Bible): BibleFile[] {
  const rank = (f: BibleFile): number => {
    const i = ORDER.indexOf(f.slug);
    return i < 0 ? ORDER.length : i;
  };
  return [...bible.files].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'fr'));
}

export const fileBySlug = (bible: Bible, slug: string): BibleFile | null => bible.files.find((f) => f.slug === slug) ?? null;
