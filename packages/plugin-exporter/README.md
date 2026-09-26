# UCM Contract Exporter, le plugin Figma

Le plugin lit un composant Figma et en écrit un contrat JSON versionné, posé à
côté du code de ce composant. Il exporte aussi les variables locales du fichier
au format DTCG.

Ce document dit comment l'ouvrir et ce qu'il produit.
[docs/guides/POUR-LES-DESIGNERS.md](../../docs/guides/POUR-LES-DESIGNERS.md) décrit le geste du
designer pas à pas, [SPEC.md](./SPEC.md) ce que le plugin élit dans l'arbre
Figma, et [docs/format/FORMAT.md](../../docs/format/FORMAT.md) la forme de ce qu'il écrit.

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

Une équipe qui ne publie que des contrats désactive « Gérer les tokens » dans
l'onglet Général de la configuration. La commande des tokens disparaît, et
l'analyse d'un composant ne vérifie plus que les tokens sont fusionnés.

Un contrat cite ses tokens sous les noms que `tokens.json` écrit. `ucm tokens
css` tire de `tokens.json` une feuille CSS, modes compris
([README du CLI](../cli/README.md#the-token-stylesheet)). Un autre lecteur de
tokens doit lire le module DTCG `2025.10`
([docs/format/FORMAT.md](../../docs/format/FORMAT.md#partie-2--export-tokens)).

## Documenter les règles d'usage

Le contrat décrit comment le composant se rend. Les règles d'usage ajoutent
quand l'employer. Elles sont facultatives : sans elles, l'export aboutit et le
contrat ne porte ni intention, ni documentation de props, ni politique d'icône.

Posez une instance de `.componentRules` à côté du composant, sur la même page.
Écrivez le nom du composant dans son calque `component-name`. Ce texte relie les
règles au composant, et rien d'autre ne les relie : la casse et les espaces sont
ignorés, et vous pouvez renommer l'instance comme vous voulez.

Le bouton « Créer les règles d'usage », sous « Analyser le composant », fait ce
geste à votre place. Il part du maître de `.componentRules` qu'il retrouve
depuis la page active, pose une règle par propriété du composant et écrit son
nom dans `component-name`. Une instance vierge que vous avez collée est remplie
au lieu d'en poser une seconde. Supprimer le conteneur défait la création, et
Ctrl+Z aussi.

Le bouton n'apparaît que si ce composant n'a pas déjà son conteneur. Sur une
page d'où aucune instance de `.componentRules` n'est joignable, il reste inactif
et la note dessous dit quoi copier. Si votre équipe n'a aucun `.componentRules`,
copiez les trois maîtres du [kit de
règles](https://www.figma.com/community/file/1684536749543631522), publié sur la
Community ; [KIT-DE-REGLES.md](../../docs/guides/KIT-DE-REGLES.md) décrit les
deux façons de l'employer.

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

Un `@default` n'a pas de texte à rédiger : le plugin ne lit que sa cible, dans
`prop`. Sans lui, aucune valeur par défaut n'entre dans le contrat pour cette
variant property. La position d'un variant dans un set ne décide de rien.

Les variants de `.ruleItem` qui n'écrivent ni texte ni cible, `divider` par
exemple, mettent en page. Le plugin les ignore.

Un texte d'aide commence par `[À compléter]`. Tant qu'un calque lu d'une règle
contient ce marqueur, le plugin ne publie pas la règle et vous le signale, en
une ligne par tag. Remplacez le marqueur par votre texte, ou supprimez la
règle. Un conteneur dont le calque `component-name` porte encore le marqueur ne
documente aucun composant. Une règle que le bouton vient de créer porte ce
marqueur : elle attend votre texte.

Passé la création, le plugin ne modifie plus ces règles ; il les lit. Quand il
ne sait pas en lire une, il vous dit laquelle et quel geste la répare. [7. Intention et documentation des
props](../../docs/format/FORMAT.md#7-intention-et-documentation-des-props) décrit ce
que chaque champ devient.

## Où l'export atterrit

Un export est toujours téléchargeable. La configuration du dépôt est
optionnelle ; renseignée, elle crée une branche et une demande de fusion, pull
request sur GitHub ou merge request sur GitLab, qui contient le seul fichier
exporté. La forge se déduit de l'adresse saisie : `github.com` ou `gitlab.com`.
[Configurer le dépôt](../../docs/guides/POUR-LES-DESIGNERS.md#configurer-le-dépôt)
donne la marche à suivre.

L'endroit où ce fichier est écrit appartient au repository visé, qui le déclare
dans son `ucm.config.json`. Le plugin lit ce fichier au test de connexion : le
designer découvre un fichier fautif avant d'exporter. Sans ce fichier, les
valeurs par défaut s'appliquent, les mêmes que celles de `ucm check`.

La configuration contient une liste de dépôts, chacun avec son URL, sa branche
de base et son jeton, et le dépôt actif, que « Se connecter » choisit. Sur
GitHub, un fine-grained Personal Access Token limité au repository, avec
`Contents: Read and write` et `Pull requests: Read and write`. Sur GitLab, un
jeton personnel fine-grained limité au projet, avec `Project: Read`,
`Repository: Read`, `Branch: Read, Delete`, `Commit: Create` et
`Merge Request: Read, Create` ; un jeton de scope `api` convient aussi. Le jeton reste local à la
machine et n'apparaît ni dans l'interface, ni dans les journaux, ni dans le
document Figma. Il ne part que vers le dépôt pour lequel il a été saisi, dont
l'adresse ne se modifie plus après l'enregistrement.

Un export dont le contenu est identique à ce qui est déjà déposé n'ouvre pas de
seconde demande. Le plugin dit où il a trouvé le même contenu.

## Ce que le plugin ne fait pas

- Il n'écrit dans le document Figma que par « Créer les règles d'usage », et ce
  geste ne touche qu'à l'instance de `.componentRules` qu'il pose. L'analyse et
  la publication ne créent, ne renomment, ne déplacent ni ne suppriment aucun
  calque, et n'écrivent ni variable ni style. Un test refuse ces appels partout
  ailleurs que dans `src/template/ecriture.ts`. Poser la sélection et cadrer la
  vue n'entrent pas dans le fichier
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

## Mesurer une analyse

Chaque analyse se mesure, sans build dédié. Après le verdict, le pied de page
affiche « Analyse en 4,2 s » à côté de la version de schéma. Un clic déplie la
durée de chaque étape, et « Copier la trace » copie l'objet JSON complet. La
même trace part dans la console du plugin
(`Plugins > Development > Open console`), sur une ligne `[ucm:mesure]` :

- `totalMs` : la durée de l'analyse, du clic au verdict, lecture du dépôt
  comprise ;
- `etapes` : la durée de chaque étape, dans l'ordre : `regles`, `variants`,
  `index`, `composition`, `wrapper`, `variables`, `structure`,
  `echantillons`, `compaction`, `serialisation`, puis `depot` quand un
  dépôt est configuré. L'écart entre leur somme et `totalMs` est la lecture
  des réglages avant la première étape ;
- `compteurs` : pages chargées, balayées et reprises de la mémoire, nodes
  parcourus, appels à `getAllNodes`, à `findAllWithCriteria` et à
  `getMainComponentAsync`, maîtres repris de la mémoire, respirations et
  taille de l'index. Un compteur absent vaut zéro ;
- `empreinte` : un condensé du contrat produit, date d'export exclue. Deux
  analyses du même composant qui donnent deux empreintes ont produit deux
  contrats différents.

Une analyse annulée ou en échec ne laisse aucune trace. Le protocole de mesure
et les sondes sont dans
[Performance de l'analyse](../../docs/notes/Recherches/Performance%20de%20l'analyse/PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md).

## Licence

[MIT](../../LICENSE).
