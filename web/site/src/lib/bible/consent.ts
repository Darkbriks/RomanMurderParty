// The reader's consent to the bible's spoilers, kept in this browser. Storage may be blocked (strict
// private browsing): reads then say "no", writes are dropped, and the page keeps the consent in memory.
export const CONSENT_KEY = 'rmp.bible.v1';

export function readConsent(storage: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return storage?.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeConsent(storage: Pick<Storage, 'setItem'> | null): void {
  try {
    storage?.setItem(CONSENT_KEY, '1');
  } catch {
    // storage unavailable: the consent lasts as long as the page
  }
}

export function clearConsent(storage: Pick<Storage, 'removeItem'> | null): void {
  try {
    storage?.removeItem(CONSENT_KEY);
  } catch {
    // storage unavailable: nothing was kept
  }
}
