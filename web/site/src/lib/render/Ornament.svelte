<script lang="ts" module>
  // viewBox of each SVG written by web/scripts/ornaments/build.sh, and its width in rem: the width
  // murderparty.sty gives it (in pt) over the 11 pt body size, so it keeps the PDF's proportions
  // relative to the body text, whatever the size of the surrounding heading.
  const ORNAMENTS = {
    partie: { viewBox: '0 0 90.706 45.96', width: 8.25 },
    chapitre: { viewBox: '0 0 50.97 3.476', width: 4.63 },
    scene: { viewBox: '0 0 31.058 17.037', width: 2.82 },
    fin: { viewBox: '0 0 73.699 12.986', width: 6.7 },
  } as const;

  export type OrnamentName = keyof typeof ORNAMENTS;
</script>

<script lang="ts">
  import { asset } from '$app/paths';

  // The SVG file is referenced, not inlined: <use> keeps currentColor, so the ornament takes the
  // colour of its parent (sepia by default) in every theme.
  let { name }: { name: OrnamentName } = $props();
  const ornament = $derived(ORNAMENTS[name]);
</script>

<svg class="ornament ornament-{name}" viewBox={ornament.viewBox} style:width="{ornament.width}rem" aria-hidden="true" focusable="false"><use href="{asset(`ornaments/${name}.svg`)}#ornament" /></svg>

<style>
  .ornament {
    display: block;
    height: auto;
    max-width: 100%;
    margin: 0 auto;
    color: var(--accent);
    overflow: visible;
  }
</style>
