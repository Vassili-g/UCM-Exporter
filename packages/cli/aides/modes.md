---
aide: modes
quand: modes
---

## Sens

Le composant rend le bon résultat dans chaque contexte de modes parce qu'il lit
ses tokens et ne lit jamais le mode. Il n'expose ni marque ni thème en prop, et
ne déclare aucune variable de token : tout ancêtre peut changer son mode.

## Écriture par défaut

Chaque référence devient `var(--…)`, le nom que `tokenCssVariable` donne au
token. La feuille qu'écrit `ucm tokens css` porte les valeurs de chaque mode.

## Preuve

Vérification du composant dans chaque contexte que `ucm guide` imprime.
