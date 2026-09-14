---
aide: etats
quand: etats
---

## Sens

`stateModel.states` associe chaque état à son déclencheur, et
`stateModel.precedence` les classe du plus fort au plus faible. L'état effectif
sélectionne l'entrée de `variants` dont `values[stateModel.axis]` le porte. Les
états actifs se résolvent par `precedence`, sans priorité codée ailleurs. L'état
désactivé vient du booléen applicatif correspondant. Un état sans sélecteur,
autre que le défaut, n'a pas de déclencheur portable et se signale.

## Écriture par défaut

Le `selector` publié s'emploie tel quel : `:hover`, `:active`,
`:focus-visible`, `[disabled]`. Les règles s'écrivent du plus faible au plus
fort, pour que l'ordre du fichier fasse gagner l'état que `precedence` place en
tête.

## Preuve

Relecture de chaque état, puis manipulation au pointeur et au clavier.
