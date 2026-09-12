# Revue du plan des types DTCG, et lots d'implémentation

> Statut : revue tenue, et lots en cours. Elle se lit avec
> [le plan](./PLAN-TYPES-DTCG.md) : elle confirme onze de ses affirmations par la
> mesure, en corrige huit, et remplace sa section 7 par les lots de la section 6.
> La section 7 ci-dessous dit ce que l'implémentation a changé aux lots. Les
> preuves sont dans le [journal de la version 2](./PREUVES-TYPES-DTCG.md).

## 1. Ce que la revue a mesuré

Les affirmations du plan ont été rejouées sur le dépôt, et non relues :

- le schéma DTCG figé de `packages/plugin/tests/dtcg-2025.10/format.json` ;
- les typings `@figma/plugin-typings` 1.138.0 installés ;
- `style-dictionary` 5.5.3, la version que le Playground installe ;
- l'export courant, sur le fichier de variables des tests augmenté d'une
  variable `TIMING` et de quatre `EASING` ;
- le `tokens.json`, le CSS généré et le workflow du Playground, tels qu'ils sont
  commités.

## 2. Les affirmations confirmées

| Affirmation du plan | Ce que la mesure donne |
|---|---|
| `VariableResolvedDataType` compte six membres | `BOOLEAN`, `COLOR`, `EASING`, `FLOAT`, `STRING` et `TIMING` dans les typings installés |
| une courbe ne borne que ses abscisses | le schéma figé borne `xCoordinate` à `[0, 1]` et laisse `yCoordinate` libre |
| un préréglage n'expose pas ses points | `easingFunctionCubicBezier` est optionnel sur `MotionEasing` |
| `HOLD` n'est pas une courbe cubique | `MotionEasing.type` porte `HOLD`, sans champ de points |
| le scope `FONT_FAMILY` existe | présent dans `VariableScope`, pour les variables `STRING` |
| l'export recopie un objet `MotionEasing` | mesuré en section 3 |
| `cubicBezier/css` couvre déjà la courbe | le groupe `css` standard rend `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `time/seconds` ne traite pas `duration` | son filtre exige `$type === "time"` ; une durée non transformée sort en `[object Object]` |
| `$value: null` est invalide sous un type DTCG | le schéma figé n'accepte, par type, que la valeur du type ou une référence |
| le refus de la version 1 empêche le déploiement par étapes | le workflow du Playground épingle `@ucm-kit/cli@0.1.24` dans un `npx`, que seule une pull request du Playground change |
| `etatDuFormatDeTokens` refuse une version inférieure à la courante | tout entier inférieur à `TOKENS_FORMAT_VERSION` tombe en `invalide` |

## 3. Ce que l'export publie aujourd'hui pour le mouvement

Une variable `TIMING` à `0.20000000298023224` et quatre `EASING` ajoutées au
fichier de variables des tests donnent, sans autre changement :

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

Deux défauts en ressortent. Un nombre de secondes est publié sous
`$type: "string"`. Une clé de l'API Figma, `easingFunctionSpring`, entre dans
l'artefact, ce que l'invariant de portabilité interdit. Le contrôle que le plan
prévoit sur cette clé porte donc sur un défaut mesuré.

`variableAliases` ne prend pas un `MotionEasing` pour un alias : l'objet porte un
champ `type`, et aucun champ `id`. Le filtre reste correct. Un test de régression
doit le fixer, parce qu'une valeur `EASING` est la première valeur de variable
qui soit un objet sans être un alias.

## 4. La famille, confrontée à ce que l'export publie déjà

### 4.1. L'état mesuré du corpus

Le `tokens.json` du Playground porte 721 feuilles : 494 `color`, 208 `dimension`,
18 `number`, et une seule `string`.

```json
"primitives": { "fontfamily": { "base": { "$value": "Open Sans", "$type": "string" } } }
```

Cette feuille est un littéral, sans alias, dans une collection à un seul mode.
Les trois contrats du Playground la citent, chacun par
`textStyles.<style>.tokens.fontFamily`.

### 4.2. La preuve que les contrats apportent déjà

`loadTextStyle` (`contract/extractVariantTypography.ts`) ne remplit
`tokens.fontFamily` que depuis `style.boundVariables.fontFamily`. Aucune
convention de nom n'y intervient. Les contrats commités établissent donc qu'un
text style du fichier Figma réel lie son champ `fontFamily` à la variable
`primitives.fontfamily.base`. La première preuve positive de D2 existe dans le
fichier réel, et la mesure H0 n'a pas à la découvrir.

### 4.3. Ce qui reste inconnu, et ce que cela coûte

Un seul inconnu subsiste, et D2 en dépend entièrement :
`figma.getLocalTextStylesAsync()` ne rend que les text styles locaux. Un text
style publié depuis une bibliothèque lie les variables de sa propre
bibliothèque, qui sont alors distantes, donc absentes de `tokens.json`. La
famille étant présente dans `tokens.json`, la variable est locale, et le style
qui la lie l'est probablement aussi. La mesure H0 doit confirmer ce point précis.

Deux autres inconnues restent sans effet sur la décision. Les scopes de la
variable ne servent que de seconde preuve, inutile quand la première est
acquise. Le corpus ne couvre ni conflit de scopes, ni famille multi-mode, ni
deux graphes indépendants ; ces cas se couvrent dans le fichier de variables des
tests, et non dans Figma.

### 4.4. Ce que le CSS devient, mesuré

Le Playground reconnaît la famille par un segment de chemin :
`filter: (token) => token.path.includes("fontfamily")`. Sous un `$type` valant
`fontFamily`, le transform standard `fontFamily/css` du groupe `css` pose
d'abord des apostrophes, puis le transform local ajoute des guillemets autour.

| Configuration du Playground | Fichier lu | Déclaration produite |
|---|---|---|
| actuelle | version 1 | `--primitives-fontfamily-base: "Open Sans", sans-serif;` |
| actuelle | version 2 | `--primitives-fontfamily-base: "'Open Sans'", sans-serif;` |
| corrigée | version 1 | `--primitives-fontfamily-base: "Open Sans", sans-serif;` |
| corrigée | version 2 | `--primitives-fontfamily-base: 'Open Sans', sans-serif;` |

La seconde ligne nomme une famille appelée `'Open Sans'`, apostrophes comprises.
Aucune police ne porte ce nom : le navigateur descend au repli `sans-serif`, et
rien ne le signale. La correction tient en une condition ajoutée au filtre
existant et un second transform :

- branche version 1, sur `$type === "string"` et un segment `fontfamily` dans le
  chemin : elle pose les guillemets et le repli, comme aujourd'hui ;
- branche version 2, sur `$type === "fontFamily"` : elle n'ajoute que le repli.

Les deux branches tiennent dans une seule configuration, sans lire la marque de
version. Style Dictionary ne transmet pas `$extensions` aux transforms, et le
`$type` de la feuille suffit à trancher. Avec ces deux branches, le CSS de la
version 1 est identique à l'octet au `src/generated/tokens.css` commité, même
empreinte `sha256` et même longueur. Le CSS de la version 2 change sur un seul
caractère, l'apostrophe au lieu du guillemet, et reste valide.

Une durée exige un transform local, le groupe `css` standard n'en portant aucun :
sans lui, la déclaration sort en `[object Object]`. Une courbe n'en exige aucun.

### 4.5. Conclusion sur la famille

Le typage `fontFamily` fonctionne avec ce que l'export publie déjà, à trois
conditions. La mesure H0 confirme que le text style liant la famille est local.
Le Playground reçoit les deux branches de transform avant de lire un fichier
version 2. Le lecteur typographique n'exige pas ce type, pour la raison de la
section 5.3.

## 5. Les huit corrections

### 5.1. Un alias absent produit une valeur que le schéma refuse

La politique existante des alias absents écrit `$value: null`. Sous
`$type: "duration"`, `"cubicBezier"` ou `"fontFamily"`, le schéma DTCG refuse
cette feuille : chaque branche conditionnelle n'accepte que la valeur du type ou
une référence. La preuve du lot d'implémentation annonce pourtant que la liste du
dialecte ne gagne aucune feuille.

Correction : la liste du dialecte gagne chaque feuille typée dont un alias vise
une variable absente, et `conformiteDtcg.test.ts` les nomme. La politique des
alias absents ne change pas. En changer demanderait de bloquer l'export sur un
alias cassé, ce qui sort de la portée de la version 2.

### 5.2. La liste du dialecte perd aussi des feuilles

`conformiteDtcg.test.ts` fixe les chemins exacts du dialecte. Sous la version 2,
`primitives.fontfamily.base` et `brand-tokens.typography.family` deviennent
conformes et sortent de cette liste. La preuve du lot doit donc annoncer le bilan
dans les deux sens, et non la seule absence d'ajout.

### 5.3. Le lecteur typographique ne peut pas exiger `fontFamily`

`erreursTypesTypographiques` s'exécute dans la CI du repository consommateur et
bloque la fusion. Exiger `fontFamily` sous la version 2 produit une erreur dès
qu'une composante de familles reste en `string` faute de preuve. Le designer ne
peut pas corriger cette erreur : une variable `STRING` sans liaison locale et
sans scope précis est une configuration Figma légitime, et son CSS reste juste.

Correction : la table accepte `["fontFamily", "string"]` quelle que soit la
version, et la régression du producteur se tient ailleurs. Un test du plugin
exige qu'une famille portant une preuve positive sorte en `fontFamily`. Un défaut
du producteur se constate ainsi sans facturer un consommateur. Une famille restée
en `string` sous la version 2 se dit au designer par le constat que D2 prévoit
déjà, dans l'export.

Cette correction change le verdict rendu à un consommateur : elle relève de la
classe 6 de [COMPATIBILITE.md](../COMPATIBILITE.md) et demande une décision avant
l'étape 2.

### 5.4. La précédence entre graisse et famille n'est pas fixée

`buildLeaf` décide aujourd'hui par `graisse ? 'number' : dtcgType(...)`. Les deux
modules lisent des variables `STRING` et peuvent viser la même. Un text style lie
`fontWeight` ou `fontStyle` à une graisse `STRING` : cette liaison est un conflit
au sens de D2, ce qui suffit à écarter la composante. Rien n'interdit pourtant
formellement à une variable d'entrer dans les deux ensembles.

Correction : fixer la précédence et la tenir par un test. `graissesNumeriques`
passe en premier, et `familles.ts` ne reçoit que les variables `STRING` qu'elle
n'a pas retenues. Un test vérifie que l'intersection des deux ensembles est vide
sur le fichier de variables des tests.

### 5.5. Deux modèles de résolution coexistent dans `buildLeaf`

`resolveRoot` ne suit que l'alias du mode par défaut, et décide l'unité sur le
groupe de la racine. `familles.ts` parcourt les arêtes de tous les modes et décide
sur la composante connexe. Une variable dont le mode par défaut porte un littéral
et dont un autre mode alias une famille passe par les deux modèles.

Correction : écrire dans `SPEC.md` que le type d'une famille se décide sur la
composante et ne passe pas par `resolveRoot`, puis couvrir ce cas dans le fichier
de variables des tests.

### 5.6. Le test Style Dictionary du plugin rougira sur une durée

`packages/plugin/tests/styleDictionary.test.ts` construit avec le groupe `css`
standard et refuse toute déclaration `[object Object]`. Le groupe standard ne
porte aucun transform de durée : une feuille `duration` correcte fera échouer ce
test.

Correction : le test enregistre le même transform de durée que le Playground doit
écrire, et son commentaire nomme le manque du groupe standard. La preuve que le
consommateur sait rendre une durée reste son propre build.

### 5.7. L'état `ancienne` n'a pas d'endroit dans le rapport

D3 décide que l'état `ancienne` ne bloque pas le contrôle, demande un réexport et
nomme la version lue. `controle-repository.mjs` ne branche aujourd'hui que
`future` et `invalide`, tous deux par un abandon. Le plan ne dit pas où le constat
de `ancienne` entre, ni s'il compte dans le verdict.

Correction : décider son rang avant le code. Un état informatif, au sens de
`perimetre-rapport.mjs`, laisse le bilan vert et nomme le geste du designer.
`verdict-bilan.mjs` ne change pas.

### 5.8. Un lot atomique fait mourir le mouvement avec la famille

La section 7 du plan place dans un seul lot les familles, le mouvement, la
conversion exhaustive et la marque de version. La mesure H0 porte sur la famille
seule. Si elle échoue, tout le lot s'arrête, y compris `duration` et
`cubicBezier`, dont aucune preuve ne dépend de la configuration typographique du
fichier réel.

Correction : la famille est séparable. Sans preuve positive en H0, la version 2 se
limite au mouvement et à la conversion exhaustive, le lecteur typographique garde
sa table actuelle, et le Playground ne reçoit que la branche de durée. Les tâches
concernées portent la marque `famille` à la section 6.

Une conséquence à accepter : le fichier Figma réel ne contient encore aucune
variable `EASING` ou `TIMING`. Sans en créer dans le fichier réel, et pas
seulement dans une copie, le réexport final produira un fichier version 2 dont
aucune feuille n'emploie les nouveaux types, et la recette ne pourra comparer
aucune animation. La mesure H0 doit donc créer ces variables là où le réexport les
lira.

## 6. Lots

Chaque tâche nomme ce qu'elle change, la preuve qui la clôt et la condition qui
l'arrête. Une porte humaine est signalée comme telle : un agent s'y arrête et rend
la main. Une tâche marquée `famille` sort du lot si la mesure H0 ne trouve aucune
preuve positive.

### Étape 0. Mesurer et décider, sans toucher au format

- [x] **0.1. Porte humaine, décision.** Trancher la correction 5.3 : le lecteur
  typographique accepte-t-il `string` pour une famille sous la version 2 ? Un
  refus garde le texte actuel du plan et rend la version 2 bloquante pour un
  fichier Figma sans liaison locale. Écrire la décision dans le plan.
- [x] **0.2. Porte humaine, décision.** Trancher le rang de l'état `ancienne`
  dans le rapport, selon la correction 5.7 : état informatif, ou avertissement
  compté.
- [ ] **0.3. Porte humaine, mesure Figma.** Sur le fichier réel, et non sur une
  copie : relever les scopes de `primitives.fontfamily.base` ; confirmer que
  `figma.getLocalTextStylesAsync()` rend le text style qui lie sa famille ; créer
  une variable `TIMING`, une `EASING` par préréglage, une courbe personnalisée, un
  ressort et une `EASING` multi-mode ; relever `valuesByMode` et les champs
  présents. Rendre un relevé JSON anonymisé, la version des typings et la version
  du plugin. Une divergence avec les typings arrête le plan et corrige d'abord la
  section concernée.
- [x] **0.4.** Mesurer la sortie courante sur `EASING` et `TIMING` en mutant le
  fichier de variables des tests, constater le rouge de `conformiteDtcg.test.ts`
  et de `styleDictionary.test.ts`, puis restaurer le fichier par copie. Consigner
  le relevé dans cette note. Le message de commit dit la mutation et la
  restauration.

Sortie de l'étape : le périmètre de la version 2 est fixé, et les deux décisions
sont écrites.

### Étape 1. Les modules purs, sans changement de format

Rien dans cette étape ne change un octet de `tokens.json`. Chaque module n'est
appelé que par ses tests.

- [x] **1.1.** Ajouter au kit `DureeDeToken` et `CourbeDeToken` dans
  `packages/kit/src/format/tokens.ts`, les exporter, et les joindre à
  `ValeurDeToken` et à `TokenDeDocument`. `FamilleDeToken` n'élargit
  `ValeurDeToken` que du cas tableau. Le producteur n'écrit que l'unité `s`, et le
  type décrit les deux unités que DTCG admet. Preuve : `npm run typecheck`.
- [x] **1.2.** Écrire `packages/plugin/src/tokens/mouvement.ts`. Une fonction rend
  la durée d'une valeur `TIMING`. Une autre rend la courbe d'un `MotionEasing`, ou
  le refus qui la nomme : `LINEAR` rend `[0, 0, 1, 1]`, `CUSTOM_CUBIC_BEZIER`
  recopie ses points après validation de quatre nombres finis dont `x1` et `x2`
  dans `[0, 1]`, tout autre `type` et toute coordonnée manquante rendent un refus.
  Aucun arrondi, aucune conversion en millisecondes.
- [x] **1.3.** Tests de `mouvement.ts` : un cas par membre de `MotionEasing.type`,
  la valeur `0`, une fraction, le bruit flottant `0.20000000298023224`, `y1` à
  `1.56`, `x1` à `1.1`, une coordonnée non finie et une coordonnée absente.
  Preuve : la matrice « Mouvement » du plan passe sur le module seul.
- [x] **1.4.** `famille` Écrire `packages/plugin/src/tokens/familles.ts`. La
  fonction reçoit les variables, les collections, les liaisons des text styles et
  l'ensemble des graisses déjà décidées. Elle construit les arêtes d'alias de tous
  les modes entre variables `STRING` non retenues par `graissesNumeriques`,
  calcule les composantes connexes, et rend trois ensembles : familles,
  ambiguïtés, familles probables sans preuve. Les preuves positives et les
  conflits sont ceux de D2.
- [x] **1.5.** `famille` Tests de `familles.ts` : la matrice « Familles » du plan,
  une boucle d'alias, un ordre de visite inversé, une composante à trois membres
  dont un seul porte la preuve, et une composante portant une preuve et un
  conflit. Ajouter le test d'intersection vide avec `graissesNumeriques`, selon la
  correction 5.4.
- [x] **1.6.** Étendre `packages/plugin/tests/fichierDeVariables.ts` : une
  `TIMING`, une `EASING` par cas de la tâche 1.3, un alias `TIMING`, une famille
  multi-mode, une seconde famille indépendante, une famille en conflit avec
  `fontStyle`, une variable portant un segment `fontfamily` sans preuve, et des
  text styles locaux portant leurs `boundVariables`. Le fichier reste exportable.
  Preuve : `npm test` au vert après mise à jour des listes de chemins que
  `conformiteDtcg.test.ts` et `exportTokens.test.ts` fixent.

Arrêt : une divergence entre le relevé de la tâche 0.3 et les typings installés.

### Étape 2. Le lot atomique du format

Un seul commit. Aucun état intermédiaire de ce commit n'est publiable.

- [x] **2.1.** Rendre `dtcgType` et `formatValue` exhaustifs sur
  `VariableResolvedDataType`, sans branche `default`, de sorte qu'un septième
  membre des typings produise une erreur TypeScript.
- [x] **2.2.** Brancher `mouvement.ts` dans `buildLeaf`. Une `TIMING` rend
  `$type: "duration"` et la valeur `{ value, unit: "s" }`. Une `EASING` rend
  `$type: "cubicBezier"` et sa courbe. Une cible d'alias absente garde la
  politique existante.
- [x] **2.3.** Bloquer l'export avant de construire l'arbre quand une `EASING`
  d'un mode quelconque n'est pas exprimable, selon D1. Le constat nomme chaque
  variable et chaque mode concernés. Charger la skill `rediger-diagnostics-ucm`
  avant d'écrire ce message. Aucun fichier partiel n'est produit.
- [x] **2.4.** `famille` Appeler `figma.getLocalTextStylesAsync()` une fois dans
  `handleExportTokens`, passer les liaisons à `familles.ts`, et appliquer le type à
  toute la composante. Une erreur de lecture ne type aucune variable et produit le
  constat de D2. Fixer la précédence de la correction 5.4.
- [x] **2.5.** `famille` Émettre les constats de D2 : une composante avec preuve
  et conflit, et un segment `fontfamily` sans preuve.
- [x] **2.6.** Passer `TOKENS_FORMAT_VERSION` à `2` et ouvrir la fenêtre de lecture
  dans `etatDuFormatDeTokens` : `origine` sans marque, `courante` à `2`, `ancienne`
  à `1`, `future` au-delà, `invalide` pour le reste. La liste des versions lisibles
  est explicite, sans présomption sur les versions inférieures.
- [x] **2.7.** Sans objet après la tâche 0.2 : l'état `ancienne` ne paraît pas
  dans le rapport, et `controle-repository.mjs` ne change pas. Il ne branche que
  `future` et `invalide`, et une version ancienne se lit comme la courante.
- [x] **2.8.** Appliquer la décision de la tâche 0.1 à
  `packages/kit/src/lecteurs/typography-token-types.mjs`.
- [x] **2.9.** Mettre à jour les listes de chemins de `conformiteDtcg.test.ts`
  dans les deux sens, selon les corrections 5.1 et 5.2, et enregistrer le
  transform de durée dans `styleDictionary.test.ts`, selon la correction 5.6.
- [x] **2.10.** Mettre à jour les autorités dans le même commit :
  [FORMAT.md](../FORMAT.md), `packages/plugin/SPEC.md` pour la correction 5.5,
  la section `tokens.json` de [CHANGELOG-FORMAT.md](../CHANGELOG-FORMAT.md),
  la section de version de [COMPATIBILITE.md](../COMPATIBILITE.md) et les
  invariants d'`AGENTS.md`. Charger la skill `rediger-sans-tics-ia` avant
  d'écrire.

Preuve de l'étape : `npm test`, `npm run typecheck`, `npm run build` et
`git diff --check` au vert ; la matrice du plan entière ; deux exports du même
fichier identiques à l'octet, par profil colorimétrique ; aucune clé de l'API
Figma dans l'artefact.

### Étape 3. Les mutations qui prouvent les lois

Pour chaque mutation : muter, constater le rouge, restaurer par copie. Le message
de commit les cite.

- [x] **3.1.** Élargir la borne de `x1` à `[-1, 2]` : un test doit rougir.
- [x] **3.2.** Borner `y1` à `[0, 1]` : un test doit rougir sur la valeur `1.56`.
- [x] **3.3.** Arrondir la durée à trois décimales : un test doit rougir.
- [x] **3.4.** `famille` Décider la famille sur la feuille courante au lieu de la
  composante : un test doit rougir sur la primitive.
- [x] **3.5.** Classer la version `1` en `courante` : un test doit rougir.
- [x] **3.6.** Faire de l'état `ancienne` un abandon : un test doit rougir.

### Étape 4. Le consommateur, avant toute publication

- [x] **4.1.** Sur une branche du Playground, poser les deux branches de transform
  de la section 4.4 et un transform de durée. Le `tokens.json` reste en version 1.
- [x] **4.2.** Vérifier que `src/generated/tokens.css` est identique à l'octet
  avant et après la tâche 4.1, par empreinte `sha256`.
- [x] **4.3.** Compiler un `tokens.json` version 2 synthétique portant une famille
  littérale, une famille en alias, une durée, une courbe `LINEAR`, une courbe à
  dépassement et leurs références. Vérifier l'absence d'apostrophe doublée, de
  `[object Object]` et de référence non résolue.
- [x] **4.4.** Mettre à jour la version de `@ucm-kit/cli` épinglée dans
  `.github/workflows/ucm.yml`, après l'étape 5.

### Étape 5. Publier les lecteurs

- [x] **5.1.** Publier `@ucm-kit/core`, puis `@ucm-kit/cli`, puis
  `@ucm-kit/adapter-typescript`.
- [x] **5.2.** Installer les archives et les paquets servis dans un consommateur
  vierge. Le même binaire accepte le `tokens.json` version 1 du Playground, sous
  l'état `ancienne` et sans blocage, et un fixture version 2.

### Étape 6. Publier le plugin, réexporter, fermer

- [ ] **6.1. Porte humaine.** Le mainteneur relit le manifeste des paquets, les
  preuves des étapes 2 à 5 et les diagnostics visibles, puis autorise la
  publication Community du bundle construit et empreinté.
- [ ] **6.2.** Le designer réexporte depuis le plugin publié. La CI du Playground
  lit le fichier version 2 avec les paquets publiés, produit le CSS attendu et
  résout toutes les références des contrats.
- [ ] **6.3.** Recette : comparer dans Figma et dans le Playground la police et
  les animations que la tâche 0.3 a créées. Ouvrir un journal de preuves distinct
  de celui de la version 1.

La version 1 reste lisible après cette fermeture. Son retrait demande une autre
version du kit.

## 7. Ce que l'implémentation a changé aux lots

Sept écarts entre ces lots et ce qui a été écrit. Chacun a une raison mesurée.

### 7.1. D1 écarte la feuille au lieu de bloquer l'export

Le plan recommandait de refuser l'export entier devant une easing sans courbe.
Douze des quatorze membres de `MotionEasing.type` sont dans ce cas, ressorts
compris, et ce sont les entrées du sélecteur de Figma : un seul ressort aurait
coûté les 721 feuilles de couleurs et de dimensions du fichier réel. Le moteur
n'agit ainsi nulle part ailleurs, une collision de chemin écartant déjà la
variable sous un avertissement.

La variable sort donc du fichier, un constat nomme son mode, et un alias vers
elle suit la politique des cibles absentes en nommant la variable à corriger.
La feuille de cet alias entre au dialecte, ce que la correction 5.1 prévoyait.

### 7.2. Les étapes 1 et 2 forment un seul commit

La tâche 0.4 demandait de constater le rouge d'une mutation du fichier de
variables, et la tâche 1.6 d'ajouter le même contenu en gardant `npm test` au
vert. Les deux ne pouvaient pas tenir : un `MotionEasing` brut sous
`$type: "string"` sort en `[object Object]` dans le CSS, et
`styleDictionary.test.ts` le refuse.

La section 5.4 du plan interdit par ailleurs un commit qui annonce la version 1
avec les nouvelles valeurs. Les deux étapes forment donc un commit atomique,
et la mesure de la tâche 0.4 est consignée dans le journal.

### 7.3. Les types du kit décrivent le producteur

La tâche 1.1 demandait des types couvrant le domaine de la norme, dont les
durées en `ms`. Le dépôt tranche déjà dans l'autre sens : `DimensionDeToken`
limite son unité à `px`, et ces types ne sont importés que par le moteur.
`DureeDeToken` porte donc l'unité `s` seule, `FamilleDeToken` une chaîne, et le
schéma figé vérifie le domaine plus large.

### 7.4. La tâche 2.7 perd son objet

L'état `ancienne` ne paraît pas dans le rapport, et `controle-repository.mjs`
ne change pas. Un repository qui attend le réexport reste vert, ce qui est la
condition pour que l'ordre de publication tienne : entre la montée du pin de la
CLI et le réexport, le consommateur lit forcément un fichier de la version
précédente.

### 7.5. Trois autorités manquaient à la tâche 2.10

`docs/RECETTE.md`, `packages/plugin/README.md` et `docs/notes/ALIGNEMENT-DTCG.md`
annoncent la version du format. `packages/kit/README.md` porte en plus le
tableau des états de la marque.

### 7.6. Trois comptes figés et deux garde-fous de paquet manquaient aux lots

`conformiteDtcg.test.ts` fixe le nombre de feuilles conformes,
`styleDictionary.test.ts` le nombre de déclarations CSS et
`exportTokens.test.ts` le nombre de feuilles : les trois bougent avec le
fichier de variables.

`versionSuitLeContenu.test.mjs` exige par ailleurs que le numéro d'un paquet
monte dans le commit qui change son contenu publiable, et `pinDocumente.test.mjs`
que la documentation montre ce numéro. Les trois paquets montent donc ensemble,
le kit d'abord. Le garde-fou des pins reçoit une exemption pour `docs/notes/` :
un journal enregistre la version qu'une commande a réellement installée, et la
réécrire à chaque publication effacerait la mesure.

### 7.7. La tâche 2.8 n'avait pas de test, et seule l'étape 5 l'a vue

La table du lecteur typographique n'a pas été élargie dans le commit qui
l'annonçait. Aucun test ne la couvrait pour la famille, et les 1 032 tests
restaient verts. L'épreuve dans un consommateur vierge l'a trouvée, après la
publication de trois paquets qui portent le défaut. Une décision écrite dans un
document et nulle part dans un test n'est pas tenue.

### 7.8. La tâche 4.4 se joue avant la publication du plugin

Le texte la plaçait après l'étape 5. Elle doit aussi précéder l'étape 6 : un
Playground resté sur la CLI de la version 1 refuserait le réexport comme une
version future, et bloquerait sa propre pull request. La fenêtre de lecture
existe pour rendre ce délai vivable.
