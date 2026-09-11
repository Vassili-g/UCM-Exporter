# Politique de compatibilité

Cinq choses se publient et peuvent casser un consommateur : le **contrat**, le
**JSON Schema**, `tokens.json`, les **paquets npm** et les **adaptateurs**.
Elles ne se versionnent pas de la même façon. Cette politique sépare leurs
numéros et les responsabilités de migration.

Ce que la forme publiée vaut aujourd'hui est dans [FORMAT.md](./FORMAT.md) ; ce
que chaque version a publié est dans
[CHANGELOG-FORMAT.md](./CHANGELOG-FORMAT.md). Ce document classe les
changements, nomme qui les publie et qui les migre, puis dit ce qui peut
fusionner.

## Les cinq numéros et ce que chacun couvre

| Ce qui est publié | Numéro | Écrit où | Ce qu'il ne dit pas |
|---|---|---|---|
| le contrat | `meta.contractVersion`, `majeure.mineure` | `CONTRACT_VERSION`, `packages/kit/src/format/version.ts` | rien du paquet qui l'a produit |
| le JSON Schema | aucun : il est dérivé du contrat | `packages/kit/schema/`, régénéré depuis `types.ts` | il décrit la forme, jamais la cohérence |
| `tokens.json` | la version du format de tokens, un entier à la racine | `TOKENS_FORMAT_VERSION`, `packages/kit/src/format/tokens.ts` | si un lecteur de valeurs sait lire cette forme : Style Dictionary ignore la marque |
| les paquets npm | semver, un par paquet | chaque `package.json` | quelle version de contrat ils lisent |
| un adaptateur | semver, comme tout paquet | son `package.json` | rien du format : ce qu'il mesure est une capacité, pas une garantie |

**Le numéro du contrat et celui d'un paquet ne se suivent pas.** Un paquet peut
monter sans que le format bouge. Un changement de format n'oblige parfois qu'un
seul paquet. Le seul lien mécanique est la fenêtre de lecture ci-dessous.

## La fenêtre de lecture

`VERSION_CONTRAT_MINIMALE` et `VERSION_CONTRAT_MAXIMALE`
(`packages/kit/src/lecteurs/version-contrat.mjs`) portent la plage que les
lecteurs acceptent : la version courante et la précédente. Tout ce qui en sort
est refusé **dans les deux sens**, parce que le geste correctif n'appartient pas
à la même personne.

| Cas | Verdict | Qui corrige | Comment |
|---|---|---|---|
| version dans la plage | `ok` | personne | — |
| version plus ancienne que la borne basse | `ancien` | le designer | réexporter depuis Figma |
| version plus récente que la borne haute | `recent` | le mainteneur du repository | mettre à jour les paquets UCM |
| version illisible ou absente | `ancien` | le designer | réexporter, seul geste qui puisse la produire |

Une mineure ne se présume jamais compatible. La 4.2 a renommé des slots d'icônes
et cassé un lecteur ; la plage explicite vient de là.

Une plage élargie chez un consommateur est un choix temporaire d'une migration,
jamais un état par défaut.

## Les onze classes de changement

Chaque entrée de [CHANGELOG-FORMAT.md](./CHANGELOG-FORMAT.md) appartient à une
de ces classes, et la nomme.

| Classe | Effet sur `contractVersion` | Un contrat déjà fusionné | Qui migre |
|---|---|---|---|
| **1. Ajout d'un champ optionnel** | mineure | reste valide, sans le champ | personne ; le champ arrive au réexport |
| **2. Ajout qui change la résolution d'une vue** | majeure | reste valide, mais un lecteur qui ignore le nouveau renvoi rend autre chose | le développeur, avant de monter la borne |
| **3. Suppression ou renommage d'un champ** | majeure | devient illisible dès que la borne basse passe au-dessus | le designer réexporte, le développeur adapte |
| **4. Changement de signification d'une absence** | majeure après diffusion ; même version admise pendant le prototype si tout le corpus est réexporté avant publication | reste valide **de forme**, mais son ancienne lecture devient fausse | le designer, puis le développeur |
| **5. Changement d'un nom de token ou d'un alias** | aucun : ce n'est pas le contrat | les références du contrat ne résolvent plus | le designer, dans Figma |
| **6. Changement d'un adaptateur sans changement de format** | aucun | inchangé | personne ; c'est du semver de paquet |
| **7. Contrat d'une version future** | — | refusé, verdict `recent` | le mainteneur du repository |
| **8. Contrat d'une version trop ancienne** | — | refusé, verdict `ancien` | le designer, par un réexport |
| **9. Fichier sans version lisible** | — | traité comme ancien | le designer, par un réexport |
| **10. Changement de la forme d'une valeur de `tokens.json`** | aucun ; `TOKENS_FORMAT_VERSION` monte | inchangé ; ses références résolvent toujours, les chemins ne bougeant pas | le mainteneur du repository, qui met à jour son lecteur de valeurs avant de fusionner le réexport |
| **11. Ajout de la marque de version à `tokens.json`** | aucun | inchangé ; un `tokens.json` sans marque reste lu dans sa forme d'origine | personne ; un lecteur de valeurs ignore `$extensions` à la racine |

**Classer un ajout en classe 1 ou en classe 2.** Supposer un lecteur de la
version précédente, qui ignore le nouveau champ. Si son rendu reste conforme à
la maquette, l'ajout relève de la classe 1. S'il s'en écarte, l'ajout relève de
la classe 2, même quand aucun renvoi de vue ne change : `rotation` en 12.0,
`textTransform` en 13.0. Le coût ne départage pas les deux classes : la fenêtre
de lecture se referme d'un cran à chaque version, mineure comprise.

**La classe 4 est la seule qu'aucun contrôle ne peut attraper**, et son coût
vient de là : la forme ne bouge pas, donc le schéma et les lecteurs acceptent un
contrat dont le sens a changé. Elle se traite à la main, entrée par entrée du
changelog.

### Application de la classe 4 à `@default`

Le défaut d'un axe de variantes ne vient plus de la position d'un variant dans
son component set, mais d'une règle `@default` que le designer écrit. Le champ
`props.<axe>.default` ne change ni de nom, ni de type, ni de place ; ce qui
change est que son **absence** signifie désormais « aucun défaut publié » au
lieu de « le premier variant ».

La migration suit ces règles :

- **rien ne casse mécaniquement.** Un contrat déjà fusionné garde son `default`,
  et le composant garde le sien, qui est du code ;
- **ce qui change est ce que le contrat confirme.** Au prochain réexport, un axe
  sans `@default` cesse de publier un défaut, et le développeur reprend la main ;
- **la règle de validité suit le sens, pas la forme.** Un défaut publié doit
  rester dans ses `values` et sa combinaison doit exister ; ces deux règles ne
  portent que sur les axes qui déclarent un défaut, sans quoi l'absence
  deviendrait une faute ;
- **la migration se joue au réexport**, donc dans le geste du designer, jamais
  dans un script rendu au consommateur.

Cette évolution intervient pendant le prototype, avant la publication des
paquets qui la documentent. Elle garde donc la 12.0 à condition que la recette
externe réexporte tout le corpus concerné avant publication. Une évolution de
même nature après cette diffusion monterait la version majeure du contrat : un
lecteur doit pouvoir distinguer les deux sens.

## La version du format de tokens

`tokens.json` porte sa version à la racine du document, dans
`$extensions["com.ucm.formatVersion"]`. C'est un entier positif, et la version
courante est `1`. Un fichier sans marque est dans la forme d'origine, que le
plugin publiait avant la version `1`. [FORMAT.md](./FORMAT.md#partie-2--export-tokens)
décrit les deux formes.

Le kit lit la marque avant tout token, et la classe en quatre états :

| Valeur observée | État | Effet sur `ucm check` | Qui corrige |
|---|---|---|---|
| marque absente | `origine` | lecture du fichier | personne |
| `1` | `courante` | lecture du fichier | personne |
| entier supérieur à `1` | `future` | refus, avant la lecture des tokens | le mainteneur du repository, en mettant à jour les paquets UCM |
| toute autre valeur, ou un document ou `$extensions` qui n'est pas un objet | `invalide` | refus, avant la lecture des tokens | le designer, en relançant l'export des tokens |

Seule la racine est examinée : une propriété homonyme sous un groupe ne compte
pas. Le refus s'applique aussi à un repository qui n'a encore aucun contrat,
parce qu'un fichier de tokens d'une version inconnue ne reçoit pas de bilan
vert. Une version future n'est jamais présumée lisible, comme un contrat de
version future.

**La marque ne protège pas un lecteur de valeurs.** Style Dictionary ignore
`$extensions` et ne refuse rien. Resté en version 4, il écrit `[object Object]`
à la place de chaque couleur et de chaque dimension de la version `1`, et le
build réussit. Le mainteneur d'un repository met donc à jour son lecteur de
valeurs avant de fusionner le premier réexport d'une nouvelle version.

### L'ordre d'une nouvelle version du format de tokens

1. Les trois paquets npm sortent ensemble, le kit en premier : un kit qui
   connaît la nouvelle version, et une CLI et un adaptateur qui l'épinglent.
   Sur un fichier d'origine, ils rendent le même verdict qu'avant.
2. Le repository consommateur met à jour son lecteur de valeurs et la version
   de la CLI que son workflow épingle.
3. Le plugin qui produit la nouvelle version est publié sur la Community.
4. Le designer réexporte les tokens.

Les chemins des tokens ne changent pas d'une version à l'autre. Les clés `$value`
et les références restent les mêmes. Les valeurs changent de forme et la racine
reçoit la marque. Aucune référence d'un contrat déjà fusionné ne cesse donc de
résoudre.

## Un verdict qui change relève de la classe 6

La classe 6 couvre le cas où le format ne bouge pas, où aucun contrat déjà
fusionné ne change de sens, et où le verdict rendu à un consommateur change
malgré tout. Elle se traite en semver de paquet.

`@ucm-kit/core@0.1.14` en donne un exemple. Un repository sans aucun contrat
recevait un refus, `tokens.json est introuvable` ; il reçoit un rapport vert qui
nomme le geste suivant. La mise à jour fait donc passer une CI du rouge au vert
sur un dépôt où rien n'était anormal.

Trois vérifications séparent ce cas d'un changement de format :

- aucun contrat n'est lu autrement, le discriminant étant leur nombre ;
- dès qu'un contrat existe, le verdict précédent s'applique à l'identique ;
- la fenêtre de lecture et `CONTRACT_VERSION` ne bougent pas.

Un verdict qui se relâche se publie comme une nouveauté. Le README du paquet
l'annonce, puisqu'il part sur le registre avec lui et que son consommateur le
lit. Sans cette mention, le moment où un contrôle a cessé de refuser reste
introuvable. La section « A repository with no contract at all » de
`packages/kit/README.md` applique cette règle.

## Qui publie, qui migre, qui peut fusionner

- **publie** : le mainteneur du format monte `CONTRACT_VERSION`, écrit l'entrée
  de changelog avec sa classe, régénère le schéma et déplace la fenêtre de
  lecture ; les paquets montent leur semver dans le même commit. Pour la classe
  10, il monte `TOKENS_FORMAT_VERSION` et écrit l'entrée de `tokens.json` dans le
  changelog ;
- **migre** : le designer, quand le geste est un réexport (classes 3, 5, 8, 9) ;
  le développeur, quand le geste est une adaptation de code (classes 2, 3, 7) ;
  les deux, dans cet ordre, pour la classe 4 ; le mainteneur du repository, qui
  met à jour son lecteur de valeurs, pour la classe 10 ;
- **peut fusionner** : un contrat hors de la fenêtre de lecture bloque, comme un
  `tokens.json` d'une version future ou d'une marque invalide. Rien d'autre ici
  ne bloque. Un écart entre le contrat et le code avertit sans
  refuser la fusion, parce qu'il porte sur le code et non sur l'artefact déposé.

## Ce que cette politique ne fait pas

Elle ne prescrit ni migration automatique, ni compatibilité déclarée par
consommateur. Les deux ont été écartées pour la même raison : elles demandent au
producteur de savoir ce qu'un repository tiers fait de son contrat. Un réexport
et une fenêtre explicite obtiennent le même résultat sans cette connaissance.
