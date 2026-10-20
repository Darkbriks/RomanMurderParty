<script lang="ts">
  import type { Block } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  // Segments (one source line each) are joined with a space when the source had one. A dialogue
  // paragraph opens with an em dash and a no-break space, as \rep prints it. The markup stays on
  // one line so that no other whitespace reaches the text.
  let { block, notes }: { block: Extract<Block, { type: 'paragraph' }>; notes: boolean } = $props();
  const dropCap = $derived(block.segments[0]?.content[0]?.type === 'dropCap');
</script>

<p class="paragraph" class:dialogue={block.dialogue} class:drop-cap-paragraph={dropCap} data-block-id={block.id}>{#if block.dialogue}{'— '}{/if}{#each block.segments as segment, i (i)}<Inlines nodes={segment.content} {notes} />{#if segment.spaceAfter}{' '}{/if}{/each}</p>

<style>
  .paragraph {
    margin: 0;
    text-indent: 1.4em;
  }
  .drop-cap-paragraph {
    text-indent: 0;
  }
</style>
