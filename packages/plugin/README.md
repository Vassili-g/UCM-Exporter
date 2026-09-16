# UCM Contract Exporter, le plugin Figma

Le plugin lit un composant Figma et en écrit un contrat JSON versionné, posé à
côté du code de ce composant. Il exporte aussi les variables locales du fichier
au format DTCG.

Ce document dit comment l'ouvrir et ce qu'il produit.
[docs/POUR-LES-DESIGNERS.md](../../docs/POUR-LES-DESIGNERS.md) décrit le geste du
designer pas à pas, [SPEC.md](./SPEC.md) ce que le plugin élit dans l'arbre
Figma, et [docs/FORMAT.md](../../docs/FORMAT.md) la forme de ce qu'il écrit.

## Ouvrir le plugin

Il est publié sur la Figma Community, sous le nom « UCM Contract Exporter » :

**<https://www.figma.com/community/plugin/1678431364325816914>**

Installez-le une fois, puis lancez-le depuis le menu `Plugins` de l'application
de bureau. Pour modifier le moteur, suivez [« Construire le plugin depuis ce
dépôt »](../../README.md#construire-le-plugin-depuis-ce-dépôt).

## Les deux commandes

| Commande | Ce qu'elle attend | Ce qu'elle écrit |
|---|---|---|
| Exporter le composant | Exactement un composant ou un set de variantes sélectionné | `<IdentifiantCode>.contract.json` : variantes, états, structure, tokens, icônes, règles d'usage |
| Exporter les tokens | Rien, elle lit le fichier courant | `tokens.json` : les variables locales, avec leurs alias et leurs modes, dans la version 2 du format de tokens |

Un contrat cite ses tokens sous les noms que `tokens.json` écrit. `ucm tokens
css` tire de `tokens.json` une feuille CSS, modes compris
([README du CLI](../cli/README.md#the-token-stylesheet)). Un autre lecteur de
tokens doit lire le module DTCG `2025.10`
([docs/FORMAT.md](../../docs/FORMAT.md#partie-2--export-tokens)).

## Documenter les règles d'usage

Le contrat décrit comment le composant se rend. Les règles d'usage ajoutent
quand l'employer. Elles sont facultatives : sans elles, l'export aboutit et le
contrat ne porte ni intention, ni documentation de props, ni politique d'icône.

Posez une instance de `.componentRules` à côté du composant, sur la même page.
Écrivez le nom du composant dans son calque `component-name`. Ce texte relie les
règles au composant, et rien d'autre ne les relie : la casse et les espaces sont
ignorés, et vous pouvez renommer l'instance comme vous voulez.

Chaque règle est une instance de `.ruleItem`. Choisissez son variant : il
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

Les variants de `.ruleItem` qui n'écrivent ni texte ni cible, `divider` par
exemple, mettent en page. Le plugin les ignore.

Le plugin ne modifie jamais ces règles. Quand il ne sait pas en lire une, il
vous dit laquelle et quel geste la répare. [7. Intention et documentation des
props](../../docs/FORMAT.md#7-intention-et-documentation-des-props) décrit ce
que chaque champ devient.

## Où l'export atterrit

Un export est toujours téléchargeable. La configuration du dépôt est
optionnelle ; renseignée, elle crée une branche et une demande de fusion, pull
request sur GitHub ou merge request sur GitLab, qui contient le seul fichier
exporté. La forge se déduit de l'adresse saisie : `github.com` ou `gitlab.com`.
[Configurer le dépôt](../../docs/POUR-LES-DESIGNERS.md#configurer-le-dépôt)
donne la marche à suivre.

L'endroit où ce fichier est écrit appartient au repository visé, qui le déclare
dans son `ucm.config.json`. Le plugin lit ce fichier au test de connexion : le
designer découvre un fichier fautif avant d'exporter. Sans ce fichier, les
valeurs par défaut s'appliquent, les mêmes que celles de `ucm check`.

La configuration contient l'URL du dépôt, la branche de base et un jeton. Sur
GitHub, un fine-grained Personal Access Token limité au repository, avec
`Contents: Read and write` et `Pull requests: Read and write`. Sur GitLab, un
jeton de scope `api` : un jeton d'accès projet de rôle Developer quand l'offre
du projet le permet, un jeton personnel sinon. Le jeton reste local à la
machine et n'apparaît ni dans l'interface, ni dans les journaux, ni dans le
document Figma. Il ne part que vers la forge pour laquelle il a été saisi :
changer l'URL de forge demande un nouveau jeton.

Un export dont le contenu est identique à ce qui est déjà déposé n'ouvre pas de
seconde demande. Le plugin dit où il a trouvé le même contenu.

## Ce que le plugin ne fait pas

- Il n'écrit rien dans le document Figma : aucun calque créé, renommé, déplacé
  ou supprimé, aucune variable ni style écrit. Un test refuse ces appels dans la
  source. Il pose seulement la sélection et cadre la vue, deux gestes qui
  n'entrent pas dans le fichier
  ([SPEC.md](./SPEC.md#sélectionner-et-cadrer-ne-sont-pas-modifier)).
- Il ne génère aucun code de production.
- Il n'exporte pas plusieurs composants en une commande et ne fusionne aucune
  demande.
- Il ne joint aucun domaine réseau autre que `https://api.github.com` et
  `https://gitlab.com`, déclarés dans son manifeste. Une instance GitLab
  auto-hébergée n'est pas joignable.

## Après l'export

Le repository qui reçoit le contrat le contrôle à chaque demande de fusion avec
[`@ucm-kit/cli`](../cli/README.md), et publie son rapport en commentaire de la
pull request ou en note de la merge request. C'est le seul message que le
designer ait besoin de lire.

## Licence

[MIT](../../LICENSE).
