<script lang="ts">
  import type { Inline } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import Inlines from '../Inlines.svelte';

  // A working note, as the draft PDF prints it: « [à reprendre : …] » in red. The label is UI text,
  // so it follows the interface language; the note itself stays in the book's language.
  let { node, notes }: { node: Extract<Inline, { type: 'note' }>; notes: boolean } = $props();
</script>

{#if notes}<span class="note" data-note={node.kind}>[<span lang={prefs.lang}>{t(prefs.lang, node.kind === 'rework' ? 'noteRework' : 'noteAuthor')}</span>{' '}<Inlines nodes={node.children} {notes} />]</span>{/if}

<style>
  .note {
    color: var(--note);
    font-size: 0.85em;
    font-style: normal;
    font-weight: normal;
    hyphens: manual;
  }
</style>
