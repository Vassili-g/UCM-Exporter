---
aide: liaison-native
quand: liaison-native
---

## Sens

Une propriété native Figma agit sur une cible exacte. Partir de
`variants[].bindings`, ouvrir la définition dans `propertyBindingDefinitions`,
puis appliquer `prop` à `target` au `figmaPath` déclaré. `target` vaut
`visible`, `characters` ou `mainComponent`. Aucun rapprochement ne se fait par
le nom d'un calque ni par celui d'une prop.

## Écriture par défaut

`visible` : la prop conditionne la présence du calque visé. `characters` : la
prop remplace son texte. `mainComponent` : la prop choisit le composant rendu à
cet emplacement.

## Preuve

Relecture de chaque liaison contre `variants[].bindings`, et parité du code
quand un adaptateur est installé.
