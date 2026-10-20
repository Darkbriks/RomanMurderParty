<script lang="ts">
  import type { Chapter } from '@rmp/model';
  import Inlines from './Inlines.svelte';
  import Ornament from './Ornament.svelte';

  // As in the PDF: the numeral in lowercase small caps, the chapter ornament, the title in italics.
  let { chapter, notes, id }: { chapter: Chapter; notes: boolean; id?: string } = $props();
</script>

<h1 class="chapter-heading" {id}>
  <span class="numeral">{chapter.numeral}</span>
  <Ornament name="chapitre" />
  {#if chapter.title}
    <span class="title"><Inlines nodes={chapter.title} {notes} /></span>
  {/if}
</h1>

<style>
  .chapter-heading {
    margin: 3rem 0 2.5rem;
    font-weight: normal;
    font-size: 1.45em;
    line-height: 1.3;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }
  .numeral {
    text-transform: lowercase;
    font-variant-caps: small-caps;
    letter-spacing: 0.05em;
  }
  .title {
    font-style: italic;
  }
</style>
