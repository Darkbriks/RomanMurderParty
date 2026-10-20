<script lang="ts">
  import type { Block } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  // \postscriptum inside a letter: « p.-s. » in small caps, then the text.
  let { block, notes }: { block: Extract<Block, { type: 'postscript' }>; notes: boolean } = $props();
</script>

<p class="postscript" data-block-id={block.id}><span class="sc">p.-s.</span>{' '}<Inlines nodes={block.content} {notes} /></p>

<style>
  .postscript {
    margin: 0.4em 0 0;
  }
</style>
