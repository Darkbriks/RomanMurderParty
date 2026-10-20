import { describe, expect, it } from 'vitest';
import { en } from './en';
import { fr } from './fr';
import { formatBytes, formatDate, t } from './index';

describe('i18n', () => {
  it('fr and en have the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });
  it('interpolates params', () => {
    expect(t('fr', 'updatedOn', { date: 'x' })).toBe('Mis à jour le x');
    expect(t('en', 'updatedOn', { date: 'x' })).toBe('Updated on x');
  });
  it('note labels follow the colon spacing of the language', () => {
    expect(t('fr', 'noteRework')).toBe('à reprendre\u00a0:');
    expect(t('fr', 'noteAuthor')).toBe('note\u00a0:');
    expect(t('en', 'noteRework')).toBe('to rework:');
    expect(t('en', 'noteAuthor')).toBe('note:');
  });
  it('formatDate fr', () => {
    expect(formatDate('fr', '2026-10-20T13:48:58+02:00')).toBe('20 octobre 2026');
    expect(formatDate('en', '2026-10-20T13:48:58+02:00')).toBe('20 October 2026');
  });
  it('formatBytes follows the language', () => {
    expect(formatBytes('fr', 1_234_567)).toBe('1,2 Mo');
    expect(formatBytes('en', 1_234_567)).toBe('1.2 MB');
    expect(formatBytes('fr', 120_025)).toBe('120 Ko');
    expect(formatBytes('en', 120_025)).toBe('120 KB');
  });
});
