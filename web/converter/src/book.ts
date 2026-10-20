import { BookSchema, type Book, type VersionInfo } from '@rmp/model';
import { ConversionError } from './errors.js';
import { buildInlines, plainText } from './inlines.js';
import { checkFrontFile, LAYOUT_GRAMMAR, readBackFile } from './layout-files.js';
import { tokenize } from './lexer.js';
import { parse, type Grammar, type Node } from './parser.js';
import { buildParts } from './parts.js';
import { readRoot } from './root.js';
import type { SourceReader } from './source.js';
import { PART_GRAMMAR } from './vocabulary.js';

const ROOT_FILE = 'roman.tex';

async function parseFile(source: SourceReader, file: string, grammar: Grammar): Promise<Node[]> {
  return parse(tokenize(file, await source.readText(file)), grammar);
}

/** Converts the whole book, reading `roman.tex` and the files it includes through `source`. */
export async function convertBook(source: SourceReader, version: VersionInfo): Promise<Book> {
  const root = readRoot(await source.readText(ROOT_FILE), ROOT_FILE);

  for (const file of root.front) checkFrontFile(file, await parseFile(source, file, LAYOUT_GRAMMAR));

  const files: { file: string; nodes: Node[] }[] = [];
  for (const file of root.parts) files.push({ file, nodes: await parseFile(source, file, PART_GRAMMAR) });

  let characters: Book['characters'] | null = null;
  for (const file of root.back) {
    const found = readBackFile(file, await parseFile(source, file, LAYOUT_GRAMMAR));
    if (!found) continue;
    if (characters) throw new ConversionError(null, `more than one file lists the characters (${file})`);
    characters = found;
  }

  const text = (nodes: Node[]): string => plainText(buildInlines(nodes)).trim();
  const titleNodes = root.title ?? root.runningTitle;
  if (!titleNodes) throw new ConversionError({ file: ROOT_FILE, line: 1, column: 1 }, 'no \\titre in roman.tex');
  const title = text(titleNodes);

  return BookSchema.parse({
    schemaVersion: 1,
    meta: {
      title,
      author: root.author ? text(root.author) : null,
      runningTitle: root.runningTitle ? text(root.runningTitle) : title,
      version,
    },
    front: {
      epigraph: root.epigraph
        ? {
            text: buildInlines(root.epigraph.text),
            source: root.epigraph.source ? buildInlines(root.epigraph.source) : null,
          }
        : null,
      dedication: root.dedication ? buildInlines(root.dedication) : null,
    },
    parts: buildParts(files),
    characters: characters ?? { title: null, groups: [] },
  });
}
