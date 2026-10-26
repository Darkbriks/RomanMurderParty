<script lang="ts">
  import { resolve } from '$app/paths';
  import type { BibleYamlFile } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { anchorFor, humanizeKey, isRecord, type CharacterIndex } from './catalog.ts';
  import ValueView from './ValueView.svelte';

  // A YAML file as it comes: its legend, its PDFs, then one section per top-level key. Dedicated
  // views use it for the keys they do not handle (`skip`), without repeating the legend.
  let {
    file,
    index,
    skip = [],
    header = true,
  }: { file: BibleYamlFile; index: CharacterIndex; skip?: readonly string[]; header?: boolean } = $props();
</script>

{#if header}
  {#if file.legend}
    <details class="legend">
      <summary>{t(prefs.lang, 'bibleLegend')}</summary>
      <p>{file.legend}</p>
    </details>
  {/if}
  {#each file.pdfs as pdf (pdf.url)}
    <p class="pdf"><a href="{resolve('/')}{pdf.url}">{pdf.name}</a></p>
  {/each}
{/if}

{#if isRecord(file.data)}
  {#each Object.entries(file.data).filter(([key]) => !skip.includes(key)) as [key, value] (key)}
    <section id={anchorFor(file.slug, [key])}>
      <h2>{humanizeKey(key)}</h2>
      <ValueView {value} path={[key]} slug={file.slug} {index} />
    </section>
  {/each}
{:else}
  <ValueView value={file.data} path={[]} slug={file.slug} {index} />
{/if}

<style>
  .legend {
    margin: 0 0 1.5rem;
    color: var(--accent);
    font-size: 0.9em;
  }
  .legend summary {
    cursor: pointer;
  }
  .legend p {
    margin: 0.4em 0 0;
    white-space: pre-line;
  }
  .pdf {
    margin: 0 0 1rem;
  }
  section {
    margin: 0 0 2rem;
    scroll-margin-top: 1rem;
  }
  h2 {
    margin: 0 0 0.75rem;
    color: var(--accent);
    font-size: 1.1em;
    font-weight: normal;
    letter-spacing: 0.04em;
  }
</style>
