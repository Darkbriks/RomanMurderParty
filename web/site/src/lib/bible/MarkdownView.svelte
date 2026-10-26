<script lang="ts">
  import type { BibleMarkdownFile } from '@rmp/model';

  // bible.md, notes-de-scene.md: HTML rendered at build time from the author's own repository.
  let { file }: { file: BibleMarkdownFile } = $props();
</script>

<div class="prose">{@html file.sections.map((s) => s.html).join('\n')}</div>

<style>
  .prose {
    max-width: 38em;
  }
  .prose :global(h1) {
    display: none; /* the view already shows the file's title */
  }
  .prose :global(h2),
  .prose :global(h3) {
    margin: 1.8em 0 0.5em;
    color: var(--accent);
    font-weight: normal;
    scroll-margin-top: 1rem;
  }
  .prose :global(:target) {
    outline: 2px solid var(--accent);
  }
  .prose :global(table) {
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
  }
  .prose :global(td),
  .prose :global(th) {
    padding: 0.2em 0.5em;
    border: 1px solid var(--rule);
  }
</style>
