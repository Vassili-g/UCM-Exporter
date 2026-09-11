# Preuves de l'alignement DTCG

Journal du [plan d'alignement](./PLAN-ALIGNEMENT-DTCG.md). Il ne contient que
des faits courts : commande, code de sortie, résumé d'une ligne, empreinte.

## État

- Lot courant : L3
- Exporter, branche et `HEAD` : `main`, `23153fc` au départ de L0
- Playground, branche et `HEAD` : `main`, `0678761` au départ de L0
- Style Dictionary retenu : à choisir en L3 ; installé au départ `4.4.0`
  (déclaré `^4.3.0`)
- Versions npm prévues : `@ucm-kit/core` 0.1.25, `@ucm-kit/cli` 0.1.24,
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
  - Le workflow du Playground épingle `@ucm-kit/cli@0.1.23`.
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
