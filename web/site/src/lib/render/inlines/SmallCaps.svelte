<script lang="ts">
  import type { Inline } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  let { node, notes }: { node: Extract<Inline, { type: 'smallCaps' }>; notes: boolean } = $props();
</script>

<span class="sc"><Inlines nodes={node.children} {notes} /></span>
