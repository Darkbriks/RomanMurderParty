<script lang="ts">
  import type { BibleYamlFile } from '@rmp/model';
  import { ambiguousIds, anchorFor, type CharacterIndex } from './catalog.ts';
  import { HOUSE_HIDDEN, type Level } from './shapes.ts';
  import ValueView from './ValueView.svelte';

  // The Whitmore house, level by level, room by room. The fields that only feed the TikZ plan
  // generator (coordinates, doors, raw TikZ) stay out; the plans themselves are the PDF.
  let { file, levels, index }: { file: BibleYamlFile; levels: Level[]; index: CharacterIndex } = $props();

  const LEVEL_SHOWN_ELSEWHERE = ['cle', 'titre', 'pieces'];
  const ROOM_SHOWN_ELSEWHERE = ['num', 'nom', 'cat'];
  const hidden = [...HOUSE_HIDDEN];
  const ambiguous = $derived(ambiguousIds(file.data));
</script>

{#each levels as level (level.path.join('.'))}
  <section class="level" id={anchorFor(file.slug, level.path, level.raw, ambiguous)}>
    <h2>{level.title}</h2>
    <ValueView
      value={Object.fromEntries(Object.entries(level.raw).filter(([k]) => !LEVEL_SHOWN_ELSEWHERE.includes(k)))}
      path={level.path}
      slug={file.slug}
      {index}
      hide={hidden}
      {ambiguous}
    />
    <div class="rooms">
      {#each level.rooms as room (room.path.join('.'))}
        <article class="room" id={anchorFor(file.slug, room.path, room.raw, ambiguous)}>
          <h3>
            <span class="num">{room.num}</span> · {room.raw.nom}
            {#if typeof room.raw.cat === 'string'}<span class="badge">{room.raw.cat}</span>{/if}
          </h3>
          <ValueView
            value={Object.fromEntries(Object.entries(room.raw).filter(([k]) => !ROOM_SHOWN_ELSEWHERE.includes(k)))}
            path={room.path}
            slug={file.slug}
            {index}
            hide={hidden}
            {ambiguous}
          />
        </article>
      {/each}
    </div>
  </section>
{/each}


<style>
  .level {
    margin: 0 0 2.5rem;
    scroll-margin-top: 1rem;
  }
  h2 {
    margin: 0 0 0.75rem;
    color: var(--accent);
    font-size: 1.1em;
    font-weight: normal;
    letter-spacing: 0.04em;
  }
  .rooms {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    margin-top: 1em;
  }
  .room {
    padding: 0.6em 0.8em;
    border: 1px solid var(--rule);
    background: var(--doc-paper);
    scroll-margin-top: 1rem;
  }
  .room:target {
    outline: 2px solid var(--accent);
  }
  h3 {
    margin: 0 0 0.4em;
    font-size: 1.05em;
    font-weight: 500;
  }
  .num {
    color: var(--accent);
  }
  .badge {
    display: inline-block;
    margin-left: 0.3em;
    padding: 0 0.45em;
    border: 1px solid var(--rule);
    border-radius: 0.8em;
    color: var(--accent);
    font-size: 0.8em;
    font-weight: normal;
  }
</style>
