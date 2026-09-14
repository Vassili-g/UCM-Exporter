---
aide: troncature
quand: troncature
---

## Sens

`lineClamp` limite le texte d'un slot à ce nombre de lignes. `textOverflow` ne
vient qu'avec lui, et marque la coupure.

## Écriture par défaut

`display: -webkit-box`, `-webkit-box-orient: vertical`,
`-webkit-line-clamp: <n>`, `line-clamp: <n>` et `overflow: hidden` ;
`text-overflow: ellipsis` quand le contrat le publie.

## Preuve

Relecture avec un texte plus long que la limite.
