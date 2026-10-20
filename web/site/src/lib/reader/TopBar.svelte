<script lang="ts">
  import { resolve } from '$app/paths';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import type { Downloads } from '@rmp/model';
  import DownloadMenu from './DownloadMenu.svelte';
  import SettingsMenu from './SettingsMenu.svelte';

  // ☰, the book title (to the cover), the current narrator as in the PDF's odd running heads, and
  // the tools (the PDF menu and Aa). The bar slides away while the reader
  // scrolls down; it stays while one of its menus is open or holds the keyboard focus.
  let {
    title,
    narrator,
    downloads,
    hidden = $bindable(false),
    tocExpanded,
    onToggleToc,
  }: { title: string; narrator: string; downloads: Downloads; hidden?: boolean; tocExpanded: boolean; onToggleToc: () => void } = $props();

  let settingsOpen = $state(false);
  let downloadsOpen = $state(false);
  const retracted = $derived(hidden && !settingsOpen && !downloadsOpen);
</script>

<header class="topbar" class:retracted onfocusin={() => (hidden = false)}>
  <div class="start">
    <button
      id="toc-toggle"
      class="icon"
      aria-label={t(prefs.lang, 'toc')}
      aria-expanded={tocExpanded}
      aria-controls="toc"
      onclick={onToggleToc}
    >
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
        <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
    <a class="title sc" href={resolve('/')} lang="fr">{title}</a>
  </div>
  <span class="narrator spaced" lang="fr">{narrator}</span>
  <div class="tools">
    <DownloadMenu {downloads} bind:open={downloadsOpen} />
    <SettingsMenu bind:open={settingsOpen} />
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    height: var(--bar-height);
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.75em;
    padding: 0 0.5em;
    background: var(--bg);
    border-bottom: 1px solid var(--rule);
    color: var(--accent);
    font-size: 16px;
    transition: transform 0.2s ease;
  }
  .retracted {
    transform: translateY(-100%);
  }
  @media (prefers-reduced-motion: reduce) {
    .topbar {
      transition: none;
    }
  }
  .start {
    display: flex;
    align-items: center;
    gap: 0.4em;
    min-width: 0;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 2.5em;
    height: 2.25em;
    flex: none;
    border: none;
    background: none;
    color: var(--accent);
    cursor: pointer;
  }
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    letter-spacing: 0.05em;
    text-decoration: none;
  }
  .title:hover {
    text-decoration: underline;
  }
  .narrator {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tools {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 0.25em;
  }
  @media (max-width: 719.98px) {
    .title {
      display: none;
    }
  }
</style>
