<script lang="ts">
  import type { Block } from '@rmp/model';
  import Ornament from '../Ornament.svelte';

  // \separation: a scene break, marked by the scene ornament.
  let { block }: { block: Extract<Block, { type: 'sceneBreak' }>; notes: boolean } = $props();
</script>

<div class="scene-break" role="separator" data-block-id={block.id}><Ornament name="scene" /></div>

<style>
  .scene-break {
    margin: 1.4em 0;
  }
</style>
