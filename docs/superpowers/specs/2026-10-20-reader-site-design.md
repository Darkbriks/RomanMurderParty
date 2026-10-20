# Reader site for the novel — design

Date: 2026-10-20
Status: draft, awaiting the author's approval (builder check done, open questions answered)

## Intent

The novel lives in this repository as LaTeX (`roman.tex`, `parties/*.tex`, `murderparty.sty`) and is compiled locally to an A5 PDF. The author wants every push to publish a readable version on GitHub Pages, so that they and a few relatives can read the current state of the book comfortably. The site should feel like reading a book, not like scrolling through a PDF. Readers must also be able to download the PDF.

The site must be built so that features can be added later. The one already in view is a **diff mode**, which compares the text with an earlier version. Its details are not decided yet and it is **not** part of this work. What this work must do is make sure the data and the code structure will not need to be rebuilt when that mode arrives.

## Readers and context

- For now the readers are the author, mostly on a desktop PC, and relatives giving feedback. One of them is the author's mother, who is less at ease with web-style scrolling. Nobody knows yet whether readers will use phones or computers, so both have to be first-class.
- Feedback is collected **outside** the site (messages, conversation). The site is read-only.
- The site is **public**. The repository `Darkbriks/RomanMurderParty` is public too, and GitHub Pages is not enabled yet. Search engines should be asked not to index the site.

## Goals

1. A GitHub Actions workflow that, on every push to `main`, compiles the LaTeX into two PDFs (final and draft), converts the LaTeX into a structured book model, builds a static reader site, and deploys it to GitHub Pages.
2. A reader site with:
   - a **cover page**;
   - **three reading modes** chosen by the reader:
     - *Scroll*: one chapter per page, read by scrolling;
     - *Paged*: the reflowable text cut into screen-sized pages, turned like in an e-reader;
     - *Book pages*: the actual A5 PDF pages;
   - a **collapsible table of contents**;
   - **reading settings**;
   - a **toggle for the author's working notes**;
   - a **characters page**;
   - **PDF downloads** in two variants.
3. An **archive of versions**: the book model of every version is published as data, so that a future diff mode can compare any two versions.
4. A code structure in which new features (diff mode, new download formats) can be added without reworking the existing ones.

## Non-goals (for this work)

- The diff mode itself: no diff algorithm, no comparison screen, no version picker.
- Comments, annotations, or any form of feedback on the site.
- Accounts, a password, or access control of any kind.
- Download formats other than PDF (EPUB and others may come later; see "Downloads").
- Reading older versions on the site, and PDFs of older versions.
- Analytics, offline mode or PWA, a custom domain.

## Anti-goals

The work is a failure if any of these happen, even when everything else works:

- **The site and the PDF disagree on the text.** A sentence, a reply or a note that appears in one but not the other, or appears differently. The converter must fail loudly rather than drop something it does not understand.
- **Text from `%` LaTeX comments reaches the site.** These comments hold the author's private plans and sentences that were set aside. They must never be published, in any mode.
- **The author has to change how they write.** The writing conventions stay those of `murderparty.sty` (`\rep`, `\pensee`, `\areprendre`, one sentence per line, etc.). The local workflow (`latexmk` in the repository root) must keep working, and the local PDF must look the same as today.
- **Reading is uncomfortable on a phone,** or the paged mode feels like a technical demo rather than a book.
- **A tag push or a stale run rolls the site back** to an older text.

## Decisions taken by the author

- **Reading formats:** both reflowable text and book pages. Within reflowable text, both *scroll* and *paged* modes are offered, because the author prefers scrolling and their mother would prefer turning pages.
- **Table of contents:** a side panel that can be shown or hidden, unfolded by default (see "Calls I made" for phones).
- **Working notes** (`\areprendre`, `\noteauteur`): hidden by default, and readers can show them with a toggle. Both PDF variants (final and draft) are downloadable.
- **Unfinished parts:** shown **as they are**, exactly like the PDF. Part pages with "Narrateur à choisir" or "To Define" and chapters that contain only notes are listed and readable.
- **Versions:** every publication is archived, and the author can **name** some versions with git tags. **A version is a commit on `main`.** Commits made before the site existed count too, and when several commits are pushed together, each of them is a version.
- **Unknown LaTeX blocks everything.** If the converter meets a command or environment it does not know, nothing is published, neither the PDFs nor the site. The site stays on the previous version, and the failure (file, line, command) shows in the failed workflow run, which GitHub notifies by e-mail.
- **Landing page:** a cover page with the title, the author, "Start" or "Resume reading", "Characters", the PDF download, and the date of the last update.
- **UI language:** French by default, with a selector for English. The novel's text is always in French.
- **Visual direction:** the one in the approved mockup. That means cream paper, sepia accents and EB Garamond, with the same sober ornaments as the PDF. The mockups are saved in [`2026-10-20-reader-site-mockups/`](2026-10-20-reader-site-mockups/):
  - `navigation.html` shows the three navigation options. The author chose **A (scroll) and B (paged), both offered**, together with **C's table of contents made collapsible**.
  - `apercu.html` shows the cover page and the reader on desktop and phone, and the author approved its direction.

  Both mockups fix **what each screen contains and where it sits**: the cover's buttons, what the top bar holds, the table of contents as a left panel, and what the Aa menu offers. They also fix the palette and typography. Sizes, spacing, icons and exact wording are not binding. The mockups load EB Garamond from Google Fonts for convenience only; the real site self-hosts it (§5).
- **Tools:** delegated to me. My choices are below and listed again in "Calls I made". These include the stack and the small additions to the LaTeX side.
- **Language rule:** code, comments, commit messages and technical documentation are in English. Only the novel and `README.md` are in French.

## Overview

```
                 ┌──────────────── GitHub Actions (push to main) ────────────────┐
 LaTeX sources ──┤ 1. latexmk ×2  → roman-final.pdf, roman-brouillon.pdf         │
 (main head)     │                  + page map (chapter → PDF page) for each     │
                 │ 2. converter   → book model JSON for main head                │
 git history  ───┤ 3. archiver    → book model JSON for every version + index    │
                 │ 4. site build  → static SvelteKit app                         │
                 │ 5. assemble    → app + data/ + downloads/ → Pages artifact    │
                 └──────────────────────────────── deploy-pages ─────────────────┘
```

The site is fully static. All book content reaches the browser as JSON produced at build time. The site never parses LaTeX.

## Components

### 1. PDF builds

- Two PDFs are built from the same sources: **final** (`[final]` mode, notes hidden) and **draft** (`[brouillon]` mode, notes shown in red). They are built under distinct job names, for example `latexmk -jobname=roman-final` and `-jobname=roman-brouillon`.
- **Mode override.** `roman.tex` hard-codes `\usepackage[brouillon]{murderparty}`. CI must be able to force either mode **without editing `roman.tex`**. Recommended: `murderparty.sty` honours a macro defined before the document is read (via `latexmk -usepretex='…'`, which latexmk 4.87 supports) and lets it override the package option. Building locally without that macro behaves exactly as today.
- **Always the full book.** If the author leaves `\includeonly{…}` uncommented in `roman.tex` and pushes, CI must still build the complete book. The same pretex mechanism can neutralise `\includeonly` before `roman.tex` calls it.
- **Page map.** For each PDF, the build must record the physical page index (1-based, counted from the first page of the PDF) of every part page and every chapter opening. This lets "Book pages" mode and the table of contents jump to the right page. Pagination differs between final and draft, so there is one map per PDF. Recommended: `murderparty.sty` writes these entries to a sidecar file next to the PDF, using memoir's `sheetsequence` counter in `\partie` and `\chapitre`. Writing that file must not change the PDF's appearance.
- The LaTeX toolchain in CI must provide everything `murderparty.sty` uses: LuaLaTeX, memoir, babel-french, csquotes, microtype, pgfornament, lettrine, tcolorbox, EB Garamond, and Latin Modern Mono.
- A LaTeX error fails the workflow and nothing is deployed. So does a converter error on `main`'s head (§2). Deployment requires both the PDF job and the site job to succeed. The count of passages marked "à reprendre" (the final-mode warning) is surfaced in the job summary.

### 2. LaTeX → book model converter

Choice: a **purpose-built converter in TypeScript** for the project's own restricted LaTeX dialect.

Why I rejected the alternatives:
- **pandoc** drops or mangles commands it does not know, so every custom macro would need re-implementing in filters anyway.
- **tex4ht / make4ht** runs real TeX, but it produces presentational HTML rather than the semantic model that the paged mode and the future diff need.
- **LaTeXML** needs a Perl binding for every custom macro and is heavy to run.

The vocabulary is small, belongs to the author, and lives in `murderparty.sty`, so a direct converter is the most predictable option. Writing it in TypeScript gives one toolchain shared with the site, and the book model types are written once.

Requirements:

- **Inputs.** The converter follows `roman.tex` to find the part files, in the order of the `\include`/`\input` lines, and reads `annexes/personnages.tex` for the characters. It reads files through a **source abstraction** that can be backed either by the working tree or by a git commit, so that the archiver can convert past versions without checking them out.
- **Front matter (`annexes/liminaires.tex`).** The site's cover page replaces the half-title and title pages, but no front-matter text may stay PDF-only.
  - **Book-level macros.** The title, author, an optional epigraph and an optional dedication come from macros in `murderparty.sty`: `\titre{…}`, `\auteur{…}`, `\epigraphe[source]{texte}` and `\dedicace{…}`. They are called in `roman.tex`, and `liminaires.tex` prints them, so the PDF output stays identical. The epigraph currently commented out in `liminaires.tex` becomes a commented-out `\epigraphe` call. If no `\titre` is given, `\titrecourant` continues to work as it does now.
  - **Strict reading of `liminaires.tex`.** The converter reads this file in strict mode with its own allowlist: layout commands, the macros above, and the fixed genre label `roman`. Any other text there fails the build, so front-matter prose cannot silently stay PDF-only.
  - **On the site,** a dedication or epigraph appears on its own page at the start of reading, after the cover and before the first part.
- **Comments.** Everything from an unescaped `%` to the end of the line is discarded before any other processing. `\%` is a literal percent sign. Commented text is not published, under any circumstances.
- **Supported vocabulary.** These are the semantic commands of `murderparty.sty`:
  - structure: `\partie[épigraphe]{label}{narrateur}`, `\chapitre{titre}`;
  - blocks: `\separation`, `\fin`, `\debut{L}{suite}`, `\rep`;
  - inline: `\pensee{…}`, `\areprendre{…}`, `\noteauteur{…}`;
  - documents: the environments `lettre` (with `\signature`, `\postscriptum`), `telegramme`, `coupure`, `journal` and `carton`;
  - characters: `personnages`, `\groupe`, `\personnage`;
  - images and annex pages: `\plan`, `\planpleinepage`, `\pageannexe`.

  The usual text-level LaTeX found in prose is also supported:
  - commands: `\enquote`, `\emph`, `\textit`, `\textsc`, `\textbf`, `\ldots`, `\textemdash`, `\textendash`, `\nobreakspace`;
  - characters and ligatures: `~`, `--` and `---` (which `Ligatures=TeX` turns into dashes), direct UTF-8 text, « » typed directly.

  Layout-only commands that may appear in part files are ignored, for example `\clearpage`, `\cleardoublepage`, `\thispagestyle{…}` and vertical spacing. Their list is explicit.
- **Strict by default.** Any other command or environment is a **hard error**. The error names the file, the line, and the command. This is what makes the "site and PDF disagree" anti-goal enforceable: when the author adds a macro to the style, the build tells them that the converter needs to learn it.
- **French typography.** The PDF relies on babel-french to add non-breaking spaces before `; : ! ?`, inside « », and so on. The source contains ordinary spaces there (`froid ?`). The converter must produce the same result with Unicode spaces (U+202F or U+00A0, matching babel-french's choices) so that the web text never breaks a line before a question mark.
- **Segmentation.** The author writes one sentence per source line. Each paragraph in the model is kept as an ordered list of **segments**, one per source line, and each segment carries its source location (file, line). The renderer joins segments with spaces. The future diff will compare segments, which is why they are kept now. Nothing should assume that a segment is exactly one grammatical sentence.
- **Output.** A JSON book model (§3). It is validated against its schema at build time.

### 3. Book model (data contract)

The book model is the contract between the build and the site, and later between two versions for the diff. Its shape, which the builder may refine:

- `schemaVersion`.
- `meta`: the title, author and running title, plus the version (commit SHA, commit date, subject, and tags).
- `body`: an ordered list of **parts**. Each part has a label (for example "Ouverture"), a narrator, an optional epigraph, and its ordinal. It also holds an ordered list of **chapters**. Each chapter has its continuous number (1, 2, 3… across the whole book), its numeral as printed (I, II, …), an optional title, and an ordered list of **blocks**.
- Block kinds:
  - `paragraph`: a list of segments, each a list of inline nodes. It also carries a `dialogue` flag (the paragraph was opened by `\rep`) and an optional drop cap, from `\debut`;
  - `sceneBreak`;
  - `end`, for `\fin`;
  - `letter`, `telegram`, `clipping`, `diary` and `card`, which hold their own fields and nested blocks;
  - `image`, holding the file, the caption, and whether it takes a full page;
  - `annexPage`.
- Inline kinds: `text`, `emphasis`, `smallCaps`, `bold`, `quote` (from `\enquote`), `thought` (from `\pensee`), and `note` (with `kind: rework | author`, from `\areprendre` and `\noteauteur`).
- `front`: the optional epigraph (text and source) and the optional dedication.
- `characters`: groups (from `\groupe`), each holding entries (name, details, description).
- **Stable ids** for parts, chapters and blocks, deterministic for a given source.

Constraints:
- The model is **semantic**. It holds no HTML and no presentational styling.
- Blocks and inline nodes are discriminated unions keyed by a `type` field. The site renders them through a **dispatch table keyed by type**, so that a future feature can add node kinds (diff insert and delete marks, for example) by adding entries rather than editing every renderer.

### 4. Version archive

- **A version is a commit in the first-parent history of `main`.** Each push publishes the head of `main`, and any commits in between are versions too. Tags pointing at those commits name them. Tags on commits that are not on `main` are ignored.
- **The archive is regenerated from git at every build.** The workflow checks out the full history, and the archiver runs the *current* converter over every version through the git-backed source abstraction. This has three consequences:
  - Nothing has to persist between deployments. GitHub Pages deployments from Actions replace the whole site, so keeping state there would need a separate branch or external storage.
  - The future diff always compares two models made by the same converter, so converter changes never appear as text changes.
  - The storage format can change at any time without a migration.
- A past version that fails to convert, for example because it used a macro the converter no longer accepts, is recorded in the index as unavailable with its error, and the build continues. The **head** must convert, or the build fails.
- Published data:
  - `data/versions.json`: the index, newest first. Each entry has the SHA, date, subject, tags, availability and model URL.
  - `data/versions/<sha>.json`: one book model per version. The site reads the head's model to render the book.
- Size: the text is small, and Pages serves it gzip-compressed. If the archive ever grows too large, models can be split per chapter and deduplicated by content hash. Because the archive is regenerated, that change needs no migration. It is not needed now.

### 5. Reader site

Stack: **SvelteKit with `adapter-static`** and TypeScript, fully prerendered, using the repository's Pages base path (`/RomanMurderParty/`). Every chapter gets a real URL that can be shared, for example "read chapter III". The book model is available at build time for prerendering and at runtime for archive data.

Routes (in English):
- `/`: the cover.
- `/read/<n>/`: chapter `n` (its continuous number).
- `/characters/`: the characters page.

The reading mode is a reader preference, not part of the URL.

**Cover page.** It shows the title, the author and an ornament, with these buttons:
- "Resume reading", shown only when a saved position exists and labelled with where the reader stopped;
- "Start";
- "Characters";
- "PDF", which opens a small menu offering the final and draft variants.

It also shows "Updated on <date of the head commit>".

**Top bar.** It holds:
- the table-of-contents toggle (☰);
- the book title on even pages or the current narrator (mirroring the PDF's running heads is optional);
- the reading mode switch (*Scroll*, *Paged*, *Book pages*);
- the settings menu (Aa);
- the download menu.

On narrow screens, the mode switch moves into the Aa menu. The bar retracts while the reader scrolls down and comes back when they scroll up or tap.

**Table of contents.** It is a side panel listing each part, as label and narrator, with its chapters as numeral and title, followed by "Characters". The current chapter is highlighted. The panel is unfolded by default on wide screens and folded by default on narrow ones, and its state is remembered. In *Book pages* mode, a chapter entry jumps to that chapter's PDF page using the page map.

**Mode: Scroll.**
- One chapter per page.
- A thin reading-progress bar.
- Previous and next chapter links at the end.
- The text column is limited to a comfortable reading width.

**Mode: Paged.**
- The chapter's reflowable text is cut into pages the size of the viewport.
- Two columns appear side by side when the screen is wide enough to make that comfortable. Whether to use two columns is left to the builder.
- Pages turn with the arrow keys, PageUp and PageDown, a click or tap on the left and right edges, and a swipe.
- A page indicator shows, for example, "3 / 11 · chapitre I".
- Turning past the last page goes to the next chapter.
- After a resize or font-size change, pages are recomputed and the first visible block stays visible.
- This mode must feel like a book. Its quality is a goal in itself.

**Mode: Book pages.**
- The PDF is shown with **pdf.js**, loaded only when this mode is first used.
- Wide screens show a two-page spread with odd pages on the right, like an open book. Narrow screens show a single page.
- The notes toggle chooses which PDF is shown, draft or final, each with its own page map.
- When the reader comes from another mode, the view opens at the current chapter's first page.

**Rendering.**
- EB Garamond is **self-hosted**, for example from `@fontsource/eb-garamond`, with no runtime calls to Google Fonts. Old-style figures and small caps are used as in the PDF.
- Ornaments are the **same `pgfornament` ornaments** as the PDF (numbers 69, 80, 11 and 84), converted to SVG and coloured with `currentColor` so that they follow the theme. Recommended: a script renders them with LaTeX and `dvisvgm` or `pdftocairo`, and the SVGs are committed.
- Dialogue paragraphs start with an em dash followed by a no-break space, as `\rep` does. Thoughts are in italics. The drop cap from `\debut` uses the sepia colour.
- Inserted documents echo their PDF styling:
  - `letter`: cream paper, a thin frame and italic text;
  - `telegram`: a "Post Office Telegraphs" header, a table of fields, and an uppercase monospace body;
  - `clipping`: a dashed frame, with two columns on wide screens and one on narrow screens;
  - `diary`: a left rule;
  - `card`: a narrow centred box.
- Working notes appear as in the draft PDF, inline in red, for example "[à reprendre : …]" or "[note : …]", with the label coming from the UI language. They are hidden unless the toggle is on.
- Part pages are rendered as a title page at the start of each part, with the label, an ornament, the narrator and the epigraph.

**Settings (Aa)**, remembered per browser in `localStorage`:
- font size, in a few steps;
- theme: *paper* (cream, the default), *sepia*, or *dark*. If the reader has never chosen and the system prefers dark mode, the dark theme is used;
- reading mode;
- working notes, on or off;
- UI language, FR or EN.

**Resume reading.** The last position is saved as the chapter number plus a block id, along with the chapter title and the version SHA. If the text has changed since then, resuming must degrade gracefully: it falls back to the chapter whose title matches, then to the start of the same-numbered chapter, and it never fails.

**Characters page.** It is rendered from `characters`, grouped as in `annexes/personnages.tex`.

**Downloads.**
- They are listed from a small **manifest** with entries of the form `{format, variant, url, size}`, so that adding EPUB later means adding entries.
- The PDFs are published at stable URLs, `downloads/roman-final.pdf` and `downloads/roman-brouillon.pdf`, with a `download` filename based on the book's title.

**Internationalisation.** All UI strings live in one module per language (`fr`, `en`), with French as the default and as the fallback. Dates are formatted for the UI language. Book content is marked `lang="fr"` in either case.

**No indexing.** Every page carries `<meta name="robots" content="noindex, nofollow">`. A `robots.txt` placed in a project site lives under `/RomanMurderParty/`, where search engines do not look, so the meta tag is the mechanism that actually works.

**Accessibility basics.**
- Semantic HTML.
- Full keyboard navigation, including turning pages.
- Visible focus.
- WCAG AA contrast in all three themes.
- `prefers-reduced-motion` respected for page-turn animations.

**Structure for future features.**
- Data access goes through one module (for example `loadBook(versionSha)` and `loadVersionIndex()`).
- Rendering components receive a book model and never fetch data themselves.
- Features live in their own route and component folders.

With this structure, a diff view can load two models and reuse the renderers, adding node types to the dispatch table.

### 6. Workflow (`.github/workflows/`)

- Triggers:
  - `push` to `main`;
  - `push` of any tag;
  - `pull_request`;
  - `workflow_dispatch`.
- **Always publish `main`'s head.** A tag push must rebuild and deploy **`main`'s head**, with the new tag now in the index, and never the tagged commit itself, since that could be older. Constraint: by default, the `github-pages` environment only lets the default branch deploy. A run started by a tag must therefore either deploy as a `main` run (for example by dispatching the workflow on `main`) or rely on a documented one-time environment setting. The builder picks one and documents it.
- Pull requests build everything (PDFs, model, site) and upload the result as a workflow artifact, so it can be previewed, but they never deploy.
- Recommended job split:
  - `pdf`: TeX Live, both PDFs plus the page maps, uploaded as an artifact;
  - `site`: Node, with converter tests, then the converter, the archiver and the site build;
  - `deploy`: `actions/upload-pages-artifact` and `actions/deploy-pages`.
- Permissions: the minimum needed (`contents: read`, `pages: write`, `id-token: write` on the deploy job). A concurrency group must make sure an older run can never deploy after a newer one.
- `fetch-depth: 0` and tags are fetched in the job that runs the archiver.

### 7. Repository layout

```
.github/workflows/publish.yml
web/                      npm workspace root (all web tooling, English only)
  package.json
  converter/              LaTeX → book model (src/, test/)
  site/                   SvelteKit app
  scripts/                archiver, ornament SVG generation, assembly
docs/superpowers/specs/   this document
```

The LaTeX files stay where they are. Changes to `murderparty.sty`, `roman.tex` and `annexes/liminaires.tex` are limited to the mode override, the page-map sidecar and the book-level macros (`\titre`, `\auteur`, `\epigraphe`, `\dedicace`). The author-facing macros follow the existing French naming.

### 8. Local development

- `latexmk` in the repository root works exactly as before.
- In `web/`, documented npm scripts cover four tasks:
  - running the converter tests;
  - converting the working tree to a model;
  - running the site in dev mode against the current working tree and the PDFs in `build/`;
  - doing a full local build equivalent to CI.
- `README.md` (in French) gains a short section about the site: its URL, how the publication works, how to name a version with a tag, and how to preview the site locally. `CLAUDE.md` (in English) is updated with the new architecture and commands.

### 9. Testing

- **Converter.** Unit tests (vitest) cover every supported command and environment with small fixtures, comment stripping, French spacing, segmentation and source locations, and the strict-mode error message (file and line).
- **Snapshot test.** The current repository sources are converted and compared to a snapshot.
- **Archiver.** It is tested against a small throwaway git repository built in the test.
- **Site.** A smoke test (Playwright) checks the cover page and a chapter in each of the three modes, the notes toggle, the download links and the language switch. Whether it runs in CI or only locally is left to the builder.

## One-time manual setup (by the author)

- In the GitHub repository, set Settings → Pages → Build and deployment → Source to **GitHub Actions**.
- Any environment setting required by the tag-push approach the builder chooses (§6).

## Calls I made (for the author to check)

1. **The archive is regenerated from git at every build,** instead of being stored somewhere between deployments. This follows from the author's choice that a version is a commit.
2. **A custom TypeScript converter.** The author chose that unknown commands block publication.
3. **SvelteKit (static) and TypeScript,** in an npm workspace under `web/`.
4. **Epigraph and dedication** become book-level macros. They are shown on a page of their own at the start of reading, and `liminaires.tex` is read strictly.
5. **pdf.js** for "Book pages" mode, with a two-page spread on wide screens and one page on phones.
6. **The table of contents is folded by default on phones,** where it would cover the text, and unfolded on desktop.
7. **Default theme:** *paper* (cream), switching to *dark* if the system prefers dark and the reader has never chosen.
8. **Small additions to the LaTeX side.** They are a mode override and `\includeonly` neutralisation for CI, a page-map sidecar, and the book-level macros, with the local PDF unchanged. The existing LaTeX files keep their French comments for consistency, and everything new outside them is in English.
9. **Self-hosted fonts** and **ornaments converted from `pgfornament`** to SVG.
10. **Indexing:** disabled with a meta tag. There is no password.
11. **Pull requests** build without deploying.

## Left to the builder

- The exact JSON schema and the id scheme, within the constraints in §3.
- How TeX Live is provisioned in CI (container image or setup action, caching).
- The tag-push deployment mechanism (§6).
- The pagination technique for *Paged* mode, and whether to show two columns on wide screens.
- Visual details within the approved direction: spacing, icons, animation, page-turn effect.
- Whether the Playwright smoke test runs in CI.
- The Node LTS version (pinned in `.nvmrc`) and the exact package versions.
