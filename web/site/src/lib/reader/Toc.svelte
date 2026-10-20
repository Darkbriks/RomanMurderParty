<script lang="ts">
  import type { Book } from '@rmp/model';
  import { t } from '#lib/i18n/index.ts';
  import { prefs } from '#lib/prefs/prefs.svelte.ts';
  import Inlines from '#lib/render/Inlines.svelte';
  import { chapterHref } from './links.ts';

  // The side panel: each part as « label — narrator », its chapters as numeral and title. Whether it
  // shows is decided by CSS from <html data-toc> (set by the pre-paint script, then by startPrefs):
  // "open", "closed", or absent for the default — unfolded from 1024 px, folded below.
  let {
    book,
    current,
    overlay,
    onNavigate,
    onClose,
  }: {
    book: Book;
    current: number;
    overlay: boolean;
    onNavigate: () => void;
    onClose: (returnFocus: boolean) => void;
  } = $props();

  let panel: HTMLElement | undefined = $state();

  $effect(() => {
    // Keep the current chapter in view when the panel is longer than the screen (the panel is the
    // offsetParent of its links, being fixed). Only the panel scrolls, never the page.
    void current;
    const link = panel?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!panel || !link) return;
    if (link.offsetTop < panel.scrollTop || link.offsetTop + link.offsetHeight > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = link.offsetTop - panel.clientHeight / 3;
    }
  });

  // On a narrow screen the panel covers the text: Escape or a tap beside it folds it.
  function onKeydown(event: KeyboardEvent) {
    if (overlay && event.key === 'Escape') onClose(true);
  }

  function onPointerdown(event: PointerEvent) {
    const target = event.target as Element;
    if (overlay && panel && !panel.contains(target) && !target.closest('#toc-toggle')) onClose(false);
  }
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerdown} />

<nav id="toc" class="toc" aria-label={t(prefs.lang, 'toc')} bind:this={panel}>
  <div class="head">
    <button class="close" aria-label={t(prefs.lang, 'tocClose')} onclick={() => onClose(true)}>
      <span aria-hidden="true">‹</span>
    </button>
  </div>
  <ol class="parts" lang="fr">
    {#each book.parts as part (part.id)}
      <li>
        <span class="part sc">{part.label} — {part.narrator}</span>
        {#if part.chapters.length > 0}
          <ol class="chapters">
            {#each part.chapters as chapter (chapter.id)}
              <li>
                <a href={chapterHref(chapter.number)} aria-current={chapter.number === current ? 'page' : undefined} onclick={onNavigate}
                  ><span class="numeral">{chapter.numeral}</span>{#if chapter.title}.{' '}<Inlines nodes={chapter.title} notes={prefs.notes} />{/if}</a
                >
              </li>
            {/each}
          </ol>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .toc {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    width: var(--toc-width);
    max-width: 85vw;
    box-sizing: border-box;
    padding: var(--bar-height) 0 1.5em;
    overflow-y: auto;
    background: var(--bg-panel);
    border-right: 1px solid var(--rule);
    font-size: 16px;
    line-height: 1.5;
    /* Folded unless <html data-toc> or the wide-screen default says otherwise (see below). */
    visibility: hidden;
    transform: translateX(-100%);
    transition:
      transform 0.2s ease,
      visibility 0s linear 0.2s;
  }
  :global(:root[data-toc='open']) .toc {
    visibility: visible;
    transform: none;
    transition: transform 0.2s ease;
  }
  @media (min-width: 1024px) {
    :global(:root:not([data-toc])) .toc {
      visibility: visible;
      transform: none;
      transition: transform 0.2s ease;
    }
  }
  @media (max-width: 1023.98px) {
    .toc {
      box-shadow: 4px 0 18px rgb(0 0 0 / 0.18);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toc,
    :global(:root[data-toc='open']) .toc {
      transition: none;
    }
  }
  .head {
    display: flex;
    justify-content: flex-end;
    padding: 0.25em 0.5em 0;
  }
  .close {
    width: 1.5em;
    height: 1.5em;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 1.4em;
    line-height: 1;
    cursor: pointer;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .parts {
    padding: 0 1em 0 1.1em;
  }
  .parts > li + li {
    margin-top: 0.8em;
  }
  .part {
    display: block;
    color: var(--accent);
    letter-spacing: 0.04em;
  }
  .chapters a {
    display: block;
    padding: 0.1em 0 0.1em 0.75em;
    border-left: 2px solid transparent;
    color: var(--ink);
    text-decoration: none;
  }
  .chapters a:hover {
    text-decoration: underline;
  }
  .chapters a[aria-current='page'] {
    border-left-color: var(--accent);
    color: var(--accent);
    font-style: italic;
  }
  .numeral {
    text-transform: lowercase;
    font-variant-caps: small-caps;
  }
</style>
