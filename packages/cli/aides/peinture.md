---
aide: peinture
quand: peinture
---

## Sens

Chaque clé de `variants[].tokens` peint les cibles de
`view.paintPlacements.fills[clé]`, chemins résolus dans l'arbre de la vue, `[]`
désignant la racine. La nature et les propriétés viennent de
`rendering.roles[rendering.keyRoles.fills[clé] ?? clé]`, jamais du nom du token
ni de celui de la clé. Un composant qui peint plusieurs surfaces expose ses
propres clés.

## Écriture par défaut

Chaque propriété de `cssProperties` du rôle reçoit la référence :
`background-color` pour `background`, `color` et `fill` pour `foreground`.

## Preuve

Relecture de chaque clé contre `paintPlacements` et `rendering.roles`.
