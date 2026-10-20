<script lang="ts">
  import type { Inline } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  // \debut{B}{elgravia}: a sepia drop cap, then the rest of the word in small caps (lettrine).
  let { node, notes }: { node: Extract<Inline, { type: 'dropCap' }>; notes: boolean } = $props();
</script>

<span class="drop-cap">{node.letter}</span><span class="sc"><Inlines nodes={node.rest} {notes} /></span>

<style>
  /* lettrine with lines=2: the letter spans two lines of text (line-height 1.6). */
  .drop-cap {
    float: left;
    font-size: 3.5em;
    line-height: 0.82;
    margin: 0.04em 0.06em 0 0;
    color: var(--accent);
  }
</style>
