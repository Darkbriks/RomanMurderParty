<script lang="ts">
  import type { Bible, BibleFile } from '@rmp/model';
  import type { CharacterIndex } from './catalog.ts';
  import GenericView from './GenericView.svelte';
  import MarkdownView from './MarkdownView.svelte';

  // One file of the bible (?vue=<slug>): a dedicated view when its shape is recognised, the generic
  // one otherwise.
  let { file, index }: { file: BibleFile; bible: Bible; index: CharacterIndex } = $props();
</script>

<h1>{file.title}</h1>
{#if file.kind === 'markdown'}
  <MarkdownView {file} />
{:else}
  <GenericView {file} {index} />
{/if}

<style>
  h1 {
    margin: 0 0 1.5rem;
    font-size: 1.6em;
    font-style: italic;
    font-weight: normal;
  }
</style>
