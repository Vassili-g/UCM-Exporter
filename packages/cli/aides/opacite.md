---
aide: opacite
quand: opacite
---

## Sens

`opacity` rend transparent le calque qui la porte, contenu compris. Sa
référence cite un token exprimé de 0 à 100, comme le panneau de Figma. Une
opacité absente vaut un calque opaque. Sur une dépendance, elle s'ajoute à
celle que le contrat de la dépendance publie déjà.

## Écriture par défaut

`opacity: calc(var(--…) / 100)` sur le slot, ou sur la racine du composant.

## Preuve

Relecture de chaque opacité contre la vue exacte, puis comparaison visuelle à la
maquette.
