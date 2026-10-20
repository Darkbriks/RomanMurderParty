<script lang="ts">
  import type { Block } from '@rmp/model';
  import Ornament from '../Ornament.svelte';

  // \fin: the closing ornament of a part or of the book.
  let { block }: { block: Extract<Block, { type: 'end' }>; notes: boolean } = $props();
</script>

<div class="end" data-block-id={block.id}><Ornament name="fin" /></div>

<style>
  .end {
    margin: 3em 0 1em;
  }
</style>
