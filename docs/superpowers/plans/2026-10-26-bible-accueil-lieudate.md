# Bible sur le site, présentation, avertissement des notes, `\lieudate` : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rendre `bible/` lisible et fouillable sur le site derrière un avertissement anti-spoil, présenter le projet sur l'accueil, signaler que les notes de travail peuvent spoiler, et ajouter une commande `\lieudate` en tête de chapitre (PDF et site).

**Architecture:**
- **Côté construction.** `build-data` lit `bible/` (depuis `HEAD`, ou depuis l'arbre de travail avec `--working-tree`). Un module pur du convertisseur transforme les YAML et les Markdown en `data/bible.json`. `build-data` écrit aussi `data/site.json` (présentation, présence de la bible).
- **Côté site.** Une seule route `/bible/` pré-générée sans rendu serveur (`ssr = false`) affiche l'avertissement. Une fois l'accord donné, elle charge `bible.json` dans le navigateur et choisit la vue d'après les paramètres d'URL (`?vue=…`, `?perso=…`). Toute la logique (index des personnages, recherche, formes reconnues) vit dans des modules TypeScript purs, testés par vitest.
- **`\lieudate`.** Elle devient un nouveau bloc `dateline` du modèle, comme les autres commandes.

**Tech Stack:** LuaLaTeX et memoir (`murderparty.sty`) ; TypeScript, zod 4, vitest ; SvelteKit 3 avec Svelte 5 et adapter-static ; Playwright. Nouvelles dépendances du convertisseur : `yaml` (^2.9) et `marked` (^18).

**Spec:** `docs/superpowers/specs/2026-10-26-bible-accueil-lieudate-design.md`

## Global Constraints

- SvelteKit 3 :
  - la config est dans `web/site/vite.config.ts` (pas de `svelte.config.js`) ;
  - les imports internes passent par `#lib/*` ;
  - l'URL et la navigation passent par `$app/state`, `$app/paths` et `$app/navigation`.
- L'adaptateur statique est en `strict: true` : chaque route est pré-générée.
- Toute commande ajoutée à `murderparty.sty` et utilisée dans les parties a son entrée dans `web/converter/src/vocabulary.ts` et un rendu dans `web/site/src/lib/render/registry.ts`.
- Les tests ne figent pas le texte vivant du roman ni de la bible :
  - les assertions exactes portent sur des fixtures figées (`web/converter/test/fixtures/…`) ;
  - les e2e tirent leurs attentes de `web/site/static/data` et des sources.
- Pas de donnée de la bible dans le HTML pré-généré, dans les données de `load` sérialisées, ni dans le bundle JS. `bible.json` n'est récupéré par `fetch` qu'après l'accord.
- L'accord est stocké sous la clé `rmp.bible.v1` de `localStorage`, et chaque accès est entouré d'un try/catch.
- `npm run data` lit l'arbre de travail et `npm run data:ci` lit `HEAD`. La bible suit la même règle, sans historique de versions.
- Couleurs : uniquement les variables de thème (`--ink`, `--bg`, `--bg-panel`, `--accent`, `--frame`, `--rule`, `--note`, `--doc-paper`) et celles qu'ajoute ce plan, lisibles dans les trois thèmes.
- À 375 px de large, la page entière ne défile jamais horizontalement. Une grille large défile dans son propre cadre.
- Les chaînes d'interface vont dans `web/site/src/lib/i18n/fr.ts` et `en.ts`. Le contenu de la bible et la présentation restent en français, sous `lang="fr"`.
- Le dépôt contient des modifications d'Antoine indexées mais pas commitées (`bible/`, `docs/agents/`, `CLAUDE.md`, et `web/converter/test/fixtures/book/parties/ouverture.tex`, non indexé). Il ne faut ni les écraser ni les embarquer dans un commit. Chaque commit nomme ses chemins explicitement : `git commit -m "…" -- <chemins>`.
- Toutes les commandes `npm`/`npx` se lancent depuis `web/`.

## Review Focus

1. **Valeurs YAML de tous types** : nombres négatifs (`valence: -2`), booléens (`ambivalent: true`), dates non quotées (`verifie_le: 2026-10-10`), listes d'identifiants (`qui: [MON, REG]`), objets imbriqués dans des listes. La vue générique ne plante jamais et n'affiche jamais `[object Object]`. Test e2e dans la tâche 7.
2. **Lien profond avec ancre** (`/bible/?vue=relations#…`, résultat de recherche) vers un contenu qui n'existe qu'après le `fetch` : la page doit défiler jusqu'à l'ancre une fois le rendu fait. Test e2e dans la tâche 8.
3. **Stockage bloqué** (navigation privée stricte, `localStorage` qui lève une exception) : l'accord vaut pour la page en cours, sans erreur. Test unitaire dans la tâche 6.
4. **Téléphone (375 px)** sur la chronologie et la matrice des relations : la page entière ne défile pas horizontalement. Tests e2e dans les tâches 10 et 11.
5. **Identifiants inconnus** (`MAR` aujourd'hui, `suit:XYZ`) : ils s'affichent en texte brut. Dans la matrice et la chronologie, ils ont une ligne ou une colonne à eux, sans plantage. Tests unitaires dans les tâches 7, 10 et 11.

---

### Task 1: Le bloc `dateline` (modèle, convertisseur, rendu)

**Files:**
- Modify: `web/model/src/book.ts` (union `Block`, `BlockSchema`, `BLOCK_TYPES`)
- Modify: `web/model/test/model.test.ts`
- Modify: `web/converter/src/vocabulary.ts` (`blocks`)
- Modify: `web/converter/src/blocks.ts` (`COMMANDS`)
- Modify: `web/converter/test/documents.test.ts`
- Modify: `web/converter/test/fixtures/book/parties/partie1.tex` et `web/converter/test/__snapshots__/book.test.ts.snap`
- Create: `web/site/src/lib/render/blocks/Dateline.svelte`
- Modify: `web/site/src/lib/render/registry.ts`, `web/site/src/lib/render/visibility.ts`, `web/site/src/lib/render/visibility.test.ts`
- Modify: `web/site/e2e/book.ts` (`inlinesOf`, `visibleBlockIds`), `web/site/e2e/reader-scroll.spec.ts`

**Interfaces:**
- Produces: `Block` gagne `{ type: 'dateline'; id: string; place: Inline[]; date: Inline[] }`, et `BLOCK_TYPES` contient `'dateline'`.

- [ ] **Step 0: Préparer l'environnement**

Run: `cd web && npm ci && npm test`
Expected: tous les tests passent (état de départ).

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `documents.test.ts` (helpers `one`, `blocks` et `t` déjà définis) :

```ts
it('lieudate gives a dateline with place and date', () => {
  expect(one('\\lieudate{Belgravia, Londres}{27 novembre 1890}', 'dateline')).toEqual({
    type: 'dateline', id: 'c1.b1', place: t('Belgravia, Londres'), date: t('27 novembre 1890'),
  });
});
it('lieudate keeps a working note in its date', () => {
  const d = one('\\lieudate{Whitechapel, Londres}{1885 \\areprendre{Definir la date}}', 'dateline');
  expect(d.date.map((n) => n.type)).toEqual(['text', 'note']);
});
it('lieudate needs both arguments', () => {
  expect(() => blocks('\\lieudate{Londres}\n\nTexte.')).toThrow(ConversionError);
});
it('lieudate ends the paragraph before it', () => {
  expect(blocks('Avant.\n\\lieudate{L}{D}\nAprès.').map((b) => b.type)).toEqual(['paragraph', 'dateline', 'paragraph']);
});
```

Dans `model.test.ts` : `BlockSchema.parse({ type: 'dateline', id: 'c1.b1', place: [], date: [{ type: 'text', text: '1890' }] })` ne lève pas d'exception, et `BLOCK_TYPES` contient `'dateline'`.

Dans `visibility.test.ts` (`isBlockVisible`) :
- un `dateline` dont `place` et `date` ne contiennent que des notes est masqué quand les notes sont masquées, et affiché quand elles sont visibles ;
- un `dateline` avec du texte est toujours affiché.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project converter --project model --project site -t "lieudate|dateline"`
Expected: FAIL (`unknown command \lieudate`, `dateline` absent du schéma).

- [ ] **Step 3: Implémenter**

- `vocabulary.ts` : `lieudate: ['m', 'm']` dans `blocks`.
- `blocks.ts` : entrée `COMMANDS` qui émet `{ type: 'dateline', id, place: inlinesOf(n, 0), date: inlinesOf(n, 1) }`.
- `book.ts` : ajouter le type à l'union, au schéma et à `BLOCK_TYPES`.
- `visibility.ts` : un `dateline` est visible si `notes` est vrai ou si `hasVisibleContent(place) || hasVisibleContent(date)`.
- `Dateline.svelte`, sur le modèle de `Letter.svelte` (props `{ block, notes }`, `data-block-id`, classe `dateline`) :
  - centré ;
  - le lieu en petites capitales espacées (`font-variant-caps: all-small-caps; letter-spacing: 0.12em`), couleur `--accent` ;
  - un filet de 2,5 em (`border-top: 1px solid var(--accent)`) ;
  - la date en italique ;
  - une ligne n'est rendue que si elle a un contenu visible (avec les notes affichées, une note seule compte), et le filet seulement si les deux lignes le sont ;
  - `margin: -1.2rem 0 1.8rem`, pour se rapprocher du `ChapterHeading`.
- `registry.ts` : `dateline: Dateline`.

- [ ] **Step 4: Fixture, instantané et e2e**

- Ajouter `\lieudate{Londres}{27 novembre 1890}` sur la ligne qui suit `\chapitre{}` dans `fixtures/book/parties/partie1.tex`. **Ne pas toucher** à `fixtures/book/parties/ouverture.tex`.
- Mettre à jour l'instantané : `npx vitest run --project converter -u`. Le diff de `book.test.ts.snap` ne doit montrer que le nouveau bloc `dateline` et la renumérotation des ids de ce chapitre.
- Dans `e2e/book.ts` :
  - `inlinesOf` : un `case 'dateline'` qui produit `place` puis `date` ;
  - `visibleBlockIds` : la même règle que `isBlockVisible` pour `dateline`.
- Dans `reader-scroll.spec.ts`, ajouter le test `dateline shows place and date`. Il prend le premier bloc `dateline` d'un chapitre du livre construit (`test.skip` s'il n'y en a aucun), ouvre ce chapitre et vérifie que `[data-block-id="<id>"]` contient `normalize(plain(place))` et `normalize(plain(date))`.

- [ ] **Step 5: Vérifier**

Run: `npm test`
Expected: PASS, y compris `registry covers every model type`.

- [ ] **Step 6: Commit**

```bash
git add web/model web/converter/src web/converter/test/documents.test.ts web/converter/test/fixtures/book/parties/partie1.tex web/converter/test/__snapshots__ web/site/src/lib/render web/site/e2e
git commit -m "feat(site): dateline block for \\lieudate" -- web/model web/converter/src web/converter/test/documents.test.ts web/converter/test/fixtures/book/parties/partie1.tex web/converter/test/__snapshots__ web/site/src/lib/render web/site/e2e
```

---

### Task 2: `\lieudate` dans le livre, conversion des deux chapitres, documentation

**Files:**
- Modify: `murderparty.sty` (section « Chapitres »)
- Modify: `parties/ouverture.tex` (chapitres « Valse (provisoire) » et « Seule », rappels d'écriture)
- Modify: `README.md` (tableau des commandes), `CLAUDE.md` (« Writing conventions in the source »)

**Interfaces:**
- Consumes: le bloc `dateline` (tâche 1).

- [ ] **Step 1: Définir la commande**

Dans `murderparty.sty`, juste après `\chapitre`, ajouter `\NewDocumentCommand{\lieudate}{m m}{…}`, précédée d'un commentaire d'usage comme les autres (`%  \lieudate{Belgravia, Londres}{27 novembre 1890} : …`).

- **Le rendu :**
  - un groupe `\centering` ;
  - le lieu en `{\color{mpsepia}\mp@spaced{#1}}\par` ;
  - le filet en `{\color{mpsepia}\rule{1.2cm}{0.4pt}}\par`, avec environ `0.3\onelineskip` au-dessus et au-dessous ;
  - la date en `{\itshape #2}\par`.
- **Les arguments vides.** Un argument vide se teste avec `\ifblank` d'etoolbox (`\RequirePackage{etoolbox}` s'il n'est pas déjà chargé) et sa ligne est omise. Le filet n'est imprimé que si les deux arguments sont non vides.
- **L'espacement.** Remonter vers le titre avec `\vspace*{-0.8\onelineskip}` au début. Terminer par `\nopagebreak\vspace{1.2\onelineskip}\nopagebreak`. Ces valeurs sont un point de départ, à ajuster au step 4.

- [ ] **Step 2: Convertir les deux chapitres de `parties/ouverture.tex`**

Il s'agit d'un déplacement mécanique : aucun autre mot ne change.

- **« Valse (provisoire) »** :
  - insérer `\lieudate{Belgravia, Londres}{27 novembre 1890}` entre la ligne `% Touver un nom…` et le `\noteauteur{Réfléchir…}`, séparé par des lignes vides ;
  - supprimer la ligne `\debut{B}{elgravia}, Londres, 27 novembre 1890.` ;
  - remplacer le début de la ligne suivante, `Alors que les neuf coups`, par `\debut{A}{lors} que les neuf coups`.
- **« Seule »** :
  - insérer `\lieudate{Whitechapel, Londres}{188? \areprendre{Definir la date}}` entre `\chapitre{Seule}` et le `\noteauteur{Chapitre de flashback…}` ;
  - supprimer les lignes `\debut{W}{itechapel}, Londres, 188?.` et `\areprendre{Definir la date}` ;
  - remplacer le début de la ligne suivante, `Cela faisait`, par `\debut{C}{ela} faisait`.
- **Rappels d'écriture**, en tête du fichier : ajouter `%   \lieudate{lieu}{date}     lieu et date sous le titre d'un chapitre`.

- [ ] **Step 3: Documenter**

- `README.md` : une ligne dans le tableau des commandes, à côté de `\debut` : `` | `\lieudate{Belgravia, Londres}{27 novembre 1890}` | Lieu et date sous le titre du chapitre (deux lignes) | ``.
- `CLAUDE.md`, « Writing conventions in the source » : « A chapter can give its place and date with `\lieudate{place}{date}`, right after `\chapitre` (place in spaced small caps, a rule, the date in italics); the drop cap then goes on the first word of the text. »

- [ ] **Step 4: Vérifier le PDF**

Run (depuis la racine du dépôt) : `latexmk && pdftoppm -f 1 -l 12 -r 60 -png build/roman.pdf build/apercu`
Expected:
- la compilation réussit ;
- sur les PNG des pages de « Valse » et de « Seule » (à ouvrir avec Read), le lieu, le filet et la date sont centrés sous le titre, la lettrine est sur « Alors » et sur « Cela », et il n'y a pas de saut de page entre le bloc et le texte.

Ajuster les espacements du step 1 si besoin. Contrôler aussi le mode `[final]` : le `\areprendre` disparaît et la date reste « 188? ».

- [ ] **Step 5: Vérifier le site sur le vrai texte**

Run: `npm run pdfs && npm run data && npx playwright test e2e/reader-scroll.spec.ts -c site/playwright.config.ts -g dateline`
Expected: PASS (le test trouve désormais un `dateline` dans le livre).

- [ ] **Step 6: Commit**

Si `CLAUDE.md` porte encore des modifications non commitées d'Antoine, ne pas le committer ici : le signaler et le laisser pour la tâche 13.

```bash
git commit -m "feat(book): \\lieudate for a chapter's place and date" -- murderparty.sty parties/ouverture.tex README.md
```

---

### Task 3: Avertissement sur les notes de travail

**Files:**
- Modify: `web/site/src/lib/i18n/fr.ts`, `web/site/src/lib/i18n/en.ts`
- Modify: `web/site/src/lib/reader/SettingsMenu.svelte`, `web/site/src/lib/reader/DownloadMenu.svelte`
- Modify: `web/site/e2e/cover.spec.ts`

**Interfaces:**
- Produces: la clé i18n `notesHint`.

- [ ] **Step 1: Écrire le test e2e qui échoue**

Dans `cover.spec.ts` :

```ts
test('working notes warn about spoilers', async ({ page }) => {
  await gotoReady(page, '');
  await settingsButton(page).click();
  await expect(page.getByRole('switch', { name: 'Notes de travail' }))
    .toHaveAccessibleDescription('Peuvent révéler des éléments de l’intrigue.');
  await page.keyboard.press('Escape');
  await pdfButton(page).click();
  await expect(page.locator('#download-panel')).toContainText('Peuvent révéler des éléments de l’intrigue.');
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx playwright test e2e/cover.spec.ts -c site/playwright.config.ts -g "warn about spoilers"`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

- La clé `notesHint` : en français `'Peuvent révéler des éléments de l’intrigue.'`, en anglais `'May reveal plot points.'`.
- `SettingsMenu.svelte` :
  - sous la ligne des notes, un `<p class="hint" id="settings-notes-hint">` en petit corps (`0.85em`, couleur `--accent`) ;
  - `aria-describedby="settings-notes-hint"` sur le bouton `switch` ;
  - la ligne et son texte d'aide restent dans la même rangée (`.row` passe en `flex-wrap: wrap`, et le texte d'aide en `flex-basis: 100%`).
- `DownloadMenu.svelte` : pour `item.variant === 'brouillon'`, un `<small>` avec `notesHint` sous le libellé.

- [ ] **Step 4: Vérifier**

Run: `npm test && npx playwright test e2e/cover.spec.ts -c site/playwright.config.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): warn that working notes may spoil" -- web/site/src/lib/i18n web/site/src/lib/reader web/site/e2e/cover.spec.ts
```

---

### Task 4: Les données de la bible (`data/bible.json`)

**Files:**
- Create: `web/model/src/slug.ts`, `web/model/src/bible.ts`. Modify: `web/model/src/index.ts`, `web/model/test/model.test.ts`
- Create: `web/converter/src/markdown.ts`, `web/converter/src/bible.ts`. Modify: `web/converter/src/index.ts`, `web/converter/package.json` (dépendances `yaml`, `marked`)
- Create: `web/converter/test/markdown.test.ts`, `web/converter/test/bible.test.ts`, la fixture `web/converter/test/fixtures/bible/` (décrite au step 1), et `web/converter/test/helpers/bible-files.ts` (sur le modèle de `book-files.ts`)
- Modify: `web/scripts/build-data.ts`, `web/converter/test/build-data.test.ts`

**Interfaces:**
- Produces (`@rmp/model`) :
  - `slugify(text: string): string` : NFD, sans les diacritiques (`\p{M}`), en minuscules ; chaque suite de caractères hors `[a-z0-9]` devient `-` ; pas de `-` en tête ni en fin.
  - `type BibleValue = string | number | boolean | null | BibleValue[] | { [key: string]: BibleValue }`, et `BibleValueSchema` (`z.json()`).
  - `MarkdownSectionSchema` : `{ id: string; level: 0..6; heading: string; html: string; text: string }`.
  - `BibleFileSchema`, une union discriminée sur `kind` :
    - `{ kind: 'yaml'; path; slug; title; legend: string | null; data: BibleValue; pdfs: { name: string; url: string }[] }` ;
    - `{ kind: 'markdown'; path; slug; title; sections: MarkdownSection[] }`.
  - `BibleSchema` : `{ schemaVersion: 1; files: BibleFile[] }`.
  - Les types `Bible`, `BibleFile`, `BibleYamlFile`, `BibleMarkdownFile`, `MarkdownSection`.
- Produces (`@rmp/converter`) :
  - `markdownToHtml(md: string, rewriteLink?: (href: string) => string | null): string` ;
  - `markdownSections(md: string, slug: string, title: string, rewriteLink?: …): MarkdownSection[]` ;
  - `buildBible(sources: { path: string; text: string }[], pdfPaths: string[]): Bible` ;
  - `headerLegend(text: string): string | null` ;
  - `fileTitle(slug: string): string`.
- Produces (`web/scripts/build-data.ts`) :
  - `readRepoFile(repo: string, src: string, workingTree: boolean): Promise<Buffer | null>` ;
  - `listRepoFiles(repo: string, dir: string, workingTree: boolean): Promise<string[]>` ;
  - `selectBibleFiles(paths: string[]): { sources: string[]; pdfs: string[] }` ;
  - `buildData` renvoie en plus `bible: boolean`.

- [ ] **Step 1: La fixture figée `test/fixtures/bible/`**

De petits fichiers écrits pour les tests, jamais copiés de la vraie bible. Chacun commence par un commentaire d'en-tête de deux lignes, sauf `donnees/inconnu.yaml`.

| Fichier | Contenu |
| --- | --- |
| `donnees/personnages.yaml` | `personnages`: SER (`nom: Seraphina Blackwood`, `usuel: Seraphina, « Sera »`), WHI (`nom: Lady Margaret Whitmore`, `usuel: Lady Whitmore`), EVA (`nom: Evangeline Whitmore`, `usuel: Evangeline, « Eva »`), MON (`nom: Lady Monica Fairfax`, `usuel: Lady Fairfax, Monica`), REG (`nom: Lord Reginald Fairfax`, `usuel: Lord Fairfax, Reginald`), BLA (`nom: Sir Edmund Blackstone`, `usuel: Sir Edmund`), chacun avec un `secret` ; `absents_et_figurants`: DOM (`nom: Le domestique hypnotisé`) |
| `donnees/chronologie.yaml` | `phases` P0 et P1 (`titre`, `resume`) ; `groupes` (un groupe « La maison » : WHI, SER) ; `tous` (un événement en P1) ; `evenements`, dont un avec `qui: [MON, REG]`, un avec `phase: [P0, P1]`, un avec `qui: XYZ` (inconnu) ; `meteo: Neige.` |
| `donnees/relations.yaml` | 4 relations, dont SER→WHI (`valence: -2`, `ambivalent: true`), WHI→SER (`valence: 1`), SER→XYZ (`valence: 0`) |
| `donnees/vote.yaml` | `votes` : SER (`vote: detruire`), WHI (`vote: suit:SER`) |
| `donnees/inconnu.yaml` | sans en-tête : `verifie_le: 2026-10-10`, `liste: [a, b]`, `objets: [{ titre: X, detail: { sous: 1 } }]` |
| `lieu/maison.yaml` | un niveau, deux pièces (S1, S2) avec `rect` |
| `lieu/plans.pdf` | contenu `%PDF-test` |
| `bible.md` | un `# Titre`, un paragraphe d'introduction, un `## Section` avec un lien `[perso](donnees/personnages.yaml)`, un lien `[source](../parties/ouverture.tex)` et un lien `[web](https://example.com)` |
| `notes-de-scene.md` | `## Seraphina`, `## Lady Whitmore`, `## Evangeline`, `## Blackstone`, `## Monica et Reginald`, `## Personne`, chacune suivie d'une liste |
| `README.md` | doit être ignoré |

- [ ] **Step 2: Écrire les tests qui échouent**

`markdown.test.ts` :
- `slugify('Notes de scène — Été')` donne `'notes-de-scene-ete'`.
- `markdownSections('# A\n\nIntro\n\n## B é\n\nTexte', 'f', 'F')` :
  - ids `['f-a', 'f-b-e']`, niveaux `[1, 2]` ;
  - `sections[1].html` commence par `<h2 id="f-b-e">` ;
  - `sections[1].text === 'Texte'`.
- Le contenu placé avant le premier titre forme une section de niveau 0, d'id `'f'` et de titre `''`. Un fichier qui commence par un titre n'en a pas.
- Deux titres identiques reçoivent les ids `f-x` et `f-x-2`.
- `rewriteLink` qui renvoie `'?vue=p'` remplace le `href`. S'il renvoie `null`, le lien disparaît et seul son texte reste (`<a` est absent du HTML, le texte est présent).
- `markdownToHtml('<!-- TODO : x -->\nBonjour')` contient `Bonjour`.

`bible.test.ts`, sur la fixture (lue avec `bible-files.ts`) :
- **Sélection et ordre.** `buildBible` produit des fichiers triés par `path`, avec les slugs `['bible', 'chronologie', 'inconnu', 'personnages', 'relations', 'vote', 'maison', 'notes-de-scene']`. `README.md` est exclu par `selectBibleFiles`, testé à part : il garde `*.yaml`/`*.yml` à toute profondeur, les `*.md` directement sous `bible/` sauf `README.md`, et range les `*.pdf` à part.
- **Les titres.** `fileTitle('reperes-historiques')` donne `'Repères historiques'`, `fileTitle('notes-de-scene')` donne `'Notes de scène'` et `fileTitle('nouveau-fichier')` donne `'Nouveau fichier'`.
- **La légende.** `headerLegend` renvoie les lignes `#` de tête sans le `# `, jointes par `\n`, et `null` pour `inconnu.yaml`.
- **Les données.** `inconnu.yaml` garde `verifie_le` en chaîne `'2026-10-10'` (YAML 1.2, pas de `Date`).
- **Les PDF.** `maison.pdfs` vaut `[{ name: 'plans.pdf', url: 'downloads/bible/lieu/plans.pdf' }]` ; les fichiers de `donnees/` ont `pdfs: []`.
- **Les liens de `bible.md`.**
  - le lien vers `donnees/personnages.yaml` devient `href="?vue=personnages"` ;
  - le lien vers `../parties/ouverture.tex` n'est plus un lien ;
  - le lien `https://example.com` est conservé.
- **Les erreurs.** Un YAML invalide (`'a: [b\n'`) lève une `ConversionError` dont `loc.file` est le chemin et `loc.line` vaut 1 ou 2. Deux fichiers de même slug (`bible/a/x.yaml` et `bible/b/x.yaml`) lèvent une `ConversionError` qui nomme les deux chemins.
- **Le schéma.** Le résultat passe `BibleSchema.parse`.

`build-data.test.ts` :
- Un dépôt (`makeRepo`) avec `bookFiles()` et les fichiers de la fixture sous `bible/` produit un `data/bible.json` valide et un `downloads/bible/lieu/plans.pdf` qui vaut `%PDF-test`. `r.bible` vaut `true`.
- Sans `bible/`, il n'y a pas de `data/bible.json` et `r.bible` vaut `false`.
- En `workingTree: true`, un `bible/donnees/nouveau.yaml` écrit après le commit apparaît. En `workingTree: false`, il est absent.

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run --project converter --project model`
Expected: FAIL (modules absents).

- [ ] **Step 4: Implémenter**

- **Dépendances.** `cd web && npm install -w converter yaml@^2.9 marked@^18`.
- **`markdown.ts`** :
  - `marked.lexer(md)`, puis découpage des jetons de premier niveau à chaque jeton `heading`.
  - Chaque tranche se rend avec `marked.parser(Object.assign(slice, { links: tokens.links }))`, pour que les liens de référence marchent.
  - Le titre se rend à la main : `<h{depth} id="{id}">{marked.parseInline(token.text)}</h{depth}>`.
  - La réécriture des liens se fait dans `walkTokens` avant le rendu. Un lien à retirer reçoit `href = 'rmp-unlink:'`, et un remplacement final `/<a href="rmp-unlink:[^"]*"[^>]*>([\s\S]*?)<\/a>/g` → `$1` le supprime.
  - `text` est le HTML du contenu sans balises : entités `&amp; &lt; &gt; &quot; &#39;` décodées, blancs réduits.
- **`bible.ts`** :
  - Le slug est le nom de base sans extension.
  - YAML : `parseDocument(text)` de `yaml`. Si `doc.errors[0]` existe, lever `ConversionError({ file: path, line, column }, message)` à partir de `linePos[0]`. Les données viennent de `doc.toJS() ?? null`.
  - Les PDF d'un YAML sont les `pdfPaths` du même dossier, avec l'url `downloads/${pdfPath}`.
  - Markdown : `rewriteLink` résout le `href`, s'il n'est ni absolu ni une ancre, avec `path.posix.join(dirname(mdPath), href sans #)`. Si le chemin obtenu est une source connue, il renvoie `?vue=<slug>` suivi du `#…` d'origine ; sinon `null`.
  - `fileTitle` : une table pour les slugs connus (`personnages`, `chronologie`, `relations`, `intrigues`, `invitations`, `vote`, `reperes-historiques`, `maison`, `bible`, `notes-de-scene`), sinon `[-_]` devient une espace et la première lettre passe en majuscule.
- **`build-data.ts`** :
  - `readRepoFile` : `null` si le fichier manque (`ENOENT` sur disque, `git cat-file` en échec sur `HEAD`).
  - `copyRepoFile` s'appuie dessus et lève une erreur sur `null`.
  - `listRepoFiles` : `git ls-tree -r -z --name-only HEAD -- <dir>` d'un côté, readdir récursif sans fichiers cachés de l'autre. Il renvoie `[]` si le dossier manque.
  - `buildData`, après les téléchargements : liste `bible`, appelle `selectBibleFiles`, puis, s'il y a des sources, `buildBible`. Il écrit `data/bible.json` (`BibleSchema.parse`) et copie chaque PDF dans `out/downloads/<pdfPath>`.

- [ ] **Step 5: Vérifier**

Run: `npm test && npm run data && node -e "const b=require('./site/static/data/bible.json');console.log(b.files.map(f=>f.slug).join(' '))"`
Expected:
- les tests passent ;
- la commande affiche les slugs de la vraie bible, triés par chemin : `bible chronologie intrigues invitations personnages relations reperes-historiques vote maison notes-de-scene`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(data): build bible.json from bible/" -- web/model web/converter web/scripts web/package-lock.json
```

---

### Task 5: `site.json`, présentation et lien discret sur l'accueil

**Files:**
- Create: `web/model/src/site.ts`. Modify: `web/model/src/index.ts`
- Create: `presentation.md` (racine du dépôt)
- Modify: `web/scripts/build-data.ts`, `web/converter/test/build-data.test.ts`
- Modify: `web/site/src/lib/data/load.ts`, `web/site/src/lib/data/load.test.ts`
- Create: `web/site/src/routes/+page.ts`. Modify: `web/site/src/routes/+page.svelte`, `web/site/src/lib/i18n/fr.ts`, `en.ts`
- Create: `web/site/e2e/bible.ts` (helpers e2e). Modify: `web/site/e2e/cover.spec.ts`

**Interfaces:**
- Consumes: `markdownToHtml`, `readRepoFile`, `r.bible` (tâche 4).
- Produces:
  - `SiteInfoSchema` : `{ schemaVersion: 1; presentation: string | null; bible: boolean }`, et le type `SiteInfo` ;
  - `loadSiteInfo(fetch, base): Promise<SiteInfo>` ;
  - les clés i18n `bibleLink` ;
  - le helper e2e `siteInfo: SiteInfo`, et `bible: Bible | null`, lu dans `static/data/bible.json` s'il existe.

- [ ] **Step 1: Écrire les tests qui échouent**

- **`build-data.test.ts`.** Avec `presentation.md` (`'<!-- TODO -->\nUn roman.'`), `data/site.json` contient `bible: true` et une `presentation` qui contient `Un roman.`. Sans le fichier, `presentation` vaut `null`.
- **`load.test.ts`.** `loadSiteInfo` demande `${base}/data/site.json` et rejette un JSON invalide.
- **`cover.spec.ts`** :

```ts
test('cover presents the project and links to the bible discreetly', async ({ page }) => {
  await gotoReady(page, '');
  const presentation = page.locator('.presentation');
  if (siteInfo.presentation) await expect(presentation).toBeVisible();
  else await expect(presentation).toHaveCount(0);
  const link = page.getByRole('link', { name: 'Bible de l’auteur (révèle la solution)' });
  if (siteInfo.bible) await expect(link).toHaveAttribute('href', /\/bible\/$/);
  else await expect(link).toHaveCount(0);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project converter --project site -t "site.json|loadSiteInfo"`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

- **`build-data.ts`.** Il lit `presentation.md` avec `readRepoFile`, le rend avec `markdownToHtml`, puis écrit `data/site.json` en le validant par `SiteInfoSchema.parse`.
- **`routes/+page.ts`.** Un `load` qui renvoie `{ site: await loadSiteInfo(fetch, base) }`, avec le même calcul de `base` que `+layout.ts`.
- **`+page.svelte`** :
  - entre l'auteur et `.buttons`, `{#if data.site.presentation}<div class="presentation" lang="fr">{@html data.site.presentation}</div>{/if}`, avec `max-width: 30em`, un texte centré et une marge verticale modeste ;
  - après `.updated`, `{#if data.site.bible}<a class="bible-link" href="{resolve('/bible')}/">…</a>{/if}`, en `0.8em`, couleur `--accent`, sans bordure de bouton.
- **La clé `bibleLink`.** En français : `'Bible de l’auteur (révèle la solution)'`. En anglais : `"Author's bible (reveals the solution)"`.
- **`presentation.md`.** Texte provisoire, factuel, sans spoiler :

```markdown
<!-- TODO (Antoine) : remplacer ce texte provisoire par la vraie présentation du projet. -->
Un roman en cours d'écriture, adapté d'une murder party.

Londres, le 27 novembre 1890 : Lady Whitmore donne une réception dans sa maison de Belgravia pour l'anniversaire d'une chanteuse. Chaque partie suit la soirée par les yeux d'un invité différent.

Le texte est un premier jet : il change d'une mise à jour à l'autre.
```

- [ ] **Step 4: Vérifier**

Run: `npm test && npm run data && npx playwright test e2e/cover.spec.ts -c site/playwright.config.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): project presentation and bible link on the cover" -- presentation.md web/model web/scripts web/converter/test/build-data.test.ts web/site/src web/site/e2e
```

---

### Task 6: La route `/bible/`, l'avertissement et le chargement

**Files:**
- Create: `web/site/src/lib/bible/consent.ts` et `consent.test.ts`
- Modify: `web/site/src/lib/data/load.ts` et `load.test.ts` (`loadBible`)
- Create: `web/site/src/routes/bible/+page.ts`, `web/site/src/routes/bible/+page.svelte`, `web/site/src/lib/bible/BibleGate.svelte`
- Modify: `web/site/src/lib/i18n/fr.ts`, `en.ts`
- Create: `web/site/e2e/bible.spec.ts`

**Interfaces:**
- Produces:
  - `CONSENT_KEY = 'rmp.bible.v1'` ;
  - `readConsent(storage: Pick<Storage, 'getItem'> | null): boolean`, vrai si la valeur vaut `'1'` ;
  - `writeConsent(storage: Pick<Storage, 'setItem'> | null): void` ;
  - `clearConsent(storage: Pick<Storage, 'removeItem'> | null): void` ;
  - `loadBible(fetch, base): Promise<Bible | null>`, qui renvoie `null` sur un 404 et lève une erreur dans les autres cas ;
  - le composant de route, qui expose aux tâches suivantes `bible: Bible` et la vue choisie selon `page.url.searchParams` : `vue`, `perso`, ou rien pour l'accueil de la section.

- [ ] **Step 1: Écrire les tests qui échouent**

- **`consent.test.ts`** :
  - après `writeConsent`, `readConsent` renvoie `true` sur un stockage en mémoire ;
  - après `clearConsent`, il renvoie `false` ;
  - un stockage dont chaque méthode lève une exception donne `false` sans erreur, et `writeConsent`/`clearConsent` ne lèvent pas ;
  - `null` donne `false`.
- **`load.test.ts`.** `loadBible` demande `${base}/data/bible.json`, renvoie `null` sur un 404 et rejette sur un 500.
- **`bible.spec.ts`.** Si `bible` (helper de la tâche 5) vaut `null`, tous les tests sont sautés avec `test.skip`. Les secrets se calculent ainsi : tous les champs `secret` des listes du fichier de slug `personnages`.

```ts
test('the cover link leads to the warning, and the button waits for the checkbox', …)
// cover → lien bibleLink → URL /bible/ ; heading 'Bible de l’auteur' ;
// bouton 'Ouvrir la bible' désactivé ; case 'J’accepte d’être spoilé' cochée → bouton actif.
test('consent is remembered, and closing the bible forgets it', …)
// accepte → reloadReady → pas de case à cocher, 'Refermer la bible' visible ;
// clic → URL de l'accueil ; retour sur /bible/ → la case est revenue.
test('a deep link to a character goes through the warning', …)
// gotoReady('bible/?perso=<premier id>') → la case à cocher est visible.
test('no secret in the prerendered HTML', async ({ request }) => {
  for (const path of ['', 'bible/']) {
    const html = await (await request.get(path)).text();
    for (const s of secrets) expect(html).not.toContain(s);
  }
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project site -t "consent|loadBible" && npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

- **`routes/bible/+page.ts`.** `export const ssr = false;`. Il hérite de `prerender = true`, ce qui produit une coquille vide. Pas de `load` qui récupère la bible.
- **`+page.svelte`** :
  - **La barre.** Lien « ← Couverture » (`backToCover`), titre `bibleTitle`, bouton `bibleClose` quand l'accord est donné, et `SettingsMenu`. Même style que `.bar` dans `routes/characters/+page.svelte`.
  - **L'accord.** `accepted = $state(readConsent(storage))`, lu à l'initialisation puisque le rendu ne se fait que dans le navigateur.
  - **Sans accord.** La page affiche `<BibleGate onaccept={…} />`. Accepter appelle `writeConsent` et passe `accepted` à `true`, même si le stockage a échoué.
  - **Avec accord.** Le chargement passe par `loadBible`, dans un `$effect` déclenché par l'accord, pas dans `load`. Un `null` affiche `bibleUnavailable`, et l'attente affiche `loading`.
  - **Refermer.** Le bouton appelle `clearConsent`, puis `goto(resolve('/') )`.
- **`BibleGate.svelte`** :
  - un `<h1>` `bibleTitle`, le paragraphe `bibleWarning`, puis une case à cocher avec son `<label>` (`bibleAccept`) ;
  - un bouton `bibleOpen`, `disabled` tant que la case n'est pas cochée ;
  - mise en page centrée, sur une largeur d'environ 30 em.
- **Les clés i18n.**

| Clé | Français | Anglais |
| --- | --- | --- |
| `bibleTitle` | `Bible de l’auteur` | `Author's bible` |
| `bibleWarning` | `Cette section révèle la solution du roman : le coupable, la cible et la victime, ainsi que les secrets de chaque personnage.` | `This section reveals the solution of the novel: the culprit, the target and the victim, and every character's secrets.` |
| `bibleAccept` | `J’accepte d’être spoilé` | `I accept the spoilers` |
| `bibleOpen` | `Ouvrir la bible` | `Open the bible` |
| `bibleClose` | `Refermer la bible` | `Close the bible` |
| `bibleUnavailable` | `Cette version du site n’a pas de bible.` | `This version of the site has no bible.` |

- **Le référencement.** `app.html` porte déjà `<meta name="robots" content="noindex, nofollow">` pour tout le site. Le vérifier ; il n'y a rien à ajouter.

- [ ] **Step 4: Vérifier**

Run: `npm test && npx playwright test e2e/bible.spec.ts e2e/cover.spec.ts -c site/playwright.config.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): bible route behind a spoiler warning" -- web/site/src web/site/e2e
```

---

### Task 7: Index des personnages, vue générique, accueil de la section, Markdown

**Files:**
- Create: `web/site/src/lib/bible/catalog.ts` et `catalog.test.ts`
- Create, dans `web/site/src/lib/bible/` : `BibleHome.svelte`, `FileView.svelte`, `GenericView.svelte`, `ValueView.svelte`, `CharacterRef.svelte`, `MarkdownView.svelte`
- Modify: `web/site/src/routes/bible/+page.svelte`, `web/site/src/lib/i18n/fr.ts`, `en.ts`, `web/site/e2e/bible.spec.ts`

**Interfaces:**
- Consumes: `Bible`, `BibleYamlFile`, `BibleValue` et `slugify` (`@rmp/model`).
- Produces (`#lib/bible/catalog.ts`) :

```ts
export interface BibleCharacter { id: string; name: string; short: string; group: string; entry: Record<string, BibleValue> }
export interface CharacterIndex { list: BibleCharacter[]; byId: ReadonlyMap<string, BibleCharacter> }
export function characterIndex(bible: Bible): CharacterIndex;
export function shortName(entry: Record<string, BibleValue>): string;
export function refOf(value: BibleValue, index: CharacterIndex): { character: BibleCharacter; follows: boolean } | null;
export function humanizeKey(key: string): string;
export function entryTitle(obj: Record<string, BibleValue>, index: CharacterIndex): string | null;
export function anchorFor(slug: string, path: readonly (string | number)[], obj?: Record<string, BibleValue>): string;
export function isRecord(v: BibleValue): v is Record<string, BibleValue>;
export const STATUS_KEYS: ReadonlySet<string>; // statut, etat, triplet, source, vote, role_recit
export function orderedFiles(bible: Bible): BibleFile[];
export function fileBySlug(bible: Bible, slug: string): BibleFile | null;
```

Règles fixées :
- **`characterIndex`** lit le fichier de slug `personnages`. Chaque clé de premier niveau dont la valeur est une liste d'objets à `id` texte forme un groupe (`group = humanizeKey(key)`), dans l'ordre du fichier.
- **`shortName`** prend le premier segment de `usuel` (découpé sur `,` ou `;`), sans les parties entre « » et sans les blancs. À défaut, il prend `nom`, puis `id`.
- **`refOf`** reconnaît une chaîne égale à un id connu, ou `suit:<id connu>` (avec `follows: true`). Toute autre valeur, y compris un id inconnu, donne `null`.
- **`entryTitle`** prend la première clé présente parmi `titre`, `nom`, `sujet`, `qui`, `id`. Un id y est remplacé par `shortName`, et une liste d'ids est jointe par ` et `.
- **`anchorFor`** vaut `${slug}-${slugify(String(obj.id ?? obj.num))}` si l'objet a un `id` ou un `num` scalaire, sinon `${slug}-${path.map(p => slugify(String(p))).join('-')}`.
- **`humanizeKey`** passe d'abord par la table `LABELS` (au minimum `raison_cachee`, `role_recit`, `nom_de_naissance`, `au_coeur`, `soupconnent`, `lien_avec_marcus`, `verifie_le`, `consequence`, `resume`, `debut_reception`, `a_placer`, `a_verifier`, `libertes`, `hotesse`, `hotesse_raison_cachee`, `pourquoi_londres`, `evenements`, `meteo`, `lieux_fixes`, `verifies`, `etat`, `pieces`, `role`, `age`, `desc`, `invites`, `heures_absolues`, `absents_et_figurants`), avec les accents rétablis. Sinon, `_` devient une espace et la première lettre passe en majuscule.
- **`orderedFiles`** suit l'ordre `personnages, chronologie, relations, intrigues, invitations, vote, reperes-historiques, maison, bible, notes-de-scene`, puis les autres fichiers par titre.

- [ ] **Step 1: Écrire les tests qui échouent**

`catalog.test.ts`, sur une `Bible` construite en mémoire dans le test, avec les mêmes personnages que la fixture de la tâche 4 :
- `characterIndex(b).list.map((c) => c.id)` donne `['SER', 'WHI', 'EVA', 'MON', 'REG', 'BLA', 'DOM']`. Les groupes valent `'Personnages'`, puis `'Absents et figurants'` pour DOM.
- `shortName` donne `'Seraphina'` pour SER, `'Lady Whitmore'` pour WHI, `'Lady Fairfax'` pour MON et `'Le domestique hypnotisé'` pour DOM (sans `usuel`).
- `refOf('SER')` renvoie `{ character: SER, follows: false }` et `refOf('suit:WHI')` renvoie `follows: true`. `refOf('XYZ')`, `refOf('suit:XYZ')`, `refOf('Seraphina')` et `refOf(3)` renvoient `null`.
- `humanizeKey('raison_cachee')` donne `'Raison cachée'` ; `humanizeKey('cle_inedite')` donne `'Cle inedite'`.
- `entryTitle({ qui: ['MON', 'REG'], invitation: 'x' })` donne `'Lady Fairfax et Lord Fairfax'`, et `entryTitle({ detail: 1 })` donne `null`.
- `anchorFor('personnages', ['personnages', 0], { id: 'SER' })` donne `'personnages-ser'`. `anchorFor('maison', ['niveaux', 0, 'pieces', 2], { num: 'S3' })` donne `'maison-s3'`. `anchorFor('vote', ['votes', 4], { qui: 'SER' })` donne `'vote-votes-4'`.
- `orderedFiles` place `personnages` en premier et un fichier `zeta` inconnu après `notes-de-scene`.

`bible.spec.ts` :
- **L'accueil de la section.** Après l'accord, chaque personnage de `characterIndex(bible)` a un lien `?perso=<id>`, et chaque fichier un lien `?vue=<slug>`. Le calcul passe par `catalog.ts`, importé depuis `../src/lib/bible/catalog.ts`.
- **Toutes les vues.** Pour chaque fichier, `?vue=<slug>` affiche son titre en `h1`. Le texte de `main` ne contient jamais `[object Object]` (Review Focus 1). Pour un fichier YAML, chaque clé de premier niveau a un intitulé `humanizeKey(clé)`.
- **Les liens vers les personnages.** Dans la vue `vote`, s'il y a une entrée `qui: <id>`, un lien `?perso=<id>` porte `shortName`.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project site -t catalog`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

- **`ValueView.svelte`** `{ value, path, slug, index }`, récursif :
  - chaîne : `refOf` donne un `CharacterRef` ; une URL `^https?://` donne un `<a>` ; sinon c'est du texte ;
  - nombre : en texte ;
  - booléen : `bibleYes` ou `bibleNo` ;
  - `null` ou chaîne vide : rien ;
  - liste de valeurs simples : en ligne, séparées par `, ` ;
  - liste d'objets : une suite de `<article id={anchorFor(slug, path+[i], obj)} class="entry">`, chacune avec son titre (`entryTitle`) en `<h3>`, puis un `<dl>` des autres champs ;
  - objet : un `<dl>` imbriqué ;
  - les clés de `STATUS_KEYS` s'affichent en `<span class="badge">`.
- **`CharacterRef.svelte`** `{ character, follows }` : `<a href="?perso={id}">`, précédé de `bibleFollows` quand `follows` est vrai.
- **`GenericView.svelte`** `{ file, index, skip = [] }` :
  - en tête, `<details>` de légende (`bibleLegend`, texte en `white-space: pre-line`) si `file.legend` existe ;
  - les PDF (`file.pdfs`), en liens `{resolve('/')}{url}` ;
  - puis une `<section id={anchorFor(slug, [key])}>` par clé de premier niveau absente de `skip`, avec `<h2>{humanizeKey(key)}</h2>` et un `ValueView` ;
  - si `data` n'est pas un objet, un seul `ValueView`.
- **`MarkdownView.svelte`** `{ file }` : `{@html}` des `sections[].html`, avec la typographie de lecture (`max-width: 34em`).
- **`FileView.svelte`** `{ file, bible, index }` : un `<h1>{file.title}</h1>`, puis `MarkdownView` ou `GenericView`. Les tâches 10 à 12 y brancheront les vues dédiées.
- **`BibleHome.svelte`** `{ bible, index }` :
  - un emplacement pour la recherche (tâche 8) ;
  - les personnages par groupe (`<h2>` du groupe, liste de liens `shortName` suivis du `nom` en petit) ;
  - les fichiers de `orderedFiles` (`bibleFiles`).
- **`+page.svelte`** :
  - `index = $derived(characterIndex(bible))` ;
  - `?vue=` donne `FileView`, ou `bibleUnknownView` si le slug est inconnu ;
  - `?perso=` laisse provisoirement un emplacement (tâche 9) ;
  - sans paramètre, la page affiche `BibleHome` ;
  - un lien « Sommaire de la bible » (`bibleHome`, `href="./"`) apparaît en tête des vues.
- **Les clés i18n.**

| Clé | Français | Anglais |
| --- | --- | --- |
| `bibleYes` | `oui` | `yes` |
| `bibleNo` | `non` | `no` |
| `bibleFollows` | `suit` | `follows` |
| `bibleLegend` | `Légende` | `Key` |
| `bibleFiles` | `Fichiers` | `Files` |
| `bibleHome` | `Sommaire de la bible` | `Bible contents` |
| `bibleUnknownView` | `Cette page de la bible n’existe pas.` | `This bible page does not exist.` |

- [ ] **Step 4: Vérifier**

Run: `npm test && npm run data && npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts`
Expected: PASS. Contrôle visuel avec `npm run dev` : `/bible/?vue=reperes-historiques` et `/bible/?vue=intrigues`.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): generic bible views and character index" -- web/site/src web/site/e2e
```

---

### Task 8: La recherche

**Files:**
- Create: `web/site/src/lib/bible/search.ts` et `search.test.ts`, `web/site/src/lib/bible/BibleSearch.svelte`
- Modify: `BibleHome.svelte`, `web/site/src/routes/bible/+page.svelte` (défilement vers l'ancre), `fr.ts`, `en.ts`, `web/site/e2e/bible.spec.ts`

**Interfaces:**
- Consumes: `characterIndex`, `refOf`, `shortName`, `entryTitle`, `anchorFor`, `humanizeKey`, `isRecord` (tâche 7).
- Produces:

```ts
export interface SearchDoc { slug: string; fileTitle: string; anchor: string; title: string; text: string }
export interface SearchHit { doc: SearchDoc; before: string; match: string; after: string }
export function foldForSearch(s: string): { folded: string; map: number[] }; // map[i] = index dans s du caractère plié i
export function searchDocs(bible: Bible, index: CharacterIndex): SearchDoc[];
export function search(docs: SearchDoc[], query: string, limit?: number): SearchHit[]; // limit 50 par défaut
```

Règles fixées :
- **Le pliage.** `foldForSearch` passe chaque caractère en NFD, retire les `\p{M}`, met en minuscules et remplace `’` et `‘` par `'`.
- **Les documents YAML** :
  - chaque objet contenu dans une liste, à n'importe quelle profondeur, est un document ;
  - son texte rassemble ses chaînes, ses nombres et ceux de ses objets imbriqués, mais pas ceux des objets de ses listes d'objets, qui sont des documents à part ;
  - une valeur reconnue par `refOf` ajoute aussi `shortName` et `nom` ;
  - `anchor` vient de `anchorFor`, et `title` de `entryTitle`, à défaut `humanizeKey(clé parente)` ;
  - une clé de premier niveau qui n'est pas une liste d'objets forme un document (`anchor = anchorFor(slug, [key])`, `title = humanizeKey(key)`).
- **Les documents Markdown.** Chaque section en est un (`anchor = section.id`, `title = section.heading || file.title`, `text = section.text`).
- **La recherche.** Une requête pliée et réduite aux blancs, de moins de 2 caractères, ne donne aucun résultat. Sinon, la recherche porte sur la sous-chaîne dans `title + ' — ' + text`, dans l'ordre des documents. L'extrait garde au plus 40 caractères d'origine de chaque côté de la correspondance, coupés sur un blanc, avec `…` aux coupures.

- [ ] **Step 1: Écrire les tests qui échouent**

`search.test.ts`, sur la même `Bible` en mémoire que `catalog.test.ts`, complétée d'un événement `{ qui: 'BLA', quoi: 'Arrive en fiacre à l’heure.' }` et d'une section Markdown :
- `search(docs, 'FIACRE')` et `search(docs, "a l'heure")` trouvent l'événement : la casse, les accents et les apostrophes typographiques sont ignorés.
- `search(docs, 'Blackstone')` trouve l'événement de BLA, par l'expansion du nom.
- `search(docs, 'x')` donne `[]`.
- Pour une correspondance dans `'Lady Évangéline'`, `hit.match === 'Évangéline'` (le texte d'origine, avec ses accents).
- Le `doc.anchor` d'un résultat est égal à `anchorFor(…)` de l'entrée correspondante.
- Une section Markdown est trouvée par un mot de son texte.

`bible.spec.ts` :
- **La recherche.** On prend un mot de plus de 5 lettres dans le `libelle` de la première relation des données construites. Le taper dans la recherche (`getByRole('searchbox', { name: 'Chercher dans la bible' })`) fait apparaître au moins un résultat. Cliquer le premier donne une URL qui contient `?vue=relations#`, et l'élément ciblé est visible dans la fenêtre (`toBeInViewport`).
- **Le lien profond** (Review Focus 2). `gotoReady('bible/?vue=<slug>#<anchor>')`, avec une ancre de la dernière entrée d'un long fichier, après l'accord donné dans `localStorage` par `page.addInitScript`. L'élément est dans la fenêtre une fois le rendu fait.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project site -t search`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

- **`BibleSearch.svelte`** `{ docs }` :
  - un `<input type="search">` avec un `aria-label` (`bibleSearch`) et `autofocus` ;
  - une liste de résultats qui donne pour chacun le titre du fichier, le titre de l'entrée et l'extrait (`before<mark>match</mark>after`) ;
  - chaque résultat mène à `?vue=<slug>#<anchor>` ;
  - `bibleNoResults` quand la requête de 2 caractères ou plus ne trouve rien.
- **`BibleHome.svelte`** : `docs = $derived(searchDocs(bible, index))`, et la recherche en tête de page.
- **Le défilement vers l'ancre** (dans `+page.svelte`). Après chaque rendu d'une vue (bible chargée, `page.url` changée), `await tick()`, puis `document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()`.
- **Le surlignage de la cible.** `:target` reçoit un fond `var(--bg-panel)` et un contour `var(--accent)`.
- **Les clés i18n.**

| Clé | Français | Anglais |
| --- | --- | --- |
| `bibleSearch` | `Chercher dans la bible` | `Search the bible` |
| `bibleNoResults` | `Aucun résultat.` | `No results.` |

- [ ] **Step 4: Vérifier**

Run: `npm test && npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): search the bible" -- web/site/src web/site/e2e
```

---

### Task 9: Formes reconnues et page d'un personnage

**Files:**
- Create: `web/site/src/lib/bible/shapes.ts`, `shapes.test.ts`, `character.ts`, `character.test.ts`, `CharacterView.svelte`
- Modify: `web/site/src/routes/bible/+page.svelte`, `fr.ts`, `en.ts`, `web/site/e2e/bible.spec.ts`

**Interfaces:**
- Consumes: `catalog.ts` et `GenericView`/`ValueView` (tâche 7), `foldForSearch` (tâche 8).
- Produces (`shapes.ts`, utilisés par les tâches 10 à 12) :

```ts
export interface Phase { id: string; title: string; summary: string | null }
export interface ChronoEvent { who: string[]; phases: string[]; what: string; time: string | null; status: string | null; source: string | null; path: (string | number)[]; raw: Record<string, BibleValue> }
export interface Chronology { phases: Phase[]; groups: { label: string; members: string[] }[]; events: ChronoEvent[]; all: ChronoEvent[] }
export function asChronology(data: BibleValue): Chronology | null;
export const CHRONOLOGY_KEYS: readonly string[]; // ['phases', 'groupes', 'tous', 'evenements']
export interface Relation { from: string; to: string; valence: number; label: string | null; note: string | null; source: string | null; ambivalent: boolean; path: (string | number)[] }
export function asRelations(data: BibleValue): Relation[] | null;
export const RELATIONS_KEYS: readonly string[]; // ['relations']
export interface Room { num: string; raw: Record<string, BibleValue>; path: (string | number)[] }
export interface Level { title: string; raw: Record<string, BibleValue>; rooms: Room[] }
export function asHouse(data: BibleValue): Level[] | null;
export const HOUSE_HIDDEN: ReadonlySet<string>; // rect, portes, tikz_extra, etiquette
```

- Produces (`character.ts`) :

```ts
export function mentions(value: BibleValue, id: string): boolean;
export function relationsOf(relations: Relation[], id: string): { from: Relation[]; to: Relation[] };
export function timelineOf(chrono: Chronology, id: string): { phase: Phase; events: ChronoEvent[] }[];
export function mentionsIn(file: BibleYamlFile, id: string): { anchor: string; value: Record<string, BibleValue> }[];
export function noteHeadingMatches(heading: string, index: CharacterIndex): string[];
export function sceneNotesFor(bible: Bible, index: CharacterIndex, id: string): MarkdownSection[];
```

Règles fixées :
- **`asChronology`**
  - Exige `phases` (une liste d'objets `{ id, titre }`) et `evenements` (une liste d'objets avec `phase` et `quoi`).
  - `qui` et `phase` peuvent être une valeur seule ou une liste, et se normalisent en tableaux.
  - Les groupes viennent de `groupes[].groupe` et `groupes[].personnages`.
  - `all` reçoit les éléments de `tous`.
  - Si une condition manque, la fonction renvoie `null`.
- **`asRelations`** exige `relations`, une liste d'objets `{ de, vers, valence: number }`, et renvoie `null` sinon.
- **`asHouse`** exige `niveaux`, une liste d'objets `{ titre, pieces: [{ num, nom }] }`, et renvoie `null` sinon.
- **`mentions`** répond vrai si une chaîne, à n'importe quelle profondeur, vaut `id` ou `suit:<id>`.
- **`mentionsIn`** ne garde que les objets des listes de premier niveau qui mentionnent l'id. Il ignore le fichier `personnages`, et aussi la chronologie et les relations quand leur forme est reconnue.
- **`timelineOf`** renvoie toutes les phases dans l'ordre. Chacune porte les événements de l'id puis ceux de `all` ; une liste vide signale un trou.
- **`noteHeadingMatches`**
  - Les formes d'un personnage sont les segments de son `usuel` (découpés sur `,` ou `;`, sans les « … ») et les mots de 4 lettres ou plus de son `nom` qu'aucun autre personnage de l'index ne porte.
  - Un titre correspond à un personnage s'il contient l'une de ses formes comme mot ou suite de mots entiers, la comparaison passant par `foldForSearch`.
- **`sceneNotesFor`** prend les sections de niveau 2 du fichier de slug `notes-de-scene` dont le titre correspond à l'id.

- [ ] **Step 1: Écrire les tests qui échouent**

`shapes.test.ts` :
- **`asChronology`.** Un événement `qui: [MON, REG]` a `who` égal à `['MON', 'REG']`, et `phase: [P0, P1]` donne `phases` égal à `['P0', 'P1']`. Une donnée sans `phases` renvoie `null`.
- **`asRelations`.** `{ relations: [{ de: 'A', vers: 'B', valence: 'fort' }] }` renvoie `null`, et la fixture valide renvoie 4 relations.
- **`asHouse`.** Renvoie deux pièces `S1` et `S2`, et `null` pour `{ niveaux: 'x' }`.

`character.test.ts` :
- `noteHeadingMatches('Blackstone')` donne `['BLA']`.
- `noteHeadingMatches('Monica et Reginald')` donne `['MON', 'REG']`.
- `noteHeadingMatches('Lady Whitmore')` donne `['WHI']`.
- `noteHeadingMatches('Evangeline')` donne `['EVA']`.
- `noteHeadingMatches('Personne')` donne `[]`.
- `relationsOf(rels, 'SER')` donne `from.length === 2` et `to.length === 1`.
- `timelineOf(chrono, 'MON')` contient l'événement partagé avec REG, et une phase sans événement donne `events: []`.
- `mentionsIn(vote, 'SER')` renvoie les deux entrées (celle de SER et le `suit:SER` de WHI).

`bible.spec.ts` :
- **Les relations.** On prend le premier id qui a des relations dans les deux sens, d'après les données construites et `asRelations`. Sur `?perso=<id>`, la section `bibleRelationsFrom` a autant de lignes que `relationsOf(...).from` et `bibleRelationsTo` autant que `.to`.
- **L'identité.** Le `nom` du personnage figure dans le `h1`.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project site -t "shapes|character"`
Expected: FAIL.

- [ ] **Step 3: Implémenter `CharacterView.svelte`** `{ id, bible, index }`

Dans l'ordre :
1. Un `<h1>` avec le `nom`, puis un `<dl>` de tous les champs de l'entrée, rendus par `ValueView`.
2. Si les relations ont une forme reconnue, deux listes, `bibleRelationsFrom` et `bibleRelationsTo`. Chaque ligne donne :
   - l'autre personnage (`CharacterRef`, ou l'id brut s'il est inconnu) ;
   - la valence (`+2`, `−1` : signe moins typographique), avec la couleur de la tâche 11 si elle existe déjà, sinon en texte ;
   - le libellé, la note et la source, et les étiquettes « ambivalent » et « déduit ».
3. Si la chronologie a une forme reconnue, `bibleEvening` : une ligne par phase (id et titre), puis les événements (heure, quoi, étiquette de statut et de source), ou `bibleGap` en italique.
4. Pour chaque autre fichier YAML qui a des `mentionsIn`, un `<h2>` au titre du fichier, puis chaque entrée rendue par `ValueView`, avec un lien vers `?vue=<slug>#<anchor>`.
5. Si `sceneNotesFor` trouve des sections, `bibleSceneNotes`, puis leur `{@html}`.

Un `?perso=` inconnu affiche `bibleUnknownView`.

Les clés i18n :

| Clé | Français | Anglais |
| --- | --- | --- |
| `bibleRelationsFrom` | `Son regard sur les autres` | `How they see others` |
| `bibleRelationsTo` | `Le regard des autres` | `How others see them` |
| `bibleEvening` | `La soirée` | `The evening` |
| `bibleGap` | `trou` | `gap` |
| `bibleSceneNotes` | `Notes de scène` | `Scene notes` |

- [ ] **Step 4: Vérifier**

Run: `npm test && npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): character pages in the bible" -- web/site/src web/site/e2e
```

---

### Task 10: Vue Chronologie (grille)

**Files:**
- Create: `web/site/src/lib/bible/chronology.ts`, `chronology.test.ts`, `ChronologyView.svelte`
- Modify: `FileView.svelte`, `fr.ts`, `en.ts`, `web/site/e2e/bible.spec.ts`

**Interfaces:**
- Consumes: `asChronology`, `CHRONOLOGY_KEYS` (tâche 9), `GenericView` avec `skip` (tâche 7).
- Produces : `chronologyGrid(chrono: Chronology, index: CharacterIndex): { sections: { label: string | null; rows: { id: string; cells: ChronoEvent[][] }[] }[]; all: ChronoEvent[][] }`. Il y a une cellule par phase, dans l'ordre de `chrono.phases`.
  - Les sections suivent `groups`, dans l'ordre.
  - Une dernière section `label: null` réunit les ids qui apparaissent dans les événements sans appartenir à aucun groupe, y compris les ids inconnus, dans l'ordre d'apparition.
  - Un personnage sans événement et hors des groupes n'a pas de ligne.

- [ ] **Step 1: Écrire les tests qui échouent**

`chronology.test.ts`, sur la chronologie en mémoire des tâches précédentes :
- les sections sont `['La maison', null]`, et la section `null` contient `MON`, `REG` et `XYZ` ;
- l'événement `phase: [P0, P1]` apparaît dans les deux cellules de sa ligne ;
- `all[1]` contient l'événement de `tous`.

`bible.spec.ts`, avec `asChronology` et `chronologyGrid` appliqués au vrai fichier :
- sur `?vue=chronologie`, la grille a une ligne `tr[data-row]` par ligne de `chronologyGrid` ;
- la cellule `[data-row="<id>"] [data-phase="<phase>"]` du premier événement contient son `quoi` ;
- à 375 × 800, `document.documentElement.scrollWidth <= window.innerWidth` (Review Focus 4).

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project site -t chronology`
Expected: FAIL.

- [ ] **Step 3: Implémenter `ChronologyView.svelte`** `{ file, index }`

- **Le cadre.** Un `<div class="grid-frame">` en `overflow-x: auto`, avec une largeur maximale de 100 %, contient un `<table>`.
- **Les en-têtes.** Une ligne de phases (`<th data-phase>` avec l'id et le titre, et le résumé en `title` et en petit dessous), puis une ligne d'intertitre par section (`bibleOthers` pour `null`).
- **Les lignes.** Chacune commence par un `<th>` avec `CharacterRef` ou l'id brut. La première colonne et la ligne d'en-tête sont collantes (`position: sticky`, fond `--bg`).
- **Les cellules.**
  - Chaque événement donne l'heure en gras, le `quoi`, et une étiquette pour `statut ≠ decide` et pour `source`.
  - `piste` et `propose` sont en italique, couleur `--accent`.
  - Une cellule vide porte la classe `gap`, un fond hachuré léger (`repeating-linear-gradient` avec `--rule`) et le texte masqué `bibleGap`.
- **La ligne « Tous ».** Elle passe en tête, si `all` n'est pas vide (`bibleEveryone`).
- **Le reste du fichier.** Sous la grille, `GenericView` avec `skip = CHRONOLOGY_KEYS`, sans répéter la légende.
- **`FileView`.** Si `asChronology(file.data)` n'est pas `null`, la vue ajoute la légende puis `ChronologyView` ; sinon elle garde `GenericView`.
- **Les clés i18n.**

| Clé | Français | Anglais |
| --- | --- | --- |
| `bibleOthers` | `Autres` | `Others` |
| `bibleEveryone` | `Tous` | `Everyone` |

- [ ] **Step 4: Vérifier**

Run: `npm test && npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts`
Expected: PASS. Contrôle visuel dans `npm run dev` dans les trois thèmes, et à 375 px.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): chronology grid" -- web/site/src web/site/e2e
```

---

### Task 11: Vue Relations (matrice)

**Files:**
- Create: `web/site/src/lib/bible/relations.ts`, `relations.test.ts`, `RelationsView.svelte`
- Modify: `web/site/src/lib/styles/themes.ts`, `themes.test.ts` (couleurs de valence), `FileView.svelte`, `CharacterView.svelte` (couleur de la valence), `web/site/e2e/bible.spec.ts`

**Interfaces:**
- Consumes: `asRelations`, `RELATIONS_KEYS` (tâche 9).
- Produces :
  - `relationsMatrix(rels: Relation[], index: CharacterIndex): { rows: string[]; cols: string[]; at(from: string, to: string): Relation | null }`. Les lignes sont les ids présents en `from`, les colonnes les ids présents en `to` : d'abord dans l'ordre de l'index, puis les ids inconnus dans l'ordre d'apparition.
  - Les variables CSS `--valence-neg` et `--valence-pos`, définies pour chaque thème.
  - La classe `valence-<n>`, où `n` vaut `m2`, `m1`, `0`, `p1` ou `p2`.

- [ ] **Step 1: Écrire les tests qui échouent**

- **`relations.test.ts`.** Sur la fixture en mémoire, `rows` vaut `['SER', 'WHI']`, `cols` vaut `['SER', 'WHI', 'XYZ']`, `at('SER', 'XYZ')?.valence === 0` et `at('WHI', 'WHI') === null`.
- **`themes.test.ts`.** Pour chaque thème, `negative` et `positive` (nouveaux `ThemeTokens`) ont un contraste d'au moins 3 sur `bg`, puisque ce sont des fonds de cases accompagnés d'un chiffre.
- **`bible.spec.ts`** :
  - sur `?vue=relations`, le nombre de `button[data-from][data-to]` est égal au nombre de relations ;
  - cliquer le premier affiche son `libelle` dans le panneau de détail (`[data-relation-detail]`) ;
  - à 375 px, la page ne défile pas horizontalement.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --project site -t "relations|theme"`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

- **`themes.ts`.** Ajouter `negative` et `positive` à `ThemeTokens` et à `themeVars` (`--valence-neg`, `--valence-pos`) :

| Thème | `negative` | `positive` |
| --- | --- | --- |
| paper | `#A4262C` | `#2F6B3A` |
| sepia | `#8F1F25` | `#2E5E33` |
| dark | `#E57D82` | `#8CC79A` |

  Ajuster si le test de contraste échoue.
- **Les fonds de cases.** `p2` : `color-mix(in srgb, var(--valence-pos) 55%, var(--bg))`. `p1` : 25 %. `0` : `var(--bg-panel)`. `m1` et `m2` : la même chose avec `--valence-neg`.
- **`RelationsView.svelte`** `{ file, index }` :
  - le même cadre défilant que la chronologie ;
  - les en-têtes de colonnes en `shortName`, écrits verticalement (`writing-mode: vertical-rl`) ;
  - chaque case non vide est un `<button data-from data-to class="valence-…">` qui affiche la valence signée (`+2`, `−1`, `0`), avec un astérisque si elle est ambivalente et une bordure en pointillé si `source === 'deduit'` ;
  - son `aria-label` est `« A → B : libellé »` ;
  - le clic ou le focus remplit le panneau `[data-relation-detail]` sous la matrice : de, vers, valence, libellé, note, source, ambivalence ;
  - une case vide est une cellule vide ;
  - sous la matrice, `GenericView` avec `skip = RELATIONS_KEYS`.
- **`FileView`.** Il branche cette vue quand `asRelations` n'est pas `null`.
- **`CharacterView`.** Il réutilise les classes `valence-…`.

- [ ] **Step 4: Vérifier**

Run: `npm test && npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts`
Expected: PASS. Contrôle visuel dans les trois thèmes.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): relations matrix" -- web/site/src web/site/e2e
```

---

### Task 12: Vue Maison

**Files:**
- Create: `web/site/src/lib/bible/HouseView.svelte`
- Modify: `FileView.svelte`, `fr.ts`, `en.ts`, `web/site/e2e/bible.spec.ts`

**Interfaces:**
- Consumes: `asHouse`, `HOUSE_HIDDEN` (tâche 9), `anchorFor`, `ValueView`, `GenericView` (tâche 7).

- [ ] **Step 1: Écrire le test e2e qui échoue**

`bible.spec.ts`. On prend la première pièce de `asHouse` appliquée au fichier de slug `maison`, s'il existe (sinon `test.skip`). Sur `?vue=maison` :
- un élément porte l'id `anchorFor('maison', room.path, room.raw)` et contient `room.num` et `nom` ;
- un lien `biblePlans` existe si `file.pdfs` n'est pas vide, et son `href` se termine par `pdfs[0].url` ;
- le texte de `main` ne contient pas `tikz`.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts -g maison`
Expected: FAIL.

- [ ] **Step 3: Implémenter `HouseView.svelte`** `{ file, index }`

- **En tête**, les liens vers les PDF (`biblePlans` : `Plans (PDF)` / `Plans (PDF)`).
- **Par niveau** :
  - un `<h2>` avec le titre ;
  - la hauteur et l'intro rendues par `ValueView` ;
  - les autres champs du niveau, sauf `pieces`, `tikz_extra` et `cle` ;
  - les pièces en `<article id={anchorFor(...)}>`, chacune avec un titre `num · nom`, la catégorie en étiquette, puis les autres champs sauf `HOUSE_HIDDEN`, `num`, `nom` et `cat`.
- **Le reste du fichier.** Les clés de premier niveau autres que `niveaux` passent par `GenericView` avec `skip = ['niveaux']`.
- **`FileView`.** Il branche cette vue quand `asHouse` n'est pas `null`.

- [ ] **Step 4: Vérifier**

Run: `npm test && npx playwright test e2e/bible.spec.ts -c site/playwright.config.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(site): house view" -- web/site/src web/site/e2e
```

---

### Task 13: Documentation, passation et vérification complète

**Files:**
- Modify: `CLAUDE.md`, `bible/README.md`, `docs/agents/passation.md`, `docs/agents/journal.md`

- [ ] **Step 1: Documenter**

- **`CLAUDE.md`, « Reader site (`web/`) »** :
  - « `/bible/` renders `bible/` (YAML in `donnees/` and `lieu/`, `bible.md`, `notes-de-scene.md`) behind a spoiler warning (consent in `localStorage` `rmp.bible.v1`). The page is a client-only shell (`ssr = false`); `data/bible.json` is fetched after consent, so no bible content is ever prerendered. Latest commit only (working tree with `npm run data`), no versions. A new YAML file renders through the generic view without code changes; dedicated views (chronology, relations, house, character pages) fall back to it when a file's shape changes. »
  - « The cover's presentation comes from `presentation.md` at the repository root. »
  - Ajouter `\lieudate`, si la tâche 2 n'a pas pu le committer.
- **`bible/README.md`, « Pistes pour la CI ».** La lecture des YAML par le site est faite (section `/bible/`, derrière un avertissement).
- **`passation.md`, « État actuel ».** La bible est consultable sur le site, derrière un avertissement anti-spoil. `presentation.md` attend son vrai texte (TODO). `\lieudate` existe. Les identifiants de Marcus sont incohérents (`DAV` dans `personnages`/`chronologie`, `MAR` ailleurs) : `verifier.py` échoue tant que ce n'est pas réglé.
- **`journal.md`, entrée du 2026-10-26** :
  - la bible est publiée derrière un avertissement plutôt que déplacée dans le dépôt privé ;
  - le lieu et la date passent par une commande de tête de chapitre, ce qui ne contredit pas « sans en-têtes de lieu ou d'heure par scène » ;
  - la présentation de l'accueil est provisoire ;
  - le site rend tout nouveau YAML sans code, avec des vues dédiées qui se rabattent sur le rendu générique.

Ces fichiers portent des modifications non commitées d'Antoine. Les éditer en place, sans rien écraser.

- [ ] **Step 2: Chaîne complète**

Run: `npm run ci`
Expected: PASS. En `data:ci`, la bible n'est lue que si elle est commitée ; sinon, les e2e de la bible sont sautés.

Run: `npm run data && npm run build && npm run e2e`
Expected: PASS, cette fois avec les e2e de la bible exécutés sur l'arbre de travail.

- [ ] **Step 3: Commit**

Ne committer que si Antoine a déjà commité ses propres modifications de ces fichiers. Sinon, laisser les fichiers modifiés et le signaler.

```bash
git commit -m "docs: bible on the site, presentation, \\lieudate" -- CLAUDE.md bible/README.md docs/agents/passation.md docs/agents/journal.md
```
