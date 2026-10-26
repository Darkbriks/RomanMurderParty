import { describe, expect, it } from 'vitest';
import { clearConsent, CONSENT_KEY, readConsent, writeConsent } from './consent.ts';

const memory = (): Storage => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  } as Storage;
};
const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

describe('consent', () => {
  it('is remembered, then forgotten', () => {
    const s = memory();
    expect(readConsent(s)).toBe(false);
    writeConsent(s);
    expect(readConsent(s)).toBe(true);
    expect(s.getItem(CONSENT_KEY)).toBe('1');
    clearConsent(s);
    expect(readConsent(s)).toBe(false);
  });

  it('never throws when storage is blocked or missing', () => {
    expect(readConsent(broken)).toBe(false);
    expect(() => writeConsent(broken)).not.toThrow();
    expect(() => clearConsent(broken)).not.toThrow();
    expect(readConsent(null)).toBe(false);
  });

  it('ignores any other stored value', () => {
    const s = memory();
    s.setItem(CONSENT_KEY, 'true');
    expect(readConsent(s)).toBe(false);
  });
});
