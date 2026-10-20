# Reader Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On every push to `main`, publish the novel to GitHub Pages as a comfortable reader site with three reading modes and PDF downloads, together with an archive of every version for a future diff mode.

**Architecture:** A GitHub Actions workflow builds two PDFs (final and draft) with LuaLaTeX. A strict TypeScript converter turns the LaTeX sources into a semantic JSON book model, and an archiver runs that converter on every commit of `main`. A prerendered SvelteKit site then renders the head version. All web tooling lives in an npm workspace under `web/`.

**Tech Stack:** LuaLaTeX/latexmk (TeX Live), Node 24, TypeScript ^6, zod ^4, vitest ^5, Svelte ^5.57, @sveltejs/kit ^3.1, @sveltejs/adapter-static ^4, vite ^8, pdfjs-dist ^6, @fontsource/eb-garamond ^5, @playwright/test ^1.64, tsx ^4.

**Spec:** `docs/superpowers/specs/2026-10-20-reader-site-design.md` (approved mockups are in `docs/superpowers/specs/2026-10-20-reader-site-mockups/`). Read the spec before starting any task.

## Global Constraints

- **Language.** Code, comments, commit messages and technical docs are in English. The novel and `README.md` are in French. Existing French comments in `murderparty.sty`, `roman.tex` and `annexes/*.tex` stay in French, and new comments added to those files are in French too. New author-facing LaTeX macros use French names (`\titre`, `\auteur`, `\epigraphe`, `\dedicace`, `\letitre`, `\lauteur`, `\imprimerepigraphe`, `\imprimerdedicace`).
- **Site UI.** French by default, with English selectable. Book content is always marked `lang="fr"`.
- **Local LaTeX workflow unchanged.** Plain `latexmk` in the repository root must keep producing `build/roman.pdf`, with text identical (`pdftotext`) and page count identical to the baseline captured in Task 1.
- **No commented text is published.** Text after an unescaped `%` never reaches any JSON or HTML.
- **Unknown LaTeX is fatal.** An unknown command, environment, or layout-file text throws `ConversionError` with the message `<file>:<line>:<column>: <reason>`, and the build of `main`'s head fails. Nothing is deployed in that case, PDFs included.
- **A version is a commit** in `git log --first-parent` of the built ref (`HEAD`). Tags name versions. Tags on commits outside that history are ignored. The archive is regenerated at every build.
- **Published paths** (relative to the site base):
  - `data/versions.json`
  - `data/versions/<sha>.json`
  - `data/pagemaps.json`
  - `data/downloads.json`
  - `downloads/roman-final.pdf`
  - `downloads/roman-brouillon.pdf`
  - `ornaments/{partie,chapitre,scene,fin}.svg`
- **Base path.** It comes from the env var `BASE_PATH` (empty locally, `/RomanMurderParty` in CI). Every URL in the site goes through SvelteKit `base`.
- **No indexing.** Every page has `<meta name="robots" content="noindex, nofollow">`.
- **Preferences.** They live in `localStorage` under key `rmp.prefs.v1`, and resume data under `rmp.position.v1`. Every access is wrapped in try/catch, and the site works with storage unavailable.
- **No runtime third-party requests.** Fonts are self-hosted, with no Google Fonts and no CDN.
- **Fixed design values:**
  - colours from `murderparty.sty`: ink `#1E1B18`, sepia `#6B4A2B`, paper `#F7F1E3`, frame `#8C7457`, draft red `#A4262C`;
  - ornaments: partie = pgfornament 69, chapitre = 80, scene = 11, fin = 84;
  - font-size steps: `[16, 18, 20, 22, 25]` px, default index 1;
  - breakpoints: table of contents unfolded by default at ≥1024 px; mode switch moves into the Aa menu below 720 px; book-pages spread at ≥1024 px when the viewport is wider than tall.
- **Pinned GitHub Actions:** `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`. The TeX container is `texlive/texlive:latest`.
- **Branch and commits.** Work on branch `reader-site` and never commit to `main`. Commit messages use conventional prefixes (`feat(converter): …`) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Chapters that contain only working notes,** with notes hidden. All six placeholder parts are like this today. They must show the part page and chapter heading with no empty paragraph, and paged mode must show `1 / 1`, never 0 pages or a blank extra page. The tests live in Task 12 (`placeholder chapter renders cleanly`) and Task 14 (`placeholder chapter is one page`).
2. **Storage unavailable or stale.** This covers private browsing, blocked site data, and a stored JSON of an older or invalid shape. The site falls back to defaults and never throws. The tests are in Task 11 (`prefs survive a throwing storage`, `prefs ignore invalid stored data`).
3. **Resume after the text changed.** The saved chapter may have been removed or renumbered, the block id may be gone, or the saved SHA may be `working-tree`. The reader lands somewhere sensible and the cover label uses current titles. The tests are in Task 13 (`resolveResume` cases).
4. **Deep links and assets under the base path.** Loading `/RomanMurderParty/read/2/` directly, reloading it, and fetching every asset under `/RomanMurderParty/` (data, PDFs, ornaments, fonts, pdf.js worker) must work. The test is in Task 12 (`no request fails under the base path`).
5. **Paged mode after a resize or rotation.** The first visible block must stay visible. The test is in Task 14 (`resize keeps the reading position`).

---

## Before Task 1

- [ ] **Commit the pending planning docs on the branch.** The working tree holds these uncommitted changes from the design session: `CLAUDE.md`, a `README.md` edit (adding `\rep` and `\pensee`), `.gitignore` (`.superpowers`), the spec, the mockups and this plan.

```bash
git switch -c reader-site
git add CLAUDE.md README.md .gitignore docs/superpowers
git commit -m "docs: add CLAUDE.md, reader site design and implementation plan"
```

---

### Task 1: Dual-mode PDF build and page map

**Files:**
- Modify: `murderparty.sty`, which gets the mode override after `\ProcessOptions\relax` (line 15), a part counter and a page-map write in `\partie` (lines 103-119), and a page-map write in `\chapitre` (line 141)
- Create: `web/scripts/build-pdfs.sh`

**Interfaces:**
- Produces:
  - `web/scripts/build-pdfs.sh [OUT_DIR]` (default `build/web`) writes `OUT_DIR/final/roman.pdf`, `OUT_DIR/final/roman.mpmap`, `OUT_DIR/final/roman.log`, and the same three files under `OUT_DIR/brouillon/`.
  - Sidecar format, one entry per line, in document order: `part <ordinal> <page>` and `chapter <number> <page>`. Here `ordinal` counts `\partie` calls from 1, `number` is the continuous chapter number (arabic), and `page` is the 1-based physical page index in the PDF.

- [ ] **Step 1: Capture the baseline.** Run `latexmk` in the repository root. Then run `pdftotext build/roman.pdf /tmp/rmp-baseline.txt` and `pdfinfo build/roman.pdf | grep Pages` (expected: `Pages: 44`).

- [ ] **Step 2: Mode override in `murderparty.sty`.** If `\MPmode` is defined before the package loads, it overrides the package option: `final` gives `\mp@brouillonfalse` and `brouillon` gives `\mp@brouillontrue`. Any other value raises `\PackageError{murderparty}{\string\MPmode\space doit valoir final ou brouillon}{}`. Compare with `\ifx` against macros holding `final` and `brouillon`.

- [ ] **Step 3: Create `web/scripts/build-pdfs.sh`.** Use `set -euo pipefail` and `cd` to the repository root. For each mode in `final brouillon`, run:

```bash
latexmk -outdir="$OUT/$mode" -interaction=nonstopmode -halt-on-error \
  -usepretex="\\def\\MPmode{$mode}\\renewcommand{\\includeonly}[1]{}" roman.tex
```

The modes build into separate output directories because `\include` writes `parties/*.aux` under the output directory, and the two modes must not share them.

- [ ] **Step 4: Page-map sidecar.**
  - Open `\newwrite\mp@pagemap` with `\openout` to `\jobname.mpmap` at `\AtBeginDocument`.
  - Add `\newcounter{mppartie}`, stepped in `\partie`.
  - In `\partie`, after `\thispagestyle{empty}`, write `part <mppartie> <physical page>`.
  - In `\chapitre`, after `\chapter{#1}`, write `chapter <arabic chapter> <physical page>`.
  - The physical page must be the page that actually carries the heading. Use a deferred (non-`\immediate`) `\write` that expands memoir's `\thesheetsequence` at shipout, with the part or chapter number expanded at call time. If the numbers prove off by one, use `zref-abspage` instead. Step 6 decides.
  - The sidecar is written in both modes and in plain local builds. It must not change typesetting: a `\write` whatsit can add a break point, so put it in the same paragraph or box as the heading.

- [ ] **Step 5: Verify the local PDF is unchanged.** Run `latexmk`, then `pdftotext build/roman.pdf - | diff - /tmp/rmp-baseline.txt`. Expected: no output, and `Pages: 44`.

- [ ] **Step 6: Verify both modes and the page map.** Run `bash web/scripts/build-pdfs.sh`. Expected results:
  - `pdftotext build/web/final/roman.pdf - | grep -c 'à reprendre'` prints `0`.
  - The same command on the brouillon PDF prints `≥1`.
  - `grep 'passage(s) marques a reprendre' build/web/final/roman.log` matches.
  - `build/web/final/roman.mpmap` has 8 `part` lines (ordinals 1-8) and 9 `chapter` lines (1-9).
  - For `chapter 1 P`, `pdftotext -f P -l P build/web/final/roman.pdf -` contains `Valse`. For `chapter 2 P` it contains `Seule`.
  - For `part 1 P`, the page contains `Seraphina`. For `part 4 P` it contains `Reginald`.
  - The same holds for the brouillon map.

- [ ] **Step 7: Verify that `\includeonly` is neutralised.** Temporarily uncomment `\includeonly{parties/ouverture}` in `roman.tex` and run `bash web/scripts/build-pdfs.sh`. Expected: `pdftotext build/web/final/roman.pdf - | grep -c Reginald` prints `≥1`. Restore `roman.tex` with `git checkout roman.tex`.

- [ ] **Step 8: Commit.**

```bash
git add murderparty.sty web/scripts/build-pdfs.sh
git commit -m "feat(latex): build final and draft PDFs with a chapter page map"
```

### Task 2: Book-level macros for title, author, epigraph and dedication

**Files:**
- Modify: `murderparty.sty` (next to `\titrecourant`, lines 77-78), `roman.tex` (preamble), `annexes/liminaires.tex`, `README.md` (French: commands table)

**Interfaces:**
- Produces, as LaTeX macros the converter reads in Task 9:
  - setters: `\titre{T}`, `\auteur{A}`, `\epigraphe[source]{texte}`, `\dedicace{texte}`;
  - printers: `\letitre`, `\lauteur`, `\imprimerdedicace`, `\imprimerepigraphe`. The two `\imprimer…` commands print a full page only when their setter was called.
  - If `\titrecourant` is never called, the running title defaults to `\titre`.

- [ ] **Step 1: Implement the macros in `murderparty.sty`.**
  - `\imprimerepigraphe` reproduces the commented-out epigraph block in `liminaires.tex` exactly: empty page style, `\null\vfill`, a right-aligned `0.7\linewidth` italic minipage, and the source after `---`, then `\vfill\null\cleardoublepage`.
  - `\imprimerdedicace` prints a page with centred italic text, using the same vertical structure.

- [ ] **Step 2: Use the macros in `roman.tex` and `annexes/liminaires.tex`.**
  - In `roman.tex`, add `\titre{Titre provisoire}` and `\auteur{Antoine}`, plus the commented examples `% \dedicace{…}` and `% \epigraphe[Auteur]{Texte de l'épigraphe.}`, with a French comment.
  - In `liminaires.tex`:
    - replace both hard-coded `Titre provisoire` with `\letitre` and `Antoine` with `\lauteur`;
    - replace the commented epigraph block with `\imprimerdedicace` then `\imprimerepigraphe`;
    - keep the literal genre label `roman`.

- [ ] **Step 3: Verify the PDF is unchanged.** Run `latexmk && pdftotext build/roman.pdf - | diff - /tmp/rmp-baseline.txt`. Expected: no output, and `Pages: 44`.

- [ ] **Step 4: Verify the epigraph prints.** Temporarily uncomment the `\epigraphe` example and run `latexmk`. Expected: `pdftotext build/roman.pdf - | grep -c "Texte de l'épigraphe"` prints `1`. Restore with `git checkout roman.tex`.

- [ ] **Step 5: Document the macros in `README.md`, in French.** Add rows for `\titre`, `\auteur`, `\epigraphe[source]{texte}` and `\dedicace{texte}`, with the note that they are set in `roman.tex`.

- [ ] **Step 6: Commit.**

```bash
git add murderparty.sty roman.tex annexes/liminaires.tex README.md
git commit -m "feat(latex): single source for title, author, epigraph and dedication"
```

### Task 3: Web workspace and book model schema

**Files:**
- Create:
  - `web/package.json` (private; workspaces `model` and `converter`, with `site` added in Task 11; scripts below)
  - `web/.nvmrc` (`24`)
  - `web/tsconfig.base.json` (strict, `moduleResolution: "bundler"`, `target: "ES2023"`, `noUncheckedIndexedAccess: true`)
  - `web/vitest.config.ts` (projects: `model` and `converter`, with `site` added in Task 11)
  - `web/.gitignore` (`node_modules`, `site/.svelte-kit`, `site/build`, `site/static/data`, `site/static/downloads`, `site/static/figures`, `site/test-results`, `site/playwright-report`)
  - `web/model/package.json` (name `@rmp/model`, `"exports": {".": "./src/index.ts"}`)
  - `web/model/src/{index,book,versions,downloads,pagemap}.ts`
  - `web/model/test/model.test.ts`

**Interfaces:**
- Produces `@rmp/model`, which exports a zod schema and an inferred type for each name below. `XSchema` goes with type `X`.

```ts
SourceLocation = { file: string; line: number }               // 1-based line
Inline = { type: 'text'; text: string }
  | { type: 'emphasis' | 'smallCaps' | 'bold' | 'quote' | 'thought'; children: Inline[] }
  | { type: 'note'; kind: 'rework' | 'author'; children: Inline[] }
  | { type: 'dropCap'; letter: string; rest: Inline[] }
  | { type: 'lineBreak' }
Segment = { loc: SourceLocation; content: Inline[]; spaceAfter: boolean }
Block = { type: 'paragraph'; id: string; dialogue: boolean; segments: Segment[] }
  | { type: 'sceneBreak' | 'end'; id: string }
  | { type: 'letter'; id: string; place: Inline[] | null; salutation: Inline[]; body: Block[] }
  | { type: 'signature' | 'postscript'; id: string; content: Inline[] }
  | { type: 'telegram'; id: string; office: Inline[]; time: Inline[]; recipient: Inline[]; body: Block[] }
  | { type: 'clipping'; id: string; newspaper: Inline[]; headline: Inline[]; date: Inline[] | null; body: Block[] }
  | { type: 'diary'; id: string; heading: Inline[]; body: Block[] }
  | { type: 'card'; id: string; body: Block[] }
  | { type: 'image'; id: string; src: string; caption: Inline[]; fullPage: boolean; widthFraction: number | null }
  | { type: 'annexPage'; id: string; title: Inline[]; body: Block[] }
Chapter = { id: string; number: number; numeral: string; title: Inline[] | null; loc: SourceLocation; blocks: Block[] }
Part = { id: string; ordinal: number; label: string; narrator: string; epigraph: Inline[] | null;
         loc: SourceLocation; intro: Block[]; chapters: Chapter[] }
VersionInfo = { sha: string; date: string; subject: string; tags: string[] }   // date: ISO 8601
Book = { schemaVersion: 1;
         meta: { title: string; author: string | null; runningTitle: string; version: VersionInfo };
         front: { epigraph: { text: Inline[]; source: Inline[] | null } | null; dedication: Inline[] | null };
         parts: Part[];
         characters: { title: string | null; groups: { id: string; name: string | null;
           people: { id: string; name: string; details: string; description: Inline[] }[] }[] } }
VersionEntry = VersionInfo & { available: boolean; error: string | null; model: string | null }  // model: 'versions/<sha>.json'
VersionIndex = { schemaVersion: 1; latest: string; versions: VersionEntry[] }                    // newest first
PageMap = { parts: number[]; chapters: number[] }          // index = ordinal-1 / number-1, value = 1-based PDF page
PageMaps = { final: PageMap; brouillon: PageMap }
DownloadItem = { format: 'pdf'; variant: 'final' | 'brouillon'; url: string; bytes: number; filename: string }
Downloads = { schemaVersion: 1; items: DownloadItem[] }
```

- `BlockSchema` and `InlineSchema` are recursive (`z.lazy`) and discriminated on `type`.
- The package also exports `BLOCK_TYPES` and `INLINE_TYPES` as readonly arrays of the `type` literals. The site uses them to check that its renderers are exhaustive.
- Ids:
  - parts `p<ordinal>`; chapters `c<number>`;
  - chapter blocks `c<number>.b<i>`, nested `c3.b4.2`;
  - part intro blocks `p<ordinal>.b<i>`;
  - character groups `g<i>`, people `g<i>.<j>`;
  - all indices are 1-based.
- `web/package.json` scripts:
  - `test`: `vitest run`
  - `pdfs`: `bash scripts/build-pdfs.sh`
  - `data`: `tsx scripts/build-data.ts --repo .. --pdf-dir ../build/web --out site/static --working-tree`
  - `data:ci`: the same without `--working-tree`
  - `dev`: `npm run dev -w site`
  - `build`: `npm run build -w site`
  - `e2e`: `npm run e2e -w site`
  - `ci`: `npm test && npm run pdfs && npm run data:ci && npm run build && npm run e2e`

  The scripts referenced here are created in later tasks.

- [ ] **Step 1: Write failing tests in `web/model/test/model.test.ts`.**
  - `accepts a minimal valid book`: a fixture with one part, one chapter and one paragraph with one segment parses through `BookSchema.parse`.
  - `rejects an unknown block type`: `BlockSchema.safeParse({type:'video', id:'x'}).success === false`.
  - `parses nested blocks`: a `letter` whose body holds a `paragraph` and a `signature`.
  - `BLOCK_TYPES lists every block type`: `new Set(BLOCK_TYPES)` equals the set of literals from `BlockSchema`'s options.
  - `rejects a page map with a zero page`: `PageMapSchema.safeParse({parts:[0],chapters:[]}).success === false`.

- [ ] **Step 2:** Run `cd web && npm install && npx vitest run --project model`. Expected: FAIL (modules missing).

- [ ] **Step 3:** Implement the schemas listed above in `web/model/src/*.ts` and re-export them from `index.ts`.

- [ ] **Step 4:** Run `npx vitest run --project model`. Expected: PASS.

- [ ] **Step 5: Commit.** `git add web && git commit -m "feat(model): web workspace and book model schema"`

### Task 4: Conversion errors and source readers

**Files:**
- Create: `web/converter/package.json` (name `@rmp/converter`, depends on `@rmp/model`), `web/converter/src/errors.ts`, `web/converter/src/source.ts`, `web/converter/test/source.test.ts`, `web/converter/test/helpers/git-repo.ts`

**Interfaces:**
- Produces:

```ts
// errors.ts
export interface Loc { file: string; line: number; column: number }
export class ConversionError extends Error { constructor(readonly loc: Loc | null, readonly reason: string) }
//   message: loc ? `${file}:${line}:${column}: ${reason}` : reason
// source.ts
export interface SourceReader { readText(path: string): Promise<string> }   // repo-relative POSIX path
export class FsSource implements SourceReader { constructor(rootDir: string) }
export class GitSource implements SourceReader { constructor(repoDir: string, commit: string); close(): void }
export function texPath(ref: string): string   // 'parties/ouverture' → 'parties/ouverture.tex'; '.tex' kept
// test/helpers/git-repo.ts
export async function makeRepo(commits: { files: Record<string, string>; message: string; tag?: string }[]):
  Promise<{ dir: string; shas: string[] }>                               // temp repo, shas in commit order
```

- A missing file in either reader throws `ConversionError(null, 'file not found: <path>')`.
- `GitSource` reads blobs through one long-lived `git cat-file --batch` child process per instance. Do not spawn one `git show` per file: the archiver reads about 12 files per version for every commit.

- [ ] **Step 1: Write failing tests.**
  - `FsSource reads a file relative to the root`.
  - `FsSource throws ConversionError for a missing file`: `message === 'file not found: nope.tex'`.
  - `GitSource reads a file as it was at a given commit`: `makeRepo` with two commits changing `a.tex`, and reading at `shas[0]` returns the first content.
  - `GitSource throws ConversionError for a path absent at that commit`.
  - `texPath adds the extension only when missing`.
  - `ConversionError formats file:line:column`: `new ConversionError({file:'a.tex',line:3,column:7},'unknown command \\foo').message === 'a.tex:3:7: unknown command \\foo'`.
- [ ] **Step 2:** Run `npx vitest run --project converter`. Expected: FAIL.
- [ ] **Step 3:** Implement `errors.ts`, `source.ts` and the test helper.
- [ ] **Step 4:** Run `npx vitest run --project converter`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(converter): source readers for working tree and git commits"`

### Task 5: Lexer and grammar-driven parser

**Files:**
- Create: `web/converter/src/lexer.ts`, `web/converter/src/parser.ts`, `web/converter/test/lexer.test.ts`, `web/converter/test/parser.test.ts`

**Interfaces:**
- Consumes: `Loc`, `ConversionError` (Task 4).
- Produces:

```ts
// lexer.ts
export type Token =
  | { kind: 'command'; name: string; loc: Loc }      // name without '\'; '\\' → '\\'; '\%' → '%'; trailing '*' included ('vspace*')
  | { kind: 'text'; value: string; loc: Loc }
  | { kind: 'space'; loc: Loc }
  | { kind: 'newline'; space: boolean; loc: Loc }    // end of a non-blank line; space=false right after a control word
  | { kind: 'parbreak'; loc: Loc }                   // one or more blank lines
  | { kind: 'open' | 'close' | 'tilde'; loc: Loc }
export function tokenize(file: string, text: string): Token[]
// parser.ts
export type ArgSpec = 'm' | 'o'                      // mandatory {…} / optional […]
export interface Grammar { commands: Record<string, ArgSpec[]>; environments: Record<string, ArgSpec[]> }
export type Node =
  | { kind: 'text'; value: string; loc: Loc } | { kind: 'space'; loc: Loc }
  | { kind: 'newline'; space: boolean; loc: Loc } | { kind: 'parbreak'; loc: Loc } | { kind: 'tilde'; loc: Loc }
  | { kind: 'group'; children: Node[]; loc: Loc }
  | { kind: 'command'; name: string; args: (Node[] | null)[]; loc: Loc }   // null = optional arg absent
  | { kind: 'env'; name: string; args: (Node[] | null)[]; body: Node[]; loc: Loc }
export function parse(tokens: Token[], grammar: Grammar): Node[]
```

TeX rules the lexer applies:
- **Comments.** An unescaped `%` drops the rest of the line, its newline, and the next line's leading spaces. A line holding only a comment produces no token, and in particular no `parbreak`.
- **Spaces after commands.** Spaces after a control word (letters) are skipped. A single newline after a control word becomes `newline` with `space: false`.
- **Whitespace.** Leading spaces on a line are skipped, and runs of spaces collapse to one `space`.

Parser rules:
- Spaces and newlines before a mandatory argument are skipped. An optional argument is recognised when the next non-space token is text starting with `[`, and it ends at the matching `]` at brace depth 0.
- `\begin{x}` and `\end{x}` build `env` nodes.
- Each of the following throws `ConversionError` at the offending token: `unknown command \<name>`, `unknown environment <name>`, `unbalanced braces`, `\end{y} does not match \begin{x}`, and `missing \end{x}`.

- [ ] **Step 1: Write failing tests.**
  - `comment text never appears in tokens`: `tokenize('f', 'Avant % secret\nApres')` contains no token whose value includes `secret`.
  - `escaped percent is literal`: `'50 \\% de'` yields a command `%`.
  - `comment-only line does not break the paragraph`: `'a\n% x\nb'` contains no `parbreak`.
  - `blank lines produce one parbreak`.
  - `space after a control word is skipped`: `'\\ldots je'` yields `[command ldots, text je]`.
  - `newline after a control word has space=false`: `'monter\\ldots\nje'`.
  - `locations are 1-based line and column`.
  - `parses mandatory and optional args`: with grammar `{partie:['o','m','m']}`, `'\\partie[Epi]{Ouverture}{Seraphina}'` gives args `[[text Epi],[text Ouverture],[text Seraphina]]`; without `[…]` the first arg is `null`.
  - `parses environments with args`.
  - `unknown command throws with location`: `expect(() => parse(tokenize('p.tex','x\n\\foo'), g)).toThrow('p.tex:2:1: unknown command \\foo')`.
  - `mismatched end throws`, `unbalanced braces throws`.
- [ ] **Step 2:** Run `npx vitest run --project converter`. Expected: FAIL.
- [ ] **Step 3:** Implement `tokenize` and `parse`.
- [ ] **Step 4:** Run `npx vitest run --project converter`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(converter): TeX lexer and grammar-driven parser"`

### Task 6: French typography

**Files:**
- Create: `web/converter/src/typography.ts`, `web/converter/test/typography.test.ts`

**Interfaces:**
- Consumes: `Inline` from `@rmp/model`.
- Produces:

```ts
export function ligatures(text: string): string            // '---'→'—', '--'→'–', "'"→'’', '``'→'“', "''"→'”'
export function frenchSpacing(inlines: Inline[]): Inline[] // babel-french spacing across adjacent inline nodes
export const NNBSP = ' ', NBSP = ' '
```

These values come from `french.ldf` defaults:
- before `;`, `!` and `?`: `NNBSP` (`\FBthinspace`, half an interword space);
- before `:`: `NBSP`;
- after `«` and before `»`: `NBSP`.

Existing whitespace at those spots is replaced, and the space is inserted when the author typed none (AutoSpacePunctuation). The space goes only before the first mark of a run such as `?!`, and never at the very start of a segment. The rule applies across node boundaries: text `" ?"` after a `thought` node becomes `" ?"`, and text `"?"` right after a node gets `" ?"`.

- [ ] **Step 1: Write failing tests.**
  - `replaces the space before a question mark`: `'froid ?'` → `'froid ?'`.
  - `adds a missing space`: `'froid?'` → `'froid ?'`.
  - `colon gets a full no-break space`: `'dit :'` → `'dit :'`.
  - `only the first mark of a run`: `'Quoi ?!'` → `'Quoi ?!'`.
  - `guillemets typed directly`: `'« Les Perles »'` → `'« Les Perles »'`.
  - `spacing across nodes`: `[thought('Que le diable'), text(' ?')]` → the second node's text is `' ?'`.
  - `recurses into children`.
  - `ligatures`: `'a---b--c l\'air'` → `'a—b–c l’air'`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. It works on text nodes, looking at the last character of the previous node when needed.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(converter): babel-french typography"`

### Task 7: Prose builder for parts, chapters, paragraphs and segments

**Files:**
- Create: `web/converter/src/vocabulary.ts`, `web/converter/src/inlines.ts`, `web/converter/src/blocks.ts`, `web/converter/src/parts.ts`, `web/converter/test/parts.test.ts`

**Interfaces:**
- Consumes: `parse`, `Node`, `Grammar` (Task 5); `ligatures`, `frenchSpacing` (Task 6); model types (Task 3).
- Produces:

```ts
// vocabulary.ts
export const PART_GRAMMAR: Grammar          // full part-file vocabulary (this task + Task 8)
export const IGNORED_LAYOUT: ReadonlySet<string>
//   'clearpage','cleardoublepage','newpage','thispagestyle','bigskip','medskip','smallskip','vspace','vspace*','noindent'
// inlines.ts
export function buildInlines(nodes: Node[]): Inline[]   // applies ligatures + frenchSpacing; throws on block-level commands
export function plainText(inlines: Inline[]): string    // flattens to a string (for labels and names)
// blocks.ts
export interface BlockContext { idPrefix: string; allowLetterParts: boolean }
export function buildBlocks(nodes: Node[], ctx: BlockContext): Block[]
// parts.ts
export function buildParts(files: { file: string; nodes: Node[] }[]): Part[]
```

Mapping (inline):
- `\pensee{x}` → `thought`;
- `\areprendre{x}` → `note` with `kind:'rework'`, and `\noteauteur{x}` → `note` with `kind:'author'`;
- `\enquote{x}` → `quote`;
- `\emph{x}` and `\textit{x}` → `emphasis`; `\textsc` → `smallCaps`; `\textbf` → `bold`;
- `\debut{L}{rest}` → `dropCap{letter:'L', rest}`;
- `\ldots` → `…`; `\textemdash` → `—`; `\textendash` → `–`;
- `\nobreakspace` and `~` → NBSP; `\,` → NNBSP;
- `\%`, `\&`, `\#` and `\_` → literal characters; `\-` → U+00AD;
- `\\` → `lineBreak`;
- a bare `{…}` group → its children, inlined.

Mapping (blocks):
- A `parbreak` or `\par` ends a paragraph.
- `\rep` ends the current paragraph and starts one with `dialogue: true`.
- `\separation` → `sceneBreak`; `\fin` → `end`.
- `\chapitre{t}` starts a chapter: `numeral` = uppercase Roman, `title` = `null` for an empty argument.
- `\partie[e]{label}{narrator}` starts a part.
- Blocks before the first `\chapitre` of a part go to `part.intro`. Content before the first `\partie` of the book throws `content before \partie`.
- Commands in `IGNORED_LAYOUT` are dropped together with their arguments.
- Within a paragraph, each top-level `newline` closes a segment. Its `spaceAfter` is the newline's `space`, and the last segment's is `false`. A newline inside a command argument is a plain space.
- A segment's `loc` is the line of its first token.
- Empty segments and empty paragraphs are not emitted.

- [ ] **Step 1: Write failing tests** in `parts.test.ts`, using `buildParts([{file:'p.tex', nodes: parse(tokenize('p.tex', src), PART_GRAMMAR)}])`.
  - `one segment per source line`: three lines give 3 segments with `loc.line` 1, 2 and 3.
  - `rep starts a dialogue paragraph`: `'Texte.\n\\rep Sera, tu as froid ?\nJe te vois.'` gives two paragraphs; the second has `dialogue:true`, 2 segments, and first segment text `'Sera, tu as froid ?'`.
  - `ldots keeps TeX spacing`: `'monter\\ldots je crois.'` gives the text `'monter…je crois.'`, which matches the current PDF.
  - `notes become note inlines`: `\areprendre{Titre ?}` gives `{type:'note', kind:'rework', children:[{type:'text', text:'Titre ?'}]}`.
  - `chapters number continuously across parts`: two files, each with `\partie` and two `\chapitre`, give numbers 1 to 4, numerals `I` to `IV`, and ids `c1` to `c4`.
  - `empty chapter title is null`.
  - `part fields`: label, narrator, epigraph (`null` when absent), ordinal and id `p1`.
  - `blocks before the first chapter go to intro`.
  - `scene break and end`.
  - `dropCap from debut`.
  - `comments never reach the model`: a source containing `%chapitre flash back` gives `JSON.stringify(result)` without `flash back`.
  - `layout commands are ignored`: `\clearpage` and `\vspace{1cm}`.
  - `unknown command is fatal with location`.
  - `content before partie is fatal`.
  - `block ids are stable`: converting twice gives deep-equal results, and the ids are `c1.b1`, `c1.b2`, ….
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `vocabulary.ts`, `inlines.ts`, `blocks.ts` and `parts.ts` according to the mapping.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(converter): build parts, chapters, paragraphs and segments"`

### Task 8: Documents, images and annex pages

**Files:**
- Modify: `web/converter/src/vocabulary.ts`, `web/converter/src/blocks.ts`
- Create: `web/converter/test/documents.test.ts`

**Interfaces:**
- Consumes: `buildBlocks`, `BlockContext` (Task 7).
- Produces: the block types `letter`, `signature`, `postscript`, `telegram`, `clipping`, `diary`, `card`, `image` and `annexPage`, built from:
  - `lettre` (args `o m`): `place` from the optional argument, `salutation` from the mandatory one;
  - `\signature{m}` and `\postscriptum{m}`, allowed only when `ctx.allowLetterParts` is set (otherwise they throw `\signature outside lettre`);
  - `telegramme` (`m m m`): office, time and recipient; the body is the environment body;
  - `coupure` (`m m o`): newspaper, headline, date;
  - `journal` (`m`): heading;
  - `carton` (no args);
  - `\plan[o]{m}{m}` → `image` with `fullPage: false`, and `\planpleinepage[o]{m}{m}` → `fullPage: true`;
  - `\pageannexe{m}{m}`.

Nested bodies use `buildBlocks` with `idPrefix` `<parent id>.`, so ids look like `c1.b3.1`.

`widthFraction` parses `0.6\linewidth` or `0.6\textwidth` to `0.6`. Anything else, including absence, gives `null`. `\planpleinepage`'s optional argument is a key=value list that is ignored.

An image path must end in `.png`, `.jpg`, `.jpeg` or `.svg`. Otherwise the converter throws `image <path>: use a .png, .jpg or .svg file (the site cannot show other formats)`.

`\chapitre` and `\partie` inside a document throw.

- [ ] **Step 1: Write failing tests**, one per construct, using the syntax in the `murderparty.sty` comments.
  - `lettre with place, salutation, body, signature and postscript`: the body holds a paragraph, then `signature`, then `postscript`.
  - `telegramme fields and body`.
  - `coupure with and without date`.
  - `journal heading`.
  - `carton body`.
  - `plan width and caption`: `\plan[0.6\linewidth]{figures/plan.png}{Le salon}` gives `widthFraction 0.6`, `fullPage false`, and the caption text `Le salon`.
  - `planpleinepage is full page`.
  - `pdf image is rejected`.
  - `signature outside lettre is fatal`.
  - `chapitre inside a document is fatal`.
  - `nested block ids`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(converter): letters, telegrams, clippings, diaries, cards, images and annex pages"`

### Task 9: Whole-book conversion and CLI

**Files:**
- Create:
  - `web/converter/src/root.ts`, which reads `roman.tex`;
  - `web/converter/src/layout-files.ts`, which reads the front and back matter;
  - `web/converter/src/book.ts`;
  - `web/converter/src/cli.ts`;
  - `web/converter/test/root.test.ts`, `web/converter/test/book.test.ts`;
  - `web/converter/test/__snapshots__/` (generated)

**Interfaces:**
- Consumes: Tasks 4 to 8.
- Produces:

```ts
// root.ts
export interface RootInfo {
  title: Node[] | null; author: Node[] | null; runningTitle: Node[] | null;
  epigraph: { text: Node[]; source: Node[] | null } | null; dedication: Node[] | null;
  front: string[]; parts: string[]; back: string[];          // .tex paths in order
}
export function readRoot(text: string): RootInfo
// layout-files.ts
export const LAYOUT_LITERALS: readonly string[]            // ['roman', 'Les personnages']
export function checkFrontFile(file: string, nodes: Node[]): void
export function readBackFile(file: string, nodes: Node[]): Book['characters'] | null
// book.ts
export async function convertBook(source: SourceReader, version: VersionInfo): Promise<Book>  // result passes BookSchema.parse
// cli.ts  (run with tsx)
//   tsx src/cli.ts book --src <repoRoot> --out <file.json>   → converts the working tree, version sha 'working-tree'
```

`readRoot` grammar:
- Allowed: `documentclass(o m)`, `usepackage(o m)`, `newif` (the next control sequence is consumed), `titrecourant(m)`, `titre(m)`, `auteur(m)`, `epigraphe(o m)`, `dedicace(m)`, `includeonly(m)` (ignored), `document` env, `frontmatter`, `mainmatter`, `backmatter`, `input(m)`, `include(m)`, `cleardoublepage`, `clearpage`, `tableofcontents*`.
- `\demonstrationfalse` makes the reader skip everything between `\ifdemonstration` and `\fi`, in the preamble and in the body. `\demonstrationtrue` throws `demonstration mode is not supported by the web converter`.
- Files are assigned by section: in `\frontmatter` they go to `front`, in `\mainmatter` to `parts`, and in `\backmatter` to `back`.

Layout files:
- Allowed commands:
  - page and spacing: `thispagestyle`, `null`, `vfill`, `vspace`/`vspace*`, `cleardoublepage`, `clearpage`, `par`, `bigskip`, `medskip`, `smallskip`;
  - type size and shape: `Large`, `large`, `small`, `normalsize`, `fontsize(m m)`, `selectfont`, `itshape`, `scshape`, `upshape`, `centering`, `raggedleft`, `\\`;
  - the four `ornement*` commands;
  - the book-level printers `letitre`, `lauteur`, `imprimerdedicace`, `imprimerepigraphe`.
- Allowed environments: `center`, `flushright`, `minipage(m)`, plus `personnages(o)` with `groupe(m)` and `personnage(m m m)` in back files only.
- Any text node outside `personnages` whose trimmed value is not in `LAYOUT_LITERALS` throws `text in a layout file is not published on the site: "<text>"`.

Book assembly:
- `title` is `\titre`, falling back to `\titrecourant`, otherwise the converter throws `no \titre in roman.tex`.
- `runningTitle` is `\titrecourant`, falling back to the title.
- `author` is `null` when absent.

- [ ] **Step 1: Write failing tests.**
  - `readRoot finds files by section`: on the real `roman.tex` from Task 2, `parts` equals the 8 `parties/*.tex` paths in order, `front` is `['annexes/liminaires.tex']`, and `back` is `['annexes/personnages.tex']`.
  - `demonstration block is skipped`.
  - `demonstrationtrue is fatal`.
  - `front file rejects stray prose`: `checkFrontFile` throws on `'\\begin{center}Ma dédicace\\end{center}'`, and passes on the real `annexes/liminaires.tex`.
  - `characters from the real back file`: 2 groups, with the first group named `La maison Whitmore` and its first person named `Lady Margaret Whitmore` with details `48 ans`; the person `Theodore Bradshaw` has details `''`.
  - `convertBook on the repository`: `convertBook(new FsSource(<repo root>), v)` has 8 parts with narrators `Seraphina, Narrateur à choisir, Narrateur à choisir, Reginald, Narrateur à choisir, Narrateur à choisir, To Define, Vivienne`, chapter 1 titled `Valse (provisoire)`, chapter 2 titled `Seule`, title `Titre provisoire`, and author `Antoine`.
  - `repository snapshot`: `expect(book).toMatchSnapshot()` with a fixed `VersionInfo`.
  - `no comment text in the repository model`: the JSON contains none of `Opera, piece, valse, comedie`, `flash back`, or `En effet, la veuve semblait visiblement s'être mise en tête que Mary Fletcher`.
  - `epigraph and dedication reach front`: on a fixture root with both set.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `root.ts`, `layout-files.ts`, `book.ts` and `cli.ts`.
- [ ] **Step 4:** Run the tests, then `cd web/converter && npx tsx src/cli.ts book --src ../.. --out /tmp/book.json`. Expected: PASS, and the file is written.
- [ ] **Step 5: Commit.** Include the snapshot: `git commit -m "feat(converter): convert the whole book from roman.tex"`

### Task 10: Version archive, page maps and data assembly

**Files:**
- Create: `web/converter/src/archive.ts`, `web/converter/src/pagemap.ts`, `web/scripts/build-data.ts`, `web/converter/test/archive.test.ts`, `web/converter/test/pagemap.test.ts`, `web/converter/test/build-data.test.ts`

**Interfaces:**
- Consumes: `convertBook`, `GitSource`, `FsSource`, `makeRepo`, and the model schemas.
- Produces:

```ts
// archive.ts
export async function listVersions(repoDir: string, ref?: string): Promise<VersionInfo[]>  // ref default 'HEAD'; newest first
export async function buildArchive(repoDir: string, dataDir: string,
  opts?: { ref?: string; workingTree?: boolean }): Promise<VersionIndex>
// pagemap.ts
export function parsePageMap(text: string): PageMap
// build-data.ts CLI: tsx scripts/build-data.ts --repo <dir> --pdf-dir <dir> --out <siteStaticDir> [--working-tree]
```

`listVersions`:
- Use `git log --first-parent --format=%H%x1f%cI%x1f%s <ref>`.
- Map tags with `git for-each-ref refs/tags --format='%(objectname)%x1f%(*objectname)%x1f%(refname:short)'`. Annotated tags use the dereferenced object.

`buildArchive`:
- Writes `dataDir/versions.json` and `dataDir/versions/<sha>.json`.
- A failure on a non-head version records `available:false` with `error = err.message`, and the build continues.
- A head failure re-throws.
- With `workingTree: true`, the working tree is converted as version `{sha:'working-tree', subject:'Working tree', tags:[], date:<now>}`. It goes first, becomes `latest`, and re-throws on failure.

`parsePageMap`:
- Accepts lines matching `^(part|chapter) (\d+) (\d+)$`; any other non-empty line throws.
- Numbering must be contiguous from 1.

`build-data.ts` does the following, in order:
1. Run `buildArchive` into `<out>/data`.
2. Parse `<pdf-dir>/{final,brouillon}/roman.mpmap`. If either map has a part or chapter count different from the latest book, throw `page map and book disagree (PDF: n chapters, model: m)`. Then write `<out>/data/pagemaps.json`.
3. Copy the PDFs to `<out>/downloads/roman-final.pdf` and `roman-brouillon.pdf`.
4. Write `<out>/data/downloads.json`:
   - final: `filename` `${title}.pdf`;
   - brouillon: `filename` `${title} (brouillon).pdf`;
   - `url` relative to the site root, without a leading slash (`downloads/roman-final.pdf`);
   - `bytes` from `stat`.
5. Copy every `image.src` of the latest book from the repository to `<out>/<src>`.

Every JSON written is validated with its schema first.

- [ ] **Step 1: Write failing tests.**
  - `listVersions follows first parent and maps tags`: `makeRepo` with 3 commits and a tag `v0.1` on the second gives 3 versions, newest first, with `tags` `['v0.1']` on the middle one.
  - `tags outside the first-parent history are ignored`.
  - `buildArchive writes one model per version and an index`: `latest === shas[2]`, and `versions/<sha>.json` parses with `BookSchema`.
  - `a broken old version is recorded, not fatal`: the first commit uses `\foo`, so its entry has `available:false` and its `error` contains `unknown command \foo`.
  - `a broken head is fatal`.
  - `working tree becomes latest`.
  - `parsePageMap reads parts and chapters`.
  - `parsePageMap rejects gaps and garbage`.
  - `build-data fails when the page map disagrees with the book`: a temp repo, fake PDFs, and an mpmap with too few chapters.
  - `build-data writes downloads with sizes and filenames`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests, then `cd web && npm run pdfs && npm run data`. Expected: PASS, and `web/site/static/data/versions.json` lists this branch's commits plus `working-tree`.
- [ ] **Step 5: Commit.** `git commit -m "feat(converter): version archive, page maps and site data assembly"`

### Task 11: Site scaffold: data loading, preferences, themes, i18n

**Files:**
- Create:
  - `web/site/` app files: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`;
  - `src/app.html`, `src/app.d.ts`;
  - `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte` (a temporary title-only page, replaced in Task 13);
  - `src/lib/data/load.ts`, `src/lib/prefs/prefs.svelte.ts`, `src/lib/styles/themes.ts`, `src/lib/styles/global.css`;
  - `src/lib/i18n/{index,fr,en}.ts`;
  - unit tests next to each module (`*.test.ts`).

Also modify `web/package.json` and `web/vitest.config.ts` to add the `site` workspace and the `site` vitest project.

**Interfaces:**
- Consumes: `@rmp/model` schemas and types.
- Produces:

```ts
// load.ts — base passed in so it is testable without SvelteKit
export async function loadVersionIndex(fetch: typeof globalThis.fetch, base: string): Promise<VersionIndex>
export async function loadBook(fetch: typeof globalThis.fetch, base: string, sha: string): Promise<Book>
export async function loadPageMaps(fetch: typeof globalThis.fetch, base: string): Promise<PageMaps>
export async function loadDownloads(fetch: typeof globalThis.fetch, base: string): Promise<Downloads>
//   URLs: `${base}/data/versions.json`, `${base}/data/versions/${sha}.json`, …; every response validated with zod
// +layout.ts: export const prerender = true; export const trailingSlash = 'always';
//   load → { index: VersionIndex; book: Book; pageMaps: PageMaps; downloads: Downloads }
// prefs.svelte.ts
export type Mode = 'scroll' | 'paged' | 'book'
export type Theme = 'paper' | 'sepia' | 'dark'
export interface Prefs { fontStep: 0|1|2|3|4; theme: Theme | null; mode: Mode; notes: boolean; lang: 'fr'|'en'; tocOpen: boolean | null }
export const DEFAULT_PREFS: Prefs  // { fontStep:1, theme:null, mode:'scroll', notes:false, lang:'fr', tocOpen:null }
export const FONT_STEPS_PX: readonly number[] // [16, 18, 20, 22, 25]
export function readPrefs(storage: Pick<Storage,'getItem'> | null): Prefs
export function writePrefs(storage: Pick<Storage,'setItem'> | null, prefs: Prefs): void
export const prefs: Prefs                     // $state, initialised from localStorage in the browser, persisted on change
export function effectiveTheme(p: Prefs, prefersDark: boolean): Theme  // null → prefersDark ? 'dark' : 'paper'
// themes.ts
export interface ThemeTokens { bg: string; bgPanel: string; ink: string; accent: string; frame: string; note: string; docPaper: string }
export const THEMES: Record<Theme, ThemeTokens>   // paper uses the sty colours (Global Constraints)
// i18n
export type MessageKey = keyof typeof fr
export function t(lang: 'fr'|'en', key: MessageKey, params?: Record<string, string|number>): string
export function formatDate(lang: 'fr'|'en', iso: string): string   // fr: '20 octobre 2026'
```

Requirements:
- `svelte.config.js` uses `adapter-static`, `paths.base = process.env.BASE_PATH ?? ''`, and prerender entries `['*', '/characters/']`. Chapter pages are reached by crawling the table of contents links.
- `app.html`:
  - carries `lang="fr"` and the noindex meta;
  - holds an inline script that runs before paint, reads `rmp.prefs.v1` inside try/catch, and sets `data-theme` and `--font-size` on `<html>`, so the default theme never flashes first.
- Fonts come from `@fontsource/eb-garamond` (400, 400-italic, 500), imported in `+layout.svelte`.
- If the prerendered `+layout.ts` cannot read `static/data` through SvelteKit `fetch` during the build, switch to a `+layout.server.ts` that reads the files from disk, and keep the same returned shape.

- [ ] **Step 1: Write failing unit tests.**
  - `load.test.ts`:
    - `loadBook requests the versioned URL under base`: a stub fetch records `'/RomanMurderParty/data/versions/abc.json'`.
    - `loadBook rejects invalid data`.
  - `prefs.test.ts`:
    - `defaults when storage is empty`;
    - `round trip`;
    - `prefs survive a throwing storage`: `getItem` and `setItem` throw, so `readPrefs` returns `DEFAULT_PREFS` and `writePrefs` does not throw;
    - `prefs ignore invalid stored data`: `'{"fontStep":9,"mode":"x"}'` and `'not json'` both give the defaults for the invalid fields;
    - `effectiveTheme follows the system only when unset`.
  - `themes.test.ts`, with a WCAG contrast helper written in the test:
    - `ink on bg ≥ 4.5`;
    - `note on bg ≥ 4.5`;
    - `accent on bg ≥ 3`;
    - `ink on docPaper ≥ 4.5`;

    each for every theme.
  - `i18n.test.ts`:
    - `fr and en have the same keys`;
    - `interpolates params`: `t('fr','updatedOn',{date:'x'})`;
    - `formatDate fr`.
- [ ] **Step 2:** Run `cd web && npx vitest run --project site`. Expected: FAIL.
- [ ] **Step 3:** Implement the modules and the scaffold. Message keys are added as later tasks need them, always to both `fr.ts` and `en.ts`.
- [ ] **Step 4:** Run the unit tests, then `npm run data && BASE_PATH=/RomanMurderParty npm run build`. Expected:
  - tests PASS;
  - `web/site/build/index.html` contains `Titre provisoire` and `noindex`;
  - `web/site/build/data/versions.json` exists.
- [ ] **Step 5: Commit.** `git commit -m "feat(site): SvelteKit scaffold with data loading, preferences, themes and i18n"`

### Task 12: Rendering, scroll reader, table of contents and settings

**Files:**
- Create:
  - `web/scripts/ornaments/ornaments.tex`, `web/scripts/ornaments/build.sh`;
  - `web/site/static/ornaments/{partie,chapitre,scene,fin}.svg` (generated, committed);
  - `src/lib/render/registry.ts`, `Blocks.svelte`, `Inlines.svelte`, `blocks/*.svelte` (one per block type), `inlines/*.svelte` (one per inline type), `Ornament.svelte`, `PartTitle.svelte`, `FrontPage.svelte`, `ChapterHeading.svelte`, `visibility.ts`;
  - `src/lib/reader/{TopBar,Toc,SettingsMenu,ScrollView}.svelte`;
  - `src/routes/read/[n]/+page.ts`, `src/routes/read/[n]/+page.svelte`;
  - `web/site/playwright.config.ts`, `web/site/e2e/reader-scroll.spec.ts`;
  - unit tests `registry.test.ts`, `visibility.test.ts`.

**Interfaces:**
- Consumes: layout data (Task 11), `prefs`, `t`, `THEMES`, `BLOCK_TYPES`, `INLINE_TYPES`.
- Produces:

```ts
// registry.ts — the extension point for future features (diff marks = new entries)
export const blockRenderers: { [K in Block['type']]: Component<{ block: Extract<Block, { type: K }>; notes: boolean }> }
export const inlineRenderers: { [K in Inline['type']]: Component<{ node: Extract<Inline, { type: K }>; notes: boolean }> }
// visibility.ts
export function isBlockVisible(block: Block, notes: boolean): boolean   // false for a paragraph whose segments hold only notes when notes=false
export function chapterByNumber(book: Book, n: number): { part: Part; chapter: Chapter; isFirstOfPart: boolean } | null
// read/[n]/+page.ts → { n: number; part: Part; chapter: Chapter; isFirstOfPart: boolean }; error(404) when absent
```

- **Ornaments.** `ornaments.tex` is a `standalone` document with one page per ornament, numbers 69, 80, 11 and 84. `build.sh` runs `lualatex`, then `pdftocairo -svg -f N -l N`, and replaces the fill and stroke colours with `currentColor`.
- **Rendering**, following the mockups and §5 of the spec:
  - the em dash and NBSP prefix on dialogue paragraphs;
  - notes inline in red as `[<label> : …]`, using the `noteRework` and `noteAuthor` keys and shown only when `notes` is on;
  - quote → `« … »`, with nested quotes → `“…”`;
  - telegram body uppercased by CSS;
  - clipping in two columns at ≥720 px;
  - every block element carries `data-block-id={block.id}`;
  - book text wrapped in `lang="fr"`.
- **Part title** is shown at the top of a part's first chapter (`isFirstOfPart`). **Front page** (epigraph and dedication) is shown before it on chapter 1 when present.
- **Scroll view:**
  - the text column has `max-width: 34em`;
  - a progress bar;
  - previous and next chapter links;
  - the top bar hides on scroll down and shows on scroll up.
- **Table of contents:** parts as `label — narrator`, chapters as lowercase small-caps numeral and title, then a `Characters` link. The current chapter is highlighted. The `tocOpen: null` default is resolved by `matchMedia('(min-width: 1024px)')`.
- **Settings menu (Aa):** font size, theme, notes and language. The mode selector is added in Task 14.
- **Accessibility:** controls are real `<button>` or `<a>` elements with accessible names from i18n, menus close on Escape, and focus shows a `:focus-visible` outline in the accent colour.
- **Playwright:** the `webServer` runs `BASE_PATH=/RomanMurderParty npm run build && npm run preview`, and `baseURL` is `http://localhost:4173/RomanMurderParty/`.

- [ ] **Step 1: Write failing tests.**
  - Unit `registry covers every model type`: `Object.keys(blockRenderers).sort()` equals `[...BLOCK_TYPES].sort()`, and the same for inlines.
  - Unit `visibility`: a paragraph with only a note is hidden when notes are off and shown when they are on; a mixed paragraph is always visible.
  - e2e `reader-scroll.spec.ts`:
    - `chapter 1 renders`: on `read/1/`, the heading shows `Valse (provisoire)`, the text contains `Sera, tu as froid ?`, and the dialogue paragraph starts with `— `.
    - `notes are hidden by default and toggle on`: `[à reprendre` is absent at first; after the notes toggle in Aa, `[à reprendre : Titre ?]` is visible.
    - `part page and narrator`: `Ouverture` and `Seraphina` appear above chapter 1.
    - `placeholder chapter renders cleanly`: with notes off, `read/3/` shows `Première partie`, `Narrateur à choisir` and the chapter heading, and contains no `p` element inside the chapter body.
    - `comments are not published`: the page text of `read/1/` does not contain `Opera, piece`.
    - `toc unfolded on desktop, folded on phone`: at 1280×800 the TOC is visible, and at 390×844 it is hidden until ☰ is pressed.
    - `toc highlights and navigates`: clicking `Seule` goes to `read/2/`.
    - `next chapter link`.
    - `theme and font size persist after reload`.
    - `no request fails under the base path`: load `read/2/` directly and reload; no response with status ≥400, and the ornament SVGs and fonts load from `/RomanMurderParty/`.
- [ ] **Step 2:** Run `npx vitest run --project site && npm run e2e -w site`. Expected: FAIL.
- [ ] **Step 3:** Generate the ornaments, then implement the renderers, the views and the route.
- [ ] **Step 4:** Run the same commands. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(site): book renderers, scroll reader, table of contents and settings"`

### Task 13: Cover, characters page, downloads and resume reading

**Files:**
- Modify: `src/routes/+page.svelte` (cover), `src/lib/reader/ScrollView.svelte` (saves the position)
- Create: `src/routes/characters/+page.svelte`, `src/lib/reader/DownloadMenu.svelte`, `src/lib/position/position.ts`, `src/lib/position/position.test.ts`, `web/site/e2e/cover.spec.ts`

**Interfaces:**
- Consumes: layout data, `t`, `formatDate`.
- Produces:

```ts
export interface SavedPosition { chapter: number; blockId: string | null; chapterTitle: string | null; sha: string; savedAt: string }
export function readPosition(storage: Pick<Storage,'getItem'> | null): SavedPosition | null      // key 'rmp.position.v1'
export function writePosition(storage: Pick<Storage,'setItem'> | null, p: SavedPosition): void
export function resolveResume(book: Book, saved: SavedPosition | null): { chapter: number; blockId: string | null } | null
```

`resolveResume` rules:
1. If `saved` is `null`, return `null`.
2. If the saved chapter number exists and its plain title equals `chapterTitle`, return that chapter and `blockId`, with `blockId` set to `null` when that block no longer exists in it.
3. Otherwise, if exactly one chapter has that title, return it with `blockId: null`.
4. Otherwise, if the saved chapter number exists, return it with `blockId: null`.
5. Otherwise return chapter 1 with `blockId: null`.

Other requirements:
- **Position saving.** The scroll view saves the first block in view, debounced to 500 ms.
- **Cover page.** It follows the mockup in `apercu.html`:
  - `Resume reading`, only when `resolveResume` returns a value, with the label `<part label>, chapitre <numeral>, « <title> »`;
  - `Start`, which goes to `read/1/`;
  - `Characters`;
  - the PDF menu;
  - `Updated on <date>`, or `Local version` when `latest === 'working-tree'`.
- **Download menu.** It lists `downloads.items` with labels `downloadFinal` and `downloadDraft` and their sizes, and uses `<a href="{base}/{url}" download="{filename}">`. It appears both on the cover and in the top bar.
- **Characters page.** It renders `characters` by group and is linked from the TOC.

- [ ] **Step 1: Write failing tests.**
  - Unit `resolveResume`:
    - `null without a saved position`;
    - `exact match keeps the block`;
    - `missing block falls back to chapter start`;
    - `renumbered chapter is found by title`;
    - `unknown title and missing number fall back to chapter 1`;
    - `working-tree sha is accepted`;
    - `throwing storage reads as null`.
  - e2e `cover.spec.ts`:
    - `cover shows title, author and update date`;
    - `start opens chapter 1`;
    - `no resume button on first visit`;
    - `resume after reading chapter 2`: visit `read/2/`, scroll, go back to the cover; the button reads `Ouverture, chapitre II, « Seule »` and lands on `read/2/`;
    - `pdf menu lists both variants and links work`: both hrefs return 200 with `content-type` `application/pdf`;
    - `characters page groups people`: `Seraphina Blackwood` appears under `La maison Whitmore`;
    - `language switch`: after choosing EN in Aa, `Commencer` becomes `Start` and the book text is unchanged.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(site): cover, characters page, downloads and resume reading"`

### Task 14: Paged reading mode

**Files:**
- Create: `src/lib/paging/paging.ts`, `src/lib/paging/paging.test.ts`, `src/lib/reader/PagedView.svelte`, `web/site/e2e/reader-paged.spec.ts`
- Modify: `src/routes/read/[n]/+page.svelte` (switches view on `prefs.mode`), `TopBar.svelte` and `SettingsMenu.svelte` (mode selector; it sits in the top bar at ≥720 px and inside Aa below that)

**Interfaces:**
- Produces:

```ts
export function pageCount(scrollWidth: number, pageWidth: number, gap: number): number   // ≥ 1
export function pageOfOffset(offsetLeft: number, pageWidth: number, gap: number, count: number): number  // 0-based, clamped
```

Technique: CSS multi-column pagination.
- The chapter body sits in a container of viewport height minus the bar, with `column-width` equal to the container width, and moves with `translateX`.
- The part title and front page each get their own page (`break-after: column`).
- Navigation: ArrowLeft/ArrowRight, PageUp/PageDown, Space, a click on the outer 30 % edges, and a horizontal swipe of more than 50 px.
- Past the last page, go to `read/<n+1>/` page 1. Before the first page, go to `read/<n-1>/` on its last page, using the `?page=last` query read on mount.
- The indicator uses the key `pageIndicator`: `{page} / {count} · chapitre {numeral}`.
- After a resize, a font-size change or a notes toggle, record the first visible `data-block-id`, re-paginate, and go to the page containing it.
- The page turn uses a 200 ms slide that is disabled under `prefers-reduced-motion`.
- The position is saved with `writePosition` on each page turn.

- [ ] **Step 1: Write failing tests.**
  - Unit:
    - `pageCount is at least 1`: `pageCount(0, 600, 40) === 1`;
    - `pageCount on exact multiples`: `pageCount(1280, 600, 40) === 2`;
    - `pageOfOffset clamps`.
  - e2e `reader-paged.spec.ts`, after choosing `Liseuse` in the mode selector:
    - `indicator starts at page 1`: it matches `/^1 \/ \d+ · chapitre I$/`;
    - `arrow keys turn pages`;
    - `last page continues to next chapter`: the URL is `read/2/` and the indicator starts at `1 /`;
    - `going back from chapter 2 lands on chapter 1's last page`;
    - `placeholder chapter is one page`: on `read/3/` with notes off, the indicator is `1 / 1 · chapitre III`;
    - `font size change keeps the reading position`;
    - `resize keeps the reading position`: from 1280×800 to 800×1000, the block that was first visible is still within the viewport;
    - `mode survives reload`;
    - `reduced motion disables the slide`: under `page.emulateMedia({reducedMotion:'reduce'})`, the computed `transition-duration` is `0s`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(site): paged reading mode"`

### Task 15: Book pages mode (pdf.js)

**Files:**
- Create: `src/lib/pdf/spreads.ts`, `src/lib/pdf/spreads.test.ts`, `src/lib/pdf/pdf.ts`, `src/lib/reader/BookPagesView.svelte`, `web/site/e2e/reader-book.spec.ts`
- Modify: `src/routes/read/[n]/+page.svelte`, `Toc.svelte` (in book mode, a chapter entry jumps to `pageMaps[variant].chapters[n-1]`)

**Interfaces:**
- Consumes: `PageMaps`, `Downloads`, `prefs`, `writePosition`.
- Produces:

```ts
export function spreadFor(page: number, count: number, wide: boolean): number[]   // narrow → [page]; wide → [1] | [2k, 2k+1] (clamped to count)
export function nextSpreadStart(page: number, count: number, wide: boolean): number | null
export function prevSpreadStart(page: number, count: number, wide: boolean): number | null
export function chapterForPage(map: PageMap, page: number): number   // last chapter starting at or before page; 1 before the first
export async function loadPdf(url: string): Promise<import('pdfjs-dist').PDFDocumentProxy> // dynamic import; worker via '?url'
```

Requirements:
- **Lazy loading.** `pdfjs-dist` is imported only inside `loadPdf`, which `BookPagesView` calls on mount. It must not be in the initial bundle.
- **Which PDF.** Notes on gives the brouillon PDF and map, notes off gives the final ones. Toggling notes reloads the other PDF and stays on the same chapter.
- **Canvas rendering.** Pages render to canvases at `devicePixelRatio`, scaled to fit the viewport height.
- **Spread.** Wide (≥1024 px and landscape) shows two pages, narrow shows one.
- **Navigation** is the same as in paged mode. The indicator reads `Page {page} / {count}`.
- **URL and position.** When the chapter under the current page changes, update the URL with `replaceState` to `read/<chapter>/`, and save the position with `blockId: null`.

- [ ] **Step 1: Write failing tests.**
  - Unit:
    - `narrow shows one page`;
    - `wide: page 1 alone, then even-odd pairs`: `spreadFor(1,44,true)` is `[1]`, `spreadFor(3,44,true)` is `[2,3]`, and `spreadFor(44,44,true)` is `[44]`;
    - `next and prev spread starts at the ends are null`;
    - `chapterForPage`: with `{parts:[5], chapters:[7,12]}`, pages 3, 7, 11 and 12 give 1, 1, 1 and 2.
  - e2e `reader-book.spec.ts`:
    - `pdf.js is not loaded in scroll mode`: no request matching `/pdf\.worker/` while reading `read/1/` in scroll mode;
    - `book mode opens at the chapter's page`: on `read/2/`, switching to `Pages du livre` shows `Page <pageMaps.final.chapters[1]> /`;
    - `wide shows two canvases, phone shows one`;
    - `notes switch to the draft PDF`: a request to `downloads/roman-brouillon.pdf` is made, and the chapter is kept;
    - `turning pages updates the URL chapter`;
    - `toc jumps to a chapter page in book mode`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run, then `cd web && npm run ci`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(site): book pages mode with pdf.js"`

### Task 16: Publish workflow and documentation

**Files:**
- Create: `.github/workflows/publish.yml`
- Modify: `README.md` (French: a new section `## Site de lecture`), `CLAUDE.md` (English: the Build, Structure and site sections)

**Interfaces:**
- Consumes: `web/scripts/build-pdfs.sh` and the npm scripts from Task 3.

Workflow: `name: Publish`.
- **Triggers:**
  - `push` to `main`;
  - `push` of tags `'*'`;
  - `pull_request`;
  - `workflow_dispatch`.
- **Top-level permissions:** `contents: read`.
- **Concurrency:** `group: publish-${{ github.ref }}`, `cancel-in-progress: true`.

Jobs:
1. **`retrigger`.** Runs only `if: startsWith(github.ref, 'refs/tags/')`, with `permissions: actions: write`, and executes `gh workflow run publish.yml --ref main` with `GH_TOKEN: ${{ github.token }}`. This is how a tag push republishes `main`'s head, without changing the `github-pages` environment rules (spec §6).
2. **`pdf`.** Runs `if: ${{ !startsWith(github.ref, 'refs/tags/') }}` in `container: texlive/texlive:latest`.
   - Steps: checkout, then `bash web/scripts/build-pdfs.sh`.
   - It appends to `$GITHUB_STEP_SUMMARY` the line from `build/web/final/roman.log` that matches `passage(s) marques a reprendre`, or `Aucun passage à reprendre.` when there is none.
   - It uploads the artifact `pdfs` with `build/web/*/roman.pdf` and `build/web/*/roman.mpmap`.
3. **`site`.** Runs on `ubuntu-latest` and `needs: pdf`.
   - Checkout with `fetch-depth: 0` and `fetch-tags: true`, then setup-node with `node-version-file: web/.nvmrc` and the npm cache.
   - In `web/`: `npm ci`, `npm test`.
   - Download the `pdfs` artifact to `build/web`.
   - In `web/`: `npm run data:ci`, then `BASE_PATH=/${{ github.event.repository.name }} npm run build`.
   - `npx playwright install --with-deps chromium && npm run e2e`.
   - On `pull_request`, upload `web/site/build` as the artifact `site-preview`. Otherwise run `actions/upload-pages-artifact` with `path: web/site/build`.
4. **`deploy`.** `needs: site`, with `if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'`.
   - `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`.
   - `permissions: pages: write, id-token: write`.
   - Uses `actions/deploy-pages`.

- [ ] **Step 1: Write the workflow.**
- [ ] **Step 2: Lint it.** Run `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color`. Expected: no findings.
- [ ] **Step 3: Run the CI equivalent locally.** Run `cd web && npm run ci`. Expected: PASS.
- [ ] **Step 4: Update `README.md` in French.** Cover:
  - the site URL `https://darkbriks.github.io/RomanMurderParty/`;
  - that every push to `main` publishes;
  - how to name a version (`git tag -a v0.2 -m "…" && git push --tags`);
  - local preview (`cd web && npm install && npm run pdfs && npm run data && npm run dev`);
  - that an unknown LaTeX command blocks publication, with the error naming the file and the line, and must be taught to `web/converter/src/vocabulary.ts`;
  - the one-time Pages setting (Settings → Pages → Source: GitHub Actions).
- [ ] **Step 5: Update `CLAUDE.md` in English.** Cover:
  - the web workspace commands, including how to run a single test (`cd web && npx vitest run --project converter -t "<name>"`) and a single e2e spec (`npx playwright test e2e/<file> -c site/playwright.config.ts`);
  - the pipeline (PDFs and page map, converter, archive, site);
  - the rule that any new macro in `murderparty.sty` needs a converter entry and a renderer;
  - the fact that `\ldots` swallows the following space in both the PDF and the site.
- [ ] **Step 6: Commit.** `git add .github README.md CLAUDE.md && git commit -m "ci: publish the reader site to GitHub Pages"`
- [ ] **Step 7: Hand back to the author.** List these steps for them: merge the branch into `main`; enable Pages (Source: GitHub Actions); check that the first `Publish` run deploys; open the site URL.
