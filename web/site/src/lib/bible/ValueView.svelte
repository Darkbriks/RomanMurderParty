<script lang="ts">
  import type { BibleValue } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import { anchorFor, humanizeKey, isRecord, refOf, STATUS_KEYS, titleKey, type CharacterIndex } from './catalog.ts';
  import CharacterRef from './CharacterRef.svelte';
  import Self from './ValueView.svelte';

  // Any value of a YAML file, whatever its shape: this is what lets a new file render without code.
  // Lists of objects become entries (with an anchor, for search results and links), objects become
  // definition lists, ids become links to their character.
  let {
    value,
    path,
    slug,
    index,
    hide = [],
  }: {
    value: BibleValue;
    path: (string | number)[];
    slug: string;
    index: CharacterIndex;
    /** Keys not shown in the entries of this value (fields used elsewhere, e.g. plan coordinates). */
    hide?: readonly string[];
  } = $props();

  const isScalar = (v: BibleValue): boolean => v === null || typeof v !== 'object';
  const isUrl = (v: string): boolean => /^https?:\/\/\S+$/.test(v);
  const shown = (v: BibleValue | undefined): boolean => v !== null && v !== undefined && v !== '';
  const fields = (obj: Record<string, BibleValue>, skip: string | null) =>
    Object.entries(obj).filter(([k, v]) => k !== skip && !hide.includes(k) && shown(v));
</script>

{#snippet dl(obj: Record<string, BibleValue>, at: (string | number)[], skip: string | null)}
  <dl>
    {#each fields(obj, skip) as [key, v] (key)}
      <dt>{humanizeKey(key)}</dt>
      <dd>
        {#if STATUS_KEYS.has(key) && isScalar(v) && !refOf(v, index)}
          <span class="badge">{v}</span>
        {:else}
          <Self value={v} path={[...at, key]} {slug} {index} {hide} />
        {/if}
      </dd>
    {/each}
  </dl>
{/snippet}

{#if typeof value === 'string'}
  {@const ref = refOf(value, index)}
  {#if ref}<CharacterRef character={ref.character} follows={ref.follows} />{:else if isUrl(value)}<a href={value}>{value}</a>{:else}{value}{/if}
{:else if typeof value === 'number'}
  {value}
{:else if typeof value === 'boolean'}
  {t(prefs.lang, value ? 'bibleYes' : 'bibleNo')}
{:else if Array.isArray(value)}
  {#if value.every(isScalar)}
    {#each value.filter(shown) as v, i (i)}{#if i > 0}{', '}{/if}<Self value={v} path={[...path, i]} {slug} {index} {hide} />{/each}
  {:else}
    <div class="entries">
      {#each value as item, i (i)}
        {#if isRecord(item)}
          {@const key = titleKey(item)}
          <article class="entry" id={anchorFor(slug, [...path, i], item)}>
            {#if key}<h3><Self value={item[key]!} path={[...path, i, key]} {slug} {index} {hide} /></h3>{/if}
            {@render dl(item, [...path, i], key)}
          </article>
        {:else}
          <div class="entry"><Self value={item} path={[...path, i]} {slug} {index} {hide} /></div>
        {/if}
      {/each}
    </div>
  {/if}
{:else if isRecord(value)}
  {@render dl(value, path, null)}
{/if}

<style>
  dl {
    display: grid;
    grid-template-columns: minmax(6em, max-content) 1fr;
    gap: 0.2em 1em;
    margin: 0;
  }
  dt {
    color: var(--accent);
    font-size: 0.9em;
    padding-top: 0.1em;
  }
  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  @media (max-width: 34em) {
    dl {
      grid-template-columns: 1fr;
    }
    dt {
      padding-top: 0.4em;
    }
  }
  .entries {
    display: flex;
    flex-direction: column;
    gap: 0.9em;
  }
  .entry {
    padding: 0.6em 0.8em;
    border: 1px solid var(--rule);
    background: var(--doc-paper);
    scroll-margin-top: 1rem;
  }
  .entry:target {
    outline: 2px solid var(--accent);
  }
  h3 {
    margin: 0 0 0.4em;
    font-size: 1.05em;
    font-weight: 500;
  }
  .badge {
    display: inline-block;
    padding: 0 0.45em;
    border: 1px solid var(--rule);
    border-radius: 0.8em;
    color: var(--accent);
    font-size: 0.85em;
  }
</style>
