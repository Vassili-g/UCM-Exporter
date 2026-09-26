# UCM Palettes : plan d’ergonomie, cinquième tour

## Résultat attendu

À la création d’une palette, le designer choisit les profils qu’elle porte :
Soft seul, Vivid seul, ou les deux. Ce choix se lit ensuite partout :
aperçu, intensités, dérive, garanties, interface de test, fiches de l’onglet
Planches et cadres de la planche. Un cadre montre les usages de chaque
profil qu’il porte, et non plus celui que le classement automatique a élu.
L’onglet Palettes ne génère plus rien : la génération appartient à l’onglet
Planches, dont les fiches sont refaites. Les Réglages communs gagnent une
carte qui dit quelles parties de la planche se génèrent. Les onglets ont
tous le même style, et le panneau s’ouvre 50 px plus large.

Ce plan est destiné à l’agent qui réalisera les changements. Il remplace les
cases encore ouvertes du [quatrième plan](./PLAN-ERGONOMIE-PALETTES-V4.md),
dont les décisions restent valables quand ce document ne les remplace pas.
Il pose aussi une question de fond, [Q5.1](#questions-au-mainteneur), sur la
raison d’être des deux profils ; le lot moteur Y3 attend sa réponse. Le
mainteneur fait lui-même les tests d’interface et la recette dans Figma.

## Autorités

Lire dans cet ordre :

1. les [retours du mainteneur](#retours-du-mainteneur-round-5), conservés
   sans modification, et ses réponses aux questions ;
2. l’[avis sur la question de fond](#avis-sur-la-question-de-fond) et les
   décisions ci-dessous ;
3. les maquettes du lot Y2, une fois validées ; d’ici là, les [maquettes du
   quatrième tour](./MAQUETTES-RECETTE-V4.html) ;
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

Relevés dans le code et les documents.

| Fait | Source | Conséquence |
|---|---|---|
| Une palette porte quatre rampes : Soft et Vivid, chacune en Light et en Dark. Soft et Vivid ont la même clarté à chaque cran, donc les mêmes contrastes. Ils diffèrent par la part de chroma, 0,45 et 0,95 du maximum que sRGB porte à cette clarté et à cette teinte | `recetteParDefaut`, architecture section 3.2 | La part est relative : un Vivid est toujours presque aussi saturé que l’écran le permet à sa clarté, en Light comme en Dark |
| Un composant cite `theme.primary.vivid.700` ; la collection `theme` choisit la valeur Light ou Dark. `theme` compte 143 variables : 11 pour le neutre, 88 pour quatre utilitaires à deux profils, 44 pour deux rampes de marque à deux profils | Architecture section 2 | Les quatre rampes d’une famille ne font que deux noms à choisir. Retirer un profil à une famille retire la moitié de ses noms |
| Aucune variable `soft` ou `vivid` n’existe dans `intencial-library` ni dans UCM-Playground | Recherche dans les deux dépôts | Changer l’architecture des profils ne casse aucun consommateur |
| La première recherche proposait des rampes `-dark` plus saturées que les rampes claires. La revue critique l’a jugé bloquant : une couleur douce ou vive sert dans les deux thèmes | Recherche section 6.5, revue section 3.1 | L’idée « Vivid pour le Dark » a déjà été examinée et écartée une fois ; la question Q5.1 la reprend avec les deux besoins du mainteneur |
| Les usages d’un cadre montrent le profil porteur (`[PLA-18]`). Sans palette de base, le classement automatique élit le porteur sur la part de chroma de la référence : `#1E6FD9` est porté par Vivid, `#A0B599` par Soft | `[PLA-18]`, `[MOT-17]`, tableau des références de la spécification | Voilà l’alternance que le mainteneur constate : une référence saturée donne des usages Vivid, une référence douce des usages Soft |
| « Palette de base » est une bascule Auto, Soft, Vivid qui force le profil porteur et lui donne la part de chroma de la référence | `[ENT-11]`, `champs.ts` | Avec un choix de profils, elle n’a plus de sens pour une palette à un profil. Pour une palette à deux profils, la question du porteur reste |
| `FORMAT_RECETTE` vaut 3. Chaque champ ajouté à une palette a changé le format, parce que la validation refuse une clé inconnue | `recette.ts` | Un champ `profils` passe la recette au format 4. Un plugin de format 3 la classe « future » |
| 33 lignes du moteur et du plugin parcourent `PROFILS`. Les promesses se jugent par mode et par profil, et le verdict d’un thème compte les deux profils | `promesses.ts`, `[PLA-07]` | Le changement de moteur touche promesses, alertes, rapport, planche et interface |
| « Palettes proches » se mesure sur les nuances 500, 600 et 700 de Vivid, en Light | `CRANS_PALETTES_PROCHES`, `aidePalettesProches` | Une palette Soft seule n’a pas de Vivid : la mesure doit changer de profil |
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

Le mainteneur demande deux choses : garder deux intensités pour certains
emplois sémantiques, et savoir si Vivid doit servir au thème sombre. Il
craint quatre palettes par emploi et lit, dans des tutoriels, qu’un thème
sombre emploie des couleurs moins saturées.

### Ce que disent les systèmes publiés

| Source | En thème sombre | Pour l’insistance |
|---|---|---|
| [Material Design 2, thème sombre](https://m2.material.io/design/color/dark-theme.html) | Couleurs désaturées : les tons 200 à 50 de la palette. Une couleur saturée vibre sur un fond sombre et y manque le contraste | Des tons de la même palette |
| [Material 3](https://m3.material.io/styles/color/system/how-the-system-works) | La même palette tonale. `primary` passe du ton 40 en clair au ton 80 en sombre ; la chroma disponible baisse d’elle-même aux tons clairs | `primary` et `primary-container` : deux tons, une chroma |
| [MUI](https://mui.com/material-ui/customization/dark-mode/) | Le thème sombre par défaut prend `blue[200]`, `#90CAF9`, pour `primary.main`. Les nuances « Accent » A100 à A700 viennent de la palette Material de 2014 et servent aux éléments d’accent, dans les deux thèmes | `main`, `light`, `dark` |
| [Apple, couleurs système](https://developer.apple.com/design/human-interface-guidelines/color) | Une valeur par apparence : `systemBlue` vaut `#007AFF` en clair et `#0A84FF` en sombre, un peu plus claire et plus vive | Hors du système de couleurs |
| [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | Une échelle sombre distincte. Le fond plein garde souvent son code : `blue9` vaut `#0090FF` dans les deux thèmes. Les fonds sombres sont peu saturés | Crans 3 à 5 pour un fond discret, 9 et 10 pour un fond plein, sur la même échelle |
| [Atlassian](https://atlassian.design/foundations/color), [GitHub Primer](https://primer.style/foundations/color) | Un jeu de valeurs par thème, mêmes noms | `danger` et `danger.bold` chez Atlassian, `muted` et `emphasis` chez Primer : deux crans d’une même rampe |

Les deux affirmations que le mainteneur oppose portent sur des éléments
différents. « Moins saturé en sombre » vise les grandes surfaces et les
textes : un fond sombre et un texte clair sont aux deux bouts de la courbe,
où sRGB porte peu de chroma, et un grand aplat saturé éblouit sur un fond
sombre. « Plus vif en sombre » vise les petits éléments pleins, bouton,
badge, anneau de focus. À la clarté où un fond plein tient son contraste sur
un fond sombre, une chroma moyenne paraît délavée ; la pousser vers le
maximum garde la couleur de marque reconnaissable. Apple et Radix font les
deux à la fois.

Le moteur tient déjà ces deux effets. La courbe sombre place les fonds et
les textes aux bouts, où la chroma baisse. La part de chroma est relative
au maximum, donc un Vivid sombre est aussi vif que l’écran le permet à sa
clarté. L’écart de chroma absolue entre un 700 Vivid Light et un 700 Vivid
Dark se mesure en Y0.2 avant d’en conclure davantage.

### Avis

1. **Quatre rampes ne font pas quatre choix.** Le designer choisit entre
   `soft` et `vivid` ; `theme` choisit Light ou Dark. Le doublement par thème
   existe dans chaque système cité. Le coût réel est le nombre de noms, deux
   par famille.
2. **Les deux besoins n’ont pas la même nature.** L’insistance se choisit
   composant par composant, dans un même thème : elle demande deux noms,
   ce que l’architecture fait. « Plus vif en sombre » est une propriété du
   thème : elle ne demande aucun nom, seulement une autre valeur derrière le
   même nom. Faire de Vivid la palette du sombre lierait les deux : une
   erreur douce n’existerait plus en sombre, une alerte vive n’existerait plus
   en clair. La revue critique relevait déjà ce défaut en section 3.1.
3. **La plupart des systèmes règlent l’insistance par le cran, pas par la
   chroma.** Une liste d’erreurs douce prend un fond 100 et un texte 700 ;
   une erreur critique prend un fond plein 700 et `on-solid`. Les deux
   viennent d’une seule rampe. Soft n’apporte quelque chose que pour un
   élément de ton moyen répété, bordure, icône ou badge plein, que le cran
   ne peut pas adoucir sans perdre son contraste. Ce besoin est réel pour les
   utilitaires. Il n’est pas démontré pour les couleurs de marque.
4. **Recommandation : les profils par palette** (option B de Q5.1). Le
   changement de moteur que ce retour demande y mène directement : `success`,
   `warning`, `info` et `danger` portent Soft et Vivid, une couleur de marque
   n’en porte qu’un. `theme` passe de 143 à 121 variables quand les deux
   rampes de marque n’ont qu’un profil ; les noms retirés sont ceux qu’aucun
   composant ne cite aujourd’hui.
5. **Pour le sombre, aucun profil de plus.** Si la recette dans Figma montre
   que les accents sombres manquent de vivacité, une part de chroma propre
   au thème Dark se réglera derrière les mêmes noms. Ce réglage est hors de
   ce plan. Il se décide après la recette Y7, sur de vraies maquettes
   sombres.

Pour ce plugin, générer Soft et Vivid reste utile : les utilitaires en ont
besoin. Le choix par palette retire les rampes dont une famille n’a pas
l’usage, et la planche ne montre plus que ce que la configuration demande.

## Décisions

| Sujet | Décision |
|---|---|
| Profils d’une palette | Soft seul, Vivid seul, ou les deux, choisis à la création et modifiables dans la configuration. Une recette de format 3 se lit avec les deux profils pour chaque palette. Forme du choix et libellés sur maquette (Y2.1) |
| Palette de base | Remplacée par le choix des profils. Pour une palette à deux profils, le porteur de la référence se choisit sur maquette (Y2.1). Pour une palette à un profil, Q5.2 |
| Architecture | Mise à jour selon la réponse à Q5.1 ; rien ne s’écrit avant |
| Onglet Palettes | La ligne du titre ne porte plus que « Palette [nom] ». Le bouton de génération, « Enregistré », « Afficher dans Figma », l’état du cadre et la progression la quittent. Les erreurs d’enregistrement et le conflit restent affichés : ce sont des constats, pas l’indication d’enregistrement |
| Configuration de la palette | Mêmes champs, même ordre et même disposition que la carte de création (Y2.1) |
| Dérive de teinte | La ligne de bilan et « Voir les garanties » se retirent de la carte |
| Onglets | Un seul style pour toutes les bascules à onglets : l’onglet actif a un fond, un peu plus clair que `--fond-note` au thème sombre de Figma, et distinct de la carte au thème clair. Les segments de choix d’une valeur (préréglage, modèle) gardent le leur |
| Interface de test | Les rangées de la grille des États s’espacent assez pour que deux anneaux de focus ne se touchent plus |
| Planche | Les rampes, les usages et les grilles des profils de la palette, et d’eux seuls. Avec deux profils, les usages des deux, disposés selon Y2.4. `[PLA-18]` se récrit |
| Fiche d’une palette | Gestes dans l’ordre dicté : « Générer sur Figma » ou « Actualiser sur Figma », bouton principal bleu ; « Afficher » ; « Modifier ». Le reste de la fiche sur maquette (Y2.2) |
| Taille des gestes d’une fiche | Le socle gagne une taille compacte de 24 px pour `createButton`. Les gestes d’une fiche et d’une carte supprimée la prennent, « Supprimer définitivement » et le bouton principal compris |
| Palette supprimée | Fond et bordure plus proches du fond de la page, teinte d’avertissement gardée |
| Gestes globaux | 10 px au-dessus et au-dessous. Libellés dictés : « Mettre à jour (2 palettes) » et « Générer tout (2 palettes) », sous réserve de Q5.5 |
| Contenu des planches | Une carte des Réglages communs, un interrupteur par partie du cadre. Parties et règles sur maquette (Y2.3), rangement selon Q5.3 |
| Fenêtre | 650 × 720 par défaut. Le plus petit format reste 500 × 520. Une taille rangée égale à l’ancien défaut, 600 × 720, s’ouvre à 650 × 720 ; toute autre taille rangée se garde |

## Reprise du quatrième plan

| Case du quatrième plan | Sort |
|---|---|
| X4.1 à X4.5, génération au niveau du titre | Défaites par Y1.2 : la génération appartient à l’onglet Planches |
| X8.2, tests de « Supprimer définitivement » et Ctrl+Z dans Figma | Reprise en Y7.3 |
| X8.3, recette dans Figma et constats restés ouverts | Reprise en Y7.4 |
| X8.4, temps et calques d’une génération de douze palettes | Reprise en Y7.5, après Y5 qui change le nombre de calques |

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
| Moteur : profils d’une palette | Y3 | Q5.1, Q5.2, Y2.1 validée, revue indépendante (Y3.1) |
| Interface : le choix des profils partout | Y4 | Y3 |
| Planche : profils et contenu | Y5 | Y3, Y2.3, Y2.4 validées, Q5.3 |
| Onglet Planches : fiches | Y6 | Y2.2 validée, Y1.9 |
| Recette et clôture | Y7 | Parcours finis |

Chaque lot suit les règles de code, de test et de relecture de
CONTRIBUTING.md, met à jour la documentation qu’il touche et ajoute ses
textes à l’inventaire. Une capture ne prouve ni une interaction ni une
sauvegarde.

## Lot Y0 : question de fond, règles et documents

- [ ] **Y0.1** Discuter Q5.1 avec le mainteneur à partir de l’[avis sur la
  question de fond](#avis-sur-la-question-de-fond) ; noter sa réponse dans
  ce plan.
- [ ] **Y0.2** Mesurer, pour `#1E6FD9` et `#16A34A`, la chroma absolue des
  crans 600 et 700 de chaque profil en Light et en Dark, avec le moteur.
  Rapporter les chiffres dans l’avis. Si la mesure contredit l’avis, le
  corriger avant la réponse à Q5.1.
- [ ] **Y0.3** Mettre à jour « Les surfaces d’UCM Palettes » dans
  CONTRIBUTING.md : génération dans l’onglet Planches seul, style unique des
  onglets, taille compacte des gestes d’une fiche.
- [ ] **Y0.4** Mettre à jour la spécification : `[UI-05]` et `[UI-11]`
  (ligne du titre sans génération), `[UI-01]` (taille par défaut), et les
  marqueurs des onglets et des fiches. Les profils d’une palette, `[ENT-11]`,
  `[MOT-17]`, `[PLA-18]` et le contenu des planches entrent avec leurs lots.
- [ ] **Y0.5** Inventaire des textes : « Afficher », « Modifier », « Mettre à
  jour (N palettes) » et « Générer tout (N palettes) », dictés ; les
  libellés retirés de la ligne du titre et de la carte Dérive marqués
  retirés. Les textes nouveaux des lots entrent « À valider ».
- [ ] **Y0.6** Déclarer dans `galerie/etats.cjs` les états de ce plan :
  palette Soft seule, Vivid seule, les deux ; fiche refaite ; carte
  « Contenu des planches » ; grille des États. Retirer ou remplacer les états
  « Titre et Générer sur Figma » et « Titre et Actualiser sur Figma ».
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
  palettes) », au singulier pour une palette, selon Q5.5. La progression
  garde son libellé actuel.
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
couleurs et ratios calculés par le moteur pour `#1E6FD9`, `#16A34A` et
`#A0B599`. Chaque maquette montre la disposition en place quand elle existe,
au moins une autre, puis ses questions avec une recommandation.

- [ ] **Y2.1** Choix des profils, dans la carte de création et dans la
  configuration alignée sur elle. Au moins trois formes : segments « Soft ·
  Vivid · Les deux » ; deux cases Soft et Vivid dont une au moins reste
  cochée ; trois cartes qui montrent chacune une rampe d’aperçu. Des
  libellés qui disent l’usage sans le jargon, par exemple « Douce »,
  « Vive », « Les deux ». Pour une palette à deux profils, l’endroit où se
  choisit le porteur de la référence, qui remplace « Palette de base ». Pour
  une palette à un profil, la réponse à Q5.2, et l’avertissement quand la
  référence est plus proche de l’autre profil. Ce que l’aperçu, les
  Intensités, la Dérive, les Garanties et l’interface de test montrent pour
  chacun des trois choix.
- [ ] **Y2.2** Fiche d’une palette dans l’onglet Planches : hiérarchie entre
  nom, état du cadre, aperçu, référence et garanties, et les trois gestes
  dans l’ordre de Y1.9. Deux dispositions au moins, dont une plus compacte.
  Chaque état du cadre, dont « À jour », sans premier geste ou avec un
  geste inactif.
- [ ] **Y2.3** Carte « Contenu des planches » des Réglages communs : un
  interrupteur par partie du cadre (rampes, note sous les rampes, usages,
  grilles de contrastes, thème Light, thème Dark), et les règles qui les
  lient. Proposer ce qui ne se désactive pas, par exemple l’en-tête et au
  moins un thème. Montrer l’effet annoncé : les cadres passeront « À mettre
  à jour », et le nombre de calques d’un cadre.
- [ ] **Y2.4** Cadre de la planche pour une palette Soft seule, Vivid seule
  et à deux profils. Pour deux profils, au moins deux dispositions des
  usages : une section par profil, ou deux colonnes Soft et Vivid par état.
  Nombre de calques de chacune pour Bleu.

Critère : le mainteneur valide ou corrige chaque maquette sans avoir à
imaginer une interaction.

## Lot Y3 : moteur, profils d’une palette

Après la réponse à Q5.1 et Q5.2, et la validation de Y2.1. Fichiers :
`packages/couleur/src/*`, `plugin-palettes/src/presentation.ts`,
`rapport.ts`, `edition.ts`, `configuration.ts`.

- [ ] **Y3.1** Faire relire ce lot par un agent de revue indépendant avant
  d’écrire le code. Trancher point par point, dire ce qui est retenu et ce
  qui est rejeté, avec la raison, et vérifier chaque affirmation dans le
  code.
- [ ] **Y3.2** Recette : un champ facultatif `profils` sur une palette,
  `["soft"]` ou `["vivid"]` ; absent, la palette porte les deux. Une palette
  libre n’en porte pas. `FORMAT_RECETTE` passe à 4 ; une recette de format 3
  se lit sans changement. La relation entre `profils` et `base` suit Q5.2.
- [ ] **Y3.3** Rampes et ancrage : une palette à un profil ne calcule que ses
  deux rampes, et y ancre la référence selon Q5.2. Une palette à deux
  profils garde `[MOT-17]` et `[ENT-11]`.
- [ ] **Y3.4** Promesses et alertes : seules les rampes présentes se jugent.
  Le verdict d’un thème compte les profils présents. « Profils confondus » se
  tait pour une palette à un profil. « Palettes proches » se mesure sur un
  profil que les deux palettes portent ; la règle pour deux palettes sans
  profil commun se fixe à la revue et s’écrit dans la spécification.
- [ ] **Y3.5** Rapport, export de la recette et empreinte : ils ne listent
  que les profils présents. L’empreinte d’un cadre change avec les profils.
- [ ] **Y3.6** Spécification : `[MOT-17]`, `[ENT-11]`, section 11 et les
  alertes touchées. Architecture multi-marques selon la réponse à Q5.1.
- [ ] **Y3.7** Tests : une recette de format 3 relue avec deux profils par
  palette ; une palette Soft seule sans rampe Vivid, sans garantie Vivid,
  sans alerte « Profils confondus » ; le verdict compté sur les profils
  présents ; `profils` refusé sur une palette libre ; « Palettes proches »
  entre une palette Soft et une palette Vivid. Chaque loi vue rouge sur une
  mutation.

Critère : une recette de format 3 se lit et se juge comme avant, et une
palette à un profil n’a ni rampe, ni garantie, ni alerte pour l’autre.

## Lot Y4 : interface, le choix des profils partout

Après Y3. Disposition de Y2.1 validée.

- [ ] **Y4.1** Carte de création et configuration de la palette : le choix
  des profils, et la configuration alignée sur la création. « Palette de
  base » se retire.
- [ ] **Y4.2** Aperçu et nuancier : les rangées des profils présents, et le
  repère ≈ seulement avec deux profils.
- [ ] **Y4.3** Intensités d’une palette : les profils présents. Les
  Intensités des Réglages communs gardent les deux, qui servent à toutes les
  palettes.
- [ ] **Y4.4** Dérive de teinte : un seul tracé et aucun lien de
  synchronisation pour une palette à un profil.
- [ ] **Y4.5** Garanties de contraste : la bascule Soft et Vivid se retire
  pour une palette à un profil. Le détail d’une nuance ne cite que les
  profils présents.
- [ ] **Y4.6** Interface de test : le profil peint selon Y2.1.
- [ ] **Y4.7** Aperçu compact d’une fiche de l’onglet Planches : les profils
  présents.
- [ ] **Y4.8** Tests d’interface : chaque choix de profils change l’aperçu,
  les Garanties et l’interface de test ; changer les profils d’une palette
  générée fait passer son cadre « À mettre à jour ». Chaque test vu rouge
  sur une mutation.

Critère : le designer ne voit jamais un profil que sa palette ne porte pas.

## Lot Y5 : planche, profils et contenu

Après Y3, la validation de Y2.3 et Y2.4, et la réponse à Q5.3.

- [ ] **Y5.1** Rampes et grilles : celles des profils présents. La note sous
  les rampes n’explique ≈ qu’avec deux profils.
- [ ] **Y5.2** Usages : ceux de chaque profil présent, disposés selon Y2.4.
  Récrire `[PLA-18]`. L’en-tête nomme toujours le porteur de la référence.
- [ ] **Y5.3** Contenu des planches : le modèle reçoit les parties à dessiner,
  à la place de l’option `grille`. Une partie retirée change l’empreinte, et
  les cadres passent « À mettre à jour ». Rangement selon Q5.3.
- [ ] **Y5.4** Recompter les calques du cadre de Bleu pour chaque choix de
  profils, toutes parties dessinées, contre 1 632 aujourd’hui.
- [ ] **Y5.5** Tests : aucun cadre ne montre un profil absent ; une palette à
  deux profils montre les usages des deux ; chaque partie désactivée
  disparaît du modèle et change l’empreinte ; les parties qui ne se
  désactivent pas restent. Chaque loi vue rouge sur une mutation.

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

## Lot Y7 : recette et clôture

- [ ] **Y7.1** Reprendre les tests d’interface que Y1 à Y6 cassent, en
  gardant ce que chacun protégeait encore.
- [ ] **Y7.2** Mettre à jour AGENTS.md si la carte du code change, la
  spécification et les liens des plans. Marquer le quatrième plan comme
  remplacé pour ses cases ouvertes.
- [ ] **Y7.3** (ex-X8.2) Constater dans Figma qu’un seul Ctrl+Z après
  « Supprimer définitivement » rend le cadre et son suivi. Au mainteneur.
- [ ] **Y7.4** (ex-X8.3) Construire code et interface, recharger le plugin
  dans la copie partagée, puis exécuter la recette ci-dessous avec les
  constats restés ouverts du quatrième plan. Au mainteneur.
- [ ] **Y7.5** (ex-X8.4) Mesurer dans Figma le temps et le nombre de calques
  d’une génération de douze palettes, après Y5 ; appliquer `[PLA-24]` au
  résultat. Au mainteneur.

Critère de clôture : contrôles du dépôt, typecheck, build, tests d’interface
de Palettes tous verts, et recette Figma terminée.

## Recette mainteneur

| Scénario | Résultat observable | Lots |
|---|---|---|
| Créer une palette Soft seule | Une rangée par thème dans l’aperçu ; ni bascule Soft et Vivid, ni garantie Vivid | Y3, Y4 |
| Passer cette palette aux deux profils | Deux rangées, bascule des Garanties revenue, cadre « À mettre à jour » | Y4 |
| Générer une palette saturée et une palette douce, toutes deux à deux profils | Deux cadres de même structure, usages Soft et Vivid dans chacun | Y5 |
| Désactiver les grilles dans « Contenu des planches » | Tous les cadres « À mettre à jour » ; après génération, plus de grilles | Y5 |
| Ouvrir une palette | « Palette [nom] » seul sur la ligne du titre | Y1 |
| Parcourir les onglets Thème, Soft et Vivid, Écran et États | Même fond pour chaque onglet actif, visible sur la carte | Y1 |
| Tabuler dans la grille des États | Deux anneaux de focus voisins ne se touchent pas | Y1 |
| Lire l’onglet Planches | Gestes Générer, Afficher, Modifier de même hauteur ; carte supprimée discrète ; libellés globaux avec le nombre de palettes | Y1, Y6 |
| Ouvrir le plugin sans taille rangée, puis avec 600 × 720 rangé | 650 × 720 dans les deux cas | Y1 |

La recette visuelle couvre 500 × 520 et 650 × 720, les deux thèmes de Figma,
les deux thèmes de palette, les trois choix de profils, un nom long et
plusieurs garanties en échec.

## Questions au mainteneur

| Question | Ce qui en dépend | Recommandation |
|---|---|---|
| **Q5.1** Que deviennent les deux profils ? A : deux profils pour chaque palette, comme aujourd’hui. B : les profils se choisissent par palette ; les utilitaires portent les deux, une couleur de marque un seul. C : Soft sert au thème Light et Vivid au thème Dark, sous un seul nom. D : un seul profil ; l’insistance passe par les crans | Y3, architecture | **B**, voir l’[avis](#avis-sur-la-question-de-fond). C retire le choix d’insistance dans chaque thème ; l’effet recherché, des accents plus vifs en sombre, s’obtiendra au besoin par une part de chroma propre au thème Dark, sans nom de plus. D convient aux couleurs de marque, pas aux utilitaires qui ont besoin d’une erreur douce et d’une erreur vive au même cran |
| **Q5.2** Une palette à un profil : quelle intensité ? a : celle de la référence, qui reste exacte ; le profil choisi décide seulement de la famille de tokens. b : la part commune du profil, avec la référence exacte à son seul cran, au prix d’un saut de chroma. c : la part commune, et la référence n’est plus exacte | Y2.1, Y3 | **a**. b casse la régularité de la rampe au cran de la référence. c renonce à `[MOT-17]`, qui ne recalcule jamais la référence. Avec a, le plugin avertit quand la référence est plus proche de la part commune de l’autre profil |
| **Q5.3** Le contenu des planches se range-t-il dans la recette, commun à tous les designers du fichier, ou dans les réglages locaux du plugin ? | Y5.3 | La recette : la planche est commune au fichier, et deux designers qui génèrent doivent obtenir le même cadre. Le réglage entre dans l’empreinte |
| **Q5.4** Où la question du porteur va-t-elle pour une palette à deux profils ? | Y2.1 | Posée dans la maquette Y2.1, avec une proposition : un choix « Référence dans : Auto, Soft, Vivid » qui ne paraît qu’avec les deux profils |
| **Q5.5** « Palettes » garde-t-il sa majuscule dans « Mettre à jour (2 Palettes) » et « Générer tout (2 Palettes) » ? | Y1.8 | Minuscule, et le singulier pour une palette : « Mettre à jour (1 palette) ». Les autres libellés du plugin écrivent les noms communs en minuscules |

## Hors périmètre

- Une part de chroma propre au thème Dark, qui se décide après la recette
  Y7 selon Q5.1.
- Création de variables et ajout aux tokens du design system.
- Relecture des textes déjà hors du quatrième plan.
- Nombre de nuances différent d’une marque à l’autre en mode standard.

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
