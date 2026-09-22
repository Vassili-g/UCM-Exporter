# Architecture de tokens multi-marques, en clair et en sombre

Cinq marques, deux modes d'affichage, quatre paliers de mise en page. La
question posée : quelle forme donner aux collections de variables Figma pour que
chaque fait ne soit écrit qu'une fois, et que le clair et le sombre couvrent
tous les composants.

Le document décrit l'état de l'outillage, l'état du Playground, l'état du
fichier Figma tel qu'un export le montre, ce que la pratique publiée établit,
puis une cible et son chemin. Il ne décide rien : aucune partie du produit n'en
dépend, et la cible reste soumise à une mesure décrite en section 9.

## 1. Ce que l'outillage sait déjà faire

Ces constats viennent du code, pas d'une intention.

| Fait | Où il est porté |
|---|---|
| Une collection Figma à plusieurs modes devient un axe, déclaré à la racine sous `com.ucm.axes` avec ses modes et son défaut | `docs/format/FORMAT.md:1556` |
| Chaque feuille d'un axe garde toutes ses valeurs de modes sous `com.ucm.modes`, et nomme son axe sous `com.ucm.axis` | `packages/kit/src/format/tokens.ts:71` |
| Le nombre d'axes n'est pas borné. Chaque axe reçoit un attribut HTML, `data-` suivi du nom de l'axe, remplaçable dans `ucm.config.json` | `packages/cli/README.md:303` |
| La feuille CSS déclare la base sur `:root`, une règle par mode de chaque axe, puis un croisement `@scope` pour chaque couple d'axes qui se rencontrent | `packages/cli/src/tokens-css.mjs:4` |
| Trois axes imbriqués sont vérifiés dans Chromium, Firefox et WebKit | `packages/cli/tests/cascade/` |
| Les collections étendues sont lues à titre expérimental : la collection parente reste l'axe, les surcharges vont sous `com.ucm.extensions`, et la feuille CSS émet un intermédiaire par extension | `docs/format/FORMAT.md:1593` |
| Un token sans valeur dans un contexte se déclare `initial`, et la commande le nomme | `packages/cli/README.md:323` |
| La commande imprime le nombre de règles, de déclarations et d'octets de la feuille écrite | `packages/cli/src/tokens-css.mjs:663` |

Deux limites comptent pour la suite.

L'export lit toutes les collections locales du fichier
(`packages/plugin/src/tokens/exportTokens.ts:941`). Aucun réglage n'en écarte
une. Une collection qui sert à piloter des propriétés de composants Figma part
donc dans `tokens.json` avec les autres.

La feuille CSS n'émet aucune règle `@media (prefers-color-scheme)`. Le mode
sombre se pose par un attribut, et l'application décide quand le poser. Trois
lignes suffisent (section 8), mais elles sont à la charge du consommateur.

## 2. Le Playground aujourd'hui

`mesurer-duplication.mjs`, dans ce dossier, relève l'état d'un `tokens.json`.
Sur `UCM-Playground/src/tokens/tokens.json` :

| Collection | Feuilles | Modes |
|---|---|---|
| `components` | 369 | aucun |
| `primitives` | 175 | aucun |
| `typography` | 60 | aucun |
| `color-utilities` | 54 | aucun |
| `color-brands` | 44 | aucun |
| `layouts` | 31 | aucun |
| `color-brand-tokens` | 10 | `intencial`, `marque-2` |

Un seul axe, dix feuilles, vingt valeurs, aucune colonne redondante. La matrice
des citations descend strictement : `components` cite `color-utilities`,
`primitives`, `color-brand-tokens` et `layouts` ; `color-brand-tokens` cite
`color-brands` ; `color-brands` cite `primitives`. Aucune collection ne cite une
collection qui la cite.

Le Playground ne porte donc ni mode clair et sombre, ni axe de mise en page. Sa
valeur ici tient à sa forme : une couche de marque mince, isolée dans sa propre
collection, avec tout le reste hors des modes. C'est la forme vers laquelle la
section 6 conduit, à cette différence près qu'il y manque un second axe.

## 3. Le fichier Figma aujourd'hui

L'extrait fourni déclare trois axes.

| Axe | Modes | Défaut |
|---|---|---|
| `theme` | `intencial`, `gresham`, `apicil`, `onelife`, `blank` | `intencial` |
| `layout` | `xs-s`, `m`, `l-xl`, `xxl` | `xs-s` |
| `mode` | `light`, `dark` | `light` |

Les collections racines sont `theme`, `colour-tokens`, `layout`, `size-tokens`
et `mode`.

### 3.1 La couche sémantique est écrite trois fois

La collection `theme` porte l'axe des marques. Le clair et le sombre y sont un
niveau de dossier, pas un mode : `theme.light.primary.main` et
`theme.dark.primary.main` sont deux variables distinctes, chacune avec ses cinq
colonnes de marque.

La collection `mode` porte l'axe `light` et `dark`, et chacune de ses feuilles
ne fait que choisir entre les deux dossiers précédents :

```json
"mode.primary.main": {
  "com.ucm.axis": "mode",
  "com.ucm.modes": {
    "light": "{theme.light.primary.main}",
    "dark":  "{theme.dark.primary.main}"
  }
}
```

Une intention sémantique unique, « la couleur primaire du thème », occupe donc
trois variables et douze valeurs : cinq dans le dossier clair, cinq dans le
dossier sombre, deux dans la collection d'aiguillage. La section 7 chiffre ce
que cela représente sur toute la surface.

### 3.2 La cause : les rampes de marque ne sont pas alignées

Voici pourquoi l'axe des marques est monté jusqu'à la couche sémantique. Les
cinq rampes `primary` ont la même taille, dix crans, mais leurs crans ne portent
pas les mêmes numéros, et le cran utilisé en clair change d'une marque à
l'autre :

| Marque | Crans de `primary` | Cran clair | Cran sombre |
|---|---|---|---|
| `intencial` | 50, 100, 300, 500, 600, 700, 800, 900 | `400-[light]` | `200-[dark]` |
| `gresham` | 50, 100, 200, 300, 500, 600, 700, 900 | `800-[light]` | `400-[dark]` |
| `apicil` | 50, 100, 200, 400, 500, 600, 800, 900 | `700-[light]` | `300-[dark]` |
| `onelife` | 50, 100, 300, 400, 500, 600, 800, 900 | `700-[light]` | `200-[dark]` |
| `blank` | 50, 100, 300, 400, 500, 600, 800, 900 | `700-[light]` | `200-[dark]` |

Les cinq colonnes de `theme.light.primary.main` disent alors la même phrase :

```json
"intencial": "{colour-tokens.intencial.primary.400-[light]}",
"gresham":   "{colour-tokens.gresham.primary.800-[light]}",
"apicil":    "{colour-tokens.apicil.primary.700-[light]}",
"onelife":   "{colour-tokens.onelife.primary.700-[light]}"
```

Chaque colonne répète « prends le cran clair de la rampe `primary` de ma
marque ». Le seul fait qui varie d'une marque à l'autre est le numéro du cran
qui joue ce rôle, et ce fait appartient à la couche des rampes. Écrit là où il
est aujourd'hui, il oblige toute la couche sémantique, et toute la couche
composant qu'elle contient, à porter cinq colonnes.

La preuve inverse se lit sur les tokens voisins. `theme.light.primary.lighter`
vaut le cran `100` dans les quatre marques renseignées,
`theme.light.primary.lightest` vaut `50` dans les quatre, et
`theme.light.primary.contrasttext` vaut `{colour-tokens.greyscale.white}` dans
les cinq. Ces colonnes ne portent aucune information.

Le suffixe `-[light]` et `-[dark]` dans un nom de cran est le même fait vu d'un
autre côté : un mode inscrit dans un nom qu'aucun contexte ne peut commuter.

### 3.3 Ce que la triple écriture a déjà coûté

Trois endroits à tenir d'accord divergent. L'extrait en porte des traces, toutes
vérifiables dans le fichier.

| Passage | Ce qu'il fait |
|---|---|
| `mode.components.icon.error.foreground` | Ses deux colonnes valent `{theme.dark.components.icon.error.foreground}`. Le mode clair sert la valeur sombre |
| `mode.components.filters.stroke` | Sa colonne sombre vaut `{colour-tokens.gresham.primary.200}`. Le sombre impose un bleu Gresham quelle que soit la marque affichée |
| `mode.components.tablecell.backgroundeven` | Ses deux colonnes valent `{colour-tokens.greyscale.50}`, alors que `theme.light.components.tablecell.backgroundeven` vise `{theme.light.neutral.light}`. Le sommet ignore la couche sémantique |
| `mode.components.tablecell.backgroundodd-2` | Un nom qui a dérivé de celui de son homologue `backgroundodd` |
| `mode.components.button.warning.text.default.foreground` | Vise `theme.light.components.button.warning.text.default.background`. Un premier plan alimenté par un fond, parce que la variable `foreground` manque dans le dossier clair |
| `theme.light.components.dataviz.assets.a.surface`, colonne `apicil` | Vise `{mode.components.dataviz.pie.support_11}`. La couche sémantique cite la couche d'aiguillage qui la cite |
| `theme.dark.components.button.success.outlined.focused.background`, colonne `blank` | Vise `{mode.success.dark}`. Même inversion |
| `theme.dark.primary.main`, colonne `gresham` | Vaut `null`. Le sombre n'est pas renseigné pour cette marque |
| `theme.dark.components.sri.background` | Vise `{theme.light.background.grey}`. Le sombre emprunte au clair |
| `theme.light.background.container` | Porte une couleur dont les trois canaux valent `null` |

Les deux inversions de couche méritent un mot. `ucm tokens css` refuse un cycle
d'alias qu'un contexte peut atteindre. Ces deux passages n'en forment pas un,
puisqu'ils visent une autre feuille, mais ils circulent dans le mauvais sens et
un ajout les transformerait en cycle, donc en refus d'écriture de la feuille.

### 3.4 Les variables qui ne décrivent aucun style

La collection `layout` porte, à côté des espacements et de l'échelle
typographique, des variables dont la valeur pilote une propriété de composant
Figma.

| Chemin | Type | Valeurs |
|---|---|---|
| `layout.component.supercontainer.burger` | booléen | `true`, `true`, `false`, `false` |
| `layout.component.selectcardtemplate.defaultoneslot` | chaîne | `3`, `3`, `Square`, `Square` |
| `layout.component.listenotification.small` | chaîne | `Medium`, `Large`, `XL`, `XXL` |
| `layout.figma-utilities.gap-spacing.*` | dimension | Des écarts nommés pour l'outil de dessin |
| `layout.illustration` | chaîne | `Family` |
| `theme.light.components.supercontainer.logo.brands` | chaîne | `Intencial`, `Gresham`, `Apicil`, `Onelife`, `Blank` |

Ces variables sont légitimes dans Figma : elles commutent une variante de
composant selon le palier ou la marque. Elles n'ont pas de sens pour un
consommateur du fichier de tokens, et l'export n'a aucun moyen de les écarter
(section 1). Elles entrent donc dans la surface que lit un développeur et dans
la feuille CSS.

## 4. Ce que la pratique publiée établit

| Source | Ce qu'elle établit |
|---|---|
| [Modes for variables, Figma](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables) | Les modes appartiennent à une collection, pas à une variable. Un calque hérite du mode de son conteneur, collection par collection, jusqu'à un conteneur qui en fixe un ou jusqu'au défaut de la collection |
| [Overview of variables, collections, and modes, Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) | Une collection regroupe des variables liées ; un mode représente un contexte pour ces mêmes variables. Le plafond de modes par collection dépend de l'offre |
| [Extend a variable collection, Figma](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection) | Une collection étendue hérite des modes, des noms et de l'ordre de sa parente, et n'accepte que des surcharges de valeurs. Aucun mode ni aucune variable ne s'y ajoute. La fonction est réservée à l'offre Enterprise |
| [Multi-mode setups, Supernova](https://www.supernova.io/guides/supernova-figma-variables-playbook/1-mastering-figma-variables/multi-mode-setups) | Une collection par dimension, de un à trois modes chacune. Mêler le clair et le sombre avec les marques dans une même collection est nommé comme la façon de perdre le contrôle |
| [Using Figma Variables to build a Multi-Brand Design System, Rangle](https://rangle.io/blog/using-figma-variables-to-build-a-multi-brand-design-system) | Deux montages selon que les marques partagent ou non leurs primitives : une fondation commune avec une couche sémantique par marque, ou une fondation par marque |
| [Color system, Spectrum](https://spectrum.adobe.com/page/color-system/) | Un nom sémantique unique se résout en valeurs différentes selon le thème actif. Le numéro du cran porte le contraste avec le fond, et la rampe s'inverse entre clair et sombre. La couche sémantique n'est pas dupliquée par thème |
| [Design Tokens Resolver Module](https://www.designtokens.org/tr/drafts/resolver/) | Le brouillon de résolution du format standardise des jeux de tokens et des modificateurs, avec un ordre de résolution explicite, pour composer plusieurs thèmes sans dupliquer les jeux |

Deux points de vigilance ressortent des forums Figma, et ils portent sur la
cible proposée plus bas. Les collections étendues [ne respectent pas toujours la
hiérarchie des
modes](https://forum.figma.com/share-your-feedback-26/extended-collections-doesn-t-respect-mode-hierarchy-48123),
et le plafond de modes par collection [dépend de
l'offre](https://forum.figma.com/suggest-a-feature-11/launched-all-plans-should-offer-more-than-4-variable-modes-13979),
avec des valeurs que Figma a relevées et que les sources secondaires citent de
façon contradictoire. Cinq marques dans une collection demandent donc de lire le
plafond dans l'interface de l'équipe avant de s'y engager.

## 5. La règle qui décide de tout

Un fait s'écrit une fois, à la couche la plus basse où il varie.

Trois conséquences suffisent à produire la cible.

Un axe par collection. Deux dimensions dans une même collection obligent à en
écrire le produit, et Figma résout chaque collection indépendamment, donc rien
n'oblige à les croiser à la main.

Une dimension entre le plus bas possible. Si la marque entre à la couche des
rampes, la couche sémantique et la couche composant n'en portent aucune trace.
Si elle entre à la couche sémantique, tout ce qui est au-dessus porte ses cinq
colonnes.

Une couche sans variation n'a pas de mode. Une collection de tokens de
composants qui n'alias que la couche sémantique n'a besoin d'aucun mode : elle
suit ce que la couche sémantique résout.

## 6. La cible proposée

### 6.1 Les cinq collections

| Collection | Modes | Contenu | Cite |
|---|---|---|---|
| `primitive` | aucun | Les rampes brutes des cinq marques, la grisaille, les rampes sémantiques `success`, `info`, `warning`, `danger`, la palette `other`, les tailles et les points de rupture | rien |
| `brand` | 5 : `intencial`, `gresham`, `apicil`, `onelife`, `blank` | Des emplacements de rôle, chaque colonne désignant le cran de sa propre marque qui joue ce rôle | `primitive` |
| `semantic` | 2 : `light`, `dark` | La surface sémantique actuelle, sans marque : `semantic.primary.main`, `semantic.background.paper`, `semantic.text.primary` | `brand`, `primitive` |
| `component` | aucun | Les tokens par composant, aujourd'hui logés dans `theme.light.components` et `theme.dark.components` | `semantic` |
| `layout` | 4 : `xs-s`, `m`, `l-xl`, `xxl` | Les dimensions, les rayons et l'échelle typographique par palier | `primitive` |

La colonne « Cite » est une loi d'ordre, pas une indication. Une collection ne
cite que les collections en dessous d'elle. Le relevé n° 5 de
`mesurer-duplication.mjs` imprime la matrice des citations, ce qui rend cette
loi vérifiable à chaque export.

### 6.2 Là où le clair et le sombre se décident

Les emplacements de `brand` sont doublés, un par mode d'affichage, parce que les
cinq rampes ne sont pas alignées (section 3.2) :

```
brand.primary.main.on-light   intencial → primitive.intencial.primary.400
                              gresham   → primitive.gresham.primary.800
                              apicil    → primitive.apicil.primary.700
brand.primary.main.on-dark    intencial → primitive.intencial.primary.200
                              gresham   → primitive.gresham.primary.400
                              apicil    → primitive.apicil.primary.300
```

La couche sémantique choisit alors entre les deux, une seule fois pour les cinq
marques :

```
semantic.primary.main   light → brand.primary.main.on-light
                        dark  → brand.primary.main.on-dark
```

Les suffixes `-[light]` et `-[dark]` disparaissent des noms de crans. Le fait
« Gresham utilise son cran 800 là où Intencial utilise son 400 » est écrit une
fois, dans `brand`. Le fait « en sombre, la primaire est plus claire » est écrit
une fois, dans `semantic`.

### 6.3 Les divergences de marque qui restent

Certaines marques ne diffèrent pas seulement par leur teinte. Dans l'extrait,
`theme.light.components.horizontalrepartition.left` vaut du blanc pour `apicil`
et une couleur de marque pour les autres ; `theme.light.messenger.surfaceleft`
change de famille selon la marque. Ces divergences sont réelles et n'entrent pas
dans un simple décalage de cran.

Trois façons de les loger, par ordre de préférence.

**Élargir `brand`.** Ajouter l'emplacement qui manque, par exemple
`brand.dataviz.left`, et laisser la couche sémantique le citer sans condition.
La règle de la section 5 prescrit cette voie : la divergence est un fait de
marque, donc elle descend à la couche de marque. Une seule couche sémantique
subsiste.

**Étendre la collection sémantique.** Une collection parente et une extension
par marque qui ne surcharge que les tokens divergents. L'export écrit ces
surcharges sous `com.ucm.extensions`, et la feuille CSS émet un intermédiaire
par extension. Le coût d'écriture se limite aux exceptions. Deux réserves :
l'offre Enterprise est requise, et la lecture des collections étendues reste
expérimentale dans le produit, prouvée sur une simulation de l'API Figma.

**Une collection d'exceptions.** Une sixième collection à cinq modes, placée
entre `semantic` et `component`, ne portant que les tokens divergents. Sans
Enterprise, c'est la voie de repli. Son coût est un second espace de noms à
retenir pour les concepteurs de composants.

### 6.4 Les variables réservées à Figma

Les variables de la section 3.4 restent utiles dans le fichier de dessin. Faute
d'un filtre à l'export, deux options seulement : les tenir dans un fichier Figma
distinct qui ne sert pas à l'export, ou les accepter dans `tokens.json` et dans
la feuille CSS. Un réglage d'export qui écarte une collection nommée est une
évolution possible du plugin ; elle n'existe pas.

### 6.5 L'horizon : aligner les rampes

Si les cinq rampes étaient renumérotées pour qu'un même indice joue le même rôle
dans toutes les marques, la collection `brand` n'aurait plus besoin de ses
emplacements doublés, et la couche sémantique pourrait même perdre ses modes au
profit d'une collection de rampes commutée en clair et sombre. C'est le montage
de Spectrum. Il demande de refaire les cinq rampes avec une courbe de clarté
commune, ce qui est un travail de conception, pas une réorganisation. La cible
décrite plus haut ne l'exige pas et ne l'empêche pas.

## 7. Ce que la cible change en volume

Soit `N` le nombre de noms sémantiques, `C` le nombre de tokens de composants,
`S` le nombre d'emplacements de rôle par marque et `B` le nombre de marques,
cinq ici.

| Couche | Valeurs écrites aujourd'hui | Valeurs écrites dans la cible |
|---|---|---|
| Sémantique | `2·N·B` dans les dossiers clair et sombre, plus `2·N` d'aiguillage, soit `12·N` pour `B = 5` | `2·N` |
| Composants | `2·C·B`, puisque les tokens de composants vivent dans les dossiers clair et sombre de la collection de marque, soit `10·C` | `C` |
| Marque | `B` rampes nommées séparément, donc `B` espaces de noms que la couche sémantique doit distinguer | `2·S·B`, un seul espace de noms |

Le rapport est de six pour la couche sémantique et de dix pour la couche
composant, avant toute mesure du nombre de colonnes déjà identiques. Ce dernier
chiffre est le plus important et il n'est pas encore relevé : chaque token dont
les cinq colonnes portent la même valeur est un fait écrit cinq fois. La section
9 dit comment l'obtenir.

Le gain n'est pas seulement un volume. Les dix dérives de la section 3.3 sont
toutes des désaccords entre deux écritures du même fait. Une écriture unique les
rend impossibles par construction.

## 8. Ce que la cible donne côté code

Trois axes, donc trois attributs. La configuration du dépôt consommateur les
nomme :

```json
{
  "modes": {
    "brand": "data-brand",
    "semantic": "data-theme",
    "layout": "data-breakpoint"
  }
}
```

Les trois attributs se posent sur n'importe quel élément et valent pour son
sous-arbre. Sur la racine :

```html
<html data-brand="intencial" data-theme="light" data-breakpoint="l-xl">
```

Un sous-arbre en sombre sous une page claire se pose seul, et le croisement
`@scope` émis par la commande départage la proximité des deux attributs :

```html
<aside data-theme="dark">…</aside>
```

Le mode système se lit en JavaScript, la feuille n'émettant aucune règle
`@media` :

```js
const sombre = window.matchMedia("(prefers-color-scheme: dark)");
const appliquer = () => {
  document.documentElement.dataset.theme = sombre.matches ? "dark" : "light";
};
appliquer();
sombre.addEventListener("change", appliquer);
```

Le palier de mise en page pose une question de fond que la cible ne tranche pas.
Un attribut ne se met pas à jour tout seul quand la fenêtre change de taille,
là où une règle `@media` le fait. Deux réponses possibles : un observateur qui
pose `data-breakpoint`, ou une feuille complémentaire écrite à la main qui
redéclare les tokens de `layout` sous des `@media`. La seconde sort du périmètre
de `ucm tokens css`. Le sujet mérite d'être instruit séparément.

Sur la taille de la feuille CSS, un point de vigilance. Le nombre de règles
croît avec le nombre de couples d'axes qui se rencontrent : trois axes donnent
jusqu'à six blocs `@scope` croisés, contre aucun avec un seul axe. La commande
imprime le nombre de règles, de déclarations et d'octets à chaque écriture, donc
le coût se relève plutôt qu'il ne s'estime.

## 9. Ce qui reste à mesurer

Rien dans la section 7 n'est mesuré sur le fichier réel. Le script de ce dossier
le fait :

```sh
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-duplication.mjs" <tokens.json>
```

Trois relevés décident de l'ampleur du gain.

La part de colonnes mortes de l'axe des marques, relevé n° 3. Une part élevée
confirme que la marque est montée trop haut. Une part faible dirait que les cinq
marques divergent réellement partout, et la cible perdrait son intérêt
principal.

Le nombre de jumelles `light` et `dark` identiques, relevé n° 4. Ce sont les
tokens pour lesquels le mode sombre n'a pas été conçu et recopie le clair.

La matrice des citations, relevé n° 5. Elle montre les inversions de couche
avant qu'un ajout n'en fasse un cycle.

Le même script tourné après la réorganisation donne la mesure du gain. La
taille de la feuille CSS se relève avec `ucm tokens css`, qui imprime ses règles,
ses déclarations et ses octets.

## 10. Le chemin

Chaque étape est vérifiable seule et laisse le fichier utilisable.

| Étape | Geste | Vérification |
|---|---|---|
| 1 | Relever l'état avec le script et garder le relevé | Un fichier de départ existe |
| 2 | Vérifier le plafond de modes par collection de l'offre Figma de l'équipe | Cinq modes tiennent dans une collection |
| 3 | Sortir la collection `mode` en repointant ses consommateurs sur la future collection sémantique | Le relevé n° 5 ne montre plus de citation vers `mode` |
| 4 | Créer `brand`, cinq modes, avec les emplacements de rôle doublés en clair et en sombre | Les crans `-[light]` et `-[dark]` ne sont plus cités que depuis `brand` |
| 5 | Convertir `theme.light` et `theme.dark` en une collection `semantic` à deux modes, sans marque | Le relevé n° 3 ne montre plus d'axe de marque au-dessus de `brand` |
| 6 | Sortir `theme.*.components` dans une collection `component` sans mode | Le relevé n° 1 montre la collection, le relevé n° 3 ne la porte sur aucun axe |
| 7 | Loger les divergences résiduelles selon la section 6.3 | Le nombre de tokens divergents est connu et borné |
| 8 | Renommer les crans en retirant `-[light]` et `-[dark]` | Le relevé n° 6 tombe à zéro |
| 9 | Exporter, générer la feuille, comparer les relevés et la taille de feuille | Le gain est chiffré |

## 11. Ce qui peut rater

**Le plafond de modes.** Cinq marques dans une collection supposent une offre
qui l'autorise. À vérifier avant l'étape 4, pas après.

**Les collections étendues.** Si la voie de la section 6.3 les retient, deux
risques se cumulent : l'offre Enterprise, et une lecture du produit prouvée sur
une simulation plutôt que sur un fichier réel. Un essai sur un vrai fichier
étendu est le préalable.

**Le renommage de masse.** Les étapes 3 à 6 déplacent des variables que des
maquettes citent. Figma suit un renommage, mais un déplacement entre collections
casse les liaisons. Le geste se fait collection par collection, et une page de
contrôle qui affiche tous les tokens sert de témoin.

**Le sombre incomplet.** Le relevé n° 4 dira combien de tokens sombres
recopient le clair. Réorganiser ne les conçoit pas. La réorganisation rend
seulement visible ce qui reste à décider.

**Le palier de mise en page.** L'attribut `data-breakpoint` ne suit pas la
largeur de la fenêtre sans code. Tant que ce point n'est pas instruit, l'axe
`layout` sert en dessin et laisse un trou côté rendu.

## Sources

- [Modes for variables, Figma Learn](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Overview of variables, collections, and modes, Figma Learn](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Extend a variable collection, Figma Learn](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection)
- [Extended collections doesn't respect mode hierarchy, forum Figma](https://forum.figma.com/share-your-feedback-26/extended-collections-doesn-t-respect-mode-hierarchy-48123)
- [All plans should offer more than 4 variable modes, forum Figma](https://forum.figma.com/suggest-a-feature-11/launched-all-plans-should-offer-more-than-4-variable-modes-13979)
- [Multi-mode setups, Supernova](https://www.supernova.io/guides/supernova-figma-variables-playbook/1-mastering-figma-variables/multi-mode-setups)
- [What Are Figma Variables, Modes, and Collections, Supernova](https://www.supernova.io/blog/what-are-figma-variables-modes-collections)
- [Using Figma Variables to build a Multi-Brand Design System, Rangle](https://rangle.io/blog/using-figma-variables-to-build-a-multi-brand-design-system)
- [Figma variable modes in depth, zeroheight](https://zeroheight.com/learn/figma-variable-modes-in-depth-theming-dark-mode-and-brand-switching/)
- [Color system, Spectrum](https://spectrum.adobe.com/page/color-system/)
- [Design Tokens Resolver Module](https://www.designtokens.org/tr/drafts/resolver/)
- [Design Tokens specification reaches first stable version](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
