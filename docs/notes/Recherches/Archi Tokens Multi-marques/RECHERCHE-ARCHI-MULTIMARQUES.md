# Architecture de tokens multi-marques, en clair et en sombre

La forme retenue est dans
[ARCHITECTURE-FINALE-MULTIMARQUES.md](./ARCHITECTURE-FINALE-MULTIMARQUES.md).
La collection que ce document nomme `scheme` s'y appelle `theme`.

Six marques à terme, deux modes d'affichage. Chaque marque doit s'afficher en
clair et en sombre sur ses propres couleurs, et chaque composant doit suivre.

Le sujet est la collection de tokens du Playground, qui servira de base à une
bibliothèque de composants bien plus grande que le corpus d'essai actuel. La
forme retenue se réplique ensuite dans Figma, puisque `tokens.json` sort d'un
export et ne se retouche pas à la main.

Le document ne décide rien : aucune partie du produit n'en dépend. Il traite
deux sujets séparables, et les sections 5 et 6 les séparent. La section 5 range
les tokens en collections. La section 6 dit comment une rampe de couleur se
construit. La première tient sans la seconde, et l'inverse aussi.

Deux scripts, dans ce dossier, produisent les nombres cités :

```sh
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-duplication.mjs" <tokens.json>
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-rampes.mjs" <tokens.json>
```

## 1. Les critères

Le volume de tokens compte moins que ce que l'architecture rend possible. Six
critères, dans cet ordre.

| Critère | Ce qu'il exige |
|---|---|
| Liberté d'expression | Un composant nouveau doit pouvoir citer n'importe quelle couleur du système sans qu'on ajoute d'abord un nom à un vocabulaire |
| Marque | Ajouter une marque doit être une colonne, sans toucher aux autres couches |
| Mode | Ajouter un mode d'affichage doit être une colonne, sans toucher aux autres couches |
| Exception | Une divergence réelle sur un composant doit rester locale à ce composant |
| Combinaisons | Aucune combinaison marque et mode ne doit s'écrire à la main |
| Vérifiabilité | Un écart doit se relever mécaniquement, pas à l'œil |

Le premier critère écarte toute architecture qui demande de nommer un rôle
avant de pouvoir dessiner. C'est la force de la répartition employée par le
fichier Figma de production, et une proposition qui la perdrait serait un recul.
La section 5.3 ajoute un vocabulaire de rôles sans coûter ce critère : les rôles
restent facultatifs, et les crans restent citables.

## 2. Le Playground aujourd'hui

Relevé par `mesurer-duplication.mjs` : 760 feuilles, huit collections, un seul
axe, `color-brand-tokens`, deux marques, dix feuilles.

Les rampes disponibles :

| Collection | Familles | Crans |
|---|---|---|
| `color-brands.<marque>` | `primary`, `secondary` | 50 à 950, onze crans |
| `color-utilities` | `success`, `warning`, `info`, `danger` | 50 à 900, dix crans |
| `color-utilities.neutral` | | 50 à 1100, plus `white` et `black`, quatorze crans |
| `primitives.colors` | neuf teintes brutes | |

### 2.1 Le mode sombre n'a rien à quoi s'accrocher

`components` porte 306 feuilles de couleur. Voici ce qu'elles citent.

| Cible | Citations | Ce qu'un axe clair et sombre y changerait |
|---|---|---|
| `color-utilities.neutral` | 84 | rien, la collection n'a pas de mode |
| `color-utilities.success`, `warning`, `danger`, `info` | 133 | rien |
| `primitives.colors.*`, valeur brute | 39 | rien |
| `color-brand-tokens.primary`, `secondary` | 50 | la marque seulement |

256 des 306 citations, soit 84 %, ne traversent aucune couche commutable.
`components.alert.colors.info.standard.background` vise
`primitives.colors.sky.50`, un bleu très clair écrit en dur qu'aucun contexte ne
peut remplacer par un fond sombre.

Le constat qui commande la section 5 : le mode sombre ne s'ajoute pas par un axe
posé sur une collection existante, puisqu'il n'existe aucune couche que les
composants traversent tous.

### 2.2 Les 306 citations visent 55 cibles distinctes

| Groupe visé | Cibles distinctes |
|---|---|
| `primitives.colors` | 21 |
| `color-utilities.success` | 9 |
| `color-utilities.info`, `warning` | 5 chacun |
| `color-utilities.danger` | 4 |
| `color-utilities.neutral` | 3 |
| `color-brand-tokens.primary`, `secondary` | 4 chacun |

Ce nombre borne le travail de repointage, quelle que soit la cible retenue.

### 2.3 Un numéro de cran ne désigne pas la même clarté d'une rampe à l'autre

Relevé par `mesurer-rampes.mjs`, qui résout les alias, convertit chaque valeur
en OKLCH et calcule le contraste WCAG de chaque cran contre le cran 50 de sa
propre rampe. Au cran 500 :

| Rampe | Clarté OKLCH | Contraste contre son cran 50 |
|---|---|---|
| `intencial.secondary` | 0,458 | 6,9:1 |
| `intencial.primary` | 0,556 | 4,7:1 |
| `danger` | 0,637 | 3,4:1 |
| `marque-2.secondary` | 0,645 | 3,3:1 |
| `marque-2.primary`, `info` | 0,685 | 2,6:1 |
| `warning` | 0,705 | 2,6:1 |
| `neutral` | 0,715 | 2,5:1 |
| `success` | 0,723 | 2,2:1 |

Le cran 500 couvre 0,265 de clarté OKLCH et un rapport de contraste allant de
2,2:1 à 6,9:1. Un composant qui écrit `primary.500` en couleur de texte tient le
seuil AA de 4,5:1 sur `intencial` et le rate sur `marque-2`.

Deux autres faits du même relevé :

`intencial.secondary` s'écrase au bout sombre. Ses crans 700, 800, 900 et 950
valent 0,223, 0,201, 0,178 et 0,146 de clarté, pour des contrastes de 15,7 à
17,8. Quatre crans occupent l'espace d'un seul.

`intencial.primary` chute de 0,734 à 0,556 entre les crans 400 et 500, là où les
autres rampes avancent d'environ 0,07 par cran.

Ces écarts ne sont pas des fautes de dessin. Ils sont la conséquence de rampes
dessinées à l'œil, teinte par teinte, sans courbe commune. La section 6 dit quoi
en faire.

### 2.4 Les rôles actuels, et leurs deux limites

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

Dix emplacements existent donc déjà, portent l'axe des marques, et absorbent
déjà une divergence entre marques sur `secondary`. Deux limites les empêchent de
répondre au besoin complet.

**Le nom contient la rampe.** Une marque qui veut mener avec son `secondary` ne
peut pas le dire sans qu'un token nommé `primary` serve une couleur secondaire.
Le sélecteur de variables de Figma affiche alors un nom qui contredit la valeur.

**Le nom ne dit pas l'emploi.** Trois liaisons du bouton citent le même token
pour trois emplois différents :

```
components.button.colors.primary.contained.default.background  → color-brand-tokens.primary.default
components.button.colors.primary.outlined.default.foreground   → color-brand-tokens.primary.default
components.button.colors.primary.outlined.default.border       → color-brand-tokens.primary.default
```

Un fond plein, un texte et une bordure n'exigent pas le même contraste : 4,5:1
pour le texte, 3:1 pour la bordure. `default` n'exprime aucune de ces exigences,
donc rien ne les vérifie. Le relevé de la section 2.3 montre que l'écart entre
marques suffit déjà à faire basculer le texte sous le seuil.

## 3. Ce que le fichier de production montre

Ce fichier rend le service attendu, sur cinq marques et deux modes, pour
n'importe quel composant. Sa répartition est la suivante :

| Collection | Axe | Contenu |
|---|---|---|
| `colour-tokens` | aucun | Les rampes, une par marque, en niveaux de dossier |
| `theme` | cinq marques | `theme.light.*` et `theme.dark.*`, sémantique et composants, en deux dossiers |
| `mode` | clair et sombre | Un aiguillage qui choisit entre les deux dossiers |

### 3.1 Il porte déjà une couche sémantique

`theme.light.primary.main`, `theme.light.text.primary`,
`theme.light.background.paper` et `theme.light.neutral.*` forment le vocabulaire
de palette de Material UI, et les tokens de composants le citent largement.

Ce vocabulaire n'est donc pas ce qui distingue les deux architectures. La
section 5.3 en retient le principe, sous une forme que la section 5.6 borne.

### 3.2 Ce qui lui manque est une couche de commutation placée assez tôt

Le clair et le sombre sont un niveau de dossier dans la collection des marques,
donc la surface entière est écrite deux fois, chaque fois avec ses cinq colonnes
de marque. La collection `mode` ne fait que choisir entre les deux :

```json
"mode.primary.main": {
  "com.ucm.axis": "mode",
  "com.ucm.modes": {
    "light": "{theme.light.primary.main}",
    "dark":  "{theme.dark.primary.main}"
  }
}
```

Cette collection `mode` est bien une couche de commutation, et elle est bien
placée. Ce qui coûte est qu'elle arrive après la duplication au lieu d'arriver
avant. Placée entre les rampes et tout le reste, la même mécanique supprimerait
les deux dossiers.

### 3.3 Le prix payé se lit dans le fichier

Trois écritures du même fait divergent : `mode.components.icon.error.foreground`
sert la valeur sombre dans ses deux colonnes, `mode.components.filters.stroke`
impose en sombre un bleu Gresham à toutes les marques, `theme.dark.primary.main`
vaut `null` pour Gresham, et deux tokens de `theme` citent la collection `mode`
qui les cite.

Le deuxième cas renseigne la section 5.3. Un token de composant y porte un fait
de marque, faute d'un endroit où ce fait pouvait s'écrire une fois.

## 4. L'invariant que tous les systèmes respectent

| Système | Comment le mode est porté |
|---|---|
| [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | Une échelle claire et une échelle sombre, mêmes numéros de cran, mêmes emplois |
| [Material 3](https://m3.material.io/styles/color/system/how-the-system-works) | Des rôles identiques dans les deux schémas, alimentés par des tons différents de la même palette tonale |
| [Primer](https://primer.style/product/primitives/token-names/) | Quatre thèmes livrés depuis un seul jeu de composants, chaque thème étant une autre affectation de valeurs aux mêmes noms |
| [Carbon](https://carbondesignsystem.com/elements/themes/overview/) | Des variables universelles définies par leur rôle, que chaque thème renseigne, sans toucher aux composants |
| [Atlassian](https://atlassian.design/foundations/tokens/design-tokens) | Un thème est un jeu de valeurs ; clair, sombre et contraste renforcé emploient le même jeu de tokens |
| [Spectrum](https://spectrum.adobe.com/page/color-system/) | Un nom unique se résout en valeurs différentes selon le thème, la rampe s'inversant entre clair et sombre |

L'invariant est le même partout : **les noms ne changent pas d'un thème à
l'autre, seules les valeurs changent**. Aucun de ces systèmes n'écrit deux jeux
de noms, un clair et un sombre.

Il ne dit rien du vocabulaire employé. Il dit seulement où le mode se décide :
en un point, sur un jeu de noms unique, en amont de tout ce qui consomme.

## 5. La cible : les collections

### 5.1 Cinq couches, deux axes

```
primitives         aucun mode     les teintes brutes
      ↓
color-brands       6 modes        les rampes de marque, et les rôles de marque
color-utilities    aucun mode     success, warning, info, danger, neutral
      ↓
scheme             2 modes        le miroir des deux couches du dessus
      ↓
components         aucun mode     les tokens de composant
```

Les deux axes portent sur deux collections distinctes. Figma résout chaque
collection indépendamment, donc une maquette pose une marque et un mode sans que
l'un connaisse l'autre.

`scheme` n'invente aucun rangement. Sa liste de variables se déduit des couches
du dessous : un nom en dessous donne un nom dans `scheme`. Ajouter une rampe
ajoute ses crans, sans décision et sans hypothèse sur ce qu'un composant en fera.

Un composant reste donc aussi libre que dans le fichier de production. Il cite
`scheme.primary.300` ou `scheme.neutral.900` selon ce que la maquette demande.
La seule règle est de citer `scheme` plutôt que les couches du dessous, et cette
règle se vérifie mécaniquement : le relevé n° 5 de `mesurer-duplication.mjs` la
contrôle à chaque export.

### 5.2 Les collections

| Collection | Modes | Contenu | Cite |
|---|---|---|---|
| `primitives` | aucun | Les teintes brutes, les dimensions, les primitives typographiques | rien |
| `color-brands` | 6, une par marque | `primary.50` à `950`, `secondary.*`, leurs variantes `-dark`, et les deux jeux de rôles des sections 5.3 et 5.4 | `primitives`, `color-utilities` |
| `color-utilities` | aucun | `success`, `warning`, `info`, `danger`, `neutral`, et les variantes `-dark` nécessaires | `primitives` |
| `scheme` | 2 : `light`, `dark` | Le miroir des deux collections ci-dessus, en deux colonnes | `color-brands`, `color-utilities` |
| `components` | aucun | Les tokens de composants, repointés sur `scheme` | `scheme`, `layouts` |
| `layouts`, `typography` | aucun | Inchangées | `primitives` |

`color-brand-tokens` se dissout : ses dix emplacements descendent dans
`color-brands`, qui porte déjà l'axe des marques, sous les noms de la section 5.3.

`color-brands` cite `color-utilities` pour un seul usage, décrit en 5.5 : une
marque qui câble un rôle vers une couleur neutre plutôt que vers une de ses
rampes.

### 5.3 Les dix rôles de marque

Un composant a deux façons de citer une couleur, et le choix entre les deux
tient en une question.

**La valeur est la même sur toutes les marques.** Citer un cran :
`scheme.primary.500`, `scheme.neutral.900`. C'est le cas courant, et il ne
demande aucun vocabulaire.

**La valeur dépend de la marque.** Citer un rôle :
`scheme.role.primary.solid`. Chaque marque câble ce nom vers le cran de la rampe
de son choix, dans sa colonne de `color-brands`.

Le préfixe `role` sépare les deux espaces de noms. Sans lui,
`scheme.primary.500` et `scheme.primary.default` se retrouvent côte à côte dans
le sélecteur Figma, un cran et un rôle, sans rien qui les distingue. Avec lui,
`role.primary` désigne un emploi et pas une rampe, donc une marque peut le câbler
vers son `secondary` sans que le nom contredise la valeur.

Deux parts, cinq emplois chacune. `role.primary` est la part qui porte l'action
principale de la marque, `role.secondary` celle qui l'accompagne.

| Nom | À quoi il sert | Ce qu'il promet |
|---|---|---|
| `solid` | Fond plein : bouton principal, puce, badge plein | `on-solid` s'y lit à 4,5:1 |
| `on-solid` | Le texte et l'icône posés sur ce fond | voir ci-dessus |
| `text` | Texte ou icône de marque sur le fond de page | 4,5:1 contre le fond de page |
| `border` | Bordure, anneau de focus | 3:1 contre le fond de page |
| `surface` | Fond teinté discret : ligne sélectionnée, encart, badge clair | `text` s'y lit à 4,5:1 |

Dix noms au total, le compte qu'occupaient les dix emplacements de
`color-brand-tokens`. Le bouton de la section 2.4 devient :

```
button.colors.primary.contained.default.background → scheme.role.primary.solid
button.colors.primary.contained.default.foreground → scheme.role.primary.on-solid
button.colors.primary.outlined.default.foreground  → scheme.role.primary.text
button.colors.primary.outlined.default.border      → scheme.role.primary.border
```

Quatre noms là où il y en avait un, et chacun porte une promesse que la section
6.8 vérifie par script, marque par marque et mode par mode.

`on-solid` est un rôle de marque comme les autres, donc il vaut une couleur
claire chez une marque et une couleur sombre chez une autre. C'est ce qui rend
utilisable une marque dont la couleur est trop claire pour porter du texte blanc.

Le fond de page auquel `text` et `border` se comparent est `scheme.neutral.50`,
résolu dans le mode contrôlé.

Les noms `lead` et `action` ont été écartés : ils obligent l'équipe à apprendre
un vocabulaire, là où `role.primary` reprend le mot qu'elle emploie déjà.
`primary` reste par ailleurs le nom d'une rampe, sous `scheme.primary.*`, et les
deux ne se confondent pas grâce au préfixe.

Ajouter un rôle plus tard coûte un nom dans `color-brands`, un nom dans
`scheme`, et le repointage des seuls composants qui le veulent. La liste de
départ n'a donc pas besoin d'être complète. Un état survolé, par exemple, ne
mérite un rôle que si le relevé de l'étape 1 montre que les marques y divergent.

### 5.4 Le sombre est une rampe, jamais une colonne

Aucune collection sous `scheme` ne porte d'axe clair et sombre. Une variante
sombre s'écrit comme une rampe de plus, suffixée `-dark`, à côté de la rampe
claire. Le suffixe nomme la destination ; la façon dont cette rampe est
construite est le sujet de la section 6.5.

`scheme` choisit d'où vient le sombre, et cette règle est mécanique.

**Pour un cran, le sombre est le cran miroir de la rampe `-dark`.** Le miroir
apparie le premier cran au dernier :

| Rampe à onze crans | 50 | 100 | 200 | 300 | 400 | 500 |
|---|---|---|---|---|---|---|
| Son miroir | 950 | 900 | 800 | 700 | 600 | 500 |

```
scheme.primary.50     light → color-brands.primary.50
                      dark  → color-brands.primary-dark.950

scheme.primary.500    light → color-brands.primary.500
                      dark  → color-brands.primary-dark.500
```

Ce que le miroir produit est correct par construction, si la rampe `-dark`
partage la courbe de clarté de la rampe claire, ce que la section 6.5 impose.
`primary.50` est un fond teinté très clair, et `primary-dark.950` est un fond
teinté très sombre. `primary.900` est un texte sombre, et `primary-dark.100` est
un texte clair.

**Quand aucune rampe `-dark` n'existe, le sombre est le cran miroir de la rampe
claire.** C'est le cas des neutres, ce qui fait de `scheme.neutral.50` le fond le
plus clair en clair et le plus sombre en sombre. La rampe neutre compte douze
crans numérotés, donc son miroir apparie 50 à 1100 et 500 à 600.

**Pour un rôle, le sombre est le rôle de même nom dans le jeu `role-dark`.** Un
rôle n'est pas ordonné par clarté, donc aucun miroir ne s'y applique. Chaque
marque câble deux fois ses dix rôles, une fois pour le clair et une fois pour le
sombre, dans sa colonne de `color-brands` :

```
scheme.role.primary.solid   light → color-brands.role.primary.solid
                            dark  → color-brands.role-dark.primary.solid
```

C'est la seule décision de conception que le passage au sombre demande, et elle
coûte dix lignes par marque.

Une différence de coût sépare les deux collections du dessous, parce que
`color-brands` porte l'axe des marques et `color-utilities` non. Une rampe
`primary-dark` coûte onze crans sur six colonnes ; une rampe `success-dark`
coûte dix valeurs une seule fois, pour toutes les marques. Le jour où une marque
veut son propre vert de succès, `success` doit descendre dans `color-brands`.

Une rampe `-dark` est une source, jamais un nom que `components` cite. Elle
n'apparaît donc pas dans `scheme`, et l'ajouter n'ajoute aucun nom en aval.

### 5.5 Les divergences par marque, par ordre de préférence

Une bibliothèque de plusieurs centaines de composants produira des divergences
que les rampes n'expriment pas : une marque qui mène avec son `secondary` là où
les autres mènent avec leur `primary`, une marque qui préfère les neutres de
l'interface, une marque dont le logo change de nom. Quatre façons de les loger,
de la moins chère à la plus chère.

**Un rôle de marque dans `color-brands`.** Quand la divergence est chromatique
et vaut pour toute la marque. Une ligne, six colonnes, et aucun composant ne
bouge quand une septième marque diverge.

```
role.primary.solid    intencial  → primary.600
                      marque-2   → secondary.700
                      marque-3   → color-utilities.neutral.900
```

Les trois cas cités plus haut s'écrivent ainsi, y compris la marque qui veut le
style neutre : c'est la même ligne qui pointe ailleurs.

**Une valeur transparente.** Une bordure que seules certaines marques portent
s'écrit `role.primary.border` valant `transparent` chez les autres. Une
divergence de structure devient alors une divergence de couleur, que la voie
précédente traite.

**Une collection d'exceptions.** Une collection à six modes, placée entre
`scheme` et `components`, ne portant que les tokens divergents. Elle répond au
fait propre à un composant et à une marque, qu'aucun rôle ne généralise. Son
coût est un second espace de noms, que seuls les composants concernés citent.

**Une variante de composant.** Quand le dessin diffère et pas seulement la
couleur, la bibliothèque porte la divergence, pas les tokens.

Les collections étendues de Figma sont écartées : la fonction est réservée à
l'offre Enterprise, que l'équipe n'a pas et ne prévoit pas.

### 5.6 Ce que la cible ne prescrit pas

Aucun vocabulaire d'intentions de composant. Les dix rôles disent ce qu'une
couleur de marque garantit, pas ce qu'un composant est. `role.primary.solid` ne
suppose l'existence d'aucun bouton. Si l'équipe veut en plus des noms comme
`surface.card` ou `feedback.error.background`, elle les ajoute au-dessus de
`scheme`, sans mode, et les composants choisissent de les citer ou non.

Aucune limite au nombre de modes d'affichage. Un contraste renforcé devient une
troisième colonne dans `scheme`, alimentée par un troisième jeu de rôles et par
les rampes existantes, et rien d'autre dans le fichier ne le sait.

## 6. La cible : les rampes

### 6.1 Ce que le relevé impose

La section 2.3 mesure trois défauts dans les rampes actuelles : un cran ne
désigne pas la même clarté d'une rampe à l'autre, une rampe s'écrase au bout
sombre, une autre avance par à-coups. Ces défauts ont une cause commune, chaque
rampe ayant été dessinée pour elle-même.

Deux conséquences pratiques. Un composant qui cite un cran directement ne sait
pas ce qu'il obtient sur une autre marque. Et un designer qui ajoute une marque
n'a aucune règle à suivre, donc il reproduit l'écart.

La section 5.3 répond à la première par les rôles. La section 6 répond à la
seconde par une courbe partagée.

### 6.2 Les trois courbes

Une rampe se décrit par trois fonctions du numéro de cran, dans un espace
perceptuel. Le dépôt emploie OKLCH, où `L` est la clarté perçue, `C` la
saturation et `H` la teinte.

| Courbe | Ce qu'elle fait | Qui la fixe |
|---|---|---|
| Clarté `L` | Donne son niveau à chaque cran | Le système, une fois, pour toutes les rampes |
| Saturation `C` | Monte au milieu de la rampe et retombe aux deux bouts | Le système, avec un plafond par teinte |
| Teinte `H` | Reste constante, ou dérive légèrement | La marque donne la valeur de départ |

La forme de ces courbes est celle que décrivent [Matt
Ström-Awn](https://mattstromawn.com/writing/generating-color-palettes/) et
[Canonical](https://canonical.com/blog/generating-color-palettes-for-design-systems-inspired-by-apca).
La saturation suit une parabole qui culmine au milieu de l'échelle, parce
qu'aux deux bouts une saturation élevée sort du gamut sRGB. La teinte se décale
d'environ cinq degrés vers le bout clair, ce qui compense l'effet
Bezold-Brücke, par lequel une couleur paraît tirer vers le violet dans les
ombres et vers le jaune dans les hautes lumières.

Le relevé montre une dérive de teinte bien plus grande sur une rampe :
`warning` passe de 74° au cran 50 à 38° au cran 900, soit 36°. Une telle dérive
est un choix de conception, le jaune pur n'existant pas en version sombre, et
elle reste admise. Ce qui la rend admissible est qu'elle soit voulue et écrite,
plutôt que constatée après coup.

### 6.3 La courbe de clarté, partagée par toutes les rampes

La courbe de clarté est ce qui rend un numéro de cran comparable entre rampes.
Elle s'écrit une fois, pour le système entier, et aucune marque ne la modifie.

Valeurs de départ. Elles forment une progression régulière posée au voisinage
des rampes actuelles, pour que le redressement de l'étape 8 reste faible. Elles
ne sont pas la médiane exacte des rampes existantes, et l'écart cran par cran
reste à chiffrer :

| Cran | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Clarté `L` | 0,975 | 0,950 | 0,905 | 0,845 | 0,760 | 0,670 | 0,585 | 0,500 | 0,420 | 0,340 | 0,270 |

Deux crans servent d'ancres, et la recette de la section 6.7 s'en sert :

- le cran 500 rend environ 3:1 contre un fond blanc, donc le premier candidat
  pour `border` ;
- le cran 600 rend environ 4,2:1 et le cran 700 environ 6:1, donc le cran 700
  est le premier candidat pour `text` et pour `solid`.

Ces trois rapports sont calculés sur une couleur sans saturation. Une teinte
saturée s'en écarte.

Une limite à énoncer, parce qu'elle est la raison d'être du contrôle de la
section 6.8. Une courbe de clarté partagée ne donne pas un contraste partagé.
La clarté OKLCH et la luminance relative que WCAG mesure ne coïncident pas, donc
deux teintes à la même clarté n'ont pas exactement le même contraste contre le
blanc. Le relevé chiffre l'écart : `success` au cran 500 rend 2,2:1 et `neutral`
au même niveau de clarté rend 2,5:1. La courbe rapproche les contrastes, elle ne
les égalise pas. Les promesses des rôles se vérifient donc sur les valeurs, pas
sur les numéros.

### 6.4 La couleur de marque ne se force pas au cran 500

C'est la règle qui répond au décalage observé quand une couleur de marque est
très claire ou très sombre.

La couleur de marque garde sa clarté, et elle se range au cran dont la clarté
est la plus proche. La courbe ne bouge pas. Une marque dont le bleu vaut
`L = 0,50` occupe le cran 700 ; une marque dont le corail vaut `L = 0,67` occupe
le cran 500. Dans les deux cas, le cran 50 reste très clair et le cran 950 reste
très sombre, donc la structure que la section 2.3 voit se déliter est préservée.

Ce que ce choix coûte : la couleur de marque n'est plus au même endroit d'une
marque à l'autre. Ce coût est exactement ce que les rôles de la section 5.3
absorbent, puisque `role.primary.solid` pointe vers le cran 700 chez l'une et
vers le cran 500 chez l'autre, et qu'aucun composant ne le sait.

Le cas extrême se traite sans exception. Une marque dont la couleur est trop
claire pour porter du texte blanc câble `role.primary.on-solid` vers une couleur
sombre. Une marque dont la couleur est trop claire pour servir de texte sur fond
blanc câble `role.primary.text` vers un cran plus sombre de sa propre rampe, et
perd la teinte exacte de la marque sur ce seul emploi. Le contrôle de la section
6.8 dit laquelle des deux situations se présente.

### 6.5 La variante sombre d'une rampe

Une rampe `-dark` porte la même teinte et la même courbe de clarté que sa rampe
claire, et une saturation plus élevée. La clarté partagée est ce qui rend le
miroir de la section 5.4 correct, puisque le cran 950 de la rampe sombre doit
être aussi sombre que le cran 50 de la rampe claire est clair.

La saturation monte parce qu'une couleur posée sur un fond sombre paraît moins
saturée qu'elle ne l'est. Radix publie pour cette raison une échelle sombre
distincte plutôt que de réutiliser l'échelle claire.

La règle de construction tient en trois clauses, toutes vérifiables :

- la clarté de chaque cran est celle de la courbe partagée ;
- la saturation de chaque cran vaut celle de la rampe claire multipliée par un
  facteur supérieur à un, dans la limite du gamut sRGB ;
- la teinte s'écarte de la rampe claire d'au plus dix degrés.

Une rampe `-dark` n'est donc pas une palette à dessiner. C'est la rampe claire
avec un facteur de saturation, et ce facteur est le seul réglage que le designer
pose.

La troisième clause borne ce que le document appelait auparavant une variante
« de teinte légèrement décalée ». Au-delà de dix degrés, la rampe sombre n'est
plus reconnaissable comme la même couleur de marque, et le miroir cesse de
produire le résultat attendu.

### 6.6 Les rampes utilitaires

Elles suivent les trois courbes de la section 6.2, avec leur propre teinte de
départ. La courbe de clarté étant partagée, `success.500` et `primary.500` ont
le même niveau, ce qui fait tenir ensemble un composant qui cite les deux.

Les teintes de départ relevées dans le fichier actuel : `success` 156°,
`warning` 74°, `info` 237°, `danger` 17°. Elles sont conformes aux valeurs
d'usage, et rien n'appelle à les changer.

Un fait du relevé mérite une décision. `marque-2.primary` et `info` ont des
valeurs identiques sur leurs dix crans communs, teinte 237° comprise. Sur cette
marque, une couleur de marque et une couleur d'information sont indiscernables.
Cela n'a pas de conséquence tant que `marque-2` sert de marque d'essai, et cela
en aurait une sur une marque réelle.

### 6.7 La recette du designer

Six gestes pour une marque nouvelle. Les trois premiers sont mécaniques.

1. Relever la teinte OKLCH `H` de la couleur de marque, et sa clarté `L`.
2. Générer les onze crans : la courbe de clarté de la section 6.3, la parabole
   de saturation plafonnée au gamut, la teinte relevée.
3. Générer la rampe `-dark` en appliquant le facteur de saturation de la
   section 6.5.
4. Lire à quel cran la couleur de marque est tombée, ce qui donne le premier
   candidat pour `role.primary.solid`.
5. Câbler les dix rôles clairs et les dix rôles sombres, en partant des ancres
   de la section 6.3 : `border` au cran 500, `text` et `solid` au cran 700,
   `surface` au cran 50 ou 100.
6. Lancer le contrôle de la section 6.8, et déplacer les câblages qu'il refuse.

Une retouche manuelle d'un cran reste permise, à la condition que le contrôle
passe encore. La courbe n'interdit pas l'ajustement à l'œil, elle lui donne un
point de départ et un verdict.

### 6.8 Le contrôle

Un script lit `tokens.json` et vérifie, pour chaque marque et chaque mode, les
promesses déclarées en 5.3 :

- `role.primary.text` contre `scheme.neutral.50`, au moins 4,5:1 ;
- `role.primary.text` contre `role.primary.surface`, au moins 4,5:1 ;
- `role.primary.on-solid` contre `role.primary.solid`, au moins 4,5:1 ;
- `role.primary.border` contre `scheme.neutral.50`, au moins 3:1 ;
- les quatre mêmes sur `role.secondary`.

Huit vérifications par marque et par mode, soit quatre-vingt-seize pour six
marques et deux modes.

Un second contrôle porte sur les rampes, et reprend les clauses de la section
6.5 : la rampe `-dark` partage la courbe de clarté, sa saturation est
supérieure, sa teinte s'écarte de moins de dix degrés.

`mesurer-rampes.mjs`, dans ce dossier, produit déjà les valeurs OKLCH et les
contrastes dont ces deux contrôles ont besoin.

## 7. Pourquoi cette forme plutôt que trois autres

| | Fichier de production | Produit cartésien | Couche de rôles obligatoire | Miroir de commutation |
|---|---|---|---|---|
| Forme | Mode en dossier, marque en mode | Une collection, douze modes `marque-mode` | Un vocabulaire d'intentions de composant, à deux modes | Rampes à six modes, miroir à deux modes |
| Liberté d'expression | entière | entière | bornée par le vocabulaire | entière, les rôles s'ajoutant aux crans |
| Ajouter une marque | une colonne dans deux dossiers, sur toute la surface | deux colonnes | une colonne | une colonne |
| Ajouter un mode | un troisième dossier à dupliquer | six colonnes | une colonne | une colonne, plus un jeu de rôles |
| Exception par composant | native, chaque token a ses colonnes | native | par vocabulaire | par rôle, puis par collection d'exceptions |
| Combinaisons écrites à la main | oui | oui, douze colonnes | non | non |
| Plafond de modes Figma | cinq | douze | six et deux | six et deux |
| Marque et mode indépendants sur un sous-arbre | oui | non, un seul attribut | oui | oui |

Le produit cartésien mérite un mot, parce qu'il est la solution la plus simple à
écrire. Une seule collection, douze modes nommés `intencial-light`,
`intencial-dark` et ainsi de suite, et les composants citent les rampes
directement. Il échoue sur deux points : le nombre de colonnes croît en
multipliant à chaque mode ajouté, et un seul attribut porte les deux dimensions,
donc un encart sombre dans une page claire force à répéter la marque.

La couche de rôles obligatoire est celle que la section 5.6 écarte. Les dix
rôles de la section 5.3 en diffèrent sur deux points. Ils sont facultatifs, et
ils décrivent ce qu'une couleur de marque garantit plutôt que ce qu'un composant
fait.

## 8. Le volume

Sur les nombres relevés dans le Playground, pour six marques et deux modes.

| Poste | Noms | Colonnes | Valeurs écrites |
|---|---|---|---|
| `color-brands` : 4 rampes de 11 crans, 10 rôles clairs, 10 rôles sombres | 64 | 6 | 384 |
| `color-utilities` : 5 rampes, 54 crans, plus 4 rampes `-dark`, 40 crans | 94 | 1 | 94 |
| `scheme` : 11 `primary`, 11 `secondary`, 10 rôles, 54 utilitaires | 86 | 2 | 172 |
| `components` | 369 | 1 | 369 |
| Total | | | 1 019 |

Écrire chaque couleur de composant dans chaque combinaison, comme le fait le
fichier de production, demanderait 6 × 2 × 306 = 3 672 valeurs pour la seule
couche composant.

La propriété qui compte davantage que le total : ajouter une rampe `-dark`
n'ajoute aucun nom dans `scheme` ni dans `components`. Elle ajoute une rampe
dans `color-brands` et change la source d'une colonne. Une architecture où un
raffinement du sombre se paie sur toute la surface ne tiendrait pas une
bibliothèque de plusieurs centaines de composants.

## 9. Côté code

Deux axes, donc deux attributs, nommés dans la configuration du dépôt :

```json
{
  "modes": {
    "color-brands": "data-brand",
    "scheme": "data-theme"
  }
}
```

La clé d'un axe est le préfixe que sa collection donne aux chemins. Les deux
attributs se posent sur n'importe quel élément et valent pour son sous-arbre :

```html
<html data-brand="intencial" data-theme="light">
  <aside data-theme="dark">…</aside>
</html>
```

`ucm tokens css` déclare la base sur `:root`, une règle par mode de chaque axe,
puis un croisement `@scope` pour le couple d'axes, ce qui départage la proximité
de deux attributs imbriqués. Le montage est vérifié sur trois axes imbriqués
dans Chromium, Firefox et WebKit par `packages/cli/tests/cascade/`.

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
ancêtre commute donc sa marque et son mode, ce qui rend une galerie affichant
les douze combinaisons côte à côte écrivable sans code particulier.

Deux comportements de la commande valent d'être connus. Un token sans valeur
dans un contexte se déclare `initial`, et la commande le nomme, donc un trou de
couverture en sombre se voit à l'écriture de la feuille. Et la commande imprime
le nombre de règles, de déclarations et d'octets, donc le coût de la feuille se
relève plutôt qu'il ne s'estime.

## 10. Le plan

Le fichier de tokens sort d'un export, donc chaque étape se joue dans le fichier
Figma source et le Playground la reçoit. L'ordre garde le fichier utilisable
après chaque étape, et le sombre n'arrive qu'en huitième position.

| Étape | Geste | Vérification |
|---|---|---|
| 1 | Relever quel cran chaque composant cite, marque par marque | La liste des citations qui divergent entre les deux marques est écrite |
| 2 | Arrêter la liste des rôles à partir de ce relevé, en partant des dix de la section 5.3 | Chaque rôle a un nom d'emploi et une promesse de contraste |
| 3 | Figer la courbe de clarté de la section 6.3 | L'écart aux rampes actuelles est chiffré, cran par cran |
| 4 | Créer `scheme`, deux modes, en miroir des rampes actuelles, les deux colonnes visant la même source | La feuille CSS est inchangée à l'octet près, sauf les noms ajoutés |
| 5 | Repointer les 306 liaisons de couleur des composants, vers un cran ou vers un rôle selon l'étape 2 | Le relevé n° 5 montre `components` citant `scheme` et `layouts` seulement |
| 6 | Convertir `color-brands` en collection à six modes, y descendre les rôles, câbler les deux marques existantes | Le rendu des deux marques est inchangé |
| 7 | Écrire les deux contrôles de la section 6.8 et les lancer | Chaque rôle tient sa promesse, ou son câblage change de cran |
| 8 | Redresser les rampes sur la courbe, ajouter les rampes `-dark` et le jeu `role-dark`, brancher la colonne `dark` de `scheme` | Le rendu sombre apparaît sans qu'aucun composant ne bouge |
| 9 | Ajouter les marques une à une par la recette de la section 6.7 | Le contrôle de l'étape 7 passe sur la marque ajoutée |
| 10 | Exporter, générer la feuille, comparer les relevés et la taille de feuille | Le gain est chiffré |

Quatre étapes demandent une attention particulière.

L'étape 3 se mesure avant de se décider. Redresser les rampes sur une courbe
commune change des valeurs que la maquette montre aujourd'hui, donc l'écart se
chiffre d'abord et l'équipe le regarde. Si l'écart est jugé trop grand, la
courbe se rapproche des rampes existantes plutôt que l'inverse.

L'étape 4 ne change rien au rendu, ce qui la rend sûre. Les deux colonnes de
`scheme` visent d'abord la même source, donc la feuille générée ne diffère que
par les noms ajoutés.

L'étape 5 porte tout le travail manuel, 306 liaisons à refaire dans Figma, et
elle casse le rendu de tout composant dont une liaison est oubliée. Elle vaut
d'être menée sur `Alert` d'abord, qui concentre les citations brutes vers
`primitives.colors.*`. Le relevé de l'étape 1 dit, liaison par liaison, s'il
faut viser un cran ou un rôle, ce qui évite un second repointage.

L'étape 8 est le seul endroit où le sombre existe, et elle réunit le redressement
des rampes et la construction des variantes `-dark`, parce que la seconde
suppose la première.

## 11. Ce qui peut rater

**Le repointage de masse.** L'étape 5 casse le rendu de tout composant dont une
liaison est oubliée. Une page de contrôle qui affiche les combinaisons de marque
et de mode sert de témoin, et le relevé n° 5 dit ce qui reste cité hors de
`scheme`.

**Le redressement des rampes.** L'étape 8 change des couleurs que les maquettes
existantes montrent. L'écart se chiffre à l'étape 3, et il se peut qu'il soit
refusé sur une rampe. Une rampe laissée hors de la courbe reste utilisable, à la
condition que les rôles qui la citent passent le contrôle.

**Les crans cités directement là où la marque diverge.** Un composant qui cite
`scheme.primary.500` alors que la valeur attendue dépend de la marque se dégrade
sur les marques suivantes, et le défaut n'apparaît qu'à l'ajout de la marque
concernée. Le relevé de l'étape 1 est la parade, et il ne porte aujourd'hui que
sur deux marques.

**La liste de rôles trop courte.** Un besoin découvert à la quatrième marque
ajoute un rôle et repointe les composants qui le veulent. Le coût est borné,
mais il retombe sur un fichier déjà repointé une fois.

**Le double câblage des rôles.** Chaque marque câble ses dix rôles deux fois,
une fois clair et une fois sombre. Un oubli sur la colonne sombre passe
inaperçu tant que personne n'affiche cette marque en sombre. Le contrôle de la
section 6.8 porte sur les deux modes pour cette raison, et `ucm tokens css`
nomme les tokens sans valeur.

**Le plafond de modes.** Il [dépend de
l'offre](https://help.figma.com/hc/en-us/articles/360040328273) : dix modes par
collection sur Professional, vingt sur Organization. Six marques tiennent donc
sans l'offre Enterprise, qui n'apporte sur ce point que les collections
étendues, écartées en 5.5. Le chiffre se lit dans l'interface de l'équipe avant
l'étape 6.

## 12. Ce qui reste à mesurer

Les nombres des sections 2 et 6 viennent du fichier réel. Quatre restent à
établir.

Les crans cités directement par les composants, marque par marque. Ce relevé
produit la liste des liaisons qui doivent viser un rôle plutôt qu'un cran, et
c'est lui qui arrête la liste de rôles de l'étape 2.

L'écart entre les rampes actuelles et la courbe de clarté de la section 6.3,
cran par cran. C'est ce qui décide si le redressement est acceptable, et sur
quelles rampes.

Le facteur de saturation des rampes `-dark`. Il se pose à l'œil sur une rampe,
puis se vérifie sur le gamut pour les autres.

La taille de la feuille CSS. Deux axes croisés produisent des blocs `@scope` que
le fichier actuel n'a pas, et `ucm tokens css` imprime ses règles, ses
déclarations et ses octets à chaque écriture.

## Sources

- [Understanding the scale, Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Composing a palette, Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)
- [Create a custom palette, Radix Colors](https://www.radix-ui.com/colors/custom)
- [How to generate color palettes for design systems, Matt Ström-Awn](https://mattstromawn.com/writing/generating-color-palettes/)
- [Generating accessible color palettes inspired by APCA, Canonical](https://canonical.com/blog/generating-color-palettes-for-design-systems-inspired-by-apca)
- [Leonardo, générateur de couleurs par rapport de contraste, Adobe](https://github.com/adobe/leonardo)
- [How the system works, Material Design 3](https://m3.material.io/styles/color/system/how-the-system-works)
- [Token names, Primer](https://primer.style/product/primitives/token-names/)
- [Themes, Carbon Design System](https://carbondesignsystem.com/elements/themes/overview/)
- [Design tokens, Atlassian Design System](https://atlassian.design/foundations/tokens/design-tokens)
- [Color system, Spectrum](https://spectrum.adobe.com/page/color-system/)
- [Plans and pricing, Figma Learn](https://help.figma.com/hc/en-us/articles/360040328273)
- [Modes for variables, Figma Learn](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Overview of variables, collections, and modes, Figma Learn](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Extend a variable collection, Figma Learn](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection)
- [Multi-mode setups, Supernova](https://www.supernova.io/guides/supernova-figma-variables-playbook/1-mastering-figma-variables/multi-mode-setups)
- [Using Figma Variables to build a Multi-Brand Design System, Rangle](https://rangle.io/blog/using-figma-variables-to-build-a-multi-brand-design-system)
- [Design Tokens Resolver Module](https://www.designtokens.org/tr/drafts/resolver/)
