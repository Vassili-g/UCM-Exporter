---
aide: echantillon
quand: echantillon
---

## Sens

`samples` et `variants[].sample` portent ce que la maquette montre : textes,
valeurs de `args`, dépendances et leurs remplacements. Ce sont des défauts
remplaçables, jamais un token, une dimension ni un layout ; en cas de conflit,
la donnée normative l'emporte. `figmaLayer` reste une identité, jamais un
contenu.

Un variant sans `sample` publié n'en reçoit aucun. L'échantillon d'un variant se
résout dans cet ordre :

1. `args` ne s'applique qu'aux clés réellement exposées ; l'axe d'état choisit
   le variant et ne se transmet pas comme prop.
2. Chaque `text[].slotPath` se joint dans la vue, et `value` devient le contenu
   par défaut du slot.
3. Une dépendance racine se joint par son `slotPath`.
4. Le variant de la dépendance se choisit par ses `args`, complétés par les
   défauts de la dépendance, dont le propre échantillon s'applique d'abord.
5. `args`, `overrides`, `swaps` et `composes` du parent se superposent ensuite,
   et la résolution recommence dans chaque dépendance, sans limite de
   profondeur.

Une instance imbriquée reste relative à son propriétaire immédiat : sa séquence
de dépendances directes se parcourt dans l'ordre, puis `component` et
`figmaLayer` se rapprochent. Deux occurrences homonymes sont deux positions.
Une valeur `false` est explicite ; une clé absente laisse le défaut de la
dépendance. `overrides` ne change que le texte ou la visibilité du `figmaPath`
visé. Pour un `swap`, le dernier segment de `masterPath` se joint à exactement un
`icons.*.figmaName` de la dépendance, dont le `runtimeProp` reçoit `component`.
Zéro ou plusieurs correspondances : l'atome s'omet et l'ambiguïté se rapporte au
développeur.

## Écriture par défaut

Les valeurs d'échantillon deviennent les contenus par défaut, que l'appelant
remplace.

## Preuve

Relecture de chaque échantillon contre la vue exacte.
