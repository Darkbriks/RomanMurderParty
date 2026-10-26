<script lang="ts">
  import type { Bible, BibleFile } from '@rmp/model';
  import type { CharacterIndex } from './catalog.ts';
  import ChronologyView from './ChronologyView.svelte';
  import FileHeader from './FileHeader.svelte';
  import GenericView from './GenericView.svelte';
  import MarkdownView from './MarkdownView.svelte';
  import { asChronology, CHRONOLOGY_KEYS } from './shapes.ts';

  // One file of the bible (?vue=<slug>): a dedicated view when its shape is recognised (whatever
  // its name), the generic one otherwise. Dedicated views leave the keys they do not show to the
  // generic view.
  let { file, index }: { file: BibleFile; bible: Bible; index: CharacterIndex } = $props();

  const chronology = $derived(file.kind === 'yaml' ? asChronology(file.data) : null);
</script>

<h1>{file.title}</h1>
{#if file.kind === 'markdown'}
  <MarkdownView {file} />
{:else}
  <FileHeader {file} />
  {#if chronology}
    <ChronologyView {file} {chronology} {index} />
    <GenericView {file} {index} skip={CHRONOLOGY_KEYS} header={false} />
  {:else}
    <GenericView {file} {index} header={false} />
  {/if}
{/if}

<style>
  h1 {
    margin: 0 0 1.5rem;
    font-size: 1.6em;
    font-style: italic;
    font-weight: normal;
  }
</style>
