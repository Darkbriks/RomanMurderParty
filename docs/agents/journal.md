# Journal des décisions

Le raisonnement derrière les choix, pour qu'un agent qui reprend le projet ne rouvre pas une question déjà tranchée sans raison. Une entrée par session, la plus récente en bas. Format : **décision**, puis *pourquoi*, puis ce qui reste ouvert.

Ce n'est pas un compte rendu de travail : on n'y note que ce qui change la compréhension du projet.

---

## 2026-10-10 — Cadre et intrigue principale

- **La V2.5 fait foi** ; Thomas Davies (et non « Valentin ») est le compagnon de Béatrice.
  *Pourquoi* : c'est la version jouée ; la V2-Archive ne sert que pour Caro.
- **Structure** : ouverture (Seraphina), deux parties d'enquête, intermède (Reginald), deux parties d'enquête, conclusion. Chaque partie oriente vers un coupable différent.
  *Pourquoi* : obtenir l'effet « tout était là » ; Reginald ignore le secret de Monica, ce qui en fait une respiration et une fausse piste.
- **Règle des triplets** : chaque sous-intrigue doit pouvoir justifier victime / mobile / coupable.
  *Pourquoi* : aucune ne doit paraître décorative au lecteur.
- **Caro revient**, renommée Elizabeth « Lily » Eristoff.
  *Pourquoi* : éviter le doublon avec Lady Margaret Whitmore ; Lily est un diminutif victorien courant.
- **Mécanique de l'arsenic** : ingestion, échange de verres causé par la maladresse de Béatrice, antidote pour une seule personne.
  *Pourquoi* : l'absorption cutanée est négligeable (vérifié) ; l'échange crée l'incident anodin qui devient capital.
- **Libertés assumées** : délai des symptômes après la conclusion, efficacité de l'antidote, métiers des femmes.

## 2026-10-13 — La vérité de la soirée

- **Cible : Marcus. Coupable : Vivienne Ashford.**
  *Pourquoi* : Marcus touche six intrigues sur neuf et paraîtrait désigné d'avance comme empoisonneur ; l'inversion en fait la cible.
- **Vivienne s'est fait oublier son projet par hypnose**, avec un ancien élève atteint d'un cancer avancé comme hypnotiseur.
  *Pourquoi* : la suggestion post-hypnotique est un sujet de pointe en 1890 (Nancy, Salpêtrière) ; un condamné à mort ou un interné de Broadmoor ont été écartés (délais et accès invraisemblables). Le diabète maigre a été écarté (sources fragiles).
- **Le domestique est hypnotisé** : il sert le verre puis remet la lettre, sans souvenir.
- **La mémoire de Vivienne se débloque quand l'horloge sonne l'heure X**, annoncée par la lettre.
- **Verdict sur l'antidote reporté** : il se décidera en écrivant.
- **Béatrice meurt des suites de la soirée** ; l'antidote ne l'atteint pas.
- **Seraphina ignore que son protecteur est Marcus.**

Ouvert : l'heure X ; la motivation exacte de Vivienne à se faire oublier (crainte de trahir son principe de s'en remettre à la majorité).

## 2026-10-15 — Le lieu

- **Maison de ville mitoyenne à Belgravia**, sur le plan type de Kerr (*The Gentleman's House*, 1871), élargie à 36 ft.
- **Lord Whitmore existe**, souffrant, au manoir près de Bath ; Mrs Hartwell est avec lui. Les Whitmore sont aristocrates.
- **Pourquoi Londres en novembre** : la plupart des invités y vivent pour leur métier ; seuls les Fairfax se déplacent.
- **Buffet debout**, bouleversé par la lettre.

## 2026-10-17 — Chronologie, jets 1 et 2

- Phases relatives P0–P10 ; heures absolues seulement pour les arrivées.
  *Pourquoi* : Antoine fixera l'heure X quand il verra la durée que remplissent les scènes.
- Le verre : un domestique transmet la demande, l'hypnotisé prépare et apporte.
- Le coffret : serrure à code, destruction si on le force ou à heure fixe ; ouverture et vote sont deux événements distincts.
- Télégramme du détective de Theodore vers les deux tiers de la soirée, volontairement flou.
- Débrief de la bibliothèque (Cordelia, Isadora, Theodore) ; la photo n'a besoin que d'être comprise comme importante.
- **Les états intérieurs vont dans les Notes de scène**, pas dans la chronologie (y compris rétroactivement).

## Entre le 17 et le 24 octobre (dates approximatives) — Invitations, vote, relations

- Chaque convive a une raison d'être invité et une raison cachée de venir (`invitations.yaml`).
- **Nouveau lore** : Béatrice a aidé Seraphina en cachette à ses débuts ; leur lien s'est distendu.
- **Isadora** est invitée contre un article ; Lady Whitmore la supplie ensuite de ne rien écrire. Elle devine un secret autour de Cordelia sans creuser. L'expédition qu'elle rejoint ensuite ne porte pas sur les dauphins.
- **Cordelia** penche « détruire » : son journal distingue ses dérèglements personnels des crimes organisés du réseau. Retour à Londres le 28 février 1889.
- **Ophelia** penche « donner » : sa fiche la décrit compatissante, pas justicière.
- **Isadora** penche « donner » : le « détruire » initial venait sans doute de la joueuse, pas du personnage.
- **The London Herald** : inspiration, pas canon ; l'homonymie Thornfield est fortuite.

## Vers le 24 octobre — Gabarit LaTeX

- Livre imprimable A5, moderne avec des touches d'époque, sans en-têtes de lieu ou d'heure par scène, utilisable en local et sur Overleaf. Voir `CLAUDE.md`.

## 2026-10-25 — Passage au dépôt

- **Le dépôt devient la source de vérité** : la bible, les notes de scène, la matrice, la chronologie et les plans sont exportés dans `bible/`, en YAML et Markdown. Les artefacts claude.ai restent pour mémoire.
- **Formol écarté** pour le flash-back de Whitechapel (fixateur à partir de 1892).
- **Prévost s'appelle Édouard** (fixé par le chapitre « Seule »).
- Le flash-back « 4–5 ans avant » contredit les fiches (duo et Florence : 2 ans ; partitions : 1 an) : signalé, non tranché.
- La bible est publique et révèle la solution : à Antoine de décider si elle reste ici ou passe dans le dépôt privé.

## 2026-10-26 — La bible sur le site, lieu et date de chapitre

- **La bible reste dans le dépôt public et devient consultable sur le site**, derrière un avertissement (case « J'accepte d'être spoilé », accord retenu dans le navigateur).
  *Pourquoi* : Antoine veut la consulter facilement en écrivant ; la barrière évite le spoil accidentel, pas le lecteur qui fouille, qui accepte alors d'être spoilé.
- **Seul le dernier commit compte pour la bible** : pas de versions, contrairement au roman.
- **Un nouveau fichier YAML s'affiche sans toucher au code** : rendu générique, et vues dédiées (chronologie, relations, maison, page personnage) reconnues à la forme des données, avec repli sur le générique.
- **`\lieudate{lieu}{date}` en tête de chapitre** : lieu en petites capitales, filet, date en italique ; la lettrine passe au premier mot du texte.
  *Pourquoi* : mieux qu'un lieu et une date tapés dans la première phrase. La décision « sans en-têtes de lieu ou d'heure par scène » reste valable pour les scènes.
- **Présentation de l'accueil** dans `presentation.md`, texte provisoire à remplacer par Antoine.
- **Avertissement sur les notes de travail** dans le menu Aa et le PDF brouillon : elles peuvent révéler l'intrigue.

