<script lang="ts" module>
  const DEPTH = Symbol('quote depth');
</script>

<script lang="ts">
  import type { Inline } from '@rmp/model';
  import { getContext, setContext } from 'svelte';
  import Inlines from '../Inlines.svelte';

  // \enquote with csquotes in French: « … » with no-break spaces, “…” for a quote inside a quote.
  let { node, notes }: { node: Extract<Inline, { type: 'quote' }>; notes: boolean } = $props();
  const nested = (getContext<number | undefined>(DEPTH) ?? 0) > 0;
  setContext(DEPTH, (getContext<number | undefined>(DEPTH) ?? 0) + 1);
</script>

{#if nested}“<Inlines nodes={node.children} {notes} />”{:else}{'« '}<Inlines nodes={node.children} {notes} />{' »'}{/if}
