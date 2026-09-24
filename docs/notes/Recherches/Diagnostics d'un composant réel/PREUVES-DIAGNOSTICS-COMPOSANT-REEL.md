# Preuves des diagnostics d'un composant réel

## État

- Lot courant : L0
- Branche et `HEAD` : `main`, `4bb233f`
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
