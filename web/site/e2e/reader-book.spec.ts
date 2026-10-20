import { expect, test, type Page, type Response } from '@playwright/test';
import { createRequire } from 'node:module';
import { chapterByNumber, gotoReady, headingText, lastChapter, loadDownloads, loadPageMaps, reloadReady } from './book.ts';

// Book pages mode: the PDF's own pages, drawn by pdf.js. Expected pages come from the built page
// maps (static/data/pagemaps.json), never from today's layout of the novel.
test.use({ viewport: { width: 1280, height: 800 } });

const maps = loadPageMaps();
const downloads = loadDownloads();
const hasPdf = (variant: 'final' | 'brouillon') => downloads.some((d) => d.variant === variant);
/** First page of chapter `n` in a PDF variant. */
const chapterPage = (n: number, variant: 'final' | 'brouillon' = 'final') => maps![variant].chapters[n - 1]!;

test.beforeEach(() => {
  test.skip(!maps, 'static/data/pagemaps.json is missing (run npm run data)');
  test.skip(!hasPdf('final'), 'downloads.json lists no final PDF');
});

// A portrait window wide enough for the mode selector in the top bar, but showing single pages.
const PORTRAIT = { width: 800, height: 1000 };
const PHONE = { width: 390, height: 844 };

const view = (page: Page) => page.locator('[data-book-view]');
const indicator = (page: Page) => page.locator('[data-book-indicator]');
const bookButton = (page: Page) => page.getByRole('button', { name: 'Pages du livre' });
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Réglages de lecture' });
const canvases = (page: Page) => page.locator('[data-book-view] canvas');
const pdfPage = (page: Page, n: number) => page.getByRole('img', { name: `Page ${n}`, exact: true });

/** Pages a spread shows on a wide screen: page 1 alone on the right, then even-odd pairs. */
const spreadOf = (p: number, count: number): number[] => (p === 1 ? [1] : [p - (p % 2), p - (p % 2) + 1].filter((x) => x <= count));
/** « Page 7 / 44 » for one page, « Pages 6–7 / 44 » for a spread; `count` may be a pattern. */
const indicatorText = (pages: number[], count: number | string = '\\d+') =>
  new RegExp(`^${pages.length === 1 ? `Page ${pages[0]}` : `Pages ${pages[0]}–${pages[1]}`} / ${count}$`);

/** Waits until the PDF is loaded and every page on screen is drawn at the current size. */
async function settle(page: Page) {
  await expect(view(page)).toHaveAttribute('data-status', 'ready');
  await expect(canvases(page).first()).toBeVisible();
  await expect(page.locator('[data-book-view] canvas:not([data-rendered])')).toHaveCount(0);
}

async function openBook(page: Page, n: number) {
  await gotoReady(page, `read/${n}/`);
  await bookButton(page).click();
  await settle(page);
}

async function pageCount(page: Page): Promise<number> {
  const match = /\/ (\d+)$/.exec((await indicator(page).textContent()) ?? '');
  expect(match, 'page indicator').not.toBeNull();
  return Number(match![1]);
}

const savedPosition = async (page: Page) => JSON.parse((await page.evaluate(() => localStorage.getItem('rmp.position.v1'))) ?? 'null');

test('pdf.js is not loaded in scroll mode', async ({ page }) => {
  // pdf.js names its version in its code: any script that holds it is pdf.js.
  const version = (createRequire(import.meta.url)('pdfjs-dist/package.json') as { version: string }).version;
  const urls: string[] = [];
  const scripts: Promise<string | null>[] = [];
  page.on('request', (r) => urls.push(r.url()));
  page.on('worker', (w) => urls.push(w.url()));
  page.on('response', (r: Response) => {
    if (/\.m?js(\?|$)/.test(r.url())) scripts.push(r.text().then((body) => (body.includes(version) ? r.url() : null), () => null));
  });
  const pdfjs = async () => (await Promise.all(scripts)).filter((u) => u !== null);
  const isPdfRequest = (u: string) => /pdf\.worker/.test(u) || /roman-(final|brouillon)\.pdf/.test(u);

  await gotoReady(page, 'read/1/');
  await page.mouse.wheel(0, 400);
  // Scrolling down retracts the bar; a little scroll up brings it back.
  await page.mouse.wheel(0, -20);
  await page.waitForLoadState('networkidle');
  // Paged mode does not need it either.
  await page.getByRole('button', { name: 'Liseuse' }).click();
  await page.waitForLoadState('networkidle');
  expect(urls.filter(isPdfRequest)).toEqual([]);
  expect(await pdfjs()).toEqual([]);

  // The detectors work: book pages load pdf.js, its worker and the PDF.
  await bookButton(page).click();
  await settle(page);
  expect(urls.filter((u) => /pdf\.worker/.test(u)).length).toBeGreaterThan(0);
  expect(urls.some((u) => /downloads\/roman-final\.pdf/.test(u))).toBe(true);
  expect((await pdfjs()).length).toBeGreaterThan(0);
});

test("book mode opens at the chapter's page", async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await page.setViewportSize(PORTRAIT);
  const first = chapterPage(2);
  await openBook(page, 2);
  await expect(indicator(page)).toHaveText(indicatorText([first]));
  await expect(indicator(page)).toHaveAttribute('aria-live', 'polite');
  await expect(pdfPage(page, first)).toBeVisible();
  await expect(bookButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/read\/2\/$/);
  expect(await savedPosition(page)).toMatchObject({ chapter: 2, blockId: null });
});

test('wide shows two canvases, phone shows one', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  const first = chapterPage(2);
  await openBook(page, 2);
  const count = await pageCount(page);
  const spread = spreadOf(first, count);
  test.skip(spread.length < 2, `chapter 2 starts on page ${first}, which stands alone`);
  await expect(canvases(page)).toHaveCount(2);
  await expect(indicator(page)).toHaveText(indicatorText(spread, count));
  // An open book: the even page on the left, the odd page on the right, side by side.
  const left = (await pdfPage(page, spread[0]!).boundingBox())!;
  const right = (await pdfPage(page, spread[1]!).boundingBox())!;
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1);
  expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(1);
  // Scaled to fit below the top bar.
  expect(left.y).toBeGreaterThanOrEqual(48);
  expect(left.y + left.height).toBeLessThanOrEqual(800);

  // A tall window, even a wide one, shows single pages.
  await page.setViewportSize({ width: 1100, height: 1400 });
  await settle(page);
  await expect(canvases(page)).toHaveCount(1);
  await expect(pdfPage(page, first)).toBeVisible();

  await page.setViewportSize(PHONE);
  await settle(page);
  await expect(canvases(page)).toHaveCount(1);
  await expect(indicator(page)).toHaveText(indicatorText([first], count));
  const box = (await pdfPage(page, first).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
  expect(box.y + box.height).toBeLessThanOrEqual(PHONE.height);
});

test.describe('on a high-density screen', () => {
  test.use({ deviceScaleFactor: 2 });
  test('pages are drawn at the device pixel ratio', async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openBook(page, 1);
    const sizes = await canvases(page)
      .first()
      .evaluate((c: HTMLCanvasElement) => ({ width: c.width, css: c.getBoundingClientRect().width }));
    expect(Math.abs(sizes.width - sizes.css * 2)).toBeLessThanOrEqual(2);
  });
});

test('notes switch to the draft PDF', async ({ page }) => {
  test.skip(!hasPdf('brouillon'), 'downloads.json lists no draft PDF');
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await page.setViewportSize(PORTRAIT);
  await openBook(page, 2);
  await expect(indicator(page)).toHaveText(indicatorText([chapterPage(2)]));
  await settingsButton(page).click();
  const draft = page.waitForRequest(/\/downloads\/roman-brouillon\.pdf$/);
  await page.getByRole('switch', { name: 'Notes de travail' }).click();
  await draft;
  await settle(page);
  await expect(indicator(page)).toHaveText(indicatorText([chapterPage(2, 'brouillon')]));
  await expect(page).toHaveURL(/\/read\/2\/$/);
  // And back to the final PDF, still on the chapter.
  await page.getByRole('switch', { name: 'Notes de travail' }).click();
  await settle(page);
  await expect(indicator(page)).toHaveText(indicatorText([chapterPage(2)]));
  await expect(page).toHaveURL(/\/read\/2\/$/);
});

test('turning pages updates the URL chapter', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await page.setViewportSize(PORTRAIT);
  const [one, two] = [chapterPage(1), chapterPage(2)];
  await openBook(page, 1);
  await expect(indicator(page)).toHaveText(indicatorText([one]));
  const entries = await page.evaluate(() => history.length);
  for (let p = one + 1; p < two; p++) {
    await page.keyboard.press('ArrowRight');
    await expect(indicator(page)).toHaveText(indicatorText([p]));
  }
  await expect(page).toHaveURL(/\/read\/1\/$/);
  await page.keyboard.press('ArrowRight');
  await expect(indicator(page)).toHaveText(indicatorText([two]));
  await expect(page).toHaveURL(/\/read\/2\/$/);
  // The URL is replaced, not pushed, and the position saved without a block.
  expect(await page.evaluate(() => history.length)).toBe(entries);
  await expect.poll(() => savedPosition(page)).toMatchObject({ chapter: 2, blockId: null });
  await expect(page.locator('#toc a[aria-current="page"]')).toHaveAttribute('href', /\/read\/2\/$/);
  await expect(page.locator('.narrator')).toHaveText(chapterByNumber(2).part.narrator);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/\/read\/1\/$/);
  await expect.poll(() => savedPosition(page)).toMatchObject({ chapter: 1, blockId: null });
});

test('toc jumps to a chapter page in book mode', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  const n = lastChapter;
  await openBook(page, 1);
  const count = await pageCount(page);
  await page.locator(`#toc a[href$="/read/${n}/"]`).click();
  await settle(page);
  await expect(indicator(page)).toHaveText(indicatorText(spreadOf(chapterPage(n), count), count));
  await expect(pdfPage(page, chapterPage(n))).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/read/${n}/$`));
  await expect(page.locator('#toc a[aria-current="page"]')).toHaveAttribute('href', new RegExp(`/read/${n}/$`));
  // Still the same PDF: no second download.
  await expect(view(page)).toHaveAttribute('data-variant', 'final');
});

test('keys, edge clicks, buttons and swipes turn pages', async ({ page }) => {
  await page.setViewportSize(PORTRAIT);
  const one = chapterPage(1);
  await openBook(page, 1);
  const count = await pageCount(page);
  test.skip(one >= count, 'chapter 1 starts on the last page');
  const at = (p: number) => expect(indicator(page)).toHaveText(indicatorText([p], count));
  await page.keyboard.press('ArrowRight');
  await at(one + 1);
  await page.keyboard.press('ArrowLeft');
  await at(one);
  await page.keyboard.press('PageDown');
  await at(one + 1);
  await page.keyboard.press('PageUp');
  await at(one);
  // Space presses the focused mode button: it turns the page once the focus is on the page.
  const area = page.locator('[data-book-area]');
  const box = (await area.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await at(one);
  await page.keyboard.press('Space');
  await at(one + 1);
  await page.keyboard.press('Shift+Space');
  await at(one);
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
  await at(one + 1);
  await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);
  await at(one);
  await page.getByRole('button', { name: 'Page suivante' }).click();
  await at(one + 1);
  await page.getByRole('button', { name: 'Page précédente' }).click();
  await at(one);
  const swipe = (from: number, to: number) =>
    area.evaluate(
      (el, [x0, x1]) => {
        const r = el.getBoundingClientRect();
        const fire = (type: string, x: number) =>
          el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: r.top + r.height / 2 }));
        fire('pointerdown', x0!);
        fire('pointermove', (x0! + x1!) / 2);
        fire('pointerup', x1!);
      },
      [from, to],
    );
  await swipe(500, 300);
  await at(one + 1);
  await swipe(300, 500);
  await at(one);
  await swipe(500, 470); // under 50 px: not a swipe
  await at(one);
});

test('keys do not turn pages from the menus or the table of contents', async ({ page }) => {
  await openBook(page, 1);
  const before = await indicator(page).textContent();
  // The Aa menu: its toggle, then a button inside it.
  await settingsButton(page).click();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Texte plus grand' }).focus();
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await page.keyboard.press('Escape');
  // The PDF menu.
  await page.getByRole('button', { name: 'Télécharger en PDF' }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  // The table of contents, open beside the pages on a wide screen.
  await page.locator('#toc a').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Space');
  await expect(indicator(page)).toHaveText(before!);
  // From the page itself, the same key turns.
  await page.locator('[data-book-area]').click();
  await page.keyboard.press('ArrowRight');
  await expect(indicator(page)).not.toHaveText(before!);
});

test('leaving book mode keeps the chapter on screen', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await page.setViewportSize(PORTRAIT);
  await openBook(page, 1);
  for (let p = chapterPage(1); p < chapterPage(2); p++) await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await page.getByRole('button', { name: 'Défilement' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(headingText(chapterByNumber(2).chapter));
  await expect(page.getByRole('progressbar')).toBeAttached();
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await expect(view(page)).toHaveCount(0);
});

test('a stored book mode opens the book pages', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize(PORTRAIT);
  await page.addInitScript(() => {
    if (!localStorage.getItem('rmp.prefs.v1'))
      localStorage.setItem('rmp.prefs.v1', JSON.stringify({ fontStep: 1, theme: null, mode: 'book', notes: false, lang: 'fr', tocOpen: null }));
  });
  await gotoReady(page, 'read/1/');
  await settle(page);
  await expect(indicator(page)).toHaveText(indicatorText([chapterPage(1)]));
  await expect(bookButton(page)).toHaveAttribute('aria-pressed', 'true');
  await reloadReady(page);
  await settle(page);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a PDF that cannot load leaves a message and the way back to scrolling', async ({ page }) => {
  await page.route(/\/downloads\/roman-final\.pdf$/, (route) => route.fulfill({ status: 404, body: 'missing' }));
  await gotoReady(page, 'read/1/');
  await bookButton(page).click();
  await expect(view(page)).toHaveAttribute('data-status', 'error');
  await expect(page.getByRole('status')).toContainText('Les pages du livre ne peuvent pas être affichées');
  await page.getByRole('button', { name: 'Lire en défilement' }).click();
  await expect(page.getByRole('progressbar')).toBeAttached();
  await expect(page.getByRole('button', { name: 'Défilement' })).toHaveAttribute('aria-pressed', 'true');
});

test('book pages make no request outside the base path', async ({ page }, testInfo) => {
  const base = String(testInfo.project.use.baseURL);
  const urls: string[] = [];
  const failures: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => failures.push(`failed ${r.url()}`));
  await openBook(page, 1);
  await page.keyboard.press('ArrowRight');
  await settle(page);
  await page.waitForLoadState('networkidle');
  expect(failures).toEqual([]);
  expect(urls.filter((u) => !/^(data|blob):/.test(u) && !u.startsWith(base))).toEqual([]);
});
