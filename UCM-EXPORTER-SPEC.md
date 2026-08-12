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
  consommateur retire `{…}` avant de résoudre. Un nom de **style de texte** n'est
  pas un token : il reste une chaîne nue et n'entre pas dans `tokensUsed`.

## Hypothèses sur le design system

Les noms de collections et le nombre de niveaux d’alias sont libres. Le moteur
gère les chaînes profondes et les alias de tous types.

Une convention est nécessaire pour les couleurs de variante : le dernier
segment du token nomme son rôle de rendu (`background`, `foreground`, `icon`,
`border` ou `ring`). Les autres rôles sont signalés, car le consommateur ne
saurait pas les peindre.

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
  acceptées) devient `disabled: boolean`.
- *Couche sémantique* : les noms Figma peu parlants sont mappés vers le
  vocabulaire partagé — ex. un enum dont toutes les valeurs sont des tailles
  (`big/medium/small`, `xs`…`3xl`) → prop `size`. Le nom Figma d'origine est
  conservé dans `figmaName`. Mapping piloté par les **valeurs**, jamais par le
  composant. La même table de correspondance renomme les clés de
  `structure.variantAxes` et des valeurs de chaque variant : `props.size`,
  `variantAxes` et les arbres de tokens ne peuvent pas diverger.

**2. Tokens de variantes** — après le pré-vol de complétude, parcourir **tous**
les variants du produit cartésien des axes. Pour chacun, relever les tokens liés (`boundVariables.fills` et
`.strokes` sur tout le sous-arbre), rangés par **rôle = dernier segment du
token**. Un sous-arbre `visible === false` est ignoré, sauf si sa visibilité
est liée à une prop de composant ou à une variable : il peut alors être rendu
dans une autre configuration et reste exporté. Un sous-arbre statiquement
masqué qui portait des variables produit un warning sur sa racine.
Les rôles rendables sont exactement ceux de `rendering.roles`
(`background`, `foreground`, `icon`, `border`, `ring`) : un rôle hors de cette liste —
ou employé sur le mauvais support, tel un `…/border` posé en remplissage —
donne un contrat valide qu'**aucun consommateur ne saura peindre**, puisqu'un
rôle inconnu de `rendering.roles` est ignoré au rendu. Le cas produit donc un
**warning agrégé** : un seul message par rôle fautif, avec son nombre
d'occurrences et un token en exemple — celui à renommer dans Figma.
Un rôle n'apparaît que s'il est réellement lié — rien n'est forcé ni inventé.
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

**3. Layout** — certains design systems construisent leurs variantes de taille
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
Une dimension composée n'est exportée que si une représentation complète se
résout vers un token unique : gauche + droite pour `padding.x`, haut + bas
pour `padding.y`, largeur + hauteur pour la taille d'un slot, et
`cornerRadius` ou les quatre coins pour le rayon. Une représentation partielle
ou asymétrique produit un warning et vaut `null` (ou reste absente pour la
taille d'un slot) : le contrat n'affirme jamais une symétrie que Figma ne
prouve pas. Une valeur neutre par défaut effectivement fournie par Figma (par
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
  liaison conservée sur `itemSpacing` ne produit ni token ni warning.

La même règle vaut pour l'élection du porteur de layout : une liaison
inapplicable ne désigne pas un calque comme conteneur de dimensions, sinon le
calque élu n'exporterait rien.
**Dimensions par taille** : l'axe de tailles est cherché sur le wrapper de
dimensions puis, s'il n'en porte pas, sur le Component Set sélectionné — un
wrapper qui expose ses propres axes ne doit pas faire disparaître les
dimensions par taille. Détecté par ses valeurs (comme la prop `size`), chaque
valeur est extraite →
`structure.sizes.{big,medium,small}` avec gap/padding/radius/fontSize par
taille. Le contrat couvre ainsi toutes les tailles, pas seulement celle
instanciée par défaut. Hypothèse assumée : les dimensions ne varient que selon
l'axe de tailles — un représentant par taille suffit ; si un design system
faisait varier un padding selon un autre axe, le contrat ne le verrait pas.

**4. Modèle d'interaction** — lorsqu'un axe `State` ou `Status` est présent,
le contrat ajoute `stateModel` avec le déclencheur de chaque état connu :
`hover` → `:hover`, `focus` → `:focus-visible`, `press` → `:active`,
`disable`/`disabled` → `[disabled]`. La priorité générique est
`disable > press > focus > hover > default`. Un état inconnu reste exporté
avec un déclencheur `null` et un warning. Les `selector` visent
l'implémentation CSS de **production** (pseudo-classes) ; l'outil de test
froid, en styles inline, reproduit les mêmes états via des événements.

**5. Typographie** — sur le calque texte, dans l'ordre :
`textStyleId` → nom du style ; sinon variables liées `fontSize` / `fontWeight`
(fallback sur le champ `fontStyle`) / `lineHeight` / `fontFamily`. Chaque
propriété non liée produit un warning et n'est jamais remplacée par une valeur
brute ; si aucune propriété n'est exploitable, le bloc `typography` est absent.
Le relevé porte sur **un** calque texte : un slot qui en contient plusieurs est
décrit par ses parts (étape 6), chacune avec la sienne.

`sizes.<valeur>.fontSize` ne note en revanche qu'une font size par taille. Un
composant à plusieurs textes n'en exporte donc aucune pour cet axe, et
avertit — la retenir reviendrait à présenter celle du premier calque comme
celle de tous.

**6. Structure** — `children` = enfants directs réels du node de layout :
- calque **texte** → slot `label` (nom d'origine dans `figmaLayer`), avec
  `typography` (étape 5) ;
- calque contenant **plusieurs textes** → slot décrit par `children`,
  récursivement sur ses seules branches textuelles, plus `layout` et `gap`
  lorsqu'ils sont applicables ; voir ci-dessous ;
- calque **graphique désigné par une règle `@icons`** → slot `icon`, `optional:
  true`, `size` ;
- autre calque **graphique** → nom du calque comme slot, `optional: true`, `size`.

Un slot ne porte qu'une `typography`. Dès qu'il contient plus d'un calque texte
— un titre et une description —, celle du premier s'appliquerait aux deux et la
seconde ne serait jamais exportée. Le slot décrit alors ses **parts** dans
`children`, à la même forme et à toute profondeur, mais uniquement sur les
branches qui mènent à un vrai calque `TEXT`. La typographie descend jusqu'à ce
calque ; un frame intermédiaire porte son `figmaLayer`, sa visibilité et ses
enfants, jamais la typographie du texte qu'il enveloppe. Un dessin ou une
instance composée voisine ne devient pas une part et ne déclenche aucun warning
de taille interne.

Le slot lui-même n'a alors pas de `typography`. Les visibilités portées par les
nodes représentés descendent à leur place exacte ; une cible graphique exclue
de l'arbre textuel reste dans `visibilityTargets`, sans perte silencieuse.
`layout` et `gap` ne sont relevés que lorsqu'au moins deux branches sont
disposées par un auto-layout `HORIZONTAL` ou `VERTICAL`. Pour `NONE`, `GRID` ou
un node sans auto-layout, les deux champs restent absents et un warning explique
que la disposition interne manquera. Sonder le padding ou le radius avertirait
sur tout design pourtant correct et reste hors de cette récursion 4.3.

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
`layoutGrow: 1`. Les valeurs neutres `INHERIT` et `0` restent absentes. Un
layer en position `Absolute` est averti et ne reçoit aucune propriété Flex : le
contrat ne décrit pas encore ses coordonnées. Direction, alignements et
propriétés de flux des slots sont comparés sur toute la matrice ; une différence
entre variants avertit au lieu d'être généralisée depuis le variant de
référence.

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
  dans `props.<prop>.descriptions.<valeur>`.
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
  - **Prop runtime** — si le calque graphique lie nativement sa propriété
    Figma `visible` à un BOOLEAN, ce booléen est conservé et une prop runtime
    distincte `<bool>Name` est ajoutée pour une icône `modifiable`. Sans cette
    liaison native, l'icône est exportée avec un warning, mais aucune prop
    n'est inventée.

  En résumé, trois responsabilités distinctes :

  | Qui | Contrôle | Défini où |
  |---|---|---|
  | Booléen Figma (`iconLeft`…) | la **visibilité** du calque | liaison native `visible` dans Figma |
  | Prop runtime `<bool>Name` | **quelle** icône afficher | ajoutée par l'exporteur (icône `modifiable`) |
  | `figmaName` | l'icône de **repli** | nom du calque Figma, utilisé quand la prop runtime est vide |
Convention uniforme (aucune logique par composant), lue **sans jamais écrire dans
Figma**. Les règles sont **obligatoires** : conteneur absent ou sans aucune règle
exploitable → **export BLOQUÉ** en pré-vol (erreur explicite), aucun fichier
produit, pas de repli sur la description. Un `@prop` visant une prop/valeur
inexistante → warning (faute de frappe), non bloquant.

**8. Rendu sémantique & garde-fous** — le contrat publie aussi le mapping
générique des rôles vers les propriétés de rendu (`background` →
`background-color`, `foreground` → `color`/`fill`, `border` → couleur et
largeur de bordure, `ring` → contour extérieur). Pour un rôle avec `fallback`,
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
une chaîne nue, et une phrase qui cite des tokens — un avertissement, une règle
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
    "contractVersion": "4.4",
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
      "hover": { "selector": ":hover" },
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
    "sizes": {
      "big":    { "gap": "…", "padding": { "x": "…", "y": "…" }, "radius": "…", "fontSize": "…" },
      "medium": { "…": "idem" },
      "small":  { "…": "idem" }
    },
    "children": [
      { "slot": "icon", "figmaLayer": "arrow-left-long", "optional": true,
        "visibilityProp": "iconLeft", "size": "{components.icons.sizes.base}" },
      { "slot": "label", "figmaLayer": "Suivant", "typography": { "…": "étape 5" } },
      { "slot": "icon-2", "figmaLayer": "arrow-right-long", "optional": true,
        "visibilityProp": "iconRight", "size": "{components.icons.sizes.base}" }
    ],
    "…": "un slot à plusieurs textes remplace sa typography par ses parts :",
    "children (Alert)": [
      { "slot": "label", "figmaLayer": "Text", "layout": "flex-column",
        "gap": "{components.alert.sizes.text-gap}",
        "children": [
          { "slot": "label", "figmaLayer": "Titre", "optional": true,
            "visibilityProp": "title",
            "typography": { "fontSize": "{components.alert.sizes.title-size}", "…": "étape 5" } },
          { "slot": "label-2", "figmaLayer": "Description",
            "typography": { "fontSize": "{components.alert.sizes.description-size}", "…": "étape 5" } }
        ] }
    ],
    "variantAxes": ["color","variant","state"],
    "variantTokens": { "…": "étape 2" },
    "variantStrokes": { "…": "strokes séparés" }
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

Les dimensions ne figurent qu'à UN endroit : `sizes` les porte toutes dès que
le composant expose un axe de tailles, sinon `gap` / `padding` / `radius`
restent au niveau haut de `structure`. Les deux ne coexistent jamais.

`composes` liste les composants unifiés que celui-ci embarque — vide pour un
composant simple. Une instance ainsi déclarée n'est PAS parcourue : ses
calques, ses tokens et ses props appartiennent à son propre contrat. Le slot
correspondant de `children` la nomme par `composes`, sans relever ni sa taille
ni sa typographie. Un composant est reconnu comme unifié lorsqu'il possède un
conteneur `<Nom>-Rules` sur la page — le même critère qui autorise son export,
évalué par la même fonction, si bien que les deux lectures ne peuvent pas se
contredire.
Le relevé couvre toute la matrice pour élaguer les dépendances de chaque
variant. `structure.children` et `composes` décrivent tous deux le variant de
référence et gardent ainsi le même ordre et la même cardinalité. Si la
composition varie ailleurs dans la matrice, un warning nomme les variants
concernés : le schéma courant ne prétend pas représenter un slot composé
conditionnel qu'il ne sait pas situer dans `structure.children`. Lorsqu'un
calque enveloppe une seule dépendance, son slot reprend aussi la
`visibilityProp` de l'instance.

```json
"composes": [
  { "component": "Button", "figmaLayer": "action", "visibilityProp": "action" }
]
```

`meta` porte la version du schéma du contrat (`contractVersion`), la date
d'export, les `warnings` de l'export et la
traçabilité Figma (nom de fichier, id du nœud, clé de composant, lien URL).
Les `warnings` documentent l'EXPORT, pas le composant : un consommateur n'a
jamais à les lire pour rendre un composant.
L'URL vaut `null` tant que le plugin n'est pas un **plugin privé
d'organisation** déclarant `enablePrivatePluginApi` : `figma.fileKey` leur est
réservé. Ce n'est donc pas un état transitoire que la publication corrigerait,
et le warning qui le signale — sans bloquer — le dit explicitement. `nodeId` et
`fileName` restent exploitables pour retrouver le composant.

### Invariants

- Le moteur ne dépend d’aucun nom de composant.
- Une même clé publique relie `props`, `variantAxes` et les arbres de
  variantes ; les noms Figma d’origine restent traçables.
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
unité (opacités, `fontweight` numérique…) → `number` ; `STRING`→`string` ;
`BOOLEAN`→`boolean`.
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

La version actuelle du contrat est **4.4** : après la récursion textuelle 4.3,
elle ajoute `justifyContent` et `alignItems` au conteneur Flex, ainsi que
`alignSelf` et `flexGrow` sur ses slots. Un consommateur peut donc placer une
icône au centre vertical de son auto-layout sans le déduire du nom ou du type
de composant.

Un consommateur ne doit jamais présumer qu’une version mineure est compatible :
il accepte uniquement les versions qu’il a explicitement auditées.

Toute modification de forme incrémente `meta.contractVersion` et adapte dans le
même changement la présente spécification, les fixtures et les consommateurs.
L’historique détaillé appartient à Git.

`tokens.json` ne porte pas encore de version de schéma propre. Cette limite est
suivie dans [ROADMAP.md](./ROADMAP.md).
