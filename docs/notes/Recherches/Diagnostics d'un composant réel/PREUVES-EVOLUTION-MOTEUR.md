# Preuves de l'évolution du moteur

## État

- Lot courant : porte H (H0, H1 et H2), qui attend le mainteneur
- Branche et `HEAD` de départ : `main`, `92e7cff`
- Dernière porte franchie : aucune

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
  | `dimensionSousContrainte` (`Mask`, `Circle`) | 4 | E4 |
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
