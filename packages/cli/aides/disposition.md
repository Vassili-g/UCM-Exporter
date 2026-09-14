---
aide: disposition
quand: disposition
---

## Sens

`flex-row` et `flex-column` disposent les enfants en ligne ou en colonne.
`justifyContent`, `alignItems`, `alignSelf`, `flexGrow`, `wrap`, `gap` et
`rowGap` se recopient tels que publiés. Sous `wrap`, un `rowGap` absent reprend
`gap`. Ailleurs, une absence signifie hors flux ou non applicable, et
n'autorise aucun défaut inventé.

## Écriture par défaut

Sur le conteneur : `display: flex`, `flex-direction: row` ou `column`,
`justify-content`, `align-items`, `flex-wrap: wrap`, `gap` et `row-gap`. Sur
l'enfant qui les publie : `align-self` et `flex-grow: 1`.

## Preuve

Relecture de chaque conteneur contre la vue exacte.
