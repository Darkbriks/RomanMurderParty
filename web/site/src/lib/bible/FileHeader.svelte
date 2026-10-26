<script lang="ts">
  import { resolve } from '$app/paths';
  import type { BibleYamlFile } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';

  // What every YAML view starts with: the legend of the file's codes, and its folder's PDFs.
  let { file }: { file: BibleYamlFile } = $props();
</script>

{#if file.legend}
  <details class="legend">
    <summary>{t(prefs.lang, 'bibleLegend')}</summary>
    <p>{file.legend}</p>
  </details>
{/if}
{#each file.pdfs as pdf (pdf.url)}
  <p class="pdf"><a href="{resolve('/')}{pdf.url}">{pdf.name}</a></p>
{/each}

<style>
  .legend {
    margin: 0 0 1.5rem;
    color: var(--accent);
    font-size: 0.9em;
  }
  .legend summary {
    cursor: pointer;
  }
  .legend p {
    margin: 0.4em 0 0;
    white-space: pre-line;
  }
  .pdf {
    margin: 0 0 1rem;
  }
</style>
