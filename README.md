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
| `\separation` | Changement de scène (ornement) |
| `\debut{L}{a pluie}` | Lettrine en ouverture de chapitre |
| `\fin` | Ornement de fin |
| `\rep Texte` | Réplique de dialogue : nouveau paragraphe, tiret cadratin et espace insécable ; un `\rep` à chaque changement de locuteur |
| `\pensee{...}` | Pensée formulée mais non dite, en italique et sans tiret |
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
