import type { Block, Inline } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { buildParts } from '../src/parts.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { plainText } from '../src/inlines.js';
import { PART_GRAMMAR } from '../src/vocabulary.js';

/** Blocks of the only chapter of a one-part book. */
const blocks = (body: string): Block[] => {
  const src = `\\partie{P}{N}\n\\chapitre{T}\n${body}`;
  const [part] = buildParts([{ file: 'p.tex', nodes: parse(tokenize('p.tex', src), PART_GRAMMAR) }]);
  return part!.chapters[0]!.blocks;
};
const one = <T extends Block['type']>(body: string, type: T): Extract<Block, { type: T }> => {
  const bs = blocks(body);
  expect(bs).toHaveLength(1);
  expect(bs[0]!.type).toBe(type);
  return bs[0] as Extract<Block, { type: T }>;
};
const t = (text: string): Inline[] => [{ type: 'text', text }];

describe('documents', () => {
  it('lettre with place, salutation, body, signature and postscript', () => {
    const l = one(
      '\\begin{lettre}[Londres, le 27 novembre 1890]{Madame,}\nJe vous écris.\n\\signature{V. Valentini}\n\\postscriptum{Brûlez ceci.}\n\\end{lettre}',
      'letter',
    );
    expect(l.id).toBe('c1.b1');
    expect(l.place).toEqual(t('Londres, le 27 novembre 1890'));
    expect(l.salutation).toEqual(t('Madame,'));
    expect(l.body.map((b) => b.type)).toEqual(['paragraph', 'signature', 'postscript']);
    expect(l.body[1]).toEqual({ type: 'signature', id: 'c1.b1.2', content: t('V. Valentini') });
    expect(l.body[2]).toEqual({ type: 'postscript', id: 'c1.b1.3', content: t('Brûlez ceci.') });
  });

  it('lettre without place', () => {
    expect(one('\\begin{lettre}{Madame,}\nX\n\\end{lettre}', 'letter').place).toBeNull();
  });

  it('telegramme fields and body', () => {
    const g = one('\\begin{telegramme}{Paddington}{14h30}{Lord Whitmore}\nARRIVE DEMAIN\n\\end{telegramme}', 'telegram');
    expect(g.office).toEqual(t('Paddington'));
    expect(g.time).toEqual(t('14h30'));
    expect(g.recipient).toEqual(t('Lord Whitmore'));
    expect(g.body.map((b) => b.type)).toEqual(['paragraph']);
  });

  it('coupure with and without date', () => {
    const c = one('\\begin{coupure}{The London Herald}{Un drame}[le 28]\nTexte.\n\\end{coupure}', 'clipping');
    expect(c.newspaper).toEqual(t('The London Herald'));
    expect(c.headline).toEqual(t('Un drame'));
    expect(c.date).toEqual(t('le 28'));
    expect(one('\\begin{coupure}{H}{D}\nTexte.\n\\end{coupure}', 'clipping').date).toBeNull();
  });

  it('journal heading', () => {
    const d = one('\\begin{journal}{Entrée du 27}\nCher journal.\n\\end{journal}', 'diary');
    expect(d.heading).toEqual(t('Entrée du 27'));
    expect(d.body).toHaveLength(1);
  });

  it('carton body', () => {
    const c = one('\\begin{carton}\nDéfense d\'entrer.\n\\end{carton}', 'card');
    expect(c.body.map((b) => b.type)).toEqual(['paragraph']);
  });

  it('plan width and caption', () => {
    const i = one('\\plan[0.6\\linewidth]{figures/plan.png}{Le salon}', 'image');
    expect(i).toMatchObject({ src: 'figures/plan.png', fullPage: false, widthFraction: 0.6 });
    expect(plainText(i.caption, { file: 'p.tex', line: 3, column: 1 })).toBe('Le salon');
    expect(one('\\plan[0.5\\textwidth]{a.svg}{x}', 'image').widthFraction).toBe(0.5);
    expect(one('\\plan{a.jpg}{x}', 'image').widthFraction).toBeNull();
    expect(one('\\plan[5cm]{a.JPEG}{x}', 'image').widthFraction).toBeNull();
    expect(one('\\plan[\\linewidth]{a.png}{x}', 'image').widthFraction).toBeNull();
  });

  it('planpleinepage is full page', () => {
    const i = one('\\planpleinepage[width=\\textwidth,keepaspectratio]{figures/hall.png}{Le hall}', 'image');
    expect(i).toMatchObject({ src: 'figures/hall.png', fullPage: true, widthFraction: null });
  });

  it('pdf image is rejected', () => {
    expect(() => blocks('\\plan{figures/plan.pdf}{Le salon}')).toThrow(
      'image figures/plan.pdf: use a .png, .jpg or .svg file (the site cannot show other formats)',
    );
  });

  it('signature outside lettre is fatal', () => {
    expect(() => blocks('\\signature{X}')).toThrow('\\signature outside lettre');
    expect(() => blocks('\\begin{carton}\n\\postscriptum{X}\n\\end{carton}')).toThrow('\\postscriptum outside lettre');
    expect(() => blocks('\\begin{lettre}{M}\n\\begin{carton}\n\\signature{X}\n\\end{carton}\n\\end{lettre}')).toThrow(
      '\\signature outside lettre',
    );
  });

  it('chapitre inside a document is fatal', () => {
    expect(() => blocks('\\begin{carton}\n\\chapitre{X}\n\\end{carton}')).toThrow('\\chapitre');
    expect(() => blocks('\\pageannexe{A}{\\partie{x}{y}}')).toThrow('\\partie');
  });

  it('annex page with nested document and nested block ids', () => {
    const a = one('\\pageannexe{Annexe}{Avant.\n\n\\begin{carton}\nDedans.\n\\end{carton}}', 'annexPage');
    expect(a.title).toEqual(t('Annexe'));
    expect(a.body.map((b) => [b.type, b.id])).toEqual([['paragraph', 'c1.b1.1'], ['card', 'c1.b1.2']]);
    const card = a.body[1] as Extract<Block, { type: 'card' }>;
    expect(card.body[0]!.id).toBe('c1.b1.2.1');
  });
});
