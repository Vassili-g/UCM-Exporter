# Les types DTCG restants : sources Figma, mesures et plan

> Statut : proposé, rien n'est engagé. Cette note traite ce que
> [le plan d'alignement](./PLAN-ALIGNEMENT-DTCG.md#périmètre-fermé) a laissé
> dehors : le typage DTCG de `fontFamily`, les types composés `duration`,
> `cubicBezier`, `strokeStyle`, `border`, `gradient`, `shadow` et `transition`,
> et les variables Figma `EASING` et `TIMING`. Elle se lit avec
> [l'état des lieux](./ALIGNEMENT-DTCG.md) de la version 1 du format de tokens.

## 1. Ce que la recherche établit

### 1.1. La source Figma de chaque type

La commande « Export tokens » publie **toutes les variables locales**. Le type
d'une variable Figma est `BOOLEAN`, `COLOR`, `EASING`, `FLOAT`, `STRING` ou
`TIMING` (`VariableResolvedDataType`, typings `@figma/plugin-typings` 1.138.0).
Aucun type de variable ne porte une bordure, une ombre, un dégradé ni une
transition : ces objets sont des styles Figma, ou des propriétés de calque.

| Type DTCG | Source Figma | Fidélité possible |
|---|---|---|
| `fontFamily` | variable `STRING` | exacte, si le type de la variable est établi autrement que par son nom |
| `duration` | variable `TIMING`, un nombre de secondes | exacte |
| `cubicBezier` | variable `EASING`, un objet `MotionEasing` | partielle : seuls `CUSTOM_CUBIC_BEZIER` et `LINEAR` ont un équivalent |
| `shadow` | `EffectStyle.effects`, via `getLocalEffectStylesAsync()` | exacte pour `DROP_SHADOW` et `INNER_SHADOW` |
| `gradient` | `PaintStyle.paints`, via `getLocalPaintStylesAsync()` | partielle : DTCG ne porte ni la direction ni le genre du dégradé |
| `strokeStyle` | `dashPattern` et `strokeCap` d'un calque | aucun objet Figma ne groupe ces deux propriétés |
| `border` | couleur, `strokeWeight` et `dashPattern` d'un calque | aucun objet Figma ne les groupe |
| `transition` | aucune | Figma ne publie aucun objet qui réunisse durée, délai et courbe |

Trois précisions tirées des typings et de la documentation Figma :

- une variable `TIMING` porte un nombre de secondes, et ce nombre garde le
  bruit du flottant simple précision de Figma. La documentation de `reactions`
  en donne un exemple, `duration: 0.20000000298023224` ;
- `easingFunctionCubicBezier` n'est renseigné que pour le type
  `CUSTOM_CUBIC_BEZIER`, et `easingFunctionSpring` que pour `CUSTOM_SPRING`
  ([Transition](https://developers.figma.com/docs/plugins/api/Transition/)).
  Figma ne publie pas les points de contrôle de ses préréglages nommés, et
  `GENTLE`, `QUICK`, `BOUNCY` et `SLOW` sont des ressorts, qu'aucune courbe de
  Bézier n'exprime ;
- `ColorStop.boundVariables.color` et `DropShadowEffect.boundVariables`
  existent. Les parties d'un dégradé ou d'une ombre peuvent donc rester des
  références DTCG, sans aplatir une chaîne d'alias.

### 1.2. Ce que le consommateur rend aujourd'hui

Mesure sur Style Dictionary `5.5.3`, la dernière version publiée, avec le
groupe de transforms `css` et `usesDtcg: true`. Un fichier de tokens portant
une feuille de chaque type a été compilé, et voici sa sortie.

| Type publié | Déclaration CSS obtenue |
|---|---|
| `fontFamily` chaîne | `'Open Sans'` |
| `fontFamily` tableau | `'Open Sans', sans-serif` |
| `duration` `{ value, unit }` | `[object Object]` |
| `cubicBezier` | `cubic-bezier(0, 0, 0.58, 1)` |
| `strokeStyle` chaîne | `solid` |
| `strokeStyle` objet | `dashed`, le repli que le module prévoit |
| `border` | `1px solid rgb(0% 0% 0%)` |
| `gradient` | `[object Object],[object Object]` |
| `shadow`, un ou plusieurs | `0px 2px 4px 0px rgb(0% 0% 0% / 0.25)` |
| `transition` | `[object Object] cubic-bezier(0, 0, 0.58, 1) [object Object]` |

Trois types sortent illisibles. Le transform standard `time/seconds` filtre sur
`$type === "time"`, un nom que le module `2025.10` n'emploie pas, et laisse
donc une `duration` sans traitement. `transition/css/shorthand` porte dans son
code le commentaire `TODO: add support for DTCG duration object value type`, et
concatène l'objet. Aucun transform de dégradé n'existe dans la bibliothèque.

Une `duration` et une `transition` demandent donc un transform propre au
Playground, comme la famille en demande déjà un pour son repli.

### 1.3. Le défaut courant des variables `EASING` et `TIMING`

`dtcgType` range `EASING` et `TIMING` dans son cas par défaut, `string`, et
`formatValue` recopie la valeur brute. Un export du fichier de variables de
test, complété de quatre variables de mouvement, produit ceci :

```json
"easing": {
  "out": { "$value": { "type": "EASE_OUT" }, "$type": "string" },
  "bouncy": {
    "$value": { "type": "CUSTOM_SPRING", "easingFunctionSpring": { "bounce": 0.4 } },
    "$type": "string"
  }
},
"duration": { "fast": { "$value": 0.2, "$type": "string" } }
```

Trois écarts se lisent dans cette sortie. Un objet d'extraction Figma entre
dans l'artefact, avec ses noms de champs. Le `$type` annoncé contredit la
valeur publiée, pour les deux types de variable. Et
[FORMAT.md](../FORMAT.md#partie-2--export-tokens) décrit ces deux types comme
« publiées en `string` », ce que le code ne fait que pour le `$type`.

Aucun test ne l'attrape : `packages/plugin/tests/fichierDeVariables.ts` ne
contient ni variable `EASING` ni variable `TIMING`, et le corpus du Playground
n'en contient pas non plus. Le plugin publié produit donc déjà cette sortie sur
un fichier Figma qui emploie des variables de mouvement.

### 1.4. L'autorité qui manquait au typage de la famille

[L'état des lieux](./ALIGNEMENT-DTCG.md#4-pourquoi-différer-le-typage-de-la-famille)
diffère `fontFamily` pour deux raisons. La première est l'absence d'autorité :
aucune table ne vérifie un nom de famille, et le seul scope Figma disponible,
`FONT_FAMILY`, n'est pas obligatoire. La seconde est le transform
`fontFamily/css-quote` du Playground.

Une troisième autorité existe et n'a pas été considérée : **les liaisons des
text styles locaux**. `TextStyle.boundVariables.fontFamily` désigne la variable
reliée à la police d'un style, et `VariableBindableTextField` réserve ce champ
à une famille. Le moteur lit déjà ces liaisons pour le contrat
(`extractVariantTypography.ts`, champ `fontFamily`). La commande de tokens ne
lit pas les text styles, et `getLocalTextStylesAsync()` les rend.

Cette autorité est exacte, et elle se combine au graphe d'alias de la même
façon que `graissesNumeriques` combine la table des graisses.

La seconde raison est mesurée. Sur le `tokens.json` du Playground, typer la
seule feuille `primitives.fontfamily.base` en `fontFamily` change une ligne du
CSS produit :

```diff
-  --primitives-fontfamily-base: "Open Sans", sans-serif;
+  --primitives-fontfamily-base: "'Open Sans'", sans-serif;
```

Le transform standard `fontFamily/css` pose les apostrophes, puis
`fontFamily/css-quote` pose les guillemets et le repli. Le navigateur cherche
alors une famille dont le nom contient les apostrophes. Le geste de correction
est de réduire le transform du Playground au seul repli, qui est la décision de
l'application, et de laisser le transform standard poser les guillemets.

Le coût côté kit est également mesuré. `TYPES_TYPOGRAPHIQUES` de
`typography-token-types.mjs` attend `["string"]` pour `fontFamily`. Avec la
feuille typée, `erreursTypesTypographiques` rend 8 erreurs bloquantes réparties
sur 3 des 4 contrats du Playground, toutes de la forme « attendu `string`, reçu
`fontFamily` ». Une entrée de table élargie à `["string", "fontFamily"]` les
supprime.

## 2. Le périmètre proposé

Les huit types se répartissent en trois groupes, selon la source dont ils
disposent.

**Groupe A, engageable.** `fontFamily`, `duration` et `cubicBezier` ont une
source parmi les variables locales, donc à l'intérieur de la portée déclarée de
la commande. Les sections 3 et 4 les traitent.

**Groupe B, derrière une porte de produit.** `shadow` et `gradient` ont une
source Figma exacte, les effect styles et les paint styles, hors des variables.
Les publier élargit la portée de la commande, ce qu'aucun besoin n'a encore
demandé. Trois conditions s'ajoutent : un nom de token pour un style, que
`joinTokenPath` ne sait pas fabriquer ; la perte de la direction et du genre
d'un dégradé, que DTCG ne porte pas et dont il faudrait avertir ; et
l'illisibilité du dégradé chez le consommateur, mesurée en 1.2. Une quatrième
condition tient au contrat : `unsupportedProperties.ts` signale aujourd'hui un
effet et une peinture non unie comme non portés, et aucun champ du contrat ne
cite un token d'ombre ou de dégradé. Publier ces tokens sans étendre le contrat
livrerait des tokens qu'aucun contrat ne référence.

**Groupe C, refusé.** `border`, `transition` et `strokeStyle` n'ont aucune
source. Les construire demanderait de grouper des tokens voisins par une
convention de nommage, que le format n'a pas et que le designer devrait
apprendre. Le rendu chez le consommateur reste par ailleurs illisible pour
`transition`.

## 3. Les décisions à prendre

Quatre décisions ne se déduisent ni du code ni de la documentation Figma. Une
recommandation accompagne chacune.

### 3.1. Ce qu'une variable `EASING` non exprimable publie

Un ressort, un préréglage nommé autre que `LINEAR`, `HOLD` et une courbe dont
un point de contrôle sort de l'intervalle `[0, 1]` n'ont pas d'équivalent
`cubicBezier`. Quatre sorties sont possibles : recopier le nom du préréglage en
chaîne, retirer la variable du fichier, poser une table de correspondance, ou
publier `$value: null` sous `$type: "cubicBezier"` avec un avertissement.

Recommandation : `$value: null` et un avertissement. Cette forme existe déjà
pour un alias dont la cible est absente, le schéma juge alors la feuille non
conforme, et le chemin du token reste dans le fichier. La table de
correspondance est écartée pour la raison de la section 1.1 : Figma ne publie
pas les points de contrôle de ses préréglages.

### 3.2. L'unité d'une `duration`

Figma fournit des secondes, avec le bruit du flottant. DTCG accepte `s` et
`ms`.

Recommandation : `{ "value": <le nombre de Figma>, "unit": "s" }`, sans
conversion ni arrondi. La version 1 a déjà tranché ce principe pour les canaux
d'une couleur, et tout arrondi appartient au transform du consommateur.

### 3.3. Ce qui décide qu'une `STRING` est une famille

Recommandation : deux autorités, et le nom du chemin n'en est pas une.

1. la variable est reliée au champ `fontFamily` d'un text style local ;
2. la variable déclare le scope `FONT_FAMILY` sans déclarer `ALL_SCOPES` ;
3. chacun de ses modes porte un alias vers une variable déjà décidée `fontFamily`.

Une `STRING` rangée sous un segment `fontfamily` que ni 1 ni 2 ni 3 ne décide
reste `string`, et l'export avertit le designer avec le geste qui la décide.
Cette règle a la forme de celle des graisses, et pour la même raison : une
valeur libre ne se type pas sur un nom.

### 3.4. Ce que la version 2 fait d'un fichier en version 1

`etatDuFormatDeTokens` rend `invalide` pour tout entier inférieur à la version
courante, et son commentaire demande qu'une version suivante nomme ici la
version qu'elle remplace. Passer `TOKENS_FORMAT_VERSION` à `2` rendrait donc
tout fichier de la version 1 invalide, et refuserait le contrôle d'un
repository qui n'a pas encore réexporté.

Recommandation : ajouter un état `ancienne`, qui porte la version lue, autorise
la lecture et produit un avertissement nommant le réexport. Les chemins, les
clés `$value` et les références ne changent pas entre les deux versions, et
aucune référence d'un contrat déjà fusionné ne cesse de résoudre.

## 4. Le plan, lot par lot

Chaque lot se ferme sur une preuve enregistrable : une sortie de test, un
`diff` de CSS ou un relevé de compte. L'ordre suit celui de
[COMPATIBILITE.md](../COMPATIBILITE.md#lordre-dune-nouvelle-version-du-format-de-tokens) :
les paquets d'abord, le consommateur ensuite, le plugin en dernier.

### L1. Le kit accepte les nouveaux types

- `typography-token-types.mjs` : `fontFamily: ["string", "fontFamily"]`.
- `packages/kit/src/format/tokens.ts` : `$type` de `TokenDeDocument` reçoit
  `fontFamily`, `duration` et `cubicBezier` ; `ValeurDeToken` reçoit les deux
  formes de valeur correspondantes.
- `etatDuFormatDeTokens` reçoit l'état `ancienne` décidé en 3.4, et
  `TOKENS_FORMAT_VERSION` reste à `1` dans ce lot.
- Tests du kit : un contrat dont la famille est typée ne produit plus d'erreur,
  un fichier marqué `1` sous une version courante `2` est `ancienne`.

Preuve : la mesure de la section 1.4 rejouée, 8 erreurs puis 0.

### L2. Le kit, la CLI et l'adaptateur sont publiés

Publication et vérification sur npm dans l'ordre `@ucm-kit/core`,
`@ucm-kit/cli`, `@ucm-kit/adapter-typescript`. Sur un fichier d'origine et sur
un fichier de version 1, le verdict ne change pas.

### L3. Le moteur décide le type d'une famille

- Nouveau module `packages/plugin/src/tokens/familles.ts`, jumeau de
  `graisses.ts` : une décision par variable, sur tous ses modes et tout son
  graphe d'alias, mémorisée, bornée sur une boucle.
- `handleExportTokens` lit `figma.getLocalTextStylesAsync()` une fois par
  export et passe l'ensemble des variables reliées à une police au contexte.
- `ExportContext` reçoit `familles`, à côté de `graisses`.
- Avertissement pour une `STRING` sous un segment `fontfamily` qu'aucune
  autorité ne décide, avec le geste de la section 3.3.
- `fichierDeVariables.ts` reçoit un text style qui relie une famille, une
  famille décidée par son scope, une famille qu'aucune autorité ne décide, et
  une chaîne d'alias de familles. `exporterLeFichier` complète son faux
  `figma` de `getLocalTextStylesAsync`.

### L4. Le moteur publie `duration` et `cubicBezier`

- `dtcgType` : `TIMING` donne `duration`, `EASING` donne `cubicBezier`.
- `formatValue` : une `TIMING` donne `{ value, unit: "s" }` ; une `EASING` de
  type `CUSTOM_CUBIC_BEZIER` donne `[x1, y1, x2, y2]` ; une `EASING` de type
  `LINEAR` donne `[0, 0, 1, 1]`.
- La décision d'exprimabilité d'une `EASING` porte sur tous les modes et sur le
  graphe d'alias, comme celle d'une graisse : un seul mode inexprimable rend la
  variable entière inexprimable.
- Tout autre cas donne `$value: null` et l'avertissement de la section 3.1 : un
  ressort, `HOLD`, un préréglage nommé, et une abscisse hors de `[0, 1]`.
- `fichierDeVariables.ts` reçoit une `TIMING`, une `EASING` de chaque cas
  ci-dessus, et une `EASING` aliasée.

Preuve : `conformiteDtcg.test.ts` rejoué. La liste `DIALECTE` perd la famille
et gagne les feuilles d'easing inexprimables, et le compte des feuilles
conformes monte.

### L5. La version 2 est écrite

- `TOKENS_FORMAT_VERSION` passe à `2`, dans `packages/kit/src/format/tokens.ts`
  et nulle part ailleurs.
- `annonceDuFormat` annonce la version lue dans le fichier produit.
- `CHANGELOG-FORMAT.md` reçoit l'entrée, classée en classe 10.
- `COMPATIBILITE.md` reçoit la ligne de la version 2 et celle de l'état
  `ancienne`.

### L6. Le Playground lit les nouvelles valeurs

- `fontFamily/css-quote` est réduit au seul repli `, sans-serif`, le transform
  standard `fontFamily/css` posant les guillemets.
- Nouveau transform `duration/css`, qui écrit `${value}${unit}`, puisque
  `time/seconds` ne filtre pas ce type.
- `cubicBezier` ne demande aucun transform.
- Le `diff` du CSS produit avant et après le réexport est la preuve du lot.

### L7. Les documents suivent

- `FORMAT.md`, Partie 2 : la table des types reçoit `fontFamily`, `duration` et
  `cubicBezier` ; le paragraphe du dialecte perd `EASING` et `TIMING` et gagne
  le cas d'une easing inexprimable.
- `SPEC.md`, Partie 2 : l'autorité du type d'une famille, la lecture des text
  styles, et la décision d'exprimabilité d'une easing.
- `AGENTS.md`, groupe « Tokens et variables » : deux invariants nommant
  `familles.ts` et le module d'easing comme uniques autorités, et la carte du
  code reçoit les deux fichiers.
- `docs/README.md` référence cette note.

### L8. Groupe B, si la porte s'ouvre

Non planifié en détail tant que la décision de la section 2 n'est pas prise. Le
lot commencerait par le nommage d'un token de style et par la décision sur la
direction d'un dégradé.

## 5. Les portes humaines

| Porte | Ce qui est demandé |
|---|---|
| H1 | Les quatre décisions de la section 3 |
| H2 | L'ouverture ou le refus du groupe B |
| H3 | La publication du plugin sur la Community, après L6 |
| H4 | Le réexport depuis Figma, et la relecture du CSS produit |

## 6. Les limites des mesures

- Les mesures de Style Dictionary portent sur un fichier de tokens écrit à la
  main, pas sur un export réel. Aucun fichier Figma disponible ne contient de
  variable `EASING` ou `TIMING`.
- Le corpus du Playground compte 721 feuilles et une seule `STRING`, la
  famille. Il n'établit pas la généralité de la règle de la section 3.3 : une
  seule variable de famille y sera décidée.
- Le scope réel de `primitives.fontfamily.base` dans le fichier Figma n'est pas
  connu, `tokens.json` ne portant pas les scopes. La première autorité de la
  section 3.3 devra être vérifiée sur ce fichier avant L3.
- Aucune vérification visuelle n'est prévue par ce plan. Le typage de la
  famille change une déclaration CSS, et le rendu de la police se juge à l'œil
  sur la pull request qui porte le réexport.
