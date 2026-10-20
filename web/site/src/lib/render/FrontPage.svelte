<script lang="ts">
  import type { Book } from '@rmp/model';
  import Inlines from './Inlines.svelte';

  // The dedication and epigraph of the front matter (\dedicace, \epigraphe), before the first part.
  let { front, notes }: { front: Book['front']; notes: boolean } = $props();
</script>

<div class="front-page" data-front-page>
  {#if front.dedication}
    <p class="dedication"><Inlines nodes={front.dedication} {notes} /></p>
  {/if}
  {#if front.epigraph}
    <blockquote class="epigraph">
      <p><Inlines nodes={front.epigraph.text} {notes} /></p>
      {#if front.epigraph.source}
        <p class="source">{'— '}<Inlines nodes={front.epigraph.source} {notes} /></p>
      {/if}
    </blockquote>
  {/if}
</div>

<style>
  .front-page {
    min-height: 50vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6rem;
    padding: 3rem 0;
  }
  p {
    margin: 0;
  }
  .dedication {
    text-align: center;
    font-style: italic;
  }
  .epigraph {
    margin: 0 0 0 auto;
    width: 70%;
    font-style: italic;
  }
  .source {
    margin-top: 0.5em;
    text-align: right;
    font-style: normal;
  }
</style>
