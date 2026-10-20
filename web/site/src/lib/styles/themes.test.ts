import { describe, expect, it } from 'vitest';
import { THEMES } from './themes';

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
  it('accent on bg ≥ 3', () => expect(contrast(t.accent, t.bg)).toBeGreaterThanOrEqual(3));
  it('ink on docPaper ≥ 4.5', () => expect(contrast(t.ink, t.docPaper)).toBeGreaterThanOrEqual(4.5));
});
