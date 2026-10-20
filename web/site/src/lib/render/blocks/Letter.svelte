<script lang="ts">
  import type { Block } from '@rmp/model';
  import Blocks from '../Blocks.svelte';
  import Inlines from '../Inlines.svelte';

  // \begin{lettre}[place]{salutation}: cream paper, thin frame, italic text.
  let { block, notes }: { block: Extract<Block, { type: 'letter' }>; notes: boolean } = $props();
</script>

<div class="doc letter" data-block-id={block.id}>
  {#if block.place}
    <p class="place"><Inlines nodes={block.place} {notes} /></p>
  {/if}
  <p class="salutation"><Inlines nodes={block.salutation} {notes} /></p>
  <Blocks blocks={block.body} {notes} />
</div>

<style>
  .letter {
    font-style: italic;
  }
  p {
    margin: 0;
  }
  .place {
    text-align: right;
  }
  .salutation {
    margin-bottom: 0.4em;
  }
</style>
