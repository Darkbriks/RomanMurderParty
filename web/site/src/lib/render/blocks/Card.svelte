<script lang="ts">
  import type { Block } from '@rmp/model';
  import Blocks from '../Blocks.svelte';

  // \begin{carton}: a small centred document (a card, a note, an inscription).
  let { block, notes }: { block: Extract<Block, { type: 'card' }>; notes: boolean } = $props();
</script>

<div class="doc card" data-block-id={block.id}><Blocks blocks={block.body} {notes} /></div>

<style>
  .card {
    width: 75%;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }
  .card :global(.paragraph) {
    text-indent: 0;
  }
</style>
