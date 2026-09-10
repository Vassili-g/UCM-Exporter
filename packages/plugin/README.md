# UCM Contract Exporter, le plugin Figma

Le plugin lit un composant Figma et en écrit un contrat JSON versionné, posé à
côté du code de ce composant. Il exporte aussi les variables locales du fichier
au format DTCG.

Ce document dit comment l'ouvrir et ce qu'il produit. [SPEC.md](./SPEC.md)
décrit ce qu'il élit dans l'arbre Figma, [docs/FORMAT.md](../../docs/FORMAT.md)
la forme de ce qu'il écrit, et
[docs/POUR-LES-DESIGNERS.md](../../docs/POUR-LES-DESIGNERS.md) le geste du
designer, pas à pas.

## Ouvrir le plugin

Il est publié sur la Figma Community, sous le nom « UCM Contract Exporter » :

**<https://www.figma.com/community/plugin/1678431364325816914>**

Installez-le une fois, puis lancez-le depuis le menu `Plugins` de l'application
de bureau. Ni build ni manifeste à importer. Le chemin de développement, pour le
contributeur qui modifie le moteur, est décrit par [« Construire le plugin
depuis ce dépôt »](../../README.md#construire-le-plugin-depuis-ce-dépôt).

## Les deux commandes

| Commande | Ce qu'elle attend | Ce qu'elle écrit |
|---|---|---|
| Exporter le composant | Exactement un composant ou un set de variantes sélectionné | `<IdentifiantCode>.contract.json` : variantes, états, structure, tokens, icônes, règles d'usage |
| Exporter les tokens | Rien, elle lit le fichier courant | `tokens.json` : les variables locales, avec leurs alias et leurs modes |

Une seule implémentation projette les noms pour les deux commandes. Avec deux
projections, un contrat citerait un token que `tokens.json` écrit sous un autre
nom.

## Documenter les règles d'usage

Le contrat décrit comment le composant se rend. Les règles d'usage ajoutent
quand l'employer. Elles sont facultatives : sans elles, l'export aboutit et le
contrat ne porte ni intention, ni documentation de props, ni politique d'icône.

Posez une instance de `.componentRules` à côté du composant, sur la même page.
Écrivez le nom du composant dans son calque `component-name`. Ce texte relie les
règles au composant, et rien d'autre ne les relie : la casse et les espaces sont
ignorés, et vous pouvez renommer l'instance comme vous voulez.

Chaque règle est une instance de `.rulesItems`. Choisissez son variant : il
affiche le tag qui dit ce que la règle remplit. Les sections qui les regroupent,
`GÉNÉRAL`, `PROPRIÉTÉS`, `OPTIONS`, `ICONES` et `DOCUMENTATION`, servent la
lecture. Le plugin lit le tag, jamais la section.

| Tag | Ce que vous écrivez | Ce que le contrat reçoit |
|---|---|---|
| `@usage` | le texte dans `content` | à quoi sert le composant, en une phrase |
| `@do` | le texte dans `content` | un usage recommandé, répétable |
| `@dont` | le texte dans `content` | un usage à éviter, répétable |
| `@pairs` | les composants dans `content`, séparés par des virgules | ceux qui s'associent bien à celui-ci |
| `@prop` | `variant.contained` dans `prop`, le texte dans `content` | quand choisir cette valeur de variante |
| `@boolean` | `icon-left` dans `prop`, le texte dans `content` | à quoi sert cette boolean property |
| `@default` | `color.secondary` dans `prop` | la valeur par défaut de cette variant property |
| `@icons` | le nom du calque d'icône dans `icon` | la politique de cette icône |

Une règle `@icons` demande un geste de plus : rendez visible exactement un des
deux calques `modifiable` ou `strict`. Le premier autorise le développeur à
remplacer l'icône, le second impose celle de la maquette. Le nom écrit dans
`icon` doit être celui du calque d'icône, à l'identique.

Un `@default` n'a pas de texte : sa cible est tout son contenu. Sans lui, aucune
valeur par défaut n'entre dans le contrat pour cette variant property. La
position d'un variant dans un set ne décide de rien.

Les variants de `.rulesItems` qui n'écrivent ni texte ni cible, `divider` par
exemple, mettent en page sans rien documenter. Le plugin les ignore sans rien
vous demander.

Le plugin ne modifie jamais ces règles. Quand il ne sait pas en lire une, il
vous dit laquelle et quel geste la répare. Ce que chaque champ devient est
décrit par [7. Intention et documentation des
props](../../docs/FORMAT.md#7-intention-et-documentation-des-props).

## Où l'export atterrit

Un export est toujours téléchargeable. La configuration GitHub est optionnelle ;
renseignée, elle crée une branche et une pull request qui contient le seul
fichier exporté.

L'endroit où ce fichier est écrit appartient au repository visé, qui le déclare
dans son `ucm.config.json`. Le plugin lit ce fichier au test de connexion, avant
la publication : le designer découvre un fichier fautif avant de travailler,
plutôt qu'après. Sans ce fichier, les valeurs par défaut du kit s'appliquent, et
ce sont celles que `ucm check` applique aussi. Un chemin rangé sur le poste du
designer ne servirait que face à un repository sans `ucm.config.json`, au moment
précis où le contrôle applique ces mêmes défauts. L'export atterrirait alors
hors de vue de ce contrôle.

La configuration contient l'URL du repository, la branche de base et un jeton
d'accès personnel, qui demande les permissions `Contents: read/write` et `Pull
requests: read/write`. Le jeton reste local à la machine et n'apparaît ni dans
l'interface, ni dans les journaux, ni dans le document Figma.

Un export dont le contenu est identique à ce qui est déjà déposé n'ouvre pas de
seconde pull request. Le plugin dit où il a trouvé le même contenu.

## Ce que le plugin ne fait pas

- Il n'écrit rien dans le document Figma : aucun calque créé, renommé, déplacé
  ou supprimé, aucune variable ni style écrit. Un test refuse ces appels dans la
  source.
- Il ne génère aucun code de production.
- Il n'exporte pas plusieurs composants en une commande et ne fusionne aucune
  pull request.
- Il ne joint aucun domaine réseau autre que l'API GitHub, déclarée dans son
  manifeste.

Poser une sélection et cadrer la vue restent permis : ces deux gestes portent
sur l'état de l'éditeur, n'entrent pas dans le fichier et ne créent aucune
entrée d'annulation. Les preuves sont dans
[SPEC.md](./SPEC.md#sélectionner-et-cadrer-ne-sont-pas-modifier).

## Ce que la distribution Community change au contrat

Le manifeste ne déclare pas `enablePrivatePluginApi`, drapeau réservé aux
plugins privés d'une organisation. `figma.fileKey` est donc inaccessible et
`meta.figma.url` n'est plus écrit : la traçabilité vers le composant source
passe par `fileName` et `nodeId`, que le corps de la pull request annonce.
Aucune information de rendu n'est perdue.

## Après l'export

Le repository qui reçoit le contrat le contrôle à chaque pull request avec
[`@ucm-kit/cli`](../cli/README.md), et publie son rapport en commentaire. C'est
le seul message que le designer ait besoin de lire.

## Licence

[MIT](../../LICENSE).
