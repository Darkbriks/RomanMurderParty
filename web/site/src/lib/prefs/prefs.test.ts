import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, effectiveMode, effectiveTheme, FONT_STEPS_PX, readPrefs, STORAGE_KEY, writePrefs } from './prefs';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const stored = (v: string) => ({ getItem: () => v });

describe('prefs', () => {
  it('has the documented font steps', () => {
    expect(FONT_STEPS_PX).toEqual([16, 18, 20, 22, 25]);
  });
  it('defaults when storage is empty', () => {
    expect(readPrefs(memory())).toEqual(DEFAULT_PREFS);
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
  });
  it('round trip', () => {
    const s = memory();
    const p = { fontStep: 3, theme: 'dark', mode: 'book', notes: true, lang: 'en', tocOpen: false } as const;
    writePrefs(s, p);
    expect(readPrefs(s)).toEqual(p);
    expect(s.getItem(STORAGE_KEY)).not.toBeNull();
  });
  it('prefs survive a throwing storage', () => {
    const bad = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(readPrefs(bad)).toEqual(DEFAULT_PREFS);
    expect(() => writePrefs(bad, DEFAULT_PREFS)).not.toThrow();
  });
  it('prefs ignore invalid stored data', () => {
    expect(readPrefs(stored('{"fontStep":9,"mode":"x"}'))).toEqual(DEFAULT_PREFS);
    expect(readPrefs(stored('not json'))).toEqual(DEFAULT_PREFS);
    expect(readPrefs(stored('{"fontStep":4,"mode":"x"}'))).toEqual({ ...DEFAULT_PREFS, fontStep: 4 });
  });
  it('effectiveTheme follows the system only when unset', () => {
    expect(effectiveTheme(DEFAULT_PREFS, true)).toBe('dark');
    expect(effectiveTheme(DEFAULT_PREFS, false)).toBe('paper');
    expect(effectiveTheme({ ...DEFAULT_PREFS, theme: 'sepia' }, true)).toBe('sepia');
  });
  it('effectiveMode reads book pages as scrolling until that mode exists', () => {
    expect(effectiveMode('scroll')).toBe('scroll');
    expect(effectiveMode('paged')).toBe('paged');
    expect(effectiveMode('book')).toBe('scroll');
  });
});
