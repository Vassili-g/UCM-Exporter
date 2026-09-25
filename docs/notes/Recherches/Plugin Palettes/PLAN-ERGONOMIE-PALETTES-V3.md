# UCM Palettes : plan d’ergonomie, troisième tour

## Résultat attendu

Le designer choisit ou crée une palette dans une barre à la largeur du
panneau, et lit sous son nom la configuration, puis l’aperçu des nuances. Les
onglets Light et Dark se voient, et la couleur de fond se change d’un clic sur
sa pastille, dans un sélecteur de couleur en hexadécimal. L’onglet Planches
traite chaque palette supprimée comme une carte, qu’on peut effacer de Figma.
Une palette peut sortir du modèle du design system : elle devient une palette
libre, avec ses propres numéros, sans garanties affichées. Une référence à la
limite d’une garantie peut s’ajuster d’un pas de luminosité, sans perdre
l’originale. La planche générée raconte une histoire choisie avec le
mainteneur.

Ce plan est destiné à l’agent qui réalisera les changements. Il remplace les
cases encore ouvertes du [second plan](./PLAN-ERGONOMIE-PALETTES-V2.md), dont
les décisions restent valables quand ce document ne les remplace pas. Il ne
s’implémente pas avant que le mainteneur l’ait relu.

## Autorités

Lire dans cet ordre :

1. les [retours du mainteneur](#retours-du-mainteneur-round-3), conservés
   sans modification, et ses [réponses](#réponses-du-mainteneur) ;
2. les décisions ci-dessous ;
3. les maquettes du lot W3, une fois validées ; d’ici là, les
   [maquettes du second tour](./MAQUETTES-ERGONOMIE-V2.html) et celles de la
   [planche et de la référence](./MAQUETTES-PLANCHE-ET-REFERENCE.html) ;
4. le [second plan](./PLAN-ERGONOMIE-PALETTES-V2.md), l’[instruction du nombre
   de nuances](./INSTRUCTION-NOMBRE-DE-NUANCES.md), les
   [décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md) et
   l’[inventaire des textes](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) ;
5. la [spécification](./RECHERCHE-PLUGIN-PALETTES.md), l’[architecture
   multi-marques](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
   [AGENTS.md](../../../../AGENTS.md) et [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

## Faits qui fondent les décisions

Relevés dans le code.

| Fait | Source | Conséquence |
|---|---|---|
| Les couleurs de fond sont un réglage commun, une valeur par thème. La pastille de l’aperçu et les Réglages communs lisent la même valeur | `recette.fonds`, `poserFond` | Changer le fond depuis l’aperçu le change partout, sans synchronisation à écrire. Le designer doit savoir que toutes les palettes suivent |
| Le sélecteur de couleur est l’`input type="color"` du navigateur, à quatre endroits : référence, création, deux fonds | `ongletPalettes.ts`, `creation.ts`, `configuration.ts` | Il s’ouvre en RGB dans Figma et ne se règle pas en hexadécimal. L’exigence « hexa par défaut » demande un sélecteur embarqué |
| Une palette supprimée garde son cadre ; le suivi le range parmi les orphelins | `fraicheurDeLaPlanche`, `cadreOrphelin` | « Supprimer définitivement » agit sur le document : cadre et suivi |
| Le suivi des cadres vit dans les données partagées de la racine, et chaque écriture se termine par un `commitUndo` | `src/ecriture/planche.ts` | Retirer le cadre et son suivi dans une seule écriture laisse un seul Ctrl+Z pour tout rendre |
| La courbe Light descend de 0,975 à 0,27 ; la courbe Dark monte de 0,18 à 0,93 | `RECETTE_PAR_DEFAUT` | Une nuance après 950 est plus foncée en Light, mais plus claire en Dark, entre 0,93 et 1 |
| Une nuance insérée entre 100 et 300, ou entre 600 et 900, décale les états des rôles | [Instruction](./INSTRUCTION-NOMBRE-DE-NUANCES.md#résumé) | Un préréglage de 13 nuances n’ajoute qu’entre 300 et 600, ou après 900 |
| `#16A34A` rate `border-control` et `focus` sur `surface`, 600 / 100, à 2,92:1 pour 3:1, en Vivid Light. Un pas de 0,01 de luminosité plus sombre donne `#0DA047`, qui tient tout au 600 | [Maquettes de la référence](./MAQUETTES-PLANCHE-ET-REFERENCE.html) | Le cas réel de W7 |
| La palette neutre de la bibliothèque, `titanium`, numérote 900, 1000, 1100, sans 950, et descend à 0,280, 0,213 puis 0,182 de luminosité OKLCH. Le plugin ne fabrique pas de rampe neutre (D8), et l’architecture cible donne au neutre onze crans | `intencial-library/src/tokens/tokens.json`, relevé du 2026-09-25 | Le 1050 du préréglage de 13, à 0,165, descend plus bas que le neutre. Aller au-delà de 950 ne pose pas de problème ; seul le pas diffère, 50 ici et 100 dans `titanium` |
| À luminosité OKLCH égale, changer la chroma déplace peu le contraste ; l’intensité d’un profil se règle déjà dans « Intensités » | `[ENT-09]`, carte Intensités | L’ajustement de la référence n’agit que sur la luminosité |

## Décisions

| Sujet | Décision |
|---|---|
| Sélecteur de palette | La liste déroulante prend toute la largeur libre de la ligne. « + » devient « + Nouvelle palette ». « + Nouvelle palette » et « … » ont la hauteur de la liste |
| Titres | Titre de premier rang : « Palette [nom] », avec le nom affiché dans le sélecteur. La carte « Couleur de base » devient « Configuration de la palette ». Ces libellés viennent du mainteneur : ils entrent validés dans l’inventaire |
| Création | Une carte sur le modèle de « Configuration de la palette » : trois colonnes, libellé au-dessus du champ ; Nom, Couleur de référence, Palette de base (Auto par défaut) ; puis Créer, Depuis la sélection, Annuler |
| Onglets de thème | Tout à gauche de l’en-tête de la carte d’aperçu. L’onglet actif prend un fond plus foncé. Le titre « Aperçu » disparaît |
| Fond du thème | La pastille du fond s’ouvre au clic sur le sélecteur de couleur ; « Modifier » disparaît. Le sélecteur dit que le fond vaut pour toutes les palettes |
| Ligne de la référence | « ◆ Référence : Vivid · nuance 400 » passe sous le nuancier. V3.1 est inversé |
| Sélecteur de couleur | Embarqué, dans le style de Figma, hexadécimal par défaut, sans requête externe. Maquette W3.1 validée : 232 px sous le contrôle, Hex à chaque ouverture ; pastilles des onze nuances Vivid sur la référence, fonds par défaut, blanc et deux nuances claires sur un fond |
| Luminosité des nuances | Disposition A : tracé pleine largeur, table dessous, une colonne par nuance alignée sur son point. Flèches : 0,005, et 0,05 avec Maj |
| Minimums et détection | Disposition A : une ligne par seuil, libellé et aide à gauche, champ et unité alignés à droite. L’unité ΔEok reste |
| États d’un emploi | `default`, `hover`, `active`, et `focus` pour l’anneau, sur la planche et dans le plugin |
| Onglet Planches | Renommé « Planches » |
| Palette supprimée | Une carte par palette, teinte orange discrète, texte court, « Afficher dans Figma » et « Supprimer définitivement ». Ce dernier retire le cadre de Figma et oublie son suivi, sans confirmation : le Ctrl+Z de Figma rend les deux |
| Réglages communs | « Luminosité des nuances », « Minimums des promesses » et « Détection des couleurs proches » suivent des maquettes validées |
| Planche générée | Récit R1, « quelle nuance pour quel usage », validé en W3.6. Dans chaque thème : les deux rampes, les usages du profil porteur avec leurs états, l’interface d’exemple E2 (écran de réglages composé, sur le modèle de Radix Themes), puis les grilles des contrastes Soft et Vivid, alignées sur les rampes et peintes des paires réelles, effacées sous 3:1. L’autre profil se lit dans les rampes |
| Nombre de nuances, mode standard | Préréglages de 9, 11 et 13 nuances, communs au fichier. 9 retire 400 et 950. 13 ajoute 1000 et 1050 (W6.1) : 0,215 et 0,165 en Light, 0,96 et 0,98 en Dark. Le préréglage Tailwind de la dérive se calcule sur les bouts 50 et 950, si bien qu’ajouter 1000 et 1050 ne déplace aucune nuance existante. L’architecture multi-marques admet ces trois préréglages |
| Nombre de nuances, palette libre | Par palette : 4 à 13 nuances, numéros choisis parmi les multiples de 50, de 50 à 1050 quel que soit le préréglage commun ; 1000 et 1050 prennent la luminosité du préréglage de 13. Choix du modèle à la place de la palette de base, numéros en puces. Une palette libre ne montre ni rôles, ni accolades, ni `on-solid`, ni garanties |
| Ajuster la référence | Pas de 0,01 de luminosité OKLCH, luminosité seule, originale gardée dans la palette |
| Format de la recette | Palette libre et originale de la référence sont deux champs nouveaux d’une palette. Ils se conçoivent ensemble et entrent dans un seul format 3 |
| Textes N043 à N074 | Relecture reportée par le mainteneur. Ce plan n’attend pas leur validation |

## Reprise du second plan

| Case du second plan | Sort |
|---|---|
| V1.2, galerie d’UCM Exporter relue aux deux thèmes dans Figma | Reprise en W8.2 |
| V1.4, test `[UI-03]` à 500 × 520 | Reprise en W1.8, sur la nouvelle tête de l’onglet |
| V3.1, ligne de la référence au-dessus du nuancier | Inversée par W1.5 |
| V3.4, accolades vérifiées à 500 et 600 px | Reprise en W8.2 |
| V6.4, temps d’une génération de douze palettes | Reprise en W5.6, sur la nouvelle planche |
| V7.4, cases d’implémentation du nombre de nuances | Remplacée par W6 |
| V8.6, cadres dans une section ou sur une autre page sous `dynamic-page` | Reprise en W8.2 |
| V9.6, confort du sélecteur natif | Jugé à la recette : remplacé par W4.1 |
| V10.11, interface d’exemple sur la planche | Absorbée par W3.4 |
| V11.1, V11.2, ajuster la référence | Décidées ; remplacées par W7 |
| V12.3, V12.5, recette et rechargement dans Figma | Reprises en W8 |
| Textes N043 à N074 et T107 | Reportés ; hors de ce plan |

Les cases faites du second plan restent acquises. Leur comportement se
conserve quand un lot de ce plan déplace l’élément qui le porte : focus,
clavier, routage par `data-cible`, retour après ouverture d’un réglage,
contrôles créés une fois et non à chaque rendu.

## Ordre d’exécution

| Étape | Lots | Dépendance |
|---|---|---|
| Règles et documents | W0 | Relecture de ce plan |
| Onglet Palettes, corrections directes | W1 | W0 |
| Onglet Planches, palettes supprimées | W2 | W0 |
| Maquettes à valider | W3 | W0 ; se fait en parallèle de W1 et W2 |
| Sélecteur de couleur et cartes des Réglages communs | W4 | W3.1 à W3.3, validés |
| Planche générée | W5 | W3.6, validé |
| Nombre de nuances | W6 | Choix du 13 sur rampes (W6.1), conception du format 3, revue indépendante |
| Ajuster la référence | W7 | Conception du format 3 commune avec W6 |
| Recette et clôture | W8 | Parcours finis |

Chaque lot suit les règles de code, de test et de relecture de
CONTRIBUTING.md, met à jour la documentation qu’il touche et préserve les
modifications des autres sessions. Une capture ne prouve ni une interaction ni
une sauvegarde.

## Lot W0 : règles, documents et galerie

- [x] **W0.1** Mettre à jour « Les surfaces d’UCM Palettes » dans
  CONTRIBUTING.md : titre « Palette [nom] », carte « Configuration de la
  palette » en tête, création sur le même modèle, onglets de thème à gauche
  de la carte d’aperçu sans titre, ligne de la référence sous le nuancier.
- [x] **W0.2** Mettre à jour la spécification : `[UI-04]` (ligne de la
  référence, onglets de thème, fond cliquable), `[UI-06]` (sélecteur et
  création), `[UI-11]` (titres), section 13.2 et l’onglet Planches ; ajouter
  l’exigence de « Supprimer définitivement ». Le sélecteur de couleur, la
  palette libre et l’ajustement de la référence entrent avec leurs lots.
- [x] **W0.3** Porter dans l’inventaire des textes les libellés dictés par le
  mainteneur, marqués validés : « + Nouvelle palette », « Palette [nom] »,
  « Configuration de la palette », « Planches », « Supprimer
  définitivement ». Ajouter, marqués « À valider », le texte court d’une
  palette supprimée et la mention du fond commun. Ne pas redemander N043 à
  N074.
- [x] **W0.4** Déclarer dans `galerie/etats.cjs` les états de ce plan :
  création en carte, palette supprimée en carte, fond ouvert dans le
  sélecteur de couleur, palette libre, référence ajustée. Chaque état annoncé
  nomme la case qui le rendra atteignable.

Critère : l’agent peut placer chaque élément de W1 et W2 sans relire ce plan,
à partir de la spécification et de CONTRIBUTING.md.

## Lot W1 : onglet Palettes, corrections directes

Fichiers : `selecteur.ts`, `menuPalette.ts`, `creation.ts`,
`ongletPalettes.ts`, `nuancier.ts`, `styles.css`, `textes.ts`.

- [x] **W1.1** La liste déroulante prend toute la largeur libre de sa ligne ;
  « + Nouvelle palette » et « … » gardent leur largeur naturelle. Vérifier un
  nom long à 500 px : il se coupe par des points de suspension, sans pousser
  les boutons hors du panneau.
- [x] **W1.2** « + Nouvelle palette » et « … » prennent la hauteur de la liste
  déroulante, par une hauteur commune du socle et non par un nombre de pixels
  répété.
- [x] **W1.3** Titre de premier rang « Palette [nom] », avec le nom que
  `nomDeLaPalette` donne au sélecteur ; il suit un changement de nom sans
  faire perdre le focus du champ Nom. La carte « Couleur de base » devient
  « Configuration de la palette ».
- [x] **W1.4** Refaire la création en carte, sur le modèle de W1.3 : trois
  colonnes, libellé au-dessus du champ ; Nom, Couleur de référence (pastille
  et code), Palette de base (Auto, Soft, Vivid ; Auto par défaut). Créer,
  Depuis la sélection et Annuler sur une ligne sous les colonnes. Entrée crée,
  Échap annule quand Annuler est offert. Réutiliser `champEnColonne` et les
  segments de la palette de base, sans les recopier.
- [x] **W1.5** Dans la carte d’aperçu : retirer le titre « Aperçu » ; placer
  les onglets Light et Dark tout à gauche de l’en-tête ; donner à l’onglet
  actif un fond plus foncé, lisible aux deux thèmes de Figma, avec
  `aria-pressed` inchangé. La ligne « ◆ Référence » passe sous le nuancier.
- [x] **W1.6** La pastille du fond devient un bouton qui ouvre le sélecteur de
  couleur sur le fond du thème affiché ; « Modifier » disparaît. En attendant
  W4.1, le sélecteur natif s’ouvre. La saisie passe par `poserFond`, comme
  dans les Réglages communs : les deux vues montrent la même valeur. Une ligne
  sous le sélecteur dit que le fond vaut pour toutes les palettes. Le bouton
  porte une étiquette accessible qui nomme le thème et la valeur.
- [x] **W1.7** Les liens qui menaient à « Modifier » (`modifierLeFond`)
  ouvrent désormais la pastille, ou les Réglages communs quand le lien vient
  d’un message ; le retour suit R3.7.
- [x] **W1.8** (ex-V1.4) Test `[UI-03]` : à 500 × 520, sélecteur, titre, carte
  « Configuration de la palette » et haut de l’aperçu se lisent sans
  défiler. Si la création en carte ou la hauteur des boutons l’empêche, le
  dire au mainteneur plutôt que de réduire les marges.

Critère : aux deux thèmes de Figma, la tête de l’onglet tient sur une ligne,
les onglets de thème se distinguent sans lire leur texte, et le fond se change
sans quitter l’onglet.

## Lot W2 : onglet Planches et palettes supprimées

Fichiers : `ongletPlanche.ts`, `textes.ts`, `styles.css`, la frontière et
`src/ecriture/planche.ts`.

- [x] **W2.1** Renommer l’onglet « Planches » ; garder ses ancres et ses
  cibles de lien.
- [x] **W2.2** Afficher chaque palette supprimée dans une carte de même
  facture que les fiches, avec une teinte orange discrète : fond et bordure
  dérivés de la couleur d’avertissement du socle, lisibles aux deux thèmes,
  et jamais la couleur de danger. Titre : le nom de la palette. Texte : une
  phrase, à valider (W0.3). Gestes : « Afficher dans Figma », « Supprimer
  définitivement ». Les copies et la recherche bornée gardent leur notice.
- [x] **W2.3** « Supprimer définitivement » retire le cadre de Figma et son
  entrée du suivi, dans une seule écriture terminée par un seul `commitUndo`.
  Aucune confirmation. Le geste est inactif, avec sa raison, pendant un
  conflit d’enregistrement (V12.1) et sur un suivi plus récent (V8.8).
  Un cadre qui a disparu entre la lecture et le geste oublie seulement son
  suivi, sans erreur.
- [x] **W2.4** Après le geste, la carte disparaît et le focus passe à la carte
  suivante, ou au compte de palettes. Un message bref dit que Ctrl+Z dans
  Figma rend le cadre.
- [ ] **W2.5** Tests : écriture qui retire cadre et suivi ensemble ; cadre
  déjà absent ; geste bloqué en conflit. Constater dans Figma qu’un seul
  Ctrl+Z rend le cadre et son suivi, et que le cadre revient comme palette
  supprimée, pas comme copie.
- [x] **W2.6** Mettre à jour l’invariant d’écriture d’UCM Palettes dans
  AGENTS.md : le plugin peut retirer un cadre qu’il possède, sur un geste
  explicite.

Critère : une palette supprimée se lit en une carte, et son cadre s’efface de
Figma en un clic, réversible par Ctrl+Z.

## Lot W3 : maquettes à valider

Un fichier `MAQUETTES-RECETTE-V3.html`, à ouvrir dans un navigateur, au format
des maquettes précédentes : panneau à 500 px, thème sombre de Figma, couleurs
et ratios calculés par le moteur pour `#1E6FD9` et `#16A34A`. Chaque maquette
se termine par ses questions, avec une recommandation.

- [x] **W3.1** Sélecteur de couleur dans le style de Figma : zone saturation
  et luminosité, curseur de teinte, champ hexadécimal par défaut, menu de
  format (hexadécimal, RGB, HSL), pastilles des couleurs de la palette ouverte.
  Pas d’opacité : une palette n’en a pas. La pipette de l’écran seulement si
  l’API `EyeDropper` répond dans l’iframe de Figma : à vérifier avant de la
  dessiner. Montrer l’ouverture depuis la pastille du fond, avec la mention du
  fond commun, et depuis la couleur de référence. Clavier : flèches sur la
  zone et le curseur, Échap referme et rend le focus.
- [x] **W3.2** Carte « Luminosité des nuances » : les champs Light et Dark par
  nuance aux tailles des trois niveaux de titre (V2), à côté du tracé des
  courbes. Deux dispositions au moins.
- [x] **W3.3** Cartes « Minimums des promesses » et « Détection des couleurs
  proches » : disposition refaite, libellé, valeur et unité alignés, aide
  lisible sans ouvrir d’infobulle. Deux dispositions au moins.
- [x] **W3.4** Planche générée. D’abord la question à laquelle elle répond,
  en deux ou trois récits : par exemple « quelle nuance pour quel usage »,
  « ma palette tient-elle ses promesses », ou une fiche de référence à la
  Radix. Chaque récit fixe l’ordre des sections, ce qui est gros et ce qui est
  une note. Puis le récit retenu en planche complète, Light et Dark, avec et
  sans interface d’exemple (ex-Q1). Donner le nombre de calques de chaque
  variante, grille des contrastes comprise, contre 686 et 1 898 aujourd’hui.
- [x] **W3.5** Palette libre : la carte « Configuration de la palette » avec
  le choix du mode, la liste des numéros, et l’aperçu sans rôles ni
  garanties ; sa fiche dans l’onglet Planches.

- [x] **W3.6** Planche, second tour, sur le récit R1 retenu : états nommés
  `default`, `hover`, `active` et `focus` ; deux interfaces d’exemple prises
  sur Radix Themes, E1 (composants par variante et par état) et E2 (écran de
  réglages composé) ; grilles des contrastes dans chaque thème, alignées
  colonne par colonne sur les rampes, une paire à 3:1 ou plus peinte de ses
  vraies couleurs, effacée en dessous. Cadre de Bleu : 1 636 calques avec
  grilles, 1 790 avec E1, 1 710 avec E2, contre 1 898 aujourd’hui. Validé : E2, les grilles
  peintes, le vocabulaire dans le plugin, et les deux rampes en tête de chaque
  thème.

Critère : le mainteneur valide ou corrige chaque maquette sans avoir à
imaginer une interaction.

## Lot W4 : sélecteur de couleur et cartes des Réglages communs

Après validation de W3.1 à W3.3.

- [x] **W4.1** Réaliser le sélecteur de couleur dans le socle commun s’il sert
  à UCM Exporter, sinon dans `src/ui/` d’UCM Palettes. Sans dépendance
  externe ni requête. Il remplace le sélecteur natif aux quatre endroits :
  référence, création, fonds des Réglages communs, fond de l’aperçu. Un
  glisser prévisualise, sa fin enregistre, comme les curseurs (V9.9).
  Fait dans `src/ui/couleur/` d’UCM Palettes : UCM Exporter ne choisit
  aucune couleur. Exigence `[UI-13]` de la spécification. La création ne
  propose aucune pastille : la palette n’existe pas encore, et W3.1 ne
  dessinait que la référence et le fond. La pipette de l’écran n’est pas
  ajoutée ; `EyeDropper` se vérifie dans Figma en W8.2. Galerie : « Fond
  dans le sélecteur de couleur » et « Référence dans le sélecteur de
  couleur ». Textes N087 à N090, à valider.
- [x] **W4.2** Tests : conversions entre formats, code saisi invalide gardé
  dans son champ, clavier, focus rendu à la fermeture.
  `tests/formatsDeCouleur.test.ts` pour les conversions ; quatre tests
  d’interface pour le reste. Vus rouges sur deux mutations : Échap qui ne
  rend pas le focus, un glisser qui enregistre en cours de mouvement.
- [x] **W4.3** Refaire « Luminosité des nuances » selon W3.2, sans perdre la
  validation par champ ni « Rétablir ». Le tracé occupe la première ligne
  de la table, au-dessus des colonnes : chaque champ tombe à 2 px de son
  point. Titres de ligne « Light » et « Dark » (N091, à valider). Vu rouge
  sur deux mutations : le pas des flèches, le tracé étendu à la colonne des
  titres.
- [x] **W4.4** Refaire « Minimums des promesses » et « Détection des couleurs
  proches » selon W3.3, avec leurs résumés repliés. Les libellés validés
  restent ; chaque ligne reçoit une aide courte (N092, à valider), et
  l’aide des écarts, qui dit ce que mesure ΔEok, passe au pied de sa carte.

Critère : aucune couleur ne se choisit plus dans le sélecteur natif, et les
Réglages communs ont la même échelle typographique que l’onglet Palettes.

## Lot W5 : planche générée

Après validation de W3.4.

- [x] **W5.1** Réécrire le modèle de planche (`src/planche/modele.ts`) selon
  le récit retenu, avec les styles nommés de V10.8, étendus au besoin. Fait
  sur la maquette W3.6 ; section 9 de la spécification récrite. Six styles :
  un style « chiffre » s’ajoute, pour les numéros, les verdicts et les
  garanties manquées. Le nœud de cadre gagne l’alignement, la marge latérale
  et le remplissage de la largeur du parent, que `ecriture/planche.ts`
  traduit. Le récit retire de la planche le bloc de la référence, les cartes
  de nuance, `on-solid` et ses accolades, la section des garanties, les
  points à vérifier et la légende : les mesures de la référence restent dans
  le détail d’une nuance et dans le rapport (`[PLA-08]`). Textes N093 à N099.
- [x] **W5.2** Garder ce que les lots V10 ont établi et que le récit ne remet
  pas en cause : aucun texte de version ni d’empreinte, filets de section
  lisibles aux deux fonds, peinture selon le profil du document, polices
  chargées avant le premier calque, grille des contrastes toujours présente.
  L’option `grille` reste dans le modèle et le message de dessin ;
  l’interface l’envoie toujours à vrai.
- [x] **W5.3** Ajouter l’interface d’exemple E2 de W3.6, peinte du profil
  porteur, dans chaque thème (`[PLA-28]`). Chaque couleur y vient de la
  table des emplois, jamais d’un numéro écrit à la main.
- [x] **W5.4** Faire entrer le nouveau modèle dans l’empreinte : tous les
  cadres existants passent « À mettre à jour ». L’empreinte se calcule sur
  l’arbre et les styles ; l’arbre et les styles ont changé.
- [ ] **W5.5** Tests du modèle : chaque paire du moteur reste représentée,
  une palette libre (W6) n’a pas de section de garanties. Première moitié
  faite : chaque paire se lit sous chacun de ses membres qui a une ligne
  d’usage, dans chaque thème, vu rouge sur une mutation. La seconde attend
  W6.
- [ ] **W5.6** (ex-V6.4) Mesurer dans Figma le temps et le nombre de calques
  d’une génération de douze palettes ; appliquer `[PLA-24]` au résultat.
  Hors de Figma, le cadre de Bleu compte 1 712 calques avec les grilles,
  546 sans, contre 1 898 et 686 avant W5.

- [x] **W5.7** Passer les états du plugin à `default`, `hover`, `active` :
  `NOM_DE_L_ETAT`, la légende des garanties et les phrases « au survol », « à
  l’appui » (`textes.ts`), avec leurs entrées dans l’inventaire des textes
  (N100). Une phrase dit « Texte coloré (text), état hover ».

Critère : sans le plugin, le designer comprend en un regard ce que la planche
lui dit, dans l’ordre choisi en W3.6.

## Lot W6 : nombre de nuances

Le mode standard garde le modèle du design system ; la palette libre en sort.

- [x] **W6.1** Calculer les rampes des deux candidats au préréglage de 13 :
  450 et 550, ou deux nuances après 950. Pour le second, proposer les numéros
  et une méthode de luminosité au-delà de la courbe : en Light sous 0,27, en
  Dark au-dessus de 0,93, où il reste peu d’écart avant le blanc. Présenter
  `#1E6FD9` et `#16A34A` aux deux thèmes ; le mainteneur choisit. Choisi :
  1000 et 1050.
- [x] **W6.2** Écrire la conception : champ de la palette libre (nom décidé
  ici), bornes des numéros (multiples de 50, de 50 à 1050 ; 4 à 13
  nuances), luminosité d’une nuance libre par interpolation des courbes
  communes à son numéro, et au-delà de 950 par celles du préréglage de 13
  quand la liste commune s’arrête à 950, préréglages et leurs
  courbes par défaut, « Rétablir » par préréglage. Reprendre le tableau de
  l’[instruction](./INSTRUCTION-NOMBRE-DE-NUANCES.md#v71-ce-qui-suppose-onze-nuances-ou-un-numéro-précis)
  et dire, pour chaque ligne, ce que devient une palette libre : alertes de
  fond et de palettes proches, garanties, dérive, aperçu, planche, fiche.
  Écrite dans [CONCEPTION-NUANCES-ET-FORMAT-3.md](./CONCEPTION-NUANCES-ET-FORMAT-3.md).
  Le champ se nomme `crans`. La luminosité au-delà de la liste suit une
  règle proportionnelle vers le bord, exacte sur les courbes par défaut.
- [x] **W6.3** Conception du format 3, commune avec W7.2 : les deux champs
  nouveaux, la migration du format 2 et ses tests. Revue indépendante de
  W6.2 et de ce format avant le code ; ses conclusions se vérifient dans le
  code avant d’être appliquées. Revue faite, vérifiée et intégrée. Elle a
  changé quatre points : les bouts de la dérive se lisent aux numéros 50 et
  950 ; 11 → 13 et 11 → 9 déplacent l’ancrage de certaines références, que le
  geste compte ; l’analyse porte la liste de la palette ; deux palettes
  libres se comparent dès qu’elles portent 500, 600 et 700.
- [ ] **W6.4** Réglage du préréglage dans les Réglages communs, à la place
  que V9.2 lui réservait. Un changement de préréglage dit combien de palettes
  et de cadres il touche.
- [ ] **W6.5** Choix du mode dans la carte « Configuration de la palette » :
  standard ou libre, puis la liste des numéros d’une palette libre, selon
  W3.5. Une palette libre masque accolades, `on-solid`, carte des garanties
  et bilans de garanties ; la référence garde ses octets exacts et sa nuance
  la plus proche.
- [ ] **W6.6** Planche et fiche d’une palette libre : « Palette libre ·
  N nuances » à la place des résultats Soft et Vivid ; rampes, référence et
  grille des contrastes restent.
- [ ] **W6.7** Mettre à jour l’architecture multi-marques, section 1 : les
  préréglages 9, 11 et 13 et leurs numéros ; une palette libre n’alimente pas
  `theme`. Réviser `[DER-01]`, `[REC-05]` et `[ENT-08]` dans la
  spécification.
- [ ] **W6.8** Tests : chaque préréglage garde les rôles à leurs numéros ;
  une palette libre sans 500 ne déclenche aucune alerte qui le suppose ;
  propriété de la référence exacte dans une palette libre.

Critère : le designer passe de 11 à 13 nuances sans qu’un rôle change de
numéro, et crée une palette de six nuances pour un autre usage sans voir de
garantie qui ne la concerne pas.

## Lot W7 : ajuster la référence

Parcours des [maquettes](./MAQUETTES-PLANCHE-ET-REFERENCE.html), en trois
écrans sur `#16A34A`.

- [ ] **W7.1** Lien « Ajuster la référence » parmi les réglages qu’une
  garantie en échec propose, et sous le code de la couleur de référence.
- [ ] **W7.2** Champ de l’originale dans la palette, facultatif, dans le
  format 3 conçu en W6.3 : absent, aucun ajustement. Conçu : `originale`,
  section 3 de la conception.
- [ ] **W7.3** Panneau d’ajustement : originale et proposition côte à côte,
  « − » et « + » par pas de 0,01 de luminosité OKLCH, chroma et teinte
  gardées, code saisissable, nuance visée par thème, garanties avant et
  après. Un pas qui ferait changer la référence de numéro l’annonce avant.
  La proposition part de l’originale ; rien ne change tant que le designer ne
  fait pas de pas.
- [ ] **W7.4** Seul Appliquer change la référence. Annuler et Échap
  referment sans rien écrire. Après Appliquer : « Ajustée depuis #16A34A ·
  Revenir à l’originale », lisible après réouverture, dans l’export et sur
  la planche.
- [ ] **W7.5** Aucun ajustement automatique, aucun effet à l’ouverture du
  panneau, aucune proposition imposée par une courbe ou un minimum.
- [ ] **W7.6** Tests : un pas sombre sur `#16A34A` donne `#0DA047` au 600 ;
  aller-retour vers l’originale ; lecture d’une recette de format 2.

Critère : le designer corrige une référence à la limite sans perdre sa couleur
d’origine, et le plugin ne change jamais la couleur à sa place.

## Lot W8 : recette et clôture

- [ ] **W8.1** (ex-V12.5) Construire code et interface ensemble, puis
  recharger le plugin dans la copie partagée avant la recette Figma.
- [ ] **W8.2** Exécuter la recette ci-dessous, avec les constats restés
  ouverts du second plan : galerie d’UCM Exporter aux deux thèmes (V1.2),
  accolades à 500 et 600 px (V3.4), cadres dans une section et sur une autre
  page sous `dynamic-page` (V8.6). Consigner les observations et les limites.
- [ ] **W8.3** Mettre à jour AGENTS.md, la spécification et les liens des
  plans. Marquer le second plan comme remplacé pour ses cases ouvertes.

Critère de clôture : contrôles du dépôt, typecheck, build, tests d’interface
de Palettes et recette Figma terminés.

Après W4, 36 des 83 tests d’interface échouent, tous écrits avant W1 : ils
visent des classes et des structures que les lots V et W ont remplacées
(`.config-groupe`, `.bouton-deplier`, `.ligne-reference`). Les 47 autres
passent, dont les six de W4. W8 récrit ou retire les 36 avant la clôture.

## Recette mainteneur

| Scénario | Résultat observable | Lots |
|---|---|---|
| Ouvrir une palette au nom long à 500 px | Liste à pleine largeur, boutons de même hauteur, nom coupé proprement | W1 |
| Créer une palette | Carte en trois colonnes, Auto par défaut | W1 |
| Lire l’aperçu | Onglets à gauche, onglet actif foncé, pas de titre « Aperçu », référence sous le nuancier | W1 |
| Cliquer la pastille du fond | Sélecteur ouvert en hexadécimal ; le fond change aussi dans les Réglages communs | W1, W4 |
| Supprimer une palette, puis son cadre | Carte orange discrète ; cadre effacé ; Ctrl+Z le rend comme palette supprimée | W2 |
| Ouvrir les Réglages communs | Luminosité, minimums et détection selon leurs maquettes | W4 |
| Générer une palette | Planche selon le récit retenu | W5 |
| Passer à 13 nuances | Rôles aux mêmes numéros, cadres à mettre à jour | W6 |
| Créer une palette libre de six nuances | Aucun rôle, aucune garantie ; planche sans garanties | W6 |
| Ajuster `#16A34A` d’un pas, fermer, rouvrir | `#0DA047` au 600, garanties tenues, originale restaurable | W7 |
| Navigation clavier | Focus visible dans le sélecteur de couleur, la création et les cartes des Planches | W1 à W7 |

La recette visuelle couvre 500 × 520 et 600 × 720, les deux thèmes de Figma,
les deux thèmes de palette, un fond personnalisé saturé, un nom long et
plusieurs garanties en échec.

## Hors périmètre

- Relecture des textes N043 à N074 et du texte modifié T107.
- Création de variables et ajout aux tokens du design system.
- Reconstitution de réglages depuis une planche étrangère.
- Ajustement de la chroma de la référence.
- Nombre de nuances différent d’une marque à l’autre en mode standard.

## Réponses du mainteneur

| Question | Réponse |
|---|---|
| Q1, interface d’exemple sur la planche | Absorbée par la refonte de la planche |
| Q2, pas de l’ajustement | 0,01 de luminosité |
| Ajuster la couleur de référence | Gardé |
| Q3, luminosité seule ou aussi chroma | Luminosité seule : la chroma déplace peu le contraste, et l’intensité se règle déjà dans « Intensités » |
| Q4, garder l’originale | Oui |
| Treize nuances plus foncées | Choix sur rampes calculées, entre 450 et 550 et deux nuances après 950 |
| Numéros d’une palette libre | Multiples de 50, choisis librement |
| Mode libre | Par palette |
| Architecture multi-marques | Admet 9, 11 et 13 nuances |
| « Supprimer définitivement » | Retire le cadre de Figma et oublie son suivi ; Ctrl+Z de Figma autorisé, sans confirmation |

### Réponses aux maquettes W3, le 2026-09-25

| Question | Réponse |
|---|---|
| W3.1, pastilles, format, place | Les trois recommandations |
| W3.2, disposition et pas des flèches | A ; 0,005 et 0,05 avec Maj |
| W3.3, disposition et unité ΔEok | A ; l’unité reste |
| W3.4.1, récit | R1, avec le vocabulaire des composants : `default`, `hover`, `focus`, `active` |
| W3.4.2, interface d’exemple | Gardée, avec d’autres propositions prises sur Radix : W3.6 |
| W3.4.3, l’autre profil | Dans les rampes seulement |
| W3.4.4, grilles | Gardées, alignées sur le design de la planche, plus jolies, peintes des couleurs réelles : W3.6 |
| W3.5.1 et W3.5.2, place du choix et numéros | Les recommandations |
| W3.5.3, au-delà de 950 | Aller plus loin, comme le neutre de la bibliothèque. Relevé : le 1050 descend plus bas que `titanium.1100`, sans problème pour le moteur |
| W6.1, préréglage de 13 | 1000 et 1050 : un pas de 50 aux extrémités se comprend mieux |
| W3.6.1 à W3.6.3 | E2 ; grilles peintes des paires réelles ; vocabulaire des composants dans le plugin aussi |
| W3.6, ordre des sections | Les deux rampes avant « Quelle nuance pour quel usage » |

Texte d’origine :

```text
W3.1 · Sélecteur de couleur
1. ok pour reco
2. ok
3. ok

W3.2 · Luminosité des nuances
1. ok reco
2. ok reco

W3.3 · Minimums des promesses et détection des couleurs proches
1. ok reco A
2. OK

W3.4 · Planche générée
1. ok pour R1
cependant utiliser le vocabulaire universel : default, hover, focus, active etc
2. ok reco mais proposer d'autres interfaces d'exemple, prendre radix comme référence
3. ok reco
4. ok garder, mais il faut qu'elles soient alignées au design proposé, plus jolies et qu'elles utilisent les couleurs réelles des palettes

W3.5 · Palette libre
1. ok reco
2. ok reco
3. il faut aller un peu plus loin que 950 car même actuellement on a la palette neutral qui va plus loin pour chercher des valeurs plus sombre, c'est problématique ?

W6.1 · Préréglage de treize nuances
c'est mieux d'avoir 1000 et 1050 car c'est plus compréhensible d'avoir des incréments de 50 sur des extrémités
```

Second tour de la planche :

```text
W3.4 · Planche générée, second tour
1. ok reco
2. ok reco
3. ok reco

Juste un truc : il faudrait changer l'ordre des sections, et mettre "les deux rampes" avant "quelle nuance pour quel usage"
```

## Retours du mainteneur, round 3

Texte d’origine, indentation rétablie d’après la structure des sujets.

```text
Retours round 3 :

Réponses aux questions posées par Claude :

  V7, nombre de nuances. Les décisions sont à la fin de l'instruction. À
  savoir avant de choisir : ajouter 150 ou 750 décalerait le survol
  de text sur surface à 750/150 au lieu de 800/200 ; seules des
  nuances ajoutées entre 300 et 600, ou après 900, gardent les rôles
  à leurs numéros. Je recommande trois préréglages (9, 11, 13
  nuances) et une limite de 13. Il faut aussi trancher si l'architecture
  multi-marques accepte un autre nombre que onze.

    → ne pourrait on pas faire ça ? : si on est à 9, 11 ou 13 on est en
    mode standard, et 13 ça peut notamment être utile pour aller
    chercher des nuances encore plus foncées. Mais si sinon on peut
    choisir arbitrairement entre 4 et 13 teintes, numérotées en
    incrément de 50 obligatoirement, et dans ce cas on afficher plus
    les indications liées aux promesses de contrastes etc si on sort
    du modèle de base. On serait juste en mode génération de
    palette pour un autre usage.

  Maquettes, quatre questions (Q1 à Q4). Q1 : une interface d'exemple
  par thème sur la planche, Soft et Vivid côte à côte. Q2 à Q4 : pour
  ajuster la référence, un pas de 0,01 de luminosité, sur la luminosité
  seule, et la couleur d'origine gardée dans la palette, ce qui demande
  un format de recette 3. Sur #16A34A, un seul pas donne #0DA047,
  qui tient toutes ses garanties en restant au 600.

    j’ai pas compris

  Textes N043 à N074, marqués « À valider » dans l'inventaire. Un
  texte déjà validé a changé : le geste du message de conflit (T107)
  nomme maintenant l'export.

    je verrais ça plus tard

Recette dans Figma :

  Il faut revoir le menu de création d’une nouvelle palette, la disposition
  des éléments est mauvaise. Il faut se baser sur le même modèle que le
  premier élément de la config de la palette (“couleur de base”)

  Les menus onglet Theme Light et Theme Dark ne sont pas très visible :
  il faut leur ajouter un background un peu plus foncé, sur l’onglet actif. Il
  faut aussi les mettre tout à gauche et supprimer le texte “Aperçu”

  Zone de sélection /création des palettes :
    Faire en sorte que les boutons “+” et “...” aient la même hauteur que
    le dropdown de sélection
    modifier le bouton “+” en “+ Nouvelle palette”
    Faire en sorte que le dropdown de sélection prenne 100% de width

  On modifie le titre “Configuration de la palette” en “Palette [nom de la
  palette]”

  On modifie le nom “Couleur de base” en “Configuration de la palette”

  Pour la modification de la couleur de l’arrière plan on va faire
  différemment :
    on supprimer le bouton “modifier”
    On rend la couleur cliquable, ça fait poper le menu de sélection de
    couleur
    Quand on modifie la couleur de fond ici, ça synchronise aussi avec
    les paramètres globaux de la config

  On passe le texte “référence : Vivid - nuance 400” sous l’aperçu

  Widget sélection de couleur rgb:
    faire une grosse passe d’amélioration pour avoir une interface plus
    jolie (figma style) → faire une maquette par claude
    Requierement : c’est en mode hexa par défaut, pas rgb

  Onglet “Planche”
    renommer en “Planches”
    revoir complètement les éléments de “palette supprimée” :
      les affichée chacune dans une card
      raccourcir / simplifier le texte
      ajouter un bouton “supprimer définitivement”
      modifier légèrement l’apparence des cards, peut être avec une
      teinte très légèrement orange pour avoir un feeling warning. mais
      subtil.

  Panneau de config :
    section “luminosité des nuances”
      il faut revoir les tailles des typos sur l’élément avec les inputs de
      nuances light/dark : tout est beaucoup trop gros, c’est bizarre
      avec le reste de l’UI.
      → générer une maquette par claude, à faire valider
    Revoir entièrement les disposition des éléments “minimums des
    promesses” et “détection des couleurs proches”
      → générer une maquette par claude, à faire valider

  Planches générées sur Figma :
    ça ne va pas du tout, c’est toujours trop fouilli, incohérent
    graphiquement, pas bien structuré, il faut que ça raconte quelque
    chose de précis au designer
    → générer une maquette par claude, à faire valider
```
