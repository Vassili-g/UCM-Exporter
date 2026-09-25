# UCM Contract Exporter

Un plugin Figma qui exporte un composant sous forme de contrat JSON versionné,
et l'outillage qui vérifie que le code du repository reste conforme à ce
contrat.

## Le problème

Le même composant existe dans Figma, dans le code et dans les tokens. Aucun
contrôle ne compare ces trois copies. UCM donne un propriétaire unique à chaque
information ; [CONCEPT.md](./CONCEPT.md) énonce le partage et ce qui l'a motivé.

Figma exporte ce qu'il possède dans un fichier `.contract.json`, posé à côté du
code du composant.

```text
components/Button/
  Button.<ext>          le comportement, écrit par un développeur
  Button.contract.json  le visuel, exporté depuis Figma
```

Le code de production ne lit jamais ce JSON à l'exécution. Le développeur écrit
le composant en s'appuyant sur le contrat, et la CI compare la surface d'API des
deux à chaque demande de fusion : les props déclarées, leur type, et les
composants réellement rendus. Le rendu visuel n'est pas vérifié.

## La boucle

```text
Figma
  │   commande « Exporter le composant »
  ▼
Button.contract.json
  │   dépôt GitHub ou GitLab optionnel : branche et demande de fusion automatiques
  ▼
CI du repository consommateur
  │   6 contrôles
  ▼
Rapport publié en commentaire de la pull request, ou en note de la merge request
```

Le rapport s'adresse au designer qui valide l'export. Il liste ce qui bloque, ce
qui avertit, et le geste attendu pour chaque écart.

## Par où commencer

| Vous êtes | Ce que vous y gagnez | Par où commencer |
|---|---|---|
| **Designer** | Vos variantes, vos tokens et vos règles d'usage arrivent au développeur sans être retapés, et la demande de fusion vous dit ce qui manque | [Ouvrir le plugin](#ouvrir-le-plugin), puis [docs/guides/POUR-LES-DESIGNERS.md](./docs/guides/POUR-LES-DESIGNERS.md) |
| **Développeur d'un repository consommateur** | Une source unique pour l'API visuelle d'un composant, et une CI qui signale les écarts avant la fusion | [Brancher un repository](#brancher-un-repository) |
| **Contributeur du moteur** | Un moteur générique, sans aucune règle liée au nom d'un composant | [Construire le plugin](#construire-le-plugin-depuis-ce-dépôt), puis [AGENTS.md](./AGENTS.md) |

## Ouvrir le plugin

Le plugin est publié sur la Figma Community, sous le nom « UCM Contract
Exporter » :

**<https://www.figma.com/community/plugin/1678431364325816914>**

Installez-le une fois, puis lancez-le depuis le menu `Plugins` de l'application
de bureau. [packages/plugin-exporter/README.md](./packages/plugin-exporter/README.md) décrit ses
commandes, sa configuration GitHub ou GitLab et ses limites. La commande des
tokens n'apparaît que lorsque « Gérer les tokens » est activé.

## Brancher un repository

Prérequis : Node 20 ou plus, et un repository sur GitHub ou sur GitLab. Le
repository n'a pas besoin d'être un projet Node : un repository iOS, Android ou
un simple dossier de contrats se branche de la même façon.

1. À la racine du repository, lancez :

   ```sh
   npx --yes @ucm-kit/cli@0.1.49 init
   ```

   `init` écrit `ucm.config.json`, la CI du contrôle et les fichiers lus par un
   agent. Il n'écrase aucun fichier existant, et imprime les lignes qu'il vous
   laisse ajouter.
2. Commitez et poussez les fichiers écrits.
3. Rendez le contrôle bloquant. Sur GitHub, exigez le check `contrats` dans la
   protection de la branche de base. Sur GitLab, appliquez les trois réglages
   que `init` imprime.
4. Transmettez au designer l'adresse du repository. Il la saisit dans le
   plugin, avec un jeton
   ([POUR-LES-DESIGNERS.md](./docs/guides/POUR-LES-DESIGNERS.md#configurer-le-dépôt)).

`--yes` retire l'invite de confirmation de `npx`. Gardez la version exacte, sans
`^` : c'est la version que ce dépôt a testée.

**Sans option, `init` écrit les chemins par défaut.** Un repository qui range
autrement les passe à la première installation :

```sh
npx --yes @ucm-kit/cli@0.1.49 init \
  --components src/components \
  --tokens src/tokens \
  --implementation '{dir}/{id}.vue'
```

| Option | Défaut | Rôle |
|---|---|---|
| `--components <dossier>` | `components` | Le dossier sous lequel les contrats sont rangés |
| `--tokens <dossier>` | la racine | Le dossier qui reçoit `tokens.json` |
| `--implementation <motif>` | `{dir}/{id}.tsx` | Le fichier qui implémente un contrat : `{dir}` est le dossier du contrat, `{id}` son identifiant |
| `--forge github\|gitlab` | l'hôte du remote `origin` | La forge dont la CI est écrite |
| `--sans-agents` | absente | N'écrit pas les fichiers destinés à un agent |

`init` n'écrase jamais un `ucm.config.json` existant. Pour changer un chemin
ensuite, modifiez ce fichier : le plugin le lit avant de publier, et la CI avant
de contrôler.

Pour lancer le contrôle sur le poste :

```sh
npx --yes @ucm-kit/cli@0.1.49 check --report ci-report.md
```

Sans Node sur le poste, la CI fait le contrôle. Les fichiers écrits, les autres
commandes et les codes de sortie sont dans
[packages/cli/README.md](./packages/cli/README.md).

## Les 6 contrôles

| Contrôle | Question posée | Verdict |
|---|---|---|
| Validité | Le contrat est-il lisible et conforme au schéma ? | 🔴 bloque |
| Version | La version du contrat entre-t-elle dans la fenêtre de lecture du repository ? | 🔴 bloque |
| Composition | Chaque composant imbriqué a-t-il son contrat, les listes concordent-elles, le graphe est-il acyclique ? | 🔴 bloque |
| Typographie | Les tokens typographiques ont-ils le type attendu ? | 🔴 bloque |
| Tokens | Les références `{chemin.du.token}` citées existent-elles dans `tokens.json` ? | ⚠️ avertit, mais un fichier de tokens absent ou illisible bloque |
| Parité code | Les props du contrat sont-elles dans l'API publique du composant, typées correctement, et chaque composant déclaré rendu autant de fois que le contrat le déclare ? | ⚠️ avertit |

Un contrôle bloque quand le fichier déposé ne se lit pas tel quel. Il avertit
quand la lecture aboutit et que l'écart vise le code ou le fichier de tokens.
Le rapport relaie aussi les avertissements de l'export et le verdict des tests
du repository.

Les cinq premiers contrôles ne lisent que des contrats et des tokens, quelle que
soit la technologie du repository. La parité lit le code par un adaptateur
propre à la stack. Le seul existant,
[`@ucm-kit/adapter-typescript@0.1.42`](./packages/adapter-typescript/README.md),
couvre TypeScript et React : le repository l'installe lui-même, et il demande un
`tsconfig.json` à la racine.

## Ce que le plugin produit

| Commande | Fichier | Contenu |
|---|---|---|
| Exporter le composant | `<IdentifiantCode>.contract.json` | Variantes exactes, états, structure, tokens, icônes, règles d'usage, et un échantillon de maquette non normatif |
| Exporter les tokens | `tokens.json` | Variables locales dans la version 2 du format de tokens, DTCG `2025.10` pour leurs valeurs, avec leurs alias, leurs modes et la déclaration de leurs axes. `ucm tokens css` en écrit la feuille CSS |

Les règles d'usage sont la part que le designer écrit à la main, dans une
instance de `.componentRules` posée à côté du composant. [Documenter les règles
d'usage](./packages/plugin-exporter/README.md#documenter-les-règles-dusage) donne les
huit tags et le geste de chacun.

Un développeur ou un agent écrit le composant depuis le seul contrat. Le contrat
cite chaque couleur par son token, si bien qu'un changement de thème ne demande
aucun réexport. Il énumère les variantes qui existent, et catalogue ce qui se
répète de l'une à l'autre : un composant à quatre-vingt-dix variantes ne publie
pas quatre-vingt-dix arbres. [docs/format/FORMAT.md](./docs/format/FORMAT.md#ce-que-le-contrat-publie-champ-par-champ)
décrit chaque champ et ce que son absence signifie.

Version de contrat courante : **14.0**, écrite dans
`packages/kit/src/format/version.ts` et nulle part ailleurs. Un consommateur en
lit deux, la courante et la précédente, le temps qu'un réexport arrive.

## Utiliser le kit depuis votre code

Un repository branché par `ucm init` n'en a pas besoin. Pour appeler les
lecteurs depuis votre propre code :

```sh
npm install @ucm-kit/core@0.1.41
```

| Entrée | Usage |
|---|---|
| `@ucm-kit/core/format` | Types TypeScript, version, règles de nommage. Aucune dépendance, utilisable dans un navigateur ou dans le bundle Figma |
| `@ucm-kit/core/lecteurs` | Validateurs, collecte de références, verdict de version, rendu du diagnostic. Nécessite Node |
| `@ucm-kit/core/schema` | JSON Schema, pour les éditeurs et les consommateurs qui ne lisent pas TypeScript |

[packages/kit/README.md](./packages/kit/README.md) détaille chaque entrée.

## Construire le plugin depuis ce dépôt

Ce chemin s'adresse au contributeur qui modifie le moteur. Il demande Node 22,
la version de la CI, et l'application de bureau Figma.

```sh
npm install
npm run build
```

Dans Figma, importez `packages/plugin-exporter/dist/manifest.json` par `Plugins >
Development > Import plugin from manifest`.

| Commande | Rôle |
|---|---|
| `npm test` | Tests du moteur, du kit, du CLI et de l'adaptateur |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Vérifie les types puis construit le plugin |
| `npm run schema` | Régénère le JSON Schema depuis `types.ts`, après tout changement de ce fichier |
| `npm run cascade` | Rend la feuille des tokens dans Chromium, Firefox et WebKit ; les navigateurs s'installent par `npx playwright install chromium firefox webkit` |

Avant un premier changement, lisez [AGENTS.md](./AGENTS.md) pour la carte du
code et les invariants, puis [CONTRIBUTING.md](./CONTRIBUTING.md) pour les
règles de code, de test et de rédaction.

## Architecture

```text
packages/plugin-exporter/    le moteur : extraction Figma. Dépend du kit. Non publié.
packages/kit/       le format : @ucm-kit/core, publié sur npm.
packages/cli/       la commande : @ucm-kit/cli, publiée sur npm.
packages/adapter-typescript/  l'adaptateur opt-in, publié sur npm.
```

Le plugin importe le kit ; le kit n'importe pas le plugin, ce qui le rend
publiable seul. [AGENTS.md](./AGENTS.md#carte-du-code) détaille chaque dossier.

## État du projet

C'est un **prototype avancé**. Les paquets `@ucm-kit/*` sont en 0.x : leur
surface publique n'est pas figée.

[UCM Playground](https://github.com/Vassili-g/UCM-Playground) est le repository
de recette, une application React qui n'emploie que les paquets publiés. La boucle complète
s'y rejoue en suivant [docs/guides/RECETTE.md](./docs/guides/RECETTE.md).
[ROADMAP.md](./ROADMAP.md) porte la maturité, les limites connues et les
prochaines validations.

## Documentation

[docs/README.md](./docs/README.md) donne le chemin de lecture de chaque profil,
et le document qui fait autorité sur chaque règle.

## Licence

[MIT](./LICENSE).
