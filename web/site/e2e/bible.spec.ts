import { expect, test, type Page } from '@playwright/test';
import { ambiguousIds, anchorFor, characterIndex, humanizeKey, isRecord } from '../src/lib/bible/catalog.ts';
import { relationsOf } from '../src/lib/bible/character.ts';
import { searchDocs } from '../src/lib/bible/search.ts';
import { chronologyGrid } from '../src/lib/bible/chronology.ts';
import { asChronology, asHouse, asRelations } from '../src/lib/bible/shapes.ts';
import { bible, handledKeys, secrets } from './bible.ts';
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
    if (file.kind === 'yaml' && isRecord(file.data)) {
      for (const key of Object.keys(file.data).filter((k) => !handledKeys(file).includes(k))) {
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

const chronologyFile = bible?.files.find((f) => f.kind === 'yaml' && asChronology(f.data));
const chronology = chronologyFile?.kind === 'yaml' ? asChronology(chronologyFile.data) : null;

test('the chronology is a grid of characters by phase', async ({ page }) => {
  test.skip(!chronology, 'no chronology');
  const grid = chronologyGrid(chronology!);
  await consent(page);
  await gotoReady(page, `bible/?vue=${chronologyFile!.slug}`);
  await expect(main(page).locator('tr[data-row]')).toHaveCount(grid.sections.reduce((n, s) => n + s.rows.length, 0));
  const first = chronology!.events[0]!;
  await expect(main(page).locator(`tr[data-row="${first.who[0]}"] [data-phase="${first.phases[0]}"]`)).toContainText(first.what);
});

for (const view of ['chronology', 'relations'] as const) {
  test(`on a phone, the ${view} view never scrolls the page sideways`, async ({ page }) => {
    const file = bible!.files.find((f) => f.kind === 'yaml' && (view === 'chronology' ? asChronology(f.data) : asRelations(f.data)));
    test.skip(!file, `no ${view}`);
    await page.setViewportSize({ width: 375, height: 800 });
    await consent(page);
    await gotoReady(page, `bible/?vue=${file!.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(file!.title);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

const relationsFile = bible?.files.find((f) => f.kind === 'yaml' && asRelations(f.data));
const relations = relationsFile?.kind === 'yaml' ? asRelations(relationsFile.data) : null;

test('relations are a matrix whose cells tell their relation', async ({ page }) => {
  test.skip(!relations?.length, 'no relations');
  await consent(page);
  await gotoReady(page, `bible/?vue=${relationsFile!.slug}`);
  const cells = main(page).locator('button[data-from][data-to]');
  await expect(cells).toHaveCount(new Set(relations!.map((r) => `${r.from}>${r.to}`)).size);
  const first = relations![0]!;
  await main(page).locator(`button[data-from="${first.from}"][data-to="${first.to}"]`).click();
  await expect(main(page).locator('[data-relation-detail]')).toContainText(first.label ?? '');
});

const houseFile = bible?.files.find((f) => f.kind === 'yaml' && asHouse(f.data));

test('the house shows its rooms level by level, without the plan generator data', async ({ page }) => {
  test.skip(houseFile?.kind !== 'yaml', 'no house');
  const file = houseFile as Extract<typeof houseFile, { kind: 'yaml' }>;
  const room = asHouse(file.data)![0]!.rooms[0]!;
  await consent(page);
  await gotoReady(page, `bible/?vue=${file.slug}`);
  const shown = target(page, anchorFor(file.slug, room.path, room.raw, ambiguousIds(file.data)));
  await expect(shown).toContainText(room.num);
  await expect(shown).toContainText(String(room.raw.nom));
  if (file.pdfs.length > 0) await expect(main(page).getByRole('link', { name: 'Plans (PDF)' })).toHaveAttribute('href', new RegExp(`${file.pdfs[0]!.url}$`));
  for (const key of ['rect', 'portes', 'tikz_extra', 'etiquette']) {
    await expect(main(page).getByText(humanizeKey(key), { exact: true })).toHaveCount(0);
  }
});

// ---- Review fixes ----

test('repeated ids in the data never blank a page', async ({ page }) => {
  const twisted = structuredClone(bible!);
  twisted.files.push({
    kind: 'yaml', path: 'bible/donnees/fiches.yaml', slug: 'fiches', title: 'Fiches', legend: null, pdfs: [],
    data: { avant: [{ id: index.list[0]!.id, note: 'zxqv un' }], apres: [{ id: index.list[0]!.id, note: 'zxqv deux' }] },
  });
  for (const f of twisted.files) {
    if (f.kind !== 'yaml' || !isRecord(f.data)) continue;
    const phases = f.data.phases;
    if (asChronology(f.data) && Array.isArray(phases)) phases.push(structuredClone(phases[0]!));
    const levels = f.data.niveaux;
    if (asHouse(f.data) && Array.isArray(levels) && isRecord(levels[0]) && Array.isArray(levels[0].pieces)) {
      levels[0].pieces.push(structuredClone(levels[0].pieces[0]!));
    }
  }
  await page.route('**/data/bible.json', (route) => route.fulfill({ json: twisted }));
  await consent(page);
  const c = index.list[0]!;
  await gotoReady(page, `bible/?perso=${c.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(c.name);
  await gotoReady(page, 'bible/');
  await page.getByRole('searchbox', { name: 'Chercher dans la bible' }).fill('zxqv');
  await expect(main(page).locator('a[href*="?vue=fiches#"]')).toHaveCount(2);
  for (const f of twisted.files) {
    await gotoReady(page, `bible/?vue=${f.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(f.title);
  }
});

test('the phase row stays in view at the bottom of the chronology', async ({ page }) => {
  test.skip(!chronology, 'no chronology');
  await page.setViewportSize({ width: 375, height: 700 });
  await consent(page);
  await gotoReady(page, `bible/?vue=${chronologyFile!.slug}`);
  // The reader brings the grid into view, then scrolls inside it to its last row.
  const frame = main(page).locator('table').first().locator('xpath=..');
  await frame.scrollIntoViewIfNeeded();
  await frame.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(main(page).locator('tr[data-row]').last()).toBeInViewport();
  await expect(main(page).locator('thead th[scope="col"]').first()).toBeInViewport();
});

test('a matrix cell shows its relation in view, on click and on hover', async ({ page }) => {
  test.skip(!relations || relations.length < 2, 'not enough relations');
  await page.setViewportSize({ width: 1280, height: 800 });
  await consent(page);
  await gotoReady(page, `bible/?vue=${relationsFile!.slug}`);
  const [a, b] = relations!;
  const cell = (r: typeof a) => main(page).locator(`button[data-from="${r!.from}"][data-to="${r!.to}"]`);
  await cell(a).click();
  await expect(main(page).locator('[data-relation-detail]')).toBeInViewport();
  await cell(b).hover();
  await expect(main(page).locator('[data-relation-detail]')).toContainText(b!.label ?? '');
  await expect(cell(b)).toHaveAttribute('title', new RegExp(b!.label ?? ''));
});

test('the search is still there after going back from a result', async ({ page }) => {
  const word = index.list[0]!.short;
  await consent(page);
  await gotoReady(page, 'bible/');
  const box = page.getByRole('searchbox', { name: 'Chercher dans la bible' });
  await box.fill(word);
  await main(page).locator('a[href*="?vue="][href*="#"]').first().click();
  await expect(page).toHaveURL(/\?vue=/);
  await page.goBack();
  await expect(box).toHaveValue(word);
  await expect(main(page).locator('a[href*="?vue="][href*="#"]').first()).toBeVisible();
});
