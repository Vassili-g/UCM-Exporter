# Preuves des diagnostics d'un composant réel

## État

- Lot courant : L4
- Branche et `HEAD` : `main`, `97e3ef1`
- Dernière porte franchie : aucune

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
- En attente du choix du mainteneur. L6 et L9 ne commencent pas avant.
