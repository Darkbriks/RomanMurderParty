<script lang="ts">
  import type { Book, Chapter, Part } from '@rmp/model';
  import { afterNavigate, goto } from '$app/navigation';
  import { navigating } from '$app/state';
  import { t } from '#lib/i18n/index.ts';
  import { pageCount, pageLayout, pageOfOffset, type PageLayout } from '#lib/paging/paging.ts';
  import { chapterTitleOf, readPosition, resolveResume, writePosition } from '#lib/position/position.ts';
  import { prefs, prefsState } from '#lib/prefs/prefs.svelte.ts';
  import Blocks from '#lib/render/Blocks.svelte';
  import ChapterHeading from '#lib/render/ChapterHeading.svelte';
  import FrontPage from '#lib/render/FrontPage.svelte';
  import PartTitle from '#lib/render/PartTitle.svelte';
  import { chapterByNumber, chapterlessParts, isBlockVisible } from '#lib/render/visibility.ts';
  import { onMount, untrack } from 'svelte';
  import { chapterHref } from './links.ts';

  // Paged mode, like an e-reader: the chapter flows into CSS columns as tall as the screen, which
  // overflow sideways in a strip; the strip slides by one page (one or two columns) per turn. Past
  // the last page comes the next chapter; before the first, the previous chapter's last page.
  // Geometry is measured and written imperatively (CSS variables, transform), so that a page can be
  // laid out and measured in one go; Svelte state only drives the indicator and the buttons.
  let {
    book,
    part,
    chapter,
    isFirstOfPart,
    overlay = false,
  }: { book: Book; part: Part; chapter: Chapter; isFirstOfPart: boolean; overlay?: boolean } = $props();

  const notes = $derived(prefs.notes);
  const previous = $derived(chapterByNumber(book, chapter.number - 1)?.chapter ?? null);
  const next = $derived(chapterByNumber(book, chapter.number + 1)?.chapter ?? null);
  const orphans = $derived(chapterlessParts(book, chapter.number));
  const front = $derived(book.front.epigraph || book.front.dedication ? book.front : null);
  // A chapter with nothing under its heading (a placeholder, notes hidden) shares its part's page
  // on a single column, so that it is one page, not a part page followed by a near-empty one.
  const bodyless = $derived(!chapter.blocks.some((b) => isBlockVisible(b, notes)));

  // Created outside a navigation (stored preferences applied after load, or the mode selector), the
  // view opens where the reader was: the saved position, when it is in this chapter.
  const restoreSaved = untrack(() => prefsState.started && !navigating.type);

  let area: HTMLElement | undefined = $state();
  let frame: HTMLElement | undefined = $state();
  let strip: HTMLElement | undefined = $state();
  let columns = $state<1 | 2>(1);
  let count = $state(1);
  let current = $state(0);
  let paginated = $state(false);

  let geometry: PageLayout | null = null;
  /**
   * What a re-layout keeps in view: the first thing shown after the last turn, or the block opened.
   * A page that opens inside a paragraph also keeps its first character, so that laying the pages
   * out again does not go back to where the paragraph starts.
   */
  let anchor: { el: Element; blockId: string | null; text: { node: Text; offset: number } | null } | null = null;
  /** An open that could not run yet (the area had no size). */
  let pendingOpen: 'restore' | 'navigation' | null = null;
  let leaving = false;

  const atStart = $derived(current === 0 && !previous);
  const atEnd = $derived(current >= count - 1 && !next);
  const indicator = $derived(t(prefs.lang, 'pageIndicator', { page: current + 1, count, numeral: chapter.numeral }));

  // What a page can start with, in reading order: the front page, part pages and their blocks, the
  // chapter heading and the chapter's blocks.
  const UNITS = ':scope > [data-front-page], :scope > [data-part-title], :scope > [data-block-id], #chapter-heading, [data-chapter-body] > [data-block-id]';
  const BLOCKS = '[data-chapter-body] > [data-block-id]';

  /** Lays the strip out for the current area and font; false when the area has no size yet. */
  function paginate(): boolean {
    if (!area || !frame || !strip) return false;
    const width = area.clientWidth;
    const height = area.clientHeight;
    if (width === 0 || height === 0) return false;
    const em = parseFloat(getComputedStyle(strip).fontSize) || 18;
    const g = pageLayout(width, height, em);
    geometry = g;
    area.style.setProperty('--frame-width', `${g.frameWidth}px`);
    area.style.setProperty('--frame-left', `${Math.max(0, Math.floor((width - g.frameWidth) / 2))}px`);
    area.style.setProperty('--strip-width', `${g.pageWidth}px`);
    area.style.setProperty('--column-width', `${g.columnWidth}px`);
    area.style.setProperty('--column-gap', `${g.gap}px`);
    area.style.setProperty('--page-height', `${frame.clientHeight}px`);
    // Set now for the measure below; the template keeps the same value through `columns`.
    strip.dataset.columns = String(g.columns);
    columns = g.columns;
    count = pageCount(strip.scrollWidth, g.pageWidth, g.gap);
    return true;
  }

  /** Horizontal range of page `page`, in viewport coordinates. */
  function pageRange(page: number): [number, number] {
    const left = strip!.getBoundingClientRect().left + page * geometry!.frameWidth;
    return [left, left + geometry!.pageWidth];
  }

  function isShownOn(el: Element, page: number): boolean {
    const [left, right] = pageRange(page);
    return [...el.getClientRects()].some((r) => r.width > 0 && r.right > left + 1 && r.left < right - 1);
  }

  function pageAt(rect: DOMRect): number {
    return pageOfOffset(rect.left - strip!.getBoundingClientRect().left, geometry!.pageWidth, geometry!.gap, count);
  }

  /** The page where an element starts (its first fragment). */
  function pageOf(el: Element): number {
    const first = el.getClientRects()[0];
    return first ? pageAt(first) : 0;
  }

  /** The page of one character, or null when it has no box (collapsed white space). */
  function pageOfCharacter(node: Text, offset: number): number | null {
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(node, Math.min(offset + 1, node.length));
    const rect = range.getClientRects()[0];
    return rect ? pageAt(rect) : null;
  }

  /** The first character of `el` that shows on `page` or after, as a text node and an offset. */
  function firstCharacterFrom(el: Element, page: number): { node: Text; offset: number } | null {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const end = node.data.trimEnd().length - 1; // white space may have no box
      if (end < 0) continue;
      const last = pageOfCharacter(node, end);
      if (last === null || last < page) continue;
      // Pages only grow along the text: find the first character on `page` or after.
      let low = 0;
      let high = end;
      while (low < high) {
        const middle = (low + high) >> 1;
        const at = pageOfCharacter(node, middle);
        if (at !== null && at >= page) high = middle;
        else low = middle + 1;
      }
      return { node, offset: low };
    }
    return null;
  }

  function firstShown(selector: string, page: number): HTMLElement | null {
    for (const el of strip!.querySelectorAll<HTMLElement>(selector)) if (isShownOn(el, page)) return el;
    return null;
  }

  function blockElement(id: string | null): HTMLElement | null {
    return id ? strip!.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`) : null;
  }

  /** Moves the strip to `page`, with the slide or at once. */
  function show(page: number, slide: boolean) {
    current = page;
    if (!strip || !geometry) return;
    if (!slide) strip.style.transition = 'none';
    strip.style.transform = `translateX(${-page * geometry.frameWidth}px)`;
    if (!slide) {
      void strip.offsetWidth; // apply the jump before the transition comes back
      strip.style.transition = '';
    }
  }

  function save(blockId: string | null) {
    let storage: Storage | null = null;
    try {
      storage = localStorage;
    } catch {
      return; // storage blocked: the reader simply cannot resume
    }
    writePosition(storage, {
      chapter: chapter.number,
      blockId,
      chapterTitle: chapterTitleOf(chapter),
      sha: book.meta.version.sha,
      savedAt: new Date().toISOString(),
    });
  }

  function savedBlockId(): string | null {
    let storage: Storage | null = null;
    try {
      storage = localStorage;
    } catch {
      return null;
    }
    const resume = resolveResume(book, readPosition(storage));
    return resume && resume.chapter === chapter.number ? resume.blockId : null;
  }

  /** Records what the current page shows: the anchor for re-layouts and the saved position. */
  function remember(target: HTMLElement | null) {
    const block = target?.dataset.blockId ? target : firstShown(BLOCKS, current);
    const el = target ?? firstShown(UNITS, current);
    // A unit that began on an earlier page is anchored by its first character on this one.
    const text = !target && el && pageOf(el) < current ? firstCharacterFrom(el, current) : null;
    anchor = el ? { el, blockId: el.dataset.blockId ?? null, text } : null;
    save(block?.dataset.blockId ?? null);
  }

  /**
   * Opens the chapter on the page the URL or the saved position asks for: `?page=last` (coming back
   * from the next chapter), `#block` (resume reading), else the first page.
   */
  function open(kind: 'restore' | 'navigation') {
    if (!paginate()) {
      pendingOpen = kind;
      return;
    }
    pendingOpen = null;
    const query = new URLSearchParams(location.search).get('page');
    const hash = decodeURIComponent(location.hash.slice(1));
    let target = (kind === 'restore' ? blockElement(savedBlockId()) : null) ?? (query === 'last' ? null : blockElement(hash));
    // The chapter's first block stands for its opening (scrolling saves it at the very top): open
    // the first page, with the part page that precedes the block on a single column.
    if (target && target === strip!.querySelector(BLOCKS)) target = null;
    if (target) show(pageOf(target), false);
    else show(query === 'last' ? count - 1 : 0, false);
    remember(target);
    paginated = true;
    // The query only says where to land: drop it (once the navigation has settled), so that a
    // reload or a shared link does not.
    if (query !== null) setTimeout(dropPageQuery);
  }

  function dropPageQuery() {
    const url = new URL(location.href);
    if (!url.searchParams.has('page')) return;
    url.searchParams.delete('page');
    void goto(url, { replace: true, shallow: true });
  }

  /** Lays the pages out again (new size, font size, notes) and keeps the anchor in view. */
  function relayout() {
    if (pendingOpen) return open(pendingOpen);
    if (!paginated || !paginate()) return;
    const text = anchor?.text?.node.isConnected ? pageOfCharacter(anchor.text.node, anchor.text.offset) : null;
    if (text !== null) return show(text, false);
    let target: Element | null = null;
    if (anchor) {
      // Hiding the notes can remove the anchor (a block of notes only, or the note holding the text).
      target = anchor.el.isConnected ? anchor.el : (blockElement(anchor.blockId) ?? nearestBlock(anchor.blockId));
      if (target) anchor = { el: target, blockId: anchor.blockId, text: null };
    }
    show(target ? pageOf(target) : Math.min(current, count - 1), false);
  }

  /** The next block still shown after `blockId` (in book order), else the previous one. */
  function nearestBlock(blockId: string | null): Element | null {
    const ids = chapter.blocks.map((b) => b.id);
    const at = blockId ? ids.indexOf(blockId) : -1;
    if (at < 0) return null;
    const find = (id: string) => strip!.querySelector(`${BLOCKS}[data-block-id="${CSS.escape(id)}"]`);
    for (let i = at + 1; i < ids.length; i++) {
      const el = find(ids[i]!);
      if (el) return el;
    }
    for (let i = at - 1; i >= 0; i--) {
      const el = find(ids[i]!);
      if (el) return el;
    }
    return null;
  }

  let relayoutFrame = 0;
  function scheduleRelayout() {
    if (relayoutFrame) return;
    relayoutFrame = requestAnimationFrame(() => {
      relayoutFrame = 0;
      relayout();
    });
  }

  function leave(href: string) {
    leaving = true;
    goto(href)
      .catch(() => {})
      .finally(() => (leaving = false));
  }

  function turn(delta: 1 | -1) {
    if (leaving || !paginated) return;
    const page = current + delta;
    if (page < 0) {
      if (previous) leave(`${chapterHref(previous.number)}?page=last`);
    } else if (page >= count) {
      if (next) leave(chapterHref(next.number));
    } else {
      show(page, true);
      remember(null);
    }
  }

  onMount(() => {
    open(restoreSaved ? 'restore' : 'navigation');
    const observer = new ResizeObserver(scheduleRelayout);
    observer.observe(area!);
    // Fonts arrive after the first layout (and italics only when first used); so do images.
    document.fonts?.addEventListener('loadingdone', scheduleRelayout);
    strip!.addEventListener('load', scheduleRelayout, true);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', scheduleRelayout);
      strip?.removeEventListener('load', scheduleRelayout, true);
      cancelAnimationFrame(relayoutFrame);
    };
  });

  afterNavigate((navigation) => {
    // Cleaning the URL is a shallow navigation: nothing to open.
    if (navigation.shallow) return;
    open(navigation.type === 'enter' && restoreSaved ? 'restore' : 'navigation');
  });

  $effect(() => {
    // The font size and the notes change the text, hence the pages.
    void prefs.fontStep;
    void prefs.notes;
    scheduleRelayout();
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as Element;
    if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    let delta: 1 | -1;
    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
        delta = 1;
        break;
      case 'ArrowLeft':
      case 'PageUp':
        delta = -1;
        break;
      case ' ':
        // Space presses a focused button or link; elsewhere it turns the page, Shift going back.
        if (target.closest('button, a, summary')) return;
        delta = event.shiftKey ? -1 : 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    turn(delta);
  }

  // A tap or click on the outer 30 % of the page turns it; a horizontal swipe of more than 50 px
  // too. A tap that only closes a menu or the table of contents does not turn.
  let swipe: { id: number; x: number; y: number } | null = null;
  let ignoreClick = false;

  function onPointerdown(event: PointerEvent) {
    ignoreClick = overlay || !!document.querySelector('#settings-panel:not([hidden]), #download-panel:not([hidden])');
    swipe = event.pointerType === 'mouse' ? null : { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerup(event: PointerEvent) {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      ignoreClick = true;
      turn(dx < 0 ? 1 : -1);
    }
  }

  function onClick(event: MouseEvent) {
    if (ignoreClick) {
      ignoreClick = false;
      return;
    }
    if ((event.target as Element).closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    const box = area!.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    if (x < 0.3) turn(-1);
    else if (x > 0.7) turn(1);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main id="main" class="paged" tabindex="-1" data-paged-view data-paginated={paginated ? '' : undefined}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="area"
    bind:this={area}
    data-page-area
    onpointerdown={onPointerdown}
    onpointerup={onPointerup}
    onpointercancel={() => (swipe = null)}
    onclick={onClick}
  >
    <div class="frame" bind:this={frame} data-page-frame>
      <div class="strip book" class:bodyless lang="fr" bind:this={strip} data-page-strip data-columns={columns}>
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
    </div>
    <button class="turn previous" aria-label={t(prefs.lang, 'previousPage')} disabled={atStart} onclick={() => turn(-1)}>
      <span aria-hidden="true">‹</span>
    </button>
    <button class="turn next" aria-label={t(prefs.lang, 'nextPage')} disabled={atEnd} onclick={() => turn(1)}>
      <span aria-hidden="true">›</span>
    </button>
  </div>
  <p class="indicator" data-page-indicator aria-live="polite" aria-atomic="true">{indicator}</p>
</main>

<style>
  .paged {
    --pager-height: 2.5rem;
    position: fixed;
    top: var(--bar-height);
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    outline: none;
  }
  @media (min-width: 1024px) {
    :global(:root:not([data-toc='closed'])) .paged {
      left: var(--toc-width);
    }
  }
  .area {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    overflow: clip;
    /* Horizontal swipes are ours; vertical panning and pinch-zoom stay with the browser. */
    touch-action: pan-y pinch-zoom;
  }
  .frame {
    position: absolute;
    top: 1.5rem;
    bottom: 0.25rem;
    left: var(--frame-left, 0);
    width: var(--frame-width, 100%);
    /* `clip`, not `hidden`: find-in-page and focus must not scroll the frame behind our back. */
    overflow: hidden;
    overflow: clip;
  }
  .paged:not([data-paginated]) .frame {
    visibility: hidden;
  }
  .strip {
    position: relative;
    height: 100%;
    width: var(--strip-width, 100%);
    margin-left: calc(var(--column-gap, 0px) / 2);
    column-width: var(--column-width, auto);
    column-gap: var(--column-gap, 0);
    column-fill: auto;
    orphans: 2;
    widows: 2;
    transition: transform 0.2s ease-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .strip {
      transition: none;
    }
  }

  /* The front page and each part page stand alone, as on the PDF's recto pages. */
  .strip > :global([data-front-page]),
  .strip > :global(header[data-part-title]) {
    min-height: 0;
    padding: calc(var(--page-height, 40rem) * 0.18) 0 0;
    break-after: column;
    break-inside: avoid;
  }
  /* The chapter opens a page of its own, as \chapitre does. */
  .chapter {
    break-before: column;
  }
  .strip > .chapter ~ :global(header[data-part-title]) {
    break-before: column;
  }
  .strip :global(h1.chapter-heading) {
    margin-top: 0;
    padding-top: calc(var(--page-height, 40rem) * 0.1);
    break-after: avoid;
  }
  /* A chapter with nothing under its heading joins its part page on a single column. */
  .strip.bodyless[data-columns='1'] > :global(header[data-part-title]:has(+ .chapter)) {
    padding-top: calc(var(--page-height, 40rem) * 0.12);
    padding-bottom: 1rem;
    break-after: auto;
  }
  .strip.bodyless[data-columns='1'] > .chapter {
    break-before: auto;
  }
  .strip.bodyless[data-columns='1'] :global(h1.chapter-heading) {
    padding-top: 1rem;
  }
  .strip :global(section.annex-page) {
    margin: 0;
    break-before: column;
    break-after: column;
  }
  .strip :global(.doc) {
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .strip :global(figure),
  .strip :global(.scene-break),
  .strip :global(.end) {
    break-inside: avoid;
  }
  /* A scene break belongs to the scene it opens, not alone at the foot of a page. */
  .strip :global(.scene-break) {
    break-after: avoid;
  }
  .strip :global(img) {
    max-height: calc(var(--page-height, 40rem) - 4em);
    object-fit: contain;
  }

  .turn {
    position: absolute;
    top: 50%;
    z-index: 1;
    width: 1.5rem;
    height: 5rem;
    margin-top: -2.5rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 1.6rem;
    line-height: 1;
    opacity: 0.45;
    cursor: pointer;
  }
  .turn:hover,
  .turn:focus-visible {
    opacity: 1;
  }
  .turn:disabled {
    visibility: hidden;
  }
  .previous {
    left: 0;
  }
  .next {
    right: 0;
  }
  /* On touch screens the edges are tapped, not aimed at: no arrows over the text. */
  @media (hover: none) {
    .turn:not(:focus-visible) {
      opacity: 0;
    }
  }
  .indicator {
    flex: none;
    height: var(--pager-height);
    margin: 0;
    display: grid;
    place-items: center;
    color: var(--accent);
    font-size: 15px;
    font-variant-numeric: lining-nums;
    letter-spacing: 0.03em;
  }
</style>
