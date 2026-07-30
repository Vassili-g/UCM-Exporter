# Unified Component Exporter — spécification

**Sommaire** — Contexte technique · Le design system de référence ·
**Partie 1** Export composant · **Partie 2** Export tokens ·
**Partie 3** Configuration & dépôt GitHub · Hors périmètre MVP ·
Historique du schéma du contrat.

## Objet

Le concept (pourquoi, arbitrage des sources, co-localisation) vit dans
[`CONCEPT.md`](./CONCEPT.md). Ce document spécifie les deux artefacts que le
plugin produit pour le mettre en œuvre :

- un **contrat de composant** JSON — props, structure, tokens, intention et
  documentation par valeur (règles lues dans le conteneur `<Nom>-Rules`) ;
- un **export de tokens** DTCG — toutes les variables, chaîne d'alias préservée.

Principe directeur : décrire **fidèlement** ce qui existe dans Figma, dans un
**vocabulaire partagé**. Fidèle signifie fidèle à la *sémantique visuelle* du
composant (taille, label, états), pas aux noms de calques accidentels. La
résolution des assets et l'API applicative restent à la charge du repository
consommateur.

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

## Le design system de référence (un exemple, pas un prérequis)

Le moteur n'exige **presque rien** de cette structure : il lit dynamiquement
les collections, les variables et leurs alias, quels que soient leurs noms.
Une seule contrainte de nommage existe, et elle est vérifiée : le **dernier
segment d'un token de couleur nomme son rôle visuel** (cf. Partie 1, étape 2).
La table ci-dessous décrit le **fichier Figma de référence** du MVP — une
organisation réaliste qui sert de cas de validation, pas une contrainte du
plugin. Collections de variables, par tiers d'alias :

| Tier | Collection | Rôle |
|---|---|---|
| 1 | **Primitives** | palettes brutes — feuilles, aucun alias sortant |
| 2 | **Brands** | palettes par marque → alias vers Primitives |
| 3 | **Brand Tokens** | couleurs de marque par emphase (`strong`…`subtlest`) ; **les modes = les marques** (1 mode = 1 marque) |
| 4 | **Utilities** | sémantiques Success / Info / Warning / Danger / Neutral → alias |
| 5 | **Components** | mapping par composant → alias Brand Tokens / Utilities, plus les dimensions par taille (`Sizes`) |
| 6 | **Sizes** | `Spacing` (feuilles px), `FontSize` → `Spacing` |
| 7 | **Layouts** | `Sizing` / `Radius` / `Stroke` / `FontFamily` / `FontWeight` / `LineHeight` / `TextScale` |

Deux propriétés structurantes :

- **Chaîne d'alias profonde** (jusqu'à 4 sauts :
  Components → Brand Tokens → Brands → Primitives → hex). Le plugin **préserve
  chaque maillon** comme référence, n'aplatit **jamais**.
- **Alias cross-type** : les dimensions aussi sont aliasées
  (`FontSize→Spacing`, `Sizing→Spacing`, `TextScale→FontSize`). La résolution
  s'applique à **tous** les types de variables, pas seulement COLOR.

Nommage réel (exemple Button) : couleurs sous
`Components/Button/Colors/{color}/{variant}/{state}/{role}` (30 combinaisons =
`2 couleurs × 3 variantes × 5 états`) ; dimensions sous
`Components/Button/Sizes/{Big,Medium,Small}/{gap,padding-x,padding-y,border-radius,font-size}`.
Collections au pluriel (`Sizes`, `Layouts`), nom de composant au singulier.

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
l'export est bloqué avant l'extraction : le message donne le nombre attendu,
le nombre présent, cinq variants à créer au plus et le geste exact dans Figma.
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
prouve pas.
**Dimensions par taille** : si le wrapper expose un axe de tailles (détecté
par ses valeurs, comme la prop `size`), chaque valeur est extraite →
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

**6. Structure** — `children` = enfants directs réels du node de layout :
- calque **texte** → slot `label` (nom d'origine dans `figmaLayer`), avec
  `typography` (étape 5) ;
- calque **graphique désigné par une règle `@icons`** → slot `icon`, `optional:
  true`, `size` ;
- autre calque **graphique** → nom du calque comme slot, `optional: true`, `size`.

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
optionnel ni taire une prop que le composant doit lire.
Une visibilité liée à une variable conserve également le calque, sans inventer
de prop publique. Un calque statiquement masqué est exclu avec tout son
sous-arbre ; s'il portait des variables, le warning indique ce qui a été
ignoré.

Slots dédupliqués (`label`, `label-2`…). Un calque rendable inattendu est inclus
tel quel, jamais supprimé silencieusement.

**7. Intention & documentation des props** — lues dans un **conteneur Figma** — frame,
section ou groupe — nommé `<Nom>-Rules` (ex. `Button-Rules`), posé **sur la même
page** que le composant. Chaque règle est
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
    dirait quand la rendre sans dire ni où ni à quelle taille. Le slot se déduit
    du **rang** occupé parmi les calques d'icônes du variant, dans l'ordre du
    document — la même règle que la déduplication des slots (`icon`, `icon-2`).
    Un rang ou une taille qui change selon les variants produit un warning et
    aucune valeur déduite ;
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
`tokensUsed` = liste à plat dédupliquée de toutes les références de token de
`structure` (mêmes accolades ; un nom de style de texte en est exclu).

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
    "contractVersion": "4.2",
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
conteneur `<Nom>-Rules` sur la page — le même critère qui autorise son export.
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

- `props` : tous les axes `VARIANT`/`BOOLEAN`/`TEXT` + props du wrapper ;
      axe `State` exclu, `Disable` → `disabled`.
- Couche sémantique appliquée (ex. tailles → `size`) avec `figmaName`
      conservé ; le même nom public est utilisé par `props`, `variantAxes` et
      les valeurs des variants ; aucun mapping lié à un composant précis.
- Toutes les combinaisons des valeurs d'axes existent ; sinon export bloqué
      avec le compte attendu/présent, les variants manquants et une instruction
      Figma. Le contrat courant ne prétend jamais que des enums indépendantes
      acceptent un cas absent.
- `variantTokens` et `variantStrokes` couvrent **toutes** les combinaisons
      d'axes, nichés selon `variantAxes` ; le premier ne contient que des
      références de token `{…}`, le second porte couleur et largeur en
      références `{…}` plus l'alignement Figma nu (`inside`/`center`/`outside`).
- L'ordre des clés de variantes et celui des `warnings` suivent la **matrice**,
      jamais l'ordre de réponse de l'API Figma : un design inchangé réexporté
      redonne le même fichier, condition de l'invariant « aucun changement =
      aucune PR » (Partie 3).
- Un rôle absent d'un état signifie qu'il ne doit pas être rendu ; aucun
      consommateur ne fusionne implicitement cet état avec `default`.
- Tout rôle relevé appartient à `rendering.roles`, et sur le support de sa
      nature déclarée (`paint`/`stroke`) ; sinon **warning agrégé**, un par
      rôle fautif — jamais un par variante.
- `stateModel` mappe les états connus vers leurs déclencheurs et expose
      une priorité déterministe ; les états inconnus restent visibles avec un
      warning.
- `rendering.roles` documente le rendu partagé des rôles visuels.
- Typographie remplie en références de token `{…}` (**test n°1**), fallback
      `fontStyle` géré ; un style de texte reste un nom nu, hors `tokensUsed`.
- Dimensions extraites du wrapper si présent, sinon du composant ;
      `structure.sizes` couvre chaque valeur de l'axe de tailles. Une dimension
      composée partielle ou asymétrique vaut `null` avec warning.
- `meta` présent : `contractVersion`, `exportedAt`, traçabilité Figma
      (fileName, nodeId, componentKey, url — null toléré avec warning).
- `children` = vrais calques (texte → `label` + `figmaLayer` ; graphique →
      nom conservé dans `figmaLayer` + `optional` + `size`). Tout slot dont une
      prop BOOLEAN pilote la visibilité porte `visibilityProp` + `optional`.
      Les sous-arbres statiquement masqués sont exclus ; ceux pilotés par une
      prop ou une variable de visibilité restent présents.
- Les règles `@icons` distinguent une icône `modifiable` d'une icône
      `strict` par la visibilité de leurs calques dédiés ; le nom du calque
      `icon` correspond exactement à un calque graphique présent dans au moins
      un variant.
- `icons` conserve cette qualification sans modifier les props BOOLEAN ;
      une icône `modifiable` ajoute une prop runtime distincte seulement quand
      Figma lie nativement son calque à un BOOLEAN de visibilité.
- Aucune valeur brute de design exportée ; tout token cité l'est comme
      référence `{…}` ; une largeur de stroke non tokenisée vaut `null` avec
      warning, tandis que l'alignement structurel Figma
      (`inside`/`center`/`outside`) est conservé nu.
- Une variable liée ou sa collection introuvable ne produit aucune référence :
      le warning cite le premier calque et le champ concernés.
- Un seul conteneur `<Nom>-Rules` est lu ; s'il y en a plusieurs sur la page,
      le premier est retenu **avec un warning** — aucune règle ne disparaît en
      silence. Deux `@prop` visant la même valeur : la première est retenue,
      le doublon est signalé. Même règle pour deux `@boolean` visant la même
      prop.
- Règles lues dans le conteneur `<Nom>-Rules` : `@usage`/`@do`/`@dont`/`@pairs`
      → `intent`, `@prop` → `props.<prop>.descriptions.<valeur>`, `@boolean` →
      `props.<prop>.description` ; conteneur absent/vide → **export bloqué** ;
      règle invalide → warning ; jamais d'écriture Figma.
- Résultats aussi fidèles sur un composant **non-Button**.

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

- Toutes les variables exportées, chaîne d'alias préservée jusqu'aux
      primitives (aucun maillon aplati, dimensions incluses).
- Deux variables donnant le même nom normalisé (« Foo Bar » et « foo-bar », ou
      deux collections « Brand Tokens » et « brand-tokens ») : la première est
      exportée, la seconde **ignorée avec un warning nommant les deux**. Aucun
      alias ne pointe alors sur la mauvaise cible — celui qui visait la seconde
      est signalé introuvable. **Les deux commandes tranchent avec le même
      index** (`indexVariables`, dans `src/variables.ts`) : un contrat ne peut
      donc pas citer un token que `tokens.json` attribue à une autre variable.
- Un chemin ne peut pas être à la fois une feuille et un groupe
      (`brand.foo` / `brand.foo.bar`) : l'index commun conserve la première
      variable rencontrée, écarte l'autre avant de construire l'arbre et refuse
      toute référence vers la variable écartée. L'ordre Figma ne peut donc
      produire ni écrasement ni alias pendant.
- Tous les modes de Brand Tokens présents (`$value` défaut + `$extensions`) ;
      collections mono-mode en `$value` seul. Deux modes au même nom normalisé :
      le premier est conservé, avec **un warning par collection** — jamais un
      par variable.
- `normalizeName` identique à la Partie 1 (tokens recoupables avec les
      `tokensUsed`).
- JSON DTCG valide, consommable par Style Dictionary.

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

### Invariants

- Tous les champs sont persistés et validés inline ; les paths sont
      normalisés et restent relatifs.
- PAT masqué, jamais renvoyé à l'UI ni logué.
- Test de connexion automatique à l'ouverture et après sauvegarde.
- Une commande = une PR avec son unique artefact ; aucun auto-merge.
- Aucune branche ne survit à un export qui n'a pas ouvert de PR : si le commit
      ou la PR échoue, la branche créée est supprimée avant le repli local.
- Aucun changement = aucune PR (comparaison insensible à `meta.exportedAt`).
- Toute erreur GitHub conserve l'artefact par téléchargement local.

---

## Hors périmètre MVP

Pas d'écriture dans le document Figma, pas d'auto-merge, pas de
multi-composant en une commande, pas de scoring. Aucun domaine réseau autre que
GitHub API déclarée dans le manifest.

---

## Historique du schéma du contrat

| Version | Changement |
|---|---|
| 1.x | Schéma initial (clé `meta.ucsVersion`) ; la 1.4 ajoute `stateModel`, `rendering`, `variantStrokes` et les règles d'icônes |
| 2.0 | `meta.ucsVersion` devient `meta.contractVersion` : le schéma du contrat est dissocié du concept — rupture de clé pour les consommateurs |
| 3.0 | Les tokens sont cités comme références `{chemin.du.token}`, plus jamais comme chemins nus — rupture pour un consommateur qui lisait le chemin littéral |
| 3.1 | `visibilityProp` relevé sur **tous** les slots, plus seulement les calques graphiques : un label masquable (bouton à icône seule) est enfin décrit — ajout compatible |
| 3.2 | La règle `@boolean` documente explicitement une prop BOOLEAN dans `props.<prop>.description` — ajout compatible |
| 4.0 | Composition (`composes`) et assainissement du format — rupture : les dimensions quittent le niveau haut dès que `sizes` existe, `children[label].color` disparaît au profit de `variantTokens`, et `warnings` passe sous `meta` |
| 4.1 | `visibilityTargets` décrit les visibilités imbriquées sans masquer tout leur slot ; `icons.*.variants` situe exactement une icône absente de certains variants — ajouts compatibles |
| 4.2 | Un slot d'icône porte le rôle `icon` au lieu du nom de son calque, et `icons.*.slot` / `icons.*.size` rendent chaque icône plaçable — rupture : les slots graphiques désignés par `@icons` changent de nom |

`tokens.json` ne porte pas encore de version de schéma propre — prévu au-delà
du MVP (cf. [`ROADMAP.md`](./ROADMAP.md)).
