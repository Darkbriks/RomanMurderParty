# Bible sur le site, présentation, avertissement des notes, lieu et date de chapitre

Document de conception, 26 octobre 2026. Quatre chantiers indépendants, qu'on peut livrer dans n'importe quel ordre. Les choix marqués *(choix de Claude)* n'ont pas été discutés avec Antoine : il peut les rejeter à la relecture.

## Intention

Antoine vient de rapatrier dans `bible/` ce qui vivait dans des artefacts claude.ai : personnages, chronologie, relations, intrigues, invitations, vote, repères historiques, plans de la maison. Pendant qu'il écrit, il a besoin d'y vérifier n'importe quoi, de l'orthographe d'un nom à l'emploi du temps d'un personnage, en passant par une relation ou un détail personnel. Lire du YAML brut pour ça est pénible. Le site de lecture doit donc rendre ces données lisibles et faciles à fouiller.

Ces données révèlent la solution. Le lien du site se partage, et un lecteur ne doit pas tomber dessus par accident. La barrière sert uniquement à éviter le spoil involontaire : quelqu'un qui la contourne en fouillant a accepté d'être spoilé.

Deux autres manques sur le site : la page d'accueil ne dit pas ce qu'est le projet, et rien ne prévient que les notes de travail peuvent révéler l'intrigue.

Enfin, côté livre, le lieu et la date en tête de chapitre sont aujourd'hui tapés dans la première phrase (`\debut{B}{elgravia}, Londres, 27 novembre 1890.`). Il leur faut une commande dédiée, avec une vraie mise en page.

## Objectifs

1. Une section « Bible » du site qui rend `bible/` : recherche dans tout le contenu, une page par personnage, des vues par fichier.
2. Un nouveau fichier YAML ajouté à `bible/donnees/` apparaît sur le site sans modification du code.
3. Un avertissement anti-spoil avant d'entrer dans la bible, avec une entrée discrète depuis l'accueil.
4. Une courte présentation du projet sur l'accueil, en texte provisoire avec un TODO.
5. Un avertissement visible sur l'interrupteur « Notes de travail » et sur le PDF brouillon.
6. Une commande `\lieudate{lieu}{date}` rendue en deux lignes, dans le PDF comme sur le site.

## Non-objectifs

- Pas de versions pour la bible : seul compte l'état du dernier commit (demande d'Antoine). L'historique du roman ne bouge pas.
- Pas d'édition depuis le site.
- Pas de vraie sécurité : les données restent lisibles par qui fouille les fichiers du site.
- Pas de plan de la maison dessiné à partir des coordonnées de `maison.yaml`. Le PDF existant suffit pour l'instant *(choix de Claude)*.
- Pas de traduction du contenu de la bible : il reste en français, seule l'interface suit la langue du site.
- `bible/sources/london-herald.tex`, `bible/lieu/gen.py`, `bible/lieu/maison_whitmore.tex` et `bible/verifier.py` ne sont pas rendus.
- On n'ajoute pas `verifier.py` à la CI dans ce chantier.

## Anti-objectifs

Le chantier est raté, même s'il fonctionne, si :

- un visiteur peut lire un spoiler sans l'avoir accepté : dans le HTML pré-généré, dans les données que SvelteKit sérialise dans la page, dans le bundle JavaScript, dans un aperçu de moteur de recherche ou par préchargement au survol ;
- ajouter un fichier YAML, ou un champ dans un fichier existant, oblige à toucher au code du site ;
- les tests figent le texte vivant du roman ou de la bible (règle du dépôt, voir `CLAUDE.md`) ;
- la conversion d'un chapitre touche à la prose d'Antoine au-delà du déplacement mécanique décrit plus bas.

## Contraintes du dépôt

À respecter (détails dans `CLAUDE.md`) :

- SvelteKit 3 : la config est dans `web/site/vite.config.ts`, les imports passent par `#lib/*` et on utilise `$app/env`.
- L'adaptateur statique est en `strict: true` : chaque route est pré-générée ou la construction échoue.
- Toute nouvelle commande de `murderparty.sty` utilisée dans les parties doit avoir son entrée dans `web/converter/src/vocabulary.ts` et un rendu dans `web/site/src/lib/render/registry.ts`. Sinon, la conversion échoue et la publication est bloquée.
- Les tests exacts s'appuient sur des fixtures figées. Les e2e tirent leurs attentes des données construites dans `web/site/static/data` et des sources.
- `npm run data` lit l'arbre de travail et `npm run data:ci` lit `HEAD`. La bible suit la même règle : en local, les modifications non commitées apparaissent ; en CI, seul le commit compte.
- Thèmes « papier », « sépia » et « sombre » : n'utiliser que les variables de thème (`--ink`, `--bg`, `--accent`, `--rule`, `--doc-paper`, `--bg-panel`, …). Toutes les couleurs ajoutées doivent rester lisibles dans les trois thèmes.
- Le site doit être utilisable à la largeur d'un téléphone, sans défilement horizontal de la page entière. Une grille large peut défiler dans son propre cadre.

## 1. La bible sur le site

### Ce qui est lu

- Tous les `bible/donnees/*.yaml`, plus `bible/lieu/maison.yaml`.
- `bible/bible.md` et `bible/notes-de-scene.md`.
- `bible/lieu/maison_whitmore.pdf`, copié pour être téléchargé depuis la vue Maison.

La lecture passe par la même fonction que le reste de `build-data` : fichier sur disque en mode `--working-tree`, sinon `git cat-file blob HEAD:…`. Pour lister les fichiers de `HEAD`, utiliser `git ls-tree`.

S'il n'y a pas de `bible/` (cas d'un commit ancien ou de la fixture), il n'y a ni données de bible ni lien sur l'accueil, et la construction ne doit pas échouer *(choix de Claude)*. À noter : les fichiers de `bible/` sont aujourd'hui indexés mais pas encore commités. Tant qu'ils ne le sont pas, la CI publie un site sans bible.

Un YAML illisible fait échouer `build-data` avec le fichier et la ligne, comme une commande LaTeX inconnue *(choix de Claude)*.

### Les données produites

`build-data` écrit un fichier de données de la bible à part, par exemple `data/bible.json`, chargé seulement par le navigateur et seulement après l'accord. Il contient, pour chaque fichier :

- son chemin relatif à `bible/` ;
- un titre tiré du nom de fichier (`reperes-historiques.yaml` → « Repères historiques ») ;
- pour un YAML : le commentaire d'en-tête (les lignes `#` avant la première clé, qui expliquent les codes), sans les `# ` de début de ligne, et les données analysées ;
- pour un Markdown : le HTML rendu à la construction et le texte découpé par section pour la recherche.

Le format exact est laissé au constructeur. Il passe par un schéma zod dans `@rmp/model`, comme le reste.

Le contenu vient du dépôt d'Antoine. On peut donc insérer le HTML du Markdown tel quel.

### La barrière anti-spoil

- **L'entrée.** Un petit lien en bas de l'accueil, sous la date de mise à jour, en dehors des boutons. Par exemple « Bible de l'auteur (révèle la solution) » ; en anglais, « Author's bible (reveals the solution) ».
- **L'avertissement.** Toute adresse de la section, y compris un lien direct vers la page d'un personnage, affiche d'abord un écran qui dit en clair que la suite révèle le coupable, la cible et la victime. Pour entrer, il faut cocher « J'accepte d'être spoilé », puis cliquer sur « Ouvrir la bible ». Le bouton reste désactivé tant que la case n'est pas cochée.
- **La mémoire.** L'accord est retenu dans `localStorage`, sous une clé du style `rmp.bible.v1`, comme `rmp.position.v1`. Chaque accès est entouré d'un try/catch : si le stockage est bloqué, l'accord vaut pour la page en cours et sera redemandé à la visite suivante.
- **La sortie.** Un bouton « Refermer la bible », visible dans la section, efface l'accord et ramène à l'accueil.
- **Rien avant l'accord.** Le HTML pré-généré des routes de la bible ne contient aucune donnée de la bible : ni dans le texte, ni dans les données de `load` que SvelteKit sérialise dans la page. Le JSON de la bible n'est pas importé dans le bundle : il est récupéré par `fetch` côté navigateur, après l'accord. Comment y parvenir est laissé au constructeur. Une piste : une coquille pré-générée sans rendu serveur (`ssr = false`) et une navigation interne par paramètres d'URL.
- **Les moteurs de recherche.** Les pages de la section portent `<meta name="robots" content="noindex">`.

### L'accueil de la section

1. Une recherche en haut, avec le focus dessus à l'ouverture.
2. Les personnages, groupés comme dans `personnages.yaml` (`personnages`, puis `absents_et_figurants`), avec un lien vers la page de chacun.
3. Les vues : une entrée par fichier YAML, plus « Bible » et « Notes de scène » pour les deux Markdown.
4. Le bouton « Refermer la bible » et un retour vers l'accueil du site.

### La recherche

- Elle fouille toutes les chaînes de tous les YAML et le texte des deux Markdown.
- Elle ignore la casse et les accents, et filtre pendant la frappe à partir de deux caractères.
- Un identifiant à trois lettres compte aussi pour le nom du personnage : chercher « Florence » trouve les entrées où figure `FLO`.
- Chaque résultat indique le fichier, le titre de l'entrée et un extrait avec le terme surligné. Il mène à l'ancre de l'entrée dans sa vue, ou à la section du Markdown.
- Pas de bibliothèque obligatoire : à cette taille (environ 3 300 lignes), une recherche par sous-chaîne sur un index préparé suffit.

### La page d'un personnage

Les identifiants viennent de `personnages.yaml` : les `id` de `personnages` et ceux de `absents_et_figurants`, comme dans `verifier.py`. La page montre, dans l'ordre :

1. **L'identité.** Tous les champs de son entrée dans `personnages.yaml`, y compris ceux qui seront ajoutés plus tard, en commençant par le nom.
2. **Les relations, dans les deux sens.** D'un côté ce qu'il pense des autres (`de` = lui), de l'autre ce que les autres pensent de lui (`vers` = lui). Chaque ligne donne la valence en couleur, le libellé, la note et la source, et signale `ambivalent` et `source: deduit`.
3. **Sa soirée.** Ses événements de `chronologie.yaml`, triés par phase, avec heure, statut et source. Les phases où il n'a rien sont signalées comme des trous. Les événements `tous` s'y ajoutent.
4. **Les autres fichiers, de manière générique.** Pour chaque autre YAML, les entrées de ses listes de premier niveau qui le mentionnent, rendues comme dans la vue générique. Une entrée le mentionne si l'une de ses valeurs (y compris dans les listes et les objets imbriqués) vaut son identifiant ou `suit:<ID>`. C'est ce qui fait apparaître sans code ses invitations, son vote, ses intrigues, et demain tout nouveau fichier.
5. **Ses notes de scène.** Les sections `##` de `notes-de-scene.md` qui le nomment.
   - Un titre correspond à un personnage s'il contient l'une des formes de son `usuel` (segments séparés par `,` ou `;`, sans le surnom entre « ») ou un mot de son `nom` qu'aucun autre personnage ne porte.
   - Exemples attendus : « Blackstone » va à Sir Edmund, « Monica et Reginald » va aux deux Fairfax, et « Lady Whitmore » va à elle seule, pas à Evangeline.
   - Une section qui ne correspond à aucun personnage reste visible dans la page « Notes de scène ».

### Les vues dédiées

Chacune vérifie d'abord la forme du fichier. Si les clés attendues manquent, la vue générique prend le relais, sans erreur.

- **Chronologie** (`phases`, `evenements`, `groupes`)
  - Une grille : les personnages en lignes, dans l'ordre et avec les intertitres de `groupes`, puis tous ceux qui n'y figurent pas ; les phases en colonnes (identifiant et titre ; le résumé en infobulle ou sous le titre).
  - Chaque case liste les événements du couple personnage × phase : `heure`, `quoi`, et la `source` si elle existe. `qui` et `phase` peuvent être des listes (`verifier.py` les accepte) : l'événement apparaît alors dans chaque case concernée. Le `statut` se voit à la mise en forme : `decide` en texte normal, `piste` et `propose` distingués et étiquetés, en lisant la légende de l'en-tête.
  - Une case vide est marquée comme trou. Une ligne « Tous » porte les événements de `tous`.
  - Les autres clés (`debut_reception`, `heures_absolues`, `a_placer`, `flottants`, `meteo`, `lieux_fixes`, et toute clé future) sont rendues sous la grille par le moteur générique.
  - Sur un téléphone, la grille défile dans son cadre, avec la colonne des noms et la ligne des phases fixées. Une bascule vers une liste « par phase » est acceptable à la place *(choix laissé au constructeur)*.
- **Relations** (`relations` avec `de`, `vers`, `valence`)
  - Une matrice : celui qui pense en ligne, celui qui est pensé en colonne. La couleur de chaque case suit la valence, de −2 à +2, sur une échelle divergente lisible dans les trois thèmes. Une case vide veut dire que les sources ne disent rien.
  - Survoler, toucher ou donner le focus à une case affiche le libellé, la note, la source et l'ambivalence.
  - Sur un téléphone, même règle de défilement que la chronologie.
- **Maison** (`niveaux` avec `pieces`)
  - Un niveau par section : `titre`, `hauteur`, `intro`, puis les pièces avec leur numéro, leur nom, leur catégorie et leur description.
  - `rect`, `portes`, `tikz_extra` et `etiquette` servent au générateur TikZ : on ne les affiche pas.
  - En tête, un lien vers le PDF des plans.
  - Le numéro de pièce (`S3`) sert d'ancre, pour que la recherche y mène.

### La vue générique

Elle sert pour tout YAML sans vue dédiée, et pour les parties d'un fichier qu'une vue dédiée ne couvre pas.

- **En tête**, la légende tirée du commentaire d'en-tête, repliable.
- **L'ordre** est celui du fichier, pour les clés comme pour les entrées.
- **Une clé de premier niveau** devient une section avec un intitulé lisible : les `_` deviennent des espaces et la première lettre passe en majuscule. Une table de libellés facultative peut rétablir les accents des clés connues (`raison_cachee` → « Raison cachée »). Une clé absente de la table s'affiche quand même.
- **Une liste d'objets** devient une suite de fiches. Le titre d'une fiche est la première clé présente parmi `titre`, `nom`, `sujet`, `qui`, `id` ; les autres champs suivent en paires libellé/valeur. Chaque fiche a une ancre stable (son `id` s'il existe, sinon sa position).
- **Les valeurs simples.**
  - Une chaîne égale à un identifiant devient un lien vers le personnage, avec son nom d'usage, et `suit:SER` s'affiche « suit Seraphina ». Un identifiant inconnu s'affiche tel quel, sans faire échouer la construction : c'est le travail de `verifier.py`.
  - Une URL devient un lien.
  - Les booléens s'affichent oui/non ; `null` et les chaînes vides ne s'affichent pas.
  - Une liste de valeurs simples s'affiche en ligne, séparée par des virgules.
  - Un objet imbriqué devient une liste de définitions imbriquée.
- **Les champs de statut**, au moins `statut`, `etat`, `triplet`, `source`, `vote` et `role_recit`, s'affichent en petites étiquettes. La liste exacte est laissée au constructeur.

### Les deux pages Markdown

`bible.md` et `notes-de-scene.md` sont rendues comme des pages de texte, avec la typographie du site et des ancres sur les titres. Leurs liens relatifs vers d'autres fichiers de `bible/` deviennent, quand c'est possible, des liens vers la vue correspondante. Sinon, ils restent du texte.

## 2. La présentation sur l'accueil

- **Le fichier.** Le texte vit dans `presentation.md` à la racine du dépôt *(choix de Claude : Antoine le modifie sans toucher au code)*. Il est lu par `build-data` avec la même règle `HEAD`/arbre de travail que la bible, et rendu en HTML à la construction.
- **La place.** Sur l'accueil, entre l'auteur et les boutons, en `lang="fr"`, sur une largeur d'environ 30 em, sans casser la mise en page centrée de la couverture. Sans fichier, rien ne s'affiche.
- **Le texte provisoire**, à remplacer par Antoine, porte un commentaire `<!-- TODO : … -->` invisible sur le site *(choix de Claude)*. Il tient en deux ou trois phrases factuelles, sans rien révéler de l'intrigue : un roman en cours d'écriture, tiré d'une murder party, à Londres le 27 novembre 1890, pendant une réception à Belgravia, avec un narrateur différent pour chaque partie et un premier jet encore mouvant.
- **La langue.** Il n'existe qu'en français, y compris quand l'interface est en anglais.

## 3. L'avertissement sur les notes de travail

- Dans le menu Aa (`SettingsMenu.svelte`), une ligne de texte discrète sous l'interrupteur « Notes de travail », reliée à lui par `aria-describedby` : « Peuvent révéler des éléments de l'intrigue. » En anglais : « May reveal plot points. »
- On a choisi une ligne toujours visible plutôt qu'une infobulle au survol, parce que le survol n'existe pas sur téléphone.
- Même mention, plus petite, sous « Version brouillon, avec notes » dans le menu PDF (`DownloadMenu.svelte`).
- Les nouvelles chaînes vont dans `web/site/src/lib/i18n/fr.ts` et `en.ts`.

## 4. La commande `\lieudate`

### Dans le livre

- `\lieudate{lieu}{date}`, définie dans `murderparty.sty`, dans la section « Chapitres ». Elle s'utilise juste après `\chapitre{…}`.
- **Le rendu**, centré sous le titre :
  - le lieu en petites capitales espacées et en `mpsepia` (même procédé que `\mp@spaced`) ;
  - un court filet sépia centré ;
  - la date en italique.
- L'espace qui suit doit se raccorder proprement au premier paragraphe, lettrine comprise. Pas de saut de page entre le bloc et le texte.
- Les deux arguments acceptent n'importe quel texte, notes comprises (`188? \areprendre{…}`). Si l'un est vide, seule l'autre ligne s'imprime, sans filet.
- Commentaire d'usage dans le `.sty`, avec les autres. Ajouter la commande à la syntaxe du `README.md`, aux conventions de `CLAUDE.md` et aux « Rappels d'écriture » en tête de `parties/ouverture.tex`.

### Dans le site

- `vocabulary.ts` : `lieudate: ['m', 'm']` parmi les commandes de bloc.
- `blocks.ts` émet un nouveau bloc, par exemple `{ type: 'dateline', id, place: Inline[], date: Inline[] }` *(nom de type au choix du constructeur)*. Il faut l'ajouter à `Block`, `BlockSchema` et `BLOCK_TYPES` dans `@rmp/model`.
- Un composant `Dateline.svelte` dans `registry.ts` reproduit le rendu du PDF : lieu en petites capitales espacées couleur accent, filet, date en italique. Il fonctionne en mode défilement et en mode paginé. Le mode « pages du livre » montre déjà le PDF.
- Dans la visibilité, un argument qui ne contient que des notes compte comme vide quand les notes sont masquées.

### La conversion des deux chapitres existants

Changement mécanique, sans toucher aux phrases :

- **« Valse (provisoire) »**
  - `\lieudate{Belgravia, Londres}{27 novembre 1890}` se place juste après `\chapitre{…}` et son commentaire `%`, avant le `\noteauteur`, pour que le lieu et la date suivent le titre dans le brouillon *(choix de Claude)*.
  - La ligne `\debut{B}{elgravia}, Londres, 27 novembre 1890.` disparaît.
  - La phrase suivante prend la lettrine : `\debut{A}{lors} que les neuf coups…`.
- **« Seule »**
  - `\lieudate{Whitechapel, Londres}{188? \areprendre{Definir la date}}` se place au même endroit. La note d'Antoine passe dans l'argument de date, qu'elle concerne *(choix de Claude)*. Laissée sur sa propre ligne, elle s'imprimerait devant la lettrine dans le brouillon.
  - La ligne `\debut{W}{itechapel}, Londres, 188?.` disparaît.
  - `Cela faisait…` devient `\debut{C}{ela} faisait…`.

## Tests

- **Convertisseur ou module de la bible (vitest).**
  - Une fixture figée `bible/` dans les fixtures de test, avec un YAML de chaque forme, plus un fichier inconnu pour prouver le rendu générique.
  - Points à couvrir : la lecture `HEAD` et l'arbre de travail, le commentaire d'en-tête, l'erreur sur un YAML illisible, la bible absente, le découpage des Markdown.
  - `\lieudate` : le bloc produit, une note dans un argument, l'erreur si un argument manque. Ajouter un `\lieudate` à la fixture du livre (`web/converter/test/fixtures/book/`) et mettre à jour les instantanés.
  - Attention : `parties/ouverture.tex` de cette fixture porte une modification non commitée d'Antoine (david → marcus dans des commentaires). Elle ne doit pas être écrasée.
- **Site (vitest).** Normalisation et résultats de la recherche, mentions d'un identifiant (`suit:`, listes, objets imbriqués), appariement des notes de scène, repli d'une vue dédiée sur la vue générique quand la forme ne convient pas.
- **e2e (Playwright).** Toutes les attentes sont tirées des données construites ou des sources, jamais du texte vivant.
  - Le lien de l'accueil mène à l'avertissement.
  - Le bouton reste inactif tant que la case n'est pas cochée.
  - L'accord est retenu après rechargement, et « Refermer » le révoque.
  - Le HTML brut d'une route de la bible, récupéré sans JavaScript, ne contient aucune valeur `secret` de `personnages.yaml`.
  - La page d'un personnage montre ses relations dans les deux sens.
  - La recherche trouve un terme tiré des données.
  - Les notes de travail affichent leur avertissement.
  - La présentation s'affiche quand `presentation.md` existe.
  - Le lieu et la date d'un chapitre s'affichent quand le modèle en porte.

`npm run ci` doit passer.

## Documentation et passation

- **`CLAUDE.md`** : `\lieudate` dans les conventions ; la section bible du site dans « Reader site » ; `presentation.md`.
- **`bible/README.md`** : la piste « le site pourrait lire ces YAML » est réalisée.
- **`docs/agents/passation.md` et `journal.md`**, en fin de session :
  - la bible est publiée derrière un avertissement, et non passée en dépôt privé ;
  - le lieu et la date passent par une commande de tête de chapitre. L'ancienne décision « sans en-têtes de lieu ou d'heure par scène » reste valable pour les scènes.

## Laissé au constructeur

- Où vit le code qui lit la bible : `@rmp/converter`, un nouveau module de `web/` ou `web/scripts`.
- La forme exacte du JSON et les noms des types.
- Les bibliothèques YAML et Markdown. Il faut une bibliothèque YAML capable de lire les commentaires.
- Le routage côté navigateur de la section, dans le respect de « rien avant l'accord ».
- Le style des vues, dans la typographie du site.
- Le détail des espacements LaTeX de `\lieudate`.
