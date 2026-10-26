<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Downloads } from '@rmp/model';
  import { formatBytes, t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';

  // The PDF menu: one link per file of downloads.json (final, draft with notes), with its size.
  // Used by the top bar and the cover; `variant` only changes how the toggle looks.
  let {
    downloads,
    open = $bindable(false),
    variant = 'bar',
  }: { downloads: Downloads; open?: boolean; variant?: 'bar' | 'cover' } = $props();

  let container: HTMLElement | undefined = $state();
  let button: HTMLButtonElement | undefined = $state();

  function onKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      open = false;
      button?.focus();
    }
  }

  function onPointerdown(event: PointerEvent) {
    if (open && container && !container.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerdown} />

<div class="downloads {variant}" bind:this={container}>
  <button
    bind:this={button}
    class="toggle"
    aria-label={t(prefs.lang, 'downloadPdf')}
    aria-expanded={open}
    aria-controls="download-panel"
    onclick={() => (open = !open)}
  >
    <span aria-hidden="true">⤓ PDF</span>
  </button>

  <ul id="download-panel" class="panel" hidden={!open}>
    {#each downloads.items as item (item.url)}
      <li>
        <a href="{resolve('/')}{item.url}" download={item.filename}>
          <span>
            {t(prefs.lang, item.variant === 'final' ? 'downloadFinal' : 'downloadDraft')}
            {#if item.variant === 'brouillon'}<small class="hint">{t(prefs.lang, 'notesHint')}</small>{/if}
          </span>
          <span class="size">{formatBytes(prefs.lang, item.bytes)}</span>
        </a>
      </li>
    {/each}
  </ul>
</div>

<style>
  .downloads {
    position: relative;
  }
  .toggle {
    cursor: pointer;
    white-space: nowrap;
  }
  .bar .toggle {
    height: 2.25em;
    padding: 0 0.5em;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 0.95em;
  }
  .cover .toggle {
    padding: 0.35em 1em;
    border: 1px solid var(--accent);
    border-radius: 2px;
    background: none;
    color: var(--accent);
  }
  .toggle[aria-expanded='true'] {
    text-decoration: underline;
    text-underline-offset: 0.3em;
  }
  .panel {
    position: absolute;
    z-index: 30;
    top: calc(100% + 0.4em);
    right: 0;
    min-width: 15em;
    max-width: calc(100vw - 1em);
    box-sizing: border-box;
    margin: 0;
    padding: 0.25em 0;
    list-style: none;
    background: var(--doc-paper);
    color: var(--ink);
    border: 1px solid var(--rule);
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.14);
    font-size: 16px;
    text-align: left;
  }
  .cover .panel {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
  .panel[hidden] {
    display: none;
  }
  .panel a {
    display: flex;
    justify-content: space-between;
    gap: 1.5em;
    padding: 0.4em 0.9em;
    color: var(--ink);
    text-decoration: none;
  }
  .panel a:hover {
    background: var(--bg-panel);
    text-decoration: underline;
  }
  .hint {
    display: block;
    color: var(--accent);
    font-size: 0.8em;
  }
  .size {
    color: var(--accent);
    white-space: nowrap;
  }
</style>
