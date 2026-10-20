<script lang="ts">
  import type { Book, Chapter, Downloads, PageMap, PageMaps } from '@rmp/model';
  import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
  import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { t } from '#lib/i18n/index.ts';
  import { loadPdf } from '#lib/pdf/pdf.ts';
  import { chapterForPage, nextSpreadStart, prevSpreadStart, samePlace, spreadFor } from '#lib/pdf/spreads.ts';
  import { chapterTitleOf, writePosition } from '#lib/position/position.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { chapterByNumber } from '#lib/render/visibility.ts';
  import { onMount, untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { chapterHref } from './links.ts';

  // Book pages mode: the PDF's own pages, drawn by pdf.js (loaded on first use, see pdf.ts). The
  // notes switch picks the PDF: the draft (brouillon) with notes, the final one without, each with
  // its page map. A wide landscape window shows an open book, a narrower one single pages. Pages
  // turn through the whole PDF; when the chapter on screen changes, the URL follows (replaced, not
  // pushed) and the reading position is saved, without a block. `shownChapter` tells the page
  // which chapter that is, since the route's data keeps the one the view opened at.
  type Variant = 'final' | 'brouillon';
  let {
    book,
    chapter,
    pageMaps,
    downloads,
    overlay = false,
    shownChapter = $bindable(null),
  }: {
    book: Book;
    chapter: Chapter;
    pageMaps: PageMaps;
    downloads: Downloads;
    overlay?: boolean;
    shownChapter?: number | null;
  } = $props();

  /** Space around the pages, in CSS pixels. */
  const MARGIN = 12;

  const wanted = $derived<Variant>(prefs.notes ? 'brouillon' : 'final');
  const wide = new MediaQuery('(min-width: 1024px) and (orientation: landscape)', false);

  let status = $state<'loading' | 'ready' | 'error'>('loading');
  /** The PDF on screen (it stays while the other one loads). */
  let variant = $state<Variant | null>(null);
  let count = $state(0);
  /** The page the reader is on: any page of the spread on a wide screen. */
  let page = $state(1);
  /** Page size at scale 1, in PDF points. */
  let pageBox = $state<{ width: number; height: number } | null>(null);
  let areaBox = $state({ width: 0, height: 0 });

  let area: HTMLElement | undefined = $state();
  let spread: HTMLElement | undefined = $state();

  const map = $derived<PageMap | null>(variant ? pageMaps[variant] : null);
  const visible = $derived(count > 0 ? spreadFor(page, count, wide.current) : []);
  const chapterOnScreen = $derived(map && visible.length > 0 ? chapterForPage(map, visible[visible.length - 1]!) : null);
  const scale = $derived.by(() => {
    if (!pageBox || areaBox.width === 0 || areaBox.height === 0) return 0;
    const slots = wide.current ? 2 : 1;
    const byHeight = (areaBox.height - 2 * MARGIN) / pageBox.height;
    const byWidth = (areaBox.width - 2 * MARGIN) / (slots * pageBox.width);
    return Math.max(0.05, Math.min(byHeight, byWidth));
  });
  const canTurn = $derived(status === 'ready' && count > 0);
  const atStart = $derived(!canTurn || prevSpreadStart(page, count, wide.current) === null);
  const atEnd = $derived(!canTurn || nextSpreadStart(page, count, wide.current) === null);
  const indicator = $derived(
    visible.length === 0
      ? t(prefs.lang, 'loading')
      : visible.length === 1
        ? t(prefs.lang, 'bookPageIndicator', { page: visible[0]!, count })
        : t(prefs.lang, 'bookSpreadIndicator', { first: visible[0]!, last: visible[1]!, count }),
  );

  // ---- Loading the PDF ----

  let doc: PDFDocumentProxy | null = null;
  /** Bumped whenever `doc` changes, so that bitmaps of the previous PDF are never reused. */
  let docId = 0;
  let loadToken = 0;
  let requested: Variant | null = null;
  /** A chapter to open once the PDF is there (the route's, or a later navigation's). */
  let pendingChapter: number | null = untrack(() => chapter.number);
  let destroyed = false;

  const firstPageOf = (m: PageMap, n: number, pages: number) => Math.min(Math.max(1, m.chapters[n - 1] ?? 1), pages);

  async function show(target: Variant) {
    const token = ++loadToken;
    const item = downloads.items.find((i) => i.format === 'pdf' && i.variant === target);
    const targetMap = pageMaps[target];
    const n = pendingChapter ?? chapterOnScreen ?? chapter.number;
    // Without the PDF or its page for the chapter, the mode cannot work: say so (see the template).
    if (!item || targetMap.chapters[n - 1] === undefined) {
      status = 'error';
      return;
    }
    status = 'loading';
    try {
      const next = await loadPdf(`${resolve('/')}${item.url}`);
      const first = await next.getPage(1);
      if (token !== loadToken || destroyed) {
        void next.loadingTask.destroy();
        return;
      }
      const from = map;
      // The other PDF opens on the same chapter (and as far into it), a first PDF on the chapter asked for.
      const at =
        pendingChapter === null && from && doc ? samePlace(from, targetMap, page, next.numPages) : firstPageOf(targetMap, n, next.numPages);
      cancelJobs(() => true);
      evictBitmaps(() => true);
      void doc?.loadingTask.destroy();
      doc = next;
      docId++;
      const box = first.getViewport({ scale: 1 });
      pageBox = { width: box.width, height: box.height };
      count = next.numPages;
      variant = target;
      page = at;
      pendingChapter = null;
      status = 'ready';
    } catch {
      if (token === loadToken && !destroyed) status = 'error';
    }
  }

  $effect(() => {
    // On mount, then whenever the notes switch asks for the other PDF.
    const target = wanted;
    untrack(() => {
      if (target === requested) return;
      requested = target;
      void show(target);
    });
  });

  /** Shows chapter `n` from its first page (now, or once the PDF has loaded). */
  function openChapter(n: number) {
    if (status === 'ready' && map && map.chapters[n - 1] !== undefined) page = firstPageOf(map, n, count);
    else pendingChapter = n;
  }

  // A navigation (the table of contents, back and forward) opens the route's chapter; our own URL
  // updates are shallow and leave the page alone. A URL update still waiting is dropped, so that it
  // cannot undo the navigation.
  beforeNavigate((navigation) => {
    if (!navigation.shallow) clearTimeout(urlTimer);
  });
  afterNavigate((navigation) => {
    if (!navigation.shallow) openChapter(chapter.number);
  });

  // ---- The chapter on screen: URL and reading position ----

  let urlTimer: ReturnType<typeof setTimeout> | undefined;
  let savedChapter: number | null = null;

  function save(n: number) {
    const found = chapterByNumber(book, n);
    if (!found) return;
    let storage: Storage | null = null;
    try {
      storage = localStorage;
    } catch {
      return; // storage blocked: the reader simply cannot resume
    }
    writePosition(storage, {
      chapter: n,
      blockId: null,
      chapterTitle: chapterTitleOf(found.chapter),
      sha: book.meta.version.sha,
      savedAt: new Date().toISOString(),
    });
  }

  function updateUrl(n: number) {
    const href = chapterHref(n);
    if (location.pathname === href && !location.search && !location.hash) return;
    // A shallow, replacing navigation (Kit 3's replaceState): no history entry, no scroll or focus reset.
    goto(href, { replace: true, shallow: true }).catch(() => {});
  }

  $effect(() => {
    const n = chapterOnScreen;
    if (n === null) return;
    untrack(() => {
      shownChapter = n;
      if (n !== savedChapter) {
        savedChapter = n;
        save(n);
      }
      // Coalesced, as browsers limit how often the history may be rewritten (fast page turns).
      clearTimeout(urlTimer);
      urlTimer = setTimeout(() => updateUrl(n), 200);
    });
  });

  // ---- Drawing ----

  /**
   * Rendered pages by `docId:page:pixel scale`: the spread on screen and the ones on either side,
   * so that a turn draws at once. Nothing else is kept: a page at the screen's density weighs
   * several megabytes.
   */
  const bitmaps = new Map<string, HTMLCanvasElement>();
  /** Renders in flight, by the same key. */
  const jobs = new Map<string, { cancel: () => void; done: Promise<HTMLCanvasElement | null> }>();
  let paintToken = 0;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  const keyOf = (p: number, pixelScale: number) => `${docId}:${p}:${pixelScale.toFixed(4)}`;
  /** Device pixels per PDF point: pages are drawn at the screen's pixel density. */
  const pixelScaleOf = (cssScale: number) => cssScale * (window.devicePixelRatio || 1);

  function evictBitmaps(drop: (key: string) => boolean) {
    for (const [key, bitmap] of bitmaps) {
      if (!drop(key)) continue;
      bitmap.width = bitmap.height = 0; // frees its memory now (Safari caps the total)
      bitmaps.delete(key);
    }
  }

  function cancelJobs(drop: (key: string) => boolean) {
    for (const [key, job] of jobs) {
      if (!drop(key)) continue;
      job.cancel();
      jobs.delete(key);
    }
  }

  /** Page `p` drawn on a canvas of its own, at `pixelScale` device pixels per PDF point; null if cancelled. */
  function render(p: number, pixelScale: number): Promise<HTMLCanvasElement | null> {
    const key = keyOf(p, pixelScale);
    const hit = bitmaps.get(key);
    if (hit) return Promise.resolve(hit);
    const running = jobs.get(key);
    if (running) return running.done;
    const source = doc!;
    let cancelled = false;
    let task: RenderTask | null = null;
    const job = {
      cancel: () => {
        cancelled = true;
        task?.cancel();
      },
      done: Promise.resolve<HTMLCanvasElement | null>(null),
    };
    job.done = (async () => {
      try {
        const pdfPage = await source.getPage(p);
        if (cancelled) return null;
        const viewport = pdfPage.getViewport({ scale: pixelScale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        task = pdfPage.render({ canvas, viewport });
        await task.promise;
        bitmaps.set(key, canvas);
        return canvas;
      } catch (error) {
        // Cancelled, or the PDF was replaced meanwhile: not a failure.
        if (cancelled || source !== doc) return null;
        throw error;
      } finally {
        if (jobs.get(key) === job) jobs.delete(key);
      }
    })();
    jobs.set(key, job);
    return job.done;
  }

  /** Draws the pages on screen, then renders the neighbouring spreads ahead of the next turn. */
  async function paint() {
    const token = ++paintToken;
    if (!doc || !spread || scale === 0) return;
    const pixelScale = pixelScaleOf(scale);
    const pages = [...visible];
    const next = nextSpreadStart(page, count, wide.current);
    const previous = prevSpreadStart(page, count, wide.current);
    const ahead = [next, previous].flatMap((p) => (p === null ? [] : spreadFor(p, count, wide.current)));
    // Pages that left the screen and its neighbours (fast turns, a new size) are dropped, renders included.
    const keep = new Set([...pages, ...ahead].map((p) => keyOf(p, pixelScale)));
    cancelJobs((key) => !keep.has(key));
    evictBitmaps((key) => !keep.has(key));
    try {
      await Promise.all(
        pages.map(async (p) => {
          const bitmap = await render(p, pixelScale);
          // The size may have changed meanwhile: the paint the resize scheduled draws these pages.
          if (!bitmap || token !== paintToken || pixelScale !== pixelScaleOf(scale)) return;
          const canvas = spread?.querySelector<HTMLCanvasElement>(`canvas[data-pdf-page="${p}"]`);
          if (!canvas) return;
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
          canvas.dataset.scale = String(pixelScale);
          canvas.dataset.rendered = '';
        }),
      );
    } catch {
      if (token === paintToken && !destroyed) status = 'error';
      return;
    }
    if (token !== paintToken) return;
    for (const p of ahead) render(p, pixelScale).catch(() => {});
  }

  $effect(() => {
    // A turn (or another PDF) draws at once, from the bitmaps rendered ahead when they are there.
    void visible;
    void variant;
    void spread;
    untrack(() => void paint());
  });

  $effect(() => {
    // A new size stretches the pages on screen at once and draws them sharp once it settles.
    if (scale === 0) return;
    const pixelScale = String(pixelScaleOf(scale));
    untrack(() => {
      for (const canvas of spread?.querySelectorAll('canvas') ?? []) if (canvas.dataset.scale !== pixelScale) delete canvas.dataset.rendered;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => void paint(), 150);
    });
  });

  $effect(() => {
    const el = area;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      areaBox = { width: el.clientWidth, height: el.clientHeight };
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  onMount(() => () => {
    destroyed = true;
    loadToken++;
    paintToken++;
    clearTimeout(urlTimer);
    clearTimeout(resizeTimer);
    cancelJobs(() => true);
    evictBitmaps(() => true);
    void doc?.loadingTask.destroy();
    doc = null;
  });

  // ---- Turning pages ----

  function turn(delta: 1 | -1) {
    if (!canTurn) return;
    const to = delta > 0 ? nextSpreadStart(page, count, wide.current) : prevSpreadStart(page, count, wide.current);
    if (to !== null) page = to;
  }

  // Keys turn pages unless the focus is where they mean something else: a form control, the table
  // of contents, the Aa and PDF menus (their toggles included).
  const KEEP_KEYS =
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), #toc, #settings-panel, #download-panel, [aria-controls="settings-panel"], [aria-controls="download-panel"]';

  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as Element;
    if (target.closest(KEEP_KEYS)) return;
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

  // A tap or click on the outer 30 % of the pages turns them; a horizontal swipe of more than 50 px
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
    const box = area!.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    if (x < 0.3) turn(-1);
    else if (x > 0.7) turn(1);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main id="main" class="book-pages" tabindex="-1" data-book-view data-status={status} data-variant={variant ?? undefined}>
  {#if status === 'error'}
    <div class="unavailable" role="status">
      <p>{t(prefs.lang, 'bookUnavailable')}</p>
      <button onclick={() => (prefs.mode = 'scroll')}>{t(prefs.lang, 'bookUseScroll')}</button>
    </div>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      class="area"
      bind:this={area}
      data-book-area
      onpointerdown={onPointerdown}
      onpointerup={onPointerup}
      onpointercancel={() => (swipe = null)}
      onclick={onClick}
    >
      {#if visible.length > 0 && pageBox}
        <div
          class="spread"
          class:open={wide.current}
          bind:this={spread}
          style:--page-width="{pageBox.width * scale}px"
          style:--page-height="{pageBox.height * scale}px"
        >
          {#each visible as p (p)}
            <!-- ARIA in HTML allows any role on <canvas>; Svelte's check counts it as interactive. -->
            <!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
            <canvas
              data-pdf-page={p}
              class:verso={wide.current && p % 2 === 0}
              class:recto={wide.current && p % 2 === 1}
              role="img"
              aria-label={t(prefs.lang, 'bookPage', { page: p })}
            ></canvas>
          {/each}
        </div>
      {:else}
        <p class="loading">{t(prefs.lang, 'loading')}</p>
      {/if}
      <button class="turn previous" aria-label={t(prefs.lang, 'previousPage')} disabled={atStart} onclick={() => turn(-1)}>
        <span aria-hidden="true">‹</span>
      </button>
      <button class="turn next" aria-label={t(prefs.lang, 'nextPage')} disabled={atEnd} onclick={() => turn(1)}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
    <p class="indicator" data-book-indicator aria-live="polite" aria-atomic="true">{indicator}</p>
  {/if}
</main>

<style>
  .book-pages {
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
    :global(:root:not([data-toc='closed'])) .book-pages {
      left: var(--toc-width);
    }
  }
  .area {
    position: relative;
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    overflow: clip;
    /* Horizontal swipes are ours; vertical panning and pinch-zoom stay with the browser. */
    touch-action: pan-y pinch-zoom;
  }
  .spread {
    display: grid;
    grid-template-columns: var(--page-width);
  }
  /* An open book: even pages on the left, odd pages on the right, page 1 alone on the right. */
  .spread.open {
    grid-template-columns: var(--page-width) var(--page-width);
  }
  canvas {
    display: block;
    grid-row: 1;
    width: var(--page-width);
    height: var(--page-height);
    /* The PDF's paper, before pdf.js has drawn the page. */
    background: #fff;
    box-shadow: 0 1px 6px rgb(0 0 0 / 0.2);
  }
  .verso {
    grid-column: 1;
  }
  .recto {
    grid-column: 2;
  }
  .loading {
    margin: 0;
    color: var(--accent);
  }
  .unavailable {
    max-width: 30em;
    margin: auto;
    padding: 2rem 1.25rem;
    text-align: center;
  }
  .unavailable button {
    padding: 0.35em 1em;
    border: 1px solid var(--accent);
    border-radius: 2px;
    background: none;
    color: var(--accent);
    cursor: pointer;
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
  /* On touch screens the edges are tapped, not aimed at: no arrows over the pages. */
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
