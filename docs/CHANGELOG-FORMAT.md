# Historique des versions du contrat

Ce document dit ce que **chaque version du contrat a publié**, et ce que passer
à la suivante casse. Il s'adresse au développeur qui lit un contrat qu'il n'a
pas exporté. La forme **courante** est dans [FORMAT.md](./FORMAT.md), qui en
fait autorité. La [politique de compatibilité](./COMPATIBILITE.md) classe les
changements et dit qui migre.

À partir de la 12.0, chaque évolution nomme la classe de cette politique. Les
entrées antérieures restent un historique de forme ; les reclasser n'ajouterait
aucun fait sur les contrats qu'elles décrivent.

Un consommateur lit **un seul** schéma à la fois, sauf pendant une migration où
il en lit deux. `version-contrat.mjs` (`@ucm-kit/core/lecteurs`) porte cette
plage. Tout écart hors plage est refusé dans les deux sens, parce que le geste
correctif n'appartient pas à la même personne : un contrat plus ancien se répare
par un réexport, un contrat plus récent par une adaptation des lecteurs.

**La version courante est la 13.0**, et `CONTRACT_VERSION`
(`packages/kit/src/format/version.ts`) en est le seul endroit où elle s'écrit.
Une plage ouverte chez un consommateur reste un choix explicite et
**temporaire** : la laisser survivre à sa migration ferait rentrer en silence un
schéma que le repository n'adapte plus.

Ce fichier ne prouve rien. Le schéma et les lecteurs refusent un contrat
illisible ; les reconstructions à froid et leur comparaison avec Figma éprouvent
ce qu'une version permet réellement de rendre. Ces notes servent à relire un
contrat ancien, ou à reconstruire un composant depuis son contrat, en sachant ce
que sa version publie.

Une entrée se rédige quand la version est adoptée, et décrit ce que le lecteur
doit en savoir, jamais qu'une relecture a eu lieu.

`tokens.json` se numérote à part, et [sa section](#tokensjson) termine ce
document.

## Les versions antérieures à la fenêtre de lecture

Aucun lecteur de la fenêtre courante n'accepte ces contrats : les rencontrer
demande de rouvrir un dépôt qui n'a pas réexporté depuis. La table dit ce que
chaque version a ajouté et ce qu'elle a cassé, ce qui suffit à lire un fichier
ancien ; le détail de chacune est dans le commit qui l'a adoptée.

| Version | Ce qu'elle publie | Ce qu'elle casse |
|---|---|---|
| 4.2 | renomme les slots d'icônes | rupture sur une version mineure. C'est d'elle que vient la règle : aucune version future n'est présumée compatible, majeure comme mineure |
| 4.3 | `structure.children` récursif sur les branches textuelles ; un slot à plusieurs textes décrit ses parts | rien : la 4.2 en est un sous-ensemble |
| 4.4 | l'alignement du conteneur Flex et le remplissage de ses slots (`alignItems`, `flexGrow`) | rien |
| 4.5 | `structure.sizes.<taille>.fontSize` comme unique autorité de la taille de police sous un axe de tailles | le slot de référence cesse de décrire toutes les tailles |
| 4.6 | un catalogue de text styles liés aux tokens, et leurs usages dans `structure.variantTypography` | remplace la description typographique de la 4.5 |
| 4.7 | `structure.sizing` pour le composant, `size` côté par côté pour un slot | une absence se lit comme un contenu qui se suffit |
| 4.8 | le même comportement en vocabulaire CSS (`stretch`, `fit-content`) | rien : les contrats 4.7 restent valides de forme |
| 4.9 | le cadre qui enveloppe une dépendance publie son flux et range la dépendance dans `children` | un cadre cesse de porter `composes` et de se confondre avec le composant |
| 5.0 | l'axe d'états (`stateModel.states.<état>.description`) et les icônes modifiables sans `visibilityProp` | rien : les deux changements sont additifs |
| 5.1 | `rendering.roles` gagne une entrée par clé de couleur qui ne nomme aucun rôle partagé | une feuille de `variantTokens` peut porter des clés hors des cinq rôles : lire `rendering.roles[clé].cssProperties` au lieu de câbler |
| 5.2 | un axe de `structure.sizing` peut citer une référence de token | le champ cesse d'être un enum de deux valeurs |
| 5.3 | `bounds` (`minWidth`, `maxWidth`, `minHeight`, `maxHeight`), tokenisées | l'absence de `flexGrow`, `alignSelf` et `size` ne suffit plus à décrire une taille |
| 5.4 | `wrap` et `rowGap` ; un cadre de dépendances publie aussi ses calques voisins | un cadre de dépendances ne peut plus être présumé ne contenir que des `composes` |
| 5.5 | une clé de couleur s'allonge des segments qui séparent deux couleurs homonymes | une clé peut contenir des points ; aucun des cinq rôles n'est garanti présent |
| 6.0 | `structure.children` descend partout ; la grille et la position absolue deviennent contractuelles | un enfant n'est plus forcément un texte ou une dépendance ; `layout` peut valoir `grid` |
| 7.0 | le détail par côté d'un champ à quatre côtés ; les pistes et l'ancre d'une grille | rupture de type : `padding.x`, `radius` et la largeur d'un stroke peuvent être un objet |
| 8.0 | `variants` décrit chaque combinaison réellement présente ; `propertyBindings`, `meta.diagnostics`, `meta.coverage` ; `INSTANCE_SWAP` et `SLOT` deviennent des types de props | la matrice cesse d'être présumée dense |
| 9.0 | `variantViews` et `propertyBindingDefinitions` : les blocs identiques se partagent, chaque variant garde ses `nodeId` | les trois index historiques de matrice sortent de `structure` |
| 10.0 | une piste `FIXED` garde sa valeur en pixels ; un groupe peut ne publier que ses côtés tokenisés ; le radius appartient aussi aux feuilles ; `paintPlacements` situe fills et strokes | une cible de peinture ne se déduit plus du nom de la clé |
| 10.1 | `structuralSize`, en pixels, sous une piste qui hug | `structuralSize` n'est pas `size` : ses valeurs sont des pixels, jamais des références |
| 10.2 | `samples`, catalogué à part et référencé par `variants[].sample` | `figmaLayer` est une identité Figma ; le contenu d'un slot se lit dans `samples`, ou nulle part |
| 10.3 | `samples[].composes[].swaps`, le seul canal d'une icône substituée dans une dépendance | rien : le champ reste additif et isolable |

---

## 11.0

11.0 arrête de recopier. À donnée strictement égale, un contrat coûte **53 % de
tokens en moins à lire**. Un agent le lit avant d'écrire une ligne de code, et
sa longueur se paie à chaque lecture.

**Ce qui change pour un lecteur**, dans l'ordre où ça le concerne :

1. **Une vue est un jeu de renvois.** `variantViews[v].structure` est la clé
   d'une entrée de `viewStructures`, pas l'arbre. Idem pour `typography`,
   `composes`, `icons` et `paintPlacements`, chacun dans son catalogue.
   `structure.view` renvoie au même catalogue de structures, la projection de
   référence ne recopie plus l'arbre du variant de référence. `variant-views.mjs`
   résout tout cela, et reste le seul endroit qui le fasse.
2. **Une valeur vide n'est pas écrite.** `strokes` absent = aucun contour lié.
   `padding` absent = aucun padding tokenisé. `props`, `icons`, `textStyles`,
   `composes`, `samples` absents = vides. Une clé absente dit « rien à publier »,
   jamais « inconnu ». Une exception compte : sous un **dictionnaire** la clé est
   une donnée, et `stateModel.states.default` vaut `{}` sans disparaître.
3. **`tokensUsed` et `meta.warnings` ont disparu.** Le premier était l'index des
   références du contrat, le second le miroir mot pour mot de `meta.diagnostics`.
   Ce qui se dérive du contrat terminé ne s'y écrit plus. Les références se
   relèvent dans le contrat, `samples` et `meta` exclus ; les messages se lisent
   dans `meta.diagnostics`, sans filtrer sur `severity`.
4. **Le nom Figma d'un variant vient d'une table.** `figmaVariantLabels` donne
   l'étiquette de chaque axe et de chaque valeur ; `variants[].figmaName` ne
   réapparaît que si une seule combinaison ne se reconstruit pas à l'identique,
   et alors sur tous les variants à la fois.
5. **Les liaisons natives raccourcissent.** La fin commune d'un `nodeId` (l'id
   du calque dans le composant maître, après le dernier point-virgule) est
   hissée dans `propertyBindingDefinitions[b].nodeSuffix`. La recoller redonne
   l'id exact.
6. **Le fichier s'écrit une entrée par ligne.** Un variant, une vue, un
   échantillon tiennent chacun sur une ligne. L'essentiel du gain vient de là,
   sans qu'un octet de donnée change.

**Ce qui ne change pas** : la règle de partage des vues. Deux vues partagent une
partie parce qu'elle est identique, au bit près (aucun merge, aucun défaut,
aucun héritage) et résoudre les cinq renvois redonne la vue exacte. Seule la
granularité du partage change : une divergence se lit sur le renvoi qui diffère
au lieu de forcer la republication de tout l'arbre.

## 12.0

Trois champs s'ajoutent. Un quatrième cesse de se répéter. Les quatre points
relèvent de la **classe 2, ajout qui change la résolution d'une vue** : un
lecteur 11.0 ignore des informations qui modifient le rendu.

1. **`inset` place un calque hors du flux.** Publié avec `position:
   "absolute"`, il donne la distance aux bords que `constraints` désigne, en
   pixels et par côté (`top`, `right`, `bottom`, `left`). La boîte de référence
   est celle du parent, sans ajustement : aucun rôle de contour ne consomme la
   boîte dans ce contrat.
2. **`rotation` incline un calque, dans la convention de CSS.** Elle vaut donc
   l'opposé du compte trigonométrique de Figma et part telle quelle dans un
   `transform: rotate(…)`. L'origine est le centre du calque, le défaut de
   `transform-origin`, et le point sur lequel `inset` est calculé, si bien
   qu'un calque hors du flux tourné retombe où Figma le montre. Elle est
   publiée sur le calque de flux du composant comme sur chaque calque, et une
   rotation imbriquée se compose d'elle-même. Absente sous le centième de
   degré : Figma stocke des flottants dont il reste des résidus qu'aucun écran
   ne rend.
3. **`rendering.keyRoles` donne le rôle d'une clé qui n'en porte pas le nom**,
   un côté (`fills`, `strokes`) par arbre. La résolution est
   `roles[keyRoles[côté][clé] ?? clé]` : sans entrée, la clé est le rôle.
4. **`rendering.roles` redevient strictement le vocabulaire partagé.** Il ne
   reçoit plus de copie de descripteur par clé observée, que le point précédent
   remplace. Un lecteur qui parcourait `roles` pour y trouver ses clés
   doit passer par `keyRoles`.

**Ce qui ne change pas** : tout le reste de la 11.0. Un contrat 12.0 sans calque
hors du flux, sans rotation et dont chaque clé porte le nom de son rôle est
identique à son équivalent 11.0, à `meta.contractVersion` près. Trois des quatre
contrats du consommateur de référence l'ont vérifié en ne changeant que cette
ligne.

### Défaut déclaré des axes

Le sens de `props.<axe>.default` change dans la 12.0 sans changer sa forme. Il
relève de la **classe 4, changement de signification d'une absence**. Le plugin
ne reprend plus le variant placé en premier dans le component set : le designer
déclare désormais le défaut avec `@default`, ou le champ reste absent. Les
contrats 12.0 déjà exportés gardent leur forme, mais doivent être réexportés
lors de la recette de migration pour recevoir ce sens.

### Adresses de slots et clés de props

Quatre corrections changent ce que la 12.0 publie, sans changer sa forme. Aucune
ne touche le schéma, et `meta.contractVersion` ne bouge pas : chacune ne modifie
un contrat que là où il était déjà contradictoire ou incomplet. Un contrat 12.0
déjà exporté reste valide de forme ; les trois premiers points demandent un
réexport pour recevoir leur sens.

1. **Deux enfants d'un même parent ne portent plus le même slot.** Des calques
   `box`, `box` et `box-2` recevaient `box`, `box-2` et `box-2-2`, le numéro
   étant désormais cherché parmi les slots déjà réservés sous ce parent.
   L'ancien compte des homonymes en donnait deux au même nom, et une adresse de
   typographie, de peinture ou d'icône désignait alors le premier des deux.
   Seul un composant dont un parent portait des homonymes voit ses slots
   changer. Son contrat était jusque-là ambigu, et les lecteurs le refusent
   maintenant. Ce composant relève donc de la **classe 3** : le designer
   réexporte, le développeur adapte les adresses qu'il citait.
2. **Une propriété `State` ou `Status` qui n'est pas un axe devient une prop.**
   La convention porte sur le type `VARIANT` ; une `BOOLEAN`, une `TEXT`, un
   `INSTANCE_SWAP` ou un `SLOT` de ce nom disparaissait du contrat sans qu'aucun
   message ne le dise. **Classe 1** : `props` gagne une entrée que le fichier
   Figma déclarait déjà.
3. **Un placement de peinture vide survit à une clé de couleur qui porte un
   point.** Depuis la 5.5 une clé s'allonge des segments qui séparent deux
   couleurs homonymes ; son chemin comptait alors un segment de trop et
   l'élision retirait l'entrée, dont la clé nommait pourtant la couleur.
   **Classe 1**.
4. **Deux axes que la normalisation confond refusent l'export.** Le contrat
   produit citait deux fois le même axe et ne publiait qu'une des deux
   coordonnées de chaque variant ; les lecteurs le refusaient déjà. Aucun
   artefact de cette forme n'existe donc chez un consommateur. Rien n'est à
   migrer : le geste appartient au designer, dans Figma.

## 13.0

La typographie publie les réglages de texte que Figma ne relie à aucune
variable. Les trois points relèvent de la **classe 2, ajout qui change la
résolution d'une vue** : un lecteur 12.0 qui les ignore affiche en minuscules un
libellé que la maquette montre en capitales.

1. **`textStyles.<clé>.literals` porte six propriétés CSS** : `textTransform`,
   `fontVariantCaps`, `textDecorationLine`, `fontStyle`, `textWrapStyle` et
   `textBox`. [5. Typographie](./FORMAT.md#5-typographie) donne la propriété
   Figma d'où vient chacune.
2. **`tokens` gagne `paragraphSpacing` et `paragraphIndent`, et devient
   facultatif.** Un style sans variable reliée est publié s'il porte des
   `literals`. Un lecteur qui lisait `tokens.fontSize` sans condition doit
   tester la présence de `tokens`.
3. **Un usage de `variantViews.*.typography` gagne `textAlign`,
   `alignContent`, `lineClamp` et `textOverflow`**, lus sur le calque texte.
   `textOverflow` n'est publié qu'avec `lineClamp`. Deux vues qui ne diffèrent
   que par l'alignement d'un texte ont chacune leur entrée dans
   `viewTypographies`.

L'alignement, la casse, la décoration et la troncature avec `maxLines`
n'avertissent plus. Au réexport, un composant qui ne perdait rien d'autre passe
de `meta.coverage.portable: "partial"` à `"complete"`. Avertissent en revanche :
une liste, `listSpacing`, `hangingList`, `hangingPunctuation`, un réglage du
soulignement ou d'`openTypeFeatures` que CSS ne rend pas sans déclaration, une
troncature sans `maxLines`, et un calque qui s'écarte de son text style par une
valeur différente ou par du gras et de l'italique ajoutés.

La règle de `textOverflow` a été corrigée avant qu'aucun contrat 13.0 soit
exporté : aucun artefact ne porte un `textOverflow` sans `lineClamp`.

La fenêtre de lecture porte la 12.0 et la 13.0.

**Ce qui ne change pas** : tout le reste de la 12.0. Un contrat 13.0 est
identique à son équivalent 12.0, à `meta.contractVersion` près, quand les textes
du composant gardent les valeurs par défaut de Figma pour chaque réglage de
cette entrée.

---

## `tokens.json`

La version du format de tokens se lit à la racine du fichier, dans
`$extensions["com.ucm.formatVersion"]`, et ne suit pas `contractVersion`. Ses
états de lecture sont dans
[COMPATIBILITE.md](./COMPATIBILITE.md#la-version-du-format-de-tokens).

### Forme d'origine

Le fichier ne porte pas de marque. Une couleur s'écrit en hexadécimal, `#rrggbb`
ou `#rrggbbaa`, arrondie à l'octet et sans espace colorimétrique. Une dimension
s'écrit en chaîne, `"8px"`. Une graisse stockée en `STRING` reste en
`"$type": "string"`, avec son nom de style. Style Dictionary 4 et 5 lisent cette
forme.

### Version 1

Le changement des valeurs relève de la **classe 10** et l'ajout de la marque de
la **classe 11**.

1. **Une couleur devient un objet** `{ colorSpace, components, alpha }`.
   L'espace vaut `srgb` ou `display-p3` selon le profil du document Figma. Les
   composantes gardent la précision de Figma, et `alpha` est toujours écrit.
2. **Une dimension devient un objet** `{ value, unit }`, avec l'unité `px`.
3. **Une graisse `STRING` reconnue devient `number`**, avec son poids dans
   chaque mode. Un nom libre reste une chaîne.
4. **La racine reçoit** `$extensions["com.ucm.formatVersion"]`, qui vaut `1`.

**Ce qui ne change pas** : les chemins des tokens, leurs alias, les noms de
modes sous `com.ucm.modes` et les types `boolean` et `string` hors graisse.
Aucune référence d'un contrat ne cesse de résoudre, et `contractVersion` ne
bouge pas.

**Ce qui casse** : un lecteur resté sur Style Dictionary 4 écrit
`[object Object]` à la place de chaque couleur et de chaque dimension, et son
build réussit. Le lecteur de valeurs passe à Style Dictionary 5 avant la fusion
du premier réexport.

La première version du plugin qui produit cette forme n'est pas encore publiée
sur la Community. Le plugin qu'elle sert produit la forme d'origine.
