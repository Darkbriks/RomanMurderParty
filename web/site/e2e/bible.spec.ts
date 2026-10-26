import { expect, test, type Page } from '@playwright/test';
import { characterIndex, humanizeKey, isRecord } from '../src/lib/bible/catalog.ts';
import { bible, hasDedicatedView, secrets } from './bible.ts';
import { gotoReady, reloadReady } from './book.ts';

// Expectations come from the built bible (e2e/bible.ts), never from today's wording of the data.
test.skip(!bible, 'the site was built without a bible');

const accept = (page: Page) => page.getByRole('checkbox', { name: 'J’accepte d’être spoilé' });
const open = (page: Page) => page.getByRole('button', { name: 'Ouvrir la bible' });
const close = (page: Page) => page.getByRole('button', { name: 'Refermer la bible' });

test('the cover link leads to the warning, and the button waits for the checkbox', async ({ page }) => {
  await gotoReady(page, '');
  await page.getByRole('link', { name: 'Bible de l’auteur (révèle la solution)' }).click();
  await expect(page).toHaveURL(/\/bible\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Bible de l’auteur' })).toBeVisible();
  await expect(open(page)).toBeDisabled();
  await accept(page).check();
  await expect(open(page)).toBeEnabled();
});

test('consent is remembered, and closing the bible forgets it', async ({ page }) => {
  await gotoReady(page, 'bible/');
  await accept(page).check();
  await open(page).click();
  await expect(close(page)).toBeVisible();
  await reloadReady(page);
  await expect(close(page)).toBeVisible();
  await expect(accept(page)).toHaveCount(0);
  await close(page).click();
  await expect(page).toHaveURL(/\/RomanMurderParty\/$/);
  await gotoReady(page, 'bible/');
  await expect(accept(page)).toBeVisible();
});

test('a deep link to a character goes through the warning', async ({ page }) => {
  await gotoReady(page, 'bible/?perso=SER');
  await expect(accept(page)).toBeVisible();
});

test('no secret in the prerendered HTML', async ({ request }) => {
  expect(secrets.length).toBeGreaterThan(0);
  for (const path of ['', 'bible/']) {
    const html = await (await request.get(path)).text();
    for (const secret of secrets) expect(html).not.toContain(secret);
  }
});

// ---- With consent given beforehand ----

const consent = (page: Page) => page.addInitScript(() => localStorage.setItem('rmp.bible.v1', '1'));
const index = characterIndex(bible ?? { schemaVersion: 1, files: [] });
const main = (page: Page) => page.locator('main');

test('the bible home links every character and every file', async ({ page }) => {
  await consent(page);
  await gotoReady(page, 'bible/');
  for (const c of index.list) await expect(main(page).locator(`a[href="?perso=${c.id}"]`).first()).toBeVisible();
  for (const f of bible!.files) await expect(main(page).locator(`a[href="?vue=${f.slug}"]`)).toBeVisible();
});

test('every file has a view, and no value prints as [object Object]', async ({ page }) => {
  await consent(page);
  for (const file of bible!.files) {
    await gotoReady(page, `bible/?vue=${file.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(file.title);
    await expect(main(page)).not.toContainText('[object Object]');
    if (file.kind === 'yaml' && isRecord(file.data) && !hasDedicatedView(file)) {
      for (const key of Object.keys(file.data)) {
        await expect(main(page).getByRole('heading', { level: 2, name: humanizeKey(key), exact: true }).first()).toBeVisible();
      }
    }
  }
});

test('ids link to their character', async ({ page }) => {
  const vote = bible!.files.find((f) => f.slug === 'vote');
  const entry = vote?.kind === 'yaml' && isRecord(vote.data) ? Object.values(vote.data).flat().find((e) => isRecord(e) && typeof e.qui === 'string' && index.byId.has(e.qui)) : undefined;
  test.skip(!isRecord(entry), 'no vote names a known character');
  const c = index.byId.get((entry as Record<string, string>).qui!)!;
  await consent(page);
  await gotoReady(page, 'bible/?vue=vote');
  await expect(main(page).locator(`a[href="?perso=${c.id}"]`, { hasText: c.short }).first()).toBeVisible();
});
