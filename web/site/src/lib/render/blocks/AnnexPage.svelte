<script lang="ts">
  import type { Block } from '@rmp/model';
  import Blocks from '../Blocks.svelte';
  import Inlines from '../Inlines.svelte';
  import Ornament from '../Ornament.svelte';

  // \pageannexe{title}{content}: a page of its own between two parts.
  let { block, notes }: { block: Extract<Block, { type: 'annexPage' }>; notes: boolean } = $props();
</script>

<section class="annex-page" data-block-id={block.id}>
  <div class="head">
    <p class="spaced"><Inlines nodes={block.title} {notes} /></p>
    <Ornament name="scene" />
  </div>
  <Blocks blocks={block.body} {notes} />
</section>

<style>
  .annex-page {
    margin: 3em 0;
  }
  .head {
    margin-bottom: 1.4em;
    text-align: center;
  }
  .head p {
    margin: 0 0 0.4em;
  }
</style>
