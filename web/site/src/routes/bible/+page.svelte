<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { Bible } from '@rmp/model';
  import BibleGate from '#lib/bible/BibleGate.svelte';
  import BibleHome from '#lib/bible/BibleHome.svelte';
  import { characterIndex, fileBySlug } from '#lib/bible/catalog.ts';
  import FileView from '#lib/bible/FileView.svelte';
  import { clearConsent, readConsent, writeConsent } from '#lib/bible/consent.ts';
  import { loadBible } from '#lib/data/load.ts';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import SettingsMenu from '#lib/reader/SettingsMenu.svelte';
  import { tick } from 'svelte';

  // Rendered in the browser only (+page.ts): nothing of the bible is in the prerendered page, and
  // data/bible.json is fetched once the reader has accepted the spoilers.
  const storage = (() => {
    try {
      return localStorage;
    } catch {
      return null;
    }
  })();
  const base = resolve('/').replace(/\/$/, '');

  let accepted = $state(readConsent(storage));
  let bible = $state<Bible | null | undefined>(undefined);
  let failure = $state<string | null>(null);
  const index = $derived(bible ? characterIndex(bible) : null);
  // The view is in the URL: ?vue=<file slug>, ?perso=<character id>, or nothing for the contents.
  const vue = $derived(page.url.searchParams.get('vue'));
  const perso = $derived(page.url.searchParams.get('perso'));

  $effect(() => {
    if (!accepted || bible !== undefined) return;
    loadBible(fetch, base).then(
      (b) => (bible = b),
      (e: unknown) => (failure = e instanceof Error ? e.message : String(e)),
    );
  });

  // The views only exist once the bible is loaded, after the browser's own jump to the URL's
  // fragment: scroll to it once the view is rendered (deep links, search results).
  $effect(() => {
    if (!bible || !index) return;
    const hash = page.url.hash;
    tick().then(() => {
      if (hash.length > 1) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
      else window.scrollTo(0, 0);
    });
  });

  function accept() {
    writeConsent(storage);
    accepted = true;
  }

  function close() {
    clearConsent(storage);
    accepted = false;
    goto(resolve('/'));
  }
</script>

<svelte:head>
  <title>{t(prefs.lang, 'bibleTitle')}</title>
</svelte:head>

<header class="bar">
  <a class="back" href={resolve('/')}>← {t(prefs.lang, 'backToCover')}</a>
  <div class="tools">
    {#if accepted}<button class="close" onclick={close}>{t(prefs.lang, 'bibleClose')}</button>{/if}
    <SettingsMenu />
  </div>
</header>

{#if !accepted}
  <BibleGate onaccept={accept} />
{:else}
  <main class="bible" lang="fr">
    {#if failure}
      <p class="status">{failure}</p>
    {:else if bible === undefined}
      <p class="status">{t(prefs.lang, 'loading')}</p>
    {:else if bible === null}
      <p class="status">{t(prefs.lang, 'bibleUnavailable')}</p>
    {:else if index}
      {#if vue || perso}<p class="home"><a href="./">← {t(prefs.lang, 'bibleHome')}</a></p>{/if}
      {#if vue}
        {@const file = fileBySlug(bible, vue)}
        {#if file}<FileView {file} {bible} {index} />{:else}<p class="status">{t(prefs.lang, 'bibleUnknownView')}</p>{/if}
      {:else if perso}
        <p class="status">{perso}</p>
      {:else}
        <BibleHome {bible} {index} />
      {/if}
    {/if}
  </main>
{/if}

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--bar-height);
    box-sizing: border-box;
    padding: 0 0.75em;
    border-bottom: 1px solid var(--rule);
    color: var(--accent);
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .close {
    padding: 0.15em 0.6em;
    border: 1px solid var(--rule);
    background: none;
    color: var(--accent);
    font-size: 0.9em;
    cursor: pointer;
  }
  .bible {
    max-width: 46em;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 4rem;
  }
  .status {
    text-align: center;
    color: var(--accent);
  }
  .home {
    margin: 0 0 1rem;
    font-size: 0.9em;
  }
</style>
