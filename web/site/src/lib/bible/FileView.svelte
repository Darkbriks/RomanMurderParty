<script lang="ts">
  import type { Bible, BibleFile } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import type { CharacterIndex } from './catalog.ts';
  import ChronologyView from './ChronologyView.svelte';
  import FileHeader from './FileHeader.svelte';
  import GenericView from './GenericView.svelte';
  import HouseView from './HouseView.svelte';
  import MarkdownView from './MarkdownView.svelte';
  import RelationsView from './RelationsView.svelte';
  import { asChronology, asHouse, asRelations, CHRONOLOGY_KEYS, RELATIONS_KEYS } from './shapes.ts';

  // One file of the bible (?vue=<slug>): a dedicated view when its shape is recognised (whatever
  // its name), the generic one otherwise. Dedicated views leave the keys they do not show to the
  // generic view.
  let { file, index }: { file: BibleFile; bible: Bible; index: CharacterIndex } = $props();

  const chronology = $derived(file.kind === 'yaml' ? asChronology(file.data) : null);
  const relations = $derived(file.kind === 'yaml' ? asRelations(file.data) : null);
  const house = $derived(file.kind === 'yaml' ? asHouse(file.data) : null);
</script>

<h1>{file.title}</h1>
{#if file.kind === 'markdown'}
  <MarkdownView {file} />
{:else}
  <FileHeader {file} pdfLabel={house ? t(prefs.lang, 'biblePlans') : undefined} />
  {#if chronology}
    <ChronologyView {file} {chronology} {index} />
    <GenericView {file} {index} skip={CHRONOLOGY_KEYS} header={false} />
  {:else if relations}
    <RelationsView {file} {relations} {index} />
    <GenericView {file} {index} skip={RELATIONS_KEYS} header={false} />
  {:else if house}
    <HouseView {file} levels={house} {index} />
    <GenericView {file} {index} skip={['niveaux']} header={false} />
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
