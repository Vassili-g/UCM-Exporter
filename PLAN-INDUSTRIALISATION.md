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
contradictions ont été recensées en fin de document ; **elles sont toutes
refermées au 5 septembre 2026, et la règle ne s'assouplit pas pour autant.**
Le jour même où la dernière tombait, la Phase R en trouvait six autres, dont une
dans le premier fichier qu'un visiteur ouvre et une qui décrivait un paquet
publié par un contenu qu'il ne portait plus. Ce n'est pas un stock à épuiser :
c'est ce que produit un dépôt qui avance plus vite que ses documents.
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
      **Reste trois**, plus les quatre renvois des points d'entrée, qui se
      déclarent balises et partent avec la dernière. T2.4 en a retiré deux d'un
      coup : `verdict-bilan.mjs` et l'un des deux invariants de
      `Playground/AGENTS.md` ; T7.0 a retiré celle d'`Exporter/AGENTS.md`.
      Inventaire au 4 septembre 2026, vérifié par `grep` : `PISTES-EVOLUTION.md`,
      `Playground/AGENTS.md` et l'ancrage 6 du skill `consommer-contrat`.
      **Toutes parties au 5 septembre 2026** — les deux premières avec R3, la
      troisième avec T8.6 —, **et les quatre renvois des points d'entrée avec
      elles, dans le commit de T8.8.** Le mécanisme a tenu jusqu'au bout sauf
      sur ces deux-là : R3 a dû les retirer après coup, parce que les tâches qui
      corrigeaient leur cause ne les avaient pas emportées. C'est la seule fois
      où « dans le même commit » n'a pas été respecté, et cela a suffi à laisser
      deux avertissements mentir pendant une journée.
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

- [X] **D10 — Nommage du paquet. Tranché et exécuté : `@ucm-kit/core`.**
      *Résolu :* l'organisation npm créée est **`ucm-kit`**, pas `ucm` — donc le
      scope disponible est `@ucm-kit/*`. La décision de la v5 (`@ucm/kit`) est
      devenue inapplicable telle quelle ; elle est retranchée dans le scope
      réellement obtenu, et le renommage a été fait **avant toute publication**,
      comme la v5 l'exigeait. 64 occurrences remplacées en un geste mécanique,
      lockfile régénéré, tests des deux paquets verts.
      *Vérifié sur le registre au moment de trancher :* `ucm` est pris (2.2.0) ;
      `@ucm-kit/core`, `@ucm-kit/kit`, `@ucm-kit/format` et le nom non scopé
      `ucm-kit` rendent tous 404. Le scope l'emporte pour la raison d'origine —
      il réserve tout l'espace `@ucm-kit/*` : `@ucm-kit/cli`,
      `@ucm-kit/preset-style-dictionary`, `@ucm-kit/adapter-typescript`, qu'un
      nom non scopé laisserait prendre un par un.
      *Pourquoi `core` et pas `kit` :* le scope porte déjà le mot « kit ».
      `@ucm-kit/kit` se lit deux fois.
      **Le répertoire reste `packages/kit`, et c'est délibéré.** Le nom npm et le
      nom de dossier n'ont pas à coïncider ; toute la documentation, ce plan
      compris, appelle ce paquet « le kit », et renommer le dossier réécrirait
      des passages qui racontent des tâches déjà faites. Ne pas « corriger »
      cet écart : il est décidé ici.

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
        module '@ucm-kit/core/format'` avec le réglage actuel (`tsconfig.json:7`), et
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

## Phase 2 — Le noyau (`@ucm-kit/core`)

- [X] **T2.1 — Déplacer les lecteurs du format, tels quels, avec leurs tests.**
      *Fait.* Onze modules et six fichiers de test rejoignent
      `packages/kit/src/lecteurs/` et `packages/kit/tests/`. Les octets viennent
      de l'objet Git du Playground, pas de sa copie de travail : Windows y tient
      les `.mjs` en CRLF, et une recopie naïve aurait fait entrer 24 CR par
      fichier dans un paquet publié. Kit : 10 tests → 131.
      **`identifiant-code.mjs` est supprimé**, et c'est ici que D5 se réalise :
      `validation-graphe-contrats.mjs` appelle désormais `codeIdentifier` du
      sous-chemin format. Substitution sûre à cet appel — l'appelant a déjà
      écarté tout ce qui n'est pas une chaîne non vide —, mais **pas partout** :
      `identifiantCode` faisait `String(nom ?? "")` et `codeIdentifier` attend
      une chaîne. `generate-contract-types.mjs`, qui lit un JSON quelconque et
      porte l'interdiction explicite de lever, garde donc la coercition à son
      appel. C'est le genre d'écart qu'une substitution « mécanique » perd.
      *Trois écarts à la liste de la v5, tous vérifiés :*
      - **`schema-contrat.test.mjs` ne suit pas.** Il lit les contrats réels du
        repo consommateur, ce que le kit n'a pas ; ses deux autres questions
        sont déjà tenues par `tests/schema.test.ts`. Il reste chez le
        consommateur, rebranché sur le kit.
      - **`ajv` devient une dépendance du kit**, plus une devDependency du
        plugin ni du Playground.
      - **La porte publique est un fichier neuf**, `src/lecteurs/index.mjs`, et
        elle publie ce que les modules publient déjà, sans tri : ce déplacement
        ne juge rien, et restreindre la surface se décidera en T5.2, quand on
        saura ce qu'un consommateur appelle vraiment.
        `tests/surfaceLecteurs.test.mjs` tient l'exhaustivité dans les deux sens
        (vérifié par mutation), pour qu'un export ajouté à un module ne reste
        pas enfermé dedans par oubli.
      *Énoncé d'origine, conservé :*
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
      `echecs-de-tests.mjs` — dont T5.2 ne déplace que la moitié RAPPORT,
      `echecsDuTap` restant ici avec son appelant (corrigé le 5 septembre
      2026) — et `check.mjs:19` importe
      `diagnostic-markdown.mjs` (déplacé ici). Le lanceur de tests du repo hôte
      dépendra donc du kit.
      *Volumétrie corrigée :* 2 793 lignes pour les modules listés, et **2 061**
      lignes de tests — pas 3 200 comme l'annonçait la v4.
      *Pourquoi tels quels :* déplacer et élaguer dans le même geste, c'est
      perdre une règle sans le voir. L'élagage a lieu ensuite, en T2.1b, sur un
      code déjà déplacé et déjà vert.

- [X] **T2.1b — ⚠ Élaguer la matrice de compatibilité à deux versions (D8).**
      *Close le 4 septembre 2026, les trois étapes faites, en quatre commits.*
      **Ce que l'exécution a rendu, et ce qu'elle a trouvé en plus.**
      *Étape 2 — le harnais de mutation* (`kit/tests/refus-enregistres.test.mjs`).
      11 260 mutations sur les quatre contrats 11.0 figés plus deux formes
      fabriquées ; chaque chemin est supprimé, puis remplacé par une valeur d'un
      autre type. L'instantané porte trois choses parce qu'elles répondent à
      trois questions : l'inventaire des contrôles exercés, le partage refusé /
      muet, et une empreinte SHA‑256 de la totalité des verdicts. Le générateur
      IMPORTE le harnais du test au lieu d'en recopier le corps — sans quoi les
      deux finissent par mesurer des choses différentes sans qu'aucun rouge
      n'apparaisse.
      *Un angle mort du plan, trouvé en sondant.* « Muter chaque feuille » ne
      suffit pas : `viewStructures` n'est jamais une feuille, seulement un
      conteneur, et le contrôle « ce bloc est un objet » n'apparaissait donc
      dans aucun inventaire. Or c'est exactement la classe qu'un élagage trop
      large emporte — celle qui juge le BLOC, pas son contenu. Les conteneurs
      sont mutés aussi.
      *Étape 3, la coupe.* `CHAMPS_VERSION_11` était **structurellement
      inatteignable** : la fonction sort plus tôt pour `major >= 11`, et l'appel
      récursif lit une forme canonique. Vérifié en le remplaçant par un `throw`.
      Rien n'est perdu, et c'est mesuré : ses deux contrôles sont rendus par
      l'autre passe sur un contrat 12.0 muté.
      *Étape 3, le renommage.* `formeCanonique` et
      `champsInvalidesDeLaFormeCanonique`. La grammaire de lecture est devenue
      un paramètre interne de `champsInvalidesDuContrat` : la substitution ne
      quitte plus cette portée, et le contrat garde la version qu'un message
      d'erreur doit pouvoir citer. Un garde-fou de source empêche le retour de
      la réécriture — il lit la source et l'assume, la substitution n'étant
      observable par aucun appelant.
      *Un commentaire est devenu faux par ce changement* — celui de
      `validerPlacement120`, qui invoquait la réécriture pour justifier où vit
      le contrôle. Corrigé dans le même geste : la contrainte tient, sa
      formulation non.
      *La correction de comportement, en deux moitiés et non une.* L'ordre
      inversé fait parvenir le verdict de version au rapport ; le TITRE, lui,
      comptait encore ce contrat parmi les invalides. Les deux sont faits.
      **La nuance qui manquait à l'énoncé :** la condition n'est pas « la
      version est mauvaise » mais « la version est LISIBLE et mauvaise ». Un
      fichier vidé de sa substance n'a pas une version trop ancienne, il n'en a
      pas — sans cette nuance, l'inversion remplace une accusation fausse par
      une autre.
      *Le défaut était LATENT*, comme le plan l'annonçait : il a fallu écrire un
      scénario où la version ET les champs échouent pour le rendre visible. Il
      rougit sans la correction.
      *Énoncé d'origine, conservé :*
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
      **Arbitrage tranché — on garde la matérialisation et on cesse de la faire
      mentir.** La question posée était binaire — matérialisation vers un pivot
      « 10.3 » gelé dans un paquet publié, ou aplatissement en un validateur
      unique — et il existe une troisième réponse, moins chère que les deux.
      La matérialisation n'est pas de la compatibilité dormante : c'est une
      **normalisation**. Elle rétablit ce que l'élision a retiré — un groupe de
      peintures vide, un `children` absent — pour qu'un seul validateur voie une
      seule forme. Ce geste est utile et n'a rien à voir avec un numéro de
      version. Ce qui ment n'est que deux choses : la chaîne `"10.3"` écrite
      dans `meta.contractVersion` (`:1324`), et le suffixe `11` des noms.
      *Ce qu'on fait, mécanique et vérifiable :* la matérialisation cesse de
      réécrire `meta.contractVersion` et signale la forme normalisée par un
      paramètre, ce qui rend au contrôle sa version réelle ;
      `materialiserContrat11` devient `formeCanonique`,
      `champsInvalidesDuContrat11` devient `champsInvalidesDeLaFormeCanonique`.
      Aucun contrôle n'est touché, aucune passe fusionnée.
      *Pourquoi pas l'aplatissement :* il demande de refusionner à la main les
      deux passes d'un validateur de 1576 lignes — un « déplacer et réécrire
      dans le même geste », que la règle 2 de ce plan interdit. Et A1 a déjà dû
      placer les trois contrôles 12.0 **hors** de la passe matérialisée, parce
      que la version y est réécrite : aplatir rouvrirait cet arbitrage pour
      chaque contrôle du fichier. Une fois la version rendue, cette contrainte
      disparaît d'elle-même — c'est un bénéfice de la troisième voie, pas une
      tâche de plus.
      **Méthode, une fois l'arbitrage pris.** Trois sous-tâches, pas une :
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
      2. **Enregistrer les refus avant de couper — et c'est la mesure.** Le
         risque de cette tâche n'est pas de perdre un champ, c'est de perdre un
         **contrôle**. Une preuve d'équivalence sur des contrats valides est
         aveugle à ce risque : ils rendent `[]` avant comme après. Il faut donc,
         pour chaque contrôle, une mutation qui le déclenche, et un instantané du
         message produit. Mécanisable : muter chaque feuille d'un contrat
         fabriqué **et de chacun des quatre contrats N‑1 figés**, et enregistrer
         le verdict.
         *Ceci remplace la mesure de couverture que demandaient les v3 à v5,* et
         ce n'est pas un renoncement : aucun outil de couverture n'existe dans le
         monorepo — ni `c8`, ni `nyc`, ni `--experimental-test-coverage` —, les
         deux paquets ont chacun leur lanceur, et mesurer
         `validation-contrat.mjs` depuis la suite du plugin traverse un
         workspace. Surtout, une ligne « atteinte » n'est pas un contrôle
         **jugé** : un contrôle qu'aucune mutation ne déclenche est un contrôle
         que rien ne couvre, quelle que soit sa couleur dans un rapport. La
         mutation répond directement à la question posée, la couverture y répond
         de biais.
      3. **Couper, puis prouver.** Un gate toujours vrai sur la fenêtre s'inline
         — la condition disparaît, le contrôle reste. Un gate toujours faux part
         avec ses tests. Puis : verdicts identiques, message par message, sur les
         contrats valides **et** sur les mutations de l'étape 2.
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
- [X] **T2.2 — L'identité de l'artefact, et la résolution de l'implémentation.**
      *Fait le 4 septembre 2026, dans `packages/kit/src/lecteurs/implementation.mjs`.*
      Deux jetons, `{dir}` et `{id}`, résolus et non interprétés : aucun glob,
      aucune recherche. Un emplacement CALCULABLE est ce qui permet de dire
      « absente » sans fouiller le repo, donc de ne jamais confondre « pas
      écrite » et « pas trouvée ».
      Les transformations de casse (`{id:snake}`, `{id:kebab}`) restent
      non écrites, comme prévu.
      *Ce qui n'y est pas encore, et ce n'est pas un oubli :* le motif est un
      PARAMÈTRE, pas une configuration. `ucm.config.json` le lira en T3.1 ;
      l'écrire ici aurait fait dépendre la Phase 2 de la Phase 3.

- [X] **T2.3 — ⚠ Scinder la parité : l'existence au noyau, la comparaison à
      l'adaptateur.** *Close le 4 septembre 2026, des deux côtés. Le kit publie
      0.1.3 et le Playground la consomme.*
      Le noyau répond « où » et « est-elle là » ; l'adaptateur garde la seule
      chose qui n'est pas transposable — lire une API publique avec le
      vérificateur de types TypeScript.
      **Le défaut est corrigé en distinguant deux causes que le code
      confondait.** « Pas de relevé » avait une cause déclarée et en avait deux :
      `implementationAbsente` (le fichier n'est pas là, état d'avancement
      légitime) et `implementationNonLue` (le fichier EST là, l'adaptateur n'en
      tire rien). Aucune des deux ne bloque, mais pour des raisons opposées, et
      c'est ce qui rend la seconde nécessaire : là, il n'y a personne à qui
      adresser un geste correctif — le code est peut-être parfait, c'est
      l'adaptateur qui ne sait pas le lire. Transformer sa propre limite en
      reproche serait le pire des deux mondes. Le rapport ne dit donc plus
      « conforme » de ce qu'il n'a pas lu.
      **Correction mesurée, qui change la cause annoncée sans annuler le
      défaut :** ce n'est PAS l'absence de `tsconfig.json` qui vide le relevé.
      Sans lui, TypeScript applique ses options par défaut et le programme se
      construit — vérifié en retirant le fichier : le verdict du corpus ne bouge
      pas. La vraie cause est le filtre d'existence en tête de `lireApiPublique` :
      un repo non-React n'a aucun `.tsx`, donc aucun fichier à relever. La
      conséquence est identique, la ligne citée est la bonne, l'explication
      était fausse.
      *Éprouvé sur le disque et pas sur un simulacre :* une fixture
      `CibleNonReact.swift` existe pour de bon, et le test parcourt le chemin
      entier — motif, présence, relevé vide, verdict.
      *Un défaut introduit et attrapé, qui vaut d'être écrit :* ouvrir le motif
      en second paramètre a cassé `contrats.map(cheminDuComposant)`, où `map`
      passe l'index à cette place. Aucun de mes tests ne l'a vu — seule la
      caractérisation de `check-contract.mjs` (T5.1) l'a levée, ce qui est
      exactement la raison pour laquelle elle avait été remontée avant les
      tâches qui réécrivent ce fichier. Le kit refuse désormais un motif non
      textuel en désignant le `map`.
      *Une note d'exploitation, parce qu'elle se répétera :* le workflow de
      publication n'a toujours pas publié — 0.1.2 et 0.1.3 sont parties à la
      main, comme 0.1.0 et 0.1.1. L'entrée d'éditeur de confiance a été recréée
      une fois et a débloqué l'OIDC ; ce qui bloque maintenant est ailleurs, et
      n'a pas encore été cherché. Tant que ce n'est pas fait, chaque coupure
      kit ↔ consommateur coûte une publication manuelle.
      **Corrigé le 5 septembre 2026 : il n'y avait rien à chercher.** Le workflow
      n'était pas bloqué, et son propre journal le disait — l'exécution qui a
      suivi la recréation de l'éditeur de confiance est passée de 403 à **409
      « cette version existe déjà »**. Un 409 signifie que npm a accepté
      l'identité OIDC et n'a refusé QUE le numéro de version. Il ne manquait donc
      qu'une montée de version avant le `workflow_dispatch`. 0.1.4 est publiée,
      et le registre porte 0.1.0 à 0.1.4. *La leçon est celle que le workflow
      porte déjà :* quatre états successifs de diagnostic écrits chacun comme un
      fait avaient rendu le dernier — le bon — illisible.
      *Levé le 4 septembre 2026 :* `publish.yml` publie les deux paquets, et
      `@ucm-kit/cli` est sur le registre — sa 0.1.1 partie à la main, comme la
      règle de la première version l'exige. Ce que la levée a révélé est écrit
      en T3.4 : cette 0.1.1 était **cassée à l'import**, et aucun contrôle du
      dépôt ne pouvait le voir.
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

- [X] **T2.4 — Contrôle d'existence des tokens indépendant du CSS.** *Fait.*
      Le contrôle interroge `tokens.json` au chemin exact de la référence.
      `nomVariable` et la lecture de `tokens.css` disparaissent de
      `check-contract.mjs` ; `tokens-dtcg.mjs` rejoint le kit et porte seul la
      réponse à « ce token existe-t-il ». `typography-token-types.mjs` l'importe
      au lieu d'indexer l'arbre pour son compte : une seule définition de ce
      qu'est une feuille DTCG, sans quoi le contrôle de type et le contrôle
      d'existence jugeraient deux arbres différents à partir du même fichier.
      Kit : 131 tests → 144, dont treize sur le nouveau module, vérifiés par
      mutation. Verdict identique sur le corpus réel — mêmes quatre contrats,
      mêmes 387 références, même conformité.
      **La divergence annoncée en théorie existe déjà dans les données.** Figma
      publie quatre tokens nommés `layouts.sizing.0,5` … `3,5` (virgule
      décimale). Style Dictionary écrit `--layouts-sizing-0-5` ; la projection
      `.` → `-` cherchait `layouts-sizing-0,5`. Un contrat citant l'un de ces
      quatre tokens recevait donc « token absent » alors que le token existe.
      Aucun contrat du corpus ne les cite encore — c'est pourquoi le défaut
      était resté invisible. Un test de caractérisation neuf le tient fermé.
      *Les deux filets sont reportés, pas supprimés,* et ils se séparent :
      `tokens.json` **absent** accuse la génération, **illisible** accuse le
      fichier. Les confondre — ce que faisait le message unique — envoyait le
      designer réparer un JSON qui n'existe pas.
      *Deux balises retirées dans le même commit* (`verdict-bilan.mjs:9`,
      `Playground/AGENTS.md`) : leur contradiction n'existe plus.
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
      *Vérifié à l'exécution avant d'écrire une ligne :* 387 références de
      l'union « citées + `tokensUsed` », 387 résolues par chemin exact, zéro
      échec ; 721 feuilles indexées.
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

- [X] **T2.5 — Faire tourner le lecteur dans les tests du moteur.** *Fait.*
      `verifierLeLecteur` rejoint `tests/lois.ts` et se pose sur le chemin
      d'appel de `exportComponent.test.ts`, à côté du schéma : chaque contrat
      que le moteur fabrique passe désormais par `verdictDeVersion` et
      `champsInvalidesDuContrat` du kit. Les deux assertions vérifiées par
      mutation. Vert du premier coup — c'est un filet de régression, pas une
      découverte.
      *La justification était juste, et elle se mesure :* la forme des
      références de token est bien contrôlée par le lecteur
      (`validation-contrat.mjs:833`) et **pas** par le schéma, qui type
      `SlotTokens` en `Record<string, string>` et ne porte aucun `pattern` —
      vérifié, zéro occurrence dans les 77 ko du schéma publié. Une mutation
      d'un token en `layouts.sizing.1`, sans accolades, est refusée avec le
      chemin exact `variants[0].tokens.background`.
      *Portée réelle, mesurée :* **un seul des 23 scénarios** fabrique un
      variant portant un token. Le filet est posé au bon endroit et n'est pas
      encore alimenté ; un scénario qui lie des variables en profitera sans
      rien ajouter.
      *Ce que la tâche NE fait pas, et pourquoi :* `validerGrapheDesContrats`
      répond sur un ENSEMBLE de contrats co-localisés, et le moteur en fabrique
      un par scénario. Le lancer ici accuserait chaque contrat composé d'une
      dépendance sans contrat voisin — un constat sur le montage du test, pas
      sur le moteur. Cette question reste chez le consommateur.
      *Coût de forme :* les lecteurs se publient en JavaScript sans
      déclarations, et `lois.ts` est du TypeScript. Une déclaration locale
      (`tests/lecteurs-du-kit.d.ts`) décrit les deux fonctions appelées. Elle ne
      peut pas dériver en silence : ces deux fonctions sont exécutées à chaque
      `npm test`, donc un renommage côté kit casse l'exécution et pas seulement
      la compilation.
      *Énoncé d'origine, conservé :*
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
      sur l'ancienne forme.** Il est recopié dans l'en-tête de
      `verifierLeLecteur`, là où il se jouera.
      *Limite :* ces tests n'exercent que des contrats synthétiques. Les quatre
      contrats réels du corpus restent le seul contact avec de vraies données
      Figma.

- [X] **T2.6 — Sortir le vocabulaire de stack des messages.** *Fait le
      4 septembre 2026.* Le moteur promettait une stack au lecteur : un fichier
      `.tsx` à créer, un composant React à corriger, « le Playground » à
      adapter. Ce n'est pas maladroit, c'est **faux** — et faux sur la pull
      request d'export, la seule que le designer ouvre. Ces modules rejoindront
      le kit en T5.2 et seront alors imprimés par des repos dont aucun n'écrira
      de `.tsx`.
      **Ce qui garde le mot, et c'est la même règle que T8.7 :** `parite.mjs`,
      `run-tests.mjs` et `echecs-de-tests.mjs`. Les trois SONT des adaptateurs
      de cette stack — le premier lit une API publique avec le vérificateur de
      types, les deux autres balaient de vrais `*.test.tsx`. Leur interdire le
      mot juste les ferait mentir dans l'autre sens.
      **La tâche ne tenait pas sans son filet**, et c'est le vrai livrable :
      `Playground/scripts/registre-portable.test.mjs`. Renommer des chaînes une
      fois ne coûte rien ; les laisser renommées coûte une vigilance que
      personne n'a, et le mot revient au premier message écrit dans l'urgence.
      Le test refuse aussi de balayer une liste vide — un module renommé sans
      mise à jour de la liste sortirait sinon du contrôle en silence.
      *La prédiction du plan s'est vérifiée sur son propre texte :* la liste
      d'occurrences ci-dessous était périmée. Les trois de
      `diagnostic-tokens.mjs` n'existaient plus, D1 ayant retiré le contrôle qui
      les portait, et les lignes de `check-contract.mjs` avaient toutes bougé.
      *Occurrences telles qu'énumérées à la rédaction, conservées pour mémoire :*
      `diagnostic-parite.mjs:10,13,31` et surtout `:32`, un `summary:` ;
      `diagnostic-tokens.mjs:44,95,109` ; `check-contract.mjs:19-24`, `242`,
      `256`, `268`, `270`, `348`, `397`, `500`, `526`, `527`, `579`, `587`,
      `615`. **Régénérer plutôt qu'énumérer** reste la bonne consigne :
      `grep -rn "React\|\.tsx\|Playground" scripts/`.

- [X] **T2.7 — Dédupliquer la regex de forme d'une référence.** *Fait pour les
      trois copies de l'Exporter ; la quatrième part avec T6.2.*
      **Elles étaient QUATRE, pas deux.** Le compte de la v5 —
      `references-token.mjs:15` et `tokens.ts:22` — en manquait la moitié, et
      surtout celle qui décide :
      1. `kit/src/lecteurs/references-token.mjs:15`, `REFERENCE`, la seule qui se
         donnait pour l'autorité ;
      2. `kit/src/lecteurs/validation-contrat.mjs:201`, `estReferenceToken`, une
         copie **anonyme** — c'est elle qui refuse un contrat, à `:833` et à dix
         autres sites ;
      3. `plugin/src/variables.ts:47`, `TOKEN_REFERENCE`, dont l'en-tête
         affirmait que « `variables.ts` est l'unique autorité sur la forme d'une
         référence » ;
      4. `Playground/src/tokens.ts:22`, `REFERENCE` — celle de `tokenVar`,
         c'est-à-dire le site de T6.0.
      *Ce que la v5 sous-estimait, et c'est la raison de faire la tâche :* la
      divergence ne produirait pas « un refus, pas une perte ». Entre la copie 2
      et les autres, elle produirait un **désaccord** — « ce contrat est valide »
      d'un côté, « ce token n'existe pas » de l'autre — et ce désaccord-là est
      muet.
      *Fait :* `packages/kit/src/format/references.ts` porte `TOKEN_REFERENCE`,
      `isTokenReference`, et avec eux `toRef` et `refPath`, qui posent et
      enlèvent la même enveloppe. Le format, et pas les lecteurs : c'est le seul
      sous-chemin que le bundle du plugin, Node et un navigateur atteignent tous
      les trois — la contrainte même qui avait forcé chaque côté à recopier.
      Vérifié dans `dist/code.js` : `toRef` y entre par le kit.
      `REFERENCE` quitte la porte des lecteurs plutôt que d'y être réexporté :
      un second nom pour la même chose est exactement ce que cette tâche
      supprime, et le paquet n'est pas encore publié — la fenêtre pour le faire
      sans casser personne est maintenant.
      Kit : 144 → 146 tests ; le plugin en perd un, qui a suivi la définition.
      **La copie 4 reste**, et c'est un choix : elle vit dans le repo
      consommateur, dont l'arbre porte déjà T2.8 et T2.4 non commités, et T6.2
      la supprime déjà par son énoncé (« `tokenVar` importe la projection du
      kit »). La déplacer ici l'aurait faite deux fois.
- [X] **T2.7b — Le jumeau du collecteur de références.** *Faite dans le commit
      `3f06cac`, et la case était restée ouverte — constaté et refermé le
      4 septembre 2026 en la vérifiant plutôt qu'en la croyant.* Le jumeau a
      disparu de `plugin/src/variables.ts` ; huit fichiers de test du plugin
      importent `collecterReferences` du kit ; 420 tests verts.
      *Ce que cet écart apprend, et il n'est pas isolé* — T2.9 porte le même :
      une case de plan n'est pas un journal. Vérifier dans le code avant de
      traiter une tâche comme restante coûte une minute ; la refaire en coûte
      beaucoup plus.
      *Note d'origine, conservée :*
      `collectTokenReferences` (`plugin/src/variables.ts`) est le jumeau exact
      de `collecterReferences` du kit : même corps, et depuis T2.7 le même
      `isTokenReference`.
      *Première correction — il n'est pas « mort ».* Aucun code de production ne
      l'appelle, c'est vrai. Mais **neuf fichiers de test et quatorze
      assertions** s'en servent comme helper. « Le supprimer » n'est donc pas un
      petit geste, c'est réécrire quatorze assertions qui marchent.
      *Seconde correction — la vérification qu'elle réclamait est déjà faite.*
      La note disait qu'il fallait « vérifier ce que la 12.0 a fait de
      `tokensUsed` ». C'est vérifié : zéro occurrence dans
      `packages/kit/src/format/types.ts`, et `check-contract.mjs` déstructure ce
      champ hors du contrat avec un commentaire disant qu'il n'existe plus depuis
      la 11.0. La question est close, la note la laissait ouverte.
      **Le geste est une substitution, pas une suppression :** les tests du
      plugin importent `collecterReferences` de `@ucm-kit/core/lecteurs` — ils
      tournent sous Node, le sous-chemin leur est accessible — et la copie du
      plugin disparaît. Les signatures sont identiques, aucune assertion ne
      bouge. C'est le geste de T2.7 exactement, un étage plus haut.
      *Borne :* la version du kit s'accompagne de `sansEchantillon`, que celle du
      plugin n'a pas. Les tests visés balaient des fragments, pas des contrats
      entiers, donc l'exclusion ne les concerne pas — mais un test qui passerait
      un contrat complet doit la traverser, sans quoi il ramasserait le texte de
      maquette.

- [X] **T2.9 — Déclarer les lecteurs à un consommateur TypeScript.** *Fait,
      publié dans la 0.1.1.* `src/lecteurs/index.d.mts` est dans le tarball du
      registre, et la carte `exports` y porte la condition `types` ;
      `lecteurs-du-kit.d.ts` a disparu du plugin.
      `exports` publie `./lecteurs` sans condition `types`, et les modules
      partent en JavaScript nu. La décision « le TypeScript n'est imposé à
      personne » reste juste — mais elle ne dit rien de ce qu'un consommateur qui
      en fait déjà reçoit, et **la première copie est déjà là** :
      `packages/plugin/tests/lecteurs-du-kit.d.ts` déclare à la main deux
      fonctions du kit, depuis un autre paquet. Chaque consommateur écrira la
      sienne, et elles divergeront — c'est exactement la maladie que T2.7 vient
      de soigner, un étage au-dessus.
      *Le geste :* un `src/lecteurs/index.d.mts` écrit à la main dans le kit,
      réduit à la surface que la porte publie, plus une condition `types` dans
      la carte `exports`. Puis suppression de `lecteurs-du-kit.d.ts`, qui devient
      une redite.
      *Pourquoi écrit à la main plutôt que dérivé de JSDoc :* dériver imposerait
      une passe `tsc` sur des `.mjs`, donc un build là où la décision de T2.1 est
      justement de n'en avoir aucun. Une déclaration écrite reste vérifiée par
      l'exécution — ces fonctions tournent à chaque `npm test`.
      *Pourquoi 0.1.1 et pas 0.1.0 :* le paquet est publié pour débloquer T2.8,
      et le seul consommateur est ici, avec un pin exact (D7). Monter d'une
      version ne coûte rien ; retarder la publication coûtait le Playground.

- [X] **T2.8 — Migrer le Playground sur le kit.** *Fait et poussé le
      4 septembre 2026.* Le code avait migré avant la publication ; ce qui
      manquait était le lockfile, qui ne pouvait pas se régénérer sur un paquet
      absent du registre. Le pin est `0.1.1`, exact comme D7 l'exige, et le
      lockfile perd au passage `ajv` en dépendance de développement de la
      racine — il l'y gardait depuis que les lecteurs sont partis dans le kit.
      Vérifié par un `npm ci` dans un dossier neuf, hors de tout `node_modules`
      existant, et pas seulement par un `npm install` sur un arbre déjà peuplé :
      c'est la question que la Phase 2 a appris à poser.
      *Rétabli : la v4 avait perdu cette tâche.* Elle n'est pas optionnelle —
      dès que les lecteurs quittent `scripts/`, le Playground cesse de
      fonctionner s'il n'installe pas le paquet. C'est aussi la seule preuve
      que le kit couvre un cas réel et complet avant le repo de recette.
      *Périmètre volontairement minimal (décision) :* le Playground **reste une
      sandbox jetable**. On le fait marcher avec le kit, on ne l'embellit pas et
      on n'en fait pas encore un exemple documenté. Il garde ses composants
      jetables, son corpus de quatre contrats réels et son test froid.

### Deux défauts trouvés en exécutant la Phase 2

Ni l'un ni l'autre n'était dans le plan, et tous deux étaient **invisibles en
local** — ce qui est la seule chose qu'ils ont en commun, et elle suffit à les
faire manquer.

**La CI de l'Exporter était rouge depuis T1.2**, trois exécutions d'affilée, sur
`Cannot find module '@ucm-kit/core/format'`. Le workflow lance `npm test` avant
`npm run build`, et les tests du plugin importent le `dist/` du kit — présent sur
tout poste où un build a déjà tourné, absent d'un checkout neuf. Corrigé par un
script `prepare` dans le kit, que npm exécute pour chaque workspace à
l'installation, `npm ci` compris : le paquet est construit dès qu'il est
installé, en CI comme à la publication.

**Le paquet ne s'importait pas avec Node.** `tsc` recopie les spécificateurs tels
quels : `dist/format/index.js` portait `from './version'`, sans extension. Un
bundler et `tsx` l'acceptent — donc tout le repository l'acceptait —, Node en
ESM le refuse. Trouvé en installant le tarball dans le Playground, pas par la
suite de tests, qui passe entièrement par `tsx`.
`tests/paquetPublie.test.mjs` relance un `node` neuf, sans `tsx`, et lui fait
traverser la carte `exports` comme un consommateur installé.
*Ce que ces deux défauts disent du plan :* une suite de tests verte sur le poste
du mainteneur ne dit rien de ce qu'un consommateur reçoit. Les deux tests ajoutés
ici sont les premiers à poser cette question, et T7 en dépendra.

---

## Phase 3 — Configuration et CLI

- [X] **T3.1 — `ucm.config.json`.** *Fait le 4 septembre 2026 —
      `kit/src/lecteurs/configuration.mjs`, publié en 0.1.4.* `components`,
      `tokens`, `implementation`. Jamais de numéro de version.
      **Le fichier est facultatif, et c'est le cas nominal**, pas une tolérance :
      un repo neuf avec un seul dossier `components/` doit marcher sans écrire
      une ligne (critère n° 1), et les défauts décrivent exactement ce repo-là.
      L'erreur est un fichier PRÉSENT et mal formé — là quelqu'un a voulu dire
      quelque chose, et retomber en silence sur les défauts ferait chercher un
      contrat là où il n'est pas.
      **Un numéro de version y est refusé, pas ignoré.** L'ignorer serait pire :
      quelqu'un le mettrait à jour en croyant déplacer la fenêtre de lecture, et
      rien ne bougerait. Un geste sans effet est pire qu'un geste refusé.
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

- [X] **T3.2 — `ucm init`.** *Trois quarts faits le 4 septembre 2026, refermée
      le 5 avec le workflow que T3.3 débloque.* Cinq fichiers : la
      configuration, l'association de schéma, `.gitattributes`, `.gitignore`
      (pour `ci-report.md`, que `ucm check --report` régénère à chaque
      exécution) et `.github/workflows/ucm.yml`.
      *Le workflow est écrit pour un repository QUELCONQUE :* `npx --yes` avec
      un pin exact (D7) et aucun `npm ci`, donc aucun `package.json` exigé d'un
      repo qui n'est pas un projet Node — c'est T3.4 rendue vraie par
      construction plutôt que documentée. Le sha de base voyage par
      l'environnement et jamais par interpolation dans le shell.
      *Un `.gitignore` existant n'est pas réécrit* — la règle « ne jamais
      écraser » ne souffre pas d'exception —, et la ligne manquante est alors
      dite dans le compte rendu.
      Écrit la configuration, l'association de schéma et `.gitattributes`, et
      **n'écrase jamais un fichier existant** — c'est la seule faute
      irréversible à sa portée, et il la commettrait au moment où l'utilisateur
      a le moins de raisons de s'en méfier. L'association de schéma pointe le
      paquet INSTALLÉ, jamais une copie locale, qui vieillirait sans que rien ne
      le dise.
      *Justification corrigée :* la v3 disait que le LF servait « à ce que le
      test d'égalité tienne ». Faux — `tests/schema.test.ts:29-37` compare le
      **JSON analysé**, pas les octets, et son commentaire explique pourquoi.
      Le LF sert à la propreté du diff Git.

- [X] **T3.3 — `ucm check`. ⚠ Bloquée par T5.2 — trou de l'ordre d'exécution,
      mesuré le 4 septembre 2026, TRANCHÉ et refermé le 5.**
      *Faite dans `packages/cli/src/check.mjs`, une fois T5.2 déplacée.* La
      commande n'orchestre rien : elle lit des arguments, imprime, écrit un
      fichier sur `--report` et choisit un code de sortie. Éprouvée à froid sur
      un repo neuf — `ucm init` puis `ucm check` sur un dossier `components/` et
      un `tokens.json`, sans une ligne écrite à la main : les critères de
      réussite n° 1, 3, 4 et 6 passent.
      *Un défaut trouvé par ce passage à froid, et PRÉEXISTANT au déplacement :*
      un contrat refusé pour sa version lisait « code conforme » sur sa ligne de
      terminal. L'analyse s'arrête avant la parité, le relevé vierge se lisait
      comme un relevé vide et concluant — la phrase exacte que T2.3 a écrit une
      classe entière de code pour ne plus jamais prononcer sans avoir lu, et
      elle s'écrivait sur la ligne qui annonce le refus. `pariteMesuree` la
      remplace par « code non examiné », avec son test.
      *Ce que la commande ne fait pas, et c'est décidé :* une configuration
      refusée sort en 2 sans écrire de rapport. Formuler ici un diagnostic de
      designer remettrait du vocabulaire de rapport dans l'outil, ce que T5.2
      vient d'en sortir ; le filet du workflow couvre exactement ce cas.
      *Aucun repli silencieux sur le diff :* si `git` échoue, la commande
      s'arrête en 2 au lieu d'ouvrir le périmètre à tous les contrats — se
      tromper sans le dire est pire que s'arrêter.

      *Énoncé et arbitrages d'origine, conservés.* L'orchestration du contrôle
      vit dans `Playground/scripts/check-contract.mjs` et ne rejoint le kit
      qu'en T5.2 — Phase 5, que l'étape 11 place APRÈS la Phase 3. En écrire une
      seconde dans le CLI produirait deux rapports qui divergent, et le désaccord
      serait muet : la maladie exacte que T2.7, T6.0 et T2.6 ont soignée
      ailleurs.
      *Conséquence en cascade, assumée jusqu'au déblocage :* `ucm init` (T3.2)
      n'écrit pas de workflow, un workflow appelant une commande inexistante
      installant une CI rouge dans un repo neuf — au moment exact où son
      propriétaire n'a aucun moyen de savoir si la faute vient de lui.
      L'installation est incomplète et le dit.

      **Décision : T5.2 est remontée avant T3.3, et l'orchestration va dans le
      kit.** Les deux sorties n'étaient pas équivalentes, et la mesure le dit.
      1. **Le réordonnancement ne coûte rien, parce que le blocage n'est pas
         d'ordre mais de DOMICILE.** Le travail réel est d'extraire
         l'orchestration du Playground — racine en paramètre au lieu d'être
         déduite de la position du script, chemins pris dans la configuration au
         lieu de `join(racine, "src")` en dur, aucune sortie de processus, aucune
         écriture de fichier. Ce geste est **identique** quelle que soit la
         destination : le `package.json` d'arrivée est la seule différence entre
         les deux options. « Remonter T5.2 » n'est donc pas un délai, c'est le
         nom de la tâche qui débloque T3.3 dans les deux scénarios.
      2. **La question « le rapport est-il du format ou de l'outil » est déjà
         tranchée dans le code, et le kit l'a gagnée.** `diagnostic-markdown.mjs`
         (`rendreDiagnostic`, `libelleNombre` — la grammaire de tout le rapport)
         et `avertissements-export.mjs` (`sectionAvertissementsExport` ET
         `resumeTerminalAvertissements` — une section markdown complète avec son
         résumé terminal) vivent dans `packages/kit/src/lecteurs` et sont partis
         sur npm dès 0.1.0. Le rapport est déjà à moitié dans le kit. Mettre
         l'autre moitié dans le CLI ne rouvrirait pas la question : cela
         SCINDERAIT le rapport entre deux paquets, la grammaire d'un côté et les
         sections de l'autre.
      3. **Le CLI forcerait à inventer le chargement d'adaptateur tout de
         suite.** La couture de T2.3 tient en trois fonctions — `lireApiPublique`,
         `nomInterfaceAttendue`, `ecartsDeParite` — et `pariteEnEcart` ne juge
         qu'une FORME, sans un mot de TypeScript. Orchestration dans le kit : le
         Playground garde un script court qui l'importe et lui PASSE son
         adaptateur, pendant que `ucm check` appelle la même orchestration sans
         adaptateur — le noyau utile seul, règle de tri n° 3 littéralement.
         Orchestration dans le CLI : le Playground doit appeler un BINAIRE, et
         on n'injecte pas une fonction dans un sous-processus. Il faudrait donc
         un mécanisme de chargement d'adaptateur (champ de configuration,
         `import()` dynamique) que T3.1 a explicitement refusé d'ouvrir et que
         T6.3 doit décider. Sans lui, le Playground perd sa parité le jour de la
         bascule.
      4. **Toute la Phase 2 a été exécutée VERS le kit.** T2.6 le dit en
         justifiant son propre travail : « ces modules rejoindront le kit en
         T5.2 et seront alors imprimés par des repos dont aucun n'écrira de
         `.tsx` » — et `registre-portable.test.mjs` existe pour tenir cette
         promesse-là. T2.3 a coupé la parité sur la ligne kit/adaptateur, T2.7 et
         T6.0 ont établi que l'autorité unique se met dans le kit. L'autre option
         rendrait ces quatre tâches partiellement inutiles.
      5. **L'ordre accidentel a rendu T5.2 MOINS chère qu'à la rédaction.** T3.1
         est faite : `lireConfiguration` existe dans le kit. Le plan prévoyait
         T5.2 avant la Phase 3, ce qui aurait déplacé le rapport avec `src/` en
         dur puis obligé à y revenir. Déplacé maintenant, il lit les chemins de
         configuration du premier coup. L'écart à l'ordre prévu joue ici en
         faveur du projet.
      6. **Ce n'est pas une tâche qui est bloquée, c'est une chaîne.** T7.1 à
         T7.5 exigent de lancer un contrôle dans un repo tiers, ce qu'aucun code
         ne sait faire aujourd'hui. **Toute la Phase 7 restante dépend de T3.3,
         donc de T5.2** — l'étape 11 ne le disait pas, et c'est le critère de
         réussite du plan qui est derrière.
      *Le filet est en place et c'est maintenant qu'il sert :* les sept scénarios
      de T5.1 ont pour raison d'être annoncée « D1, T2.3, T2.4, T2.6 et T5.2 ».
      Ils ne rajeuniront pas.
      *Le code de sortie 1 est déjà réservé* dans le CLI : il désignera toujours
      « des contrôles ont échoué » et jamais « je n'ai pas compris », qui sort
      en 2.
      *Énoncé d'origine, conservé :* sort en 0 ou 1, affiche toujours son
      diagnostic dans le terminal, et écrit le rapport **uniquement sur
      `--report <chemin>`**.
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

- [X] **T3.4 — Fonctionner sans `package.json`.** `npx` l'accepte mais exige
      Node sur la machine : en CI c'est `setup-node`, en local un développeur
      iOS n'en a pas forcément. Pin exact obligatoire (D7), `--yes` à
      documenter.
      *À moitié faite le 5 septembre 2026 :* le workflow qu'écrit `ucm init`
      appelle `npx --yes @ucm-kit/cli@<version exacte>` et n'exécute AUCUN `npm
      ci`. La propriété est donc tenue par construction en CI, et un test la
      verrouille — un `npm ci` réintroduit dans ce workflow le fait rougir.
      **La publication a eu lieu le 4 septembre 2026, et l'essai qui devait la
      confirmer a trouvé pire que ce qu'il cherchait.** `npx --yes
      @ucm-kit/cli@0.1.1 --help`, lancé depuis un dossier vide, meurt à l'import :
      *« @ucm-kit/core/format does not provide an export named
      CONFIGURATION_PAR_DEFAUT »*. Le paquet publié la veille était cassé, et
      personne ne pouvait le savoir.
      **La cause, et c'est une règle qui manquait au plan.** T4.1 a fait
      descendre `configurationDepuisJson` et `CONFIGURATION_PAR_DEFAUT` dans la
      surface publiée du kit **sans monter son numéro de version**. Le dépôt
      portait 0.1.6 et le registre portait un AUTRE 0.1.6. `@ucm-kit/cli@0.1.1`
      est parti en épinglant `0.1.6` — donc en allant chercher l'ancien sur le
      registre. *Un numéro de version publié est immuable : changer ce que le kit
      publie exige de monter son numéro dans le MÊME commit.*
      **Pourquoi aucun garde-fou ne l'a vu, et c'est le point.** `npm ci` lie le
      workspace : tout se construit, se type et se teste contre la source d'à
      côté, qui est juste. `monorepoCoherent.test.mjs` compare le pin du CLI à la
      version que le dépôt porte — 0.1.6 contre 0.1.6, vert. Le mensonge
      n'existait qu'au registre, et le seul moyen de l'y voir était d'y aller.
      C'est la troisième fois que ce projet rencontre la même maladie : deux
      autorités pour la même chose, dont le désaccord est muet.
      *Le garde-fou, et il va chercher là où le mensonge vit :* `publish.yml`
      porte une étape **« Épreuve du registre »**, postérieure à la publication.
      Un dossier vide, sans `package.json` ni `node_modules`, et la commande
      qu'un repo tiers lance vraiment — `npx --yes @ucm-kit/cli@<version>
      --help` pour le CLI, l'import des deux sous-chemins pour le kit. Elle ne
      peut pas empêcher la mauvaise version de partir, puisqu'une version part
      pour toujours ; elle transforme un mensonge qui aurait vécu des jours en un
      run rouge dans la minute, quand le correctif ne coûte qu'un numéro de plus.
      *Corrigé et vérifié :* kit en **0.1.7**, CLI en **0.1.2** épinglant 0.1.7,
      les deux publiés par le workflow. `npx --yes @ucm-kit/cli@0.1.2 --help`
      rend l'aide et sort en 0 depuis un dossier vide — en CI par l'Épreuve du
      registre, et depuis un poste, sans `package.json` ni `node_modules`.
      **La moitié CI de T3.4 est donc tenue pour de bon, et non plus par
      construction.** Reste le cas LOCAL, où `npx` exige Node sur le poste : à
      documenter, pas à outiller.
      **Close le 5 septembre 2026 : la moitié locale est écrite.** Le README
      porte la commande copiable — `npx --yes @ucm-kit/cli@<version exacte>` —,
      dit ce que `--yes` évite (l'invite de confirmation, qui bloquerait une
      exécution non interactive) et pourquoi le pin est exact et sans `^` (D7 :
      une plage laisserait npx choisir une version que personne n'a essayée, et
      le contrôle changerait d'avis sans qu'un fichier ait bougé).
      *Le cas local est documenté et NON outillé, et l'arbitrage tient en une
      phrase.* Distribuer un binaire par plateforme rendrait le contrôle
      installable sur un poste sans Node — et du même coup **deux fois
      installé** : la CI et le poste pourraient répondre différemment sur le
      même contrat, c'est-à-dire exactement la maladie que T4.1, T4.3 et cette
      tâche-ci ont passé leur temps à refermer. Sans Node sur le poste, la CI
      reste l'autorité : ouvrir la pull request rend le rapport, qui est de
      toute façon le seul message que le designer lira.
      *Un garde-fou est né de la ligne écrite,* parce qu'un numéro de version
      recopié à la main dérive : `tests/pinDocumente.test.mjs` exige que chaque
      `@ucm-kit/cli@…` du README porte la version que ce dépôt publie. Sans
      lui, un lecteur copierait une commande installant une version d'avant,
      lirait un rapport plausible, et n'aurait aucune raison de douter — le
      README serait devenu une seconde autorité sur la version du CLI. Éprouvé
      dans les deux sens : remis à `0.1.2`, il rougit en nommant les deux
      numéros.
      *Deux choses trouvées en publiant, et aucune n'était la tâche.*
      **(a) Le lockfile n'était plus installable ailleurs que sur ce poste.** La
      régénération faite en T4.1 avait été lue depuis le `node_modules` de la
      machine plutôt que depuis le registre : npm avait écrit un lockfile à
      l'image de CELLE-CI — 3 champs `resolved` sur 83, et le seul binaire
      esbuild de Windows sur les 26 plateformes qu'exige `tsx`. `npm ci`
      échouait donc partout ailleurs, et le dépôt ne le savait pas, puisqu'ici
      tout était installé. C'est le symptôme de T4.3 vu de l'autre bout : la
      vérité n'existait que dehors. Le remède est une installation propre —
      `node_modules` ET lockfile supprimés —, un `npm install` seul ne défaisant
      rien : npm relit l'arbre en place et le recopie.
      **(b) Une publication est acceptée avant d'être servie.** `npm publish`
      rend `+ @ucm-kit/core@0.1.7` puis avertit : *« Your package is being
      processed and may take a few minutes to become available. »* L'Épreuve du
      registre attendait cinquante secondes et a fait échouer un run dont la
      publication avait parfaitement réussi. Elle attend dix minutes, en le
      disant à chaque tour. *La leçon est pour tous les garde-fous de ce plan :*
      un contrôle qui crie à tort est celui qu'on apprend le plus vite à
      ignorer — et il coûte alors plus cher que son absence, parce qu'il laisse
      croire que quelqu'un regarde.
      **Et une loi trouvée en essayant, le 5 septembre 2026 :** `publish.yml`
      sait désormais publier le CLI, l'exécution a été lancée, et elle échoue en
      `ENEEDAUTH` après avoir construit le tarball. La cause n'est pas un réglage
      manquant : **l'entrée d'éditeur de confiance se déclare POUR UN PAQUET, et
      un paquet absent du registre n'en a pas.** npm ne tente aucun échange OIDC
      parce qu'il n'a personne à qui l'opposer. C'est exactement ce qui s'était
      passé pour `@ucm-kit/core`, dont les 0.1.0 et 0.1.1 sont parties à la main
      avec un code 2FA — le plan l'avait enregistré comme un incident, c'est une
      **règle** : *la première version d'un NOM de paquet part toujours à la
      main, l'éditeur de confiance se déclare ensuite, et toutes les suivantes
      partent du workflow.* Écrite dans `publish.yml`, avec la marche à suivre en
      trois pas.

- [X] **T3.5 — `ucm icons`.** *Fait le 4 septembre 2026.* Liste les `figmaName`
      d'icônes que les contrats du repo réclament, **avec les contrats qui les
      citent** : le nom seul ne suffit pas à agir — pour couvrir une icône, ou
      pour en parler à un designer, il faut savoir où elle est demandée.
      *Elle ne juge pas, et c'est délibéré :* elle n'a aucune idée de ce qu'est
      un jeu d'icônes dans ce repo. Le jour où un champ `icons` existera, elle
      pourra comparer — pas avant, sinon elle inventerait la règle qu'elle
      prétend vérifier.
      *Réintégré :* écarté en v3 comme du cérémonial, il reprend sa place avec
      la décision de T3.1. Puisque la résolution des icônes appartient au repo,
      celui-ci a besoin de savoir **ce qu'il doit couvrir** — sinon la
      responsabilité qu'on lui confie est aveugle. `collecterReferences` sait
      déjà balayer un contrat : le coût est faible, l'usage est réel.

---

## Phase 4 — Plugin Figma

- [X] **T4.1 — Lire `ucm.config.json` dans le repo cible.** *Faite le
      5 septembre 2026.* La désynchronisation était masquée par des défauts qui
      coïncident (`config.ts:128-129` rend `src/components` et `src/tokens`) ;
      elle se déclenche au premier repo aux conventions différentes — et le
      défaut serait **indétectable après coup** : l'export écrit là où la CI ne
      regarde pas, la pull request s'ouvre, le contrôle ne trouve aucun contrat
      nouveau, tout est vert.
      **La grammaire de la configuration est descendue dans `format`, et c'est
      la tâche qui l'a imposé.** Ce fichier a deux lecteurs qui ne partagent
      aucun runtime : la CI, qui l'ouvre avec `node:fs`, et le plugin, qui le lit
      par l'API GitHub depuis un sandbox où `node:fs` n'existe pas. Tant que la
      grammaire vivait du seul côté Node, le plugin en gardait sa propre idée.
      `lecteurs/configuration.mjs` ne garde que l'OUVERTURE d'un fichier ;
      `NOM_CONFIGURATION`, `CONFIGURATION_PAR_DEFAUT`,
      `champsInvalidesDeLaConfiguration`, `configurationDepuisJson` et
      `MOTIF_IMPLEMENTATION_PAR_DEFAUT` sont dans `@ucm-kit/core/format`. Ils
      quittent la porte des lecteurs plutôt que d'y être réexportés — c'est
      l'argument exact de T2.7.
      *Une ambiguïté levée au passage, et elle avait un coût :* `tokens` est un
      chemin de FICHIER, alors que les réglages du plugin enregistraient un
      DOSSIER auquel ils ajoutaient `/tokens.json`. Les deux conventions ne se
      distinguaient pas tant que le dossier s'appelait `tokens`.
      *Un `ucm.config.json` présent et mal formé REFUSE l'export*, même doctrine
      que côté CI : absent est le cas nominal, fautif est une erreur. Et le
      journal du plugin dit désormais **qui** a décidé de l'emplacement — le repo
      ou les réglages —, parce que c'est le seul endroit où la question se pose
      encore.
      *Une contrainte retrouvée en écrivant :* `Object.hasOwn` ne compile pas
      dans `format`, qui cible ES2019 pour le sandbox Figma. Une méthode plus
      récente serait passée à la compilation et aurait manqué à l'exécution,
      dans le seul environnement où l'erreur n'apparaît qu'après la CI.

      **⚠ Le vrai défaut trouvé par cette tâche n'était pas le sien.** En
      branchant le plugin sur le kit, la résolution ouvrait
      `packages/plugin/node_modules/@ucm-kit/core` — une copie **0.1.0
      téléchargée du registre**, pendant que le dépôt en était à 0.1.6. Cause :
      `packages/plugin/package.json` épinglait `0.1.0`, un pin exact appliqué là
      où la règle ne vaut pas. Le kit local ne satisfaisant plus ce pin, npm est
      allé chercher la version publiée. **Le moteur construisait, typait et
      testait contre une copie vieille de six versions, et tout était vert.**
      C'est la maladie que ce projet poursuit partout ailleurs, installée au
      cœur du monorepo : deux autorités pour la même chose, dont le désaccord
      est muet.
      *La règle, et sa borne.* D7 exige un pin exact pour ce qu'un repository
      **consommateur** installe. Elle ne dit rien d'un frère du même dépôt, qui
      n'installe pas — il lit la source d'à côté, et doit la lire toujours.
      `packages/plugin` est privé et ne se publie jamais : `*` y est la bonne
      réponse. `packages/cli` se publie et garde son pin exact.
      *Le garde-fou, et il est éprouvé dans les deux sens :*
      `tests/monorepoCoherent.test.mjs` vérifie la RÉSOLUTION depuis chaque
      paquet — pas le texte du pin, puisque la question est ce que Node ouvre —
      et exige qu'un paquet publié épingle la version que le dépôt porte. Remis
      à `0.1.0`, il rougit en nommant le chemin et la version ; remis à `*`, il
      passe.
      *Et il a fallu corriger le lanceur pour qu'il tourne :* `scripts/run-tests.cjs`
      de la racine n'acceptait que `.test.ts`. Le garde-fou, écrit en `.mjs`,
      n'était pas exécuté — et un test qu'on n'exécute pas ne peut pas échouer.
      Le contrôle absent se lisait comme un contrôle vert, une fois de plus.
      *Note d'exploitation :* `npm install` seul ne suffit pas à défaire cette
      situation — l'entrée reste dans le lockfile. Il faut le régénérer.

- [X] **T4.2 — Annoncer la version du contrat dans le corps de la PR.**
      **Close le 5 septembre 2026.** L'en-tête porte désormais
      `Schéma de contrat : 12.0` sous le chemin du fichier.
      *Pourquoi un numéro sur cette page.* C'est le seul champ qui décide si le
      fichier ENTIER est lisible par le repository — hors fenêtre, le contrat
      est refusé en bloc quel que soit son contenu —, et il est enfoui au milieu
      d'un diff de plusieurs milliers de lignes, où personne ne va le chercher.
      Sur la couverture, celui qui décide de fusionner voit quel schéma vient
      d'arriver sans ouvrir le JSON ; et le jour où le repository change de
      version, les pull requests d'export restées ouvertes disent lesquelles
      précèdent la bascule.
      *Le numéro est lu DANS le fichier, jamais dans `CONTRACT_VERSION`, et
      c'est la seule décision de la tâche qui compte.* L'artefact et la
      constante du plugin sont deux autorités pour la même chose : annoncer la
      constante ferait de ce corps de PR un énoncé sur le PLUGIN déguisé en
      énoncé sur le FICHIER, et le lecteur croirait la couverture plutôt que le
      contenu. C'est le défaut que T4.1 (le pin), T4.3 (le `dist/`) et T3.4 (le
      registre) ont chacune trouvé ailleurs. Un test tient la mutation : un
      contrat en 3.0 s'annonce en 3.0, et le corps ne contient nulle part la
      version courante du plugin.
      *Où vit la règle :* `versionDeContrat` dans
      `packages/kit/src/format/version.ts` — le module qui écrit la version
      devient celui qui sait où elle se relit. Même argument qu'en T4.1 et T4.3 :
      « où vit la version d'un contrat » est une règle du FORMAT. Elle a deux
      lecteurs réels et le déplacement les réunit : le plugin l'annonce,
      `controle-repository.mjs` la juge, et ils lisent maintenant le même champ
      par la même porte. La mutation le prouve — déplacer le champ dans
      `versionDeContrat` rougit dix-huit tests, six du CLI et douze du kit.
      *Ce qu'elle ne fait pas, délibérément :* elle ne juge pas. Une version
      informe (`douze`) est annoncée telle quelle, parce que c'est ainsi que le
      rapport de CI la cite et que les deux doivent pouvoir se rapprocher.
      Reproduire ici la grammaire `majeure.mineure` créerait la seconde autorité
      que la fonction existe pour supprimer : `verdictDeVersion` reste seul à
      connaître la fenêtre.
      *`tokens.json` n'en reçoit aucune, et ce n'est pas un oubli :* c'est un
      arbre DTCG, il ne porte aucun schéma UCM. Lui annoncer celui du plugin
      inventerait une version que le fichier ne contient pas.
      *Un arbitrage que la tâche a dû trancher pour ne pas contredire la règle
      d'à côté.* « Le corps de la PR ne porte QUE les avertissements » interdit
      les notes, dont la conclusion est toujours « rien à faire » : une liste
      dont on apprend qu'elle se survole coûte la lecture de celles qui
      demandent un geste. Une ligne de version écrite à chaque export tombe
      sous ce soupçon. La distinction retenue est celle des DEUX ZONES : une
      note est un CONSTAT sur le contenu et appartiendrait à la liste ; le
      schéma est l'IDENTITÉ de ce qui est déposé, au même titre que le chemin du
      fichier juste au-dessus, et vit dans l'en-tête. La liste des gestes reste
      intacte, et l'invariant est réécrit dans ce sens
      (`AGENTS.md`, `UCM-EXPORTER-SPEC.md`).
      *Un contrat sans version lisible le dit* — « absent du fichier, le
      contrôle du repository refusera ce contrat ». Le plugin en écrit toujours
      une : ce cas vient d'un artefact produit ailleurs, et la ligne ne s'écrit
      donc que dans un cas réellement fautif. Ce n'est pas un cri de loup, c'est
      la cause d'un refus lue en une ligne au lieu d'être cherchée dans le
      rapport.
      *Le kit passe en **0.1.8** et le CLI en **0.1.3** dans le même commit* —
      la surface publiée de `format` gagne un export, et la règle apprise en
      T3.4 dit qu'un changement de surface monte le numéro là où il se produit.

- [X] **T4.3 — ⚠ Détecter la collision d'identifiants côté producteur.**
      **Close le 4 septembre 2026.** `codeIdentifier` n'est pas injective —
      « Icon / Button » et « IconButton » rendent tous deux `IconButton` — et
      l'identifiant nomme le dossier ET le fichier de contrat. Sans refus, le
      second export écrase le premier, la CI ne voit ensuite qu'UN contrat, donc
      aucun doublon, donc aucune erreur. Le garde-fou de
      `validation-graphe-contrats.mjs` est réel et bloquant, et **inatteignable**
      pour la sortie du plugin. La détection existe donc désormais AVANT
      l'écriture, et elle REFUSE (D9).
      *L'arbitre de l'identité, arbitrage 3 tranché :* une **cascade sur le
      signal le plus fort que les DEUX contrats portent** — `componentKey`, qui
      survit à un renommage et à une copie du fichier Figma, sinon `nodeId`,
      toujours présent. `contract.name` n'arbitre PAS : c'est exactement ce
      qu'un renommage change alors que le composant n'a pas bougé, et en faire
      l'arbitre ferait refuser des réexports légitimes — le champ qui varie
      serait celui qui décide. `fileName` est porté pour le message et ne vote
      jamais : le faire voter protégerait d'une coïncidence demandant deux
      accidents simultanés, au prix d'un refus sur un geste courant — renommer
      le fichier Figma. **L'indécidable refuse aussi** : un contrat déjà présent
      sans identité Figma lisible ne permet pas de distinguer un réexport d'une
      collision, et passer outre écraserait peut-être le travail de quelqu'un
      sans un mot.
      *Où vit la règle :* `packages/kit/src/format/identite.ts`, et pas dans le
      plugin. Ce que « le même composant » veut dire est une règle du FORMAT,
      pas de l'outil qui écrit — même raison que `ucm.config.json` en T4.1. Le
      producteur la pose avant d'écrire ; le lecteur qui voudra un jour repérer
      un contrat orphelin posera la même question et doit y répondre pareil.
      *Arbitrage 1, tranché :* **rien.** Sans configuration GitHub il n'y a
      aucun repo à lire, et une ligne de journal à chaque téléchargement local
      dirait toujours la même chose : au bout de quelques exports elle ne se
      lirait plus, et elle userait l'attention que les avertissements réels
      réclament.
      *Arbitrage 2, refermé alors qu'il devait rester ouvert, parce que la
      solution était simple.* La lecture ne voyait que la branche de base : un
      contrat vivant dans une PR d'export **encore ouverte** était invisible, et
      deux composants en collision exportés coup sur coup ouvraient deux PR sur
      le même chemin — la collision ne se révélant qu'à la fusion de la seconde,
      en écrasant la première. Le déblocage tient à ce que les branches d'export
      sont **déterministes** : un seul appel liste les PR ouvertes, le préfixe
      `ucm-exporter/export-component-` les reconnaît, et seules celles-là sont
      ouvertes — normalement aucune. Le filtre est STRUCTUREL, pas un
      rapprochement de titres : un titre est du texte, il dérive sans rien
      casser de visible, et la recherche cesserait alors de trouver quoi que ce
      soit — ce qui se lit exactement comme « aucune collision ».
      *Éprouvé dans les deux sens, et c'est la moitié qui compte :* un garde-fou
      qui refuse tout est aussi inutile qu'un garde-fou qui ne refuse rien. Le
      réexport du même composant après renommage dans Figma PASSE, et un test le
      tient. Deux mutations le prouvent : désarmer le refus rougit trois tests
      du plugin ; faire de `name` l'arbitre rougit le réexport renommé.
      *Ce que la mutation a montré au passage, et qui valait plus que la
      tâche :* la seconde mutation, appliquée à la source du kit, n'a d'abord
      rougi **que les tests du kit**. Les tests du plugin importent
      `@ucm-kit/core/format`, c'est-à-dire le `dist/` CONSTRUIT : ils lisaient
      un kit d'avant la mutation et restaient verts. `npm test` à la racine ne
      construisait pas. La même maladie que le pin du plugin en T4.1, un cran
      plus bas — deux états du même code, dont le désaccord est muet. Le script
      `test` de la racine construit désormais le kit d'abord.
      *Ce que la tâche N'a pas fermé, et qu'il faut dire :* renommer un composant
      dans Figma change son identifiant, donc son chemin. Aucune collision n'est
      alors vue — il n'y a personne à l'emplacement neuf — et le contrat de
      l'ancien nom reste sur place, orphelin. Le graphe n'y voit pas de doublon,
      puisque les identifiants diffèrent. C'est le pendant exact de cette tâche,
      côté lecteur, et `comparerIdentiteDeContrat` est déjà ce qu'il faut pour
      le repérer : deux contrats, deux identifiants, la même identité Figma.


- [X] **T4.4 — Trancher la distribution du plugin** (D6, arbitrage documenté).
      **Tranchée le 5 septembre 2026 : la Figma Community.** L'arbitrage complet
      est réécrit là où la question était posée, `PISTES-EVOLUTION.md §2` ; ce
      qui suit est ce que la décision a coûté à exécuter.
      *Ce que la décision change dans le code, et c'est mécanique :*
      `enablePrivatePluginApi` est réservé aux plugins PRIVÉS d'une
      organisation — le garder rendrait la soumission irrecevable. Il quitte le
      manifest, donc `figma.fileKey` n'arrive plus, donc `meta.figma.url` n'est
      plus écrit.
      *Ce qui ne change pas, et c'est ce qui rendait la décision peu coûteuse :*
      `url` était **déjà optionnel** dans `ContractMeta` et aucun lecteur ne le
      réclame. La version du contrat ne bouge pas, et un contrat produit avant
      la décision reste lisible — un lecteur doit accepter les deux états. La
      première condition posée par D6 était donc tenue avant d'être vérifiée.
      *La moitié la plus importante de l'exécution n'est pas le drapeau, c'est
      l'avertissement supprimé.* « Lien vers Figma absent du contrat » avait été
      écrit quand ce cas était l'EXCEPTION. La Community l'inverse : la clé
      n'arrive plus jamais, donc le message se serait imprimé sur chaque export
      et dans le corps de chaque pull request, pour un constat que le designer
      ne peut pas corriger. C'est exactement la règle que T4.2 venait de
      réaffirmer, retournée contre une décision du projet lui-même — une liste
      dont on apprend qu'elle se survole coûte la lecture de celles qui
      demandent un geste. Un état NORMAL du format se documente une fois, dans
      le type et dans la spécification, pas par un diagnostic répété à l'infini.
      *La seconde condition de D6 était invérifiable, elle devient observable.*
      « La traçabilité par `fileName` et `nodeId` suffit-elle à une revue ? » ne
      se tranche pas en principe, disait D6, mais sur une pull request réelle.
      Elle est donc écrite là où la revue a lieu : `Composant Figma : « Alert » —
      fichier « Design System », nœud 12:345`, dans l'en-tête que T4.2 venait
      d'ouvrir. La question reste posée ; elle est désormais posée à l'endroit
      où quelqu'un peut y répondre.
      *La troisième voie de D6 reste ouverte, et le code ne lui barre pas la
      route.* Le calcul de l'URL est laissé dans `buildMeta` — ce n'est pas du
      code mort par indécision : une organisation qui charge ce plugin en
      développement le rebranche, et la couverture de la PR rend l'URL en lien
      dès qu'un contrat en porte une. Le champ décide, jamais la distribution
      supposée, et un test le tient dans les deux sens.
      *Où vit la lecture de l'origine :* `identiteDeContrat` est exporté par
      `format/identite.ts`, où la fonction existait déjà en privé pour l'arbitre
      de collision de T4.3. Le refus nomme les deux composants, la couverture de
      la PR dit d'où vient celui qu'elle dépose : deux messages, une seule
      lecture de l'origine. Deux lectures auraient fini par diverger, et c'est le
      seul défaut que ce plan poursuit depuis le début.
      *Un garde-fou, parce que ce drapeau est exactement ce qu'on remet « juste
      pour essayer en local » :* `manifestDistribution.test.ts` refuse
      `enablePrivatePluginApi` dans le manifest du dépôt **et** dans celui que
      `build-manifest.cjs` distribue — c'est le second que Figma lit. Éprouvé :
      remis, il rougit en nommant la conséquence. Il a d'ailleurs servi tout de
      suite, en attrapant un `git checkout` qui avait défait le retrait.
      *Kit en 0.1.9 et CLI en 0.1.4* : `identiteDeContrat` entre dans la surface
      publiée, et la règle de T3.4 monte le numéro dans le même commit.
      **Ce que la décision rouvre, et qui n'est pas tranché ici.** Publier sur la
      Community met mécaniquement le projet devant un public non francophone. La
      Phase 8 a écrit que c'est le SEUL événement qui rouvre la question de la
      langue, et qu'il faut trancher à ce moment-là parce que les noms de
      symboles d'un paquet npm publié sont quasi irréversibles. Le moment est
      venu. La question est posée, elle n'est pas résolue, et la trancher
      demande de savoir qui installera ce plugin — pas de relire ce document.
      **Ce que le dépôt ne peut pas faire à la place de quelqu'un.** La
      soumission elle-même est un geste chez Figma : nom public, description,
      icône, illustration de couverture, catégorie, puis une revue par Figma. Le
      dépôt porte le manifest recevable et rien de plus ; `manifest.json` garde
      un `id` de développement (`0000000000000000000`) que Figma remplace à la
      première publication.

### Phase 4 rouverte — ce que la relecture de l'interface a trouvé

La Phase 4 était fermée le 5 septembre 2026. Une relecture de l'interface du
plugin, passée par une revue indépendante, y a trouvé **un bug** et **un
chantier**. Le premier entre ici parce qu'il est du domaine de cette phase ; le
second vit dans son propre document, et cette entrée n'existe que pour lui donner
une place dans l'ordre d'exécution.

- [X] **T4.5 — Le doublon de pull request n'est pas détecté, par construction.**
      **⚠ Avant la Phase 7**, qui exporte en boucle vers un dépôt neuf et
      rencontrera donc ce cas.
      Le contrôle d'immobilité de `publishArtifact` lit le fichier **sur la
      branche de base seulement** : `getRepositoryFile` prend `config.baseBranch`
      comme `ref` par défaut, et l'appel se fait sans `ref`. Les branches des
      pull requests d'export ouvertes ne sont jamais comparées — alors que
      `contratsEnVol` sait déjà les énumérer et lire le fichier sur chacune, mais
      ne sert qu'à `refusDeCollision`, qui rend `null` quand l'identité est la
      même. Conséquence : réexporter un contrat **strictement identique** pendant
      qu'une pull request d'export du même contenu est ouverte crée un doublon,
      sans un mot. C'est la maladie que T4.1 et T4.3 referment ailleurs — un
      export qui atterrit là où personne ne regarde, sans que rien ne rougisse.
      Geste : étendre la comparaison aux branches en vol, et le dire. **Ce n'est
      pas un refus** : réexporter après correction est le geste normal, et le
      message doit informer sans bloquer.
      *Contrainte d'implémentation :* `tests/github.test.ts` couvre
      `publishArtifact`, `repositoryLayout`, `contratsEnVol` et
      `refusDeCollision` en détail. **Étendre la lecture existante, ne pas la
      dupliquer** — deux chemins de lecture du dépôt divergeraient en silence.
      *Pourquoi cette tâche n'est pas déléguée à une session parallèle :* elle
      touche le fichier le plus testé du plugin, et le choix « étendre plutôt que
      dupliquer » est un jugement, pas une transformation mécanique.
      **Fait le 5 septembre 2026.** La lecture a été étendue, et elle a changé de
      nom : `contratsEnVol` devient `exportsEnVol`, parce qu'elle ne sert plus
      seulement aux contrats. Un seul appel liste les pull requests ouvertes, et
      il répond maintenant à deux questions qui viennent de la même cécité —
      « ce chemin est-il déjà pris par un AUTRE composant ? » (T4.3) et « ce
      contenu est-il déjà déposé ? » (T4.5). Deux lectures auraient divergé ; il
      n'y en a toujours qu'une.
      *Ce que l'implémentation a trouvé et que l'énoncé ne disait pas :* le
      doublon n'est pas une maladie des contrats. La collision, si — `tokens.json`
      est unique par repository et ne porte aucune identité Figma à comparer —,
      mais le doublon ne demande qu'un chemin et deux exports, et `tokens.json`
      a un chemin, toujours le même. Le contrôle vaut donc pour les deux genres
      d'artefact, quand le refus reste réservé aux contrats. Un test sépare
      exactement ces deux choses : les tokens listent bien les pull requests
      ouvertes, et ne sont pas refusés pour autant. Regarder n'est pas refuser.
      *L'ordre des deux lectures est un choix de coût, pas un hasard :* la
      branche de base d'abord, les pull requests ouvertes seulement si quelque
      chose a changé. Le cas courant — rien n'a bougé depuis la dernière fusion —
      se tranche toujours en deux appels, comme avant.
      *Ce que le verdict a dû gagner :* `ou`, l'endroit où le contenu identique
      a été trouvé, et l'URL de la pull request quand c'en est une. « Aucun
      changement » sans l'endroit enverrait le designer chercher sur la branche
      de base un fichier qui n'y est pas encore ; il conclurait que son export
      s'est perdu, alors que son travail attend d'être fusionné. Le lien est
      donné, mais le navigateur ne s'ouvre pas tout seul : rien n'a été produit à
      relire, et voler la fenêtre pour une page déjà vue se paierait à chaque
      réexport.
      *Ce qui n'a PAS été écrit, et c'est la leçon de T4.4 appliquée avant
      d'avoir eu à la réapprendre :* aucun message pour un contenu DIFFÉRENT
      pendant qu'une pull request d'export est ouverte. C'est le réexport après
      correction, c'est-à-dire le geste que ce projet encourage ; l'avertir à
      chaque fois imprimerait une ligne de plus sur le cas nominal. Et le silence
      n'est pas total : deux branches qui modifient le même fichier depuis la
      même base entrent en conflit à la seconde fusion, et un conflit Git, lui,
      se voit — ce n'est pas au plugin de redire ce que la forge dit déjà.
      *Éprouvé :* le contrôle neutralisé, les deux tests du doublon rougissent en
      nommant le contenu déposé deux fois ; l'invariant voisin, lui, tient
      toujours — 34 tests dans `github.test.ts`, 708 dans le dépôt.
      *La même entrée vivait ailleurs :* `refonte-ui.md` la portait en U3.0,
      première tâche de sa phase U3. Elle est close par ce commit et pointe ici ;
      une règle, un domicile.

- [ ] **T4.6 — La refonte de l'interface du plugin.** **⚠ Après la Phase 7,
      avant la Phase 8.** Le plan complet, ses trente tâches et ses dépendances
      vivent dans [refonte-ui.md](./refonte-ui.md) : une règle, un domicile —
      cette entrée ne recopie rien, elle ordonne.
      *Ce qui justifie le chantier :* l'interface est un lanceur — deux boutons
      et un journal monospace — là où la doctrine fait du designer le relecteur
      de la vérité visuelle exportée. Ce qui va être exporté, où ça atterrit et
      ce qui a été perdu arrivent tous après le point de non-retour. Et sa
      qualité graphique n'a aujourd'hui **aucun critère** : ni hiérarchie écrite,
      ni inventaire d'états, ni protocole de relecture.
      *Pourquoi après la Phase 7 :* celle-ci valide le flux ; dessiner les écrans
      qui montrent un flux avant de l'avoir validé, c'est les redessiner.
      *Pourquoi avant la Phase 8 :* T4.4 envoie le plugin sur la Figma Community.
      Son interface cesse d'être un outil interne pour devenir la vitrine du
      projet, jugée par une revue Figma et par des gens qui n'ont lu aucun de ces
      documents. L'inventaire des états qu'ouvre ce chantier fournit au passage
      les captures que la soumission réclame.
      *Deux dépendances croisées, déjà inscrites là-bas :* l'harmonisation de la
      langue de l'interface attend l'arbitrage que **T8.11** porte ; et la tâche
      qui écrit dans la spécification que « sélectionner un calque n'est pas
      modifier le document » attend **T8.1**, qui scinde cette spécification.
      **Les deux sont tombées :** T8.11 le 4 septembre 2026 — le français reste,
      l'anglais ne va que sur le README du paquet npm —, et le temps 1 de T8.1 le
      5, qui donne à U4.5 son domicile (`packages/plugin/SPEC.md`). Il ne reste
      donc de T4.6 que U4.5, U4.3 et U4.4, dans cet ordre, plus U6 non décidée.
      *Seule exception à l'ordre :* la phase U0 de ce document — six corrections
      sans décision, dans `src/ui/` et une ligne de `code.ts` — n'a de dépendance
      envers rien et peut se faire à tout moment, y compris dans une session
      isolée : aucun test ne couvre ces fichiers, et aucun autre chantier ne les
      touche.
      **U0 est faite, le 5 septembre 2026**, U0.5 comprise : la décision de
      langue qu'elle attendait a été prise le même jour. Le reste de T4.6 garde
      sa place dans l'ordre. Deux choses en sont sorties qui dépassent l'UI : le
      geste écrit pour U0.2 n'aurait pas corrigé le défaut qu'il visait — un
      `role="log"` porte un `aria-live` implicite —, et U0.6 a produit
      `src/messages.ts`, où vivent désormais les DEUX sens de la frontière
      sandbox ↔ UI, avec une porte d'envoi unique qui rend cette liste
      contraignante au lieu de documentaire. C'est le même geste que T4.1, T4.2
      et T4.3 : une seule autorité pour une chose.
      **U1.0 à U1.3 sont faites elles aussi, le 5 septembre 2026, la Phase 7
      étant passée pour l'instant** — décision du propriétaire du projet, prise
      en connaissance de l'ordre écrit ici. Le risque nommé ci-dessus n'est pas
      couru par ces quatre tâches : elles ne dessinent aucun écran, elles
      décrivent ceux qui EXISTENT et donnent de quoi juger les suivants. Il est
      couru, en revanche, par U1.4 et tout ce qui vient après. Ce que ces quatre
      tâches ont produit : la hiérarchie de l'information et le protocole de
      relecture vivent maintenant dans `CONTRIBUTING.md`, et
      `packages/plugin/galerie/` rend chaque état de l'interface atteignable et
      photographiable hors de Figma, sous un test qui refuse qu'un message
      déclaré n'ait aucun écran où être regardé.
      **Le socle graphique suit le même jour (U1.4 à U1.10).** Un fait de
      plateforme en est sorti, vérifié dans la documentation : Figma ne
      redimensionne aucune fenêtre de plugin de lui-même — `figma.ui.resize`
      existe, mais rien ne l'appelle à la place du plugin, et son minimum de
      70 × 0 ne protège de rien. La poignée et les bornes du plugin vivent
      désormais dans `src/fenetre.ts`.

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
- [X] **T5.2 — ⚠ Déplacer le rapport dans le kit. Remontée avant T3.3**, qu'elle
      débloque, et avant le reste de la Phase 7, qui en dépend par T3.3 (voir la
      décision écrite en T3.3).
      **Close le 5 septembre 2026, des deux côtés.** Le kit porte
      `controle-repository.mjs`, `verdict-bilan.mjs`, `perimetre-rapport.mjs`,
      `diagnostic-tokens.mjs`, `diagnostic-parite.mjs` et `diagnostic-tests.mjs`,
      publiés en 0.1.5 ; le Playground les consomme. `check-contract.mjs` y passe
      de **628 lignes à 105** — l'adaptateur TypeScript, la projection des échecs
      de tests, la publication du rapport, et rien d'autre. 41 tests verts chez
      le consommateur, `npm run check` en 0, même rapport qu'avant.
      *Un `ucm.config.json` est né de la tâche :* le Playground range ses
      contrats sous `src/` et ses tokens dans `src/tokens/`, ce que le code
      devinait en dur. Le déplacement l'a forcé à le déclarer — première
      utilisation réelle de T3.1.
      **Le point que la tâche n'avait pas prévu, et c'est le plus important :
      `registre-portable.test.mjs` devait déménager AUSSI.** Le filet de T2.6
      protège des messages qui viennent de changer de repository. Le laisser
      derrière eux, c'était le perdre à l'instant exact où ces messages
      deviennent PUBLIÉS — imprimés par des repos dont aucun n'écrira de `.tsx`.
      Il vit maintenant dans le kit, balaie tout `src/lecteurs/`, et ne regarde
      plus que le code : un commentaire qui écrit « en React, en Swift ou en
      Kotlin » explique la coupure et ne promet rien à personne. **Un filet se
      déplace avec ce qu'il protège**, et rien dans le plan ne le disait.
      *Ce que le déplacement a corrigé au passage, non prévu :* `index.d.mts`
      déclarait `rendreDiagnostic` et `sectionAvertissementsExport` comme rendant
      une `string`. Les deux rendent un TABLEAU de lignes, que tous les appelants
      répandent — un `...` sur la chaîne annoncée aurait poussé ses caractères un
      par un. Une déclaration qui ment est pire que pas de déclaration, et
      celle-ci était publiée depuis 0.1.0.
      *Un filet ajouté, parce que le déplacement le rend atteignable :* un
      dossier de contrats introuvable rendait un ENOENT non capturé. Chez le
      consommateur d'origine `src/` existait toujours ; ailleurs c'est un
      `ucm.config.json` qui se trompe de chemin. Il rend désormais un rapport,
      comme les deux filets de tokens.
      Allégé de D1 et D2, avec les modules qui l'accompagnent :
      `verdict-bilan.mjs`, `perimetre-rapport.mjs`, `diagnostic-tokens.mjs`
      (allégé), `diagnostic-parite.mjs` (scindé par T2.3), et **la moitié** de
      `echecs-de-tests.mjs` — voir ci-dessous.
      **C'est un DÉPLACEMENT, pas une réécriture** (règle n° 2). Les sept
      scénarios de caractérisation de T5.1 sont le filet : un scénario qui change
      est un changement à assumer dans le même commit, jamais une assertion à
      affaiblir pour retrouver du vert.
      **Deux corrections mesurées le 5 septembre 2026, avant exécution.**

      *a) La liste ci-dessus était fausse sur `echecs-de-tests.mjs`, et T2.6
      avait raison contre elle.* T2.6 l'a classé parmi les trois ADAPTATEURS qui
      gardent le vocabulaire de stack ; le plan le rangeait quand même parmi les
      modules à déplacer. Le code donne raison à T2.6 pour une moitié seulement,
      et la coupure ne passe pas à la frontière du fichier mais **à
      l'intérieur** — exactement comme T2.3 l'a fait pour la parité :

      | Ce qu'il contient | Où ça va | Pourquoi, vérifié |
      |---|---|---|
      | `echecsDuTap` | reste adaptateur | analyse la sortie TAP de `node --test` ; seul appelant `run-tests.mjs` |
      | `composantTeste`, `repartirEchecs` | reste adaptateur | `/([^/]+)\.test\.tsx$/` en dur (`:91`), tri sur `AssertionError` |
      | `diagnosticEchecsDeTests`, `resumeTerminalEchecsDeTests` | kit | vocabulaire du rapport, aucune stack |

      Le kit reçoit donc des échecs **déjà catégorisés** et ne sait rien de TAP
      ni de `.tsx`. Sans cette précision il hériterait d'un analyseur TAP, et la
      règle « le noyau doit être utile seul » retomberait à l'endroit même où
      T2.3 l'a relevée.

      *b) `publier()` ne part pas avec le reste — et c'est la réponse exacte à
      « format ou outil ».* Le kit rend `{ bilans, rapport, bloquant }` et
      **n'écrit rien** : ni fichier, ni `GITHUB_STEP_SUMMARY`, ni `process.exit`.
      La destination du rapport appartient à l'outil — `--report <chemin>` dans
      le CLI (T3.3 l'a déjà décidé en supprimant la variable `CI` magique), le
      script du Playground pour lui-même. **Le CONTENU du rapport est du
      format ; sa PUBLICATION est de l'outil.** Cette ligne rend la question
      décidable au lieu de philosophique, et elle est cohérente avec ce qui est
      déjà publié dans le kit.

      *c) Ce que le déplacement doit corriger au passage, parce que c'est ce qui
      le rend appelable :* la racine devient un paramètre au lieu d'être déduite
      de la position du script, et les chemins viennent de `lireConfiguration`
      (T3.1) au lieu de `join(racine, "src")` et `src/tokens/tokens.json` en dur.
      Le harnais de T5.1 recopie `scripts/` dans un repo jouet **uniquement** à
      cause de cette déduction : il se simplifie avec cette tâche.
- [ ] **T5.3 — Documenter les variables d'environnement**, sans les figer.
      *Réduit :* geler une interface publique avant qu'une CI tierce ne la lise,
      c'est le défaut que T5.5 diagnostique justement ailleurs.
- [X] **T5.4 — Porter les deux filets de sécurité** (`ci.yml:61-68`, `:79-85`) :
      rapport garanti quand la construction échoue et quand la CI s'arrête
      avant. C'est ce qui empêche un refus muet.
      *Faite le 5 septembre 2026, dans le workflow qu'écrit `ucm init` — et il
      n'y en a qu'UN de portable, mesuré.* « La construction a échoué » décrit
      la chaîne de construction du Playground et n'a aucun sens dans un repo qui
      ne compile pas de TypeScript ; ce filet reste chez lui, où il est juste.
      « Le rapport manque » est universel : une pull request refusée sans un mot
      laisse le designer sans recours, et c'est le seul cas où plus personne ne
      peut rien lui dire. La tâche annonçait deux filets à porter ; il fallait en
      porter un et laisser l'autre à son propriétaire.
- [ ] **T5.5 — Action GitHub réutilisable — après la Phase 7.**

- [ ] **T5.6 — Réduire le temps de la CI par du cache.** `ci.yml` enchaîne
      `npm ci`, `npm test` et `npm run build` sans aucun cache de
      `node_modules` ni du `dist/` du kit : `cache: npm` sur `setup-node` ne
      cache que le téléchargement, pas l'installation, et `packages/kit`
      reconstruit à chaque run via son script `prepare`. Mesuré en local :
      22 s pour `npm test`, 6 s pour `npm run build` — l'essentiel du temps
      ressenti sur une PR vient donc probablement de l'installation à froid,
      pas du nombre de tests.
      **Nécessite une recherche avant toute implémentation** : quelle clé de
      cache pour `node_modules` (hash de `package-lock.json`) et pour
      `packages/kit/dist/` (hash des sources du kit) évite les faux
      positifs — un cache qui sert un `dist/` périmé romprait exactement
      l'invariant que `monorepoCoherent.test.mjs` existe pour protéger ;
      si séparer `npm test` et `npm run build` en jobs parallèles vaut le
      coût de deux installations au lieu d'une ; et l'effet réel mesuré sur
      un run GitHub Actions plutôt qu'en local, où le premier run à froid
      n'est jamais représentatif. Faire recherches internet surles bonnes pratiques.

---

## Phase 6 — Couches optionnelles

- [X] **T6.0 — La projection unique nom-de-token.** *Close le 4 septembre 2026,
      les deux côtés branchés (T6.2). Le kit la publie en 0.1.2 ; le Playground
      la consomme ; `src/tokens-accord.test.ts` est passé du rouge au vert sur
      les quatre virgules décimales, et `--layouts-sizing-0-5` vaut désormais
      `var(--primitives-dimensions-2)` — les 2px du contrat, au lieu de 0px.*
      `tokenCssVariable` vit dans `packages/kit/src/format/names.ts`, à côté des
      deux autres projections de nom, et le format en publie désormais TROIS.
      **Où elle vit a été tranché**, le plan se contredisant : T6.1 disait « la
      projection CSS reste dans le preset », T6.2 « `tokenVar` importe la
      projection du kit ». C'est le kit, par l'argument exact de T2.7 —
      `format` est le seul sous-chemin que le bundle du plugin, Node et un
      navigateur atteignent tous les trois. T6.1 garde le preset, qui
      ENREGISTRE un transform appelant cette fonction : l'accord devient
      structurel au lieu d'être relu.
      **La règle n'est pas celle d'un `kebabCase` de bibliothèque**, et le
      constat qui a tranché a été mesuré : celui de Style Dictionary coupe aussi
      sur les bosses de casse — `semiBold` y devient `semi-bold` —, ce qui est
      un comportement de `change-case` et non du format. La règle retenue tient
      en une phrase, pour qu'un preset iOS la tienne sans importer une
      bibliothèque JavaScript : minuscules, toute suite de caractères qui n'est
      ni lettre ni chiffre devient un seul tiret, tirets de bord retirés.
      *Vérifié, et c'est ce qui rend le choix gratuit :* sur les 721 chemins du
      corpus réel, la règle du kit rend **exactement** les mêmes noms que Style
      Dictionary, et chacun de ces noms est déclaré dans le CSS généré. Zéro
      écart des deux côtés. Aucune variable n'est renommée ; le choix ne décide
      que de qui tranchera demain.
      *La neuvième contradiction est refermée par la même occasion :* l'invariant
      « une projection de nom, un propriétaire » est écrit dans `AGENTS.md`,
      là où T0.1 avait constaté qu'aucun document ne le portait.
      *Descendue de la Phase 2.*
      Elles étaient trois — `tokens.ts:47`, `check-contract.mjs`, le
      `name/kebab` de Style Dictionary — qu'aucun test ne compare, et qui
      divergent sur les données réelles : sur 721 tokens (693 à la rédaction),
      quatre portent une virgule décimale (`layouts.sizing.0,5`) que Style
      Dictionary rend `--layouts-sizing-0-5` et la projection naïve
      `layouts-sizing-0,5`.
      **T2.4 en a supprimé une**, celle de `check-contract.mjs`, en retirant son
      besoin plutôt qu'en la corrigeant. Restent `tokenVar` et le preset — d'où
      le déplacement de cette tâche ici. Elle reste nécessaire, et son enjeu est
      maintenant constaté et non plus supposé.
      **Correction du 4 septembre 2026 — le défaut est plus grave que « le
      navigateur ignore », et dans l'autre sens.** En CSS, la virgule dans
      `var()` sépare la variable de sa **valeur de repli**. `tokenVar` rendant
      `var(--layouts-sizing-0,5)`, le navigateur lit « variable
      `--layouts-sizing-0`, repli `5` » — et `--layouts-sizing-0` **existe**
      (`tokens.css:183`, valant `0px`). Rien n'est ignoré : une valeur fausse est
      rendue, plausible et muette. Mesuré sur les quatre :

      | le contrat demande | valeur due | ce que le composant reçoit |
      |---|---|---|
      | `layouts.sizing.0,5` | 2px | **0px** |
      | `layouts.sizing.1,5` | 6px | 4px (`sizing-1`) |
      | `layouts.sizing.2,5` | 10px | 6px (`sizing-2`) |
      | `layouts.sizing.3,5` | 14px | 12px (`sizing-3`) |

      Un `gap` s'effondre à zéro, sans erreur et sans repli. `tokenVar` lève sur
      une valeur brute au nom de la « perte visuelle muette » que son en-tête
      dénonce, et en produit une par le seul chemin qu'elle ne contrôle pas.
      Aucun composant du corpus ne cite ces quatre tokens : le défaut est
      latent, mais il n'est pas bénin, et cette tâche n'est pas de l'hygiène.
      *Ce que ce constat ajoute au plan :* aucun test des deux repositories ne
      rend un composant et ne relit ses styles calculés. Une suite verte ne dit
      donc rien de ce que le navigateur reçoit — comme les deux défauts de la
      Phase 2 disaient qu'elle ne dit rien de ce que le consommateur reçoit.
      **Ce constat a maintenant une tâche : T6.0a, qui la précède.**
      *Classe de divergence plus large que la virgule, vérifiée :* le
      `kebabCase` de Style Dictionary normalise tout caractère hors `[a-z0-9]`.
      `100%` devient `100` — le `%` **disparaît**, donc ce n'est plus une
      bijection : `50%` et `50` produiraient la même variable. Les accents,
      eux, survivent.
- [X] **T6.0a — Le test d'accord entre la projection et le CSS réellement
      généré.** *Écrite et poussée le 4 septembre 2026 —
      `Playground/src/tokens-accord.test.ts`. Elle est ROUGE, et c'est l'état
      voulu :* elle nomme les quatre virgules décimales, et rien d'autre sur
      721 tokens. La CI du Playground est donc rouge sur `main` jusqu'à T6.0,
      délibérément — c'est le « il était rouge, il est vert » que cette tâche
      existe pour rendre possible. **T6.0 devient prioritaire par ce seul
      fait :** une CI rouge qu'on apprend à ignorer ne dit plus rien.
      *Un défaut trouvé en la poussant, et il est de la famille des deux de la
      Phase 2 :* le test était rouge en local sur les quatre virgules, et rouge
      en CI sur un `ENOENT`. `npm run check` générait `src/generated/tokens.css`
      APRÈS avoir lancé les tests ; le dossier est ignoré par git, donc présent
      sur le poste du mainteneur et absent d'un checkout neuf. Un contrôle rouge
      pour la mauvaise raison ne vaut pas mieux qu'un contrôle absent — il fait
      lire un défaut d'installation là où il y a un défaut de projection.
      Corrigé en ordonnant `tokens` avant `test`, comme `predev` et `prebuild`
      le faisaient déjà. **La leçon se répète une troisième fois :** ce qui est
      vrai sur le poste du mainteneur ne dit rien de ce qui est vrai ailleurs.
      *Créée le 4 septembre 2026. À exécuter tout de suite : elle ne
      dépend d'aucune autre tâche, et elle vit chez le consommateur.*
      Pour chaque chemin de token de `tokens.json`, passer ce chemin dans
      `tokenVar` et exiger que la variable ainsi nommée figure parmi les
      propriétés personnalisées réellement écrites dans
      `src/generated/tokens.css`.
      *Pourquoi avant T6.0 et pas dedans :* le test passe au **rouge
      immédiatement**, sur les quatre virgules. C'est ce qui transforme T6.0 et
      T6.1 en « le test était rouge, il est vert » au lieu de « on a réécrit la
      projection et on fait confiance ». Un contrôle écrit après sa correction
      ne prouve que lui-même — c'est la même raison qui a fait remonter T5.1
      avant les cinq tâches qui réécrivent `check-contract.mjs`.
      *Pourquoi ce n'est pas un test de rendu :* aucun navigateur, aucun `jsdom`,
      aucune dépendance nouvelle — une comparaison de chaînes entre deux fichiers
      déjà présents dans le dépôt. `jsdom` ne résout d'ailleurs pas les `var()`
      en cascade et n'attraperait pas ce défaut-là : le contrôle utile est en
      amont du rendu, pas dedans.
      *Ce qu'elle couvre en plus des virgules :* toute la classe de divergence
      décrite ci-dessus, `%` compris — donc ce que T7.0b cherchait à fabriquer à
      la main, sur les données réelles plutôt que sur un jeu inventé.
      *Borne :* elle juge la **projection**, pas l'usage. Qu'un composant cite un
      token inexistant reste l'affaire du contrôle d'existence (T2.4). Les deux
      ensemble ferment la boucle : T2.4 dit que le token existe dans
      `tokens.json`, T6.0a dit que la variable qu'on en tire existe dans le CSS.
- [ ] **T6.1 — Preset Style Dictionary**, transforms graisse et famille, plus le
      test d'accord de T6.0a. La table « nom de graisse → poids » est une
      connaissance du format et va dans le kit ; la projection CSS reste dans le
      preset, pour qu'un futur preset iOS réutilise la table.
- [X] **T6.2 — `tokenVar`** importe la projection du kit. *Fait le 4 septembre
      2026.* `tokenVar` appelle `tokenCssVariable`, et le transform `name/ucm`
      de `style-dictionary.config.mjs` l'appelle aussi — il remplace
      `name/kebab` dans le groupe `css-ds`, deux transforms de type `name`
      s'écrasant l'un l'autre. L'accord n'est plus « deux formules égales » mais
      « un seul appelé » : c'est ce qui empêche la redivergence, pas la
      correction elle-même.
      *Une copie de plus est tombée au passage :* la quatrième de la regex de
      référence que T2.7 poursuivait — `isTokenReference` et `refPath` viennent
      du kit désormais. Le pin du Playground passe à 0.1.2, lockfile régénéré,
      `npm run check` vert : 73 tests, 4 contrats valides.
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

- [X] **T7.0 — ⚠ Trancher l'origine des contrats de recette.** *Tranché le
      4 septembre 2026.*
      `AGENTS.md` de l'Exporter porte en gras : « **Ce repository ne contient
      aucun artefact de contrat, et n'en contiendra pas.** » La raison est
      qu'un exemplaire commité est un instantané, où une régression du moteur ne
      se verrait jamais. La v3 demandait des « contrats d'or commités » sans
      voir la contradiction.
      **Ce que la v5 n'avait pas vu : l'invariant est déjà enfreint, et il
      fallait l'enfreindre.** `packages/kit/fixtures/contrats/11.0/` porte
      quatre `.contract.json` commités, avec leurs empreintes SHA‑256 —
      l'étape 1 de T2.1b les a figés avant que A2 les détruise. Ce n'est donc
      plus un arbitrage à prendre, c'est une règle à rendre exacte.
      **La règle n'était pas fausse : elle est devenue ambiguë.** Elle a été
      écrite quand ce dépôt ne contenait **que** le plugin. Depuis T1.2 il
      contient deux produits, et « ce repository » ne désigne plus rien de
      précis. Or les deux produits posent la question inverse l'un de l'autre :
      - le **moteur** ne doit se tester sur aucun contrat commité, et la raison
        tient toujours — un instantané ne bouge qu'au réexport, une régression
        ne s'y verrait jamais ;
      - le **lecteur** doit prouver qu'il lit **deux** versions (D8), et le
        moteur ne fabrique que la courante. Un contrat N‑1 est donc une chose
        que plus rien ne sait produire, et l'immobilité — le défaut de
        l'instantané côté moteur — est ici la propriété recherchée.
      **Résolution retenue.** La règle d'`AGENTS.md` est réécrite pour nommer le
      moteur au lieu du repository, et le corpus N‑1 est déclaré pour ce qu'il
      est. Elle porte trois bornes : il n'est jamais comparé à une sortie du
      moteur ; il n'est jamais rafraîchi (un réexport le rendrait inutile, il
      cesserait d'être N‑1) ; il disparaît quand la fenêtre de lecture se
      referme au-dessus de sa version, jamais avant. Les empreintes SHA‑256 sont
      ce qui empêche de le croire frais. Il n'est pas publié : `files` du kit ne
      l'inclut pas, et le tarball n'en porte aucun — vérifié.
      **Ce qu'on écarte, et pourquoi.** La résolution que proposait la v5 — « les
      tests du kit consomment des contrats fabriqués par le moteur au moment du
      test » — fait dépendre le kit du plugin. C'est le cycle que T1.0 a supprimé
      à grands frais, réinstallé par les tests : le kit cesse d'être testable et
      reproductible seul, donc publiable de façon reproductible, ce que D5 exige.
      Les contrats fabriqués au moment du test ont leur place, mais **chez le
      plugin**, où le moteur vit déjà — et T2.5 les y a mis.
      Les variantes pathologiques (version future, contrat cassé) restent
      obtenues en **mutant**, jamais en commitant un fichier de plus.
      Le **repo de recette** porte ses propres fixtures : c'est un autre
      repository, la règle ne s'y applique pas.
      *Limite assumée, à écrire parce qu'elle est réelle :* ces quatre contrats
      sont les composants jetables du Playground gelés tels quels, pas une
      fixture pensée. Rien ne dit qu'ils couvrent ce que la 11.0 avait de
      particulier ; ils étaient simplement les seuls qui existaient. Une fixture
      minimale écrite à la main serait plus propre et couvrirait moins — elle ne
      contiendrait que ce que son auteur a pensé à y mettre, et T2.1b élaguerait
      en croyant couvrir la 11.0. Le contrat réel porte des formes que personne
      n'aurait écrites, et c'est précisément ce qu'on veut faire passer dans un
      validateur qu'on coupe.
**Où la recette vit, et pourquoi elle n'a pas attendu le repo du mainteneur.**
*Décidé et exécuté le 5 septembre 2026 —* `packages/cli/tests/recette.test.mjs`.
Le repo de recette réel reste ce qui éprouve le **workflow** : GitHub, une pull
request, un commentaire. Tout ce qui se passe entre le dossier et le rapport,
lui, se rejoue à chaque commit, et l'attente d'un dépôt tiers le laissait
inéprouvé. Les douze scénarios s'exécutent donc ici, avec quatre propriétés qui
les séparent de `check.test.mjs` — laquelle appelle `check` **en processus**,
depuis l'intérieur du monorepo :

1. le repository est construit par `ucm init` et par rien d'autre — le critère
   n° 1 dit « zéro ligne à la main », le seul moyen de le vérifier est de n'en
   écrire aucune ;
2. la commande est lancée comme un **processus**, par le fichier que `bin`
   désigne, depuis ce dossier. C'est la troisième application de la leçon des
   étapes 11 à 13 : *ce qui n'est pas exercé depuis dehors n'est pas su.* Un
   appel en processus ne traverse ni la garde de `process.argv[1]`, ni la
   résolution de `@ucm-kit/core` depuis un autre dossier, ni le code de sortie ;
3. le dossier est hors du monorepo et **aucun `package.json` ne le couvre**,
   jusqu'à la racine du disque — le harnais le vérifie au lieu d'y croire (T3.4) ;
4. les oracles sont ceux de T7.0c, et il n'y en a pas d'autres.

*Ce qu'elle n'installe pas :* `npx --yes @ucm-kit/cli@x` jugerait la version
publiée et non celle qu'on écrit. Le chemin traversé est le même, à
l'installation près — laquelle reste au repo du mainteneur.

- [X] **T7.0b — Un `tokens.json` minimal**, incluant un token à nom non-kebab
      (`0,5`) **et un token à `%`** pour couvrir la perte d'information de T6.0.
      *Réduit par T6.0a :* le cas `0,5` est désormais couvert sur les données
      réelles, chez le consommateur, sans jeu inventé. Ce qui reste ici est le
      token à `%`, qu'aucune donnée réelle ne porte aujourd'hui — vérifié, zéro
      occurrence dans le `tokens.json` du Playground.
      *Fait le 5 septembre 2026, et l'énoncé s'est précisé en l'écrivant.* Le
      `tokens.json` de la recette porte deux tokens, dont `opacites.50%`.
      **Ce qu'il prouve n'est pas la collision — c'est son absence de portée.**
      Le garde-fou de collision vit chez le consommateur
      (`tokens-accord.test.ts`) et n'a de sens qu'avec une chaîne CSS ; la
      recette n'en a aucune. Ce que ce token établit ici est l'autre moitié, et
      c'est celle qui décide de la portabilité : **le chemin portable ne passe
      pas par la projection CSS.** Un token dont aucun nom de variable ne saurait
      porter le nom fidèlement est trouvé quand même, parce que le contrôle
      d'existence compare des CHEMINS dans le fichier DTCG (T2.4). Le jour où ce
      contrôle repasserait par un nom CSS, ce token le ferait rougir — c'est
      exactement ce qu'on lui demande.
- [X] **T7.0c — Des oracles** : code de sortie attendu, titres présents ou
      absents dans `ci-report.md`. *Faits, et ce sont les seuls.* Le rapport est
      le seul message que le designer reçoit ; ce qu'un développeur lirait dans
      un log n'entre pas dans un oracle, à une exception nommée — la ligne de
      terminal de T7.1, parce que « code conforme » est une phrase que le
      rapport n'écrit pas et que T2.3 existe pour ne plus jamais prononcer sans
      avoir lu.

**Cinq scénarios discriminants** (réduits de onze) — *les cinq sont exécutés,
en douze tests, le 5 septembre 2026* :

- [X] **T7.1** ⚠ **en premier** : contrat sans implémentation, dans un repo dont
      les implémentations ne sont pas en TypeScript → l'état doit être juste sur
      la PR d'export elle-même (T2.3). *Vert des deux côtés :* sans le fichier
      Swift, « n'a pas encore d'implémentation » et code 0 ; avec lui, l'état
      d'attente disparaît, aucun écart de parité n'est inventé, et le mot
      « conforme » ne s'écrit nulle part — le terminal dit « présente, non lue
      par l'adaptateur ». Le motif d'implémentation est `{dir}/{id}.swift` par
      DÉFAUT dans le harnais, pour qu'aucun scénario ne retombe par inadvertance
      sur la stack du premier consommateur.
- [X] **T7.2** tokens résolus sans pipeline CSS (T2.4). *Vert.* Ni Style
      Dictionary, ni PostCSS, ni un `.css` : les deux références sont comptées.
      Le scénario porte ses deux bords — une référence disparue avertit sans
      refuser la fusion (critère n° 5), un `tokens.json` absent refuse en
      nommant le préalable plutôt qu'en se taisant.
- [X] **T7.3** version non lue → refus, bon coupable désigné. **C'est le
      scénario qui a trouvé un défaut, et il est de la famille la plus coûteuse
      de ce projet : deux phrases vraies séparément qui se contredisent dans le
      même rapport.** Pour un contrat trop ANCIEN, l'en-tête écrivait
      « réexporter n'y changerait rien » trois lignes au-dessus d'une action qui
      demande précisément de réexporter — et l'en-tête est la première phrase que
      le designer lit. Le critère de réussite n° 4 tombait : le message ne disait
      plus qui corrige, il disait les deux.
      *Cause, vérifiée dans le code :* `seuleLaVersionBloque` répond « oui » sans
      regarder `verdict`, et le commentaire de T2.1b qui justifiait la phrase —
      « aucun réexport ne le rendra lisible » — n'était vrai que du sens
      `recent`. **Aucun test ne l'avait vu parce que tous fabriquaient une
      version FUTURE (99.0) :** le sens `ancien` n'était éprouvé qu'au niveau de
      la section, jamais du titre. C'est la maladie que tout ce dépôt poursuit —
      un contrôle absent qui se lit comme un contrôle vert — et elle a survécu à
      T2.1b, qui touchait ce fichier même.
      *Corrigé dans le même geste :* `phraseDuSensDeLEcart` calcule la phrase
      depuis le sens de l'écart, avec un troisième cas que l'énoncé n'avait pas —
      les deux sens dans le même rapport, où aucune phrase unique n'est vraie et
      où l'on renvoie donc au détail. Trois tests unitaires
      (`verdict-bilan.test.mjs`) et un scénario de recette. **Il était rouge, il
      est vert :** la correction retirée, la recette échoue sur ce test et sur
      lui seul — mesuré, pas supposé.
- [X] **T7.4** contrat cassé → bloque. *Vert, en trois formes.* JSON illisible →
      « n'est pas un fichier JSON valide », avec le geste qui renvoie à l'export
      et interdit la retouche à la main. Fichier vidé (`{}`, JSON parfaitement
      valide) → « incomplet », et surtout **pas** « périmé » : il n'a pas une
      version trop ancienne, il n'en a pas — c'est la nuance que T2.1b avait dû
      écrire, et la recette la tient depuis dehors. Un contrat cassé à côté d'un
      contrat sain → l'accusation reste nominative.
- [X] **T7.5** montée de version : kit N+1 sur contrats N, fenêtre de migration,
      réexport, fermeture. Valide D7 et D8. *La séquence est jouée sur un seul
      dossier* — refus qui nomme le designer et son geste, réexport, fermeture —
      parce que c'est la sortie de crise qui est le sujet : deux dossiers
      prouveraient deux états, pas un chemin. D7 est vérifié à part : le workflow
      épingle exactement, et la configuration ne redéclare jamais la fenêtre.
      **Ce que le scénario a mesuré et que D8 n'a pas obtenu : la fenêtre ne vaut
      qu'UNE version.** `VERSION_CONTRAT_MINIMALE` et `VERSION_CONTRAT_MAXIMALE`
      sont égales, et le fichier l'assume en commentaire. Il n'existe donc aucun
      recouvrement pendant lequel N‑1 et N seraient lues toutes les deux : un
      consommateur passe au rouge à l'instant où le kit monte, et y reste jusqu'au
      réexport. **C'est exactement ce que D8 décidait d'éviter.** La recette ne
      fige pas cet état — elle éprouve la version *sous* la fenêtre, calculée
      depuis les constantes du kit, donc elle restera juste le jour où la fenêtre
      s'élargira. **L'écart D8 ↔ code est donc ouvert et non traité ici** : le
      refermer demande de faire lire le 11.0 aux validateurs, ce que A1 a jugé
      probable mais jamais exercé, et c'est une tâche à part — voir T7.6.
- [ ] **T7.6 — Trancher la fenêtre de lecture : une version, ou deux (D8).**
      *Ouverte le 5 septembre 2026 par la mesure de T7.5.* Deux réponses, et il
      faut en écrire une — le silence se lirait comme une fenêtre de deux
      versions qui n'existe pas.
      *Élargir à deux :* c'est D8 tel qu'il est décidé, et le prix est un
      validateur qui lit réellement le N‑1. A1 a mesuré que
      `champsInvalidesDuContrat` accepterait « probablement » un 11.0 — la marge
      de ce « probablement » est le vrai coût. Les quatre contrats 11.0 figés
      (T7.0) sont là pour ça, et c'est leur seul emploi restant.
      *Assumer une :* alors le commentaire de `version-contrat.mjs` a raison
      contre D8, et **D8 doit être réécrit**, pas laissé à contredire le code.
      Il faut aussi dire ce qu'un consommateur fait pendant la fenêtre qu'il n'a
      pas : la réponse est probablement « le réexport est immédiat et le rapport
      le dit », ce que T7.3 vient de rendre vrai.

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
*L'événement qui devait rouvrir la question a eu lieu, et la réponse est la
même.* La v5 écrivait qu'une publication publique du plugin sur la Community
(D6) mettrait mécaniquement le projet devant un public non francophone, et que
les noms de symboles d'un paquet npm publié étant quasi irréversibles, c'est à
ce moment-là — pas après — qu'il faudrait trancher. **T4.4 a publié, et la
question a été posée le 5 septembre 2026 : le français reste, et le choix est
assumé plutôt que subi.** Ce qui le rend tenable est que les deux surfaces
n'ont pas le même public : le paquet npm est lu par le repository consommateur,
que le projet connaît, tandis que le plugin publié s'adresse de fait à des
designers francophones. Le jour où un consommateur non francophone existera,
c'est lui qui rouvrira la question, avec un cas réel plutôt qu'une hypothèse —
et le coût du renommage aura monté, ce qu'il faut savoir en décidant ceci.
Cette phase reste donc un tri, et ce paragraphe cesse d'être une condition
suspendue : c'est une décision datée.

### 8.1 — Ce qui est mal rangé, vérifié

- ~~la documentation du format est éclatée sur deux repos : la spécification
  (94 Ko) décrit le format **et** le moteur~~ — **la moitié productrice est
  traitée par le temps 1 de T8.1** (5 septembre 2026) : le format vit dans
  `docs/FORMAT.md`, le moteur dans `packages/plugin/SPEC.md`. Restent
  `CHANGELOG-CONTRAT.md` (25 Ko) et `CONTRAT-CONSOMME.md`, qui vivent chez le
  consommateur — c'est T8.4 ;
- ~~`CHANGELOG-CONTRAT.md` s'arrête à la 11.0~~ — **faux depuis, vérifié le
  5 septembre 2026 (R4)** : il porte une entrée `12.0` et sa plage y est
  refermée. Ce qui reste vrai de lui est son domicile, et c'est T8.4 ;
- ~~le skill `rediger-diagnostics-ucm` existe en **deux versions
  divergentes**~~ — **résolu par T8.5** (5 septembre 2026) : même texte des deux
  côtés, à l'adresse de la charte près, et un test les compare ;
- le « document de conventions du projet » que réclame le skill
  `consommer-contrat` n'existe pas ;
- ~~un ancrage du skill promet une commande de contrôle ciblée sur un composant
  qui n'existe pas~~ — **résolu par T8.6** (5 septembre 2026).

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
      l'œil du document ne le couvre pas — il faisait **1 651 lignes** le jour
      de la scission, et c'est ce chiffre-là qui compte, pas les 1 604 que
      portait cet énoncé (recompté par R6 : le document avait grossi entre
      l'écriture de la tâche et son exécution). D'où deux temps, dont seul le
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
      **Temps 1 fait le 5 septembre 2026 ; il reste le temps 2, et c'est
      pourquoi cette case n'est pas cochée.** Les 1 651 lignes sont parties dans
      [docs/FORMAT.md](./docs/FORMAT.md) et
      [packages/plugin/SPEC.md](./packages/plugin/SPEC.md), telles quelles, par
      une partition de ses 212 blocs — 467 lignes au format seul, 204 au moteur
      seul, 771 dans les deux. L'original est figé en
      `tests/fixtures/spec-avant-scission.md`, et il n'a aucun autre emploi.
      *La preuve tient en deux tests* (`tests/scissionSpec.test.mjs`), et **les
      deux ont été vus rouges avant d'être crus** : retirer des deux fichiers une
      règle du contrat la fait nommer, et republier une ligne du format dans le
      moteur fait refuser la remontée du compteur.
      *Le compteur de duplication vaut 756, et ce n'est pas 771 :* les quinze
      lignes d'écart se répétaient DÉJÀ dans le document d'origine — un `---`,
      une clôture de bloc de code, un séparateur de tableau. Les compter poserait
      un plancher que le temps 2 ne pourrait jamais atteindre, donc une cible qui
      ment. Le test ne mesure que les lignes uniques dans le figé, et **il en
      interdit la remontée** : à zéro, ces deux tests et la fixture disparaissent
      avec la tâche.
      *Une seule chose a été réécrite, et il faut le dire :* la PROFONDEUR des
      liens relatifs (`./CONCEPT.md` devient `../../CONCEPT.md` depuis
      `packages/plugin/`). Une adresse n'est pas une règle, et la comparaison du
      test la neutralise explicitement plutôt que de la laisser passer pour du
      texte intact.
      *Ce que la partition a montré et que l'énoncé supposait :* « co-extensifs
      par construction » est mesuré — **53 % des lignes porteuses parlent des
      deux sujets à la fois**. La Partie 3 (configuration et dépôt GitHub) est le
      seul gros bloc qui se sépare proprement, et elle est intégralement du
      moteur.
      **Reste le temps 2**, paragraphe par paragraphe, chaque commit faisant
      baisser le plafond de `scissionSpec.test.mjs` d'autant.
- [X] **T8.2 — Prévoir la casse de `docLinks.test.ts`**, mesurée : **24
      occurrences ancrées dans `AGENTS.md`** (19 ancres distinctes, réparties des
      deux côtés de la frontière projetée), plus `CONCEPT.md`, `CONTRIBUTING.md`,
      `PISTES-EVOLUTION.md`, `README.md`, `ROADMAP.md` — **6 documents** — et
      deux fichiers de code (`exportComponent.ts:46`, `nodeBindings.ts:739`).
      Le second test (`:119-127`) code en dur le nom du fichier, une regex et
      `assert.ok(vises.length >= 10)` : il doit être **réécrit**, pas mis à jour.
      **Faite le 5 septembre 2026, avec le temps 1 de T8.1** — les séparer aurait
      laissé le dépôt rouge entre les deux commits.
      Les 24 renvois d'`AGENTS.md` sont routés : trois vers le moteur (la
      Partie 3), le reste vers le format, parce qu'un invariant y décrit presque
      toujours un CHAMP. `version.ts` et `nodeBindings.ts` suivent ; le renvoi
      d'`exportComponent.ts:46` n'existe plus, la mesure ayant vieilli.
      *Le second test est réécrit, et sa mesure a changé de nature.* Il codait un
      fichier et un plancher de dix ancres — **il serait passé au vert sur un
      document devenu la moitié de lui-même**, ce qui est exactement le défaut
      que la Phase 7 a nommé : un contrôle qui se lit vert sans rien mesurer. Il
      exige désormais que les DEUX spécifications reçoivent des renvois, qu'aucun
      ne vise une ancre absente, et que le total tienne.
      *Une ancre était déjà fausse avant la scission, et elle est corrigée :*
      l'invariant `meta.figma.url` visait la Partie 1 entière, alors que sa règle
      vit dans « Métadonnées ». Il vise maintenant `docs/FORMAT.md#métadonnées`.
      *Et un test a dû apprendre à ne pas juger une fixture :* `docLinks` balaie
      tous les `.md` du dépôt, donc aussi la spécification figée, dont les liens
      relatifs valaient depuis la racine. Il saute `tests/fixtures/` — un document
      gelé n'a pas d'adresses à tenir.
- [X] **T8.3 — Réviser la table « Une règle, un domicile »** de
      `CONTRIBUTING.md`, qui désigne la spécification comme l'autorité unique.
      Scinder crée deux autorités sur des règles qui ne se séparent pas
      proprement : il faut statuer sur celles à cheval.
      **Faite le 5 septembre 2026.** La table porte deux autorités au lieu d'une,
      et la frontière est écrite : une règle qui décrit un CHAMP appartient à
      `FORMAT.md`, une règle qui décrit une LECTURE de Figma à `SPEC.md`.
      *Le statut des règles à cheval est tranché, et ce n'est pas « les deux » :*
      **elles vont du côté du consommateur**, et le moteur y renvoie — c'est lui
      qui a le code sous la main, pas le repository qui lit l'artefact.
      *Ce qui n'est PAS écrit comme une règle, mais comme une réserve datée :* le
      temps 1 les a dupliquées, donc la table décrit aujourd'hui où chaque règle
      ATTERRIRA. La réserve nomme le test qui compte les doublons et disparaît
      avec eux — sans quoi elle serait exactement la sorte d'affirmation périmée
      que le préalable T0 balise.
- [ ] **T8.4 — Traiter les trois orphelins du Playground.**
      *Chiffres revérifiés le 5 septembre 2026 (R6), et ils tiennent tous les
      trois* — `CHANGELOG-CONTRAT.md` a bien 4 renvois (`AGENTS.md` ×2,
      `CONTRIBUTING.md`, `README.md`), `schema/README.md` existe, et le renvoi
      vers `CONTRAT-CONSOMME.md` est toujours à la ligne 25 : il a suivi
      `version-contrat.mjs` dans le kit, où il est **publié sur npm**.
      *Une correction est due et n'a pas été faite ici, faute d'être gratuite :*
      ce commentaire devrait viser `docs/FORMAT.md`, qui vit dans le même dépôt
      que le kit. Le corriger change un fichier publiable, donc exige de monter
      le numéro du paquet et de le republier (`versionSuitLeContenu.test.mjs`
      l'impose). Cela se fait avec le reste de T8.4, pas pour un commentaire
      seul.
      `CONTRAT-CONSOMME.md` est cité par **`version-contrat.mjs:25`**, un
      fichier que T2.1 déplace « tel quel » dans le kit : le paquet publié
      porterait un renvoi vers un document supprimé d'un autre repo. Idem pour
      `CHANGELOG-CONTRAT.md` (4 renvois) et `schema/README.md`, dont la
      suppression entraîne `schema-contrat.mjs`, son test et
      `.vscode/settings.json`.
      **⤷ Absorbée par la Phase 9 le 5 septembre 2026, sans être close.** Les
      trois orphelins sont T9.1, T9.2 et T9.3, et l'énoncé ci-dessus se corrige
      sur deux points en y passant : la suppression de `schema/README.md`
      n'entraîne PAS `schema-contrat.mjs` dans le même geste — c'est la surface
      publique d'un paquet publié, et T9.1 dit pourquoi elle se décide à part ;
      et le coût de la republication est le triple de celui écrit ici (deux
      paquets et un README, par `monorepoCoherent` et `pinDocumente`), ce que
      T9.3 recompte. **Ne pas exécuter cette tâche telle quelle : lire la
      Phase 9.**
- [X] **T8.5 — Fusionner les deux `rediger-diagnostics-ucm`.**
      **Faite le 5 septembre 2026, et la question « laquelle fait autorité »
      n'avait pas à être tranchée** : les deux versions ne sont pas symétriques.
      Celle du Playground avait PERDU deux règles — « un message qui ne demande
      aucun geste est une NOTE, et part dans `infos`, jamais dans `warnings` »,
      et la forme de l'avertissement unitaire. Rien n'avait décidé de les
      retirer. Le texte de l'Exporter est donc le texte, et la fusion est une
      restitution.
      *Deux copies restent, et c'est délibéré :* un skill se charge depuis le
      repository où l'on travaille, et des messages destinés au designer
      s'écrivent encore des deux côtés. C'est la même réponse que pour
      `schema/ucm-contract.schema.json`, copié lui aussi — **ce n'est pas la
      copie qui est dangereuse, c'est la copie que rien ne compare.**
      **⚠ Corrigé le 5 septembre 2026, par la revue de la Phase 9 : le remède
      invoqué n'existe pas du côté du schéma.** `schema-contrat.test.mjs` du
      Playground ne lit jamais la copie locale — il ouvre celle du paquet
      installé —, donc `schema/ucm-contract.schema.json` est précisément « la
      copie que rien ne compare ». La comparaison des deux skills, elle, est
      réelle. L'analogie était fausse dans le sens qui rassure ; elle part avec
      la copie, en T9.1, ici comme dans `skill-diagnostics.test.mjs:8-10`.
      `scripts/skill-diagnostics.test.mjs` les compare caractère par caractère,
      **aux adresses de lien près** : la charte vit dans l'Exporter, le
      Playground la joint par un chemin plus long, et une adresse n'est pas une
      règle — l'exception que la scission de T8.1 s'était déjà accordée.
- [X] **T8.6 — Retirer l'ancrage du skill** qui promet une commande inexistante
      (une ligne), plutôt qu'ouvrir un chantier `process.argv`.
      **Faite le 5 septembre 2026**, en marge de R3 et R4 : c'était la dernière
      BALISE-PERIMEE du projet, et la laisser aurait fait mentir la vérification
      de T8.8. L'ancrage ne se contente pas de perdre la promesse — il dit ce qui
      existe, un contrôle qui balaie le repository, et pourquoi cela suffit : un
      rapport où le composant en cours se retrouve à son nom. **§2.7 portait la
      même promesse** et a été corrigée avec ; ne débaliser que l'ancrage aurait
      laissé la règle fausse deux sections plus haut.
      *Vérifié plutôt que supposé :* `check-contract.mjs` ne lit aucun
      `process.argv`, et `ucm check` n'accepte que `--base` et `--report`.
- [ ] **T8.7 — Passer les documents en registre portable** : « React »,
      « `.tsx` » et « le Playground » ne restent que là où ils décrivent
      effectivement un adaptateur.
- [X] **T8.8 — Réviser la doctrine** (D5) sans perdre l'exigence d'autorité
      unique, corriger au fond les contradictions listées ci-dessous, et
      **vérifier qu'aucune balise de T0.1 ne subsiste** : une balise qui survit
      à sa cause devient à son tour une information périmée.
      **Faite le 5 septembre 2026, et ses trois moitiés étaient déjà tombées
      séparément** — c'est ce qui la rend vérifiable plutôt que déclarative.
      La doctrine D5 a été révisée par R3 : la section « Extraction
      multi-repository » de `PISTES-EVOLUTION.md` ne dit plus « rien à publier »,
      elle dit que l'extraction est faite et **où vit l'autorité unique que le
      découpage devait réaliser** — `CONTRACT_VERSION`, `codeIdentifier`,
      `isTokenReference`, `tokenCssVariable`, chacune écrite une fois dans
      `@ucm-kit/core/format`. L'exigence n'est pas perdue : elle a cessé d'être
      un vœu.
      Les neuf contradictions sont refermées au fond, par T2.4, D1, T7.0, T6.0,
      R3, R4 et T8.6. **La table ne porte plus un seul rang vivant.**
      *Et la vérification des balises, faite par `grep` dans les deux dépôts,
      rend zéro.* Les quatre renvois des points d'entrée — `AGENTS.md` et
      `CLAUDE.md` de chaque repository — se déclaraient balises et partaient
      avec la dernière : **ils sont partis avec ce commit.** Un avertissement
      qui survit à ce qu'il annonce enseigne à ignorer les avertissements.
      *Ce qui NE part pas, et il faut dire pourquoi :* la table elle-même reste,
      barrée. Elle n'avertit plus, elle enregistre — neuf règles fausses, où
      elles vivaient, ce qui les a corrigées. La règle de travail 1, elle, est
      réécrite plutôt que retirée : le jour où la dernière contradiction est
      tombée, la Phase R en trouvait six autres.
- [X] **T8.9 — Doter le Playground d'un test de liens.** Il n'en a aucun, et ses
      renvois croisés vers l'Exporter (dont un skill qui pointe
      `../../../../UCM-Exporter/CONTRIBUTING.md`) supposent deux clones frères
      sans que rien ne le vérifie.
      **Faite le 5 septembre 2026**, et la tâche s'est justifiée d'elle-même :
      la veille, la scission de la spécification avait cassé un renvoi
      d'`AGENTS.md` du Playground vers `UCM-EXPORTER-SPEC.md`, et personne ne
      l'avait vu — l'Exporter, lui, a routé ses propres renvois dans le commit
      de la scission parce qu'un test le forçait.
      *La décision qui compte est celle du clone frère :* le test **l'exige** au
      lieu de sauter les liens qu'il ne peut pas suivre. Sauter aurait rendu le
      contrôle vert exactement dans le cas qu'il existe pour couvrir. La CI du
      Playground clone donc l'Exporter à côté d'elle, et la supposition « deux
      clones frères » cesse d'en être une.
      *Vu rouge avant d'être cru, deux fois :* au premier lancement il a trouvé
      une ancre morte (`#7-samples--le-contenu-que-la-maquette-montre`, un titre
      que le skill `consommer-contrat` ne porte plus), et une sonde temporaire a
      vérifié qu'il attrape aussi bien un fichier absent qu'une ancre absente de
      l'autre côté de la frontière.
      *Trois chemins vieillis sont tombés avec :* la spécification scindée,
      `UCM-Exporter/schema/` devenu `packages/kit/schema/`, et le message
      d'échec du test de schéma.
- [X] **T8.10 — Documenter la responsabilité « icônes » du consommateur (T3.1).**
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
      **Faite le 5 septembre 2026, dans `docs/FORMAT.md` sous « Ce que le
      contrat ne dit pas d'une icône », plus un invariant dans `AGENTS.md`.**
      Le format était le bon document des deux : la frontière dit ce qu'un
      CONSOMMATEUR reçoit et doit compléter, pas comment le moteur lit Figma.
      *Ce que la vérification a précisé, et l'énoncé le disait de travers sans
      le savoir :* « ni taille de glyphe » avait l'air contredit par
      `icons.*.size`, qui EST une taille. Les deux coexistent, et c'est la
      coupure exacte — **le contrat donne le carré, le repo place le glyphe
      dedans.** `ContractIcon.tsx` le montre en trois constantes : un préfixe de
      style (`fa-regular`, donc le jeu), une concaténation `fa-${figmaName}`
      (donc la correspondance), et `0.8` (donc le ratio). Trois décisions, trois
      lignes, et aucune que le contrat pouvait prendre à sa place.
      *Et ce que l'écriture a trouvé :* la doctrine existait déjà, complète et
      juste — dans l'en-tête de `packages/cli/src/icons.mjs`. Elle vivait dans
      la commande qui l'applique, donc invisible pour qui lit le format avant
      d'installer le CLI. La tâche n'a rien inventé : elle a déplacé une règle
      hors du seul fichier où personne ne la cherchait.

### 8.4 — Les deux vitrines

*Ajouté le 4 septembre 2026, à la publication du paquet.* Ces deux documents ne
sont pas du rangement comme le reste de la Phase 8 : ce sont les seuls écrans
qu'un inconnu voit. Ils échouent pour deux raisons opposées, et une seule des
deux tâches attend la Phase 8.

- [X] **T8.11 — ⚠ Le README du paquet npm** (`packages/kit/README.md`).
      **À exécuter tout de suite : le paquet est publié, cette page est déjà en
      ligne.** Elle ne dépend d'aucune autre tâche.
      *Ce qui ne va pas, vérifié :*
      - **aucune ligne d'installation.** Zéro occurrence de `npm install` dans
        le fichier. Un visiteur ne peut rien copier.
      - **aucun exemple exécutable.** L'unique bloc de code est une liste
        d'`import` : il montre ce qu'on peut importer, jamais ce qu'on en fait.
        Le paquet sert à juger un contrat, et la page ne juge aucun contrat.
      - **l'ordre est inversé.** La première section explique *pourquoi* la
        frontière `format` / `lecteurs` existe. C'est une connaissance de
        mainteneur, placée là où arrive un étranger. Le pourquoi est bon — il
        vient après le comment.
      - **`verdictDeVersion` est le seul concept développé, et sans code.** La
        distinction ancien / récent est ce que ce paquet apporte de plus utile ;
        elle mérite trois lignes qu'on peut exécuter.
      - **rien ne dit d'où vient un contrat.** La page ne renvoie ni au plugin,
        ni au dépôt, ni à un exemple de `.contract.json`.
      - **rien ne dit ce que le paquet NE fait pas**, alors que ce projet est
        rigoureux là-dessus partout ailleurs.
      *Ce qui est bon et doit rester :* la définition d'un contrat en un
      paragraphe, et la raison de la coupure des sous-chemins — déplacée plus
      bas, pas supprimée.
      **⚠ Arbitrage que cette tâche force, et que la Phase 8 avait anticipé :
      la langue.** Le préambule de la Phase 8 dit que le seul événement qui
      rouvrirait la question est « une publication publique », parce qu'elle met
      « mécaniquement le projet devant un public non francophone » — et il
      ajoute que c'est **à ce moment-là, et pas après**, qu'il faut trancher.
      Cet événement vient d'avoir lieu. La question ne porte pas sur le
      repository ni sur les noms de symboles, qui restent français par décision
      ; elle porte sur cette page-ci, et sur elle seule.
      **Faite le 4 septembre 2026** (commit `bdc6cb7`), et **cochée seulement le
      5** : le geste avait eu lieu, la case était restée vide. Un plan qui
      contredit son propre journal Git cesse d'être relu — c'est le constat que
      la section « Écart entre cet ordre et ce qui a été exécuté » existe pour
      enregistrer, et il vient de se reproduire sur une case.
      *La langue est tranchée : cette page-là passe en anglais, et elle seule.*
      Elle le dit franchement en pied de page, plutôt que de laisser la surprise
      au premier `import` de `champsInvalidesDuContrat`.
      *Ce qui a rattrapé une affirmation fausse :* l'exemple a été exécuté contre
      le paquet réellement publié, depuis un projet neuf hors du monorepo.

- [ ] **T8.12 — Le README GitHub** (`README.md` de la racine).
      *Reste en Phase 8 :* il dépend de T8.1, qui décide où vit la description
      du format une fois la spécification scindée. **Cette condition est levée le
      5 septembre 2026** : la description du format vit dans `docs/FORMAT.md`, et
      la section « État » du README a désormais un endroit où aller. Les deux
      contradictions bornées de cette tâche avaient déjà été traitées le 4.
      *Ce qui ne va pas — **la liste a été rejouée le 5 septembre 2026 (R6), et
      quatre des six constats étaient déjà faux**. Ils sont barrés plutôt que
      supprimés : une tâche ouverte qui décrit un fichier d'avant-hier est ce que
      R6 existe pour attraper, et l'effacer sans trace ne l'empêcherait pas de
      recommencer.*
      - ~~**il se contredit lui-même, aujourd'hui.** La carte de l'architecture
        annonce `fixtures/`, et la section « État » affirme « Ce repository ne
        contient aucun artefact de contrat ».~~ **Traité le 4 septembre** : la
        seconde phrase n'est plus dans le README.
      - ~~**`packages/kit/` y est décrit « Ne dépend de personne »**, alors que
        le paquet dépend d'`ajv`.~~ **Traité le 4 septembre** : la carte
        attribue désormais l'absence de dépendance au SOUS-CHEMIN `format`, pas
        au paquet.
      - **c'est un document de contributeur, pas une vitrine.** Commandes de
        build et chargement du manifest arrivent avant tout ce qu'un visiteur
        cherche. *Toujours vrai*, à une nuance près : `enablePrivatePluginApi`
        n'y est plus une consigne de contributeur mais l'explication d'un choix
        de distribution (T4.4).
      - **rien à voir.** Un outil qui exporte des composants ne montre aucun
        extrait de contrat, aucune capture. Le lecteur ne sait pas à quoi
        ressemble ce qu'il produirait. *Toujours vrai, et c'est le principal.*
      - ~~**la section « État » est un condensé de spécification** —
        `rendering.keyRoles`, « cinq renvois indépendants », élision des valeurs
        neutres.~~ **Aucune de ces trois expressions n'est plus dans le
        fichier**, et la section a été réécrite par R5.
      - ~~**le paquet publié n'est mentionné nulle part** comme étant
        installable.~~ **Faux depuis le 4 septembre** : `npm install
        @ucm-kit/core` et deux commandes `npx @ucm-kit/cli` y figurent.
      *Borne :* les deux contradictions bornées sont traitées, et R5 a corrigé la
      section « État », qui en portait une troisième. **Ce qui reste de T8.12 est
      la vitrine elle-même** — montrer un contrat, mettre le visiteur avant le
      contributeur — et cela seul.

---

## Phase 9 — Épurer le consommateur de référence

*Ouverte le 5 septembre 2026, sur demande de l'utilisateur : faire du Playground
un dépôt de test épuré au maximum — supprimer ce qui n'est pas essentiel,
migrer chez le producteur ce qui l'est, sans créer de redondance.*

**Cette phase absorbe T8.4 en entier** (T9.1, T9.2, T9.3) et prolonge la
Phase 8 côté consommateur. Elle ne décide rien du corpus : R7 et R8 le font.

*Le brouillon de cette phase a été relu par un agent indépendant, et la revue a
corrigé sept points dont trois inversaient une conclusion. Ses constats ont été
revérifiés dans le code avant d'être intégrés, comme la règle de travail 4
l'exige — et cette fois la revue avait raison sur les sept.* Les erreurs
corrigées sont nommées dans les tâches concernées : elles disent où un lecteur
pressé se tromperait au même endroit.

### 9.1 — Le principe de tri

R5 a écrit ce qu'est ce dépôt : **le consommateur de référence**, « celui qui
sert à vérifier que le kit tient hors de son dépôt d'origine ». Trois règles en
découlent, et elles ne sont pas les trois règles de tri du plan — celles-ci
répartissent une connaissance entre le format, le repo et la stack ; celles-là
décident ce qu'un dépôt de démonstration a le droit de porter.

1. **Ce que le kit installé fournit déjà ne se recopie pas ici.**
2. **Ce qui décrit le FORMAT part chez le producteur**, où vit son autorité.
3. **Ce qui décrit CE repo reste**, y compris son adaptateur — le déplacer est
   une décision de la Phase 6, pas de celle-ci.

### 9.2 — État mesuré du dépôt, le 5 septembre 2026

63 fichiers suivis, 7,9 Mo de `.git`. Documentation ≈ 66 Ko : `AGENTS.md`
19,8 Ko (342 l.), `CHANGELOG-CONTRAT.md` 26,9 Ko (464 l.), `README.md` 9,4 Ko,
`CONTRIBUTING.md` 5,4 Ko, `CONTRAT-CONSOMME.md` 4,2 Ko, `schema/README.md`.
`schema/ucm-contract.schema.json` : 1 838 lignes. Corpus : quatre contrats 12.0,
121 Ko, graphe `StressTest → Alert ×1 + Button ×3 + TileLink ×7` et
`Alert → Button`. Liens : 18 internes, 8 croisés vers `../UCM-Exporter`.

**Ce que le corpus fait pendant que cette phase s'écrit, et il faut le dire :**
les quatre `.tsx` sont en cours de réécriture dans une session parallèle
(825 insertions, 1 634 suppressions), les quatre `index.ts` sont supprimés et
les composants passent à `export default` avec import direct. `npx tsc --noEmit`
échoue donc sur huit `TS2307` dans `App.tsx`, qui importe encore les barils.
**Aucune tâche ci-dessous ne touche à `src/components/`.** Le reliquat —
réaccorder `App.tsx` aux nouveaux exports — appartient à cette session-là.

*Le brouillon avait ouvert une tâche « trancher ce qu'est le corpus », avec trois
options dont « ne garder qu'un composant vivant ». Elle est retirée, pour deux
raisons que la revue a trouvées et que le code confirme : R7 porte déjà cette
question et **l'utilisateur l'a datée le 5 septembre — « R7 reste ouverte »** ;
et l'option « un seul composant » éteignait précisément ce que R8 vient de
trouver. TileLink n'a ni `composes` ni prop booléenne : garder lui seul rendait
`composantsRendus()` et `propsConsommees()` (`parite.mjs:173, 227-252`) muets sur
toute donnée réelle, et supprimait le seul contrat qui exerce « deux dépendances
identiques ne sont pas satisfaites par une occurrence JSX ». Une épuration qui
retire la seule sonde ayant produit un écart n'est pas une épuration.*

### 9.3 — Trois découvertes qui portent le tri

**1. `schema/` du Playground n'est comparé par rien, et le dépôt croit le
contraire.** `schema-contrat.test.mjs` importe `valideurDeSchema` et
`versionDuSchema` de `@ucm-kit/core/lecteurs` ; `schema-contrat.mjs:29-32` du kit
les résout depuis `<paquet>/schema/`, donc depuis
`node_modules/@ucm-kit/core/schema/`. Résolution exécutée : le fichier ouvert est
celui du paquet installé, **jamais le `schema/` local**. Le test dont
`schema/README.md` dit qu'il est « le seul endroit où sa péremption se voit » ne
l'ouvre pas, et son message d'échec demande de recopier un fichier qu'il n'a pas
lu. Les trois copies sont identiques octet pour octet aujourd'hui : la copie ne
ment pas encore, elle est incontrôlée.

**Et le dépôt s'appuie sur cette croyance ailleurs.**
`scripts/skill-diagnostics.test.mjs:8-10` justifie la double copie du skill en
citant celle du schéma, « pour la même raison et **avec le même remède** : ce
n'est pas la copie qui est dangereuse, c'est la copie que rien ne compare ».
**Le remède n'existe pas.** T8.5 de ce plan porte la même phrase. C'est une
contradiction doc ↔ code vivante, dans un commentaire de test, née après que
T8.8 a déclaré la table close — la démonstration que la règle de travail 1 ne
s'assouplit pas.

**2. La question utile est déjà posée chez le producteur, sur des données qui
bougent.** `packages/kit/tests/schema.test.ts:8-13` écrit que l'autre moitié — le
schéma accepte-t-il ce que le moteur écrit — se pose « sur chaque sortie du
moteur dans `exportComponent.test.ts`, via `verifierLeSchema` » ; vérifié,
`lois.ts:389` et `exportComponent.test.ts:49`. Les tests 1 et 3 du Playground
(`:38-40`, `:66-69`) sont mot pour mot ceux du kit (`schema.test.ts:40-46`), et
le test 1 compare désormais **deux valeurs du même paquet installé** : il ne peut
plus rougir.
*La nuance que la revue ajoute, et qui change la justification sans changer la
conclusion :* le Playground restait seul à poser la question sur des contrats
**sortis de Figma pour de vrai**, là où le moteur se teste sur des nœuds
simulés. Ce n'est donc pas « déjà prouvé à l'identique ». C'est « prouvé sur
quatre instantanés qui ne bougent qu'au réexport » — l'argument exact de T7.0
contre les contrats commités côté moteur, retourné contre ce test-ci.

**3. Deux des trois sections du rapport de tests sont structurellement
inatteignables ici.** `composantTeste()` (`echecs-de-tests.mjs:96`) ne reconnaît
qu'un `*.test.tsx`, et il n'en existe aucun — c'est une décision écrite
(`AGENTS.md`, `CONTRIBUTING.md`). `repartirEchecs` (`diagnostic-tests.mjs:46-52`)
ne lit `assertion` que si `composant != null` : **les deux réponses de
l'adaptateur sont donc mortes**, pas une seule. Tout tombe dans `gardeFous`, et
les sections « Le code n'est plus conforme aux contrats » et « Les tests n'ont
pas pu vérifier la conformité » ne peuvent pas s'écrire depuis ce dépôt.
*Note :* T2.6 de ce plan affirme que ces modules « balaient de vrais
`*.test.tsx` ». Il n'y en a aucun. Avec celle du § 1 ci-dessus, cela fait
**deux rangs vivants de plus** dans la table des contradictions, que T8.8 avait
close le matin même — ils y sont inscrits, non barrés.

### 9.4 — Tâches

- [ ] **T9.1 — Supprimer `schema/`, et refermer la croyance qu'il entretient.**
      *Sans dépendance, à prendre en premier.*
      Partent : `schema/ucm-contract.schema.json` (1 838 l.), `schema/README.md`,
      `scripts/schema-contrat.test.mjs` (70 l.), et les renvois d'`AGENTS.md`
      (§ Artefacts dérivés), `CONTRIBUTING.md` (§ Artefacts, § Compatibilité,
      table) et `README.md` (§ Architecture).
      **Trois corrections que la revue a dû apporter au brouillon, et qui sont
      le travail réel de la tâche :**
      1. `.vscode/settings.json:9` pointe vers `./schema/ucm-contract.schema.json`.
         C'est ce qu'il faut CHANGER, pas un état acquis — le brouillon l'écrivait
         au présent. Il vise ensuite
         `./node_modules/@ucm-kit/core/schema/ucm-contract.schema.json`.
      2. **Le `fileMatch` ne se recopie PAS d'`ucm init`.** `init.mjs:71` écrit
         `["*.contract.json"]`, qui ne couvre pas un contrat co-localisé en
         sous-dossier — c'est-à-dire le rangement de ce dépôt. Il reste
         `["**/*.contract.json"]`. *Le glob d'`ucm init` mérite d'ailleurs une
         question à part : il ne couvre pas non plus le rangement qu'il
         installe lui-même.*
      3. `.gitattributes` ne porte QUE `schema/*.json text eol=lf`. Le supprimer
         laisserait trois lignes de commentaire et zéro règle, alors que
         `init.mjs:52-64` écrit dans tout repo neuf `*.contract.json text eol=lf`
         et `tokens.json text eol=lf`, **que ce dépôt n'a pas** — et que git
         convertit déjà en CRLF sur ce poste. La tâche remplace la règle au lieu
         de la retirer, et le consommateur de référence cesse de diverger du CLI
         sur un point que le CLI juge central.
      **Ce qu'elle emporte aussi, et sans quoi elle laisse une balise neuve :**
      la phrase de `skill-diagnostics.test.mjs:8-10` et celle de T8.5 ci-dessus,
      qui invoquent un remède inexistant.
      **Ce qu'elle laisse et pourquoi :** après elle, `CHEMIN_DU_SCHEMA`,
      `lireLeSchema`, `versionDuSchema` et `valideurDeSchema`
      (`lecteurs/index.mjs:111-114`) n'ont plus **aucun** consommateur, ici ni
      ailleurs — le plugin résout `@ucm-kit/core/schema` en direct
      (`lois.ts:39`), le kit passe par `build-schema.ts`. T8.4 demandait que la
      suppression « entraîne `schema-contrat.mjs` » ; on ne le retire pas dans
      le même geste — c'est une surface publique de paquet publié, et la retirer
      est une rupture qui se décide, pas un effet de bord. À écrire dans le
      compte rendu, et à trancher avec T9.3, qui monte déjà le numéro.

- [ ] **T9.2 — `CHANGELOG-CONTRAT.md` part chez le producteur.** *(= T8.4,
      moitié 1.)* Un historique de schémas décrit ce que le producteur a publié,
      pas ce que ce repo lit. Destination écrite en 8.2 :
      `docs/CHANGELOG-FORMAT.md`. **Il n'existe pas encore** — la tâche le crée.
      *Deux dépôts, donc un ordre, sans quoi le contrôle de liens est rouge
      entre les deux commits :* écrire chez le producteur, ajouter le renvoi à
      `docLinks.test.ts`, PUIS router les quatre renvois du consommateur
      (`AGENTS.md` ×2, `CONTRIBUTING.md`, `README.md`) et supprimer.

- [ ] **T9.3 — `CONTRAT-CONSOMME.md` part.** *(= T8.4, moitié 2.)*
      **Son argument est plus fort que celui du brouillon, et c'est la revue qui
      l'a trouvé : le document est périmé sur toute une section.** « Lecture par
      les contrôles » (`:52-67`) situe `references-token.mjs`,
      `validation-contrat.mjs`, `variant-views.mjs`,
      `validation-graphe-contrats.mjs`, `validation-echantillons.mjs` et
      `avertissements-export.mjs` dans ce repository : les six vivent dans le
      kit depuis T2.1. Il annonce en plus un croisement `nonListes` / `fantomes`
      « dans `check-contract.mjs` », lequel fait 110 lignes et n'en porte
      aucune — ils sont dans `controle-repository.mjs:218-221, 351, 360-361,
      415-418`. R4 disait avoir corrigé « trois documents qui situaient encore
      `version-contrat.mjs` » ; ceux-là sont restés.
      *Triage avant suppression, parce que tout n'est pas dupliqué :* « Forme
      lue » (`:14-50`) est dans `docs/FORMAT.md` ; « Lecture par les contrôles »
      est fausse et part sans regret ; **« Politique de compatibilité »
      (`:69-78`) n'est écrite que là** — « les constantes de version changent en
      dernier » — et rejoint `AGENTS.md`.
      **Le coût réel, recompté par la revue, et il est le triple de l'annoncé.**
      `version-contrat.mjs:25` cite ce document dans un paquet publié.
      `versionSuitLeContenu.test.mjs:93-100` impose alors de monter
      `@ucm-kit/core` ; `monorepoCoherent.test.mjs:84-99` impose que le CLI
      épingle exactement la version courante, donc `packages/cli/package.json`
      change ; `versionSuitLeContenu` impose alors de monter le CLI aussi ; et
      `pinDocumente.test.mjs:26-44` impose que le README suive. **Trois fichiers,
      deux paquets, un README.**
      *Et ce qui force la PUBLICATION n'est pas ce test-là* — il écrit lui-même
      (`:21-28`) qu'il ne va pas au registre et qu'« un numéro jamais publié
      qu'on monterait pour rien ne coûte rien ». C'est D7 : `init.mjs:125` écrit
      `npx --yes @ucm-kit/cli@<version locale>` dans le workflow de chaque repo
      neuf, et `recette.test.mjs` construit ses dépôts par `ucm init`. Un CLI
      monté et non publié met un 404 dans chaque workflow généré — la panne que
      les étapes 11 à 13 ont payée deux fois.
      **Conséquence d'ordonnancement :** T9.3 s'exécute avec les autres tâches
      qui touchent un fichier publiable — **T7.6** (`version-contrat.mjs`),
      **T6.1** (la table graisse → poids qui entre dans le kit) et l'arbitrage
      sur `schema-contrat.mjs` laissé ouvert par T9.1. Une publication pour les
      quatre, pas quatre publications.

- [ ] **T9.4 — Écrire ce qu'`echecs-de-tests.mjs` ne peut plus dire ; ne rien
      couper.** *Le brouillon proposait de retirer `composantTeste`. La revue a
      montré que ce serait une faute, et le code lui donne raison :*
      `diagnostic-tests.mjs:15-31` documente `composant` et `assertion` comme la
      surface qu'un adaptateur DOIT fournir — « seul l'adaptateur peut
      répondre » —, et cette surface est celle d'un paquet publié qu'un repo
      tiers avec des tests par composant utilisera. La couper ferait mentir le
      kit sur ce qu'il attend.
      Ce qui reste à faire est donc documentaire et vaut d'être écrit : dire
      dans `echecs-de-tests.mjs` et dans `AGENTS.md` que ce dépôt rend
      `composant: null` **par décision**, que les deux sections correspondantes
      du rapport y sont inatteignables, et que `parite.test.mjs` couvre la
      fonction sur fixtures (`:110-147`) — un lecteur qui la croit morte la
      supprimerait.

- [ ] **T9.5 — Retirer d'`AGENTS.md` ce qui est prouvablement dit ailleurs.**
      342 lignes, dont 93 d'« Invariants » et 45 de « Ce que les contrôles ne
      vérifient pas » qui décrivent le FORMAT et ont désormais une autorité à un
      lien de distance (`docs/FORMAT.md`, `AGENTS.md` du producteur). Reste ce
      que ce dépôt est seul à porter : les trois interdits absolus, sa carte, les
      quatre choses qu'il est seul à répondre, la procédure du test froid.
      **Précondition non négociable — T8.7 d'abord.** T8.7 passe les documents
      en registre portable ; T9.5 réécrit exactement ces documents. Les faire
      séparément, c'est les réécrire deux fois.
      **Et il manque à cette tâche ce que T8.1 s'était donné :** une preuve
      mécanique. « Prouvablement dit ailleurs » n'est prouvable par rien
      aujourd'hui, et une relecture à l'œil de 342 lignes est exactement ce que
      la règle 2 interdit. La tâche commence donc par écrire son contrôle —
      voir T9.8.

- [ ] **T9.6 — Fondre `CONTRIBUTING.md` dans `AGENTS.md`, en deux temps.**
      5,4 Ko dont les trois quarts répètent le producteur ou `AGENTS.md` ; un
      sandbox à un mainteneur n'a pas de contributeurs externes à guider, et la
      charte des messages désigne déjà `../UCM-Exporter/CONTRIBUTING.md`.
      *Deux temps, parce que la règle 2 vaut ici aussi et que le brouillon la
      violait :* déplacer sans réécrire, puis réécrire. Dépend de T9.5 (même
      fichier d'arrivée) et de T9.2/T9.3 commitées — sa table « Documentation »
      (`:94-110`) cite les documents supprimés.

- [ ] **T9.7 — `README.md` redevient une page d'accueil.** 9,4 Ko, dont une
      section « Consommation des artefacts » de 108 lignes qui redit
      `docs/FORMAT.md`. Cible : ce que c'est, comment le lancer, ce qu'il prouve,
      où va le reste. Même critère que T8.12 côté producteur — le visiteur avant
      le contributeur.
      *Borne à respecter :* il porte 6 des 18 liens internes du dépôt, et
      `liens-documents.test.mjs:140` exige `internes.length > 0`. Vider sans
      compter ferait tomber le plancher d'un contrôle en le laissant vert.

- [ ] **T9.8 — Donner à cette phase un critère de fin mesurable.**
      *C'est le manque principal que la revue a relevé, et il est structurel :*
      « épuré au maximum » n'est vérifiable par rien, alors que chaque autre
      phase de ce plan s'est donné un compteur — la duplication de T8.1, le
      plancher réécrit de `docLinks`, `versionSuitLeContenu`, les oracles de
      T7.0c. Sans compteur, la prochaine passe de ménage repose les mêmes
      questions, et le paragraphe de prose censé l'empêcher périme comme les
      neuf autres.
      Écrire dans le Playground un test qui mesure la **surface documentaire** —
      total d'octets des `.md` hors `.claude/skills/` — et **en interdit la
      remontée**, comme `scissionSpec.test.mjs` interdit celle du compteur de
      duplication. Il se pose avant T9.5, il descend avec chaque tâche, et il
      part le jour où la cible est atteinte.
      *À écrire en même temps :* l'accord entre `ci.yml` et le workflow
      qu'`ucm init` génère. Leurs deux derniers blocs — « Garantir un diagnostic
      même sans rapport », « Publier le diagnostic » — sont identiques dans tout
      ce qui s'exécute et diffèrent dans les commentaires ; le test neutralise
      les commentaires comme `skill-diagnostics.test.mjs:34-36` neutralise les
      adresses.
      **Ce qu'on N'EST PAS en train de faire, et la revue a tranché contre le
      brouillon :** le Playground n'adopte pas le workflow d'`ucm init`. Trois
      obstacles, tous vérifiés. `check-contract.mjs:29-32` dit pourquoi ce dépôt
      garde son script — `ucm check` n'a pas d'adaptateur et ne reçoit pas les
      échecs de tests. Les deux écrivent `ci-report.md` (`check-contract.mjs:106`
      et `init.mjs:125`), donc le second écrase le premier et **la PR recevrait
      le rapport sans parité ni tests, plus vert que la réalité** — le défaut que
      ce dépôt poursuit partout. Et `ucm init` n'écrase jamais et écrit
      `ucm.yml`, pas `ci.yml` : « adopter » demande un geste que la commande ne
      fait pas. La bascule a pour précondition T6.3.

- [ ] **T9.9 — Le reste du ménage, mesuré mais non classé par le brouillon.**
      *Cinq points que la revue a trouvés et que le code confirme. Petits
      séparément, ils font le bruit de fond du dépôt.*
      - `src/index.css` : 132 lignes, dont 111 de banc typographique (15 classes
        `.ucm-type-*`) qui ne servent qu'à `TypographySandbox` (`App.tsx:394-444`)
        et ne lisent aucun contrat. À garder ou à retirer, mais à décider.
      - `src/tokens.test.ts` : trois tests sur six (`:13-29`) portent sur la
        projection chemin → variable, qui vient entièrement du kit depuis
        T6.0/T6.2 et y est testée (`names.test.ts`). Seul le refus d'une valeur
        brute (`:36-47`) appartient à ce dépôt.
      - `src/tokens-accord.test.ts` lit `src/generated/tokens.css`, que
        `.gitignore` exclut. L'ordre `tokens` avant `test` n'est garanti que par
        `check.mjs:46` : **`npm test` seul, sur un checkout neuf, échoue en
        ENOENT** — la panne que T6.0a raconte avoir corrigée, et qui ne l'est
        que dans `npm run check`.
      - `ContractIcon.tsx:5` : `ICON_GLYPH_RATIO = 0.8`, que son commentaire
        appelle « convention temporaire ». **T8.10 est close depuis le
        5 septembre** et a écrit la frontière : le commentaire peut renvoyer à
        `docs/FORMAT.md` au lieu de s'excuser.
      - `.agents/skills/` et `.claude/skills/` cohabitent ici, l'Exporter n'a que
        le premier. Deux conventions, aucun document ne dit pourquoi.
      *Et une précondition du test froid qui n'est écrite nulle part :* les
      icônes ne se rendent qu'avec un `VITE_FA_KIT_ID` dans un `.env.local` non
      versionné (`index.html:19`). L'étape 3 — comparer des variantes à Figma —
      ne peut pas juger une icône sur un poste neuf.

### 9.5 — Ce qui ne bouge pas, et pourquoi

À écrire dans `AGENTS.md` avec T9.5, sans quoi la prochaine passe repose la
question.

- **`parite.mjs` reste ici.** *Le brouillon avait la bonne conclusion et la
  mauvaise raison, deux fois.* Il invoquait « la règle de tri n° 3 du plan » pour
  « un adaptateur reste chez son consommateur » : cette règle dit tout autre
  chose — « le noyau doit être utile seul » —, et T3.3 l'applique en sens inverse
  (« le Playground garde un script court qui l'importe et lui PASSE son
  adaptateur, pendant que `ucm check` appelle la même orchestration sans
  adaptateur — le noyau utile seul, règle de tri n° 3 littéralement »). Il
  chiffrait ensuite le coût en « troisième publication npm », alors qu'un
  sous-chemin d'export du kit coûte une montée de version, pas un paquet.
  **L'obstacle réel est ailleurs, et il est solide :** `parite.mjs:34` importe
  `typescript`. Faire entrer un compilateur dans un paquet dont l'argument de
  vente est « `format` ne dépend de personne » est le prix à peser, et T6.3 est
  l'endroit où on le pèse.
- **`style-dictionary.config.mjs` ne relève PAS du même argument**, contrairement
  à ce que le brouillon écrivait. T6.1 a déjà décidé sa destination : la table
  « nom de graisse → poids » est une connaissance du format et entre dans le
  kit, la projection CSS reste dans le preset. Ce n'est pas un paquet à publier,
  c'est un objet de 17 entrées (`:31-47`) à déplacer, au prix d'une montée de
  version — donc avec T9.3. Une tâche ouverte ne se clôt pas en « ne bouge pas ».
- **`App.tsx`, `index.html`, Vite, Tailwind, `@fontsource`** : l'étape 3 du test
  froid demande un navigateur.
- **`.claude/skills/consommer-contrat/SKILL.md`** (439 l.) : un skill se charge
  depuis le dépôt où l'on travaille, et une reconstruction à froid se fait ici.
- **`liens-documents.test.mjs`** : il a déjà attrapé une ancre morte et un renvoi
  cassé par la scission. Il rétrécit avec les documents, il ne part pas.

### 9.6 — Ce que cette phase ne fait pas

Elle ne touche à aucun contrat ni à aucun `.tsx` — R7 et R8 portent le corpus.
Elle ne réécrit aucune phrase du rapport : elles vivent dans le kit depuis T5.2.
Elle ne crée aucun paquet. Elle ne publie qu'une fois, avec T9.3.

---

## Phase R — Écarts trouvés par la revue du 5 septembre 2026

Six écarts entre ce plan et le code, relevés par une **revue globale rapide** — un septième s'y est ajouté en exécutant le deuxième, un huitième en exécutant le septième :
elle a sondé, elle n'a pas audité. Chaque point ci-dessous est une mesure prise
une fois, pas un fait établi — et la règle de travail 4 enregistre déjà qu'une
conclusion de revue non revérifiée s'intègre à l'envers.
**L'agent qui prend un de ces points refait lui-même la recherche, sur ce sujet
précis, avant d'écrire une ligne ; si elle contredit l'énoncé, c'est l'énoncé qui
a tort.** La revue s'est faite pendant qu'une autre session modifiait le dépôt :
le worktree bougeait sous la mesure.

- [X] **R1 — ⚠ La `0.1.9` publiée n'est pas la `0.1.9` de ce dépôt. À traiter en
      premier : c'est en ligne.** `verdict-bilan.mjs` a changé après le dernier
      relèvement de numéro sans que le numéro bouge, et le CLI publié épingle
      cette 0.1.9 : un repo qui installe `ucm check` aujourd'hui recevrait le
      défaut que la Phase 7 a corrigé — le critère de réussite n° 4, sur la
      première phrase que le designer lit. `pinDocumente.test.mjs` reste vert
      parce qu'il compare des numéros, pas des contenus.
      **Rechercher d'abord :** date de publication de chaque version, dernier
      commit touchant `packages/kit/package.json`, diff du kit depuis ce commit,
      et le contenu **réellement publié** — pas le dépôt local.
      **Recherche refaite le 5 septembre 2026, et l'énoncé tient sur les
      quatre points.** `0.1.9` est partie du registre le 4 septembre à 21:32
      UTC, quatre minutes après `195eb09`, le commit qui a posé ce numéro :
      c'est donc bien celui-là qui est en ligne. Deux commits ont touché des
      fichiers publiables depuis — `57cc083`, le correctif de T7.3 dans
      `verdict-bilan.mjs`, et `ea46acb`, une adresse de renvoi dans
      `version.ts`. Le tarball téléchargé du registre le confirme au lieu de le
      supposer : `phraseDuSensDeLEcart` n'y est pas, zéro occurrence. Et le
      chemin est bien celui d'un consommateur — `controle-repository.mjs`, ce
      que `ucm check` exécute, importe `enteteDuVerdict`.
      *Ce que la recherche ajoute à l'énoncé :* le CLI doit repartir lui aussi.
      `@ucm-kit/cli@0.1.4`, seule version servie, épingle EXACTEMENT `0.1.9` —
      c'est D7, et c'est le CLI qui décide ce qu'un repo tiers installe. Monter
      le kit seul ne changerait rien pour personne.
      **Le dépôt porte désormais 0.1.10 et 0.1.5, et un garde-fou l'a exigé.**
      `tests/versionSuitLeContenu.test.mjs` compare le contenu publiable de
      chaque paquet au commit qui a POSÉ son numéro, et **il a été vu rouge
      avant d'être cru** : il a nommé `195eb09` et les deux fichiers sans qu'on
      lui dise lesquels chercher. Il ne va pas au registre — l'épreuve de
      `publish.yml` y va déjà, mais seulement APRÈS une publication, or ici il
      n'y en a pas eu : c'est le silence qui a menti, pas la publication. Les
      deux workflows prennent `fetch-depth: 0` du même coup, sans quoi le clone
      superficiel de `actions/checkout` rendrait ce test vert sans rien mesurer.
      **Publiés le 5 septembre 2026**, le noyau puis le CLI, et vérifiés
      depuis dehors comme la leçon des étapes 11 à 13 l'exige : dans un dossier
      vide, hors du monorepo, `npx @ucm-kit/cli@0.1.5 init` puis `check` sur un
      contrat 11.0 écrivent « Il vient d'une version que ce repository ne lit
      plus : réexportez-le depuis Figma » — la phrase que le rapport dément
      trois lignes plus bas est partie du registre, pas seulement du dépôt.
      *Deux fois le garde-fou a crié à tort, et les deux fois il avait tort pour
      une raison qui valait d'être écrite.* La première : `npm ci` pose le bit
      exécutable sur le `bin` du CLI, que Git suit en `100644`, donc `git diff`
      voyait un fichier modifié en CI et rien sur le poste Windows où
      `core.fileMode` vaut déjà `false`. Le mode ne part pas au registre — npm
      le pose à l'empaquetage —, seul le contenu se compare désormais. La
      seconde : l'épreuve du registre attendait que `npm view` réponde, puis
      lançait `npx`, qui a rendu ETARGET sur la MÊME version dans la même
      seconde — l'API du registre et le packument servi par le CDN ne disent pas
      la même chose au même moment. La patience enveloppe maintenant l'épreuve
      elle-même, avec `--prefer-online` ; une sonde posée à côté de ce qu'on
      mesure ne mesure pas ce qu'on croit. Aucun numéro n'a été brûlé dans les
      deux cas : le run s'est arrêté avant `npm publish` la première fois, et
      après une publication réussie la seconde.
      **Ce que R1 laisse ouvert, et c'est R2 :** le Playground épingle toujours
      `0.1.5`, cinq versions derrière ce que le registre sert maintenant.

- [X] **R2 — Le Playground épingle une version que ce dépôt a dépassée.** Le seul
      consommateur réel du kit ne voit ni la Phase 4 ni la correction de la
      Phase 7. Dépend de R1 : monter le pin vers un numéro dont le contenu publié
      est faux ne corrige rien.
      **Rechercher d'abord :** le pin réel du Playground, et ce que chaque
      version d'écart change pour lui — pas seulement l'écart de numéro.
      **Faite le 5 septembre 2026, juste après R1.** Le pin réel était `0.1.5`,
      posé quand le rapport a rejoint le kit (T5.2) : cinq versions, et l'écart
      n'était pas qu'un numéro — `configurationDepuisJson` et
      `comparerIdentiteDeContrat` sont entrés dans le format,
      `controle-repository.mjs` a changé deux fois, et la correction de T7.3 est
      arrivée. Les 41 tests du Playground passent, `npm run check` passe, et le
      kit installé porte bien le correctif.
      **⚠ Ce que R2 a trouvé en chemin, et qui ne lui appartient pas :** la CI
      du Playground est rouge sur `main` depuis le 4 septembre, et pas à cause du
      pin. `npm run build` échoue sur `StressTest.tsx`, à qui le contrat
      RÉEXPORTÉ réclame une variante `warning` que le composant n'implémente pas.
      Mesuré aux deux pins, `0.1.5` et `0.1.10` : identique. C'est le corpus qui
      a divergé de son contrat — voir R7.

- [X] **R3 — Deux des trois balises restantes ont perdu leur cause.** T0.3 exige
      qu'une balise parte dans le commit qui corrige sa contradiction ; celles de
      `PISTES-EVOLUTION.md` et de `Playground/AGENTS.md` citent des fichiers et
      des symboles absents, alors que les tâches qu'elles nomment sont closes. Le
      mécanisme du préalable a échoué là où il se prouvait.
      **Rechercher d'abord :** greper les balises dans les deux dépôts, puis
      vérifier l'existence de chaque fichier et symbole cité — une balise peut
      mentir aussi sur ce qu'elle décrit, et la règle qu'elle balise avec elle.
      **Faite le 5 septembre 2026, et l'avertissement du « rechercher d'abord »
      s'est réalisé mot pour mot.** Le `grep` rend trois balises et quatre
      renvois de points d'entrée. Les deux visées citaient du code disparu :
      `scripts/identifiant-code.mjs` n'existe plus (T2.1), `nomVariable` de
      `check-contract.mjs` non plus, et `src/tokens.ts` n'écrit plus ni regex de
      référence ni projection de nom — il importe `isTokenReference`, `refPath`
      et `tokenCssVariable` (T2.7, T6.0, T6.2).
      *Et la règle balisée mentait avec la balise, dans les deux cas.*
      `Playground/AGENTS.md` désignait `references-token.mjs` comme l'autorité
      sur ce qu'est une référence : ce module ne définit plus rien, il relève.
      La même page, vingt lignes plus bas et sans balise, faisait produire
      l'identifiant canonique par un fichier supprimé. `PISTES-EVOLUTION.md`
      annonçait « rien à publier tant qu'un seul repository consomme » alors que
      deux paquets sont en ligne. Les trois sont réécrites au fond, pas
      seulement débalisées — sans quoi retirer la balise aurait rendu la règle
      fausse plus crédible, pas moins.
      *Deux rangs de la table des contradictions tombent avec elles*, et l'un
      était périmé lui-même : il annonçait une copie « jusqu'à T6.2 » que T6.2
      avait emportée la veille. C'est un des trois rangs que R4 doit vérifier.
      **Reste la troisième balise**, celle du skill `consommer-contrat` : sa
      cause tient toujours — aucune commande ne cible un seul composant, `ucm
      check` n'a que `--base` et `--report`. C'est T8.6, et elle n'est pas
      périmée.

- [X] **R4 — La table « Contradictions doc ↔ code » est périmée sur trois
      rangs**, dont un qui cite une ligne dans un fichier devenu bien plus court.
      T8.8 promet de vérifier cette table : elle doit être juste ce jour-là.
      **Rechercher d'abord :** rang par rang, rouvrir le fichier cité et vérifier
      l'affirmation ET la tâche censée la résoudre — un rang peut être faux dans
      un sens comme dans l'autre.
      **Faite le 5 septembre 2026, les neuf rangs rouverts un par un, et le
      compte tombe juste : trois étaient périmés.** Le premier est celui de
      `Playground/AGENTS.md`, parti avec R3 — il annonçait une copie de regex
      « jusqu'à T6.2 » que T6.2 avait emportée la veille. Le deuxième est celui
      que l'énoncé décrit : `check-contract.mjs` cite `:42-47` et `:658` dans un
      fichier qui **fait 110 lignes** depuis que T5.2 en a sorti le contrôle et
      le rapport ; `:658` n'existe plus et `:42-47` est devenu un bloc
      d'`import`. Le troisième est `CHANGELOG-CONTRAT.md`, donné pour s'arrêter
      à 11.0 : il porte une entrée `12.0` et sa plage est refermée dessus.
      *Ce que la vérification a trouvé en plus, et que la table ne pouvait pas
      dire :* trois documents du Playground situaient encore
      `version-contrat.mjs` dans leur propre `scripts/`, alors que T2.1 l'a
      emporté dans le kit — dont `CONTRAT-CONSOMME.md`, qui l'appelait « seul
      endroit du repository où ce numéro est écrit » quand il n'y est plus écrit
      du tout. Corrigés dans le même passage.
      **La table ne porte plus aucun rang vivant** : les neuf sont barrés. C'est
      la condition que T8.8 vérifie.

- [X] **R5 — La section « État » du `README.md` contredit le code.** Elle situe
      l'outillage consommateur dans le Playground et annonce son extraction comme
      à venir, alors que le paquet et le CLI sont publiés. Une règle fausse dans
      le premier fichier que lit un visiteur est ce que le préalable T0
      combattait, et celle-ci n'a pas de balise. Le reste de T8.12 attend
      toujours T8.1.
      **Rechercher d'abord :** lire la section entière et l'état publié du paquet
      et du CLI avant de décider ce qui est faux ; la contradiction n'est
      peut-être pas celle que cet énoncé nomme.
      **Faite le 5 septembre 2026, et la contradiction est pire que l'énoncé ne
      le disait : le README se contredit LUI-MÊME, à quatre-vingts lignes
      d'écart.** La section « Côté repository consommateur » montre `npm install
      @ucm-kit/core` et deux commandes `npx --yes @ucm-kit/cli@0.1.5` ; la
      section « État », plus bas, annonce l'extraction du kit et la création de
      la CLI comme un travail à venir. Un visiteur qui lit dans l'ordre trouve
      la commande d'abord et son démenti ensuite.
      *Ce qui a été réécrit :* « État » dit que l'outillage est publié, qu'un
      repository se branche par `ucm init` sans être un projet Node, et que le
      Playground n'en est plus le domicile mais le consommateur de référence —
      celui qui sert à vérifier que le kit tient hors de son dépôt d'origine.
      *Et ce que la lecture a trouvé en plus :* la carte de l'architecture
      n'avait **aucune ligne pour `packages/cli/`**, alors qu'elle prétend
      décrire le dépôt et que ce paquet est publié. Elle en a une.
      *Trois constats de T8.12 sont tombés en même temps*, et ils étaient déjà
      faux avant cette tâche — voir R6.

- [X] **R6 — Les chiffres de ce plan ont vieilli.** T8.1 mesure 1 604 lignes une
      spécification qui n'en fait plus autant, à un chemin qui a changé ; des
      tâches encore ouvertes portent des constats déjà exécutés.
      **Rechercher d'abord :** recompter chaque chiffre au moment de prendre la
      tâche. Un chiffre daté dans ce plan est un souvenir, pas une mesure.
      **Faite le 5 septembre 2026, et bornée à ce qui peut encore tromper
      quelqu'un : les tâches OUVERTES.** Un chiffre dans une tâche close est un
      compte rendu daté — il dit ce qui a été mesuré ce jour-là, et le rejuger
      n'apprendrait rien. Un chiffre dans une tâche ouverte est une instruction :
      celui qui la prend s'en sert pour décider, et s'il est faux il décide mal.
      *Ce qui a été recompté, et ce que ça a donné :*
      - **T8.1** annonçait 1 604 lignes ; le document en faisait **1 651** le
        jour de la scission. Il avait grossi entre l'écriture de la tâche et son
        exécution.
      - **T8.4** tient sur ses trois chiffres, vérification faite — et son
        renvoi `version-contrat.mjs:25` est toujours juste, à ceci près que le
        fichier vit maintenant dans le kit, **donc dans un paquet publié**.
      - **T8.12** portait six constats, dont **quatre déjà faux** : deux traités
        le 4 septembre, un tombé avec R5, un devenu faux à la publication du
        paquet. Ils sont barrés sur place plutôt qu'effacés.
      - **L'inventaire 8.1** portait trois constats devenus faux, tombés avec
        R4, T8.5 et T8.6.
      *La leçon, et elle n'est pas « recompter » :* aucun de ces chiffres n'était
      faux quand il a été écrit. Ils ont vieilli parce que **le plan enregistre
      un état du dépôt dans une tâche qui, par construction, s'exécute plus
      tard**. La règle 5 dit déjà de ne pas citer de numéro de ligne pour de la
      prose ; ce qu'R6 ajoute est plus simple — **un constat dans une tâche
      ouverte se relit avant de s'en servir, et se barre sur place quand il est
      tombé.**

- [ ] **R7 — ⚠ La CI du seul consommateur réel est rouge, et elle l'est depuis
      le 4 septembre 2026.** *Trouvé par R2, le 5 septembre.* `npm run build`
      du Playground échoue : `StressTest.tsx` n'implémente pas la variante
      `warning` que son contrat réexporté déclare. Le composant a été écrit
      depuis un contrat d'avant, le plugin en a exporté un autre depuis, et rien
      ne les a rapprochés.
      *Pourquoi c'est plus qu'un composant cassé :* une CI rouge en permanence
      ne dit plus rien, et c'est précisément le repository dont ce plan se sert
      pour prouver que le kit tient. Toutes les vérifications faites « chez le
      consommateur » depuis le 4 septembre l'ont été sur un dépôt dont le signal
      était déjà éteint.
      *Ce que cette tâche ne décide pas :* les composants du corpus sont des
      sondes jetables, reconstruites depuis leur seul contrat par le skill
      `consommer-contrat`. Régénérer `StressTest` est un geste qui se demande,
      pas un geste qu'on prend au passage — d'où cette tâche plutôt qu'un
      commit.
      **Rechercher d'abord :** si les trois autres composants sont dans le même
      état, et depuis quel export ; puis si la CI a d'autres causes de rougeur
      empilées derrière celle-ci.
      **Recherche faite le 5 septembre 2026 ; l'énoncé tient, et il se
      corrige sur un point qui change le geste.** Les trois autres composants
      vont bien : `tsc` ne tombe que sur `StressTest`, Alert, Button et TileLink
      couvrent toutes les variantes de leur contrat. Aucune autre cause de
      rougeur n'est empilée : `npm run check` est intégralement vert — 44 tests,
      le contrôle des contrats, la génération des types —, `tsc --noEmit` est la
      seule cause et `vite build` n'est jamais atteint.
      *Ce que la recherche corrige :* l'énoncé dit « le composant a été écrit
      depuis un contrat d'avant, le plugin en a exporté un autre depuis ». C'est
      vrai, et c'est plus étroit que ça n'en a l'air — **l'écart tient à un seul
      export**. Le `.tsx` est né le 3 septembre du contrat du 28 août
      (`b6f777f`), qui ne déclarait que `info` et `success` : la variante
      `Warning` était absente de Figma ce jour-là. Elle y était le 26 août, elle
      est revenue le 4 septembre (`3c1764d`). Le composant n'a jamais dérivé —
      il est né conforme à un contrat qui a bougé le lendemain, et il n'y a rien
      à rattraper au-delà de cette variante.
      **Décision de l'utilisateur, 5 septembre 2026 : R7 reste ouverte.** La
      régénération n'est pas prise dans cette session.

- [ ] **R8 — ⚠ Tâche annexe, de recherche : le contrôle de parité est aveugle à
      une variante que le code n'implémente pas.** *Trouvé en exécutant la
      recherche de R7, et ce n'est pas le sujet de R7.*
      Sur le `StressTest` amputé de sa variante `warning`, `ucm check` écrit
      `✓ StressTest.contract.json : 82 références contrôlées, code conforme`.
      Le seul contrôle qui a vu l'écart est le `Record<StressTestVariant, …>`
      exhaustif du Playground, attrapé par `tsc` — **une convention de ce
      consommateur-là, pas une garantie du kit.**
      *La mesure prise une fois, et elle demande à être revérifiée :*
      `pariteEnEcart` juge six relevés — interface absente, fonction absente,
      props manquantes, types incorrects, booléens non utilisés, compositions
      incorrectes. Aucun ne porte sur les VALEURS d'un enum. Et la piste qui
      semble évidente — « comparer le type déclaré au contrat » — a l'air
      fermée par construction : le `.tsx` importe `StressTestVariant`, un type
      **généré depuis le contrat**, qui ne peut donc pas être en désaccord avec
      lui.
      *Pourquoi c'est une tâche et pas un commit :* si la mesure tient, un repo
      tiers sans la convention `Record` exhaustive porte la même dérive **sous
      un rapport UCM vert**, et c'est exactement ce que le critère de réussite
      du repo vierge existe pour interdire. Mais la fermer touche l'adaptateur
      du consommateur ET le noyau publié — donc une montée de version et une
      republication —, et rien ne dit encore que la bonne réponse soit un
      septième relevé de parité plutôt qu'une règle écrite dans `docs/FORMAT.md`
      sur ce qu'un repo doit garantir lui-même.
      **Ce que cette tâche demande, et c'est sa forme :** une **recherche
      profonde** menée par un agent — quels écarts contrat ↔ code le relevé de
      parité peut structurellement voir, lesquels lui échappent, ce que chacun
      coûte à un repo tiers, et quelles réponses existent — **dont le résultat
      est présenté à l'utilisateur en clair, simplement, avant qu'une ligne soit
      écrite.** C'est une décision de périmètre, pas une correction : elle se
      prend sur un exposé compréhensible, pas sur un diff.

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
10. **T2.5**, puis le reste de **T2.1b** — l'élagage a besoin que le lecteur
    s'exécute sur ce que le moteur fabrique, ce que T2.5 installe, et du jeu
    N‑1 figé à l'étape 1. *Corrigé :* les v3 à v5 disaient « la mesure de
    couverture que T2.5 installe ». T2.5 n'installe aucune mesure de
    couverture — elle installe une assertion sur le chemin d'appel, et aucun
    outil de couverture n'existe dans ce monorepo. L'étape 2 de T2.1b porte
    désormais la mesure, par mutation.
11. **T5.2 puis T5.4**, avant la Phase 3. *Corrigé le 5 septembre 2026 :* la v5
    plaçait toute la Phase 5 après la Phase 3, alors que T3.3 a besoin de
    l'orchestration que T5.2 déplace. Le trou était plus large qu'une tâche —
    T7.1 à T7.5 exigent de lancer un contrôle dans un repo tiers, donc
    dépendent de T3.3, donc de T5.2. La décision et ses six mesures sont écrites
    en T3.3.
12. **Reste de la Phase 3** — T3.3, puis la moitié manquante de T3.2 (le
    workflow, portant les filets de T5.4, le calcul du sha restant côté CI),
    puis T3.4.
13. **T4.1 et T4.3**, reste de la Phase 7, reste de la Phase 5, puis les
    Phases 6 et 8.

*Exécuté le 4 septembre 2026 :* T4.1 et T4.3 sont closes. **Et l'étape 13 a
répété la leçon des étapes 11 et 12 sans qu'on l'ait vue venir.** Celles-ci
avaient enregistré qu'« une publication est une précondition d'exécution, pas
une formalité de fin de tâche ». La publication du CLI a bien eu lieu — et le
paquet publié était cassé, parce que la tâche précédente avait changé la surface
du kit sans monter son numéro. La leçon se complète donc : **une publication
n'est pas un événement, c'est un état qu'il faut vérifier depuis dehors.** Tant
que personne ne lance la commande d'un consommateur depuis un dossier vide, le
dépôt ne sait rien de ce que le registre porte.

*Exécuté le 5 septembre 2026, suite de l'étape 13 :* T4.2 est close et T3.4
l'est enfin des deux côtés — la moitié locale était une ligne de documentation,
et elle a produit un garde-fou (`tests/pinDocumente.test.mjs`) parce qu'un
numéro de version recopié dans un README dérive comme n'importe quelle seconde
autorité. T4.4 est tranchée le même jour — **la Figma Community** —, ce qui
ferme la Phase 4. La décision a coûté moins que prévu au format (`url` était
déjà optionnel) et davantage aux messages : l'avertissement « Lien vers Figma
absent » devait disparaître, sans quoi la Community l'aurait imprimé sur chaque
export. **Et elle rouvre une question que ce plan avait mise sous condition :**
publier met le projet devant un public non francophone, ce que la Phase 8
désigne comme le seul événement rouvrant la langue du projet. Elle a été posée
le jour même et tranchée : le français reste, assumé plutôt que subi. La
décision, ce qui la rend tenable et ce qu'elle coûtera si elle est un jour
défaite sont écrits au préambule de la Phase 8, là où la condition était
suspendue.

14. **T4.5, puis le reste de la Phase 7, puis T4.6.** *Ajouté le 5 septembre
    2026 :* la Phase 4 était fermée, et une relecture de l'interface l'a
    rouverte sur deux entrées. **T4.5 passe avant la Phase 7** parce que c'est un
    bug, et parce que la Phase 7 exporte en boucle vers un dépôt neuf : elle
    rencontrera le doublon qu'elle est censée ne pas produire. **T4.6 passe entre
    les Phases 7 et 8** : après la Phase 7, qui valide le flux que l'interface
    montre ; avant la Phase 8, parce que T4.4 fait de cette interface la vitrine
    publique du projet, et que la Phase 8 est ce qui prépare ce public. L'étape
    13 disait « puis les Phases 6 et 8 » ; elle devient « puis T4.6, puis les
    Phases 6 et 8 ».

*Exécuté le 5 septembre 2026 :* les étapes 11 et 12 sont faites — T5.2, T5.4,
T3.3, T3.2, et T3.4 à moitié. Ce qui les bloque encore est une publication :
`@ucm-kit/cli` rend 404 sur le registre, donc le workflow qu'un repo neuf reçoit
appelle une commande qu'il ne peut pas installer. C'est la deuxième fois qu'une
publication se retrouve sur le chemin critique, et c'est la même leçon qu'à
l'écart d'ordre plus haut : **une publication est une précondition d'exécution,
pas une formalité de fin de tâche.**

*Exécuté le 5 septembre 2026, étape 14 :* **T4.5 est close.** Le doublon de pull
request est détecté, et l'ordre qui la plaçait avant la Phase 7 a servi à
quelque chose : celle-ci exporte en boucle vers un dépôt neuf, elle aurait donc
produit le doublon qu'elle est censée ne pas produire, et l'aurait produit sans
un mot — le contrôle qu'elle exerce n'aurait rien vu, puisque la maladie EST
l'absence de signal. Reste de l'étape : le reste de la Phase 7, puis T4.6.

*Exécuté le 5 septembre 2026, suite de l'étape 14 :* **la Phase 7 est close, sauf
T7.6 qu'elle a ouverte.** T7.0b, T7.0c et les cinq scénarios sont exécutés, en
douze tests qui lancent `ucm` comme un processus depuis un dossier installé par
`ucm init`, hors du monorepo et qu'aucun `package.json` ne couvre.

*Ce que la phase a rendu, et c'est ce qu'on lui demandait — elle mesure, elle ne
construit pas.* **Deux choses qu'aucune suite verte ne disait.**

La première est un défaut, corrigé : pour un contrat trop ANCIEN, l'en-tête du
rapport écrivait « réexporter n'y changerait rien » trois lignes au-dessus d'une
action qui demande de réexporter. Le critère de réussite n° 4 tombait sur la
première phrase que le designer lit. **Il avait survécu à T2.1b, qui touchait ce
fichier même**, parce que tous les tests fabriquaient une version FUTURE : le
sens `ancien` n'était éprouvé qu'au niveau de la section. *La leçon n'est pas
« il manquait un test » mais* **« un seul des deux sens d'une bifurcation était
exercé, et le rapport le disait quand même en entier »** — la même forme que les
trois copies de projection de T6.0, qu'aucun test ne comparait.

La seconde est un écart ouvert, non traité : **D8 décide une fenêtre de deux
versions, le code en lit une**, et le commentaire de `version-contrat.mjs`
l'assume contre la décision. Il n'y a donc aucun recouvrement où N‑1 et N seraient
lues toutes les deux — un consommateur passe au rouge à l'instant où le kit monte.
T7.6 le tranche. **On ne le referme pas ici :** ce serait « déplacer et réécrire
dans le même geste », que la règle 2 interdit, sur le validateur de 1576 lignes.

*Un troisième point, de procédure, qui n'est pas une tâche :* le kit change de
comportement (`verdict-bilan.mjs`) et **son numéro n'a pas bougé**. Le monter sans
publier ferait épingler au CLI une version que le registre rend 404 — la panne
exacte que les étapes 11 à 13 ont déjà payée deux fois. La montée et la
publication vont ensemble, et dans cet ordre : elles restent à faire, et le
Playground ne verra pas cette correction avant.

**Fait le 5 septembre 2026, par R1** — `0.1.10` et `@ucm-kit/cli@0.1.5` sont sur
le registre, et un garde-fou empêche désormais un numéro de mentir sur son
contenu (`tests/versionSuitLeContenu.test.mjs`). Le Playground, lui, ne l'a
toujours pas vue : c'est R2.

15. **La Phase 8, en commençant par T8.1.** *Ajouté le 5 septembre 2026.* T4.6
    est arrivée au bout de ce qu'elle pouvait faire seule : U4.3, U4.4 et U4.5
    sont les trois seules tâches ouvertes de `refonte-ui.md`, et **U4.5 attend
    T8.1** — écrire que « sélectionner n'est pas modifier » demande de savoir
    dans lequel des deux documents cette phrase atterrit. T8.1 est donc à la
    fois la première tâche de la Phase 8 et la dernière dépendance de la
    Phase 4.

*Exécuté le 5 septembre 2026, étape 15 :* **le temps 1 de T8.1 est fait, et T8.2
et T8.3 avec lui.** La spécification est partitionnée en `docs/FORMAT.md` et
`packages/plugin/SPEC.md`, sans qu'un mot soit réécrit, sous deux tests qui
prouvent qu'aucune ligne n'est perdue et qui comptent ce qui vit encore dans les
deux fichiers.

*Ce que la partition a mesuré, et l'énoncé ne faisait que le supposer :* **53 %
des lignes porteuses parlent du format ET du moteur.** « Co-extensifs par
construction » cesse d'être une intuition. Le seul gros bloc qui se sépare
proprement est la Partie 3 — configuration et dépôt GitHub —, entièrement du
moteur ; tout le reste de la Partie 1 est mixte paragraphe par paragraphe.

*Et une leçon de procédure, qui n'est pas neuve mais qui vient de se répéter :*
**T8.11 était faite depuis le 4 septembre, la case était restée vide.** Le geste
avait eu lieu, le commit le disait, le plan disait le contraire. C'est la
maladie que la section ci-dessous existe pour enregistrer, et elle ne se soigne
pas en la constatant une fois de plus : elle se soigne en cochant dans le même
commit que le geste. Les deux vitrines ont donc leur case, et T8.12 voit sa
condition d'attente levée par la scission.

Reste de l'étape 14 : **U4.5, U4.3 puis U4.4**, que T8.1 vient de débloquer.
Reste de l'étape 15 : **le temps 2 de T8.1**, T8.4 à T8.10, T8.12, puis la
Phase 6, avec T7.6 à placer.

16. **La Phase 9 — épurer le consommateur de référence.** *Ajoutée le
    5 septembre 2026.* Elle ne s'exécute pas d'un bloc après l'étape 15 : elle
    s'y insère, parce que trois de ses tâches SONT des tâches de l'étape 15 et
    qu'une quatrième dépend de la Phase 6. L'ordre réel, et il tient à quatre
    contraintes vérifiées :
    - **T9.1 en premier, isolée.** Elle ne dépend de rien, elle retire
      1 908 lignes et elle referme une contradiction doc ↔ code née après T8.8.
    - **T9.2 et T9.3 remplacent T8.4**, et **T9.3 part avec T7.6 et T6.1** :
      les trois touchent un fichier publiable du kit, et une seule montée de
      version les porte toutes. Les séparer, c'est trois publications là où une
      suffit — et publier est une précondition d'exécution, la leçon est payée
      deux fois.
    - **T9.4, puis T9.8 (le compteur), puis T9.5 → T9.6 → T9.7**, dans cet ordre
      strict : les documents se vident du plus dérivé vers le plus lu, et le
      compteur doit exister avant la première tâche qu'il mesure. **T9.5 a T8.7
      pour précondition dure** — passer les documents en registre portable puis
      les réécrire, c'est les réécrire deux fois.
    - **La moitié « workflow » de T9.8 attend T6.3**, et seulement elle : la
      bascule du Playground vers `ucm check` demande un mécanisme de chargement
      d'adaptateur que T3.3 a refusé d'ouvrir. Le test d'accord entre les deux
      workflows, lui, se pose tout de suite.
    - **T9.9 en dernier commit**, et rien avant : il écrit dans un `AGENTS.md`
      que T9.5 et T9.6 viennent de refaire.
    *Ce que la Phase 9 ne décide pas :* le corpus. R7 est datée — « reste
    ouverte, la régénération n'est pas prise dans cette session » — et R8 en
    dépend. Une épuration qui trancherait le corpus au passage rouvrirait une
    décision de l'utilisateur sans le dire.

### Écart entre cet ordre et ce qui a été exécuté

*Enregistré le 4 septembre 2026, parce qu'un plan qui décrit un ordre et
contredit son propre journal Git ne se relit plus.*

L'étape 7 exige « T2.1 **immédiatement** suivi de T2.8 ». L'exécution réelle est
T2.1 → T2.4 → T2.5 → T2.7, T2.8 restant non commité dans le Playground. La
conséquence est exactement celle que l'étape 7 annonçait : le Playground déclare
`@ucm-kit/core` sans entrée de lockfile et sans que le paquet existe sur le
registre, donc `npm ci` y échoue et sa CI ne peut plus rien dire.

Ce n'est pas rattrapable par un réordonnancement — le travail est fait et il est
vert. Le déblocage est la **publication du paquet**, qui rend le lockfile
régénérable et laisse commiter T2.8. Elle est donc une précondition d'exécution
au même titre qu'une tâche, et c'est à ce titre qu'elle est écrite ici plutôt
que dans une note de bas de page.

**Levé le 4 septembre 2026.** `@ucm-kit/core` est sur le registre en 0.1.0 et
0.1.1, le lockfile du Playground porte une entrée réelle, `npm ci` y passe
depuis un dossier neuf, et T2.8 est commité et poussé. L'écart est refermé.

*Ce que la publication a coûté, et ce qu'elle a appris.* Les deux premières
versions sont parties **à la main**, avec un code 2FA : le workflow
`publish.yml` rendait « OIDC permission denied ». La cause n'était dans aucun
des cinq réglages soupçonnés — elle était dans l'**entrée d'éditeur de
confiance** enregistrée chez npm, que npm ne valide pas au moment où on l'écrit,
donc qu'aucun message n'aurait pu désigner. La supprimer et la recréer a suffi :
l'exécution suivante est passée du 403 à un 409 « cette version existe déjà »,
sans qu'une ligne du dépôt ait changé entre les deux. La publication sans jeton
fonctionne à partir de là, et le fichier de workflow porte le récit sourcé.
*Le prix de l'enquête est la leçon :* le journal du workflow avait accumulé
quatre états successifs de diagnostic, chacun écrit comme un fait. C'est
exactement la maladie que le préalable T0 traite dans les documents, apparue
dans un fichier que T0 ne couvre pas. **Un commentaire qui décrit un état
transitoire porte sa date, ou il ne s'écrit pas.**

---

## Contradictions doc ↔ code, vérifiées

**Close le 5 septembre 2026 (T8.8) : les neuf rangs étaient barrés, et aucune
balise ne subsistait dans les deux dépôts.** Cette table enregistre — quelle
règle était fausse, où elle vivait, ce qui l'a corrigée. Un rang barré vaut
mieux qu'un rang supprimé : il dit qu'on a regardé.

**Elle a rouvert le soir même, sur deux rangs, et c'est la démonstration de la
règle de travail 1 plutôt qu'un accident.** La revue indépendante de la Phase 9
les a trouvés dans des fichiers que T8.8 n'avait pas de raison de rouvrir : un
commentaire de test et une tâche close de ce plan. Ils sont inscrits non barrés,
et T9.1 puis T9.4 les emportent. Le compte n'est donc plus « neuf, tous
résolus » : c'est **onze, dont deux vivants**.

| Document | Ce qu'il affirme | Ce que fait le code |
|---|---|---|
| ~~`Playground/AGENTS.md`~~ | ~~`tokens.json` fait foi pour l'existence des références~~ | **résolu par T2.4** : le code lit `tokens.json` |
| ~~`verdict-bilan.mjs:9`~~ | ~~idem, en commentaire~~ | **résolu par T2.4** |
| ~~`Playground/AGENTS.md`~~ | ~~`references-token.mjs` définit **seul** la référence~~ | **résolu par R3** : la règle nomme désormais `@ucm-kit/core/format`. Le rang lui-même avait vieilli — il annonçait une copie dans `tokens.ts` « jusqu'à T6.2 », or T6.2 l'a emportée le 4 septembre |
| ~~`check-contract.mjs:42-47`~~ | ~~ce que l'export ne peut corriger avertit sans bloquer~~ | **résolu par D1**, et le rang avait vieilli avec : ce fichier fait 110 lignes depuis T5.2, `:658` n'existe plus et `:42-47` est un bloc d'`import`. Vérifié par R4 |
| ~~`PISTES-EVOLUTION.md`, « Extraction multi-repository »~~ | ~~rien à publier avec un seul consommateur~~ | **résolu par R3** : la section dit que l'extraction est faite, et où vit l'autorité unique que le découpage devait réaliser |
| ~~`CHANGELOG-CONTRAT.md`~~ | ~~porte l'historique des schémas « et lui seul »~~ | **résolu** : le fichier porte une entrée `12.0` et sa plage est refermée dessus. Vérifié par R4 |
| ~~skill `consommer-contrat`, ancrage 6~~ | ~~une commande de contrôle ciblée sur un composant~~ | **résolu par T8.6** : l'ancrage dit ce qui existe — un contrôle qui balaie le repository — et pourquoi cela suffit |
| ~~`Exporter/AGENTS.md`~~ | ~~aucun artefact de contrat, jamais~~ | **tranché par T7.0** : la règle nomme désormais le MOTEUR, pas le repository — elle était devenue ambiguë quand T1.2 a mis deux produits dans le même dépôt |
| ~~—~~ | ~~aucun document ne déclare la projection de nom de token comme invariant~~ | **résolu par T6.0** : `tokenCssVariable` est l'unique autorité, dans `names.ts` avec les deux autres projections, et `AGENTS.md` porte l'invariant |
| `skill-diagnostics.test.mjs:8-10`, et T8.5 de ce plan | la copie du schéma du Playground est comparée — « même remède » que celle du skill | **vivant, emporté par T9.1** : `schema-contrat.test.mjs` ouvre le schéma du PAQUET INSTALLÉ (`schema-contrat.mjs:29-32`), jamais la copie locale, qui est donc exactement « la copie que rien ne compare » |
| T2.6 de ce plan | `run-tests.mjs` et `echecs-de-tests.mjs` « balaient de vrais `*.test.tsx` » | **vivant, emporté par T9.4** : il n'en existe aucun, par décision écrite. `composant` vaut `null` partout, et deux des trois sections de `diagnostic-tests.mjs` sont inatteignables depuis ce dépôt |
