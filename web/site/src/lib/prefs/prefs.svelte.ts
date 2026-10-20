import { browser } from '$app/env';
import { DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from './prefs.ts';

export * from './prefs.ts';

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** Reactive preferences, loaded from localStorage in the browser. Call `persistPrefs()` after changing a field. */
export const prefs: Prefs = $state(browser ? readPrefs(safeStorage()) : { ...DEFAULT_PREFS });

export function persistPrefs(): void {
  if (browser) writePrefs(safeStorage(), $state.snapshot(prefs));
}
