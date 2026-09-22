# Architecture de tokens multi-marques, en clair et en sombre

Six marques à terme, deux modes d'affichage. Chaque marque doit s'afficher en
clair et en sombre sur ses propres couleurs, et chaque composant doit suivre.
La question posée : quelle forme donner aux collections de tokens pour couvrir
ce produit sans écrire le même fait plusieurs fois.

Le sujet est la collection de tokens du Playground, à qui il manque le mode
sombre. La forme retenue se réplique ensuite dans Figma, puisque `tokens.json`
sort d'un export et ne se retouche pas à la main.

Le document mesure l'état du Playground, propose une cible et son chemin, puis
regarde le fichier Figma de production comme un exemple de ce qu'une autre
répartition coûte. Il ne décide rien : aucune partie du produit n'en dépend, et
la cible reste soumise aux mesures de la section 8.

## 1. Le Playground aujourd'hui

Relevé par `mesurer-duplication.mjs`, dans ce dossier, sur
`UCM-Playground/src/tokens/tokens.json` : 760 feuilles, huit collections, un
seul axe.

| Collection | Feuilles | Modes |
|---|---|---|
| `components` | 369 | aucun |
| `primitives` | 175 | aucun |
| `typography` | 60 | aucun |
| `color-utilities` | 54 | aucun |
| `color-brands` | 44 | aucun |
| `layouts` | 31 | aucun |
| `tests` | 17 | aucun |
| `color-brand-tokens` | 10 | `intencial`, `marque-2` |

La matrice des citations descend strictement, aucune collection ne cite une
collection qui la cite. La forme est saine. Il lui manque une couche.

### 1.1 Le mode sombre n'a rien à quoi s'accrocher

La collection `components` porte 306 feuilles de couleur. Voici ce qu'elles
citent.

| Cible | Citations | Ce qu'un axe clair et sombre pourrait y changer |
|---|---|---|
| `color-utilities.neutral` | 84 | rien, la collection n'a pas de mode |
| `color-utilities.success`, `warning`, `danger`, `info` | 133 | rien |
| `primitives.colors.*`, valeur brute | 39 | rien |
| `color-brand-tokens.primary`, `secondary` | 50 | la marque seulement |

256 des 306 citations, soit 84 %, ne traversent aucune couche commutable.
`components.alert.colors.info.standard.background` vise
`primitives.colors.sky.50` : un bleu très clair, écrit en dur, qu'aucun contexte
ne peut remplacer par un fond sombre.

Le constat qui commande tout le reste : le mode sombre ne s'ajoute pas par un
axe, il s'ajoute par une couche. Le Playground ne porte pas de couche sémantique
de couleur. `color-brand-tokens` en tient lieu pour dix tokens de marque, ce qui
couvre un sixième des couleurs de composants. Poser un axe `light` et `dark` sur
une collection existante laisserait les 256 autres citations figées.

### 1.2 La couche qui manque tient en cinquante-cinq noms

Les 306 feuilles de couleur ne citent que **55 cibles distinctes**.

| Groupe visé | Cibles distinctes |
|---|---|
| `primitives.colors` | 21 |
| `color-utilities.success` | 9 |
| `color-utilities.info` | 5 |
| `color-utilities.warning` | 5 |
| `color-utilities.danger` | 4 |
| `color-utilities.neutral` | 3 |
| `color-brand-tokens.secondary` | 4 |
| `color-brand-tokens.primary` | 4 |

C'est la taille de la collection sémantique à écrire, et la borne du travail de
repointage. Cinquante-cinq tokens à deux colonnes suffisent à rendre les 369
tokens de composants capables de basculer.

### 1.3 Les rampes de marque sont presque alignées

`color-brand-tokens` donne un nom de rôle à un cran de la rampe de chaque
marque.

| Rôle | Cran `intencial` | Cran `marque-2` |
|---|---|---|
| `primary.subtlest` | 50 | 50 |
| `primary.subtle` | 200 | 200 |
| `primary.default` | 500 | 500 |
| `primary.emphasis` | 600 | 600 |
| `primary.strong` | 700 | 700 |
| `secondary.subtlest` | 100 | 50 |
| `secondary.subtle` | 200 | 200 |
| `secondary.default` | 700 | 500 |
| `secondary.emphasis` | 800 | 700 |
| `secondary.strong` | 900 | 900 |

La rampe `primary` est alignée : le même numéro joue le même rôle dans les deux
marques, et les deux colonnes de `color-brand-tokens.primary.*` disent la même
phrase. La rampe `secondary` diverge sur trois rôles.

L'information portée par l'axe des marques se réduit donc à trois cases sur
dix. C'est ce que mesure le relevé n° 3 du script : une colonne morte est un
fait écrit deux fois. Sur six marques, ce sera écrit six fois.

## 2. La règle qui décide

Un fait s'écrit une fois, à la couche la plus basse où il varie.

Trois conséquences produisent la cible.

Un axe par collection. Figma résout chaque collection indépendamment et
`ucm tokens css` croise les axes tout seul, donc rien n'oblige à écrire le
produit des dimensions à la main.

Une dimension entre le plus bas possible. Si la marque entre à la couche des
rampes, la couche sémantique et la couche composant n'en portent aucune trace.
Si elle entre plus haut, tout ce qui est au-dessus porte ses six colonnes.

Une couche sans variation n'a pas de mode. Une collection de tokens de
composants qui n'alias que la couche sémantique suit ce que celle-ci résout,
sans colonne à elle.

## 3. La cible pour le Playground

### 3.1 Les collections

| Collection | Modes | Contenu | Cite |
|---|---|---|---|
| `primitives` | aucun | Les rampes brutes, les dimensions, les primitives typographiques. Inchangée | rien |
| `color-brands` | 6 : une par marque | La rampe de la marque courante, cran par cran : `color-brands.primary.50` à `900`, `secondary.*`. Un seul jeu de noms, six colonnes | `primitives` |
| `color-utilities` | aucun | Les rampes `neutral`, `success`, `warning`, `danger`, `info`. Inchangée | `primitives` |
| `theme` | 2 : `light`, `dark` | La couche qui manque, environ 55 tokens. Le seul endroit où le clair et le sombre se décident | `color-brands`, `color-utilities` |
| `components` | aucun | Les 369 tokens actuels, repointés sur `theme` et `layouts` | `theme`, `layouts` |
| `layouts`, `typography` | aucun | Inchangées | `primitives` |

`color-brand-tokens` disparaît. Ses dix noms de rôle remontent dans `theme`,
sous `theme.primary.*` et `theme.secondary.*`, et la marque descend dans
`color-brands`.

Deux changements portent tout le gain. La marque cesse d'être un niveau de
dossier dans `color-brands` pour devenir six colonnes sur un jeu de noms unique,
ce qui la fait disparaître de tous les noms en aval. Et la couche `theme`
s'intercale entre les rampes et les composants, ce qui donne au clair et au
sombre un endroit unique où se décider.

### 3.2 Comment une couleur de marque traverse les deux axes

Une seule ligne par rôle couvre les six marques et les deux modes :

```
color-brands.primary.500     intencial → primitives.colors.sky.500
                             marque-2  → primitives.colors.grass.500
                             …          (six colonnes, une par marque)

theme.primary.default        light → color-brands.primary.500
                             dark  → color-brands.primary.300

components.button.colors.primary.contained.default.background
                             → theme.primary.default
```

Le fait « la primaire d'une marque est son cran 500 » est écrit une fois, dans
`theme`, pour les six marques. Le fait « quel bleu est le cran 500 d'intencial »
est écrit une fois, dans `color-brands`. Le bouton ne sait ni quelle marque ni
quel mode il rend.

Cela suppose que le cran `500` joue le même rôle dans les six rampes. La rampe
`primary` du Playground le vérifie déjà (section 1.3). La rampe `secondary` ne
le vérifie pas sur trois rôles, ce que la section 3.4 traite.

### 3.3 Ce que `theme` contient

Les 55 cibles distinctes de la section 1.2 se rangent en cinq familles. Les
noms proposés suivent ceux déjà employés par `color-brand-tokens`.

| Famille | Tokens | Source en clair | Source en sombre |
|---|---|---|---|
| `theme.surface.*` | `page`, `raised`, `sunken`, `overlay` | crans clairs de `color-utilities.neutral` | crans sombres de la même rampe |
| `theme.text.*` | `primary`, `secondary`, `disabled`, `on-brand`, `on-feedback` | crans sombres de `neutral` | crans clairs |
| `theme.border.*` | `subtle`, `default`, `strong` | `neutral` | `neutral` |
| `theme.primary.*`, `theme.secondary.*` | `subtlest`, `subtle`, `default`, `emphasis`, `strong` | crans de `color-brands` | crans plus clairs de `color-brands` |
| `theme.feedback.<ton>.*` | `surface`, `border`, `foreground`, `solid`, `on-solid` pour `success`, `warning`, `danger`, `info` | crans de `color-utilities` | crans opposés |

Les 39 citations brutes vers `primitives.colors.*` se replient sur
`theme.feedback.*`. L'exemple de la section 1.1,
`components.alert.colors.info.standard.background`, vise alors
`theme.feedback.info.surface`, qui vaut `color-utilities.info.50` en clair et
`color-utilities.info.900` en sombre.

### 3.4 Les trois rôles qui divergent

Trois rôles de `secondary` ne tombent pas sur le même cran selon la marque.
Deux issues.

**Réaligner la rampe.** Renuméroter les crans pour qu'un même numéro joue le
même rôle dans les six marques. C'est la voie à préférer : elle rend l'axe des
marques purement chromatique, et la couche `theme` décide seule des crans. Dans
un fichier de laboratoire, c'est un renommage.

**Doubler l'emplacement pour ces rôles seulement.** Ajouter dans `color-brands`
un emplacement de rôle porté par les six colonnes, par exemple
`color-brands.secondary.default.on-light` et `.on-dark`, et laisser `theme` les
citer. Le coût se limite aux rôles qui divergent, six colonnes fois deux
emplacements, au lieu de forcer l'alignement.

Une troisième voie existe dans Figma pour des divergences plus profondes, quand
une marque veut une famille de couleur différente pour un rôle sémantique : une
collection `theme` parente et une extension par marque, qui ne surcharge que les
tokens divergents. L'export écrit ces surcharges sous `com.ucm.extensions` et la
feuille CSS émet un intermédiaire par extension. Deux réserves : la fonction est
réservée à l'offre Enterprise, et la lecture du produit est prouvée sur une
simulation de l'API Figma, pas sur un fichier réel.

### 3.5 Aller plus loin sur le sombre

Deux raffinements que la cible permet sans la changer.

Un mode sombre n'est pas seulement une rampe inversée. La désaturation des
couleurs vives sur fond sombre et les surfaces surélevées se décident dans
`theme`, en pointant vers d'autres crans ou vers des crans ajoutés aux rampes.
Aucune autre couche ne bouge.

Un troisième mode d'affichage, contraste renforcé par exemple, devient une
troisième colonne dans `theme`. Rien d'autre dans le fichier ne le sait.

## 4. Ce que la cible change en volume

Sur les nombres mesurés du Playground, pour six marques et deux modes.

| Poste | Valeurs écrites |
|---|---|
| `color-brands` : 22 crans, 6 colonnes | 132 |
| `theme` : 55 tokens, 2 colonnes | 110 |
| `components` : 369 tokens, aucune colonne | 369 |
| Total | 611 |

Sans couche sémantique, couvrir le même produit demanderait d'écrire chaque
couleur de composant dans chaque combinaison, soit 6 × 2 × 306 = 3 672 valeurs
pour la seule couche composant.

Le gain de volume compte moins que ce qu'il rend impossible. Un fait écrit une
fois ne peut pas être en désaccord avec lui-même. La section 6 montre dix
désaccords relevés dans un fichier où trois écritures du même fait coexistent.

## 5. Ce que la cible donne côté code

Deux axes, donc deux attributs. La configuration du dépôt les nomme :

```json
{
  "modes": {
    "color-brands": "data-brand",
    "theme": "data-theme"
  }
}
```

La clé d'un axe est le préfixe que sa collection donne aux chemins, et la valeur
remplace l'attribut par défaut `data-` suivi du nom de l'axe.

Les deux attributs se posent sur n'importe quel élément et valent pour son
sous-arbre :

```html
<html data-brand="intencial" data-theme="light">
```

Un sous-arbre en sombre sous une page claire se pose seul. `ucm tokens css`
déclare la base sur `:root`, une règle par mode de chaque axe, puis un
croisement `@scope` pour le couple d'axes, ce qui départage la proximité des
deux attributs. Le montage est vérifié sur trois axes imbriqués dans Chromium,
Firefox et WebKit par `packages/cli/tests/cascade/`.

```html
<aside data-theme="dark">…</aside>
```

La feuille n'émet aucune règle `@media (prefers-color-scheme)`. L'application
décide quand poser l'attribut :

```js
const sombre = window.matchMedia("(prefers-color-scheme: dark)");
const appliquer = () => {
  document.documentElement.dataset.theme = sombre.matches ? "dark" : "light";
};
appliquer();
sombre.addEventListener("change", appliquer);
```

Un composant ne déclare jamais d'attribut, il lit des tokens. N'importe quel
ancêtre commute donc sa marque et son mode, ce qui rend une galerie qui affiche
les douze combinaisons côte à côte écrivable sans code particulier.

Deux points relevés dans le code de l'outillage valent d'être connus. Un token
sans valeur dans un contexte se déclare `initial`, et la commande le nomme, donc
un trou de couverture en sombre se voit à l'écriture de la feuille. Et la
commande imprime le nombre de règles, de déclarations et d'octets à chaque
écriture, donc le coût de la feuille se relève plutôt qu'il ne s'estime.

## 6. Ce que le fichier Figma de production montre

Ce fichier rend le service attendu, et rien ici ne dit de le refaire. Il porte
cinq marques, deux modes et quatre paliers de mise en page, et il sert. Il vaut
comme exemple parce que ses tokens sont écrits dans une répartition différente,
et que les effets s'y lisent.

Il déclare trois axes : `theme` pour les cinq marques, `layout` pour les quatre
paliers, `mode` pour le clair et le sombre.

### 6.1 La couche sémantique y est écrite trois fois

Le clair et le sombre sont un niveau de dossier dans la collection des marques,
pas un mode. `theme.light.primary.main` et `theme.dark.primary.main` sont deux
variables distinctes, chacune avec ses cinq colonnes de marque. Une troisième
collection, `mode`, porte l'axe clair et sombre et ne fait qu'aiguiller entre
les deux dossiers :

```json
"mode.primary.main": {
  "com.ucm.axis": "mode",
  "com.ucm.modes": {
    "light": "{theme.light.primary.main}",
    "dark":  "{theme.dark.primary.main}"
  }
}
```

Une intention unique occupe trois variables et douze valeurs. Les tokens de
composants vivent dans ces mêmes dossiers, donc chacun porte lui aussi dix
valeurs là où la cible de la section 3 en écrit une.

### 6.2 La cause tient aux rampes

Les cinq rampes `primary` ont dix crans chacune, mais leurs crans ne portent pas
les mêmes numéros et le cran utilisé en clair change d'une marque à l'autre.

| Marque | Cran clair | Cran sombre |
|---|---|---|
| `intencial` | `400-[light]` | `200-[dark]` |
| `gresham` | `800-[light]` | `400-[dark]` |
| `apicil` | `700-[light]` | `300-[dark]` |
| `onelife` | `700-[light]` | `200-[dark]` |
| `blank` | `700-[light]` | `200-[dark]` |

Les cinq colonnes de `theme.light.primary.main` disent alors la même phrase,
« prends le cran clair de la rampe de ma marque » :

```json
"intencial": "{colour-tokens.intencial.primary.400-[light]}",
"gresham":   "{colour-tokens.gresham.primary.800-[light]}",
"apicil":    "{colour-tokens.apicil.primary.700-[light]}",
"onelife":   "{colour-tokens.onelife.primary.700-[light]}"
```

Le seul fait qui varie d'une marque à l'autre est le numéro du cran, et ce fait
appartient à la couche des rampes. Écrit à la couche sémantique, il oblige tout
ce qui est au-dessus à porter cinq colonnes. La preuve inverse se lit à côté :
`theme.light.primary.lighter` vaut le cran `100` dans les quatre marques
renseignées, et `theme.light.primary.contrasttext` vaut le même blanc dans les
cinq. Ces colonnes ne portent aucune information.

Le suffixe `-[light]` et `-[dark]` dans un nom de cran est le même fait vu d'un
autre côté : un mode inscrit dans un nom, qu'aucun contexte ne peut commuter.
C'est précisément ce que la section 3.4 propose d'éviter dans le Playground.

### 6.3 Ce que trois écritures du même fait ont produit

Toutes ces lignes sont vérifiables dans le fichier.

| Passage | Ce qu'il fait |
|---|---|
| `mode.components.icon.error.foreground` | Ses deux colonnes valent `{theme.dark.components.icon.error.foreground}`. Le mode clair sert la valeur sombre |
| `mode.components.filters.stroke` | Sa colonne sombre vaut `{colour-tokens.gresham.primary.200}`. Le sombre impose un bleu Gresham quelle que soit la marque affichée |
| `mode.components.tablecell.backgroundeven` | Ses deux colonnes valent `{colour-tokens.greyscale.50}`, alors que `theme.light.components.tablecell.backgroundeven` vise `{theme.light.neutral.light}` |
| `mode.components.tablecell.backgroundodd-2` | Un nom qui a dérivé de celui de son homologue `backgroundodd` |
| `mode.components.button.warning.text.default.foreground` | Vise un `background`, parce que la variable `foreground` manque dans le dossier clair |
| `theme.light.components.dataviz.assets.a.surface`, colonne `apicil` | Vise `{mode.components.dataviz.pie.support_11}`. La couche sémantique cite la couche d'aiguillage qui la cite |
| `theme.dark.components.button.success.outlined.focused.background`, colonne `blank` | Vise `{mode.success.dark}`. Même inversion |
| `theme.dark.primary.main`, colonne `gresham` | Vaut `null` |
| `theme.dark.components.sri.background` | Vise `{theme.light.background.grey}` |
| `theme.light.background.container` | Porte une couleur dont les trois canaux valent `null` |

Les deux inversions de couche méritent un mot pour le Playground.
`ucm tokens css` refuse un cycle d'alias qu'un contexte peut atteindre. Ces deux
passages n'en forment pas un, mais ils circulent dans le mauvais sens et un
ajout les transformerait en cycle, donc en refus d'écriture de la feuille. Le
relevé n° 5 du script imprime la matrice des citations, ce qui rend la loi
d'ordre de la section 3.1 vérifiable à chaque export.

### 6.4 Les variables qui ne décrivent aucun style

La collection `layout` porte aussi des variables dont la valeur pilote une
propriété de composant Figma : `layout.component.supercontainer.burger` est un
booléen, `layout.component.selectcardtemplate.defaultoneslot` vaut `3` ou
`Square`, `theme.light.components.supercontainer.logo.brands` vaut le nom de la
marque. Elles sont légitimes dans le fichier de dessin, où elles commutent une
variante selon le palier ou la marque.

Elles n'ont pas de sens pour un consommateur, et l'export lit toutes les
collections locales du fichier sans qu'aucun réglage n'en écarte une
(`packages/plugin/src/tokens/exportTokens.ts:941`). Elles entrent donc dans
`tokens.json` et dans la feuille CSS. Deux options : les tenir dans un fichier
Figma distinct qui ne sert pas à l'export, ou les accepter. Un réglage d'export
qui écarte une collection nommée est une évolution possible du plugin, qui
n'existe pas.

## 7. Ce que la pratique publiée établit

| Source | Ce qu'elle établit |
|---|---|
| [Modes for variables, Figma](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables) | Les modes appartiennent à une collection, pas à une variable. Un calque hérite du mode de son conteneur, collection par collection, jusqu'à un conteneur qui en fixe un ou jusqu'au défaut de la collection |
| [Overview of variables, collections, and modes, Figma](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes) | Une collection regroupe des variables liées ; un mode représente un contexte pour ces mêmes variables. Le plafond de modes par collection dépend de l'offre |
| [Extend a variable collection, Figma](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection) | Une collection étendue hérite des modes, des noms et de l'ordre de sa parente, et n'accepte que des surcharges de valeurs. Aucun mode ni aucune variable ne s'y ajoute. La fonction est réservée à l'offre Enterprise |
| [Multi-mode setups, Supernova](https://www.supernova.io/guides/supernova-figma-variables-playbook/1-mastering-figma-variables/multi-mode-setups) | Une collection par dimension, de un à trois modes chacune. Mêler le clair et le sombre avec les marques dans une même collection est nommé comme la façon de perdre le contrôle |
| [Using Figma Variables to build a Multi-Brand Design System, Rangle](https://rangle.io/blog/using-figma-variables-to-build-a-multi-brand-design-system) | Deux montages selon que les marques partagent ou non leurs primitives : une fondation commune avec une couche sémantique par marque, ou une fondation par marque |
| [Color system, Spectrum](https://spectrum.adobe.com/page/color-system/) | Un nom sémantique unique se résout en valeurs différentes selon le thème actif. Le numéro du cran porte le contraste avec le fond, et la rampe s'inverse entre clair et sombre. La couche sémantique n'est pas dupliquée par thème |
| [Design Tokens Resolver Module](https://www.designtokens.org/tr/drafts/resolver/) | Le brouillon de résolution du format standardise des jeux de tokens et des modificateurs, avec un ordre de résolution explicite, pour composer plusieurs thèmes sans dupliquer les jeux |

Le montage de Spectrum est celui de la section 3 : la marque et le mode sont
deux dimensions indépendantes, et le nom sémantique ne les nomme ni l'une ni
l'autre.

Deux points de vigilance ressortent des forums Figma. Les collections étendues
[ne respectent pas toujours la hiérarchie des
modes](https://forum.figma.com/share-your-feedback-26/extended-collections-doesn-t-respect-mode-hierarchy-48123),
et le plafond de modes par collection [dépend de
l'offre](https://forum.figma.com/suggest-a-feature-11/launched-all-plans-should-offer-more-than-4-variable-modes-13979),
avec des valeurs que les sources secondaires citent de façon contradictoire. Six
marques dans une collection demandent donc de lire le plafond dans l'interface
de l'équipe avant de s'y engager.

## 8. Ce qui reste à mesurer

Les nombres de la section 4 viennent du fichier réel du Playground, relevés avec
le script de ce dossier :

```sh
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-duplication.mjs" <tokens.json>
```

Deux chiffres restent à établir, et ils portent sur la cible plutôt que sur
l'état actuel.

Le nombre exact de tokens de `theme`. Cinquante-cinq est la borne haute, le
nombre de cibles distinctes citées aujourd'hui. La consolidation des 21 cibles
brutes de `primitives.colors` dans `theme.feedback.*` le fera baisser. Le nombre
retenu se connaît en écrivant la table de la section 3.3 jusqu'au bout.

La taille de la feuille CSS. Deux axes croisés produisent des blocs `@scope` que
le fichier actuel n'a pas. `ucm tokens css` imprime ses règles, ses déclarations
et ses octets à chaque écriture, donc l'avant et l'après se comparent.

Le même script relancé après la réorganisation donne la mesure du gain : le
relevé n° 3 doit montrer zéro colonne morte sur l'axe des marques, et le relevé
n° 5 doit montrer `components` ne citant plus que `theme` et `layouts`.

## 9. Le chemin

Le fichier de tokens du Playground sort d'un export, donc chaque étape se joue
dans le fichier Figma source, et le Playground la reçoit. L'ordre proposé garde
le fichier utilisable après chaque étape.

| Étape | Geste | Vérification |
|---|---|---|
| 1 | Relever l'état avec le script et garder le relevé | Un point de départ existe |
| 2 | Lire le plafond de modes par collection de l'offre Figma de l'équipe | Six modes tiennent dans une collection |
| 3 | Écrire la table de la section 3.3 jusqu'au bout, en rangeant les 55 cibles dans les cinq familles | Chaque cible actuelle a un nom sémantique |
| 4 | Créer la collection `theme`, deux modes, et la renseigner en clair depuis les cibles actuelles | Le relevé n° 1 montre la collection, aucune valeur sombre encore |
| 5 | Repointer les 306 liaisons de couleur des composants sur `theme` | Le relevé n° 5 montre `components` citant `theme` et `layouts` seulement |
| 6 | Renseigner la colonne sombre de `theme` | Aucun token de `theme` ne se déclare `initial` |
| 7 | Convertir `color-brands` en collection à modes, une colonne par marque, et supprimer `color-brand-tokens` | Le relevé n° 3 ne montre plus de colonne morte |
| 8 | Aligner les trois rôles `secondary` divergents, ou doubler leur emplacement | La rampe joue le même rôle au même cran dans les six marques |
| 9 | Ajouter les marques une à une | Chaque ajout est une colonne, aucun autre fichier ne bouge |
| 10 | Exporter, générer la feuille, comparer les relevés | Le gain est chiffré |

L'étape 5 porte tout le travail manuel : 306 liaisons à refaire dans Figma. Les
étapes 4 et 5 valent la peine d'être menées sur un seul composant d'abord,
`Alert` par exemple, qui concentre les citations brutes vers
`primitives.colors.*`.

## 10. Ce qui peut rater

**Le plafond de modes.** Six marques dans une collection supposent une offre qui
l'autorise. À lire avant l'étape 7, pas après.

**Le repointage de masse.** L'étape 5 casse le rendu de tout composant dont une
liaison est oubliée. Une page de contrôle qui affiche les quatre combinaisons de
marque et de mode sert de témoin, et le relevé n° 5 dit ce qui reste cité en
dehors de `theme`.

**Le sombre qui n'est pas conçu.** Créer la colonne sombre ne décide pas des
valeurs. L'étape 6 est un travail de conception, et l'architecture rend
seulement visible ce qui reste à décider. Un token sombre non renseigné se
déclare `initial` dans la feuille, et la commande le nomme.

**Les collections étendues.** Si la troisième voie de la section 3.4 est
retenue, deux risques se cumulent : l'offre Enterprise, et une lecture du
produit prouvée sur une simulation plutôt que sur un fichier réel. Un essai sur
un vrai fichier étendu est le préalable.

**Le contraste en sombre.** Inverser une rampe ne garantit aucun rapport de
contraste. Les couples de `theme` se vérifient en sombre comme en clair, marque
par marque, ce qui fait douze jeux de couples à contrôler.

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
