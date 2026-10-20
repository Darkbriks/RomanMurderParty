<script lang="ts">
  import { t } from '#lib/i18n/index.ts';
  import { prefs, prefsState } from '#lib/prefs/prefs.svelte.ts';
  import ScrollView from '#lib/reader/ScrollView.svelte';
  import Toc from '#lib/reader/Toc.svelte';
  import TopBar from '#lib/reader/TopBar.svelte';
  import { plainText } from '#lib/render/text.ts';
  import { MediaQuery } from 'svelte/reactivity';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const wide = new MediaQuery('(min-width: 1024px)', false);
  // `tocOpen: null` means the default for the screen: unfolded from 1024 px. The media query is
  // only read once preferences have started, so the first render matches the server's.
  const tocExpanded = $derived(prefs.tocOpen ?? (prefsState.started && wide.current));
  const tocOverlay = $derived(prefsState.started && !wide.current && tocExpanded);
  let barHidden = $state(false);

  const pageTitle = $derived(
    `${data.chapter.title ? `${data.chapter.numeral}. ${plainText(data.chapter.title)}` : t(prefs.lang, 'chapter', { numeral: data.chapter.numeral })} — ${data.book.meta.title}`,
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
<TopBar title={data.book.meta.title} narrator={data.part.narrator} downloads={data.downloads} bind:hidden={barHidden} {tocExpanded} onToggleToc={toggleToc} />
<Toc book={data.book} current={data.n} overlay={tocOverlay} onNavigate={afterTocNavigation} onClose={closeToc} />
<ScrollView book={data.book} part={data.part} chapter={data.chapter} isFirstOfPart={data.isFirstOfPart} bind:barHidden />

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
