# Unified Component Exporter

**Le pont entre un design system Figma et son implémentation dans le code.**

Unified Component Exporter est un plugin Figma qui transforme les composants et variables du
design system en artefacts structurés, lisibles par les développeurs comme par
les agents IA.

Le projet repose sur l'**UCM — Unified Component Model** : l'ensemble des
règles qui font d'un composant un **composant unifié** — qui fait foi sur quoi,
la co-localisation du code réel et de la spécification issue de Figma, et la
façon dont les composants se composent (cf. [CONCEPT.md](./CONCEPT.md)).
L'exporteur automatise le passage de Figma vers cette organisation.

L'objectif : un design system **robuste**, co-créé par le designer et le
développeur, qui ne diverge d'aucun côté, et un frontend **« future proof »** —
lisible par les agents IA pour que les développeurs s'appuient sur eux **en
confiance**, plus vite et avec moins d'erreurs.

```text
Figma ── Unified Component Exporter ──► contrat de composant + tokens DTCG
                                      │
                                      ▼
                 code et spécification co-localisés (UCM)
```

## Ce que l'exporteur produit

| Commande | Entrée Figma | Sortie |
|---|---|---|
| **Exporter le composant** | Un Component Set sélectionné et son conteneur `<Nom>-Rules` | `<Nom>.contract.json` : props, variantes, états, structure, tokens, icônes et règles d'usage |
| **Exporter les tokens** | Les variables locales du fichier | `tokens.json` au format DTCG, avec toute la chaîne d'alias préservée |

**DTCG** signifie **Design Tokens Community Group**. C'est le standard
d'échange utilisé pour décrire les valeurs, types et références des design
tokens indépendamment des outils qui les consomment.

Le moteur est générique : aucune règle ne dépend du nom `Button` ou d'un autre
composant particulier. Button sert uniquement de cas de validation réel.

## Où vont les exports ?

Deux modes sont disponibles :

- **téléchargement local**, toujours disponible et utilisé comme solution de
  repli ;
- **dépôt GitHub**, optionnel : Unified Component Exporter crée une branche et ouvre une PR
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
être importé tel quel pendant le développement : il pointe déjà vers les
bundles construits dans `dist/`, seuls les chemins diffèrent.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm test` | Exécute les tests unitaires du moteur, de la configuration et du client GitHub |
| `npm run typecheck` | Vérifie TypeScript sans produire de fichiers |
| `npm run build` | Typecheck puis construit le code, l'UI et le manifest distribuable |

## Architecture

```text
src/
  contract/       Export des contrats de composant et lecture des règles Figma
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

- [CONCEPT.md](./CONCEPT.md) — le concept global du projet (UCM, arbitrage, co-localisation) ;
- [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) — comportement exact du plugin et format des sorties ;
- [ROADMAP.md](./ROADMAP.md) — objectif MVP, état d'avancement et prochaines étapes ;
- [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md) — analyse stratégique : positionnement, inspirations, risques ;
- [CONTRIBUTING.md](./CONTRIBUTING.md) — règles de développement et de test ;
- [AGENTS.md](./AGENTS.md) — ordre de lecture et invariants pour les agents IA ;
- [UCM Playground](https://github.com/Vassili-g/UCM-Playground) — repository qui consomme les artefacts exportés.

## Périmètre actuel

L'export des contrats, des tokens DTCG et le dépôt par PR sont validés sur
Button. Unified Component Exporter
n'écrit jamais dans le document Figma et n'effectue aucun auto-merge. L'état
d'avancement et les prochaines étapes sont tenus dans [ROADMAP.md](./ROADMAP.md).
