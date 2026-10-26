import path from 'node:path';
import type { Bible, BibleFile, BibleValue } from '@rmp/model';
import { parseDocument } from 'yaml';
import { ConversionError } from './errors.js';
import { markdownSections } from './markdown.js';

/*
 * The bible (`bible/`): what the author needs to write the novel without being part of it. Its
 * YAML and Markdown files become `data/bible.json`, read by the site's /bible/ section. Only the
 * latest commit (or the working tree) counts: the bible has no versions.
 */

const isYaml = (p: string): boolean => /\.ya?ml$/.test(p);

/**
 * The files the site shows: YAML at any depth, Markdown directly under `bible/` except the README
 * (it documents the folder), and PDFs, offered for download next to the YAML of their folder.
 */
export function selectBibleFiles(paths: string[]): { sources: string[]; pdfs: string[] } {
  const sorted = [...paths].sort();
  return {
    sources: sorted.filter((p) => isYaml(p) || (/^bible\/[^/]+\.md$/.test(p) && p !== 'bible/README.md')),
    pdfs: sorted.filter((p) => p.endsWith('.pdf')),
  };
}

const TITLES: Record<string, string> = {
  personnages: 'Personnages',
  chronologie: 'Chronologie',
  relations: 'Relations',
  intrigues: 'Intrigues',
  invitations: 'Invitations',
  vote: 'Vote',
  'reperes-historiques': 'Repères historiques',
  maison: 'Maison',
  bible: 'Bible',
  'notes-de-scene': 'Notes de scène',
};

/** The title of a file, from its name: accents restored for the known files. */
export function fileTitle(slug: string): string {
  const plain = slug.replace(/[-_]+/g, ' ');
  return TITLES[slug] ?? plain.charAt(0).toUpperCase() + plain.slice(1);
}

/** The `#` lines at the top of a YAML file, without their `# `: the legend of its codes. */
export function headerLegend(text: string): string | null {
  const lines: string[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      if (lines.length > 0) break;
      continue;
    }
    if (!line.startsWith('#')) break;
    lines.push(line.replace(/^# ?/, ''));
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

const slugOf = (p: string): string => path.posix.basename(p).replace(/\.[^.]+$/, '');

function parseYaml(file: string, text: string): BibleValue {
  const doc = parseDocument(text);
  const error = doc.errors[0];
  if (error) {
    const pos = error.linePos?.[0];
    throw new ConversionError(pos ? { file, line: pos.line, column: pos.col } : { file, line: 1, column: 1 }, error.message);
  }
  return (doc.toJS() ?? null) as BibleValue;
}

/** Builds the bible from its sources (repo-relative paths under `bible/`) and its PDFs. */
export function buildBible(sources: { path: string; text: string }[], pdfPaths: string[]): Bible {
  const sorted = [...sources].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const bySlug = new Map<string, string>();
  for (const { path: p } of sorted) {
    const other = bySlug.get(slugOf(p));
    if (other) throw new ConversionError(null, `two bible files share the name ${slugOf(p)}: ${other} and ${p}`);
    bySlug.set(slugOf(p), p);
  }
  const slugByPath = new Map([...bySlug].map(([slug, p]) => [p, slug]));

  const files = sorted.map(({ path: p, text }): BibleFile => {
    const slug = slugOf(p);
    const title = fileTitle(slug);
    if (isYaml(p)) {
      const dir = path.posix.dirname(p);
      const pdfs = pdfPaths
        .filter((pdf) => path.posix.dirname(pdf) === dir)
        .map((pdf) => ({ name: path.posix.basename(pdf), url: `downloads/${pdf}` }));
      return { kind: 'yaml', path: p, slug, title, legend: headerLegend(text), data: parseYaml(p, text), pdfs };
    }
    // A relative link to another bible file opens its view; one to anything else becomes text.
    const rewriteLink = (href: string): string | null => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) return href;
      const [target = '', hash] = href.split('#', 2);
      const other = slugByPath.get(path.posix.join(path.posix.dirname(p), target));
      return other ? `?vue=${other}${hash ? `#${hash}` : ''}` : null;
    };
    return { kind: 'markdown', path: p, slug, title, sections: markdownSections(text, slug, rewriteLink) };
  });
  return { schemaVersion: 1, files };
}
