# Unified Component Exporter

Plugin Figma qui exporte une spécification design versionnée à côté du code
réel d’un composant.

Il produit deux artefacts :

| Commande | Sortie | Contenu |
|---|---|---|
| **Exporter le composant** | `<IdentifiantCode>.contract.json` | API visuelle, variantes, états, structure, tokens, icônes et règles d’usage |
| **Exporter les tokens** | `tokens.json` | Variables locales au format DTCG, avec leurs alias et leurs modes |

Ces artefacts mettent en œuvre l’**UCM — Unified Component Model** : Figma porte
la vérité visuelle, le code porte le comportement, et le repository vérifie
leur cohérence. Le projet ne génère pas le code de production et le plugin
n’écrit jamais dans le document Figma.

```text
Figma ── Unified Component Exporter ──► contrat + tokens
                                             │
                                             ▼
                              code, contrôles CI et agents
```

## Utilisation

Une exportation est toujours téléchargeable localement. Une configuration
GitHub facultative permet aussi de créer une branche et une pull request
contenant uniquement l’artefact exporté. Le PAT reste dans
`figma.clientStorage` et n’est ni renvoyé à l’interface ni ajouté aux logs.

```sh
npm install
npm test
npm run build
```

Le build produit dans `dist/` le code du plugin, son interface autonome et le
manifest importable dans Figma. Pour le développement, le `manifest.json` à la
racine pointe également vers les bundles construits.

L’identifiant `0000000000000000000` du manifest est un placeholder de
développement. Il ne doit être remplacé qu’à la préparation d’une publication,
avec l’identifiant effectivement attribué par Figma ; il reste tel quel pour un
build local.

| Commande | Rôle |
|---|---|
| `npm test` | Exécute les tests de l’exporteur |
| `npm run typecheck` | Vérifie TypeScript |
| `npm run build` | Vérifie puis construit le plugin complet |

## Architecture

```text
src/
  contract/       Extraction des contrats de composant
  tokens/         Export DTCG
  ui/             Interface du plugin
  code.ts         Routage des commandes
  variables.ts    Index commun des variables et des alias
  github.ts       Dépôt optionnel par pull request
tests/
  test-exports/   Petit corpus d’exports Figma réels
```

Le moteur ne contient aucune règle propre à `Button` ou à un autre composant.
Les exemples réels servent uniquement à éprouver sa généricité.

## Documentation

Chaque document a un rôle unique :

- [CONCEPT.md](./CONCEPT.md) — problème résolu, responsabilités et principes ;
- [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) — comportement exact du plugin
  et format actuel des sorties ;
- [ROADMAP.md](./ROADMAP.md) — maturité, limites et prochaines validations ;
- [PLAN-STRUCTURE-PROFONDE.md](./PLAN-STRUCTURE-PROFONDE.md) — décisions
  validées et conditions d’une future extension de structure ou de layout ;
- [CONTRIBUTING.md](./CONTRIBUTING.md) — règles de développement et de test ;
- [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md) — options non engagées ;
- [AGENTS.md](./AGENTS.md) — guide opérationnel pour contribuer avec un agent ;
- [UCM Playground](https://github.com/Vassili-g/UCM-Playground) — consommateur
  de référence des artefacts.

## État

Le pipeline est opérationnel sur un composant simple et un premier contrat
composé. Les protections principales sont testées, mais la généricité reste à
valider sur plusieurs familles de composants avant toute industrialisation.
Voir [ROADMAP.md](./ROADMAP.md) pour le périmètre de validation.
