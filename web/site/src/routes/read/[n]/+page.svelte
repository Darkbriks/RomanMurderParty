<script lang="ts">
  import { goto } from '$app/navigation';
  import { t } from '#lib/i18n/index.ts';
  import { prefs, prefsState } from '#lib/prefs/prefs.svelte.ts';
  import BookPagesView from '#lib/reader/BookPagesView.svelte';
  import { chapterHref } from '#lib/reader/links.ts';
  import PagedView from '#lib/reader/PagedView.svelte';
  import ScrollView from '#lib/reader/ScrollView.svelte';
  import Toc from '#lib/reader/Toc.svelte';
  import TopBar from '#lib/reader/TopBar.svelte';
  import { plainText } from '#lib/render/text.ts';
  import { chapterByNumber } from '#lib/render/visibility.ts';
  import { untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const wide = new MediaQuery('(min-width: 1024px)', false);
  // `tocOpen: null` means the default for the screen: unfolded from 1024 px. The media query is
  // only read once preferences have started, so the first render matches the server's.
  const tocExpanded = $derived(prefs.tocOpen ?? (prefsState.started && wide.current));
  const tocOverlay = $derived(prefsState.started && !wide.current && tocExpanded);
  let barHidden = $state(false);
  // The reading mode is a preference, not part of the URL: the prerendered page (and the first
  // client render) scroll, then stored preferences may switch the view.
  const view = $derived(prefs.mode);
  $effect(() => {
    // Pages do not scroll, so the bar that scrolling had hidden comes back.
    if (view !== 'scroll') barHidden = false;
  });

  // Book pages turn through the whole PDF and only replace the URL (a shallow navigation), so the
  // chapter they show can run ahead of the route's data. The bar, the TOC and the title follow it.
  let bookChapter = $state<number | null>(null);
  const shown = $derived((view === 'book' && bookChapter !== null ? chapterByNumber(data.book, bookChapter) : null) ?? data);
  $effect(() => {
    // Leaving book pages: the other modes render the route's chapter, so the route first catches up
    // with the chapter the pages showed (meanwhile neither view renders).
    if (view === 'book' || bookChapter === null) return;
    const n = bookChapter;
    untrack(() => {
      if (n === data.n) bookChapter = null;
      else
        goto(chapterHref(n), { replace: true }).finally(() => {
          if (prefs.mode !== 'book') bookChapter = null;
        });
    });
  });

  const pageTitle = $derived(
    `${shown.chapter.title ? `${shown.chapter.numeral}. ${plainText(shown.chapter.title)}` : t(prefs.lang, 'chapter', { numeral: shown.chapter.numeral })} — ${data.book.meta.title}`,
  );

  function toggleToc() {
    prefs.tocOpen = !tocExpanded;
  }

  function closeToc(returnFocus: boolean) {
    prefs.tocOpen = false;
    if (returnFocus) document.getElementById('toc-toggle')?.focus();
  }

  function afterTocNavigation() {
    // On a narrow screen the panel covers the text: fold it once a chapter is chosen.
    if (!wide.current) prefs.tocOpen = false;
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<a class="skip-link" href="#main">{t(prefs.lang, 'skipToText')}</a>
<TopBar title={data.book.meta.title} narrator={shown.part.narrator} downloads={data.downloads} bind:hidden={barHidden} {tocExpanded} onToggleToc={toggleToc} />
<Toc book={data.book} current={shown.chapter.number} overlay={tocOverlay} onNavigate={afterTocNavigation} onClose={closeToc} />
{#if view === 'book'}
  <BookPagesView
    book={data.book}
    chapter={data.chapter}
    pageMaps={data.pageMaps}
    downloads={data.downloads}
    overlay={tocOverlay}
    bind:shownChapter={bookChapter}
  />
{:else if bookChapter === null}
  {#if view === 'paged'}
    <PagedView book={data.book} part={data.part} chapter={data.chapter} isFirstOfPart={data.isFirstOfPart} overlay={tocOverlay} />
  {:else}
    <ScrollView book={data.book} part={data.part} chapter={data.chapter} isFirstOfPart={data.isFirstOfPart} bind:barHidden />
  {/if}
{/if}

<style>
  .skip-link {
    position: fixed;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 40;
    padding: 0.4rem 0.8rem;
    background: var(--bg);
    transform: translateY(-200%);
  }
  .skip-link:focus {
    transform: none;
  }
</style>
