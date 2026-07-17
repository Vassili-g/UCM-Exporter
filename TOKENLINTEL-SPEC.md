# TokenLintel — contexte & spécification

## Vision

TokenLintel produit les deux artefacts design nécessaires à la mise en œuvre du
concept UCS dans un repository consommateur (cf. `CONCEPT.md`) :

- un **contrat de composant** JSON — props, structure, tokens, intention et
  documentation par valeur (règles lues dans le conteneur `<Nom>-Rules`) ;
- un **export de tokens** DTCG — toutes les variables, chaîne d'alias préservée.

Principe directeur : décrire **fidèlement** ce qui existe dans Figma, dans un
**vocabulaire partagé**. Fidèle signifie fidèle à la *sémantique visuelle* du
composant (taille, label, états), pas aux noms de calques accidentels. La
résolution des assets et l'API applicative restent à la charge du repository
consommateur.

## Contexte technique

- Plugin Figma (Plugin API, plan Professional) : pas d'API Variables REST ni
  de Code Connect. `api.github.com` est autorisé pour le dépôt optionnel des
  artefacts via PR ; l'icône de réglages de l'UI est un SVG Font Awesome Free
  embarqué.
- Tourne dans l'éditeur, produit des fichiers en téléchargement sans config
  valide, ou les dépose sur une branche GitHub dédiée avec une config valide.
- Deux commandes indépendantes qui partagent le même code Figma :
  **Export composant** (Partie 1) et **Export tokens** (Partie 2).
- Stack : TypeScript, `@figma/plugin-typings`, build esbuild. L'UI expose le
  statut GitHub, les deux commandes, la configuration et un journal.
- **`normalizeName()` est commune aux deux commandes** :
  `Brand Tokens/Primary/default` → `brand-tokens.primary.default`
  (`/`→`.`, espaces d'un segment → `-`, minuscules). Un token s'écrit donc
  pareil dans `tokens.json` et dans un contrat — les `tokensUsed` de la Partie 1
  recoupent la Partie 2.

## Le design system décrit (données lues, jamais codées en dur)

Le plugin **lit** cette structure dynamiquement. Collections de variables, par
tiers d'alias :

| Tier | Collection | Rôle |
|---|---|---|
| 1 | **Primitives** | palettes brutes — feuilles, aucun alias sortant |
| 2 | **Brands** | palettes par marque → alias vers Primitives |
| 3 | **Brand Tokens** | couleurs de marque par emphase (`strong`…`subtlest`) ; **les modes = les marques** (1 mode = 1 marque) |
| 4 | **Utilities** | sémantiques Success / Info / Warning / Danger / Neutral → alias |
| 5 | **Components** | mapping par composant → alias Brand Tokens / Utilities |
| 6 | **Sizes** | `Spacing` (feuilles px), `FontSize` → `Spacing` |
| 7 | **Layouts** | `Sizing` / `Radius` / `Stroke` / `FontFamily` / `FontWeight` / `LineHeight` / `TextScale` + dimensions composant |

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
`Layouts/Components/Button/{Big,Medium,Small}/{gap,padding-x,padding-y,border-radius,font-size}`.
Collections au pluriel (`Sizes`, `Layouts`), nom de composant au singulier.

---

## Partie 1 — Export composant (moteur générique)

Décrit **n'importe quel** component set en lisant sa vraie structure Figma.
**Rien n'est codé en dur sur un composant précis** : les règles « intelligentes »
sont auto-détectées (nom d'axe, valeurs, rôle de calque) et centralisées dans
`semantics.ts`. Button sert d'exemple de référence.

**Entrée** : un `COMPONENT_SET` sélectionné (`selection[0].type ===
"COMPONENT_SET"`, sinon erreur UI explicite) **portant des règles** dans un
conteneur `<Nom>-Rules` (sinon export bloqué, cf. étape 7).

### Algorithme

**1. Props** — traduire chaque propriété : `VARIANT` → enum, `BOOLEAN` →
boolean, `TEXT` → string. Deux règles auto-détectées :
- *Convention State* : un axe `State`/`Status` est design-only, **exclu des
  props** ; sa seule valeur `Disable` devient `disabled: boolean`.
- *Couche sémantique* : les noms Figma peu parlants sont mappés vers le
  vocabulaire partagé — ex. un enum dont toutes les valeurs sont des tailles
  (`big/medium/small`, `xs`…`3xl`) → prop `size`. Le nom Figma d'origine est
  conservé dans `figmaName`. Mapping piloté par les **valeurs**, jamais par le
  composant.

**2. Tokens de variantes** — parcourir **tous** les variants (produit cartésien
des axes). Pour chacun, relever les tokens liés (`boundVariables.fills` et
`.strokes` sur tout le sous-arbre), rangés par **rôle = dernier segment du
token** (`background`, `foreground`, `border`, `ring`, `shadow`…). Un rôle
n'apparaît que s'il est réellement lié — rien n'est forcé ni inventé.
Chaque feuille décrit indépendamment l'état visuel complet du variant Figma :
si un rôle est absent de la feuille d'un état dans `variantTokens` ou
`variantStrokes`, cela signifie toujours **« ne pas rendre ce rôle dans cet
état »**. Un consommateur ne doit jamais fusionner implicitement cette feuille
avec celle de l'état `default`.
Résolution : `VariableAlias.id` → `getVariableByIdAsync(id).name` →
`normalizeName()`. Pour un rôle porté par un `fill`, la feuille contient le
nom du token. Les strokes sont rangés séparément dans `variantStrokes` :

```json
"ring": {
  "color": "components.button.colors.primary.contained.focus.ring",
  "width": "layouts.stroke.ring",
  "align": "outside"
}
```

Une largeur non liée produit un warning et vaut `null` ; elle n'est jamais
remplacée par une valeur brute. Les deux arbres sont nichés selon
`variantAxes`, avec des chaînes uniquement dans `variantTokens` :

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

**3. Layout** — chercher une instance imbriquée portant des dimensions liées
(`itemSpacing`/`padding`/`cornerRadius`) = **wrapper de dimensions**. S'il
existe (Button : `sizeWrapperButton`), ses props sont **fusionnées** dans l'API
(étape 1) et ses dimensions relevées ; **sinon**, dimensions lues directement
sur le composant de référence (`defaultVariant`). → `gap`, `padding.x/y`,
`radius`. Un composant plat est donc géré sans blocage.
**Dimensions par taille** : si le wrapper expose un axe de tailles (détecté
par ses valeurs, comme la prop `size`), chaque valeur est extraite →
`structure.sizes.{big,medium,small}` avec gap/padding/radius/fontSize par
taille. Le contrat couvre ainsi toutes les tailles, pas seulement celle
instanciée par défaut.

**4. Modèle d'interaction** — lorsqu'un axe `State` ou `Status` est présent,
le contrat ajoute `stateModel` avec le déclencheur de chaque état connu :
`hover` → `:hover`, `focus` → `:focus-visible`, `press` → `:active`,
`disable`/`disabled` → `[disabled]`. La priorité générique est
`disable > press > focus > hover > default`. Un état inconnu reste exporté
avec un déclencheur `null` et un warning.

**5. Typographie** — sur le calque texte, dans l'ordre :
`textStyleId` → nom du style ; sinon variables liées `fontSize` / `fontWeight`
(fallback sur le champ `fontStyle`) / `lineHeight` / `fontFamily`. **Ce bloc
doit être rempli en noms de tokens — jamais vide, jamais brut.**

**6. Structure** — `children` = enfants directs réels du node de layout :
- calque **texte** → slot `label` (nom d'origine dans `figmaLayer`), avec
  `typography` (étape 4) et `color` (= `foreground` du variant de référence) ;
- calque **graphique** → nom du calque comme slot, `optional: true`, `size`.

Slots dédupliqués (`label`, `label-2`…). Un calque inattendu est inclus tel
quel, jamais supprimé silencieusement.

**7. Intention & doc par valeur** — lues dans un **conteneur Figma** (frame,
section ou groupe) nommé `<Nom>-Rules` (ex. `Button-Rules`), posé à côté du
composant — seul son nom compte, pas son type. Chaque règle est
une instance d'un composant de configuration (`ComponentConfiguration`) dont la
**variante** porte le tag et le calque `content` le texte :
- `@usage` (un), `@do`/`@dont` (répétables), `@pairs` (virgules) → `intent` ;
- `@prop` + calque `prop` (ex. `variant.contained`) → doc par valeur, rangée
  dans `props.<prop>.descriptions.<valeur>`.
- `@icons` → politique d'icône dans `icons`. La variante de règle contient un
  calque texte `icon` (nom exact du calque graphique du composant), ainsi que
  les calques `modifiable`, `OR` et `strict`. Exactement un des calques
  `modifiable` / `strict` doit être visible : le premier autorise le
  remplacement de l'icône par le consommateur, le second impose celle de
  Figma. Le rapprochement se fait uniquement par égalité exacte de nom ; aucun
  rôle de position n'est deviné. Si le calque graphique lie nativement sa
  propriété Figma `visible` à un BOOLEAN, ce booléen est conservé et une prop
  runtime distincte `<bool>Name` est ajoutée pour une icône `modifiable`.
  Sans cette liaison native, l'icône est exportée avec un warning, mais aucune
  prop n'est inventée.
Convention uniforme (aucune logique par composant), lue **sans jamais écrire dans
Figma**. Les règles sont **obligatoires** : conteneur absent ou sans aucune règle
exploitable → **export BLOQUÉ** en pré-vol (erreur explicite), aucun fichier
produit, pas de repli sur la description. Un `@prop` visant une prop/valeur
inexistante → warning (faute de frappe), non bloquant.

**8. Rendu sémantique & garde-fous** — le contrat publie aussi le mapping
générique des rôles vers les propriétés de rendu (`background` →
`background-color`, `foreground` → `color`/`fill`, `border` → couleur et
largeur de bordure, `ring` → contour avec repli `box-shadow`). Toute propriété
pertinente sans variable liée → warning précis (calque + propriété), non
exportée, **export non bloqué**.
`tokensUsed` = liste à plat dédupliquée de tous les tokens de `structure`.

### Sortie

`<Name>.contract.json` est téléchargé ou déposé par PR. Il décrit une **API
unifiée** (wrapper + set comme un seul composant). Exemple Button :

```json
{
  "name": "Button",
  "meta": {
    "contractVersion": "2.0",
    "exportedAt": "2026-07-11T14:00:00.000Z",
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
                  "descriptions": { "contained": "Action la plus importante d'une page.",
                                    "text": "Action secondaire dans un conteneur déjà bordé." } },
    "disabled": { "type": "boolean", "default": false },
    "size":     { "type": "enum", "values": ["big","medium","small"], "default": "medium",
                  "figmaName": "Button-Construc-Type" },
    "iconLeft": { "type": "boolean", "default": false },
    "iconLeftName": { "type": "icon", "default": null,
                       "policy": "modifiable", "visibilityProp": "iconLeft" },
    "iconRight":{ "type": "boolean", "default": false },
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
      "border": { "kind": "stroke", "cssProperties": ["border-color", "border-width"] },
      "ring": { "kind": "stroke", "cssProperties": ["outline-color", "outline-width"],
                 "fallback": "box-shadow" }
    }
  },
  "structure": {
    "layout": "flex-row",
    "gap": "layouts.components.button.medium.gap",
    "padding": { "x": "layouts.components.button.medium.padding-x",
                 "y": "layouts.components.button.medium.padding-y" },
    "radius": "layouts.components.button.medium.border-radius",
    "sizes": {
      "big":    { "gap": "…", "padding": { "x": "…", "y": "…" }, "radius": "…", "fontSize": "…" },
      "medium": { "…": "idem" },
      "small":  { "…": "idem" }
    },
    "children": [
      { "slot": "arrow-left-long", "figmaLayer": "arrow-left-long", "optional": true,
        "visibilityProp": "iconLeft", "size": "components.icons.sizes.base" },
      { "slot": "label", "figmaLayer": "Suivant", "typography": { "…": "étape 4" },
        "color": "components.button.colors.primary.contained.default.foreground" },
      { "slot": "arrow-right-long", "figmaLayer": "arrow-right-long", "optional": true,
        "visibilityProp": "iconRight", "size": "components.icons.sizes.base" }
    ],
    "variantAxes": ["color","variant","state"],
    "variantTokens": { "…": "étape 2" },
    "variantStrokes": { "…": "strokes séparés" }
  },
  "icons": {
    "arrowLeftLong": { "policy": "modifiable", "figmaName": "arrow-left-long",
                         "visibilityProp": "iconLeft", "runtimeProp": "iconLeftName" },
    "arrowRightLong": { "policy": "modifiable", "figmaName": "arrow-right-long",
                          "visibilityProp": "iconRight", "runtimeProp": "iconRightName" }
  },
  "tokensUsed": ["…"],
  "intent": null,
  "warnings": ["…"]
}
```

`meta` porte la version du schéma du contrat (`contractVersion`), la date d'export et la
traçabilité Figma (nom de fichier, id du nœud, clé de composant, lien URL).
L'URL vaut `null` quand l'API ne fournit pas la clé du fichier (plugins en
développement) — un warning le signale, sans bloquer.

### Definition of done

- [ ] `props` : tous les axes `VARIANT`/`BOOLEAN`/`TEXT` + props du wrapper ;
      axe `State` exclu, `Disable` → `disabled`.
- [ ] Couche sémantique appliquée (ex. tailles → `size`) avec `figmaName`
      conservé ; aucun mapping lié à un composant précis.
- [ ] `variantTokens` et `variantStrokes` couvrent **toutes** les combinaisons
      d'axes, nichés selon `variantAxes` ; le premier ne contient que des noms
      de tokens, le second porte couleur, largeur tokenisée et alignement Figma.
- [ ] Un rôle absent d'un état signifie qu'il ne doit pas être rendu ; aucun
      consommateur ne fusionne implicitement cet état avec `default`.
- [ ] `stateModel` mappe les états connus vers leurs déclencheurs et expose
      une priorité déterministe ; les états inconnus restent visibles avec un
      warning.
- [ ] `rendering.roles` documente le rendu partagé des rôles visuels.
- [ ] Typographie remplie en noms de tokens (**test n°1**), fallback `fontStyle`
      géré.
- [ ] Dimensions extraites du wrapper si présent, sinon du composant ;
      `structure.sizes` couvre chaque valeur de l'axe de tailles.
- [ ] `meta` présent : `contractVersion`, `exportedAt`, traçabilité Figma
      (fileName, nodeId, componentKey, url — null toléré avec warning).
- [ ] `children` = vrais calques (texte → `label` + `figmaLayer` ; graphique →
      nom conservé dans `figmaLayer` + `optional` + `size`).
- [ ] Les règles `@icons` distinguent une icône `modifiable` d'une icône
      `strict` par la visibilité de leurs calques dédiés ; le nom du calque
      `icon` correspond exactement au calque graphique exporté.
- [ ] `icons` conserve cette qualification sans modifier les props BOOLEAN ;
      une icône `modifiable` ajoute une prop runtime distincte seulement quand
      Figma lie nativement son calque à un BOOLEAN de visibilité.
- [ ] Aucune valeur brute de design exportée ; une largeur de stroke non
      tokenisée vaut `null` avec warning, tandis que l'alignement structurel
      Figma (`inside`/`center`/`outside`) est conservé.
- [ ] Règles lues dans le conteneur `<Nom>-Rules` : `@usage`/`@do`/`@dont`/`@pairs`
      → `intent`, `@prop` → `props.<prop>.descriptions.<valeur>` ; conteneur
      absent/vide → **export bloqué** ; `@prop` invalide → warning ; jamais
      d'écriture Figma.
- [ ] Résultats aussi fidèles sur un composant **non-Button**.

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
axe multi-marque (1 mode = 1 marque) : **non ignorés**. v1 (simple, un seul
fichier) : `$value` = valeur du mode par défaut, et **tous** les modes portés
sous `$extensions["com.tokenlintel.modes"]` (`{ nom-de-marque: valeur }`).
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

### Definition of done

- [ ] Toutes les variables exportées, chaîne d'alias préservée jusqu'aux
      primitives (aucun maillon aplati, dimensions incluses).
- [ ] Tous les modes de Brand Tokens présents (`$value` défaut + `$extensions`) ;
      collections mono-mode en `$value` seul.
- [ ] `normalizeName` identique à la Partie 1 (tokens recoupables avec les
      `tokensUsed`).
- [ ] JSON DTCG valide, consommable par Style Dictionary v4.

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
  `{componentsPath}/{Nom}/{Nom}.contract.json` ;
- **Exporter les tokens** → PR contenant uniquement
  `{tokensPath}/tokens.json`.

Pour un artefact modifié, le plugin lit la ref de base, crée la branche
`tokenlintel/export-{YYYYMMDD-HHmm}`, écrit le fichier avec l'API Contents puis
ouvre une PR vers la branche de base. Si le contenu est identique, aucune
branche ni PR n'est créée. Config absente/invalide ou erreur GitHub : repli
automatique vers le téléchargement local avec message explicite.

### Definition of done

- [ ] Tous les champs sont persistés et validés inline ; les paths sont
      normalisés et restent relatifs.
- [ ] PAT masqué, conservé uniquement dans `github_pat`, jamais logué.
- [ ] Test de connexion automatique à l'ouverture et après sauvegarde.
- [ ] Une commande = une PR avec son unique artefact ; aucun auto-merge.
- [ ] Aucun changement = aucune PR vide.
- [ ] Toute erreur GitHub conserve l'artefact par téléchargement local.

---

## Hors périmètre MVP

Pas d'écriture dans le document Figma, pas d'auto-merge, pas de
multi-composant en une commande, pas de scoring. Aucun domaine réseau autre que
GitHub API déclarée dans le manifest.
