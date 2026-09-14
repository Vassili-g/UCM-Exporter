---
aide: composant
quand: toujours
---

## Sens

Le contrat est la seule source du rendu. Une vue est un jeu de renvois :
`variantViews[variant.view]` nomme des entrées de catalogue, et la vue exacte
les résout sans fusion, héritage ni défaut. Une clé absente signifie qu'il n'y a
rien à publier.

Chaque entrée de `props` s'expose sous son nom et son type. Un `default` publié
s'applique tel quel ; son absence laisse le choix au développeur. Un booléen du
contrat se lit effectivement. L'axe de `stateModel` pilote l'état et ne devient
pas une prop, sauf s'il figure aussi dans `props`.

`variants` énumère les combinaisons qui existent. Elles se transcrivent en une
table littérale, dans l'ordre de `structure.variantAxes`, sans produit
cartésien, chemin interpolé ni valeur reprise d'une entrée voisine. Chaque
référence `{chemin.du.token}` reste écrite en toutes lettres.

Comportement, accessibilité et événements ne sont pas dans le contrat : ils
relèvent des conventions et de la relecture. Ce que l'export n'a pas su décrire
arrive par `meta.diagnostics` et se rapporte au développeur.

## Écriture par défaut

Un fichier par composant, au chemin que le motif `implementation` de
`ucm.config.json` résout. Le fichier transcrit le contrat en constantes et ne le
charge pas à l'exécution. Les unions des props enum viennent des types générés
quand un adaptateur de stack les produit.

## Preuve

`ucm check` : validité, version, composition, typographie, tokens, et parité du
code quand un adaptateur est installé. Relecture de la table des variants contre
`variants`.
