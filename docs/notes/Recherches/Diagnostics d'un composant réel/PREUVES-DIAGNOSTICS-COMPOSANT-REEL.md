# Preuves des diagnostics d'un composant réel

## État

- Lot courant : L7
- Branche et `HEAD` : `main`, `d0bc9c4`
- Dernière porte franchie : H2

La copie de travail partagée porte le travail non commité d'une autre session
(`packages/couleur`, `packages/plugin-palettes`, `packages/plugin-socle`,
`docs/notes/Recherches`). Aucun de ces fichiers n'est visé par le plan. Chaque
lot se vérifie donc dans un worktree isolé, extrait par
`git -c core.autocrlf=false worktree add --detach`, où les fichiers du lot sont
copiés ; le build y tourne étape par étape.

## Lots

### L0 : référence

- Commit : ce commit, précédé de `4bb233f`.
- Commandes :
  - copie partagée, `npm test` : sortie 1. Quatre tests de `plugin-palettes`
    échouent (PLA-08, PLA-15, PLA-17, PLA-23), sur des fichiers que l'autre
    session modifie.
  - worktree à `9805abb`, `npm test` : sortie 1. `docLinks.test.ts` refuse
    46 liens du plan, qui portaient une ancre `#L…` sur un fichier de code.
    Tous les autres paquets : 0 échec. `npm run typecheck` : 0. Build étape par
    étape, kit et deux plugins : 0 à chaque étape.
  - `4bb233f` retire ces ancres ; le numéro de ligne reste dans le texte de
    chaque lien.
  - worktree à `4bb233f` avec les fichiers du lot, `npm test` : 0.
    `npm run typecheck` : 0. Build étape par étape : 0 à chaque étape.
- Résultats : `exportComponent.test.ts` reste à 32 tests verts après le
  déplacement des aides, sans attendu modifié. Le scénario
  `diagnosticsComposantReel.test.ts` passe les lois, la loi de localisation et
  la loi des parties. Lignes par famille sur le scénario (trois variants
  `Default`, `Focused`, `Pressed`) :

  | Famille | Lignes |
  |---|---|
  | `min width` sans variable (E1) | 3 |
  | `effect` sans champ (E1, E3) | 2 |
  | calque absolu et ses enfants (E5) | 11 |
  | dessin dans un composant imbriqué sans règles (E4) | 1 |
  | `height` du texte masqué (E8) | 1 |
  | états `focused` et `pressed` non reconnus (E2) | 2 |
  | aucune règle d'intention (E7) | 1 |
  | règle `@icons « icon-name »` (E6) | 1 |

  Les deux icônes du wrapper portent chacune une instance nommée `Shape` : leurs
  messages de dessin se fusionnent en une ligne. La suite du moteur passe de
  890 à 894 tests : le scénario, et les trois lois que ses aides importent.
- Mutations : dans le worktree, `if (effets.length > 0)` devient
  `if (false && …)` dans `unsupportedProperties.ts` : le scénario sort rouge,
  « la famille « effet » ne sort pas ». Restauré par copie : vert.
- Écart ou réserve : la référence était rouge à `9805abb` par le plan lui-même.
  La cause est identifiée et corrigée par `4bb233f` sans changer le sens du
  plan ; le travail a repris sans passer par le mainteneur.

### L1 : une règle d'intention marquée ne produit que sa ligne

- Commit : ce commit, après `800e5b4`.
- Commandes :
  - tests écrits d'abord, lancés dans le worktree contre le moteur de
    `800e5b4` : quatre rouges, pour la raison attendue. Le scénario : « la
    famille « intentionAbsente » sort encore ». L'export d'un `@usage` marqué :
    deux lignes au lieu d'une. `tagsARediger` : absent.
  - copie partagée, `rules`, `exportComponent`, `diagnosticsComposantReel`,
    `template` et `code` : 196 verts, 0 échec. `tsc --noEmit` : 0.
  - worktree avec les fichiers du lot, `npm test` : 0, dont 897 tests du
    moteur. `npm run typecheck` : 0. Build étape par étape : 0 à chaque étape.
- Résultats : `extractRules` expose `tagsARediger`. L'export ne pousse
  « aucune règle @usage, @do, @dont ou @pairs » que si aucun tag de
  `TAGS_D_INTENTION` n'a de règle marquée. Un conteneur dont la seule règle est
  un `@prop` marqué garde ce message. Sur le scénario, la famille « intention
  absente » passe de 1 à 0 ligne.
- Mutations : dans le worktree, la condition redevient `if (!intent)` : le
  scénario et « une règle d'intention marquée ne produit que la ligne de son
  marqueur » sortent rouges. Restauré par copie : vert.
- Écart ou réserve : aucun.

### L2 : les formes en `-ed` des états

- Commit : ce commit, après `d295200`.
- Commandes :
  - tests écrits d'abord : dans la copie partagée, « buildStateModel reconnaît
    les formes en -ed » sort rouge contre le moteur de `d295200` ; dans le
    worktree, le scénario sort rouge, « la famille « etatNonReconnu » sort
    encore ». Le test sur `active` passe avant et après : il garde une
    décision.
  - worktree avec les fichiers du lot, `npm test` : 0, dont 899 tests du
    moteur. `npm run typecheck` : 0. Build étape par étape : 0 à chaque étape.
- Résultats : `hovered`, `focused` et `pressed` prennent le sélecteur de leur
  forme courte et son rang dans `STATE_PRECEDENCE`. Un axe
  `default | hovered | focused | pressed | disabled` publie `precedence` dans
  l'ordre `disabled`, `pressed`, `focused`, `hovered`, `default`, sans message.
  `active` reste inconnu. Le texte de l'action ne change pas. `FORMAT.md`,
  « 4. Modèle d'interaction », énumère les graphies et dit pourquoi `active`
  n'en est pas. Sur le scénario, la famille des états passe de 2 à 0 ligne.
- Mutations : dans le worktree, la ligne `focused` retirée de la table : le
  test des formes en `-ed` et le scénario sortent rouges. Restauré par copie :
  vert.
- Écart ou réserve : aucun.

### L3 : un calque en `Fill` masqué ne réclame pas de variable

- Commit : ce commit, après `5b4ce4f`.
- Commandes :
  - lectures du menu relevées : `fixedDimensions` (appelée par
    `resolveSlotSize`, `gridStructuralSize`, `extractIconLayers` et
    `resolveContainerSizing`), `childSizing`, et `containerSizing`, qui ne lit
    que la racine. Aucune autre lecture de `layoutSizing…` dans `src/`.
  - tests écrits d'abord : dans la copie partagée, les deux cas visés de
    `nodeBindings.test.ts` et le test de `extractLayout.test.ts` sortent
    rouges contre le moteur de `5b4ce4f` ; le test des gardes (absolu, grille,
    racine) passe avant et après. Dans le worktree, le scénario sort rouge,
    « la famille « hauteurDuTexteMasque » sort encore ».
  - worktree avec les fichiers du lot, `npm test` : 0, dont 903 tests du
    moteur. `npm run typecheck` : 0. Build étape par étape : 0 à chaque étape.
- Résultats : `menuDeDimensionnement(node, parent)` est la seule lecture du menu
  d'un enfant ; `fixedDimensions` et `childSizing` la consultent. Sous un auto
  layout linéaire, `FIXED` avec `layoutAlign: STRETCH` sur l'axe secondaire, ou
  avec `layoutGrow: 1` sur l'axe principal, se lit `FILL`. La racine (appel sans
  parent), un enfant absolu et un enfant de grille lisent le menu seul.
  `extractIconLayers` passe désormais le parent du calque. Le cas `HUG` avec
  `STRETCH` reste tenu par « un dimensionnement HUG sur l'axe secondaire prime
  sur un layoutAlign STRETCH contradictoire » (`extractLayout.test.ts`), inchangé.
  L'invariant d'`AGENTS.md` sur le menu de dimensionnement reçoit l'exception,
  et `FORMAT.md`, « Flux et alignement », la décrit. Sur le scénario, la
  famille du texte masqué passe de 1 à 0 ligne.
- Mutations : dans le worktree, la ligne qui lit `layoutAlign: STRETCH` retirée
  de `menuDeDimensionnement` : le scénario, le test d'`extractLayout` et celui
  de `resolveSlotSize` sortent rouges, message `height` compris. Restauré par
  copie : vert.
- Écart ou réserve : aucun. Le cas `layoutGrow: 1` n'a pas été mesuré dans
  Figma ; comme le plan le prévoit, le commentaire de `menuDeDimensionnement`
  et le test le disent.

### L4 : la règle `@icons` créée porte le marqueur

- Commit : ce commit, après `97e3ef1`.
- Commandes :
  - aucun test n'exécutait `ecriture.ts`. Le test écrit d'abord monte un faux
    maître instanciable et appelle `creerLesRegles` sur une section `@icons`.
    Contre le moteur de `97e3ef1`, dans la copie partagée puis dans le
    worktree : rouge, le calque `icon` vaut `icon-name` au lieu de
    `[À compléter] icon-name`. Le cas du maître courant passe avant et après.
  - copie partagée, `template.test.ts` et `loiDuDocumentIntact.test.ts` : 0
    échec. `tsc --noEmit` : 0.
  - worktree avec les fichiers du lot, `npm test` : 0, dont 905 tests du
    moteur. `npm run typecheck` : 0. Build étape par étape : 0 à chaque étape.
- Résultats : `poserUnElement` appelle `marquerLeCalqueIcon` pour une règle
  `@icons`. Quand le calque `icon` du maître ne porte pas le marqueur, il est
  réécrit précédé du marqueur, par `ecrireDans`, qui relit. Relue par
  `extractRules`, la règle créée compte dans `aRediger` et ne produit que la
  ligne « une règle @icons contient encore « [À compléter] » ». Avec le maître
  courant, le texte reste celui du maître. `AIDES_LUES` ne change pas ; son
  commentaire, le test « le calque icon de @icons n'est pas vérifié » et
  `SPEC.md`, « La création des règles d'usage », disent que la création pose
  le marqueur. La règle `@icons` du scénario, posée avec un maître ancien avant
  ce lot, garde sa ligne, comme le plan l'annonce.
- Mutations : dans le worktree, l'appel à `marquerLeCalqueIcon` retiré : le
  test du maître ancien sort rouge sur le texte du calque. Ses deux premières
  assertions retirées à leur tour, `aRediger` vaut 0 et la relecture produit
  « Règle @icons « icon-name » : ni le layer « modifiable » ni le layer
  « strict » n'est visible seul. » Restauré par copie : vert.
- Écart ou réserve : aucun.

### Porte H1 : textes du designer

- [TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md) propose, pour L6, le genre du
  sujet et deux ou trois rédactions de la borne sans variable, de la propriété
  sans champ et du champ sans variable ; pour L9, les rédactions du refus de
  collision, entre deux fichiers et dans un même fichier.
- Aucun test ne vérifie aujourd'hui le texte du refus de collision
  (`refusDeCollision`, `src/depot.ts`) : L9 devra en écrire un.
- Le mainteneur a réécrit les rédactions. Trois arbitrages ont précédé le code :
  le moteur n'a que trois parties, donc l'intitulé est le titre et la phrase qui
  le suit ouvre l'impact ; aucun titre de L6 ne nomme un calque, et
  `CONTRIBUTING.md` et `AGENTS.md` reçoivent l'exception ; le gras `**` est rendu
  par le plugin, et la demande de fusion le lit en Markdown. Les textes retenus
  sont dans la section « Textes retenus » de `TEXTES-A-VALIDER.md`.
- Dernière porte franchie : H1.

### L6 : un message sur la racine se regroupe sur les variants

- Commit : `ff5e690`, après `51a1766`.
- Commandes :
  - sites recensés pour une racine de variant du set exporté : `resolveSizeBounds`
    (borne), `resolveGroup` branche « aucune liaison » (champ sans variable, sur
    `gap`, `padding`, `radius`) et `unsupportedPropertyWarnings` (propriété sans
    champ). Les deux extractions de `extractLayout` les atteignent : la vue exacte
    passe la racine comme node de layout, la projection de référence la passe
    comme composant.
  - tests écrits d'abord, `messagesDeRacine.test.ts` : neuf rouges sur dix,
    `declarerLesRacinesDeVariants is not a function` ; le dixième, « sans
    déclaration, chaque racine garde son message », garde le comportement actuel.
  - `npx tsx --test` sur `messagesDeRacine` et `diagnosticsComposantReel` : 0
    échec. `tsc --noEmit` : 0. `node scripts/run-tests.cjs` dans
    `packages/plugin-exporter` : 916 tests, 0 échec. `npm run test:ui` : 24
    tests, 0 échec, dont celui du gras.
- Résultats : `extractStructure` déclare les racines de la matrice à
  `declarerLesRacinesDeVariants` quand le set a plus d'un variant ; les trois
  sites consultent `estUneRacineDeVariant` sur leur canal et écrivent par
  `pousserPourLesVariants`. L'appartenance à la matrice décide, pas le parent :
  les représentants de tailles d'un wrapper ne sont pas déclarés, et
  `extractSizes.test.ts` reste vert sans changement. Sur le scénario, la famille
  de la borne passe de 3 lignes à 1 ligne à 3 cibles, celle de l'ombre de 2
  lignes à 1 ligne à 2 cibles. Seul `effect` reçoit un texte de groupe : les
  autres propriétés sans champ gardent une ligne par racine, tant que le
  mainteneur n'a pas validé leur texte (liste dans `TEXTES-A-VALIDER.md`).
  `CompteRendu.ts` rend `**` en `<strong>` sans passer par du HTML, et laisse un
  nombre impair de marques tel quel. La galerie gagne l'état
  `resultat-avertissement-regroupe`.
- Mutations : la déclaration des racines retirée dans `extractStructure` : le
  scénario et le test de regroupement sortent rouges. Le sujet de chacun des trois
  sites rendu au nom du node (`false &&` devant la condition) : les tests de
  `messagesDeRacine`, dont le test de la borne à trois cibles, sortent rouges.
  `ecrireAvecGras` qui ne rend jamais de gras : le test d'interface sort rouge.
  Chaque fichier restauré par copie : vert.
- Écart ou réserve : les textes reprennent ceux du mainteneur avec trois
  ajustements de forme, consignés dans `TEXTES-A-VALIDER.md` (point final des
  titres, accord de « reliés », apostrophes). Le plan prévoyait un simple
  changement de sujet ; les textes retenus changent les trois parties, et le
  titre de la propriété sans champ ne porte plus le nom de la propriété.

### L9 : le message de collision nomme les fichiers

- Commit : ce commit, après `ff5e690`.
- Commandes :
  - tests écrits d'abord : dans le plugin, les tests des cas « deux fichiers »
    et « même fichier » et le test existant de collision sortent rouges. Le test
    du contrat existant sans `fileName` passe avant et après : il garde le texte
    actuel.
  - `github.test.ts` et `gitlab.test.ts` : 66 verts. `tsc --noEmit` : 0.
  - worktree avec les fichiers de L6 et de L9, `npm test` : 0, dont 919 tests du
    moteur. `npm run typecheck` : 0. `build:code`, `build:ui`, `build:manifest` et
    `test:ui` lancés un par un : 0 à chaque étape, 24 tests d'interface verts.
  - copie partagée : `build:code` et `build:manifest` refaits, et `dist/code.js`
    contient `estUneRacineDeVariant` (le texte des messages y est écrit en
    échappements Unicode).
- Résultats : `refusDeCollision` lit `fileName` des deux contrats par
  `identiteDeContrat`, déjà public, et écrit le texte des deux fichiers quand ils
  diffèrent, celui d'un seul fichier quand ils coïncident, et garde le texte
  actuel quand l'un des deux manque. Aucun test ne vérifiait ce texte avant : les
  trois cas sont maintenant tenus mot pour mot. Le composant exporté passe en
  premier dans le titre, l'ordre de l'exemple du mainteneur ; les deux tests de
  collision existants (`github.test.ts`, `gitlab.test.ts`) suivent cet ordre.
- Mutations : la condition qui nomme les fichiers rendue fausse : quatre tests
  sortent rouges. Restauré par copie : vert.
- Écart ou réserve : le plan faisait porter `fileName` à `VerdictIdentite`, dans
  le kit. Le test `versionSuitLeContenu.test.mjs` refuse tout fichier publiable
  du kit modifié sans nouveau numéro, et le plan ne publie rien. Le champ n'est
  pas ajouté : le plugin lit `fileName` sans changer l'API du kit. Ajouter le
  champ au kit reste possible, avec une montée de `@ucm-kit/core` dans le même
  commit.

### Revue R1 : conception de L5 et L7

- Conception relue par un agent indépendant, en lecture seule, avec le plan,
  F7, F8, F11, F14 et le code cité. Chaque constat retenu ci-dessous a été
  revérifié dans le code avant d'entrer ici.
- Retenu :
  - L7 : aucun cas atteignable ne laisse un calque écarté par l'élection sans
    chemin dans la vue exacte de son variant. `assignSlots` applique le filtre de
    `getAllNodes`, et `describeNode` inscrit le chemin d'un calque et de tous les
    descendants d'une feuille avant ses deux sorties. La liste « garder le
    message pour eux seuls » est vide.
  - L5 : `horsDuParent` calculé depuis `props` après
    `buildContractPropertySurface` égale celui du contrat final ; seul
    `mergeIconRules` ajoute des clés ensuite, toutes de type `icon`, qu'il exclut.
  - L5 : `mainByInstanceId` couvre les instances du relevé actuel, mais
    `getAllNodes(set)` élague un variant masqué statiquement, alors que le scan
    part de chaque variant (`exportableNodes.ts`, `hiddenAncestor`). Le relevé
    parcourt donc les variants de la matrice un par un.
  - L5 : la demande de fusion coupe sa liste par la fin (`depot.ts`,
    `corpsDeLaDemande`) ; le point se place en tête des avertissements, sans quoi
    il serait le premier perdu sur un composant à centaines de messages.
  - L5 : le point `sansPorteur` nomme le composant sélectionné sans node ; il
    cible donc le composant. Le point d'un groupe inscrit chacune de ses
    instances.
  - L5 : `elements` devient une quatrième partie ; `AGENTS.md`, `localisation.ts`
    et `CONTRIBUTING.md` le disent, et la loi des parties recompose la phrase
    elle-même.
  - L5 : la déclaration des instances à taire vaut aussi pour un composant seul,
    et la remontée d'ancêtres tolère un node qui lève.
  - L5 : déplacer le relevé dans le moteur plutôt que le passer par un rappel de
    `code.ts` : sans cela, le moteur appelé seul (tests, scénario, lois) n'aurait
    pas le point.
- Rejeté : aucun constat. La remarque sur `layoutSilences.test.ts:79` (début du
  test, l'assertion est plus bas) est sans conséquence.
- Consigné : deux composants distincts de même nom et de mêmes clés donnent la
  même phrase et fusionnent en un seul point.

### Porte H2 : invariants de L5 et L7

- Présenté au mainteneur : la suppression du message de L7 et de l'invariant
  « Ce que l'élection écarte est dit » ; le code du point de L5 ; la forme de la
  liste de propriétés dans la phrase compacte.
- Décidé : supprimer le message de L7 ; le point de L5 porte
  `UCM_PORTABLE_PROJECTION_WARNING` (le contrat n'a pas la dépendance qu'il
  devrait réutiliser) ; les propriétés s'écrivent en liste simple, séparées par
  des virgules, suivies d'un point.
- Ordre changé : L7 avant L5, puisque L7 supprime `dansUnComposantPublie`, que
  L5 devait absorber.

### L7 : un calque publié par la vue exacte n'est pas dit perdu

- Commit : ce commit, après `d0bc9c4`.
- Commandes :
  - tests écrits d'abord : le scénario sort rouge, « la famille
    « horsDuNodeElu » sort encore », 1 ligne ; le test de la vue exacte aussi.
  - `tsc --noEmit` : 0. `node scripts/run-tests.cjs` dans
    `packages/plugin-exporter` : 920 tests, 0 échec. `galerie.test.ts` : vert.
- Résultats : `warnLayersOutsideLayoutNode`, `dansUnComposantPublie` et le
  paramètre `layoutElectionWarnings` d'`extractLayout` sont supprimés. Sur le
  scénario, la ligne « il n'est pas à l'intérieur de » disparaît et une vue
  exacte publie `Overlay`. Les tests qui citaient le message
  (`layoutSilences.test.ts`, `extractStructure.test.ts`,
  `composedComponents.test.ts`) vérifient maintenant que la vue exacte publie le
  calque et qu'aucun message ne le dit perdu. L'interface et la galerie jouaient
  ce texte en exemple ; elles jouent celui du stroke illisible. `AGENTS.md` et
  `SPEC.md` (« 3. Layout ») disent que la vue exacte publie ce que l'élection
  écarte.
- Mutations : la vue exacte de chaque variant part du node élu au lieu de la
  racine : le scénario, le test de la vue exacte et celui du regroupement sortent
  rouges. Restauré par copie : vert.
- Écart ou réserve : les propriétés du calque d'onde (opacité, masque,
  disposition, dimensions sous `SCALE`) restent signalées ; elles relèvent de L8.
