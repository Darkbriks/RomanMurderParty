import { browser } from '$app/env';
import { MediaQuery } from 'svelte/reactivity';
import { DEFAULT_PREFS, effectiveTheme, FONT_STEPS_PX, readPrefs, writePrefs, type Prefs } from './prefs.ts';

export * from './prefs.ts';

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Reactive preferences. The server render and the first client render both use the defaults, so
 * hydration always matches; `startPrefs()` then applies the stored values. Theme and font size are
 * already on <html> by then (pre-paint script in app.html), so nothing flashes.
 */
export const prefs: Prefs = $state({ ...DEFAULT_PREFS });

/** Whether `startPrefs()` has run: browser-only values (media queries) are safe to show from then on. */
export const prefsState = $state({ started: false });

const systemDark = new MediaQuery('(prefers-color-scheme: dark)', false);

/**
 * Loads the stored preferences, then keeps localStorage and <html> (data-theme, --font-size,
 * data-toc, lang) in sync with every later change. Call once, after mount.
 */
export function startPrefs(): void {
  if (!browser || prefsState.started) return;
  Object.assign(prefs, readPrefs(safeStorage()));
  prefsState.started = true;
  $effect.root(() => {
    $effect(() => {
      writePrefs(safeStorage(), $state.snapshot(prefs));
    });
    $effect(() => {
      const root = document.documentElement;
      root.setAttribute('data-theme', effectiveTheme(prefs, systemDark.current));
      root.style.setProperty('--font-size', `${FONT_STEPS_PX[prefs.fontStep]}px`);
      root.lang = prefs.lang;
      if (prefs.tocOpen === null) root.removeAttribute('data-toc');
      else root.setAttribute('data-toc', prefs.tocOpen ? 'open' : 'closed');
      // Hydrated, with the stored preferences applied: the e2e tests wait for this before acting.
      root.setAttribute('data-ready', '');
    });
  });
}
