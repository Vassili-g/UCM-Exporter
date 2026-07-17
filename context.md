# TokenLintel — contexte & spécification

## Vision

TokenLintel produit deux artefacts lisibles à la fois par un humain et par un
agent IA, **sans interprétation externe** (cf. `concept.md`) :

- un **contrat de composant (UCS)** — décrit un composant tel qu'il est
  réellement dans Figma : props, structure, tokens, intention et doc par
  valeur (règles lues dans le conteneur `<Nom>-Rules`) ;
- un **export de tokens** DTCG — toutes les variables, chaîne d'alias préservée.

Principe directeur : décrire **fidèlement** ce qui existe dans Figma, dans un
**vocabulaire partagé**. Fidèle = fidèle à la *sémantique* du composant (il a
une taille, un label, des états), pas aux noms de calques accidentels.

## Contexte technique

- Plugin Figma (Plugin API, plan Professional) : **pas** d'API Variables REST,
  pas de Code Connect, **aucun appel réseau**.
- Tourne dans l'éditeur, **produit des fichiers en téléchargement** ; n'écrit ni
  dans Figma ni dans un repo (commit manuel).
- Deux commandes indépendantes qui partagent le même code Figma :
  **Export composant** (Partie 1) et **Export tokens** (Partie 2).
- Stack : TypeScript, `@figma/plugin-typings`, build esbuild. UI minimale
  (deux boutons + zone de log/erreurs).
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
conteneur `<Nom>-Rules` (sinon export bloqué, cf. étape 6).

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
Résolution : `VariableAlias.id` → `getVariableByIdAsync(id).name` →
`normalizeName()`. Sortie = arbre `variantTokens` niché selon `variantAxes` :

```json
"variantAxes": ["color", "variant", "state"],
"variantTokens": {
  "primary": {
    "contained": { "default": { "background": "…", "foreground": "…" },
                   "focus":   { "background": "…", "foreground": "…", "ring": "…" } },
    "outlined":  { "default": { "background": "…", "foreground": "…", "border": "…" } },
    "text":      { "default": { "foreground": "…" } }
  },
  "secondary": { "…": "même structure" }
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

**4. Typographie** (test de validation n°1) — sur le calque texte, dans l'ordre :
`textStyleId` → nom du style ; sinon variables liées `fontSize` / `fontWeight`
(fallback sur le champ `fontStyle`) / `lineHeight` / `fontFamily`. **Ce bloc
doit être rempli en noms de tokens — jamais vide, jamais brut.**

**5. Structure** — `children` = enfants directs réels du node de layout :
- calque **texte** → slot `label` (nom d'origine dans `figmaLayer`), avec
  `typography` (étape 4) et `color` (= `foreground` du variant de référence) ;
- calque **graphique** → nom du calque comme slot, `optional: true`, `size`.

Slots dédupliqués (`label`, `label-2`…). Un calque inattendu est inclus tel
quel, jamais tu.

**6. Intention & doc par valeur** — lues dans un **conteneur Figma** (frame,
section ou groupe) nommé `<Nom>-Rules` (ex. `Button-Rules`), posé à côté du
composant — seul son nom compte, pas son type. Chaque règle est
une instance d'un composant de configuration (`ComponentConfiguration`) dont la
**variante** porte le tag et le calque `content` le texte :
- `@usage` (un), `@do`/`@dont` (répétables), `@pairs` (virgules) → `intent` ;
- `@prop` + calque `prop` (ex. `variant.contained`) → doc par valeur, rangée
  dans `props.<prop>.descriptions.<valeur>`.
Convention uniforme (aucune logique par composant), lue **sans jamais écrire dans
Figma**. Les règles sont **obligatoires** : conteneur absent ou sans aucune règle
exploitable → **export BLOQUÉ** en pré-vol (erreur explicite), aucun fichier
produit, pas de repli sur la description. Un `@prop` visant une prop/valeur
inexistante → warning (faute de frappe), non bloquant.

**7. Garde-fous & `tokensUsed`** — toute propriété pertinente sans variable liée
→ warning précis (calque + propriété), non exportée, **export non bloqué**.
`tokensUsed` = liste à plat dédupliquée de tous les tokens de `structure`.

### Sortie

`<Name>.contract.json` téléchargé — une **API unifiée** (wrapper + set décrits
comme un seul composant). Exemple Button :

```json
{
  "name": "Button",
  "meta": {
    "ucsVersion": "1.1",
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
    "iconLeft": { "type": "boolean", "default": true },
    "iconRight":{ "type": "boolean", "default": true }
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
      { "slot": "arrow-left-long", "optional": true, "size": "layouts.components.icons.base" },
      { "slot": "label", "figmaLayer": "Suivant", "typography": { "…": "étape 4" },
        "color": "components.button.colors.primary.contained.default.foreground" },
      { "slot": "arrow-right-long", "optional": true, "size": "layouts.components.icons.base" }
    ],
    "variantAxes": ["color","variant","state"],
    "variantTokens": { "…": "étape 2" }
  },
  "tokensUsed": ["…"],
  "intent": null,
  "warnings": ["…"]
}
```

`meta` porte la version du schéma (`ucsVersion`), la date d'export et la
traçabilité Figma (nom de fichier, id du nœud, clé de composant, lien URL).
L'URL vaut `null` quand l'API ne fournit pas la clé du fichier (plugins en
développement) — un warning le signale, sans bloquer.

### Definition of done

- [ ] `props` : tous les axes `VARIANT`/`BOOLEAN`/`TEXT` + props du wrapper ;
      axe `State` exclu, `Disable` → `disabled`.
- [ ] Couche sémantique appliquée (ex. tailles → `size`) avec `figmaName`
      conservé ; aucun mapping lié à un composant précis.
- [ ] `variantTokens` couvre **toutes** les combinaisons d'axes, niché selon
      `variantAxes`, rôles = dernier segment du token.
- [ ] Typographie remplie en noms de tokens (**test n°1**), fallback `fontStyle`
      géré.
- [ ] Dimensions extraites du wrapper si présent, sinon du composant ;
      `structure.sizes` couvre chaque valeur de l'axe de tailles.
- [ ] `meta` présent : `ucsVersion`, `exportedAt`, traçabilité Figma
      (fileName, nodeId, componentKey, url — null toléré avec warning).
- [ ] `children` = vrais calques (texte → `label` + `figmaLayer` ; graphique →
      nom + `optional` + `size`).
- [ ] Aucune valeur brute exportée ; sinon warning non bloquant.
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

## Hors périmètre MVP

Pas de commit / push / PR / PAT / réseau, pas d'écriture Figma, pas de
multi-composant en une commande, pas de scoring. Chaque commande produit un
fichier téléchargé ; commit manuel.
