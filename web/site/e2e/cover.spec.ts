import { expect, test, type Page } from '@playwright/test';
import { book, chapterByNumber, chapters, loadDownloads, visibleBlockIds, gotoReady, headingText, lastChapter, plain, resumeLabel, updateDate } from './book.ts';

// Expectations come from the built data (e2e/book.ts), never from today's wording of the novel.
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Réglages de lecture' });
const resumeLink = (page: Page) => page.getByRole('link', { name: /Reprendre la lecture/ });
const pdfButton = (page: Page) => page.getByRole('button', { name: 'Télécharger en PDF' });
const second = Math.min(2, lastChapter);

test('cover shows title, author and update date', async ({ page }) => {
  await gotoReady(page, '');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(book.meta.title);
  if (book.meta.author) await expect(page.locator('main')).toContainText(book.meta.author);
  const date = updateDate('fr');
  await expect(page.locator('main')).toContainText(date ? `Mis à jour le ${date}` : 'Version locale');
});

test('start opens chapter 1', async ({ page }) => {
  await gotoReady(page, '');
  await page.getByRole('link', { name: 'Commencer' }).click();
  await expect(page).toHaveURL(/\/read\/1\/$/);
});

test('no resume button on first visit', async ({ page }) => {
  await gotoReady(page, '');
  await expect(page.getByRole('link', { name: 'Commencer' })).toBeVisible();
  await expect(resumeLink(page)).toHaveCount(0);
});

test('resume after reading chapter 2', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await gotoReady(page, 'read/2/');
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rmp.position.v1'))).toContain('"chapter":2');
  // Scrolling down retracts the bar; scrolling up brings it back.
  await page.mouse.wheel(0, -20);
  await page.getByRole('link', { name: book.meta.title }).click();
  await expect(page).toHaveURL(/\/RomanMurderParty\/$/);
  await expect(resumeLink(page)).toContainText(resumeLabel(chapterByNumber(2)));
  await resumeLink(page).click();
  await expect(page).toHaveURL(/\/read\/2\/(#.*)?$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(headingText(chapterByNumber(2).chapter));
});

test('resume lands on the saved block, below the fold', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // The chapter with the most visible blocks is the likeliest to have one below the fold.
  const info = chapters.reduce((a, b) => (visibleBlockIds(b.chapter).length > visibleBlockIds(a.chapter).length ? b : a));
  await gotoReady(page, `read/${info.chapter.number}/`);
  const blockId = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll<HTMLElement>('[data-chapter-body] > [data-block-id]')];
    return blocks.find((b) => b.getBoundingClientRect().top > window.innerHeight * 1.5)?.dataset.blockId ?? null;
  });
  test.skip(!blockId, 'no chapter has a block below the fold at 1280x800');
  const title = info.chapter.title ? plain(info.chapter.title) : null;
  await page.evaluate(
    ([chapter, id, chapterTitle]) =>
      localStorage.setItem('rmp.position.v1', JSON.stringify({ chapter, blockId: id, chapterTitle, sha: 'x', savedAt: '2026-10-20T10:00:00Z' })),
    [info.chapter.number, blockId, title] as const,
  );
  await gotoReady(page, '');
  await resumeLink(page).click();
  await expect(page).toHaveURL(new RegExp(`/read/${info.chapter.number}/#`));
  await expect(page.locator(`[data-block-id="${blockId}"]`)).toBeInViewport();
});

test('leaving a chapter right after scrolling keeps the position', async ({ page }) => {
  test.skip(lastChapter < 2, 'the book has a single chapter');
  await gotoReady(page, 'read/1/');
  await page.mouse.wheel(0, 400);
  await page.getByRole('link', { name: /Chapitre suivant/ }).click();
  await expect(page).toHaveURL(/\/read\/2\/$/);
  const saved = await page.evaluate(() => localStorage.getItem('rmp.position.v1'));
  expect(JSON.parse(saved!).chapter).toBe(1);
});

test('resume survives a reload of the cover without hydration errors', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (m) => messages.push(`${m.type()}: ${m.text()}`));
  await page.addInitScript(() => {
    localStorage.setItem(
      'rmp.position.v1',
      JSON.stringify({ chapter: 1, blockId: null, chapterTitle: null, sha: 'x', savedAt: '2026-10-20T10:00:00Z' }),
    );
  });
  await gotoReady(page, '');
  await expect(resumeLink(page)).toBeVisible();
  expect(messages.filter((m) => /hydrat|error/i.test(m))).toEqual([]);
});

test('pdf menu lists both variants and links work', async ({ page }) => {
  const downloads = loadDownloads();
  test.skip(downloads.length === 0, 'static/data/downloads.json is missing or lists no file (run npm run data)');
  await gotoReady(page, '');
  await pdfButton(page).click();
  const links = page.locator('#download-panel a[download]');
  await expect(links).toHaveCount(downloads.length);
  for (const item of downloads) {
    const link = page.locator(`#download-panel a[download="${item.filename}"]`);
    await expect(link).toBeVisible();
    const res = await page.request.get(await link.evaluate((a: HTMLAnchorElement) => a.href));
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
  }
  await page.keyboard.press('Escape');
  await expect(links.first()).toBeHidden();
  await expect(pdfButton(page)).toBeFocused();
});

test('pdf menu is in the reader top bar', async ({ page }) => {
  const downloads = loadDownloads();
  test.skip(downloads.length === 0, 'static/data/downloads.json is missing or lists no file (run npm run data)');
  await gotoReady(page, 'read/1/');
  await pdfButton(page).click();
  await expect(page.locator('#download-panel a[download]')).toHaveCount(downloads.length);
});

test('characters page groups people', async ({ page }) => {
  const group = book.characters.groups.find((g) => g.people.length > 0);
  test.skip(!group, 'the book has no character group');
  await gotoReady(page, '');
  await page.getByRole('link', { name: 'Les personnages' }).click();
  await expect(page).toHaveURL(/\/characters\/$/);
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  if (group!.name) expect(text).toContain(group!.name);
  const at = group!.name ? text.indexOf(group!.name) : 0;
  expect(text.indexOf(group!.people[0]!.name, at)).toBeGreaterThanOrEqual(at);
  const other = book.characters.groups.find((g) => g !== group && g.name && g.people.length > 0);
  if (other) expect(text.indexOf(other.name!)).toBeGreaterThan(text.indexOf(group!.people[0]!.name));
});

test('toc links to the characters page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoReady(page, 'read/1/');
  await page.getByRole('navigation', { name: 'Sommaire' }).getByRole('link', { name: 'Les personnages' }).click();
  await expect(page).toHaveURL(/\/characters\/$/);
});

test('language switch', async ({ page }) => {
  await gotoReady(page, '');
  await settingsButton(page).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('link', { name: 'Start' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Characters' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(book.meta.title);
  const date = updateDate('en');
  await expect(page.locator('main')).toContainText(date ? `Updated on ${date}` : 'Local version');
});
