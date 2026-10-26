<script lang="ts">
  import { t, type MessageKey } from '#lib/i18n/index.ts';
  import { effectiveTheme, FONT_STEPS_PX, prefs, prefsState, type Prefs, type Theme } from '#lib/prefs/prefs.svelte.ts';
  import { THEMES } from '#lib/styles/themes.ts';
  import { MediaQuery } from 'svelte/reactivity';
  import ModeSwitch from './ModeSwitch.svelte';

  // The Aa menu: font size, theme, working notes, language and reading mode. The reader's top bar
  // shows the reading mode itself from 720 px, so there `modes` is 'narrow': the row only shows
  // below that width. Changing a field of `prefs` is enough: startPrefs() persists it and updates <html>.
  let { open = $bindable(false), modes = 'always' }: { open?: boolean; modes?: 'always' | 'narrow' } = $props();

  const THEME_LABELS: Record<Theme, MessageKey> = { paper: 'themePaper', sepia: 'themeSepia', dark: 'themeDark' };
  const LANGUAGES: { lang: Prefs['lang']; name: string }[] = [
    { lang: 'fr', name: 'Français' },
    { lang: 'en', name: 'English' },
  ];
  const systemDark = new MediaQuery('(prefers-color-scheme: dark)', false);
  // The system theme is only known in the browser: nothing is shown as pressed before that.
  const shownTheme = $derived(prefsState.started ? effectiveTheme(prefs, systemDark.current) : null);

  let container: HTMLElement | undefined = $state();
  let button: HTMLButtonElement | undefined = $state();

  function setFontStep(delta: number) {
    const next = prefs.fontStep + delta;
    if (next >= 0 && next < FONT_STEPS_PX.length) prefs.fontStep = next as Prefs['fontStep'];
  }

  function onKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      open = false;
      button?.focus();
    }
  }

  function onPointerdown(event: PointerEvent) {
    if (open && container && !container.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerdown} />

<div class="settings" bind:this={container}>
  <button
    bind:this={button}
    class="toggle"
    aria-label={t(prefs.lang, 'settings')}
    aria-expanded={open}
    aria-controls="settings-panel"
    onclick={() => (open = !open)}
  >
    <span aria-hidden="true">Aa</span>
  </button>

  <div id="settings-panel" class="panel" role="group" aria-label={t(prefs.lang, 'settings')} hidden={!open}>
    <div class="row">
      <span class="label" id="settings-size">{t(prefs.lang, 'fontSize')}</span>
      <div class="segmented" role="group" aria-labelledby="settings-size">
        <button aria-label={t(prefs.lang, 'fontSmaller')} disabled={prefs.fontStep === 0} onclick={() => setFontStep(-1)}>A−</button>
        <button aria-label={t(prefs.lang, 'fontLarger')} disabled={prefs.fontStep === FONT_STEPS_PX.length - 1} onclick={() => setFontStep(1)}>A+</button>
      </div>
    </div>

    <div class="row">
      <span class="label" id="settings-theme">{t(prefs.lang, 'theme')}</span>
      <div class="themes" role="group" aria-labelledby="settings-theme">
        {#each Object.entries(THEME_LABELS) as [theme, label] (theme)}
          <button class="theme" aria-pressed={shownTheme === theme} onclick={() => (prefs.theme = theme as Theme)}>
            <span class="swatch" style:background={THEMES[theme as Theme].bg} aria-hidden="true"></span>
            {t(prefs.lang, label)}
          </button>
        {/each}
      </div>
    </div>

    <div class="row wrap">
      <span class="label" id="settings-notes">{t(prefs.lang, 'notes')}</span>
      <button
        class="switch"
        role="switch"
        aria-checked={prefs.notes}
        aria-labelledby="settings-notes"
        aria-describedby="settings-notes-hint"
        onclick={() => (prefs.notes = !prefs.notes)}
      >
        <span class="knob" aria-hidden="true"></span>
      </button>
      <!-- Always shown rather than on hover: phones have no hover. -->
      <p class="hint" id="settings-notes-hint">{t(prefs.lang, 'notesHint')}</p>
    </div>

    <div class="row">
      <span class="label" id="settings-lang">{t(prefs.lang, 'language')}</span>
      <div class="segmented" role="group" aria-labelledby="settings-lang">
        {#each LANGUAGES as { lang, name } (lang)}
          <button {lang} aria-pressed={prefs.lang === lang} onclick={() => (prefs.lang = lang)}>{name}</button>
        {/each}
      </div>
    </div>

    <!-- Last, so that hiding it never leaves the separator of the next row at the top. -->
    <div class="row wrap" class:narrow-only={modes === 'narrow'}>
      <span class="label" id="settings-mode">{t(prefs.lang, 'readingMode')}</span>
      <ModeSwitch labelledby="settings-mode" />
    </div>
  </div>
</div>

<style>
  .settings {
    position: relative;
  }
  .toggle {
    min-width: 2.5em;
    height: 2.25em;
    padding: 0 0.5em;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 1.05em;
    cursor: pointer;
  }
  .toggle[aria-expanded='true'] {
    text-decoration: underline;
    text-underline-offset: 0.3em;
  }
  .panel {
    position: absolute;
    top: calc(100% + 0.4em);
    right: 0;
    z-index: 30;
    width: 17.5em;
    max-width: calc(100vw - 1em);
    padding: 0.4em 0.9em;
    background: var(--doc-paper);
    color: var(--ink);
    border: 1px solid var(--rule);
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.14);
    font-size: 16px;
  }
  .panel[hidden] {
    display: none;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75em;
    padding: 0.55em 0;
  }
  .row + .row {
    border-top: 1px solid var(--rule);
  }
  .label {
    color: var(--accent);
  }
  .hint {
    flex-basis: 100%;
    margin: 0;
    color: var(--accent);
    font-size: 0.85em;
    line-height: 1.3;
  }
  /* Three reading modes do not fit beside their label: they go below it. */
  .wrap {
    flex-wrap: wrap;
    row-gap: 0.4em;
  }
  @media (min-width: 720px) {
    .narrow-only {
      display: none;
    }
  }
  .segmented {
    display: flex;
    border: 1px solid var(--rule);
  }
  .segmented button,
  .theme {
    padding: 0.15em 0.6em;
    border: none;
    background: none;
    cursor: pointer;
  }
  .segmented button + button {
    border-left: 1px solid var(--rule);
  }
  .segmented button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--bg);
  }
  .segmented button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .themes {
    display: flex;
    gap: 0.15em;
  }
  .theme {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15em;
    padding: 0.15em 0.3em;
    font-size: 0.85em;
  }
  .theme[aria-pressed='true'] {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .swatch {
    width: 1.1em;
    height: 1.1em;
    border-radius: 50%;
    border: 1px solid var(--frame);
  }
  .theme[aria-pressed='true'] .swatch {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .switch {
    position: relative;
    width: 2.6em;
    height: 1.4em;
    flex: none;
    border: 1px solid var(--frame);
    border-radius: 0.7em;
    background: var(--bg);
    cursor: pointer;
  }
  .switch[aria-checked='true'] {
    background: var(--accent);
    border-color: var(--accent);
  }
  .knob {
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 1em;
    height: 1em;
    border-radius: 50%;
    background: var(--frame);
    transition: transform 0.15s;
  }
  .switch[aria-checked='true'] .knob {
    transform: translateX(1.2em);
    background: var(--bg);
  }
  @media (prefers-reduced-motion: reduce) {
    .knob {
      transition: none;
    }
  }
</style>
