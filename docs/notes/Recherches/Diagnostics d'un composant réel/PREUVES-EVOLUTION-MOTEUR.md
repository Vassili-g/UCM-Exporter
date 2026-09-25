# Preuves de l'évolution du moteur

## État

- Lot courant : porte H1, puis E2
- Branche et `HEAD` de départ : `main`, `92e7cff` ; E1 part de `71fc6c9`
- Portes franchies : H0 (reste le rang des ombres dans `effects`) et H2

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

Textes (H1) : non commencés.
