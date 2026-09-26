# UCM Palettes : plan d’ergonomie, cinquième tour

## Résultat attendu

À la création d’une palette, le designer choisit une intensité ou deux. Une
palette à une intensité prend celle de sa couleur de référence, et ses
tokens n’ont pas de segment de profil : `theme.primary.700`. Une palette à
deux intensités porte Soft et Vivid, comme aujourd’hui. Ce choix se lit
ensuite partout : aperçu, intensités, dérive, garanties, interface de test,
fiches de l’onglet Planches et cadres de la planche. Un cadre montre les
usages de chaque profil qu’il porte, et non plus celui que le classement
automatique a élu. En thème Dark, les fonds teintés perdent la saturation
qui les rend criards. L’onglet Palettes ne génère plus rien : la génération
appartient à l’onglet Planches, dont les fiches sont refaites. Les Réglages
communs gagnent une carte qui dit quelles parties de la planche se
génèrent. Les onglets ont tous le même style, et le panneau s’ouvre 50 px
plus large.

Ce plan est destiné à l’agent qui réalisera les changements. Il remplace les
cases encore ouvertes du [quatrième plan](./PLAN-ERGONOMIE-PALETTES-V4.md),
dont les décisions restent valables quand ce document ne les remplace pas.
Le mainteneur a répondu aux six [questions](#questions-au-mainteneur) ; Q5.4
se confirme sur la maquette Y2.1. Il fait lui-même les tests d’interface et
la recette dans Figma.

## Autorités

Lire dans cet ordre :

1. les [retours du mainteneur](#retours-du-mainteneur-round-5) et ses
   [réponses aux questions](#réponses-du-mainteneur-aux-questions),
   conservés sans modification ;
2. l’[avis sur la question de fond](#avis-sur-la-question-de-fond) et les
   décisions ci-dessous ;
3. les [maquettes du lot Y2](./MAQUETTES-RECETTE-V5.html), une fois
   validées ; d’ici là, les [maquettes du quatrième
   tour](./MAQUETTES-RECETTE-V4.html) ;
4. le [quatrième plan](./PLAN-ERGONOMIE-PALETTES-V4.md), la
   [conception du format 3](./CONCEPTION-NUANCES-ET-FORMAT-3.md), les
   [décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md) et
   l’[inventaire des textes](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) ;
5. la [spécification](./RECHERCHE-PLUGIN-PALETTES.md), l’[architecture
   multi-marques](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
   et sa [revue critique](../Archi%20Tokens%20Multi-marques/SYNTHESE-CRITIQUE-ARCHI-MULTIMARQUES.md),
   [AGENTS.md](../../../../AGENTS.md) et
   [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

## Faits qui fondent les décisions

Relevés dans le code et les documents, et mesurés avec le moteur sur la
recette par défaut.

| Fait | Source | Conséquence |
|---|---|---|
| Le plugin génère quatre palettes par famille : Soft Light, Soft Dark, Vivid Light, Vivid Dark, toutes différentes. Soft et Vivid ont la même clarté à chaque cran ; ils diffèrent par la part de chroma, 0,45 et 0,95 du maximum que sRGB porte à cette clarté et à cette teinte | `recetteParDefaut`, `fabriquerPalette`, architecture section 3.2 | Une famille à une intensité n’a que deux palettes, Light et Dark |
| La couleur de référence `#1E6FD9` a une chroma de 0,179 ; elle est portée par Vivid. Soft 700 en Light vaut `#446493`, chroma 0,084. Vivid 700 vaut 0,179 en Light et 0,168 en Dark (`#4596FA`) | Mesure du moteur | Une couleur de marque saturée est un Vivid. Le moteur donne déjà en Dark des accents presque aussi vifs qu’en Light |
| En Dark, le cran 100 vaut en Vivid `#01154B` (chroma 0,104) pour le bleu, `#3B0203` (0,087) pour le rouge, `#02230B` (0,059) pour le vert ; en Soft, 0,048, 0,040 et 0,030. En Light, le cran 100 ne dépasse pas 0,079 | Mesure du moteur | Les fonds teintés du thème Dark sont les plus saturés de la palette. C’est là que la recommandation de désaturer s’applique |
| Un composant cite `theme.primary.vivid.700` ; la collection `theme` choisit la valeur Light ou Dark. `theme` compte 143 variables : 11 pour le neutre, 88 pour quatre utilitaires à deux profils, 44 pour deux rampes de marque à deux profils. `brand` en compte 89 par marque | Architecture section 2 | Deux rampes de marque à une intensité ramènent `theme` à 121 variables et `brand` à 45 par marque |
| Aucune variable `soft` ou `vivid` n’existe dans `intencial-library` ni dans UCM-Playground | Recherche dans les deux dépôts | Changer l’architecture des profils et les couleurs sombres ne casse aucun consommateur |
| La première recherche proposait des rampes `-dark` plus saturées que les rampes claires. La revue critique l’a jugé bloquant : une couleur douce ou vive sert dans les deux thèmes | Recherche section 6.5, revue sections 3.1 et 3.3 | Aucun profil ne se lie à un thème |
| Les usages d’un cadre montrent le profil porteur (`[PLA-18]`). Sans palette de base, le classement automatique élit le porteur sur la part de chroma de la référence : `#1E6FD9` est porté par Vivid, `#A0B599` par Soft | `[PLA-18]`, `[MOT-17]`, tableau des références de la spécification | Voilà l’alternance que le mainteneur constate : une référence saturée donne des usages Vivid, une référence douce des usages Soft |
| « Palette de base » est une bascule Auto, Soft, Vivid qui force le profil porteur et lui donne la part de chroma de la référence | `[ENT-11]`, `champs.ts` | Une palette à une intensité se calcule comme le profil porteur forcé d’aujourd’hui, dont on ne garde que la rampe |
| `FORMAT_RECETTE` vaut 3. Chaque champ ajouté à une palette a changé le format, parce que la validation refuse une clé inconnue | `recette.ts` | Les lots Y3 et Y7 passent la recette au format 4, en un seul passage |
| 33 lignes du moteur et du plugin parcourent `PROFILS`. Les promesses se jugent par mode et par profil, et le verdict d’un thème compte les deux profils | `promesses.ts`, `[PLA-07]` | Le changement de moteur touche promesses, alertes, rapport, planche et interface |
| « Palettes proches » se mesure sur les nuances 500, 600 et 700 de Vivid, en Light | `CRANS_PALETTES_PROCHES`, `aidePalettesProches` | Une palette à une intensité n’a pas de Vivid : la mesure doit changer de rampe |
| Le calque d’une pastille se nomme `{profil}/{mode}/{cran}` et sert de clé à l’option de création des variables | `[PLA-14]`, section 17 de la spécification | Une palette à une intensité nomme ses pastilles `{mode}/{cran}` |
| Le cadre de Bleu compte 1 632 calques avec les grilles, 466 sans. La section des usages ne montre qu’un profil | Lot X5.1 | Montrer les usages des deux profils ajoute une section par thème ; le nombre se remesure |
| Le modèle de planche reçoit déjà une option `grille`, que l’écriture transmet | `modeleDeCadre`, `ecriture/planche.ts` | La carte « Contenu des planches » étend un mécanisme existant |
| Un onglet actif prend `--fond-bloc`. Les bascules Soft et Vivid des Garanties et Écran et États de l’interface de test sont posées sur une carte, peinte du même `--fond-bloc`. Seuls les onglets de thème prennent `--fond-note` | `styles.css` | L’onglet actif des Garanties et de l’interface de test n’a pas de fond visible : c’est l’incohérence relevée |
| Le filet sous la zone de création a 5 px de chaque côté | `.choix-de-palette` | Passe à 15 px |
| La ligne du titre porte le bouton de génération et, au rang 3, l’enregistrement, l’état d’un cadre, la progression et « Afficher dans Figma » | Lots X4.1 à X4.3 | Les retirer défait X4 : `gesteDeGeneration`, le test `[UI-03]` du bouton et les états de galerie du titre suivent |
| Une fiche de l’onglet Planches pose « Afficher dans Figma », « Modifier la palette », puis la génération, tous en `bouton-discret` de 24 px. « Supprimer définitivement » est un bouton `danger` du socle, de 32 px au moins | `ficheDePalette`, `carteSupprimee`, `socle.css` | La différence de taille vient du socle, qui n’a pas de bouton de 24 px. Un bouton principal bleu dans une fiche pose le même problème |
| La carte d’une palette supprimée mêle 55 % du fond d’avertissement au fond des blocs | `.carte-supprimee` | Réduire la part, et la bordure avec |
| Les gestes globaux disent « Générer les 2 palettes qui ne sont pas à jour » et « Générer toutes les palettes » | N049, `dessinerTout` | Libellés dictés par ce retour |
| Dans la grille des États, l’anneau de focus déborde de 4 px (deux ombres de 2 px) et les rangées sont espacées de 8 px | `.essai-etats`, `.essai-rangee` | Deux anneaux de rangées voisines se touchent exactement |
| La fenêtre s’ouvre à 600 × 720, au plus petit à 500 × 520, et reprend la taille rangée à la fermeture précédente | `fenetre.ts` | Changer la taille par défaut n’agit pas sur une fenêtre déjà rangée à 600 × 720 |
| La carte Dérive de teinte écrit « Garanties : Soft ✓ · Vivid ✓ » et le lien « Voir les garanties » ; pour une palette libre, la même ligne écrit le nombre de nuances | `derive/editeur.ts` | Le retrait de la ligne emporte ce texte : vérifier qu’il se lit ailleurs |

## Avis sur la question de fond

Le mainteneur demandait deux choses : garder deux intensités pour certains
emplois sémantiques, et savoir si Vivid doit servir au thème sombre. Il a
retenu l’option B de Q5.1.

### Deux doublements, un seul choix

Le doublement Light et Dark existe dans tout système qui a un thème sombre.
Radix publie une échelle `blue` et une échelle `blueDark` ; Material tire
d’autres tons de sa palette ; Apple donne deux valeurs à chaque couleur
système. Le plugin calcule la palette Dark, `theme` la choisit, et le
designer n’a rien à décider.

Le doublement Soft et Vivid est un choix de conception : le designer choisit
un profil à chaque composant. C’est le seul levier sur le nombre de
palettes. Une famille à une intensité en a deux, une famille à deux
intensités en a quatre.

### Ce que disent les systèmes publiés

| Source | En thème sombre | Pour l’insistance |
|---|---|---|
| [Material Design 2, thème sombre](https://m2.material.io/design/color/dark-theme.html) | Couleurs désaturées : les tons 200 à 50 de la palette. Une couleur saturée vibre sur un fond sombre et y manque le contraste | Des tons de la même palette |
| [Material 3](https://m3.material.io/styles/color/system/how-the-system-works) | La même palette tonale. `primary` passe du ton 40 en clair au ton 80 en sombre ; la chroma disponible baisse d’elle-même aux tons clairs | `primary` et `primary-container` : deux tons, une chroma |
| [MUI](https://mui.com/material-ui/customization/dark-mode/) | Le thème sombre par défaut prend `blue[200]`, `#90CAF9`, pour `primary.main`. Les nuances « Accent » A100 à A700 viennent de la palette Material de 2014 et servent aux éléments d’accent, dans les deux thèmes | `main`, `light`, `dark` |
| [Apple, couleurs système](https://developer.apple.com/design/human-interface-guidelines/color) | Une valeur par apparence : `systemBlue` vaut `#007AFF` en clair et `#0A84FF` en sombre, un peu plus claire et plus vive | Hors du système de couleurs |
| [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | Une échelle sombre distincte. Le fond plein garde souvent son code : `blue9` vaut `#0090FF` dans les deux thèmes | Crans 3 à 5 pour un fond discret, 9 et 10 pour un fond plein, sur la même échelle |
| [Atlassian](https://atlassian.design/foundations/color), [GitHub Primer](https://primer.style/foundations/color) | Un jeu de valeurs par thème, mêmes noms | `danger` et `danger.bold` chez Atlassian, `muted` et `emphasis` chez Primer : deux crans d’une même rampe |

« Moins saturé en sombre » vise les grandes surfaces et les textes.
« Plus vif en sombre » vise les petits éléments pleins : bouton, badge,
anneau de focus. Apple et Radix font les deux à la fois.

### « Vivid pour le Dark », mesuré

Une couleur de marque saturée est déjà un Vivid : `#1E6FD9` a une chroma de
0,179, et Soft 700 en Light vaut `#446493`, chroma 0,084. Soft en Light
rendrait le thème clair terne. Vivid 700 vaut 0,168 en Dark contre 0,179 en
Light : les accents sombres sont déjà aussi vifs que les clairs. Lier Vivid
au thème Dark retirerait en outre l’erreur douce du thème sombre et l’alerte
vive du thème clair.

### Là où « moins saturé en sombre » s’applique

En Dark, les crans 50 à 300 servent de fonds teintés : `surface`,
`surface-card`, alertes et encarts. En Vivid, le cran 100 vaut `#3B0203`
pour le rouge et `#01154B` pour le bleu, deux fois la chroma de Soft. C’est
ce que Material déconseille. Le lot Y7 les désature, dans les deux profils
et dans les palettes à une intensité.

### Ce qui est retenu

- Une palette porte une intensité ou deux. Les utilitaires en portent deux,
  une couleur de marque une (Q5.1).
- Une palette à une intensité prend celle de sa couleur de référence. Ses
  tokens n’ont pas de segment de profil : `theme.primary.700` (Q5.2).
- Aucun profil ne se lie à un thème.
- Les fonds teintés du thème Dark se désaturent (Q5.6, lot Y7).

## Décisions

| Sujet | Décision |
|---|---|
| Intensités d’une palette | Une ou deux, choisies à la création et modifiables dans la configuration. Une recette de format 3 se lit avec deux intensités pour chaque palette. Deux cartes, « Une intensité » et « Deux intensités », chacune avec sa rampe ; libellé « Intensités » ; « Une » par défaut ; choix caché pour une palette libre ; passage de deux à une sans confirmation (Y2.1). Disposition P2 : nom et couleur de référence sur une ligne, puis une rangée pour le Modèle et une pour les Intensités. Textes des cartes : « Une seule variante, à l’intensité de la couleur de référence. » et « Une variante douce « Soft » et une variante vive « Vivid ». » (Y2.6) |
| Palette à une intensité | Elle se calcule comme le profil porteur forcé d’aujourd’hui (`[ENT-11]`) : la part de chroma de la référence, la référence exacte à son cran. Seule cette rampe se garde, en Light et en Dark. Elle n’a ni nom de profil, ni dérive propre à un profil, ni alerte « Profils confondus » |
| Palette de base | Remplacée par le choix des intensités. Pour une palette à deux intensités, un choix « Auto, Soft, Vivid » du profil qui porte la référence, affiché seulement dans ce cas, libellé « Référence exacte dans », avec « Auto a choisi Vivid » dessous, posé dans la carte « Deux intensités » (Q5.4, Y2.1, Y2.6) |
| Noms des tokens | `theme.{famille}.{cran}` pour une palette à une intensité, `theme.{famille}.{profil}.{cran}` pour deux. Pastilles de la planche : `{mode}/{cran}` et `{profil}/{mode}/{cran}` |
| Architecture | Les utilitaires gardent deux profils ; les rampes de marque passent à une intensité. `theme` compte 121 variables, `brand` 45 par marque |
| Fonds sombres | Les crans 50 à 300 du thème Dark perdent de la chroma, dans chaque profil, selon R3 : la part du profil multipliée par un facteur qui vaut 0,30 au cran 50 et remonte linéairement en clarté jusqu’à 1 au cran 400. Un curseur « Fonds du thème Dark » dans la carte Intensités des Réglages communs. L’alerte « Profils confondus » ignore ces crans ; une référence exacte qui y tombe garde ses octets (Y2.5). Le thème Light ne change pas |
| Onglet Palettes | La ligne du titre ne porte plus que « Palette [nom] ». Le bouton de génération, « Enregistré », « Afficher dans Figma », l’état du cadre et la progression la quittent. Les erreurs d’enregistrement et le conflit restent affichés : ce sont des constats, pas l’indication d’enregistrement |
| Configuration de la palette | Mêmes champs, même ordre et même disposition que la carte de création (Y2.1) |
| Dérive de teinte | La ligne de bilan et « Voir les garanties » se retirent de la carte |
| Onglets | Un seul style pour toutes les bascules à onglets : l’onglet actif a un fond, un peu plus clair que `--fond-note` au thème sombre de Figma, et distinct de la carte au thème clair. Les segments de choix d’une valeur (préréglage, modèle) gardent le leur |
| Interface de test | Les rangées de la grille des États s’espacent assez pour que deux anneaux de focus ne se touchent plus. Une palette à deux intensités a une bascule Soft et Vivid à droite d’Écran et États, ouverte sur le profil porteur ; une palette à une intensité n’en a pas (Y2.6) |
| Planche | Les rampes, les usages et les grilles des intensités de la palette, et d’elles seules. Une intensité : « La rampe », une section d’usages et une grille par thème, sans nom de profil. Deux intensités : une section d’usages par profil, « · Soft » puis « · Vivid », quel que soit le porteur (D1). Le spécimen de `surface` s’écrit « Fond léger » (Y2.7). `[PLA-18]` se récrit |
| Fiche d’une palette | Gestes dans l’ordre dicté : « Générer sur Figma » ou « Actualiser sur Figma », bouton principal bleu ; « Afficher » ; « Modifier ». Disposition A : le nom et l’état en pastille sur la première ligne, l’aperçu, la référence et les garanties sur une ligne, les gestes. « À jour » et « Lecture impossible » n’ont pas de premier geste ; un cadre jamais généré porte « Pas encore sur Figma » (Y2.2) |
| Taille des gestes d’une fiche | Le socle gagne une taille compacte de 24 px pour `createButton`. Les gestes d’une fiche et d’une carte supprimée la prennent, « Supprimer définitivement » et le bouton principal compris |
| Palette supprimée | Fond et bordure plus proches du fond de la page, teinte d’avertissement gardée |
| Gestes globaux | 10 px au-dessus et au-dessous. « Mettre à jour (2 palettes) » et « Générer tout (2 palettes) », en minuscules, au singulier pour une palette (Q5.5) |
| Contenu des planches | Une carte des Réglages communs, un interrupteur par partie du cadre, rangée dans la recette et comptée dans l’empreinte (Q5.3). Disposition C1, repliée en dernière carte : l’en-tête et les rampes toujours générés, la note, les usages et les grilles au choix, au moins un thème ; le nombre de calques de chaque partie et l’effet sur les cadres écrits dans la carte (Y2.3) |
| Fenêtre | 650 × 720 par défaut. Le plus petit format reste 500 × 520. Une taille rangée égale à l’ancien défaut, 600 × 720, s’ouvre à 650 × 720 ; toute autre taille rangée se garde |

## Reprise du quatrième plan

| Case du quatrième plan | Sort |
|---|---|
| X4.1 à X4.5, génération au niveau du titre | Défaites par Y1.2 : la génération appartient à l’onglet Planches |
| X8.2, tests de « Supprimer définitivement » et Ctrl+Z dans Figma | Reprise en Y8.3 |
| X8.3, recette dans Figma et constats restés ouverts | Reprise en Y8.4 |
| X8.4, temps et calques d’une génération de douze palettes | Reprise en Y8.5, après Y5 qui change le nombre de calques |

Les cases faites du quatrième plan restent acquises, sauf X4. Leur
comportement se conserve quand un lot déplace l’élément qui le porte : titre
qui suit le champ Nom sans voler le focus, désélection d’une nuance, cartes
repliées à l’ouverture, bouton danger du socle, badges AA et AAA.

## Ordre d’exécution

| Étape | Lots | Dépendance |
|---|---|---|
| Question de fond, règles et documents | Y0 | Relecture de ce plan |
| Corrections directes | Y1 | Y0.3 à Y0.5 |
| Maquettes à valider | Y2 | Y0 ; en parallèle de Y1 |
| Moteur : une ou deux intensités | Y3 | Y2.1 validée, revue indépendante (Y3.1) |
| Interface : le choix des intensités partout | Y4 | Y3 |
| Planche : intensités et contenu | Y5 | Y3, Y2.3 et Y2.7 validées |
| Onglet Planches : fiches | Y6 | Y2.2 validée, Y1.9 |
| Fonds sombres | Y7 | Y7.1 dès maintenant ; le reste après Y2.5 validée et la revue Y3.1, qui couvre aussi ce lot |
| Recette et clôture | Y8 | Parcours finis |

Y3 et Y7 changent la recette : leur code moteur sort dans la même version,
pour un seul passage au format 4. Chaque lot suit les règles de code, de
test et de relecture de CONTRIBUTING.md, met à jour la documentation qu’il
touche et ajoute ses textes à l’inventaire. Une capture ne prouve ni une
interaction ni une sauvegarde.

## Lot Y0 : question de fond, règles et documents

- [x] **Y0.1** Discuter Q5.1 avec le mainteneur à partir de l’[avis sur la
  question de fond](#avis-sur-la-question-de-fond) ; noter sa réponse dans
  ce plan. Fait : B, et les réponses aux cinq autres questions.
- [x] **Y0.2** Mesurer, pour `#1E6FD9` et `#16A34A`, la chroma absolue des
  crans 600 et 700 de chaque profil en Light et en Dark, avec le moteur.
  Fait, avec `#DC2626` en plus : les chiffres sont dans les faits et dans
  l’avis. La mesure a ajouté le constat des fonds sombres, repris en Y7.
- [ ] **Y0.3** Mettre à jour « Les surfaces d’UCM Palettes » dans
  CONTRIBUTING.md : génération dans l’onglet Planches seul, style unique des
  onglets, taille compacte des gestes d’une fiche.
- [ ] **Y0.4** Mettre à jour la spécification : `[UI-05]` et `[UI-11]`
  (ligne du titre sans génération), `[UI-01]` (taille par défaut), et les
  marqueurs des onglets et des fiches. Les intensités d’une palette,
  `[ENT-11]`, `[MOT-17]`, `[PLA-14]`, `[PLA-18]`, les fonds sombres et le
  contenu des planches entrent avec leurs lots.
- [ ] **Y0.5** Inventaire des textes : « Afficher », « Modifier », « Mettre à
  jour (N palettes) » et « Générer tout (N palettes) », dictés ; les
  libellés retirés de la ligne du titre et de la carte Dérive marqués
  retirés. Les textes nouveaux des lots entrent « À valider ».
- [ ] **Y0.6** Déclarer dans `galerie/etats.cjs` les états de ce plan :
  palette à une intensité, à deux ; fiche refaite ; carte « Contenu des
  planches » ; grille des États ; fonds sombres. Retirer ou remplacer les
  états « Titre et Générer sur Figma » et « Titre et Actualiser sur Figma ».
  Chaque état annoncé nomme la case qui le rendra atteignable.

Critère : l’agent place chaque élément de Y1 sans relire ce plan, à partir de
la spécification et de CONTRIBUTING.md.

## Lot Y1 : corrections directes

Fichiers : `styles.css`, `ongletPalettes.ts`, `derive/editeur.ts`,
`ongletPlanche.ts`, `interfaceDeTest.ts`, `textes.ts`, `fenetre.ts`,
`plugin-socle/src/ui/socle.css` et son `Button`.

- [ ] **Y1.1** 15 px au-dessus et au-dessous du filet qui sépare la zone de
  création de la palette ouverte.
- [ ] **Y1.2** Retirer de la ligne du titre le bouton de génération, la ligne
  de rang 3 (« Enregistré », état d’un cadre introuvable ou illisible,
  progression, « Afficher dans Figma »). Garder sous le titre les constats
  d’un enregistrement refusé ou d’un conflit. Pendant une génération lancée
  depuis l’onglet Planches, les onglets restent neutralisés. Retirer
  `gesteDeGeneration` s’il n’a plus d’appelant, et récrire le test `[UI-03]`
  sans le bouton.
- [ ] **Y1.3** Retirer de la carte Dérive de teinte la ligne « Garanties :
  Soft ✓ · Vivid ✓ » et le lien « Voir les garanties ». Vérifier que le
  nombre de nuances d’une palette libre se lit encore dans la configuration ;
  sinon, le garder dans la carte.
- [ ] **Y1.4** Un seul style d’onglet actif pour les bascules Thème Light et
  Thème Dark, Soft et Vivid des Garanties, Écran et États de l’interface de
  test : un fond visible sur la carte, un peu plus clair que `--fond-note`
  au thème sombre de Figma. Vérifier aux deux thèmes de Figma que l’onglet
  actif se distingue de la carte et du survol.
- [ ] **Y1.5** Grille des États : espacer les rangées d’au moins 12 px, pour
  que deux anneaux de focus de 4 px gardent un jour entre eux. Vérifier sur
  la rangée la plus haute.
- [ ] **Y1.6** Ajouter au socle une taille compacte de 24 px à
  `createButton`, pour toutes ses variantes. La donner à « Supprimer
  définitivement » et à « Afficher dans Figma » de la carte d’une palette
  supprimée. Le socle sert aussi UCM Exporter : vérifier que sa galerie ne
  change pas.
- [ ] **Y1.7** Carte d’une palette supprimée : baisser la part du fond
  d’avertissement et de sa bordure, pour une teinte proche du fond de la
  page, orange encore reconnaissable. Vérifier aux deux thèmes de Figma.
- [ ] **Y1.8** Gestes globaux de l’onglet Planches : 10 px au-dessus et
  au-dessous ; libellés « Mettre à jour (N palettes) » et « Générer tout (N
  palettes) », « (1 palette) » au singulier. La progression garde son
  libellé actuel.
- [ ] **Y1.9** Gestes d’une fiche, dans cet ordre : « Générer sur Figma » ou
  « Actualiser sur Figma », bouton principal compact ; « Afficher » ;
  « Modifier ». Un cadre à jour ou illisible n’a pas de premier geste,
  jusqu’à Y6. `data-geste` se garde : les tests visent les gestes par lui.
- [ ] **Y1.10** Fenêtre à 650 × 720 par défaut ; une taille rangée de
  600 × 720 s’ouvre à 650 × 720. Reprendre les tests de `fenetre.ts` et la
  taille de la recette visuelle.
- [ ] **Y1.11** Tests : ligne du titre sans génération ; fond de l’onglet
  actif distinct de la carte, par sa couleur calculée, pour les trois
  bascules ; écart entre deux anneaux de la grille des États ; hauteur égale
  des gestes d’une fiche et d’une carte supprimée ; ordre des gestes ;
  taille par défaut et reprise de l’ancien défaut. Chaque test vu rouge sur
  une mutation de ce qu’il protège.

Critère : aux deux thèmes de Figma, tous les onglets actifs se lisent de la
même façon, et les gestes d’une fiche ont une hauteur.

## Lot Y2 : maquettes à valider

Produites dans `MAQUETTES-RECETTE-V5.html`, que `generer-maquettes-v5.mjs`
écrit, au format des précédentes : panneau à 650 px, thème sombre de Figma,
couleurs et ratios calculés par le moteur pour `#1E6FD9`, `#16A34A`,
`#DC2626` et `#A0B599`. Chaque maquette montre la disposition en place quand
elle existe, au moins une autre, puis ses questions avec une recommandation.

- [x] **Y2.1** Choix des intensités, dans la carte de création et dans la
  configuration alignée sur elle. Au moins trois formes : segments « Une
  intensité · Deux intensités » ; un interrupteur « Soft et Vivid » ; deux
  cartes qui montrent chacune une rampe d’aperçu. Des libellés qui disent
  l’usage sans le jargon. Pour deux intensités, le choix « Auto, Soft,
  Vivid » du profil qui porte la référence (Q5.4). Ce que l’aperçu, les
  Intensités, la Dérive, les Garanties et l’interface de test montrent dans
  chaque cas ; pour une intensité, ce que la carte Intensités garde, puisque
  la part est celle de la référence. Produite : F1 segments « Intensités :
  Une · Deux » sous le Modèle, F2 interrupteur, F3 deux cartes avec leur
  rampe ; l’onglet entier à une et à deux intensités ; la carte Intensités
  retirée (I1) ou en lecture seule (I2). Recommandé : F1, libellés a, « Une »
  par défaut, I1, une bascule Soft et Vivid dans l’interface de test, pas de
  confirmation au passage de deux à une, choix caché pour une palette libre.
  Réponse : F3, avec le texte « Une variante douce "Soft" et une variante
  vive "Vivid" » pour la carte « Deux intensités » ; libellés a ; porteur,
  « Une » par défaut, I1, pas de confirmation et palette libre acceptés. La
  réponse à la question 6 vise la disposition des éléments, empilés dans la
  troisième colonne. Second passage en Y2.6.
- [x] **Y2.2** Fiche d’une palette dans l’onglet Planches : hiérarchie entre
  nom, état du cadre, aperçu, référence et garanties, et les trois gestes
  dans l’ordre de Y1.9. Deux dispositions au moins, dont une plus compacte.
  Chaque état du cadre, dont « À jour », sans premier geste ou avec un
  geste inactif. Produite : A0 en place, gestes réordonnés ; A, l’état en
  pastille à côté du nom ; B, une ligne par palette ; C, B regroupé par
  état ; les cinq états en A et en B. Recommandé : A ; « À jour » et
  « Lecture impossible » sans premier geste ; « Pas encore sur Figma » pour
  un cadre jamais généré. Réponse : A, et les quatre autres recommandations.
  Validée.
- [x] **Y2.3** Carte « Contenu des planches » des Réglages communs : un
  interrupteur par partie du cadre (rampes, note sous les rampes, usages,
  grilles de contrastes, thème Light, thème Dark), et les règles qui les
  lient. Proposer ce qui ne se désactive pas, par exemple l’en-tête et au
  moins un thème. Montrer l’effet annoncé : les cadres passeront « À mettre
  à jour », et le nombre de calques d’un cadre. Produite : C1, une liste
  d’interrupteurs avec le nombre de calques de chaque partie ; C2, la même
  liste et un schéma du cadre. En-tête et rampes toujours générés, au moins
  un thème. Recommandé : C1, repliée en dernière carte. Réponse : les quatre
  recommandations. Validée.
- [x] **Y2.4** Cadre de la planche pour une palette à une intensité et à
  deux. Pour deux, au moins deux dispositions des usages : une section par
  profil, ou deux colonnes Soft et Vivid par état. Nombre de calques de
  chacune pour Bleu. Produite sur le modèle de planche du plugin, rendu en
  HTML : une intensité, 1 008 calques grilles comprises ; D1, une section
  par profil, 1 964 ; D2, deux colonnes par état, 1 918 ; D3, deux lignes
  par usage, 1 936. Le cadre d’aujourd’hui en compte 1 662 (496 sans les
  grilles), et non plus 1 632 comme au lot X5.1. Recommandé : D1, Soft puis
  Vivid quel que soit le porteur. Réponse : maquette incomprise, à
  restructurer. Second passage en Y2.7.
- [x] **Y2.5** Fonds sombres : les règles de Y7.2 appliquées aux crans 50 à
  300 du thème Dark, sur les quatre références, en alerte, en encart et en
  carte, à côté des couleurs actuelles. Le réglage qui les porte dans les
  Réglages communs, et sa valeur par défaut. Produite, avec Rouge en Soft en
  plus du profil porteur de chaque référence, le pire cas des garanties sur
  360 teintes et les nuances où ≈ apparaîtrait. Recommandé : R3 à 0,30, un
  curseur « Fonds du thème Dark » dans la carte Intensités, et l’alerte
  « Profils confondus » muette sur les nuances 50 à 300 du thème Dark.
  Réponse : les cinq recommandations. Validée.

Second passage, après les [retours du
mainteneur](#retours-du-mainteneur-sur-les-maquettes-y2), dans le même
fichier. Chaque question y a son bloc, ses écrans lettrés au-dessus de ses
choix :

- [x] **Y2.6** Choix des intensités, F3 retenue : la disposition de la carte
  (P1, trois colonnes puis les cartes ; P2, une rangée par choix ; P3,
  libellés à gauche), la disposition retenue à une et à deux intensités en
  création et en configuration, le texte de la carte « Une intensité », et
  l’interface de test à deux intensités, avec ou sans bascule Soft et
  Vivid. Recommandé : P2 ; « Une seule variante, à l’intensité de la
  couleur de référence. » ; guillemets français ; la bascule. Réponse : P2,
  mais le choix « Référence exacte dans » se pose dans la carte « Deux
  intensités » ; texte b ; la bascule. Validée.
- [x] **Y2.7** Cadre de la planche, restructuré : le constat de
  l’alternance en schéma (Bleu en Vivid, Sauge en Soft), le cadre à une
  intensité, puis D1, D2 et D3, chacune en schéma et en extrait du vrai
  cadre à taille réelle, avec ses calques. Une question ajoutée : le
  spécimen de `surface` s’écrit « Soft » et se lit comme le profil dans la
  section « · Vivid ». Recommandé : le cadre à une intensité tel quel ; D1 ;
  « Fond léger ». Réponse : les trois recommandations. Validée.

Critère : le mainteneur valide ou corrige chaque maquette sans avoir à
imaginer une interaction.

## Lot Y3 : moteur, une ou deux intensités

Après la validation de Y2.1. Fichiers : `packages/couleur/src/*`,
`plugin-palettes/src/presentation.ts`, `rapport.ts`, `edition.ts`,
`configuration.ts`.

- [ ] **Y3.1** Faire relire ce lot et le lot Y7 par un agent de revue
  indépendant avant d’écrire le code. Trancher point par point, dire ce qui
  est retenu et ce qui est rejeté, avec la raison, et vérifier chaque
  affirmation dans le code.
- [ ] **Y3.2** Recette : un champ facultatif marque une palette à une
  intensité ; absent, la palette en a deux. Son nom se fixe à la revue. Une
  palette libre n’en porte pas. Une palette à une intensité ne porte ni
  `base`, ni dérive par profil, ni parts par profil. `FORMAT_RECETTE` passe à
  4 avec Y7 ; une recette de format 3 se lit sans changement.
- [ ] **Y3.3** Rampes et ancrage : une palette à une intensité se calcule
  comme le profil porteur forcé de `[ENT-11]`, à la part de chroma de la
  référence, référence exacte à son cran ; seule cette rampe se garde, en
  Light et en Dark. Une palette à deux intensités garde `[MOT-17]` et
  `[ENT-11]`. Traiter à la revue une référence presque grise (`[MOT-18]`).
- [ ] **Y3.4** Promesses et alertes : seules les rampes présentes se jugent.
  Le verdict d’un thème compte les rampes présentes. « Profils confondus »
  se tait pour une palette à une intensité. « Palettes proches » compare
  deux palettes sur une rampe que chacune porte ; la règle se fixe à la
  revue et s’écrit dans la spécification.
- [ ] **Y3.5** Rapport, export de la recette et empreinte : ils ne listent
  que les rampes présentes, sous les noms de la décision « Noms des
  tokens ». L’empreinte d’un cadre change avec le nombre d’intensités.
- [ ] **Y3.6** Spécification : `[MOT-17]`, `[ENT-11]`, section 11 et les
  alertes touchées. Architecture multi-marques : sections 1 à 4, chemin
  d’une couleur à une intensité, comptes de `theme` et de `brand`, exemples
  d’exceptions ; la [vue illustrée](../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html)
  suit.
- [ ] **Y3.7** Tests : une recette de format 3 relue avec deux intensités par
  palette ; une palette à une intensité sans seconde rampe, sans seconde
  série de garanties, sans alerte « Profils confondus », et dont la rampe
  contient la référence exacte ; le verdict compté sur les rampes
  présentes ; le champ refusé sur une palette libre ; « Palettes proches »
  entre une palette à une intensité et une palette à deux. Chaque loi vue
  rouge sur une mutation.

Critère : une recette de format 3 se lit et se juge comme avant, et une
palette à une intensité n’a ni rampe, ni garantie, ni alerte d’un second
profil.

## Lot Y4 : interface, le choix des intensités partout

Après Y3. Disposition de Y2.6 validée.

- [ ] **Y4.1** Carte de création et configuration de la palette : le choix
  des intensités, et la configuration alignée sur la création. « Palette de
  base » se retire ; le choix du profil porteur ne paraît qu’avec deux
  intensités.
- [ ] **Y4.2** Aperçu et nuancier : une rangée par thème pour une intensité,
  sans nom de profil ; le repère ≈ seulement avec deux.
- [ ] **Y4.3** Intensités d’une palette, selon Y2.1. Les Intensités des
  Réglages communs gardent Soft et Vivid, qui servent aux palettes à deux
  intensités.
- [ ] **Y4.4** Dérive de teinte : un seul tracé et aucun lien de
  synchronisation pour une palette à une intensité.
- [ ] **Y4.5** Garanties de contraste : la bascule Soft et Vivid se retire
  pour une palette à une intensité. Le détail d’une nuance ne cite que les
  rampes présentes.
- [ ] **Y4.6** Interface de test : la rampe peinte selon Y2.6.
- [ ] **Y4.7** Aperçu compact d’une fiche de l’onglet Planches : les rampes
  présentes.
- [ ] **Y4.8** Tests d’interface : chaque choix change l’aperçu, les
  Garanties et l’interface de test ; changer le nombre d’intensités d’une
  palette générée fait passer son cadre « À mettre à jour ». Chaque test vu
  rouge sur une mutation.

Critère : le designer ne voit jamais un profil que sa palette ne porte pas.

## Lot Y5 : planche, intensités et contenu

Après Y3, et la validation de Y2.3 et Y2.7.

- [ ] **Y5.1** Rampes et grilles : celles des intensités présentes. Une
  palette à une intensité nomme ses pastilles `{mode}/{cran}` (`[PLA-14]`).
  La note sous les rampes n’explique ≈ qu’avec deux intensités.
- [ ] **Y5.2** Usages : ceux de chaque profil présent, disposés selon Y2.7.
  Récrire `[PLA-18]`. L’en-tête nomme le profil porteur seulement avec deux
  intensités.
- [ ] **Y5.3** Contenu des planches : le modèle reçoit les parties à
  dessiner, à la place de l’option `grille`. Le réglage se range dans la
  recette. Une partie retirée change l’empreinte, et les cadres passent
  « À mettre à jour ».
- [ ] **Y5.4** Recompter les calques du cadre de Bleu à une et à deux
  intensités, toutes parties dessinées, contre 1 632 aujourd’hui.
- [ ] **Y5.5** Tests : aucun cadre ne montre une rampe absente ; une palette
  à deux intensités montre les usages des deux profils ; chaque partie
  désactivée disparaît du modèle et change l’empreinte ; les parties qui ne
  se désactivent pas restent. Chaque loi vue rouge sur une mutation.

Critère : deux palettes de même configuration donnent deux cadres de même
structure, quelle que soit la saturation de leur référence.

## Lot Y6 : onglet Planches, fiches

Après la validation de Y2.2.

- [ ] **Y6.1** Refaire la fiche d’une palette selon Y2.2, gestes de Y1.9
  compris.
- [ ] **Y6.2** Le premier geste de chaque état du cadre, dont « À jour »,
  selon Y2.2.
- [ ] **Y6.3** Tests : ordre et variantes des gestes par état ; focus rendu
  au geste après une génération. Chaque test vu rouge sur une mutation.

Critère : le designer lit en un regard quelles palettes sont à générer, et
les génère d’un clic depuis leur fiche.

## Lot Y7 : fonds sombres

Réponse du mainteneur à Q5.6 : maintenant. Les crans de fond du thème Dark,
50 à 300, perdent de la chroma, dans chaque profil et dans les palettes à
une intensité. Les accents, 500 à 800, gardent la leur. Le thème Light ne
change pas.

- [x] **Y7.1** Mesurer la chroma des crans 50 à 300 du thème Dark, par
  profil, sur les 360 teintes, et la comparer aux crans 1 à 5 des échelles
  sombres de Radix et aux tons de surface de Material 3 en sombre. Rapporter
  les chiffres dans ce plan avant la maquette. Fait par
  [`mesurer-fonds-sombres.mjs`](./mesurer-fonds-sombres.mjs) ; chroma
  absolue, médiane puis maximum sur les teintes :

  | Nuance Dark | L | Soft | Vivid | Radix, même clarté | Part Radix |
  |---|---|---|---|---|---|
  | 50 | 0,180 | 0,022 / 0,056 | 0,047 / 0,117 | pas 1 : 0,014 / 0,026 | 0,24 |
  | 100 | 0,225 | 0,028 / 0,070 | 0,058 / 0,147 | pas 2 : 0,019 / 0,032 | 0,32 |
  | 200 | 0,275 | 0,034 / 0,085 | 0,071 / 0,179 | pas 3 : 0,047 / 0,071 | 0,57 |
  | 300 | 0,330 | 0,040 / 0,102 | 0,085 / 0,215 | pas 4 : 0,070 / 0,102 | 0,76 |

  Radix : les 25 échelles sombres colorées de `@radix-ui/colors` 3.0.0. Sa
  part de chroma monte du fond le plus sombre vers les accents ; celle du
  moteur est constante, 0,45 ou 0,95. Material 3 (`material-color-utilities`
  0.3.0, schéma TonalSpot en sombre) peint `surface` à L 0,19 et ses
  conteneurs de surface à L 0,24 à 0,29 d’un neutre à chroma 0,010 à 0,016,
  et `primaryContainer` à L 0,40, chroma 0,09 ; le schéma Vibrant monte ses
  surfaces à 0,02. Nos fonds Vivid ont deux à trois fois la chroma de Radix
  aux mêmes clartés.
- [x] **Y7.2** Écrire au moins trois règles candidates pour la maquette
  Y2.5 : un plafond de chroma absolue sous une clarté donnée ; une part de
  chroma propre aux fonds sombres ; une part qui décroît vers le bout sombre
  de la courbe Dark. Pour chacune, le réglage que le designer manipule.
  Fait, sur les nuances 50 à 300 du thème Dark, dans chaque profil, la
  référence exacte gardée :
  R1, la chroma bornée à une valeur absolue, réglage « Chroma maximale des
  fonds sombres », 0,045 ;
  R2, la part du profil multipliée par un facteur, réglage « Intensité des
  fonds sombres », 0,5 ;
  R3, la part multipliée par un facteur qui vaut sa valeur au cran 50 et
  remonte linéairement en clarté jusqu’à 1 au cran 400, réglage « Fonds du
  thème Dark », 0,30 : Vivid y prend 0,28, 0,42, 0,57 et 0,74, près des
  parts de Radix.
  Sur les 360 teintes et les deux profils, les trois règles tiennent les
  neuf paires qui touchent `surface` et `surface-card` : le pire cas passe
  de 5,04:1 à 4,93:1 au plus bas (4,95:1 avec R3) pour `text` sur `surface`, et de 3,53:1 à
  3,44:1 pour `border-control` et `focus` sur `surface`. R3 fait
  apparaître ≈ aux nuances 50 (et 100 pour Vert et Sauge) des quatre
  références.
- [ ] **Y7.3** Moteur et recette : la règle retenue en Y2.5, son réglage et
  sa valeur par défaut, dans le même passage au format 4 que Y3. Une recette
  de format 3 prend la valeur par défaut : aucune variable ne dépend encore
  de ces couleurs, et tous les cadres passent « À mettre à jour ».
- [ ] **Y7.4** Garanties : une baisse de chroma à clarté égale change la
  luminance relative. Rejouer `verifier-courbes.mjs` et la garantie des
  courbes : `text` sur `surface` à ses trois états, `text` et
  `border-control` sur `surface-card`, sur les 360 teintes. Reporter les
  minimums dans l’architecture, section 4.
- [ ] **Y7.5** Interface et documents : le réglage à la place que Y2.5 fixe ;
  spécification, architecture section 3.2, CONTRIBUTING.md.
- [ ] **Y7.6** Tests : le thème Light identique à l’octet ; en Dark, les
  crans 50 à 300 sous la règle et les crans 500 à 800 inchangés ; les
  garanties tenues ; une recette de format 3 relue avec la valeur par
  défaut. Chaque loi vue rouge sur une mutation.

Critère : en Dark, une alerte ou un encart teinté ne sature plus, les
boutons gardent leur vivacité, et toutes les garanties tiennent.

## Lot Y8 : recette et clôture

- [ ] **Y8.1** Reprendre les tests d’interface que Y1 à Y7 cassent, en
  gardant ce que chacun protégeait encore.
- [ ] **Y8.2** Mettre à jour AGENTS.md si la carte du code change, la
  spécification et les liens des plans. Marquer le quatrième plan comme
  remplacé pour ses cases ouvertes.
- [ ] **Y8.3** (ex-X8.2) Constater dans Figma qu’un seul Ctrl+Z après
  « Supprimer définitivement » rend le cadre et son suivi. Au mainteneur.
- [ ] **Y8.4** (ex-X8.3) Construire code et interface, recharger le plugin
  dans la copie partagée, puis exécuter la recette ci-dessous avec les
  constats restés ouverts du quatrième plan. Au mainteneur.
- [ ] **Y8.5** (ex-X8.4) Mesurer dans Figma le temps et le nombre de calques
  d’une génération de douze palettes, après Y5 ; appliquer `[PLA-24]` au
  résultat. Au mainteneur.

Critère de clôture : contrôles du dépôt, typecheck, build, tests d’interface
de Palettes tous verts, et recette Figma terminée.

## Recette mainteneur

| Scénario | Résultat observable | Lots |
|---|---|---|
| Créer `primary` à une intensité | Une rangée par thème dans l’aperçu, sans nom de profil ; ni bascule Soft et Vivid, ni seconde série de garanties ; la référence exacte dans la rampe | Y3, Y4 |
| Passer cette palette à deux intensités | Deux rangées par thème, bascule des Garanties revenue, choix du porteur visible, cadre « À mettre à jour » | Y4 |
| Générer une palette saturée et une palette douce, toutes deux à deux intensités | Deux cadres de même structure, usages Soft et Vivid dans chacun | Y5 |
| Désactiver les grilles dans « Contenu des planches » | Tous les cadres « À mettre à jour » ; après génération, plus de grilles | Y5 |
| Comparer une alerte `danger` en Dark avant et après Y7 | Fond moins saturé, bouton plein inchangé, garanties tenues | Y7 |
| Ouvrir une palette | « Palette [nom] » seul sur la ligne du titre | Y1 |
| Parcourir les onglets Thème, Soft et Vivid, Écran et États | Même fond pour chaque onglet actif, visible sur la carte | Y1 |
| Tabuler dans la grille des États | Deux anneaux de focus voisins ne se touchent pas | Y1 |
| Lire l’onglet Planches | Gestes Générer, Afficher, Modifier de même hauteur ; carte supprimée discrète ; libellés globaux avec le nombre de palettes | Y1, Y6 |
| Ouvrir le plugin sans taille rangée, puis avec 600 × 720 rangé | 650 × 720 dans les deux cas | Y1 |

La recette visuelle couvre 500 × 520 et 650 × 720, les deux thèmes de Figma,
les deux thèmes de palette, une et deux intensités, un nom long et plusieurs
garanties en échec.

## Questions au mainteneur

| Question | Ce qui en dépend | Recommandation |
|---|---|---|
| **Q5.1** Réponse : B. Que deviennent les deux profils ? A : deux profils pour chaque palette. B : chaque palette choisit ; les utilitaires portent les deux, une couleur de marque un seul. C : Soft au thème Light, Vivid au thème Dark, sous un seul nom. D : un seul profil ; l’insistance passe par les crans | Y3, architecture | **B**. C rend la marque terne en Light et retire le choix d’insistance dans chaque thème |
| **Q5.2** Réponse : a, sans profil. Une palette à un profil : quelle intensité ? a : celle de la référence, qui reste exacte. b : la part commune du profil, avec la référence exacte à son seul cran, au prix d’un saut de chroma. c : la part commune, et la référence n’est plus exacte. Sous-question : le token garde-t-il un segment de profil ? | Y2.1, Y3 | **a**, sans segment de profil : `theme.primary.700`. Le choix de création devient « une intensité » ou « deux intensités » |
| **Q5.3** Réponse : la recette. Le contenu des planches se range-t-il dans la recette ou dans les réglages locaux du plugin ? | Y5.3 | La recette : la planche est commune au fichier |
| **Q5.4** Réponse : d’accord, à confirmer sur maquette. Où se choisit le profil porteur d’une palette à deux intensités ? | Y2.1 | Un choix « Auto, Soft, Vivid » affiché seulement avec deux intensités |
| **Q5.5** Réponse : minuscule. « Palettes » garde-t-il sa majuscule dans les gestes globaux ? | Y1.8 | Minuscule, et le singulier pour une palette |
| **Q5.6** Réponse : maintenant. Les fonds Vivid du thème Dark, très saturés, se traitent-ils dans ce plan ou après la recette ? | Y7 | Après la recette ; le mainteneur a choisi de les traiter maintenant, en lot Y7 |

## Hors périmètre

- Une chroma propre au thème Dark pour les accents, crans 500 à 800 : le
  moteur les donne déjà presque aussi vives qu’en Light.
- Création de variables et ajout aux tokens du design system.
- Relecture des textes déjà hors du quatrième plan.
- Nombre de nuances différent d’une marque à l’autre en mode standard.

## Réponses du mainteneur aux questions

Texte d’origine.

```text
Q5.1 : B
Q5.2 : A, sans profil
Q5.3 :  la recette
Q5.4 : je suis ok, la maquette confirmera
Q5.5 : minuscule
Q5.6 : maintenant
```

## Retours du mainteneur, round 5

Texte d’origine, indentation rétablie d’après la structure des sujets.

```text
Retours round 5 :

Zone de création d'une nouvelle palette :
  mettre 15px d'espace top et bottom entre la ligne séparatrice et les
  deux autres contenus

Changement majeur du moteur :
  Lors de la création d'une nouvelle palette, on laisse la possibilité
  de choisir si on veut créer une palette soft uniquement, vivid
  uniquement ou les deux. ça se répercute dans tout l'affichage
  ensuite et sur les planches.
  Ca nécessite à repenser complètement plusieurs choses en
  terme de structure, de wording et d'UX/UI :
    Switch "palette de base" : ça ne sera plus très compréhensible
    Comment choisir entre palette soft/vivid/les deux ? de façon
    simple et compréhensible ?
  Il faut créer une nouvelle maquette claude à faire valider

Zone de configuration de la palette:
  On supprime le bouton "actualiser sur Figma" / "créer sur figma"
  etc.
  On considère que la création d'une planche est une fonctionnalité
  de l'onglet Planches
  On enlève donc aussi les mentions "enregistré", "afficher dans
  Figma"
  Il faut mettre à jour le menu de configuration de la palette pour
  qu'il soit aligné avec le menu de création de la palette

Zone de dérive de teinte :
  retirer "Garanties : Soft ✓ · Vivid ✓Voir les garanties"

Onglets de façon générale :
  incohérence entre les onglets "Thème Light" / "Thème Dark" et
  les autres onglets :
    "Soft" / "Vivid" dans Garanties de contraste
    "Ecran" / "Etats" dans Interface de test
  Il faut que tous les onglets aient un fond quand ils sont actifs
  Rendre le fond légèrement plus clair

Interface de test :
  dans l'onglet Etats, les boutons avec un focus ring se touchent, il
  faut plus espacer les lignes

Planches :
  Les palettes doivent afficher soit soft, soit vivid, soit les deux en
  fonction de la config
  Boutons d'action :
    position 1 : Générer sur Figma en bleu (action principale) ou
    Actualiser sur Figma
    position 2 : Afficher
    position 3 : Modifier
  Planches supprimées :
    le bouton "supprimer définitivement" est plus gros que les autres
    boutons, il faut harmoniser
    faire en sorte que le orange de la card soit plus discret, plus
    proche en teinte du fond de la page
  Boutons d'action globaux :
    mettre 10px top et bottom d'espace avec les autres contenus
    revoir wording :
      "Mettre à jour (2 Palettes)
      Générer tout (2 Palettes)
  Revoir design et hierarchie des informations affichées dans les card
  des planches
  → faire maquette claude à valider

Global :
  largeur du plugin un peu plus élevée pour laisser vivre l'écran de
  l'interface de test. Ajouter 50px, c'est suffisant je pense

Réglages communs
  Ajouter une section où on peut configurer le contenu générer dans
  les planches sur Figma :
  mettre des switch pour activer ou désactiver toutes les sous
  parties des planches.
  Générer maquette claude à faire valider

Planches générées sur Figma :
  je ne comprend pas la génération des planches, des fois on génère
  avec la palette vivid (grilles, exemples etc) et des fois c'est avec la
  palette soft. Normalement il faudrait faire les deux. Il faut réfléchir de
  nouveau à ce sujet.

Interrogation fondamentales à discuter, en lien avec le sujet "Archi
Tokens Multi-marques" Lis les docs de ce sujet puis considère ça :

  Les raisons pour lesquelles j'ai demandé à ce que le plugin génère
  des palettes soft et vivid sont :

  1. J'ai besoin d'avoir deux variation de teinte pour certains
     éléments sémantiques (success, error) en fonction de certains
     cas d'usage car si on affiche beaucoup d'infos error (ou autre) il
     faut que ça soit doux à l'oeil mais si on affiche une error critique
     en alerte, il faut que ça saute aux yeux.

  2. en travaillant sur le dark mode d'un autre projet assez massif et
     qui utilise en partie la nomemclature de couleur MUI (palette
     primary + Accent), avec le lead designer on était parti sur le fait
     que ce qui différencie une palette primary utilisée en light mode
     et une palette Accent utilisée en dark mode c'est que les Accent
     sont plus saturé, plus bright, POP plus pour le dark mode. Donc
     j'en ai conclu que pour faire mon architecture parfaite de token je
     pourrais utiliser les palettes vivid pour le dark mode.

  Cependant :

  le plugin génère pour chaque palette (soft, vivid) en light mode,
  une palette correspondant mais en dark mode. et les deux
  palettes sont différentes car elles répondent à des exigences de
  contraste différentes. Donc pour un usage (brand color primary,
  success etc) on aurait 4 palettes (soft light, vivid light, soft dark,
  vivid dark). Ca me semble être beaucoup trop.

  J'ai regardé des tutos sur le dark mode et les designer avaient
  l'air de dire que pour le dark mode on utilise plutôt des couleurs
  moins saturées qu'en light mode.

  Donc je suis un peu perdu et je ne sais plus trop quoi faire à ce sujet
  et ça impacte deux choses :
    l'archi globale potentielle de mes tokens
    le sujet actuel de ce plugin et la pertinence de générer ces
    palettes

  Réfléchis à tout ça, quel es ton avis, qu'en dis la littérature à ce sujet
  ?
```

## Retours du mainteneur sur les maquettes Y2

Texte d’origine.

```text
Y2.1 · Choix des intensités
1. -> F3 mais revoir les textes "Une douce, Soft, et une vive, Vivid ; chaque composant choisit. Pour les couleurs d’état : succès, erreur." en juste "Une variante douce "Soft" et une variante vive "Vivid"
2. a
3.ok
4.ok
5. ok
6. il faut revoir la disposition des éléments, tout est dans une colonne sur la droite, c'est étrange
7. ok
8. ok

mais recommence ton layout car je suis pas sur d'avoir bien répondu, on comprend pas le lien entre les questions et les écrans

Y2.2 · Fiche d’une palette
1. A
2. ok
3. ok
4.ok
5.ok

Y2.3 · Contenu des planches
1. ok
2. ok
3. ok
4. ok

Y2.4 · Cadre de la planche
j'ai pas compris, à restructurer

Y2.5 · Fonds sombres
ok pour tout
```

Second passage, texte d’origine, puis la précision demandée sur
« raccourcir » : elle vise les textes des maquettes, et le cadre D1 reste
tel quel.

```text
Y2.6 · Choix des intensités, second passage
p2 mais mettre "référence exacte dans" dans la card des deux intensités

Question 2
b
Question 3
b

Y2.7 · Cadre de la planche, second passage
Question 1
ok
Question 2
D1 mais il faudrait raccourcir tout ça drastiquement je pense
Question 3
b
```

```text
Pour D1, « raccourcir tout ça drastiquement » vise quoi ? Les textes des maquettes
```
