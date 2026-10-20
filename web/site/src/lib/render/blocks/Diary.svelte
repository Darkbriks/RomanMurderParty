<script lang="ts">
  import type { Block } from '@rmp/model';
  import Blocks from '../Blocks.svelte';
  import Inlines from '../Inlines.svelte';

  // \begin{journal}{heading}: a diary page with a rule on the left, in italics.
  let { block, notes }: { block: Extract<Block, { type: 'diary' }>; notes: boolean } = $props();
</script>

<div class="doc diary" data-block-id={block.id}>
  <p class="heading spaced"><Inlines nodes={block.heading} {notes} /></p>
  <div class="entry"><Blocks blocks={block.body} {notes} /></div>
</div>

<style>
  .diary {
    border: none;
    border-left: 2px solid var(--frame);
  }
  .heading {
    margin: 0 0 0.4em;
  }
  .entry {
    font-style: italic;
  }
</style>
