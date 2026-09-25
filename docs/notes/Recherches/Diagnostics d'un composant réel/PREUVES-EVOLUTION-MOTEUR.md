# Preuves de l'évolution du moteur

## État

- Lot courant : recette du mainteneur (E10)
- Branche et `HEAD` de départ : `main`, `92e7cff` ; E1 part de `71fc6c9`
- Portes franchies : H0, H1 et H2. Le rang des ombres dans `effects` se
  vérifie à la recette de E10.

La copie de travail partagée porte le travail non commité d'autres sessions
(`docs/notes/Recherches/Optimisation Tokens`, `Plugin Palettes`,
`Réglages du plugin`). Aucun de ces fichiers n'est visé par le plan. Chaque lot
se vérifie dans un worktree isolé, extrait par
`git -c core.autocrlf=false worktree add --detach`, où les fichiers du lot sont
copiés ; le build y tourne étape par étape.

## Lots

### E0 : référence

- Commit : ce commit, précédé de la correction du plan (`5079232`).
- Commandes, worktree à `92e7cff` :
  - `npm test` : 0. `npm run typecheck` : 0.
  - build étape par étape (kit, `build:code`, `build:ui`, manifeste, plugin
    Palettes) : 0 à chaque étape.
  - avec le plan corrigé et le scénario du lot : suite du plugin, 929 tests,
    0 échec ; tests de la racine, 25 tests, 0 échec ; `controle-style.mjs` sur
    le plan : conforme.
- Scénario : une racine `State=Disabled` d'opacité 0,5 sans variable s'ajoute.
  La borne sans variable vise quatre racines au lieu de trois, le point de
  l'imbriqué sans règles huit instances au lieu de six. La famille
  `calqueAbsolu` est scindée par lot. Le scénario sort 16 lignes :

  | Famille | Lignes | Lot qui la change |
  |---|---|---|
  | `borneSansVariable` (quatre cibles) | 1 | aucun |
  | `effet` (deux cibles) | 1 | E3 |
  | `opaciteDuCalqueAbsolu` | 1 | E2 |
  | `opaciteDeRacine` | 1 | E2 |
  | `cadreSansAutoLayout` | 1 | E4 |
  | `dimensionSousContrainte` (`Mask`, `Circle`) | 4 | aucun, depuis H2 |
  | `resteDuCalqueAbsolu` (mask, rayon, dimensions de `Overlay`) | 4 | aucun |
  | `imbriqueSansRegles` (huit cibles) | 1 | aucun |
  | `regleIconsSansMarqueur` | 1 | aucun |

  S'y ajoute la règle `@usage` « [À compléter] », hors famille. Les familles
  `horsDuNodeElu`, `dessinImbrique`, `hauteurDuTexteMasque`, `etatNonReconnu`
  et `intentionAbsente` restent à 0 ; `disabled` est un état reconnu.
- Mutations, dans le worktree :
  - `if (typeof values.opacity === 'number' && values.opacity < 1)` devient
    `if (false && …)` dans `unsupportedProperties.ts` : « la famille
    « opaciteDuCalqueAbsolu » ne sort pas ». Restauré par copie : vert.
  - la racine `Disabled` perd son opacité : « la famille « opaciteDeRacine »
    ne sort pas ». Restauré par copie : vert.
- Écart ou réserve : aucun.

### E5 : les peintures d'une racine se regroupent

- Commit : ce commit, précédé de `40ab8b3`.
- Changement : chaque canal de variant d'`extractVariantTokens` déclare les
  racines que `warnings` a déclarées. La condition d'`extractStructure`, plus
  d'un variant, reste la seule règle de déclaration.
- Tests : dans `messagesDeRacine.test.ts`, trois racines au stroke weight sans
  variable donnent une ligne à trois cibles, rouge avant le changement (trois
  lignes nommées) ; un composant seul garde « Layer « Wide », stroke weight ».
- Commandes, worktree à `40ab8b3` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 929 à 931 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape.
- Mutations, dans le worktree :
  - retirer `declarerLesRacinesDeVariants(variantWarnings, racines)` : « trois
    racines au stroke weight… » échoue sur trois lignes nommées. Restauré par
    copie : vert.
  - déclarer toutes les racines sans consulter `warnings` : « un composant
    seul garde le nom de son calque… » échoue. Restauré par copie : vert.
- `SPEC.md`, « Racine de variant » : le canal des couleurs reprend les racines
  déclarées.
- Écart ou réserve : aucun.

### E1 : le kit connaît la 14.0

- Commit : ce commit, précédé de `b377c39`. Ce commit d'une autre session,
  arrivé pendant le lot, ne touche aucun fichier du lot : la vérification
  porte sur `71fc6c9`.
- Forme : `effectStyles`, `viewEffects`, le renvoi `effects` d'une vue et
  `opacity` sur le composant et sur chaque slot, dans `types.ts` et le schéma.
  `CONTRACT_VERSION` vaut 14.0, la fenêtre de lecture 13.0 à 14.0.
  `vueExacteDuVariant` rend `effects`, `[]` sans renvoi. `validerEffets140` et
  `validerOpacite140` refusent ces champs avant la 14.0, un effet hors du
  format, un usage qui ne joint ni un calque de sa vue ni un style, et un
  style qu'aucun usage ne cite. Deux aides, `ombre` et `opacite` ;
  `position-absolue` couvre les enfants d'un conteneur sans auto layout.
- Jeu figé 13.0 : les quatre contrats de UCM-Playground, pris par
  `git show 2f2f9b8:<chemin>`, en LF. Le jeu 12.0 passe hors de la fenêtre.
- `refus-enregistres.json` : les onze entrées existantes gardent leurs
  contrôles, leurs comptes et leur empreinte. Cinq entrées s'ajoutent : le jeu
  13.0 et `fabrique/14.0`.
- Paquets : `@ucm-kit/core` 0.1.41, `@ucm-kit/cli` 0.1.49,
  `@ucm-kit/adapter-typescript` 0.1.42, le noyau épinglé à l'exact dans les
  deux autres. Rien n'est publié : la section 4 du plan met la publication hors
  de son périmètre, et E10 la rappelle.
- Tests vus rouges avant le changement : quatorze, dont les onze du
  validateur, la fenêtre et les deux caractéristiques. Le test du contrat 14.0
  valide passait déjà : le validateur ignorait les champs inconnus.
- Commandes, worktree à `71fc6c9` avec les fichiers du lot : `npm test` : 0
  (kit 404 tests, CLI 170, adaptateur 23, plugin 931, racine 25).
  `npm run typecheck` : 0. Build étape par étape (kit, puis `build:code`,
  `build:ui` et `build:manifest` des deux plugins) : 0 à chaque étape ;
  `dist/code.js` porte `CONTRACT_VERSION = "14.0"`.
- Mutations, dans le worktree, chacune restaurée par copie puis revue verte :
  - `effects` retiré de la liste des clés d'une vue : « un variant qui recopie
    ses effets… » échoue ;
  - appel à `validerEffets140` retiré : six tests échouent ;
  - appel à `validerOpacite140` retiré : deux tests échouent ;
  - `effects` retiré de la résolution de `variant-views.mjs` : « la vue résout
    le renvoi effects… » échoue ;
  - `[]` traité comme un chemin ordinaire : huit tests échouent, dont celui du
    contrat 14.0 valide ;
  - `effects` retiré de `CATALOGUES_DE_VUES_11` : aucun test n'échouait. Deux
    tests s'ajoutent, un renvoi qui ne pointe nulle part et une entrée de
    `viewEffects` qu'aucune vue ne cite ; la mutation les fait échouer.
- Écarts à la liste des fichiers du lot :
  - `packages/plugin-exporter/src/contract/elideNeutrals.ts` protège
    `viewEffects.*`. La loi qui confronte `ENTREES_PROTEGEES` au schéma
    l'exigeait dès le schéma régénéré ; aucune autre ligne du moteur ne bouge.
  - `packages/cli/tests/check.test.mjs` et
    `packages/kit/tests/controleRepository.test.mjs` fabriquaient un contrat
    12.0, sorti de la fenêtre : ils fabriquent un contrat 14.0.
  - `ExpandedVariantView.effects` est facultatif : le moteur construit cette
    vue (`compactVariants.ts`), et un champ requis cassait sa compilation dans
    un lot qui ne le touche pas. E3 le remplit.
- Reportés à E3, qui écrit les effets : « cinq renvois » dans `FORMAT.md`,
  `AGENTS.md` et le glossaire de `POUR-LES-DESIGNERS.md`. Le plan ajoute ce
  dernier à E3. L'entrée 14.0 de `CHANGELOG-FORMAT.md` décrit la version que
  E2 à E4 terminent ; le plugin ne se publie pas avant E10.
- Écart ou réserve : aucun.

### E2 : l'opacité se publie

- Commit : ce commit, précédé de `fd17d3f`.
- Changement : `resolveOpacity` (`nodeBindings.ts`) publie `opacity` sur le
  node de layout, hors de `publishDimensions`, et sur chaque calque publié.
  `IMPLICIT_DEFAULTS.opacity` vaut 1. Une dépendance ne publie son opacité que
  si son instance diffère de son composant principal ; ramenée à 1 sous un
  principal atténué, elle réclame sa variable. Les messages 1 et 2 de H1
  passent par `TEXTES_SANS_VARIABLE`, que `signalerSansVariable` lit avant le
  texte commun du champ sans variable. `unsupportedProperties.ts` ne relève plus
  l'opacité.
- Tests vus rouges avant le changement : treize, dont les cinq de
  `resolveOpacity`, les cinq d'extraction, le regroupement des trois racines et
  les deux du scénario. Le test « une propriété dont le texte n'est pas validé
  garde une ligne par racine » passe au blend mode ; E6 le supprime.
- Scénario : `opaciteDuCalqueAbsolu` et `opaciteDeRacine` passent aux familles
  corrigées. `opaciteSansVariable` (une ligne, `Overlay`) et
  `opaciteDesVariants` (une ligne, la seule racine `Disabled`) s'ajoutent.
- Commandes, worktree à `fd17d3f` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 931 à 943 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape ; `dist/code.js` porte le texte retenu.
- Mutations, dans le worktree, chacune restaurée par copie puis revue verte :
  - `opacity` retiré de `IMPLICIT_DEFAULTS` : « un calque opaque sans
    variable… » échoue ;
  - branche `ecartAuPrincipal` neutralisée : les deux tests d'une instance
    ramenée à 1 échouent ;
  - `estUneRacineDeVariant` ignoré dans `signalerSansVariable` : cinq tests
    échouent, dont le regroupement de l'opacité et celui du gap ;
  - égalité au principal ignorée : « une dépendance de même opacité… »
    échoue ;
  - opacité du composant soumise à `publishDimensions` : « un composant doté
    d'un axe de tailles… » échoue.
- Documents : `FORMAT.md` gagne « Opacité » sous « 6. Structure » et retire
  l'opacité des propriétés non portables ; `AGENTS.md`, invariant des
  propriétés à effet visuel ; `SPEC.md`, portée du relevé et racine de variant ;
  `TEXTES-A-VALIDER.md`, textes retenus et « Reste à valider ».
- Écart ou réserve : aucun.

### Décisions après H1

- Rang des ombres : E3 suppose que Figma range ses effets comme ses fills, le
  dernier de la liste peint au-dessus, et la recette de E10 le vérifie sur un
  style à deux ombres de couleurs opposées.
- Messages 11 à 13 : le mainteneur garde la décision H2. Les avertissements
  d'absence d'auto layout restent, avec ses textes, dont l'action est
  conditionnelle.
- Le mainteneur demande de mener le plan jusqu'au bout, de pousser chaque lot
  et de publier les trois paquets par `publish.yml`.

### E3 : les effect styles se publient

- Commit : ce commit, précédé de `cf4262b`.
- Changement : `effectStyles.ts` charge chaque effect style une fois, lit ses
  liaisons sur `style.effects[i]`, traduit ombres et flous en vocabulaire CSS
  et rend les usages de chaque vue exacte. `extractLayout` collecte les calques
  publiés qui portent des effets, dans les seules vues exactes ; une dépendance
  n'est pas collectée. `compactVariants` catalogue `viewEffects`, le contrat
  publie `effectStyles`. `elideNeutrals.ts` protège `viewEffects.*.slotPath`,
  dont `[]` désigne la racine. `unsupportedProperties.ts` ne relève plus les
  effets. Les messages 3 à 8 de H1 sont écrits mot pour mot ; 5 et 6 gardent
  une ligne par calque sur les racines, faute de texte de groupe retenu.
- Ordre : `ordreCss` retourne la liste de Figma (hypothèse ci-dessus).
- Tests : écrits avant le module, mais lancés seulement après lui. Leur rouge
  n'a donc pas été vu avant le changement ; les mutations ci-dessous le
  constatent test par test. Le premier lancement a corrigé trois attendus
  faux (le slot `card`, l'ordre des avertissements, le chemin de token du
  scénario) et révélé l'élision de `slotPath: []`.
- Scénario : `getStyleByIdAsync` répond par identifiant, avec l'effect style
  « Shadow/Focus » pour `S:ombre`. La famille `effet` passe aux corrigées ;
  `couleurDOmbre` (une ligne) s'ajoute : la couleur de l'ombre n'a pas de
  variable. Le contrat publie `effectStyles.shadow.focus` et un usage `[]`.
- `lois.ts` : le renvoi `effects` se résout, chaque usage désigne un calque de
  sa vue et un style du catalogue.
- Commandes, worktree à `cf4262b` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 943 à 958 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape.
- Mutations, dans le worktree, chacune restaurée par copie puis revue verte :
  - liaisons lues sur le calque au lieu du style : « un réglage du style sans
    variable… » échoue, avec l'écart au style ;
  - ordre de Figma gardé : le test de l'ordre CSS échoue ;
  - écart au style ignoré, type `EFFECT` non vérifié, racine ignorée pour
    l'effet sans style, calque publié non collecté : chacun fait échouer son
    test ;
  - `viewEffects.*.slotPath` non protégé : neuf tests échouent, dont les lois
    du scénario.
- Documents : `FORMAT.md` gagne « Effets » après « 5. Typographie », six
  renvois dans « 6. Structure » et la composition avec `border` en « 8. Rendu
  sémantique » ; `AGENTS.md`, six renvois, `slotPath` d'effet et l'invariant
  des effets ; `SPEC.md`, « Effets » et la racine de variant ;
  `POUR-LES-DESIGNERS.md`, six renvois ; `TEXTES-A-VALIDER.md`, textes 3 à 8.
- Écart ou réserve : aucun.

### E4 : les enfants d'un cadre libre sont placés

- Commit : ce commit, précédé de `b12a66b`.
- Changement : `estPlaceParSesContraintes` (`flexLayout.ts`) place par ses
  contraintes un enfant absolu ou un enfant de cadre, de composant ou
  d'instance sans auto layout ; `flexItemProperties` l'emploie. Un enfant de
  groupe n'est pas placé. `menuDeDimensionnement` ne change pas.
  `warnUntokenizedFreeSize` (`extractLayout.ts`) avertit d'un axe figé sans
  variable d'un composant sans auto layout (messages 9 et 10). R17, « il range
  N layers » et « il enveloppe » prennent l'impact 11 quand les layers sont
  placés ; R17 et R10 ont leurs textes de groupe (messages 12 et 13).
- Tests vus rouges avant le changement : quatre (le placement sous un cadre
  libre, la hauteur sans variable, les deux regroupements de racines). Trois
  tests ajoutés passaient déjà et fixent ce qui ne change pas : un enfant en
  `STRETCH` réclame sa variable, un groupe ne place rien, deux dimensions
  liées ne disent rien.
- Trois attendus existants changent avec le comportement : deux cadres de test
  sans auto layout placent désormais leurs enfants en `position: "absolute"`
  (`extractLayout.test.ts`, `composedComponents.test.ts`), et un conteneur de
  textes n'écrit plus « disposition » dans son impact. Aucune assertion n'est
  retirée.
- Scénario : `cadreSansAutoLayout` exige le nouvel impact et compte une ligne ;
  `dimensionSousContrainte` garde ses quatre lignes ; `Mask` et `Circle` sont
  placés.
- Commandes, worktree à `b12a66b` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 958 à 966 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape.
- Mutations, dans le worktree, chacune restaurée par copie puis revue verte :
  - cadre libre non reconnu (`placeSesEnfantsParContraintes` rend `false`) :
    sept tests échouent, dont les enfants qui perdent `position: "absolute"` ;
  - `warnUntokenizedFreeSize` retiré : les deux tests de la hauteur échouent ;
  - R17 et R10 sans texte de groupe : le regroupement des racines échoue.
- Documents : `FORMAT.md`, « Position absolue », le node sans disposition,
  l'exception de « Dimensions et bornes » et la première puce des propriétés
  non portables ; `AGENTS.md`, calque hors du flux et taille de maquette ;
  `SPEC.md`, « 3. Layout » ; `TEXTES-A-VALIDER.md`, messages 9 à 13.
- Écart ou réserve : aucun.

### E6 : les propriétés sans champ se regroupent sur les racines

- Commit : ce commit, précédé de `7abe51e`.
- Changement : `pourLesVariants` remplace `impactDesVariants` dans le relevé de
  `unsupportedProperties.ts` et porte le point entier retenu à H1 (messages 14
  à 17) : fill et stroke non unis, blend mode, mask, pointillé. Un réglage
  « mixed » et un réglage de texte gardent une ligne par calque.
- Tests : dans `messagesDeRacine.test.ts`, pour chaque propriété, trois racines
  donnent une ligne à trois cibles, et un composant seul garde son nom de
  calque. Cinq rouges avant le changement, un par propriété ; les cinq tests du
  composant seul passaient déjà. Le test qui gardait une ligne par racine pour
  un texte non validé est supprimé, comme le plan le prévoit : plus aucune
  propriété du relevé n'est sans texte de groupe, hors « mixed » et texte.
- Scénario : aucune racine n'y porte ces propriétés, rien ne change.
- Commandes, worktree à `7abe51e` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 966 à 975 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape.
- Mutation : `racineDeVariant` ignoré au site : les cinq regroupements échouent.
  Restauré par copie : vert.
- Documents : `SPEC.md`, racine de variant ; `TEXTES-A-VALIDER.md`.
- Écart ou réserve : aucun.

### E7 : les refus d'un champ se regroupent sur les racines

- Commit : ce commit, précédé de `60b44e4`.
- Changement : dans `resolveGroup` (`nodeBindings.ts`), le vertical gap
  « Auto », des côtés reliés à des variables différentes, deux réglages qui se
  contredisent et des côtés sans variable d'un groupe latéral prennent les
  textes 18 à 21 sur les racines. Un rayon dit « coins », une variable
  introuvable a sa phrase. Des côtés sans variable d'un groupe qui ne publie
  aucun côté gardent une ligne par racine : le texte retenu dit que les côtés
  reliés sont transmis, ce qui y serait faux.
- Adaptations : pour un autre champ que le stroke weight, l'impact de R12 et de
  R13 écrit « le <champ> », et l'action de R12 « les côtés » ou « les coins ».
  Les apostrophes suivent celles de `nodeBindings.ts`, droites.
- Tests vus rouges avant le changement : cinq, un par message et le cas des
  coins.
- Commandes, worktree à `60b44e4` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 975 à 980 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape.
- Mutations : chaque test de racine rendu `false` à son site (vertical gap,
  côtés différents, réglages contradictoires, côtés sans variable) fait échouer
  son test. Restauré par copie : vert.
- Documents : `SPEC.md`, racine de variant ; `TEXTES-A-VALIDER.md`.
- Écart ou réserve : aucun.

### E8 : la disposition illisible se regroupe sur les racines

- Commit : ce commit, précédé de `f4214bc`.
- Changement : dans `flexLayout.ts`, l'alignement d'auto layout illisible et la
  piste de grille illisible d'une racine prennent les textes 22 et 23.
  L'alignement illisible et le `layout grow` hors menu d'un enfant de racine
  prennent les textes 24 et 25 : ils gardent le nom de l'enfant et perdent
  celui de la racine, si bien que les enfants de tous les variants partagent
  une phrase. Une ligne de grille dit « ligne 2 » et « cette ligne ».
- Tests vus rouges avant le changement : quatre. Un enfant sous un composant
  seul garde le nom de son parent ; ce test passait déjà.
- Commandes, worktree à `f4214bc` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 980 à 985 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape.
- Mutations : chaque test de racine rendu `false` à son site (piste, alignement
  du conteneur, alignement d'un enfant, `layout grow`) fait échouer son test.
  Restauré par copie : vert.
- Documents : `SPEC.md`, racine de variant ; `TEXTES-A-VALIDER.md`.
- Écart ou réserve : aucun.

### E9 : les couleurs se regroupent sur les racines

- Commit : ce commit, précédé de `b987ea8`.
- Changement : dans `extractSlotTokens.ts`, une couleur sans variable, un
  alignement de stroke illisible et deux fills superposés prennent les textes
  26 à 28 sur les racines. La couleur sans variable ne compte pas ses
  peintures : leur nombre change d'un variant à l'autre, et la fusion se fait
  sur le texte. Le stroke reprend le texte du fill.
- Galerie : l'état `resultat-avertissement-regroupe` montre quatre cartes. Le
  texte de l'ombre suit celui d'E3, et une carte de fill sans variable
  s'ajoute ; `regarder` le dit. `npm run galerie` : 0, la carte est rendue
  dans les trois thèmes.
- Tests vus rouges avant le changement : quatre (fill, stroke, alignement du
  stroke, deux fills).
- Commandes, worktree à `b987ea8` avec les fichiers du lot : `npm test` : 0,
  suite du plugin de 985 à 989 tests. `npm run typecheck` : 0. Build étape par
  étape : 0 à chaque étape.
- Mutations : chaque test de racine rendu `false` à son site fait échouer son
  test. Restauré par copie : vert.
- Documents : `SPEC.md`, racine de variant ; `TEXTES-A-VALIDER.md`, textes 26 à
  28, et « Reste à valider » ne cite plus que R25 à R27 et les côtés sans
  variable d'un groupe qui ne publie rien, chacun avec sa raison.
- Écart ou réserve : aucun.

### E10 : fermeture

- Commit : ce commit, précédé de `fb45cb7`, commit d'une autre session qui ne touche que UCM Palettes.
- Vérification, worktree neuf à `5dbfa58` : `npm ci` : 0. `npm test` : 0 (kit
  406 tests, CLI 170, adaptateur 23, plugin 989, Palettes 194, socle 190,
  racine 25). `npm run typecheck` : 0. Build étape par étape : 0 à chaque
  étape. Worktree supprimé par Node.
- Copie partagée : kit reconstruit, puis `npm run build:code` : 0 ;
  `dist/code.js` porte `CONTRACT_VERSION = "14.0"`, `extractEffectStyles` et
  `ordreCss`.
- Contrôle du kit : `verifierLeLecteur` (`lois.ts`) passe déjà chaque contrat
  fabriqué au lecteur du kit ; la fenêtre et les refus enregistrés gardent les
  verdicts des jeux 13.0 et 12.0.
- Publication, à la demande du mainteneur : `@ucm-kit/core` 0.1.41 (run
  36123750968), `@ucm-kit/cli` 0.1.49 (run 36124031861), puis
  `@ucm-kit/adapter-typescript` 0.1.42 (run 36124390130). Les deux premiers
  runs finissent rouges sur l'étape des pins, comme toute exécution
  intermédiaire ; le troisième est vert. `npm view` sert les trois numéros.
- Liste attendue sur le composant réel, au réexport :
  - l'ombre des racines, si elle vient d'un effect style, se publie dans
    `effectStyles` ; un champ du style sans variable, sa couleur par exemple,
    avertit une fois au nom du style ; une ombre sans style donne une ligne
    pour toutes les racines ;
  - l'opacité du calque d'onde avertit une fois si elle reste sans variable,
    au texte retenu ; l'opacité de la racine atténuée donne une ligne pour les
    variants ;
  - le masque avertit toujours ;
  - les rectangles du calque sans auto layout sont placés en
    `position: "absolute"`, et le calque garde « il range 2 layers », avec
    l'impact nouveau ;
  - leurs dimensions et leur rayon sans variable avertissent toujours : H2
    garde la règle du menu, et aucun lot ne touche au rayon.
- Recette demandée au mainteneur : relancer l'analyse du composant réel et
  comparer à cette liste ; exporter un style à deux ombres de couleurs
  opposées, et comparer leur ordre dans le rendu à celui de Figma.
- Écart ou réserve : la recette du mainteneur reste à consigner.

### Porte H : réponses reçues

Mesures du mainteneur (H0) :

- M4 : un flou de calque de 8 donne `blur(4px)` dans Dev Mode. `blur()` reçoit
  la moitié du rayon Figma.
- M5 : sur un cadre sans fill qui contient un cercle, l'ombre suit le cercle.
  L'aide `ombre` écrit donc `filter: drop-shadow()` pour ce cas, pas
  `box-shadow`. Sur un texte, l'ombre suit les lettres : `text-shadow`.
- M3 : de deux ombres posées sur un calque, celle ajoutée en dernier peint
  au-dessus. Son rang dans `effects` reste à lire par l'API.
- M1 : le panneau lit l'opacité de 0 à 100 %, et une variable de valeur 0,5
  donne 0,5 %. Le token d'opacité s'exprime donc de 0 à 100, et l'aide
  `opacite` dit de diviser sa valeur par 100.
- M2 : après la modification d'un effet dans le panneau, le calque garde son
  effect style, marqué modifié. E3 écrit donc l'écart de 9.1.3.
- Le fichier de test désigné par le mainteneur n'a pas été lu : le MCP Figma
  n'était pas connecté.

Décisions (H2) :

- Forme 14.0 de la section 4 : acceptée.
- Échelle de `opacity` : l'aide `opacite` dit de diviser par 100 si M1 lit
  une échelle de 0 à 100.
- Un axe figé sans token d'un composant sans auto layout avertit : accepté.
- Opacité d'une dépendance : publiée quand elle diffère de celle de son
  composant principal.
- Une contrainte `STRETCH` ou `SCALE` ne dispense pas un axe figé de sa
  variable, pour le moment. E4 place les enfants d'un cadre libre sans
  changer `menuDeDimensionnement` ; les dimensions de `Mask` et `Circle`
  avertissent toujours.
- Les avertissements d'absence d'auto layout restent tous, le repli
  `flex-row` compris, même quand tous les enfants sont placés. Leur impact
  change en E4 (texte 9.1.7 du plan, à retenir à H1).
- Le MCP Figma n'a pas pu se connecter : le rang des ombres dans `effects`
  attend un agent qui en dispose.

M3, précisée par le mainteneur : une ombre ajoutée en dernier s'affiche
par-dessus les autres. Son rang dans la liste `effects` de l'API n'est pas lu.

### Porte H1 : textes retenus

Le mainteneur a réécrit les vingt-huit messages présentés. Ses textes sont
recopiés mot pour mot ; le numéro renvoie à la présentation, la section au
plan. Un lot reprend son texte dans `TEXTES-A-VALIDER.md` quand il l'écrit.

1. Opacité sans variable, sur un layer (9.1.1, E2)
   - Titre : Layer « Overlay », opacity : aucune variable associée.
   - Impact : Le contrat ne transmettra pas l’opacité de ce layer.
   - Action : Reliez opacity à une variable, puis réexportez.
2. Opacité sans variable, sur plusieurs variants (9.1.1, E2)
   - Titre : opacity : aucune variable associée.
   - Impact : Le contrat ne transmettra pas l’opacité des variants concernés.
   - Action : Reliez opacity à une variable dans chaque variant concerné,
     puis réexportez.
3. Effet sans style, sur un layer (9.1.2, E3)
   - Titre : Layer « Card », effect : aucun effect style appliqué.
   - Impact : Le contrat ne transmettra pas l’ombre ou le flou de ce layer.
   - Action : Appliquez à ce layer un effect style qui correspond au rendu
     souhaité, puis réexportez.
4. Effet sans style, sur plusieurs variants (9.1.2, E3)
   - Titre : effect : aucun effect style appliqué.
   - Impact : Le contrat ne transmettra pas les ombres ou les flous des
     variants concernés.
   - Action : Appliquez un effect style à chaque variant concerné, puis
     réexportez.
5. Style d’effet introuvable (9.1.3, E3)
   - Titre : Layer « Card » : l’effect style appliqué est introuvable.
   - Impact : Le contrat ne transmettra pas l’ombre ou le flou de ce layer.
   - Action : Appliquez de nouveau un effect style accessible dans Figma, puis
     réexportez.
6. Effets modifiés après application du style (9.1.3, E3)
   - Titre : Layer « Card » : ses effects diffèrent du style « Shadow/Focus ».
   - Impact : Le contrat transmettra les réglages du style, sans les
     modifications propres à ce layer.
   - Action : Réappliquez le style pour retrouver ses réglages, ou créez et
     appliquez un style correspondant au rendu souhaité, puis réexportez.
7. Réglage d’un style d’effet sans variable (9.1.4, E3)
   - Titre : Effect style « Shadow/Focus », y : aucune variable associée.
   - Impact : Le contrat ne transmettra pas le décalage vertical de cette
     ombre.
   - Action : Dans l’effect style, reliez y à une variable, puis réexportez.
8. Effet non pris en charge (9.1.5, E3)
   - Titre : Effect style « Glass/Frost » : l’effet Glass n’est pas pris en
     charge.
   - Impact : Le contrat transmettra ce style sans l’effet Glass.
   - Action : Si cet effet est nécessaire, signalez cette limite au mainteneur
     du plugin. Sinon, retirez-le du style, puis réexportez.
   - Note : cette formulation évite de demander une réexportation juste après
     un signalement, qui ne corrige rien à lui seul.
9. Hauteur sans variable, hors auto layout (9.1.6, E4)
   - Titre : Layer « Badge », height : aucune variable associée.
   - Impact : Le contrat ne transmettra pas la hauteur de ce layer sans auto
     layout.
   - Action : Reliez height à une variable, ou configurez un auto layout
     adapté au contenu, puis réexportez.
10. Même cas sur plusieurs variants (9.1.6, E4)
    - Titre : height : aucune variable associée sur des variants sans auto
      layout.
    - Impact : Le contrat ne transmettra pas la hauteur des variants
      concernés.
    - Action : Reliez height à une variable dans chaque variant concerné, ou
      configurez leur taille avec un auto layout, puis réexportez.
    - Note : ici, « hauteur » est plus exact que « taille » : une largeur peut
      être disponible.
11. Nouvel impact pour l’absence d’auto layout (9.1.7, E4)
    - Impact : Les layers ne se déplaceront pas automatiquement pour laisser
      de la place à un texte plus long ou à un layer voisin plus grand.
12. Absence d’auto layout sur plusieurs variants (9.1.7, R17, E4)
    - Titre : Variants sans auto layout.
    - Impact : Leurs layers ne se déplaceront pas automatiquement lorsque le
      contenu d’un layer voisin grandit.
    - Action : Si la disposition doit s’adapter au contenu, configurez un auto
      layout dans chaque variant concerné, puis réexportez.
13. Gap et padding sans auto layout (9.1.7, R10, E4)
    - Titre : gap et padding : aucun auto layout configuré.
    - Impact : Le contrat ne transmettra aucune valeur de gap ou de padding
      pour ces variants.
    - Action : Pour transmettre ces espacements, configurez un auto layout et
      reliez les valeurs de gap et de padding à des variables, puis
      réexportez.
14. Fill en dégradé ou en image (9.2.1, R3 et R4, E6)
    - Titre : fill : dégradé ou image non pris en charge.
    - Impact : Le contrat ne transmettra pas les fills en dégradé ou en image.
    - Action : Si ce rendu est nécessaire, signalez cette limite au mainteneur
      du plugin. Sinon, remplacez les fills concernés par des couleurs unies
      reliées à des variables, puis réexportez.
    - Note : même rédaction pour stroke.
15. Blend mode (9.2.2, R5, E6)
    - Titre : blend mode : ce mode de fusion n’est pas pris en charge.
    - Impact : Le contrat ne transmettra pas le mode de fusion des variants
      concernés.
    - Action : Si ce mode de fusion est nécessaire, signalez cette limite au
      mainteneur du plugin. Sinon, choisissez « Normal » dans chaque variant
      concerné, puis réexportez.
16. Mask (9.2.3, R6, E6)
    - Titre : mask : le masquage n’est pas pris en charge.
    - Impact : Le contrat ne transmettra pas le découpage produit par ces
      masks.
    - Action : Si ce découpage est nécessaire, signalez cette limite au
      mainteneur du plugin. Sinon, désactivez les masks concernés, puis
      réexportez.
17. Stroke en pointillé (9.2.4, R7, E6)
    - Titre : stroke : le pointillé n’est pas pris en charge.
    - Impact : Le contrat ne transmettra pas le motif de pointillé de ces
      strokes.
    - Action : Si le pointillé est nécessaire, signalez cette limite au
      mainteneur du plugin. Sinon, choisissez un trait plein dans chaque
      variant concerné, puis réexportez.
18. Vertical gap automatique (9.2.5, R11, E7)
    - Titre : vertical gap : la valeur « Auto » n’est pas exportée.
    - Impact : Le contrat ne transmettra pas la répartition automatique de
      l’espace entre les lignes.
    - Action : Pour transmettre un espacement fixe, reliez vertical gap à une
      variable dans chaque variant concerné, puis réexportez.
19. Stroke weight associé à des variables différentes (9.2.6, R12, E7)
    - Titre : stroke weight : les côtés utilisent des variables différentes.
    - Impact : Le contrat ne transmettra pas l’épaisseur du stroke des
      variants concernés.
    - Action : Dans chaque variant concerné, reliez les épaisseurs des côtés à
      une même variable, puis réexportez.
    - Note : une seule carte, sans la liste des paires de tokens dans le texte
      principal.
20. Réglages contradictoires (9.2.7, R13, E7)
    - Titre : corner radius : plusieurs variables définissent la même valeur.
    - Impact : Le contrat ne transmettra pas le corner radius des variants
      concernés.
    - Action : Dans chaque variant concerné, retirez les liaisons
      contradictoires pour ne conserver qu’une variable pour cette valeur,
      puis réexportez.
21. Côtés sans variable (9.2.8, R14, E7)
    - Titre : horizontal padding : certains côtés n’ont pas de variable
      associée.
    - Impact : Le contrat transmettra uniquement les valeurs des côtés reliés
      à une variable.
    - Action : Reliez les côtés manquants à des variables dans chaque variant
      concerné, puis réexportez.
    - Note : pour corner radius, « côtés » devient « coins ». Une variable
      introuvable se distingue d’une variable absente : « certains côtés
      utilisent une variable introuvable ».
22. Alignement d’auto layout illisible (9.2.9, R18, E8)
    - Titre : auto layout : l’alignement ne peut pas être lu.
    - Impact : Le contrat ne transmettra pas l’alignement des layers dans les
      variants concernés.
    - Action : Définissez de nouveau l’alignement sur les deux axes dans
      chaque variant concerné, puis réexportez.
23. Taille de colonne illisible (9.2.10, R19, E8)
    - Titre : Grille, colonne 2 : la taille ne peut pas être lue.
    - Impact : Le contrat indiquera une taille automatique pour cette colonne.
    - Action : Définissez de nouveau la taille de la colonne 2 dans chaque
      variant concerné, puis réexportez.
    - Note : le remplacement par une taille automatique est une information
      utile à conserver.
24. Alignement d’un layer enfant illisible (9.2.11, R20, E8)
    - Titre : Layer « Label » : son alignement dans l’auto layout ne peut pas
      être lu.
    - Impact : Le contrat ne précisera pas comment aligner ce layer dans les
      variants concernés.
    - Action : Définissez de nouveau son alignement dans l’auto layout de
      chaque variant concerné, puis réexportez.
25. Valeur inhabituelle de layout grow (9.2.11, R21, E8)
    - Titre : Layer « Label » : son réglage d’étirement n’est pas pris en
      charge.
    - Impact : Le contrat ne précisera pas si ce layer doit occuper l’espace
      disponible.
    - Action : Choisissez Fill ou Fixed pour sa largeur dans un auto layout
      horizontal, ou pour sa hauteur dans un auto layout vertical, puis
      réexportez.
    - Note : layout grow et la valeur 2 peuvent rester dans les détails
      techniques ; ils n’aident pas le designer à trouver le réglage.
26. Fill sans variable (9.2.12, R22, E9)
    - Titre : fill : couleur sans variable associée.
    - Impact : Le contrat ne transmettra pas les couleurs sans variable
      associée.
    - Action : Reliez chaque couleur concernée à une variable dans les
      variants sélectionnés, puis réexportez.
    - Note : même rédaction pour stroke.
27. Alignement du stroke illisible (9.2.13, R23, E9)
    - Titre : stroke : l’alignement ne peut pas être lu.
    - Impact : Le contrat ne précisera pas si le stroke est placé en inside,
      center ou outside.
    - Action : Choisissez de nouveau inside, center ou outside dans chaque
      variant concerné, puis réexportez.
28. Deux fills superposés (9.2.14, R24, E9)
    - Titre : fill : l’ordre des deux couleurs superposées n’est pas exporté.
    - Impact : Le développeur recevra les deux couleurs sans indication de
      leur ordre de superposition.
    - Action : Si la superposition est nécessaire, signalez cette limite au
      mainteneur du plugin. Sinon, ne conservez qu’un fill relié à une
      variable dans chaque variant concerné, puis réexportez.

Le bouton des cartes regroupées reste « Sélectionner les N calques ».

Remarque du mainteneur sur 11 à 13 : ces messages doivent demander une
adaptation réelle ; si la disposition sans auto layout est voulue et
entièrement exportée, les règles du projet prévoient de ne pas afficher
d’avertissement. Elle contredit la décision H2 qui garde ces avertissements
quand tous les enfants sont placés : E4 attend que le mainteneur tranche.
