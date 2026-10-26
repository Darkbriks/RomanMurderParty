# Passation pour les agents

À lire en premier par tout agent (Claude ou autre) qui reprend le projet dans une nouvelle session. Ce fichier dit **qui fait quoi, ce qui fait foi, où en est le projet** ; le raisonnement derrière les décisions est dans [`journal.md`](journal.md).

Mettre à jour la section « État actuel » et ajouter une entrée au journal à la fin de chaque session qui change quelque chose.

## Le projet en trois lignes

Antoine écrit un roman en français à partir d'une murder party qu'il a organisée. L'action tient en une soirée : Londres, Belgravia, 27 novembre 1890, réception chez Lady Whitmore pour les 26 ans de la chanteuse Seraphina Blackwood. Chaque partie suit un narrateur différent et oriente vers un coupable différent ; la conclusion réunit les points de vue (« tout était là, et je n'ai rien vu »).

## Le rôle de l'agent

- **La plume est à Antoine.** Ne jamais rédiger sa prose, ni proposer de phrases « à reprendre telles quelles ». Pas de réécriture de ses paragraphes, même pour illustrer.
- Rôles attendus : **l'ami qui suit le projet et donne un avis honnête**, **le gardien du lore** (cohérence avec les fiches, la chronologie, l'histoire), **le guide technique** (LaTeX, dépôt, site, scripts).
- **Pendant le premier jet** : retours de **structure et de cohérence** seulement. Pas de remarques de style, sauf demande explicite.
- **Poser des questions de clarification avant une réponse détaillée.**
- Antoine met souvent des mots entre guillemets pour dire « à peu près ça » : ne pas les prendre au pied de la lettre.
- Réponses structurées, une priorité claire, pas de listes de vingt chantiers. Antoine dit craindre son perfectionnisme : le rassurer sur l'avancement quand il craint d'en faire trop.
- Les états intérieurs des personnages vont dans `bible/notes-de-scene.md`, jamais dans la chronologie (demande explicite, rétroactive).
- Ne pas pousser sur le dépôt ni ouvrir de PR sans qu'il le demande.

## Ce qui fait foi

Voir la hiérarchie détaillée dans [`bible/README.md`](../../bible/README.md). En bref : le texte écrit > les décisions d'Antoine (`bible/bible.md`) > les fiches V2.5 > le journal de Cordelia (avant la soirée seulement) > V2-Archive et London Herald (inspiration).

Les fiches de la murder party sont dans le **dépôt privé `Darkbriks/murder-party`** (`data/md/V2-5/`, `V2-Archive/`, `Secrets.md`, `Recap.md`, `Timeline.md`, `Plan.md`, `Bonus/`). Dans une session claude.ai, il est synchronisé dans le projet « Roman Murder Party » et se lit par la recherche du projet ; un `git clone` échoue sans accès.

Les fiches mêlent prénoms des joueurs et noms des personnages : dans le roman, seulement les noms des personnages.

## Où sont les choses

| Besoin | Fichier |
| --- | --- |
| Construire le livre, conventions LaTeX, site | [`CLAUDE.md`](../../CLAUDE.md), [`README.md`](../../README.md) |
| Décisions d'intrigue et de structure | [`bible/bible.md`](../../bible/bible.md) |
| Personnages, identifiants, âges | [`bible/donnees/personnages.yaml`](../../bible/donnees/personnages.yaml) |
| Qui fait quoi pendant la soirée | [`bible/donnees/chronologie.yaml`](../../bible/donnees/chronologie.yaml) |
| Ce que chacun pense des autres | [`bible/donnees/relations.yaml`](../../bible/donnees/relations.yaml) |
| Faits historiques vérifiés | [`bible/donnees/reperes-historiques.yaml`](../../bible/donnees/reperes-historiques.yaml) |
| Plans de la maison | [`bible/lieu/`](../../bible/lieu/) |
| Pourquoi une décision a été prise | [`journal.md`](journal.md) |

Avant de modifier les données : `python3 bible/verifier.py`.

## État actuel (26 octobre 2026)

**Fixé** : cible Marcus, coupable Vivienne Ashford (amnésique par hypnose jusqu'à l'heure X), victime Béatrice Prévost par échange de verres ; antidote unique, sort voté par les convives (verdict reporté, décidé en écrivant) ; Béatrice meurt des suites de la soirée ; le domestique est hypnotisé ; buffet debout ; Seraphina ouvre le roman ; Reginald fait l'intermède ; Cordelia, Isadora, Lady Whitmore, Béatrice et Thomas (en duo) ont une partie d'enquête ; Ophelia en réserve.

**Écrit** : `parties/ouverture.tex`, chapitres « Valse (provisoire) » (arrivées, jusqu'à la signora Valentini) et « Seule » (flash-back de Whitechapel : un protecteur masqué, Marcus, sauve Mary Fletcher). Ce texte fixe déjà des points de lore repris dans la chronologie (`source: ouverture`).

**Site** : la bible est consultable dans la section `/bible/` du site, derrière un avertissement anti-spoil (lien discret en bas de l'accueil). L'accueil présente le projet à partir de `presentation.md`, dont le texte est **provisoire** (TODO d'Antoine). Le lieu et la date d'un chapitre passent par `\lieudate{lieu}{date}` (« Valse » et « Seule » sont convertis).

**Points de cohérence signalés le 25 octobre, non tranchés** :
- « Seule » place le flash-back 4–5 ans avant la soirée ; les fiches datent le duo d'il y a 2 ans, l'embauche de Florence de 2 ans, les partitions volées d'un an. À accorder.
- L'odeur de formol du protecteur est anachronique (formol fixateur à partir de 1892) : alcool, acide phénique ou odeur de chair morte.
- Le prénom « Édouard » Prévost l'emporte désormais sur « Alain » (nouvelle bonus).
- Le « démon » que craint Seraphina : la veuve Valentini, ou une fausse piste vers Marcus ? Ambiguïté à garder volontairement ou à lever.
- Tutoiement : Lady Whitmore tutoie Seraphina ; Evangeline passe au « tu » sous l'inquiétude. Le `\noteauteur` de l'ouverture sur le vouvoiement Seraphina → Lady Whitmore reste ouvert.

**Prochaines étapes probables** : continuer l'ouverture jusqu'à la lettre ; trancher les triplets du couple Eristoff et du chagrin d'Evangeline ; fixer l'heure X quand les scènes auront une durée ; répartir les narrateurs dans les quatre parties d'enquête.

## Artefacts claude.ai d'origine

Ces fichiers ont été exportés le 25 octobre 2026 d'artefacts claude.ai, qui ne sont plus la source de vérité : la doc « Bible — Roman Murder Party » (onglets Bible et Notes de scène), la « Matrice des relations », le « Fil de la soirée » et le PDF des plans. En cas d'écart, le dépôt l'emporte.
