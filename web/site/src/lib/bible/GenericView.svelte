<script lang="ts">
  import type { BibleYamlFile } from '@rmp/model';
  import { ambiguousIds, anchorFor, humanizeKey, isRecord, type CharacterIndex } from './catalog.ts';
  import FileHeader from './FileHeader.svelte';
  import ValueView from './ValueView.svelte';

  // A YAML file as it comes: its legend, its PDFs, then one section per top-level key. Dedicated
  // views use it for the keys they do not handle (`skip`), without repeating the legend.
  let {
    file,
    index,
    skip = [],
    header = true,
  }: { file: BibleYamlFile; index: CharacterIndex; skip?: readonly string[]; header?: boolean } = $props();
  const ambiguous = $derived(ambiguousIds(file.data));
</script>

{#if header}<FileHeader {file} />{/if}

{#if isRecord(file.data)}
  {#each Object.entries(file.data).filter(([key]) => !skip.includes(key)) as [key, value] (key)}
    <section id={anchorFor(file.slug, [key])}>
      <h2>{humanizeKey(key)}</h2>
      <ValueView {value} path={[key]} slug={file.slug} {index} {ambiguous} />
    </section>
  {/each}
{:else}
  <ValueView value={file.data} path={[]} slug={file.slug} {index} {ambiguous} />
{/if}

<style>
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
