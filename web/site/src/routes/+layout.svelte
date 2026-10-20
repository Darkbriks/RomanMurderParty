<script lang="ts">
  import '@fontsource/eb-garamond/400.css';
  import '@fontsource/eb-garamond/400-italic.css';
  import '@fontsource/eb-garamond/500.css';
  import '#lib/styles/global.css';
  import { startPrefs } from '#lib/prefs/prefs.svelte.ts';
  import { themeCss } from '#lib/styles/themes.ts';
  import { onMount } from 'svelte';

  let { children } = $props();
  const themeStyle = `<style>${themeCss()}</style>`;

  // Stored preferences apply after hydration, which used the defaults (see prefs.svelte.ts).
  onMount(startPrefs);
</script>

<svelte:head>
  {@html themeStyle}
</svelte:head>

{@render children()}
