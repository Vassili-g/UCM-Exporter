# Unified Component Exporter — spécification

## Objet

Ce document est la référence du comportement actuel du plugin. Le pourquoi et
la répartition des responsabilités vivent dans [CONCEPT.md](./CONCEPT.md).

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
  statut GitHub, les deux commandes, la configuration, un journal et un retour
  en direct sur la sélection (un Component Set sans règles est signalé avant
  tout export).
- **`normalizeName()` est commune aux deux commandes** :
  `Brand Tokens/Primary/default` → `brand-tokens.primary.default`
  (`/`→`.`, espaces d'un segment → `-`, minuscules). Un token s'écrit donc
  pareil dans `tokens.json` et dans un contrat — les `tokensUsed` de la Partie 1
  recoupent la Partie 2.
- **Références de tokens entre accolades** : dans un contrat, un token est cité
  comme RÉFÉRENCE `"{chemin.du.token}"`, jamais comme chemin nu ni valeur
  aplatie — même syntaxe que les références DTCG de `tokens.json`. Les accolades
  sont un simple enrobage autour du nom produit par `normalizeName()` ; un
  consommateur retire `{…}` avant de résoudre. Un nom de **text style** n'est
  pas un token ; en revanche, les variables liées au style sont exportées comme
  références dans `textStyles.*.tokens` et entrent dans `tokensUsed`.

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

Décrit **n'importe quel** component set en lisant sa vraie structure Figma.
**Rien n'est codé en dur sur un composant précis** : les règles « intelligentes »
sont auto-détectées (nom d'axe, valeurs, rôle de calque) et centralisées dans
`semantics.ts`. Button sert d'exemple de référence.

**Entrée** : un `COMPONENT_SET` sélectionné (`selection[0].type ===
"COMPONENT_SET"`, sinon erreur UI explicite) **portant des règles** dans un
conteneur `<Nom>-Rules` (sinon export bloqué, cf. étape 7) et dont toutes les
combinaisons de valeurs d'axes existent réellement. Si une combinaison manque,
l'export est bloqué avant l'extraction. Le message montre jusqu’à cinq variants
présents, jusqu’à cinq combinaisons absentes, puis explique pourquoi ces
combinaisons seraient pourtant accessibles comme props indépendantes.
Une exception volontaire n'est pas inventée silencieusement : le schéma actuel
décrit des props indépendantes et ne sait pas exprimer une combinaison interdite.

### Algorithme

**1. Props** — traduire chaque propriété : `VARIANT` → enum, `BOOLEAN` →
boolean, `TEXT` → string. Deux règles auto-détectées :
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

**2. Tokens de variantes** — après le pré-vol de complétude, parcourir **tous**
les variants du produit cartésien des axes. Pour chacun, relever les tokens liés (`boundVariables.fills` et
`.strokes` sur tout le sous-arbre), rangés par **clé**, dont la base est le
dernier segment du token. Un composant unifié imbriqué n'y contribue rien : ni son contenu, ni le
calque de l'instance elle-même, dont le fond appartient à son propre contrat.
Le relever ferait entrer dans `variantTokens` et dans `tokensUsed` une couleur
que ce contrat-ci ne peint pas — et, sur une clé partagée, évincerait la sienne. Un sous-arbre `visible === false` est ignoré, sauf si sa visibilité
est liée à une prop de composant ou à une variable : il peut alors être rendu
dans une autre configuration et reste exporté. Un sous-arbre statiquement
masqué qui portait des variables produit un warning sur sa racine.

La clé **identifie** la couleur ; elle ne dit pas ce qu'elle peint. Ce que la
couleur peint se lit sur le **calque qui la porte**, jamais sur son nom : un
`fill` sur un texte est un `foreground`, sur un calque désigné par une règle
`@icons` un `icon`, ailleurs un `background` ; un `stroke` est un `border`, et
c'est son `align` — déjà publié sur la feuille — qui dit au consommateur de le
dessiner en bordure ou en `box-shadow`. Une clé qui ne nomme aucun rôle partagé
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

**Une clé que deux couleurs partagent s'allonge.** Deux calques d'un même
variant dont les variables finissent par le même segment ne se disputent plus
rien : la clé garde ce segment comme BASE et lui ajoute les segments du chemin
qui **séparent** les deux couleurs. `…info.userinput.colors.background` et
`…info.divider.colors.background` deviennent `userinput.background` et
`divider.background` — `colors`, commun aux deux, n'apporte rien et reste
dehors. Le design system nommait déjà ces surfaces distinctement ; c'est
l'export qui tronquait au dernier segment, et le renommage qu'il réclamait
compensait un défaut du moteur.

Le choix des segments obéit à une règle unique, décidée **une seule fois pour
tout le composant** : parmi les sélections qui séparent les couleurs
**cohabitant dans une même feuille**, on retient celle qui produit **le moins de
clés distinctes**. C'est ce qui garde une coordonnée de variant hors de la clé —
trente couleurs `…<color>.<variant>.<state>.background` qui ne se côtoient jamais
gardent une seule et même clé, et seule une surface qui les côtoie vraiment s'en
détache. Une clé allongée contient donc un point, et une clé simple jamais : un
segment de token n'en contient aucun. La clé d'un token est la même dans toutes
les feuilles.

Ce qui reste ouvert : le contrat dit COMMENT peindre chaque clé, pas SUR QUEL
calque. Situer chaque surface peinte dans `structure.children` demande
l'adressage par chemin de slots, extension non engagée suivie dans
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md). Deux couleurs **empilées sur un
même calque** sont publiées toutes les deux, mais le contrat ne dit pas laquelle
est au-dessus : un warning le signale.
Chaque feuille décrit indépendamment l'état visuel complet du variant Figma :
si un rôle est absent de la feuille d'un état dans `variantTokens` ou
`variantStrokes`, cela signifie toujours **« ne pas rendre ce rôle dans cet
état »**. Un consommateur ne doit jamais fusionner implicitement cette feuille
avec celle de l'état `default`.
Résolution : `VariableAlias.id` → `getVariableByIdAsync(id).name` →
`normalizeName()` → enrobage en référence `{…}`. Pour un rôle porté par un
`fill`, la feuille contient la référence du token. Un id de variable ou sa
collection introuvable produit un warning contextualisé par le premier calque
concerné et aucune référence n'est écrite. Les strokes sont rangés
séparément dans `variantStrokes` :

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
liés au même token. Une représentation absente, partielle ou asymétrique
produit un warning et vaut `null` ; elle n'est jamais remplacée par une valeur
brute ni par le premier côté trouvé. Les strokes vivent dans un arbre séparé
(`variantStrokes`) pour que les feuilles de `variantTokens` restent de pures
références chaînes — une structure stable pour ses consommateurs. Les deux
arbres sont nichés selon `variantAxes` :

```json
"variantAxes": ["color", "variant", "state"],
"variantTokens": {
  "primary": {
    "contained": { "default": { "background": "…", "foreground": "…" },
                   "focus":   { "background": "…", "foreground": "…" } },
    "outlined":  { "default": { "background": "…", "foreground": "…", "border": "…" } },
    "text":      { "default": { "foreground": "…" } }
  },
  "secondary": { "…": "même structure" }
}
```

```json
"variantStrokes": {
  "primary": {
    "contained": { "focus": { "ring": { "color": "…", "width": "…", "align": "outside" } } }
  }
}
```

**3. Layout** — le **node de layout** d'un variant est le calque dont les
enfants directs deviennent ses slots. Il s'élit au score : le calque qui porte
le plus de dimensions complètes liées, la racine à défaut. Ce score dépend de la
racine d'où part la recherche, si bien que l'élection a lieu **une seule fois
par variant**, avec la même règle pour tous : depuis le wrapper de dimensions
quand le composant en possède un, sinon depuis le variant. Les slots, les slots
d'icônes et les chemins de `variantTypography` décrivent donc toujours le même
arbre. Un variant privé de ce wrapper est signalé plutôt que rattrapé en
silence.

Ce que l'élection écarte n'est pas oublié : un calque posé **à côté** du node
élu — un badge, un liseré, un second bloc — ne reçoit ni slot, ni typographie,
ni visibilité, alors que ses couleurs entrent bien dans `variantTokens`, relevé
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
Une dimension composée n'est exportée que si une représentation **complète** se
résout : gauche + droite pour `padding.x`, haut + bas pour `padding.y`, largeur
+ hauteur pour la taille d'un slot, et `cornerRadius` ou les quatre coins pour
le rayon. Une représentation partielle produit un warning et vaut `null` (ou
reste absente pour la taille d'un slot) : le contrat n'affirme jamais une
dimension que Figma ne prouve pas.

**Les côtés, eux, peuvent différer** (7.0). Quand tous citent la même variable,
le champ garde sa forme courte — une référence — et le contrat d'un composant
déjà correct ne change pas. Quand ils en citent plusieurs, le contrat publie le
DÉTAIL par côté au lieu de tout perdre : `padding.x` devient
`{ "left": "{…}", "right": "{…}" }`, `radius` devient
`{ "topLeft", "topRight", "bottomRight", "bottomLeft" }`, et la largeur d'un
stroke `{ "top", "right", "bottom", "left" }`. Le design system nomme déjà ces
variables séparément ; exiger une variable unique demandait au designer
d'aplatir une décision qui lui appartient. La règle du groupe complet, elle, ne
bouge pas : un seul côté relié ne publie toujours rien, et le contrat resterait
sinon en désaccord avec l'élection du node de layout, qui compte les mêmes
groupes.

La taille d'un slot n'entre pas dans cette liste : ses deux axes ne sont pas
deux côtés d'un même champ, et deux variables y décrivent une dimension que le
contrat ne saurait pas écrire. Elle garde donc l'exigence d'une variable unique. Une valeur neutre par défaut effectivement fournie par Figma (par
exemple `0` pour un gap, un padding ou un rayon) reste elle aussi absente, mais
ne produit pas de warning : la demander comme token n'ajouterait aucune
information au rendu.

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
texte et chaque variant par `variantTypography`. Le contrat couvre ainsi toutes
les tailles, pas seulement celle instanciée par défaut. Hypothèse assumée : les dimensions ne varient que selon
l'axe de tailles — un représentant par taille suffit ; si un design system
faisait varier un padding selon un autre axe, le contrat ne le verrait pas.

**4. Modèle d'interaction** — lorsqu'un axe `State` ou `Status` est présent,
le contrat ajoute `stateModel` avec le déclencheur et, si une règle `@prop` la
déclare, la description de chaque état connu :
`hover` → `:hover`, `focus` → `:focus-visible`, `press` → `:active`,
`disable`/`disabled` → `[disabled]`. La priorité générique est
`disable > press > focus > hover > default`. Un état inconnu reste exporté
avec un déclencheur `null` et un warning. Les `selector` visent
l'implémentation CSS de **production** (pseudo-classes) ; l'outil de test
froid, en styles inline, reproduit les mêmes états via des événements.

**5. Typographie** — chaque calque texte de chaque variant doit porter un text
style Figma unique. Le moteur lit l'objet `TextStyle`, conserve son nom exact
dans `textStyles.<clé>.figmaName`, puis résout ses `boundVariables` :
`fontFamily`, `fontSize`, `fontWeight` (fallback `fontStyle`), `lineHeight` et
`letterSpacing`. La clé du catalogue est le nom normalisé du style ; aucun lien
vers les tokens n'est déduit de ce nom. Chaque propriété non liée produit un
warning et n'est jamais remplacée par une valeur brute.

`structure.variantTypography` reprend la même profondeur et le même ordre
d'axes que `variantTokens`. Chaque feuille liste `{ slotPath, style }` pour
situer le style de chaque texte dans la structure. `slotPath` est une liste de
slots depuis `structure.children` jusqu'à la part concernée. Le catalogue ne
contient que les styles réellement utilisés ; ses références alimentent
`tokensUsed`. Un layer sans style, un style introuvable ou deux noms normalisés
en collision avertissent et l'usage ambigu reste absent.

**6. Structure** — `children` = enfants directs réels du node de layout :
- calque **texte** → slot `label` (nom d'origine dans `figmaLayer`) ; son style
  est situé par `variantTypography` (étape 5) ;
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
`variantTypography` et les signatures de comparaison des variants : un second
calcul finirait par viser un slot que `structure.children` ne contient pas.

Un conteneur publie **tous** ses calques rendables, jamais une sélection : un
titre, une description, un dessin voisin et un tag sont tous des calques de ce
contrat-ci. Le taire ferait annoncer au contrat des couleurs qu'aucun calque
publié ne porte, puisque `variantTokens` les relève sur le variant entier.

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
sont relevés sur chaque conteneur, à la règle commune : une valeur neutre reste
absente sans un mot, une valeur écrite à la main avertit. Pour un node sans
disposition, `layout` reste absent et un warning explique que la disposition
interne manquera — sauf autour d'un enfant unique, où il n'y a rien à décrire.

Les parts sont nommées par la règle qui nomme déjà les slots (`label`,
`label-2`…) : aucune heuristique sur le nom du calque, et `figmaLayer` conserve
« Titre » ou « Description » pour les distinguer.

L'arbre textuel est comparé sur toute la matrice. Une différence de cardinalité,
d'ordre, de nom Figma ou de disposition avertit en nommant les variants ; le
contrat continue de décrire le variant de référence et ne fusionne jamais des
arbres incompatibles par supposition.

`icons.<clé>.slot` continue de nommer un slot de **premier niveau**, y compris
pour une icône imbriquée dans un slot à parts.

Nommer le slot d'icône par son rôle le rend **stable sur toute la matrice** :
des icônes qui s'excluent entre variants (`circle-info` en info, `circle-check`
en success) partagent un seul slot, là où leurs noms de calques en auraient
inventé un par variant. `children` décrivant le variant de référence, seul le
premier aurait survécu. Le nom Figma reste dans `figmaLayer`, et `icons` fait
foi sur l'icône à rendre dans chaque combinaison d'axes.

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

**Alignement Flex (4.4).** Sur un auto-layout `HORIZONTAL` ou `VERTICAL`, le
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

**Dimensions figées des slots (4.8).** Le relevé vise **tous** les slots, texte
compris, et se fait axe par axe : un axe en `Hug` ou en `Fill` est déjà décrit
et ne réclame rien, un axe figé doit citer une variable. `size` porte alors la
référence seule quand les deux côtés sont identiques — le carré des icônes — et
`{ "width": "…", "height": "…" }` sinon, chaque côté figé nommant le sien. Une
dimension figée sans variable produit un avertissement et reste absente : c'est
ce qui autorise à lire une absence comme un `Hug`. Seul le calque qui EST une
dépendance composée échappe au relevé, sa taille appartenant à son propre
contrat ; le cadre qui l'enveloppe est un calque de ce contrat-ci et publie la
sienne.

**Dimensionnement du composant (4.8, 5.2).** `structure.sizing` publie le
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
le composant. **La liaison de variable est ce qui sépare les deux cas** — le
même signal que pour un gap, un padding ou la taille d'un slot : un nombre brut
n'est jamais contractuel, une variable liée l'est toujours. Une tuile dont le
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

**Bornes de taille (5.3).** `bounds` publie `minWidth`, `maxWidth`, `minHeight`
et `maxHeight`, sur le composant à côté de `sizing` et sur chaque slot à côté de
`size`. Une borne ne se confond avec aucun des deux : le menu de dimensionnement
dit quelle place le layer prend, la borne dit jusqu'où cette place peut aller.
Elles coexistent, et le cas le plus courant est justement celui qu'aucune valeur
de `size` ne saurait écrire — un layer en `Fill` qu'un `max width` retient. Le
champ est donc indépendant du menu, lu sur la seule présence de la borne, et
chaque côté se lit seul : Figma laisse poser un `max width` sans `min width`.

Le silence suit la règle commune, celle du gap, du padding et de la taille d'un
slot : **une borne reliée à une variable se publie, une borne écrite à la main
avertit**. Le geste demandé au designer est de nommer la borne — jamais de la
retirer. Une borne appartient au design ; c'est au contrat de savoir la porter,
et l'avoir tue puis fait retirer était une limite du schéma déguisée en
correction de maquette.

Le contrat n'a que deux propriétaires de bornes, le composant et un slot. Un
calque intermédiaire — le wrapper de layout, qui prête son flux au composant
sans jamais paraître comme un node — avertit donc au lieu d'être publié : sa
borne retient le contenu, et la porter sur le composant retiendrait le cadre.
Les bornes entrent dans la comparaison des variants comme le reste du flux, y
compris sur les calques d'icônes, qu'`icons.*.size` ne couvre que pour la taille.

Un layer en position `Absolute` sort du flux, mais n'en disparaît plus : le
contrat publie `position: "absolute"` et les `constraints` — les bords
auxquels il s'accroche, en vocabulaire CSS (`left`/`center`/`right`/`stretch`/
`scale`, `top`/`center`/`bottom`/…). Sa DISTANCE à ces bords reste hors du
contrat : un offset Figma ne se relie à aucune variable, et un nombre écrit à
la main n'est jamais contractuel. Un avertissement le dit. La lecture précède
celle du flux, car une grille aussi porte des enfants en position absolue.

Un enfant de **grille** publie sa place dans sa cellule : `columnStart` et
`rowStart` — les valeurs de `grid-column-start` et `grid-row-start`, donc
comptées à partir de 1 là où Figma indexe à partir de 0 —, `columnSpan` et
`rowSpan` (absents quand ils valent 1, la valeur neutre), `justifySelf` et
`alignSelf` (absents sur `AUTO`). Les ancres sont publiées sur tout enfant resté
dans le flux : Figma en pose une sur chacun, et les redéduire supposerait de
réimplémenter son placement automatique. Un enfant absolu n'en a pas — il est
hors de la grille.

Une grille ne dispense aucun calque de la règle commune. Un enfant qui remplit
sa cellule est en `Fill` : sa dimension est déjà décrite par l'absence, et rien
ne lui est réclamé. Un enfant qui porte SA dimension la porte pour de bon,
cellule ou pas — la taire ferait perdre au contrat une taille que Figma applique,
et le développeur rendrait le calque à celle de son contenu.

`columnSizes` et `rowSizes` portent la taille de chaque piste dans le
vocabulaire de `grid-template-*` : `"1fr"` (piste `FLEX`, avec son facteur),
`"fit-content"` (piste `HUG`), et `null` pour une piste figée à la main — un
nombre brut n'est jamais contractuel. La place dans le tableau est conservée, et
un avertissement nomme les pistes concernées : le geste est de les régler en
`Fill` ou `Hug` et de porter la dimension, reliée à une variable, sur les calques
que la grille dispose. Un runtime Figma qui n'expose pas ces champs ne publie
rien et n'avertit de rien : une propriété absente n'est pas une valeur.

Direction,
alignements, dimensions figées et propriétés de flux des slots sont comparés sur
toute la matrice — cadres de dépendance imbriqués compris ; une différence entre
variants avertit au lieu d'être généralisée depuis le variant de référence.

**Ce que Figma porte et que le schéma ne sait pas écrire** avertit plutôt que de
disparaître, puisque le rendu, lui, en dépend. C'est la contrepartie de tout ce
qui précède : le contrat ne prétend pas décrire Figma en entier, mais il ne perd
rien en silence.

- `structure.layout` reste obligatoire, et `flex-row` en est le repli. Un node
  de layout sans auto layout est donc publié comme une rangée, et le warning le
  dit. La grille, elle, n'est plus concernée : elle est décrite ;
- les bornes d'un calque intermédiaire, entre le composant et ses slots, n'ont
  aucun propriétaire dans le contrat ;
- la distance d'un calque absolu à ses bords d'accroche ;
- sur **chaque calque publié**, et sur lui seul, les propriétés à effet visuel
  qu'aucun champ ne porte : les **effets** (ombre, flou), l'**opacité**
  partielle, une peinture non unie (**dégradé**, image) en `fill` ou en
  `stroke`, plusieurs peintures « mixed » sur un même calque, un **blend mode**
  non neutre, un **pointillé**, et pour un texte : l'**alignement** dans une
  boîte qui n'est pas en `Hug`, la **casse**, la **décoration**, la
  **troncature**.

Ce relevé vit dans l'extraction, jamais dans un balayage à part : on n'avertit
que sur ce qu'on publie, et les entrailles d'une icône ou les calques d'une
dépendance ne regardent pas ce contrat-ci. Aucune valeur au défaut de Figma ne
produit de message — un `clip content` activé, un masque d'icône ou une rotation
résiduelle de tracé importé ne manquent à personne, et un rapport que le
designer cesse de lire ne protège plus rien.

**Passage à la ligne (4.4).** Un auto layout en `layoutWrap: WRAP` publie
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

**7. Intention & documentation des props** — lues dans un **conteneur Figma** — frame,
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
  - **Prop runtime** — une icône `modifiable` reçoit toujours une prop runtime
    qui dit QUELLE icône rendre. Son nom suit le BOOLEAN de visibilité quand le
    calque graphique lie nativement sa propriété Figma `visible` à l'un d'eux
    (`iconLeft` → `iconLeftName`, qui se lisent alors en paire) ; sans cette
    liaison, il vient du calque lui-même (`chess` → `chessName`) et
    `visibilityProp` est absent. Une icône toujours visible est remplaçable
    comme une autre : l'absence de booléen n'est donc pas un défaut et ne
    produit aucun warning. Si le composant expose déjà une component property
    du même nom, aucune n'est remplacée et un warning demande un renommage.

  En résumé, trois responsabilités distinctes — et c'est bien parce qu'elles
  sont distinctes que la deuxième ne dépend pas de la première :

  | Qui | Contrôle | Défini où |
  |---|---|---|
  | Booléen Figma (`iconLeft`…) | **si** le calque s'affiche | liaison native `visible` dans Figma |
  | Prop runtime `<nom>Name` | **quelle** icône afficher | ajoutée par l'exporteur (icône `modifiable`) |
  | `figmaName` | l'icône de **repli** | nom du calque Figma, utilisé quand la prop runtime est vide |
Convention uniforme (aucune logique par composant), lue **sans jamais écrire dans
Figma**. Les règles sont **obligatoires** : conteneur absent ou sans aucune règle
exploitable → **export BLOQUÉ** en pré-vol (erreur explicite), aucun fichier
produit, pas de repli sur la description. Un `@prop` visant une prop/valeur
inexistante → warning (faute de frappe), non bloquant.

**8. Rendu sémantique & garde-fous** — le contrat publie aussi le mapping
générique des rôles vers les propriétés de rendu (`background` →
`background-color`, `foreground` → `color`/`fill`, `border` → couleur et
largeur de bordure, `ring` → contour extérieur), **plus une entrée par clé de
couleur qui ne nomme aucun de ces rôles** — clés allongées comprises, dont le
rendu est celui que leur dernier segment déclare —, avec le rendu déduit de son calque
(étape 2). La règle reste sans logique par composant ; seules les clés observées
changent d'un contrat à l'autre, et un consommateur répond toujours à « comment
peindre cette clé » par un seul accès à `rendering.roles`.
Pour un rôle avec `fallback`,
les `cssProperties` sont le rendu candidat et le `fallback` le rendu
**recommandé** dès que la fidélité l'exige : un `ring` aligné `outside` se rend
en `box-shadow` (`0 0 0 <width> <color>`), qui épouse le `border-radius` et se
dessine hors du flux — il ne déplace jamais les éléments voisins. Toute propriété
pertinente sans variable liée → warning précis (calque + propriété), non
exportée, **export non bloqué**.
`tokensUsed` = liste à plat, dédupliquée et triée, de **toutes** les références
de token du contrat — `icons.<clé>.size` vit hors de `structure` et en fait
partie. L'index est **dérivé du contrat terminé**, jamais tenu pendant
l'extraction : le moteur lit des tokens pour décider (la taille d'une icône sur
chaque variante, les couleurs d'une variante en conflit) et les écarte ensuite ;
un relevé les y ferait entrer alors que le contrat ne les emploie pas. Une
référence se reconnaît à la chaîne **entière** : un nom de style de texte reste
une chaîne nue ; ses variables, elles, sont de vraies références. Une phrase qui cite des tokens — un avertissement, une règle
d'usage — n'en est pas une.

### Sortie

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
    "contractVersion": "7.0",
    "exportedAt": "2026-07-11T14:00:00.000Z",
    "warnings": ["…"],
    "figma": {
      "fileName": "DS AI LAB",
      "nodeId": "12:345",
      "componentKey": "…ou null si non publié",
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
    "iconLeftName": { "type": "icon", "default": null,
                       "policy": "modifiable", "visibilityProp": "iconLeft" },
    "iconRight":{ "type": "boolean", "default": true },
    "iconRightName": { "type": "icon", "default": null,
                        "policy": "modifiable", "visibilityProp": "iconRight" }
  },
  "stateModel": {
    "axis": "state",
    "states": {
      "default": { "selector": null },
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
      "border": { "kind": "stroke", "cssProperties": ["border-color", "border-width"] },
      "ring": { "kind": "stroke", "cssProperties": ["outline-color", "outline-width"],
                 "fallback": "box-shadow" }
    }
  },
  "structure": {
    "layout": "flex-row",
    "sizing": { "width": "fit-content", "height": "fit-content" },
    "sizes": {
      "big":    { "gap": "…", "padding": { "x": "…", "y": "…" }, "radius": "…" },
      "medium": { "…": "idem" },
      "small":  { "…": "idem" }
    },
    "children": [
      { "slot": "icon", "figmaLayer": "arrow-left-long", "optional": true,
        "visibilityProp": "iconLeft", "size": "{components.icons.sizes.base}" },
      { "slot": "label", "figmaLayer": "Suivant" },
      { "slot": "icon-2", "figmaLayer": "arrow-right-long", "optional": true,
        "visibilityProp": "iconRight", "size": "{components.icons.sizes.base}" }
    ],
    "…": "un slot à plusieurs textes publie ses parts :",
    "children (Alert)": [
      { "slot": "label", "figmaLayer": "Text", "layout": "flex-column",
        "gap": "{components.alert.sizes.text-gap}",
        "children": [
          { "slot": "label", "figmaLayer": "Titre", "optional": true,
            "visibilityProp": "title" },
          { "slot": "label-2", "figmaLayer": "Description" }
        ] }
    ],
    "variantAxes": ["color","variant","state"],
    "variantTokens": { "…": "étape 2" },
    "variantStrokes": { "…": "strokes séparés" },
    "variantTypography": {
      "…axes…": [
        { "slotPath": ["label"], "style": "label.large" }
      ]
    }
  },
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
  "composes": [],
  "tokensUsed": ["…"],
  "intent": {
    "usage": "Action déclenchant une opération ; le choix des variantes dépend de l'importance et du contexte.",
    "do": [],
    "dont": ["Utiliser size.big dans des écrans génériques.",
              "Juxtaposer plusieurs boutons color.primary sur une même vue."],
    "pairs": []
  }
}
```

Les dimensions géométriques ne figurent qu'à UN endroit : `sizes` les porte
dès que le composant expose un axe de tailles ; sinon `gap` / `padding` /
`radius` restent au niveau haut de `structure`. Cette question se tranche
**avant** de relever quoi que ce soit, et les avertissements suivent la même
réponse : dès qu'un axe de tailles existe, les dimensions du calque de
référence ne sont ni relevées ni signalées. Les signaler enverrait le designer
relier une variable sur un calque dont rien ne sera publié — et le message le
nommerait par un nom de layer commun à tous les variants du set, sans lui dire
lequel ouvrir. Toute la typographie appartient au catalogue `textStyles` et à
ses usages dans `variantTypography`.

`composes` liste les composants unifiés que celui-ci embarque — vide pour un
composant simple. Une instance ainsi déclarée n'est PAS parcourue : ses
calques, ses tokens et ses props appartiennent à son propre contrat. Le slot
correspondant de `children` la nomme par `composes`, sans relever ni sa taille
ni sa typographie. Un composant est reconnu comme unifié lorsqu'il possède un
conteneur `<Nom>-Rules` sur la page — le même critère qui autorise son export,
évalué par la même fonction, si bien que les deux lectures ne peuvent pas se
contredire.

**Un cadre qui enveloppe une ou plusieurs dépendances (4.9).** Le slot peut ÊTRE
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
que les branches de dépendance les faisait disparaître alors que leurs couleurs
entraient bien dans `variantTokens` — le contrat annonçait des couleurs que plus
aucun calque ne portait.

Un cadre dont AUCUNE branche exportable ne mène à une dépendance fait exception :
ses instances sont rangées sous un calque masqué, le contrat se replie sur le
seul nom du composant et n'ouvre aucun `children`. Les chemins de
`variantTypography` suivent cette même réponse, sinon ils viseraient des slots
que `structure.children` ne contient pas.

Le relevé couvre toute la matrice pour élaguer les dépendances de chaque
variant. `structure.children` et `composes` décrivent tous deux le variant de
référence et gardent ainsi le même ordre et la même cardinalité. Ils ne le
gardent pas par accord de deux relevés : `composes` se DÉRIVE de l'arbre publié,
comme `tokensUsed` se dérive du contrat terminé. La séquence se LIT sur cet
arbre, et non dans l'ordre où l'extraction a rangé ses trouvailles : celui-ci
dépend de l'ordonnancement des lectures asynchrones, et deux cadres frères
pourraient se doubler sans qu'aucun design ait changé. Le scan dit ce que Figma
contient ; seul `structure.children` dit où le développeur doit rendre quoi.

Une dépendance que l'arbre n'a su situer nulle part — posée hors du node de
layout élu, ou rangée sous un calque masqué avec d'autres — sort donc des deux
champs à la fois, jamais d'un seul, et un warning la nomme. Le consommateur
comptant les occurrences de `composes` pour vérifier la parité du code, un
composant qui disparaît ainsi du contrat rendra sa parité rouge tant que le code
continuera de le rendre : c'est le diagnostic voulu, le contrat ne le demandant
plus.

Si la composition varie ailleurs dans la matrice, un warning nomme les variants
concernés : le schéma courant ne prétend pas représenter un slot composé
conditionnel qu'il ne sait pas situer dans `structure.children`.

`figmaLayer` y nomme le calque de **l'instance**, jamais le cadre qui
l'enveloppe : c'est ce calque qu'on retrouve dans Figma.

```json
"composes": [
  { "component": "Button", "figmaLayer": "Button", "visibilityProp": "action" }
]
```

`meta` porte la version du schéma du contrat (`contractVersion`), la date
d'export, les `warnings` de l'export et la
traçabilité Figma (nom de fichier, id du nœud, clé de composant, lien URL).
Les `warnings` documentent l'EXPORT, pas le composant : un consommateur n'a
jamais à les lire pour rendre un composant.
L'URL est construite depuis `figma.fileKey`, que l'API réserve aux plugins
déclarant `enablePrivatePluginApi` dans leur manifest — ce que fait celui-ci.
Elle vaut `null` là où l'API ne fournit pas cette clé, un plugin publié sur la
Community notamment : un warning le signale alors, sans bloquer, et `nodeId` et
`fileName` restent exploitables pour retrouver le composant.

### Invariants

- Le moteur ne dépend d’aucun nom de composant.
- Le node de layout de chaque variant est élu une seule fois ; slots, icônes et
  chemins de typographie décrivent le même arbre.
- Une seule autorité décide qui est un conteneur et qui est une feuille
  (`structureTree.ts`). L’extraction, les chemins de typographie et les
  signatures de comparaison la consultent ; aucun ne la recalcule.
- Une propriété Figma à effet visuel, portée par un calque que le contrat
  publie, et qu’aucun champ ne sait écrire, produit un avertissement. Une valeur
  au défaut de Figma n’en produit jamais.
- Une même clé publique relie `props`, `variantAxes` et les arbres de
  variantes ; les noms Figma d’origine restent traçables.
- Aucune couleur n’est perdue par troncature de clé. La clé d’une couleur est
  décidée une seule fois pour tout le composant : elle est la même dans toutes
  les feuilles, et ne porte jamais une coordonnée de variant.
- La matrice est complète et son ordre rend l’export déterministe.
- Le contrat ne contient aucune valeur de design brute : seulement des
  références `{…}` et les données structurelles explicitement prévues.
- Une liaison composée, une taille ou un contour partiel ne devient jamais une
  valeur supposée.
- Les calques statiquement masqués sont exclus ; les visibilités pilotées
  restent représentées.
- Les composants imbriqués contractés sont déclarés dans `composes` sans
  réexporter leurs internes.
- Le conteneur `<Nom>-Rules` est obligatoire. Une règle invalide avertit sans
  inventer de prop ou d’icône.
- `meta` porte la version, la date, les avertissements et la traçabilité Figma.

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

```json
{
  "primitives":  { "terracota": { "600": { "$value": "#C1440E", "$type": "color" } } },
  "brands":      { "intencial": { "primary": { "600": { "$value": "{primitives.terracota.600}", "$type": "color" } } } },
  "brand-tokens":{ "primary": { "default": { "$value": "{brands.intencial.primary.600}", "$type": "color" } } },
  "components":  { "button": { "colors": { "primary": { "contained": { "default": {
    "background": { "$value": "{brand-tokens.primary.default}", "$type": "color" } } } } } } }
}
```

### Invariants

- Toutes les variables et tous leurs modes sont conservés au format DTCG.
- Les alias restent des références, quel que soit leur type.
- Les contrats et l’export DTCG partagent `normalizeName()` et
  `indexVariables()`.
- Une collision de chemin ou feuille/groupe conserve la première variable,
  écarte l’autre avec un warning et refuse tout alias vers la cible écartée.
- La sortie reste consommable par Style Dictionary.

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
naviguer elle-même). Le lien reste dans le journal pour y revenir. Si le
contenu est identique — la
comparaison ignore `meta.exportedAt`, régénéré à chaque export — aucune
branche ni PR n'est créée. Config absente/invalide ou erreur GitHub : repli
automatique vers le téléchargement local avec message explicite.

**Le corps de la pull request porte les avertissements de l'export.** C'est la
page que le plugin ouvre juste après l'export : le designer y lit ce qui n'a pas
pu être décrit sans ouvrir le JSON ni le journal du plugin. Les deux artefacts
sont couverts par le même mécanisme — `tokens.json` n'a aucun champ où
transporter les siens, là où un contrat les garde aussi dans `meta.warnings`.
Un avertissement ne bloque jamais : seules les préconditions arrêtent un export
(cf. [CONCEPT.md](./CONCEPT.md)).

Chaque avertissement nomme l'élément Figma concerné avec l'intitulé que Figma
affiche, dit ce qui manquera au développeur, puis le geste à faire dans Figma.
La règle et le vocabulaire vivent dans
[CONTRIBUTING.md](./CONTRIBUTING.md).

### Invariants

- Tous les champs sont validés ; les chemins restent relatifs.
- PAT masqué, jamais renvoyé à l'UI ni logué.
- Test de connexion automatique à l'ouverture et après sauvegarde.
- Une commande = une PR avec son unique artefact ; aucun auto-merge.
- Aucune branche ne survit à un export qui n'a pas ouvert de PR : si le commit
  ou la PR échoue, la branche créée est supprimée avant le repli local.
- Aucun changement = aucune PR (comparaison insensible à `meta.exportedAt`).
- Le corps de la PR porte les avertissements de l'export, pour les deux
  artefacts ; ils ne bloquent pas.
- Toute erreur GitHub conserve l'artefact par téléchargement local.

---

## Hors périmètre MVP

Pas d'écriture dans le document Figma, pas d'auto-merge, pas de
multi-composant en une commande, pas de scoring. Aucun domaine réseau autre que
GitHub API déclarée dans le manifest.

---

## Versions

La version actuelle du contrat est **7.0**, et elle ferme deux pertes que le
composant d'épreuve StressTest a rendues visibles.

**Un champ à quatre côtés publie le détail au lieu de tout perdre.** `padding.x`,
`padding.y`, `radius` et la largeur d'un stroke cessent d'être des chaînes : ce
sont désormais une référence — quand tous les côtés citent la même variable, la
forme courte, inchangée — OU un objet par côté. Le design system nommait déjà ces
variables séparément (`padding-left`, `radius-top-left`) ; le moteur les refusait
et se contredisait au passage, puisque l'élection du node de layout comptait ce
padding comme complet quand l'extraction n'en publiait rien. Un consommateur qui
écrivait `padding.x` dans une chaîne de style doit désormais tester la forme —
c'est ce qui en fait une version majeure. La règle du groupe complet ne change
pas : un seul côté relié ne publie toujours rien et avertit.

**Une grille publie ce qui décide de la boîte de ses enfants.** Les pistes
(`columnSizes`, `rowSizes`, en `1fr` / `fit-content`, `null` pour une piste figée
à la main, sous avertissement) et l'ancre de chaque enfant (`columnStart`,
`rowStart`, en valeurs CSS comptées à partir de 1). Sans elles, une tuile qui
remplit sa cellule n'avait nulle part où lire sa taille. La règle commune, elle,
ne change pas : l'absence de `size` se lit partout de la même façon.

`meta.figma.url` n'est plus perdu : le manifest déclare `enablePrivatePluginApi`,
et `figma.fileKey` est fourni à ce plugin. L'avertissement qui présentait la
perte comme une fatalité de l'API disparaît de tout export normal.

La 6.0 : `structure.children` cesse de
s'arrêter au premier calque qui n'est ni un texte ni une dépendance. Le contrat
descend désormais dès qu'un descendant porte une information qu'une feuille ne
sait pas exprimer, à n'importe quelle profondeur : un auto layout dans un auto
layout dans une grille est décrit jusqu'au bout, chaque niveau avec sa
disposition, son `padding`, son `radius`, sa taille et ses bornes. Tout un
sous-arbre graphique — la piste et le curseur d'un Toggle, le rail d'une
Progress, trois cadres bordés emboîtés — se réduisait jusqu'ici à un slot opaque,
alors que ses couleurs entraient bien dans `variantTokens` : le contrat annonçait
des peintures qu'aucun calque publié ne portait. La même version rend
contractuelles deux dispositions que le moteur se contentait d'avertir : la
**grille** (`layout: "grid"`, `columns`, `rows`, `columnGap`, `rowGap`, et
`columnSpan` / `rowSpan` / `justifySelf` sur chaque enfant) et la **position
absolue** (`position` et `constraints`). Un consommateur doit désormais parcourir
`structure.children` récursivement sans supposer que seules les branches de texte
se ramifient, accepter un `layout` valant `grid`, et lire des chemins de
`variantTypography` qui gagnent un étage dès qu'un texte est rangé dans son
propre cadre — d'où la version majeure.

La 5.5 : une couleur cesse d'en évincer une autre : une couleur cesse d'en évincer une
autre. La clé d'une couleur garde pour base le dernier segment de sa variable,
mais quand deux couleurs d'un même variant le partagent, elle s'allonge des
segments qui les séparent — `userinput.background` et `divider.background` — au
lieu de n'en publier qu'une. Le contrat perdait jusqu'ici une couleur pour de
bon et demandait au designer de renommer une variable pour compenser une
troncature du moteur. La forme du JSON ne change pas et un composant dont
aucune clé n'est contestée produit un contrat identique ; c'est le consommateur
qui doit accepter une clé contenant des points et cesser de présumer qu'un des
cinq rôles partagés est présent — d'où la version. Ce qui reste ouvert : le
contrat dit toujours comment peindre une clé, pas sur quel calque.

La 5.4 : le passage à la ligne devient
contractuel. `wrap` et `rowGap` décrivent un auto layout qui déborde sur
plusieurs lignes, sur le composant comme sur n'importe quel conteneur de
`children` ; le contrat se contentait jusqu'ici d'avertir, et le développeur
alignait tout sur une seule ligne. Les deux champs sont facultatifs et purement
additifs — un composant sans wrap produit un contrat identique — mais un
consommateur qui les ignore rend sur une seule ligne ce que la maquette étale sur
plusieurs, d'où la version. La même version élargit ce qu'un cadre de
dépendances publie : ses calques voisins cessent de disparaître avec leur slot,
leur typographie et leur visibilité. La forme du JSON ne change pas pour eux —
ce sont des slots comme les autres — mais un consommateur qui présumait qu'un tel
cadre ne contient que des `composes` doit cesser de le faire.

La 5.3 : les bornes de taille deviennent
contractuelles. `bounds` publie `minWidth`, `maxWidth`, `minHeight` et
`maxHeight`, sur le composant comme sur chaque slot, tokenisées. Le champ est
facultatif et purement additif — un composant sans borne produit un contrat
identique — mais il retourne le geste demandé au designer : le contrat cessait
de savoir écrire une borne et lui conseillait de la retirer, alors qu'une borne
est une décision de design que le rendu porte. C'est désormais au contrat de la
nommer. Un consommateur qui rendait un composant sans lire ce champ le rend trop
large, d'où la version.

La 5.2 ouvrait chaque axe de `structure.sizing` à un token. Une dimension figée
sans variable reste `stretch` — c'est une
taille de maquette, et rien ne change pour les composants qui en publiaient
déjà — mais celle qui cite une variable est une décision du design system, et le
token l'emporte. Un consommateur qui traitait ce champ comme un enum de deux
valeurs doit désormais reconnaître une référence `{…}`, d'où la version.

La 5.1 faisait lire sur le calque qui la porte ce qu'une couleur peint, plus sur
le nom de son token. Le dernier segment restait
la clé de la couleur, et `rendering.roles` publiait le rendu de chaque clé qui ne
nomme aucun rôle partagé. Un composant pouvait donc peindre plusieurs surfaces
sans qu'aucun renommage impossible soit demandé au designer — mais deux surfaces
dont les variables finissaient pareil se disputaient encore une clé, ce que la
5.5 a fermé. La forme du JSON ne
change pas et un design system qui nommait déjà ses rôles produit un contrat
identique ; c'est le consommateur qui doit cesser de présumer les cinq rôles et
lire `rendering.roles` par clé — d'où la version.

La 5.0 rendait documentable tout axe que
le contrat publie, et remplaçable toute icône déclarée modifiable. Une règle
`@prop` visant l'axe `State`/`Status` range sa description dans
`stateModel.states.<état>.description`, là où le contrat publie déjà cet axe —
il était jusqu'ici refusé comme une faute de frappe alors qu'il indexe tous les
arbres de variantes. Et `IconProp.visibilityProp` devient facultatif : une icône
sans booléen de visibilité reçoit désormais sa prop runtime, nommée d'après son
calque. Un consommateur qui lisait `visibilityProp` sans le tester doit être
adapté — c'est ce qui en fait une version majeure.

Avant elle : après la récursion textuelle 4.3,
le flux Flex 4.4, le jalon transitoire 4.5 et les text styles 4.6, la 4.7 ferme
le dimensionnement et la 4.8 l'exprime en CSS. `structure.sizing` publie le
comportement du composant en valeurs de `width` et `height` (`stretch` ou
`fit-content`), et `size` décrit la dimension figée de n'importe quel slot, côté
par côté. Une absence de dimensionnement se lit comme un `fit-content`, sans
avoir à le supposer.

La 4.9 ferme la composition du même mouvement : un calque qui ENVELOPPE un
composant unifié est un conteneur de ce contrat-ci, publie son flux et range la
dépendance dans `children`. Seul le calque qui EST l'instance porte encore
`composes`.

Entre les deux, les diagnostics se sont étoffés sans toucher à la forme :
élection unique du node de layout, calques écartés par cette élection ou par le
cadre d'une dépendance, auto layout en grille ou en wrap.

Un consommateur ne doit jamais présumer qu’une version mineure est compatible :
il accepte uniquement les versions qu’il a explicitement auditées.

Toute modification de forme incrémente `meta.contractVersion` et adapte dans le
même changement la présente spécification, les fixtures et les consommateurs.
L’historique détaillé appartient à Git.

`tokens.json` ne porte pas encore de version de schéma propre. Cette limite est
suivie dans [ROADMAP.md](./ROADMAP.md).
