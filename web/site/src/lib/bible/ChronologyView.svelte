<script lang="ts">
  import type { BibleYamlFile } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { anchorFor, type CharacterIndex } from './catalog.ts';
  import CharacterRef from './CharacterRef.svelte';
  import { chronologyGrid } from './chronology.ts';
  import type { ChronoEvent, Chronology } from './shapes.ts';

  // The evening as a grid: characters in rows (by group), phases in columns. An empty cell is a gap
  // to fill; ideas and proposals (piste, propose) are set apart from decisions.
  let { file, chronology, index }: { file: BibleYamlFile; chronology: Chronology; index: CharacterIndex } = $props();

  const grid = $derived(chronologyGrid(chronology));
  const anchorOf = (e: ChronoEvent): string => anchorFor(file.slug, e.path, e.raw);
  // An event shows in every cell of its people and phases; only the first cell carries its anchor.
  const firstCell = $derived.by(() => {
    const first = new Map<string, string>();
    const visit = (row: string, cells: ChronoEvent[][]) =>
      cells.forEach((cell, j) => cell.forEach((e) => first.has(anchorOf(e)) || first.set(anchorOf(e), `${row}|${j}`)));
    visit('*', grid.all);
    for (const s of grid.sections) for (const r of s.rows) visit(r.id, r.cells);
    return first;
  });
</script>

{#snippet cellView(row: string, cell: ChronoEvent[], j: number)}
  <td data-phase={chronology.phases[j]!.id} class:gap={cell.length === 0 && row !== '*'}>
    {#each cell as e (e.path.join('.'))}
      {@const a = anchorOf(e)}
      <div class="event" class:tentative={e.status === 'piste' || e.status === 'propose'} id={firstCell.get(a) === `${row}|${j}` ? a : undefined}>
        {#if e.time}<strong>{e.time}</strong>{/if}
        {e.what}
        {#if e.status && e.status !== 'decide'}<span class="badge">{e.status}</span>{/if}
        {#if e.source}<span class="badge">{e.source}</span>{/if}
      </div>
    {:else}
      {#if row !== '*'}<span class="visually-hidden">{t(prefs.lang, 'bibleGap')}</span>{/if}
    {/each}
  </td>
{/snippet}

<div class="frame">
  <table>
    <thead>
      <tr>
        <th class="corner"></th>
        {#each chronology.phases as p, i (p.id)}
          <th scope="col" id={anchorFor(file.slug, ['phases', i], { id: p.id })} title={p.summary ?? undefined}>
            <span class="pid">{p.id}</span> {p.title}
            {#if p.summary}<small>{p.summary}</small>{/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if grid.all.some((cell) => cell.length > 0)}
        <tr data-everyone>
          <th scope="row">{t(prefs.lang, 'bibleEveryone')}</th>
          {#each grid.all as cell, j (j)}{@render cellView('*', cell, j)}{/each}
        </tr>
      {/if}
      {#each grid.sections as section, si (si)}
        <tr class="group" id={section.label !== null ? anchorFor(file.slug, ['groupes', si]) : undefined}>
          <th scope="colgroup" colspan={chronology.phases.length + 1}>{section.label ?? t(prefs.lang, 'bibleOthers')}</th>
        </tr>
        {#each section.rows as row (row.id)}
          {@const c = index.byId.get(row.id)}
          <tr data-row={row.id}>
            <th scope="row">{#if c}<CharacterRef character={c} />{:else}{row.id}{/if}</th>
            {#each row.cells as cell, j (j)}{@render cellView(row.id, cell, j)}{/each}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>

<style>
  .frame {
    /* The containing block of the hidden « gap » labels, so they scroll with the grid. */
    position: relative;
    max-width: 100%;
    overflow-x: auto;
    margin: 0 0 2rem;
    border: 1px solid var(--rule);
  }
  table {
    border-collapse: collapse;
    font-size: 0.85em;
    line-height: 1.35;
  }
  th,
  td {
    min-width: 10em;
    padding: 0.3em 0.45em;
    border: 1px solid var(--rule);
    text-align: left;
    vertical-align: top;
  }
  thead th {
    color: var(--accent);
    font-weight: normal;
  }
  thead small {
    display: block;
    font-size: 0.85em;
    font-style: italic;
  }
  .pid {
    font-weight: 500;
  }
  tbody th[scope='row'],
  .corner {
    position: sticky;
    left: 0;
    z-index: 1;
    min-width: 7em;
    background: var(--bg);
    font-weight: normal;
  }
  .group th {
    padding-top: 0.8em;
    color: var(--accent);
    font-weight: normal;
    letter-spacing: 0.04em;
    background: var(--bg-panel);
  }
  .group th[scope='colgroup'] {
    position: static;
  }
  td.gap {
    background: repeating-linear-gradient(135deg, transparent 0 6px, var(--rule) 6px 7px);
  }
  .event + .event {
    margin-top: 0.4em;
    padding-top: 0.4em;
    border-top: 1px dotted var(--rule);
  }
  .event:target {
    outline: 2px solid var(--accent);
  }
  .tentative {
    color: var(--accent);
    font-style: italic;
  }
  .badge {
    display: inline-block;
    margin-left: 0.2em;
    padding: 0 0.4em;
    border: 1px solid var(--rule);
    border-radius: 0.8em;
    color: var(--accent);
    font-size: 0.85em;
    font-style: normal;
  }
  [data-everyone] th {
    font-style: italic;
  }
</style>
