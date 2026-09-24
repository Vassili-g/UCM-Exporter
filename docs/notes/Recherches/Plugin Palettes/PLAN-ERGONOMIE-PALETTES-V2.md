# UCM Palettes : plan d’ergonomie, second tour

## Résultat attendu

Le designer ouvre une palette et lit, de haut en bas : sa couleur de base,
l’aperçu de ses nuances avec le rôle de chacune, puis les garanties de
contraste entre ces nuances. Chaque garantie nomme les deux nuances comparées
et le trace sur une réglette. Les réglages se déplient à la demande. La
génération ferme le panneau.

Ce plan est destiné à l’agent qui réalisera les changements. Il remplace les
cases encore ouvertes du [premier plan](./PLAN-ERGONOMIE-PALETTES.md) et
reprend certaines cases déjà faites, que le second tour de recette a
modifiées. Le premier plan reste la trace des lots R0 à R5 ; ses décisions
restent valables quand ce document ne les remplace pas.

## Autorités

Lire dans cet ordre :

1. les [retours du mainteneur](#retours-du-mainteneur), conservés sans
   modification, et ses [réponses aux choix](#réponses-du-mainteneur) ;
2. les décisions ci-dessous ;
3. les [maquettes](./MAQUETTES-ERGONOMIE-V2.html), à ouvrir dans un
   navigateur. Elles montrent le panneau en taille réelle, à 500 px, dans le
   thème sombre de Figma. Leurs couleurs et leurs ratios sont ceux que le moteur calcule
   pour `#1E6FD9` et `#16A34A` avec la recette par défaut ;
4. les décisions acquises du [premier plan](./PLAN-ERGONOMIE-PALETTES.md#autorités-et-décisions-acquises),
   les [décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md) et
   l’[inventaire des textes](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) ;
5. la [spécification](./RECHERCHE-PLUGIN-PALETTES.md), la table des emplois de
   l’[architecture multi-marques](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md#4-les-emplois-et-les-états),
   [AGENTS.md](../../../../AGENTS.md) et [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

Commencer quand les lots R0 à R5 du premier plan sont commités sur `main`.
Ce plan modifie les mêmes fichiers de `packages/plugin-palettes/src/ui/`.

## Faits qui fondent les décisions

| Fait | Source | Conséquence |
|---|---|---|
| Un composant cite un numéro de nuance, `theme.primary.vivid.700`. Aucune variable ne s’appelle `solid` ou `text` | Architecture, section 2 | Chaque comparaison affichée nomme ses deux numéros |
| `on-solid` vaut `neutral.50`, le fond de page du thème | Architecture, section 4 ; `[ENT-05]` | `on-solid` n’a pas de numéro dans la rampe de la palette. Il se montre par une pastille du fond, nommée `on-solid` |
| Un état avance d’un cran, texte et fond ensemble | Architecture, section 4 | La réglette des garanties trace cette avance |
| Les rôles `solid` et `text` visent les mêmes nuances, 700 à 900 | `TABLE_DES_EMPLOIS`, `decalagesDeLEmploi` | Une seule accolade les réunit |
| Les nuances 50, 400, 500 et 950 n’ont aucun rôle | Mêmes fonctions | Aucune accolade ne les couvre |
| Trois états de deux profils, avec leurs numéros, ne tiennent pas côte à côte dans 500 px | Maquettes | La carte des garanties montre un profil à la fois |

## Décisions

| Sujet | Décision |
|---|---|
| Thème de conception | Les maquettes et la relecture se font dans le thème sombre de Figma. Le plugin suit toujours le thème de Figma ; le thème clair reçoit les mêmes règles |
| Largeur | Minimum 500 px, sans valeur plus petite possible. Le designer peut élargir. Taille par défaut inchangée, 600 × 720. Hauteur minimale inchangée, 520 px |
| Bordures | Plus contrastées dans le socle commun, donc aussi dans UCM Exporter |
| Hiérarchie | Un titre de premier rang, « Configuration de la palette ». Chaque sous-section est une carte de même facture |
| Bilan en tête | « Prête · 56/56 promesses respectées » quitte la tête de la configuration. Le résultat de chaque profil se lit dans la carte des garanties |
| Carte « Couleur de base » | Trois colonnes, libellé au-dessus du champ : Nom de la palette, Couleur de référence, Palette de base |
| Palette de base | Auto, Soft ou Vivid. Auto garde le classement de `[MOT-17]`. Soft ou Vivid force le profil porteur ; ce profil prend l’intensité de la référence |
| Aperçu | La ligne « ◆ Référence » passe au-dessus du nuancier. Deux lignes d’accolades remplacent les familles d’usages. Une pastille `on-solid` précède les rampes |
| Termes | Le nom du rôle dans le design system, en police de code ; son nom français dessous, en texte secondaire. Une relation s’écrit « `text` 700 sur `surface` 100 » |
| Garanties | Une carte : bascule Soft/Vivid avec le résultat de chacun, réglette des nuances avec arcs, garanties groupées par minimum, numéros et ratio sous chaque spécimen |
| Détail d’une nuance | L’usage d’abord, la garantie à côté, les mesures repliées |
| Réglages | Deux cartes repliables de même forme, « Intensités » et « Dérive de teinte », à l’image des cartes de dépôt d’UCM Exporter |
| Génération | « Générer sur Figma » dans sa propre carte, en bas. L’option de grille disparaît : la grille des contrastes est toujours générée |
| Nombre de nuances | Réglable dans les Réglages communs, après l’instruction du lot V7 |
| Fausse interface | Écartée du panneau. Elle reste une piste pour la planche générée (V10.11) |

## Correspondance avec le premier plan

| Cases du premier plan | Sort |
|---|---|
| R0.1, surfaces d’UCM Palettes dans CONTRIBUTING.md | Réécrites par V0.1 |
| R0.2, R0.4, exigences et compositions de la spécification | Mises à jour par V0.2 |
| R1.9, « Prête » en tête de la configuration | Retiré par V4.8 |
| R1.5, R2.1, R2.2, groupe « Promesses à corriger » | Absorbés par la carte des garanties (V4.7). Les autres messages gardent leurs groupes |
| R3.1, R3.5, disposition de l’onglet | Refaite par V1 et V2 |
| R3.6, options de génération | Retirées par V6.4 |
| R4.4, ligne de la référence | Déplacée par V3.1 |
| R4.5, familles d’usages | Remplacées par les accolades (V3) |
| R4.6, détail d’une nuance | Refait par V5 |
| R4.7, promesse choisie | Reprise par la sélection d’une garantie (V4.5) |
| R4.8, intensités sous le nuancier | Déplacées dans la carte « Intensités » (V6.1) |
| R5.1, ligne de la dérive | Devient la carte « Dérive de teinte » (V6.1) |
| R4.10 | Repris en V11 |
| R6, R7, R8, R9 | Repris en V8, V9, V10 et V12, avec les amendements de ce tour |

Les autres cases faites restent acquises. Leur comportement se conserve
quand un lot de ce plan déplace l’élément qui le porte : focus, clavier,
routage par `data-cible`, retour après ouverture d’un réglage.

## Direction visuelle

### Rangs et cartes

Trois niveaux de titre, et pas davantage :

| Niveau | Emploi | Style |
|---|---|---|
| Titre de premier rang | « Configuration de la palette » | 16 px / 24 px, semi-gras |
| Titre de carte | Couleur de base, Aperçu, Garanties de contraste, Intensités, Dérive de teinte | 12 px / 16 px, semi-gras |
| Libellé de champ | Nom de la palette, Couleur de référence, Palette de base | 11 px / 16 px, texte secondaire |

Une carte porte le fond secondaire de Figma, une bordure de 1 px et le rayon
de 8 px des cartes de dépôt d’UCM Exporter, sans ombre. La carte de
génération porte le fond du panneau. L’aperçu reste une surface peinte du
fond du thème de la palette, à l’intérieur de sa carte.

Ordre de l’onglet Palettes : sélecteur de palette, titre de premier rang,
Couleur de base, Aperçu, Garanties de contraste, Intensités, Dérive de teinte,
génération. Les messages qui ne sont pas des garanties gardent leur filet de
sévérité, sans carte, sous la carte qu’ils concernent.

### Bordures

La bordure du socle passe de `#444444` à `#5E5E5E` sur le fond sombre, et de
`#E6E6E6` à `#D2D2D2` sur le fond clair. Ces valeurs viennent des maquettes ;
la relecture dans Figma peut les ajuster. Le socle garde les variables
`--figma-color-*` pour tout le reste.

### Termes affichés

| Rôle | Nom français, sous le nom du rôle |
|---|---|
| `solid` | fond plein |
| `on-solid` | texte sur fond plein, le fond de page |
| `text` | texte coloré |
| `surface` | fond léger |
| `border-control` | bordure de champ |
| `border-decorative` | séparateur |
| `focus` | anneau de focus |

Ces noms français remplacent ceux de `NOM_DE_L_EMPLOI` et entrent dans
l’inventaire des textes, marqués « À valider ». Les clés enregistrées ne
changent pas. Le fond de page s’écrit « fond » dans une relation ; son
explication, `neutral.50`, se lit une fois, sur la garantie `on-solid`.

## Ordre d’exécution

| Étape | Lots | Dépendance |
|---|---|---|
| Règles et documents | V0 | Ce plan |
| Cadre et carte de base | V1, V2 | V0. V2 passe par une revue indépendante avant le code du moteur |
| Aperçu, garanties, détail | V3, V4, V5 | V1 |
| Réglages et génération | V6 | V1 |
| Nombre de nuances | V7 | Instruction et décision du mainteneur avant tout code |
| Onglet Planche, Réglages communs | V8, V9 | V1, V6 |
| Planche dans Figma | V10 | V4 pour l’organisation des garanties, V6.4 pour la grille |
| Ajuster la référence | V11 | Exploratoire, ne bloque aucun lot |
| Récupération et clôture | V12 | Parcours finis |

Chaque lot suit les règles de code, de test et de relecture de
CONTRIBUTING.md, met à jour la documentation qu’il touche et préserve les
modifications des autres sessions. Une capture ne prouve ni une interaction ni
une sauvegarde.

## Lot V0 : règles, documents et galerie

- [x] **V0.1** Réécrire « Les surfaces d’UCM Palettes » dans CONTRIBUTING.md :
  cartes de même facture pour chaque sous-section, un titre de premier rang,
  aperçu peint à l’intérieur de sa carte, génération dans la dernière carte.
  La règle des deux cartes d’UCM Exporter ne change pas.
  Fait : l’ordre des cartes, leur facture et les trois niveaux de titre y
  sont écrits.
- [x] **V0.2** Mettre à jour la spécification : `[UI-01]` (500 × 520),
  `[UI-03]`, `[UI-04]` (accolades, pastille `on-solid`, ligne de la
  référence), `[UI-05]` (options retirées), `[VER-07]` (le bilan quitte la
  tête), sections 9.5 (grille toujours générée), 13.2 et 13.3. Ajouter les
  exigences de la carte des garanties et de la palette de base. Réviser
  l’abscisse de `[DER-01]` si V7 rend le nombre de nuances variable.
  Fait : `[UI-01]`, `[UI-03]` à `[UI-05]`, `[VER-06]`, `[VER-07]`,
  `[DER-17]`, sections 9.5, 12, 13.2 et 13.3 ; `[UI-09]` à `[UI-12]` ajoutées
  pour les garanties, le détail d’une nuance, la couleur de base et les
  réglages repliables. Le sens de la palette de base pour le moteur entre
  avec V2 ; `[DER-01]` attend V7.
- [x] **V0.3** Ajouter à l’inventaire des textes les libellés de ce plan :
  noms français des rôles, titres de carte, groupes de garanties, états,
  résumés des cartes repliées, « Auto a choisi Vivid », « Nuance libre ».
  Les marquer « À valider » ; ne pas redemander les textes déjà validés.
  Fait : N026 à N042.
- [x] **V0.4** Déclarer dans `galerie/etats.cjs` les états de ce plan :
  palette de base forcée, garanties respectées, garantie en échec, garantie
  choisie dans l’autre thème, carte repliée, nuance libre, référence.
  Chaque état annoncé nomme la case qui le rendra atteignable.
  Fait : sept états annoncés ; la loi de la galerie accepte les cases V, et
  « Génération partielle » et « Cadre déplacé » attendent V8.4 et V8.6.

Critère : l’agent peut placer chaque élément de l’onglet sans relire ce plan,
à partir de la spécification et de CONTRIBUTING.md.

## Lot V1 : cadre du panneau

- [x] **V1.1** Passer `TAILLE_MINIMALE` à 500 × 520 dans `src/fenetre.ts`.
  Une taille rangée plus étroite s’ouvre à 500 px. La poignée de
  redimensionnement refuse une largeur inférieure.
  Fait : `tailleValide` borne la demande de la poignée comme la taille rangée ;
  vue rouge à 440, puis verte.
- [x] **V1.2** Changer la couleur de bordure dans le socle, pour les deux
  thèmes. Passer la suite d’UCM Exporter et relire sa galerie aux deux
  thèmes : ce changement modifie ses styles calculés, et seule la bordure doit
  différer.
  Fait : `--bordure` ne suit plus `--figma-color-border` et vaut `#D2D2D2` et
  `#5E5E5E`. Suite et lois d’UCM Exporter vertes ; sa galerie reste à relire
  aux deux thèmes, dans Figma.
- [x] **V1.3** Poser le titre de premier rang et les cartes. Les éléments DOM
  existants se déplacent sans être recréés à chaque rendu ; un changement de
  résultat ne fait pas perdre le focus du champ en cours.
  Fait : `src/ui/carte.ts` ; les cartes et leurs contrôles sont créés une
  fois. Le verdict reste à droite du titre jusqu’à V4.8.
- [ ] **V1.4** Mettre à jour le test `[UI-03]` : à 500 × 520, le sélecteur,
  le titre, la carte Couleur de base et le haut de l’aperçu se lisent sans
  défiler.

Critère : aux deux thèmes de Figma, chaque carte se distingue du fond du
panneau et de sa voisine, dans Figma et pas seulement dans la galerie.

## Lot V2 : couleur de base et palette de base

- [x] **V2.1** Disposer la carte en trois colonnes égales, libellé au-dessus
  du champ : Nom de la palette, Couleur de référence (pastille cliquable et
  code hexadécimal), Palette de base. Sous le sélecteur, une ligne dit le
  choix d’Auto : « Auto a choisi Vivid ». L’erreur d’un code invalide reste
  sous son champ.
  Fait : segments Auto, Soft, Vivid (`aria-pressed`) dans la troisième
  colonne ; l’état de galerie « Palette de base forcée » est atteignable.
- [x] **V2.2** Ajouter à la palette le choix de la palette de base : `auto`,
  `soft` ou `vivid`. Absent, il vaut `auto`. C’est une nouvelle donnée
  enregistrée : monter `FORMAT_RECETTE`, écrire la migration dans
  `MIGRATIONS` et le test qui lit une recette de format 1. Le nom du champ se
  décide dans ce lot, avant la revue.
  Fait : champ `base`, `soft` ou `vivid`, absent en Auto ; `FORMAT_RECETTE`
  vaut 2, `MIGRATIONS[1]` ne fait que monter la version, et la règle
  `base-inconnue` refuse une autre valeur.
- [x] **V2.3** Faire lire ce choix par `profilPorteur` : `soft` ou `vivid`
  impose le profil ; `auto` garde la règle de `[MOT-17]`. La nuance porteuse
  se calcule toujours par thème, et la référence garde ses octets exacts.
  Fait : `profilPorteur` rend `base`, sinon `profilAutomatique`, l’ancienne
  règle.
- [x] **V2.4** Donner au profil forcé l’intensité de la référence, par les
  intensités propres de la palette. Si Soft dépasse alors Vivid, élever Vivid
  à la même valeur : Soft ne dépasse jamais Vivid (`[ENT-09]`, R4.8).
  L’alerte « Profils confondus » signale le cas où les deux profils se
  rejoignent. Définir ce que devient cette intensité au retour à Auto, et
  comment elle se distingue d’une intensité posée par le designer (champ
  `origine` des parts, `[ENT-09]`).
  Fait, après revue : les parts de la base se calculent dans `partsDe`, sans
  origine nouvelle ni rangement. Elles suivent la référence et les parts
  communes ; des parts propres passent avant elles. Vivid forcé abaisse Soft
  à la part de la référence, cas symétrique que le plan ne nommait pas.
  Forcer retire les parts `designer`, garde les parts `grise` ; revenir à
  Auto retire `base`. « Profils confondus » d’une palette forcée mène aux
  intensités de la palette (`[ENT-11]`).
- [x] **V2.5** Montrer l’effet dans la carte « Intensités » : son résumé et
  ses curseurs portent l’intensité propre créée par le choix. Un glisser ne
  déplace pas la référence hors du profil forcé.
  Fait : le résumé dit « Palette de base Vivid · Soft … · Vivid … » ; un
  glisser pose des parts `designer` et garde le profil forcé.
- [x] **V2.6** Couvrir par des tests : référence terne forcée en Vivid,
  référence saturée forcée en Soft, forçage vers le profil qu’Auto aurait
  choisi, retour à Auto, gris et noir forcés. Propriété : la couleur de
  référence est identique dans le profil forcé, dans les deux thèmes.
  Fait : `packages/couleur/tests/base.test.ts`, dont la propriété sur
  quarante teintes et clartés, quatre jeux de parts communes et les deux
  bases ; tests de `choisirLaBase` et de la migration de format 1.

Revue indépendante avant V2.2 : ce lot change le moteur et le format. Ses
conclusions se vérifient dans le code avant d’être appliquées.

Critère : le designer impose un profil sans que sa couleur change, et lit
dans « Intensités » ce que ce choix a modifié.

## Lot V3 : aperçu

- [ ] **V3.1** Placer « ◆ Référence : Vivid · nuance 600 » au-dessus du
  nuancier, sous le titre de la carte. La bascule Light/Dark et le fond du
  thème passent dans l’en-tête de la carte.
- [ ] **V3.2** Ajouter avant les rampes une pastille `on-solid`, peinte du
  fond du thème, sur la hauteur des deux rangées, avec un contour tireté qui
  la détache de la surface. Elle se choisit comme une nuance ; son détail
  suit V5.3.
- [ ] **V3.3** Remplacer les familles d’usages par deux lignes d’accolades à
  trait fin, sous les numéros. Ligne 1 : `on-solid`, `surface` (100 à 300),
  `solid · text` (700 à 900). Ligne 2 : `border-decorative` (300),
  `border-control · focus` (600 à 800). Chaque accolade porte le nom du rôle,
  puis son nom français dessous. Les plages se calculent depuis
  `TABLE_DES_EMPLOIS` et `decalagesDeLEmploi`, sans table recopiée.
- [ ] **V3.4** Une accolade ne couvre que des nuances de rôle. Un libellé plus
  large que son accolade déborde sur les colonnes libres de sa ligne, sans
  chevaucher le libellé voisin. Vérifier à 500 px et à 600 px.
- [ ] **V3.5** Retirer `FAMILLES_D_USAGES`, le sélecteur de famille sous
  520 px et leurs textes. Les états repos, survol et appui ne se dessinent pas
  dans les accolades ; le détail d’une nuance les nomme.
- [ ] **V3.6** Conserver la grille WAI-ARIA des pastilles (R4.9) et les
  signes de R2.4. Les accolades ne sont pas focalisables.

Critère : sans cliquer, le designer lit quelles nuances servent à quel rôle,
et retrouve la couleur du texte posé sur un fond plein.

## Lot V4 : carte des garanties

- [ ] **V4.1** Ajouter la carte « Garanties de contraste » sous l’aperçu.
  Elle suit le thème choisi dans l’aperçu et le nomme dans son en-tête. Elle
  est dépliée à l’ouverture ; son état replié se conserve pendant la session.
- [ ] **V4.2** Poser une bascule Soft/Vivid. Chaque segment porte le résultat
  de son profil : ✓, ou ✗ suivi du nombre de promesses manquées. À
  l’ouverture d’une palette, le profil porteur est choisi. Repliée, la carte
  garde ces deux résultats dans son en-tête.
- [ ] **V4.3** Dessiner une réglette : la case `on-solid`, puis les onze
  nuances du profil choisi, numérotées, sur le fond du thème. La garantie
  choisie s’y trace par un arc par état, de la nuance du premier membre à
  celle du second. Le repos a un trait plein, le survol un tireté, l’appui un
  pointillé ; une légende d’une ligne les nomme. Un arc en échec prend la
  couleur de danger.
- [ ] **V4.4** Lister une ligne par association (section 9.4 de la
  spécification), en deux groupes : « Textes lisibles », minimum texte, et
  « Éléments visibles », minimum non textuel. Chaque groupe affiche son
  minimum, lu dans la recette. Une ligne porte la relation (`text` sur
  `surface`), son nom français, puis un spécimen par état. Sous chaque
  spécimen : les deux numéros (« 700 / 100 », « fond / 700 »), le ratio avec
  ✓ ou ✗, puis l’état.
- [ ] **V4.5** Une ligne se choisit au clic ou au clavier. Au départ, la
  première ligne en échec est choisie ; sinon `text` sur `surface`. Le choix
  redessine les arcs et se conserve au changement de profil. Une garantie
  choisie depuis un message situé dans l’autre thème bascule le thème de
  l’aperçu et offre le retour (R4.7).
- [ ] **V4.6** Terminer la liste par une ligne sans spécimen :
  `border-decorative` 300, séparateur sans minimum de contraste.
- [ ] **V4.7** Porter l’échec sur sa ligne : état fautif, ratio et minimum,
  puis le lien vers le réglage qui peut agir, choisi par
  `ciblesDeLaPromesse` et routé par `data-cible`. Le groupe de messages
  « Promesses à corriger » disparaît de la liste des messages. Le compte des
  contrôles reste celui de `[VER-06]`, par paire, thème et profil.
- [ ] **V4.8** Retirer le verdict « Prête » de la tête de la configuration et
  du bilan sous l’éditeur de dérive. Le bilan de la dérive (`[DER-17]`)
  renvoie à la carte des garanties.
- [ ] **V4.9** Donner à chaque ligne une étiquette accessible qui dit la
  relation, les numéros, les ratios et le résultat. La réglette et ses arcs
  sont décoratifs pour l’assistance technique. Le résultat du profil non
  affiché s’annonce dans la bascule.

Critère : en un regard, le designer sait si chaque profil tient ses
garanties, entre quelles nuances et dans quel état une garantie échoue.

## Lot V5 : détail d’une nuance

- [ ] **V5.1** En tête : grande pastille, « Vivid · 700 », code
  hexadécimal, bouton Copier. La référence ajoute « ◆ Votre couleur de
  référence exacte ».
- [ ] **V5.2** Sous « Sert à », une ligne par usage de la nuance : un
  spécimen, le rôle et l’état (`solid` · repos), son nom français, puis la
  garantie qui le concerne avec le numéro du partenaire (« ✓ sur `surface`
  100 : 5,78:1 »). Un clic sur la garantie la choisit dans la carte des
  garanties.
- [ ] **V5.3** La pastille `on-solid` a son propre détail : fond de page du
  thème, `neutral.50` du design system, texte posé sur `solid` 700 à 900,
  avec les garanties de ces trois états.
- [ ] **V5.4** Une nuance sans rôle affiche « Nuance libre : aucun usage
  prévu » et son contraste avec le fond.
- [ ] **V5.5** Replier sous « Mesures détaillées » les niveaux WCAG
  (`[VER-13]`), les contrastes avec le blanc et le noir, les valeurs OKLCH et
  la mention d’une nuance identique à une autre.

Critère : le détail répond d’abord à « à quoi sert cette couleur et qu’est-ce
qui est garanti ». Aucun ratio n’y apparaît sans le nom de ce qu’il compare.

## Lot V6 : réglages repliables et génération

- [x] **V6.1** Ranger les intensités et l’éditeur de dérive dans deux cartes
  repliables, « Intensités » et « Dérive de teinte ». Leur en-tête est un
  bouton : chevron, titre, résumé aligné à droite. Elles sont repliées à
  l’ouverture et gardent leur état pendant la session.
  Fait : cartes repliables de `src/ui/carte.ts` ; une référence presque grise
  désactive celle de la dérive.
- [x] **V6.2** Écrire les résumés : origine commune ou propre et les deux
  intensités ; préréglage et synchronisation de la dérive. Un point à
  vérifier qui concerne la carte, par exemple des profils confondus,
  s’annonce dans le résumé quand elle est repliée.
  Fait : `resumeDesIntensites` et `resumeDeLaDerive` comptent les points à
  vérifier de leur carte.
- [x] **V6.3** Placer « Générer sur Figma » seul dans la dernière carte, avec
  l’état du cadre et « Afficher dans Figma » sur la même ligne (R3.9).
- [x] **V6.4** Retirer les options de génération des onglets Palettes et
  Planche, avec `optionsDeGeneration.ts` et leurs textes. La grille des
  contrastes est toujours générée. Mesurer le temps et le nombre de calques
  d’une génération de douze palettes avec la grille, et appliquer `[PLA-24]`
  au résultat.
  Fait : l’interface demande toujours la grille, et la fraîcheur attend un
  cadre qui la porte : un cadre dessiné sans elle est à mettre à jour.
  Mesure sur le modèle : 18 624 calques pour douze palettes, 1 552 par
  palette contre 535 sans grille ; la confirmation le dit. Le temps de
  génération se mesure dans Figma, à la recette.
- [x] **V6.5** Un lien d’un message qui vise un réglage de la palette ouvre sa
  carte avant de focaliser le contrôle. Le retour suit R3.7.

Critère : fermées, les deux cartes tiennent sur deux lignes et disent leur
état ; ouvertes, elles montrent le contenu actuel sans perte de fonction.

## Lot V7 : nombre de nuances

Le designer choisit le nombre de nuances dans les Réglages communs. La
recette porte déjà la liste `crans` et une clarté par nuance dans chaque
courbe, mais `[ENT-08]` interdit de les modifier dans l’interface, et
l’architecture fixe onze nuances à toutes les rampes. Ce lot commence donc par
une instruction.

- [ ] **V7.1** Relever ce qui suppose onze nuances ou un numéro précis :
  `[REC-05]` et `CRANS_DES_EMPLOIS`, la garantie des courbes et l’alerte de
  fond, qui lisent la nuance 50 (`[ENT-06]`, `[ENT-10]`),
  `CRANS_PALETTES_PROCHES`, le préréglage Tailwind, l’abscisse de l’éditeur de
  dérive, la grille de l’aperçu et de la réglette, la planche, la grille des
  contrastes et l’empreinte des cadres.
- [ ] **V7.2** Proposer au mainteneur, avec des rampes calculées : le geste
  (liste de numéros, ou préréglages de nombre), les numéros ajoutés ou
  retirés, la clarté d’une nuance ajoutée (interpolation de la courbe, puis
  réglage) et le nombre maximal qui tient à 500 px. Les sept nuances de la
  table des emplois restent obligatoires.
- [ ] **V7.3** Présenter l’écart avec l’architecture multi-marques : nombre
  de variables de `theme`, rampes de marques différentes. Faire trancher par
  le mainteneur avant tout code.
- [ ] **V7.4** Après décision, écrire les cases d’implémentation dans ce plan,
  puis passer la conception en revue indépendante : le lot touche le moteur,
  la recette et la planche.

Critère : le mainteneur décide sur des rampes réelles et une liste
d’impacts vérifiée dans le code.

## Lot V8 : onglet Planche et cadres retrouvés

Repris du lot R6 du premier plan. Les fiches adoptent les cartes et les termes
de ce plan.

- [ ] **V8.1** (ex-R6.1) Une fiche par palette, dans l’ordre enregistré :
  nom, aperçu Soft et Vivid, profil et nuance de la référence, résultat Soft
  et Vivid des garanties comme dans la bascule de V4.2, état du cadre. Une
  bascule de thème commune à la liste évite une bascule par fiche.
- [ ] **V8.2** (ex-R6.2) Séparer les états du cadre et les garanties. À
  jour, À mettre à jour, Pas encore sur la planche, Lecture impossible et
  Copie ont des sens distincts. Un ratio insuffisant n’est pas une panne de
  génération.
- [ ] **V8.3** (ex-R6.3) Trois gestes : Afficher dans Figma, Modifier la
  palette, Générer sur Figma. Le premier est proposé seulement pour une cible
  localisée. Le deuxième conserve la palette et le thème choisis.
- [ ] **V8.4** (ex-R6.4) Proposer la génération des palettes à mettre à jour
  et Tout générer. Gérer singulier et pluriel, confirmer les générations
  volumineuses. Montrer la progression, l’annulation si elle est réellement
  supportée, et le résultat partiel par palette. Aucune option de grille
  (V6.4).
- [ ] **V8.5** (ex-R6.5) Garder le compte de palettes en tête. Ranger import,
  export, rapport et détails techniques dans une carte repliable secondaire.
- [ ] **V8.6** (ex-R6.6) Résoudre d’abord les identifiants enregistrés,
  valider les marqueurs de propriété et retrouver page, parent et position
  réels. Prévoir un cadre déplacé dans une section ou sur une autre page,
  sans assimiler une copie à l’original. Vérifier les capacités de lecture
  sous `documentAccess: "dynamic-page"` avant le code qui en dépend. Aucun
  chargement de toutes les pages à chaque saisie.

  Au remplacement, préserver parent, ordre et placement effectif : le couple
  x/y ne suffit pas dans un parent transformé ou en auto layout. Une lecture
  impossible ne devient pas « jamais générée » et n’autorise pas un doublon
  silencieux. Si la recherche de secours reste bornée à la page connue,
  l’interface annonce cette limite et propose une recherche explicite. Ne
  pas reconstituer des réglages depuis les couleurs d’un cadre d’origine
  inconnue.
- [ ] **V8.7** (ex-R6.7) Actualiser à l’ouverture du plugin, à l’accès à
  Planche et après génération. Prévoir une actualisation explicite pour les
  gestes externes que les événements Figma ne signalent pas. Borner le coût :
  aucune boucle qui parcourt le document en continu.
- [ ] **V8.8** (ex-R6.8) Adapter les données de suivi si plusieurs pages
  deviennent possibles. Une ancienne entrée de page unique reste lisible.
  Distinguer la version du suivi des cadres de celle des palettes et
  réglages.

Critère : déplacer ou ranger un cadre ne crée pas une seconde planche au clic
suivant. Une cible introuvable se distingue d’une cible jamais créée.

## Lot V9 : Réglages communs

Repris du lot R7 du premier plan, avec la grammaire de cartes de ce plan.

- [ ] **V9.1** (ex-R7.1) Reprendre les trois niveaux de titre de Palettes.
  Le gras reste réservé aux titres ; valeurs et libellés gardent le poids
  courant.
- [ ] **V9.2** (ex-R7.2) Présenter dans l’ordre : Couleurs de fond,
  Intensités, Luminosité des nuances, puis les cartes repliées Minimums des
  promesses et Détection des couleurs proches. Le réglage du nombre de
  nuances prend la place que V7 lui donne. Chaque groupe est une carte ; un
  groupe replié a la forme de V6.1.
- [ ] **V9.3** (ex-R7.3) Garder un aperçu compact de la palette ouverte et le
  résultat Soft et Vivid de ses garanties. Sans palette, afficher les
  réglages sans inventer de palette de marque.
- [ ] **V9.4** (ex-R7.4) Montrer les courbes au-dessus des valeurs. Les
  champs restent utilisables au clavier. Distinguer la courbe commune du
  point de référence réellement inséré ; la garantie des courbes ne remplace
  pas les garanties des palettes.
- [ ] **V9.5** (ex-R7.5) Rétablir les valeurs par défaut d’un groupe sans
  écraser les autres groupes ni les intensités propres des palettes, y
  compris celles posées par une palette de base forcée (V2.4). Afficher le
  nombre de palettes concernées.
- [ ] **V9.6** (ex-R7.6) Associer code hexadécimal, pastille et sélecteur de
  couleur avec aperçu. Réutiliser d’abord le contrôle existant. Si le
  sélecteur natif ne convient pas dans Figma, choisir un contrôle embarqué
  après examen de son interaction et de son coût, sans requête externe.
- [ ] **V9.7** (ex-R7.7) Ouvrir le bon groupe depuis les liens, conserver le
  contexte de retour et rendre le focus au déclencheur. L’engrenage reste
  l’entrée générale.
- [ ] **V9.8** (ex-R7.8) Employer les textes retenus et afficher l’unité de
  chaque mesure avancée. Ne pas présenter une intensité relative comme un
  pourcentage de saturation HSL.
- [ ] **V9.9** (ex-R7.9) Prévisualiser une saisie valide ; conserver les
  saisies intermédiaires sans écraser leur champ. Enregistrer selon le geste
  prévu, avec un retour visible en cas de refus.

Critère : le designer voit l’effet de ses réglages, sait quelles palettes
sont concernées et retrouve son point de départ après fermeture.

## Lot V10 : planche générée dans Figma

Repris du lot R8 du premier plan. La planche reprend les termes et
l’organisation des garanties de ce plan.

- [ ] **V10.1** (ex-R8.1) En-tête : nom, référence avec son profil, résultat
  Soft et Vivid des garanties. Retirer version, empreinte imprimée, espace de
  couleur du document et avertissement permanent de remplacement. Garder les
  métadonnées dans les données de plugin et le rapport. L’empreinte ne dépend
  plus d’un texte qui doit contenir sa propre empreinte.
- [ ] **V10.2** (ex-R8.2) Bloc Couleur de référence : grande pastille, code,
  profil porteur, nuance de chaque thème, et la palette de base choisie
  quand elle n’est pas Auto. Regrouper les contrastes comparés dans un
  tableau légendé ; placer les mesures avancées dans une zone séparée. Une
  chaîne présentée comme copiable en CSS emploie des points décimaux.
- [ ] **V10.3** (ex-R8.3) Chaque rangée nomme Soft ou Vivid. Le repère de la
  référence se trouve au même endroit que dans l’aperçu.
- [ ] **V10.4** (ex-R8.4) Délimiter chaque section Light et Dark par un filet
  visible sur fond clair et sombre. Peindre selon le profil de couleur du
  document. Les couleurs de légende restent distinctes de celles de la
  palette.
- [ ] **V10.5** (ex-R8.5) Une nuance porte son numéro, son code et ses rôles,
  nom du design system et nom français. Donner les contrastes utiles avec le
  nom de ce qu’ils comparent. Ajouter la pastille `on-solid` et les
  accolades de V3.
- [ ] **V10.6** (ex-R8.6) Organiser les garanties par thème, puis en deux
  groupes par minimum, une ligne par association. Chaque état montre son
  spécimen Soft et Vivid, les deux numéros comparés, le ratio et le
  résultat. Toutes les paires du moteur restent représentées.
- [ ] **V10.7** (ex-R8.7) Grille des contrastes toujours présente : titre de
  thème et de profil, numéros sur les deux axes, légende des ratios et valeur
  dans chaque cellule. Expliquer les catégories de couleur en mots. Distinguer
  cette comparaison libre des garanties.
- [ ] **V10.8** (ex-R8.8) Définir la hiérarchie de la planche par des styles
  nommés : titre de palette, thème, rôle, valeur, note. Prévoir des largeurs
  suffisantes et charger toutes les polices avant le premier calque. Une
  longue palette ne coupe ni code ni résultat.
- [ ] **V10.9** (ex-R8.9) Retirer les noms internes des seuils de la légende.
  Expliquer comment lire une garantie et distinguer Soft de Vivid par leurs
  spécimens.
- [ ] **V10.10** (ex-R8.10) Répercuter toute modification du modèle dans sa
  fraîcheur : les anciens cadres passent « À mettre à jour ». Garder la
  confirmation des calques ajoutés.
- [ ] **V10.11** Explorer une fausse interface par thème et par profil :
  carte, bouton, champ, lien et anneau de focus peints avec la palette, chaque
  élément annoté de ses rôles et numéros. Présenter une maquette au
  mainteneur avant de l’ajouter au modèle de planche.

Critère : sans le plugin, le designer trouve la référence, lit le rôle de
chaque nuance et comprend une garantie avec ses deux numéros.

## Lot V11 : ajuster la référence

Repris de R4.10 du premier plan, sans changement. Exploration séparée :
présenter la référence originale, la proposition, le numéro visé et un aperçu
des garanties. Offrir de petits pas, une saisie et une annulation ; la valeur
d’un pas reste à établir. Seul Appliquer change la référence, et l’originale
se restaure après réouverture. Définir la migration avant de persister cette
origine. Aucun alignement automatique, aucun changement imposé par une
courbe, aucun effet à la simple ouverture du panneau.

- [ ] **V11.1** Maquette et parcours présentés au mainteneur.
- [ ] **V11.2** Décision de format, puis implémentation.

## Lot V12 : récupération et clôture

Repris du lot R9 du premier plan.

- [ ] **V12.1** (ex-R9.1) En cas de conflit d’enregistrement, préserver le
  brouillon, bloquer les gestes qui écriraient une version périmée et garder
  les vues consultables. L’export du brouillon et Recharger restent
  accessibles ; la bannière de récupération reste active.
- [ ] **V12.2** (ex-R9.2) Avant un import, montrer les palettes ajoutées et
  retirées et les valeurs modifiées, palette de base comprise. Distinguer
  changement de couleurs, changement de minimums et conséquence sur la
  planche. Aucune écriture avant confirmation ; une annulation conserve le
  brouillon.
- [ ] **V12.3** (ex-R9.3) Exécuter la recette ci-dessous sur les parcours
  finis. Consigner les observations et les limites restantes.
- [ ] **V12.4** (ex-R9.4) Mettre à jour AGENTS.md, la spécification et les
  liens des plans. Marquer le premier plan comme remplacé pour ses cases
  ouvertes.
- [ ] **V12.5** (ex-R9.5) Construire ensemble code et interface, puis
  recharger le plugin avant la recette Figma. Un écart de version entre les
  deux ne se confond pas avec un défaut de couleur.

Critère de clôture : contrôles du dépôt, typecheck, build, tests d’interface
de Palettes et recette Figma terminés.

## Recette mainteneur

| Scénario | Résultat observable | Lots |
|---|---|---|
| Ouvrir le plugin en thème sombre | Cartes distinctes du fond, titre de premier rang identifiable | V1 |
| Réduire la fenêtre | Impossible sous 500 px de large | V1 |
| Ouvrir UCM Exporter | Bordures renforcées, reste inchangé | V1 |
| Forcer Soft sur une couleur saturée | Même code exact, repère Soft, intensité Soft propre visible dans « Intensités » | V2 |
| Revenir à Auto | Profil du classement automatique, intensités cohérentes avec V2.4 | V2 |
| Lire l’aperçu | Accolades lisibles, `on-solid` identifiée, nuances libres sans accolade | V3 |
| Choisir `text` sur `surface` | Trois arcs parallèles, numéros 700 / 100, 800 / 200, 900 / 300 | V4 |
| Palette avec une garantie en échec | Bascule « ✗ 2 » sur le profil, ligne choisie d’office, arc rouge, lien vers le réglage | V4 |
| Cliquer une nuance, puis `on-solid` | Usages et garanties avec numéros ; détail du fond de page | V5 |
| Replier et déplier les réglages | Résumés justes, point à vérifier annoncé replié | V6 |
| Générer une palette | Grille présente sur la planche, sans option à cocher | V6, V10 |
| Onglet Planche avec huit palettes | Fiches, résultats par profil, états du cadre et trois gestes distincts | V8 |
| Déplacer un cadre dans une section ou une autre page | Retrouvé par identité, pas de doublon silencieux | V8 |
| Modifier un fond puis revenir | Aperçu et garanties réactualisés ; palette, thème, sélection et focus retrouvés | V9 |
| Conflit de sauvegarde, import annulé | Brouillon exportable ; aucune donnée remplacée | V12 |
| Lire la planche | Référence, rôles, garanties et légendes identifiables sans le plugin | V10 |
| Navigation clavier | Focus visible, sélection persistante, retour après ouverture d’un réglage | V3 à V9 |

La recette visuelle couvre 500 × 520 et 600 × 720, les deux thèmes de Figma,
les deux thèmes de palette, un fond personnalisé saturé, un nom long et
plusieurs garanties en échec.

## Hors périmètre

- Création de variables et ajout aux tokens du design system.
- Reconstitution de réglages depuis une planche étrangère.
- Modification de la référence pour satisfaire une courbe ou un minimum.
- Fausse interface dans le panneau du plugin.
- Implémentation du nombre de nuances avant la décision de V7.3.

## Réponses du mainteneur

| Question | Réponse |
|---|---|
| Où renforcer les bordures | Dans tout UCM ; conception en thème sombre |
| Largeur de 500 px | Un minimum ; la fenêtre peut s’élargir |
| Profil forcé | Le profil choisi s’aligne sur l’intensité de la couleur |
| Accolades | Deux lignes. La pastille « Fond du thème » d’abord retirée, puis réintroduite sous le nom `on-solid` avec la nouvelle présentation |
| Termes | Nom du design system en police de code, français dessous |
| Usages et promesses | Une carte des garanties, avec réglette et arcs, et les numéros sous chaque spécimen |
| Détail d’une nuance | L’usage d’abord, la garantie à côté, les chiffres ensuite |
| Noms des réglages | « Intensités » et « Dérive de teinte » |
| Nombre de nuances | À choisir dans les Réglages communs |

## Retours du mainteneur

Texte d’origine, indentation rétablie d’après la structure des sujets.

```text
Retours round 2 :

Panneau de configuration des palettes :
  La hierarchisation des informations est toujours mauvaise
    Titre: Configuration
      il devrait plus identifiable comme titre de section principal
    Retirer “Prête · 56/56 promesses respectées”
  Les couleurs des borders partout sont trop subtiles, on ne les distingue à peine
  La largeur minimale du plugin devrait être de 500px et on ne devrait pas pouvoir modifier ça
  Chaque sous section de la configuration devrait être mieux identifiable visuellement (cards ?)
  section “couleur de référence” :
    devrait être une sous section identifiable en temps que tel
    Mettre la pastille de couleur cliquable et l’input hexa sous le texte “Couleur de référence”
    Mettre l’input de texte sous “Nom de la palette”
    Mettre les deux côte à cote en colonnes
    Mettre les deux dans leur propre sous section, c’est la configuration de la couleur de base, premier élément après le titre global
    Mettre une autre fonctionnalité à côté :
      Titre : Palette de base
      Switch entre auto / vivid / soft
      Fonctionnalité : force la couleur de base sur la palette vivid ou la palette soft, tout le reste s’adapte en fonction
    Résumé de la section, de gauche à droite :
      1: Nom de la palette
      2: Couleur de référence
      3: Palette de base
  Ensuite on a la visualisation de la palette
    mettre le texte “◆ Référence : Soft · nuance 500” en dessus du widget de visualisation
    On ne comprend pas très bien le widget Fonds / Bordures et focus / Fonds pleins / Textes. Je préferais la visualisation que tu avais fait dans ton doc html partagé où on pouvait tout voir en une seule fois et ça prenait aucune place verticalement. Genre comme ça :
      matérialiser des brackets qui soulignent les palettes de couleurs avec des strokes fins, on les dispose côte à côte. On affiche les texte label en dessous. Comme ça on voit tout en même temps et on comprend bien quelles teintes correspondent à quel brackets
      Tu peux t’inspirer de radix ici https://www.radix-ui.com/colors/custom ils ont des brackets un peu comme ça avec :
        --> 1, 2 : Background colors
        --> 3,4,5 : interactive components
        --> 6,7,8 : borders and separators
        --> 9,10 : solid colors
        --> 11,12 : accessible text
    “on-solid Fond du thème” s’affiche à un certain moment mais on ne comprend pas ce que c’est sensé signifier : à revoir
    Il n’y aucune mention claire des “promesses” : comment chaque couleur est sensée fonctionner avec les autres couleurs etc, c’est très dommage.
    Les textes affichés quand on clique sur une couleur sont trop complexes et manquant de contexte et de hierarchie visuelle:
      “Fond plein (solid) au survol · Texte coloré (text) au survol · Bordure de contrôle (border-control) à l’appui”
        --> ça c’est l’usage de la couleur ? si oui il faut que ça soit claire, c’est l’information PRINCIPALE, on veut savoir dans quelle condition cette couleur s’utilise et avec quelles garanties. Il faut faire une réflexion profonde sur ce sujet.
      Contraste avec le fond : 8,23:1 · Texte courant : AAA · éléments graphiques : Minimum 3:1 atteint Avec le blanc : 8,23:1 · Avec le noir : 2,54:1
        --> toute cette section est à revoir graphiquement aussi, il faut la rendre plus simple et plus impactante comme la section du dessus, ça doit être compréhensible en un regard.
    Quand on clique sur un élément de type “solid”, border decorative” etc on a plein d’infos qui s’affichent :
      on ne comprend absolument rien. Il faut tout revoir. peut être en réflexion avec les autres parties vu ci-dessus. quel est l’objectif ? quelle informations on essaie de donner à l’utilisateur ? comment pourrait on afficher ça plus clairement ?
      Est ce que ça vaudrait le coup de matérialiser des fausses interfaces pour voir comment tout ça s’applique en condition réelle comme le font certains sites (dont radix) https://www.radix-ui.com/colors/custom ? ou c’est pas le sujet ici ? à rechercher profondément pour trouver la bonne solution et à faire valider : ça doit surtout répondre au besoin, qui doit être mieux défini pour cette section
      Peut être que ça nécessiterait d’être une toute autre section en dehors du widget, une section de visualisation/validation des contrastes et usages ? à réfléchir.
  Ensuite on a les réglages de la palette.
    Chaque section de réglage devrait être traitée de la même façon.
      ça pourrait être un menu dépliant / repliant comme la configuration de la dérive, mais plus avec un look “bouton”, comme pour l’ajout de dépôts sur UCM Exporter.
      Chaque réglage serait sur le même schéma
    Réglages de cette palette
    Configuration de la dérive
  Le bouton “Générer sur Figma” devrait être dans sa propre section, tout en bas
  Supprimer “Options de génération : sans grille des contrastes” et l’activer par défaut.
```
