# Unified Component Exporter

Plugin Figma qui exporte une spécification design versionnée à côté du code
réel d’un composant.

Il produit deux artefacts :

| Commande | Sortie | Contenu |
|---|---|---|
| **Exporter le composant** | `<IdentifiantCode>.contract.json` | Projection visuelle portable, variantes exactes, états, structure, tokens, icônes et règles d’usage |
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
| `npm run schema` | Régénère le JSON Schema du contrat depuis `types.ts` |
| `npm run check:fixtures` | Constate que le corpus de référence est à la version courante |

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
schema/
  ucm-contract.schema.json   Forme du contrat, dérivée de `types.ts`
```

Le schéma est publié pour les consommateurs qui ne lisent pas TypeScript et
pour les éditeurs. Il décrit la forme d’un contrat, pas sa cohérence : les
renvois internes et le format des valeurs tokenisées restent à la charge du
consommateur, et sa propre `description` le dit.

Le moteur ne contient aucune règle propre à `Button` ou à un autre composant.
Les exemples réels servent uniquement à éprouver sa généricité.

## Documentation

Chaque document a un rôle unique :

- [CONCEPT.md](./CONCEPT.md) — problème résolu, responsabilités et principes ;
- [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) — comportement exact du plugin
  et format actuel des sorties ;
- [ROADMAP.md](./ROADMAP.md) — maturité, limites et prochaines validations ;
- [CONTRIBUTING.md](./CONTRIBUTING.md) — règles de développement et de test ;
- [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md) — options non engagées et
  conditions à réunir avant de les ouvrir ;
- [PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md) — proposition non décidée
  pour rendre générique la vérification du rendu côté consommateur ;
- [PLAN-SWAP-NOMME.md](./PLAN-SWAP-NOMME.md) — proposition non décidée pour que
  la valeur par défaut d'un remplacement natif publie un nom, jamais un
  identifiant Figma ;
- [AGENTS.md](./AGENTS.md) — guide opérationnel pour contribuer avec un agent ;
- [UCM Playground](https://github.com/Vassili-g/UCM-Playground) — consommateur
  de référence des artefacts.

## État

Le moteur écrit la version publiée par `CONTRACT_VERSION`
(`src/contract/exportComponent.ts`). Elle accepte un Component seul ou
un Component Set. Chaque variante exacte
porte ses tokens, puis référence une vue complète dédupliquée
pour son arbre, sa typographie, ses icônes, ses dépendances et les chemins de
ses peintures. Les pistes FIXED d'une grille sont conservées en pixels, une
cellule dont la piste hug publie sa mesure dans `structuralSize`, et les
valeurs par côté peuvent être clairsemées. Le Playground
consomme cette forme et dérive un type discriminé des seules combinaisons
d’enums présentes.
