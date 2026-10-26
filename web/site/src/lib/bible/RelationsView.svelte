<script lang="ts">
  import { page } from '$app/state';
  import type { BibleYamlFile } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { ambiguousIds, anchorFor, type CharacterIndex } from './catalog.ts';
  import CharacterRef from './CharacterRef.svelte';
  import { relationsMatrix } from './relations.ts';
  import type { Relation } from './shapes.ts';
  import Valence, { signed, valenceClass } from './Valence.svelte';

  // What each character thinks of the others: who thinks in rows, who is thought of in columns.
  // A cell gives the valence; hovering, tapping or focusing it shows the relation in a panel that
  // stays at the bottom of the window.
  let { file, relations, index }: { file: BibleYamlFile; relations: Relation[]; index: CharacterIndex } = $props();

  const matrix = $derived(relationsMatrix(relations, index));
  const anchorOf = (r: Relation): string => anchorFor(file.slug, r.path, r.raw, ambiguousIds(file.data));
  const nameOf = (id: string): string => index.byId.get(id)?.short ?? id;
  const describe = (r: Relation): string =>
    `${nameOf(r.from)} → ${nameOf(r.to)} : ${signed(r.valence)}${r.label ? ` ${r.label}` : ''}`;
  let chosen = $state<string | null>(null);
  // A link to a relation (a search result) selects it too.
  const current = $derived.by(() => {
    const anchor = chosen ?? decodeURIComponent(page.url.hash.slice(1));
    return relations.find((r) => anchorOf(r) === anchor) ?? null;
  });
</script>

{#snippet who(id: string)}
  {@const c = index.byId.get(id)}
  {#if c}<CharacterRef character={c} />{:else}{id}{/if}
{/snippet}

<div class="frame">
  <table>
    <thead>
      <tr>
        <th class="corner"></th>
        {#each matrix.cols as col (col)}<th scope="col" class="col"><span>{nameOf(col)}</span></th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each matrix.rows as row (row)}
        <tr>
          <th scope="row">{@render who(row)}</th>
          {#each matrix.cols as col (col)}
            {@const r = matrix.at(row, col)}
            <td class={r ? `valence-${valenceClass(r.valence)}` : undefined}>
              {#if r}
                <button
                  id={anchorOf(r)}
                  data-from={row}
                  data-to={col}
                  class:current={current === r}
                  class:deduced={r.source === 'deduit'}
                  aria-label={describe(r)}
                  title={describe(r)}
                  onclick={() => (chosen = anchorOf(r))}
                  onfocus={() => (chosen = anchorOf(r))}
                  onpointerenter={() => (chosen = anchorOf(r))}
                >
                  {signed(r.valence)}{#if r.ambivalent}*{/if}
                </button>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="detail" data-relation-detail aria-live="polite">
  {#if current}
    <p>
      {@render who(current.from)} → {@render who(current.to)}
      <Valence value={current.valence} />
      {#if current.label}<strong>{current.label}</strong>{/if}
    </p>
    {#if current.note}<p>{current.note}</p>{/if}
    <p class="meta">
      {#if current.source}<span class="badge">{current.source}</span>{/if}
      {#if current.ambivalent}<span class="badge">{t(prefs.lang, 'bibleAmbivalent')}</span>{/if}
    </p>
  {:else}
    <p class="hint">{t(prefs.lang, 'bibleChooseRelation')}</p>
  {/if}
</div>

<style>
  .frame {
    position: relative;
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid var(--rule);
  }
  table {
    border-collapse: collapse;
    font-size: 0.85em;
  }
  th,
  td {
    border: 1px solid var(--rule);
    padding: 0;
    text-align: center;
  }
  thead th {
    color: var(--accent);
    font-weight: normal;
    vertical-align: bottom;
  }
  .col span {
    display: inline-block;
    padding: 0.4em 0.2em;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: nowrap;
  }
  tbody th,
  .corner {
    position: sticky;
    left: 0;
    z-index: 1;
    padding: 0.2em 0.5em;
    background: var(--bg);
    font-weight: normal;
    text-align: left;
    white-space: nowrap;
  }
  button {
    width: 2.6em;
    height: 2.2em;
    border: none;
    background: none;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  button.deduced {
    outline: 1px dashed var(--accent);
    outline-offset: -4px;
  }
  button.current,
  button:target {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .detail {
    position: sticky;
    bottom: 0;
    z-index: 2;
    min-height: 4.5em;
    margin: 0.8rem 0 2rem;
    box-shadow: 0 -4px 12px rgb(0 0 0 / 0.08);
    padding: 0.5em 0.8em;
    border: 1px solid var(--rule);
    background: var(--doc-paper);
  }
  .detail p {
    margin: 0 0 0.3em;
  }
  .hint {
    color: var(--accent);
    font-style: italic;
  }
  .badge {
    display: inline-block;
    margin-right: 0.3em;
    padding: 0 0.45em;
    border: 1px solid var(--rule);
    border-radius: 0.8em;
    color: var(--accent);
    font-size: 0.85em;
  }
</style>
