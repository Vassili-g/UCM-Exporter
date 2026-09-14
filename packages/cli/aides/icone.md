---
aide: icone
quand: icone
---

## Sens

`view.icons` dit quelles icônes existent dans la vue et où ; sa clé se joint au
catalogue `icons`. `size` donne la boîte de l'icône. Une icône `strict` rend
toujours `figmaName`, une icône `modifiable` rend la valeur de `runtimeProp`
avec `figmaName` en repli. `visibilityProp` décide seulement si l'icône
s'affiche. Le contrat ne donne ni le dessin ni le jeu d'icônes, et une icône
absente de `view.icons` ne se réintroduit pas.

## Écriture par défaut

Rendre l'icône par le point d'intégration que les conventions nomment, avec son
nom et sa taille résolue.

## Preuve

`ucm icons` liste les icônes à couvrir, puis relecture de chaque vue.
