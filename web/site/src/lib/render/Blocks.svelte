<script lang="ts">
  import type { Block } from '@rmp/model';
  import type { Component } from 'svelte';
  import { blockRenderers } from './registry.ts';
  import { isBlockVisible } from './visibility.ts';

  let { blocks, notes }: { blocks: Block[]; notes: boolean } = $props();
</script>

{#each blocks as block (block.id)}
  {#if isBlockVisible(block, notes)}
    {@const Renderer = blockRenderers[block.type] as Component<{ block: Block; notes: boolean }>}
    <Renderer {block} {notes} />
  {/if}
{/each}
