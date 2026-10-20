<script lang="ts">
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
</script>

<svelte:head>
  <title>{t(prefs.lang, 'siteTitle')}</title>
</svelte:head>

<main>
  <h1>{t(prefs.lang, 'siteTitle')}</h1>
  <p>{t(prefs.lang, 'siteSubtitle')}</p>
</main>

<style>
  main {
    max-width: 40rem;
    margin: 4rem auto;
    padding: 0 1rem;
    text-align: center;
  }
</style>
