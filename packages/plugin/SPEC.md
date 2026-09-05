# Unified Component Exporter — spécification

Ce document décrit le MOTEUR : ce que le plugin lit dans Figma, ce qu'il élit,
ce dont il avertit, et ce qu'il dépose sur GitHub. La forme de ce qu'il produit
est décrite dans [docs/FORMAT.md](../../docs/FORMAT.md).

> ⚠ **Scission en cours (T8.1, temps 1).** Ce document et
> [docs/FORMAT.md](../../docs/FORMAT.md) viennent d'une spécification unique,
> partitionnée **ligne à ligne, sans qu'un mot soit réécrit**. Les paragraphes
> qui parlaient des deux sujets à la fois sont pour l'instant **dans les deux
> fichiers** : `tests/scissionSpec.test.mjs` prouve qu'aucune ligne n'a été
> perdue et compte ce qui reste dupliqué. Le temps 2 résorbe ces doublons un
> paragraphe à la fois.

## Objet

Ce document est la référence du comportement actuel du plugin. Le pourquoi et
la répartition des responsabilités vivent dans [CONCEPT.md](../../CONCEPT.md).

Le plugin produit :

- un contrat JSON décrivant la partie visuelle d’un composant ;
- un export DTCG des variables locales, avec leurs alias et leurs modes.

Le moteur conserve la traçabilité Figma tout en exprimant la sémantique
visuelle dans un vocabulaire stable. Les assets et l’API applicative restent
du ressort du repository consommateur.

## Contexte technique

- Plugin Figma (Plugin API) : pas d'API Variables REST ni de Code Connect.
  `api.github.com` est autorisé pour le dépôt optionnel des artefacts via PR ;
- Tourne dans l'éditeur, produit des fichiers en téléchargement sans config
  valide, ou les dépose sur une branche GitHub dédiée avec une config valide.
- Deux commandes indépendantes qui partagent le même code Figma :
  **Export composant** (Partie 1) et **Export tokens** (Partie 2).
- Stack : TypeScript, `@figma/plugin-typings`, build esbuild. L'UI expose le
  statut GitHub, les deux commandes, la configuration, un journal, un retour
  en direct sur la sélection, et en pied de page la version de schéma que le
  bundle chargé produit — Figma peut servir un bundle plus ancien que celui du
  disque, et rien d'autre ne le dirait.

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

Les noms de collections et le nombre de niveaux d’alias sont libres. Le moteur
gère les chaînes profondes et les alias de tous types.

Aucune convention de nommage n'est imposée aux couleurs de variante. Le dernier
segment du token en est la **clé de base** ; ce qu'il peint se déduit du calque
qui le porte, et le contrat le publie dans `rendering.roles`. Un design system
qui nomme ses rôles (`…/background`, `…/foreground`, `…/icon`, `…/border`,
`…/ring`) voit sa déclaration l'emporter sur la déduction — c'est le seul moyen
de distinguer un `ring` d'un `border`.

Un design system reste également libre de peindre plusieurs surfaces d'un même
variant avec des variables dont le nom finit pareil : la clé s'allonge alors des
segments qui les séparent, et aucune couleur n'est perdue.

Le fichier Figma de référence utilise plusieurs niveaux — primitives, marques,
tokens sémantiques, composants et dimensions — uniquement pour éprouver cette
généricité. Sa structure n’est pas imposée aux autres design systems.

---

## Partie 1 — Export composant (moteur générique)

Décrit **n'importe quel** composant ou component set en lisant sa vraie
structure Figma.
**Rien n'est codé en dur sur un composant précis** : les règles « intelligentes »
sont auto-détectées (nom d'axe, valeurs, rôle de calque) et centralisées dans
`semantics.ts`. Button sert d'exemple de référence.

**Entrée** : exactement un `COMPONENT` ou un `COMPONENT_SET` sélectionné. Les
règles `<Nom>-Rules` enrichissent l'intention mais ne conditionnent pas la
fidélité de l'export. Un set clairsemé n'est pas complété artificiellement : le
champ `variants` publie uniquement les combinaisons réellement présentes et un
diagnostic nomme l'écart avec le produit cartésien des axes. Un consommateur
compose les enums avec cette liste exacte ; il ne présume jamais que leur
produit cartésien est valide.

### Algorithme

#### La règle commune

Plusieurs champs — gap, paddings, rayons, taille d'un slot, bornes, largeur d'un
stroke — répondent au même silence, cité plus bas sous ce nom :

- une valeur reliée à une variable se publie, comme référence de token ;
- une valeur figée qu'aucune variable ne nomme avertit et reste absente : un
  nombre brut n'est jamais contractuel, une variable liée l'est toujours ;
- une valeur neutre effectivement fournie par Figma — un gap, un padding ou un
  rayon à zéro — reste absente sans un mot, la publier n'apprenant rien.

Le geste demandé au designer est toujours de NOMMER la valeur, jamais de la
retirer du design.

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

La couleur publiée et l'avertissement sortent de la MÊME lecture, peinture par
peinture : la variable d'un paint est celle qu'il porte lui-même. Une peinture
sans effet ne publie donc pas plus sa couleur qu'elle ne réclame la sienne, et
un fill masqué relié ne couvre pas le fill visible posé à la main. Quand cette
lecture ne peut pas conclure, la liste du node reprend la main sans avertir :
perdre une couleur coûterait plus qu'un diagnostic manquant.

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

#### 3. Layout

Le **node de layout** d'un variant est le calque dont les
enfants directs deviennent ses slots. Il s'élit au score : le calque qui porte
le plus de dimensions complètes liées, la racine à défaut. Ce score dépend de la
racine d'où part la recherche, si bien que l'élection a lieu **une seule fois
par variant**, avec la même règle pour tous : depuis le wrapper de dimensions
quand le composant en possède un, sinon depuis le variant. Les slots, les slots
d'icônes et les chemins de `variantViews[variants[].view].typography` décrivent donc toujours le même
arbre. Un variant privé de ce wrapper est signalé plutôt que rattrapé en
silence.

Ce que l'élection écarte n'est pas oublié : un calque posé **à côté** du node
élu — un badge, un liseré, un second bloc — ne reçoit ni slot, ni typographie,
ni visibilité, alors que ses couleurs entrent bien dans `variants[].tokens`, relevé
sur le variant entier. Chaque calque écarté produit donc un avertissement.

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

**Un tracé n'est pas une boîte.** Sur un `VECTOR`, un `BOOLEAN_OPERATION`, un
`STAR` ou un `POLYGON`, la largeur et la hauteur sont celles que Figma calcule
sur la géométrie du chemin : c'est le DESSIN, pas une décision du design
system. Le contrat ne leur réclame donc aucune variable — la demander
enverrait le designer relier la bounding box d'un chemin de Bézier — et publie
la dimension quand une variable est bien liée, comme partout ailleurs. C'est
le même mécanisme que pour un enfant de grille, pour une raison voisine : la
dimension est déjà expliquée ailleurs.

La liste s'arrête là, et c'est délibéré : `RECTANGLE`, `ELLIPSE` et `LINE` en
sont exclus. Ce sont les formes dont le type ne dit rien de l'usage — une
surface, un liseré, un séparateur dont la hauteur est une vraie décision —, et
la règle « le type du node ne tranche pas » les vise nommément.

**Applicabilité avant liaison.** Un gap et des paddings n'existent que sous un
auto-layout, et une liaison de variable survit à sa désactivation. L'exporteur
tranche donc l'applicabilité **avant** de regarder les liaisons, sans quoi un
`itemSpacing` resté lié exporterait un écart que le rendu n'a pas. Deux cas
produisent chacun leur propre diagnostic, distinct de « aucune variable
reliée » :

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

#### 6. Structure

`children` = enfants directs réels du node de layout :
- calque **texte** → slot `label` (nom d'origine dans `figmaLayer`) ; son style
  est situé par la `typography` de sa vue (étape 5) ;
- calque **graphique désigné par une règle `@icons`** → slot `icon`, `optional:
  true`, `size` ;
- **conteneur** → slot décrit par `children`, récursivement, plus sa
  disposition et ses dimensions propres ; voir ci-dessous ;
- autre calque **graphique** → nom du calque comme slot, `optional: true`, `size`.

**Un dessin qu'aucune règle ne désigne avertit.** Le contrat n'exporte aucun
tracé : le seul moyen de dire « dessine ceci » est une règle `@icons`, qui nomme
l'icône à rendre. Un calque dont le sous-arbre ne porte ni texte, ni dépendance,
ni icône déclarée, mais bien un tracé, est donc publié avec sa place et ses
couleurs, et son dessin manque. C'est presque toujours l'icône qu'on a oublié de
déclarer, et le geste est le même dans les autres cas : la déclarer.

Le déclencheur est le TRACÉ, jamais l'absence de texte : un cadre vide ou une
surface colorée se décrivent entièrement par leurs tokens. Le message part une
seule fois par dessin, et nomme le calque le plus profond qui contienne encore
tout le dessin, celui que le designer déclarerait : « skull », jamais le
« Vector » que Figma a nommé pour lui ni le cadre qui l'enveloppe. Un composant
qui EST un dessin de bout en bout ne dit rien : une icône exportée pour
elle-même n'a aucune règle à se donner.

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

`layout`, `justifyContent`, `alignItems` et `wrap` sont relevés dès que le
conteneur est un auto layout linéaire ; `columns`, `rows`, `columnSizes`,
`rowSizes`, `columnGap` et `rowGap` dès qu'il est une grille. `gap` n'est relevé qu'à partir de deux
enfants — un conteneur qui n'en range qu'un n'espace rien. `padding` et `radius`
sont relevés sur chaque conteneur, à la règle commune. Pour un node sans
disposition, `layout` reste absent et un warning explique que la disposition
interne manquera — sauf autour d'un enfant unique, où il n'y a rien à décrire.

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

Le silence suit la règle commune. Une borne appartient au design : c'est au
contrat de savoir la porter, non au designer de la retirer.

Le contrat n'a que deux propriétaires de bornes, le composant et un slot. Un
calque intermédiaire — le wrapper de layout, qui prête son flux au composant
sans jamais paraître comme un node — avertit donc au lieu d'être publié : sa
borne retient le contenu, et la porter sur le composant retiendrait le cadre.
Les bornes entrent dans la comparaison des variants comme le reste du flux, y
compris sur les calques d'icônes, qu'`icons.*.size` ne couvre que pour la taille.

##### Position absolue

**Pourquoi un nombre, ici.** Un offset Figma ne se relie à aucune variable :
Figma ne le permet pas. Le geste que réclamait l'ancien avertissement n'existait
donc pas, et son seul effet était de laisser le développeur coller le layer dans
un coin. C'est la même exception que pour les pistes d'une grille, et elle a la
même forme : la valeur est publiée en pixels sous une **notice**, sans devenir
un token et sans rendre la couverture portable partielle.

Le calcul passe par le **centre** du layer, et c'est ce qui le rend juste pour un
layer tourné : Figma tourne autour du coin haut-gauche, CSS autour du centre.
La boîte CSS non tournée se déduit du centre réel (`relativeTransform` appliqué
à `(w/2, h/2)`), et `rotation` la ramène exactement où Figma la montre. La boîte
de référence est le cadre du parent, sans ajustement : aucun rôle de contour ne
consomme la boîte dans ce contrat, si bien que la « padding box » de CSS — celle
sur laquelle `right` et `bottom` se résolvent — coïncide avec elle. Le
consommateur pose `position: relative` sur le parent.

Les valeurs sont arrondies à deux décimales, comme celles d'une grille : les
dix-sept chiffres d'un flottant Figma feraient bouger l'artefact d'un export à
l'autre. Un runtime qui n'expose ni la géométrie du layer, ni celle de son
parent, ne publie rien et n'avertit de rien — mieux vaut une absence qu'un
`NaNpx`.

##### Rotation

Sous le centième de degré, rien n'est publié : Figma stocke des flottants, et
une transformation successive y laisse des résidus qu'aucun écran ne rend et
qu'aucun designer ne peut remettre à zéro.

Reste un écart que CSS ne comble pas, et une **notice** le dit : dans un auto
layout, Figma espace ses enfants d'après la boîte TOURNÉE, là où `transform` ne
change aucune boîte de flux. Le layer est rendu comme dans Figma, la place de
ses voisins peut différer de quelques pixels. Aucun geste n'est demandé — le
redresser lui retirerait sa rotation.

##### Grilles

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

La mesure est arrondie à deux décimales. Elle vient d'un calcul de Figma, dont
les dix-sept chiffres feraient bouger l'artefact d'un export à l'autre sans
qu'aucun design ait changé.

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

Ce relevé vit dans l'extraction, jamais dans un balayage à part : on n'avertit
que sur ce qu'on publie, et les entrailles d'une icône ou les calques d'une
dépendance ne regardent pas ce contrat-ci. Aucune valeur au défaut de Figma ne
produit de message : un `clip content` activé ne manque à personne, et un
rapport que le designer cesse de lire ne protège plus rien. C'est la seule
réserve, et elle se lit sur la valeur, jamais sur l'usage supposé du calque. Les
tracés internes d’une icône restent hors de la portée du relevé. Le seuil de
neutralité de la rotation est un centième de degré, très en dessous du premier
pixel visible et très au-dessus du bruit de flottant.

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

Sous le wrap, Figma scinde son champ gap en deux. Les messages emploient donc
« horizontal gap » et « vertical gap », les intitulés que le panneau affiche.

Slots dédupliqués (`label`, `label-2`…). Un calque rendable inattendu est inclus
tel quel, jamais supprimé silencieusement.

#### 9. Échantillon de maquette

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

**Une notice, jamais un avertissement.** Deux échantillons là où le design en
attendait un révèlent un libellé retouché dans un seul variant. Le constat suit
ses jumeaux sur la structure et la composition, et emprunte le même canal :
rien ne manque, rien n'est à corriger.

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

#### 8. Rendu sémantique et garde-fous

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

### Ce que l'export écrit

#### Le nom du fichier, et ce qu'il unifie

Le moteur ne choisit pas librement le nom de ce qu'il dépose : il projette le
nom Figma par `codeIdentifier`, l'unique autorité du kit sur cette question, et
n'écrit nulle part une seconde règle de nommage. La forme obtenue et les
exemples qui l'illustrent sont
[du format](../../docs/FORMAT.md#fichier-et-exemple) ; ce qui appartient au
moteur est qu'il conserve le nom Figma **intact** dans `name` à côté de
l'identifiant projeté. Aucune des deux valeurs ne se déduit de l'autre en
sécurité, et publier les deux évite au consommateur d'avoir à inverser une
normalisation qui perd de l'information.

**Ce que l'export unifie avant d'écrire.** Un composant se présente dans Figma
comme un `COMPONENT_SET`, parfois enveloppé d'un wrapper qui porte ses propres
component properties. Le moteur en publie UN contrat, pas deux : il élit une
surface publique unique — owner direct plus wrapper élu — et le contrat décrit
cette API unifiée. C'est une décision d'extraction, prise dans
`propertySurface.ts`, et le format n'en garde que le résultat.

Les dimensions géométriques ne figurent qu'à UN endroit : `sizes` les porte
dès que le composant expose un axe de tailles ; sinon `gap` / `padding` /
`radius` restent au niveau haut de `structure`. Cette question se tranche
**avant** de relever quoi que ce soit, et les avertissements suivent la même
réponse : dès qu'un axe de tailles existe, les dimensions du calque de
référence ne sont ni relevées ni signalées. Les signaler enverrait le designer
relier une variable sur un calque dont rien ne sera publié — et le message le
nommerait par un nom de layer commun à tous les variants du set, sans lui dire
lequel ouvrir. Toute la typographie appartient au catalogue `textStyles` et aux
usages exacts de chaque `variantViews`.

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

`gap` décrit l'espace ENTRE des enfants : le cadre le publie dès qu'il en range
plusieurs. Un cadre à un seul enfant n'espace rien, et réclamer une variable pour
lui enverrait le designer relier une valeur qui ne se voit pas.

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

#### Métadonnées

Le moteur écrit dans `meta.diagnostics` tout ce qu’il a eu à signaler en
lisant Figma, et rien d’autre : **un diagnostic parle de l’EXPORT, jamais du
composant.** La forme d’une entrée et la règle qui la relie à
`coverage.portable` appartiennent au format et sont décrites
[là-bas](../../docs/FORMAT.md#métadonnées) ; ce qui relève du moteur est ce
qu’il décide d’émettre.

Cette décision se prend en deux temps, dans `exportComponent.ts`. Le moteur
accumule d’abord ses constats sous forme de messages, puis les classe au moment
d’écrire — une perte de projection portable l’emporte toujours sur une simple
note, de sorte qu’un même texte relevé des deux côtés reste un point à
corriger. Les messages sont dédoublonnés par leur TEXTE : deux extracteurs qui
concluent la même chose ne le disent qu’une fois.

Le compte que le plugin affiche et que la pull request appelle
« avertissement » n’est pas ce catalogue entier : c’est la part qui demande un
geste au designer. `meta.diagnostics` porte tout, y compris ce dont il n’a rien
à faire.

**`meta.figma.url` est absent des contrats produits aujourd’hui, et c’est un
état normal du format.** L’URL se construit depuis `figma.fileKey`, que l’API ne
donne qu’aux plugins déclarant `enablePrivatePluginApi` — un drapeau réservé aux
plugins privés d’une organisation. Le plugin se distribue par la Figma Community
(T4.4, arbitrage dans `PISTES-EVOLUTION.md §2`), le drapeau est donc retiré du
manifest et la clé n’arrive jamais. `url` reste OPTIONNEL dans le schéma, sans
changement de version : un contrat produit avant cette décision le porte encore,
et un lecteur doit accepter les deux.

La traçabilité repose donc sur `nodeId` et `fileName`, que le contrat porte
toujours, et que le corps de la pull request annonce sur sa page de couverture —
c’est là que se constate si elle suffit à une revue. **L’absence de lien ne
produit aucun diagnostic** : elle n’est plus l’exception mais la règle, et un
constat que le designer ne peut pas corriger, répété à chaque export,
apprendrait à survoler la liste où vivent les gestes à faire.

---

## Partie 2 — Export tokens

**But** : exporter toutes les variables locales en `tokens.json` DTCG, chaîne
d'alias préservée sur tous les tiers et tous les types, **modes de Brand Tokens
inclus**. Entrée de Style Dictionary v4.

**1. Lister** —
```ts
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables   = await figma.variables.getLocalVariablesAsync();
```

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

`normalizeName()` et `indexVariables()` sont partagés avec l'export de
contrat : les deux commandes nomment un token de la même façon. Une collision
de chemin ou feuille/groupe conserve la première variable, écarte l'autre
avec un warning, et refuse tout alias vers la cible écartée.

---

## Partie 3 — Configuration et dépôt GitHub

La configuration est optionnelle et locale à la machine via
`figma.clientStorage`. Elle contient l'URL du repository, la branche de base,
les chemins des composants et des tokens, ainsi qu'un PAT fine-grained. Le PAT n'est
jamais écrit dans le document Figma, renvoyé à l'UI après sauvegarde, ni logué.
Il doit donner au repository cible les permissions **Contents: read/write** et
**Pull requests: read/write**.

L'en-tête expose en permanence l'état `connecté` / `non connecté` et un accès à
la page de configuration via une icône `gear` Font Awesome Free embarquée.
Le test `GET /repos/{owner}/{repo}` est automatique à l'ouverture et après
chaque sauvegarde. Le manifest n'autorise que
`https://api.github.com` pour GitHub.

Chaque commande conserve son périmètre :

- **Exporter le composant** → PR contenant uniquement
  `{componentsPath}/{IdentifiantCode}/{IdentifiantCode}.contract.json` ;
- **Exporter les tokens** → PR contenant uniquement
  `{tokensPath}/tokens.json`.

Pour un artefact modifié, le plugin lit la ref de base, crée la branche
`ucm-exporter/export-{component|tokens}-{YYYYMMDD-HHmmss}` (le type d'artefact
et les secondes évitent toute collision quand on exporte le contrat puis les
tokens dans la même minute), écrit le fichier avec l'API Contents puis
ouvre une PR vers la branche de base, puis l'ouvre dans le navigateur par
défaut (`figma.openExternal` : l'iframe de l'UI est isolée et ne peut pas
naviguer elle-même) — le libellé du bouton l'annonce, faute de quoi trois
exports d'affilée ouvrent trois onglets que rien n'avait laissé prévoir. Le
lien reste dans le journal pour y revenir. Si le
contenu est identique — la
comparaison ignore `meta.exportedAt`, régénéré à chaque export — aucune
branche ni PR n'est créée. Config absente/invalide ou erreur GitHub : repli
automatique vers le téléchargement local avec message explicite.

**« Identique » se juge à DEUX endroits : la branche de base, et les pull
requests d'export encore ouvertes.** Un artefact déposé et pas encore fusionné
n'est justement pas sur la branche de base ; ne regarder qu'elle rouvrait, pour
un réexport strictement identique, une seconde pull request en tout point
pareille à la première. Les deux genres d'artefact sont concernés : le doublon
ne demande qu'un chemin et deux exports. Le journal du plugin dit LEQUEL des
deux endroits a répondu, et donne le lien de la pull request quand c'est elle —
sans quoi « aucun changement » enverrait chercher sur la branche de base un
fichier qui n'y est pas encore, et le designer conclurait que son export s'est
perdu. Un contenu DIFFÉRENT pendant qu'une pull request d'export est ouverte
n'est pas bloqué pour autant : réexporter après avoir corrigé dans Figma est le
geste normal, et c'est Git qui signale le reste — deux branches qui modifient le
même fichier depuis la même base entrent en conflit à la seconde fusion.

L'API Contents omet le contenu des fichiers supérieurs à 1 Mo : dans ce cas,
le plugin lit le blob Git correspondant avant de comparer, afin de ne pas
créer une PR inchangée. Au-delà de la limite GitHub de 100 Mo, il n'essaie pas
de créer une branche et conserve directement le téléchargement local.

**Le corps de la pull request a deux zones, et la frontière compte.**
L'en-tête dit l'IDENTITÉ de ce qui est déposé : le chemin du fichier, et — pour
un contrat seulement — le schéma qu'il porte. La liste qui suit ne porte que des
GESTES à faire dans Figma.

C'est la page que le plugin ouvre juste après l'export : le designer
y lit ce qui n'a pas pu être décrit sans ouvrir le JSON ni le journal du plugin.
Les deux artefacts sont couverts par le même mécanisme — `tokens.json` n'a aucun
champ où transporter les siens, là où un contrat les garde aussi dans
`meta.diagnostics`. Un avertissement ne bloque jamais : seules les préconditions
arrêtent un export (cf. [CONCEPT.md](../../CONCEPT.md)).

**Le schéma annoncé est lu DANS le fichier déposé, jamais dans la constante du
plugin.** `Schéma de contrat : 12.0` est le seul champ qui décide si le fichier
entier est lisible par le repository — hors de la fenêtre que ses lecteurs
supportent, le contrat est refusé en bloc —, et il est enfoui au milieu d'un
diff de plusieurs milliers de lignes. Sur la couverture, celui qui décide de
fusionner le voit sans ouvrir le JSON, et les pull requests d'export restées
ouvertes disent lesquelles précèdent une bascule de version. Annoncer la
constante du plugin ferait de cette ligne un énoncé sur le PLUGIN déguisé en
énoncé sur le FICHIER : deux autorités pour la même chose, dont le désaccord
serait muet. `tokens.json` n'en reçoit aucune — c'est un arbre DTCG, il ne porte
aucun schéma UCM. Un contrat dont la version est illisible la voit annoncée
telle quelle, et un contrat qui n'en porte aucune le dit : le contrôle du
repository le refusera pour champ absent, et la cause se lit ici en une ligne.

Chaque avertissement nomme l'élément Figma concerné avec l'intitulé que Figma
affiche, dit ce qui manquera au développeur, puis le geste à faire dans Figma.
Les trois sont exigés : un constat qui ne nomme aucun geste est une note, et
une note n'entre pas dans la pull request. Elle reste dans `meta.diagnostics`,
sous le code `UCM_EXPORT_INFO`, et dans le journal du plugin. La raison tient en
une phrase : une liste dont la conclusion est toujours « rien à faire » apprend
à son lecteur qu'elle se survole, et il survolera ensuite celles qui demandent
un geste. La règle et le vocabulaire vivent dans
[CONTRIBUTING.md](../../CONTRIBUTING.md).

**Un avertissement arrive inerte dans la page GitHub.** Le message cite les
intitulés de Figma tels quels, et GitHub lit dans certains d'entre eux autre
chose que le designer : `@icons`, nom d'une variante de règle, y devenait le
profil d'un inconnu — notifié à chaque export — au lieu du mot à taper dans le
composant, et un calque nommé `#12` renverrait de même à une issue. Ces formes
sont donc publiées en `code`, seule zone que l'autoliaison de GitHub épargne :
le message reste celui que le journal du plugin affiche, et le designer y lit
le nom exact qu'il doit écrire.

Tous les champs de configuration sont validés et les chemins restent
relatifs. Aucune branche ne survit à un export qui n'a pas ouvert de PR : si
le commit ou la PR échoue, la branche créée est supprimée avant le repli
local.

---

## Hors périmètre MVP

Pas d'écriture dans le document Figma, pas d'auto-merge, pas de
multi-composant en une commande, pas de scoring. Aucun domaine réseau autre que
GitHub API déclarée dans le manifest.

---

## Versions

Toute modification de forme incrémente `meta.contractVersion` et adapte la
présente spécification, le schéma, les tests et les consommateurs concernés.
