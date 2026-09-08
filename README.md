# UCM Contract Exporter

Un plugin Figma qui exporte un composant sous forme de contrat JSON versionné,
et l'outillage qui vérifie que le code du repository reste conforme à ce
contrat.

## Le problème

Un même composant existe à plusieurs endroits, et rien ne garantit qu'ils disent
la même chose. UCM donne un propriétaire unique à chaque information ;
[CONCEPT.md](./CONCEPT.md) énonce le partage et ce qui l'a motivé.

Figma exporte ce qu'il possède dans un fichier `.contract.json`, posé à côté du
code du composant.

```text
components/Button/
  Button.<ext>          le comportement, écrit par un développeur
  Button.contract.json  le visuel, exporté depuis Figma
```

Le code de production ne lit jamais ce JSON à l'exécution. Le développeur écrit
le composant en s'appuyant sur le contrat, et la CI compare la surface d'API des
deux à chaque pull request : les props déclarées, leur type, et les composants
réellement rendus. Le rendu visuel lui-même n'est pas vérifié.

## La boucle

```text
Figma
  │   commande « Exporter le composant »
  ▼
Button.contract.json
  │   dépôt GitHub optionnel : branche et pull request automatiques
  ▼
CI du repository consommateur
  │   6 contrôles
  ▼
Rapport publié en commentaire de la pull request
```

Le rapport est écrit pour le designer qui valide l'export. Il liste ce qui
bloque, ce qui avertit, et l'action attendue de chacun. Aucun log de CI à
ouvrir.

## À qui ça sert

| Vous êtes | Ce que vous y gagnez | Par où commencer |
|---|---|---|
| **Designer** | Vos variantes, vos tokens et vos règles d'usage arrivent au développeur sans être retapés, et une pull request vous dit ce qui manque | [docs/POUR-LES-DESIGNERS.md](./docs/POUR-LES-DESIGNERS.md) |
| **Développeur d'un repository consommateur** | Une source unique pour l'API visuelle d'un composant, et une CI qui signale les écarts avant la fusion | [Brancher un repository](#brancher-un-repository) |
| **Contributeur du moteur** | Un moteur générique, sans aucune règle liée au nom d'un composant | [AGENTS.md](./AGENTS.md) |

## Brancher un repository

Deux commandes, et aucun script à écrire.

```sh
npx --yes @ucm-kit/cli@0.1.14 init                       # écrit les cinq fichiers manquants
npx --yes @ucm-kit/cli@0.1.14 check --report ci-report.md
```

`--yes` évite l'invite de confirmation de `npx`, qui bloquerait une exécution
non interactive. La version est exacte, sans `^` : une plage laisserait npx
choisir une version que personne n'a essayée, et le contrôle changerait d'avis
sans qu'un fichier ait bougé.

**Votre repository n'a pas besoin d'être un projet Node.** Le workflow
qu'`ucm init` écrit n'exige aucun `package.json` : un repo iOS, Android, ou un
simple dossier de contrats peut faire contrôler ses exports. Si un lockfile npm
existe, le workflow exécute `npm ci`, ce qui rend visibles les adaptateurs
optionnels du repository.

Le seul prérequis est Node. En CI, `setup-node` le fournit. En local, `npx`
l'exige sur le poste, ce qu'un développeur iOS ou Android n'a pas forcément. Ce
cas se documente et ne s'outille pas : distribuer un binaire par plateforme
rendrait le contrôle installable, et du même coup installé deux fois, si bien
que la CI et le poste pourraient répondre différemment sur le même contrat. Sans
Node sur le poste, la CI reste l'autorité, et son rapport est de toute façon le
seul message que le designer lira.

Les détails vivent dans [packages/cli/README.md](./packages/cli/README.md).

## Les 6 contrôles

| Contrôle | Question posée | Verdict |
|---|---|---|
| Validité | Le contrat est-il lisible et conforme au schéma ? | 🔴 bloque |
| Version | Le repository sait-il lire cette version de contrat ? | 🔴 bloque |
| Composition | Chaque composant imbriqué a-t-il son contrat, les listes concordent-elles, et aucun cycle n'existe-t-il ? | 🔴 bloque |
| Typographie | Les tokens typographiques ont-ils le type attendu ? | 🔴 bloque |
| Tokens | Les références `{chemin.du.token}` citées existent-elles dans `tokens.json` ? | ⚠️ avertit |
| Parité code | Les props du contrat sont-elles dans l'API publique du composant, typées correctement, et chaque composant déclaré rendu exactement une fois ? | ⚠️ avertit |

La règle de partage est explicite : **un contrôle bloque la pull request
seulement si l'auteur de l'export peut le corriger en réexportant.** Les deux
verdicts « avertit » en découlent, et
[docs/POUR-LES-DESIGNERS.md](./docs/POUR-LES-DESIGNERS.md#6-ce-qui-bloque-la-fusion-et-ce-qui-nen-bloque-pas)
les détaille pour le designer, l'absence d'implémentation comprise.

Le rapport porte aussi deux verdicts qui ne viennent pas de ces contrôles :
ceux de l'export et ceux des tests du repository.

Les cinq premiers contrôles ne lisent que des contrats et des tokens, ils
fonctionnent donc quelle que soit la technologie du repository. Le sixième doit
lire le code, il passe par un adaptateur propre à la stack. Un seul adaptateur
existe aujourd'hui, pour TypeScript et React, et il s'active sans configuration
dès qu'une implémentation est présente.

## Ce que le plugin produit

| Commande | Fichier | Contenu |
|---|---|---|
| Exporter le composant | `<IdentifiantCode>.contract.json` | Variantes exactes, états, structure, tokens, icônes, règles d'usage, et un échantillon de maquette non normatif |
| Exporter les tokens | `tokens.json` | Variables locales au format DTCG, avec leurs alias et leurs modes |

### À quoi ressemble un contrat

Un extrait d'export réel, raccourci. `TileLink` est une tuile carrée avec une
icône, quatre variantes et deux axes.

```json
{
  "name": "TileLink",
  "meta": {
    "contractVersion": "12.0",
    "figma": { "fileName": "DS AI LAB", "nodeId": "362:2381" },
    "coverage": { "portable": "complete" }
  },
  "props": {
    "variant": { "type": "enum", "values": ["info", "success"], "default": "info" },
    "chessName": { "type": "icon", "policy": "modifiable" }
  },
  "viewStructures": {
    "st1": {
      "layout": "flex-row",
      "sizing": { "width": "{…sizes.width}", "height": "{…sizes.height}" },
      "children": [{ "slot": "icon", "figmaLayer": "chess", "optional": true }]
    }
  },
  "variantViews": { "v1": { "structure": "st1", "icons": "ic1" } },
  "variants": [
    {
      "values": { "variant": "info", "state": "default" },
      "tokens": { "background": "{components.tilelink.colors.info.default.background}" },
      "view": "v1"
    }
  ]
}
```

Quatre propriétés valent plus que la liste des champs.

- **Aucune valeur n'est aplatie.** Une couleur est une référence, jamais
  `#0B5FFF`. Le token reste propriétaire de sa valeur, et un changement de thème
  n'oblige pas à réexporter.
- **Les variantes sont énumérées, pas déduites.** `variants` liste les
  combinaisons qui existent dans Figma. Une matrice clairsemée reste clairsemée,
  et un consommateur ne présume jamais que le produit cartésien des axes est
  valide.
- **Ce qui se répète est catalogué.** Les quatre variantes citent la même vue
  `v1`, qui renvoie à `st1` et `ic1`. Un composant à quatre-vingt-dix variantes
  ne publie pas quatre-vingt-dix arbres.
- **`coverage.portable` dit ce que l'export n'a pas su décrire.** Ici
  `complete`. Un `partial` s'accompagne toujours d'un diagnostic qui nomme le
  calque et la propriété.

Le contrat est autoportant : il contient assez d'information pour qu'un
développeur ou un agent produise le composant sans consulter une implémentation
existante. Le plugin ne génère aucun code de production et n'écrit jamais dans
le document Figma.

Version de contrat courante : **12.0**, écrite dans
`packages/kit/src/format/version.ts` et nulle part ailleurs. Un consommateur en
lit deux, la courante et la précédente, le temps qu'un réexport arrive.

## Utiliser le kit depuis votre code

```sh
npm install @ucm-kit/core
```

| Entrée | Usage |
|---|---|
| `@ucm-kit/core/format` | Types TypeScript, version, règles de nommage. Aucune dépendance, utilisable dans un navigateur ou dans le bundle Figma |
| `@ucm-kit/core/lecteurs` | Validateurs, collecte de références, verdict de version, rendu du diagnostic. Nécessite Node |
| `@ucm-kit/core/schema` | JSON Schema, pour les éditeurs et les consommateurs qui ne lisent pas TypeScript |

Un projet TypeScript peut installer
`@ucm-kit/adapter-typescript@0.1.7` pour ajouter la comparaison statique des
props et de la composition, ainsi que la génération des types dérivés des
contrats.

## Construire et charger le plugin

```sh
npm install
npm run build
```

`packages/plugin/dist/` contient le code du plugin, son interface et le
`manifest.json` à importer dans Figma
(`Plugins > Development > Import plugin from manifest`).

Le plugin est destiné à la **Figma Community**. Son manifest ne déclare donc pas
`enablePrivatePluginApi`, drapeau réservé aux plugins privés d'une organisation
et que Figma refuserait à la soumission. Conséquence sur les contrats :
`figma.fileKey` n'est pas accessible, `meta.figma.url` n'est plus écrit, et la
traçabilité vers le composant source passe par `fileName` et `nodeId`, que le
corps de la pull request annonce. Aucune information de rendu n'est perdue.

Un export est toujours téléchargeable localement. La configuration GitHub est
optionnelle : renseignée, elle crée la branche et la pull request contenant le
seul artefact exporté. Le jeton reste dans `figma.clientStorage` et n'apparaît
ni dans l'interface ni dans les logs.

| Commande | Rôle |
|---|---|
| `npm test` | Tests du moteur, du kit, du CLI et de l'adaptateur |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Vérifie puis construit le plugin complet |
| `npm run schema` | Régénère le JSON Schema depuis `types.ts` |

## Architecture

```text
packages/plugin/    Le MOTEUR : extraction Figma. Dépend du kit. Non publié.
packages/kit/       Le FORMAT : @ucm-kit/core, publié sur npm.
packages/cli/       La COMMANDE : @ucm-kit/cli, publiée sur npm.
packages/adapter-typescript/  L'ADAPTATEUR opt-in, publié sur npm.
```

Le plugin importe le kit, jamais l'inverse. C'est ce qui rend le kit publiable
seul. Le détail de chaque dossier vit dans [AGENTS.md](./AGENTS.md#carte-du-code).

Le moteur ne contient aucune règle propre à `Button` ou à un autre composant.
Les composants du corpus servent uniquement à éprouver sa généricité.

## État du projet

C'est un **prototype avancé**. L'outillage consommateur vit entièrement dans les
paquets `@ucm-kit/*`, et un repository quelconque s'y branche par `ucm init`
sans écrire une ligne de script ni être un projet Node.

[UCM Playground](https://github.com/Vassili-g/UCM-Playground) est le
consommateur de recette : une application React banale, qui ne porte aucun
outillage UCM local. Il n'y a rien à y copier, et c'est cette absence qui le
rend probant : son empreinte du produit se limite aux cinq fichiers qu'`ucm
init` écrit. La boucle complète s'y rejoue depuis un dépôt vide, en suivant
[docs/RECETTE.md](./docs/RECETTE.md).

La maturité, les limites connues et les prochaines validations vivent dans
[ROADMAP.md](./ROADMAP.md).

## Documentation

Le sommaire complet, avec un chemin de lecture par profil, vit dans
[docs/README.md](./docs/README.md).

| Document | Pour qui |
|---|---|
| [docs/POUR-LES-DESIGNERS.md](./docs/POUR-LES-DESIGNERS.md) | Le designer qui exporte et relit |
| [CONCEPT.md](./CONCEPT.md) | Qui veut comprendre le problème et les responsabilités |
| [docs/FORMAT.md](./docs/FORMAT.md) | Qui consomme un contrat ou `tokens.json` |
| [docs/COMPATIBILITE.md](./docs/COMPATIBILITE.md) | Qui prépare une évolution du format ou une migration |
| [docs/CHANGELOG-FORMAT.md](./docs/CHANGELOG-FORMAT.md) | Qui lit un contrat d'une version antérieure |
| [packages/cli/README.md](./packages/cli/README.md) | Qui branche un repository |
| [packages/plugin/SPEC.md](./packages/plugin/SPEC.md) | Qui modifie le moteur |
| [AGENTS.md](./AGENTS.md) | L'agent, et le contributeur pressé |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Qui écrit du code, un message ou un document |
| [ROADMAP.md](./ROADMAP.md) | Qui veut savoir ce qui est prouvé et ce qui ne l'est pas |

## Licence

[MIT](./LICENSE).
