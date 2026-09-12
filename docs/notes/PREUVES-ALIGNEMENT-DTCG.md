# Preuves de l'alignement DTCG

Journal du [plan d'alignement](./PLAN-ALIGNEMENT-DTCG.md). Il ne contient que
des faits courts : commande, code de sortie, résumé d'une ligne, empreinte.

## État

- Lot courant : porte humaine H2, dont le manifeste est en fin de L9
- Exporter, branche et `HEAD` : `main`, L9 fermé
- Playground, branche et `HEAD` : `main`, `8908c66` après L4
- Style Dictionary retenu : `5.5.3`, exact ; `4.4.0` au départ
- Versions npm servies : `@ucm-kit/core` 0.1.25, `@ucm-kit/cli` 0.1.24,
  `@ucm-kit/adapter-typescript` 0.1.17
- Dernière porte humaine franchie : H1, avec une réserve sur le Display P3

## Lots

### L0 — Référence

- Commit : ce journal seul, aucun fichier de production.
- Commandes :
  - Exporter, `npm test` : sortie 0, 925 tests verts (19, 52, 274, 557, 23).
  - Exporter, `npm run typecheck` : sortie 0.
  - Exporter, `npm run build` : sortie 0, arbre propre ensuite.
  - Playground, `npm run build` : sortie 0, `tokens.css` de 727 lignes.
  - Les deux dépôts : `git status --short` vide, Node `v24.19.0`, npm `12.0.2`.
- Résultats :
  - Versions déclarées : `@ucm-kit/core` 0.1.24, `@ucm-kit/cli` 0.1.23,
    `@ucm-kit/adapter-typescript` 0.1.16, toutes servies par npm ; plugin
    `ucm-exporter-plugin` 0.1.0, privé, sans numéro dans `manifest.json`.
  - Le workflow du Playground épingle la CLI en version 0.1.23.
  - Aucun `tokens.json` figé dans l'Exporter : les tests construisent leurs
    variables en ligne. `packages/kit/fixtures/` ne contient que `contrats/`.
- Artefacts et empreintes :
  - `src/tokens/tokens.json` du Playground :
    `6e228cd42bfd23b3c20f4773c9ebb5f1be071355030bd7d5c6281f73bac2faed`.
  - `src/generated/tokens.css` sous Style Dictionary 4.4.0, copié dans le
    dossier temporaire de session `l0/tokens-origine-sd4.css` :
    `ccf89371a396d7b538294ba38a088484940b89adbc236711fbb6b9974bccf0a3`.
- Écart ou réserve : aucun

### L1 — Autorités du format et compatibilité

- Commit : documents d'autorité, `tests/inventaireInvariants.test.ts` et deux
  liens de notes vers les ancres renommées.
- Commandes :
  - `node scripts/controle-style.mjs` sur les sept documents touchés : sortie
    0, style conforme.
  - `node scripts/run-tests.cjs` (liens, inventaire, style, version
    documentaire) : sortie 0, 23 tests verts.
  - `npm test` : sortie 0, 925 tests verts ; `git diff --check` : sortie 0.
  - Mutation : invariant des graisses retiré d'`AGENTS.md`, puis
    `npx tsx --test tests/inventaireInvariants.test.ts` : sortie 1, le test
    « aucune autorite citee par un invariant » échoue sur `poidsDeGraisse()`.
    Fichier restauré par copie, `cmp` identique, test de nouveau vert.
- Résultats :
  - Noms fixés pour L4 et L5 : `TOKENS_FORMAT_VERSION` et
    `etatDuFormatDeTokens()` dans `packages/kit/src/format/tokens.ts`.
  - Classes 10 (forme des valeurs) et 11 (marque) ajoutées à
    `COMPATIBILITE.md`, dont le titre devient « Les onze classes ».
  - En-tête de pull request des tokens : « Version du format de tokens : 1 »,
    lu par `etatDuFormatDeTokens()` dans le fichier déposé.
  - Un mode sans valeur rend une graisse indécise, donc `string`.
  - Style Dictionary 4.4.0 et 5.5.3, groupe `css`, sur un document de deux
    tokens et une marque racine : sortie 0, deux déclarations, aucune trace de
    la marque. La phrase « un lecteur de valeurs ignore `$extensions` à la
    racine » de `COMPATIBILITE.md` est donc mesurée.
- Artefacts et empreintes : aucun.
- Écart ou réserve : aucun. Le renommage `.rulesItems` en `.ruleItem`, présent
  dans l'arbre et étranger à la migration, est conservé hors de ce commit.

### L2 — Harnais de caractérisation

- Commit : `fichierDeVariables.ts`, `comparerTokens.ts` et ses tests, trois
  tests de l'export, le fixture `packages/kit/fixtures/tokens/origine/` et son
  test, la règle `.gitattributes`, la ligne de la carte du code.
- Commandes :
  - `npx tsx --test tests/comparerTokens.test.ts` : sortie 0, 11 tests verts.
  - `npx tsx --test tests/exportTokens.test.ts` : sortie 0, 19 tests verts.
  - `npx tsx --test tests/fixturesTokens.test.mjs` (kit) : sortie 0, 4 tests.
  - `npm test` : sortie 0, 943 tests verts (19, 52, 278, 571, 23).
  - `npm run typecheck`, `npm run build`, `git diff --check` : sortie 0.
  - Mutation du comparateur, tolérance de couleur neutralisée : sortie 1, le
    test « une composante écartée de plus d'un demi-pas d'octet » échoue.
  - Mutation du fixture, un octet de `#ff0000` changé : sortie 1, le test
    « le tokens.json d'origine est intact » échoue. Les deux fichiers sont
    restaurés par copie, `cmp` identique.
- Résultats :
  - Le moteur d'origine rend 40 feuilles et trois avertissements sur le fichier
    simulé : un mode sans valeur et deux cibles absentes.
  - Les documents dérivés du `tokens.json` du Playground passent le
    comparateur sans écart, en `srgb` comme en `display-p3`. Ils portent 18
    graisses `number` : 3 littéraux et 15 alias.
- Artefacts et empreintes :
  - `packages/kit/fixtures/tokens/origine/tokens.json` :
    `433f7e1060e3aa4e8e6a45410d8c040ae27cf3b11241e8210ac6bc46d12e5ff8`.
  - Dossier temporaire de session, `l2/playground-srgb.json` :
    `4f65f2b85229b4967924da688e1d5860147ce79010273a5a34b2e8ea8f81608c`.
  - Dossier temporaire de session, `l2/playground-p3.json` :
    `666ea4be4e023db059220604be84e09f3b6754c39410c521e0958f1ff4bce850`.
  - Le script de dérivation, `l2/deriver.ts`, reste dans ce dossier temporaire.
- Écart ou réserve : aucun

### L3 — Consommateur Style Dictionary

- Commit : Playground `6489d88`, `package.json` et `package-lock.json` seuls,
  rebasé sur `5b0c357` (quatre réexports de contrats arrivés entre-temps).
  Configuration inchangée.
- Commandes :
  - `npm view style-dictionary` : versions stables 5.4.2 à 5.5.3 au-dessus du
    minimum ; `latest` vaut 5.5.3, qui exige Node 22.
  - `npm install --save-dev --save-exact style-dictionary@5.5.3` : sortie 0.
  - `npm run build` sur le `tokens.json` actuel : sortie 0, CSS identique à
    l'octet à celui de la 4.4.0.
  - Compilation du document sRGB de L2 par la configuration du Playground,
    sortie dans le dossier temporaire : 721 déclarations, 544 références,
    zéro écart, CSS identique à l'octet au CSS d'origine.
  - Même document en `display-p3`, groupe `css-ds` où `color/p3` remplace
    `color/css` : 102 déclarations `color(display-p3 …)`, 721 déclarations,
    544 références, aucune valeur vide ni `[object Object]`. La cible
    temporaire n'existe que dans le script du dossier de session.
  - Même document sous la cible habituelle `color/css` : 97 lignes projetées
    en sRGB, le chiffre de l'état des lieux.
  - `rm -rf node_modules && npm ci`, puis `npm run build` : sortie 0 ;
    `npm ls style-dictionary` : 5.5.3 ; `git diff --check` : sortie 0.
  - CI `ucm` du Playground sur `6489d88` : succès.
- Résultats :
  - CSS d'origine : 721 déclarations, 544 références, 177 littéraux, aucune
    référence non résolue, aucun diagnostic de Style Dictionary.
  - Changements majeurs de la 5.0 examinés : références vers un nœud qui
    n'est pas un token, suffixe `.value`, syntaxe de référence figée, Node 22.
    Aucun ne touche la configuration du Playground.
  - À retenir pour L7 : depuis la 5.4.4, Style Dictionary ignore toute clé qui
    contient `__proto__`.
  - Aucune version refusée.
- Artefacts et empreintes :
  - `src/generated/tokens.css` sous 5.5.3 :
    `ccf89371a396d7b538294ba38a088484940b89adbc236711fbb6b9974bccf0a3`.
  - `package-lock.json` du Playground :
    `cb8aee58689606d25a4e1eec9b54743afbce5159f47751416c4141ecec9de83f`.
  - Dossier temporaire de session, `l3/sortie-p3/tokens.css` :
    `cc3c8f79657f12a5cd381dd58dbd5998755998724c33a2b7e2d593bab5d70b6b`.
  - Scripts de mesure : `l3/construire.mjs` et `l3/css.mjs`, dans le même
    dossier.
- Écart ou réserve : aucun

### L4 — Lecteur de version dans le kit

- Commit : Exporter `ff2a719` (code, tests, versions, pins) puis celui qui
  porte cette entrée ; Playground `8908c66` (pin de la CLI).
- Commandes :
  - `npx tsx --test tests/formatDeTokens.test.ts` avant le module : sortie 1,
    `ERR_MODULE_NOT_FOUND`. Après : 11 tests verts, porte publique comprise.
  - `npx tsx --test tests/controleRepository.test.mjs` : 25 tests verts.
  - Mutation 1, contrôle placé après l'état de démarrage : sortie 1, le test
    « aucun contrat encore » échoue.
  - Mutation 2, contrôle placé après l'analyse des contrats : sortie 1, trois
    tests échouent, dont « refus avant tout token ». Fichier restauré par
    copie, `cmp` identique.
  - `npm test` : sortie 0, 960 tests verts ; `npm run typecheck`,
    `npm run build`, `git diff --check` : sortie 0. CI de `ff2a719` : succès.
  - `npm pack` des trois paquets, installation dans un consommateur vierge,
    kit en premier : `npm ls` montre `@ucm-kit/core@0.1.25` dédupliqué sous la
    CLI et l'adaptateur. `ucm check` depuis l'archive : version 2, sortie 1 ;
    marque `"1"`, sortie 1 ; fichier d'origine figé, sortie 0. Les trois sans
    contrat.
  - `gh workflow run publish.yml` pour `@ucm-kit/core` (run `34613788152`) et
    `@ucm-kit/cli` (run `34614143651`) : rouges sur la seule étape des pins
    servis, publication et épreuve du registre vertes ; pour
    `@ucm-kit/adapter-typescript` (run `34614329580`) : succès.
  - `npm view` : `@ucm-kit/core@0.1.25`, `@ucm-kit/cli@0.1.24`,
    `@ucm-kit/adapter-typescript@0.1.17` servies ; la CLI dépend du kit 0.1.25.
  - Playground : `npx --yes @ucm-kit/cli@0.1.24 check` sur son fichier
    d'origine, sortie 0 ; CI `ucm` sur `8908c66` : succès.
- Résultats :
  - Un document qui n'est pas un objet est classé `invalide` ;
    `COMPATIBILITE.md`, `AGENTS.md` et le README du kit le disent.
  - Un entier positif inférieur à la version courante serait invalide : la
    seule forme antérieure ne porte pas de marque.
  - `CONTRACT_VERSION` reste 13.0, le schéma publié ne change pas.
- Artefacts et empreintes, dossier temporaire de session `l4/archives/` :
  - `ucm-kit-core-0.1.25.tgz` :
    `51312e2cb98872c8d1aea56aa436cf35c6ab38eed77aef285b72c63af8a521d3`.
  - `ucm-kit-cli-0.1.24.tgz` :
    `d3cc16de72b4747664753502d40cc659114535545e646a6c0d672b4f853f39f4`.
  - `ucm-kit-adapter-typescript-0.1.17.tgz` :
    `1778b1e0be055daf60c7aab112cccecebeda576eae4be9d58d0b200a65bd7885`.
- Écart ou réserve : aucun

### L5 — Producteur de couleurs, dimensions et marque

- Commit : celui qui porte cette entrée. Avant lui, `8d0cdee` corrige à part
  `galerie/capturer.cjs`, qu'une expression abîmée empêchait de compiler
  depuis `3b24683`, et fait compiler chaque script de la galerie par un test.
- Commandes :
  - `npx tsx --test tests/exportTokens.test.ts` avant le moteur : sortie 1,
    12 tests rouges. Après : 28 tests verts.
  - `npx tsx --test tests/github.test.ts` avant `ligneDeFormatDeTokens` : 2
    tests rouges. Après : 36 verts.
  - `npx tsx --test tests/serializeJson.test.ts` : 6 verts ;
    `tests/galerie.test.ts` : 8 verts.
  - Mutations de `exportTokens.ts`, chacune restaurée par copie, `cmp`
    identique : espace toujours `srgb`, sortie 1, 2 tests rouges dont
    « Display P3 » ; alpha omis à 1, sortie 1, 6 rouges ; unité `rem`,
    sortie 1, 4 rouges ; marque à `TOKENS_FORMAT_VERSION + 1`, sortie 1,
    3 rouges dont « la racine porte la version 1 ».
  - `npm test` : sortie 0, 973 tests verts (19, 52, 295, 584, 23) ;
    `npm run typecheck`, `npm run build`, `git diff --check` : sortie 0.
  - `npm run galerie` puis `npm run galerie:captures` : sortie 0, 27 captures.
    La planche 6 montre « DTCG 2025.10, version 1 du format de tokens » sous
    le résumé des tokens, au rang 3, et la carte unique de l'avertissement
    `LEGACY`.
- Résultats :
  - Test provisoire de migration : l'export du fichier simulé, sous `SRGB`,
    `LEGACY` et `DISPLAY_P3`, ne s'écarte du fichier d'origine figé que par la
    version 1 ; le comparateur rend zéro écart.
  - La marque s'écrit en tête du fichier même devant une collection nommée
    `2026` : `serializeJson` écrit une `Map` dans l'ordre de ses clés.
  - L'avertissement `LEGACY` dit « aucun profil de couleur n'est choisi » : le
    designer ne voit pas le mot `LEGACY` dans Figma. `SPEC.md` décrit ce
    message.
  - Les graisses restent en `string` ; L6 les traite.
- Artefacts et empreintes : captures dans `packages/plugin/dist/galerie/`,
  non suivies.
- Écart ou réserve : aucun

### L6 — Typographie et résolution des alias

- Commit : celui qui porte cette entrée.
- Commandes :
  - `npx tsx --test tests/exportTokens.test.ts` avant `graisses.ts` : sortie 1,
    4 tests rouges, ceux qui attendent `number` ; les 3 qui décrivent ce qui
    reste `string` passaient déjà. Après : 35 tests verts, migration comprise.
  - `npm test` : sortie 0, 980 tests verts (19, 52, 295, 591, 23) ;
    `npm run typecheck`, `npm run build`, `git diff --check` : sortie 0.
  - Mutations de `graisses.ts`, chacune restaurée par copie à l'identique :
    boucle tenue pour numérique, 1 test rouge ; littéral sans chemin de
    graisse, 4 rouges ; mode vide ignoré, 2 rouges ; cible d'alias non
    vérifiée, 4 rouges.
  - Mutation d'`exportTokens.ts`, littéral d'une graisse `number` non
    converti : 3 tests rouges, dont la migration.
  - Le test permanent « un seul mode devenu libre » passe `Bold` en `Bolder` :
    la graisse, puis `typography.heading-weight` et `text.weight` qui la
    citent, redeviennent `string`.
- Résultats :
  - `graissesNumeriques` décide chaque `STRING` sur tous ses modes, avec
    mémoïsation et état de visite, avant la première feuille. Variables,
    collections et modes inversés donnent le même document.
  - Sur le fichier simulé : `regular`, `bold`, `semibold`, `heading`, `body`,
    `heading-weight` et `text.weight` deviennent `number` ; `numeric`,
    `free`, `mixed`, `incomplete`, `broken`, les deux boucles et les familles
    restent `string`, valeurs inchangées.
  - Le test provisoire de migration reste sans écart : le comparateur admet
    chaque graisse devenue `number`.
  - `exportTokens.ts` est en CRLF dans l'arbre de travail, que `core.autocrlf`
    produit à l'extraction ; l'index le garde en LF. Un motif de mutation ne
    doit donc pas contenir de fin de ligne.
- Artefacts et empreintes : aucun.
- Écart ou réserve : aucun

### L7 — Conformité DTCG et cohérence documentaire

- Commit : celui qui porte cette entrée. Il ne contient que les hunks de ce
  lot ; un travail étranger en cours dans la copie de travail (renommage
  `.ruleItem`, message `montrer-les-calques`) reste hors de lui.
- Méthode : l'index du lot, arbre `d74da76`, a été extrait dans un worktree du
  dossier de session par un commit temporaire `f52ecdf`, jamais poussé, puis
  réinstallé par `npm ci`. Toutes les commandes ci-dessous y ont tourné, hors
  de la copie de travail partagée.
- Commandes :
  - `npm test` : kit 19, CLI 52, adaptateur 295 et plugin 608 tests verts.
    Racine : 2 rouges d'inventaire sur `FORMAT.md` et `SPEC.md`, extraits en
    CRLF par `core.autocrlf` ; les mêmes fichiers convertis en LF,
    `node scripts/run-tests.cjs` rend 23 verts.
  - `npm run typecheck`, `git diff --check` : sortie 0. `npm run build` rate
    `build:ui:js` sur « 'esbuild' n'est pas reconnu », le `PATH` du worktree
    étant trop long ; kit, `typecheck`, `build:code`, `build:ui` et
    `build:manifest` lancés un par un : sortie 0.
  - `npm run galerie` puis `npm run galerie:captures` : sortie 0, 27 captures.
  - Mutations refusées puis restaurées à l'identique, contre
    `styleDictionary.test.ts` : dimension typée `string`
    (`[object Object]`), 3 rouges ; alias vers un chemin inexistant, 3 rouges ;
    chaîne littérale vide, 2 rouges ; `$` de tête gardé dans un segment
    (propriété absente), 2 rouges. Contre `conformiteDtcg.test.ts` : unité
    `em`, 8 rouges ; composante hors de [0, 1], 6 rouges.
- Résultats :
  - designtokens.org sert le schéma empaqueté par `schemas/scripts/bundle.ts` ;
    ses sous-schémas y répondent 404. Le fichier empaqueté est figé dans
    `packages/plugin/tests/dtcg-2025.10/`, sources au commit `11f95e8` du dépôt
    `design-tokens/community-group`.
  - Export simulé : 28 feuilles conformes sur 40 ; les 12 autres sont le
    dialecte que `FORMAT.md` énumère, `string`, `boolean` et `$value: null`.
    Sans elles, le document entier est valide. Le document dérivé du Playground
    en L2 rend 720 feuilles conformes sur 721, le chiffre de l'état des lieux.
  - Style Dictionary 5.5.3, groupe `css` : 37 déclarations pour 38 feuilles,
    `keys.__proto__.primary` étant ignorée depuis la 5.4.4. Un fichier qui porte
    une boucle d'alias est refusé en « Reference Errors » ; le test
    d'intégration construit le fichier simulé sans elle.
  - Documents mis en accord : `CONCEPT.md`, `README.md`, `ROADMAP.md`,
    `docs/RECETTE.md`, README du plugin et section Vérification d'`AGENTS.md`.
- Artefacts et empreintes :
  - `packages/plugin/tests/dtcg-2025.10/format.json` :
    `32e93b780e4e4bca778d0780cb797a560deedc470c608af16576223f7e42915f`.
  - Worktree de session, `packages/plugin/dist/galerie/clair/planche-6.png` :
    `291756c75d0516ac5bcc7ce29f66913055f545205ba0899832a35dc121a32021`.
  - Même dossier, `sombre/planche-6.png` :
    `48b490a13adefb90b4fa126b67e0488dedce9deac63b9e325f352354550e2c0b`.
- Écart ou réserve : aucun

### L8 — Audit automatisé avant Figma

- Commit : celui qui porte cette entrée, le paquet H1 et les cases de L8.
- Méthode : l'Exporter est audité dans un worktree du dossier de session,
  extrait en LF depuis `b2ad961`, qui porte aussi les commits de l'autre
  travail. La copie de travail partagée garde un renommage étranger en cours.
- Commandes :
  - Exporter, `npm ci` : sortie 0. Playground, `rm -rf node_modules` puis
    `npm ci` : sortie 0, `style-dictionary@5.5.3`.
  - Exporter, deux passes de `npm test`, `npm run typecheck`, build du kit et
    étapes `build:code`, `build:ui`, `build:manifest` : sortie 0 à chaque
    passe, 1 000 tests verts (19, 52, 295, 611, 23), aucun fichier suivi
    modifié après l'une ou l'autre, `git diff --check` : sortie 0.
  - Playground, deux `npm run build` : sortie 0, CSS identique à l'octet,
    `ccf89371a396d7b538294ba38a088484940b89adbc236711fbb6b9974bccf0a3`,
    arbre propre.
  - Six cas du fichier simulé exportés deux fois (`SRGB`, `DISPLAY_P3`,
    `LEGACY`, les deux premiers sans boucle, collection `2026`) : chaque paire
    identique à l'octet. L'export `LEGACY` a l'empreinte de l'export sRGB et un
    avertissement de plus.
  - Configuration du Playground sur l'export sRGB sans boucle : 37
    déclarations, 10 `var()`, aucun `[object Object]`, aucune valeur vide ni
    accolade ; `null` sur les deux feuilles dont la cible est absente. Cible
    temporaire `color/p3` sur l'export Display P3 : même relevé et 7
    `color(display-p3 …)`, une par couleur littérale.
  - Mutations rejouées dans le worktree, chacune restaurée à l'identique : L2,
    tolérance neutralisée (1 rouge) et octet du fixture (1) ; L4, refus
    désactivé (3) et version future lue comme courante (1) ; L5, espace (2),
    alpha (6), unité (4), marque (3) ; L6, boucle (1), chemin (4), mode vide
    (2), cible (4), sérialisation (3) ; L7, `[object Object]` (3), référence
    (3), valeur vide (2), propriété absente (2), unité (8), composante (6).
    Arbre propre ensuite.
- Résultats :
  - Aucun fichier publiable du kit, de la CLI ou de l'adaptateur n'a changé
    depuis `ff2a719` : la série servie reste la bonne.
  - Pins exacts et servis : la CLI 0.1.24 et l'adaptateur 0.1.17 dépendent du
    kit 0.1.25 ; le Playground épingle la CLI 0.1.24 et Style Dictionary
    5.5.3, comme les `devDependencies` du plugin.
  - Chaque commit de la migration ne porte que les fichiers de son lot.
- Artefacts et empreintes, dossier de session `l8/` :
  - `exports/srgb.json` et `exports/legacy.json` :
    `59e10a07eeb95e6d994fc5582d700de12187cf757da333bc2727f0fdc9218798`.
  - `exports/display-p3.json` :
    `aaee48b7e625e6484102ca710ba04f0c430edd8abb3115fc1ca28ab07d248493`.
  - `pg/moteur-srgb/tokens.css` :
    `caaafbff46810f31ffda6ec2691d65c346e90b68b3aa7d1fb886b71e5218a26d`.
  - `pg/moteur-p3/tokens.css` :
    `c52d93212108a65f568dde8dd5fd033f32c0ba1a6ec209f2a1c4044433d9ddc9`.
- Écart ou réserve : aucun

### H1 — Plugin de développement

- Gestes du mainteneur : build de développement chargé dans Figma, jeton du
  repository retiré, fichier du design system analysé, tokens téléchargés.
  Export déposé dans `recette-dtcg\h1\tokens-srgb.json`, empreinte
  `cc580cd9582a3dc8e2af02e4b0e82bd7e082e606387d16493901a897a5cf0d76`.
- Commandes :
  - `etatDuFormatDeTokens` sur l'export : `courante`, version `1`. Sur le
    `tokens.json` du Playground : `origine`.
  - Schéma DTCG 2025.10 figé, feuille par feuille : 720 conformes sur 721. La
    seule refusée est `primitives.fontfamily.base`, typée `string`, le dialecte
    que `FORMAT.md` énumère et que le typage de la famille lèvera.
  - `ecartsDeTokens` entre le `tokens.json` du Playground et l'export, espace
    `srgb` : **aucun écart** sur 721 feuilles.
  - Style Dictionary 5.5.3, configuration du Playground, sur l'export :
    `tokens.css` identique à l'octet au CSS d'origine,
    `ccf89371a396d7b538294ba38a088484940b89adbc236711fbb6b9974bccf0a3`, 727
    lignes, 721 déclarations, 544 `var()`, aucun `[object Object]`, aucune
    valeur vide ni accolade orpheline.
  - `npx --yes @ucm-kit/cli@0.1.24 check` sur une copie du Playground portant
    l'export : sortie 0, 387 références contrôlées sur quatre contrats, aucune
    absente.
- Résultats :
  - La racine porte `{"com.ucm.formatVersion":1}`, et la chaîne n'apparaît
    qu'une fois dans le fichier : aucune homonyme imbriquée.
  - Formes publiées : 102 couleurs `{colorSpace, components, alpha}` toutes en
    `srgb`, `alpha` écrit partout ; 71 dimensions `{value, unit}`, `px` la
    seule unité ; 18 feuilles de graisse en `number`, littéraux au poids de
    `poidsDeGraisse()` et alias restés références.
  - Le vocabulaire de formes de l'export réel est un sous-ensemble strict de
    celui du mock : aucune forme du réel n'est absente du mock, qui en couvre
    onze de plus, dont `boolean`, `$value: null` et les modes multiples de
    `dimension`, `number` et `string`. Rien à ajouter au mock.
- Artefacts et empreintes : l'export ci-dessus, hors des deux dépôts.
- Écart ou réserve : **le cas Display P3 n'a pas été exercé sur un fichier
  Figma réel.** L'écran du mainteneur ne rend pas le Display P3, et Figma ne
  propose alors pas de changer le profil du fichier. Deux exports déposés se
  sont révélés identiques à l'octet, tous deux en `srgb` : le second venait
  d'un document resté en sRGB, et `figma.root.documentColorProfile` avait donc
  raison. Un build instrumenté, qui affichait le profil lu, a été construit
  puis retiré sans être commité ; le mainteneur a décidé de poursuivre sans ce
  contrôle. Le chemin P3 reste couvert par le mock : `conformiteDtcg` valide
  les deux profils, la mutation de l'espace en L5 faisait rougir deux tests, et
  L8 a construit le CSS `color(display-p3 …)` sur la cible temporaire. Seule la
  lecture vivante du profil sur un document réellement en Display P3 n'a pas de
  preuve. H3 la fournira si un écran la permet.

### L9 — Candidat de publication

- Commit : celui qui porte cette entrée, le retrait du test provisoire et les
  cases de L9.
- Commandes :
  - Dernier résultat du test retiré, avant son retrait :
    `npx tsx --test --test-name-pattern="migration"
    packages/plugin/tests/exportTokens.test.ts` : sortie 0, vert sur les trois
    profils `SRGB`, `LEGACY` et `DISPLAY_P3`, aucun écart contre le fixture
    d'origine.
  - `npm test` : sortie 0, 999 tests verts (19, 52, 295, 610, 23), un de moins
    qu'en L8, celui qui vient d'être retiré.
  - `npm run typecheck` : sortie 0. `npm run build` : sortie 0.
  - `npm view` sur les trois paquets : `@ucm-kit/core` 0.1.25, `@ucm-kit/cli`
    0.1.24, `@ucm-kit/adapter-typescript` 0.1.17, tous servis et égaux aux
    manifestes du dépôt.
  - Mutations de l'export réel, pour prouver que le « aucun écart » de H1 est
    une mesure : espace d'une couleur en `display-p3`, alpha retiré, composante
    à 1,4, unité en `em`, graisse revenue à son nom, marque à `2`. Six
    mutations, six refus, chacun nommant le chemin fautif ; la marque à `2` rend
    en plus l'état `future`. Le témoin non muté reste à zéro écart et
    `courante`. Le fichier déposé n'a pas été touché : chaque mutation portait
    sur une copie en mémoire.
- Résultats :
  - Le test qui comparait la sortie du moteur au fixture d'origine est retiré
    de `exportTokens.test.ts`, avec ses trois imports devenus orphelins. Le
    fixture `packages/kit/fixtures/tokens/origine/` reste, empreinte
    `433f7e1060e3aa4e8e6a45410d8c040ae27cf3b11241e8210ac6bc46d12e5ff8`, et
    `fixturesTokens.test.mjs` continue de le lire sans le comparer au moteur.
  - `comparerTokens.ts` reste : L10 compare avec lui les exports du plugin
    publié à celui de H1.
  - Pins documentés et `CHANGELOG-FORMAT.md` déjà en accord : le test des pins
    et celui du contenu publiable passent sans modification. La dernière phrase
    de la section `tokens.json` du changelog attend la publication Community,
    comme L10 le prévoit.
  - L8 n'est pas rejoué : aucune correction de la migration n'a eu lieu depuis.
    Le seul commit ajouté, `a49c44d`, est le renommage `.rulesItems` en
    `.ruleItem`, étranger à la migration, passé sous les mêmes contrôles
    complets avant d'être poussé.
- Manifeste présenté en H2 :
  - Exporter, `main`, commits de la migration de `ff2a719` à cette entrée.
  - Playground, `main`, `8908c66`.
  - Versions servies : `@ucm-kit/core` 0.1.25, `@ucm-kit/cli` 0.1.24,
    `@ucm-kit/adapter-typescript` 0.1.17.
  - Workflows : `.github/workflows/publish.yml` dans l'Exporter, une exécution
    par paquet ; `.github/workflows/ucm.yml` dans le Playground, qui épingle
    `@ucm-kit/cli@0.1.24`.
  - Plugin : `ucm-exporter-plugin` 0.1.0, privé, sans numéro dans
    `manifest.json`. C'est la version que H2 publie sur la Community, et dont
    L10 écrira le nom dans le changelog.
  - Résultat H1 : l'export réel valide toute la matrice en sRGB, avec la
    réserve Display P3 ci-dessus.
- Artefacts et empreintes : aucun nouveau.
- Écart ou réserve : la réserve Display P3 de H1, ouverte et assumée par le
  mainteneur.

## Paquet de validation H1

Cette porte revient au mainteneur : l'agent ne peut pas exécuter Figma. Les
deux exports se déposent dans `A:\_5_Projets pros\Apicil - Intencial -
FundShop\Projet UCM\recette-dtcg\h1\`, un dossier hors des deux dépôts.

### Préalables

1. Dans `UCM-Exporter`, sur `main` à jour, `git status --short` doit être vide.
   Le renommage `.rulesItems` en `.ruleItem`, en cours dans la copie de
   travail, est commité ou mis de côté par son auteur avant cette étape.
2. À la racine : `npm ci`, puis `npm run build`.
3. Dans l'application de bureau Figma : **Plugins**, **Development**, **Import
   plugin from manifest**, puis `packages/plugin/dist/manifest.json`.
4. Si le plugin est connecté à un repository, retirer le jeton dans sa page de
   configuration pour la durée de H1 : sans repository, le plugin propose
   **Télécharger les tokens** et n'ouvre aucune pull request. Le jeton se
   ressaisit après H1.

### Gestes

1. Ouvrir le fichier Figma du design system. Vérifier dans **File color
   profile** qu'il est en sRGB. Lancer **Analyser les tokens du fichier**.
   Attendu : sous le résumé des tokens, « DTCG 2025.10, version 1 du format de
   tokens », et aucun point « aucun profil de couleur n'est choisi ».
   Télécharger, puis enregistrer sous `h1\tokens-srgb.json`.
2. Dupliquer le fichier. Dans la copie, **File color profile**, **Change to
   Display P3**, en gardant les valeurs de couleur (**Assign**). Analyser,
   vérifier la même ligne de format, télécharger, puis enregistrer sous
   `h1\tokens-display-p3.json`.
3. Capturer la carte des tokens après l'analyse du fichier sRGB, sous
   `h1\capture-resultat.png`. Un fichier sans profil de couleur, s'il en existe
   encore un, donne la capture de l'avertissement sous
   `h1\capture-legacy.png`. Figma n'en crée plus : sans ce fichier, l'écrire
   dans `h1\notes.txt`, et la planche 6 de la galerie en tient lieu.
4. Comparer dans Figma quelques couleurs des deux fichiers, et écrire dans
   `h1\notes.txt` si elles correspondent au document ou quels écarts se voient.

### Ce que l'agent vérifie ensuite

| Contrôle | Attendu |
|---|---|
| `etatDuFormatDeTokens` sur les deux fichiers | `courante`, version `1` |
| `ecartsDeTokens` entre `src/tokens/tokens.json` du Playground et `tokens-srgb.json`, espace `srgb` | aucun écart, sauf un token changé dans Figma depuis le dernier export, nommé un par un |
| `tokens-display-p3.json` contre `tokens-srgb.json` | mêmes chemins, types et références ; mêmes composantes, `colorSpace` à `display-p3` |
| `conformiteDtcg` appliqué aux deux fichiers | toutes les feuilles conformes sauf la famille et les autres feuilles du dialecte, chemin par chemin |
| Style Dictionary 5.5.3, configuration du Playground, sur `tokens-srgb.json` | CSS égal au CSS actuel, chaque couleur à `0.5 / 255 + 1e-6` près, dimensions et références identiques |
| Même fichier Display P3, cible temporaire `color/p3` | une déclaration `color(display-p3 …)` par couleur littérale, aucun des quatre défauts |
| `npx --yes @ucm-kit/cli@0.1.24 check` sur une copie du Playground qui porte `tokens-srgb.json` | sortie 0, aucune référence absente |

Un écart renvoie au lot responsable, et H1 se rejoue sur le seul cas touché.
