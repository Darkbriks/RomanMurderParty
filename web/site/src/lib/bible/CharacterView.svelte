<script lang="ts">
  import type { Bible, BibleYamlFile } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { entryTitle, type CharacterIndex } from './catalog.ts';
  import CharacterRef from './CharacterRef.svelte';
  import { mentionsIn, relationsOf, sceneNotesFor, timelineOf } from './character.ts';
  import { asChronology, asRelations, type ChronoEvent, type Relation } from './shapes.ts';
  import Valence from './Valence.svelte';
  import ValueView from './ValueView.svelte';

  // Everything the bible says about one character (?perso=<id>): their entry, their relations both
  // ways, their evening phase by phase, the entries of the other files that name them, their notes.
  let { id, bible, index }: { id: string; bible: Bible; index: CharacterIndex } = $props();

  const character = $derived(index.byId.get(id) ?? null);
  const yamlFiles = $derived(bible.files.filter((f): f is BibleYamlFile => f.kind === 'yaml'));
  const relations = $derived(yamlFiles.map((f) => asRelations(f.data)).find((r) => r !== null) ?? null);
  const chronology = $derived(yamlFiles.map((f) => asChronology(f.data)).find((c) => c !== null) ?? null);
  const mentioned = $derived(yamlFiles.map((file) => ({ file, found: mentionsIn(file, id) })).filter((m) => m.found.length > 0));
  const notes = $derived(sceneNotesFor(bible, index, id));
</script>

{#snippet other(otherId: string)}
  {@const c = index.byId.get(otherId)}
  {#if c}<CharacterRef character={c} />{:else}{otherId}{/if}
{/snippet}

{#snippet relationList(list: Relation[], side: 'from' | 'to')}
  <ul class="relations" data-relations={side}>
    {#each list as r (r.path.join('.'))}
      <li>
        <Valence value={r.valence} />
        {@render other(side === 'from' ? r.to : r.from)}
        {#if r.label}<span class="label">{r.label}</span>{/if}
        {#if r.ambivalent}<span class="badge">{t(prefs.lang, 'bibleAmbivalent')}</span>{/if}
        {#if r.source}<span class="badge">{r.source}</span>{/if}
        {#if r.note}<p class="note">{r.note}</p>{/if}
      </li>
    {:else}
      <li class="none">—</li>
    {/each}
  </ul>
{/snippet}

{#snippet eventLine(e: ChronoEvent, everyone: boolean)}
  <li class:everyone>
    {#if everyone}<span class="badge">{t(prefs.lang, 'bibleEveryone')}</span>{/if}
    {#if e.time}<strong>{e.time}</strong>{/if}
    {e.what}
    {#if e.status && e.status !== 'decide'}<span class="badge">{e.status}</span>{/if}
    {#if e.source}<span class="badge">{e.source}</span>{/if}
  </li>
{/snippet}

{#if !character}
  <p class="status">{t(prefs.lang, 'bibleUnknownView')}</p>
{:else}
  <h1>{character.name}</h1>
  <ValueView value={character.entry} path={[]} slug="personnages" {index} hide={['nom']} />

  {#if relations}
    {@const { from, to } = relationsOf(relations, id)}
    <section>
      <h2>{t(prefs.lang, 'bibleRelationsFrom')}</h2>
      {@render relationList(from, 'from')}
    </section>
    <section>
      <h2>{t(prefs.lang, 'bibleRelationsTo')}</h2>
      {@render relationList(to, 'to')}
    </section>
  {/if}

  {#if chronology}
    <section>
      <h2>{t(prefs.lang, 'bibleEvening')}</h2>
      <ol class="timeline">
        {#each timelineOf(chronology, id) as { phase, events, all } (phase.id)}
          <li>
            <span class="phase" title={phase.summary ?? undefined}>{phase.id} · {phase.title}</span>
            <ul>
              {#each events as e (e.path.join('.'))}{@render eventLine(e, false)}{/each}
              {#if events.length === 0}<li class="gap">{t(prefs.lang, 'bibleGap')}</li>{/if}
              {#each all as e (e.path.join('.'))}{@render eventLine(e, true)}{/each}
            </ul>
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  {#each mentioned as { file, found } (file.slug)}
    <section>
      <h2>{file.title}</h2>
      {#each found as m (m.anchor)}
        <article class="entry">
          <h3><a href="?vue={file.slug}#{encodeURIComponent(m.anchor)}">{entryTitle(m.value, index) ?? file.title}</a></h3>
          <ValueView value={m.value} path={[m.key]} slug={file.slug} {index} />
        </article>
      {/each}
    </section>
  {/each}

  {#if notes.length > 0}
    <section class="notes">
      <h2>{t(prefs.lang, 'bibleSceneNotes')}</h2>
      {#each notes as s (s.id)}{@html s.html}{/each}
    </section>
  {/if}
{/if}

<style>
  h1 {
    margin: 0 0 1rem;
    font-size: 1.6em;
    font-style: italic;
    font-weight: normal;
  }
  h2 {
    margin: 2rem 0 0.6rem;
    color: var(--accent);
    font-size: 1.1em;
    font-weight: normal;
    letter-spacing: 0.04em;
  }
  h3 {
    margin: 0 0 0.4em;
    font-size: 1.05em;
    font-weight: 500;
  }
  ul,
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .relations li {
    padding: 0.25em 0;
    border-bottom: 1px solid var(--rule);
  }
  .label {
    margin-left: 0.3em;
    font-style: italic;
  }
  .note {
    margin: 0.15em 0 0 2.4em;
    font-size: 0.9em;
  }
  .badge {
    display: inline-block;
    margin-left: 0.3em;
    padding: 0 0.45em;
    border: 1px solid var(--rule);
    border-radius: 0.8em;
    color: var(--accent);
    font-size: 0.8em;
  }
  .timeline > li {
    display: grid;
    grid-template-columns: minmax(8em, 12em) 1fr;
    gap: 0.2em 1em;
    padding: 0.35em 0;
    border-bottom: 1px solid var(--rule);
  }
  @media (max-width: 34em) {
    .timeline > li {
      grid-template-columns: 1fr;
    }
  }
  .phase {
    color: var(--accent);
  }
  .gap {
    color: var(--accent);
    font-style: italic;
  }
  .everyone {
    opacity: 0.8;
  }
  .entry {
    margin: 0 0 0.9em;
    padding: 0.6em 0.8em;
    border: 1px solid var(--rule);
    background: var(--doc-paper);
  }
  .notes :global(h2) {
    margin: 1rem 0 0.3rem;
    color: var(--ink);
    font-size: 1em;
  }
  .status {
    text-align: center;
    color: var(--accent);
  }
</style>
