# Unified Component Exporter

Plugin Figma qui exporte une spécification design versionnée à côté du code
réel d’un composant.

Il produit deux artefacts :

| Commande | Sortie | Contenu |
|---|---|---|
| **Exporter le composant** | `<IdentifiantCode>.contract.json` | Projection visuelle portable, variantes exactes, états, structure, tokens, icônes, règles d’usage, et un échantillon de maquette non normatif |
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

Le manifest déclare aussi `enablePrivatePluginApi`, réservé aux plugins privés
d’une organisation : une publication publique sur la Community suppose de le
retirer. Le seul appel qui en dépend est `figma.fileKey`, qui alimente le lien
`meta.figma.url` ; sans lui, le contrat garde `fileName` et `nodeId`, et
l’export n’est pas bloqué.

| Commande | Rôle |
|---|---|
| `npm test` | Exécute les tests de l’exporteur |
| `npm run typecheck` | Vérifie TypeScript |
| `npm run build` | Vérifie puis construit le plugin complet |
| `npm run schema` | Régénère le JSON Schema du contrat depuis `types.ts` (paquet `@ucm/kit`) |

## Architecture

```text
packages/plugin/    Le MOTEUR — extraction Figma. Dépend du kit.
  src/contract/       Extraction des contrats de composant
  src/tokens/         Export DTCG
  src/ui/             Interface du plugin
  src/code.ts         Routage des commandes
  src/variables.ts    Index commun des variables et des alias
  src/github.ts       Dépôt optionnel par pull request
  manifest.json       Le plugin se charge dans Figma depuis son `dist/`

packages/kit/       Le FORMAT — `@ucm/kit`. Ne dépend de personne.
  src/format/         Types, version et règles de nommage, sans Node ni Figma
  scripts/            Génération du schéma depuis `types.ts`
  schema/             Le schéma commité, publié en `@ucm/kit/schema`
  fixtures/           Contrats d'une version que le moteur ne fabrique plus
```

La coupure passe entre le FORMAT et le MOTEUR, et dans un seul sens : le plugin
importe le kit, jamais l'inverse. C'est ce qui rend le kit régénérable et
publiable seul.

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
- [PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md) — recherche proposée pour
  une vérification générique du rendu lors des prochaines phases ;
- [PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md) — document de
  travail : rendre les artefacts consommables par n’importe quel repository,
  quelle que soit sa techno ;
- [AGENTS.md](./AGENTS.md) — guide opérationnel pour contribuer avec un agent ;
- [UCM Playground](https://github.com/Vassili-g/UCM-Playground) — consommateur
  de référence des artefacts.

## État

La version du contrat est celle que publie `CONTRACT_VERSION`
(`packages/kit/src/format/version.ts`), seul endroit où elle est écrite. Le moteur
accepte un Component seul ou un Component Set. Chaque combinaison exacte porte
ses tokens et référence une vue composée de cinq renvois indépendants :
structure, typographie, icônes, dépendances et chemins de peintures. La
projection de référence renvoie au même catalogue de structures, les valeurs
neutres sont élidées et aucun index de tokens dérivable n’est publié.

Une clé de couleur n’est pas un rôle : `rendering.roles` porte le vocabulaire
partagé, identique dans tous les contrats, et `rendering.keyRoles` le rôle des
clés qui n’en portent pas le nom. Ce qu’un calque hors du flux ne peut pas
lier à une variable est publié quand même, en vocabulaire CSS et sous une
notice : sa place (`constraints`, `inset`) et sa `rotation`. À côté du
normatif, `samples` et `variants[].sample` portent un échantillon de maquette
— textes, booléens, valeurs d’enum et noms de composants — que le contrat
n’exige jamais, qui n’avertit de rien et dont le retrait laisse un contrat
strictement normatif.

Ce repository ne contient aucun artefact de contrat : un `.contract.json` vit
dans le repository qui le consomme, à côté du code qu’il décrit. Les lois de
forme sont donc vérifiées sur chaque contrat que le moteur fabrique pendant
`npm test`, jamais sur un exemplaire gelé. La maturité et les limites restantes
vivent dans [ROADMAP.md](./ROADMAP.md).
