# Le format de contrat UCM

Ce que le repository consommateur doit savoir pour lire un `*.contract.json` et
un `tokens.json` : la forme de chaque champ, ce que son absence signifie, et ce
que le contrat garantit — ou refuse de garantir. Le POURQUOI des responsabilités
vit dans [CONCEPT.md](../CONCEPT.md) ; la façon dont le plugin lit Figma pour
produire tout ceci vit dans
[packages/plugin/SPEC.md](../packages/plugin/SPEC.md).

Le vocabulaire est celui du contrat : « le moteur » désigne le plugin qui
l'écrit, « le consommateur » le repository qui l'implémente.

> ⚠ **Scission en cours (T8.1, temps 1).** Ce document et
> [SPEC.md](../packages/plugin/SPEC.md) viennent d'une spécification unique,
> partitionnée **ligne à ligne, sans qu'un mot soit réécrit**. Les paragraphes
> qui parlaient des deux sujets à la fois sont pour l'instant **dans les deux
> fichiers** : `tests/scissionSpec.test.mjs` prouve qu'aucune ligne n'a été
> perdue et compte ce qui reste dupliqué. Le temps 2 résorbe ces doublons un
> paragraphe à la fois. Tant qu'il dure, une règle lue ici peut avoir sa jumelle
> là-bas — elles sont identiques au caractère près.

Le moteur conserve la traçabilité Figma tout en exprimant la sémantique
visuelle dans un vocabulaire stable. Les assets et l’API applicative restent
du ressort du repository consommateur.

## Nommer et citer un token

- **`normalizeName()` est commune aux deux commandes** :
  `Brand Tokens/Primary/default` → `brand-tokens.primary.default`
  (`/`→`.`, espaces d'un segment → `-`, minuscules). Un token s'écrit donc
  pareil dans `tokens.json` et dans un contrat — les références de la Partie 1
  recoupent la Partie 2.
- **Références de tokens entre accolades** : dans un contrat, un token est cité
  comme RÉFÉRENCE `"{chemin.du.token}"`, jamais comme chemin nu ni valeur
  aplatie — même syntaxe que les références DTCG de `tokens.json`. Les accolades
  sont un simple enrobage autour du nom produit par `normalizeName()` ; un
  consommateur retire `{…}` avant de résoudre. Un nom de **text style** n'est
  pas un token ; en revanche, les variables liées au style sont exportées comme
  références dans `textStyles.*.tokens`, et comptent comme telles.

## Hypothèses sur le design system

Aucune convention de nommage n'est imposée aux couleurs de variante. Le dernier
segment du token en est la **clé de base** ; ce qu'il peint se déduit du calque
qui le porte, et le contrat le publie dans `rendering.roles`. Un design system
qui nomme ses rôles (`…/background`, `…/foreground`, `…/icon`, `…/border`,
`…/ring`) voit sa déclaration l'emporter sur la déduction — c'est le seul moyen
de distinguer un `ring` d'un `border`.

Un design system reste également libre de peindre plusieurs surfaces d'un même
variant avec des variables dont le nom finit pareil : la clé s'allonge alors des
segments qui les séparent, et aucune couleur n'est perdue.

---

**Entrée** : exactement un `COMPONENT` ou un `COMPONENT_SET` sélectionné. Les
règles `<Nom>-Rules` enrichissent l'intention mais ne conditionnent pas la
fidélité de l'export. Un set clairsemé n'est pas complété artificiellement : le
champ `variants` publie uniquement les combinaisons réellement présentes et un
diagnostic nomme l'écart avec le produit cartésien des axes. Un consommateur
compose les enums avec cette liste exacte ; il ne présume jamais que leur
produit cartésien est valide.

## Ce que le contrat publie, champ par champ

Les titres numérotés et leur ordre sont ceux de la spécification d'origine : les
renuméroter avant le temps 2 casserait les ancres qu'`AGENTS.md` vise, sans que
rien ne le rattrape.

#### La règle commune

Plusieurs champs — gap, paddings, rayons, taille d'un slot, bornes, largeur d'un
stroke — répondent au même silence, cité plus bas sous ce nom :

- une valeur reliée à une variable se publie, comme référence de token ;
- une valeur figée qu'aucune variable ne nomme avertit et reste absente : un
  nombre brut n'est jamais contractuel, une variable liée l'est toujours ;
- une valeur neutre effectivement fournie par Figma — un gap, un padding ou un
  rayon à zéro — reste absente sans un mot, la publier n'apprenant rien.

#### 1. Props

Traduire chaque propriété : `VARIANT` → enum, `BOOLEAN` →
boolean, `TEXT` → string, `INSTANCE_SWAP` → `instance-swap`, `SLOT` → `slot`.
`propertyBindingDefinitions` catalogue le nom technique Figma complet, le
chemin et la cible native (`visible`, `characters`, `mainComponent`). Chaque
`variants[].bindings` référence cette définition et conserve le `nodeId` exact
du calque dans CE variant. Les props propres au wrapper sont fusionnées avant ce
relevé ; les internes d'une dépendance composée restent dans le contrat de cette
dépendance.
Cette fusion conserve sa provenance : la surface publique est celle du
Component ou Component Set propriétaire, complétée par le seul wrapper de
dimensions élu. Deux occurrences exposées, ou une instance exposée qui ne vient
pas de ce wrapper, ne peuvent jamais devenir une source implicite de props.
Deux règles auto-détectées :
- *Convention State* : un axe `State`/`Status` décrit des états d'interaction
  dérivés du runtime (hover, focus…), pas des choix d'API — il est donc **exclu
  des props** ; seule sa valeur `Disable` (orthographes `Disable` ou `Disabled`
  acceptées) devient `disabled: boolean`. Exclu des props ne veut pas dire
  absent du contrat : `stateModel` le publie avec toutes ses valeurs, et il
  indexe les arbres de variantes. C'est donc là, et non dans `props`, que sa
  documentation `@prop` est rangée.
- *Couche sémantique* : les noms Figma peu parlants sont mappés vers le
  vocabulaire partagé — ex. un enum dont toutes les valeurs sont des tailles
  (`big/medium/small`, `xs`…`3xl`) → prop `size`. Le nom Figma d'origine est
  conservé dans `figmaName`. Mapping piloté par les **valeurs**, jamais par le
  composant. La même table de correspondance renomme les clés de
  `structure.variantAxes` et des valeurs de chaque variant : `props.size`,
  `variantAxes` et les arbres de tokens ne peuvent pas diverger.

#### 2. Tokens de variantes

Parcourir **tous les variants réellement
présents**, sans fabriquer les cases absentes d'un produit cartésien. Pour
chacun, relever les tokens liés (`boundVariables.fills` et
`.strokes` sur tout le sous-arbre), rangés par **clé**, dont la base est le
dernier segment du token. Un composant unifié imbriqué n'y contribue rien : ni son contenu, ni le
calque de l'instance elle-même, dont le fond appartient à son propre contrat.
Le relever ferait entrer dans `variants[].tokens` une couleur
que ce contrat-ci ne peint pas — et, sur une clé partagée, évincerait la sienne. Un sous-arbre `visible === false` est ignoré, sauf si sa visibilité
est liée à une prop de composant ou à une variable : il peut alors être rendu
dans une autre configuration et reste exporté. Un sous-arbre statiquement
masqué qui portait des variables produit un warning sur sa racine.

Deux variants qui aboutissent aux mêmes valeurs d'axes après normalisation
restent deux entrées autonomes de `variants`, chacune avec ses propres tokens,
strokes, liaisons et référence de vue. Aucun index public n'a à trancher entre
ces coordonnées identiques : aucune feuille n'est écartée et aucun renommage
compensatoire n'est demandé au designer.

La clé **identifie** la couleur ; elle ne dit pas ce qu'elle peint. Ce que la
couleur peint se lit sur le **calque qui la porte**, jamais sur son nom : un
`fill` sur un texte est un `foreground`, sur un calque désigné par une règle
`@icons` un `icon`, ailleurs un `background` ; un `stroke` est un `border`, et
c'est son `align` — déjà publié sur la feuille — qui dit **de quel côté** de la
boîte le dessiner, jamais avec quelle technique : un contour Figma se dessine
hors du flux et se rend donc en `box-shadow`. Une clé qui ne nomme aucun rôle partagé
reçoit donc son rendu dans `rendering.roles`, à côté des cinq rôles communs à
tous les contrats.

Un design system reste libre de nommer ses rôles (`…/background`,
`…/foreground`, `…/icon`, `…/border`, `…/ring`) : cette **déclaration fait
autorité** sur la déduction, et c'est le seul moyen de distinguer un `ring` d'un
`border`. Elle se lit sur le dernier segment du **token**, jamais sur la clé
publiée. En revanche elle n'est pas exigée : l'exiger imposerait au design
system un renommage que rien ne justifie.
Seul subsiste le **warning agrégé** du rôle déclaré puis employé sur le mauvais
support — un `…/border` posé en remplissage : le nom et le calque se
contredisent, et le contrat ne peut pas trancher. Un seul message par rôle
fautif, avec son nombre d'occurrences et un token en exemple.
Un rôle n'apparaît que s'il est réellement lié — rien n'est forcé ni inventé.

Le contrat ne publie que les couleurs LIÉES. Une peinture unie posée à la main
sur un calque que l'extraction parcourt produit un avertissement et rend
`meta.coverage.portable` partiel : sans elle, le développeur rendrait ce calque
sans encre. Trois cas n'en produisent aucun — un paint masqué ou d'opacité nulle
et un stroke d'épaisseur zéro ne peignent rien, et une peinture non unie relève
du relevé des propriétés non portables.

**Une clé que deux couleurs partagent s'allonge.** Deux calques d'un même
variant dont les variables finissent par le même segment ne s'évincent pas :
la clé garde ce segment comme BASE et lui ajoute les segments du chemin
qui **séparent** les deux couleurs. `…info.userinput.colors.background` et
`…info.divider.colors.background` deviennent `userinput.background` et
`divider.background` — `colors`, commun aux deux, n'apporte rien et reste
dehors. Le design system nomme déjà ces surfaces distinctement ; aucun
renommage n'est demandé au designer.

Le choix des segments est décidé **une seule fois pour tout le composant**. Pour
au plus seize profondeurs candidates, le moteur retient exactement la sélection
qui produit **le moins de clés distinctes**. Au-delà, il emploie une sélection
gloutonne déterministe puis retire les profondeurs inutiles : le coût reste
borné au lieu d'explorer `2^n` combinaisons. Dans les deux cas, seules les
couleurs **cohabitant dans une même feuille** doivent être séparées. C'est ce
qui garde une coordonnée de variant hors de la clé —
trente couleurs `…<color>.<variant>.<state>.background` qui ne se côtoient jamais
gardent une seule et même clé, et seule une surface qui les côtoie vraiment s'en
détache. Une clé allongée contient donc un point, et une clé simple jamais : un
segment de token n'en contient aucun. La clé d'un token est la même dans toutes
les feuilles.

Chaque vue exacte situe aussi les couleurs dans
`paintPlacements.{fills,strokes}`. Une clé y référence tous les chemins de slots
qui la portent ; `[]` désigne la racine de la vue. Ces chemins sont collectés
pendant l'unique construction de `structure.children`, jamais recalculés depuis
un nom de calque. Deux couleurs **empilées sur un même calque** sont publiées
toutes les deux et reçoivent le même chemin, mais leur ordre reste
irreprésentable : un warning le signale.

Le chemin publié est celui du calque **publié** qui porte la peinture. Une
couleur posée **sous une feuille** appartient à cette feuille : le contrat ne
descend pas dans les tracés d'une icône importée, alors que le fill d'une icône
vit précisément sur son tracé. Situer cette couleur sur le slot de l'icône est
la seule lecture qui laisse le consommateur la peindre, et c'est de toute façon
là que le rendu l'applique — `color` et `fill` cascadent du slot vers le dessin.
Deux tracés d'une même icône ne produisent donc **qu'une** cible. Aucun
avertissement n'accompagne ce cas : le moteur refuse par principe de publier ces
tracés, et aucun geste du designer ne l'en ferait changer.
Chaque feuille décrit indépendamment l'état visuel complet du variant Figma :
si un rôle est absent des `tokens` ou `strokes` d'un variant, cela signifie
toujours **« ne pas rendre ce rôle dans cet
état »**. Un consommateur ne doit jamais fusionner implicitement cette feuille
avec celle de l'état `default`.
Résolution : `VariableAlias.id` → `getVariableByIdAsync(id).name` →
`normalizeName()` → enrobage en référence `{…}`. Pour un rôle porté par un
`fill`, la feuille contient la référence du token. Un id de variable ou sa
collection introuvable produit un warning contextualisé par le premier calque
concerné et aucune référence n'est écrite. Les strokes sont rangés
séparément dans `variants[].strokes` :

```json
"ring": {
  "color": "{components.button.colors.primary.contained.focus.ring}",
  "width": "{layouts.stroke.ring}",
  "align": "outside"
}
```

`color` et `width` sont des **références de token** entre accolades ; `align`
est une donnée structurelle Figma, pas un token — jamais d'accolades. Une
largeur est uniforme si `strokeWeight` est lié, ou si ses quatre côtés sont
liés au même token. Une représentation absente vaut `null`. Une représentation
par côté peut être partielle : les côtés tokenisés sont publiés, les côtés
neutres à zéro restent absents, et tout côté fixe non neutre produit un warning.
Elle n'est jamais remplacée par une valeur brute ni par le premier côté trouvé. Les strokes vivent dans le champ séparé
`strokes` de chaque variant pour que `tokens` reste une feuille de pures
références chaînes. `values` porte les coordonnées exactes, sans reconstruire
un arbre cartésien :

```json
{
  "values": { "color": "primary", "variant": "contained", "state": "focus" },
  "tokens": { "background": "…", "foreground": "…" },
  "strokes": { "ring": { "color": "…", "width": "…", "align": "outside" } }
}
```

#### 3. Layout

Certains design systems construisent leurs variantes de taille
via un sous-composant partagé, imbriqué dans chaque variant, qui porte seul les
dimensions : c'est le **wrapper de dimensions**. Le moteur cherche donc une
instance imbriquée portant des dimensions liées
(`itemSpacing`/`padding`/`cornerRadius`, ou les quatre rayons de coin). Gap,
paddings et rayon sont comptés avec les mêmes groupes complets que lors de
l'extraction : une liaison partielle ne suffit pas à élire un wrapper. Si plusieurs instances en portent,
celle qui lie le plus de dimensions gagne ; un nom contenant « wrapper » et des
props exposées servent de départage. S'il en
existe une (Button : `sizeWrapperButton`), ses props sont **fusionnées** dans l'API
(étape 1) et ses dimensions relevées ; **sinon**, dimensions lues directement
sur le composant de référence (`defaultVariant`). → `gap`, `padding.x/y`,
`radius`. Un composant plat est donc géré sans blocage.
Une dimension uniforme n'est exportée que si sa représentation commune se
résout. Pour une dimension réglable côté par côté (`padding`, `radius`, largeur
de stroke), chaque côté tokenisé se publie indépendamment ; un côté absent et à
zéro est neutre, tandis qu'un côté fixe non neutre avertit. La taille d'un slot
reste un groupe indivisible : largeur + hauteur doivent prouver ensemble le
carré annoncé.

**Les côtés peuvent différer.** Quand tous citent la même variable,
le champ garde sa forme courte — une référence — et le contrat d'un composant
déjà correct ne change pas. Quand ils en citent plusieurs, le contrat publie le
DÉTAIL par côté au lieu de tout perdre : `padding.x` devient
`{ "left": "{…}", "right": "{…}" }`, `radius` devient
`{ "topLeft", "topRight", "bottomRight", "bottomLeft" }`, et la largeur d'un
stroke `{ "top", "right", "bottom", "left" }`. Le design system nomme déjà ces
variables séparément ; exiger une variable unique lui ferait aplatir une
décision qui lui appartient. Cet objet peut être clairsemé : deux coins gauches
tokenisés et deux coins droits à zéro publient
uniquement `topLeft` et `bottomLeft`. L'élection du node de layout continue de
ne compter que les groupes complets : une valeur partielle ne choisit jamais le
wrapper, mais elle reste publiée sur un calque qui l'est déjà.

La taille d'un slot n'entre pas dans cette liste : ses deux axes ne sont pas
deux côtés d'un même champ, et deux variables y décrivent une dimension que le
contrat ne saurait pas écrire. Elle garde donc l'exigence d'une variable unique. Une valeur neutre par défaut effectivement fournie par Figma (par
exemple `0` pour un gap, un padding ou un rayon) reste elle aussi absente, mais
ne produit pas de warning : la demander comme token n'ajouterait aucune
information au rendu.

**Un tracé n'est pas une boîte.** Sur un `VECTOR`, un `BOOLEAN_OPERATION`, un
`STAR` ou un `POLYGON`, la largeur et la hauteur sont celles que Figma calcule
sur la géométrie du chemin : c'est le DESSIN, pas une décision du design
system. Le contrat ne leur réclame donc aucune variable — la demander
enverrait le designer relier la bounding box d'un chemin de Bézier — et publie
la dimension quand une variable est bien liée, comme partout ailleurs. C'est
le même mécanisme que pour un enfant de grille, pour une raison voisine : la
dimension est déjà expliquée ailleurs.

- **pas d'auto-layout** (`layoutMode: NONE`, ou un node qui n'en a pas) — gap
  et paddings restent absents et un warning unique par calque dit au designer
  que leur absence **ne vaut pas zéro** ; c'est ce qui permet à un consommateur
  de distinguer « neutre » de « la question ne se pose pas » ;
- **espacement « Auto »** (`primaryAxisAlignItems: SPACE_BETWEEN`) — Figma
  ignore `itemSpacing` et répartit l'espace disponible. Le `gap` reste donc
  absent, mais `justifyContent: "space-between"` décrit la répartition ; une
  liaison conservée sur `itemSpacing` ne produit ni token ni warning ;
- **auto layout en grille** (`layoutMode: GRID`) — Figma y espace les enfants
  par `gridColumnGap` et `gridRowGap`, tous deux **liables à une variable**.
  Le contrat les publie donc comme `columnGap` et `rowGap`, à côté de
  `columns` et `rows`, et `layout` vaut `grid`. `itemSpacing` reste lisible
  sans aucun effet : le `gap` reste absent, et rien n'est signalé — il n'y a
  plus rien qui manque.

La même règle vaut pour l'élection du porteur de layout : une liaison
inapplicable ne désigne pas un calque comme conteneur de dimensions, sinon le
calque élu n'exporterait rien.
**Dimensions par taille** : l'axe de tailles est cherché sur le wrapper de
dimensions puis, s'il n'en porte pas, sur le Component Set sélectionné — un
wrapper qui expose ses propres axes ne doit pas faire disparaître les
dimensions par taille. Détecté par ses valeurs (comme la prop `size`), chaque
valeur est extraite →
`structure.sizes.{big,medium,small}` avec gap/padding/radius par taille. La
typographie n'est pas une dimension du conteneur : elle est décrite pour chaque
texte dans la vue exacte du variant. Le contrat couvre ainsi toutes
les tailles, pas seulement celle instanciée par défaut. Hypothèse assumée : les dimensions ne varient que selon
l'axe de tailles — un représentant par taille suffit ; si un design system
faisait varier un padding selon un autre axe, le contrat ne le verrait pas.

#### 4. Modèle d'interaction

Lorsqu'un axe `State` ou `Status` est présent,
le contrat ajoute `stateModel` avec le déclencheur et, si une règle `@prop` la
déclare, la description de chaque état connu :
`hover` → `:hover`, `focus` → `:focus-visible`, `press` → `:active`,
`disable`/`disabled` → `[disabled]`. La priorité générique est
`disable > press > focus > hover > default`. Un état inconnu reste exporté
avec un déclencheur `null` et un warning. Les `selector` visent
l'implémentation CSS de **production** (pseudo-classes) ; l'outil de test
froid, en styles inline, reproduit les mêmes états via des événements.

#### 5. Typographie

Chaque calque texte de chaque variant doit porter un text
style Figma unique. Le moteur lit l'objet `TextStyle`, conserve son nom exact
dans `textStyles.<clé>.figmaName`, puis résout ses `boundVariables` :
`fontFamily`, `fontSize`, `fontWeight` (fallback `fontStyle`), `lineHeight` et
`letterSpacing`. La clé du catalogue est le nom normalisé du style ; aucun lien
vers les tokens n'est déduit de ce nom. Chaque propriété non liée produit un
warning et n'est jamais remplacée par une valeur brute.

Chaque `variantViews.*.typography` liste `{ slotPath, style }` pour situer le
style de chaque texte dans la structure de cette même vue. `slotPath` est une
liste de slots depuis `structure.children` jusqu'à la part concernée. Le catalogue ne
contient que les styles réellement utilisés. Un layer sans style, un style introuvable ou deux noms normalisés
en collision avertissent et l'usage ambigu reste absent.

#### 6. Structure

`children` = enfants directs réels du node de layout :
- calque **texte** → slot `label` (nom d'origine dans `figmaLayer`) ; son style
  est situé par la `typography` de sa vue (étape 5) ;
- calque **graphique désigné par une règle `@icons`** → slot `icon`, `optional:
  true`, `size` ;
- **conteneur** → slot décrit par `children`, récursivement, plus sa
  disposition et ses dimensions propres ; voir ci-dessous ;
- autre calque **graphique** → nom du calque comme slot, `optional: true`, `size`.

**La descente ne connaît ni profondeur, ni nature de composant.** Un calque est
un CONTENEUR dès qu'un de ses descendants porte une information qu'une feuille
ne sait pas exprimer : un calque texte, une icône, une dépendance composée, ou
n'importe quelle liaison de variable. Une feuille dit son nom, sa taille, ses
bornes et sa place dans le flux ; elle ne sait dire ni la disposition interne,
ni les couleurs, ni les tailles de ce qu'elle contient. Un auto layout dans un
auto layout dans une grille est donc décrit jusqu'au bout, chaque niveau avec
son `layout`, son `gap`, son `padding`, son `radius`, sa `size` et ses
`bounds`.

La règle a une borne, et elle compte autant : **un calque dont aucun descendant
ne porte d'information reste une feuille.** Sans elle, l'export publierait les
trente tracés d'une icône importée. C'est aussi pourquoi une liaison de
variable — et non le type du node — est le signal : le contrat décrit ce que le
design system a nommé, pas ce que Figma contient. `structureTree.ts` en est
l'unique autorité, partagée par l'extraction, les chemins de
la typographie des vues et les signatures de comparaison des variants : un second
calcul finirait par viser un slot que `structure.children` ne contient pas.

Un conteneur publie **tous** ses calques rendables, jamais une sélection : un
titre, une description, un dessin voisin et un tag sont tous des calques de ce
contrat-ci. Le taire ferait annoncer au contrat des couleurs qu'aucun calque
publié ne porte, puisque `variants[].tokens` les relève sur le variant entier.

La profondeur est bornée à **12 niveaux**. Une coupure qui emporte un
sous-arbre réellement porteur produit un avertissement ; une coupure qui ne
laisse qu'un dessin ne dit rien.

Les visibilités portées par les
nodes publiés descendent à leur place exacte ; une cible que l'arbre ne publie
pas reste dans `visibilityTargets`, sans perte silencieuse. Une cible unique qui
contrôle tout le contenu du slot le rend optionnel comme avant : c'est l'enfant
qui se tait alors, pour qu'un même fait n'ait jamais deux propriétaires.

`layout`, `justifyContent`, `alignItems` et `wrap` sont relevés dès que le
conteneur est un auto layout linéaire ; `columns`, `rows`, `columnSizes`,
`rowSizes`, `columnGap` et `rowGap` dès qu'il est une grille. `gap` n'est relevé qu'à partir de deux
enfants — un conteneur qui n'en range qu'un n'espace rien. `padding` et `radius`
sont relevés sur chaque conteneur, à la règle commune. Pour un node sans
disposition, `layout` reste absent et un warning explique que la disposition
interne manquera — sauf autour d'un enfant unique, où il n'y a rien à décrire.

Les parts sont nommées par la règle qui nomme déjà les slots (`label`,
`label-2`…) : aucune heuristique sur le nom du calque, et `figmaLayer` conserve
« Titre » ou « Description » pour les distinguer.

La projection de référence `structure.children` est comparée sur toute la
matrice. Une différence de cardinalité, d'ordre ou de disposition avertit en
nommant les variants ; un changement de nom Figma avertit aussi, sauf pour une
icône reconnue dont le slot stable et la vue exacte portent déjà l'identité.
L'écart n'est jamais perdu. `variantViews` catalogue chaque vue distincte, et
chaque entrée de `variants` la référence par `view`, à côté de ses feuilles
exactes `tokens` et `strokes`. Une vue n'est pas un bloc mais **cinq renvois** —
`structure`, `typography`, `composes`, `icons`, `paintPlacements` — vers cinq
catalogues séparés (`viewStructures`, `viewTypographies`, `viewComposes`,
`viewIcons`, `viewPaintPlacements`).

L'égalité stricte reste l'unique règle de partage, appliquée à chaque PARTIE :
aucun merge, défaut ou héritage ne peut masquer une divergence, et résoudre les
cinq renvois redonne la vue exacte, au bit près. Ce qui change est la
granularité, et elle vaut cher : deux vues qui ne diffèrent que par leurs
peintures republiaient tout leur arbre de slots. Deux réserves closent la
règle — l'ordre des clés d'un objet ne compte pas dans la signature (deux
extractions du même arbre peuvent le produire dans un ordre différent), et une
partie vide n'est pas cataloguée : son renvoi est simplement absent.

`structure` suit la même mécanique : elle publie un renvoi vers
`viewStructures`, **inconditionnellement**. Quand l'élection du node de layout
la fait différer de toute vue — un wrapper de dimensions sauté — elle ajoute son
entrée au catalogue plutôt que de recopier un arbre. Une seule forme, donc un
seul chemin de lecture.

`icons.<clé>.slot` continue de nommer un slot de **premier niveau**, y compris
pour une icône imbriquée dans un slot à parts.

Nommer le slot d'icône par son rôle le rend **stable sur toute la matrice** :
des icônes qui s'excluent entre variants (`circle-info` en info, `circle-check`
en success) partagent un seul slot, là où leurs noms de calques en auraient
inventé un par variant. `children` décrivant le variant de référence, seul le
premier y apparaît. Le nom Figma reste dans `figmaLayer`, `icons` fait foi sur
l'icône à rendre, et `variantViews[variants[].view].icons` la situe dans son
arbre exact par `slotPath`.

Une prop BOOLEAN Figma liée à la visibilité d'un calque donne `visibilityProp`
+ `optional` sur son slot, **quel que soit le type de calque**. Un label
masquable (bouton à icône seule) est donc décrit comme tel : sans cela le
contrat exposerait une prop booléenne sans dire ce qu'elle montre ou cache.
La liaison peut être portée par un descendant : elle est remontée sur le slot
uniquement si ce descendant contrôle tout son contenu rendable **et** que le
slot n'est pas déjà masquable. Sinon `visibilityTargets` conserve la prop et le
chemin Figma relatif de chaque cible, sans marquer à tort le slot entier comme
optionnel ni taire une prop que le composant doit lire. Dans un slot décrit par
ses parts, les cibles représentées dans l'arbre portent leur visibilité à leur
place exacte. Les cibles non textuelles restent dans `visibilityTargets` : les
retirer ferait perdre une prop que l'arbre textuel n'a nulle part où publier.
Une visibilité liée à une variable conserve également le calque, sans inventer
de prop publique. Un calque statiquement masqué est exclu avec tout son
sous-arbre ; s'il portait des variables, le warning indique ce qui a été
ignoré.

##### Flux et alignement

Sur un auto-layout `HORIZONTAL` ou `VERTICAL`, le
contrat publie toujours les deux alignements du conteneur :
`primaryAxisAlignItems` devient `justifyContent` (`MIN` → `flex-start`,
`CENTER` → `center`, `MAX` → `flex-end`, `SPACE_BETWEEN` →
`space-between`) et `counterAxisAlignItems` devient `alignItems` (`MIN`,
`CENTER`, `MAX` et `BASELINE`). Ils restent absents pour `NONE`, `GRID` ou une
propriété illisible : aucune valeur CSS par défaut n'est devinée.

Chaque enfant direct du flux peut porter `alignSelf` quand son `layoutAlign`
diffère de `INHERIT` (`STRETCH` inclus) et `flexGrow: 1` quand Figma publie
`layoutGrow: 1`. Les valeurs neutres `INHERIT` et `0` restent absentes.

Le menu de dimensionnement du layer (`layoutSizingHorizontal` /
`layoutSizingVertical`) prévaut sur ces deux API historiques, **axe par axe**.
Sur l'axe secondaire : `FILL` donne `alignSelf: stretch`, `HUG` laisse
`alignSelf` absent même si une instance expose encore un `layoutAlign: STRETCH`
contradictoire — mais un `MIN`, `CENTER` ou `MAX` reste publié, puisqu'il
aligne le layer sans rien dire de sa taille. Sur l'axe principal : `FILL` donne
`flexGrow: 1`, `HUG` l'omet. Les deux axes sont indépendants : une hauteur en
hug ne retire pas une largeur en fill, sans quoi le contrat perdrait un
remplissage encore vrai dans Figma.

**Une absence de dimensionnement vaut `Hug`.** Le contrat ne publie que les
exceptions, et cette lecture est valide parce que les deux autres intentions
sont couvertes ailleurs : un `Fill` devient `flexGrow` ou `alignSelf`, une
dimension fixe reliée à une variable devient `size`, et une dimension fixe sans
variable produit un avertissement au lieu d'être tue. Un consommateur peut donc
rendre un slot sans `flexGrow`, sans `alignSelf` et sans `size` comme un
`fit-content`.

##### Dimensions et bornes

**Dimensions figées des slots.** Le relevé vise **tous** les slots, texte
compris, et se fait axe par axe : un axe en `Hug` ou en `Fill` est déjà décrit
et ne réclame rien, un axe figé doit citer une variable. `size` porte alors la
référence seule quand les deux côtés sont identiques — le carré des icônes — et
`{ "width": "…", "height": "…" }` sinon, chaque côté figé nommant le sien. Une
dimension figée sans variable produit un avertissement et reste absente : c'est
ce qui autorise à lire une absence comme un `Hug`. Seul le calque qui EST une
dépendance composée échappe au relevé, sa taille appartenant à son propre
contrat ; le cadre qui l'enveloppe est un calque de ce contrat-ci et publie la
sienne.

**Dimensionnement du composant.** `structure.sizing` publie le
comportement du composant lui-même, en valeurs de `width` et de `height`, et il
est toujours présent : c'est la première décision de qui l'intègre, et la
déduire d'une absence reviendrait à la deviner. Le vocabulaire est celui de
CSS, pas celui du panneau Figma, et chaque axe se lit séparément :

| menu Figma | liaison | valeur publiée |
| --- | --- | --- |
| `Hug` | — | `fit-content` |
| `Fill` | — | `stretch` |
| `Fixed` | une variable | la référence du token |
| `Fixed` | aucune | `stretch` |

La dernière ligne est la règle d'origine, devenue le repli : une largeur fixe
que rien ne nomme sert à aligner les variants d'un component set dans Figma, et
la publier imposerait une largeur de maquette à toutes les pages qui intègrent
le composant. **La liaison de variable est ce qui sépare les deux cas**, à la
règle commune. Une tuile dont le
design system nomme le côté n'est pas une commodité de maquette, et le token
l'emporte donc sur `stretch`.

Un axe en `Hug` ou en `Fill` ne lit aucune liaison : une variable y survivrait
au changement de menu et publierait une taille que le rendu n'a pas. Un axe
figé sans variable n'avertit pas non plus — le contrat ne perd rien, `stretch`
est une lecture assumée, et le réclamer avertirait sur presque tous les
component sets, dont le cadre fixe est la norme. Une variable désignée mais
introuvable avertit en revanche, comme partout ailleurs.

`stretch` nomme une intention, « occupe la place donnée » ; la technique
appartient au développeur, qui écrit `width: stretch`, `width: 100%` ou
`flex: 1` selon le contexte d'intégration. La clé est la propriété CSS et non
l'axe Figma, parce que la taille d'un composant n'est pas une propriété de
flux : il ne connaît pas le conteneur qui l'accueillera. Le dimensionnement est
lu sur le variant, jamais sur le wrapper de layout, et comparé sur toute la
matrice comme le reste du flux — la comparaison porte sur l'identifiant de la
variable, sans quoi deux variants de tailles différentes passeraient pour
identiques.

**Bornes de taille.** `bounds` publie `minWidth`, `maxWidth`, `minHeight`
et `maxHeight`, sur le composant à côté de `sizing` et sur chaque slot à côté de
`size`. Une borne ne se confond avec aucun des deux : le menu de dimensionnement
dit quelle place le layer prend, la borne dit jusqu'où cette place peut aller.
Elles coexistent, et le cas le plus courant est justement celui qu'aucune valeur
de `size` ne saurait écrire — un layer en `Fill` qu'un `max width` retient. Le
champ est donc indépendant du menu, lu sur la seule présence de la borne, et
chaque côté se lit seul : Figma laisse poser un `max width` sans `min width`.

Le silence suit la règle commune. Une borne appartient au design : c'est au
contrat de savoir la porter, non au designer de la retirer.

Le contrat n'a que deux propriétaires de bornes, le composant et un slot. Un
calque intermédiaire — le wrapper de layout, qui prête son flux au composant
sans jamais paraître comme un node — avertit donc au lieu d'être publié : sa
borne retient le contenu, et la porter sur le composant retiendrait le cadre.
Les bornes entrent dans la comparaison des variants comme le reste du flux, y
compris sur les calques d'icônes, qu'`icons.*.size` ne couvre que pour la taille.

##### Position absolue

Un layer en position `Absolute` sort du flux, et le contrat le PLACE. Il publie
`position: "absolute"`, les `constraints` — les bords auxquels il s'accroche, en
vocabulaire CSS (`left`/`center`/`right`/`stretch`/`scale`,
`top`/`center`/`bottom`/…) — et `inset`, sa distance à ces bords. La lecture
précède celle du flux, car une grille aussi porte des enfants en position
absolue.

`inset` a **une seule signification par clé** : la distance entre un bord du
parent et le bord correspondant du layer — les valeurs de `top`, `right`,
`bottom` et `left` en CSS, à écrire telles quelles. Les côtés publiés sont ceux
auxquels le layer s'accroche : un seul par axe pour `left`, `right`, `top` et
`bottom`, les DEUX pour `stretch`, `center` et `scale`, où le consommateur a
besoin des deux pour étirer, recentrer ou proportionner. Sans contrainte
lisible, l'ancrage est celui de Figma — le début de chaque axe.

Le calcul passe par le **centre** du layer, et c'est ce qui le rend juste pour un
layer tourné : Figma tourne autour du coin haut-gauche, CSS autour du centre.
La boîte CSS non tournée se déduit du centre réel (`relativeTransform` appliqué
à `(w/2, h/2)`), et `rotation` la ramène exactement où Figma la montre. La boîte
de référence est le cadre du parent, sans ajustement : aucun rôle de contour ne
consomme la boîte dans ce contrat, si bien que la « padding box » de CSS — celle
sur laquelle `right` et `bottom` se résolvent — coïncide avec elle. Le
consommateur pose `position: relative` sur le parent.

##### Rotation

Une rotation est une décision de design comme une autre — un badge incliné, un
chevron retourné —, et le contrat l'écrit : `rotation`, sur le composant comme
sur chaque layer publié, dans l'unité ET la convention de CSS. Figma compte les
degrés dans le sens trigonométrique, CSS dans le sens horaire : la valeur
publiée est l'opposée, prête pour `transform: rotate(…)`. L'origine est le
centre du layer, le défaut de `transform-origin`, et c'est aussi le point sur
lequel `inset` est calculé. Une rotation imbriquée se compose d'elle-même, comme
dans Figma.

Reste un écart que CSS ne comble pas, et une **notice** le dit : dans un auto
layout, Figma espace ses enfants d'après la boîte TOURNÉE, là où `transform` ne
change aucune boîte de flux. Le layer est rendu comme dans Figma, la place de
ses voisins peut différer de quelques pixels. Aucun geste n'est demandé — le
redresser lui retirerait sa rotation.

##### Grilles

Un enfant de **grille** publie sa place dans sa cellule : `columnStart` et
`rowStart` — les valeurs de `grid-column-start` et `grid-row-start`, donc
comptées à partir de 1 là où Figma indexe à partir de 0 —, `columnSpan` et
`rowSpan` (absents quand ils valent 1, la valeur neutre), `justifySelf` et
`alignSelf` (absents sur `AUTO`). Les ancres sont publiées sur tout enfant resté
dans le flux : Figma en pose une sur chacun, et les redéduire supposerait de
réimplémenter son placement automatique. Un enfant absolu n'en a pas — il est
hors de la grille.

**Sous une grille, c'est la cellule qui décide de la boîte.** Remplir sa cellule
est le DÉFAUT d'un enfant de grille — `stretch` en CSS, « Fill » dans le panneau
de Figma — et le menu de dimensionnement cesse d'y faire autorité : Figma
n'expose pas de remplissage dans une piste qui hug, pas plus qu'une piste `FLEX`
n'est valide sous un conteneur qui hug, et son API rend alors la taille CALCULÉE
du calque là où le panneau affiche « Fill ». Réclamer une variable dans ce cas
enverrait le designer vérifier un champ qui lui donne déjà raison.

Un enfant de grille ne publie donc sa dimension que s'il CITE une variable — une
décision qu'il porte malgré la cellule — et son absence ne se réclame jamais :
`columnSizes`, `rowSizes` et sa place disent quelle place il occupe. Un enfant
explicitement aligné fait exception, avec le même mot qu'en CSS : il ne s'étire
plus, sa dimension redevient la sienne, et la règle commune s'applique — figée
sans variable, elle avertit.

`columnSizes` et `rowSizes` portent la taille de chaque piste dans le
vocabulaire de `grid-template-*` : `"1fr"` (piste `FLEX`, avec son facteur),
`"fit-content(100%)"` (piste `HUG`) et, exception strictement structurelle,
`"120px"` pour une piste `FIXED`. La valeur fixe décrit la grille Figma sans
devenir un token ni rendre la couverture portable partielle. Une notice
explicite la présence de pixels et ne demande aucune modification au designer.
Un runtime Figma qui n'expose pas ces champs ne publie
rien et n'avertit de rien : une propriété absente n'est pas une valeur.

**Cette exception s'étend de la piste à la cellule, et là seulement.** Une piste
`HUG` est le seul endroit d'une grille où la cellule ne décide de rien : elle se
dimensionne sur son contenu, et n'a aucune valeur à publier —
`GridTrackSize.value` n'existe que sur `FIXED` et `FLEX`. La mesure ne vit alors
que sur l'enfant, et sans elle la piste retombe à zéro : le contrat décrirait une
grille que personne ne peut rendre. Un enfant dont TOUTES les pistes couvertes
sur un axe sont `HUG` publie donc sa taille résolue en pixels dans
`structuralSize`, sous la même notice sans geste et sans dégrader la couverture.
Une seule piste non `HUG` sous son étendue rend l'axe indécis : la place vient
d'ailleurs, et rien n'est publié.

`size` reste strictement tokenisé : une variable liée décrit le design system et
l'emporte toujours, `structuralSize` se tait alors. Publier les deux ferait
porter deux vérités au même axe. Aucun geste n'est demandé au designer — ces
enfants sont en `Fill` dans le panneau, et c'est Figma qui n'expose pas ce
remplissage sous une piste qui hug.

C'est aussi ce qui borne l'exception : elle tient à ce que le panneau affiche
« Fill », et un alignement explicite le retire. L'enfant reprend alors la règle
commune — sa dimension figée réclame une variable — et `structuralSize` se tait,
sans quoi le contrat publierait en pixels la valeur que son propre
avertissement, devenu faux, déclarerait absente.

Direction,
alignements, dimensions figées et propriétés de flux des slots sont comparés sur
toute la matrice — cadres de dépendance imbriqués compris ; une différence entre
variants produit une notice de compatibilité au lieu d'être généralisée depuis
le variant de référence ; les arbres exacts conservent les deux valeurs.

##### Propriétés non portables

**Ce que Figma porte et que le schéma ne sait pas écrire** avertit plutôt que de
disparaître, puisque le rendu, lui, en dépend. C'est la contrepartie de tout ce
qui précède : le contrat ne prétend pas décrire Figma en entier, mais il ne perd
rien en silence.

- `structure.layout` reste obligatoire, et `flex-row` en est le repli. Un node
  de layout sans auto layout est donc publié comme une rangée, et le warning le
  dit. La grille n'est pas concernée : elle est décrite ;
- les bornes d'un calque intermédiaire, entre le composant et ses slots, n'ont
  aucun propriétaire dans le contrat ;
- sur **chaque calque publié**, et sur lui seul, les propriétés à effet visuel
  qu'aucun champ ne porte : les **effets** (ombre, flou), l'**opacité**
  partielle, un **mask**, une peinture non unie (**dégradé**,
  image) en `fill` ou en `stroke`, plusieurs peintures « mixed » sur un même
  calque, un **blend mode** non neutre, un **pointillé**, et pour un texte :
  l'**alignement** dans une boîte qui n'est pas en `Hug`, la **casse**, la
  **décoration**, la **troncature**.

La **rotation** et la **distance d'un calque absolu à ses bords** ont quitté
cette liste : le contrat les ÉCRIT désormais (`rotation`, `inset`). Une
propriété publiée n'a rien à faire dans un relevé de ce qui manque — la
réclamer enverrait le designer redresser un layer que le développeur rend
incliné.

Le `mask` est le seul de cette liste dont le contrat ne perd pas la propriété
mais en **invente** une : la couleur du calque masquant entre normalement dans
`variants[].tokens`, et un développeur qui la peint recouvre le contenu qu'elle
était censée découper.

##### Passage à la ligne

Un auto layout en `layoutWrap: WRAP` publie
`wrap: true`, sur le composant comme sur n'importe quel conteneur de `children`.
C'est une propriété de flux, pas une dimension : elle reste au niveau haut même
quand `sizes` porte les dimensions. L'espace entre les LIGNES est un token,
`rowGap`, et suit la règle commune. Trois silences y répondent chacun à une
question distincte :

- **pas de wrap** — `counterAxisSpacing` reste lisible sans effet, comme un
  `itemSpacing` sous une grille. Rien n'est exporté et rien n'est signalé : il
  n'y a pas de deuxième ligne, donc rien ne manque ;
- **champ synchronisé** — Figma laisse les deux gaps liés tant que le designer
  ne les dissocie pas, et son API ne le dit pas : `counterAxisSpacing` ne renvoie
  jamais `null`, il renvoie la valeur d'`itemSpacing` sans liaison propre.
  `rowGap` reste donc absent, sans warning, et **son absence vaut `gap`** — la
  lecture de Figma comme celle de CSS ;
- **répartition « Auto »** (`counterAxisAlignContent: SPACE_BETWEEN`) — Figma
  répartit lui-même l'espace entre les lignes. Aucun champ ne sait l'écrire, à la
  différence de `justifyContent` sur l'axe principal : le warning le dit.

Slots dédupliqués (`label`, `label-2`…). Un calque rendable inattendu est inclus
tel quel, jamais supprimé silencieusement.

#### 9. Échantillon de maquette

`samples` capture ce que Figma **affiche** — le contenu textuel et les valeurs de
props réellement appliquées — pour le composant exporté comme pour chaque
composant enfant qu'il embarque, récursivement. Chaque entrée de `variants` en
référence une par `sample` ; le catalogue déduplique par égalité stricte du bloc
JSON, si bien qu'un component set dont tous les variants montrent le même contenu
n'en publie qu'une.

`figmaLayer` porte uniquement l’identité Figma du calque. Figma peut donner à un
calque texte non renommé le même nom que son contenu, mais cette égalité ne
change pas la responsabilité du champ : le contenu se lit dans `samples`, ou
nulle part.

**Ce que l'échantillon porte.** `args` donne les valeurs appliquées dans CE
variant : la visibilité réelle d'un slot optionnel — que `optional` ne disait pas,
il annonçait seulement qu'un slot PEUT être masqué — le texte d'une TEXT
property, le composant d'un INSTANCE_SWAP. `text` donne le contenu des slots
qu'aucune prop ne porte, situé par son chemin de slots ET par le nom de son
calque. `composes` donne l'usage de chaque dépendance : ses `args` aux clés
publiques de SON contrat, `overrides` pour ce que ce parent a écrit dedans, et
`swaps` pour les calques dont il y a remplacé le composant.

`args` est une projection fermée de l'API publique, jamais une copie libre de
`componentProperties`. Une clé n'entre que si le modèle de propriétés l'a
acceptée ; une collision ou une propriété rejetée ne réapparaît donc pas sous
son nom brut. Les valeurs portables sont celles de `VARIANT`, `BOOLEAN`, `TEXT`
et d'un `INSTANCE_SWAP` dont le composant peut être nommé. `SLOT` est omis : son
contenu libre n'est pas une valeur qu'un développeur peut reconstruire depuis
ce champ. Pour une dépendance, le moteur lit d'abord les propriétés de son owner,
puis celles de l'unique occurrence exposée qui appartient au wrapper élu lors
de l'export autonome. Zéro ou plusieurs occurrences correspondantes rendent ce
complément indécidable et il est omis, sans choisir la première.

Le **relevé positionnel nu** suit la visibilité **effective** de l'instantané : le
calque et tous ses parents jusqu'à la racine du composant EXPORTÉ doivent être
visibles — pas jusqu'à l'instance de dépendance, car un cadre optionnel masqué
au-dessus d'une dépendance ne montre rien de ce qu'elle contient.

La règle vise `ContractSample.text`, `SampleOverride.text` et `swaps`, et le
critère n'est pas « c'est du rendu » mais « ce relevé rapporte ce qu'un calque
porte SANS rapporter la condition qui le masque ». C'est ce qui explique
l'exception apparente d'`args` : le texte d'une TEXT property et le composant
d'un INSTANCE_SWAP sont bien affichés, mais le booléen qui les masque voyage
dans le MÊME `args`, et la reconstruction n'a donc rien à retirer pour être
juste. Filtrer `args` publierait au contraire `false` pour une prop qui vaut
`true`. Restent donc publiés sous un calque masqué : une valeur `false`
d'`args`, un `override.visible`, et l'entrée de la dépendance — ces valeurs
décrivent précisément l'état masqué que la reconstruction doit conserver.

La perte est assumée et se lit dans l'autre sens : un remplacement posé sous un
cadre que CE variant masque n'est pas publié par CE variant, et le variant qui
affiche ce cadre le publie. L'échantillon décrit un instantané, variant par
variant, pas la réunion de ce que la maquette pourrait montrer.

**La règle d'adressage.** On adresse par slot ce que ce contrat décrit, et par
nom de calque Figma ce qu'il ne décrit pas. Le nom de calque est la seule
identité que deux contrats partagent : celui de la dépendance publie `figmaLayer`
sur chacun de ses slots, et c'est la clé de jointure. D'où l'asymétrie —
`ContractSample` n'a pas d'`overrides`, `SampleInstance` n'a pas de `text` : on
n'a de slots que chez soi, on ne surcharge que chez autrui.

**La frontière avec la composition.** Le parent ne réexporte pas les internes
d'une dépendance. Ce que `overrides` publie n'en est pas : `InstanceNode.overrides`
répond « qu'est-ce que CE parent a changé ici », par opposition à ce que le
composant fournit. Un texte que le parent a saisi dans une dépendance n'est écrit
nulle part ailleurs. Deux champs seulement sont retenus, `characters` et
`visible` ; toute autre surcharge décrit du RENDU et signale plutôt un manque du
contrat normatif de la dépendance. Une surcharge de peinture y est
particulièrement trompeuse : remplacer une icône fait rapporter par Figma les
`fills` des `Vector` du nouveau tracé, et rien ne distingue ce relevé d'une
couleur posée à la main. C'est `swaps`, et lui seul, qui décrit le remplacement.

**Ce que `overrides` ne peut pas voir : `swaps`.** Figma ne rapporte pas un
remplacement d'instance — `NodeChangeProperty` ne contient pas `mainComponent` —
et la prop d'icône que les règles `@icons` fabriquent (`chessName`,
`iconLeftName`) n'a aucun porteur Figma, donc n'apparaît jamais dans
`componentProperties` ni dans `args`. `swaps` est l’unique propriétaire de cette
information et se lit en comparant l'instance à son composant maître,
**position par position** — la
structure d'une instance est isomorphe à celle de son maître hors contenu libre
d'un `SLOT`.

Cinq bornes le tiennent. La comparaison porte sur le composant PROPRIÉTAIRE et
non sur la variante : choisir une autre variante d'un même component set n'est
pas un remplacement, et le contrat de la dépendance décrit déjà ce choix. Le
relevé s'arrête sur une dépendance de la dépendance, dont l'échantillon est
ailleurs, et sous un calque déjà déclaré remplacé, dont plus aucune position ne
correspond au maître. Un `SLOT` coupe lui aussi la comparaison : son contenu
peut différer librement entre le maître et l'instance. Cette borne-là est
PROPRE au positionnel : la résolution NOMINALE d'une INSTANCE_SWAP — joindre
`componentPropertyReferences` à une propriété déclarée — traverse un `SLOT`,
sans quoi la clé quitterait `args` sans que `swaps` reprenne la main. Le relevé s'arrête enfin
sur un calque dont `args` répond déjà —
voir « Quand la dépendance expose son remplacement » plus bas. Enfin `masterPath`
nomme les calques du MAÎTRE, pas ceux
de l'instance : Figma renomme le calque qu'on remplace d'après son nouveau
composant, si bien que le chemin lu dans l'instance répéterait `component` et ne
joindrait plus rien — alors que le nom du maître est celui que le contrat de la
dépendance publie dans `icons.*.figmaName`. Un champ, une question : c'est le
nom distinct, et non `figmaPath`, qui empêche le doute qui a coûté `figmaLayer`.

**Quand la dépendance expose son remplacement.** Tout ce qui précède décrit le
cas où Figma n'offre aucun porteur. Lorsque la dépendance déclare une
INSTANCE_SWAP sur ce calque, elle en a un, et son contrat en tire une prop :
`mergeIconRules` pose alors `runtimeProp` sur la prop NATIVE plutôt que d'en
fabriquer une seconde, « pour ne pas obliger le consommateur à choisir entre deux
sources de vérité ». `args` répond donc, et `swaps` se tait — un même fait n'a
jamais deux propriétaires.

Encore faut-il que `args` réponde quelque chose de lisible. Pour une
INSTANCE_SWAP, `componentProperties` rend l'IDENTIFIANT du node placé (« 1:1 »),
jamais son nom : publié tel quel, il donnait une clé publique à une valeur que la
règle 1 interdit. La valeur publiée est donc le NOM du composant propriétaire,
résolu comme le fait déjà `propertyBindings.appliedValue` pour le composant
exporté — sans aucun aller-retour, le scan de composition connaissant le maître
de chaque instance rencontrée. Un remplacement qu'on ne sait pas nommer est
**omis** d'`args`, et `swaps` redevient alors le seul relevé : la règle 2
interdit d'inventer, elle n'autorise pas à perdre.

**Ce qu'il ne demande jamais.** L'échantillon n'avertit de rien, ne dégrade
jamais `meta.coverage.portable`, et n'entre dans aucun relevé de tokens — un
texte de maquette en forme de référence n'est pas un token. Ce qu'il ne sait pas lire, il
l'omet. En contrepartie, `args` est publié comme un **sous-ensemble**, et voici
ce qu'il ne sait structurellement pas porter :

- une prop d'une dépendance portée par son wrapper de dimensions quand Figma
  n'expose pas exactement une occurrence de ce wrapper — zéro ou plusieurs, la
  provenance est indécidable et TOUTES les props du wrapper s'omettent, là où
  `props` continue de les publier : la fusion porte sur les définitions, qui ne
  dépendent d'aucune occurrence ;
- une prop d'une dépendance dont l'owner n'a pas été indexé par le relevé de
  composition : `args` se tait plutôt que de répondre depuis une surface
  reconstruite à la volée, qui ignorerait le wrapper ;
- une prop d'icône synthétique (`iconLeftName`), fabriquée par les règles `@icons`
  sans component property Figma derrière : aucune valeur ne peut entrer dans
  `args`, et c'est précisément pourquoi `swaps` existe ;
- un remplacement dont le composant maître est illisible, qui vit sous un
  calque effectivement masqué, ou dans le contenu libre d'un `SLOT` — la
  maquette n'en donne aucune comparaison fiable ;
- une valeur en conflit entre deux calques d'un même variant — la clé est omise ;
- le second texte d'une feuille qui en porte plusieurs ;
- une dépendance sous un calque statiquement masqué, déjà absente de `composes`.

En cas de désaccord entre un échantillon et une donnée normative, **la normative
l'emporte** : l'échantillon décrit la maquette du jour de l'export.

**Le contenu d'une dépendance se lit en deux temps** : ses valeurs par défaut
dans SON contrat — l'échantillon du variant que `args` désigne — et les écarts
dans `overrides`. C'est la mécanique de Figma elle-même, composant plus
surcharges, et elle évite de recopier le contenu d'une dépendance dans chaque
contrat qui l'emploie.

**La reconstruction est un zipper récursif, pas une recherche globale.** Pour
chaque variant, le consommateur résout d'abord sa vue et son `sample`. Il applique
`args` et `text` à ce composant, puis rapproche chaque dépendance racine du slot
exact donné par `slotPath`. Dans une `SampleInstance`, les enfants de `composes`
se rapprochent des dépendances directes de leur propriétaire immédiat, dans
l'ordre, avec le couple `component` + `figmaLayer` ; deux occurrences homonymes
restent donc deux positions de la séquence. Le consommateur ouvre alors le
contrat de cette dépendance, choisit son variant depuis les valeurs connues de
`args`, applique son propre échantillon, puis superpose les `args`, `overrides`
et `swaps` du parent. Une valeur `false` est explicite ; une clé absente hérite
du défaut de la dépendance. La même opération continue jusqu'aux feuilles, sans
limite de profondeur arbitraire. Une adresse absente ou ambiguë fait omettre
l'atome indicatif concerné ; elle n'autorise ni une recherche par nom dans tout
l'arbre, ni la dégradation d'une donnée normative.

**Ce qu'il ne publie pas, faute d'apporter quoi que ce soit.** Les icônes du
composant exporté sont déjà dans `variantViews[].icons`, par vue exacte : leur
emplacement comme leur nom de calque. Celles d'une dépendance non plus, tant que
la maquette laisse celles que son contrat fournit — c'est SON échantillon qui
les décrit, et une seconde copie pourrait contredire la première. `swaps` ne
publie donc que l'écart : le calque du maître, et le composant que ce parent y a
mis à la place.

#### 7. Intention et documentation des props

L'intention et la documentation des props sont lues dans un **conteneur
Figma** — frame,
section ou groupe — nommé `<Nom>-Rules` (ex. `Button-Rules`), posé **sur la même
page** que le composant. Le rapprochement du nom ignore la casse et les espaces
(`button-Rules` et `Icon Button-Rules` conviennent) : une majuscule dans un nom
de calque n'est pas une intention de design, et ne doit donc bloquer aucun
export. Chaque règle est
une instance d'un composant de configuration (`ComponentConfiguration`) dont la
**variante** porte le tag et le calque `content` le texte :
- `@usage` (un), `@do`/`@dont` (répétables), `@pairs` (virgules) → `intent`.
  `@pairs` liste les composants du design system qui s'associent bien à
  celui-ci (ex. `Icon, Tooltip`) : un agent peut s'en servir pour composer ;
- `@prop` + calque `prop` (ex. `variant.contained`) → doc par valeur, rangée
  dans `props.<prop>.descriptions.<valeur>`. Une règle qui vise l'axe
  `State`/`Status` est rangée dans `stateModel.states.<état>.description` : cet
  axe est publié par `stateModel` et non par `props`, la documentation suit donc
  l'axe là où il vit. Un nom ou une valeur introuvable reste un warning.
- `@boolean` + calque `prop` (ex. `icon-left`) → description de la prop BOOLEAN,
  rangée dans `props.<prop>.description`. Le nom est normalisé comme les props
  exportées (`icon-left` → `iconLeft`) ; une cible absente ou non booléenne
  produit un warning et aucune prop n'est inventée.
- `@icons` → politique d'icône dans `icons` :
  - **Déclaration** — la variante de règle contient un calque texte `icon`
    (nom exact du calque graphique du composant), plus les calques
    `modifiable`, `OR` et `strict` ;
  - **Politique** — exactement un des calques `modifiable` / `strict` doit
    être visible : le premier autorise le remplacement de l'icône par le
    consommateur, le second impose celle de Figma ;
  - **Rapprochement** — uniquement par égalité exacte de nom avec un calque
    graphique de l'un des variants ; aucun rôle de position n'est deviné. Les
    occurrences répétées d'un même calque à travers la matrice sont résumées,
    tandis que plusieurs occurrences dans un même variant ou des liaisons de
    visibilité contradictoires produisent un warning ;
  - **Variants** — si le calque n'existe que dans une partie de la matrice,
    `icons.<clé>.variants` liste les combinaisons exactes d'axes où il est
    présent. Le champ est absent lorsqu'il existe dans tous les variants ;
  - **Emplacement** — `icons.<clé>.slot` nomme le slot de `structure.children`
    que l'icône remplit, et `icons.<clé>.size` son token de taille. Ces deux
    champs rendent une icône **auto-suffisante** : celle qui n'existe pas dans
    le variant de référence n'apparaît dans aucun slot, et sans eux le contrat
    dirait quand la rendre sans dire ni où ni à quelle taille. Le slot est celui
    de l'**enfant direct du node de layout qui contient le calque**, dans le
    variant concerné — la même attribution que `structure.children`, produite
    par un calcul unique. Deux icônes rangées dans le même enfant direct
    partagent donc son slot. Un calque situé hors de ce conteneur n'occupe aucun
    slot ; un slot ou une taille qui change selon les variants — y compris une
    taille présente ici et absente ailleurs — produit un warning et aucune
    valeur déduite ;
  - **Emplacement exact** — `variantViews[variants[].view].icons.<clé>.slotPath` situe l'icône
    dans l'arbre de CETTE combinaison, y compris lorsqu'elle est absente de la
    référence ou imbriquée à plusieurs niveaux. La clé renvoie au catalogue
    global `icons`, qui garde politique, prop runtime et taille ;
  - **Prop runtime** — une icône `modifiable` reçoit toujours une prop runtime
    qui dit QUELLE icône rendre. Si son instance lie nativement `mainComponent`
    à une `INSTANCE_SWAP`, cette prop fait autorité et aucune seconde prop n'est
    inventée. Sinon, le nom synthétique suit le BOOLEAN de visibilité quand le
    calque graphique lie `visible` à l'un d'eux (`iconLeft` → `iconLeftName`, qui
    se lisent alors en paire) ; sans cette liaison, il vient du calque lui-même
    (`chess` → `chessName`) et `visibilityProp` est absent. Une icône toujours
    visible est remplaçable comme une autre : l'absence de booléen n'est donc pas
    un défaut et ne produit aucun warning. Si le composant expose déjà une
    component property du même nom, aucune n'est remplacée et un warning demande
    un renommage. Une liaison `INSTANCE_SWAP` qui varie entre variants produit
    également un warning au lieu d'une seconde API concurrente.

  En résumé, trois responsabilités distinctes — et c'est bien parce qu'elles
  sont distinctes que la deuxième ne dépend pas de la première :

  | Qui | Contrôle | Défini où |
  |---|---|---|
  | Booléen Figma (`iconLeft`…) | **si** le calque s'affiche | liaison native `visible` dans Figma |
  | `INSTANCE_SWAP` ou prop runtime `<nom>Name` | **quelle** icône afficher | liaison native `mainComponent`, sinon ajoutée par l'exporteur |
  | `figmaName` | l'icône de **repli** | nom du calque Figma, utilisé quand la prop runtime est vide |
Convention uniforme (aucune logique par composant), lue **sans jamais écrire dans
Figma**. Les règles sont facultatives : leur absence laisse `intent: null` et
produit un diagnostic de documentation, sans réduire `meta.coverage.portable`.
Un `@prop` visant une prop/valeur inexistante produit un warning non bloquant.

##### Ce que le contrat ne dit pas d'une icône

Les trois responsabilités ci-dessus décrivent ce que le contrat **décide**. Une
quatrième existe, et elle appartient entièrement au repository consommateur :
**traduire un nom d'icône vers quelque chose qui se dessine.** Elle n'est écrite
nulle part ailleurs, et un repo qui la découvre à l'exécution la découvre trop
tard.

**Ce que le contrat garantit.** `icons.<clé>.figmaName` est le nom du calque
graphique dans Figma, tel quel. Autour de lui, le contrat dit **quand** rendre
l'icône (`variants`), **où** (`slot`, et `slotPath` par vue exacte), **si** le
consommateur a le droit de la remplacer (`policy`), par quoi il la remplace
(`runtimeProp`), et **quel carré elle occupe** (`size`, un renvoi de token comme
tous les autres).

**Ce qu'il ne garantit pas, et ne garantira pas.** Il ne nomme aucun jeu
d'icônes ; il ne porte aucune correspondance entre `figmaName` et l'identifiant
d'un tel jeu ; il ne dit rien de la taille du **glyphe à l'intérieur** du carré
qu'il donne. Ces trois décisions sont des choix de rendu du repository, au même
titre que sa police ou son moteur de style — et le contrat n'a aucun moyen de
les connaître. C'est la décision T3.1, qui a écarté pour cette raison un champ
`icons` de `ucm.config.json` : une correspondance écrite dans la configuration
aurait fait porter au format une question à laquelle seul le code répond.

*Ce que cela donne concrètement chez un consommateur*, et c'est l'ordre de
grandeur du travail attendu : le repository de référence résout ces trois points
en une vingtaine de lignes — un préfixe de style constant, une concaténation du
`figmaName` vers le nom du jeu, et un ratio du glyphe dans le carré que le
contrat fournit. Le ratio est une convention de CE repository, assumée comme
telle dans son propre commentaire ; rien dans le contrat ne l'impose ni ne la
contredit.

**La contrepartie de cette responsabilité est `ucm icons`.** Une responsabilité
qu'on confie sans la rendre visible est une responsabilité aveugle : la commande
énumère, triés et dédoublonnés, tous les `figmaName` que les contrats du
repository réclament, avec les contrats qui les citent — le nom seul ne suffit
pas à agir. **Elle liste ce qu'il y a à couvrir, jamais ce qui est couvert :**
elle n'a aucune idée de ce qu'est un jeu d'icônes ici, et juger sans le savoir
reviendrait à inventer la règle qu'elle prétend vérifier.

#### 8. Rendu sémantique et garde-fous

Le contrat publie aussi le mapping
générique des rôles vers les propriétés de rendu : `rendering.roles`, avec
`background` → `background-color`, `foreground` → `color`/`fill`, `border` →
`box-shadow`, `ring` → contour extérieur. Ce vocabulaire est **strictement le
même dans tous les contrats** : un mot y signifie partout la même chose, et
c'est ce qui permet de l'apprendre une fois pour toutes.

**Une clé de couleur n'est pas un rôle**, et les confondre obligeait le moteur à
avoir un avis sur le vocabulaire du design system. `rendering.keyRoles` porte
donc la part propre au composant : le rôle de chaque clé observée qui n'en porte
pas le nom — clés allongées comprises, dont le rôle est celui que leur dernier
segment déclare, et clés qui s'appellent comme un rôle sans en avoir la nature.
La règle reste sans logique par composant ; seules les clés observées changent
d'un contrat à l'autre, et un consommateur répond à « comment peindre cette
clé » en deux accès sans ambiguïté : `roles[keyRoles[côté][clé] ?? clé]`.

Les deux côtés — `keyRoles.fills` pour les clés de `variants[].tokens`,
`keyRoles.strokes` pour celles de `variants[].strokes` — sont séparés parce que
les clés le sont : les peintures et les contours vivent dans deux arbres, donc
dans deux feuilles de `colorKeys`, et deux tokens différents finissant par le
même segment peuvent porter la même clé courte de part et d'autre. Une table
unique en perdrait un en silence. Une clé dont le rôle porte déjà le nom reste
absente : `roles[clé]` répond pour elle, et un composant dont toutes les clés
nomment leur rôle ne publie aucun `keyRoles`.
Pour un rôle avec `fallback`,
les `cssProperties` sont le rendu candidat et le `fallback` le rendu
**recommandé** dès que la fidélité l'exige : un `ring` aligné `outside` se rend
en `box-shadow` (`0 0 0 <width> <color>`), qui épouse le `border-radius` et se
dessine hors du flux — il ne déplace jamais les éléments voisins.

**Aucun rôle de contour ne cite une propriété qui consomme la boîte.** Dans
Figma un `stroke` ne prend aucune place : il ne pousse ni son contenu ni ses
voisins, quel que soit son alignement. Une `border` CSS, elle, élargit
l'élément et décale tout ce qui l'entoure. Le rôle `border` se rend donc avec
`box-shadow`, et `align` en donne la forme —
`inside` → `inset 0 0 0 <width> <color>`, `outside` → `0 0 0 <width> <color>`,
`center` → la moitié de la largeur de chaque côté. Une largeur détaillée par
bord se rend en autant d'ombres. Quand plusieurs rôles visent `box-shadow` sur
un même calque — un `border` et un `ring` en focus — ils se composent en **une**
déclaration, séparés par des virgules, les `inset` d'abord. Toute propriété
pertinente sans variable liée → warning précis (calque + propriété), non
exportée, **export non bloqué**.
Le contrat ne publie **aucun index de ses tokens**. Cette liste se dérive du
contrat terminé et n’apporte aucune information propre.

Un consommateur qui a besoin de la liste la relève lui-même, et la règle est
celle que le moteur appliquait : balayer TOUT le contrat **sauf `samples` et
`meta`**. L'exclusion n'est pas cosmétique — un texte de maquette peut valoir
« {montant.total} » sans nommer aucun token, et un avertissement peut citer une
référence dans une phrase. Une référence se reconnaît à la chaîne **entière** :
un nom de style de texte reste une chaîne nue ; ses variables, elles, sont de
vraies références.

### Sortie

#### Fichier et exemple

`<IdentifiantCode>.contract.json` est téléchargé ou déposé par PR. Le champ
`name` conserve le nom Figma exact ; le fichier emploie son identifiant
PascalCase ASCII canonique (`Icon / Button` → `IconButton.contract.json`,
`2e bouton` → `Component2eBouton.contract.json`). Ce même identifiant nomme le
dossier, le composant React et son interface `<IdentifiantCode>Props`, sans
faire du nom d'affichage un identifiant TypeScript. Le contrat décrit une **API
unifiée** (wrapper + set comme un seul composant). Exemple Button :

```json
{
  "name": "Button",
  "meta": {
    "contractVersion": "…",
    "exportedAt": "2026-07-11T14:00:00.000Z",
    "diagnostics": [
      { "code": "UCM_PORTABLE_PROJECTION_WARNING", "severity": "warning",
        "message": "…" }
    ],
    "coverage": { "portable": "partial" },
    "figma": {
      "fileName": "DS AI LAB",
      "nodeId": "12:345",
      "url": "https://www.figma.com/design/<fileKey>/…?node-id=12-345"
    }
  },
  "props": {
    "color":    { "type": "enum", "values": ["primary","secondary"], "default": "primary" },
    "variant":  { "type": "enum", "values": ["contained","outlined","text"], "default": "contained",
                  "descriptions": { "contained": "Action la plus importante d'une page (parcours, upload…).",
                                    "text": "Action secondaire dans un conteneur déjà bordé (card avec stroke)." } },
    "disabled": { "type": "boolean", "default": false },
    "size":     { "type": "enum", "values": ["big","medium","small"], "default": "medium" },
    "iconLeft": { "type": "boolean", "default": true,
                  "description": "Affiche l'icône placée avant le libellé." },
    "iconLeftName": { "type": "icon", "policy": "modifiable", "visibilityProp": "iconLeft" },
    "iconRight":{ "type": "boolean", "default": true },
    "iconRightName": { "type": "icon", "policy": "modifiable", "visibilityProp": "iconRight" }
  },
  "figmaVariantLabels": {
    "axes": { "color": "Color", "variant": "Variant", "state": "State" },
    "values": { "color": { "primary": "Primary" }, "variant": { "contained": "Contained" },
                 "state": { "default": "Default" } }
  },
  "viewStructures": {
    "st1": { "layout": "flex-row",
      "sizing": { "width": "fit-content", "height": "fit-content" },
      "children": [
        { "slot": "icon", "figmaLayer": "arrow-left-long", "optional": true,
          "visibilityProp": "iconLeft", "size": "{components.icons.sizes.base}" },
        { "slot": "label", "figmaLayer": "Suivant" },
        { "slot": "icon-2", "figmaLayer": "arrow-right-long", "optional": true,
          "visibilityProp": "iconRight", "size": "{components.icons.sizes.base}" }
      ] }
  },
  "viewPaintPlacements": {
    "pp1": { "fills": { "background": [[]] } }
  },
  "variantViews": {
    "v1": { "structure": "st1", "paintPlacements": "pp1" }
  },
  "propertyBindingDefinitions": {
    "b1": { "prop": "iconLeft", "figmaPropName": "iconLeft#12:3",
      "target": "visible", "figmaPath": ["Icon left"] }
  },
  "variants": [
    { "nodeId": "12:346",
      "values": { "color": "primary", "variant": "contained", "state": "default" },
      "tokens": { "background": "{components.button.colors.primary}" },
      "view": "v1",
      "bindings": [{ "definition": "b1", "nodeId": "12:350" }],
      "sample": "s1" }
  ],
  "samples": {
    "s1": {
      "args": { "iconLeft": true, "iconRight": true },
      "text": [
        { "slotPath": ["label"], "value": "Suivant" }
      ],
      "composes": [
        { "slotPath": ["action", "button"], "figmaLayer": "Button",
          "component": "Button",
          "args": { "color": "info", "variant": "outlined", "label": true },
          "overrides": [
            { "figmaPath": ["sizeWrapperButton", "Suivant"], "text": "Compléter" }
          ] }
      ]
    }
  },
  "stateModel": {
    "axis": "state",
    "states": {
      "default": {},
      "hover": { "selector": ":hover", "description": "Le pointeur survole le bouton." },
      "focus": { "selector": ":focus-visible" },
      "press": { "selector": ":active" },
      "disable": { "selector": "[disabled]" }
    },
    "precedence": ["disable", "press", "focus", "hover", "default"]
  },
  "rendering": {
    "roles": {
      "background": { "kind": "paint", "cssProperties": ["background-color"] },
      "foreground": { "kind": "paint", "cssProperties": ["color", "fill"] },
      "icon": { "kind": "paint", "cssProperties": ["color", "fill"] },
      "border": { "kind": "stroke", "cssProperties": ["box-shadow"] },
      "ring": { "kind": "stroke", "cssProperties": ["outline-color", "outline-width"],
                 "fallback": "box-shadow" }
    }
  },
  "structure": {
    "view": "st1",
    "sizes": {
      "big":    { "gap": "…", "padding": { "x": "…", "y": "…" }, "radius": "…" },
      "medium": { "…": "idem" },
      "small":  { "…": "idem" }
    },
    "variantAxes": ["color","variant","state"]
  },
  "… un slot à plusieurs textes publie ses parts, dans SA structure de vue :": [
    { "slot": "label", "figmaLayer": "Text", "layout": "flex-column",
      "gap": "{components.alert.sizes.text-gap}",
      "children": [
        { "slot": "label", "figmaLayer": "Titre", "optional": true,
          "visibilityProp": "title" },
        { "slot": "label-2", "figmaLayer": "Description" }
      ] }
  ],
  "textStyles": {
    "label.large": {
      "figmaName": "Label/Large",
      "tokens": {
        "fontSize": "{typography.label.large.fontsize}",
        "fontWeight": "{typography.label.large.fontweight}",
        "lineHeight": "{typography.label.large.lineheight}",
        "letterSpacing": "{typography.label.large.letterspacing}",
        "fontFamily": "{primitives.fontfamily.base}"
      }
    }
  },
  "icons": {
    "arrowLeftLong": { "policy": "modifiable", "figmaName": "arrow-left-long",
                         "slot": "icon", "size": "{components.icons.sizes.base}",
                         "visibilityProp": "iconLeft", "runtimeProp": "iconLeftName" },
    "arrowRightLong": { "policy": "modifiable", "figmaName": "arrow-right-long",
                          "slot": "icon-2", "size": "{components.icons.sizes.base}",
                          "visibilityProp": "iconRight", "runtimeProp": "iconRightName" }
  },
  "intent": {
    "usage": "Action déclenchant une opération ; le choix des variantes dépend de l'importance et du contexte.",
    "dont": ["Utiliser size.big dans des écrans génériques.",
              "Juxtaposer plusieurs boutons color.primary sur une même vue."]
  }
}
```

**Une dimension géométrique ne se lit qu'à UN endroit, et lequel dépend du
composant.** Quand il expose un axe de tailles, `sizes` porte l'ensemble de ses
`gap`, `padding` et `radius` ; sinon ces trois champs restent au niveau haut de
`structure`. Les deux emplacements ne coexistent JAMAIS : un lecteur qui trouve
`sizes` n'a pas à consulter le niveau haut, et un lecteur qui ne le trouve pas
n'a pas à craindre qu'une valeur lui échappe ailleurs. Ce que le moteur en
déduit pour ses propres avertissements est
[de son ressort](../packages/plugin/SPEC.md#ce-que-lexport-écrit).

La typographie suit la même discipline d'adresse unique : rien n'en vit dans
`structure`. Le catalogue `textStyles` porte les styles, et
`variantViews[].typography` dit lequel s'applique où.

#### Composition et dépendances

`composes` liste les composants unifiés que celui-ci embarque — vide pour un
composant simple. Une instance ainsi déclarée n'est PAS parcourue : ses
calques, ses tokens et ses props appartiennent à son propre contrat. Le slot
correspondant de `children` la nomme par `composes`, sans relever ni sa taille
ni sa typographie. Tout `COMPONENT_SET` et tout `COMPONENT`
standalone sélectionné est exportable, même sans règles. Cette capacité ne le
transforme pas automatiquement en dépendance : le conteneur `<Nom>-Rules`
déclare qu'un contrat UCM autonome existe pour ce nom. Sans ce marqueur, un set
imbriqué reste parcouru comme wrapper ou détail d'implémentation du parent. Un
variant interne d'un set reconnu prend le nom du set. Le moteur charge toutes
les pages une fois avant le scan des marqueurs.

##### Cadre de dépendance

**Un cadre qui enveloppe une ou plusieurs dépendances.** Le slot peut ÊTRE
l'instance, ou l'envelopper : une Alert range son bouton dans un calque
« Action » dont l'auto-layout le centre et remplit la hauteur. Ce cadre
appartient à ce contrat-ci, pas au Button, et se décrit donc comme n'importe
quel conteneur — son `layout`, son `justifyContent`, son `alignItems`, sa
dimension figée, puis la dépendance dans `children`. Seul le calque qui EST
l'instance porte `composes`.

Leur NOMBRE ne change pas la règle : un cadre qui range trois liens publie trois
enfants, chacun avec son emplacement et son `composes`. Le contrat ne saurait
sinon ni où ils vont, ni combien il en faut.

La distinction n'est pas cosmétique : porter `composes` sur le cadre le ferait
passer pour le composant, et son `alignSelf` atterrirait sur un composant qui
publie déjà son propre `structure.sizing`, où une taille explicite neutralise
l'étirement. Le cadre disparaîtrait avec son alignement. Un cadre sans
auto-layout linéaire avertit au lieu de laisser deviner sa disposition.

`gap` décrit l'espace ENTRE des enfants : le cadre le publie dès qu'il en range
plusieurs. Un cadre à un seul enfant n'espace rien, et réclamer une variable pour
lui enverrait le designer relier une valeur qui ne se voit pas.

Une seule dépendance peut prêter sa `visibilityProp` au slot du cadre. À
plusieurs, la retenir masquerait les autres avec elle : le cadre n'en prend
alors aucune, et chaque branche publie la sienne.

```json
{ "slot": "action", "alignSelf": "stretch", "figmaLayer": "Action",
  "visibilityProp": "action", "optional": true,
  "layout": "flex-row", "justifyContent": "center", "alignItems": "center",
  "children": [
    { "slot": "button", "figmaLayer": "Button", "composes": "Button" }
  ] }
```

Ce que le cadre range À CÔTÉ de ses dépendances lui appartient tout autant : un
tag, un texte, un dessin y sont des calques de ce contrat-ci, décrits par la
règle commune, avec leur slot, leur typographie et leur visibilité. Ne publier
que les branches de dépendance les ferait disparaître alors que leurs couleurs
entrent dans `variants[].tokens` : le contrat annoncerait des couleurs qu'aucun
calque publié ne porte.

Un cadre dont AUCUNE branche exportable ne mène à une dépendance fait exception :
ses instances sont rangées sous un calque masqué, le contrat se replie sur le
seul nom du composant et n'ouvre aucun `children`. Les chemins de la typographie
des vues suivent cette même réponse, sinon ils viseraient des slots que
`structure.children` ne contient pas.

Le relevé couvre toute la matrice. Chaque
`variantViews[variants[].view].composes` se DÉRIVE de SON arbre exact et en
garde l'ordre et la cardinalité. Le champ global
`composes` en est l'union ordonnée à cardinalité maximale : une dépendance
conditionnelle n'est jamais perdue parce qu'elle manque au variant de
référence. Ces champs se dérivent du contrat terminé. La
séquence se LIT sur chaque arbre, et non dans l'ordre où l'extraction a rangé
ses trouvailles : celui-ci
dépend de l'ordonnancement des lectures asynchrones, et deux cadres frères
pourraient se doubler sans qu'aucun design ait changé. Le scan dit ce que Figma
contient ; seul `structure.children` dit où le développeur doit rendre quoi.

Une dépendance qu'aucun arbre exact n'a su situer — par exemple rangée sous un
calque masqué — sort donc des deux champs à la fois, jamais d'un seul, et un
warning la nomme. Le consommateur
comptant les occurrences de `composes` pour vérifier la parité du code, un
composant qui disparaît ainsi du contrat rendra sa parité rouge tant que le code
continuera de le rendre : c'est le diagnostic voulu, le contrat ne le demandant
plus.

Si la composition varie dans la matrice, une notice nomme les variants
concernés : `structure` reste la projection de référence, les vues cataloguées
portent les dépendances exactes de chaque combinaison, et le `composes` global
garantit que le graphe n'oublie aucune cible conditionnelle.

`figmaLayer` y nomme le calque de **l'instance**, jamais le cadre qui
l'enveloppe : c'est ce calque qu'on retrouve dans Figma.

```json
"composes": [
  { "component": "Button", "figmaLayer": "Button", "visibilityProp": "action" }
]
```

#### Métadonnées

`meta` porte la version du schéma (`contractVersion`), la date d’export, la
couverture portable, les diagnostics et la traçabilité Figma : nom du fichier,
id du nœud, clé du composant et URL lorsqu’elles sont disponibles.

`diagnostics` documente l’export, pas le composant. Chaque entrée porte un
`code`, la sévérité `warning` et un message en français adressé au designer.
Le champ est absent quand l’export n’a rien à signaler. Une perte portable rend
`coverage.portable` partiel ; une note ou un avertissement sans perte portable
ne le dégrade pas.

**`meta.figma.url` est OPTIONNEL, et son absence est un état normal.** Les
contrats produits aujourd’hui ne le portent pas — la raison tient au mode de
distribution du plugin et vit
[dans la spécification du moteur](../packages/plugin/SPEC.md#métadonnées).
Ce qu’un lecteur doit en retenir tient en une règle : **accepter les deux
formes.** Des contrats antérieurs portent l’URL, les contrats courants ne la
portent pas, et cet écart n’a JAMAIS incrémenté `contractVersion` : un champ qui
passe de « presque toujours là » à « jamais là » sans changer de type ne change
pas la forme du contrat. Un lecteur qui traiterait l’absence d’`url` comme une
anomalie refuserait tout export récent.

La traçabilité repose donc sur `meta.figma.nodeId` et `meta.figma.fileName`, que
le contrat porte toujours.

---

## Partie 2 — Export tokens

**But** : exporter toutes les variables locales en `tokens.json` DTCG, chaîne
d'alias préservée sur tous les tiers et tous les types, **modes de Brand Tokens
inclus**. Entrée de Style Dictionary v4.

**2. Résolution des alias (tous types)** — `valuesByMode[modeId]` = valeur
directe **ou** `{ type: "VARIABLE_ALIAS", id }`. Si alias → écrire une
**référence DTCG** `"{cible}"`, jamais la valeur finale. Vaut pour COLOR comme
FLOAT : `sizes.fontsize.base` sort `"{sizes.spacing.8}"`, pas `"8px"`. Les
feuilles (Primitives, Spacing) portent la valeur directe.

**3. Modes = marques** — la collection **Brand Tokens** utilise les modes comme
axe multi-marque (1 mode = 1 marque) : **non ignorés**. Stratégie actuelle (un
seul fichier) : `$value` = valeur du mode par défaut, et **tous** les modes portés
sous `$extensions["com.ucm.modes"]` (`{ nom-de-marque: valeur }`).
Rien n'est perdu, tout est visible d'un coup d'œil. Collections mono-mode :
juste `$value`. *(Évolution possible : un fichier DTCG par marque.)*

**4. DTCG** — chaque variable → `{ $value, $type }`, groupes = objets imbriqués.
Types : `COLOR`→`color` ; `FLOAT`→`dimension` (+`px`) **sauf** groupes sans
unité (`opacity`, `fontweight` / `font-weight`, `z-index`, `aspect-ratio`) →
`number` ; `STRING`→`string` ;
`BOOLEAN`→`boolean`.
Le scope Figma précis prévaut (`LINE_HEIGHT`, `FONT_SIZE`, `LETTER_SPACING`
restent des dimensions ; `FONT_WEIGHT` conserve son type Figma, souvent
`string`, que le transform de plateforme traduit en poids CSS). Lorsqu'une variable
est disponible dans tous les scopes, le repli compare chaque segment normalisé
du chemin en ignorant seulement ses tirets : un token `FLOAT` `Font Weight/Bold`
devient donc un nombre sans unité, tandis que `Font Weighted/Bold` reste une
dimension.
**Le type se décide sur la racine de la chaîne d'alias**, pas sur le token
courant : Figma garde le même `resolvedType` le long d'une chaîne, mais le nom
change à chaque maillon. Ex. `lineheight` alias `spacing` (des px) → `dimension`,
et non `number` : sans ça, un token `number` référencerait un token `dimension`
(incohérence). Exemple, chaîne préservée sur 4 niveaux :

```json
{
  "primitives":  { "terracota": { "600": { "$value": "#C1440E", "$type": "color" } } },
  "brands":      { "intencial": { "primary": { "600": { "$value": "{primitives.terracota.600}", "$type": "color" } } } },
  "brand-tokens":{ "primary": { "default": { "$value": "{brands.intencial.primary.600}", "$type": "color" } } },
  "components":  { "button": { "colors": { "primary": { "contained": { "default": {
    "background": { "$value": "{brand-tokens.primary.default}", "$type": "color" } } } } } } }
}
```

`normalizeName()` et `indexVariables()` sont partagés avec l'export de
contrat : les deux commandes nomment un token de la même façon. Une collision
de chemin ou feuille/groupe conserve la première variable, écarte l'autre
avec un warning, et refuse tout alias vers la cible écartée.

---

## Versions

La version actuelle du contrat est celle que publie `CONTRACT_VERSION`, dans
`packages/kit/src/format/version.ts` — l'unique endroit où elle est écrite.
`viewStructures`, `viewTypographies`, `viewIcons`, `viewComposes` et
`viewPaintPlacements` cataloguent séparément chaque partie exacte. Une entrée de
`variantViews` porte jusqu’à cinq renvois vers ces catalogues ; chaque entrée de
`variants` référence la vue correspondante par `view`, à côté de ses `tokens`,
`strokes` et placements de bindings. Deux parties ne partagent une clé que si
leur JSON est strictement identique, à l’ordre des clés près. Il n’existe ni
merge, ni héritage, ni valeur par défaut entre vues.

`propertyBindingDefinitions` porte la partie stable d’une liaison ;
`variants[].bindings` conserve sa cible exacte dans chaque COMPONENT.

`samples` catalogue à part ce que la maquette montre — textes, valeurs de props,
surcharges et remplacements d’instance dans les dépendances —, et chaque entrée
de `variants` le référence par `sample`. Il est le seul champ non normatif du
contrat. Il vit hors de `variantViews` pour que le contenu, volatil, ne fasse pas
éclater la déduplication des vues normatives.

Toute information exacte se lit dans une entrée de `variants`, la vue
qu’elle référence et ses placements de bindings. La projection de référence
`structure` reste disponible pour l’entrée générale du composant et les
dimensions par taille ; elle ne remplace jamais la vue exacte d’une variante.

Un consommateur ne doit jamais présumer qu’une version mineure est compatible :
il accepte uniquement les versions qu’il a explicitement auditées.

Toute modification de forme incrémente `meta.contractVersion` et adapte la
présente spécification, le schéma, les tests et les consommateurs concernés.

`tokens.json` ne porte pas encore de version de schéma propre. Cette limite est
suivie dans [ROADMAP.md](../ROADMAP.md).

La **12.0** ajoute trois champs et retire deux avertissements sans geste :
`ChildStructure.inset` (la place d'un calque hors du flux), `rotation` (sur le
composant et sur chaque calque publié) et `rendering.keyRoles` (le rôle de
chaque clé de couleur qui n'en porte pas le nom, un côté par arbre).
`rendering.roles` y devient strictement le vocabulaire partagé : il ne reçoit
plus de copie de descripteur par clé observée.
