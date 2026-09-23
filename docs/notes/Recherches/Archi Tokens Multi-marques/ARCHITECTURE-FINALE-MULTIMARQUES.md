# L'architecture de tokens multi-marques

Ce document propose la forme des tokens du nouveau design system : six marques,
un mode clair et un mode sombre, deux profils de couleur par rampe, doux et
vibrant. Le détail des arguments est dans [la
recherche](./RECHERCHE-ARCHI-MULTIMARQUES.md) et [la revue
critique](./SYNTHESE-CRITIQUE-ARCHI-MULTIMARQUES.md). L'outil qui fabrique les
palettes fait l'objet d'une [recherche séparée](../Plugin%20Palettes/RECHERCHE-PLUGIN-PALETTES.md).

Chaque nombre cité se rejoue avec un script de ce dossier :

```sh
node "docs/notes/Recherches/Archi Tokens Multi-marques/verifier-courbes.mjs"
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-derive-teinte.mjs"
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-rampes.mjs" <tokens.json>
```

## 1. Le principe : un numéro de cran vaut un contraste

Toutes les rampes de couleur partagent la même courbe de clarté. La clarté fixe
le contraste ; la teinte et la vivacité le déplacent peu. Un même numéro de cran
donne donc le même contraste contre le fond de page, quelle que soit la couleur :

| Cran | Contraste contre le fond de page | Emploi sûr |
|---|---|---|
| 500 | 2,58 à 3,26 | aucun emploi qui demande un seuil |
| 600 | 3,63 à 4,72 | bordure de contrôle, anneau de focus (seuil 3:1) |
| 700 | 5,23 à 6,79 | texte (seuil 4,5:1) |
| 800 | 7,45 à 9,50 | texte appuyé |

Ces bornes valent sur les 360 teintes, les deux profils et les deux modes. Un
composant peut citer `primary.700` ou `success.700` pour un texte dans toutes
les marques.

Le mode sombre a sa propre courbe, avec les mêmes numéros. Le cran 50 est le fond
de page dans les deux modes : le plus clair en clair, le plus sombre en sombre.
Un texte lié une fois à `primary.700` reste lisible dans les deux modes.

| Cran | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Clair | 0,975 | 0,950 | 0,905 | 0,845 | 0,760 | 0,670 | 0,585 | 0,500 | 0,420 | 0,340 | 0,270 |
| Sombre | 0,180 | 0,225 | 0,275 | 0,330 | 0,400 | 0,490 | 0,580 | 0,670 | 0,760 | 0,850 | 0,930 |

Ces vingt-deux clartés sont posées à l'œil, près des rampes du Playground. Elles
se règlent sur des palettes réelles. Toutes les rampes gardent onze crans, de 50
à 950 ; le Playground en emploie aujourd'hui dix, onze ou douze selon la rampe,
et son cran 500 y va de 2,2:1 à 6,9:1.

## 2. Les collections

| Collection | Modes | Contenu |
|---|---|---|
| `primitives` | aucun | Ce que les marques partagent : le neutre, les quatre utilitaires, les espacements, les durées |
| `brand` | un par marque | Ce qui change d'une marque à l'autre : ses rampes de couleur, sa couleur exacte, le câblage de ses rôles, ses réglages |
| `scheme` | `light`, `dark` | Les noms que les composants citent. Chaque nom pointe vers sa valeur claire ou sa valeur sombre |
| `components` | aucun | Les tokens de composants |

**Le neutre est une palette fixe et grise**, commune aux marques. Il n'a qu'un
profil. Les quatre utilitaires sont eux aussi communs, comme dans le Playground.
Chacune de ces rampes existe en deux jeux dans `primitives`, un par courbe :
`scheme.neutral.700` pointe vers `primitives.neutral.light.700` en clair et vers
`primitives.neutral.dark.700` en sombre.

**Tout ce qui dépend de la marque va dans `brand`.** Figma choisit le mode de
chaque collection séparément. Deux collections à six marques pourraient donc
afficher la palette de la marque A avec les réglages de la marque B dans la même
maquette.

**Un composant ne cite jamais `brand` pour une couleur**, il cite `scheme`.

### Les réglages et les exceptions de marque

La revue critique propose de ranger dans `brand` des paramètres de marque et des
exceptions de composants. Les chemins `brand.params` et `scheme.exception` sont
le nommage que ce document propose pour ces deux idées. Ils restent à valider.

Un **réglage de marque** est une valeur qui n'est pas une couleur et qui change
d'une marque à l'autre. Le composant le cite directement.

```text
brand.params.radius.button        marque A → 4 px      marque B → 999 px
brand.params.font.title           marque A → Inter     marque B → Playfair Display
```

Une **exception** sert quand une marque veut un composant différent dans un seul
mode. Exemple : la marque B veut un bouton principal gris foncé en sombre, et
identique aux autres en clair. `brand` porte les deux valeurs de B, et
`scheme.exception.button.primary.background` choisit la claire ou la sombre. Une
exception ne se crée que le jour où une marque la demande.

## 3. Fabriquer la palette d'une marque

### 3.1 D'un hexa à une rampe

Le designer donne la couleur de marque en hexa. Chaque cran de la rampe prend :

- sa clarté sur la courbe du mode ;
- sa teinte selon la règle de la section 3.3 ;
- sa chroma, c'est-à-dire sa vivacité, en part du maximum que l'écran affiche à
  cette clarté et à cette teinte.

Une chroma fixe sortirait de ce que l'écran affiche aux deux bouts de la rampe,
et elle rendrait un jaune et un bleu inégalement vifs, parce que leurs maximums
diffèrent.

### 3.2 Les profils doux et vibrant

Les deux profils ont la même clarté, donc les mêmes contrastes. Ils diffèrent
par la part de chroma, 0,45 pour le doux et 0,95 pour le vibrant, valeurs à
régler à l'œil.

**Chaque profil peut avoir sa propre teinte.** Un bleu vibrant peut tirer vers
le violet quand le bleu doux reste neutre. Les contrastes de la section 1 sont
mesurés sur les 360 teintes, donc ce choix ne les change pas.

Les deux profils se posent dans la même maquette, un encart doux à côté d'un
bouton vibrant. Aux crans 50, 100 et 950, l'écart de chroma entre les deux
descend sous 0,02 pour certaines teintes, et les deux profils s'y confondent. Ce
seuil de 0,02 est un réglage à calibrer à l'œil. L'outil de génération signale
ces crans.

### 3.3 La dérive de teinte

Une rampe change de teinte en fonçant, et c'est voulu. Un jaune foncé à teinte
constante vire à l'olive. En tournant vers l'orange, il donne un brun doré.

Le relevé des dix-sept rampes colorées de Tailwind donne la dérive du bout
sombre selon la teinte de départ :

| Teinte au bout clair | Exemples | Dérive en fonçant |
|---|---|---|
| 70° à 105°, jaunes et oranges | orange, amber, yellow | -37° à -50°, vers le rouge |
| 120°, vert-jaune | lime | +11°, vers le vert |
| 155° à 180°, verts | green, emerald, teal | -3° à +12° |
| 200°, cyan | cyan | +29°, vers le bleu |
| 235° à 275°, bleus | sky, blue, indigo | +7° à +13°, vers le violet |
| 290° à 320°, violets | violet, purple, fuchsia | -6° à +6° |
| 340°, rose | pink | +21°, vers le rouge |
| 10° à 20°, rouges | rose, red | 0° à +9° |

Il n'y a pas de loi lisse. Entre le jaune et le lime, la dérive saute de -48° à
+11° : les bouts sombres fuient la zone jaune-olive des deux côtés, et aucun ne
finit entre 55° et 130°. Dans cette zone, l'écran n'affiche une couleur vive
qu'à très haute clarté, et une couleur sombre y devient kaki. Prédire la dérive
d'une rampe par interpolation entre ses deux voisines se trompe de 10,4° en
moyenne, contre 15,8° pour une teinte constante.

Les rampes `danger` et `success` du Playground reprennent au degré près les
rampes `red` et `green` de Tailwind.

La règle retenue : **deux teintes par rampe**, une au bout clair et une au bout
sombre. Entre les deux, la teinte suit la clarté du cran. Mesurée sur neuf
rampes réelles :

| Règle | Erreur moyenne | Pire erreur |
|---|---|---|
| Une seule teinte | 8,1° | 32,2° |
| Deux teintes, aux deux bouts | 2,9° | 16,0° |
| Trois teintes, aux bouts et au cran 500 | 2,0° | 10,4° |

La pire erreur tombe sur les jaunes et les oranges, qui tournent surtout entre
les crans 400 et 600. La troisième teinte sert à ces rampes.

La teinte dépend de la clarté, pas du numéro de cran. En sombre, le cran 50 est
sombre, donc il prend la teinte du bout sombre.

Le générateur propose la teinte du bout sombre d'après le tableau de Tailwind,
et le designer l'ajuste.

### 3.4 La couleur exacte de la marque

La couleur de la charte tombe rarement pile sur un cran. Elle reste hors de la
rampe, sous `brand.identity.primary`, pour le logo et les aplats imposés par la
charte. L'outil de génération dit ce qu'elle peut porter.

Exemple, un jaune de marque très clair (clarté 0,85, teinte 95°) :

| Question | Réponse |
|---|---|
| Cran le plus proche | 300 |
| Porte-t-elle un texte blanc ? | non, 1,58:1 |
| Porte-t-elle un texte noir ? | oui, 13,30:1 |
| Sert-elle de texte sur le fond de page ? | non, 1,47:1 |
| Le cran 700 de sa rampe sert-il de texte ? | oui, 5,57:1 |

### 3.5 Le fichier de recette

Tous les nombres qui fabriquent une palette tiennent dans un fichier versionné.
Deux outils qui lisent ce fichier produisent les mêmes hexas, et une palette
régénérée plus tard reste identique. Il contient :

- la liste des crans et les deux courbes de clarté ;
- les parts de chroma des deux profils ;
- pour chaque rampe, la couleur de départ et ses teintes aux bouts, par profil ;
- le gamut de sortie, sRGB au départ ;
- la liste des crans retouchés à la main, que la régénération n'écrase pas.

## 4. Les rôles

Un rôle est un nom que le composant cite, et que chaque marque relie au cran de
son choix. Les marques ne visent pas toutes le même cran : une marque très
claire ne remplit pas un bouton avec son cran 700 sans perdre son identité, une
autre mène avec sa couleur secondaire.

```text
scheme.role.primary.solid
    marque A → brand.palette.primary.vivid.700
    marque B → brand.palette.secondary.vivid.700
    marque C → brand.identity.primary
```

Sept rôles pour `primary`, autant pour `secondary`. Le câblage par défaut tient
chaque promesse sur les 360 teintes, les deux profils et les deux modes.

| Rôle | Emploi | Défaut | Promesse |
|---|---|---|---|
| `solid` | Fond plein d'un bouton, d'un badge | cran 700 | `on-solid` s'y lit à 4,5:1 |
| `on-solid` | Texte posé sur ce fond | `neutral.50` | idem |
| `text` | Texte de marque sur le fond de page | cran 700 | 4,5:1 |
| `surface` | Fond teinté discret | cran 100 | `text` s'y lit à 4,5:1 |
| `border-control` | Contour d'un champ, d'une case | cran 600 | 3:1 |
| `border-decorative` | Séparateur, filet | cran 300 | aucune |
| `focus` | Anneau de focus | cran 600 | 3:1 |

**Un état avance d'un cran**, fond et texte ensemble. Au survol, un fond au cran
100 passe au 200, et son texte passe du 700 au 800. Un texte resté au 700 sur un
fond au 200 tombe à 4,46:1, sous le seuil.

**L'anneau de focus laisse un espace** entre lui et le contrôle. Posé au contact
d'un bouton plein, aucun cran de la rampe ne s'en détache à 3:1. En CSS, un
`outline-offset` non nul.

## 5. Un composant différent selon la marque

Prendre la première ligne qui répond au besoin :

| Besoin | Réponse | Exemple |
|---|---|---|
| Une autre couleur, pour toute la marque | Relier un rôle ailleurs dans `brand` | La marque B mène avec sa couleur secondaire |
| Une autre valeur, sans être une couleur | Un réglage de marque | Boutons en pilule chez la marque B |
| Une autre valeur dans un seul mode | Une exception | Bouton gris foncé en sombre chez la marque B |
| Un autre dessin | Une variante de composant | Une icône présente chez la marque A seulement |

## 6. Côté code

Un attribut par axe, posé sur n'importe quel élément et valable pour ses
enfants :

```html
<html data-brand="marque-a" data-theme="light">
  <aside data-theme="dark">…</aside>
</html>
```

`ucm tokens css` produit la feuille. L'application pose `data-theme` selon la
préférence du système ; la feuille n'émet aucune règle `prefers-color-scheme`.

## 7. Ce que coûte une marque

Environ cinq décisions : la couleur primaire et la secondaire en hexa, leurs
teintes de bout sombre si la proposition ne convient pas, et les rôles à relier
ailleurs quand un contrôle refuse le câblage par défaut.

## 8. Ce qui reste à décider

- Les deux courbes de clarté, posées à l'œil.
- Les parts de chroma des profils, et le seuil de 0,02 qui dit où deux profils
  se confondent.
- Les teintes de bout sombre proposées par défaut, famille par famille.
- sRGB ou Display P3 : P3 rend le vibrant plus vif, et change toutes les valeurs.
- Les utilitaires : communs à toutes les marques, ou teintés par marque.
- Les contrôles automatiques sur `tokens.json` : graphe d'alias, couverture de
  chaque marque et de chaque mode, promesses des rôles. Aucun n'est écrit.

Avant d'étendre à la bibliothèque, un prototype à six marques éprouve les cas
limites : un jaune clair, un bleu très sombre, une teinte très vive, une marque
presque grise. Il pose un bouton plein et son survol, une alerte, un champ avec
focus, un libellé long, une exception en sombre, un élément doux à côté d'un
élément vibrant.

## Sources

- [Understanding the scale, Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [How to generate color palettes for design systems, Matt Ström-Awn](https://mattstromawn.com/writing/generating-color-palettes/)
- [Leonardo, Adobe](https://github.com/adobe/leonardo)
- [Palette de Tailwind CSS en OKLCH, `theme.css`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css)
- [Contraste du texte, WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Contraste non textuel, WCAG](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [OKLCH et conversion de gamut, CSS Color 4](https://www.w3.org/TR/css-color-4/#gamut-mapping)
- [Modes for variables, Figma Learn](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
