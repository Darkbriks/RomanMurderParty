<script lang="ts">
  import { resolve } from '$app/paths';
  import { formatDate, t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { readPosition, resolveResume } from '#lib/position/position.ts';
  import DownloadMenu from '#lib/reader/DownloadMenu.svelte';
  import SettingsMenu from '#lib/reader/SettingsMenu.svelte';
  import { chapterHref } from '#lib/reader/links.ts';
  import Ornament from '#lib/render/Ornament.svelte';
  import { plainText } from '#lib/render/text.ts';
  import { chapterByNumber } from '#lib/render/visibility.ts';
  import { onMount } from 'svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // The saved position is read once mounted: the prerendered page and the first client render
  // have no resume button, so hydration always matches.
  let resume = $state<{ chapter: number; blockId: string | null } | null>(null);
  onMount(() => {
    let storage: Storage | null = null;
    try {
      storage = localStorage;
    } catch {
      // storage blocked: no resume button
    }
    resume = resolveResume(data.book, readPosition(storage));
  });

  const resumeTarget = $derived(resume ? chapterByNumber(data.book, resume.chapter) : null);
  const resumeWhere = $derived.by(() => {
    if (!resumeTarget) return '';
    const { part, chapter } = resumeTarget;
    const params = { part: part.label, numeral: chapter.numeral };
    return chapter.title
      ? t(prefs.lang, 'resumeWhereTitled', { ...params, title: plainText(chapter.title) })
      : t(prefs.lang, 'resumeWhere', params);
  });
  const resumeHref = $derived(resume ? `${chapterHref(resume.chapter)}${resume.blockId ? `#${encodeURIComponent(resume.blockId)}` : ''}` : '');

  const latest = $derived(data.index.versions.find((v) => v.sha === data.index.latest));
  const updated = $derived(
    data.index.latest === 'working-tree'
      ? t(prefs.lang, 'localVersion')
      : t(prefs.lang, 'updatedOn', { date: formatDate(prefs.lang, latest?.date ?? data.book.meta.version.date) }),
  );
</script>

<svelte:head>
  <title>{data.book.meta.title}</title>
</svelte:head>

<div class="tools"><SettingsMenu /></div>

<main class="cover">
  <p class="kind sc">{t(prefs.lang, 'novel')}</p>
  <h1 lang="fr">{data.book.meta.title}</h1>
  <Ornament name="scene" />
  {#if data.book.meta.author}<p class="author" lang="fr">{data.book.meta.author}</p>{/if}
  <div class="buttons">
    {#if resume && resumeTarget}
      <a class="button main resume" href={resumeHref}>
        <span>{t(prefs.lang, 'resumeReading')}</span>
        <small lang="fr">{resumeWhere}</small>
      </a>
    {/if}
    <a class="button" href={chapterHref(1)}>{t(prefs.lang, 'start')}</a>
    <a class="button" href="{resolve('/characters')}/">{t(prefs.lang, 'characters')}</a>
    <DownloadMenu downloads={data.downloads} variant="cover" />
  </div>
  <p class="updated">{updated}</p>
</main>

<style>
  .tools {
    position: fixed;
    top: 0.5rem;
    right: 0.5rem;
    color: var(--accent);
  }
  .cover {
    min-height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 4rem 1rem;
    text-align: center;
  }
  .kind {
    margin: 0;
    color: var(--accent);
    font-size: 0.8em;
  }
  h1 {
    margin: 0;
    font-size: 2.3em;
    font-style: italic;
    font-weight: normal;
    line-height: 1.2;
  }
  .author {
    margin: 0;
    color: var(--accent);
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    gap: 0.65rem;
    margin-top: 1rem;
  }
  .button {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 0.35em 1em;
    border: 1px solid var(--accent);
    border-radius: 2px;
    color: var(--accent);
    text-decoration: none;
  }
  .button:hover {
    text-decoration: underline;
  }
  .button.main {
    background: var(--accent);
    color: var(--bg);
  }
  .resume small {
    font-size: 0.75em;
    font-style: italic;
  }
  .updated {
    margin: 1.5rem 0 0;
    color: var(--accent);
    font-size: 0.8em;
  }
</style>
