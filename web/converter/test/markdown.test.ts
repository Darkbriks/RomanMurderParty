import { describe, expect, it } from 'vitest';
import { markdownSections, markdownToHtml } from '../src/markdown.js';

describe('markdownSections', () => {
  it('cuts sections at headings, with prefixed ids, levels, html and plain text', () => {
    const s = markdownSections('# A\n\nIntro\n\n## B é\n\nTexte', 'f');
    expect(s.map((x) => x.id)).toEqual(['f-a', 'f-b-e']);
    expect(s.map((x) => x.level)).toEqual([1, 2]);
    expect(s[1]!.heading).toBe('B é');
    expect(s[1]!.html.startsWith('<h2 id="f-b-e">')).toBe(true);
    expect(s[1]!.text).toBe('Texte');
    expect(s[0]!.text).toBe('Intro');
  });

  it('keeps the content before the first heading as a level-0 section', () => {
    const s = markdownSections('Avant.\n\n## Titre\n\nApres.', 'f');
    expect(s[0]).toMatchObject({ id: 'f', level: 0, heading: '', text: 'Avant.' });
    expect(markdownSections('## Titre\n\nX', 'f').map((x) => x.level)).toEqual([2]);
  });

  it('numbers repeated headings', () => {
    expect(markdownSections('## X\n\na\n\n## X\n\nb', 'f').map((x) => x.id)).toEqual(['f-x', 'f-x-2']);
  });

  it('rewrites links, or unlinks them when told to', () => {
    const html = markdownSections('[p](a.yaml) et [q](b.tex) et [r](https://e.com)', 'f', (href) =>
      href === 'a.yaml' ? '?vue=p' : href.startsWith('http') ? href : null,
    )[0]!.html;
    expect(html).toContain('<a href="?vue=p">p</a>');
    expect(html).toContain('<a href="https://e.com">r</a>');
    expect(html).toContain('et q et');
    expect(html).not.toContain('b.tex');
  });

  it('decodes entities in the plain text', () => {
    expect(markdownSections('A & B < C "d"', 'f')[0]!.text).toBe('A & B < C "d"');
  });
});

describe('markdownToHtml', () => {
  it('renders markdown and keeps comments invisible', () => {
    const html = markdownToHtml('<!-- TODO : x -->\nBonjour *toi*');
    expect(html).toContain('Bonjour <em>toi</em>');
    expect(html).not.toMatch(/>[^<]*TODO/);
  });
});
