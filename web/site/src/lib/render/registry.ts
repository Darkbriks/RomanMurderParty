import type { Block, Inline } from '@rmp/model';
import type { Component } from 'svelte';
import AnnexPage from './blocks/AnnexPage.svelte';
import Card from './blocks/Card.svelte';
import Clipping from './blocks/Clipping.svelte';
import Diary from './blocks/Diary.svelte';
import End from './blocks/End.svelte';
import Image from './blocks/Image.svelte';
import Letter from './blocks/Letter.svelte';
import Paragraph from './blocks/Paragraph.svelte';
import Postscript from './blocks/Postscript.svelte';
import SceneBreak from './blocks/SceneBreak.svelte';
import Signature from './blocks/Signature.svelte';
import Telegram from './blocks/Telegram.svelte';
import Bold from './inlines/Bold.svelte';
import DropCap from './inlines/DropCap.svelte';
import Emphasis from './inlines/Emphasis.svelte';
import LineBreak from './inlines/LineBreak.svelte';
import Note from './inlines/Note.svelte';
import Quote from './inlines/Quote.svelte';
import SmallCaps from './inlines/SmallCaps.svelte';
import Text from './inlines/Text.svelte';
import Thought from './inlines/Thought.svelte';

/**
 * The dispatch tables of the book renderer, keyed by the model's `type` field. This is the
 * extension point: a new node kind (for example diff insert/delete marks) is a new entry here, and
 * TypeScript fails until every model type has its renderer.
 */
export const blockRenderers: {
  [K in Block['type']]: Component<{ block: Extract<Block, { type: K }>; notes: boolean }>;
} = {
  paragraph: Paragraph,
  sceneBreak: SceneBreak,
  end: End,
  letter: Letter,
  signature: Signature,
  postscript: Postscript,
  telegram: Telegram,
  clipping: Clipping,
  diary: Diary,
  card: Card,
  image: Image,
  annexPage: AnnexPage,
};

export const inlineRenderers: {
  [K in Inline['type']]: Component<{ node: Extract<Inline, { type: K }>; notes: boolean }>;
} = {
  text: Text,
  emphasis: Emphasis,
  smallCaps: SmallCaps,
  bold: Bold,
  quote: Quote,
  thought: Thought,
  note: Note,
  dropCap: DropCap,
  lineBreak: LineBreak,
};
