# Roman Murder Party — gabarit LaTeX

Format A5 (14,8 × 21 cm), recto-verso, police EB Garamond, ornements victoriens (`pgfornament`).
Classe `memoir`, style `murderparty.sty`.

## Compiler

- **En local (Arch)** : `latexmk` dans ce dossier. Le PDF sort dans `build/`.
  Paquets utiles : `texlive-latexextra`, `texlive-fontsextra` (EB Garamond, pgfornament), `texlive-langfrench`.
- **Sur Overleaf** : importer le dossier, puis *Menu > Compilateur > LuaLaTeX* (XeLaTeX marche aussi).

## Organisation

| Fichier | Rôle |
| --- | --- |
| `roman.tex` | Fichier principal : ordre des parties, options |
| `murderparty.sty` | Toute la mise en page |
| `parties/*.tex` | Une partie par fichier (ouverture, parties d'enquête, intermède, conclusion, coda) |
| `annexes/` | Pages de début, liste des personnages |
| `figures/` | Plans et images |
| `exemples/demonstration.tex` | Un exemple de chaque élément ; à retirer avec `\demonstrationfalse` |

Pour ne compiler qu'une partie pendant l'écriture : décommenter `\includeonly{parties/ouverture}` dans `roman.tex`.

## Commandes

| Commande | Effet |
| --- | --- |
| `\partie[épigraphe]{Ouverture}{Seraphina}` | Page de partie ; le narrateur devient le titre courant |
| `\chapitre{Titre}` ou `\chapitre{}` | Chapitre numéroté en romain, titre facultatif |
| `\lieudate{Belgravia, Londres}{27 novembre 1890}` | Lieu et date sous le titre du chapitre, juste après `\chapitre` (deux lignes : lieu en petites capitales, filet, date en italique) |
| `\separation` | Changement de scène (ornement) |
| `\debut{L}{a pluie}` | Lettrine en ouverture de chapitre |
| `\fin` | Ornement de fin |
| `\rep Texte` | Réplique de dialogue : nouveau paragraphe, tiret cadratin et espace insécable ; un `\rep` à chaque changement de locuteur |
| `\pensee{...}` | Pensée formulée mais non dite, en italique et sans tiret |
| `\titre{...}`, `\auteur{...}` | Titre et auteur du livre, à régler dans `roman.tex` (le titre courant en découle par défaut) |
| `\epigraphe[source]{texte}` | Épigraphe facultative, à régler dans `roman.tex` ; imprimée sur sa propre page |
| `\dedicace{texte}` | Dédicace facultative, à régler dans `roman.tex` ; imprimée sur sa propre page |
| `\areprendre{...}` | Passage à retravailler : visible en mode `brouillon`, signalé dans le journal en mode `final` |
| `\noteauteur{...}` | Note pour soi, masquée en mode `final` |

Mode : `\usepackage[brouillon]{murderparty}` ou `\usepackage[final]{murderparty}`.

## Documents et annexes

| Environnement / commande | Usage |
| --- | --- |
| `lettre` | `\begin{lettre}[Londres, le 27 novembre 1890]{Madame,} ... \signature{...} \end{lettre}` |
| `telegramme` | `\begin{telegramme}{bureau}{heure}{destinataire} texte \end{telegramme}` (mis en capitales) |
| `coupure` | `\begin{coupure}{Journal}{Titre}[date] ... \end{coupure}` (deux colonnes) |
| `journal` | `\begin{journal}{Entrée du ...} ... \end{journal}` |
| `carton` | Petit document centré (invitation, billet, inscription) |
| `personnages` | Liste avec `\groupe{...}` et `\personnage{Nom}{âge, statut}{présentation}` |
| `\plan[largeur]{fichier}{légende}` | Plan ou image dans le texte |
| `\planpleinepage[page=3]{fichier}{légende}` | Plan sur une page entière |
| `\pageannexe{Titre}{contenu}` | Page d'annexe entre deux parties |

Les images de `\plan` et `\planpleinepage` doivent être des fichiers `.png`, `.jpg` ou `.svg`, avec l'extension écrite explicitement : le convertisseur du site refuse les figures PDF.

## Site de lecture

Le roman est aussi publié sous forme de site de lecture : <https://darkbriks.github.io/RomanMurderParty/>.
Le code se trouve dans `web/` (modèle, convertisseur LaTeX, site SvelteKit) et le workflow dans `.github/workflows/publish.yml`.

- **Publication** : chaque push sur `main` compile les deux PDF (`final` et `brouillon`), construit le site et le déploie sur GitHub Pages. Les pull requests construisent le site et le déposent en artefact `site-preview`, sans le déployer.
- **Nommer une version** : `git tag -a v0.2 -m "…" && git push --tags`. Le push du tag relance la publication depuis `main`, et la version apparaît sous ce nom dans le site.
- **Aperçu local** : `cd web && npm install && npm run pdfs && npm run data && npm run dev`.
- **Commande LaTeX inconnue** : le convertisseur refuse les commandes qu'il ne connaît pas, et la publication est alors bloquée. L'erreur indique le fichier et la ligne. Il faut apprendre la commande à `web/converter/src/vocabulary.ts`.
- **Réglage à faire une fois** : *Settings > Pages > Source : GitHub Actions*.
