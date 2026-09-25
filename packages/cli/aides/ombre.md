---
aide: ombre
quand: ombre
---

## Sens

Chaque usage de `view.effects` joint `slotPath` dans l'arbre de la vue, `[]`
désignant la racine, puis `effectStyles[usage.style]`. Les références des
effets passent par la résolution des tokens. `effects` suit l'ordre de CSS : le
premier effet peint au-dessus des autres. Un champ absent de `offsetX`,
`offsetY`, `blur` ou `spread` vaut zéro. Une ombre sans `color` ne se rend pas.
Une ombre suit la forme dessinée du calque : sa boîte quand il a un fill, son
contenu quand il n'en a pas, les lettres d'un texte. `blur` est le rayon de
Figma : une ombre le reçoit tel quel, un flou divisé par deux. `figmaName` est
une identité, jamais un chemin de token.

## Écriture par défaut

`drop-shadow` donne `box-shadow: <offsetX> <offsetY> <blur> <spread> <color>`
sur un calque qui a un fill, et `inner-shadow` la même ombre en `inset`. Sur un
calque sans fill, une ombre portée s'écrit
`filter: drop-shadow(<offsetX> <offsetY> <blur> <color>)`, qui ne sait pas
écrire `spread`. Sur un texte, elle s'écrit `text-shadow`, sans `spread`.
Plusieurs ombres se composent dans une seule déclaration, dans l'ordre de
`effects`. Sur une cible qui porte aussi un `border`, les deux se composent dans
la même `box-shadow`, le contour en premier.

`layer-blur` donne `filter: blur(calc(<blur> / 2))`, `backdrop-blur`
`backdrop-filter: blur(calc(<blur> / 2))`.

## Preuve

Relecture de chaque usage contre la vue exacte, puis comparaison visuelle à la
maquette.
