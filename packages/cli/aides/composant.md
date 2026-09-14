---
aide: composant
quand: toujours
---

## Sens

Le contrat est la seule source du rendu, et le composant le transcrit sans le
charger ni l'interpréter à l'exécution. Une vue est un jeu de renvois :
`variantViews[variant.view]` nomme des entrées de catalogue, et la vue exacte
les résout sans fusion, héritage ni défaut. Elle ne se fusionne ni avec une
autre vue ni avec la projection `structure`. Son arbre se construit depuis
`children`, récursivement et dans l'ordre. Une clé absente signifie qu'il n'y a
rien à publier ; sous un dictionnaire, la clé est une donnée, si bien que
`stateModel.states.default: {}` existe.

Chaque entrée de `props` s'expose sous son nom et son type. Un `default` publié
s'applique tel quel ; son absence laisse le choix au développeur. Un booléen du
contrat se lit effectivement. Une prop `icon`, `string` ou `instance-swap`
accepte aussi l'absence de valeur quand son défaut le permet. Une prop `slot`
reçoit une API explicite, sans sémantique que le contrat ne publie pas. L'axe de
`stateModel` pilote l'état et ne devient pas une prop, sauf s'il figure aussi
dans `props`.

Un chemin est une suite de valeurs `slot`, et `[]` désigne la racine de la vue.
Un calque se situe par ce chemin, jamais par une recherche de `figmaLayer` dans
tout l'arbre. `optional` ne masque rien à lui seul. `visibilityProp` masque le
slot entier ; `visibilityTargets` masque seulement les descendants que leurs
`figmaPath` désignent.

`variants` énumère les combinaisons qui existent. Elles se transcrivent en une
table littérale, dans l'ordre de `structure.variantAxes`, sans produit
cartésien, chemin interpolé ni valeur reprise d'une entrée voisine. Chaque
référence `{chemin.du.token}` reste écrite en toutes lettres.

Comportement, accessibilité et événements ne sont pas dans le contrat : ils
relèvent des conventions et de la relecture. Ce que l'export n'a pas su décrire
arrive par `meta.diagnostics`, dont chaque message se lit sans filtrer sur
`severity` et se rapporte au développeur. Le nom Figma d'un variant, utile au
rapport, vient de `figmaVariantLabels` quand `variants[].figmaName` est absent.

## Écriture par défaut

Un fichier par composant, au chemin que le motif `implementation` de
`ucm.config.json` résout. Le fichier transcrit le contrat en constantes. Les unions des props enum viennent des types générés
quand un adaptateur de stack les produit, et le type des combinaisons exactes
type la table des variants quand il existe.

## Preuve

`ucm check` : validité, version, composition, typographie, tokens, et parité du
code quand un adaptateur est installé. Relecture de la table des variants contre
`variants`.
