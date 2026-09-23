# Architecture de tokens multi-marques, en clair et en sombre

Six marques à terme, deux modes d'affichage. Chaque marque doit s'afficher en
clair et en sombre sur ses propres couleurs, et chaque composant doit suivre.

Le sujet est la collection de tokens du Playground, qui servira de base à une
bibliothèque de composants bien plus grande que le corpus d'essai actuel. La
forme retenue se réplique ensuite dans Figma, puisque `tokens.json` sort d'un
export et ne se retouche pas à la main.

Le document ne décide rien : aucune partie du produit n'en dépend.

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

## 2. Le Playground aujourd'hui

Relevé par `mesurer-duplication.mjs`, dans ce dossier : 760 feuilles, huit
collections, un seul axe, `color-brand-tokens`, deux marques, dix feuilles.

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

Le constat qui commande le reste : le mode sombre ne s'ajoute pas par un axe
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

### 2.3 Les rôles de `color-brand-tokens` par marque

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

La rampe `primary` tombe sur le même cran dans les deux marques. La rampe
`secondary` diverge sur trois rôles. La section 3.1 dit ce que cette divergence
signifie, et ce qu'elle ne signifie pas.

## 3. Trois objections, et ce que l'état de l'art en dit

### 3.1 Des rampes ajustées à la main peuvent quand même être alignées

L'objection : les palettes de marque diffèrent, une `secondary` naturellement
très foncée impose d'ajuster toute sa rampe, donc deux marques ne peuvent pas
avoir des rampes strictement identiques. Exact, et aucune architecture ne doit
l'exiger.

L'ajustement manuel et l'alignement ne s'opposent pourtant pas. Ils se
rejoignent dès que le numéro d'un cran cesse de décrire une clarté pour décrire
un emploi. [Radix
Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
attribue un emploi à chaque cran d'une échelle de douze, indépendamment de la
teinte :

| Cran | Emploi |
|---|---|
| 1, 2 | Fond d'application, fond discret |
| 3, 4, 5 | Fond d'un élément d'interface, au repos, survolé, actif |
| 6, 7, 8 | Bordures discrètes, bordure et anneau de focus, bordure survolée |
| 9, 10 | Aplats, aplat survolé |
| 11, 12 | Texte à faible contraste, texte à fort contraste |

Chaque échelle est ajustée à la main pour sa teinte, et c'est cet ajustement qui
fait tenir la promesse : le cran 9 d'une teinte claire et le cran 9 d'une teinte
sombre n'ont pas la même clarté, ils ont le même emploi. Radix publie une
variante sombre de chaque échelle sous les mêmes numéros, avec les mêmes emplois.

[Material 3](https://m3.material.io/styles/color/system/how-the-system-works)
obtient le même résultat autrement : la palette tonale est calculée depuis une
couleur clé, le ton exprime une clarté mesurée, et l'alignement est donc
automatique. Le prix est de renoncer à l'ajustement manuel, ce que la demande
exclut.

La conséquence pour le Playground. L'écart de trois rôles sur `secondary` ne
prouve pas que les rampes soient mal faites. Il prouve que leurs numéros
décrivent une clarté. Deux lectures possibles, et les deux sont tenables.

La première consiste à donner un emploi à chaque cran et à ajuster chaque rampe
de marque pour qu'elle le tienne. L'axe des marques devient alors purement
chromatique et aucune correspondance par marque ne subsiste.

La seconde admet qu'un fait reste propre à chaque marque : où se trouve, dans sa
rampe, la couleur de marque elle-même. Ce fait tient en une poignée
d'emplacements, `default`, `subtle`, `emphasis`, `strong`, `subtlest`, qui
existent déjà dans `color-brand-tokens` et qui ont fait leurs preuves. Dix
emplacements sur six marques coûtent soixante valeurs, ce qui ne pèse rien. La
suite du document retient cette seconde lecture, sans interdire la première.

### 3.2 Une couche sémantique inventée serait un recul

L'objection : une couche `theme.surface.*`, `theme.text.*`, `theme.feedback.*`
suppose que les composants ont des propriétés déterminées et des comportements
attendus. Sur une bibliothèque de plusieurs centaines de composants, cette
supposition se paie à chaque composant qui sort du cadre prévu.

L'objection est juste, et la proposition qu'elle vise est abandonnée.

Une nuance factuelle, cependant, sur le fichier Figma de production, qui sert de
référence à l'objection. Ce fichier porte bien une couche sémantique :
`theme.light.primary.main`, `theme.light.text.primary`,
`theme.light.background.paper`, `theme.light.neutral.*` forment le vocabulaire
de palette de Material UI, et les tokens de composants le citent largement. Ce
qui manque à ce fichier est autre chose, et la section 3.3 le nomme.

Le vocabulaire sémantique n'est donc pas ce qui distingue les deux
architectures. La cible de la section 5 laisse ce vocabulaire entièrement libre,
et n'en impose aucun.

### 3.3 Ce qui manque au fichier de production est une couche de commutation

Ce fichier rend le service attendu, sur cinq marques et deux modes, pour
n'importe quel composant. Sa répartition est la suivante :

| Collection | Axe | Contenu |
|---|---|---|
| `colour-tokens` | aucun | Les rampes, une par marque, en niveaux de dossier |
| `theme` | cinq marques | `theme.light.*` et `theme.dark.*`, sémantique et composants, en deux dossiers |
| `mode` | clair et sombre | Un aiguillage qui choisit entre les deux dossiers |

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

Cette collection `mode` est exactement une couche de commutation, et elle est
bien placée. Ce qui coûte est qu'elle arrive après la duplication au lieu
d'arriver avant. Placée entre les rampes et tout le reste, la même mécanique
supprimerait les deux dossiers.

Le prix payé se lit dans le fichier. Trois écritures du même fait divergent :
`mode.components.icon.error.foreground` sert la valeur sombre dans ses deux
colonnes, `mode.components.filters.stroke` impose en sombre un bleu Gresham à
toutes les marques, `theme.dark.primary.main` vaut `null` pour Gresham, et deux
tokens de `theme` citent la collection `mode` qui les cite.

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

## 5. La cible

### 5.1 Une collection qui ne décide rien

Une seule collection s'ajoute, entre les rampes et tout ce qui les consomme.
Son rôle est mécanique : elle expose les mêmes noms que les rampes, en deux
colonnes.

```
color-brands.primary.500        (six colonnes, une par marque)
color-brands.accent.500         (six colonnes, la variante étudiée pour le sombre)

scheme.primary.500              light → color-brands.primary.500
                                dark  → color-brands.accent.500

components.button…background    → scheme.primary.500
```

Cette collection `scheme` n'invente aucun vocabulaire. Sa liste de variables se
déduit mécaniquement des rampes du dessous : un cran en dessous donne un cran
dans `scheme`. Ajouter une rampe ajoute ses crans, sans décision de rangement et
sans hypothèse sur ce qu'un composant en fera.

Un composant reste donc aussi libre que dans le fichier de production. Il cite
`scheme.primary.300` ou `scheme.neutral.900` selon ce que la maquette demande.
La seule règle est de citer `scheme` plutôt que les rampes, et cette règle est
mécanique, pas sémantique. Le relevé n° 5 du script la vérifie à chaque export.

### 5.2 Les collections

| Collection | Modes | Contenu | Cite |
|---|---|---|---|
| `primitives` | aucun | Les teintes brutes, les dimensions, les primitives typographiques | rien |
| `color-brands` | 6, une par marque | Les rampes de la marque courante : `primary.50` à `950`, `accent.*`, `secondary.*`, `secondary-accent.*`, plus les emplacements de rôle de la section 3.1 | `primitives` |
| `color-utilities` | aucun | `success`, `warning`, `info`, `danger`, `neutral`, et leurs variantes sombres | `primitives` |
| `scheme` | 2 : `light`, `dark` | Le miroir des deux collections ci-dessus, en deux colonnes | `color-brands`, `color-utilities` |
| `components` | aucun | Les tokens de composants, repointés sur `scheme` | `scheme`, `layouts` |
| `layouts`, `typography` | aucun | Inchangées | `primitives` |

`color-brand-tokens` se dissout : ses dix emplacements de rôle descendent dans
`color-brands`, qui porte déjà l'axe des marques, et `scheme` les mirroite comme
les autres.

Deux axes au total, `color-brands` et `scheme`, sur deux collections distinctes.
Figma résout chaque collection indépendamment, donc une maquette pose une marque
et un mode sans que l'un connaisse l'autre.

### 5.3 La palette accent

La variante étudiée pour le sombre, plus saturée et de teinte légèrement
décalée, trouve sa place sans rien changer à la mécanique. Elle vit dans
`color-brands` comme une rampe de plus, avec ses six colonnes, et `scheme`
décide cran par cran d'où vient le sombre :

```
scheme.primary.500    light → color-brands.primary.500
                      dark  → color-brands.accent.500

scheme.primary.900    light → color-brands.primary.900
                      dark  → color-brands.primary.900     (la rampe claire suffit ici)
```

Le choix « pour ce cran, le sombre vient de l'accent » ou « la rampe normale
suffit » s'écrit une fois, pour les six marques. C'est une ligne par cran, et
c'est la seule décision de conception que porte `scheme`.

Les rampes utilitaires suivent la même mécanique. Là où une rampe sombre dédiée
existe, `scheme` la vise en sombre. Là où elle n'existe pas, `scheme` vise le
cran miroir de la même rampe, ce qui fait de `scheme.neutral.50` le fond le plus
clair en clair et le plus sombre en sombre.

### 5.4 Les exceptions par composant

Une bibliothèque de plusieurs centaines de composants produira des divergences
que les rampes n'expriment pas : une marque qui veut du blanc là où les autres
prennent une couleur de marque, un logo dont le nom change par marque. Le
fichier de production en porte plusieurs.

Trois façons de les loger, selon ce que l'offre Figma autorise.

**Une collection étendue sur `components`.** Une collection parente et une
extension par marque, qui ne surcharge que les tokens divergents. L'export écrit
ces surcharges sous `com.ucm.extensions`, et la feuille CSS émet un
intermédiaire par extension. Le coût d'écriture se limite aux exceptions. Deux
réserves : la fonction est réservée à l'offre Enterprise, et la lecture du
produit est prouvée sur une simulation de l'API Figma, pas sur un fichier réel.

**Une collection d'exceptions.** Une collection à six modes, placée entre
`scheme` et `components`, ne portant que les tokens divergents. Son coût est un
second espace de noms, que seuls les composants concernés citent.

**Un emplacement de rôle de plus dans `color-brands`.** Quand la divergence est
un fait de marque plutôt qu'un fait de composant, elle descend à la couche de
marque et redevient une ligne unique en aval.

### 5.5 Ce que la cible ne prescrit pas

Aucun vocabulaire sémantique. Les noms de `scheme` sont ceux des rampes. Si
l'équipe veut en plus une couche de rôles, elle l'ajoute au-dessus de `scheme`,
sans mode, et les composants choisissent de la citer ou non. L'architecture
tient dans les deux cas.

Aucune limite au nombre de modes d'affichage. Un contraste renforcé devient une
troisième colonne dans `scheme`, et rien d'autre dans le fichier ne le sait.

## 6. Pourquoi cette forme plutôt que trois autres

| | Fichier de production | Produit cartésien | Couche de rôles inventée | Miroir de commutation |
|---|---|---|---|---|
| Forme | Mode en dossier, marque en mode | Une collection, douze modes `marque-mode` | Un vocabulaire de rôles à deux modes | Rampes à six modes, miroir à deux modes |
| Liberté d'expression | entière | entière | bornée par le vocabulaire | entière |
| Ajouter une marque | une colonne dans deux dossiers, sur toute la surface | deux colonnes | une colonne | une colonne |
| Ajouter un mode | un troisième dossier à dupliquer | six colonnes | une colonne | une colonne |
| Exception par composant | native, chaque token a ses colonnes | native | par extension | par extension |
| Combinaisons écrites à la main | oui | oui, douze colonnes | non | non |
| Plafond de modes Figma | cinq | douze, au-delà de certaines offres | six et deux | six et deux |
| Marque et mode indépendants sur un sous-arbre | oui | non, un seul attribut | oui | oui |

Le produit cartésien mérite un mot, parce qu'il est la solution la plus simple à
écrire. Une seule collection, douze modes nommés `intencial-light`,
`intencial-dark` et ainsi de suite, et les composants citent les rampes
directement. Il échoue sur deux points : le nombre de colonnes croît en
multipliant à chaque mode ajouté, et un seul attribut porte les deux dimensions,
donc un encart sombre dans une page claire force à répéter la marque.

## 7. Le volume

Sur les nombres relevés dans le Playground, pour six marques et deux modes.

| Poste | Valeurs écrites |
|---|---|
| `color-brands` : quatre rampes de onze crans plus dix rôles, six colonnes | 324 |
| `scheme` : 76 noms mirroités, deux colonnes | 152 |
| `components` : 369 tokens, aucune colonne | 369 |
| Total | 845 |

Écrire chaque couleur de composant dans chaque combinaison, comme le fait le
fichier de production, demanderait 6 × 2 × 306 = 3 672 valeurs pour la seule
couche composant.

La propriété qui compte davantage : ajouter la palette accent n'ajoute aucun nom
dans `scheme` ni dans `components`. Elle ajoute une rampe dans `color-brands` et
change la source d'une colonne. Une architecture où un raffinement du sombre se
paie sur toute la surface ne tiendrait pas une bibliothèque de plusieurs
centaines de composants.

## 8. Côté code

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

## 9. Le chemin

Le fichier de tokens sort d'un export, donc chaque étape se joue dans le fichier
Figma source et le Playground la reçoit. L'ordre garde le fichier utilisable
après chaque étape.

| Étape | Geste | Vérification |
|---|---|---|
| 1 | Relever l'état avec le script et garder le relevé | Un point de départ existe |
| 2 | Lire le plafond de modes par collection de l'offre Figma de l'équipe | Six modes tiennent dans une collection |
| 3 | Créer `scheme`, deux modes, en mirroitant les rampes actuelles, les deux colonnes visant la même source | La feuille CSS est inchangée à l'octet près, sauf les noms ajoutés |
| 4 | Repointer les 306 liaisons de couleur des composants sur `scheme` | Le relevé n° 5 montre `components` citant `scheme` et `layouts` seulement |
| 5 | Convertir `color-brands` en collection à modes, une colonne par marque, et y descendre les rôles de `color-brand-tokens` | Le relevé n° 3 mesure ce que l'axe des marques porte encore |
| 6 | Ajouter les rampes accent, puis faire viser le sombre de `scheme` cran par cran | Le rendu sombre apparaît sans qu'aucun composant ne bouge |
| 7 | Ajouter les marques une à une | Chaque ajout est une colonne |
| 8 | Exporter, générer la feuille, comparer les relevés et la taille de feuille | Le gain est chiffré |

L'étape 3 ne change rien au rendu, ce qui la rend sûre : les deux colonnes de
`scheme` visent d'abord la même source. L'étape 4 porte tout le travail manuel,
306 liaisons à refaire dans Figma, et vaut d'être menée sur `Alert` d'abord, qui
concentre les citations brutes vers `primitives.colors.*`.

Le sombre n'existe qu'à l'étape 6, et il n'est alors qu'un changement de source
dans une seule collection.

## 10. Ce qui peut rater

**Le plafond de modes.** Six marques dans une collection supposent une offre qui
l'autorise. Le plafond [dépend de
l'offre](https://forum.figma.com/suggest-a-feature-11/launched-all-plans-should-offer-more-than-4-variable-modes-13979),
avec des valeurs que les sources secondaires citent de façon contradictoire, et
il se lit dans l'interface de l'équipe avant l'étape 5.

**Le repointage de masse.** L'étape 4 casse le rendu de tout composant dont une
liaison est oubliée. Une page de contrôle qui affiche les combinaisons de marque
et de mode sert de témoin, et le relevé n° 5 dit ce qui reste cité hors de
`scheme`.

**Les rampes qui ne tiennent pas leur emploi.** Si un cran ne joue pas le même
emploi d'une marque à l'autre, un composant qui le cite directement se dégrade
sur cette marque. Les emplacements de rôle de la section 3.1 sont la réponse,
mais encore faut-il que les composants les citent plutôt que le cran. Un relevé
des crans cités directement par les composants, marque par marque, dira
lesquels méritent un emplacement.

**Les collections étendues.** Si la première voie de la section 5.4 est retenue,
deux risques se cumulent : l'offre Enterprise, et une lecture du produit prouvée
sur une simulation plutôt que sur un fichier réel. Un essai sur un vrai fichier
étendu est le préalable. Les collections étendues [ne respectent pas toujours la
hiérarchie des
modes](https://forum.figma.com/share-your-feedback-26/extended-collections-doesn-t-respect-mode-hierarchy-48123).

**Le contraste en sombre.** Une rampe accent ne garantit aucun rapport de
contraste. Les couples de `scheme` se vérifient dans les deux modes, marque par
marque, ce qui fait douze jeux à contrôler.

## 11. Ce qui reste à mesurer

```sh
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-duplication.mjs" <tokens.json>
```

Les nombres de la section 2 viennent du fichier réel. Trois restent à établir.

Le nombre de noms de `scheme`. Soixante-seize est le compte des crans existants.
Il baissera si des rampes utilitaires se révèlent inutiles aux composants, et
montera avec les rampes accent qui apparaîtront comme sources sans apparaître
comme noms.

La taille de la feuille CSS. Deux axes croisés produisent des blocs `@scope` que
le fichier actuel n'a pas, et `ucm tokens css` imprime ses règles, ses
déclarations et ses octets à chaque écriture.

Les crans cités directement par les composants, marque par marque, pour décider
lesquels méritent un emplacement de rôle plutôt qu'un numéro.

## Sources

- [Understanding the scale, Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Composing a palette, Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)
- [How the system works, Material Design 3](https://m3.material.io/styles/color/system/how-the-system-works)
- [Token names, Primer](https://primer.style/product/primitives/token-names/)
- [Themes, Carbon Design System](https://carbondesignsystem.com/elements/themes/overview/)
- [Design tokens, Atlassian Design System](https://atlassian.design/foundations/tokens/design-tokens)
- [Color system, Spectrum](https://spectrum.adobe.com/page/color-system/)
- [Modes for variables, Figma Learn](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Overview of variables, collections, and modes, Figma Learn](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Extend a variable collection, Figma Learn](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection)
- [Extended collections doesn't respect mode hierarchy, forum Figma](https://forum.figma.com/share-your-feedback-26/extended-collections-doesn-t-respect-mode-hierarchy-48123)
- [All plans should offer more than 4 variable modes, forum Figma](https://forum.figma.com/suggest-a-feature-11/launched-all-plans-should-offer-more-than-4-variable-modes-13979)
- [Multi-mode setups, Supernova](https://www.supernova.io/guides/supernova-figma-variables-playbook/1-mastering-figma-variables/multi-mode-setups)
- [Using Figma Variables to build a Multi-Brand Design System, Rangle](https://rangle.io/blog/using-figma-variables-to-build-a-multi-brand-design-system)
- [Design Tokens Resolver Module](https://www.designtokens.org/tr/drafts/resolver/)
