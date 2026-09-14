---
aide: grille
quand: grille
---

## Sens

`grid` dispose les enfants en pistes. `columns` et `rows` comptent les pistes,
`columnSizes` et `rowSizes` les dimensionnent telles que publiées. Chaque enfant
se place par `columnStart`, `rowStart`, `columnSpan`, `rowSpan` et
`justifySelf`. Sous une grille, la cellule fixe la boîte d'un enfant qui n'a pas
d'alignement explicite, et `structuralSize` porte en pixels la mesure d'une
piste qui épouse son contenu.

## Écriture par défaut

Sur le conteneur : `display: grid`, `grid-template-columns` et
`grid-template-rows` depuis les tailles de pistes, `column-gap` et `row-gap`.
Sur l'enfant : `grid-column: <start> / span <span>`, `grid-row` de même, et
`justify-self`.

## Preuve

Relecture de chaque grille contre la vue exacte.
