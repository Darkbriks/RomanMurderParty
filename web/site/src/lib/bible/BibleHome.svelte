<script lang="ts">
  import type { Bible } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { orderedFiles, type BibleCharacter, type CharacterIndex } from './catalog.ts';

  // The bible's contents: the characters by group, then the files.
  let { bible, index }: { bible: Bible; index: CharacterIndex } = $props();

  const groups = $derived.by(() => {
    const out: { name: string; people: BibleCharacter[] }[] = [];
    for (const c of index.list) {
      const last = out[out.length - 1];
      if (last?.name === c.group) last.people.push(c);
      else out.push({ name: c.group, people: [c] });
    }
    return out;
  });
</script>

<h1>{t(prefs.lang, 'bibleTitle')}</h1>

{#each groups as group (group.name)}
  <section>
    <h2>{group.name}</h2>
    <ul class="people">
      {#each group.people as c (c.id)}
        <li><a href="?perso={c.id}">{c.short}</a>{#if c.name !== c.short} <small>{c.name}</small>{/if}</li>
      {/each}
    </ul>
  </section>
{/each}

<section>
  <h2>{t(prefs.lang, 'bibleFiles')}</h2>
  <ul class="files">
    {#each orderedFiles(bible) as file (file.slug)}
      <li><a href="?vue={file.slug}">{file.title}</a></li>
    {/each}
  </ul>
</section>

<style>
  h1 {
    margin: 0 0 1.5rem;
    font-size: 1.6em;
    font-style: italic;
    font-weight: normal;
  }
  h2 {
    margin: 1.5rem 0 0.5rem;
    color: var(--accent);
    font-size: 1em;
    font-weight: normal;
    letter-spacing: 0.06em;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .people {
    columns: 14em;
    column-gap: 2em;
  }
  .people li {
    break-inside: avoid;
    margin-bottom: 0.2em;
  }
  small {
    color: var(--accent);
  }
  .files {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em 1.2em;
  }
</style>
