# Plan des types DTCG restants

> Statut : engagé. Les décisions sont prises, le moteur produit la version 2,
> et les paquets la lisent. Restent la publication Community du plugin et le
> réexport. Cette note complète l'[état des lieux](./ALIGNEMENT-DTCG.md) et
> s'appuie sur les preuves de la
> [version 1](./PREUVES-ALIGNEMENT-DTCG.md) ; celles de la version 2 sont dans
> son [journal](./PREUVES-TYPES-DTCG.md). La [revue](./REVUE-TYPES-DTCG.md)
> corrige huit points de ce plan, et sa section 7 dit ce que
> l'implémentation a encore changé.

## 1. Résultat visé

La version 2 traite trois types qui ont une source dans les variables locales :

- une variable `TIMING` devient un token `duration` ;
- une variable `EASING` devient un token `cubicBezier` quand Figma fournit une
  courbe exprimable sans approximation ;
- une variable `STRING` devient un token `fontFamily` quand une liaison ou un
  scope établit cet usage sans conflit.

Le fichier ne doit plus recopier un objet `MotionEasing` sous `$type: "string"`.
Chaque feuille publiée doit annoncer le type de sa valeur. Une valeur que DTCG
ne sait pas représenter bloque l'export avant la sérialisation ; le plugin ne
fabrique ni courbe, ni famille, ni token de remplacement.

`shadow`, `gradient`, `strokeStyle`, `border` et `transition` restent hors de
la version 2. Leur ajout changerait la portée de la commande, aujourd'hui
limitée aux variables locales. Il demande une décision distincte sur l'identité
et le nom des tokens issus de styles ou de calques.

## 2. Corrections apportées au premier plan

La revue du schéma figé, des typings Figma 1.138.0, du moteur et du déploiement
de la version 1 relève cinq points qui changent le plan.

### 2.1. Une courbe ne borne que ses abscisses

Un `cubicBezier` vaut `[x1, y1, x2, y2]`. DTCG borne `x1` et `x2` à
`[0, 1]`. `y1` et `y2` acceptent tout nombre réel. Le contrôle prévu sur les
quatre coordonnées aurait donc refusé des courbes valides, dont les courbes
avec dépassement.

### 2.2. `null` ne représente pas une easing

`$value: null` sous `$type: "cubicBezier"` est invalide. Cette valeur signifie
déjà, dans le dialecte UCM, qu'un mode manque ou qu'un alias vise une variable
absente. La réutiliser pour un ressort confondrait deux causes et augmenterait
le dialecte au moment où le lot veut le réduire.

Une easing non exprimable doit donc suivre une politique décidée avant le code.
La recommandation D1 bloque l'export et conserve la promesse selon laquelle la
commande publie toutes les variables locales.

### 2.3. Un scope Figma n'est pas une preuve exclusive

`Variable.scopes` limite les variables affichées dans les sélecteurs de Figma.
L'API autorise encore une liaison dans un autre champ. `FONT_FAMILY` constitue
une intention explicite ; il ne prouve pas que la variable ne sert qu'à une
famille.

Une liaison `TextStyle.boundVariables.fontFamily` prouve un usage, mais pas son
exclusivité. Le même graphe d'alias peut aussi alimenter `fontStyle` ou du texte.
Le typage doit donc relever les preuves positives et les conflits.

### 2.4. Le graphe des familles se propage dans les deux sens

Si `semantic.family`, reliée à un text style, cite
`primitives.family`, typer seulement la première produit une référence
`fontFamily` vers une feuille `string`. À l'inverse, une variable faite d'alias
vers une famille doit recevoir le même type.

La décision porte sur la composante connexe des alias entre variables `STRING`,
pas sur une marche depuis la feuille courante vers sa cible. Un conflit sur un
seul membre rend toute la composante ambiguë.

### 2.5. Le refus de la version 1 empêche le déploiement par étapes

L'ordre de publication de `COMPATIBILITE.md` exige que le lecteur précède le
producteur. Si le nouveau kit refuse la version 1, la mise à jour de la CLI met
la CI du Playground en échec avant le réexport. Si le plugin version 2 passe en
premier, l'ancienne CLI refuse la version 2 comme future.

Le workflow actuel ne sait pas déposer la CLI, la configuration du consommateur
et `tokens.json` dans une seule pull request. La version 2 doit donc lire les
versions 1 et 2 pendant la migration. La section D3 fixe cette fenêtre.

## 3. Sources disponibles

Les variables `EASING` et `TIMING` ont été ajoutées récemment à l'API. Le type
`MotionEasing` appartient encore à l'API Motion bêta. Les liens officiels sont
[VariableResolvedDataType](https://developers.figma.com/docs/plugins/api/VariableResolvedDataType/),
[Motion](https://developers.figma.com/docs/plugins/api/Motion/) et le
[module Format DTCG 2025.10](https://www.designtokens.org/TR/2025.10/format/).

| Type DTCG | Source Figma nommée | Information conservée | Limite |
|---|---|---|---|
| `fontFamily` | variable `STRING`, liaisons de text styles et scopes | nom de famille et alias | une liaison ou un scope n'établit pas l'exclusivité |
| `duration` | variable `TIMING` | nombre de secondes et alias | la précision et les bornes réelles doivent être mesurées dans Figma |
| `cubicBezier` | variable `EASING` | `CUSTOM_CUBIC_BEZIER`, et `LINEAR` par définition | les préréglages nommés n'exposent pas leurs points ; ressort et `HOLD` ne sont pas des courbes cubiques |
| `shadow` | `EffectStyle.effects` | parties d'une ombre et certaines liaisons | DTCG ne porte ni `blendMode`, ni `visible`, ni `showShadowBehindNode` ; un style peut contenir d'autres effets |
| `gradient` | `PaintStyle.paints` | couleurs, positions et certaines liaisons | DTCG ne porte ni le genre, ni la géométrie du dégradé |
| `strokeStyle` | propriétés d'un calque | tirets et terminaison | aucune source locale nommée ne forme un token autonome |
| `border` | propriétés d'un calque | couleur, largeur et style | aucune source locale nommée ne groupe ces valeurs |
| `transition` | réactions de prototype | durée et easing dans certains cas | aucun objet nommé ne forme un token ; le délai dépend du déclencheur |

Cette table distingue l'existence d'une donnée Figma de l'existence d'une
source de token. Un calque peut porter les parties d'une bordure sans donner à
cette bordure une identité stable dans `tokens.json`.

### 3.1. Défaut du producteur actuel

`dtcgType` range `EASING` et `TIMING` dans sa branche `default`, donc en
`string`. `formatValue` recopie ensuite leur valeur brute. Une `TIMING` de
`0.2` reçoit ainsi `$type: "string"`, et une `EASING` laisse entrer l'objet
`MotionEasing` dans l'artefact. Le type contredit la valeur dans les deux cas.

Le mock `fichierDeVariables.ts` et le fichier réel du Playground ne contiennent
aucun de ces types. Les 610 tests du plugin passent donc sans exercer cette
branche. La correction doit ajouter un cas de régression qui refuse les clés
`type`, `easingFunctionCubicBezier` et `easingFunctionSpring` sous la valeur
d'un token de mouvement.

### 3.2. Mesure du consommateur

La mesure existante utilise Style Dictionary 5.5.3, le groupe `css` et
`usesDtcg: true`.

| Type | Sortie CSS mesurée |
|---|---|
| `fontFamily` | `'Open Sans'` |
| `duration` | `[object Object]` |
| `cubicBezier` | `cubic-bezier(0, 0, 0.58, 1)` |
| `strokeStyle` chaîne | `solid` |
| `strokeStyle` objet | `dashed`, repli du transform |
| `border` | `1px solid rgb(0% 0% 0%)` |
| `shadow` | `0px 2px 4px 0px rgb(0% 0% 0% / 0.25)` |
| `gradient` | `[object Object],[object Object]` |
| `transition` | `[object Object] cubic-bezier(0, 0, 0.58, 1) [object Object]` |

Le transform standard `time/seconds` filtre sur le type historique `time`.
`transition/css/shorthand` concatène encore les objets de durée. Style
Dictionary ne fournit aucun transform CSS de dégradé. Ces résultats justifient
le transform de durée en version 2 et maintiennent `gradient` et `transition`
hors de la tranche.

Sur le Playground, le transform local de famille ajoute déjà des guillemets et
le repli. Après passage de la feuille au type `fontFamily`, le transform
standard ajoute ses propres apostrophes. La sortie devient
`"'Open Sans'", sans-serif`. Le lecteur typographique produit aussi huit
erreurs sur trois contrats tant qu'il attend seulement `string` pour
`fontFamily`.

## 4. Décisions

### D1. Easing non exprimable, décidée

Cas concernés : `EASE_IN`, `EASE_OUT`, `EASE_IN_AND_OUT`, les variantes
`*_BACK`, `GENTLE`, `QUICK`, `BOUNCY`, `SLOW`, `CUSTOM_SPRING`, `HOLD`, un
`CUSTOM_CUBIC_BEZIER` sans points, une abscisse hors de `[0, 1]` ou une
coordonnée non finie. Douze des quatorze membres de `MotionEasing.type` sont
concernés, et ce sont les entrées du sélecteur de Figma.

**Décision : écarter la variable du fichier, et le dire.** La feuille n'est pas
écrite, un constat nomme la variable et le mode en cause, et le reste de
l'export part normalement. Un alias vers cette variable suit la politique
existante des cibles absentes, et son message nomme la variable à corriger
plutôt qu'une absence. L'action demande de choisir `LINEAR` ou une courbe
cubique personnalisée exprimable, puis de réexporter.

Bloquer l'export entier a été écarté après mesure : un seul ressort aurait
coûté les 721 feuilles de couleurs et de dimensions du fichier réel, et le
moteur n'agit ainsi nulle part ailleurs. Une collision de chemin écarte déjà la
variable sous un avertissement, et cette décision suit la même règle.

La copie du nom du préréglage sous `$type: "string"`, une table de courbes non
publiée par Figma, une extension UCM pour les ressorts et `$value: null` sont
écartés.

### D2. Autorité d'une famille, décidée

**Décision : décider une composante entière du graphe d'alias.** Une
composante de variables `STRING` devient `fontFamily` si elle porte au moins une
preuve positive et aucun conflit.

Preuves positives :

1. un text style local lie l'un de ses membres par `fontFamily` ;
2. un membre déclare uniquement le scope `FONT_FAMILY` parmi les scopes de
   chaîne.

Conflits :

1. un text style local lie un membre par un autre champ de chaîne, tel que
   `fontStyle` ;
2. un membre déclare `TEXT_CONTENT`, `FONT_STYLE` ou `ALL_SCOPES` en plus de
   `FONT_FAMILY` ;
3. une liaison quitte l'index des variables locales ou change de
   `resolvedType`.

Une composante sans preuve reste `string`. Une composante avec preuve et
conflit reste `string` et produit un constat sur les variables concernées. Le
geste demande de séparer les usages dans Figma. Le nom `fontfamily` ne décide
jamais le type ; il sert seulement à signaler une famille probable restée sans
preuve.

Cette politique dégrade proprement sur le fichier réel. Sans text style local
qui relie la famille, aucune preuve n'est trouvée, la composante reste `string`,
et le constat part au designer. H0 ne décide donc pas si le code s'écrit ; il
dit ce que le fichier réel obtient.

### D3. Unité et compatibilité, décidées

Une `TIMING` littérale devient `{ "value": <valeur Figma>, "unit": "s" }`.
Le moteur ne convertit pas en millisecondes et n'arrondit pas. DTCG accepte les
unités `s` et `ms` ; garder l'unité source rend un second export identique au
premier.

La version 2 lit :

- la forme d'origine sans marque ;
- la version 1 sous l'état `ancienne` ;
- la version 2 sous l'état `courante`.

Une version supérieure reste `future`. Une marque non entière, non positive ou
mal placée reste `invalide`. La liste des versions marquées lisibles est
explicite ; le lecteur ne suppose pas que toute version inférieure reste
compatible.

L'état `ancienne` ne bloque pas le contrôle. Il demande un réexport et nomme la
version lue. La version 3 décidera si la version 1 quitte la fenêtre.

### D4. Styles et types composés, décidé pour cette tranche

La version 2 n'exporte aucun style local et ne construit aucun token depuis un
calque. `shadow`, `gradient`, `strokeStyle`, `border` et `transition` feront
l'objet d'une note distincte si un consommateur les demande.

Cette note devra d'abord décider :

- l'identité et le chemin d'un token de style ;
- le traitement des parties que DTCG ne porte pas ;
- la référence de ces tokens depuis les contrats ;
- le rendu du consommateur sur chaque plateforme visée.

## 5. Conception cible

### 5.1. Conversion exhaustive des types Figma

`dtcgType` et `formatValue` traitent les six membres de
`VariableResolvedDataType` sans branche `default`. Un nouveau membre des typings
doit provoquer une erreur TypeScript ou un refus explicite à l'exécution. Cette
borne empêche la copie brute d'un prochain objet Figma.

La plage déclarée `@figma/plugin-typings: ^1.68.0` ne promet plus une version
qui ignore `EASING` et `TIMING`. Son minimum devient la version vérifiée en H0 ;
le lockfile en garde la résolution exacte.

Le kit ajoute des types dédiés :

- `FamilleDeToken = string` ;
- `DureeDeToken = { value: number; unit: "s" }` ;
- `CourbeDeToken = [number, number, number, number]`.

Ces types décrivent la sortie du producteur, comme `DimensionDeToken` limite
déjà son unité à `px`. Le schéma DTCG figé vérifie le domaine plus large de la
norme, dont les durées en `ms` et les familles de repli en tableau.
`ValeurDeToken` et `TokenDeDocument` reçoivent les trois formes produites et
leurs `$type`.

### 5.2. Familles, telle qu'écrite

Un module `packages/plugin/src/tokens/familles.ts` reçoit les variables, les
collections et les liaisons des text styles. Il construit les arêtes d'alias de
tous les modes, calcule les composantes et rend trois ensembles : familles,
ambiguïtés et familles probables sans preuve.

`handleExportTokens` appelle `figma.getLocalTextStylesAsync()` une fois. Une
erreur de lecture ne transforme aucune variable en famille ; elle produit le
constat prévu par la politique D2.

Le lecteur typographique accepte `["fontFamily", "string"]` quelle que soit la
version. Il tourne dans la CI du repository consommateur et bloque la fusion :
exiger `fontFamily` refuserait un fichier qu'une variable `STRING` sans liaison
locale rend légitime, et le designer n'aurait aucun geste correctif. La
régression du producteur se tient ailleurs, par un test du plugin qui exige
qu'une famille prouvée sorte en `fontFamily`. Ce verdict relève de la classe 6
de [COMPATIBILITE.md](../COMPATIBILITE.md).

### 5.3. Mouvement

Un module `packages/plugin/src/tokens/mouvement.ts` porte les deux conversions :

- `TIMING` recopie le nombre dans une durée en secondes ;
- `EASING` convertit `LINEAR` en `[0, 0, 1, 1]` et recopie les points de
  `CUSTOM_CUBIC_BEZIER` après validation.

La validation exige quatre nombres finis. Elle borne seulement `x1` et `x2`.
Elle examine tous les modes avant la première feuille. Une cible d'alias locale
est suivie sans aplatir la référence publiée ; une cible absente suit la
politique existante des alias absents.

### 5.4. Version

`TOKENS_FORMAT_VERSION` reste l'unique numéro produit. Son passage à `2`, la
fenêtre de lecture, les diagnostics, le changelog et les tests entrent dans le
même lot atomique. Aucun commit publiable ne doit annoncer la version 1 avec
les nouvelles valeurs, ni la version 2 avec les anciennes.

### 5.5. Playground

Le transform de famille doit accepter les deux formats pendant la migration :

- sous `string`, il conserve le rendu actuel ;
- sous `fontFamily`, le transform standard `fontFamily/css` pose les guillemets
  et le transform local ajoute seulement le repli `sans-serif`.

Un transform `duration/css` rend `${value}${unit}`. Le transform standard
`time/seconds` de Style Dictionary 5.5.3 filtre sur le type historique `time`
et ne traite pas `duration`. `cubicBezier/css` couvre déjà la courbe.

Les transforms locaux filtrent sur `$type` et non sur un segment du chemin dès
que la version 2 fournit le type. Le support de la version 1 garde une branche
de compatibilité isolée et testée.

## 6. Matrice de vérification

### Familles

| Cas | Attendu en version 2 |
|---|---|
| liaison directe `fontFamily` | toute la composante d'alias vaut `fontFamily` |
| scope précis `FONT_FAMILY` | toute la composante vaut `fontFamily` |
| alias vers une famille | source et cible portent le même type |
| famille reliée vers une primitive | la primitive reçoit aussi `fontFamily` |
| littéraux différents selon les modes | valeurs inchangées, type commun |
| preuve et usage `fontStyle` | composante `string`, constat actionnable |
| segment `fontfamily` sans preuve | `string`, constat actionnable |
| ordre des variables, collections et modes inversé | document sémantiquement identique |
| boucle d'alias | terminaison garantie, diagnostic existant conservé |

### Mouvement

| Cas | Attendu en version 2 |
|---|---|
| `TIMING` à `0`, fraction et bruit flottant | même nombre, unité `s` |
| alias `TIMING` | référence conservée, type `duration` |
| `LINEAR` | `[0, 0, 1, 1]` |
| `CUSTOM_CUBIC_BEZIER` valide | `[x1, y1, x2, y2]` sans arrondi |
| `y1` ou `y2` hors de `[0, 1]` | accepté si le nombre est fini |
| `x1` ou `x2` hors de `[0, 1]` | export bloqué selon D1 |
| préréglage opaque, ressort ou `HOLD` | export bloqué selon D1 |
| mode exprimable et mode non exprimable | export bloqué avant sérialisation |
| coordonnée absente, `NaN` ou infinie | export bloqué avant sérialisation |
| nouvel objet Figma inconnu | aucun objet brut dans `tokens.json` |

### Version et consommateur

| Contrôle | Attendu |
|---|---|
| forme d'origine | verdict actuel conservé |
| version 1 sous le kit version 2 | `ancienne`, contrôle non bloquant |
| version 2 | `courante` |
| version 3 | `future`, contrôle bloqué avant l'index |
| marque invalide | `invalide`, contrôle bloqué avant l'index |
| contrat version 1, famille `string` | accepté |
| contrat version 2, famille `string` | erreur de type typographique |
| CSS de la version 1 avant et après préparation du Playground | identique à l'octet |
| CSS de la version 2 | aucune apostrophe doublée, aucun `[object Object]` |
| deux exports du même fichier | identiques à l'octet |

## 7. Lots

### H0. Mesure Figma avant code

Sur une copie du fichier :

1. relever les scopes et les liaisons de `primitives.fontfamily.base` ;
2. créer une `TIMING`, une `EASING` de chaque préréglage, une courbe
   personnalisée, un ressort et une easing multi-mode ;
3. relever `valuesByMode` et vérifier les champs réellement présents ;
4. confirmer que les valeurs et leurs alias sont lisibles par le plugin
   Community et par un build de développement.

Preuve : un relevé JSON anonymisé, la version des typings et la version du
plugin. Une différence avec les typings arrête le plan et corrige d'abord cette
section.

### L1. Implémentation atomique de la version 2

Ce lot porte ensemble :

- les types du kit et le lecteur typographique sensible à la version ;
- la borne déclarée de `@figma/plugin-typings` ;
- `familles.ts` et `mouvement.ts` ;
- la conversion exhaustive des types Figma ;
- l'état `ancienne` et la fenêtre explicite `1 | 2` ;
- le passage de `TOKENS_FORMAT_VERSION` à `2` ;
- les diagnostics décidés en D1 et D2 ;
- les autorités `FORMAT.md`, `SPEC.md`, `COMPATIBILITE.md`,
  `CHANGELOG-FORMAT.md` et `AGENTS.md`.

Preuve : toute la matrice de la section 6 passe. Le schéma DTCG accepte chaque
feuille publiée de type `fontFamily`, `duration` ou `cubicBezier`. La liste du
dialecte ne gagne aucune feuille.

### L2. Audit avant publication

- `npm test`, `npm run typecheck`, `npm run build` et `git diff --check` ;
- mutations des abscisses, des ordonnées, du graphe de familles et de la
  fenêtre de versions ;
- deux exports par profil colorimétrique, comparés à l'octet ;
- compilation Style Dictionary d'un fichier synthétique version 2 ;
- vérification qu'aucune clé Figma comme `easingFunctionSpring` n'entre dans
  l'artefact.

Preuve : commandes, codes de sortie, comptes et empreintes dans un nouveau
journal. Le journal de la version 1 reste fermé.

### L3. Publication des lecteurs

Publier `@ucm-kit/core`, puis `@ucm-kit/cli`, puis
`@ucm-kit/adapter-typescript`. Installer les archives et les paquets servis dans
un consommateur vierge. Le même binaire doit accepter le fichier version 1 du
Playground et un fixture version 2.

### L4. Préparation du Playground

Mettre à jour la CLI épinglée et les transforms sur une branche du Playground.
Le `tokens.json` reste en version 1 pendant ce lot. Son CSS doit rester identique
à l'octet. Compiler ensuite un fichier version 2 synthétique et vérifier la
famille, la durée, la courbe et les références.

### H1. Publication du plugin

Le mainteneur relit le manifeste des paquets, les preuves de L2 à L4 et les
diagnostics visibles. Il autorise ensuite la publication Community du bundle
construit et empreinté.

### L5. Réexport et fermeture

Le plugin Community dépose lui-même `tokens.json` version 2. La CI du Playground
doit lire le fichier avec les paquets publiés, produire le CSS attendu et
résoudre toutes les références des contrats. La recette compare la police et
les animations concernées dans Figma et dans le Playground.

La version 1 reste lisible après cette fermeture. Son retrait demande une autre
version du kit et une mesure des repositories qui la portent encore.

## 8. Limites des preuves actuelles

- Le fichier Figma réel ne contient encore aucune variable `EASING` ou
  `TIMING`. Les mesures actuelles portent sur des objets ajoutés au mock.
- Le corpus du Playground ne contient qu'une famille. Il ne couvre ni un conflit
  de scopes, ni une famille multi-mode, ni deux graphes indépendants.
- Le scope et les liaisons réels de `primitives.fontfamily.base` ne sont pas
  enregistrés dans `tokens.json`.
- Les sorties Style Dictionary mesurées ne remplacent pas une vérification du
  comportement dans le navigateur.
- L'API Motion est bêta. H0 doit être rejoué si la version de
  `@figma/plugin-typings` change avant L1.
