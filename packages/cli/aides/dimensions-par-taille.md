---
aide: dimensions-par-taille
quand: dimensions-par-taille
---

## Sens

`structure.sizes` remplace `gap`, `rowGap`, `columnGap`, `padding` et `radius`
du conteneur de layout, pour chaque valeur de la prop enum dont les valeurs sont
ses clés. L'entrée de la taille courante s'applique exactement. Dans la vue
exacte, ce conteneur est la racine, ou l'unique conteneur dont les enfants
correspondent aux `children` de la structure de référence que `structure.view`
désigne. Une prop introuvable ou ambiguë, ou un conteneur que cette règle ne
désigne pas seul, se rapporte au développeur au lieu d'un placement au hasard.

## Écriture par défaut

Une table littérale qui associe chaque taille à ses dimensions, appliquée au
conteneur que la vue exacte désigne.

## Preuve

Relecture de chaque taille contre `structure.sizes`.
