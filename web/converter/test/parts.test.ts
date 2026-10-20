import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PartSchema, type Block, type Inline, type Part } from '@rmp/model';
import { describe, expect, it } from 'vitest';
import { buildBlocks } from '../src/blocks.js';
import { buildInlines, plainText } from '../src/inlines.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { buildParts } from '../src/parts.js';
import { NBSP, NNBSP } from '../src/typography.js';
import { IGNORED_LAYOUT, PART_GRAMMAR } from '../src/vocabulary.js';

type Paragraph = Extract<Block, { type: 'paragraph' }>;

const nodesOf = (file: string, src: string) => parse(tokenize(file, src), PART_GRAMMAR);
const build = (src: string): Part[] => buildParts([{ file: 'p.tex', nodes: nodesOf('p.tex', src) }]);
const buildFiles = (...sources: string[]): Part[] =>
  buildParts(sources.map((src, i) => ({ file: `p${i + 1}.tex`, nodes: nodesOf(`p${i + 1}.tex`, src) })));
/** Blocks of the only chapter of a one-part book; the body starts on line 3. */
const chapterBlocks = (body: string): Block[] => {
  const [part] = build(`\\partie{P}{N}\n\\chapitre{T}\n${body}`);
  expect(part!.chapters).toHaveLength(1);
  return part!.chapters[0]!.blocks;
};
const paragraphs = (blocks: Block[]): Paragraph[] =>
  blocks.map((b) => {
    expect(b.type).toBe('paragraph');
    return b as Paragraph;
  });
/** Content of the only segment of the only paragraph. */
const only = (body: string): Inline[] => {
  const [p] = paragraphs(chapterBlocks(body));
  expect(p!.segments).toHaveLength(1);
  return p!.segments[0]!.content;
};
const t = (text: string): Inline => ({ type: 'text', text });
const inl = (src: string): Inline[] => buildInlines(nodesOf('i.tex', src));

describe('segments', () => {
  it('one segment per source line', () => {
    const [part] = build('\\partie{P}{N}\\chapitre{T}Un.\nDeux.\nTrois.');
    const [p] = paragraphs(part!.chapters[0]!.blocks);
    expect(p!.segments).toEqual([
      { loc: { file: 'p.tex', line: 1 }, content: [t('Un.')], spaceAfter: true },
      { loc: { file: 'p.tex', line: 2 }, content: [t('Deux.')], spaceAfter: true },
      { loc: { file: 'p.tex', line: 3 }, content: [t('Trois.')], spaceAfter: false },
    ]);
  });

  it('a line ending in a control word has no space after it', () => {
    const [p] = paragraphs(chapterBlocks('Simplement\\ldots\nsimplement.'));
    expect(p!.segments.map((s) => [s.content, s.spaceAfter])).toEqual([
      [[t('Simplement…')], false],
      [[t('simplement.')], false],
    ]);
  });

  it('the last segment of a paragraph has no space after it', () => {
    const [p] = paragraphs(chapterBlocks('Un.\nDeux.\n\nTrois.'));
    expect(p!.segments.map((s) => s.spaceAfter)).toEqual([true, false]);
  });

  it('a newline inside an argument is a plain space', () => {
    expect(only('Il \\pensee{pensa\nfort} enfin.')).toEqual([
      t('Il '),
      { type: 'thought', children: [t('pensa fort')] },
      t(' enfin.'),
    ]);
  });

  it('a segment spanning several lines takes the line of its first token', () => {
    const [p] = paragraphs(chapterBlocks('Un \\noteauteur{a\nb} deux.\nTrois.'));
    expect(p!.segments.map((s) => s.loc.line)).toEqual([3, 5]);
  });

  it('a comment at the end of a line joins the next line to the segment', () => {
    expect(only('Un%\nDeux.')).toEqual([t('UnDeux.')]);
  });

  it('a comment-only line does not split the paragraph', () => {
    const [p] = paragraphs(chapterBlocks('Un.\n% note\nDeux.'));
    expect(p!.segments.map((s) => s.content)).toEqual([[t('Un.')], [t('Deux.')]]);
  });

  it('trims ordinary spaces at both ends of a segment', () => {
    expect(only('\\vspace{1cm} Texte \\noindent')).toEqual([t('Texte')]);
  });

  it('does not emit empty segments or empty paragraphs', () => {
    const blocks = chapterBlocks('Un.\n\\bigskip\nDeux.\n\n\\clearpage\n\n\\rep\nTrois.\n\\par\\par');
    const ps = paragraphs(blocks);
    expect(ps.map((p) => p.segments.map((s) => s.content))).toEqual([
      [[t('Un.')], [t('Deux.')]],
      [[t('Trois.')]],
    ]);
    expect(ps[1]!.dialogue).toBe(true);
  });

  it('merges adjacent text nodes', () => {
    expect(only('a [b] {c}d')).toEqual([t('a [b] cd')]);
  });
});

describe('paragraphs', () => {
  it('rep starts a dialogue paragraph', () => {
    const ps = paragraphs(chapterBlocks('Texte.\n\\rep Sera, tu as froid ?\nJe te vois.'));
    expect(ps).toHaveLength(2);
    expect(ps[0]!.dialogue).toBe(false);
    expect(ps[1]!.dialogue).toBe(true);
    expect(ps[1]!.segments).toHaveLength(2);
    expect(ps[1]!.segments[0]!.content).toEqual([t(`Sera, tu as froid${NNBSP}?`)]);
    expect(ps[1]!.segments[1]!.content).toEqual([t('Je te vois.')]);
  });

  it('par and a blank line end a paragraph', () => {
    const ps = paragraphs(chapterBlocks('Un.\\par Deux.\n\n\n Trois.'));
    expect(ps.map((p) => p.segments[0]!.content)).toEqual([[t('Un.')], [t('Deux.')], [t('Trois.')]]);
    expect(ps.every((p) => !p.dialogue)).toBe(true);
  });

  it('scene break and end', () => {
    const blocks = chapterBlocks('Un.\n\\separation\nDeux.\n\\fin');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'sceneBreak', 'paragraph', 'end']);
    expect(blocks[1]).toEqual({ type: 'sceneBreak', id: 'c1.b2' });
    expect(blocks[3]).toEqual({ type: 'end', id: 'c1.b4' });
  });
});

describe('inlines', () => {
  it('ldots keeps TeX spacing', () => {
    expect(only('monter\\ldots je crois.')).toEqual([t('monter…je crois.')]);
  });

  it('notes become note inlines', () => {
    expect(only('\\areprendre{Titre ?}')).toEqual([
      { type: 'note', kind: 'rework', children: [t(`Titre${NNBSP}?`)] },
    ]);
    expect(only('\\noteauteur{À écrire.}')).toEqual([
      { type: 'note', kind: 'author', children: [t('À écrire.')] },
    ]);
  });

  it('wrappers', () => {
    expect(inl('\\pensee{a}\\enquote{b}\\emph{c}\\textit{d}\\textsc{e}\\textbf{f}')).toEqual([
      { type: 'thought', children: [t('a')] },
      { type: 'quote', children: [t('b')] },
      { type: 'emphasis', children: [t('c')] },
      { type: 'emphasis', children: [t('d')] },
      { type: 'smallCaps', children: [t('e')] },
      { type: 'bold', children: [t('f')] },
    ]);
  });

  it('dropCap from debut', () => {
    expect(only('\\debut{B}{elgravia}, Londres.')).toEqual([
      { type: 'dropCap', letter: 'B', rest: [t('elgravia')] },
      t(', Londres.'),
    ]);
  });

  it('symbols and control symbols', () => {
    expect(inl('a\\textemdash b\\textendash c\\nobreakspace d~e\\,f')).toEqual([
      t(`a—b–c${NBSP}d${NBSP}e${NNBSP}f`),
    ]);
    expect(inl('\\%\\&\\#\\_ x\\ y in\\-cro\\-yable')).toEqual([t('%&#_ x y in\u00ADcro\u00ADyable')]);
  });

  it('a double backslash is a line break', () => {
    expect(inl('Un\\\\Deux')).toEqual([t('Un'), { type: 'lineBreak' }, t('Deux')]);
    // Its optional vertical space is layout, dropped with any length inside.
    expect(inl('Un\\\\[0.5\\baselineskip]Deux')).toEqual([t('Un'), { type: 'lineBreak' }, t('Deux')]);
  });

  it('a bare group is inlined', () => {
    expect(inl('a{b \\emph{c}}d')).toEqual([t('ab '), { type: 'emphasis', children: [t('c')] }, t('d')]);
  });

  it('applies TeX ligatures to each text node', () => {
    expect(inl("l'air -- non---oui")).toEqual([t('l’air – non—oui')]);
    // A group breaks a ligature in TeX.
    expect(inl('-{}-')).toEqual([t('--')]);
  });

  it('applies French spacing across inline nodes', () => {
    expect(only('\\enquote{Les Perles} ?')).toEqual([
      { type: 'quote', children: [t('Les Perles')] },
      t(`${NNBSP}?`),
    ]);
    expect(only('« Bonjour »')).toEqual([t(`«${NBSP}Bonjour${NBSP}»`)]);
  });

  it('plainText flattens inlines', () => {
    expect(
      plainText([
        t('a'),
        { type: 'emphasis', children: [t('b')] },
        { type: 'lineBreak' },
        { type: 'dropCap', letter: 'C', rest: [t('d')] },
      ]),
    ).toBe('ab Cd');
  });
});

describe('chapters and parts', () => {
  it('chapters number continuously across parts', () => {
    const src = '\\partie{A}{X}\n\\chapitre{Un}\nTexte.\n\\chapitre{Deux}\nTexte.\n';
    const result = buildFiles(src, src);
    const chapters = result.flatMap((p) => p.chapters);
    expect(chapters.map((c) => c.number)).toEqual([1, 2, 3, 4]);
    expect(chapters.map((c) => c.numeral)).toEqual(['I', 'II', 'III', 'IV']);
    expect(chapters.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(chapters[2]!.loc).toEqual({ file: 'p2.tex', line: 2 });
  });

  it('roman numerals beyond the first few', () => {
    const src = '\\partie{A}{X}\n' + '\\chapitre{}\n'.repeat(49);
    const numerals = build(src)[0]!.chapters.map((c) => c.numeral);
    expect([4, 9, 14, 40, 49].map((n) => numerals[n - 1])).toEqual(['IV', 'IX', 'XIV', 'XL', 'XLIX']);
  });

  it('empty chapter title is null', () => {
    const [part] = build('\\partie{A}{X}\n\\chapitre{}\n\\chapitre{ }\n\\chapitre{Valse (provisoire)}\n');
    expect(part!.chapters.map((c) => c.title)).toEqual([null, null, [t('Valse (provisoire)')]]);
  });

  it('part fields', () => {
    const [p1, p2] = build(
      '\\partie[Une épigraphe ?]{Ouverture}{Seraphina}\n\\chapitre{}\n\\partie{ Intermède }{Narrateur à~choisir}\n',
    );
    expect({ ...p1!, chapters: [] }).toEqual({
      id: 'p1',
      ordinal: 1,
      label: 'Ouverture',
      narrator: 'Seraphina',
      epigraph: [t(`Une épigraphe${NNBSP}?`)],
      loc: { file: 'p.tex', line: 1 },
      intro: [],
      chapters: [],
    });
    expect(p2!.id).toBe('p2');
    expect(p2!.ordinal).toBe(2);
    expect(p2!.label).toBe('Intermède');
    expect(p2!.narrator).toBe(`Narrateur à${NBSP}choisir`);
    expect(p2!.epigraph).toBeNull();
    expect(p2!.loc).toEqual({ file: 'p.tex', line: 3 });
  });

  it('blocks before the first chapter go to intro', () => {
    const [part] = build('\\partie{A}{X}\nAvant.\n\\separation\n\\chapitre{}\nDedans.');
    expect(part!.intro.map((b) => [b.type, b.id])).toEqual([
      ['paragraph', 'p1.b1'],
      ['sceneBreak', 'p1.b2'],
    ]);
    expect(part!.chapters[0]!.blocks.map((b) => b.id)).toEqual(['c1.b1']);
  });

  it('a file without partie continues the current chapter in a new paragraph', () => {
    const result = buildFiles('\\partie{A}{X}\n\\chapitre{}\nUn', 'Deux');
    const blocks = paragraphs(result[0]!.chapters[0]!.blocks);
    expect(blocks.map((b) => [b.id, b.segments[0]!.content, b.segments[0]!.loc])).toEqual([
      ['c1.b1', [t('Un')], { file: 'p1.tex', line: 3 }],
      ['c1.b2', [t('Deux')], { file: 'p2.tex', line: 1 }],
    ]);
  });

  it('block ids are stable', () => {
    const src = '\\partie{A}{X}\n\\chapitre{}\nUn.\n\n\\rep Deux.\n\\separation\nTrois.\n\\fin\n';
    const first = build(src);
    expect(build(src)).toEqual(first);
    expect(first[0]!.chapters[0]!.blocks.map((b) => b.id)).toEqual(['c1.b1', 'c1.b2', 'c1.b3', 'c1.b4', 'c1.b5']);
  });

  it('the result matches the model schema exactly', () => {
    const result = build(
      '\\partie[E]{A}{X}\nIntro.\n\\chapitre{T}\n\\debut{B}{elgravia} \\pensee{a}\\\\ \\areprendre{b}.\n\\separation\n\\fin',
    );
    for (const part of result) expect(PartSchema.parse(part)).toEqual(part);
  });
});

describe('ignored and forbidden input', () => {
  it('comments never reach the model', () => {
    const json = JSON.stringify(
      build('\\partie{A}{X}\n\\chapitre{Seule}\n\n%chapitre flash back seraphina seule\nTexte. % une remarque\n'),
    );
    expect(json).not.toContain('flash back');
    expect(json).not.toContain('remarque');
    expect(json).toContain('Texte.');
  });

  it('layout commands are ignored', () => {
    const blocks = chapterBlocks('Texte.\n\\clearpage\n\\vspace{1cm}\nSuite \\vspace*{0.5\\baselineskip}fin.');
    const [p] = paragraphs(blocks);
    expect(p!.segments.map((s) => s.content)).toEqual([[t('Texte.')], [t('Suite fin.')]]);
    expect(JSON.stringify(blocks)).not.toMatch(/1cm|0\.5/);
    expect([...IGNORED_LAYOUT].sort()).toEqual(
      ['clearpage', 'cleardoublepage', 'newpage', 'thispagestyle', 'bigskip', 'medskip', 'smallskip', 'vspace',
        'vspace*', 'noindent'].sort(),
    );
    expect(chapterBlocks('\\thispagestyle{empty}\\newpage\\cleardoublepage\\medskip\\smallskip')).toEqual([]);
  });

  it('unknown command is fatal with location', () => {
    expect(() => build('\\partie{A}{X}\n\\chapitre{}\n\\foo{x}')).toThrow('p.tex:3:1: unknown command \\foo');
  });

  it('a length outside a layout argument is fatal', () => {
    expect(() => chapterBlocks('Texte \\linewidth.')).toThrow('p.tex:3:7: unexpected \\linewidth');
    expect(() => chapterBlocks('\\pensee{\\textwidth}')).toThrow('p.tex:3:9: unexpected \\textwidth');
  });

  it('a block command inside an argument is fatal', () => {
    expect(() => chapterBlocks('\\pensee{a \\rep b}')).toThrow('p.tex:3:11: unexpected \\rep');
    expect(() => chapterBlocks('\\emph{\\separation}')).toThrow('p.tex:3:7: unexpected \\separation');
    expect(() => chapterBlocks('\\noteauteur{\\chapitre{x}}')).toThrow('p.tex:3:13: unexpected \\chapitre');
  });

  it('a paragraph break inside an argument is fatal', () => {
    expect(() => chapterBlocks('\\noteauteur{Un.\n\nDeux.}')).toThrow('p.tex:4:1: paragraph break inside an argument');
  });

  it('a working note in a label is fatal', () => {
    expect(() => build('\\partie{Ouverture \\areprendre{titre}}{X}')).toThrow(
      'p.tex:1:1: a working note cannot appear in a label or name',
    );
  });

  it('content before partie is fatal', () => {
    expect(() => build('\n\\clearpage\nTexte.\n\\partie{A}{X}')).toThrow('p.tex:3:1: content before \\partie');
    expect(() => build('\\chapitre{}\n\\partie{A}{X}')).toThrow('p.tex:1:1: content before \\partie');
    expect(build('% en-tête\n\\cleardoublepage\n\n\\partie{A}{X}')).toHaveLength(1);
  });

  it('buildBlocks rejects structure commands', () => {
    const nodes = nodesOf('d.tex', 'a\n\\partie{A}{X}');
    expect(() => buildBlocks(nodes, { idPrefix: 'x', allowLetterParts: false })).toThrow('d.tex:2:1: unexpected \\partie');
  });
});

describe('repository part files', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const names = ['ouverture', 'partie1', 'partie2', 'intermede', 'partie3', 'partie4', 'conclusion', 'coda'];

  it('converts the real part files', async () => {
    const files = await Promise.all(
      names.map(async (name) => {
        const file = `parties/${name}.tex`;
        return { file, nodes: nodesOf(file, await readFile(path.join(root, file), 'utf8')) };
      }),
    );
    const result = buildParts(files);
    expect(result).toHaveLength(8);
    const chapters = result.flatMap((p) => p.chapters);
    expect(chapters).toHaveLength(9);
    expect(plainText(chapters[0]!.title!)).toBe('Valse (provisoire)');
    expect(plainText(chapters[1]!.title!)).toBe('Seule');
    expect(result.map((p) => p.narrator)).toEqual([
      'Seraphina', 'Narrateur à choisir', 'Narrateur à choisir', 'Reginald',
      'Narrateur à choisir', 'Narrateur à choisir', 'To Define', 'Vivienne',
    ]);
    const json = JSON.stringify(result);
    expect(json).not.toContain('Opera, piece, valse, comedie');
    expect(json).not.toContain('flash back');
    for (const part of result) expect(PartSchema.parse(part)).toEqual(part);
  });
});
