---
aide: echantillon
quand: echantillon
---

## Sens

`samples` et `variants[].sample` portent ce que la maquette montre : textes,
valeurs de `args`, dépendances et leurs remplacements. Ce sont des défauts
remplaçables, jamais un token, une dimension ni un layout ; en cas de conflit,
la donnée normative l'emporte. Un texte se joint par `slotPath`, et `figmaLayer`
reste une identité, jamais un contenu. `args` ne s'applique qu'aux clés
réellement exposées.

## Écriture par défaut

Les valeurs d'échantillon deviennent les contenus par défaut, que l'appelant
remplace.

## Preuve

Relecture de chaque échantillon contre la vue exacte.
