# UCM Palettes : plan d’ergonomie, quatrième tour

## Résultat attendu

Le designer lit sur une seule ligne le nom de la palette ouverte et le geste
qui la porte dans Figma : « Générer sur Figma », ou « Actualiser sur Figma »
quand le cadre existe mais a changé. Sous la configuration, il voit la
palette, puis les deux réglages qui la façonnent, Intensités et Dérive de
teinte, avant ce qui la juge. Une nuance se choisit et se désélectionne d’un
clic, et son détail se lit d’un regard, niveaux AA et AAA compris. Ces
niveaux se lisent partout où un contraste est jugé. L’interface d’exemple
quitte la planche pour une section « Interface de test », la dernière de
l’onglet. Les cases encore ouvertes du troisième plan se ferment :
ajustement de la référence, recette dans Figma, tests d’interface anciens.

Ce plan est destiné à l’agent qui réalisera les changements. Il remplace les
cases encore ouvertes du [troisième plan](./PLAN-ERGONOMIE-PALETTES-V3.md),
dont les décisions restent valables quand ce document ne les remplace pas.
Le mainteneur a répondu aux [questions](#questions-au-mainteneur), sauf Q4.1,
à discuter. Les lots X3, X4 et X5 ont été codés avant les maquettes X2 ; leur
disposition est la proposition A des [maquettes du quatrième
tour](./MAQUETTES-RECETTE-V4.html), et elle se reprend selon la réponse du
mainteneur. Il fait lui-même les tests d’interface et la recette dans Figma.

Ses cases encore ouvertes sont reprises par le
[cinquième plan](./PLAN-ERGONOMIE-PALETTES-V5.md), qui porte aussi le
round 5 de la recette. X4 y est défait : la génération appartient à
l’onglet Planches.

## Autorités

Lire dans cet ordre :

1. les [retours du mainteneur](#retours-du-mainteneur-round-4), conservés
   sans modification, ses réponses aux questions et ses
   [retours sur les maquettes X2](#retours-du-mainteneur-sur-les-maquettes-x2) ;
2. les décisions ci-dessous ;
3. les [maquettes du lot X2](./MAQUETTES-RECETTE-V4.html), une fois validées ;
   d’ici là, les [maquettes du troisième tour](./MAQUETTES-RECETTE-V3.html) ;
4. le [troisième plan](./PLAN-ERGONOMIE-PALETTES-V3.md), la
   [conception du format 3](./CONCEPTION-NUANCES-ET-FORMAT-3.md), les
   [décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md) et
   l’[inventaire des textes](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) ;
5. la [spécification](./RECHERCHE-PLUGIN-PALETTES.md), l’[architecture
   multi-marques](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
   [AGENTS.md](../../../../AGENTS.md) et
  [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

## Faits qui fondent les décisions

Relevés dans le code.

| Fait | Source | Conséquence |
|---|---|---|
| Le libellé « + Nouvelle palette » vient du troisième plan, qui l’avait marqué validé | `TEXTES.nouvellePalette` | Le retirer change un texte validé : l’inventaire le note, avec ce retour pour source |
| Le bouton de suppression peint son fond de `--texte-danger`, que le socle lit dans `--figma-color-text-danger` : `#ffafa3`, un rose pâle, au thème sombre de Figma. Son survol hérite de `.btn-primary:hover`, bleu de marque | `.btn.bouton-destructif` dans `styles.css`, `socle.css` | Une couleur de texte sert de fond, et le survol n’a pas été écrit. Il faut une variante « danger » du socle, avec son fond et son survol |
| Une nuance choisie porte deux anneaux de 2 px chacun, 4 px en tout | `.pastille[aria-selected='true']` | Un seul trait de 2 px suffit à la retirer du reste |
| Un clic sur une nuance la choisit toujours ; `choisir(null)` existe et referme le détail | `nuancier.ts` | La désélection se branche sur le geste existant, sans nouvel état |
| La nuance 50 vaut 0,975 de luminosité OKLCH en Light et 0,18 en Dark. Les fonds par défaut, `#F7F7F7` et `#121212`, valent 0,976 et 0,182 | `PREREGLAGES`, `recetteParDefaut` | La 50 a la luminosité du fond de page dans les deux thèmes : posée sur ce fond, elle ne s’en distingue que par sa chroma |
| `surface` vaut 100, ses états `hover` et `active` 200 et 300 ; aucune nuance d’emploi n’est sous 100. Le détail d’`on-solid` dit que le fond de page est `neutral.50` | `TABLE_DES_EMPLOIS`, `TEXTES_DU_DETAIL.fondDePage` | Mettre `surface` à 50 déplace ses trois états et tous les tokens `surface` de la bibliothèque. Un emploi nouveau à 50 ne déplace rien |
| Le détail d’une nuance sans rôle écrit « Contraste avec le fond » en tête, puis une seconde fois dans « Mesures détaillées » | `rendreLeDetail`, `mesuresDetaillees` | La refonte retire le doublon |
| « Nuance libre » veut dire « sans rôle » dans le détail, et « Palette libre » une palette sortie du modèle | `TEXTES_DU_DETAIL.nuanceLibre`, N102 | Deux sens pour un même mot : le détail change de libellé |
| Le moteur calcule déjà les niveaux WCAG d’un contraste : texte courant AA dès 4,5:1 et AAA dès 7:1, grand texte AA dès 3:1 et AAA dès 4,5:1, éléments graphiques 3:1. Le plugin ne les montre que dans les mesures repliées | `niveauxWcag` (`[VER-13]`), `niveauxEcrits` | Les afficher partout ne demande aucun calcul nouveau |
| Le critère WCAG 1.4.11 des éléments graphiques n’a qu’un niveau, AA, à 3:1 | WCAG 2.2 | Une bordure ou un anneau de focus n’a pas de badge AAA |
| Les promesses se jugent sur les minimums réglables, 4,5:1 et 3:1 par défaut, c’est-à-dire le niveau AA | `recette.seuils`, carte « Minimums des promesses » | Un minimum réglé autrement fait diverger le verdict de la promesse et le badge AA : les deux doivent se lire sans se contredire |
| Ordre actuel de l’onglet : Configuration, Aperçu, ses messages, Garanties, Intensités, Dérive, Générer sur Figma | `ongletPalettes.ts` | Placer Intensités et Dérive sous l’aperçu fait descendre les Garanties |
| L’interface d’exemple E2 est une section de chaque thème de la planche, sous forme de nœuds Figma | `sectionDExemple`, `[PLA-28]` | La retirer change l’arbre, donc l’empreinte : tous les cadres passent « À mettre à jour ». Dans le plugin, elle doit être récrite en HTML, sur les mêmes textes et la même table des emplois |
| Le cadre d’une palette a cinq états : `jamais-dessinee`, `a-jour`, `perimee`, `introuvable`, `illisible`. « Pas encore sur la planche » est le texte du premier | `fraicheur.ts`, `etatDuCadreEcrit` | Le retour ne nomme que deux libellés : les trois autres états se décident sur maquette |
| La tête de l’onglet porte déjà « Palette [nom] » en titre de premier rang, et le titre suit le champ Nom sans lui prendre le focus (W1.3) | `ongletPalettes.ts` | Le geste de génération se pose à droite de ce titre, sans casser ce comportement |
| 86 tests d’interface : 50 passent, dont ceux de W4 et W6 ; les 36 autres, écrits avant W1, visent des structures remplacées | `npm run test:ui` | Reprise de W8 : ils se récrivent ou se retirent avant la clôture |

## Décisions

| Sujet | Décision |
|---|---|
| Nouvelle palette | Le bouton dit « Nouvelle palette », sans « + ». Libellé dicté par le mainteneur : validé |
| Boutons de la création | Nouvelle disposition, choisie sur maquette (X2.1) |
| Bouton de suppression | Variante « danger » du socle : fond `--figma-color-bg-danger`, texte `--figma-color-text-ondanger`, survol `--figma-color-bg-danger-hover`, chacun avec une valeur de repli. Aucune couleur de marque. Tous les boutons `bouton-destructif` l’emploient |
| Nuance choisie | Un seul trait de 2 px au plus, lisible sur la nuance et sur le fond du thème |
| Désélection | Un second clic, Entrée ou Espace sur la nuance choisie la désélectionne et referme son détail. Le focus reste sur la pastille. Même règle pour la pastille `on-solid` |
| Nuance 50 | Rien ne change avant la réponse à la [question Q4.1](#questions-au-mainteneur) : l’objection y est exposée |
| Détail d’une nuance | Refait sur maquette (X2.2) : moins de texte, un niveau par ligne, aucun doublon, OKLCH replié |
| Niveaux AA et AAA | Un badge « AA » ou « AAA » à côté de chaque contraste jugé, lu dans `niveauxWcag`. Un élément graphique n’a que AA. Les endroits sont fixés sur maquette (X2.3) ; la référence des badges attend la réponse à Q4.2 |
| Ordre de l’onglet | Titre et génération, Configuration de la palette, Aperçu, Intensités, Dérive de teinte, Garanties de contraste, Interface de test. La place des Garanties attend la réponse à Q4.3 |
| Planche | L’interface d’exemple la quitte. `[PLA-28]` se retire de la spécification |
| Interface de test | Nouvelle section, la dernière de l’onglet Palettes, qui montre l’écran E2 peint de la palette ouverte, dans le thème de l’aperçu. Lecture à confirmer : Q4.4 |
| Génération | Au niveau du titre : « Palette [nom] » à gauche, le bouton à droite. « Générer sur Figma » quand le cadre n’existe pas, « Actualiser sur Figma » quand il existe et a changé. « Pas encore sur la planche » disparaît. Les autres états sont fixés sur maquette (X2.4) |

## Reprise du troisième plan

| Case du troisième plan | Sort |
|---|---|
| W2.5, tests de « Supprimer définitivement » et Ctrl+Z dans Figma | Reprise en X8.2 |
| W5.6, temps et calques d’une génération de douze palettes | Reprise en X8.4, après le retrait de l’interface d’exemple (X5) |
| W6.4 à W6.7, préréglage, palette libre, planche, architecture | Faits ; leur recette dans Figma entre en X8.3 |
| W7.1, W7.3 à W7.6, ajuster la référence | Reprises en X7 ; W7.2 est fait dans le moteur avec le format 3 |
| W8.1 à W8.3, recette et clôture | Reprises en X8 |
| 36 tests d’interface écrits avant W1 | Repris en X8.1 |
| Textes N043 à N074, T107 ; textes « À valider » de N087 à N104 | Hors de ce plan, sauf ceux que ses lots récrivent |

Les cases faites du troisième plan restent acquises. Leur comportement se
conserve quand un lot de ce plan déplace l’élément qui le porte : titre qui
suit le champ Nom sans voler le focus, focus rendu à la fermeture du
sélecteur de couleur, routage par `data-cible`, contrôles créés une fois et
non à chaque rendu, cartes repliées à l’ouverture et gardées dans la session.

## Ordre d’exécution

| Étape | Lots | Dépendance |
|---|---|---|
| Règles et documents | X0 | Relecture de ce plan |
| Corrections directes | X1 | X0 ; la place des Garanties attend Q4.3 |
| Maquettes à valider | X2 | X0 ; se fait en parallèle de X1 |
| Détail d’une nuance, niveaux AA et AAA | X3 | X2.2 et X2.3 validées, Q4.2 |
| Génération au niveau du titre | X4 | X2.4 validée |
| Interface d’exemple : de la planche à l’onglet | X5 | X2.5 validée, Q4.4 |
| Nuance 50 | X6 | Q4.1 ; architecture et bibliothèque si un emploi change |
| Ajuster la référence | X7 | X3, qui refait le détail où le lien s’affiche |
| Recette et clôture | X8 | Parcours finis |

Chaque lot suit les règles de code, de test et de relecture de
CONTRIBUTING.md, met à jour la documentation qu’il touche et ajoute ses
textes à l’inventaire. Une capture ne prouve ni une interaction ni une
sauvegarde.

## Lot X0 : règles, documents et galerie

- [x] **X0.1** Mettre à jour « Les surfaces d’UCM Palettes » dans
  CONTRIBUTING.md : génération dans la ligne du titre, ordre des cartes,
  section « Interface de test » en dernier, bouton danger du socle. Fait.
- [x] **X0.2** Mettre à jour la spécification : `[UI-04]` (trait de sélection,
  désélection), `[UI-05]` et `[UI-11]` (génération au titre), `[UI-10]`
  (détail d’une nuance), `[UI-12]` (ordre des cartes), `[VER-13]` (niveaux
  affichés), et retirer `[PLA-28]`. La nuance 50 et l’interface de test
  entrent avec leurs lots. Fait, avec deux marqueurs neufs : `[UI-14]` pour l’interface de test et `[UI-15]` pour le panneau d’ajustement. `[VER-13]` dit où les badges se posent et ce qu’ils jugent ; le tableau des états de galerie suit.
- [x] **X0.3** Inventaire des textes : « Nouvelle palette », validé, remplace
  « + Nouvelle palette » ; « Actualiser sur Figma », validé ; « Pas encore
  sur la planche » marqué retiré. Les textes nouveaux des lots entrent « À
  valider ». Fait : N075 validé sans « + », N105 à N110 pour les textes neufs, « À valider » sauf ceux que le mainteneur a dictés.
- [x] **X0.4** Déclarer dans `galerie/etats.cjs` les états de ce plan :
  nuance désélectionnée, titre avec « Générer sur Figma », titre avec
  « Actualiser sur Figma », détail refait avec ses niveaux, interface de
  test aux deux thèmes. Chaque état annoncé nomme la case qui le rendra
  atteignable. Fait : « Nuance désélectionnée », « Titre et Générer sur Figma »,
  « Titre et Actualiser sur Figma », « Titre d’un nom long », « Interface de
  test » Light et Dark, « Ajuster la référence », et « Référence ajustée »
  rendue atteignable ; « Nuance libre » devient « Nuance sans rôle ». Les états
  qui visaient la carte de génération suivent le bouton du titre. Galerie non
  rejouée : le mainteneur la regarde.

Critère : l’agent place chaque élément de X1 sans relire ce plan, à partir de
la spécification et de CONTRIBUTING.md.

## Lot X1 : corrections directes

Fichiers : `textes.ts`, `ongletPalettes.ts`, `nuancier.ts`, `styles.css`,
`plugin-socle/src/ui/socle.css` et son `Button`.

- [x] **X1.1** « + Nouvelle palette » devient « Nouvelle palette ». Le bouton
  garde sa hauteur commune et `aria-expanded`. Fait. Les tests d’interface
  visent le bouton par son nom exact.
- [x] **X1.2** Ajouter au socle une variante « danger » : fond, texte, survol
  et focus propres, lisibles aux deux thèmes de Figma. La donner à tous les
  boutons qui portent `bouton-destructif`, « Supprimer la palette » et
  « Supprimer définitivement » compris, puis retirer la classe. Le socle sert
  aussi UCM Exporter : vérifier que sa galerie ne change pas. Fait : variante
  `danger` de `createButton`, rôles `--fond-danger-plein`,
  `--fond-danger-plein-survol` et `--texte-sur-danger` du socle, focus du même
  rouge ; le décalque de la galerie porte les trois variables Figma. La loi des
  styles compte les variantes que `VarianteBouton` déclare : UCM Exporter ne la
  pose pas et sa loi reste verte. Galerie d’UCM Exporter non rejouée.
- [x] **X1.3** Trait de la nuance choisie : un seul anneau, 2 px au plus,
  peint de l’encre calculée sur le fond du thème. Le focus clavier reste
  distinct de la sélection. Vérifier sur un fond personnalisé saturé. Fait : un
  anneau plein de 2 px de l’encre du fond, séparé de la pastille par un liseré
  de 1 px du fond ; le focus reste un contour tireté, écarté de 4 px.
- [x] **X1.4** Désélection : un clic, Entrée ou Espace sur la nuance déjà
  choisie la désélectionne, referme le détail et rend `aria-selected` à
  faux ; le focus reste sur la pastille. Même règle pour `on-solid`. Fait :
  `memeChoix` décide, `basculer` relâche ; le focus reste sur la pastille.
- [x] **X1.5** Ordre des cartes : Intensités directement sous l’aperçu et
  ses messages, Dérive de teinte directement sous Intensités, puis les
  Garanties, à la place que Q4.3 fixe. Les liens qui ouvrent une carte
  (`intensites-palette`, « Voir les garanties ») continuent de la trouver et
  d’y porter le focus. Fait selon Q4.3 : Intensités, Dérive de teinte, puis
  Garanties de contraste, puis Interface de test. Les liens gardent leur cible,
  qui ne dépend pas de la place.
- [x] **X1.6** Tests : désélection au clic et au clavier ; ordre des cartes ;
  bouton danger au survol, par sa couleur calculée et non par sa classe.
  Chaque test vu rouge sur une mutation de ce qu’il protège. Fait en test
  unitaire pour la désélection (`memeChoix`), puis en tests d’interface : un
  second clic, Entrée ou Espace relâche la nuance ; l’ordre des cartes et leur
  état replié ; « Supprimer la palette » lu en `rgb(242, 72, 34)`, puis
  `rgb(220, 52, 18)` au survol, jamais la couleur de marque. Chacun vu rouge
  sur une mutation : `choisir(suivant)` sans relâche, Garanties avant
  Intensités, survol en `--fond-marque-survol`.
- [x] **X1.7** Appliquer à la carte de création la disposition retenue en
  X2.7, après validation. Fait : Modèle Standard ou Libre dans la troisième
  colonne, palette de base dessous, puces d’une palette libre sous les
  colonnes ; « Créer la palette » puis « Annuler », à gauche (réponse du
  mainteneur).
- [x] **X1.8** Retirer « Utiliser la couleur sélectionnée dans Figma » : le
  bouton, la demande `lire-selection`, la réponse `selection`, la
  frontière, les textes et la notice d’une couleur ramenée. La lecture de la
  peinture d’un calque reste : le dessin relit les pastilles qu’il pose.
- [x] **X1.9** Toutes les cartes repliables de l’onglet sont repliées à
  l’ouverture, Garanties de contraste comprises ; « Voir les garanties » et
  un clic sur une garantie du détail la déplient.
- [x] **X1.10** « Nouvelle palette » devient le bouton principal de l’onglet,
  le bouton de génération passe en secondaire, et un filet sépare la barre
  et la création de la palette ouverte.

Critère : aux deux thèmes de Figma, le bouton de suppression se lit comme
une action destructive et ne vire jamais au bleu ; une nuance se choisit et
se relâche d’un même geste.

## Lot X2 : maquettes à valider

Produites dans [MAQUETTES-RECETTE-V4.html](./MAQUETTES-RECETTE-V4.html),
que `generer-maquettes-v4.mjs` écrit. Toutes attendent la validation du
mainteneur. X3, X4 et X5 sont déjà codés : leur disposition en place est la
proposition A de leur maquette.

Un fichier `MAQUETTES-RECETTE-V4.html`, au format des précédentes : panneau à
500 px, thème sombre de Figma, couleurs et ratios calculés par le moteur pour
`#1E6FD9` et `#16A34A`. Chaque maquette se termine par ses questions, avec
une recommandation.

- [x] **X2.1** Retour : les propositions oubliaient le Modèle et
  « Ajuster la référence » ; la sélection Figma est supprimée (X1.8). Repris
  en X2.7. Première version : création d’une palette : au moins deux placements des gestes
  Créer, Depuis la sélection et Annuler, par exemple le geste principal à
  droite sous les colonnes et les deux autres à gauche, ou Depuis la
  sélection à côté de la couleur de référence qu’il remplit. Produite : A, la
  disposition actuelle ; B, Créer à droite et la sélection à gauche ; C, la
  sélection en lien sous la couleur de référence, qui remplit le champ sans
  créer. Recommandé : C. Rien n’est codé : X1.7 applique la réponse.
- [x] **X2.2** Détail d’une nuance, avec rôle et sans rôle : en-tête (pastille,
  numéro, code), rôles et états, contraste avec le fond et niveau, blanc et
  noir, OKLCH replié. Proposer le libellé qui remplace « Nuance libre ».
  Deux dispositions au moins, dont une en table compacte. Produite : A, table
  compacte, en place ; B, contrastes sur une ligne sous l’en-tête. Libellés
  proposés : « Sans rôle », en place, « Aucun rôle dans le modèle », « Hors
  des rôles ».
- [x] **X2.3** Niveaux AA et AAA : forme du badge, réussite et échec, et la
  liste des endroits. Au moins le détail d’une nuance, les lignes des
  Garanties, la tête des Réglages communs, les grilles de la planche. Pour
  chaque endroit, dire ce que le badge juge : texte courant, grand texte ou
  élément graphique. Montrer un minimum réglé à 5:1 pour que le verdict et
  le badge se lisent sans se contredire. Produite : trois
  formes de badge, la table des endroits avec ce que chacun juge, et le
  minimum des textes réglé à 5,5:1, faute d’une garantie de Bleu ou de Vert
  entre 4,5:1 et 5:1.
- [x] **X2.4** Ligne du titre : « Palette [nom] » et le bouton, aux cinq états
  du cadre, pendant la génération (progression) et quand la génération est
  impossible (conflit, palette sans nom). Un nom long à 500 px : le nom se
  coupe, le bouton garde son libellé. Dire où vont « Voir sur la planche »
  et l’état du cadre, qui quittent la carte de génération. Produite : les cinq
  états, la génération en cours, le conflit, le nom long, et une variante B
  où l’état s’écrit entre le nom et le bouton. Une palette sans nom prend
  son hexa pour nom : la génération n’y est jamais impossible.
- [x] **X2.5** Interface de test : l’écran E2 peint de la palette ouverte,
  dans le thème de l’aperçu, avec et sans palette libre. Section ouverte ou
  repliée à l’ouverture. Produite : les deux
  thèmes dépliés, la carte repliée, et une variante B qui garde la carte
  d’une palette libre avec une phrase.
- [x] **X2.6** Nuance 50 : les options de Q4.1 sur les deux références, aux
  deux thèmes, posées sur le fond par défaut et sur un fond personnalisé. Produite : A, B, C
  et une option D, un emploi nouveau à 50 pour un fond discret de composant
  (lecture de la réponse du mainteneur à Q4.1), sur Bleu et Vert, aux deux
  thèmes, sur les fonds par défaut et sur #FFF1C2 et #1B2340.

Second passage, après les [retours du
mainteneur](#retours-du-mainteneur-sur-les-maquettes-x2), dans le même
fichier :

- [x] **X2.7** Réponses : gestes à gauche, Modèle dès la création, R3,
  piste de luminosité. Faits en X1.7 et X7.6. Création et configuration d’une palette : le choix du Modèle,
  Standard ou Libre, dans la carte de création, et « Ajuster la référence »
  redessiné. Créer et Annuler, sans la sélection Figma.
- [x] **X2.8** Réponse : H1, « Contrastes de la nuance ». Fait en X3.6. Détail d’une nuance, disposition A retenue : une hiérarchie
  plus marquée, et « Contrastes » détaché de « Sert à ».
- [x] **X2.9** Réponse : teintes et « ✗ » gardés. Badges : la pastille pleine B en teintes adoucies, telle que
  codée, à confirmer.
- [x] **X2.10** Réponse : 5 px au-dessus et au-dessous du filet. Fait. Ligne du titre, telle que codée : le filet sous la zone de
  création, « Nouvelle palette » principal, la génération secondaire.
- [x] **X2.11** Réponse : C, avec les composants et l’écran proposés. Fait en
  X5.5. Interface de test : refonte du design de l’écran.
- [x] **X2.12** Réponse : la 50 ne sert jamais de fond de bouton, seulement de
  surface de carte ; nom retenu `surface-card`. Suite en X6. Nuance 50 : ce qui distingue A et D à l’usage.

Critère : le mainteneur valide ou corrige chaque maquette sans avoir à
imaginer une interaction.

## Lot X3 : détail d’une nuance, niveaux AA et AAA

Après validation de X2.2 et X2.3, et la réponse à Q4.2.

- [x] **X3.1** Refaire le détail selon X2.2 : aucun doublon, un nouveau
  libellé pour une nuance sans rôle, « Mesures détaillées » réduites à ce
  que la maquette garde. Le détail d’une palette libre ne prête toujours
  aucun rôle. Fait : en-tête, « Sert à » ou « Sans rôle », puis une table «
  Contrastes » de trois lignes, fond du thème, blanc et noir, un ratio et un
  badge par ligne, puis OKLCH replié. « Mesures détaillées » et le doublon
  disparaissent.
- [x] **X3.2** Un composant de badge unique, qui reçoit un contraste et ce
  qu’il juge, et s’écrit à partir de `niveauxWcag`. Son texte est lu par
  l’assistance technique : « AA atteint », « AAA non atteint ». Fait :
  `niveauEcrit` dans `textes.ts` et `badgeDeNiveau` dans `badge.ts`. Le badge
  écrit « AAA », « AA » ou « AA ✗ », suit les seuils fixes (Q4.2), et porte une
  étiquette « Texte courant : AA atteint, AAA non atteint ».
- [x] **X3.3** Poser le badge à chaque endroit retenu en X2.3, dans le plugin
  et sur la planche. Sur la planche, le badge est un texte de style
  « chiffre » : il entre dans l’empreinte, et les cadres passent « À mettre
  à jour ». Fait dans le détail (garanties des usages, table des contrastes),
  dans chaque état des Garanties, et sur la planche : « · AA » à la fin de
  chaque garantie d’un usage, et le niveau de texte après le ratio de chaque
  case de grille qui atteint AA, dans le même calque. La légende des grilles
  ajoute « AA dès 4,5:1 · AAA dès 7:1 ». Non fait : la tête des Réglages
  communs, qui ne montre aucun contraste.
- [x] **X3.6** Détail d’une nuance, disposition H1 : en-tête à titre de 13 px
  et grande pastille, puis un encadré par groupe, « Sert à » ou « Sans
  rôle », puis « Contrastes de la nuance », et OKLCH replié.
- [x] **X3.5** Forme B retenue en X2.3 : une pastille pleine, verte ou
  rouge, en teintes adoucies, rôles `--fond-niveau-atteint`,
  `--texte-niveau-atteint`, `--fond-niveau-manque` et
  `--texte-niveau-manque` du socle. Le « ✗ » reste : il dit l’échec sans la
  couleur. La planche garde le texte dans le calque du ratio.
- [x] **X3.4** Tests : chaque seuil de `niveauxWcag` à la frontière, 4,49 et
  4,5, 6,99 et 7 ; un élément graphique sans AAA ; un minimum réglé à 5:1
  qui échoue la promesse avec un badge AA atteint, selon Q4.2. Fait dans
  `textes.test.ts`, chaque seuil vu rouge sur une mutation.

Critère : le designer lit en un regard si une nuance est AA ou AAA sur le
fond, sans ouvrir de repli.

## Lot X4 : génération au niveau du titre

Après validation de X2.4.

- [x] **X4.1** Poser le bouton à droite du titre « Palette [nom] », sur la
  même ligne. Le titre garde son rang, et suit toujours le champ Nom sans lui
  prendre le focus. Fait : le titre se coupe par des points de suspension, le
  bouton garde sa largeur.
- [x] **X4.2** Libellé selon l’état du cadre : « Générer sur Figma » pour
  `jamais-dessinee`, « Actualiser sur Figma » pour `perimee`, les trois
  autres selon X2.4. La progression, la neutralisation des onglets pendant
  la génération et la reprise après interruption (`[PLA-24]`) se conservent.
  Fait selon Q4.5 : « À jour sur Figma » inactif pour `a-jour`, « Générer sur
  Figma » pour `introuvable` et `illisible`, dont l’état s’écrit sous le titre.
  Pendant la génération, le bouton dit « Génération… » et la progression s’écrit
  sous le titre.
- [x] **X4.3** Retirer la carte « Générer sur Figma » et le texte « Pas encore
  sur la planche ». Ce que la carte portait encore se range là où X2.4 l’a
  placé. Fait : sous le titre, une ligne de rang 3 porte l’état de
  l’enregistrement, l’état d’un cadre introuvable ou illisible, la progression
  et « Afficher dans Figma » ; l’erreur ou les écarts viennent dessous. Dans
  l’onglet Planches, un cadre jamais dessiné n’a plus d’état écrit, et un cadre
  périmé propose « Actualiser sur Figma ».
- [x] **X4.4** Reprendre le test `[UI-03]` à 500 × 520 : titre et bouton sur
  une ligne, configuration et haut de l’aperçu lisibles sans défiler. Fait :
  le test mesure le bouton à droite du titre et sur sa ligne, et un nom long
  coupé avant le bouton. Vu rouge sur un bouton posé sous le titre. Le constat
  dans Figma reste dans la recette (X8.3).
- [x] **X4.5** Tests : libellé par état, « Actualiser sur Figma » après une
  modification d’un cadre à jour, nom long qui ne pousse pas le bouton hors
  du panneau. Fait pour le libellé par état, en test unitaire
  (`gesteDeGeneration`). Le nom long est un état de galerie.

Critère : le designer voit, sans défiler, si sa palette est dans Figma et à
jour, et la génère d’un clic.

## Lot X5 : interface d’exemple, de la planche à l’onglet

Après validation de X2.5 et la réponse à Q4.4.

- [x] **X5.1** Retirer `sectionDExemple` du modèle de planche et `[PLA-28]` de
  la spécification. L’empreinte change : tous les cadres existants passent
  « À mettre à jour ». Recompter les calques du cadre de Bleu, avec et sans
  grilles, contre 1 712 et 546. Fait. Le cadre de Bleu compte 1 632 calques avec
  les grilles, 466 sans.
- [x] **X5.2** Écrire la section « Interface de test », dernière de l’onglet
  Palettes : l’écran E2 en HTML, peint de la palette ouverte dans le thème de
  l’aperçu. Chaque couleur vient de la table des emplois, jamais d’un numéro
  écrit à la main ; les textes de l’écran restent ceux de la planche. Fait :
  `interfaceDeTest.ts`, carte repliée à l’ouverture et dessinée seulement
  dépliée. Les contrôles se manipulent, et chaque état de survol et d’appui
  prend la nuance suivante de son emploi.
- [x] **X5.3** Une palette libre n’a pas de rôles : la section le dit, ou se
  retire, selon X2.5. Fait : la section se retire, comme la carte des garanties.
- [x] **X5.4** Tests : chaque élément de l’écran prend la couleur de son
  emploi et de son état ; la section suit le thème de l’aperçu ; la planche
  n’a plus d’interface d’exemple. Fait en tests unitaires : couleurs par emploi
  et par état dans les deux thèmes (`couleursDeLInterface`), planche sans écran
  de réglages. Le suivi du thème de l’aperçu reste au mainteneur.
- [x] **X5.5** Refonte X2.11, option C : une bascule « Écran » et « États ».
  L’écran « Membres de l’équipe », sur le modèle de Radix Themes, se
  manipule ; la grille montre sept composants à quatre états. La vue choisie
  dure la session.

Critère : le designer essaie sa palette dans une interface sans quitter le
plugin, et la planche ne montre plus que ce qu’elle doit prouver.

## Lot X6 : nuance 50

Décisions du mainteneur (X2.12, puis trois questions après la revue de la
conception) :

- la 50 est la surface d’une carte, jamais le fond d’un bouton : un emploi
  `surface-card` au cran 50, sans état. `surface` garde 100, 200 et 300 ;
- `surface-card` est un emploi, comme `surface`, et non un token : une carte
  cite le cran 50 de `theme`. Aucune variable ne s’ajoute à
  `intencial-library`, et aucune ne change de valeur ;
- l’emploi est facultatif : il n’existe, avec ses garanties, que dans une
  liste qui porte la 50, ce que font les trois préréglages.
  `CRANS_DES_EMPLOIS` ne change pas, et une liste importée sans 50 reste
  lisible ;
- deux garanties, numérotées 15 et 16 : `text` sur `surface-card` au minimum
  des textes, `border-control` sur `surface-card` au minimum des éléments
  visibles. L’anneau de focus, au même cran que la bordure, n’a pas de
  garantie propre sur une carte.

Retenu de la revue indépendante :

- l’alerte des profils confondus (`[VER-11]`) ne porte pas sur la 50 : elle
  s’y lèverait sur la plupart des teintes claires sans réglage qui la lève ;
- l’accolade de `surface-card` va sur la seconde ligne : une accolade ne se
  pose sur une ligne qu’avec une colonne libre de chaque côté ;
- `surface-card` a son spécimen, dans le plugin et sur la planche : un
  aplat de carte portant un texte `text` ;
- la garantie des courbes et l’alerte des fonds lisent le cran 50 à son rang
  dans la liste, et non au premier ;
- la section 1 de l’architecture dit « le cran 50 est le fond de page » : elle
  dit désormais qu’il sert aussi de surface de carte, au plus près du fond,
  un peu plus sombre que lui en Dark ;
- les effets visibles : tous les cadres passent « À mettre à jour », et le
  verdict d’une palette peut passer de ✓ à ✗ sans qu’aucune couleur change,
  si une garantie de carte manque.

Écarté : l’ordre d’affichage des associations reste celui des paires ; les
associations de carte viennent en fin de groupe.

- [x] **X6.1** Moteur : l’emploi, sa table, les deux paires, facultatives
  quand la liste n’a pas de 50 ; l’alerte des profils confondus ; le rang du
  cran 50. Spécification : section 11.2, `[VER-03]` à `[VER-05]`,
  `[VER-11]`. Fait : `EMPLOIS_FACULTATIFS`, `emploiPresent`, `paireJugeable` et `rangDuCranLeger` dans le moteur.
- [x] **X6.2** Architecture multi-marques, sections 1 et 4 : la ligne
  `surface-card`, et la phrase du cran 50. Fait. `verifier-courbes.mjs` relève les deux paires : 5,30 et 3,68.
- [x] **X6.3** Plugin et planche : accolades, ligne d’usage « Fonds de
  carte », spécimen, détail, garanties, interface de test. Fait. Dans l’écran de l’interface de test, le tableau est la carte ; la grille des états gagne la rangée « Carte ».
- [x] **X6.4** Tests : les rôles gardent leurs numéros dans chaque
  préréglage ; les deux paires se jugent ; une liste sans 50 n’a ni l’emploi
  ni ses garanties, et reste lisible ; l’alerte des profils confondus ne
  porte pas sur la 50. Fait, chaque loi vue rouge sur une mutation.

Critère : la 50 a un usage que le designer comprend, sans qu’aucune variable
existante change de couleur. Les cadres existants passent « À mettre à
jour ».

## Lot X7 : ajuster la référence

Reprise de W7, sur la [conception](./CONCEPTION-NUANCES-ET-FORMAT-3.md#3-la-référence-ajustée).
Le champ `originale` et `propositionDAjustement` existent dans le moteur.

- [x] **X7.1** (ex-W7.1) Lien « Ajuster la référence » parmi les réglages
  qu’une garantie en échec propose, et sous le code de la couleur de
  référence. Une palette libre n’a que le second. Fait : « Ajuster la référence
  » est le dernier réglage des lignes en échec, et un lien sous le code, pour
  toute palette.
- [x] **X7.2** (ex-W7.3) Panneau d’ajustement : originale et proposition côte
  à côte, « − » et « + » par pas de 0,01 de luminosité OKLCH, chroma et
  teinte gardées, code saisissable, nuance visée par thème, garanties avant
  et après, avec leurs niveaux AA et AAA (X3). Un pas qui ferait changer la
  référence de numéro l’annonce avant. La proposition part de l’originale ;
  rien ne change tant que le designer ne fait pas de pas. Fait : `ajustement.ts`
  pour le panneau, `ajustementDeLaReference.ts` pour les calculs. Les garanties
  comparées donnent le bilan de chaque profil, « Vivid ✗ 2 → ✓ », puis une ligne
  par garantie manquée avant ou après, avec son badge.
- [x] **X7.3** (ex-W7.4) Seul Appliquer change la référence. Annuler et Échap
  referment sans rien écrire. Après Appliquer : « Ajustée depuis #16A34A ·
  Revenir à l’originale », lisible après réouverture, dans l’export et sur
  la planche. Fait : `appliquerLAjustement` et `revenirALOriginale`. Un code
  saisi dans la configuration retire l’originale et le dit par une notice.
- [x] **X7.4** (ex-W7.5) Aucun ajustement automatique, aucun effet à
  l’ouverture du panneau, aucune proposition imposée par une courbe ou un
  minimum. Fait : le panneau part de la référence rangée et ne rend une palette
  qu’à « Appliquer ».
- [x] **X7.5** (ex-W7.6) Tests d’interface : un pas sombre sur `#16A34A`
  donne `#0DA047` au 600 ; aller-retour vers l’originale ; un code saisi
  dans la configuration retire l’originale et le dit. Fait en tests unitaires
  (`ajustement.test.ts`), vus rouges sur des mutations ; les tests d’interface
  restent au mainteneur.
- [x] **X7.6** R3 retenu en X2.7 : l’ajustement est l’onglet « Ajuster » du
  sélecteur de couleur de la référence, que « Ajuster la référence » ouvre ;
  la piste de luminosité marque d’un trait chaque changement de nuance, et la
  phrase ne vient que lorsque le pas voisin en franchit un.

Critère : le designer corrige une référence à la limite sans perdre sa couleur
d’origine, et le plugin ne change jamais la couleur à sa place.

## Lot X8 : recette et clôture

- [x] **X8.1** Récrire ou retirer les 36 tests d’interface écrits avant W1,
  en gardant ce que chacun protégeait encore. Fait : ils étaient 40 à
  échouer, surface-card comprise. Les cartes repliées se déplient par leur
  titre ; la dérive, l’import et le rapport y passent. « Voir les deux
  couleurs » et l’option de grille n’existent plus : leurs deux tests visent
  désormais la carte des garanties (ligne choisie, arcs, autre thème) et le
  bouton du titre (« À jour sur Figma », puis « Actualiser sur Figma » après
  un rangement). 87 tests, tous verts.
- [ ] **X8.2** (ex-W2.5) Tests de « Supprimer définitivement » : écriture qui
  retire cadre et suivi ensemble, cadre déjà absent, geste bloqué en
  conflit. Constater dans Figma qu’un seul Ctrl+Z rend le cadre et son
  suivi, et que le cadre revient comme palette supprimée. Les tests du sandbox
  existent dans `retrait.test.ts` ; le constat dans Figma revient au mainteneur.
- [ ] **X8.3** (ex-W8.1, W8.2) Construire code et interface, recharger le
  plugin dans la copie partagée, puis exécuter la recette ci-dessous avec
  les constats restés ouverts : galerie d’UCM Exporter aux deux thèmes
  (V1.2), accolades à 500 et 600 px (V3.4), cadres dans une section et sur
  une autre page sous `dynamic-page` (V8.6), `EyeDropper` dans l’iframe de
  Figma, passage à 13 nuances et palette libre (W6). Au mainteneur.
- [ ] **X8.4** (ex-W5.6) Mesurer dans Figma le temps et le nombre de calques
  d’une génération de douze palettes, sans interface d’exemple ; appliquer
  `[PLA-24]` au résultat. Au mainteneur.
- [x] **X8.5** (ex-W8.3) Mettre à jour AGENTS.md, la spécification et les
  liens des plans. Marquer le troisième plan comme remplacé pour ses cases
  ouvertes. Fait pour ce que ce
  tour a changé : carte du code d’AGENTS.md, spécification, CONTRIBUTING.md ;
  le troisième plan renvoie ici pour ses cases ouvertes.

Critère de clôture : contrôles du dépôt, typecheck, build, tests d’interface
de Palettes tous verts, et recette Figma terminée.

## Recette mainteneur

| Scénario | Résultat observable | Lots |
|---|---|---|
| Ouvrir une palette | « Palette [nom] » et le bouton de génération sur une ligne | X4 |
| Modifier une palette déjà générée | Le bouton devient « Actualiser sur Figma » | X4 |
| Survoler « Supprimer la palette », aux deux thèmes de Figma | Rouge de danger, survol plus soutenu, jamais bleu | X1 |
| Choisir une nuance, puis la recliquer | Trait de 2 px, puis détail refermé | X1 |
| Lire le détail d’une nuance | Une lecture courte, niveaux AA et AAA, aucun doublon | X3 |
| Parcourir l’onglet | Aperçu, Intensités, Dérive, Garanties, Interface de test | X1, X5 |
| Générer une palette | Planche sans interface d’exemple, niveaux sur les grilles | X3, X5 |
| Essayer l’interface de test aux deux thèmes | Écran peint de la palette, suit le thème de l’aperçu | X5 |
| Ajuster `#16A34A` d’un pas, fermer, rouvrir | `#0DA047` au 600, garanties tenues, originale restaurable | X7 |
| Passer à 13 nuances, créer une palette libre de six nuances | Rôles aux mêmes numéros ; aucun rôle ni garantie sur la palette libre | X8 |
| Navigation clavier | Désélection au clavier, focus visible sur le bouton du titre et dans le panneau d’ajustement | X1 à X7 |

La recette visuelle couvre 500 × 520 et 600 × 720, les deux thèmes de Figma,
les deux thèmes de palette, un fond personnalisé saturé, un nom long et
plusieurs garanties en échec.

## Questions au mainteneur

| Question | Ce qui en dépend | Recommandation |
|---|---|---|
| **Q4.1** Réponse : à discuter ; le mainteneur voit la 50 comme un fond de composant plutôt qu’un fond de page. La nuance 50 dans les fonds légers. A : `surface` passe à 50, ses états `hover` et `active` à 100 et 200. B : un emploi nouveau à 50, le fond de page teinté, sans toucher `surface`. C : aucun emploi ; la 50 se mentionne seulement dans la ligne des fonds légers, comme fond de page teinté | X6 | **B**. Objection à A : la 50 a la luminosité du fond de page dans les deux thèmes, si bien qu’une `surface` à 50 ne se distingue du fond que par sa teinte, et plus du tout sur une palette peu saturée. A change en outre la valeur de tous les tokens `surface` de la bibliothèque. B donne à la 50 l’usage que Radix donne à son premier cran, le fond d’application. Il demande une ligne dans l’architecture et un token nouveau, sans rien déplacer |
| **Q4.2** Réponse : les seuils fixes. Les badges AA et AAA suivent-ils les seuils fixes du WCAG, ou les minimums réglés dans « Minimums des promesses » ? | X3 | Les seuils fixes : AA et AAA sont des noms de normes, et un badge « AA » qui changerait avec un réglage mentirait. Le verdict de la promesse suit toujours les minimums |
| **Q4.3** Réponse : la recommandation, sous la Dérive. Où vont les Garanties de contraste, que le déplacement d’Intensités et de Dérive fait descendre ? | X1.5 | Sous la Dérive : on règle d’abord la palette, puis on lit ce qui la juge. Les liens « Voir les garanties » y mènent déjà |
| **Q4.4** Réponse : la recommandation, l’onglet Palettes. « Interface de test » : une section de l’onglet Palettes du plugin, ou la dernière section de la planche ? | X5 | L’onglet Palettes : le retour retire l’interface de l’export de la planche, et une section du plugin se met à jour à chaque réglage sans génération |
| **Q4.5** Réponse : « À jour sur Figma », inactif. Quel libellé le bouton porte-t-il quand le cadre est à jour ? | X4 | Posée dans la maquette X2.4, avec trois propositions : bouton inactif « À jour sur Figma », « Voir sur Figma », ou « Générer sur Figma » gardé |

## Hors périmètre

- Relecture des textes N043 à N074, du texte modifié T107, et des textes « À
  valider » de N087 à N104 que ce plan ne récrit pas.
- Création de variables et ajout aux tokens du design system, sauf la
  mention de X6.2.
- Reconstitution de réglages depuis une planche étrangère.
- Ajustement de la chroma de la référence.
- Nombre de nuances différent d’une marque à l’autre en mode standard.

## Retours du mainteneur, round 4

Texte d’origine, indentation rétablie d’après la structure des sujets.

```text
Retours round 4 :

zone de création des palettes :
  supprimer le "+" du bouton "nouvelle palette"
  encore revoir les placement des boutons dans le menu de création
  fix le bouton de suppression, il est rose bizarre avec un hover bleu

encadré de visualisation des palettes :
  réduire le stroke quand on sélectionne une couleur sur une palette
  (2px max)
  donner la possibilité de désélectionner une couleur sur une palette
  en cliquant dessus à nouveau
  intégrer le 50 dans les surfaces/fond léger sauf si objection de ta
  part ?
  Revoir l'UI des éléments "Nuance libre : aucun usage prévu
  Contraste avec le fond : 2,07:1 Mesures détaillées Contraste avec le
  fond : 2,07:1 · Texte courant : Insuffisant · éléments graphiques :
  Minimum 3:1 non atteint Avec le blanc : 9,23:1 · Avec le noir : 2,27:1
  Luminosité L : 0,400 · chroma C : 0,070 · teinte H : 259°" car c'est
  trop fouilli, on a pas envie de lire ça. → faire maquette Claude
  Intégrer les notions de checks AA et AAA partout

encadré "intensités"
  le positionner directement en dessous de la visualisation des
  palettes

encadré "dérive de teinte"
  le positionner directement en dessous de "intensité"

interface d'exemple
  Supprimer l'interface d'exemple dans l'export de la planche
  intégrer l'interface d'exemple dans une nouvelle section "Interface
  de test", en dernière position

Section "Générer sur Figma"
  refondre cette section pour qu'elle soit au niveau du titre avec un
  nouveau design cohérent (maquette claude à produire)
  Format :
    Palette [nom palette] ...................................... Générer sur
  Figma
  si la planche est déjà sur figma mais que des éléments on changé, le
  bouton deviens "Actualiser sur Figma"
  suppression du message "pas encore sur la planche"
```

## Retours du mainteneur sur les maquettes X2

Texte d’origine.

```text
X2.1 · Création d’une palette
les propositions oublient le menu switch "modèle" et la fonctionnalité "ajuster la référence (qui doit aussi être redsigné)
On supprime totalement la fonction "utiliser la couleur sélectionnée dans Figma"

X2.2 · Détail d’une nuance
1. ok pour A mais ça manque encore un peu de hierarchisation. Et on dirait que la section contrastes fait partie des check "sert à"
2. ok
3. ok

X2.3 · Niveaux AA et AAA
1. B pastille pleine mais utiliser des couleurs un peu moins fortes (toujours teinte vert/rouge)
2. ok
3. ok
X2.4 · Ligne du titre
1. ok
2. ok
3. ok
il faudrait cependant un séparateur visuel entre la zone de création au dessus et la zone de config palette car sinon le bouton "Générer sur FIgma" est perturbant. D'ailleurs ça ne devrait pas être lui l'action principale de la page, plutôt "nouvelle palette", il faut inverser les rôles visuels.

X2.5 · Interface de test
1. oui, replié
-> il faut replier tous les menus dépliés d'ailleurs, notamment les contrastes
2. la carte est masquée, san message

J'avais demandé un retravail du design de l'interface de test, ça n'a pas été fait.

X2.6 · Nuance 50
1. A et D semblent tous les deux parfaitement utilisables, d'ailleurs je ne vois pas spécialement la différence d'usage
```
