import { expect, test, type Page } from '@playwright/test';
import { bible, secrets } from './bible.ts';
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
