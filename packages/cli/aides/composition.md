---
aide: composition
quand: composition
---

## Sens

Un slot qui porte `composes` est l'instance d'un autre composant : il se rend à
cet emplacement par ce composant, sans recopier ses calques, tokens ni styles.
`view.composes` est la séquence exacte de la vue courante ; le `composes` global
en est l'union ordonnée à cardinalité maximale, qui donne les imports et le
nombre d'occurrences. `visibilityProp` masque l'instance ou son cadre. L'API et
l'échantillon de la dépendance se lisent dans son propre contrat.

## Écriture par défaut

Une occurrence écrite par position de la cardinalité maximale, conditionnée par
la vue courante. Une occurrence absente d'une vue se neutralise sur place.

## Preuve

`ucm check`, sections composition et parité.
