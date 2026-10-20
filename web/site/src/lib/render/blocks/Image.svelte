<script lang="ts">
  import { asset } from '$app/paths';
  import type { AssetPath } from '$app/types';
  import type { Block } from '@rmp/model';
  import Inlines from '../Inlines.svelte';
  import { plainText } from '../text.ts';

  // \plan[width]{file}{caption} and \planpleinepage: the file is published at the same path
  // under the site base (web/scripts/build-data.ts copies it).
  let { block, notes }: { block: Extract<Block, { type: 'image' }>; notes: boolean } = $props();
  const width = $derived(block.fullPage || block.widthFraction === null ? '100%' : `${Math.min(1, block.widthFraction) * 100}%`);
</script>

<figure class="image" class:full-page={block.fullPage} data-block-id={block.id}>
  <img src={asset(block.src as AssetPath)} alt={plainText(block.caption)} style:width={width} loading="lazy" />
  {#if block.caption.length > 0}
    <figcaption><Inlines nodes={block.caption} {notes} /></figcaption>
  {/if}
</figure>

<style>
  .image {
    margin: 1.4em 0;
    text-align: center;
  }
  img {
    display: block;
    margin: 0 auto;
    height: auto;
    max-width: 100%;
  }
  .full-page img {
    max-height: 88vh;
    object-fit: contain;
  }
  figcaption {
    margin-top: 0.4em;
    font-size: 0.85em;
    font-style: italic;
  }
</style>
