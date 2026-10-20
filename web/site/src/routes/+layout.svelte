<script lang="ts">
  import '@fontsource/eb-garamond/400.css';
  import '@fontsource/eb-garamond/400-italic.css';
  import '@fontsource/eb-garamond/500.css';
  import '#lib/styles/global.css';
  import { themeCss } from '#lib/styles/themes.ts';

  let { children } = $props();
  const themeStyle = `<style>${themeCss()}</style>`;
</script>

<svelte:head>
  {@html themeStyle}
</svelte:head>

{@render children()}
