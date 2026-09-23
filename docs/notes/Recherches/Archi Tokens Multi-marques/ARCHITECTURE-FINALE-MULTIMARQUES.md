# L'architecture de tokens multi-marques

Ce document propose la forme des tokens du nouveau design system : six marques,
un thème clair et un thème sombre, deux profils de couleur par rampe, `soft` et
`vivid`. Le détail des arguments est dans [la
recherche](./RECHERCHE-ARCHI-MULTIMARQUES.md) et [la revue
critique](./SYNTHESE-CRITIQUE-ARCHI-MULTIMARQUES.md), qui emploient encore
l'ancien nom `scheme` de la collection `theme`. L'outil qui fabrique les
palettes fait l'objet d'une [recherche séparée](../Plugin%20Palettes/RECHERCHE-PLUGIN-PALETTES.md).

[VUE-ILLUSTREE-MULTIMARQUES.html](./VUE-ILLUSTREE-MULTIMARQUES.html) montre
la même architecture en schémas, à ouvrir dans un navigateur : le chemin d'un
token, l'aperçu du panneau des variables de Figma et l'aide-mémoire du
designer.

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

Ces bornes valent sur les 360 teintes, les deux profils et les deux thèmes,
calculées en flottant à teinte constante. Avec la dérive de Tailwind et
l'arrondi à 8 bits, les minimums baissent d'au plus 0,02 : 3,62 pour le 600,
7,44 pour le 800. Aucun ne franchit un seuil. Un composant peut citer
`theme.primary.vivid.700` ou `theme.success.soft.700` pour un texte dans toutes
les marques.

Le thème sombre a sa propre courbe, avec les mêmes numéros. Le cran 50 est le
fond de page dans les deux thèmes : le plus clair en clair, le plus sombre en
sombre. Un texte lié une fois à `theme.primary.vivid.700` reste lisible dans les
deux thèmes.

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
| `brand` | un par marque | Ce qui change d'une marque à l'autre : ses rampes de couleur et sa couleur exacte |
| `theme` | `light`, `dark` | Les noms que les composants citent. Chaque nom pointe vers sa valeur claire ou sa valeur sombre |
| `components` | aucun | Les tokens de composants |

Deux collections portent chacune un axe, et Figma choisit le mode de chaque
collection séparément. Une maquette pose donc une marque et un thème sans que
l'un dépende de l'autre. Une collection unique à douze modes, six marques fois
deux thèmes, dépasserait les dix modes par collection de l'offre Professional.

L'export dérive l'attribut HTML d'un axe du nom de sa collection : `brand`
donne `data-brand` et `theme` donne `data-theme`, sans réglage dans
`ucm.config.json`.

### Le chemin d'une couleur

Une couleur se nomme dans cet ordre : famille, profil, thème, cran.

```text
primitives.neutral.light.700              le neutre, un seul profil
primitives.success.soft.light.700         un utilitaire
brand.palette.primary.vivid.dark.700      une rampe de marque
```

**Le neutre est une palette fixe et grise**, commune aux marques, avec un seul
profil. **Les quatre utilitaires**, `success`, `warning`, `info` et `danger`,
sont communs aux marques et portent les deux profils. Chaque rampe existe en
deux jeux, un par courbe.

**Tout ce qui dépend de la marque va dans `brand`.** Deux collections à six
modes pourraient afficher la palette de la marque A avec les réglages de la
marque B dans la même maquette.

**Un composant ne cite jamais `brand` ni `primitives` pour une couleur**, il
cite `theme`.

### Ce que `theme` expose

| Groupe | Exemple | Cible en clair | Variables |
|---|---|---|---|
| Neutre | `theme.neutral.700` | `primitives.neutral.light.700` | 11 |
| Utilitaires | `theme.danger.vivid.700` | `primitives.danger.vivid.light.700` | 88 |
| Rampes de marque | `theme.primary.soft.100` | `brand.palette.primary.soft.light.100` | 44 |
| Exceptions | `theme.exception.…` | `brand.exception.light.…` | 0 |

En sombre, la cible remplace `light` par `dark`. `theme` compte 143 variables à
deux colonnes. `primitives` compte 198 couleurs : 22 pour le neutre, 176 pour
les utilitaires. `brand` en compte 89 par marque : 88 crans et la couleur exacte.

### Les réglages et les exceptions de marque

Aucune marque ne diverge aujourd'hui. Les deux mécanismes ci-dessous n'ont donc
aucune variable, et leurs noms sont réservés.

Un **réglage de marque** est une valeur qui n'est pas une couleur et qui change
d'une marque à l'autre. Le thème ne le modifie pas, donc il ne passe pas par
`theme`.

```text
brand.params.radius.button        marque A → 4 px      marque B → 999 px
brand.params.font.title           marque A → Inter     marque B → Playfair Display
components.button.radius       →  brand.params.radius.button
```

Une **exception** sert quand une marque veut un composant différent dans un seul
thème. Exemple : la marque B veut un bouton principal gris foncé en sombre, et
identique aux autres en clair. `brand` porte les deux valeurs de chaque marque,
et `theme` choisit la claire ou la sombre :

```text
brand.exception.light.button.primary.background   A et B → brand.palette.primary.vivid.light.700
brand.exception.dark.button.primary.background    A      → brand.palette.primary.vivid.dark.700
                                                  B      → primitives.neutral.dark.200
theme.exception.button.primary.background         light → brand.exception.light.button.primary.background
                                                  dark  → brand.exception.dark.button.primary.background
components.button.primary.background           →  theme.exception.button.primary.background
```

Les six marques renseignent les deux valeurs d'une exception, y compris celles
qui gardent le cran commun. Une exception sur un fond porte aussi ses états :
le survol et l'appui en ont chacun une.

Trois règles permettent d'ajouter l'un ou l'autre sans toucher à un composant
publié :

1. `brand` est la seule collection qui porte l'axe des marques. Un réglage ou
   une exception s'y ajoute ; aucune seconde collection à six modes ne se crée.
2. Chaque propriété d'un composant Figma est liée à une variable de
   `components`. Ajouter un réglage ou une exception repointe cette variable, et
   le composant ne change pas.
3. Un réglage ou une exception se crée le jour où une marque le demande.

## 3. Fabriquer la palette d'une marque

### 3.1 D'un hexa à une rampe

Le designer donne la couleur de marque en hexa. Chaque cran de la rampe prend :

- sa clarté sur la courbe du thème ;
- sa teinte selon la règle de la section 3.3 ;
- sa chroma, c'est-à-dire sa vivacité, en part du maximum que l'écran affiche à
  cette clarté et à cette teinte.

Une chroma fixe sortirait de ce que l'écran affiche aux deux bouts de la rampe,
et elle rendrait un jaune et un bleu inégalement vifs, parce que leurs maximums
diffèrent.

### 3.2 Les profils `soft` et `vivid`

Les deux profils ont la même clarté, donc les mêmes contrastes. Ils diffèrent
par la part de chroma, 0,45 pour `soft` et 0,95 pour `vivid`, valeurs à régler
à l'œil. Les rampes de marque et les utilitaires portent les deux profils ; le
neutre n'en a qu'un.

Un profil règle l'insistance d'un élément. `soft` sert à un élément répété ou
secondaire, comme un badge présent vingt fois à l'écran. `vivid` sert à un
élément qui doit être remarqué, comme une alerte.

**Chaque profil peut avoir sa propre teinte.** Un bleu `vivid` peut tirer vers
le violet quand le bleu `soft` reste neutre. Les contrastes de la section 1 sont
mesurés sur les 360 teintes, donc ce choix ne les change pas.

Aux crans 50, 100 et 950, l'écart de chroma entre les deux profils descend sous
0,02 pour certaines teintes, et les deux profils s'y confondent. Un fond pâle
`soft` et un fond pâle `vivid` sont alors presque identiques ; les profils se
distinguent sur les crans 500 à 800. Ce seuil de 0,02 est un réglage à calibrer
à l'œil. L'outil de génération signale ces crans.

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
charte. L'outil de génération affiche le cran dont elle est la plus proche en
clarté, et dit ce qu'elle peut porter.

Aucun composant ne la cite. Le fond plein d'un bouton prend le cran 700 dans
toutes les marques, quel que soit le cran de la couleur de charte. Une couleur
plus claire que le 700 donne donc un bouton plus foncé qu'elle, et l'outil de
génération le signale. Material 3 procède de même : la couleur choisie donne la
teinte de la palette, et le bouton prend toujours le même ton.

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
- le gamut de sortie, sRGB ;
- la liste des crans retouchés à la main, que la régénération n'écrase pas.

Les couleurs sortent en sRGB. Display P3 est écarté : il changerait toutes les
valeurs, et un écran sRGB ne montre pas la différence au designer qui les
choisit.

## 4. Les emplois et les états

Un composant cite un cran de `theme`, et ce cran est le même dans toutes les
marques. Aucune marque ne relie un emploi à un autre cran. Un cran câblé par
marque obligerait à câbler aussi chacun de ses états, survol, appui et focus,
dans chaque marque et chaque thème.

La table des emplois fixe le cran de chaque usage et de chacun de ses états.
Elle vaut pour toutes les rampes, marques et utilitaires, et pour les deux
profils.

| Emploi | Repos | Survol | Appui | Paire vérifiée | Minimum |
|---|---|---|---|---|---|
| `solid`, fond plein d'un bouton, d'un badge | 700 | 800 | 900 | `neutral.50` sur le fond, 4,5:1 | 5,23 · 7,45 · 10,50 |
| `text`, texte de marque sur le fond de page | 700 | | | contre le fond de page, 4,5:1 | 5,23 |
| `surface`, fond teinté discret | 100 | 200 | 300 | texte 700, 800, 900 sur le fond, 4,5:1 | 4,99 · 6,32 · 7,28 |
| `border-control`, contour d'un champ, d'une case | 600 | 700 | 800 | contre `surface` au même état, 3:1 | 3,46 · 4,46 · 5,25 |
| `border-decorative`, séparateur, filet | 300 | | | aucune | |
| `focus`, anneau de focus | 600 | | | contre le fond de page, 3:1 | 3,63 |

Les minimums valent sur 360 teintes, les deux profils et les deux thèmes ; la
section 5 de `verifier-courbes.mjs` les produit. Une relecture indépendante a
vérifié que chaque paire tient encore son seuil quand ses deux membres prennent
des teintes différentes : la garantie ne dépend pas de la dérive.

**Un état avance d'un cran**, fond et texte ensemble. Un texte resté au 700 sur
un fond au 200 tombe à 4,46:1, sous le seuil. En sombre, les mêmes numéros
s'appliquent : l'état s'éloigne du fond de page dans les deux thèmes.

**Un bouton texte** n'a pas de fond au repos : texte 700. Au survol, il prend
le fond 200 et le texte 800 ; à l'appui, le fond 300 et le texte 900.

**Un contrôle désactivé** prend les neutres, fond 200 et texte 500, hors seuil :
WCAG n'exige aucun contraste d'un composant inactif.

**L'anneau de focus laisse un espace** entre lui et le contrôle. Posé au contact
d'un bouton plein, aucun cran de la rampe ne s'en détache à 3:1 : l'anneau 600
au contact du 700 donne 1,40:1. En CSS, un `outline-offset` non nul.

**La palette `primary` d'une marque porte ses actions**, pas forcément la
première couleur de sa charte. Une marque qui mène avec sa deuxième couleur la
place dans `primary` en générant ses palettes, sans aucune variable de plus.

## 5. Un composant différent selon la marque

Prendre la première ligne qui répond au besoin :

| Besoin | Réponse | Exemple |
|---|---|---|
| Une autre couleur, pour toute la marque | Placer cette couleur dans la palette `primary` de la marque | La marque B mène avec sa couleur secondaire |
| Une autre valeur, sans être une couleur | Un réglage de marque | Boutons en pilule chez la marque B |
| Une autre valeur dans un seul thème | Une exception | Bouton gris foncé en sombre chez la marque B |
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

Quatre décisions : la couleur primaire et la secondaire en hexa, et leurs
teintes de bout sombre si la proposition ne convient pas.

Une nouvelle colonne de mode dans Figma recopie les valeurs de la première. Une
marque ajoutée paraît donc couverte avant d'être renseignée : relire chacune de
ses variables avant de la publier.

## 8. Ce qui reste à décider

- Les deux courbes de clarté, posées à l'œil.
- Les parts de chroma des profils, et le seuil de 0,02 qui dit où deux profils
  se confondent.
- Les teintes de bout sombre proposées par défaut, famille par famille.
- Les contrôles automatiques sur `tokens.json` : graphe d'alias, couverture de
  chaque marque et de chaque thème, paires de la table des emplois. Aucun n'est
  écrit. Les paires texte et fond d'un composant se lisent dans ses contrats,
  qui situent chaque peinture, et non dans les noms de ses tokens.

Avant d'étendre à la bibliothèque, un prototype à six marques éprouve les cas
limites : un jaune clair, un bleu très sombre, une teinte très vive, une marque
presque grise. Il pose un bouton plein et son survol, une alerte, un champ avec
focus, un libellé long, une exception en sombre, un élément `soft` à côté d'un
élément `vivid`.

## Sources

- [Understanding the scale, Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [How to generate color palettes for design systems, Matt Ström-Awn](https://mattstromawn.com/writing/generating-color-palettes/)
- [Leonardo, Adobe](https://github.com/adobe/leonardo)
- [How the color system works, Material 3](https://m3.material.io/styles/color/system/how-the-system-works)
- [Palette de Tailwind CSS en OKLCH, `theme.css`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css)
- [Contraste du texte, WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Contraste non textuel, WCAG](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [OKLCH et conversion de gamut, CSS Color 4](https://www.w3.org/TR/css-color-4/#gamut-mapping)
- [Modes for variables, Figma Learn](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
