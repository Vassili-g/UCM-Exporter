# Revue d'ergonomie d'UCM Palettes

Ce rapport réunit deux sources sur l'interface du plugin et sur la planche
qu'il dessine :

1. les retours du mainteneur, tirés de l'usage du plugin dans Figma. Ils font
   autorité et sont reproduits sans modification ;
2. la revue de l'interface faite sur la galerie des états et sur le code, au
   commit `98ddabf`. Elle ne garde que les constats compatibles avec les
   retours du mainteneur. Les recommandations qu'un retour écarte sont
   listées à part, avec le retour qui les écarte.

Le texte du mainteneur est cité dans un bloc de texte brut : le contrôle de
style du dépôt ne s'y applique pas, et le texte reste intact.

## Retours du mainteneur

```text
Revoir la hiérarchisation de l’UI globale : 

Il faut que les différentes sections soit identifiables :
section 1 zone de création d’une nouvelle palette (encadré)
Supprimer “1 palette dessinée sur la planche.”
Transférer le tool de création de palette (“Nouvelle palette”) dans cette zone, directement en dessous du sélecteur de palette et du bouton “plus” car sinon on ne comprend pas le lien.
Message “Planche, undefined 44 couleurs peintes diffèrent de l’aperçu, dont soft/light/50 : aperçu absent, planche #FAF5F5. Redessinez la palette. Si l’écart reste, signalez-le au mainteneur du plugin.” incompréhensible, si c’et une alerte ça devrait être signalé comme tel avec un séverity orange ou info en fonction de la gravité. Et ça n’a rien à faire à cet endroit. Et le message n’est pas compréhensible.
Message “Prête” ? qu’est ce que ça veut dire ? qu’est ce qui est prête ? pour quoi faire ? 
Bouton “Dessiner” → renommer en “Générer sur Figma” et ce bouton devrait appartenir à la section de la configuration de la palette car on veut exporter la palette quand on a fini de la configurer, ça ne va pas de le mettre en bouton d’action principal.
La section “1 palette dessinée sur la planche.” et le bouton “Voir sur la planche” devrait être au même niveau que le bouton “Générer sur Figma” car ça concerne cette action

section 2 Zone de configuration de la palette créée (encadré)
supprimer “part de chroma 1,00 · soft 0,45 · vivid 0,95 · proche du cran 700” pas compréhensible en l’état
Le bouton “Régler” devrait s’appeler “Configuration de la dérive” et à droite on met le texte “Dérive Tailwind · clair +0,8° · sombre −0,3°”
On devrait pouvoir idenfier faiclement la couleur de base même dans la palette utilisée pour configurer la dérive, car c’est le centre immuable de la palette. c’est important de voir si le centre est en 300 ou en 600 ou autre.
La section de réglage de la dérive devrait se situer en dessous de la visualisation des palettes
La section des palettes devrait prendre plus de place horizontalement. Il faut grossir un peu les carrés.
La section des palettes devrait être dans un encadré qui possède un background clair ou foncé, en fonction de si on est en mode light ou dark, et l’UI devrait s’adapter en conséquence (onglets, texte)
La couleur de base fournie devrait être identifiée clairement comme la couleur de base (contour ?)
Chaque rang de couleur devrait être identifié (50, 100 ,200 etc)
Chaque rang de couleur devrait être identifié en tant que fonction tel que c’était défini dans le plan, avec des “range” si nécessaire (solid, on-solid) etc avec des explication plus détaillé quand on clique dessus.
La visualisation des palettes est l’élément principal donc ça doit être une belle visualisation, bien faite, bien ordonnée avec de l’information bien structuré. 
Il devrait y avoir un bouton ou lien qui dirige vers la config pour modifier les couleurs de fond dark/light
Les onglets devraient s’appeler “Thème Light” Thème Dark” pour la nomenclature universelle
Les différentes sections (Alertes / Notices / Document, profil de couleur etc) sont mal identifiables, il faut trouver un moyen pour mieux faire ressortir la fonction de chaque section au sein de la section de configuration des palettes
Message “BdoubleO100, crans clair 100 soft et vivid ne s’écartent que de 0,012 ΔEok, sous 0,02.Éloignez les parts de chroma des deux profils dans la configuration.” On ne comprend rien, c’est trop technique : quel est le vrai problème et en quoi c’est un problème ? on parle à un designer ici
Message “BdoubleO100, couleur de référence #B00100 Part de chroma 1,00, au-dessus de vivid (0,95) : la rampe vivid est un peu plus terne que la référence. Montez la part de vivid dans « Avancé » si la rampe doit l’égaler.” Même retour, quel est le problème ? on ne comprend rien.
Message “Document, profil de couleurProfil non géré : Figma ne dit pas dans quel espace les couleurs de la planche seront peintes.Choisissez sRGB ou Display P3 dans les réglages de couleur du fichier.” A supprimer, pas utile.
Le bouton “Soft = vivid” n’est pas clair. Le petit switch à coté pour configurer l’un ou l’autre séparement est bien. Mais il faut trouver une autre idée pour vraiment faire comprendre qu’on a la possibilité de désynchroniser le shift de couleur entre les deux palettes.
Le fait qu’on ait une palette soft et une palette vivid n’est pas très bien expliqué. Je ne pense pas qu’il faille expliquer avec des phrases mais par exemple on pourrait avoir un réglage visible ergonomique pour augmenter ou diminuer la saturation de la palette vivid, ça permettrait d’expliquer la différence entre les deux (et d’avoir un reglage en plus) 
Onglet “Planche”
L’onglet planche est une bonne idée mais c’est très mal matérialisé, on devrait pouvoir ici visualiser toutes les palettes crées les unes en dessous des autres.
Affichage type : 
Nom de la palette
Visualisation des palettes
Action : 
Accéder à la palette  (zoom sur figma)
Modifier la palette (bascule onglet Palettes)
Générer sur Figma
Ajouter aux tokens du DS (pour plus tard)
Les planches devrait être automatiquement trouvées et lues depuis le fichier sur lequel est lancé le plugin. (important)
Terme “Recette” n’est pas du tout clair : ça veut dire quoi ?
, 
Panneau de configuration : 
les typos ne correspondent pas aux normes utilisées sur le panneau principal, elles sont beaucoup trop grosses.
pour la sélection des couleurs de fond de référence on pourrait avoir le choix d’un input hexa ou d’un color picker complet avec prévisualisation de la couleur
Globalement il faudrait revoir la hierarchisation des sections pour mieux trouver l’info qu’on cherche

Planche générée sur Figma :
Il faut globalement revoir le design, la hierarchisation des information n’est pas très bonne
supprimer “Ce cadre est remplacé à chaque dessin.”
La couleur de base devrait être textuellement identifiée comme telle
Les informations de la couleur de base : “#A0B599 L 0,749 · C 0,046 · H 138° part de chroma 0,20 · proche du cran 400 blanc 2,19 – · noir 9,56 4,5 · fond clair 2,04 – · fond sombre 8,53 4,5” ne sont pas claire, il faut les recontextualiser, là on te balance de la donnée mais on ne sait pas de quoi tu parles
Section “Boutons #2B760F cran 700 vivid, clair” on s’en fiche complètement, à supprimer
Il faut ajouter une border aux cadre des mode light et dark car souvent le fond light sera juste blanc, on ne verra pas la délimitation
Palettes light/dark :
on a ça comme info pour chaque palette : “soft part 0,45”, soft OK mais part 0,45 on ne sait pas ce que c’est. Soit c’est expliqué à un autre endroit et différement, soit on supprimer.
Chaque couleur a du texte  “soft.50 #F0FAEC L 0,974 C 0,021 H 137° fond 1,00 – noir 19,59” C’est pareil, plein d’infos mais aucun contexte, on ne comprend rien. Les checks il faut précisier AA ou AAA ou Fail etc sinon on ne comprend pas. “soft.50” c’est redondant, on a déjà l’info écrit en plus gros. Il manque les fonction et promesse “on-solid” etc: ça serait plus intéressant
Section des Emplois :
ça a l’air intéressant mais faut revoir tout l’UI, c’est trop dense, trop complexe à comprendre
Section des Etats  :
ça a l’air intéressant mais faut revoir tout l’UI, c’est trop dense, trop complexe à comprendre
Section des Grilles de contraste : 
c’est bien mais on a aucune légende ? impossible de comprendre quoi que ce soit.
c’est moche
```

## Cause du message « Planche, undefined »

Le message d'écart de peinture cité par le mainteneur vient d'une
construction désaccordée du plugin. Figma chargeait un `dist/code.js`
construit avant le commit `2463caa`, et une interface construite après. Ce
commit ajoute à chaque couleur relue sur la planche l'identifiant de sa
palette. L'ancien sandbox l'omettait : l'interface a donc lu une palette
`undefined`, n'a trouvé aucune couleur d'aperçu correspondante, et a compté
les 44 pastilles comme des écarts. Le plugin a été reconstruit dans la copie
de travail. Les constats du mainteneur sur ce message restent valables : sa
place, sa sévérité et sa rédaction.

Les observations du mainteneur sur la planche dessinée ont été faites avec
cet ancien sandbox. Les textes qu'il cite sont toujours ceux du code actuel.

## Retours complémentaires de la revue

Chaque retour ci-dessous précise ou complète un retour du mainteneur, ou
couvre un point qu'il n'aborde pas. Ils sont rangés selon ses sections.

### Section 1 : création et génération

- **Le verdict « Prête ».** Il compte les promesses manquées et ne dit rien
  d'autre. Le compte lui-même est une réponse à la question du mainteneur :
  « 56/56 contrastes tenus », ou « 2 contrastes manqués ». La planche emploie
  déjà ce compte dans l'en-tête d'un cadre ([PLA-07]).
- **« Générer sur Figma » et l'état du cadre.** Le bouton actuel a le même
  aspect quand le cadre de la palette est à jour, périmé ou jamais dessiné.
  L'état ne se lit que dans l'onglet Planche. Afficher cet état à côté du
  bouton, au même niveau que « Voir sur la planche », dit au designer s'il
  doit générer de nouveau.
- **La grille de contraste suit une case cachée.** La case « Grille de
  contraste » est dans l'onglet Planche, et le bouton de l'onglet Palettes la
  lit aussi (`ongletPlanche.grille()` dans `index.ts`). Un designer qui l'a
  cochée une fois génère ensuite des cadres plus lourds sans voir l'option.
  L'option doit être visible là où elle s'applique.
- **Le nom de la palette.** Une palette neuve s'appelle par son hexa, qui
  s'affiche alors trois fois : dans le sélecteur, dans le champ de référence
  et en exemple du champ de nom. Demander le nom dans la zone de création
  supprime ce doublon.
- **La suppression.** « Supprimer » est un bouton plein principal, sans marque
  de danger.

### Section 2 : visualisation des palettes

- **La couleur de base n'est pas un cran.** La rampe se construit autour
  d'elle sans la contenir : `#FACC15` tombe entre les crans 300 et 400. Le
  contour que propose le mainteneur se pose sur le cran le plus proche, et un
  repère entre deux crans situe la position exacte. Le graphe de dérive porte
  déjà un losange au même endroit, le pivot ; le même signe dans la
  visualisation relierait les deux vues.
- **Les fonctions des crans.** La table des emplois de la spécification donne
  la fonction de chaque cran, commune à toutes les palettes :

  | Emploi | Cran | États survol et appui |
  |---|---|---|
  | `solid` | 700 | 800, 900 |
  | `on-solid` | fond de référence | aucun |
  | `text` | 700 | 800, 900 |
  | `surface` | 100 | 200, 300 |
  | `border-control` | 600 | 700, 800 |
  | `border-decorative` | 300 | aucun |
  | `focus` | 600 | aucun |

  Les « range » que demande le mainteneur sont ces suites d'états : un emploi
  occupe son cran et les deux suivants. `on-solid` n'a pas de cran : il prend
  le fond de référence du thème.
- **Une promesse manquée désigne ses pastilles.** Une promesse est une paire,
  par exemple `text` 700 sur `surface` 100. Quand elle manque, entourer les
  deux pastilles de la paire montre le problème sans lire le message.
- **Le survol déplace le contenu.** La ligne qui détaille un cran survolé
  remplace la ligne d'aide et passe sur deux lignes à 440 px de large : tout ce
  qui suit saute. L'explication au clic que demande le mainteneur supprime ce
  saut si elle occupe une place réservée.

### Section 2 : réglage de la dérive

- **L'échelle du graphe.** L'ordonnée va de -90° à +90°. La dérive Tailwind la
  plus forte du relevé vaut -50°, celle d'un bleu courant vaut -7,5° et +5,1°.
  La courbe tient dans un sixième des 200 px du graphe et paraît plate. Une
  échelle de ±30°, élargie dès qu'une valeur ou un glisser la dépasse, rend la
  courbe lisible.
- **Désynchroniser soft et vivid.** Une piste pour la demande du mainteneur :
  une case « Même dérive pour soft et vivid », cochée par défaut. Décochée,
  elle fait apparaître le sélecteur de profil qu'il juge clair, et le graphe
  trace deux courbes, pleine et tiretée.
- **La saturation de vivid.** Le réglage que propose le mainteneur existe déjà
  sous une autre forme : la part de chroma de chaque profil, globale dans la
  configuration, propre à la palette dans « Avancé ». Un curseur de
  saturation de vivid dans la visualisation remplacerait « Avancé » pour ce
  profil. Une borne le contraint : soft ne dépasse jamais vivid.
- **Le libellé « Bout sombre »** passe sur deux lignes : la colonne des
  libellés est trop étroite.
- **Les contrastes pendant le réglage.** La dérive passe sous la
  visualisation, et les constats plus bas encore. Un glisser qui fait manquer
  un contraste doit se voir sans défiler : un compte des contrastes manqués à
  côté du graphe suffit.

### Section 2 : alertes et messages

- **Deux alertes sonnent sur presque toutes les palettes.** Le moteur a
  analysé une palette neuve pour chacune des dix-sept teintes 500 de Tailwind,
  puis des dix-sept teintes 600, avec les réglages par défaut. Les 34 couleurs
  déclenchent « Référence plus claire que le bouton ». « Profils confondus »
  sonne pour 11 teintes 500 et 12 teintes 600. Toute palette neuve s'affiche
  donc en jaune, et le designer apprend à ignorer le jaune avant qu'une alerte
  utile arrive.
- **« Référence plus claire que le bouton ».** Le mainteneur juge inutile la
  section « Boutons » de la planche, qui porte la même information. L'alerte
  de l'onglet Palettes sonne pour toute couleur plus claire que le cran 700 et
  ne se lève qu'en changeant de couleur de marque : elle suit le même sort.
- **« Profils confondus ».** Le vrai problème, dans les mots du designer :
  au cran 100, la version soft et la version vivid sont presque identiques, et
  un composant qui passe de l'une à l'autre ne change pas visiblement. Le
  geste qui le lève modifie la saturation de toutes les palettes : sa place
  est dans la configuration, où ce geste se fait.
- **Le poids des sévérités est inversé.** Une promesse manquée porte un filet
  rouge sans fond, une alerte un filet orange sur fond jaune
  (`.constat-promesse` et `.constat-alerte` dans `styles.css`). La promesse
  manquée, plus grave, pèse moins. Le signalement par sévérité que demande le
  mainteneur doit suivre l'ordre bloquant, contraste manqué, alerte,
  information.
- **Un message nomme son geste sans y mener.** « Réglez la dérive ou les parts
  de la palette, ou la courbe claire dans la configuration » renvoie à trois
  endroits, dont un replié et un masqué. Chaque geste doit être un lien qui
  ouvre l'endroit, comme le lien vers les fonds de référence que demande le
  mainteneur.
- **Les messages en double.** Un contraste manqué en soft et en vivid sur la
  même paire fait deux blocs presque identiques. Un bloc par paire et par
  thème suffit : « text sur surface, thème Light : soft 4,18, vivid 4,31, pour
  4,5 ».

### Onglet Planche

- **L'état de chaque palette.** Dans l'affichage que propose le mainteneur,
  chaque palette porte deux états : son cadre sur Figma (à jour, périmé, jamais
  généré) et ses contrastes (tenus ou manqués). Aujourd'hui, les trois états
  du cadre ont le même gris, et les contrastes manqués n'apparaissent pas :
  une palette qui en manque se génère depuis cet onglet sans que le designer
  le voie.
- **Une action pour les cadres périmés.** Quand deux cadres sont périmés,
  l'action utile est « Générer les 2 cadres périmés », plutôt que de tout
  générer.
- **L'en-tête.** Il affiche la version de la recette et son empreinte, qui ne
  décident d'aucun geste. Le compte « 0 palettes » s'écrit « aucune palette ».
- **La lecture automatique des planches.** Le plugin lit déjà deux choses dans
  le fichier ouvert : les réglages de toutes les palettes, rangés sur le
  document, et les cadres qu'il a dessinés, retrouvés par leur identifiant.
  Le cas que la demande du mainteneur vise reste à préciser : un cadre copié
  depuis un autre fichier, une planche sans ses réglages, ou l'affichage des
  palettes du fichier dans l'onglet.
- **« Ajouter aux tokens du DS ».** La spécification range la création de
  variables en option ultérieure, hors de tout lot (section 17).

### Terme « Recette »

Le mot désigne l'ensemble des réglages qui fabriquent les palettes du
fichier : clartés de chaque cran, saturation des deux profils, fonds de
référence, seuils. Il apparaît dans les messages, l'en-tête de l'onglet
Planche, le titre de la configuration et les boutons d'export et d'import.
« Réglages des palettes » dit la même chose.

### Panneau de configuration

- **L'aperçu disparaît pendant le réglage.** L'engrenage remplace la vue de
  travail par la configuration. Le designer change une clarté ou une
  saturation sans voir les palettes ni les contrastes. Un aperçu compact de la
  palette ouverte en tête du panneau, avec le compte des contrastes manqués
  sur toutes les palettes, montre l'effet de chaque saisie.
- **Les clartés sans tracé.** Les deux courbes sont vingt-deux champs de
  texte. Un tracé au-dessus des champs, sur le modèle du graphe de dérive,
  montre leur forme.
- **Les seuils d'accessibilité.** 4,5 et 3 sont des seuils de WCAG, modifiables
  au même niveau que les choix visuels. Les abaisser change le sens de
  « contraste tenu » sur toutes les planches : ils méritent une section à part,
  repliée.
- **Le retour aux valeurs par défaut** n'existe pour aucune section.

### Planche générée sur Figma

- **Les niveaux de contraste.** Les deux seuils du plugin correspondent à des
  niveaux de WCAG 2 : 4,5 est le niveau AA du texte courant, 3 le niveau AA du
  grand texte et des éléments d'interface. Le niveau AAA du texte courant vaut
  7, et le plugin ne le mesure pas. Afficher « AA », « AAA » ou « Échec »,
  comme le demande le mainteneur, demande d'ajouter ce troisième seuil.
- **La légende de la grille de contraste.** La grille colore chaque case en
  vert, jaune ou gris selon le seuil tenu (section 9.5). Sa légende donne ces
  trois couleurs et leur niveau.

### Points transversaux

- **Un refus d'enregistrement laisse travailler dans le vide.** Quand les
  réglages ont changé ailleurs, le plugin propose « Recharger », qui perd la
  dernière modification. Les champs restent modifiables, mais plus rien ne
  s'enregistre tant que le designer n'a pas rechargé ; le seul signe est
  « non rangé », en petit. Figer l'onglet pendant ce refus, et proposer
  d'exporter sa version avant de recharger.
- **L'écart d'import ne dit pas ce qui change.** « Palette modifiée : Bleu
  roi » ne dit pas quel réglage, « Paramètre commun modifié : seuils » ne
  donne pas les valeurs. L'écart ne dit pas non plus ce que la planche perd :
  le cadre d'une palette retirée devient orphelin, celui d'une palette
  modifiée devient périmé.
- **Un dessin interrompu cite l'exception brute** : « in set_characters: font
  not loaded ».
- **La génération réussie n'a pas d'état dans la galerie.** Le message de
  succès et « Voir sur la planche », que le mainteneur veut placer à côté du
  bouton, n'ont jamais été regardés hors de Figma.

## Recommandations de la première revue écartées

| Recommandation | Retour du mainteneur qui l'écarte |
|---|---|
| Afficher en permanence la couleur du bouton, cran 700, sur la ligne de la référence | La section « Boutons » de la planche est « à supprimer » |
| Montrer les thèmes clair et sombre empilés, sans bascule | Les onglets restent, nommés « Thème Light » et « Thème Dark » |
| Changer le libellé du bouton selon l'état du cadre, « Dessiner » ou « Redessiner » | Le bouton s'appelle « Générer sur Figma » |
| Masquer la visualisation principale quand l'éditeur de dérive est ouvert | La dérive se place sous la visualisation, et la couleur de base doit se voir dans la rampe de l'éditeur |
| Expliquer au premier lancement, en une phrase, ce que produit une palette | La différence entre soft et vivid s'explique par un réglage, pas par des phrases |
| Laisser le libellé « part de chroma » en information secondaire | La ligne est « à supprimer » |

## Exigences de la spécification touchées

Les retours du mainteneur changent ces exigences de la
[spécification](./RECHERCHE-PLUGIN-PALETTES.md). Elles se réécrivent avant le
lot qui les implémente.

| Exigence | Ce qu'elle dit | Ce que le retour change |
|---|---|---|
| [UI-02] | Deux onglets ; l'onglet Planche porte les gestes du document | L'onglet Planche montre chaque palette, sa rampe et quatre actions |
| [UI-04] | Pastilles de 24 px, valeurs au survol seulement | Pastilles plus grandes, numéro et fonction de chaque cran, explication au clic |
| [UI-05] | « Dessiner » range et dessine la palette ouverte, au rang 1 | « Générer sur Figma », dans la section de configuration de la palette |
| [PLA-06] | « Dessiner » et « Dessiner toutes les palettes » | « Générer sur Figma » |
| [PLA-07] | En-tête du cadre : version, empreinte, espace, promesses | Hiérarchie revue ; mention « remplacé à chaque dessin » retirée |
| [PLA-08] | Carte de la référence ; cran 700 `vivid` affiché à côté quand l'alerte sonne | Couleur de base nommée comme telle, valeurs remises en contexte, section « Boutons » retirée |
| [PLA-09] | Sections light et dark peintes de leur fond | Une bordure délimite chaque section |
| [PLA-10] | Une rangée porte son profil et sa part de chroma | La part se retire, ou s'explique ailleurs |
| Section 9.3 | Carte d'un cran : nom, hexa, OKLCH, contrastes, seuil tenu | Niveau AA, AAA ou échec ; fonctions du cran ; nom redondant retiré |
| Section 9.5 | Grille de contraste | Légende |
| Section 11.4 | Notice `LEGACY` | Retirée |
| [VER-12] | Alerte « Référence plus claire que le bouton » | Retirée, avec la section « Boutons » |
| [DER-12] | Bouton de lien « soft = vivid » | Autre moyen de montrer que les deux dérives se désynchronisent |
| Section 2 | Vocabulaire : « recette » | Terme à remplacer |
