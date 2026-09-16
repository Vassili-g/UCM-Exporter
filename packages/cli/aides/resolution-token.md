---
aide: resolution-token
quand: reference-token
---

## Sens

Une référence `{chemin.du.token}` devient une valeur par le moyen que le
repository fournit, et par aucun autre. Aucune couleur, dimension, famille ou
graisse tokenisée ne s'écrit en dur. Les pixels de `structuralSize` et des
pistes de grille sont les seules valeurs brutes prévues. Les références d'un
contrat se relèvent partout sauf dans `samples` et `meta`, dont une chaîne en
forme de référence est un texte.

Quand ce moyen est une propriété personnalisée CSS, son nom est celui que
`tokenCssVariable` donne, et la feuille d'`ucm tokens css` le déclare. Une
projection recopiée tient la même règle : l'accent tombe et la lettre reste.
`café.fond` donne `--cafe-fond` ; une copie qui remplace tout caractère non
ASCII vise `--caf-fond`, une variable absente, sans erreur.

## Preuve

`ucm check`, section tokens. Relecture : aucune valeur littérale à la place
d'une référence, et aucune projection de nom qui s'écarte de
`tokenCssVariable`.
