<script lang="ts">
  import type { Inline } from '@rmp/model';

  let { node }: { node: Extract<Inline, { type: 'text' }>; notes: boolean } = $props();
</script>

{node.text}
