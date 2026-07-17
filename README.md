# TokenLintel

**Le pont entre un design system Figma et son implémentation dans le code.**

TokenLintel est un plugin Figma qui transforme les composants et variables du
design system en artefacts structurés, lisibles par les développeurs comme par
les agents IA.

Il produit deux formats complémentaires :

- **UCS — Unified Component Specification** : concept introduit par ce projet
  pour relier fortement design et développement. Une UCS réunit, au même
  endroit, le code réel d'un composant et son contrat issu de Figma — props
  visuelles, variantes, états, tokens, icônes, structure et règles d'usage. Le
  JSON produit par TokenLintel est la partie design de cette unité, pas l'UCS à
  lui seul ;
- **DTCG — Design Tokens Community Group** : format standard d'échange des
  design tokens. Il décrit leurs valeurs, types et références de manière
  indépendante des outils qui les consomment.

```text
Figma ── TokenLintel ──► contrats UCS + tokens DTCG ──► repository consommateur
```

## Ce que TokenLintel produit

| Commande | Entrée Figma | Sortie |
|---|---|---|
| **Exporter le composant** | Un Component Set sélectionné et son conteneur `<Nom>-Rules` | `<Nom>.contract.json` : props, variantes, états, structure, tokens, icônes et règles d'usage |
| **Exporter les tokens** | Les variables locales du fichier | `tokens.json` au format DTCG, avec toute la chaîne d'alias préservée |

Le moteur est générique : aucune règle ne dépend du nom `Button` ou d'un autre
composant particulier. Button sert uniquement de cas de validation réel.

## Où vont les exports ?

Deux modes sont disponibles :

- **téléchargement local**, toujours disponible et utilisé comme solution de
  repli ;
- **dépôt GitHub**, optionnel : TokenLintel crée une branche et ouvre une PR
  contenant uniquement l'artefact exporté.

La configuration GitHub est conservée localement dans `figma.clientStorage`.
Le PAT n'est ni écrit dans le document Figma, ni renvoyé à l'interface après sa
sauvegarde, ni ajouté aux logs.

## Démarrage rapide

```sh
npm install
npm test
npm run build
```

Le build génère dans `dist/` :

- `code.js` — logique du plugin ;
- `ui.html` — interface autonome avec JavaScript et CSS intégrés ;
- `manifest.json` — manifest prêt à importer dans Figma.

Dans Figma, ouvrez **Plugins → Development → Import plugin from manifest**, puis
sélectionnez `dist/manifest.json`. Le `manifest.json` à la racine peut aussi
être utilisé directement pendant le développement.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm test` | Exécute les tests unitaires du moteur, de la configuration et du client GitHub |
| `npm run typecheck` | Vérifie TypeScript sans produire de fichiers |
| `npm run build` | Typecheck puis construit le code, l'UI et le manifest distribuable |

## Architecture

```text
src/
  contract/       Export des contrats UCS et lecture des règles Figma
  tokens/         Export des variables au format DTCG
  ui/             Interface du plugin
  code.ts         Routage entre l'UI et les commandes
  variables.ts    Résolution commune des noms et alias de variables
  config.ts       Validation et stockage local de la configuration GitHub
  github.ts       Création de branche, écriture du fichier et ouverture de PR
tests/
  test-exports/   Exports réels du fichier Figma de référence
```

## Pour comprendre le projet

- [CONCEPT.md](./CONCEPT.md) — vision du design system AI-first et plan global ;
- [TOKENLINTEL-SPEC.md](./TOKENLINTEL-SPEC.md) — comportement exact du plugin et format des sorties ;
- [CONTRIBUTING.md](./CONTRIBUTING.md) — règles de développement et de test ;
- [AGENTS.md](./AGENTS.md) — ordre de lecture et invariants pour les agents IA ;
- [Components Playground](https://github.com/Vassili-g/Components-Playground) — repository qui consomme les artefacts exportés.

## Périmètre actuel

Le pipeline UCS/DTCG et le dépôt par PR sont validés sur Button. TokenLintel
n'écrit jamais dans le document Figma et n'effectue aucun auto-merge. La
prochaine validation structurante consiste à exporter un deuxième composant
non-Button.
