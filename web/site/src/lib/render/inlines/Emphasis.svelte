<script lang="ts">
  import type { Inline } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  let { node, notes }: { node: Extract<Inline, { type: 'emphasis' }>; notes: boolean } = $props();
</script>

<em><Inlines nodes={node.children} {notes} /></em>
