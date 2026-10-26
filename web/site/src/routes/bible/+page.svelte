<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { Bible } from '@rmp/model';
  import BibleGate from '#lib/bible/BibleGate.svelte';
  import { clearConsent, readConsent, writeConsent } from '#lib/bible/consent.ts';
  import { loadBible } from '#lib/data/load.ts';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import SettingsMenu from '#lib/reader/SettingsMenu.svelte';

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

  $effect(() => {
    if (!accepted || bible !== undefined) return;
    loadBible(fetch, base).then(
      (b) => (bible = b),
      (e: unknown) => (failure = e instanceof Error ? e.message : String(e)),
    );
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
    {:else}
      <ul>
        {#each bible.files as file (file.slug)}
          <li><a href="?vue={file.slug}">{file.title}</a></li>
        {/each}
      </ul>
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
</style>
