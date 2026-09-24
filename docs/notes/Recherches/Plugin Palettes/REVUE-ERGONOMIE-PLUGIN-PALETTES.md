# Revue d'ergonomie d'UCM Palettes

Cette revue juge l'interface du plugin telle que le dépôt la livre au commit
`98ddabf`, lots 0 à 7 : le parcours du designer, la hiérarchie de
l'information de chaque écran, et ce que chaque message lui demande de faire.
Elle part de la [spécification](./RECHERCHE-PLUGIN-PALETTES.md), de la
[hiérarchie de l'information](../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation)
et du code de [`src/ui/`](../../../../packages/plugin-palettes/src/ui/).

Chaque constat se termine par une recommandation. Celles qui renversent une
décision de la spécification le disent, et citent la décision.

## Méthode

- **Écrans regardés.** Les 30 états de la galerie, reconstruite au commit
  revu, capturés à 600 × 720 et à 440 × 520, fenêtre visible et page entière,
  thème clair.
- **Textes relevés.** Le texte rendu de chaque état, pour compter les objets
  et relire les messages dans leur contexte.
- **Mesure.** Le moteur du plugin (`analyserPalette`) a analysé une palette
  neuve pour chacune des dix-sept teintes 500 de Tailwind, puis des dix-sept
  teintes 600, avec la recette par défaut. Le résultat fonde le constat 1.
- **Code lu.** L'onglet Palettes, l'onglet Planche, la configuration,
  l'éditeur de dérive, le suivi du dessin, la frontière et les constats.

La revue ne juge pas le rendu dans Figma : ni le thème sombre de l'hôte, ni la
planche dessinée, ni la fluidité du glisser. Ces points attendent M3 et M4.
Les textes sont les rédactions provisoires de
[TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md) ; la revue en critique le rôle
dans le parcours, pas la tournure.

## Verdict

Le plugin couvre chaque cas que la spécification énumère, et la galerie les
rend tous visibles. Les cas limites sont traités avec soin : recette future
ou illisible, calques étrangers, copie de cadre, couleur ramenée dans sRGB.
Le parcours principal, lui, souffre de trois défauts qui touchent chaque
session.

1. **Toute palette neuve s'affiche en alerte.** Les 34 couleurs mesurées
   déclenchent au moins une alerte. Le verdict « Prête » s'affiche au-dessus
   de blocs jaunes, et une alerte qui sonne toujours cesse d'être lue.
2. **La boucle régler, voir, dessiner est coupée à trois endroits.** La
   configuration masque l'aperçu qu'elle modifie. L'onglet Palettes ne dit pas
   si le cadre de la palette est à jour. Les constats nomment le geste qui les
   lève sans y mener.
3. **L'aperçu ne situe rien.** Les messages parlent en crans, « cran 700 »,
   « crans clair 100 », « text sur surface ». L'aperçu montre onze pastilles
   sans numéro, sans la couleur de référence et sans les crans des emplois.

Les recommandations de la [dernière section](#priorités) traitent ces trois
défauts d'abord. Aucune ne demande de changer le moteur.

## Le parcours du designer

Le tableau suit un designer du design system qui crée la palette d'une marque
et la pose sur la planche. La colonne « Frottement » renvoie aux constats.

| Étape | Ce que le designer fait | Ce qui marche | Frottement |
|---|---|---|---|
| 1. Ouvrir | Lance le plugin sur un fichier sans recette | Un seul champ et deux boutons ; « Depuis la sélection » évite de recopier un hexa | Le message parle de « recette » avant que le designer sache ce que le plugin produit ([C9](#c9-le-premier-lancement-parle-de-la-recette)) |
| 2. Créer | Saisit un hexa ou prend la couleur de la sélection | La palette s'ouvre aussitôt, rangée, avec son aperçu | Le nom se saisit après, plus bas ; la palette s'appelle d'abord par son hexa, trois fois à l'écran |
| 3. Lire le verdict | Regarde la barre du haut | Le verdict et « Dessiner » restent visibles à 440 × 520 | « Prête » au-dessus de blocs jaunes ([C1](#c1-toute-palette-neuve-saffiche-en-alerte)) |
| 4. Comprendre | Survole les pastilles, lit les constats | L'infobulle donne hexa, contrastes et emplois | Rien ne relie un message à une pastille ([C3](#c3-laperçu-ne-situe-ni-la-référence-ni-les-emplois)) |
| 5. Corriger | Cherche le geste que le constat propose | Chaque constat nomme son geste | Le geste mène à trois endroits, dont deux repliés ou masqués ([C4](#c4-un-constat-nomme-son-geste-sans-y-mener)) |
| 6. Régler la dérive | Ouvre « Régler », glisse une poignée | Pointeur, clavier, champ, réglette et repère Tailwind sont liés | Échelle de ±90° pour des valeurs de ±10° ; aperçu en double ([C8](#c8-léditeur-de-dérive-occupe-beaucoup-pour-peu)) |
| 7. Régler la recette | Ouvre l'engrenage, change une clarté ou une part | Le nombre de palettes touchées s'affiche par section | L'aperçu disparaît pendant tout le réglage ([C2](#c2-la-configuration-masque-ce-quelle-règle)) |
| 8. Dessiner | Clique « Dessiner » | Progression dans le bouton, confirmation des calques étrangers | Le bouton ne dit pas si le cadre est déjà à jour ; la grille de contraste suit une case d'un autre onglet ([C5](#c5-longlet-palettes-ignore-létat-du-cadre), [C6](#c6-la-grille-de-contraste-suit-une-case-cachée)) |
| 9. Suivre la planche | Ouvre l'onglet Planche | Une ligne par palette et son geste | Aucune synthèse ; les trois états ont le même gris ; les promesses manquées n'y figurent pas ([C7](#c7-longlet-planche-liste-sans-conclure)) |
| 10. Échanger la recette | Exporte, importe, exporte le rapport | L'écart d'import précède le remplacement | L'écart ne dit ni ce qui change ni ce que la planche perd ([C11](#c11-lécart-dimport-ne-dit-pas-ce-qui-change)) |

## Constats forts

### C1. Toute palette neuve s'affiche en alerte

**Observation.** Sur les dix-sept teintes 500 de Tailwind, les dix-sept
déclenchent « Référence plus claire que le bouton », et onze déclenchent
« Profils confondus ». Sur les teintes 600, les chiffres sont 17 et 12. La
galerie le montre : la palette par défaut `#1E6FD9`, à peine créée, affiche
« Prête » et deux blocs jaunes qui remplissent la moitié basse de la fenêtre.

Les deux alertes ont une cause structurelle :

- « Référence plus claire que le bouton » sonne dès que la clarté de la
  référence dépasse 0,50, celle du cran 700. Une couleur de marque est presque
  toujours plus claire. L'alerte décrit la conséquence de la décision D-O :
  le bouton prend le 700 dans toutes les marques. Le designer ne peut pas la
  lever sans changer de couleur de marque.
- « Profils confondus » porte sur le cran 100, que `surface` emploie, et
  sonne pour 249 teintes sur 360 ([VER-11] le mesure). Le geste proposé
  modifie les parts de chroma de la recette, donc toutes les palettes, pour un
  écart de 0,012 contre un seuil de 0,02.

**Conséquence.** Le jaune devient le fond normal de l'écran. Les alertes qui
demandent une décision, « Palettes proches » et « Référence hors de la
rampe », arrivent dans la même couleur et au même rang que deux alertes que le
designer a appris à ignorer. Le verdict « Prête » contredit l'écran.

**Recommandation.**

- Sortir « Référence plus claire que le bouton » des constats. Le fait qu'elle
  porte est le plus utile de la palette pour une marque : la couleur réelle de
  ses boutons. Il mérite une place permanente sur la ligne de la référence,
  pour toutes les palettes : « Bouton : ■ #0E5DC6, cran 700 ». Une alerte ne
  reste utile qu'au-delà d'un écart que le designer juge gênant, à mesurer en
  ΔEok entre la référence et le 700.
- Déplacer « Profils confondus » vers la configuration, où se trouve son
  geste, sous forme d'une ligne par cran : « Cran 100 clair : soft et vivid se
  confondent sur 3 palettes ». La planche garde sa mention « ≈ » ([PLA-15]).
  Cette recommandation renverse le défaut D-E, que le mainteneur peut revoir.
- Nommer le verdict par ce qu'il compte : « 56/56 promesses tenues » plutôt
  que « Prête ». La planche emploie déjà ce compte dans l'en-tête d'un cadre
  ([PLA-07]).

### C2. La configuration masque ce qu'elle règle

**Observation.** L'engrenage remplace la vue de travail par la configuration
(`montrerConfiguration` masque `travail`). Pendant qu'il change une clarté, une
part ou un fond, le designer ne voit ni l'aperçu ni les verdicts. La
spécification demande pourtant de régler courbes et parts « en regardant
l'aperçu et la planche » (section 4). Les onze clartés de chaque courbe sont
vingt-deux champs de texte, sans tracé. Les seuils WCAG 4,5 et 3 se modifient
au même niveau que les parts de chroma. Aucune section ne revient à sa valeur
par défaut.

**Conséquence.** Le réglage d'une courbe se fait à l'aveugle, puis se vérifie
par aller-retour entre deux vues. « 3 palettes touchées » dit combien de
palettes changent, pas si leurs promesses tiennent encore.

**Recommandation.**

- Garder en tête de la configuration un aperçu compact : la palette ouverte,
  ses deux rampes du mode choisi, et le compte des promesses manquées sur
  toutes les palettes, recalculé à chaque saisie (« 0 → 4 promesses
  manquées »).
- Tracer les deux courbes au-dessus de leurs champs, sur le modèle du graphe
  de dérive, avec le repère des crans 50, 600 et 700 que la garantie
  mesure ([ENT-10]).
- Replier les seuils de contraste sous une section distincte, avec une ligne
  qui dit que 4,5 et 3 sont les seuils de WCAG. Un seuil abaissé change le
  sens de « promesse tenue » sur toutes les planches.
- Offrir « Valeurs par défaut » par section.

### C3. L'aperçu ne situe ni la référence ni les emplois

**Observation.** L'aperçu montre deux rangées de onze pastilles de 24 px,
sans numéro de cran. La couleur de référence n'y figure pas ; seule la ligne
« proche du cran 600 » la situe. Les crans que les emplois citent, 700 pour
`solid` et `text`, 100 pour `surface`, 600 pour `border-control` et `focus`,
ne sont pas marqués. Une promesse manquée, « text sur surface », ne désigne
aucune pastille. Le graphe de dérive, lui, numérote ses onze colonnes.

L'état « alertes seules » montre l'effet : la référence `#FACC15` tombe entre
les crans 300 et 400, le bouton est un brun `#8A560E`. Le designer ne le
découvre qu'en lisant l'alerte, où deux pastilles d'exemple le montrent.

**Conséquence.** Chaque message demande au designer de convertir un numéro de
cran en position, par survol. Le lien entre ce qu'il voit et ce qu'on lui dit
passe par sa mémoire.

**Recommandation.**

- Numéroter les colonnes sous les rampes, comme le graphe de dérive.
- Placer la référence dans la rangée `vivid` par un losange, le même que le
  pivot du graphe, à sa position de clarté entre deux crans.
- Marquer d'un trait les crans des emplois, et entourer les deux pastilles de
  la paire quand une promesse manque.

[UI-04] réserve les valeurs d'un cran au survol. Un numéro et des repères
situent sans donner de valeur, et restent compatibles avec cette exigence.

### C4. Un constat nomme son geste sans y mener

**Observation.** Les gestes proposés renvoient à des endroits que l'écran ne
montre pas :

| Constat | Geste proposé | Où il se fait |
|---|---|---|
| Promesse manquée | « Réglez la dérive ou les parts de la palette, ou la courbe claire dans la configuration » | Trois endroits : « Régler », « Avancé » replié en bas, l'engrenage |
| Profils confondus | « Éloignez les parts de chroma des deux profils dans la configuration » | L'engrenage, qui masque la palette |
| Référence plus vive que `vivid` | « Montez la part de vivid dans « Avancé » » | « Avancé », replié sous les constats |

Les promesses manquées de `soft` et de `vivid` sur la même paire font deux
blocs au texte presque identique.

**Recommandation.**

- Faire du geste un bouton discret qui ouvre l'endroit et y place le focus :
  « Avancé » déplié sur le champ de la part, la configuration défilée jusqu'à
  la courbe, l'éditeur de dérive ouvert.
- Regrouper par paire et par mode : « text sur surface, clair : soft 4,18,
  vivid 4,31, pour 4,5 ». La liste d'une palette qui manque la même paire
  dans les deux profils passe de deux blocs à un.

### C5. L'onglet Palettes ignore l'état du cadre

**Observation.** Le bouton « Dessiner » de la barre a le même libellé et le
même poids quand le cadre est à jour, périmé ou jamais dessiné. L'état du
cadre ([PLA-20]) ne se lit que dans l'onglet Planche. Après un réglage, le
designer ne sait pas s'il doit redessiner sans changer d'onglet.

**Recommandation.** Faire suivre au bouton l'état du cadre de la palette
ouverte : « Dessiner » pour une palette jamais dessinée, « Redessiner » pour
un cadre périmé, et « Voir sur la planche » en bouton secondaire quand le
cadre est à jour. L'état entre au rang 1 sans ajouter d'objet.

### C6. La grille de contraste suit une case cachée

**Observation.** La case « Grille de contraste » est dans l'onglet Planche.
Le bouton « Dessiner » de l'onglet Palettes la lit aussi
(`ongletPlanche.grille()` dans `index.ts`). Un designer qui l'a cochée une
fois dessine ensuite, depuis l'onglet Palettes, des cadres plus lourds sans
voir l'option. La case n'explique pas non plus ce qu'elle ajoute.

**Recommandation.** Garder la grille à l'onglet Planche seul, ou montrer son
état à côté de « Dessiner » dans l'onglet Palettes. Donner à la case sa
raison en infobulle : « Une grille de 11 × 11 par rampe : quel cran se pose
sur quel cran ».

### C7. L'onglet Planche liste sans conclure

**Observation.** L'en-tête de l'onglet donne le nombre de palettes, la
version de la recette, l'empreinte et l'espace de couleur. Aucune de ces
valeurs ne décide d'un geste. Les états « à jour », « périmée » et « jamais
dessinée » ont la même couleur secondaire. L'action principale reste
« Dessiner toutes les palettes » quand un seul cadre est périmé. La liste ne
montre pas les promesses manquées : une palette qui en manque se dessine
depuis cet onglet sans que le designer le voie. Un cadre à jour n'offre pas
« Voir sur la planche ».

La hiérarchie de CONTRIBUTING.md place le verdict au rang 1. L'onglet n'en a
pas.

**Recommandation.**

- Un verdict d'onglet en tête : « 1 cadre périmé, 1 palette jamais
  dessinée » ou « Planche à jour ».
- Une action principale qui porte sur l'écart : « Redessiner 2 cadres ».
  « Dessiner toutes les palettes » passe en secondaire.
- Le verdict des promesses sur chaque ligne, en couleur de danger quand une
  promesse manque.
- Le nom de chaque palette cliquable vers son cadre.
- L'empreinte dans le rapport et dans l'en-tête du cadre, où elle sert.
  Corriger aussi « 0 palettes » en « aucune palette ».

## Constats moyens

### C8. L'éditeur de dérive occupe beaucoup pour peu

**Observation.**

- L'ordonnée va de -90° à +90° ([DER-01]). La dérive Tailwind la plus forte
  du relevé vaut -50°, et celle de `#1E6FD9` vaut -7,5° et +5,1°. La courbe
  tient dans un sixième de la hauteur du graphe, qui occupe 200 px.
- Déplié, l'éditeur montre sa propre rampe et une bande de teintes. L'aperçu
  principal répète la même rampe dessous. À 600 × 720, les constats passent
  sous le pli ; la spécification l'avait prévu (section 12).
- Le bouton « soft = vivid » s'affiche comme une égalité même quand les deux
  profils diffèrent. Son état se lit au seul liseré bleu.
- « Bout sombre » passe sur deux lignes, la colonne des libellés étant trop
  étroite.

**Recommandation.**

- Une échelle qui s'adapte : ±30° par défaut, élargie à ±90° dès qu'une valeur
  ou un glisser dépasse. Le graphe gagne en lecture ce qu'il perd en hauteur.
- Masquer l'aperçu principal quand l'éditeur est déplié, et afficher sous
  l'éditeur le compte des promesses manquées, pour qu'un glisser qui en fait
  manquer une se voie sans défiler.
- Remplacer le bouton par une case : « Même dérive pour soft et vivid ».

### C9. Le premier lancement parle de la recette

**Observation.** L'écran vide dit « Aucune recette dans ce fichier : la
recette par défaut s'appliquera à la première palette. ». Le designer lit un
terme interne avant de savoir ce que le plugin produit. Le champ porte
`#1E6FD9` en exemple, qui se lit comme une valeur saisie. Trois quarts de la
fenêtre restent vides.

**Recommandation.** Une phrase qui dit le résultat : « Une palette part d'une
couleur et produit quatre rampes de onze crans, soft et vivid, en clair et en
sombre. ». Mettre « Depuis la sélection » en premier : la couleur de marque
est souvent déjà dans le fichier. Demander le nom dans le même panneau, pour
ne pas afficher l'hexa en guise de nom.

### C10. Un refus de rangement laisse le designer travailler dans le vide

**Observation.** Quand la recette a changé ailleurs, le bloc « Recette du
fichier » propose « Recharger », qui perd la dernière modification. Les champs
restent éditables, mais la frontière ne range plus rien tant que l'état n'est
pas relu (`ranger` rend la main quand le statut est `refuse`). Le seul signe
est « non rangé », au rang 3. Deux boutons pleins, « Recharger » et
« Dessiner », se disputent l'écran.

**Recommandation.** Figer l'onglet pendant le refus, comme pendant un dessin.
Offrir « Exporter ma version » avant « Recharger », pour que la modification
perdue reste récupérable par un import. « Dessiner » passe en secondaire ou se
désactive.

### C11. L'écart d'import ne dit pas ce qui change

**Observation.** L'écart liste « Palette modifiée : Bleu roi » et
« Paramètre commun modifié : seuils », sans les valeurs. Il ne dit pas ce que
l'import fait à la planche : le cadre d'une palette retirée devient orphelin,
celui d'une palette modifiée devient périmé.

**Recommandation.** Donner la valeur avant et après pour chaque paramètre
commun (« seuil texte : 4,5 → 7 »), et le champ modifié pour chaque palette
(« référence », « dérive », « parts »). Ajouter une ligne de conséquence :
« 1 cadre deviendra orphelin, 1 cadre sera périmé ».

### C12. Le poids des sévérités s'inverse

**Observation.** La feuille de style donne à une promesse manquée un filet
rouge sans fond, et à une alerte un filet orange sur un fond jaune
(`.constat-promesse` et `.constat-alerte` dans `styles.css`). Le fond pèse
plus que le filet : la promesse manquée, deuxième rang de la section 11.4, se
lit moins que l'alerte, troisième rang. Avec C1, le jaune domine chaque
écran.

**Recommandation.** Un seul moyen par rang, dans l'ordre des sévérités : fond
et filet pour le bloquant, filet seul pour la promesse et l'alerte, couleur
secondaire pour la notice. Ou le fond de danger pour la promesse. Le choix
revient au point (b) du protocole, dans Figma.

### C13. Deux niveaux d'onglets identiques

**Observation.** La bascule « Clair / Sombre » de l'aperçu emploie le même
composant que les onglets « Palettes / Planche ». Le designer voit deux rangées
d'onglets de même poids, dont l'une change d'écran et l'autre change de
rampe. Les promesses et les alertes citent les deux modes ; l'aperçu n'en
montre qu'un.

**Recommandation.** Montrer les deux modes empilés : quatre rangées de 24 px
tiennent dans la hauteur d'un bloc de constat. La bascule disparaît, et une
promesse manquée en sombre se voit sans clic. À défaut, un contrôle segmenté
plus petit que les onglets.

## Constats faibles

- **Le succès d'un dessin n'a pas d'état dans la galerie.** La ligne « 1
  palette dessinée sur la planche. » et son « Voir sur la planche », seul
  résultat attendu du plugin, n'ont jamais été regardées au protocole. Les
  écarts de peinture non plus.
- **Le message d'un dessin interrompu cite l'exception brute** : « in
  set_characters: font not loaded ». Le designer n'en tire rien de plus que
  « le dessin s'est arrêté ».
- **L'infobulle de l'aperçu remplace la ligne d'aide** et passe sur deux lignes
  à 440 px : le contenu sous l'aperçu saute au survol. Une hauteur réservée
  de deux lignes supprime le saut.
- **« Supprimer » est un bouton plein principal**, sans marque de danger, dans
  la confirmation de suppression.
- **Le vocabulaire affiché mêle trois registres** : la conception (« part de
  chroma », « ΔEok »), l'architecture (« emplois », « promesses », « crans »)
  et le code (« recette », « empreinte », « rangé »). Pour l'équipe du design
  system, les deux premiers se justifient ; le troisième peut céder la place à
  « réglages du fichier », « enregistré », et l'empreinte peut sortir de
  l'écran.
- **La ligne « part de chroma 0,89 · soft 0,45 · vivid 0,95 · proche du
  cran 600 »** place la référence entre les deux profils par des nombres. Le
  losange de C3 dit la même chose à la lecture.

## Ce qui tient

Ces choix sont à garder dans toute refonte :

- le verdict et « Dessiner » dans la barre du haut, visibles à la taille
  minimale, éditeur replié ou non ;
- la création par la sélection, et la notice qui dit quand la couleur a été
  ramenée dans sRGB ;
- les constats en trois parties séparées, où, quoi, geste ;
- l'éditeur de dérive réglable au pointeur, au clavier, au champ et à la
  réglette, avec le repère Tailwind toujours visible ;
- la confirmation des calques étrangers, qui les nomme avant de les effacer ;
- les gestes de sortie d'une recette illisible ou future ;
- le rangement automatique à la fin de chaque geste, avec son indication
  discrète.

## Priorités

Ordonnées par gain pour le designer, puis par coût. Les trois premières
traitent les défauts du verdict.

| # | Recommandation | Constats | Coût | Décision à prendre |
|---|---|---|---|---|
| 1 | Sortir « Référence plus claire que le bouton » des constats, afficher le bouton sur la ligne de la référence | C1, C3 | Faible | Mainteneur, sur [VER-12] |
| 2 | Déplacer « Profils confondus » dans la configuration | C1, C4 | Moyen | Mainteneur, sur D-E |
| 3 | Numéros de cran, losange de référence et repères d'emplois dans l'aperçu | C3 | Moyen | Aucune |
| 4 | « Dessiner » suit l'état du cadre | C5 | Faible | Aucune |
| 5 | Verdict et action principale de l'onglet Planche | C7 | Moyen | Aucune |
| 6 | Aperçu et compte des promesses dans la configuration | C2 | Moyen | Aucune |
| 7 | Gestes des constats en boutons, promesses regroupées par paire | C4 | Moyen | Aucune |
| 8 | Poids des sévérités | C12 | Faible | Point (b) du protocole, dans Figma |
| 9 | Refus de rangement figé, export avant rechargement | C10 | Faible | Aucune |
| 10 | Échelle adaptative et aperçu unique dans l'éditeur | C8 | Moyen | Mainteneur, sur [DER-01] |
| 11 | Grille de contraste visible où elle s'applique | C6 | Faible | Aucune |
| 12 | Écart d'import détaillé | C11 | Moyen | Aucune |
| 13 | Premier lancement, onglets imbriqués, constats faibles | C9, C13 | Faible | Aucune |

Les recommandations 1 et 2 se décident avant M2 : elles retirent deux des
messages que [TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md) soumet au choix du
mainteneur. Un état « dessin réussi » entre dans la galerie avant toute
reprise de l'onglet Planche.
