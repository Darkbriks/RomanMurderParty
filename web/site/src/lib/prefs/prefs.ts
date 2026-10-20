// Pure preference logic (no runes) so it can be unit tested; prefs.svelte.ts holds the reactive state.
export type Mode = 'scroll' | 'paged' | 'book';
export type Theme = 'paper' | 'sepia' | 'dark';
export interface Prefs {
  fontStep: 0 | 1 | 2 | 3 | 4;
  theme: Theme | null;
  mode: Mode;
  notes: boolean;
  lang: 'fr' | 'en';
  tocOpen: boolean | null;
}

export const STORAGE_KEY = 'rmp.prefs.v1';
export const FONT_STEPS_PX: readonly number[] = [16, 18, 20, 22, 25];
export const DEFAULT_PREFS: Prefs = {
  fontStep: 1,
  theme: null,
  mode: 'scroll',
  notes: false,
  lang: 'fr',
  tocOpen: null,
};

const THEMES: readonly unknown[] = ['paper', 'sepia', 'dark'];
const MODES: readonly unknown[] = ['scroll', 'paged', 'book'];

export function readPrefs(storage: Pick<Storage, 'getItem'> | null): Prefs {
  const prefs: Prefs = { ...DEFAULT_PREFS };
  let raw: string | null = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return prefs;
  }
  if (!raw) return prefs;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return prefs;
  }
  if (typeof o !== 'object' || o === null) return prefs;
  const s = o as Record<string, unknown>;
  if (Number.isInteger(s.fontStep) && (s.fontStep as number) >= 0 && (s.fontStep as number) < FONT_STEPS_PX.length)
    prefs.fontStep = s.fontStep as Prefs['fontStep'];
  if (s.theme === null || THEMES.includes(s.theme)) prefs.theme = s.theme as Theme | null;
  if (MODES.includes(s.mode)) prefs.mode = s.mode as Mode;
  if (typeof s.notes === 'boolean') prefs.notes = s.notes;
  if (s.lang === 'fr' || s.lang === 'en') prefs.lang = s.lang;
  if (s.tocOpen === null || typeof s.tocOpen === 'boolean') prefs.tocOpen = s.tocOpen;
  return prefs;
}

export function writePrefs(storage: Pick<Storage, 'setItem'> | null, prefs: Prefs): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable or full: preferences simply stay in memory
  }
}

export function effectiveTheme(p: Prefs, prefersDark: boolean): Theme {
  return p.theme ?? (prefersDark ? 'dark' : 'paper');
}

/** The view a stored mode opens. Book pages (the PDF) are not built yet, so that mode reads as scrolling. */
export function effectiveMode(mode: Mode): 'scroll' | 'paged' {
  return mode === 'paged' ? 'paged' : 'scroll';
}
