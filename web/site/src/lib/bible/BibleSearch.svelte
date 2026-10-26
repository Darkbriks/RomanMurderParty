<script lang="ts">
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { search, type SearchDoc } from './search.ts';

  // Filters as you type; each result opens its file's view on the entry. The query is kept for the
  // tab (sessionStorage), so coming back from a result finds it again.
  let { docs }: { docs: SearchDoc[] } = $props();
  const KEY = 'rmp.bible.search';
  let query = $state(
    (() => {
      try {
        return sessionStorage.getItem(KEY) ?? '';
      } catch {
        return '';
      }
    })(),
  );
  $effect(() => {
    try {
      sessionStorage.setItem(KEY, query);
    } catch {
      // storage unavailable: the query is not kept
    }
  });
  const hits = $derived(search(docs, query));
</script>

<div class="search">
  <!-- svelte-ignore a11y_autofocus -->
  <input type="search" bind:value={query} aria-label={t(prefs.lang, 'bibleSearch')} placeholder={t(prefs.lang, 'bibleSearch')} autofocus />
  {#if query.trim().length >= 2}
    {#if hits.length === 0}
      <p class="none">{t(prefs.lang, 'bibleNoResults')}</p>
    {:else}
      <ul>
        {#each hits as hit, i (i)}
          <li>
            <a href="?vue={hit.doc.slug}#{encodeURIComponent(hit.doc.anchor)}">
              <span class="where">{hit.doc.fileTitle} · {hit.doc.title}</span>
              <span class="excerpt">{hit.before}<mark>{hit.match}</mark>{hit.after}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .search {
    margin: 0 0 1.5rem;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.4em 0.6em;
    border: 1px solid var(--frame);
    border-radius: 2px;
    background: var(--doc-paper);
    color: var(--ink);
    font: inherit;
  }
  ul {
    margin: 0.5rem 0 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--rule);
  }
  li + li {
    border-top: 1px solid var(--rule);
  }
  a {
    display: flex;
    flex-direction: column;
    padding: 0.4em 0.6em;
    color: var(--ink);
    text-decoration: none;
  }
  a:hover,
  a:focus-visible {
    background: var(--bg-panel);
  }
  .where {
    color: var(--accent);
    font-size: 0.85em;
  }
  .excerpt {
    overflow-wrap: anywhere;
  }
  mark {
    background: color-mix(in srgb, var(--accent) 25%, transparent);
    color: inherit;
  }
  .none {
    margin: 0.5rem 0 0;
    color: var(--accent);
  }
</style>
