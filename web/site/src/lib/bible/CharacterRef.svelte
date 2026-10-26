<script lang="ts">
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import type { BibleCharacter } from './catalog.ts';

  // A character named in the data (by id, or by `suit:<id>`), linked to their page.
  let { character, follows = false }: { character: BibleCharacter; follows?: boolean } = $props();
</script>

{#if follows}{t(prefs.lang, 'bibleFollows')}{' '}{/if}<a href="?perso={character.id}" title={character.name}>{character.short}</a>
