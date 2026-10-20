<script lang="ts">
  import type { Part } from '@rmp/model';
  import Inlines from './Inlines.svelte';
  import Ornament from './Ornament.svelte';

  // The part page of the PDF (\partie): label, ornament, narrator, epigraph.
  let { part, notes }: { part: Part; notes: boolean } = $props();
</script>

<header class="part-title" data-part-title>
  <p class="label spaced">{part.label}</p>
  <Ornament name="partie" />
  <p class="narrator">{part.narrator}</p>
  {#if part.epigraph}
    <p class="epigraph"><Inlines nodes={part.epigraph} {notes} /></p>
  {/if}
</header>

<style>
  .part-title {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1.3rem;
    padding: 3rem 0 4rem;
    text-align: center;
  }
  p {
    margin: 0;
  }
  .label {
    font-size: 1.2em;
  }
  .narrator {
    color: var(--accent);
    font-size: 2.4em;
    font-style: italic;
    line-height: 1.15;
  }
  .epigraph {
    margin-top: 1.5rem;
    font-size: 0.9em;
    font-style: italic;
    max-width: 26em;
  }
</style>
