<script lang="ts">
  import type { Inline } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  let { node, notes }: { node: Extract<Inline, { type: 'bold' }>; notes: boolean } = $props();
</script>

<strong><Inlines nodes={node.children} {notes} /></strong>
