import { slugify, type MarkdownSection } from '@rmp/model';
import { marked, Parser, type Token, type TokensList } from 'marked';

/** New href for a link, or null to drop the link and keep its text. */
export type LinkRewriter = (href: string) => string | null;

const UNLINK = 'rmp-unlink:';

function lex(md: string, rewriteLink?: LinkRewriter): TokensList {
  const tokens = marked.lexer(md);
  if (rewriteLink) {
    marked.walkTokens(tokens, (token) => {
      if (token.type === 'link') token.href = rewriteLink(token.href) ?? UNLINK;
    });
  }
  return tokens;
}

/** Drops the links a rewriter refused, keeping their text. */
const unlink = (html: string): string => html.replace(/<a href="rmp-unlink:[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '$1');

/** Renders block tokens; `links` keeps reference-style links working on a slice of the list. */
const render = (tokens: Token[], links: TokensList['links']): string =>
  unlink(marked.parser(Object.assign([...tokens], { links })));

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** The text of an HTML fragment, for search: tags dropped, entities decoded, blanks collapsed. */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e]!)
    .replace(/\s+/g, ' ')
    .trim();
}

export function markdownToHtml(md: string, rewriteLink?: LinkRewriter): string {
  const tokens = lex(md, rewriteLink);
  return render(tokens, tokens.links);
}

/**
 * A Markdown file cut at each heading. Ids are `<slug>-<heading slug>`, numbered when a heading
 * repeats; the text before the first heading, if any, is a level-0 section with the id `<slug>`.
 */
export function markdownSections(md: string, slug: string, rewriteLink?: LinkRewriter): MarkdownSection[] {
  const tokens = lex(md, rewriteLink);
  const sections: MarkdownSection[] = [];
  const used = new Map<string, number>();
  let heading: Extract<Token, { type: 'heading' }> | null = null;
  let body: Token[] = [];

  const flush = (): void => {
    const content = render(body, tokens.links);
    if (!heading) {
      if (body.some((t) => t.type !== 'space')) {
        sections.push({ id: slug, level: 0, heading: '', html: content, text: htmlToText(content) });
      }
      return;
    }
    const base = `${slug}-${slugify(heading.text) || 'section'}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    const inline = unlink(Parser.parseInline(heading.tokens));
    sections.push({
      id,
      level: heading.depth,
      heading: htmlToText(inline),
      html: `<h${heading.depth} id="${id}">${inline}</h${heading.depth}>\n${content}`,
      text: htmlToText(content),
    });
  };

  for (const token of tokens) {
    if (token.type === 'heading') {
      flush();
      heading = token as Extract<Token, { type: 'heading' }>;
      body = [];
    } else {
      body.push(token);
    }
  }
  flush();
  return sections;
}
