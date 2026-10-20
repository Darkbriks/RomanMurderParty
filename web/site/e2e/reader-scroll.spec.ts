import { expect, test, type Page } from '@playwright/test';

const ORIGIN = 'http://localhost:4173';
const BASE = '/RomanMurderParty/';

const toc = (page: Page) => page.getByRole('navigation', { name: 'Sommaire' });
const tocButton = (page: Page) => page.getByRole('button', { name: 'Sommaire', exact: true });
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Réglages de lecture' });
const chapterBody = (page: Page) => page.locator('[data-chapter-body]');
// The element that sets the language of the book text (nearest ancestor with a lang attribute).
const bookLanguage = (page: Page) => chapterBody(page).locator('xpath=ancestor::*[@lang][1]');

test('chapter 1 renders', async ({ page }) => {
  await page.goto('read/1/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Valse (provisoire)');
  await expect(chapterBody(page)).toContainText('Sera, tu as froid ?');
  const dialogue = chapterBody(page).locator('p', { hasText: 'Sera, tu as froid' });
  expect(await dialogue.textContent()).toMatch(/^— Sera, tu as froid \?/);
  await expect(bookLanguage(page)).toHaveAttribute('lang', 'fr');
  const blocks = chapterBody(page).locator(':scope > *');
  for (const el of await blocks.all()) await expect(el).toHaveAttribute('data-block-id', /^c1\.b\d+$/);
});

test('notes are hidden by default and toggle on', async ({ page }) => {
  await page.goto('read/1/');
  await expect(chapterBody(page)).toContainText('pousser');
  await expect(page.locator('main')).not.toContainText('[à reprendre');
  await settingsButton(page).click();
  await page.getByRole('switch', { name: 'Notes de travail' }).click();
  const note = page.getByText('[à reprendre : Titre ?]');
  await expect(note).toBeVisible();
  expect(await note.textContent()).toBe('[à reprendre : Titre ?]');
});

test('part page and narrator', async ({ page }) => {
  await page.goto('read/1/');
  const partTitle = page.locator('[data-part-title]');
  await expect(partTitle).toContainText('Ouverture');
  await expect(partTitle).toContainText('Seraphina');
  const partBox = await partTitle.boundingBox();
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(partBox!.y + partBox!.height).toBeLessThanOrEqual(headingBox!.y);
  // Not the first chapter of its part: no part page.
  await page.goto('read/2/');
  await expect(page.locator('[data-part-title]')).toHaveCount(0);
});

test('placeholder chapter renders cleanly', async ({ page }) => {
  await page.goto('read/3/');
  const partTitle = page.locator('[data-part-title]');
  await expect(partTitle).toContainText('Première partie');
  await expect(partTitle).toContainText('Narrateur à choisir');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('III');
  await expect(chapterBody(page)).toBeAttached();
  await expect(chapterBody(page).locator('p')).toHaveCount(0);
});

test('comments are not published', async ({ page }) => {
  await page.goto('read/1/');
  expect(await page.locator('body').textContent()).not.toContain('Opera, piece');
  expect(await page.content()).not.toContain('Opera, piece');
});

test('toc unfolded on desktop, folded on phone', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('read/1/');
  await expect(toc(page)).toBeVisible();
  await expect(tocButton(page)).toHaveAttribute('aria-expanded', 'true');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('read/1/');
  await expect(toc(page)).toBeHidden();
  await expect(tocButton(page)).toHaveAttribute('aria-expanded', 'false');
  await tocButton(page).click();
  await expect(toc(page)).toBeVisible();
  // On a phone, choosing a chapter folds the panel again.
  await toc(page).getByRole('link', { name: /Seule/ }).click();
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await expect(toc(page)).toBeHidden();
  // So do Escape (focus returns to ☰) and a tap beside the panel.
  await tocButton(page).click();
  await page.keyboard.press('Escape');
  await expect(toc(page)).toBeHidden();
  await expect(tocButton(page)).toBeFocused();
  await tocButton(page).click();
  await page.mouse.click(370, 600);
  await expect(toc(page)).toBeHidden();
});

test('toc state is remembered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('read/1/');
  await tocButton(page).click();
  await expect(toc(page)).toBeHidden();
  await page.reload();
  await expect(toc(page)).toBeHidden();
  await expect(tocButton(page)).toHaveAttribute('aria-expanded', 'false');
});

test('toc highlights and navigates', async ({ page }) => {
  await page.goto('read/1/');
  await expect(toc(page)).toContainText('Ouverture — Seraphina');
  await expect(toc(page).locator('[aria-current="page"]')).toContainText('Valse (provisoire)');
  await toc(page).getByRole('link', { name: /Seule/ }).click();
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seule');
  await expect(toc(page).locator('[aria-current="page"]')).toContainText('Seule');
});

test('next chapter link', async ({ page }) => {
  await page.goto('read/1/');
  await expect(page.getByRole('link', { name: /Chapitre précédent/ })).toHaveCount(0);
  await page.getByRole('link', { name: /Chapitre suivant/ }).click();
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seule');
  await page.getByRole('link', { name: /Chapitre précédent/ }).click();
  await expect(page).toHaveURL(/\/read\/1\/$/);
  await page.goto('read/9/');
  await expect(page.getByRole('link', { name: /Chapitre suivant/ })).toHaveCount(0);
});

test('theme and font size persist after reload', async ({ page }) => {
  await page.goto('read/1/');
  await settingsButton(page).click();
  await page.getByRole('button', { name: 'Sombre' }).click();
  await page.getByRole('button', { name: 'Texte plus grand' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(27, 24, 21)');
  await settingsButton(page).click();
  await expect(page.getByRole('button', { name: 'Sombre' })).toHaveAttribute('aria-pressed', 'true');
});

test('settings menu closes on Escape and returns focus', async ({ page }) => {
  await page.goto('read/1/');
  await settingsButton(page).click();
  await expect(page.getByRole('switch', { name: 'Notes de travail' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('switch', { name: 'Notes de travail' })).toBeHidden();
  await expect(settingsButton(page)).toBeFocused();
});

test('language switch changes the interface, not the book', async ({ page }) => {
  await page.goto('read/1/');
  await settingsButton(page).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Table of contents', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(bookLanguage(page)).toHaveAttribute('lang', 'fr');
  await page.getByRole('switch', { name: 'Working notes' }).click();
  await expect(page.getByText('[to rework: Titre ?]')).toBeVisible();
});

test('stored preferences apply after load without hydration errors', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (m) => messages.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    localStorage.setItem(
      'rmp.prefs.v1',
      JSON.stringify({ fontStep: 3, theme: 'sepia', mode: 'scroll', notes: true, lang: 'en', tocOpen: null }),
    );
  });
  await page.goto('read/1/');
  await expect(page.getByRole('button', { name: 'Table of contents', exact: true })).toBeVisible();
  await expect(page.getByText('[to rework: Titre ?]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');
  await expect(page.locator('html')).toHaveCSS('font-size', '22px');
  expect(messages.filter((m) => /hydrat|error/i.test(m))).toEqual([]);
});

test('pages have colours without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: `${ORIGIN}${BASE}` });
  const page = await context.newPage();
  await page.goto('read/1/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 227)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(30, 27, 24)');
  await expect(chapterBody(page)).toContainText('Sera, tu as froid ?');
  await context.close();
});

test('no request fails under the base path', async ({ page }) => {
  const failures: string[] = [];
  const urls: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('data:')) urls.push(r.url());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => failures.push(`failed ${r.url()} ${r.failure()?.errorText ?? ''}`));

  await page.goto('read/2/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seule');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seule');

  expect(failures).toEqual([]);
  expect(urls.filter((u) => !u.startsWith(`${ORIGIN}${BASE}`))).toEqual([]);
  for (const name of ['chapitre', 'scene']) {
    expect(urls).toContain(`${ORIGIN}${BASE}ornaments/${name}.svg`);
  }
  expect(urls.some((u) => /\.woff2$/.test(u))).toBe(true);
  // The favicon lives under the base too (SvelteKit makes its href absolute on the client).
  const icon = await page.locator('link[rel="icon"]').evaluate((l: HTMLLinkElement) => l.href);
  expect(icon).toBe(`${ORIGIN}${BASE}favicon.svg`);
  expect((await page.request.get(icon)).status()).toBe(200);
});
