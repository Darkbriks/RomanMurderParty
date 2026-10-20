import { expect, test, type Page } from '@playwright/test';
import { chapterByNumber, chapters, firstPlaceholder, gotoReady, lastChapter, plain, reloadReady, visibleBlockIds, type ChapterInfo } from './book.ts';

// Paged mode ("Liseuse"). Expectations come from the built book (e2e/book.ts): chapter numerals,
// the last chapter, the longest chapter for multi-page checks, the placeholder chapter.
test.use({ viewport: { width: 1280, height: 800 } });

const indicator = (page: Page) => page.locator('[data-page-indicator]');
const pagedButton = (page: Page) => page.getByRole('button', { name: 'Liseuse' });
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Réglages de lecture' });
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const indicatorText = (n: number, page: number | string, count: number | string) =>
  new RegExp(`^${page} / ${count} · chapitre ${escape(chapterByNumber(n).chapter.numeral)}$`);

// The chapter with the most visible text is the likeliest to fill several pages at 1280×800
// (a document or an ornament counts as a couple of lines).
function textLength({ chapter }: ChapterInfo): number {
  const shown = new Set(visibleBlockIds(chapter));
  return chapter.blocks
    .filter((b) => shown.has(b.id))
    .reduce((sum, b) => sum + (b.type === 'paragraph' ? b.segments.reduce((s, x) => s + plain(x.content).length, 0) : 200), 0);
}
const longest = chapters.reduce((a, b) => (textLength(b) > textLength(a) ? b : a)).chapter.number;
const placeholder = firstPlaceholder();

/** Waits until fonts have loaded and the pages have been laid out with them. */
async function settle(page: Page) {
  await expect(page.locator('[data-paged-view][data-paginated]')).toBeAttached();
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
}

/** Opens a chapter and switches to paged mode with the selector in the top bar. */
async function openPaged(page: Page, n: number) {
  await gotoReady(page, `read/${n}/`);
  await pagedButton(page).click();
  await settle(page);
}

async function pageAndCount(page: Page): Promise<[number, number]> {
  const match = /^(\d+) \/ (\d+) ·/.exec((await indicator(page).textContent()) ?? '');
  expect(match, 'page indicator').not.toBeNull();
  return [Number(match![1]), Number(match![2])];
}

/** Ids of the chapter's top-level blocks that show on the current page, once the slide has ended. */
const shownBlocks = (page: Page) =>
  page.evaluate(async () => {
    const strip = document.querySelector<HTMLElement>('[data-page-strip]')!;
    const still = () => getComputedStyle(strip).transform === new DOMMatrix(strip.style.transform || 'none').toString();
    for (let i = 0; i < 100 && !still(); i++) await new Promise((r) => requestAnimationFrame(r));
    const frame = document.querySelector('[data-page-frame]')!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('[data-chapter-body] > [data-block-id]')]
      .filter((el) => [...el.getClientRects()].some((r) => r.width > 0 && r.right > frame.left + 1 && r.left < frame.right - 1))
      .map((el) => el.dataset.blockId!);
  });

/** Opens the longest chapter on its third page (or its last, if shorter); skips when it has a single page. */
async function openLaterPage(page: Page): Promise<string> {
  await openPaged(page, longest);
  const [, count] = await pageAndCount(page);
  test.skip(count < 2, `chapter ${longest}, the longest, fits on one page at 1280x800`);
  for (let i = 1; i < Math.min(3, count); i++) await page.keyboard.press('ArrowRight');
  await expect(indicator(page)).toHaveText(indicatorText(longest, Math.min(3, count), count));
  const shown = await shownBlocks(page);
  expect(shown.length).toBeGreaterThan(0);
  return shown[0]!;
}

test('indicator starts at page 1', async ({ page }) => {
  await openPaged(page, 1);
  await expect(indicator(page)).toHaveText(indicatorText(1, 1, '\\d+'));
  await expect(indicator(page)).toHaveAttribute('aria-live', 'polite');
  await expect(pagedButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Défilement' })).toHaveAttribute('aria-pressed', 'false');
});

test('arrow keys turn pages', async ({ page }) => {
  await openPaged(page, longest);
  const [, count] = await pageAndCount(page);
  test.skip(count < 2, `chapter ${longest}, the longest, fits on one page at 1280x800`);
  const at = (p: number) => expect(indicator(page)).toHaveText(indicatorText(longest, p, count));
  await page.keyboard.press('ArrowRight');
  await at(2);
  await page.keyboard.press('ArrowLeft');
  await at(1);
  await page.keyboard.press('PageDown');
  await at(2);
  await page.keyboard.press('PageUp');
  await at(1);
  // Space presses the focused mode button: it turns the page once the focus is in the text.
  await page.locator('[data-page-area]').click();
  await at(1);
  await page.keyboard.press('Space');
  await at(2);
  await page.keyboard.press('Shift+Space');
  await at(1);
  await expect(page).toHaveURL(new RegExp(`/read/${longest}/$`));
});

test('edge clicks and buttons turn pages', async ({ page }) => {
  await openPaged(page, longest);
  const [, count] = await pageAndCount(page);
  test.skip(count < 2, `chapter ${longest}, the longest, fits on one page at 1280x800`);
  const area = (await page.locator('[data-page-area]').boundingBox())!;
  await page.mouse.click(area.x + area.width * 0.9, area.y + area.height / 2);
  await expect(indicator(page)).toHaveText(indicatorText(longest, 2, count));
  await page.mouse.click(area.x + area.width * 0.1, area.y + area.height / 2);
  await expect(indicator(page)).toHaveText(indicatorText(longest, 1, count));
  // The middle of the page is for reading and selecting, not turning.
  await page.mouse.click(area.x + area.width * 0.5, area.y + area.height / 2);
  await expect(indicator(page)).toHaveText(indicatorText(longest, 1, count));
  await page.getByRole('button', { name: 'Page suivante' }).click();
  await expect(indicator(page)).toHaveText(indicatorText(longest, 2, count));
  await page.getByRole('button', { name: 'Page précédente' }).click();
  await expect(indicator(page)).toHaveText(indicatorText(longest, 1, count));
});

test('a tap that closes a menu does not turn the page', async ({ page }) => {
  await openPaged(page, longest);
  const [, count] = await pageAndCount(page);
  test.skip(count < 2, `chapter ${longest}, the longest, fits on one page at 1280x800`);
  const area = (await page.locator('[data-page-area]').boundingBox())!;
  await settingsButton(page).click();
  await page.mouse.click(area.x + area.width * 0.9, area.y + area.height * 0.8);
  await expect(page.getByRole('switch', { name: 'Notes de travail' })).toBeHidden();
  await expect(indicator(page)).toHaveText(indicatorText(longest, 1, count));
  // On a phone, the table of contents covers the page; tapping beside it only folds it.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Sommaire', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Sommaire' })).toBeVisible();
  await page.mouse.click(375, 600);
  await expect(page.getByRole('navigation', { name: 'Sommaire' })).toBeHidden();
  await expect(indicator(page)).toHaveText(/^1 \/ \d+ · /);
});

test('a horizontal swipe turns the page', async ({ page }) => {
  await openPaged(page, longest);
  const [, count] = await pageAndCount(page);
  test.skip(count < 2, `chapter ${longest}, the longest, fits on one page at 1280x800`);
  const swipe = (from: number, to: number) =>
    page.locator('[data-page-area]').evaluate(
      (area, [x0, x1]) => {
        const box = area.getBoundingClientRect();
        const at = (type: string, x: number) =>
          area.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: box.top + box.height / 2 }));
        at('pointerdown', x0!);
        at('pointermove', (x0! + x1!) / 2);
        at('pointerup', x1!);
      },
      [from, to],
    );
  await swipe(900, 700);
  await expect(indicator(page)).toHaveText(indicatorText(longest, 2, count));
  await swipe(700, 900);
  await expect(indicator(page)).toHaveText(indicatorText(longest, 1, count));
  // Under 50 px, it is not a swipe.
  await swipe(900, 870);
  await expect(indicator(page)).toHaveText(indicatorText(longest, 1, count));
});

test('last page continues to next chapter', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await openPaged(page, 1);
  const [, count] = await pageAndCount(page);
  for (let i = 1; i < count; i++) await page.keyboard.press('ArrowRight');
  await expect(indicator(page)).toHaveText(indicatorText(1, count, count));
  // The last page is not blank: it shows the end of the chapter.
  const ids = visibleBlockIds(chapterByNumber(1).chapter);
  if (ids.length > 0) expect(await shownBlocks(page)).toContain(ids[ids.length - 1]);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/read\/2\/$/);
  await expect(indicator(page)).toHaveText(indicatorText(2, 1, '\\d+'));
});

test("going back from chapter 2 lands on chapter 1's last page", async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await openPaged(page, 2);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/\/read\/1\/$/);
  await expect(indicator(page)).toHaveText(/^(\d+) \/ \1 · /);
  await expect(indicator(page)).toHaveText(indicatorText(1, '\\d+', '\\d+'));
  // The query that asked for the last page is gone: a reload does not jump to the end again.
  expect(new URL(page.url()).search).toBe('');
});

test('placeholder chapter is one page', async ({ page }) => {
  test.skip(!placeholder, 'no chapter made only of working notes');
  const n = placeholder!.chapter.number;
  await openPaged(page, n);
  await expect(indicator(page)).toHaveText(indicatorText(n, 1, 1));
  if (placeholder!.isFirstOfPart) await expect(page.locator('[data-part-title]')).toBeInViewport();
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
});

test('font size change keeps the reading position', async ({ page }) => {
  const first = await openLaterPage(page);
  await settingsButton(page).click();
  await page.getByRole('button', { name: 'Texte plus grand' }).click();
  await page.getByRole('button', { name: 'Texte plus grand' }).click();
  await expect(page.locator('html')).toHaveCSS('font-size', '22px');
  await expect.poll(() => shownBlocks(page)).toContain(first);
  await expect(page.locator(`[data-block-id="${first}"]`)).toBeInViewport();
  await page.getByRole('button', { name: 'Texte plus petit' }).click();
  await expect.poll(() => shownBlocks(page)).toContain(first);
});

test('resize keeps the reading position', async ({ page }) => {
  const first = await openLaterPage(page);
  await page.setViewportSize({ width: 800, height: 1000 });
  await expect.poll(() => shownBlocks(page)).toContain(first);
  await expect(page.locator(`[data-block-id="${first}"]`)).toBeInViewport();
});

test('a layout pass that changes nothing keeps the page', async ({ page }) => {
  await openPaged(page, longest);
  const [, count] = await pageAndCount(page);
  test.skip(count < 2, `chapter ${longest}, the longest, fits on one page at 1280x800`);
  // A late font or image triggers a new layout; pages that open inside a paragraph must not move.
  for (let p = 2; p <= count; p++) {
    await page.keyboard.press('ArrowRight');
    await expect(indicator(page)).toHaveText(indicatorText(longest, p, count));
    await page.evaluate(() => {
      document.fonts.dispatchEvent(new Event('loadingdone'));
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await expect(indicator(page)).toHaveText(indicatorText(longest, p, count));
  }
});

test('notes toggle keeps the reading position', async ({ page }) => {
  const first = await openLaterPage(page);
  await settingsButton(page).click();
  await page.getByRole('switch', { name: 'Notes de travail' }).click();
  await expect.poll(() => shownBlocks(page)).toContain(first);
});

test('page turns save the reading position', async ({ page }) => {
  const first = await openLaterPage(page);
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('rmp.position.v1')))!);
  expect(saved).toMatchObject({ chapter: longest, blockId: first });
});

test('resume from the cover opens the saved page', async ({ page }) => {
  const first = await openLaterPage(page);
  const [pageNumber] = await pageAndCount(page);
  await gotoReady(page, '');
  await page.getByRole('link', { name: /Reprendre la lecture/ }).click();
  await expect(page).toHaveURL(new RegExp(`/read/${longest}/#`));
  await settle(page);
  await expect(page.locator(`[data-block-id="${first}"]`)).toBeInViewport();
  const [now] = await pageAndCount(page);
  expect(now).toBeGreaterThan(1);
  expect(now).toBeLessThanOrEqual(pageNumber);
});

test('reload keeps the page', async ({ page }) => {
  const first = await openLaterPage(page);
  await reloadReady(page);
  await settle(page);
  expect(await shownBlocks(page)).toContain(first);
});

test('mode survives reload', async ({ page }) => {
  await openPaged(page, 1);
  await reloadReady(page);
  await expect(indicator(page)).toBeVisible();
  await expect(pagedButton(page)).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('rmp.prefs.v1')))!).mode).toBe('paged');
  // Back to scroll mode: the chapter scrolls again.
  await page.getByRole('button', { name: 'Défilement' }).click();
  await expect(indicator(page)).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toBeAttached();
});

test('switching modes keeps the reading position', async ({ page }) => {
  const first = await openLaterPage(page);
  await page.getByRole('button', { name: 'Défilement' }).click();
  await expect(page.locator(`[data-block-id="${first}"]`)).toBeInViewport();
  // Back to pages after scrolling on: the page holds the block scrolling saved.
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 500);
  await page.waitForFunction((y) => window.scrollY > y, before);
  // Scrolling down retracts the bar; a little scroll up brings it back.
  await page.mouse.wheel(0, -20);
  await pagedButton(page).click();
  await settle(page);
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('rmp.position.v1')))!);
  expect(saved.chapter).toBe(longest);
  await expect.poll(() => shownBlocks(page)).toContain(saved.blockId);
});

test('reduced motion disables the slide', async ({ page }) => {
  await openPaged(page, 1);
  const strip = page.locator('[data-page-strip]');
  await expect(strip).toHaveCSS('transition-duration', '0.2s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(strip).toHaveCSS('transition-duration', '0s');
});

test('on a phone, the mode selector is in the Aa menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page, 'read/1/');
  await expect(pagedButton(page)).toBeHidden();
  await settingsButton(page).click();
  await pagedButton(page).click();
  await settle(page);
  await expect(indicator(page)).toHaveText(indicatorText(1, 1, '\\d+'));
});
