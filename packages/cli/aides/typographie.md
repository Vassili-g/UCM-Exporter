---
aide: typographie
quand: typographie
---

## Sens

Chaque usage de `view.typography` joint `slotPath` dans l'arbre de la vue, puis
`textStyles[usage.style]`. Les références de `tokens` passent par la résolution
des tokens. Chaque clé de `literals` s'applique avec sa valeur telle quelle.
`textAlign` et `alignContent` ne concernent que le slot visé. `textTransform`
change l'affichage et jamais le contenu, que `samples` garde tel que la maquette
le montre. `figmaName` est une identité, jamais un chemin de token.

## Écriture par défaut

`font-family`, `font-size`, `font-weight`, `line-height` et `letter-spacing`
reçoivent les références. `textTransform` donne `text-transform`,
`textDecorationLine` `text-decoration-line`, `fontStyle` `font-style`,
`fontVariantCaps` `font-variant-caps`, `textWrapStyle` `text-wrap-style` et
`textBox` `text-box`. `text-align` et `align-content` se posent sur le slot.

## Preuve

`ucm check`, section typographie, puis relecture de chaque usage.
