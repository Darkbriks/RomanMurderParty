import { expect, test, type Page } from '@playwright/test';
import { characterIndex, humanizeKey, isRecord } from '../src/lib/bible/catalog.ts';
import { relationsOf } from '../src/lib/bible/character.ts';
import { searchDocs } from '../src/lib/bible/search.ts';
import { asRelations } from '../src/lib/bible/shapes.ts';
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

const docs = bible ? searchDocs(bible, index) : [];
const target = (page: Page, id: string) => page.locator(`[id="${id}"]`);

test('search leads to the entry', async ({ page }) => {
  const relations = bible!.files.find((f) => f.slug === 'relations');
  const first = relations?.kind === 'yaml' && isRecord(relations.data) && Array.isArray(relations.data.relations) ? relations.data.relations[0] : null;
  const word = isRecord(first) && typeof first.libelle === 'string' ? first.libelle.split(/[^\p{L}]+/u).find((w) => w.length > 5) : undefined;
  test.skip(!word, 'no relation label to search for');
  await consent(page);
  await gotoReady(page, 'bible/');
  await page.getByRole('searchbox', { name: 'Chercher dans la bible' }).fill(word!);
  await main(page).locator('a[href*="?vue=relations#"]').first().click();
  await expect(page).toHaveURL(/\?vue=relations#/);
  const id = decodeURIComponent(new URL(page.url()).hash.slice(1));
  await expect(target(page, id)).toBeInViewport();
});

test('a deep link to an entry scrolls to it once the bible is loaded', async ({ page }) => {
  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d.slug, (counts.get(d.slug) ?? 0) + 1);
  const slug = [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  const last = docs.filter((d) => d.slug === slug).at(-1)!;
  await consent(page);
  await gotoReady(page, `bible/?vue=${slug}#${encodeURIComponent(last.anchor)}`);
  await expect(target(page, last.anchor)).toBeInViewport();
});

test('every search result has its target in its view', async ({ page }) => {
  await consent(page);
  for (const file of bible!.files) {
    await gotoReady(page, `bible/?vue=${file.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(file.title);
    const ids = docs.filter((d) => d.slug === file.slug).map((d) => d.anchor);
    const missing = await page.evaluate((list) => list.filter((id) => !document.getElementById(id)), ids);
    expect(missing, file.slug).toEqual([]);
  }
});

test('a character page shows their identity and their relations both ways', async ({ page }) => {
  const file = bible!.files.find((f) => f.slug === 'relations');
  const rels = file?.kind === 'yaml' ? asRelations(file.data) : null;
  const c = rels ? index.list.find((x) => relationsOf(rels, x.id).from.length > 0 && relationsOf(rels, x.id).to.length > 0) : undefined;
  test.skip(!c, 'no character has relations both ways');
  const { from, to } = relationsOf(rels!, c!.id);
  await consent(page);
  await gotoReady(page, `bible/?perso=${c!.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(c!.name);
  await expect(main(page).locator('[data-relations="from"] li')).toHaveCount(from.length);
  await expect(main(page).locator('[data-relations="to"] li')).toHaveCount(to.length);
});

test('an unknown character says so', async ({ page }) => {
  await consent(page);
  await gotoReady(page, 'bible/?perso=ZZZZ');
  await expect(main(page)).toContainText('Cette page de la bible n’existe pas.');
});
