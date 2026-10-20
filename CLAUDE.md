# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A novel written in French, adapted from a murder party. It is typeset with LaTeX: the `memoir` class plus the local style `murderparty.sty`, on A5 two-sided pages, set in EB Garamond with Victorian ornaments (`pgfornament`). The story takes place in Belgravia, London, on 27 November 1890, during a reception at the Whitmores'. The repository holds the prose and layout, plus `web/`, an npm workspace that turns the book into a static reader site published on GitHub Pages (see "Reader site" below).

## Build

- `latexmk` builds `roman.tex` into `build/roman.pdf`. `latexmkrc` sets LuaLaTeX (`$pdf_mode = 4`; use 5 for XeLaTeX) and sets `build/` as the output directory. `build/` is gitignored.
- pdfLaTeX will not work: `murderparty.sty` stops with an error unless it runs under LuaLaTeX or XeLaTeX, because it uses `fontspec`.
- `latexmk -C` removes the build output.
- To build a single part quickly, uncomment `\includeonly{parties/...}` in `roman.tex`. This works only for files pulled in with `\include` (the parts). Annexes are pulled in with `\input`, so `\includeonly` does not affect them.
- Draft and final modes: `\usepackage[brouillon]{murderparty}` (the current setting) shows `\areprendre` and `\noteauteur` in red in the PDF. `[final]` hides them, prints one log warning for each `\areprendre`, and ends the build with the total count.
- Arch packages needed: `texlive-latexextra`, `texlive-fontsextra`, `texlive-langfrench`. On Overleaf, set the compiler to LuaLaTeX.

## Structure

- `roman.tex` sets the order of the book. The front matter comes from `annexes/liminaires.tex`. The main matter is `parties/*.tex` in this order: ouverture, partie1, partie2, intermede, partie3, partie4, conclusion, coda. The back matter is `annexes/personnages.tex` followed by the table of contents (`\tableofcontents*`).
- `murderparty.sty` holds all the layout: page geometry, colors (`mpencre`, `mpsepia`, …), headers, chapter style, ornaments, and the environments for inserted documents. The part files contain only text and the semantic commands below.
- Each part file opens with `\partie[épigraphe]{Label}{Narrateur}`. The narrator becomes the running head on odd pages, and `\titrecourant{}` from `roman.tex` is the running head on even pages. Several parts still use placeholder narrators ("Narrateur à choisir", "To Define").
- Chapters use `\chapitre{Titre}` or `\chapitre{}`. They are numbered in Roman numerals continuously across the whole book, without restarting at each part, because `\partie` is a custom command and not `\part`.
- `annexes/personnages.tex` is the dramatis personae: names, ages and roles, grouped with `\groupe{}`. Use it to check how character names are spelled.

## Writing conventions in the source

- One sentence per source line. The latest commit applied this to the chapter "Valse". Paragraphs are separated by blank lines.
- Dialogue: put `\rep` at the start of each new speaker's line. It inserts a new paragraph, an em dash and a non-breaking space, so do not type the dash yourself. If the same speaker's reply goes on over several sentences, put each sentence on its own line, with no further `\rep`.
- A character's unspoken thoughts go in `\pensee{...}` (italics, no dash).
- Quotation marks are `\enquote{...}` (csquotes adds French « » with the correct spacing). Ellipses are `\ldots`.
- Scene breaks are `\separation`. A chapter can open with a drop cap, written `\debut{B}{elgravia}`. `\fin` is the closing ornament.
- Inserted documents (letters, telegrams, newspaper clippings, diaries, cards) use the environments `lettre`, `telegramme`, `coupure`, `journal` and `carton`. Maps and images use `\plan` and `\planpleinepage`. Their syntax is listed in `README.md` and in the comments of `murderparty.sty`.
- The author's working notes come in three forms: `\areprendre{...}` (a passage to rework), `\noteauteur{...}`, and `%` comments in the part files (scene outlines for chapters still to write, and earlier versions of sentences that were set aside). Many `\areprendre` notes point to the murder party's character sheets ("fiche"), which are not in this repository.

## Reader site (`web/`)

- Workspace packages: `model` (shared types), `converter` (LaTeX to model), `site` (SvelteKit 3, static adapter). Node version in `web/.nvmrc`.
- Run from `web/`: `npm test` (vitest), `npm run pdfs` (both PDFs), `npm run data` (data from the working tree, so uncommitted edits show) or `npm run data:ci` (committed history only), `npm run dev`, `npm run build`, `npm run e2e`, and `npm run ci` for the whole chain.
- One unit test: `cd web && npx vitest run --project converter -t "<name>"`. One e2e spec: `cd web && npx playwright test e2e/<file> -c site/playwright.config.ts` (from `web/site`, drop `-c`). `npm run e2e` builds and previews with `BASE_PATH=/RomanMurderParty` itself.
- Pipeline: `web/scripts/build-pdfs.sh` builds `build/web/{final,brouillon}/roman.pdf` plus the page map `roman.mpmap`. The converter parses the `.tex` sources into the model. The archiver walks `git log --first-parent` and maps tags to versions, which needs the full history. The site renders the result into `web/site/static/data`.
- Any new macro or environment in `murderparty.sty` needs an entry in `web/converter/src/vocabulary.ts` and a renderer in the site. An unknown command fails the conversion with the file and line, and blocks publication.
- Publication: `.github/workflows/publish.yml` publishes `main` to GitHub Pages. Pull requests only upload a `site-preview` artifact. A tag push dispatches a run on `main`.
- Site specifics: SvelteKit 3 reads its config from `web/site/vite.config.ts` (no `svelte.config.js`); imports use `#lib/*`, not `$lib`; use `$app/env`.
- Testing rule: tests must not pin live novel text, which changes as the author writes. Exact assertions use the frozen fixture `web/converter/test/fixtures/book/`. The e2e specs derive their expectations from the built data in `web/site/static/data` and the `.tex` sources.
- `\ldots` swallows the following space in both the PDF and the site, so write `\ldots{} suite` if a space is wanted.

## Mismatches between the README and the repository

- `README.md` lists `figures/` and `exemples/demonstration.tex`, but neither exists. Setting `\demonstrationtrue` in `roman.tex` would therefore break the build.
