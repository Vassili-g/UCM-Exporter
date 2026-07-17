# TokenLintel

Plugin Figma local à deux commandes : « Export composant » transforme un
Component Set en contrat UCS JSON ; « Export tokens » exporte toutes les
variables locales en DTCG (`tokens.json`), chaîne d'alias préservée. La
configuration GitHub optionnelle ouvre une PR par export ; sans configuration
valide, le plugin conserve le téléchargement local. La
spécification fonctionnelle de référence est [`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md),
la vision produit est décrite dans [`CONCEPT.md`](./CONCEPT.md).

## Développement

```sh
npm install
npm test
npm run build
```

Le build produit trois fichiers ignorés par Git :

- `dist/code.js` — code principal du plugin ;
- `dist/ui.html` — UI autonome avec JavaScript et CSS intégrés ;
- `dist/manifest.json` — manifest distribuable pointant vers les deux fichiers
  ci-dessus.

Importez ensuite `dist/manifest.json` via **Figma → Plugins → Development →
Import plugin from manifest**. Le `manifest.json` à la racine reste également
utilisable directement pendant le développement.

## Architecture

- `src/contract/` — export du contrat de composant (moteur générique : axes de
  variantes dynamiques, couche sémantique `semantics.ts`, wrapper de
  dimensions optionnel, lecture Figma via `extractRules.ts`, modèle pur via
  `rulesModel.ts` et liaison des icônes via `mergeIconRules.ts`) ;
- `src/tokens/` — export DTCG des variables (types décidés sur la racine de la
  chaîne d'alias, modes multi-marque sous `$extensions`) ;
- `src/variables.ts` — résolution commune des noms de variables, sans aplatir
  leurs valeurs ;
- `src/config.ts` — validation et persistance locale des réglages GitHub ;
- `src/github.ts` — création de branche, écriture de l'artefact et ouverture de PR ;
- `src/base64.ts` — codec sans dépendance aux API absentes du sandbox Figma ;
- `src/ui/` — composants et état de l’interface ;
- `tests/` — tests des fonctions pures critiques.

Les exports de référence produits sur le fichier Figma réel sont conservés
dans `tests/test-exports/` (`Button.contract.json`, `tokens.json`).

## Exporter

Sans configuration GitHub valide, chaque commande télécharge son JSON
localement. La page de configuration permet sinon de renseigner un repository,
une branche, les dossiers de destination et un PAT fine-grained ; TokenLintel
ouvre alors une PR contenant uniquement l'artefact exporté. Le PAT reste dans
`figma.clientStorage` et n'est jamais renvoyé à l'interface après sauvegarde.
