# Bible du roman

Tout ce qui sert à écrire le roman sans en faire partie : décisions, lore, chronologie, lieux, repères historiques.
Rien ici n'est inclus dans `roman.tex` ; le convertisseur du site (`web/converter`) ne suit que les `\include`/`\input` de `roman.tex` et ignore donc ce dossier.

> **Spoilers.** Ces fichiers révèlent la solution (coupable, cible, victime). Le dépôt étant public, ils sont lisibles par tous.

## Hiérarchie du canon

En cas de contradiction, de la plus forte à la plus faible :

1. **Le texte écrit** (`parties/*.tex`) : ce qu'Antoine a écrit fait foi, sauf `\areprendre` ou `\noteauteur` contraire.
2. **Les décisions d'Antoine** consignées dans `bible.md` et marquées `decide` dans les données.
3. **Les fiches V2.5** du dépôt privé `murder-party` (`data/md/V2-5/`, `Secrets.md`, `Recap.md`).
4. **Le journal de Cordelia** prime sur les fiches pour ce qui précède la soirée ; ses entrées postérieures suivent l'ancien scénario et ne comptent pas.
5. **La V2-Archive** (source de Lily/Caro seulement) et **The London Herald** (`sources/london-herald.tex`) : inspiration, pas canon.
6. Les lectures de Claude (`source: deduit`, `statut: propose`) : à valider ou rejeter.

## Contenu

| Fichier | Contenu |
| --- | --- |
| [`bible.md`](bible.md) | Intentions, structure et narrateurs, intrigue principale, décisions datées, chantiers ouverts. La prose des décisions. |
| [`notes-de-scene.md`](notes-de-scene.md) | États intérieurs et ressentis des personnages, par personnage et par phase. Ce qui ne va pas dans la chronologie. |
| [`donnees/personnages.yaml`](donnees/personnages.yaml) | Les 17 personnages présents, puis absents et figurants. Définit les identifiants. |
| [`donnees/relations.yaml`](donnees/relations.yaml) | Ce que chacun pense des autres au début de la soirée (matrice non symétrique). |
| [`donnees/chronologie.yaml`](donnees/chronologie.yaml) | Phases P0–P10, événements par personnage, trous à combler, éléments flottants. |
| [`donnees/intrigues.yaml`](donnees/intrigues.yaml) | Les neuf sous-intrigues et la solidité de leur triplet. |
| [`donnees/invitations.yaml`](donnees/invitations.yaml) | Pourquoi chacun est invité, et pourquoi il vient vraiment. |
| [`donnees/vote.yaml`](donnees/vote.yaml) | Lecture de travail du vote sur l'antidote. |
| [`donnees/reperes-historiques.yaml`](donnees/reperes-historiques.yaml) | Faits vérifiés avec sources, points à vérifier, libertés assumées. |
| [`lieu/`](lieu/) | La maison Whitmore : `maison.yaml` (source), `gen.py` (générateur TikZ), `maison_whitmore.tex` et `.pdf` (générés). |
| [`sources/`](sources/) | Documents de la murder party recopiés pour référence. |
| [`verifier.py`](verifier.py) | Contrôle de cohérence des données (voir plus bas). |

## Conventions des données

- **Format** : YAML, clés en français sans accents, valeurs en français. Une entrée par fait ; pas de prose longue (elle va dans `bible.md`).
- **Identifiants** : trois lettres majuscules, définis dans `personnages.yaml` et utilisés partout ailleurs.
- **Statuts** (chronologie) : `decide` (Antoine a tranché), `piste` (idée d'Antoine à confirmer), `propose` (suggestion de Claude). `source: ouverture` = fixé par le texte écrit.
- **Sources** (relations) : `fiche`, `indices`, `plan`, `v2`, `deduit` ; détail en tête du fichier.
- **Pas de prénoms de joueurs** : le dépôt est public. La correspondance joueurs ↔ personnages reste hors du dépôt.
- **États intérieurs** : jamais dans `chronologie.yaml`, toujours dans `notes-de-scene.md`.

## Commandes

```sh
pip install pyyaml                       # une fois
python3 bible/verifier.py                # contrôle YAML + identifiants + numéros de pièces
cd bible/lieu && python3 gen.py maison_whitmore.tex && xelatex maison_whitmore.tex   # régénérer les plans
```

`gen.py` produit un `.tex` autonome (classe `article`, EB Garamond, TikZ) qui compile aussi sous LuaLaTeX et sur Overleaf.

## Pistes pour la CI

`verifier.py` sort en code 1 en cas d'erreur : il peut devenir une étape de `.github/workflows/publish.yml` sans toucher au site. Plus tard, le site pourrait lire ces YAML (fiche personnage, chronologie, plan interactif) ; il faudra alors décider si ces pages sont publiques, vu les spoilers.
