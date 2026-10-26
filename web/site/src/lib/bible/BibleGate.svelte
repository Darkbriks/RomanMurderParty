<script lang="ts">
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';

  // The spoiler warning in front of every bible page. Entering takes a deliberate gesture: tick the
  // box, then open.
  let { onaccept }: { onaccept: () => void } = $props();
  let accepted = $state(false);
</script>

<section class="gate">
  <h1>{t(prefs.lang, 'bibleTitle')}</h1>
  <p>{t(prefs.lang, 'bibleWarning')}</p>
  <label>
    <input type="checkbox" bind:checked={accepted} />
    {t(prefs.lang, 'bibleAccept')}
  </label>
  <button disabled={!accepted} onclick={onaccept}>{t(prefs.lang, 'bibleOpen')}</button>
</section>

<style>
  .gate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 30em;
    margin: 0 auto;
    padding: 4rem 1.25rem;
    text-align: center;
  }
  h1 {
    margin: 0;
    font-size: 1.6em;
    font-style: italic;
    font-weight: normal;
  }
  p {
    margin: 0;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    cursor: pointer;
  }
  input {
    width: 1.1em;
    height: 1.1em;
    accent-color: var(--accent);
  }
  button {
    padding: 0.35em 1em;
    border: 1px solid var(--accent);
    border-radius: 2px;
    background: var(--accent);
    color: var(--bg);
    cursor: pointer;
  }
  button:disabled {
    background: none;
    color: var(--accent);
    opacity: 0.5;
    cursor: default;
  }
</style>
