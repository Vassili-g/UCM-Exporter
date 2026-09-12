# Preuves des types DTCG restants

Journal de livraison de la version 2 du format de tokens. Il suit le
[plan](./PLAN-TYPES-DTCG.md) et les lots de sa [revue](./REVUE-TYPES-DTCG.md).
Le journal de la version 1 reste fermé dans
[PREUVES-ALIGNEMENT-DTCG.md](./PREUVES-ALIGNEMENT-DTCG.md).

## État

- Étapes fermées : 0 sans sa mesure Figma, 1, 2, 3 et 4 sans le pin de la CLI
- Porte courante : 0.3, la mesure Figma sur le fichier réel
- Versions npm à publier : `@ucm-kit/core` 0.1.26, `@ucm-kit/cli` 0.1.25,
  `@ucm-kit/adapter-typescript` 0.1.18
- Style Dictionary du consommateur : `5.5.3`, exact, inchangé

| Étape | Statut | Preuve de sortie |
|---|---|---|
| 0.1, 0.2 | tranchées | décisions écrites dans le plan et la revue |
| 0.3 | ouverte | mesure Figma sur le fichier réel, hors d'atteinte d'un agent |
| 0.4 | fermée | sortie courante mesurée, rouges constatés, fichier restauré |
| 1 et 2 | fermées | un commit atomique, 1 032 tests verts |
| 3 | fermée | six mutations rouges, plus la borne TypeScript |
| 4 | fermée hors 4.4 | CSS de la version 1 identique à l'octet, version 2 sans défaut |
| 5 | ouverte | publication des trois paquets |
| 6 | ouverte | porte humaine, publication Community et réexport |

## Étape 0 — Mesurer et décider

### 0.1 et 0.2 — Les deux décisions

- **Lecteur typographique** : la table de
  `packages/kit/src/lecteurs/typography-token-types.mjs` accepte
  `["fontFamily", "string"]` pour `fontFamily`, quelle que soit la version.
  `erreursTypesTypographiques` tourne dans la CI du consommateur et bloque la
  fusion : exiger `fontFamily` refuserait un fichier qu'une variable `STRING`
  sans liaison locale rend légitime, et le designer n'aurait aucun geste.
- **État `ancienne`** : il ne paraît pas dans le rapport.
  `controle-repository.mjs` ne change pas, et ne branche que `future` et
  `invalide`. Un fichier de la version 1 se lit comme un fichier courant.

### 0.3 — Mesure Figma, ouverte

Elle demande le fichier Figma réel, et un agent ne l'atteint pas. Ce qu'elle
doit établir :

1. les scopes de `primitives.fontfamily.base`, et si
   `figma.getLocalTextStylesAsync()` rend le text style qui relie sa famille ;
2. **l'unité d'une `TIMING`.** La référence du plugin dit « number values
   representing seconds », et le centre d'aide de Figma décrit ces variables en
   millisecondes. Saisir une durée connue dans l'interface et relever
   `valuesByMode` sépare les deux : à `500 ms` doit correspondre `0.5`. Une
   valeur de `500` rendrait l'unité `s` fausse d'un facteur mille ;
3. le relevé de `valuesByMode` pour une `EASING` de chaque préréglage, une
   courbe personnalisée, un ressort et une easing multi-mode ;
4. la création de ces variables dans le fichier que le réexport lira, faute de
   quoi aucune feuille de la version 2 n'emploiera les nouveaux types.

Le code ne dépend pas de cette mesure. Sans text style local, aucune preuve
n'est trouvée, la composante reste `string` et le constat part au designer :
la mesure dit ce que le fichier réel obtient, pas si le code s'écrit.

### 0.4 — La sortie courante sur le mouvement

Le fichier de variables des tests a reçu une `TIMING` et quatre `EASING`, sous
le moteur de la version 1 :

```json
"fast":     { "$value": 0.20000000298023224, "$type": "string" },
"linear":   { "$value": { "type": "LINEAR" }, "$type": "string" },
"custom":   { "$value": { "type": "CUSTOM_CUBIC_BEZIER",
              "easingFunctionCubicBezier": { "x1": 0.34, "y1": 1.56,
              "x2": 0.64, "y2": 1 } }, "$type": "string" },
"spring":   { "$value": { "type": "CUSTOM_SPRING",
              "easingFunctionSpring": { "bounce": 0.4 } }, "$type": "string" },
"ease-out": { "$value": { "type": "EASE_OUT" }, "$type": "string" }
```

Deux défauts mesurés : un nombre de secondes publié sous `$type: "string"`, et
la clé `easingFunctionSpring` de l'API Figma dans l'artefact, que l'invariant
de portabilité interdit. `conformiteDtcg.test.ts` et `styleDictionary.test.ts`
rougissent sur ce contenu, le second sur `[object Object]`. Le fichier a été
restauré par copie.

### Le schéma figé, interrogé sur les formes candidates

`packages/plugin/tests/dtcg-2025.10/format.json` passé à Ajv, sur dix-sept
formes :

| Forme | Verdict |
|---|---|
| `duration` `{value, unit: "s"}`, `{value, unit: "ms"}`, référence | acceptées |
| `duration` `null`, nombre nu | refusées |
| `cubicBezier` `[0, 0, 1, 1]`, `[0.34, 1.56, 0.64, 1]`, référence | acceptées |
| `cubicBezier` `[1.1, 0, 0.64, 1]`, `null` | refusées |
| `fontFamily` chaîne, tableau, référence | acceptées |
| `fontFamily` `null` | refusée |
| `string` `null`, `color` `null` | refusées, le dialecte actuel |

La correction 5.1 de la revue est donc mesurée : une feuille typée dont un
alias vise une cible absente entre au dialecte.

### Les typings et la référence Figma

- `@figma/plugin-typings` 1.138.0 : `VariableResolvedDataType` compte six
  membres, `MotionEasing.type` en compte quatorze, `easingFunctionCubicBezier`
  est optionnel, et `VariableValue` admet `MotionEasing`.
- `variableAliases` ne prend pas un `MotionEasing` pour un alias : le filtre
  exige `type === 'VARIABLE_ALIAS'` et un `id`.
- La référence `VariableResolvedDataType` de Figma dit d'une `TIMING` qu'elle
  porte « number values representing seconds ».

### Style Dictionary 5.5.3, groupe `css`

- `time/seconds` filtre sur `$type === "time"` et divise par mille : une
  feuille `duration` traverse le groupe sans transform.
- `fontFamily/css` filtre sur `fontFamily` et `typography`, et pose des
  apostrophes dès que la famille contient une espace.
- `cubicBezier/css` couvre la courbe.

### Le corpus du Playground

721 feuilles : 494 `color`, 208 `dimension`, 18 `number`, une seule `string`,
`primitives.fontfamily.base`.

## Étapes 1 et 2 — Le commit atomique

Les deux étapes forment un commit, pour la raison écrite en 7.2 de la revue.

- Commit : celui qui porte cette entrée.
- Commandes :
  - `npm test` : sortie 0, 1 032 tests verts (19, 52, 298, 640, 23).
  - `npm run typecheck`, `npm run build`, `git diff --check` : sortie 0.
- Ce que le moteur publie, sur le fichier de variables des tests :

```json
"primitives.timing.fast":        { "$value": { "value": 0.20000000298023224, "unit": "s" }, "$type": "duration" },
"primitives.easing.overshoot":   { "$value": [0.34, 1.56, 0.64, 1], "$type": "cubicBezier" },
"primitives.fontfamily.base":    { "$value": "Open Sans", "$type": "fontFamily" },
"brand-tokens.typography.family":{ "$value": "{primitives.fontfamily.base}", "$type": "fontFamily" },
"semantic.motion.duration":      { "$value": "{primitives.timing.fast}", "$type": "duration" }
```

- Résultats :
  - 52 feuilles contre 40 avant, douze de plus. Six variables `EASING` sans
    courbe sont écartées du fichier et nommées : un préréglage, un ressort, un
    `HOLD`, un `CUSTOM_CUBIC_BEZIER` sans points, une abscisse hors bornes et
    une variable multi-mode dont un seul mode est fautif.
  - Aucune clé de l'API Figma dans l'artefact : `easingFunctionSpring`,
    `easingFunctionCubicBezier` et `CUSTOM_SPRING` sont absentes du contenu.
  - Bilan du dialecte, dans les deux sens : `primitives.fontfamily.base` et
    `brand-tokens.typography.family` en sortent, typées `fontFamily` ;
    `primitives.fontfamily.conflit`, `primitives.fontfamily.unbound` et
    `semantic.motion.broken-easing` y entrent. 39 feuilles conformes sur 52.
  - Un alias vers une easing écartée nomme la variable à corriger plutôt qu'une
    absence : « elle cite la variable « easing/spring », que le fichier de
    tokens ne publie pas ».
  - `graissesNumeriques` et `famillesDeTokens` ont une intersection vide sur le
    fichier de tokens des tests, et un test la tient.
- Écart ou réserve : aucun.

## Étape 3 — Les mutations

Chaque mutation est appliquée au fichier source, la suite visée est lancée,
puis le fichier est restauré par copie et comparé à sa sauvegarde.

| Mutation | Fichier | Rouges |
|---|---|---|
| abscisse bornée à `[-1, 2]` | `tokens/mouvement.ts` | 2 |
| ordonnée bornée à `[0, 1]` | `tokens/mouvement.ts` | 4, dont la courbe à `1.56` |
| durée arrondie à trois décimales | `tokens/mouvement.ts` | 2 |
| famille décidée sur la feuille au lieu de la composante | `tokens/familles.ts` | 8 |
| version `1` classée `courante` | `format/tokens.ts` | 5 |
| branche `default` rétablie dans `dtcgType` | `tokens/exportTokens.ts` | 3 |

Une septième mutation vise la borne de compilation. Le retrait du
`case 'EASING'` de `dtcgType`, sans toucher au reste, donne `error TS2345`
sur l'argument passé au paramètre `never` de `typeInconnu`. Un septième membre
des typings Figma produirait la même erreur.

Les sept fichiers ont été restaurés par copie, identiques à leur sauvegarde, et
`npm run typecheck` repasse à zéro erreur.

## Étape 4 — Le consommateur

- Commit du Playground : celui qui porte les deux transforms.
- Commandes :
  - `npx style-dictionary build` avant et après la tâche 4.1, sur le
    `tokens.json` version 1 en place : `src/generated/tokens.css` garde
    l'empreinte
    `ccf89371a396d7b538294ba38a088484940b89adbc236711fbb6b9974bccf0a3`.
  - `npm run build`, build applicatif compris : sortie 0, même empreinte.
  - Compilation d'un `tokens.json` version 2 synthétique par la configuration
    du Playground, dans un dossier temporaire : sortie 0, aucun
    `[object Object]`, aucune apostrophe doublée, aucune référence non résolue,
    aucune valeur vide.
- Ce que la version 2 rend :

```css
--primitives-fontfamily-base: 'Open Sans', sans-serif;
--primitives-fontfamily-mono: RobotoMono, sans-serif;
--primitives-timing-fast: 0.2s;
--primitives-easing-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);
--semantic-family: var(--primitives-fontfamily-base);
--semantic-duration: var(--primitives-timing-fast);
```

- Résultats :
  - Le transform de famille sépare les deux versions par `$type`, sans lire la
    marque. Sous `string`, il pose les guillemets comme avant ; sous
    `fontFamily`, le transform standard les a déjà posés et il n'ajoute que le
    repli. La version 1 reste identique à l'octet, et la version 2 change d'un
    caractère, l'apostrophe au lieu du guillemet.
  - Le transform de durée est celui que `styleDictionary.test.ts` enregistre de
    son côté : sans lui, le groupe `css` standard écrit `[object Object]`.
- Reste la tâche 4.4, le pin de `@ucm-kit/cli` dans `.github/workflows/ucm.yml`.
  Il monte après la publication des paquets et **avant** celle du plugin : un
  Playground resté sur la CLI de la version 1 refuserait le réexport comme une
  version future.
- Écart ou réserve : aucun.

## Limites de ce journal

- Le fichier Figma réel ne contient encore aucune variable `EASING` ou
  `TIMING`. Sans la tâche 0.3, le réexport produira un fichier version 2 dont
  aucune feuille n'emploie ces deux types, et la recette ne pourra comparer
  aucune animation.
- L'unité d'une `TIMING` repose sur la référence du plugin, et non sur une
  mesure dans Figma.
- La preuve de famille du fichier réel n'est établie que par les contrats
  commités, qui montrent qu'un text style relie `primitives.fontfamily.base`.
  Que ce style soit local reste à confirmer.
- La réserve Display P3 de la version 1 reste ouverte, et cette tranche ne la
  touche pas.
