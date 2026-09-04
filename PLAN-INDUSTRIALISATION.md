# Plan d'industrialisation UCM — v5

> Toutes les affirmations factuelles de ce plan ont été vérifiées dans le code.
> Trois revues indépendantes ont corrigé les versions précédentes ; leurs
> conclusions ont elles-mêmes été revérifiées dans le code avant d'être
> intégrées — et l'une d'elles s'était trompée.

## Pour qui exécute ce plan

Cinq règles de travail. Elles ne sont pas des préférences de style : chacune
répond à une erreur réellement commise pendant la préparation de ce plan.

**1. Vérifier dans le code, jamais dans la documentation.**
Ce projet a une documentation dense, précise et par endroits **périmée** : le
code a dépassé des règles qui étaient vraies quand elles ont été écrites. Neuf
contradictions sont recensées en fin de document, dont plusieurs dans des
fichiers qu'un agent lit d'abord. Un exemple parmi d'autres : `AGENTS.md` du
Playground affirme que `tokens.json` fait foi pour l'existence des références,
alors que le contrôle lit la sortie CSS de Style Dictionary. Croire le document
conduit à bâtir sur une propriété que le code ne tient pas.
**Avant de traiter une règle documentée comme acquise, ouvrir le fichier qu'elle
décrit.**

**2. Ne jamais déplacer et réécrire dans le même geste.**
Un déplacement se vérifie mécaniquement ; une réécriture demande du jugement.
Mêler les deux rend l'ensemble invérifiable, et c'est ainsi qu'on perd une règle
sans le voir. La séparation est déjà inscrite dans trois tâches — T2.1 puis
T2.1b pour les validateurs, T5.1 puis T5.2 pour le rapport, les deux temps de
T8.1 pour la spécification. Elle vaut partout ailleurs.

**3. Une tâche, une session, un résultat écrit.**
Pas de longue session continue. Si une session ne peut pas démarrer du seul
plan, c'est le plan qu'il faut corriger — c'est une information utile, pas un
échec.

**4. Les conclusions d'une revue se vérifient dans le code avant d'être
intégrées.**
Une revue indépendante trouve des choses réelles, et se trompe aussi. Sur ce
plan, une revue a conclu que la règle de collision d'identifiants était une
convention TypeScript discutable ; le code montrait que c'est une contrainte de
nom de fichier dont le plugin dépend déjà. La conclusion inverse aurait été
intégrée sans vérification.

**5. Pas de numéro de ligne pour de la prose documentaire.**
Les titres de section suffisent et ne bougent pas. La v3 de ce plan citait
`PISTES-EVOLUTION.md:189` ; une modification faite le même jour avait déplacé la
ligne à 228. Les numéros de ligne ne sont conservés que pour le code.

---

## Préalable — protéger contre la documentation périmée

**À faire avant tout le reste, y compris la Phase A.** Coût : moins d'une heure.

Le risque est concret et déjà mesuré : neuf contradictions doc ↔ code, dont
plusieurs dans `AGENTS.md`, c'est-à-dire le premier fichier qu'un agent ouvre.
La règle 1 ci-dessus ne protège que celui qui lit ce plan ; elle ne protège pas
celui qui ouvre `AGENTS.md` et le croit — donc elle ne protège presque personne.

- [X] **T0.1 — Baliser chaque règle périmée à sa source.** *Fait.* Huit balises
      posées, marquées `BALISE-PERIMEE` pour être greppables. Deux dans le code
      (`verdict-bilan.mjs`, `check-contract.mjs`), six dans les documents
      (`Playground/AGENTS.md` ×2, `CHANGELOG-CONTRAT.md`, skill
      `consommer-contrat`, `Exporter/AGENTS.md`, `PISTES-EVOLUTION.md`).
      Chacune a été vérifiée dans le code avant d'être écrite, et l'une d'elles
      a dû être corrigée après vérification : `src/github.ts` n'est pas une
      troisième autorité sur l'identifiant, seulement un appelant de
      `codeIdentifier`. Il y en a **deux**, pas trois — et **trois**
      projections de nom de token, elles bien distinctes.
      Poser, **à l'endroit exact où la règle fausse est écrite**, une marque
      courte qui dit ce que le code fait réellement et renvoie à ce plan. Pas
      une correction — la correction viendra avec la tâche qui traite le fond —
      mais un avertissement là où le lecteur se ferait piéger.
      La table finale en recense neuf, dont **huit portent une adresse** — deux
      sont des commentaires de code (`verdict-bilan.mjs`,
      `check-contract.mjs`), les six autres des documents. La neuvième est d'une
      autre nature : c'est une **absence**, aucun document ne déclarant la
      projection de nom de token comme un invariant à propriétaire unique. Elle
      ne se balise pas, elle s'écrit — dans l'invariant que T6.0 crée.

- [X] **T0.2 — Renvoyer vers ce plan depuis les points d'entrée.** *Fait*, dans
      les quatre fichiers. Le renvoi se déclare lui-même balise, pour partir
      avec la dernière au lieu de survivre en pointant vers une table vide.
      `AGENTS.md` et `CLAUDE.md` des deux repositories mentionnent l'existence
      de ce plan et de sa table de contradictions. Un agent qui suit l'ordre de
      lecture prescrit tombe alors sur l'avertissement avant de lire les règles.

- [X] **T0.3 — Retirer chaque balise quand sa contradiction est résolue.**
      *Mécanisme en place, et déjà exercé deux fois :* chaque balise nomme la
      tâche qui la retire. Celle de `CHANGELOG-CONTRAT.md` est partie avec sa
      cause dans le commit de la Phase A, celle de `check-contract.mjs` avec D1.
      **Reste six**, plus les quatre renvois des points d'entrée, qui se
      déclarent balises et partent avec la dernière.
      Une balise qui survit à sa cause devient elle-même une information
      périmée. Chaque tâche qui corrige une contradiction retire la balise
      correspondante **dans le même commit**, et T8.8 vérifie qu'il n'en reste
      aucune.

*Pourquoi ce préalable et pas seulement la règle 1 :* pendant tout le temps où
le plan s'exécute, les documents restent faux. Les corriger au fond demande les
tâches des phases 2 et 8 ; les baliser demande une heure et protège
immédiatement.

## Cible

Un repository quelconque, quelle que soit sa techno, reçoit des contrats UCM et
les fait vérifier sans qu'un développeur écrive une ligne d'outillage. Le projet
doit pouvoir être remis à d'autres personnes.

### Critère de réussite — le test du repo vierge

Un repo GitHub neuf, un dossier `components/`, rien d'autre :

1. une commande d'initialisation, moins de 15 minutes, zéro ligne à la main ;
2. un export depuis Figma ouvre une PR ;
3. la CI publie un rapport lisible par un designer ;
4. un contrat d'une version non lue est refusé avec un message qui dit **qui**
   corrige ;
5. une référence de token disparue avertit sans bloquer ;
6. l'absence d'implémentation est un état d'avancement, pas une erreur ;
7. un contrat réellement cassé bloque.

### Les trois règles de tri

1. **Ce qui décrit le FORMAT voyage avec le format**, publié par le producteur.
2. **Ce qui décrit le REPO reste dans le repo, en configuration.**
3. **Ce qui décrit la STACK est un adaptateur optionnel — et le noyau doit être
   utile seul.**

---

## Phase A — Refermer l'écart 11.0 / 12.0

**Rien d'autre ne peut commencer avant.** Le producteur écrit du 12.0
(`exportComponent.ts:49`), le consommateur ne lit que du 11.0
(`version-contrat.mjs:27-28`), les deux copies du schéma ont divergé, et le
corpus est en 11.0. Tant que l'écart tient, brancher le lecteur du consommateur
dans les tests du moteur (T2.5) ferait rougir toute la suite : le moteur
fabrique du 12.0, le lecteur refuse le 12.0.

- [X] **A1 — Auditer les quatre changements de la 12.0** dans les lecteurs.
      La spécification les nomme : `ChildStructure.inset` (la place d'un calque
      hors du flux), `rotation` (sur le composant et sur chaque calque publié),
      `rendering.keyRoles` (le rôle d'une clé de couleur qui n'en porte pas le
      nom), et `rendering.roles` qui devient strictement le vocabulaire partagé,
      sans copie de descripteur par clé observée.
      *Bonne nouvelle vérifiée :* `champsInvalidesDuContrat` accepterait
      probablement un contrat 12.0 tel quel — `capacitesDuContrat`
      (`validation-contrat.mjs:117-166`) ne valide que des champs nommés, ne
      pose jamais `additionalProperties`, et `catalogues110` reste vrai en 12.0.
      Le seul refus vient de `verdictDeVersion`. Le travail est un audit, pas
      une réécriture.
      **Mais l'audit doit rendre une décision écrite, pas un constat.** Le
      validateur rend `[]` sur un contrat 12.0 **parce qu'il ne contrôle rien**
      des trois nouveautés : `inset`, `rotation` et `keyRoles` n'ont aucune
      validation côté consommateur. Or `AGENTS.md` de l'Exporter déclare la
      résolution `roles[keyRoles[côté][clé] ?? clé]` comme une loi vérifiée sur
      chaque contrat — côté producteur uniquement. À la sortie de A1, deux
      réponses possibles et il faut en écrire une : trois validateurs, ou
      « accepté sans contrôle, assumé ». Le silence serait lu comme une
      couverture qui n'existe pas.

      **Décision rendue : trois validateurs.** Et une découverte que le plan
      n'attendait pas.

      *Ce que l'audit a mesuré, sur les quatre contrats 12.0 réels :* trois sont
      acceptés tels quels, comme prévu. **StressTest est REFUSÉ**, sur
      `icons.skull.slot`. La cause n'est pas la 12.0 : `validerIcones` cherchait
      le slot dans la seule projection de référence, alors que ce champ existe
      pour situer une icône que le variant de référence ne contient PAS — son
      propre commentaire le disait, son code faisait l'inverse. L'autorité côté
      producteur (`tests/lois.ts`) balaie `viewStructures` en entier. Défaut
      latent depuis la 11.0, révélé par le premier contrat à porter une icône
      confinée à un variant non-référence. Corrigé, avec ses deux tests.

      *Pourquoi contrôler plutôt qu'assumer, champ par champ :*
      - `inset` rejoint `position` et `constraints`, que le lecteur vérifie
        **déjà** depuis la 6.0. Un membre de la famille sans contrôle serait un
        oubli, pas une politique.
      - `rotation` part telle quelle dans un `transform`. Mal formée, elle
        produit un CSS que le navigateur ignore sans erreur ni repli — la perte
        visuelle muette que `tokenVar` existe déjà pour empêcher ailleurs.
      - `keyRoles` est un **renvoi**, pas une valeur : `roles[keyRoles[côté][clé]
        ?? clé]` rend `undefined` pour un rôle absent de `roles`, et la couleur
        disparaît sans un mot. Tous les autres renvois du contrat sont vérifiés
        par ce fichier.
      - `rendering.roles` ne demande rien : la 12.0 lui RETIRE des copies de
        descripteur, et le contrôle « c'est un objet » n'en est pas affecté.

      *Un point de méthode qui servira à T2.1b :* les trois contrôles vivent
      dans `champsInvalidesDuContrat11`, pas dans la passe matérialisée. Celle-ci
      réécrit `meta.contractVersion` en « 10.3 », où une capacité « au moins
      12.0 » serait toujours fausse et le contrôle toujours muet. Un test tient
      cette raison, et c'est la même que T2.1b devra respecter en élaguant.
- [X] **A2 — Réexporter le corpus** des quatre composants en 12.0. C'est fait, il faut peut être pull le playground pour voir les derniers contrats de composant. Pas besoin de regénérer les .tsx des composants pour le moment
- [X] **A3 — Recopier le schéma 12.0**, une dernière fois à la main. *Fait.*
- [X] **A4 — Monter les constantes**, en dernier, comme le veut la procédure
      existante. *Fait, dans le même commit que A3* : `schema-contrat.test.mjs`
      exige que la version décrite par la copie vendue soit
      `VERSION_CONTRAT_MAXIMALE`, donc séparer les deux laisserait le repository
      rouge entre les deux commits. La plage reste refermée — D8 l'ouvrira, mais
      c'est T2.1b qui l'exécute.

**État à la sortie de la Phase A.** Les deux repositories sont sur `main`,
poussés, tests verts des deux côtés (433 et 198). Une chose reste rouge et c'est
voulu : `npm run build` du Playground échoue sur `StressTest.tsx`, à qui il
manque le variant « warning ». Ce variant n'existait pas en 11.0 — il vient de
Figma, par le réexport A2 —, le composant est une sonde jetable, et A2 a
explicitement écarté sa régénération. C'est un état d'avancement, pas une
régression ; il se referme par une reconstruction à froid.

C'est le rituel habituel, joué une dernière fois manuellement. Tout le reste du
plan existe pour qu'il ne se rejoue jamais à la main.

---

## Phase 0 — Arbitrages

- [X] **D1 — Le contrôle « tokens écrits dans le code » sort du périmètre.**
      *Exécuté*, en un seul geste : 364 lignes retirées, deux fichiers
      supprimés, neuf tests, quatre passages de documentation et le message
      terminal final. La liste de la v5 était juste, à un détail près — le
      message final valait bien la peine d'être cité, il affirmait « tokens du
      code vérifiés contre leur contrat » et serait devenu faux.
      `sectionTokensManquants` est intact, et c'était le point.
      Il relève d'un linter, projet distinct.
      **Ce que ça emporte, liste complète et vérifiée :** `tokens-du-code.mjs`
      (149 l.) et son test (3,4 Ko) ; `diagnosticReferencesCodeNonDeclarees`
      (`diagnostic-tokens.mjs:71-110`, les deux seuls `severity: "error"` du
      fichier) ; `ajouterTokensDuCode` ; dans `references-token.mjs` les exports
      `DEBUT_DE_REFERENCE`, `voisinesDeclarees` **et `cheminParent`**, dont le
      seul appelant est `voisinesDeclarees` ; l'import `TITRE_AVERTISSEMENTS` de
      `diagnostic-tokens.mjs` ; **onze** sites dans `check-contract.mjs`
      (`:70`, `:86`, `:287-315`, `:317`, `:326`, `:447`, `:504-509`, `:594-603`,
      `:611`, `:613-618`, `:658`) — la v4 en annonçait huit et en listait neuf ; 5 tests de `diagnostic-tokens.test.mjs`, 4 de
      `references-token.test.mjs` ; quatre passages de documentation dans
      `AGENTS.md` et `README.md` du Playground ; et le message terminal final
      (`check-contract.mjs:660-662`), qui affirme « tokens du code vérifiés
      contre leur contrat » et deviendrait faux.
      **Ce que ça ne touche pas, vérifié :** `sectionTokensManquants`
      (`severity: "warning"`), le contrôle qui compare les références du
      **contrat** aux tokens réels. C'est celui qui protège le design.
      *Effet de bord favorable :* c'était le dernier contrôle bloquant dépendant
      de TypeScript.

- [x] **D2 — Le kit cesse de faire dépendre son code de sortie des tests du
      repo hôte.** La CI fait déjà ce travail. On garde le canal d'entrée (la CI
      transmet, le kit affiche) et on retire le terme de la condition de sortie.
      *À confirmer explicitement dans la tâche, sinon quelqu'un les nettoiera
      par symétrie :* `rapportMarkdown` (`:326`) et `abandonner` (`:481`)
      continuent d'afficher les échecs. C'est voulu.

- [x] **D3 — La collision d'identifiants reste bloquante et universelle**, mais
      **le garde-fou existant ne peut pas la voir** — voir T4.3.
      Portabilité : l'identifiant est l'**identité de l'artefact**. Il nomme le
      fichier de contrat et joint les contrats entre eux (`composes`). Il
      n'impose pas le nom du fichier d'implémentation, résolu par un motif
      configurable (T2.2).

- [x] **D4 — Monorepo npm workspaces**, avec la coupure révisée de T1.0.

- [x] **D5 — La doctrine « rien à publier tant qu'un seul repository consomme »
      est révisée, pas supprimée.** Section « Extraction multi-repository » de
      `PISTES-EVOLUTION.md`. Sa seconde moitié — « conserver une seule autorité
      pour les conventions de version, d'identifiant et de références de
      tokens » — reste vraie et n'est pas tenue aujourd'hui. Le passage au
      paquet doit la réaliser.

- [x] **D6 — L'arbitrage sur la publication du plugin est documenté.** Fait,
      dans `PISTES-EVOLUTION.md §2`.

- [X] **D7 — Version du paquet : réduit.** Un pin **exact** (une version
      figée, sans `^`) suffit jusqu'au deuxième consommateur.
      Les `dist-tag` par version de contrat et l'export `VERSIONS_LUES` sont la
      bonne réponse, mais deux repos trop tôt : les ouvrir quand un deuxième
      consommateur existe. Ce qui compte dès maintenant : `ucm init` écrit une
      version exacte, jamais un `^`.

- [x] **D8 — La fenêtre de lecture est de deux versions : la courante et la
      précédente.** Décidé. Le moteur approche de la stabilité ; une fois
      stable, les versions cessent de bouger, et supporter davantage que « une
      version de retard » n'a pas d'objet. La plage lue par `verdictDeVersion`
      et la plage acceptée par `champsInvalidesDuContrat` deviennent **la même
      donnée**. Exécutant : T2.1b.

- [x] **D9 — Le plugin refuse un export qui provoquerait une collision.**
      Refuser bloque le designer et l'oblige à renommer dans Figma ; avertir
      laisserait passer une perte de données silencieuse, c'est-à-dire
      exactement le défaut qu'on corrige. Exécutant : T4.3.

- [X] **D10 — Nommage du paquet. Tranché : `@ucm/kit`.**
      *Vérifié sur le registre au moment de trancher :* `ucm` est pris (2.2.0),
      `ucm-kit`, `ucm-contract` et `unified-component-model` sont libres,
      `@ucm/kit` rend 404. Le scope l'emporte parce qu'il réserve tout l'espace
      `@ucm/*` — preset, adaptateurs, CLI — qu'un nom non scopé laisserait
      prendre. **Reste à faire avant la première publication :** créer
      l'organisation npm `ucm`. Si elle est prise, le repli est `ucm-kit`, et
      c'est un renommage à faire AVANT de publier, pas après.
      *Ce que la v5 disait, et qui reste vrai :* Vérifié sur le registre : le nom non scopé
      `ucm` est **pris** (version 2.2.0 publiée). `@ucm/kit` renvoie 404, ce qui
      ne prouve pas que le scope soit libre — une organisation npm peut exister
      sans aucun paquet public, et seule sa création le confirmera. Sont libres
      aujourd'hui : `ucm-kit`, `ucm-contract`, `unified-component-model`.
      Reste à trancher entre un nom non scopé libre et un scope
      (`@ucm/…` si l'organisation est disponible, sinon un scope personnel, qui
      l'est toujours). À faire avant la première publication : un renommage
      après coup casse tous les repos consommateurs.

---

## Phase 1 — Monorepo

- [X] **T1.0 — ⚠ La coupure passe entre le FORMAT et le MOTEUR, pas entre le
      plugin et le reste.** *Fait.*
      *Défaut corrigé :* la v3 déplaçait `src/` vers `packages/plugin/` et
      `schema/` vers `packages/kit/`. Cela créait un **cycle** :
      `scripts/build-schema.ts` importe `CONTRACT_VERSION` (`:20`), lit
      `src/contract/types.ts` et le tsconfig de la racine (`:74-75`), et écrit
      dans `schema/`. Le schéma du kit aurait donc été généré depuis les
      sources du plugin, pendant que T1.3 faisait importer l'identifiant par le
      plugin depuis le kit. Le kit n'aurait plus été régénérable seul, donc plus
      publiable de façon reproductible — l'inverse de D5.
      **Coupure retenue :** `packages/kit` porte le format — `types.ts`,
      `CONTRACT_VERSION`, `codeIdentifier`, la génération du schéma, le schéma
      lui-même, et les lecteurs de la Phase 2. `packages/plugin` porte
      l'extraction Figma et importe le kit. **Une seule direction.**
      *Contrainte de bundle :* le plugin est bundlé pour le sandbox Figma. Le
      kit expose donc un sous-chemin sans aucune dépendance Node — types,
      version, identifiant, projection, `normalizeName` —, seul autorisé côté
      plugin ; les lecteurs (qui utilisent `ajv` et `node:fs`) restent hors du
      bundle. Ce sous-chemin a un **second client** : le code navigateur du
      Playground, via T2.7 et T6.2. Sa carte `exports` doit donc être propre,
      et `moduleResolution` adapté (T1.1).

- [X] **T1.1 — Passer en workspaces**, avec les ruptures concrètes identifiées.
      *Fait, et les six se sont produites.* Deux méritent d'être retenues.
      Le `.gitattributes` s'est désancré **en silence** : seul `git check-attr`
      l'a montré, une relecture ne l'aurait pas fait — c'est la vérification
      qui compte, pas l'attention. Et la friction ESM/CJS n'était pas où la v5
      l'attendait : `buildUi.test.ts` n'a demandé qu'un `.js` → `.cjs`, tandis
      que le lanceur de tests du kit, lui, a cassé net parce que le paquet est
      `type: module`. Les cinq scripts CommonJS passent en `.cjs` pour DÉCLARER
      leur système de modules au lieu d'en hériter.
      **Une septième rupture, absente de la liste :** `utils.test.ts` couvrait
      `utils.ts` (qui part au kit) ET `variables.ts` (qui reste au plugin, avec
      les globals Figma). Il a fallu le scinder. Toute la liste des ruptures :
      - **`typeRoots` relatif casse à coup sûr.** `tsconfig.json:10` porte
        `["./node_modules/@types", "./node_modules/@figma"]`, résolus
        relativement au tsconfig. En workspaces npm hisse les dépendances à la
        racine : un `packages/plugin/tsconfig.json` gardant ces chemins ne
        trouverait aucun type root, le global `figma` disparaîtrait et
        `npm run typecheck` s'effondrerait.
      - **`.gitattributes` se désancre silencieusement.** `schema/*.json text
        eol=lf` contient un `/`, donc il est ancré au répertoire du fichier :
        après déplacement il ne matche plus rien. (À comparer aux motifs de
        `.gitignore`, sans `/` interne, qui restent actifs à toute profondeur.)
      - **`tests/` et `scripts/` n'avaient pas de destination.**
        `run-tests.js:16` lit `rootDir/tests` ; `tsconfig.json:13` inclut les
        trois dossiers ; `tests/schema.test.ts:20` importe
        `../scripts/build-schema` ; `tests/buildUi.test.ts:14` charge un module
        **CommonJS** via `createRequire` depuis un test TypeScript — c'est là
        que la friction ESM/CJS mordra, pas dans l'import du kit.
      - **`docLinks.test.ts` casse dès cette phase**, pas seulement en Phase 8 :
        `:11` calcule `racine = __dirname/..`, et `:120-121` lit `AGENTS.md` et
        la spécification à la racine. Déplacé, il cesse de balayer les documents
        du monorepo. Décider où il vit et ce qu'il balaie.
      - **`build-schema.ts` traverse la frontière en trois points** (`:20`
        version, `:74` types, `:75` tsconfig), tous résolus par T1.0. Et il a
        **deux** importeurs, pas un : `tests/schema.test.ts:20` et
        `tests/lois.ts:16` — ce dernier étant l'unique autorité sur les lois de
        forme, et le point d'ancrage de T2.5.
      - **`moduleResolution: "Node"` ignore les cartes `exports`** — rupture
        prouvée à l'exécution par la revue : `tsc` rend `TS2307: Cannot find
        module '@ucm/kit/format'` avec le réglage actuel (`tsconfig.json:7`), et
        passe en `Bundler`. Le sous-chemin sans dépendance Node de T1.0 **exige
        donc de changer `moduleResolution`**, ce qui touche toute la résolution
        de modules du plugin. À traiter au même rang que `typeRoots`.
      - **`CONTRACT_VERSION` doit être extraite dans un module autonome.**
        Elle vit à `exportComponent.ts:49`, dans 529 lignes d'orchestration
        Figma qui importent vingt modules du moteur, et elle est lue par
        `code.ts:7`, `build-schema.ts:20`, `schema.test.ts:19` et deux fois dans
        son propre fichier. Sans extraction, `build-schema.ts` appelé depuis le
        kit tire tout le moteur Figma, et le cycle que T1.0 supprime se
        réinstalle sous une autre forme.
      - **`normalizeName` va au kit, avec `codeIdentifier`.** Le plan v4 prenait
        l'un et laissait l'autre sans domicile, alors que son en-tête le
        déclare « LA règle de nommage du projet — un token s'écrit exactement
        pareil dans un contrat et dans `tokens.json` ». C'est l'invariant même
        sur lequel T2.4 repose. Six importeurs à mettre à jour.
      - **Deux arbitrages de packaging, tranchés :** le kit est `type: module`
        et publie un **build** (`dist/` + `.d.ts`), pour n'imposer TypeScript à
        personne ; l'ordre de build est écrit dans le script `build` de la
        racine. Le plugin et la racine restent en CommonJS par défaut, et leurs
        scripts portent `.cjs`. Énoncé d'origine : le champ
        `type` par paquet — la racine n'en a pas et `run-tests.js`,
        `build-ui.js`, `build-manifest.js` sont du CommonJS chargé par
        `createRequire`, tandis que le kit doit être ESM ; et **le kit
        publie-t-il des sources ou un build** — si c'est un `dist/`, le build du
        plugin en dépend et l'ordre doit être écrit dans la CI ; si c'est du
        `.ts`, le paquet impose TypeScript à un consommateur Swift.
      - **Le sous-chemin sans Node a un second client.** T2.7 et T6.2 le font
        consommer par du code Vite du Playground. T1.0 le décrit comme « seul
        autorisé côté plugin » : il faut corriger cette formulation, et
        l'exigence de carte `exports` n'en est que plus forte.

- [X] **T1.2 — Déplacer le moteur et le format** selon la coupure T1.0. *Fait,
      par `git mv` pour que l'historique suive.* `docLinks.test.ts` vit
      désormais dans un `tests/` de racine : il balaie la documentation du
      monorepo, qui n'appartient à aucun des deux paquets. Il a trouvé un lien
      mort dès sa première exécution après le déplacement.
      **Conséquence visible :** le plugin se charge dans Figma depuis
      `packages/plugin/dist/` — le chemin du manifest a changé.

---

## Phase 2 — Le noyau (`@ucm/kit`)

- [ ] **T2.1 — Déplacer les lecteurs du format, tels quels, avec leurs tests.**
      `validation-contrat.mjs` (1576 l.), `variant-views.mjs`,
      `validation-graphe-contrats.mjs`, `validation-echantillons.mjs`,
      `references-token.mjs` (allégé par D1), `version-contrat.mjs`,
      `avertissements-export.mjs`, `typography-token-types.mjs`,
      `schema-contrat.mjs`, **`diagnostic-markdown.mjs`** (dont dépend
      `avertissements-export.mjs:91`) et **`trouver-contrats.mjs`**
      (indispensable à `ucm check`). Les deux derniers manquaient en v3.
      **Et `identifiant-code.mjs`, qui manquait encore en v4** : il est importé
      par `validation-graphe-contrats.mjs:8`, `parite.mjs:37` et
      `generate-contract-types.mjs:17`. C'est aussi une **recopie manuelle** de
      `codeIdentifier` — son propre en-tête le dit —, donc la troisième autorité
      sur l'identifiant. Le geste n'est pas de le déplacer mais de le
      **supprimer** au profit du sous-chemin format du kit (T1.0) : c'est le
      seul endroit du plan où D5 (« une seule autorité pour les conventions
      d'identifiant ») se réalise concrètement.
      *Deux franchissements à prévoir :* `run-tests.mjs:27` importe
      `echecs-de-tests.mjs` (déplacé par T5.2) et `check.mjs:19` importe
      `diagnostic-markdown.mjs` (déplacé ici). Le lanceur de tests du repo hôte
      dépendra donc du kit.
      *Volumétrie corrigée :* 2 793 lignes pour les modules listés, et **2 061**
      lignes de tests — pas 3 200 comme l'annonçait la v4.
      *Pourquoi tels quels :* déplacer et élaguer dans le même geste, c'est
      perdre une règle sans le voir. L'élagage a lieu ensuite, en T2.1b, sur un
      code déjà déplacé et déjà vert.

- [ ] **T2.1b — ⚠ Élaguer la matrice de compatibilité à deux versions (D8).**
      **Lire ceci en entier avant de couper. La v4 de ce plan décrivait cette
      tâche faux, et sa description aurait conduit à supprimer le chemin de
      validation de la version courante.**
      *Ce que le code fait réellement, vérifié :* `champsInvalidesDuContrat`
      (`validation-contrat.mjs:1445`) traite un contrat `major >= 11` en deux
      passes — `champsInvalidesDuContrat11(contrat)`, puis un appel récursif sur
      `materialiserContrat11(contrat)`, qui **réécrit `meta.contractVersion` en
      `"10.3"`** (`:1324`). Le « validateur ancien » n'est donc pas du code de
      compatibilité dormant : c'est le validateur **actif** de tout contrat
      11.0 et 12.0, atteint par matérialisation vers une forme pivot 10.3.
      Conséquence directe : dans la passe interne, `capacites.catalogues110` est
      toujours faux et `major < 11` toujours vrai. Un élagage conduit « par
      raisonnement sur les gates » supprimerait donc précisément le chemin qui
      valide le 12.0.
      **Arbitrage préalable, à prendre avant de couper :** garde-t-on la
      matérialisation — une forme pivot 10.3 gelée dans un paquet publié, dont
      le nom mentira dès la 13.0 — ou l'aplatit-on en un validateur unique ?
      Les deux sont défendables ; la question ne doit pas rester cachée derrière
      « couper par gate ».
      **Méthode, une fois l'arbitrage pris.** Quatre sous-tâches, pas une :
      1. **Conserver un jeu N‑1 avant qu'il disparaisse.** *Fait, avant A2.*
      Les quatre contrats 11.0 vivent dans `fixtures/contrats/11.0/` de
      l'Exporter, pris dans l'objet Git du Playground — pas dans sa copie de
      travail, que Windows aurait convertie en CRLF. Un test les FIGE :
      empreintes SHA‑256 lues dans le README voisin, absence de CR, version.
      Ils rejoindront `packages/kit/` en T1.2. Le moteur ne fabrique
         que la version courante (`exportComponent.ts:151`). Le corpus est
         aujourd'hui le seul échantillon 11.0 réel — et **A2 le réexporte en
         12.0**. Figer une copie des quatre contrats 11.0 comme fixtures du kit
         **avant A2**, sans quoi plus aucune donnée N‑1 n'existe et la fenêtre
         que D8 vient de décider de garder devient inobservable.
      2. **Mesurer sur les deux versions de la fenêtre.** Couverture de
         `validation-contrat.mjs` sur les contrats N fabriqués **et** sur le jeu
         N‑1 figé. Une mesure sur N seul marquerait « jamais atteint » tout ce
         qui sert N‑1.
      3. **Enregistrer les refus avant de couper.** Le risque de cette tâche
         n'est pas de perdre un champ, c'est de perdre un **contrôle**. Une
         preuve d'équivalence sur des contrats valides est aveugle à ce risque :
         ils rendent `[]` avant comme après. Il faut donc, pour chaque contrôle,
         une mutation qui le déclenche, et un instantané du message produit.
         Mécanisable : muter chaque feuille d'un contrat fabriqué et enregistrer
         le verdict.
      4. **Couper, puis prouver.** Un gate toujours vrai sur la fenêtre s'inline
         — la condition disparaît, le contrôle reste. Un gate toujours faux part
         avec ses tests. Puis : verdicts identiques, message par message, sur les
         contrats valides **et** sur les mutations de l'étape 3.
      **Correction de comportement à inclure dans le même commit.** `analyser`
      (`check-contract.mjs:193-194`) appelle `champsInvalidesDuContrat`
      **avant** `verdictDeVersion` et sort tôt : `if (champsAbsents.length > 0)
      return { ...vide, champsAbsents }`. Le verdict de version est alors perdu,
      et `enteteDuVerdict` écrit « contrats invalides », un titre qui accuse le
      designer. Aujourd'hui l'ordre tient parce que les validateurs anciens
      acceptent réellement les formes anciennes ; après élagage, un contrat hors
      fenêtre tomberait dans ce cas. **La perte assumée par D8 n'est donc pas
      celle que la v4 annonçait :** sans cette correction, un contrat trop
      ancien ne reçoit pas « version non lue, réexportez » mais « contrat
      invalide », ce qui casse le critère de réussite n° 4. Inverser l'ordre,
      avec son test.
      *Ce qu'on accepte de perdre, correctement énoncé :* le diagnostic
      **détaillé** d'un contrat hors fenêtre. Il reçoit un verdict de version
      qui nomme le bon geste et le bon responsable, pas la liste de ses champs
      manquants.
- [ ] **T2.2 — L'identité de l'artefact, et la résolution de l'implémentation.**
      Motif `implementation` dans la configuration. **Réduit :** `{dir}/{id}` +
      extension suffit pour les cibles réelles ; les transformations de casse
      (`{id:snake}`, `{id:kebab}`) s'ajoutent le jour où une cible les demande.

- [ ] **T2.3 — ⚠ Scinder la parité : l'existence au noyau, la comparaison à
      l'adaptateur.**
      `lireApiPublique` rend une Map vide sans TypeScript (`parite.mjs:231`) et
      `cheminDuComposant` cherche un `.tsx` en dur (`:42`), d'où
      `implementationAbsente: true` (`:309`) pour tout contrat d'un repo
      non-TypeScript.
      *Précision apportée par la revue, qui affine le défaut sans l'annuler :*
      sur une pull request, `selectionnerBilansDuRapport` limite déjà les états
      informatifs aux contrats modifiés (`check-contract.mjs:607-610`). Il n'y a
      donc pas de bruit sur les contrats voisins. Mais sur une PR d'export, le
      contrat exporté **est** modifié : un repo Swift dont le composant est
      implémenté verrait « implémentation en attente » sur la PR même que le
      designer lit. Le défaut n'est pas du bruit de fond, c'est une affirmation
      fausse au seul endroit qui compte.

- [ ] **T2.4 — Contrôle d'existence des tokens indépendant du CSS.**
      Vérifié : `check-contract.mjs:124-140` lit `src/generated/tokens.css` et
      `:230` s'en sert pour le seul contrôle qui protège le design.
      **Correction majeure de la v3 :** cette tâche ne dépend **pas** de T2.0,
      elle la **dissout**. Comparer aux chemins de `tokens.json` ne demande
      aucune projection : le nom du token EST son chemin, écrit à l'identique
      dans le contrat et dans `tokens.json`. Mesuré sur le corpus réel :
      **379 références normatives, 379 résolues par chemin exact, zéro échec.**
      Le code qui fait déjà cette résolution existe et est testé
      (`typography-token-types.mjs:38-42`). Après T2.4, le contrôle qui protège
      le design n'utilise plus aucune projection.
      **Deux points à ne pas manquer en réutilisant ce code.** `indexerFeuilles`
      n'indexe que les nœuds portant un `$type` **propre** ; cela marche sur le
      corpus actuel — vérifié, les 693 feuilles en portent un et aucun groupe
      n'en porte —, mais DTCG autorise un `$type` posé sur un groupe et hérité.
      Un `tokens.json` produit par une autre chaîne rendrait alors de faux
      « token absent ». **Indexer sur `$value`, pas sur `$type`.**
      Et le `abandonner` associé à la lecture du CSS (`check-contract.mjs:124-140`)
      disparaît avec elle : c'est l'un des filets de T5.4 (« un fichier de tokens
      absent ou illisible se publie comme le reste »). Il doit être **reporté**
      sur `tokens.json`, pas supprimé.

- [ ] **T2.5 — Faire tourner le lecteur dans les tests du moteur.**
      `tests/lois.ts:367-379` valide déjà chaque contrat fabriqué contre le
      schéma via Ajv. Y ajouter la validation complète du kit couvre ce que le
      schéma ne sait pas prouver : les renvois internes et la forme des
      références.
      **Correction :** ce n'est additif qu'**après la Phase A**. Avant, le
      moteur fabrique du 12.0 et le lecteur refuse le 12.0 : le premier
      branchement rougirait toute la suite.
      *Garde-fou :* quand le moteur produit une forme que le validateur refuse,
      la correction la plus rapide est la mauvaise. **Un assouplissement du
      validateur qui accompagne un changement de moteur exige un test de refus
      sur l'ancienne forme.**
      *Limite :* ces tests n'exercent que des contrats synthétiques. Les quatre
      contrats réels du corpus restent le seul contact avec de vraies données
      Figma.

- [ ] **T2.6 — Sortir le vocabulaire de stack des messages.**
      Occurrences : `diagnostic-parite.mjs:10,13,31` et surtout **`:32`, qui est
      un `summary:`, donc un message lu par le designer et pas un commentaire** ;
      `diagnostic-tokens.mjs:44,95,109` ; et dans `check-contract.mjs` les
      lignes `19-24` (en-tête), `242`, `256`, `268`, `270`, `348`, `397`, `500`,
      `526`, `527`, `579`, `587`, `615`.
      *Ces listes sont périssables* — `src/github.ts` était modifié dans la
      copie de travail pendant la rédaction de ce plan, donc les lignes de T4.3
      ont déjà bougé. Régénérer plutôt qu'énumérer :
      `grep -rn "React\|\.tsx\|Playground" scripts/`.

- [ ] **T2.7 — Dédupliquer la regex de forme d'une référence.**
      `references-token.mjs:15` et `tokens.ts:22`. Mineur : deux copies
      identiques dont la divergence produirait un refus, pas une perte.

- [ ] **T2.8 — Migrer le Playground sur le kit.**
      *Rétabli : la v4 avait perdu cette tâche.* Elle n'est pas optionnelle —
      dès que les lecteurs quittent `scripts/`, le Playground cesse de
      fonctionner s'il n'installe pas le paquet. C'est aussi la seule preuve
      que le kit couvre un cas réel et complet avant le repo de recette.
      *Périmètre volontairement minimal (décision) :* le Playground **reste une
      sandbox jetable**. On le fait marcher avec le kit, on ne l'embellit pas et
      on n'en fait pas encore un exemple documenté. Il garde ses composants
      jetables, son corpus de quatre contrats réels et son test froid.

---

## Phase 3 — Configuration et CLI

- [ ] **T3.1 — `ucm.config.json`.** `components`, `tokens`, `implementation`.
      Jamais de numéro de version.
      *Pas de champ `icons`, décision prise :* la résolution d'un nom d'icône
      est une **responsabilité du repo consommateur**, pas du contrat ni du kit.
      Un contrat publie le `figmaName` de l'icône ; ce que ce nom désigne dans
      un kit donné n'appartient qu'au repo. Le plan ne l'outille donc pas — il
      le **documente** (T8.10) et le rend découvrable (T3.5).
      *Couplages résiduels à couvrir, vérifiés :* `trouverContrats(join(racine,
      "src"))` (`check-contract.mjs:487` — la v4 citait `:504,595`, qui sont
      deux sites que D1 supprime) cherche depuis `src`, distinct de
      `components` ; `generate-contract-types.mjs:22` écrit dans
      `src/generated/contracts` ; l'association de schéma de l'éditeur doit
      pointer vers le paquet installé, pas vers une copie locale.

- [ ] **T3.2 — `ucm init`.** Écrit la configuration, le workflow, l'association
      de schéma, et `.gitattributes`.
      *Justification corrigée :* la v3 disait que le LF servait « à ce que le
      test d'égalité tienne ». Faux — `tests/schema.test.ts:29-37` compare le
      **JSON analysé**, pas les octets, et son commentaire explique pourquoi.
      Le LF sert à la propreté du diff Git.

- [ ] **T3.3 — `ucm check`.** Sort en 0 ou 1, affiche toujours son diagnostic
      dans le terminal, et écrit le rapport **uniquement sur `--report
      <chemin>`**.
      *Pourquoi ce choix :* aujourd'hui le fichier n'est écrit que si la
      variable `CI` est présente (`check-contract.mjs:463-465`). Écrire toujours
      laisserait un `ci-report.md` non versionné dans la copie de travail après
      chaque exécution — le risque n'est pas de le commiter, puisque le
      Playground l'ignore déjà (`.gitignore:9`), mais d'encombrer et de faire
      croire à un rapport frais ; et un repo neuf, lui, ne l'ignore pas encore,
      ce que `ucm init` doit écrire (T3.2). Ne l'écrire que sous `CI`
      empêche un développeur de prévisualiser ce que le designer lira — ce qui
      est précisément ce qu'on veut faire quand on modifie ces messages. Un
      drapeau explicite règle les deux, et supprime une variable d'environnement
      magique.
      *Contradiction corrigée :* la v3 voulait à la fois « ne connaît aucun
      système de CI » et « le calcul du diff remonte du bash dans le CLI ». Le
      diff exige `pull_request.base.sha` et `fetch-depth: 0`, deux notions
      purement CI. Le CLI accepte donc un `--base <sha>` ; le calcul du sha
      reste dans le workflow.

- [ ] **T3.4 — Fonctionner sans `package.json`.** `npx` l'accepte mais exige
      Node sur la machine : en CI c'est `setup-node`, en local un développeur
      iOS n'en a pas forcément. Pin exact obligatoire (D7), `--yes` à
      documenter.

- [ ] **T3.5 — `ucm icons`.** Liste les `figmaName` d'icônes que les contrats du
      repo réclament.
      *Réintégré :* écarté en v3 comme du cérémonial, il reprend sa place avec
      la décision de T3.1. Puisque la résolution des icônes appartient au repo,
      celui-ci a besoin de savoir **ce qu'il doit couvrir** — sinon la
      responsabilité qu'on lui confie est aveugle. `collecterReferences` sait
      déjà balayer un contrat : le coût est faible, l'usage est réel.

---

## Phase 4 — Plugin Figma

- [ ] **T4.1 — Lire `ucm.config.json` dans le repo cible.** La désynchronisation
      est masquée par des défauts qui coïncident (`config.ts:128-129` rend
      `src/components` et `src/tokens`) ; elle se déclenche au premier repo aux
      conventions différentes.

- [ ] **T4.2 — Annoncer la version du contrat dans le corps de la PR.**

- [ ] **T4.3 — ⚠ Détecter la collision d'identifiants côté producteur.**
      *Défaut trouvé par la revue, vérifié :* `github.ts:88-92` construit le
      chemin à partir de `codeIdentifier`, et `exportComponent.ts:163-165` en
      tire aussi le nom du fichier. Deux noms Figma qui entrent en collision
      produisent donc **le même dossier et le même fichier** : le second export
      écrase le premier, et la CI ne voit ensuite qu'un seul contrat — donc
      aucun doublon, donc aucune erreur. Le garde-fou de
      `validation-graphe-contrats.mjs:70-105` est réel et bloquant, mais
      **inatteignable** pour la sortie du plugin : il n'est atteint que si
      quelqu'un place deux contrats à la main dans des dossiers distincts.
      La détection doit donc exister **avant l'écriture**, côté plugin.
      **Comportement décidé (D9) : le plugin REFUSE l'export.** Le message nomme
      les deux composants Figma en cause et l'identifiant qu'ils produisent tous
      deux ; le geste correctif est un renommage dans Figma. C'est brutal pour
      le designer, et c'est le prix à payer : avertir en écrivant quand même
      laisserait passer l'écrasement silencieux d'un contrat, c'est-à-dire le
      défaut que cette tâche existe pour supprimer.
      **Trois arbitrages que la v4 cachait derrière « on refuse ».**
      1. **Que fait le plugin sans configuration GitHub ?** Elle est facultative,
         et sur le chemin « téléchargement local » il n'y a aucun repo à lire :
         la collision est alors indétectable. C'est le cas nominal d'un designer
         qui n'a pas saisi de PAT. Décider : avertissement dans le journal du
         plugin, ou rien.
      2. **La lecture ne voit que la branche de base.** `getRepositoryFile`
         (`github.ts:227`) interroge `?ref=${config.baseBranch}`. Un contrat en
         collision qui vit dans une PR d'export **encore ouverte** est invisible,
         et le second export ouvrira une seconde PR sur le même chemin sans
         qu'aucun refus n'ait lieu. À dire, sinon la tâche sera close en croyant
         le trou bouché.
      3. **Quel est l'arbitre de l'identité ?** `publishArtifact` a déjà
         `existing` sous la main : inutile de lire tout le repo, coûteux et
         soumis au quota. Mais distinguer une collision d'un réexport légitime
         ou d'un composant renommé dans Figma demande de choisir entre
         `contract.name` (nom d'affichage) et `meta.figma.componentKey` /
         `nodeId` (identité stable — en notant que `componentKey` n'est publié
         que `if (componentSet.key)`, `exportComponent.ts:156`). Sans ce choix,
         le refus bloquera des réexports parfaitement légitimes.

- [ ] **T4.4 — Trancher la distribution du plugin** (D6, arbitrage documenté).

---

## Phase 5 — Rapport et CI

- [X] **T5.1 — ⚠ Tests de caractérisation — à exécuter juste après la Phase A,
      pas ici.** *Fait, sept scénarios.* Deux constats en sont sortis, utiles
      aux tâches à venir. Le premier : le titre « 1 contrat invalide » s'écrit
      **déjà** pour un contrat d'une version non lue, donc parfaitement formé —
      T2.1b annonçait ce défaut comme une conséquence de l'élagage, il est là
      avant, et un test le tient. Le second est une contrainte pour T3.3 : le
      script déduit sa racine de sa propre position et n'accepte aucun argument,
      si bien que le harnais doit recopier `scripts/` dans un repo jouet — et
      que ce jouet doit vivre DANS le repository, `parite.mjs` important
      `typescript` que Node ne résout qu'en remontant vers `node_modules`. *Corrigé en v5 :* la place de cette tâche dans le document est
      thématique, son exécution est bien plus tôt (voir l'ordre en fin de plan).
      `check-contract.mjs` est modifié par T2.4, T2.3, D1, D2 et T2.6 ;
      caractériser en Phase 5 caractériserait un fichier déjà réécrit cinq fois.
      Le harnais est peu coûteux : lancer le script sur un dossier temporaire et
      comparer le markdown produit.
      `check-contract.mjs` fait 663 lignes et n'a **aucun test**, ni direct ni
      transitif. C'est le morceau le plus lu par des humains et le plus
      difficile à corriger une fois publié.
- [ ] **T5.2 — Déplacer le rapport dans le kit**, allégé de D1 et D2, avec les
      modules qui l'accompagnent : `verdict-bilan.mjs`, `perimetre-rapport.mjs`,
      `echecs-de-tests.mjs`, `diagnostic-tokens.mjs` (allégé),
      `diagnostic-parite.mjs` (scindé par T2.3).
- [ ] **T5.3 — Documenter les variables d'environnement**, sans les figer.
      *Réduit :* geler une interface publique avant qu'une CI tierce ne la lise,
      c'est le défaut que T5.5 diagnostique justement ailleurs.
- [ ] **T5.4 — Porter les deux filets de sécurité** (`ci.yml:61-68`, `:79-85`) :
      rapport garanti quand la construction échoue et quand la CI s'arrête
      avant. C'est ce qui empêche un refus muet.
- [ ] **T5.5 — Action GitHub réutilisable — après la Phase 7.**

---

## Phase 6 — Couches optionnelles

- [ ] **T6.0 — La projection unique nom-de-token.** *Descendue de la Phase 2.*
      Trois implémentations — `tokens.ts:47`, `check-contract.mjs:154-156`, le
      `name/kebab` de Style Dictionary — qu'aucun test ne compare, et qui
      divergent sur les données réelles : sur 693 tokens, quatre portent une
      virgule décimale (`layouts.sizing.0,5`) que Style Dictionary rend
      `--layouts-sizing-0-5` et la projection naïve `layouts-sizing-0,5`.
      Après T2.4, ses seuls clients restants sont `tokenVar` et le preset —
      d'où son déplacement ici. Elle reste nécessaire : sans elle, `tokenVar`
      produit un CSS invalide, ignoré sans erreur par le navigateur.
      *Classe de divergence plus large que la virgule, vérifiée :* le
      `kebabCase` de Style Dictionary normalise tout caractère hors `[a-z0-9]`.
      `100%` devient `100` — le `%` **disparaît**, donc ce n'est plus une
      bijection : `50%` et `50` produiraient la même variable. Les accents,
      eux, survivent.
- [ ] **T6.1 — Preset Style Dictionary**, transforms graisse et famille, plus le
      test d'accord de T6.0. La table « nom de graisse → poids » est une
      connaissance du format et va dans le kit ; la projection CSS reste dans le
      preset, pour qu'un futur preset iOS réutilise la table.
- [ ] **T6.2 — `tokenVar`** importe la projection du kit.
- [ ] **T6.3 — Adaptateur TypeScript** : comparaison des props, génération des
      types. Précondition dure : un `tsconfig.json` à la racine
      (`parite.mjs:233`).

---

## Phase 7 — Le test du repo vierge

**Propriété et priorité.** Le repo de recette est créé et tenu par le
mainteneur du projet, hors de ce plan. Il est **conservé** ensuite comme test de
non-régression permanent de l'expérience d'installation, et non jeté après la
première recette. Cette phase n'est pas prioritaire : elle mesure, elle ne
construit pas. Ce qui la conditionne, en revanche, est décidé ici (T7.0).

- [ ] **T7.0 — ⚠ Trancher l'origine des contrats de recette.**
      `AGENTS.md` de l'Exporter porte en gras : « **Ce repository ne contient
      aucun artefact de contrat, et n'en contiendra pas.** » La raison est
      qu'un exemplaire commité est un instantané, où une régression du moteur ne
      se verrait jamais. La v3 demandait des « contrats d'or commités » sans
      voir la contradiction.
      **Résolution proposée, qui préserve l'invariant :**
      - les tests du **kit** consomment des contrats **fabriqués par le moteur
        au moment du test** — le monorepo rend ça trivial, et l'invariant reste
        intact ;
      - les variantes pathologiques (version future, contrat cassé) sont
        obtenues en **mutant** un contrat fabriqué, pas en commitant un fichier ;
      - le **repo de recette** porte ses propres fixtures : c'est un autre
        repository, l'invariant ne s'y applique pas.
- [ ] **T7.0b — Un `tokens.json` minimal**, incluant un token à nom non-kebab
      (`0,5`) **et un token à `%`** pour couvrir la perte d'information de T6.0.
- [ ] **T7.0c — Des oracles** : code de sortie attendu, titres présents ou
      absents dans `ci-report.md`.

**Cinq scénarios discriminants** (réduits de onze) :

- [ ] **T7.1** ⚠ **en premier** : contrat sans implémentation, dans un repo dont
      les implémentations ne sont pas en TypeScript → l'état doit être juste sur
      la PR d'export elle-même (T2.3).
- [ ] **T7.2** tokens résolus sans pipeline CSS (T2.4).
- [ ] **T7.3** version non lue → refus, bon coupable désigné.
- [ ] **T7.4** contrat cassé → bloque.
- [ ] **T7.5** montée de version : kit N+1 sur contrats N, fenêtre de migration,
      réexport, fermeture. Valide D7 et D8.

Reportés : le chronométrage, le scénario nominal (couvert par les autres) et la
matrice Windows × Ubuntu — utiles, mais ils coûtent plus qu'ils ne prouvent
aujourd'hui. Garder en tête que le code porte des `shell: win32`, des
normalisations d'antislash et quatre retraits de BOM.

---

## Phase 8 — Tri de la documentation

**Langue : le projet reste en français.** Décidé. La documentation, les
commentaires, les messages du rapport et les noms de symboles des validateurs
(`champsInvalidesDuContrat`, `verdictDeVersion`, `bilanEstBloquant`) ne sont pas
traduits. Cette phase est donc un tri, pas une traduction.
*Le seul événement qui rouvrirait la question* est une publication publique du
plugin sur la Community (D6, toujours ouverte) : elle mettrait mécaniquement le
projet devant un public non francophone. Les noms de symboles d'un paquet npm
publié étant quasi irréversibles, c'est à ce moment-là, et pas après, qu'il
faudrait trancher.

### 8.1 — Ce qui est mal rangé, vérifié

- la documentation du format est éclatée sur deux repos : la spécification
  (94 Ko) décrit le format **et** le moteur, tandis que `CHANGELOG-CONTRAT.md`
  (25 Ko) et `CONTRAT-CONSOMME.md` vivent chez le consommateur ;
- `CHANGELOG-CONTRAT.md` s'arrête à la 11.0 : il a cessé d'être tenu au moment
  où le producteur a avancé ;
- le skill `rediger-diagnostics-ucm` existe en **deux versions divergentes**,
  une par repo, même nom et même chemin ; celle de l'Exporter porte une règle
  absente de l'autre ;
- le « document de conventions du projet » que réclame le skill
  `consommer-contrat` n'existe pas ;
- un ancrage du skill promet une commande de contrôle ciblée sur un composant
  qui n'existe pas.

### 8.2 — Rangement cible, réduit

**Producteur :** `README.md`, `CONCEPT.md`, `docs/FORMAT.md` (ce qu'un
consommateur doit savoir), `packages/plugin/SPEC.md` (le moteur),
`docs/CHANGELOG-FORMAT.md`, plus `ROADMAP.md`, `PISTES-EVOLUTION.md`,
`CONTRIBUTING.md`, `AGENTS.md` inchangés de rôle.
*Réduit :* la v3 visait treize documents, dont un guide consommateur, un README
de paquet et un `FORMAT.md` qui se recouvraient largement, et un gabarit de
conventions dont personne ne vérifierait jamais qu'il décrit un repo réel.

**Consommateur :** garde son `README.md` allégé, `AGENTS.md`, `CONTRIBUTING.md`,
ses composants et son corpus. Perd `CHANGELOG-CONTRAT.md`,
`CONTRAT-CONSOMME.md`, `schema/README.md`.

### 8.3 — Tâches

- [ ] **T8.1 — ⚠ Scinder la spécification, en deux temps, avec preuve
      d'exhaustivité.**
      **Décidé : on scinde pour de vrai.** Hors `### Sortie` (~290 l.) et
      `## Versions`, format et moteur y sont co-extensifs **par construction**,
      parce que l'axe d'organisation du document est « ce que le moteur fait,
      champ par champ ». Exemple : dans `#### 8. Rendu sémantique`, la règle
      d'accès `roles[keyRoles[côté][clé] ?? clé]` est du format, et la phrase
      voisine qui explique ce que le moteur refusait de trancher est du moteur.
      La découpe traverse donc les paragraphes.
      **Le risque est de perdre une règle sans le voir**, et une relecture à
      l'œil des 1 604 lignes du document ne le couvre pas. D'où deux temps, dont seul le
      premier touche au contenu :
      1. **Partition mécanique, sans réécrire un mot.** Chaque ligne de la
         spécification actuelle part dans l'un des deux documents, telle quelle.
         Là où un paragraphe mélange les deux sujets, il est **dupliqué** dans
         les deux fichiers plutôt que réécrit — provisoirement laid, mais
         vérifiable.
         **Preuve associée :** un test qui prend la spécification d'avant la
         scission, figée pour l'occasion, et vérifie que chacune de ses lignes
         non vides apparaît dans au moins un des deux documents produits. Aucune
         ligne perdue, mécaniquement, pas par relecture.
         **Ce que cette preuve ne dit pas, et il faut l'écrire :** elle est
         trivialement satisfaite par une duplication intégrale. Elle prouve
         qu'aucune ligne n'est perdue, jamais qu'une ligne est allée du bon
         côté, et elle ne détecte pas les lignes **ajoutées**. Lui adjoindre
         donc un **compteur de duplication** — « N lignes encore présentes dans
         les deux fichiers » — pour que le temps 2 ait une cible mesurable et
         une fin identifiable.
      2. **Réécriture, ensuite, par petits commits relisibles.** On résorbe les
         duplications une par une, chaque commit ne touchant qu'un paragraphe.
         Le test du temps 1 se relâche alors en test d'ancres et de liens, et
         c'est la revue de diff qui prend le relais — sur des changements de la
         taille d'un paragraphe, pas d'un document.
      *Pourquoi ce découpage :* il applique au document la règle que le plan
      impose déjà au validateur — ne pas déplacer et réécrire dans le même
      geste. Le temps 1 est prouvable et sans jugement ; le temps 2 est du
      jugement, mais sur des morceaux assez petits pour qu'une erreur se voie.
- [ ] **T8.2 — Prévoir la casse de `docLinks.test.ts`**, mesurée : **24
      occurrences ancrées dans `AGENTS.md`** (19 ancres distinctes, réparties des
      deux côtés de la frontière projetée), plus `CONCEPT.md`, `CONTRIBUTING.md`,
      `PISTES-EVOLUTION.md`, `README.md`, `ROADMAP.md` — **6 documents** — et
      deux fichiers de code (`exportComponent.ts:46`, `nodeBindings.ts:739`).
      Le second test (`:119-127`) code en dur le nom du fichier, une regex et
      `assert.ok(vises.length >= 10)` : il doit être **réécrit**, pas mis à jour.
- [ ] **T8.3 — Réviser la table « Une règle, un domicile »** de
      `CONTRIBUTING.md`, qui désigne la spécification comme l'autorité unique.
      Scinder crée deux autorités sur des règles qui ne se séparent pas
      proprement : il faut statuer sur celles à cheval.
- [ ] **T8.4 — Traiter les trois orphelins du Playground.**
      `CONTRAT-CONSOMME.md` est cité par **`version-contrat.mjs:25`**, un
      fichier que T2.1 déplace « tel quel » dans le kit : le paquet publié
      porterait un renvoi vers un document supprimé d'un autre repo. Idem pour
      `CHANGELOG-CONTRAT.md` (4 renvois) et `schema/README.md`, dont la
      suppression entraîne `schema-contrat.mjs`, son test et
      `.vscode/settings.json`.
- [ ] **T8.5 — Fusionner les deux `rediger-diagnostics-ucm`.**
- [ ] **T8.6 — Retirer l'ancrage du skill** qui promet une commande inexistante
      (une ligne), plutôt qu'ouvrir un chantier `process.argv`.
- [ ] **T8.7 — Passer les documents en registre portable** : « React »,
      « `.tsx` » et « le Playground » ne restent que là où ils décrivent
      effectivement un adaptateur.
- [ ] **T8.8 — Réviser la doctrine** (D5) sans perdre l'exigence d'autorité
      unique, corriger au fond les contradictions listées ci-dessous, et
      **vérifier qu'aucune balise de T0.1 ne subsiste** : une balise qui survit
      à sa cause devient à son tour une information périmée.
- [ ] **T8.9 — Doter le Playground d'un test de liens.** Il n'en a aucun, et ses
      renvois croisés vers l'Exporter (dont un skill qui pointe
      `../../../../UCM-Exporter/CONTRIBUTING.md`) supposent deux clones frères
      sans que rien ne le vérifie.
- [ ] **T8.10 — Documenter la responsabilité « icônes » du consommateur (T3.1).**
      Un contrat publie le `figmaName` d'une icône et rien d'autre : ni kit, ni
      correspondance, ni taille de glyphe. Traduire ce nom vers un jeu d'icônes
      appartient au repo, et cette frontière n'est écrite nulle part
      aujourd'hui — le Playground la franchit dans `ContractIcon.tsx`, avec un
      ratio que son propre commentaire qualifie de « convention temporaire ».
      Le document de format doit dire : ce que le contrat garantit, ce qu'il ne
      garantit pas, et que `ucm icons` énumère ce qu'un repo doit couvrir.
      *À noter :* `PISTES-EVOLUTION.md` porte une option « Manifeste d'icônes »
      qui reste non engagée. Cette tâche ne l'ouvre pas ; elle rend seulement
      explicite l'état actuel, pour qu'un repo tiers ne le découvre pas à
      l'exécution.

---

## Retiré du périmètre

Le contrôle des tokens écrits dans le code (D1, relève d'un linter) ; les
profils multi-repository ; une API programmatique promise stable ; l'action
GitHub réutilisable avant la recette ; les `dist-tag` par version de contrat
avant le deuxième consommateur ; le mini-langage de casse avant une cible
réelle ; la lecture des contrats antérieurs à la version précédente (D8) ; un
manifeste d'icônes dans le contrat (T3.1 : la résolution appartient au repo).

## Ce qu'on ne construit pas

Pas de lecture du contrat au runtime, pas de générateur de code de production,
pas de plateforme ni de tableau de bord, pas de parité bloquante, pas de
réécriture du validateur pendant son déménagement.

---

## Ordre d'exécution

L'ordre de la v4 n'était pas réalisable : quatre dépendances lui manquaient.
Elles sont corrigées ici.

1. **Préalable T0** — baliser les règles périmées. Moins d'une heure.
2. **T2.1b, étape 1 seulement** — figer une copie des quatre contrats 11.0 comme
   fixtures. **Avant A2**, qui les détruit en réexportant.
3. **Phase A** — refermer 11.0/12.0, A1 rendant sa décision écrite.
4. **T5.1** — les tests de caractérisation de `check-contract.mjs`. *Remonté
   ici :* ce fichier est ensuite modifié par T2.4, T2.3, D1, D2 et T2.6.
   Caractériser en Phase 5 aurait caractérisé un fichier déjà réécrit cinq fois.
5. **D1** — le retrait du contrôle des tokens du code, **en un seul geste**.
   *Remonté ici :* T2.1 déplace `references-token.mjs` allégé de deux exports
   dont `tokens-du-code.mjs` dépend encore. Exécuter D1 en deux moitiés laisse
   le repo cassé entre les deux.
6. **T1.0** puis T1.1, T1.2 — la coupure format/moteur avant tout déplacement,
   sinon le cycle entre paquets s'installe et devient coûteux à défaire.
7. **T2.1 immédiatement suivi de T2.8** — déplacer les lecteurs et rebrancher le
   Playground dessus. *Corrigé :* la v4 les séparait de cinq crans, pendant
   lesquels `check-contract.mjs` importait onze modules absents, la CI du
   consommateur était rouge, et T2.4, T2.3 et T7.1 n'avaient plus aucun
   consommateur pour se vérifier.
8. **T2.4**, qui retire le CSS du chemin critique — c'est le verrou de la
   portabilité —, puis **T2.3**.
9. **T7.0, T7.0b, T7.0c puis T7.1.** *Corrigé :* la v4 plaçait T7.1 avant ses
   propres préconditions. Une alternative plus simple mérite d'être pesée :
   reformuler T7.1 en test du kit, puisque T2.3 se prouve sur un contrat sans
   implémentation, sans repo tiers.
10. **T2.5**, puis le reste de **T2.1b** — l'élagage a besoin de la mesure de
    couverture que T2.5 installe, et du jeu N‑1 figé à l'étape 2.
11. **Phase 3**, **T4.1 et T4.3**, reste de la Phase 7, **Phase 5**, puis les
    Phases 6 et 8.

---

## Contradictions doc ↔ code, vérifiées

| Document | Ce qu'il affirme | Ce que fait le code |
|---|---|---|
| `Playground/AGENTS.md` | `tokens.json` fait foi pour l'existence des références | `check-contract.mjs:124,230` lit `tokens.css` |
| `verdict-bilan.mjs:9` | idem, en commentaire | idem |
| `Playground/AGENTS.md` | `references-token.mjs` définit **seul** la référence | `tokens.ts:22` en porte une copie |
| `check-contract.mjs:42-47` | ce que l'export ne peut corriger avertit sans bloquer | le contrôle des tokens du code bloque (`:658`) — résolu par D1 |
| `PISTES-EVOLUTION.md`, « Extraction multi-repository » | rien à publier avec un seul consommateur | révisé par D5 |
| `CHANGELOG-CONTRAT.md` | porte l'historique des schémas « et lui seul » | s'arrête à 11.0 |
| skill `consommer-contrat`, ancrage 6 | une commande de contrôle ciblée sur un composant | n'existe pas |
| `Exporter/AGENTS.md` | aucun artefact de contrat, jamais | à préciser pour les fixtures du kit (T7.0) |
| — | aucun document ne déclare la projection de nom de token comme invariant | elle est écrite trois fois et diverge |
