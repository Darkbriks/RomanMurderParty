import { expect, test, type Page } from '@playwright/test';
import {
  book,
  bookJson,
  chapterByNumber,
  chapters,
  commentFragments,
  firstDialogue,
  firstNote,
  firstPlaceholder,
  gotoReady,
  headingText,
  lastChapter,
  normalize,
  ornamentsOf,
  plain,
  reloadReady,
  visibleBlockIds,
} from './book.ts';

// Expectations come from the built book (e2e/book.ts), never from today's wording of the novel.
const ORIGIN = 'http://localhost:4173';
const BASE = '/RomanMurderParty/';

const toc = (page: Page) => page.getByRole('navigation', { name: 'Sommaire' });
const tocButton = (page: Page) => page.getByRole('button', { name: 'Sommaire', exact: true });
const tocLink = (page: Page, n: number) => toc(page).locator(`a[href$="/read/${n}/"]`);
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Réglages de lecture' });
const chapterBody = (page: Page) => page.locator('[data-chapter-body]');
const heading = (page: Page) => page.getByRole('heading', { level: 1 });
// The element that sets the language of the book text (nearest ancestor with a lang attribute).
const bookLanguage = (page: Page) => chapterBody(page).locator('xpath=ancestor::*[@lang][1]');

const one = chapterByNumber(1);
const second = Math.min(2, lastChapter);
const rework = firstNote('rework');
const dialogue = firstDialogue();
const placeholder = firstPlaceholder();
const inner = chapters.find((c) => !c.isFirstOfPart) ?? null;

async function showNotes(page: Page, label = 'Notes de travail') {
  await settingsButton(page).click();
  await page.getByRole('switch', { name: label }).click();
}

test('chapter 1 renders', async ({ page }) => {
  await gotoReady(page, 'read/1/');
  await expect(heading(page)).toContainText(headingText(one.chapter));
  await expect(bookLanguage(page)).toHaveAttribute('lang', 'fr');
  const ids = await chapterBody(page).locator(':scope > *').evaluateAll((els) => els.map((el) => el.getAttribute('data-block-id')));
  expect(ids).toEqual(visibleBlockIds(one.chapter));
});

test('dialogue paragraphs open with an em dash and a no-break space', async ({ page }) => {
  test.skip(!dialogue, 'no dialogue paragraph (\\rep) in the book');
  const { n, block } = dialogue!;
  await gotoReady(page, `read/${n}/`);
  const expected = '— ' + block.segments.map((s) => plain(s.content) + (s.spaceAfter ? ' ' : '')).join('');
  expect(await page.locator(`[data-block-id="${block.id}"]`).textContent()).toBe(expected);
});

test('notes are hidden by default and toggle on', async ({ page }) => {
  test.skip(!rework, 'no \\areprendre note in the book');
  const { n, blockId, note } = rework!;
  await gotoReady(page, `read/${n}/`);
  await expect(page.locator('main')).not.toContainText('[à reprendre');
  await expect(page.locator('[data-note]')).toHaveCount(0);
  await showNotes(page);
  const shown = page.locator(`[data-block-id="${blockId}"] [data-note="rework"]`).first();
  await expect(shown).toBeVisible();
  expect(await shown.textContent()).toBe(`[à reprendre : ${plain(note.children)}]`);
});

test('part page and narrator', async ({ page }) => {
  await gotoReady(page, 'read/1/');
  const partTitle = page.locator('[data-part-title]').last();
  await expect(partTitle).toContainText(one.part.label);
  await expect(partTitle).toContainText(one.part.narrator);
  const partBox = await partTitle.boundingBox();
  const headingBox = await heading(page).boundingBox();
  expect(partBox!.y + partBox!.height).toBeLessThanOrEqual(headingBox!.y);
});

test('a chapter inside a part has no part page', async ({ page }) => {
  test.skip(!inner, 'every chapter opens its part');
  await gotoReady(page, `read/${inner!.chapter.number}/`);
  await expect(heading(page)).toContainText(headingText(inner!.chapter));
  await expect(page.locator('[data-part-title]')).toHaveCount(0);
});

test('placeholder chapter renders cleanly', async ({ page }) => {
  test.skip(!placeholder, 'no chapter made only of working notes');
  const { part, chapter, isFirstOfPart } = placeholder!;
  await gotoReady(page, `read/${chapter.number}/`);
  if (isFirstOfPart) {
    const partTitle = page.locator('[data-part-title]').last();
    await expect(partTitle).toContainText(part.label);
    await expect(partTitle).toContainText(part.narrator);
  }
  await expect(heading(page)).toContainText(headingText(chapter));
  await expect(chapterBody(page)).toBeAttached();
  await expect(chapterBody(page).locator('p')).toHaveCount(0);
});

test('comments are not published', async ({ page }) => {
  const fragments = commentFragments();
  test.skip(fragments.length === 0, 'no % comment long enough to check in parties/ or annexes/');
  const leaks = (where: string, text: string) => fragments.filter((f) => text.includes(f)).map((f) => `${where}: ${f}`);
  const found = leaks('book JSON', normalize(bookJson));
  for (const { chapter } of chapters) {
    await page.goto(`read/${chapter.number}/`);
    found.push(...leaks(`read/${chapter.number}/ text`, normalize((await page.locator('body').textContent()) ?? '')));
    found.push(...leaks(`read/${chapter.number}/ html`, normalize(await page.content())));
  }
  expect(found).toEqual([]);
});

test('toc unfolded on desktop, folded on phone', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoReady(page, 'read/1/');
  await expect(toc(page)).toBeVisible();
  await expect(tocButton(page)).toHaveAttribute('aria-expanded', 'true');

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page, 'read/1/');
  await expect(toc(page)).toBeHidden();
  await expect(tocButton(page)).toHaveAttribute('aria-expanded', 'false');
  await tocButton(page).click();
  await expect(toc(page)).toBeVisible();
  // On a phone, choosing a chapter folds the panel again.
  await tocLink(page, second).click();
  await expect(page).toHaveURL(new RegExp(`/read/${second}/$`));
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
  await gotoReady(page, 'read/1/');
  await tocButton(page).click();
  await expect(toc(page)).toBeHidden();
  await reloadReady(page);
  await expect(toc(page)).toBeHidden();
  await expect(tocButton(page)).toHaveAttribute('aria-expanded', 'false');
});

test('toc lists every part and highlights the current chapter', async ({ page }) => {
  await gotoReady(page, 'read/1/');
  for (const part of book.parts) await expect(toc(page)).toContainText(`${part.label} — ${part.narrator}`);
  await expect(toc(page).locator('a')).toHaveCount(chapters.length + 1); // the chapters and the characters page
  await expect(toc(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(toc(page).locator('[aria-current="page"]')).toContainText(headingText(one.chapter));
});

test('toc navigates', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  const target = chapterByNumber(2).chapter;
  await gotoReady(page, 'read/1/');
  await tocLink(page, 2).click();
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await expect(heading(page)).toContainText(headingText(target));
  await expect(toc(page).locator('[aria-current="page"]')).toContainText(headingText(target));
});

test('next chapter link', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await gotoReady(page, 'read/1/');
  await expect(page.getByRole('link', { name: /Chapitre précédent/ })).toHaveCount(0);
  await page.getByRole('link', { name: /Chapitre suivant/ }).click();
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await expect(heading(page)).toContainText(headingText(chapterByNumber(2).chapter));
  await page.getByRole('link', { name: /Chapitre précédent/ }).click();
  await expect(page).toHaveURL(/\/read\/1\/$/);
  await gotoReady(page, `read/${lastChapter}/`);
  await expect(page.getByRole('link', { name: /Chapitre suivant/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Chapitre précédent/ })).toHaveCount(1);
});

test('theme and font size persist after reload', async ({ page }) => {
  await gotoReady(page, 'read/1/');
  await settingsButton(page).click();
  await page.getByRole('button', { name: 'Sombre' }).click();
  await page.getByRole('button', { name: 'Texte plus grand' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await reloadReady(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(27, 24, 21)');
  await settingsButton(page).click();
  await expect(page.getByRole('button', { name: 'Sombre' })).toHaveAttribute('aria-pressed', 'true');
});

test('settings menu closes on Escape and returns focus', async ({ page }) => {
  await gotoReady(page, 'read/1/');
  await settingsButton(page).click();
  await expect(page.getByRole('switch', { name: 'Notes de travail' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('switch', { name: 'Notes de travail' })).toBeHidden();
  await expect(settingsButton(page)).toBeFocused();
});

test('language switch changes the interface, not the book', async ({ page }) => {
  await gotoReady(page, 'read/1/');
  await settingsButton(page).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Table of contents', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Working notes' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(bookLanguage(page)).toHaveAttribute('lang', 'fr');
});

test('note labels follow the interface language', async ({ page }) => {
  test.skip(!rework, 'no \\areprendre note in the book');
  const { n, blockId, note } = rework!;
  await gotoReady(page, `read/${n}/`);
  await settingsButton(page).click();
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('switch', { name: 'Working notes' }).click();
  const shown = page.locator(`[data-block-id="${blockId}"] [data-note="rework"]`).first();
  await expect(shown).toBeVisible();
  expect(await shown.textContent()).toBe(`[to rework: ${plain(note.children)}]`);
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
  await gotoReady(page, 'read/1/');
  await expect(page.getByRole('button', { name: 'Table of contents', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');
  await expect(page.locator('html')).toHaveCSS('font-size', '22px');
  await page.getByRole('button', { name: 'Reading settings' }).click();
  await expect(page.getByRole('switch', { name: 'Working notes' })).toHaveAttribute('aria-checked', 'true');
  expect(messages.filter((m) => /hydrat|error/i.test(m))).toEqual([]);
});

test('pages have colours without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: `${ORIGIN}${BASE}` });
  const page = await context.newPage();
  await page.goto('read/1/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 241, 227)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(30, 27, 24)');
  await expect(heading(page)).toContainText(headingText(one.chapter));
  await context.close();
});

test('no request fails under the base path', async ({ page }) => {
  const target = chapterByNumber(second);
  const failures: string[] = [];
  const urls: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('data:')) urls.push(r.url());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => failures.push(`failed ${r.url()} ${r.failure()?.errorText ?? ''}`));

  // A deep link, loaded directly and reloaded.
  await gotoReady(page, `read/${second}/`);
  await page.waitForLoadState('networkidle');
  await expect(heading(page)).toContainText(headingText(target.chapter));
  await reloadReady(page);
  await page.waitForLoadState('networkidle');
  await expect(heading(page)).toContainText(headingText(target.chapter));

  expect(failures).toEqual([]);
  expect(urls.filter((u) => !u.startsWith(`${ORIGIN}${BASE}`))).toEqual([]);
  for (const name of ornamentsOf(target)) expect(urls).toContain(`${ORIGIN}${BASE}ornaments/${name}.svg`);
  expect(urls.some((u) => /\.woff2$/.test(u))).toBe(true);
  // The favicon lives under the base too (SvelteKit makes its href absolute on the client).
  const icon = await page.locator('link[rel="icon"]').evaluate((l: HTMLLinkElement) => l.href);
  expect(icon).toBe(`${ORIGIN}${BASE}favicon.svg`);
  expect((await page.request.get(icon)).status()).toBe(200);
});
