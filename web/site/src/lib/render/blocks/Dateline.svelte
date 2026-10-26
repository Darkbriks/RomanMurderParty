<script lang="ts">
  import type { Block, Inline } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  // \lieudate{place}{date}, as in the PDF: the place in spaced small caps, a short rule, the date in
  // italics. A line that would print nothing is left out, and the rule only separates two lines.
  let { block, notes }: { block: Extract<Block, { type: 'dateline' }>; notes: boolean } = $props();

  const shows = (nodes: Inline[]): boolean =>
    nodes.some((n) => (n.type === 'note' ? notes : n.type === 'text' ? n.text.trim() !== '' : true));
  const place = $derived(shows(block.place));
  const date = $derived(shows(block.date));
</script>

<div class="dateline" data-block-id={block.id}>
  {#if place}<p class="place"><Inlines nodes={block.place} {notes} /></p>{/if}
  {#if place && date}<span class="rule" aria-hidden="true"></span>{/if}
  {#if date}<p class="date"><Inlines nodes={block.date} {notes} /></p>{/if}
</div>

<style>
  .dateline {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35em;
    margin: -1.2rem 0 1.8rem;
    text-align: center;
  }
  p {
    margin: 0;
  }
  .place {
    color: var(--accent);
    font-variant-caps: all-small-caps;
    letter-spacing: 0.12em;
  }
  .rule {
    width: 2.5em;
    border-top: 1px solid var(--accent);
  }
  .date {
    font-style: italic;
  }
</style>
