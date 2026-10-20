<script lang="ts">
  import { resolve } from '$app/paths';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import SettingsMenu from '#lib/reader/SettingsMenu.svelte';
  import Inlines from '#lib/render/Inlines.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  const characters = $derived(data.book.characters);
</script>

<svelte:head>
  <title>{characters.title ?? t(prefs.lang, 'characters')} — {data.book.meta.title}</title>
</svelte:head>

<header class="bar">
  <a class="back" href={resolve('/')}>← {t(prefs.lang, 'backToCover')}</a>
  <SettingsMenu />
</header>

<main class="characters">
  <h1 lang="fr">{characters.title ?? t(prefs.lang, 'characters')}</h1>
  <div lang="fr">
    {#each characters.groups as group (group.id)}
      <section>
        {#if group.name}<h2 class="sc">{group.name}</h2>{/if}
        <ul>
          {#each group.people as person (person.id)}
            <li>
              <p class="who"><span class="name">{person.name}</span>{#if person.details}<span class="details">, {person.details}</span>{/if}</p>
              <p class="role"><Inlines nodes={person.description} notes={prefs.notes} /></p>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</main>

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--bar-height);
    box-sizing: border-box;
    padding: 0 0.75em;
    border-bottom: 1px solid var(--rule);
    color: var(--accent);
  }
  .characters {
    max-width: 34em;
    margin: 0 auto;
    padding: 2rem 1.25rem 4rem;
  }
  h1 {
    margin: 1rem 0 2rem;
    font-size: 1.6em;
    font-style: italic;
    font-weight: normal;
    text-align: center;
  }
  h2 {
    margin: 2rem 0 0.75rem;
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
  li + li {
    margin-top: 0.8rem;
  }
  p {
    margin: 0;
  }
  .name {
    font-weight: 500;
  }
  .details {
    color: var(--accent);
  }
  .role {
    font-style: italic;
  }
</style>
