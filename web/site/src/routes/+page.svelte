<script lang="ts">
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { chapterHref } from '#lib/reader/links.ts';
  import type { PageProps } from './$types';

  // Temporary cover (Task 13 replaces it). The Start link also lets the prerender crawl reach the chapters.
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.book.meta.title}</title>
</svelte:head>

<main>
  <h1>{data.book.meta.title}</h1>
  <p>{t(prefs.lang, 'siteSubtitle')}</p>
  <p><a href={chapterHref(1)}>{t(prefs.lang, 'start')}</a></p>
</main>

<style>
  main {
    max-width: 40rem;
    margin: 4rem auto;
    padding: 0 1rem;
    text-align: center;
  }
</style>
