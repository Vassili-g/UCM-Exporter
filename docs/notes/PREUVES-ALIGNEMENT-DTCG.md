# Preuves de l'alignement DTCG

Journal du [plan d'alignement](./PLAN-ALIGNEMENT-DTCG.md). Il ne contient que
des faits courts : commande, code de sortie, résumé d'une ligne, empreinte.

## État

- Lot courant : L1
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
