<script lang="ts">
  import type { Inline } from '@rmp/model';
  import Inlines from '../Inlines.svelte';

  // \pensee: a thought, not said aloud — italic, without a dash.
  let { node, notes }: { node: Extract<Inline, { type: 'thought' }>; notes: boolean } = $props();
</script>

<i class="thought"><Inlines nodes={node.children} {notes} /></i>
