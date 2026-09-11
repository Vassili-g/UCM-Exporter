# Preuves de l'alignement DTCG

Journal du [plan d'alignement](./PLAN-ALIGNEMENT-DTCG.md). Il ne contient que
des faits courts : commande, code de sortie, résumé d'une ligne, empreinte.

## État

- Lot courant : L6
- Exporter, branche et `HEAD` : `main`, `ff2a719` pour le code de L4
- Playground, branche et `HEAD` : `main`, `8908c66` après L4
- Style Dictionary retenu : `5.5.3`, exact ; `4.4.0` au départ
- Versions npm servies : `@ucm-kit/core` 0.1.25, `@ucm-kit/cli` 0.1.24,
  `@ucm-kit/adapter-typescript` 0.1.17
- Dernière porte humaine franchie : aucune

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
