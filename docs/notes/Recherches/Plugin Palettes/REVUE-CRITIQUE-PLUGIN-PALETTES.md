# Revue critique de la recherche sur le plugin de palettes

Cette revue porte sur la première version de
[RECHERCHE-PLUGIN-PALETTES.md](./RECHERCHE-PLUGIN-PALETTES.md), confrontée à
[l'architecture multi-marques](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
au script [`verifier-courbes.mjs`](../Archi%20Tokens%20Multi-marques/verifier-courbes.mjs)
et aux typages `@figma/plugin-typings` 1.138. Le document a été réécrit en
spécification ; chaque constat renvoie à la section qui le corrige.

Le résultat attendu du plugin est une planche : des palettes dessinées dans le
fichier Figma, avec leurs informations. Une palette part d'une couleur de
référence et ne sait pas à quoi elle sert. Créer des variables est une option
ultérieure. La revue juge la première version contre ce résultat.

## Verdict

La première version répondait à la question « faut-il un plugin ». Elle ne
permettait pas d'en écrire un. Trois manques empêchaient une implémentation
autonome :

1. la planche, seul résultat attendu, n'était pas décrite : ni ses cadres, ni ce
   qu'une couleur y affiche ;
2. la recette n'était pas déterministe : deux implémentations fidèles au texte
   produisaient des hexas différents ;
3. le fond contre lequel se mesurent les contrastes n'était pas défini.

Le fond de la proposition tient : un plugin séparé, un moteur de couleur sans
Figma, la recette rangée dans le fichier. Les mesures ci-dessous confirment que
la recette de l'architecture tient ses promesses une fois la dérive de teinte et
l'arrondi à 8 bits appliqués.

## Mesures faites pour cette revue

Chaque nombre de cette section se rejoue :

```sh
node "docs/notes/Recherches/Plugin Palettes/mesurer-recette.mjs"
```

Le script de l'architecture vérifie les promesses sur des rampes à teinte
constante, en virgule flottante. Le plugin produira des rampes dont la teinte
dérive, arrondies à l'hexa. La mesure a rejoué six paires de rôles sur les
dix-sept dérives de Tailwind, dans les deux modes, avant et après arrondi à 8
bits par canal :

| Paire | Seuil | Minimum `soft` | Minimum `vivid` | Écart max dû à l'arrondi |
|---|---|---|---|---|
| texte 700 sur fond de page | 4,5 | 5,44 | 5,30 | 0,06 |
| texte 700 sur surface 100 | 4,5 | 5,10 | 5,03 | 0,03 |
| texte 800 sur surface 200 | 4,5 | 6,34 | 6,32 | 0,06 |
| on-solid sur solid 700 | 4,5 | 5,44 | 5,30 | 0,06 |
| bordure 600 sur fond de page | 3 | 3,78 | 3,66 | 0,04 |
| bordure 600 sur surface 100 | 3 | 3,54 | 3,48 | 0,03 |

Les minima sont tronqués à deux décimales, comme la planche les affiche.

Conclusion : sur ces paires, l'arrondi déplace un contraste de 0,06 au plus.
Les marges au-dessus du seuil restent d'au moins 0,53 pour le texte et 0,48
pour les bordures. Le plugin doit malgré tout recalculer chaque promesse sur
les hexas produits, parce qu'une dérive réglée à la main, une recette modifiée
ou un câblage déplacé peut consommer ces marges.

Cinq couleurs de référence, lues en OKLCH :

| Hexa | Clarté | Chroma | Part du plafond | Cran le plus proche | Conséquence |
|---|---|---|---|---|---|
| `#1E6FD9` | 0,555 | 0,179 | 0,89 | 600 | entre `soft` et `vivid` |
| `#5B6B7A` | 0,520 | 0,031 | 0,23 | 700 | plus terne que `soft` à 0,45 : la rampe sera plus vive que la référence |
| `#FFD400` | 0,881 | 0,181 | 1,00 | 200 | au plafond : `vivid` à 0,95 est un peu plus terne |
| `#0B1F4B` | 0,254 | 0,086 | 0,66 | 950 | plus sombre que le cran 950 : sa teinte se lit hors de la rampe |
| `#E4007C` | 0,596 | 0,242 | 1,00 | 600 | au plafond |

## Constats bloquants

### B1. La planche n'était pas décrite

La première version mentionnait une « planche de documentation » à l'étape 3,
sans contenu. Rien ne disait ce qu'une couleur affiche, comment une rampe
sombre se montre, où la planche se pose, ni ce qui arrive quand la recette
change après le dessin.

Correction : [section 9](./RECHERCHE-PLUGIN-PALETTES.md#9-sortie-1--la-planche)
décrit la page, le cadre d'une palette, la carte d'un cran (nom, hexa, OKLCH,
contrastes, seuil tenu, rôles), la table des rôles, la fraîcheur et la mise en
page.

### B2. La recette n'était pas déterministe

L'architecture promet que « deux outils qui lisent ce fichier produisent les
mêmes hexas ». Le texte laissait ouverts :

- la loi qui fait varier la teinte d'un bout à l'autre, et le sens du tour sur
  le cercle ;
- la clarté de référence des deux bouts, alors que la courbe sombre descend à
  0,18, sous le cran 950 clair à 0,27 ;
- l'arrondi : flottant ou hexa ;
- les valeurs sur lesquelles se calcule un contraste ;
- la façon dont la teinte sombre se « propose d'après le relevé Tailwind » : le
  tableau de l'architecture donne des plages, pas une fonction.

Correction : [section 6](./RECHERCHE-PLUGIN-PALETTES.md#6-le-moteur-de-couleur)
donne chaque formule, ses bornes et ses vecteurs de test.

### B3. Le fond de référence n'était pas défini

Chaque pastille devait montrer « son contraste contre le fond de page », sans
dire quel fond. Dans l'architecture, ce fond est le cran 50 d'un neutre que le
plugin ne fabrique pas.

Correction : deux fonds de référence saisis, un clair et un sombre, rangés dans
la recette. Leur défaut est le gris de clarté 0,975 et 0,18, soit le cran 50 des
deux courbes ([section 8.2](./RECHERCHE-PLUGIN-PALETTES.md#82-les-fonds-de-référence)).

## Constats forts

### F1. La dérive se réglait par deux teintes absolues

La première version faisait saisir « la teinte du bout clair et celle du bout
sombre », avec une troisième teinte facultative au cran 500. Deux teintes
absolues ne garantissent pas que la rampe passe par la teinte de la couleur de
référence, et la troisième teinte corrigeait ce défaut au cas par cas.

Correction : la couleur de référence est le pivot, sa teinte reste fixe à sa
clarté, et le designer règle deux dérives en degrés, une par bout. Un
préréglage Tailwind calcule ces deux dérives, et un éditeur graphique les
règle en direct ([sections 6.4](./RECHERCHE-PLUGIN-PALETTES.md#64-la-teinte-dun-cran),
[6.5](./RECHERCHE-PLUGIN-PALETTES.md#65-le-préréglage-tailwind) et
[12](./RECHERCHE-PLUGIN-PALETTES.md#12-léditeur-de-dérive)). Pour une référence
située dans la rampe, le préréglage rend au centième de degré les teintes de la
formule à deux teintes.

### F2. Le plugin supposait un emploi

La première version organisait les entrées par marque, avec une couleur
primaire et une secondaire. Le plugin n'a aucun moyen de savoir à quoi sert une
couleur : une palette peut servir une marque comme un utilitaire.

Correction : l'unité est la palette, une couleur de référence et ses réglages.
Son nom est facultatif et vient du designer ; une carte de la planche se nomme
par son profil et son cran, `vivid.700`
([section 2](./RECHERCHE-PLUGIN-PALETTES.md#2-vocabulaire)).

### F3. L'hexa d'entrée ne sert qu'à sa teinte

La recette fixe la clarté par la courbe et la chroma par la part du profil.
L'hexa ne transmet donc que sa teinte. La mesure ci-dessus montre l'effet :
`#5B6B7A`, une couleur presque grise, reçoit une rampe `soft` deux fois plus
vive qu'elle.

Correction : l'aperçu affiche la part de chroma de la référence à côté de
celles des profils et alerte quand elle sort de l'intervalle ; une part peut se
régler par palette ([section 11.3](./RECHERCHE-PLUGIN-PALETTES.md#113-alertes)).

### F4. Les réglages se contredisaient

La table rangeait la part de chroma dans les réglages de chaque couleur.
L'architecture la range dans la recette, commune à toutes, et la section
suivante disait « l'écran ne les modifie pas », puis « l'étape 1 sert aussi à
les régler ».

Correction : deux niveaux de réglage. La configuration de la recette,
ouverte par le bouton en forme d'engrenage, règle ce qui touche toutes les
palettes et l'annonce ; l'onglet Palettes ne règle que la palette ouverte ([section 8](./RECHERCHE-PLUGIN-PALETTES.md#8-les-entrées)).

### F5. Les « quatorze promesses » étaient ambiguës

Le script vérifie quatorze paires pour une rampe ; l'architecture compte sept
rôles par couleur. Sept de ces paires portent sur le survol et l'appui : elles
se déduisent d'un cran d'avance. Le profil visé par le câblage n'était pas dit.

Correction : le câblage est une proposition rangée dans la recette et affichée
sur la planche ([section 9.4](./RECHERCHE-PLUGIN-PALETTES.md#94-les-emplois)) ;
[section 11.2](./RECHERCHE-PLUGIN-PALETTES.md#112-promesses-des-emplois) énumère
les quatorze paires, leur calcul et le cas où elles ne se calculent pas.
Depuis, la décision D-O a retiré le câblage : la spécification porte une table
fixe des emplois, vérifiée sur les deux profils.

### F6. Le profil de couleur du document n'était pas traité

« L'étape 1 reste en sRGB » ne suffit pas. Figma interprète une peinture dans
le profil du document. Dans un document `DISPLAY_P3`, une pastille peinte avec
des composantes sRGB s'afficherait plus saturée que l'hexa écrit sur sa carte.

Correction : le plugin convertit la couleur dans l'espace du document avant de
peindre, et la recette Figma vérifie ce point
([section 6.7](./RECHERCHE-PLUGIN-PALETTES.md#67-peindre-dans-lespace-du-document)).

### F7. Les alertes n'avaient pas de mesure

« Une rampe trop proche d'une autre rampe » ne disait ni la distance, ni le
seuil, ni les rampes comparées.

Correction : distance Oklab sur les hexas produits, seuils dans la recette,
chaque paire de palettes comparée ([section 11.3](./RECHERCHE-PLUGIN-PALETTES.md#113-alertes)).

## Constats moyens

- **Le réemploi annoncé n'existe pas.** « Les contrôles de `tokens.json` en CI
  le réemploient » : l'architecture dit qu'aucun n'est écrit. Le moteur se range
  dans un paquet privé, qui entrera dans le kit quand un lecteur en aura besoin
  ([section 14.1](./RECHERCHE-PLUGIN-PALETTES.md#141-les-paquets)).
- **La recette exportée n'avait pas d'autorité.** Le plugin n'a pas de réseau,
  donc le JSON « versionné » est une copie téléchargée. La copie rangée dans le
  fichier fait autorité ; un import est un geste explicite, avec un écart montré
  ([section 10.1](./RECHERCHE-PLUGIN-PALETTES.md#101-la-recette-exportée)).
- **La maquette d'écran ne tenait pas.** Onze pastilles, deux profils, deux
  modes et une ligne de contrastes dépassent la largeur d'une fenêtre de
  plugin. L'aperçu garde des pastilles de 24 px et renvoie le détail à la
  planche ([section 13](./RECHERCHE-PLUGIN-PALETTES.md#13-linterface)).
- **L'essai d'un plugin existant est tranché.** Le mainteneur a décidé
  d'écrire le plugin dans ce dépôt.
- **Le seuil de contraste s'affichait arrondi.** WCAG n'arrondit pas : 4,499
  échoue à 4,5. Le plugin tronque l'affichage et compare la valeur brute
  ([section 6.6](./RECHERCHE-PLUGIN-PALETTES.md#66-contraste-et-distance)).
- **L'écriture des variables sort du premier périmètre.** La première version
  écrivait les rampes dans `brand` « aux chemins convenus », sans chemin
  convenu. Ce geste devient une option ultérieure, et ce qu'elle devra trancher
  est listé en [section 17](./RECHERCHE-PLUGIN-PALETTES.md#17-option-ultérieure--créer-les-variables).

## Ce qui reste hors de portée du plugin

Ces points de l'architecture ne se tranchent pas dans l'outil, et la
spécification les laisse en paramètres :

- les deux courbes de clarté et les parts de chroma. L'architecture les a
  choisies en comparant des rampes à l'écran, sans calcul qui les impose ; elles
  restent à ajuster sur des palettes réelles ;
- le câblage définitif des rôles, que le plugin propose sans l'imposer.

Le gamut de fabrication, laissé ouvert par la première version, est tranché
par l'architecture : sRGB, Display P3 écarté.
