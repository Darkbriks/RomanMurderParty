<script lang="ts">
  import { t, type MessageKey } from '#lib/i18n/index.ts';
  import { prefs, prefsState, type Mode } from '#lib/prefs/prefs.svelte.ts';

  // The reading-mode selector: segmented buttons, the chosen one pressed. The top bar shows it from
  // 720 px and the Aa menu below that (both places render it; CSS shows one).
  let { labelledby }: { labelledby?: string } = $props();

  const MODES: { mode: Mode; label: MessageKey }[] = [
    { mode: 'scroll', label: 'modeScroll' },
    { mode: 'paged', label: 'modePaged' },
    { mode: 'book', label: 'modeBook' },
  ];
  // The stored mode is only known once preferences have started: nothing is pressed before that.
  const shown = $derived(prefsState.started ? prefs.mode : null);
</script>

<div class="modes" role="group" aria-label={labelledby ? undefined : t(prefs.lang, 'readingMode')} aria-labelledby={labelledby}>
  {#each MODES as { mode, label } (mode)}
    <button aria-pressed={shown === mode} onclick={() => (prefs.mode = mode)}>{t(prefs.lang, label)}</button>
  {/each}
</div>

<style>
  .modes {
    display: flex;
    flex: none;
    border: 1px solid var(--rule);
  }
  button {
    padding: 0.15em 0.6em;
    border: none;
    background: none;
    color: var(--accent);
    white-space: nowrap;
    cursor: pointer;
  }
  button + button {
    border-left: 1px solid var(--rule);
  }
  button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--bg);
  }
</style>
