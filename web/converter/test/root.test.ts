import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConversionError } from '../src/errors.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { checkFrontFile, LAYOUT_GRAMMAR, readBackFile } from '../src/layout-files.js';
import { readRoot } from '../src/root.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, 'fixtures', 'book');
const repoRoot = path.resolve(here, '..', '..', '..');
const read = (dir: string, f: string) => readFile(path.join(dir, f), 'utf8');
const layout = (file: string, src: string) => parse(tokenize(file, src), LAYOUT_GRAMMAR);
const message = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ConversionError);
    return (e as ConversionError).message;
  }
  throw new Error('did not throw');
};

describe('readRoot', () => {
  it('finds files by section on the frozen fixture', async () => {
    const info = readRoot(await read(fixture, 'roman.tex'));
    expect(info.parts).toEqual(
      ['ouverture', 'partie1', 'partie2', 'intermede', 'partie3', 'partie4', 'conclusion', 'coda']
        .map((p) => `parties/${p}.tex`),
    );
    expect(info.front).toEqual(['annexes/liminaires.tex']);
    expect(info.back).toEqual(['annexes/personnages.tex']);
  });

  it('skips the demonstration block', () => {
    const info = readRoot(
      '\\newif\\ifdemonstration\n\\demonstrationfalse\n\\titre{T}\n\\begin{document}\n\\mainmatter\n' +
        '\\ifdemonstration\n\\input{exemples/demo}\n\\fi\n\\include{parties/a}\n\\end{document}\n',
    );
    expect(info.parts).toEqual(['parties/a.tex']);
  });

  it('demonstrationtrue is fatal', () => {
    expect(message(() => readRoot('\\newif\\ifdemonstration\n\\demonstrationtrue\n'))).toBe(
      'roman.tex:2:1: demonstration mode is not supported by the web converter',
    );
  });

  it('reads epigraph and dedication', () => {
    const info = readRoot('\\dedicace{Pour X.}\n\\epigraphe[Auteur]{Texte.}\n\\epigraphe{Seul.}\n');
    expect(info.dedication).not.toBeNull();
    expect(info.epigraph?.source).toBeNull();
    expect(readRoot('\\epigraphe[Auteur]{Texte.}').epigraph?.source).not.toBeNull();
  });

  it('rejects a file outside a section and unknown commands', () => {
    expect(() => readRoot('\\input{a}')).toThrow(ConversionError);
    expect(() => readRoot('\\foo')).toThrow(/unknown command/);
  });
});

describe('layout files', () => {
  it('front file rejects stray prose', () => {
    expect(message(() => checkFrontFile('f.tex', layout('f.tex', '\\begin{center}Ma dédicace\\end{center}')))).toBe(
      'f.tex:1:15: text in a layout file is not published on the site: "Ma dédicace"',
    );
  });

  it('front file accepts the known literals and rejects personnages', () => {
    checkFrontFile('f.tex', layout('f.tex', '{\\small\\scshape roman\\par}\\vspace{1.2\\baselineskip}'));
    expect(() => checkFrontFile('f.tex', layout('f.tex', '\\begin{personnages}\\end{personnages}'))).toThrow(
      ConversionError,
    );
  });

  it('front file accepts literals equal to the book texts and nothing else', () => {
    const src = layout('f.tex', '\\begin{center}Titre provisoire\\par Antoine\\end{center}');
    checkFrontFile('f.tex', src, ['Titre provisoire', 'Autre', 'Antoine']);
    expect(message(() => checkFrontFile('f.tex', src, ['Titre provisoire']))).toBe(
      'f.tex:1:36: text in a layout file is not published on the site: "Antoine"',
    );
    expect(() => checkFrontFile('f.tex', layout('f.tex', 'Titre provisoire Plus'), ['Titre provisoire'])).toThrow('Titre provisoire Plus');
  });

  it('front file passes on the frozen fixture', async () => {
    checkFrontFile('annexes/liminaires.tex', layout('annexes/liminaires.tex', await read(fixture, 'annexes/liminaires.tex')));
  });

  it('checkFrontFile passes on the live liminaires', async () => {
    checkFrontFile('annexes/liminaires.tex', layout('annexes/liminaires.tex', await read(repoRoot, 'annexes/liminaires.tex')));
  });

  it('characters from the frozen back file', async () => {
    const file = 'annexes/personnages.tex';
    const characters = readBackFile(file, layout(file, await read(fixture, file)))!;
    expect(characters.title).toBe('Les personnages');
    expect(characters.groups).toHaveLength(2);
    const [first] = characters.groups;
    expect(first!.id).toBe('g1');
    expect(first!.name).toBe('La maison Whitmore');
    expect(first!.people[0]).toMatchObject({
      id: 'g1.1', name: 'Lady Margaret Whitmore', details: '48 ans',
    });
    const theodore = characters.groups.flatMap((g) => g.people).find((p) => p.name === 'Theodore Bradshaw');
    expect(theodore!.details).toBe('');
  });

  it('people before any group go in a nameless group', () => {
    const c = readBackFile('b.tex', layout('b.tex', '\\begin{personnages}\\personnage{A}{}{B.}\\end{personnages}'))!;
    expect(c.title).toBeNull();
    expect(c.groups).toMatchObject([{ id: 'g1', name: null, people: [{ id: 'g1.1', name: 'A' }] }]);
  });

  it('the optional argument of personnages is the title', () => {
    const src = (opt: string) =>
      `Les personnages\n\\begin{personnages}${opt}\\personnage{A}{}{B.}\\end{personnages}`;
    const title = (opt: string) => readBackFile('b.tex', layout('b.tex', src(opt)))!.title;
    expect(title('[Dramatis personae]')).toBe('Dramatis personae');
    expect(title('')).toBe('Les personnages');
    expect(title('[]')).toBe('Les personnages');
  });

  it('a back file without personnages gives null', () => {
    expect(readBackFile('b.tex', layout('b.tex', '\\clearpage'))).toBeNull();
  });
});
