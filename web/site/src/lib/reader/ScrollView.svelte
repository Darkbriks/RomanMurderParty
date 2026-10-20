<script lang="ts">
  import type { Book, Chapter, Part } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { afterNavigate } from '$app/navigation';
  import { navigating } from '$app/state';
  import { chapterTitleOf, readPosition, resolveResume, writePosition, type SavedPosition } from '#lib/position/position.ts';
  import { prefs, prefsState } from '#lib/prefs/prefs.svelte.ts';
  import Blocks from '#lib/render/Blocks.svelte';
  import ChapterHeading from '#lib/render/ChapterHeading.svelte';
  import FrontPage from '#lib/render/FrontPage.svelte';
  import PartTitle from '#lib/render/PartTitle.svelte';
  import { plainText } from '#lib/render/text.ts';
  import { chapterByNumber, chapterlessParts } from '#lib/render/visibility.ts';
  import { onMount, untrack } from 'svelte';
  import { chapterHref } from './links.ts';

  // Scroll mode: one chapter per page, a reading-progress bar, links to the neighbouring chapters.
  // It reports the scroll direction through `barHidden` so the top bar can slide away.
  let {
    book,
    part,
    chapter,
    isFirstOfPart,
    barHidden = $bindable(false),
  }: { book: Book; part: Part; chapter: Chapter; isFirstOfPart: boolean; barHidden?: boolean } = $props();

  const notes = $derived(prefs.notes);
  const previous = $derived(chapterByNumber(book, chapter.number - 1)?.chapter ?? null);
  const next = $derived(chapterByNumber(book, chapter.number + 1)?.chapter ?? null);
  const orphans = $derived(chapterlessParts(book, chapter.number));
  const front = $derived(book.front.epigraph || book.front.dedication ? book.front : null);

  let progress = $state(0);
  let lastY = 0;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 1;
    const delta = y - lastY;
    if (y <= 80) barHidden = false;
    else if (Math.abs(delta) >= 8) barHidden = delta > 0;
    else return;
    lastY = y;
  }

  $effect(() => {
    // The text height changes with the chapter, the notes and the font size.
    void chapter.id;
    void prefs.notes;
    void prefs.fontStep;
    const frame = requestAnimationFrame(onScroll);
    return () => cancelAnimationFrame(frame);
  });

  // The reading position: the first block in view, saved 500 ms after the reader stops moving. The
  // snapshot is taken when the movement happens, so a save that is still pending can be flushed
  // later (leaving by in-app navigation, a chapter change, the tab being hidden) without reading
  // the DOM of another chapter.
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let pending: SavedPosition | null = null;

  function barHeight(): number {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-height')) || 48;
  }

  function snapshot(): SavedPosition {
    const blocks = document.querySelectorAll<HTMLElement>('[data-chapter-body] > [data-block-id]');
    const top = barHeight();
    const first = [...blocks].find((el) => el.getBoundingClientRect().bottom > top + 1);
    return {
      chapter: chapter.number,
      blockId: first?.dataset.blockId ?? null,
      chapterTitle: chapterTitleOf(chapter),
      sha: book.meta.version.sha,
      savedAt: new Date().toISOString(),
    };
  }

  /** Writes the pending snapshot now, if there is one. */
  function flushPosition() {
    clearTimeout(saveTimer);
    if (!pending) return;
    const position = pending;
    pending = null;
    try {
      writePosition(localStorage, position);
    } catch {
      // storage blocked: the reader simply cannot resume
    }
  }

  function scheduleSave() {
    // Nothing is recorded before the stored preferences apply: in another mode this view is only the
    // first render, and its top of the chapter must not replace the position saved by that mode.
    if (!prefsState.started || prefs.mode !== 'scroll') return;
    pending = snapshot();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPosition, 500);
  }

  $effect(() => {
    // Opening a chapter counts as reading it.
    void chapter.id;
    scheduleSave();
    // Leaving the chapter (another chapter, the cover) keeps the last position.
    return flushPosition;
  });

  function scrollToBlock(id: string | null) {
    const target = id ? document.querySelector<HTMLElement>(`[data-chapter-body] [data-block-id="${CSS.escape(id)}"]`) : null;
    if (!target) return;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - barHeight() - 16 });
  }

  // A #block-id in the URL (the cover's resume button) scrolls to that block. This runs after the
  // navigation, whose own scroll handling looks for an element with that id (blocks carry
  // data-block-id, so it finds none and resets to the top) and would otherwise undo ours.
  afterNavigate(() => {
    try {
      scrollToBlock(decodeURIComponent(location.hash.slice(1)));
    } catch {
      // A malformed percent-encoding names no block.
    }
  });

  // Created outside a navigation once preferences have started, the view replaces another mode
  // (the reader chose scrolling): it opens at the position that mode saved in this chapter.
  const restoreSaved = untrack(() => prefsState.started && !navigating.type);
  onMount(() => {
    if (!restoreSaved) return;
    let storage: Storage | null = null;
    try {
      storage = localStorage;
    } catch {
      return;
    }
    const resume = resolveResume(book, readPosition(storage));
    if (resume?.chapter === chapter.number) scrollToBlock(resume.blockId);
  });

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      scheduleSave();
      flushPosition();
    }
  }

  function onTap(event: MouseEvent) {
    // A tap on the text brings the bar back, unless it follows a link or selects text.
    if ((event.target as Element).closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    barHidden = false;
  }

</script>

{#snippet which(c: Chapter)}
  <span class="which" lang="fr"><span class="numeral">{c.numeral}</span>{#if c.title}.{' '}{plainText(c.title)}{/if}</span>
{/snippet}

<svelte:window onscroll={() => { onScroll(); scheduleSave(); }} onresize={onScroll} onpagehide={flushPosition} onvisibilitychange={onVisibility} />

<div class="progress" class:raised={barHidden} role="progressbar" aria-label={t(prefs.lang, 'readingProgress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
  <span style:transform="scaleX({progress})"></span>
</div>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<main id="main" class="reader" tabindex="-1" onclick={onTap}>
  <div class="book" lang="fr">
    {#if front && chapter.number === 1}
      <FrontPage {front} {notes} />
    {/if}
    {#each orphans.before as other (other.id)}
      <PartTitle part={other} {notes} />
      <Blocks blocks={other.intro} {notes} />
    {/each}
    {#if isFirstOfPart}
      <PartTitle {part} {notes} />
      <Blocks blocks={part.intro} {notes} />
    {/if}
    <article class="chapter" aria-labelledby="chapter-heading">
      <ChapterHeading {chapter} {notes} id="chapter-heading" />
      <div class="chapter-body" data-chapter-body>
        <Blocks blocks={chapter.blocks} {notes} />
      </div>
    </article>
    {#each orphans.after as other (other.id)}
      <PartTitle part={other} {notes} />
      <Blocks blocks={other.intro} {notes} />
    {/each}
  </div>

  {#if previous || next}
    <nav class="chapter-nav" aria-label={t(prefs.lang, 'chapterNav')}>
      {#if previous}
        <a class="previous" rel="prev" href={chapterHref(previous.number)}>
          <span class="direction">← {t(prefs.lang, 'previousChapter')}</span>
          {@render which(previous)}
        </a>
      {/if}
      {#if next}
        <a class="next" rel="next" href={chapterHref(next.number)}>
          <span class="direction">{t(prefs.lang, 'nextChapter')} →</span>
          {@render which(next)}
        </a>
      {/if}
    </nav>
  {/if}
</main>

<style>
  .progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 25;
    height: 2px;
    transform: translateY(var(--bar-height));
    transition: transform 0.2s ease;
  }
  .progress.raised {
    transform: none;
  }
  .progress span {
    display: block;
    height: 100%;
    background: var(--accent);
    transform-origin: left;
  }
  @media (prefers-reduced-motion: reduce) {
    .progress {
      transition: none;
    }
  }
  .reader {
    box-sizing: border-box;
    padding: calc(var(--bar-height) + 1.5rem) 1.25rem 4rem;
    outline: none;
  }
  @media (min-width: 1024px) {
    :global(:root:not([data-toc='closed'])) .reader {
      margin-left: var(--toc-width);
    }
  }
  .book,
  .chapter-nav {
    max-width: 34em;
    margin: 0 auto;
  }
  .chapter-nav {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 4rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--rule);
  }
  .chapter-nav a {
    display: flex;
    flex-direction: column;
    max-width: 48%;
    text-decoration: none;
  }
  .chapter-nav a:hover .which {
    text-decoration: underline;
  }
  .next {
    margin-left: auto;
    text-align: right;
  }
  .direction {
    font-size: 0.8em;
    font-variant-caps: small-caps;
    letter-spacing: 0.06em;
  }
  .which {
    font-style: italic;
  }
  .numeral {
    text-transform: lowercase;
    font-variant-caps: small-caps;
    font-style: normal;
  }
</style>
