# TokenLintel — guide pour agents IA (et nouveaux contributeurs)

Plugin Figma qui exporte des composants en **contrats UCS** (JSON) et les
variables en **tokens DTCG**, pour que design et code partagent la même
source de vérité, lisible par humains et agents IA.

## Ordre de lecture

Lire dans cet ordre avant de toucher au code :

1. [`CONCEPT.md`](./CONCEPT.md) — la vision : ce qu'est une UCS et pourquoi.
2. [`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md) — **la spécification de référence** : le design
   system décrit, l'algorithme des deux commandes, le schéma des sorties.
   C'est le document le plus important ; il fait foi en cas de doute.
3. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — les règles de code : commentaires
   systématiques en français, robustesse, généricité, tests.
4. [`src/contract/types.ts`](./src/contract/types.ts) — le schéma du contrat UCS,
   type par type, commenté.
5. [`tests/test-exports/`](./tests/test-exports/) — les sorties réelles
   produites sur le fichier Figma de référence (`Button.contract.json`,
   `tokens.json`). À consulter pour voir la forme concrète des exports.

## Carte du code

- `src/code.ts` — point d'entrée du plugin : routage UI → handlers.
- `src/contract/` — commande « Export composant » (contrat UCS) :
  - `exportComponent.ts` — orchestrateur + métadonnées ;
  - `componentTree.ts` — axes de variantes, matrice, détection du wrapper ;
  - `extractVariantTokens.ts` — tokens couleur/contour par variant ;
  - `extractLayout.ts` — dimensions, slots enfants, typographie ;
  - `extractSizes.ts` — dimensions par taille (big/medium/small…) ;
  - `extractRules.ts` — règles d'usage lues dans le conteneur `<Nom>-Rules` ;
  - `semantics.ts` — **seul** lieu du vocabulaire sémantique (size, label…) ;
  - `parsers.ts` — props Figma → props publiques, intention taguée ;
  - `types.ts` — schéma du contrat.
- `src/tokens/exportTokens.ts` — commande « Export tokens » (DTCG).
- `src/utils.ts` + `src/variables.ts` — nommage canonique et résolution
  d'alias, **communs aux deux commandes**.
- `src/ui/` — interface (vanilla JS, un fichier autonome au build).
- `tests/` — tests des fonctions pures (`npm test`).

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
- **Warnings non bloquants** : une donnée manquante avertit, n'interrompt pas.
- **`normalizeName()` unique** : un token s'écrit pareil dans un contrat et
  dans `tokens.json`.
- Changement de forme du contrat → incrémenter `ucsVersion`
  (`src/contract/exportComponent.ts`) **et** mettre à jour `TOKENLINTEL-SPEC.md`.

## Limites de l'environnement

- Le plugin ne s'exécute que dans Figma : un agent ne peut PAS lancer les
  exports lui-même. Les validations runtime passent par l'utilisateur, qui
  ré-exporte et dépose les fichiers dans `tests/test-exports/`.
- Pas d'appel réseau, pas d'écriture dans Figma ni dans un repo (MVP).
