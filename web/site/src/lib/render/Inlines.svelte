<script lang="ts">
  import type { Inline } from '@rmp/model';
  import type { Component } from 'svelte';
  import { inlineRenderers } from './registry.ts';

  // The markup below stays on one line: whitespace between inline nodes would show in the text.
  let { nodes, notes }: { nodes: Inline[]; notes: boolean } = $props();
</script>

{#each nodes as node, i (i)}{@const Renderer = inlineRenderers[node.type] as Component<{ node: Inline; notes: boolean }>}<Renderer {node} {notes} />{/each}
