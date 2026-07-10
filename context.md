
## Contexte général

TokenLintel est un plugin Figma (Plugin API, compatible plan Professional —
aucune dépendance à l'API Variables REST ni à Code Connect). Il tourne dans
l'éditeur, produit des fichiers en téléchargement, n'écrit jamais dans aucun
repo lui-même en MVP (pas de push, pas de PAT, pas d'appel réseau).

Deux commandes : « Export composant » (Partie 1) et « Export tokens »
(Partie 2). Même code Figma API partagé, aucune dépendance logique entre elles.

Stack : TypeScript, `@figma/plugin-typings`, build esbuild ou
`create-figma-plugin`. UI minimale : deux boutons + zone de log/erreurs.

---

## Structure Figma de référence (source de vérité — le plugin doit s'y conformer)

Collections de variables, dans l'ordre des tiers d'alias :

1. **Primitives** — palettes brutes. `Blue Deep`, `Blue Sky`, `Green Grass`,
   `Grey Titanium` (0→1200), `Terracota` (50→900), etc. Feuilles : valeurs
   finales, aucun alias sortant.

2. **Brands** — palettes par marque, alias vers Primitives.
   `Intencial/Primary/50…900` où `primary.50 → Primitives.Terracota.50`,
   `Intencial/Secondary/50…900 → Primitives.Terracota.*`. D'autres marques
   viendront.

3. **Brand Tokens** — couleurs de marque réellement utilisées, échelle
   réduite par emphase, **avec gestion des modes (1 mode = 1 marque)** pour
   switcher la marque dans les designs. `Primary/{strong,emphasis,default,
   subtle,subtlest}` où `strong → Brand Tokens.Intencial.Primary.600`. Idem
   `Secondary`. **Les modes de cette collection portent la mécanique
   multi-marque — ils NE sont PAS ignorés (voir Partie 2, étape modes).**

4. **Utilities** — palettes complètes jouant le rôle d'alias sémantique.
   `Success`, `Info`, `Warning`, `Danger` (50→900), `Neutral` (50→1100 +
   white + black).

5. **Components** — mapping exhaustif par composant, alias vers Brand Tokens
   et Utilities. Ex. :
   `button/primary/contained/default/background → Brand Tokens.Primary.default`
   `button/primary/contained/default/foreground → Utilities.Neutral.50`
   niveaux `{default,hover,focus,press,disable}`, variantes
   `{contained,outlined,text}`, pour `{primary,secondary}`.

Collections non-couleur :

6. **Size**
   - `Spacing/{none,1,2,4,6,8,…}` — feuilles (valeurs px).
   - `FontSize/{4xs,3xs,2xs,xs,sm,base,…}` — alias vers `Spacing/*`.

7. **Layout**
   - `Sizing/{0,0.5,1,1.5,…}` — alias vers `Spacing/*`.
   - `Radius/{xs,sm,md,lg,…}`.
   - `Stroke/{Outline,Ring}`.
   - `FontFamily/base → Open Sans`.
   - `FontWeight/{400→Regular,600→SemiBold,700→Bold}`.
   - `LineHeight/{4xs,3xs,2xs,xs,sm,base,…}`.
   - `TextScale/{display-large,…,body-medium,label-medium,label-small}` —
     alias vers `FontSize/*` (composites typo, voir note typo).
   - `Components/Button/{Big,Medium,Small}/{gap,padding-y,padding-x,
     border-radius,font-size}` — dimensions du bouton, tokenisées.
   - `Components/Icons/{sm,base,lg,xl}`.

**Conséquence n°1 (chaîne d'alias profonde)** : un fond de bouton résout en
Components → Brand Tokens → Brands → Primitives → hex (jusqu'à 4 sauts). Le
plugin PRÉSERVE chaque maillon comme référence, n'aplatit JAMAIS.

**Conséquence n°2 (alias cross-type)** : les alias existent aussi sur les
dimensions (`FontSize → Spacing`, `Sizing → Spacing`, `TextScale → FontSize`).
La résolution d'alias s'applique à TOUS les types de variables, pas juste COLOR.

---

## Structure du composant Button (pour la Partie 1)

Composant **imbriqué**, deux component sets emboîtés :

- `sizeWrapperButton` : component set interne. Variants `size` (big/medium/
  small) × position d'icône (icon left / icon right). **Porte les tokens de
  LAYOUT** (gap, padding, border-radius, font-size → `Layout.Components.
  Button.*`, `Size.FontSize.*`).
- `Button` : component set externe qui instancie le wrapper et expose toutes
  les combinaisons. Variants :
  - `Color` : Primary / Secondary
  - `Variant` : Contained / Outlined / Text
  - `State` : Default / Hover / Focus / Press / Disable
  - **Porte les tokens de COULEUR** (`Components.button.*`).

Le plugin parcourt **à travers l'instance** `sizeWrapperButton` pour les
dimensions, et lit le niveau `Button` pour les couleurs. Les deux ne sont pas
sur le même node.

---

## PARTIE 1 — Commande « Export composant »

### But
Produire `Button.contract.json` : props valides, structure tokenisée (couleur
ET layout via le composant imbriqué), tokens consommés, intention. Porte le
**test de validation n°1** (typographie). Implémenter et valider avant la
Partie 2.

### Entrée
Sélection d'un component set `Button`. Vérifier `selection[0].type ===
"COMPONENT_SET"`, sinon erreur UI explicite.

### Étape 1 — Props (composant externe Button)
Lire `componentPropertyDefinitions` du component set `Button`. Traduire
`Color`, `Variant` (VARIANT → enum) en `props`.
**Convention `State`** : la propriété VARIANT `State` (Default/Hover/Focus/
Press/Disable) est **design-only**, exclue de `props`. Exception : `Disable`
→ prop booléenne `disabled: boolean`. Les autres états ne sont pas des props.

### Étape 2 — Couleurs par état (source de vérité = tokens Components)
Les couleurs par état se lisent depuis l'arbo `Components.button.{color}.
{variant}.{state}.{background|foreground}`. Pour le variant de référence
(Primary/Contained), relever par état les tokens liés (`boundVariables.fills`
sur le fond → `background`, sur le texte → `foreground`) :

```json
"stateTokens": {
  "background": {
    "default":  "components.button.primary.contained.default.background",
    "hover":    "components.button.primary.contained.hover.background",
    "focus":    "components.button.primary.contained.focus.background",
    "pressed":  "components.button.primary.contained.press.background",
    "disabled": "components.button.primary.contained.disable.background"
  },
  "foreground": { "default": "...", "…": "..." }
}
```
Résolution : `boundVariables[field]` → `VariableAlias.id` →
`getVariableByIdAsync(id).name` → `normalizeName()`.

### Étape 3 — Layout (via l'instance imbriquée sizeWrapperButton)
Descendre dans l'instance `sizeWrapperButton` (node `INSTANCE` dont le maître
est le wrapper ; sinon parcours profond jusqu'aux calques portant les
`boundVariables` de dimension). Pour la taille de référence (Medium), relever
gap, padding-x, padding-y, border-radius, font-size, chacun lié à un token
`layout.components.button.medium.*` / `size.fontsize.*`. Assembler dans
`structure`.

### Étape 4 — Typographie (test bloquant n°1)
FontSize/FontWeight/LineHeight/FontFamily sont des collections séparées.
Deux cas, dans l'ordre :
1. `textStyleId` non vide → `getStyleByIdAsync` → `.name` → `normalizeName` →
   `structure.label.typography` (string).
2. Sinon relever les variables liées du calque texte vers `size.fontsize.*`,
   `layout.fontweight.*`, `layout.lineheight.*`, `layout.fontfamily.base` :
   ```json
   "typography": {
     "fontSize": "size.fontsize.base",
     "fontWeight": "layout.fontweight.600",
     "lineHeight": "layout.lineheight.base",
     "fontFamily": "layout.fontfamily.base"
   }
   ```
**Le test n°1 vérifie que ce bloc est rempli en NOMS de tokens (cas 1 OU 2),
jamais vide, jamais brut.** Vu ta structure (FontSize/Weight/Line/Family en
variables distinctes), le cas 2 est le plus probable — le tester en priorité.

### Étape 5 — Assembler `structure`
```json
"structure": {
  "layout": "flex-row",
  "gap": "layout.components.button.medium.gap",
  "padding": { "x": "layout.components.button.medium.padding-x",
               "y": "layout.components.button.medium.padding-y" },
  "radius": "layout.components.button.medium.border-radius",
  "children": [
    { "slot": "icon", "optional": true, "size": "layout.components.icons.base" },
    { "slot": "label", "typography": { /* étape 4 */ }, "color": "<foreground default>" }
  ],
  "stateTokens": { /* étape 2 */ }
}
```
Mapping calque→slot par nom de calque Figma (`icon`, `label`). Slot inconnu =
inclus tel quel, jamais tu.

### Étape 6 — Intention
Lire `componentSetNode.description`, parser `@usage`, `@do` (répétable),
`@dont` (répétable), `@pairs` (virgules). → `intent:{usage,do[],dont[],
pairs[]}` ou `null`+warning si vide.

### Étape 7 — Garde-fou valeurs brutes
Propriété pertinente (fill/gap/padding/radius/fontSize) sans `boundVariables`
→ warning UI précis (calque+propriété), non exportée, export non bloqué.

### Étape 8 — `tokensUsed`
Liste à plat dédupliquée de tous les tokens de `structure`+`stateTokens`.

### Sortie
```json
{
  "name": "Button",
  "props": {
    "color":   { "type": "enum", "values": ["primary","secondary"], "default": "primary" },
    "variant": { "type": "enum", "values": ["contained","outlined","text"], "default": "contained" },
    "size":    { "type": "enum", "values": ["big","medium","small"], "default": "medium" },
    "iconPosition": { "type": "enum", "values": ["left","right"], "default": "left" },
    "disabled": { "type": "boolean", "default": false }
  },
  "structure": { /* étape 5 */ },
  "tokensUsed": ["..."],
  "intent": { /* ou null */ },
  "warnings": ["..."]
}
```
`size` et `iconPosition` viennent du wrapper interne — les remonter dans les
props du contrat unifié. Le contrat décrit le bouton comme UNE API, pas deux
composants. Téléchargement `Button.contract.json`.

### Definition of done — Partie 1
- [ ] `props` fusionne Button externe (color, variant, state→disabled) ET
      wrapper interne (size, iconPosition).
- [ ] `props` sans `state`, avec `disabled` booléen.
- [ ] Bloc typographie rempli en noms de tokens (fontSize/weight/line/family).
      **Test n°1.**
- [ ] Dimensions extraites depuis `sizeWrapperButton`, pointant
      `layout.components.button.*`.
- [ ] `stateTokens` couvre les 5 états en `components.button.*`.
- [ ] Aucune valeur brute exportée ; sinon warning.
- [ ] `intent` reflète la description taguée.

---

## PARTIE 2 — Commande « Export tokens »

### But
Exporter toutes les variables locales en `tokens.json` DTCG, chaîne d'alias
préservée sur tous tiers et tous types, **modes de Brand Tokens inclus**.
Entrée de Style Dictionary.

### Étape 1 — Lister
```ts
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
```

### Étape 2 — `normalizeName()` (COMMUNE avec Partie 1)
`Brand Tokens/Primary/default` → `brand-tokens.primary.default`.
Règles : `/`→`.` ; espaces d'un segment → `-` ; minuscules. **Identique dans
les deux commandes** — un token s'écrit pareil dans `tokens.json` et
`Button.contract.json` (les `components.button.*` doivent recouper les
`tokensUsed` de la Partie 1).

### Étape 3 — Résolution des alias sur TOUS les types (critique)
`valuesByMode[modeId]` = valeur directe OU `{type:"VARIABLE_ALIAS",id}`. Si
alias → résoudre le nom cible et écrire une **référence DTCG** `"{cible}"`,
jamais la valeur finale. S'applique à COLOR comme FLOAT : `size.fontsize.base`
sort `"{size.spacing.8}"`, pas `"8px"`. Feuilles (Primitives, Spacing) =
valeurs directes.

### Étape 4 — Modes : Brand Tokens exporte TOUS ses modes (correction majeure)
La collection **Brand Tokens** utilise les modes comme axe multi-marque
(1 mode = 1 marque). NON ignorés. Émettre les valeurs par mode. Deux options :
- (a) un jeu de valeurs par mode/marque (ex. fichiers/sections
  `tokens.brand-intencial.json`, …), mêmes noms de tokens, valeurs du mode ;
- (b) `$extensions` portant les valeurs par mode sur chaque token.
Recommandation : **(a)** — plus simple pour Style Dictionary v4 et le mapping
vers un thème CSS. Documenter le choix en tête du fichier.
Autres collections : mode par défaut (`modes[0]`) uniquement. Multi-mode
inattendu ailleurs → warning UI.

### Étape 5 — DTCG
Chaque variable → `{$value,$type}`. Groupes = objets imbriqués. Mapping :
- `COLOR`→`"color"` ; `FLOAT`→`"dimension"` (+`px`) SAUF groupes sans unité
  (`fontweight`, `lineheight` ratio, opacités)→`"number"` (les lister dans le
  code, ne pas deviner) ; `STRING`→`"string"` ; `BOOLEAN`→`"boolean"`.

Exemple (chaîne préservée sur 4 niveaux) :
```json
{
  "primitives": { "terracota": { "600": { "$value": "#C1440E", "$type": "color" } } },
  "brands": { "intencial": { "primary": { "600": { "$value": "{primitives.terracota.600}", "$type": "color" } } } },
  "brand-tokens": { "primary": { "default": { "$value": "{brands.intencial.primary.600}", "$type": "color" } } },
  "components": { "button": { "primary": { "contained": { "default": {
    "background": { "$value": "{brand-tokens.primary.default}", "$type": "color" } } } } } }
}
```

### Sortie
`tokens.json` (ou jeu de fichiers par marque si (a)), DTCG valide, toutes
collections couvertes, importable par Style Dictionary v4.

### Definition of done — Partie 2
- [ ] Toutes les variables exportées.
- [ ] Chaîne d'alias intégralement préservée jusqu'aux primitives, aucun
      maillon aplati.
- [ ] Alias de dimension (`fontsize→spacing`, `sizing→spacing`,
      `textscale→fontsize`) préservés comme références, pas en px.
- [ ] Tous les modes de Brand Tokens exportés (un jeu par marque) ; autres
      collections en mode défaut.
- [ ] `normalizeName` identique à la Partie 1.
- [ ] JSON DTCG valide, consommable par Style Dictionary v4.

---

## Hors périmètre MVP
Pas de commit/push/PR/PAT/réseau, pas d'écriture Figma, pas de multi-composant
en une commande, pas de scoring. Chaque commande produit un fichier téléchargé ;
commit manuel.
ENDOFSPEC
echo "réécrit"
Sortie

réécrit
Terminé

Vous n’avez plus de crédits d’utilisation. Achetez-en davantage pour continuer maintenant, ou attendez jusqu’à 17:40 lorsque l’utilisation de votre forfait se réinitialise.
Acheter plus




Claude est une IA et peut faire des erreurs. Veuillez vérifier les réponses.


Plugin spec · MD
TokenLintel — Spécification technique du plugin (v2, adaptée à la structure réelle)
À placer à la racine du repo token-lintel. Brief d'implémentation pour Claude Code. Deux commandes indépendantes. Cette version est calée sur la structure de collections réelle du fichier Figma (voir section "Structure Figma de référence" ci-dessous) — la respecter à la lettre.

Contexte général
TokenLintel est un plugin Figma (Plugin API, compatible plan Professional — aucune dépendance à l'API Variables REST ni à Code Connect). Il tourne dans l'éditeur, produit des fichiers en téléchargement, n'écrit jamais dans aucun repo lui-même en MVP (pas de push, pas de PAT, pas d'appel réseau).

Deux commandes : « Export composant » (Partie 1) et « Export tokens » (Partie 2). Même code Figma API partagé, aucune dépendance logique entre elles.

Stack : TypeScript, @figma/plugin-typings, build esbuild ou create-figma-plugin. UI minimale : deux boutons + zone de log/erreurs.

Structure Figma de référence (source de vérité — le plugin doit s'y conformer)
Collections de variables, dans l'ordre des tiers d'alias :

Primitives — palettes brutes. Blue Deep, Blue Sky, Green Grass, Grey Titanium (0→1200), Terracota (50→900), etc. Feuilles : valeurs finales, aucun alias sortant.
Brands — palettes par marque, alias vers Primitives. Intencial/Primary/50…900 où primary.50 → Primitives.Terracota.50, Intencial/Secondary/50…900 → Primitives.Terracota.*. D'autres marques viendront.
Brand Tokens — couleurs de marque réellement utilisées, échelle réduite par emphase, avec gestion des modes (1 mode = 1 marque) pour switcher la marque dans les designs. Primary/{strong,emphasis,default, subtle,subtlest} où strong → Brand Tokens.Intencial.Primary.600. Idem Secondary. Les modes de cette collection portent la mécanique multi-marque — ils NE sont PAS ignorés (voir Partie 2, étape modes).
Utilities — palettes complètes jouant le rôle d'alias sémantique. Success, Info, Warning, Danger (50→900), Neutral (50→1100 + white + black).
Components — mapping exhaustif par composant, alias vers Brand Tokens et Utilities. Ex. : button/primary/contained/default/background → Brand Tokens.Primary.default button/primary/contained/default/foreground → Utilities.Neutral.50 niveaux {default,hover,focus,press,disable}, variantes {contained,outlined,text}, pour {primary,secondary}.
Collections non-couleur :

Size
Spacing/{none,1,2,4,6,8,…} — feuilles (valeurs px).
FontSize/{4xs,3xs,2xs,xs,sm,base,…} — alias vers Spacing/*.
Layout
Sizing/{0,0.5,1,1.5,…} — alias vers Spacing/*.
Radius/{xs,sm,md,lg,…}.
Stroke/{Outline,Ring}.
FontFamily/base → Open Sans.
FontWeight/{400→Regular,600→SemiBold,700→Bold}.
LineHeight/{4xs,3xs,2xs,xs,sm,base,…}.
TextScale/{display-large,…,body-medium,label-medium,label-small} — alias vers FontSize/* (composites typo, voir note typo).
Components/Button/{Big,Medium,Small}/{gap,padding-y,padding-x, border-radius,font-size} — dimensions du bouton, tokenisées.
Components/Icons/{sm,base,lg,xl}.
Conséquence n°1 (chaîne d'alias profonde) : un fond de bouton résout en Components → Brand Tokens → Brands → Primitives → hex (jusqu'à 4 sauts). Le plugin PRÉSERVE chaque maillon comme référence, n'aplatit JAMAIS.

Conséquence n°2 (alias cross-type) : les alias existent aussi sur les dimensions (FontSize → Spacing, Sizing → Spacing, TextScale → FontSize). La résolution d'alias s'applique à TOUS les types de variables, pas juste COLOR.

Structure du composant Button (pour la Partie 1)
Composant imbriqué, deux component sets emboîtés :

sizeWrapperButton : component set interne. Variants size (big/medium/ small) × position d'icône (icon left / icon right). Porte les tokens de LAYOUT (gap, padding, border-radius, font-size → Layout.Components. Button.*, Size.FontSize.*).
Button : component set externe qui instancie le wrapper et expose toutes les combinaisons. Variants :
Color : Primary / Secondary
Variant : Contained / Outlined / Text
State : Default / Hover / Focus / Press / Disable
Porte les tokens de COULEUR (Components.button.*).
Le plugin parcourt à travers l'instance sizeWrapperButton pour les dimensions, et lit le niveau Button pour les couleurs. Les deux ne sont pas sur le même node.

PARTIE 1 — Commande « Export composant »
But
Produire Button.contract.json : props valides, structure tokenisée (couleur ET layout via le composant imbriqué), tokens consommés, intention. Porte le test de validation n°1 (typographie). Implémenter et valider avant la Partie 2.

Entrée
Sélection d'un component set Button. Vérifier selection[0].type === "COMPONENT_SET", sinon erreur UI explicite.

Étape 1 — Props (composant externe Button)
Lire componentPropertyDefinitions du component set Button. Traduire Color, Variant (VARIANT → enum) en props. Convention State : la propriété VARIANT State (Default/Hover/Focus/ Press/Disable) est design-only, exclue de props. Exception : Disable → prop booléenne disabled: boolean. Les autres états ne sont pas des props.

Étape 2 — Couleurs par état (source de vérité = tokens Components)
Les couleurs par état se lisent depuis l'arbo Components.button.{color}. {variant}.{state}.{background|foreground}. Pour le variant de référence (Primary/Contained), relever par état les tokens liés (boundVariables.fills sur le fond → background, sur le texte → foreground) :

json
"stateTokens": {
  "background": {
    "default":  "components.button.primary.contained.default.background",
    "hover":    "components.button.primary.contained.hover.background",
    "focus":    "components.button.primary.contained.focus.background",
    "pressed":  "components.button.primary.contained.press.background",
    "disabled": "components.button.primary.contained.disable.background"
  },
  "foreground": { "default": "...", "…": "..." }
}
Résolution : boundVariables[field] → VariableAlias.id → getVariableByIdAsync(id).name → normalizeName().

Étape 3 — Layout (via l'instance imbriquée sizeWrapperButton)
Descendre dans l'instance sizeWrapperButton (node INSTANCE dont le maître est le wrapper ; sinon parcours profond jusqu'aux calques portant les boundVariables de dimension). Pour la taille de référence (Medium), relever gap, padding-x, padding-y, border-radius, font-size, chacun lié à un token layout.components.button.medium.* / size.fontsize.*. Assembler dans structure.

Étape 4 — Typographie (test bloquant n°1)
FontSize/FontWeight/LineHeight/FontFamily sont des collections séparées. Deux cas, dans l'ordre :

textStyleId non vide → getStyleByIdAsync → .name → normalizeName → structure.label.typography (string).
Sinon relever les variables liées du calque texte vers size.fontsize.*, layout.fontweight.*, layout.lineheight.*, layout.fontfamily.base :
json
   "typography": {
     "fontSize": "size.fontsize.base",
     "fontWeight": "layout.fontweight.600",
     "lineHeight": "layout.lineheight.base",
     "fontFamily": "layout.fontfamily.base"
   }
Le test n°1 vérifie que ce bloc est rempli en NOMS de tokens (cas 1 OU 2), jamais vide, jamais brut. Vu ta structure (FontSize/Weight/Line/Family en variables distinctes), le cas 2 est le plus probable — le tester en priorité.

Étape 5 — Assembler structure
json
"structure": {
  "layout": "flex-row",
  "gap": "layout.components.button.medium.gap",
  "padding": { "x": "layout.components.button.medium.padding-x",
               "y": "layout.components.button.medium.padding-y" },
  "radius": "layout.components.button.medium.border-radius",
  "children": [
    { "slot": "icon", "optional": true, "size": "layout.components.icons.base" },
    { "slot": "label", "typography": { /* étape 4 */ }, "color": "<foreground default>" }
  ],
  "stateTokens": { /* étape 2 */ }
}
Mapping calque→slot par nom de calque Figma (icon, label). Slot inconnu = inclus tel quel, jamais tu.

Étape 6 — Intention
Lire componentSetNode.description, parser @usage, @do (répétable), @dont (répétable), @pairs (virgules). → intent:{usage,do[],dont[], pairs[]} ou null+warning si vide.

Étape 7 — Garde-fou valeurs brutes
Propriété pertinente (fill/gap/padding/radius/fontSize) sans boundVariables → warning UI précis (calque+propriété), non exportée, export non bloqué.

Étape 8 — tokensUsed
Liste à plat dédupliquée de tous les tokens de structure+stateTokens.

Sortie
json
{
  "name": "Button",
  "props": {
    "color":   { "type": "enum", "values": ["primary","secondary"], "default": "primary" },
    "variant": { "type": "enum", "values": ["contained","outlined","text"], "default": "contained" },
    "size":    { "type": "enum", "values": ["big","medium","small"], "default": "medium" },
    "iconPosition": { "type": "enum", "values": ["left","right"], "default": "left" },
    "disabled": { "type": "boolean", "default": false }
  },
  "structure": { /* étape 5 */ },
  "tokensUsed": ["..."],
  "intent": { /* ou null */ },
  "warnings": ["..."]
}
size et iconPosition viennent du wrapper interne — les remonter dans les props du contrat unifié. Le contrat décrit le bouton comme UNE API, pas deux composants. Téléchargement Button.contract.json.

Definition of done — Partie 1
 props fusionne Button externe (color, variant, state→disabled) ET wrapper interne (size, iconPosition).
 props sans state, avec disabled booléen.
 Bloc typographie rempli en noms de tokens (fontSize/weight/line/family). Test n°1.
 Dimensions extraites depuis sizeWrapperButton, pointant layout.components.button.*.
 stateTokens couvre les 5 états en components.button.*.
 Aucune valeur brute exportée ; sinon warning.
 intent reflète la description taguée.
PARTIE 2 — Commande « Export tokens »
But
Exporter toutes les variables locales en tokens.json DTCG, chaîne d'alias préservée sur tous tiers et tous types, modes de Brand Tokens inclus. Entrée de Style Dictionary.

Étape 1 — Lister
ts
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
Étape 2 — normalizeName() (COMMUNE avec Partie 1)
Brand Tokens/Primary/default → brand-tokens.primary.default. Règles : /→. ; espaces d'un segment → - ; minuscules. Identique dans les deux commandes — un token s'écrit pareil dans tokens.json et Button.contract.json (les components.button.* doivent recouper les tokensUsed de la Partie 1).

Étape 3 — Résolution des alias sur TOUS les types (critique)
valuesByMode[modeId] = valeur directe OU {type:"VARIABLE_ALIAS",id}. Si alias → résoudre le nom cible et écrire une référence DTCG "{cible}", jamais la valeur finale. S'applique à COLOR comme FLOAT : size.fontsize.base sort "{size.spacing.8}", pas "8px". Feuilles (Primitives, Spacing) = valeurs directes.

Étape 4 — Modes : Brand Tokens exporte TOUS ses modes (correction majeure)
La collection Brand Tokens utilise les modes comme axe multi-marque (1 mode = 1 marque). NON ignorés. Émettre les valeurs par mode. Deux options :

(a) un jeu de valeurs par mode/marque (ex. fichiers/sections tokens.brand-intencial.json, …), mêmes noms de tokens, valeurs du mode ;
(b) $extensions portant les valeurs par mode sur chaque token. Recommandation : (a) — plus simple pour Style Dictionary v4 et le mapping vers un thème CSS. Documenter le choix en tête du fichier. Autres collections : mode par défaut (modes[0]) uniquement. Multi-mode inattendu ailleurs → warning UI.
Étape 5 — DTCG
Chaque variable → {$value,$type}. Groupes = objets imbriqués. Mapping :

COLOR→"color" ; FLOAT→"dimension" (+px) SAUF groupes sans unité (fontweight, lineheight ratio, opacités)→"number" (les lister dans le code, ne pas deviner) ; STRING→"string" ; BOOLEAN→"boolean".
Exemple (chaîne préservée sur 4 niveaux) :

json
{
  "primitives": { "terracota": { "600": { "$value": "#C1440E", "$type": "color" } } },
  "brands": { "intencial": { "primary": { "600": { "$value": "{primitives.terracota.600}", "$type": "color" } } } },
  "brand-tokens": { "primary": { "default": { "$value": "{brands.intencial.primary.600}", "$type": "color" } } },
  "components": { "button": { "primary": { "contained": { "default": {
    "background": { "$value": "{brand-tokens.primary.default}", "$type": "color" } } } } } }
}
Sortie
tokens.json (ou jeu de fichiers par marque si (a)), DTCG valide, toutes collections couvertes, importable par Style Dictionary v4.

Definition of done — Partie 2
 Toutes les variables exportées.
 Chaîne d'alias intégralement préservée jusqu'aux primitives, aucun maillon aplati.
 Alias de dimension (fontsize→spacing, sizing→spacing, textscale→fontsize) préservés comme références, pas en px.
 Tous les modes de Brand Tokens exportés (un jeu par marque) ; autres collections en mode défaut.
 normalizeName identique à la Partie 1.
 JSON DTCG valide, consommable par Style Dictionary v4.
Hors périmètre MVP
Pas de commit/push/PR/PAT/réseau, pas d'écriture Figma, pas de multi-composant en une commande, pas de scoring. Chaque commande produit un fichier téléchargé ; commit manuel.


