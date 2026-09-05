# Unified Component Exporter

Plugin Figma qui exporte un composant sous forme de contrat JSON versionné, et
outillage qui vérifie que le code du repository reste conforme à ce contrat.

## UCM en bref

Un même composant existe à plusieurs endroits : Figma, le code, les tokens, la
documentation. Ces représentations divergent avec le temps, sans que personne
le voie.

L'UCM (Unified Component Model) donne un propriétaire unique à chaque
information :

| Information | Qui fait foi |
|---|---|
| Variantes, états, dimensions, couleurs, icônes, tokens | Figma |
| Comportement, événements, accessibilité, attributs natifs | Le code |
| La correspondance entre les deux | La CI du repository |

Figma exporte ce qu'il possède dans un fichier `.contract.json`, posé à côté du
code du composant :

```text
components/Button/
  Button.<ext>          le comportement, écrit par un développeur
  Button.contract.json  le visuel, exporté depuis Figma
```

Le code de production ne lit jamais ce JSON à l'exécution. Le développeur écrit
le composant en s'appuyant sur le contrat, et la CI compare à chaque pull
request la surface d'API des deux : les props déclarées, leur type, et les
composants réellement rendus. Le rendu visuel lui-même n'est pas vérifié.

## La boucle

```text
Figma
  │   commande « Exporter le composant »
  ▼
Button.contract.json
  │   dépôt GitHub optionnel : branche + pull request automatiques
  ▼
CI du repository consommateur
  │   6 contrôles
  ▼
Rapport publié en commentaire de la pull request
```

Le rapport est écrit pour le designer qui valide l'export. Il liste ce qui
bloque, ce qui avertit, et l'action attendue de chacun. Aucun log de CI à
ouvrir.

## Les 6 contrôles

| Contrôle | Question posée | Verdict |
|---|---|---|
| Validité | Le contrat est-il lisible et conforme au schéma ? | 🔴 bloque |
| Version | Le repository sait-il lire cette version de contrat ? | 🔴 bloque |
| Composition | Chaque composant imbriqué a-t-il son propre contrat, la liste des composants imbriqués correspond-elle aux emplacements décrits, et aucun composant ne se contient-il lui-même, directement ou via une chaîne d'imbrications ? | 🔴 bloque |
| Typographie | Les tokens typographiques ont-ils le type attendu ? | 🔴 bloque |
| Tokens | Les références `{chemin.du.token}` citées existent-elles dans `tokens.json` ? | ⚠️ avertit |
| Parité code | Les props du contrat sont-elles dans l'API publique du composant, typées correctement, et chaque composant déclaré rendu exactement une fois ? | ⚠️ avertit |

La règle de partage entre les deux colonnes est explicite : un contrôle bloque
la pull request seulement si l'auteur de l'export peut le corriger en
réexportant. Un écart avec le code attend un développeur, donc il avertit
et laisse fusionner. Un token supprimé du design system aussi : les
tokens font foi, un ancien contrat ne retient pas leur évolution.

L'absence d'implémentation est un état d'avancement autorisé. Un contrat peut
arriver avant le code qui le réalise.

Les cinq premiers contrôles ne lisent que des contrats et des tokens, ils
fonctionnent donc quelle que soit la technologie du repository. Le sixième doit
lire le code, il passe par un adaptateur propre à la stack. Le seul adaptateur
existant à ce jour couvre TypeScript et React ; il s'active sans configuration
dès qu'une implémentation est présente.

## Ce que le plugin produit

| Commande | Fichier | Contenu |
|---|---|---|
| Exporter le composant | `<IdentifiantCode>.contract.json` | Variantes exactes, états, structure, tokens, icônes, règles d'usage, et un échantillon de maquette non normatif |
| Exporter les tokens | `tokens.json` | Variables locales au format DTCG, avec leurs alias et leurs modes |

## À quoi ressemble un contrat

Voici un export réel, celui d'un composant `TileLink` du dépôt de validation —
une tuile carrée avec une icône, quatre variantes, deux axes. Il est reproduit
tel quel, à ses tokens près qui sont raccourcis pour la lisibilité :

```json
{
  "name": "TileLink",
  "meta": {
    "contractVersion": "12.0",
    "exportedAt": "2026-09-03T16:55:59.232Z",
    "figma": { "fileName": "DS AI LAB", "nodeId": "362:2381" },
    "coverage": { "portable": "complete" }
  },
  "props": {
    "variant": {
      "type": "enum",
      "values": ["info", "success"],
      "default": "info",
      "descriptions": { "info": "Lien vers un contenu informatif" }
    },
    "chessName": { "type": "icon", "policy": "modifiable" }
  },
  "viewStructures": {
    "st1": {
      "layout": "flex-row",
      "sizing": { "width": "{…sizes.width}", "height": "{…sizes.height}" },
      "justifyContent": "center",
      "alignItems": "center",
      "children": [
        { "slot": "icon", "figmaLayer": "chess", "optional": true, "size": "{…sizes.icon}" }
      ]
    }
  },
  "variantViews": { "v1": { "structure": "st1", "icons": "ic1", "paintPlacements": "pp1" } },
  "variants": [
    {
      "nodeId": "362:2380",
      "values": { "variant": "info", "state": "default" },
      "tokens": {
        "background": "{components.tilelink.colors.info.default.background}",
        "foreground": "{components.tilelink.colors.info.default.foreground}"
      },
      "view": "v1"
    }
  ],
  "icons": {
    "chess": {
      "policy": "modifiable",
      "figmaName": "chess",
      "slot": "icon",
      "size": "{…sizes.icon}",
      "runtimeProp": "chessName"
    }
  },
  "intent": { "usage": "Composant de lien vers une autre page sous la forme d'une tuile carrée" }
}
```

**Ce qu'il faut y voir, et qui vaut plus que les champs :**

- **aucune valeur n'est aplatie.** Une couleur est une RÉFÉRENCE
  (`{components.tilelink.colors.info.default.background}`), jamais `#0B5FFF` :
  le token reste le propriétaire de sa valeur, et un changement de thème n'a
  pas à repasser par un réexport ;
- **les quatre variantes sont énumérées, pas déduites.** `variants` liste les
  combinaisons qui existent RÉELLEMENT dans Figma — une matrice clairsemée
  reste clairsemée, et un consommateur ne présume jamais que le produit
  cartésien des axes est valide ;
- **ce qui se répète est catalogué.** Les quatre variantes partagent la même
  structure et les mêmes emplacements de peinture : elles citent `v1`, qui
  renvoie à `st1`, `ic1` et `pp1`. Un composant à quatre-vingt-dix variantes ne
  publie donc pas quatre-vingt-dix arbres.
- **`coverage.portable` dit ce que l'export n'a PAS su décrire.** Ici
  `complete` : rien n'a été perdu à la traduction. Un `partial` s'accompagne
  toujours d'un diagnostic qui nomme le calque et la propriété.

Le contrat est autoportant : il contient assez d'information pour qu'un
développeur ou un agent produise le composant sans consulter une implémentation
existante. Le plugin ne génère pas de code de production et n'écrit jamais dans
le document Figma.

La forme de chaque champ, et ce que son absence signifie, sont décrits dans
[docs/FORMAT.md](./docs/FORMAT.md) ; ce que chaque version a publié, et ce que
la suivante casse, dans
[docs/CHANGELOG-FORMAT.md](./docs/CHANGELOG-FORMAT.md).

Version de contrat courante : **12.0** (`packages/kit/src/format/version.ts`,
seul endroit où elle est écrite). Un consommateur en lit DEUX — la courante et
la précédente —, le temps qu'un réexport arrive.

## Utilisation

### Côté repository consommateur

```sh
npm install @ucm-kit/core
```

Le paquet expose trois entrées :

| Entrée | Usage |
|---|---|
| `@ucm-kit/core/format` | Types TypeScript, version, règles de nommage. Aucune dépendance, utilisable dans un navigateur ou dans le bundle Figma |
| `@ucm-kit/core/lecteurs` | Validateurs, collecte de références, verdict de version, rendu du diagnostic. Nécessite Node |
| `@ucm-kit/core/schema` | JSON Schema, pour les éditeurs et les consommateurs qui ne lisent pas TypeScript |

Le schéma décrit la forme d'un contrat. Les renvois internes et le format des
valeurs tokenisées sont vérifiés par les lecteurs.

#### Contrôler les contrats, sans être un projet Node

`ucm init` écrit un workflow qui n'exige aucun `package.json` : un repo iOS,
Android, ou un simple dossier de contrats peut faire contrôler ses exports. Si
un lockfile npm existe, le workflow exécute `npm ci` afin de rendre les
adaptateurs optionnels du repository visibles à `ucm check`.

```sh
npx --yes @ucm-kit/cli@0.1.7 init      # écrit ucm.config.json, .gitignore, le workflow
npx --yes @ucm-kit/cli@0.1.7 check --report ci-report.md
```

`--yes` évite l'invite de confirmation de `npx`, qui bloquerait une exécution
non interactive. La version est **exacte, sans `^`** (D7) : une plage laisserait
npx choisir une version que personne n'a essayée, et le contrôle changerait
d'avis sans qu'un fichier ait bougé.

**Le seul prérequis est Node, et il se paie à deux endroits différents.** En CI,
`setup-node` le fournit — c'est ce que le workflow écrit. En LOCAL, `npx` exige
Node sur le poste, et le développeur d'un repo iOS ou Android n'en a pas
forcément. Ce cas se documente et ne s'outille pas : distribuer un binaire par
plateforme rendrait le contrôle installable, et **du même coup deux fois
installé** — la CI et le poste pourraient alors répondre différemment sur le
même contrat, ce que ce projet passe son temps à empêcher ailleurs. Sans Node
sur le poste, la CI reste l'autorité : ouvrir la pull request donne le rapport,
qui est de toute façon le seul message que le designer lira.

[UCM Playground](https://github.com/Vassili-g/UCM-Playground) est le
consommateur de référence : arborescence des composants, `tokens.json` DTCG,
les 6 contrôles branchés, le workflow CI et le rapport publié sur la pull
request. C'est le point de départ à copier pour brancher un nouveau
repository. Un projet TypeScript peut installer
`@ucm-kit/adapter-typescript@0.1.0` pour ajouter la comparaison statique des
props et de la composition, ainsi que la génération des types dérivés des
contrats. Les enums restent hors de la garantie de parité statique.

### Construire et charger le plugin

```sh
npm install
npm run build
```

`dist/` contient le code du plugin, son interface et le `manifest.json` à
importer dans Figma (`Plugins > Development > Import plugin from manifest`).

**Distribution : la Figma Community** (T4.4, arbitrage dans
`PISTES-EVOLUTION.md §2`). Le manifest ne déclare donc pas
`enablePrivatePluginApi`, drapeau réservé aux plugins privés d'une organisation
et que Figma refuserait à la soumission. Conséquence sur les contrats :
`figma.fileKey` n'est pas accessible, `meta.figma.url` n'est plus écrit, et la
traçabilité vers le composant source passe par `fileName` et `nodeId` — que le
corps de la pull request annonce sur sa page de couverture. Aucune information
de rendu n'est perdue : c'est un raccourci de navigation qui tombe.

Un export est toujours téléchargeable localement. La configuration GitHub est
optionnelle : renseignée, elle crée la branche et la pull request contenant le
seul artefact exporté. Le PAT reste dans `figma.clientStorage` et n'apparaît ni
dans l'interface ni dans les logs.

## Commandes

| Commande | Rôle |
|---|---|
| `npm test` | Tests du moteur et du kit |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Vérifie puis construit le plugin complet |
| `npm run schema` | Régénère le JSON Schema depuis `types.ts` |

## Architecture

```text
packages/plugin/    Le MOTEUR : extraction Figma. Dépend du kit.
  src/contract/       Extraction des contrats de composant
  src/tokens/         Export DTCG
  src/ui/             Interface du plugin
  src/github.ts       Dépôt optionnel par pull request
  manifest.json       Chargé dans Figma depuis son dist/

packages/kit/       Le FORMAT : @ucm-kit/core, publié sur npm.
  src/format/         Types, version, règles de nommage. Aucune dépendance
  src/lecteurs/       Validateurs et diagnostic. Utilisent ajv et node:fs
  schema/             Le schéma commité
  fixtures/           Contrats d'une version que le moteur ne fabrique plus

packages/cli/       La COMMANDE : @ucm-kit/cli, publiée sur npm. Dépend du kit.
  src/init.mjs        Installe ce qui manque à un repository, sans rien écraser
  src/check.mjs       Contrôle les contrats et rend le rapport du designer
  src/icons.mjs       Liste les icônes que les contrats réclament

packages/adapter-typescript/  L'ADAPTATEUR opt-in : @ucm-kit/adapter-typescript.
  src/parite.mjs       Compare contrats et API TypeScript/TSX
  src/generation.mjs   Génère les types dérivés des contrats
  src/cli.mjs          Expose la commande `ucm-typescript`
```

Le plugin importe le kit, jamais l'inverse. C'est ce qui rend le kit publiable
seul.

Le moteur ne contient aucune règle propre à `Button` ou à un autre composant.
Les composants du corpus servent uniquement à éprouver sa généricité.

## État

L'outillage consommateur — les contrôles, le rapport, le workflow et
l'adaptateur TypeScript optionnel — vit dans les paquets `@ucm-kit/*`. Un
repository quelconque se branche par `ucm init` sans écrire une ligne de script
et sans être un projet Node. C'était l'objet de
[PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md), qui porte ce qu'il
reste à faire.

Le Playground n'est plus le domicile de cet outillage : il en est le
consommateur de référence, celui qui sert à vérifier que le kit tient hors de
son dépôt d'origine.

La maturité et les limites restantes sont dans [ROADMAP.md](./ROADMAP.md).

## Documentation

| Document | Contenu |
|---|---|
| [CONCEPT.md](./CONCEPT.md) | Problème résolu, responsabilités, principes |
| [docs/FORMAT.md](./docs/FORMAT.md) | Forme du contrat et de `tokens.json`, pour qui les consomme |
| [docs/CHANGELOG-FORMAT.md](./docs/CHANGELOG-FORMAT.md) | Ce que chaque version du contrat a publié, et ce qu'elle casse |
| [packages/plugin/SPEC.md](./packages/plugin/SPEC.md) | Comportement exact du plugin : ce qu'il lit dans Figma |
| [ROADMAP.md](./ROADMAP.md) | Maturité, limites, prochaines validations |
| [PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md) | Rendre les artefacts consommables par n'importe quel repository |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Règles de développement et de test |
| [AGENTS.md](./AGENTS.md) | Guide opérationnel pour contribuer avec un agent |
| [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md) | Options non engagées |
| [PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md) | Recherche sur la vérification générique du rendu |
