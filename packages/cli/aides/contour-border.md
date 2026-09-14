---
aide: contour-border
quand: contour-border
---

## Sens

Un `border` se dessine sans consommer la boîte ni déplacer un voisin. Sa couleur
et sa largeur viennent de `variants[].strokes[clé]`, ses cibles de
`view.paintPlacements.strokes[clé]`. `align` donne sa géométrie : `inside` porte
l'épaisseur entière vers l'intérieur, `outside` vers l'extérieur, `center` la
moitié de chaque côté. Une largeur par côté se rend côté par côté. Le contour
reste perceptible quand la plateforme force ses couleurs.

## Écriture par défaut

`box-shadow: inset 0 0 0 <width> <color>` pour `inside`,
`0 0 0 <width> <color>` pour `outside`, la demi-largeur de part et d'autre pour
`center`. Plusieurs contours sur une même cible se composent dans une seule
`box-shadow`, les tracés intérieurs d'abord.

En couleurs forcées, `box-shadow` vaut `none`. Un contour de secours
`outline: <width> solid transparent` le remplace, avec `outline-offset` selon
`align` : moins la largeur pour `inside`, moins la demi-largeur pour `center`,
`0` pour `outside`. Ce secours cède à l'`outline` d'un `ring` dans les seuls
états où le `ring` s'affiche, et n'est jamais remis à `none`, focus compris.

## Preuve

Relecture, puis affichage du composant en couleurs forcées.
