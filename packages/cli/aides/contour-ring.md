---
aide: contour-ring
quand: contour-ring
---

## Sens

Un `ring` se dessine hors du flux et ne déplace aucun voisin. Sa nature et ses
tokens viennent de `rendering.roles.ring` ; son trait est plein ; `align` et
`width` disent de quel côté de la boîte et sur quelle épaisseur. Pour un état de
focus, il remplace l'indicateur natif et n'apparaît qu'au focus clavier.

## Écriture par défaut

`outline: <width> solid <color>` ; `outline-offset` vaut `0` pour `outside`,
moins la largeur pour `inside`, moins la demi-largeur pour `center`. Une largeur
qui diffère par côté se rend par une ombre décalée par côté, exacte pour
`inside` seulement ; signaler au développeur un autre alignement. Sur le même
calque qu'un `border`, le `border` garde `box-shadow` et le `ring` garde
`outline`.

## Preuve

Relecture, puis comparaison visuelle au focus clavier.
