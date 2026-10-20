<script lang="ts">
  import type { Block } from '@rmp/model';
  import Blocks from '../Blocks.svelte';
  import Inlines from '../Inlines.svelte';

  // \begin{telegramme}: the Post Office form of the PDF. Its labels are part of the book, so they
  // stay in French; the message is set in capitals by CSS, as \MakeUppercase does.
  let { block, notes }: { block: Extract<Block, { type: 'telegram' }>; notes: boolean } = $props();
</script>

<div class="doc telegram" data-block-id={block.id}>
  <p class="form-title spaced">Post Office Telegraphs</p>
  <table>
    <tbody>
      <tr><th scope="row">Bureau d’origine</th><td><Inlines nodes={block.office} {notes} /></td></tr>
      <tr><th scope="row">Heure de dépôt</th><td class="time"><Inlines nodes={block.time} {notes} /></td></tr>
      <tr><th scope="row">Destinataire</th><td><Inlines nodes={block.recipient} {notes} /></td></tr>
    </tbody>
  </table>
  <div class="message"><Blocks blocks={block.body} {notes} /></div>
</div>

<style>
  .telegram {
    border-width: 1.5px;
  }
  .form-title {
    margin: -0.2em -0.2em 0.6em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--frame);
    text-align: center;
  }
  table {
    border-collapse: collapse;
    font-size: 0.9em;
  }
  th {
    padding: 0 1em 0 0;
    text-align: left;
    font-weight: normal;
    font-variant-caps: small-caps;
  }
  td {
    padding: 0;
  }
  .time {
    font-variant-numeric: lining-nums;
  }
  .message {
    margin-top: 0.6em;
    padding-top: 0.6em;
    border-top: 1px solid var(--frame);
    font-family: var(--font-mono);
    font-size: 0.85em;
    text-transform: uppercase;
  }
  .message :global(.paragraph) {
    text-indent: 0;
  }
</style>
