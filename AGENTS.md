# Unified Component Exporter — guide pour agents IA (et nouveaux contributeurs)

Plugin Figma qui exporte des **contrats de composant** (JSON) et les variables
en **tokens DTCG**. Co-localisés avec le code réel, ces artefacts mettent en
œuvre le concept UCM et donnent au design comme au développement une référence
commune, lisible par les humains et les agents IA.

## Ordre de lecture

Lire dans cet ordre avant de toucher au code :

1. [`CONCEPT.md`](./CONCEPT.md) — la vision : ce qu'est l'UCM, pourquoi, et
   **qui fait foi** en cas de contradiction (§3, arbitrage des sources).
2. [`UCM-EXPORTER-SPEC.md`](./UCM-EXPORTER-SPEC.md) — **la spécification de référence** : le design
   system décrit, l'algorithme des exports, le dépôt GitHub et le schéma des sorties.
   Elle fait foi sur le **comportement du plugin** (CONCEPT fait foi sur les
   principes) : c'est le document à consulter avant de toucher au moteur.
3. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — les règles de code : commentaires
   utiles en français, robustesse, généricité, tests.
4. [`src/contract/types.ts`](./src/contract/types.ts) — le schéma du contrat de composant,
   type par type, commenté.
5. [`tests/test-exports/`](./tests/test-exports/) — les sorties réelles
   produites sur le fichier Figma de référence (`Button.contract.json`,
   `tokens.json`). À consulter pour voir la forme concrète des exports.

Pour le contexte projet — objectif MVP, état d'avancement et prochaines étapes —
voir [`ROADMAP.md`](./ROADMAP.md).

## Carte du code

- `src/code.ts` — point d'entrée du plugin : routage UI → handlers.
- `src/contract/` — commande « Export composant » (contrat JSON) :
  - `exportComponent.ts` — orchestrateur + métadonnées ;
  - `componentTree.ts` — axes de variantes, matrice, détection du wrapper ;
  - `extractSlotTokens.ts` — peintures et contours liés dans un variant ;
  - `extractVariantTokens.ts` — assemblage des feuilles dans les arbres par axes ;
  - `extractLayout.ts` — dimensions, slots enfants, typographie ;
  - `extractSizes.ts` — dimensions par taille (big/medium/small…) ;
  - `extractRules.ts` — règles d'usage lues dans le conteneur `<Nom>-Rules` ;
  - `rulesModel.ts` — assemblage pur des règles, intentions et politiques ;
  - `mergeIconRules.ts` — liaison générique règles ↔ calques ↔ props d'icône ;
  - `semantics.ts` — **seul** lieu du vocabulaire sémantique (size, label,
    rôles rendables…) et contrôle des rôles relevés ;
  - `parsers.ts` — props Figma → props publiques, intention taguée ;
  - `types.ts` — schéma du contrat.
- `src/tokens/exportTokens.ts` — commande « Export tokens » (DTCG).
- `src/utils.ts` + `src/variables.ts` — nommage canonique et résolution
  d'alias, **communs aux deux commandes**. `indexVariables()` y tranche les
  collisions de noms une seule fois pour les deux : sans cet index partagé, un
  contrat citerait un token attribué à une autre variable.
- `src/base64.ts` — codec UTF-8/Base64 compatible avec le sandbox Figma.
- `src/config.ts` — validation et stockage local de la configuration GitHub.
- `src/github.ts` — dépôt d'un artefact sur une branche et ouverture d'une PR.
- `src/ui/` — interface (vanilla JS, un fichier autonome au build).
- `tests/` — tests des fonctions pures ; `scripts/run-tests.js` les découvre
  tous, un nouveau fichier `*.test.ts` tourne sans rien déclarer (`npm test`).

## Commandes

```sh
npm test          # tests unitaires (obligatoire avant PR)
npm run build     # typecheck + bundle + manifest (obligatoire avant PR)
npm run typecheck # tsc --noEmit seul
```

## Invariants à ne jamais casser

- **Aucune logique spécifique à un composant** (« si Button alors… » interdit).
- **Chaîne d'alias préservée** : on exporte des noms de tokens, jamais des
  valeurs résolues.
- **Renommage sémantique = traçabilité** : `figmaName` / `figmaLayer`
  conservent toujours le nom Figma d'origine.
- **Warnings non bloquants** : une donnée incomplète avertit sans interrompre
  l'export. Seules les préconditions explicitement obligatoires dans la spec
  peuvent le bloquer (sélection invalide, conteneur de règles absent ou vide).
- **`normalizeName()` unique** : un token s'écrit pareil dans un contrat et
  dans `tokens.json`. Il a plusieurs entrées pour une sortie, donc deux
  variables Figma peuvent se disputer un nom : les départager relève de
  `indexVariables()`, jamais d'une commande en particulier.
- Changement de forme du contrat → incrémenter `contractVersion`
  (`src/contract/exportComponent.ts`) **et** mettre à jour `UCM-EXPORTER-SPEC.md`.
- **Toute modification se termine par une revue des `.md`** : mettre à jour ce
  qui ne décrit plus la réalité, en décrivant l'état actuel et sans rien
  répéter (règles de rédaction : [`CONTRIBUTING.md`](./CONTRIBUTING.md),
  « Mettre à jour la documentation »).

## Limites de l'environnement

- Le plugin ne s'exécute que dans Figma : un agent ne peut PAS lancer les
  exports lui-même. Les validations runtime passent par l'utilisateur, qui
  ré-exporte et dépose les fichiers dans `tests/test-exports/`.
- Le seul domaine réseau autorisé est `https://api.github.com`, lorsque la
  configuration locale est valide. Le plugin ouvre une PR et
  n'auto-merge jamais ; en cas d'échec, il retombe sur le téléchargement local.
- Aucune écriture dans le document Figma.
