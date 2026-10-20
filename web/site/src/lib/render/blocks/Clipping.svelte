<script lang="ts">
  import type { Block } from '@rmp/model';
  import Blocks from '../Blocks.svelte';
  import Inlines from '../Inlines.svelte';

  // \begin{coupure}{newspaper}{headline}[date]: a dashed frame, two columns on wide screens.
  let { block, notes }: { block: Extract<Block, { type: 'clipping' }>; notes: boolean } = $props();
</script>

<div class="doc clipping" data-block-id={block.id}>
  <div class="masthead">
    <p class="newspaper spaced"><Inlines nodes={block.newspaper} {notes} /></p>
    {#if block.date}
      <p class="date"><Inlines nodes={block.date} {notes} /></p>
    {/if}
    <p class="headline"><Inlines nodes={block.headline} {notes} /></p>
  </div>
  <div class="columns"><Blocks blocks={block.body} {notes} /></div>
</div>

<style>
  .clipping {
    border-style: dashed;
  }
  .masthead {
    text-align: center;
    margin-bottom: 0.8em;
  }
  .masthead p {
    margin: 0;
  }
  .date {
    font-size: 0.85em;
    font-style: italic;
  }
  .headline {
    margin-top: 0.3em !important;
    padding-top: 0.3em;
    border-top: 1px solid var(--frame);
    font-size: 1.25em;
    font-variant-caps: small-caps;
  }
  .columns {
    font-size: 0.9em;
  }
  .columns :global(.paragraph) {
    text-indent: 1em;
  }
  @media (min-width: 720px) {
    .columns {
      columns: 2;
      column-gap: 1.6em;
    }
  }
</style>
