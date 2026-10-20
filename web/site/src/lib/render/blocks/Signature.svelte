<script lang="ts">
  import type { Block } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  // \signature inside a letter: right-aligned.
  let { block, notes }: { block: Extract<Block, { type: 'signature' }>; notes: boolean } = $props();
</script>

<p class="signature" data-block-id={block.id}><Inlines nodes={block.content} {notes} /></p>

<style>
  .signature {
    margin: 0.4em 0 0;
    text-align: right;
  }
</style>
