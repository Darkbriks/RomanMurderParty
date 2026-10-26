import { describe, expect, it } from 'vitest';
import { THEMES, themeCss } from './themes';

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe.each(Object.entries(THEMES))('theme %s', (_name, t) => {
  it('ink on bg ≥ 4.5', () => expect(contrast(t.ink, t.bg)).toBeGreaterThanOrEqual(4.5));
  it('note on bg ≥ 4.5', () => expect(contrast(t.note, t.bg)).toBeGreaterThanOrEqual(4.5));
  // The accent colours links, the current TOC entry and the focus outline, so it needs text contrast.
  it('accent on bg ≥ 4.5', () => expect(contrast(t.accent, t.bg)).toBeGreaterThanOrEqual(4.5));
  it('accent and ink on the TOC panel ≥ 4.5', () => {
    expect(contrast(t.accent, t.bgPanel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.ink, t.bgPanel)).toBeGreaterThanOrEqual(4.5);
  });
  it('note on docPaper ≥ 4.5', () => expect(contrast(t.note, t.docPaper)).toBeGreaterThanOrEqual(4.5));
  it('frame (borders only) on bg ≥ 3', () => expect(contrast(t.frame, t.bg)).toBeGreaterThanOrEqual(3));
  it('ink on docPaper ≥ 4.5', () => expect(contrast(t.ink, t.docPaper)).toBeGreaterThanOrEqual(4.5));
  // Relation valences colour the bible's matrix cells, always next to their signed number.
  it('valence colours on bg ≥ 3', () => {
    expect(contrast(t.negative, t.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.positive, t.bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('themeCss', () => {
  const css = themeCss();
  it('gives :root the paper colours before any theme is chosen', () => {
    const fallback = /:root \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(fallback).toContain(`--bg: ${THEMES.paper.bg};`);
    expect(fallback).toContain(`--ink: ${THEMES.paper.ink};`);
    expect(fallback).toContain('color-scheme: light;');
  });
  it('declares a color-scheme per theme', () => {
    expect(css).toMatch(/:root\[data-theme='dark'\] \{[^}]*color-scheme: dark;/);
    expect(css).toMatch(/:root\[data-theme='paper'\] \{[^}]*color-scheme: light;/);
    expect(css).toMatch(/:root\[data-theme='sepia'\] \{[^}]*color-scheme: light;/);
  });
});
