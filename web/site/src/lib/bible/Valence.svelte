<script lang="ts" module>
  /** The class of a valence, from -2 to +2: m2, m1, 0, p1, p2. */
  export function valenceClass(v: number): string {
    const n = Math.max(-2, Math.min(2, Math.round(v)));
    return n < 0 ? `m${-n}` : n > 0 ? `p${n}` : '0';
  }

  /** A signed valence, with a typographic minus: +2, −1, 0. */
  export const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
</script>

<script lang="ts">
  // A relation's valence: its signed value on a background from hostility (red) to affection
  // (green), so that the colour is never the only cue. The backgrounds are in global.css, shared
  // with the relations matrix.
  let { value }: { value: number } = $props();
</script>

<span class="valence valence-{valenceClass(value)}">{signed(value)}</span>

<style>
  .valence {
    display: inline-block;
    min-width: 1.8em;
    padding: 0 0.25em;
    border-radius: 2px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>
