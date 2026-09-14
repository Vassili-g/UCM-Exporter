---
aide: dimensions
quand: dimensions
---

## Sens

`sizing.width` et `sizing.height` valent `fit-content`, `stretch` ou une
référence de token. Une référence fixe la dimension et ne devient jamais un
remplissage. `size` fixe un slot sur les axes qu'il porte ; sans `size`, le slot
épouse son contenu. `bounds` borne la boîte sans remplacer `sizing` ni `size`.
`padding.x`, `padding.y` et `radius` s'appliquent sous leur forme courte ou côté
par côté, sans compléter un côté absent. `structuralSize` porte des pixels qui
s'appliquent tels quels.

## Écriture par défaut

`fit-content` donne `width: fit-content`. `stretch` donne un remplissage adapté
au conteneur : `align-self: stretch` sur l'axe transversal d'un flex,
`flex-grow: 1` sur son axe principal, `width: 100%` ailleurs. Une référence
donne `width: var(--…)`. Les bornes donnent `min-width`, `max-width`,
`min-height` et `max-height` ; le padding `padding-inline` et `padding-block` ;
le rayon `border-radius`.

## Preuve

Relecture de chaque dimension contre la vue exacte.
