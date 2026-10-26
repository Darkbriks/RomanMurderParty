# Bible — Roman Murder Party

Décisions, intentions et pistes en prose. Les données structurées (tableaux) vivent dans `donnees/*.yaml` ; ce fichier y renvoie au lieu de les recopier.
Source d'origine : la doc « Bible — Roman Murder Party » (claude.ai), exportée le 25 octobre 2026. Ce fichier fait désormais foi.

## Intention et principes

Raconter le dîner de la murder party sous forme de roman, pour le plaisir de retrouver ces personnages. Le texte est d'abord pour moi ; un partage avec des proches reste possible.

- **La plume est la mienne.** Claude suit le projet, donne un avis honnête, garde le lore et guide sur la technique. Il ne rédige pas la prose.
- **L'histoire décide du format.** Pas d'objectif de longueur ni de nombre de chapitres.
- **Pas de fidélité à la soirée réelle.** Seuls les personnages et l'univers comptent.
- **Une fin en demi-teinte.** L'enquête réussit, mais pas de « ils vécurent heureux ».
- **L'effet visé : « tout était là, et je n'ai rien vu ».** Chaque partie oriente vers un coupable différent ; la conclusion réunit les points de vue.
- **Règle des triplets.** Aucune sous-intrigue n'est mineure pour le lecteur : chacune doit pouvoir justifier un triplet victime / mobile / coupable.
- **Marcus plus lumineux que dans le jeu.** Le RP forçait ses côtés sombres ; le roman renforce son côté bienfaiteur dans certains points de vue. C'est indépendant de la question de sa culpabilité.

**Professions des femmes.** Liberté assumée : les personnages féminins exercent des métiers peu accessibles aux femmes en 1890 (aliéniste, journaliste, exploratrice…). Le récit peut le souligner par de petites remarques ponctuelles, mais cela ne devient jamais un point de tension ni un élément central.

## Canon et sources

La V2.5 fait foi, sauf décision contraire notée ici. Les fichiers sont dans le dépôt `murder-party` (dossier `data/md/`).

- **V2.5** : fiches des personnages présents, `Secrets.md`, `Recap.md`.
- **V2-Archive** : versions antérieures. Sert de source pour Caro, réintégrée au roman.
- **Noms** : les fiches mêlent prénoms des joueurs et noms des personnages. Dans le roman, on n'utilise que les noms des personnages.
- **Thomas Davies** est l'amant de Béatrice Prévost. « Valentin » est le nom du joueur.
- **Contexte** : Londres, automne 1890. Réception pour le 26e anniversaire de Seraphina Blackwood, chez les Whitmore.

**The London Herald** (n° 2847) : **inspiration, pas canon.** Ce journal servait à cacher une énigme de la soirée (annonce du Dr Matthews) ; ses dates suivent le calendrier réel et sa cohérence avec le lore est moins soignée. Il reste une mine d'idées : portraits de Cordelia, Vivienne, Theodore, Ophelia et des Fairfax, enquête Thornfield-Ashford, disparitions de l'East End, chronique sur la séparation de corps. PDF dans le dépôt privé ; source LaTeX copiée dans [`sources/london-herald.tex`](sources/london-herald.tex).

**Priorité en cas de conflit** : le journal de Cordelia, écrit en dernier, après la vraie soirée. Exception : ses entrées postérieures à la soirée suivent l'ancien scénario (Marcus empoisonne Isadora et se fait démasquer, article au Times le 15 décembre 1890). Dans le roman, l'article d'Isadora viendra dans d'autres circonstances, une fois partie de Londres avec Cordelia, sans chronologie ni répercussions imposées.

**Incohérences entre sources, à trancher**

- **Date de la soirée** : fin novembre 1890, selon le journal de Cordelia (confession dans le salon des Whitmore, entrée du 27 novembre). Le 9 août du Herald est écarté.
- **Retour de Cordelia** : demi-tour le 2 janvier 1889, arrivée à Londres le 28 février 1889, selon le journal. Le retour date donc d'environ 21 mois au moment de la soirée, et non de 6 mois comme dans les fiches ; les timelines du secret des dauphins sont à recaler.
- **Les Eristoff** : leur retraite, évoquée par le Herald et les fiches V2.5, est à adapter puisque Lily est présente.
- **Sir Reginald Thornfield**, directeur du Herald : homonymie involontaire avec Isadora, sans lien. À renommer si le journal apparaît dans le roman.

## Structure et narrateurs

Chaque partie raconte la même soirée d'un point de vue différent, en gardant une part du mystère. Structure provisoire :

1. **Ouverture — Seraphina.** De l'accueil des convives à l'annonce de l'empoisonnement. Elle voit ses invités à travers ses propres peurs : premières impressions biaisées.
2. **Deux parties d'enquête.**
3. **Respiration — Reginald Fairfax.** Vie conjugale et haute société plutôt qu'intrigue principale. Les diversions de Monica fournissent au passage une fausse piste.
4. **Deux parties d'enquête.**
5. **Conclusion.** Mêle les points de vue des parties précédentes. Idée : une petite scène annexe après la conclusion, montrant l'hypnose de Vivienne avant la soirée.

| Narrateur | Statut | Ce qu'il apporte |
| --- | --- | --- |
| Seraphina Blackwood | Ouverture | L'hôtesse ; les partitions vues de l'intérieur |
| Cordelia Pemberton | Partie d'enquête | Personnage le plus développé ; les dauphins ; regarde Theodore pour la mauvaise raison |
| Isadora Thornfield | Partie d'enquête | Victime désignée dans le jeu ; fortune de Blackstone, réseau de Marcus |
| Lady Whitmore | Partie d'enquête | Partitions vues de l'extérieur, chagrin d'Evangeline, financement de Marcus |
| Béatrice et Thomas | Partie d'enquête | Mort de Prévost vue de l'intérieur ; un couple sans secret entre eux ; Marcus en sauveur |
| Reginald Fairfax | Respiration | Le secret de Monica, vu par celui qui l'ignore |
| Ophelia Beaumont | Réserve | Remplaçante, ou partie supplémentaire si son point de vue apporte un vrai plus |

Critère : un personnage mérite sa partie s'il apporte ce qu'aucun autre ne peut apporter. Le nombre de parties n'est pas figé.

Personnages volontairement secondaires : Theodore Bradshaw (risque de redondance avec Cordelia), Vivienne Ashford (trop difficile à manier en narratrice pour l'instant), Florence Pembroke (moins de matière).

Point de vue en duo pour Béatrice et Thomas : alternance par sections, ou narrateur proche du couple. À trancher à l'écriture.

## Carte des intrigues et triplets

Neuf sous-intrigues héritées de la V2.5, plus le retour de Lady Eristoff. Le détail (au cœur, soupçonnent, narrateurs, solidité du triplet) est dans [`donnees/intrigues.yaml`](donnees/intrigues.yaml) ; les liens deux à deux dans [`donnees/relations.yaml`](donnees/relations.yaml).

Les deux intrigues à renforcer gagnent en tension avec la présence de Lady Eristoff. Leur triplet reste à définir.

Avec l'incertitude sur la cible, un triplet n'a pas besoin d'avoir Isadora pour victime : chaque intrigue peut proposer la sienne.

## Intrigue principale

L'empoisonnement est conservé. La victime et le coupable restent ouverts.

**Décidé**

- Le mode opératoire : un empoisonnement à l'arsenic.
- **La cible visée : Marcus.**
- **La coupable : Vivienne Ashford.**
- L'échange de verres : Béatrice, peu habituée aux robes de grande occasion, trébuche et laisse échapper son verre. Marcus, tout proche, la rattrape et lui offre galamment le sien, encore intact, avant d'aller s'en chercher un autre. Béatrice devient la victime par erreur. Un incident anodin pour le lecteur, capital à la fin.
- Vivienne a préparé en amont une seule dose d'antidote, calibrée pour la quantité d'arsenic versée : de quoi sauver une personne, pas deux. Elle laisse aux convives, à la lumière de la vérité, le choix d'utiliser ou de détruire l'antidote, et ne s'opposera pas à l'avis majoritaire.
- L'enquête aboutit : l'intrigue est dévoilée à la fin.
  - Libertés médicales assumées : la dose est calculée pour que les premiers symptômes n'apparaissent qu'après la conclusion ; l'antidote reste efficace quelques minutes à quelques heures après la prise, tant que les symptômes ne sont pas apparus.
  - Le vote sur l'antidote peut se clore sur une réplique de Béatrice qui trahit l'effet du poison (« Thomas, aide-moi, il faut que j'aille aux toilettes, c'est… urgent »).

Les repères médicaux et historiques sont vérifiés dans la section Repères historiques.

**Pistes à explorer**

- **L'antidote donné à la mauvaise personne.** L'enquête réussit, mais la « vraie » victime consomme l'antidote, ce qui condamne la « fausse ». Variante : l'erreur vient d'un raisonnement fondé sur la victime évidente, l'erreur même que le lecteur a commise.
- **L'incertitude sur la cible.** Le lecteur ignore qui le poison visait. Chaque partie peut suggérer une cible, donc un mobile et un coupable différents.
- **Le méchant évident n'est pas l'empoisonneur.** Marcus reste la pieuvre des sous-intrigues, mais quelqu'un d'autre verse le poison.
- **Un compte à rebours.** L'annonce de l'empoisonnement en fin d'ouverture fait courir le temps sous toutes les parties.

**La coupable : l'inversion (décidé)**

- **Vivienne Ashford empoisonne Marcus.** Le méchant évident devient la cible ; le mobile pour tuer devient un mobile pour être tué.
- **Mobile** : elle connaît ou soupçonne ses crimes (vols de cadavres, disparition de Prévost) et sait que la justice ne l'atteindra pas.
- **Le jeu** : elle a planifié la soirée pour s'en amuser, en acceptant que ce soit peut-être sa dernière nuit de liberté, et en guettant une porte de sortie dans le chaos.
- **L'oubli par l'hypnose** : en 1890, la suggestion post-hypnotique et l'amnésie qui l'accompagne sont des sujets de pointe. Auto-hypnose et hypnose croisée écartées comme trop fragiles. Motivation à éprouver : elle se fait oublier son projet par peur de trahir son propre principe et de tuer Marcus quoi qu'en décident les convives.
- **L'hypnotiseur : un ancien élève atteint d'un cancer avancé**, déjà en partie formé par elle, ce qui justifie sa confiance et permet une survie plus courte. Sa mort prochaine garantit le silence.
  - Assez jeune pour ne pas avoir eu le temps d'assurer l'avenir de sa famille.
  - Ses motivations mêlent sa propre complicité morale contre Marcus et des arrangements garantissant l'avenir de sa famille.
  - Piste écartée : l'interné de Broadmoor.
- **Position narrative** : Vivienne reste secondaire. Elle observe dans toutes les parties sans qu'on entende jamais ses pensées.

**La vérité de la soirée : décisions du 13 octobre**

- **Le poison.** Vivienne, amnésique, ne peut pas agir elle-même. Quelques jours avant, elle a « convaincu » un ou une domestique de servir à Marcus un verre préparé spécialement.
- **La révélation.** L'hypnose est construite pour que ses souvenirs se débloquent quand une heure définie à l'avance sonne. La lettre qui lance l'enquête annonce qu'à cette heure, le coupable se reconnaîtra : c'est la fin des investigations et le début du vote. Après le vote, Vivienne explique tout elle-même.
- **Le verdict sur l'antidote.** Reporté : il se décidera en écrivant, et ne concerne que la conclusion et l'épilogue.
- **Seraphina** ignore que son « protecteur » était Marcus : elle n'a traité qu'avec des intermédiaires ou des lettres anonymes.

**Mécanique de la soirée**

- **Le domestique** (décidé) : le « convaincu » passe par l'hypnose. Une suggestion post-hypnotique lui fait servir le verre au Dr Harrington, puis remettre la lettre un certain temps après, pour que le verre soit bu avant que l'empoisonnement ne rende tout le monde méfiant. Il n'en garde aucun souvenir.
- **L'absence de Mrs. Hartwell** (piste) : « retenue au manoir familial par une urgence de dernière minute ». Et si Vivienne l'avait provoquée, parce que la gouvernante aurait remarqué l'irrégularité du service ?
- **Les horloges** : quelques minutes d'écart entre elles ne posent pas de problème.
- **Le format** (décidé) : une réception debout autour d'un buffet, bouleversée par la lettre qui lance l'enquête.

**Piste pour la conclusion**

- Marcus survit, mais plusieurs personnages lui sont très hostiles, notamment le cercle de Cordelia et d'Isadora.
- Sachant la justice impuissante, Isadora écrit une série d'articles contre lui. Par crainte de son réseau, elle rejoint une expédition de Cordelia et Theodore, écrit à bord et envoie ses articles lors des escales. Ce lien se noue pendant la réception, où elle était venue en échange d'un article.
- L'antidote n'atteint pas Béatrice, qui s'éteint des suites de la soirée.
- Le sort de l'antidote (donné à Marcus ou détruit) dépendra de la majorité : analyser les intérêts de chaque convive.

**Analyse : le vote sur l'antidote**

Lecture de travail, rien n'est tranché : voir [`donnees/vote.yaml`](donnees/vote.yaml) (lien avec Marcus, vote probable, leviers).

**Le risque à garder en tête**

Le lecteur accumule ce que chaque personnage ne voit que localement. Marcus touche six intrigues sur neuf : après trois parties, il peut sembler désigné d'avance.

## Personnages : chantiers

### Elizabeth « Lily » Eristoff (Caro) — réintégrée

Le personnage revient tel que prévu en V2, mais il est resté plat et doit être enrichi. Elle s'appelle désormais Lady Elizabeth Eristoff, « Lily » pour ses proches, ce qui règle le conflit avec Lady Margaret Whitmore.

Prénom retenu : **Elizabeth « Lily »**. Lily est un diminutif très courant chez les victoriens (Lily Langtry, célébrité des années 1880), et un clin d'œil au chat. Options écartées : Éléonore / Nora (conflit avec Mrs. Eleanor Hartwell), Adélaïde.

À enrichir :

- Un mobile plus tranchant envers Evangeline, ou de la part d'Evangeline.
- Les lettres d'avocats : un divorce en 1890 signifie la ruine sociale.
- Des liens avec la V2.5 : veuve Valentini, Florence, financements de Lady Whitmore. Piste : sa position de mécène la rapproche du milieu de Valentini.
- Son objectif V2 : empêcher Isadora de découvrir la crise du couple.

### Son mari, le pianiste

**Tranché par l'ouverture : absent.** Les options ci-dessous restent pour mémoire.

Présence non décidée. Il n'existe que par les intrigues des autres : pas de caractère propre, pas de dynamique sociale.

- **Absent** : il garde le prénom Théodore. Son absence devient un sujet de ragots, et un personnage défini uniquement par les autres s'accorde bien avec l'absence.
- **Présent** : à construire entièrement, et à renommer (conflit avec Theodore Bradshaw). Il devient un candidat victime ou coupable.
- **Piste** : intégrer l'incertitude au récit (attendu, annoncé, en retard…), quel que soit le choix final.

### Autres

- **Marcus** : renforcer son côté bienfaiteur dans certains points de vue, et en faire une personnalité si importante et si corruptrice que la justice ne peut pas l'atteindre. C'est ce qui justifie que Vivienne se fasse justice elle-même.
- **Florence** : sa classe sociale plus modeste peut servir de contrechamp ponctuel dans la partie de Lady Whitmore.
- **Recap.md** : l'absence des Eristoff y est un sujet de conversation, à mettre à jour.

## Repères historiques

Vérifiés les 10, 15 et 25 octobre 2026, avec sources : [`donnees/reperes-historiques.yaml`](donnees/reperes-historiques.yaml). Deux corrections par rapport aux premières estimations : la mort par arsenic prend plutôt un à trois jours, et le « diabète maigre » est une piste moins sûre que prévu. Ajout du 25 octobre : le formol est anachronique avant 1892.

## Pourquoi chacun est là

Lady Whitmore reçoit chez elle pour les 26 ans de Seraphina. Tous les convives ont désormais une raison d'être là ; beaucoup sont invités par obligation mondaine plus que par amitié, ce qui explique la présence de gens qu'elle redoute ou connaît à peine.

Tableau par personnage : [`donnees/invitations.yaml`](donnees/invitations.yaml).

**Ajout au lore : Béatrice et Seraphina.** Pendant l'ascension de Seraphina, de Whitechapel jusqu'aux grands cercles artistiques, Béatrice l'a aidée au tout début. Elles se sont rencontrées par hasard ; Béatrice l'a aidée comme elle le pouvait, en cachette, pendant les heures de travail de son mari, à l'époque où les origines de Seraphina n'étaient pas encore effacées par son talent et où beaucoup de portes lui restaient fermées. Le temps a un peu distendu leur lien, mais elles restent en bons termes.

**Pistes conservées.** Les invitations s'expliquent par les usages mondains : Vivienne n'a donc pas eu besoin de manipuler la liste. Il lui suffisait d'exploiter une soirée où Marcus serait présent de toute façon.

**Conséquences de l'invitation d'Isadora.**

- Le contact noué pendant la soirée entre Isadora, Cordelia et Theodore mène à son départ de Londres avec eux. Les trois doivent donc se découvrir et s'entendre assez bien, dès la réception, pour que Cordelia lui propose sa protection.
- Après la conclusion, Lady Whitmore supplie Isadora de ne jamais rien écrire sur cette soirée. Le prix de l'invitation s'inverse : on lui demandait un article, on lui demande le silence.

**Isadora et le secret de Cordelia** (provisoire, à ajuster avec le développement des personnages) :

- Isadora se doute, ou a eu vent, qu'il y a quelque chose à protéger autour de la dernière expédition de Cordelia, sans en connaître le détail. Elle choisit de ne pas creuser, en remerciement de l'invitation et de la protection.
- L'entourage de Cordelia l'encourage à ne pas trop la solliciter sur cette expédition, en la disant encore fragile.
- L'expédition organisée après la soirée n'a pas de raison de porter sur les dauphins : elle peut viser d'autres sujets de recherche.

Incohérence relevée en passant : M. Prévost s'appelle Édouard dans le Recap, Alain dans *La Véritable Histoire de M. Prévost*.

## Le lieu : la maison Whitmore

Une grande maison de ville mitoyenne à Belgravia, sur cinq niveaux plus un sous-sol, modélisée sur le plan type de Robert Kerr (*The Gentleman's House*, 1871). Les plans détaillés sont dans `lieu/`.

- **Lord Whitmore existe** : souffrant, il est resté au manoir familial, à la campagne, et n'a pas pu faire le voyage. Son absence ne laisse pas un simple vide.
- **Les Whitmore sont aristocrates** : la fiche est uniformisée en ce sens (elle disait aussi « haute bourgeoisie »).
- **Pourquoi Londres en novembre**, hors saison : la plupart des invités y vivent toute l'année, souvent pour leur métier, ce qui simplifie l'organisation. Seuls les Fairfax font le déplacement.
- Mrs. Hartwell est retenue au manoir, auprès de Lord Whitmore.

Plans : [`lieu/`](lieu/) (données dans `lieu/maison.yaml`, plans TikZ générés par `lieu/gen.py`).

## Chronologie maître

Les événements, phases et heures sont dans [`donnees/chronologie.yaml`](donnees/chronologie.yaml), qui fusionne les jets 1 et 2 d'Antoine et ce que l'ouverture a fixé. Les états intérieurs sont dans [`notes-de-scene.md`](notes-de-scene.md). Restent ici les décisions de mécanique.

**Précisions du 17 octobre**

- **Le verre** : le domestique à qui Lady Whitmore s'adresse peut transmettre la demande ; un autre, celui qui est hypnotisé, prépare le verre et l'apporte.
- **Le toast** à Seraphina est prévu, avant ou après le chant selon les usages. Béatrice doit avoir bu avant la lettre.
- **Le coffret** : un contenant verrouillé par un code (intégré ou par cadenas à lettres). Un mécanisme détruit l'antidote si on le force, ou quand une heure ou une minuterie prédéfinie est atteinte. Son ouverture et le vote sont deux événements distincts : le vote suppose seulement que le coffret soit ouvert, et l'ouverture peut avoir lieu avant l'heure X.
- **L'heure X** et les heures absolues seront fixées plus tard, une fois qu'on verra quelle durée les scènes remplissent. La chronologie reste relative pour l'instant.
- **Theodore** reçoit un télégramme de son détective privé vers les deux tiers de la soirée : après avoir présenté Isadora à Cordelia, avant la confession. Le texte diffère de celui de la vraie soirée, pour être moins clair et plus sujet à interprétation. Il le confie à Cordelia dès qu'ils sont seuls ; Cordelia hésite, puis le partage probablement avec Isadora, qui lui a déjà confié des informations.

## Chantiers ouverts et prochaines étapes

Seules les deux premières étapes doivent être solides avant d'écrire ; le reste peut s'ajuster en cours de route.

- [ ] **La vérité de la soirée** : qui empoisonne qui, pourquoi, comment, et le sort de chacun.
- [ ] **La chronologie maître** : qui est où, quand, et qui sait quoi à quel moment.
- [ ] Un triplet pour le couple Eristoff et pour le chagrin d'Evangeline.
- [x] Le prénom de Lady Eristoff : Elizabeth « Lily ».
- [x] La présence ou l'absence de son mari : absent (fixé par l'ouverture).
- [ ] Le sort d'Isadora et la place de sa partie par rapport à l'empoisonnement.
- [ ] La répartition des narrateurs dans les quatre parties d'enquête.
- [ ] Pour chaque narrateur : ce qu'il sait, ce qu'il cache, qui il soupçonne, quelles sous-intrigues il fait avancer.

**Méthode d'écriture convenue**

- Premier jet sans corriger ; marquer `[à reprendre : …]` et avancer.
- Travailler par scène, dans l'ordre de l'envie.
- Pendant le premier jet, ne demander à Claude que des retours de structure et de cohérence.
- Ne pas se mesurer au style des textes de l'époque.

Les états intérieurs des personnages, relevés au fil de la construction, sont rangés à part : [`notes-de-scene.md`](notes-de-scene.md).
