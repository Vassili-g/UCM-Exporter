# Aligner `tokens.json` sur le module de format DTCG `2025.10`

**Statut : recherche, aucune décision prise.** Cette note pèse un changement de
la projection des tokens. Elle ne fait autorité sur rien. La forme publiée
aujourd'hui est décrite dans [FORMAT.md](../FORMAT.md#partie-2--export-tokens),
et le moment où cette forme change dans
[COMPATIBILITE.md](../COMPATIBILITE.md#pourquoi-tokensjson-na-pas-de-version).

## 1. Le problème

`FORMAT.md` déclare les trois écarts entre la grammaire que l'export vise, celle
que lit Style Dictionary v4, et le module de format `2025.10` : la couleur et la
dimension y sont des objets, `boolean` et `string` n'y sont pas des types.

### Ce que ces écarts coûtent

- **Une couleur hors sRGB se perd sans un mot.** `figma.root.documentColorProfile`
  rend `LEGACY`, `SRGB` ou `DISPLAY_P3`. L'export ne le lit pas, et un
  hexadécimal ne sait pas le porter : un fichier Figma en Display P3 sort donc
  comme s'il était en sRGB. Des trois écarts, c'est le seul qui perde une
  information au lieu d'en changer l'écriture.
- **Les tokens de police portent un type qui ne dit pas ce qu'ils sont.** Figma
  publie les graisses et les familles en `STRING`, `dtcgType` les type `string`,
  et le module définit `fontFamily` et `fontWeight` pour cet usage. Chaque
  consommateur écrit donc lui-même la traduction : le Playground porte deux
  transforms et une table de quinze graisses pour la faire.
- **Aucun contrôle ne juge le fichier.** Le contrat a son schéma, dérivé de
  `types.ts` et appliqué par Ajv. `tokens.json` n'a que la prose de `FORMAT.md`.
- **Les canaux sont arrondis sur huit bits.** Figma garde des flottants,
  `toHex` les quantifie.

### Ce que ces écarts ne coûtent pas

- Les lecteurs du kit sont indifférents à la forme des valeurs. Deux fichiers
  touchent `$value` : `tokens-dtcg.mjs` demande si un chemin existe,
  `typography-token-types.mjs` demande si une valeur est un alias. Aucun n'ouvre
  une couleur ni une dimension.
- Le contrat de composant ne cite que des chemins de tokens.
- Un alias s'écrit `"{chemin}"` dans les deux grammaires. L'invariant « les
  tokens restent des références » ne dépend pas de ce choix.
- Style Dictionary v4 produit le CSS attendu à partir du fichier actuel.

## 2. L'état de l'écosystème

La liste de suivi de Style Dictionary
([issue 1590](https://github.com/style-dictionary/style-dictionary/issues/1590))
donne l'état de la v5 face au module `2025.10`.

| Élément du module | État chez Style Dictionary | Présent dans l'export UCM |
|---|---|---|
| Couleur, module complet et ses espaces | fait | oui, chaque variable `COLOR` |
| Dimension en objet `{value, unit}` | fait, les chaînes restent acceptées | oui, chaque `FLOAT` dimensionnel |
| Border | fait | non |
| Gradient | en cours | non, hors des types de variable Figma |
| Duration | en cours | non, hors des types de variable Figma |
| Module de résolution | non commencé | non, les modes passent par `$extensions` |

Tout ce que l'export écrit se trouve dans la colonne « fait ». Les deux chantiers
ouverts portent sur des types qu'une variable Figma ne peut pas porter, puisque
Figma n'offre que `COLOR`, `FLOAT`, `STRING` et `BOOLEAN`. L'avertissement
général « le support de `2025.10` est incomplet » vaut donc pour l'outil, sans
effet sur cette projection.

Les deux ruptures de la v5 laissent l'export intact : une référence ne vaut plus
que sur une feuille portant `$value`, ce que les alias respectent déjà, et la
syntaxe `{ref}` est figée, ce que l'export écrit déjà. La v5 demande Node 22.

Des parseurs conformes au module existent, dont
[`@styleframe/dtcg`](https://www.styleframe.dev/docs/getting-started/integrations/dtcg),
qui couvre Format, Color et Resolver. Le schéma publié sur `designtokens.org` ne
couvre que le module de résolution : un contrôle de conformité passerait donc
par un de ces paquets.

## 3. Les solutions

| Option | Ce qu'elle change | Ce qu'elle laisse ouvert |
|---|---|---|
| A. Garder la grammaire actuelle | rien ; `FORMAT.md` la déclare et nomme ses écarts | les quatre coûts de la partie 1 |
| B. Aligner les valeurs | couleur et dimension en objets, espace colorimétrique porté | le typage des polices, `boolean`, les modes |
| C. B, plus le typage des polices | `fontFamily` et `fontWeight` remplacent `string` sur les scopes de police | `boolean`, les modes |
| D. C, plus un document de résolution | les modes s'expriment dans la forme du module | rien, hors `boolean` |

L'option D attend une implémentation : aucun outil installé ne lit un document
de résolution. Les modes restent donc sous `$extensions["com.ucm.modes"]`, où
le module les autorise.

## 4. Les risques

### Risques de le faire

- **Un fichier produit avant le changement, lu par un kit à jour.** Le contrôle
  des types typographiques rendrait une erreur sur un `string` là où il
  attendrait `fontWeight`. La parade est d'ajouter les types tolérés sans
  retirer `string`, comme `typography-token-types.mjs` tolère déjà deux formes.
- **Le Playground passe à Style Dictionary v5**, donc à Node 22. Sa CI doit
  monter à cette version.
- **La marque de grammaire devient un engagement.** Un lecteur s'en servira pour
  distinguer les deux formes, et elle ne se retirera plus.
- **Le mot « conforme » resterait qualifié.** `boolean` n'appartient à aucune
  révision du module. Annoncer une conformité pleine serait faux.
- **Les modes ne gagnent rien à cette passe.** L'alignement n'apporte rien au
  multi-marque tant qu'aucun outil installé ne lit un document de résolution.

### Risques de ne pas le faire

- La perte du profil colorimétrique reste muette, et elle grandit avec l'usage
  de Display P3 dans les fichiers source.
- Chaque consommateur qui arrive fige la grammaire actuelle. Le coût de la
  migration croît avec leur nombre, et il est aujourd'hui à son minimum.
- Les pistes [2.3, 2.5 et 5.4](./PISTES-EVOLUTION.md#23-produire-les-ressources-de-tokens)
  restent suspendues à cette question, puisqu'elles supposent des outils qui
  lisent le fichier.
- Le positionnement de `CONCEPT.md`, un artefact que d'autres outils peuvent
  lire, reste une affirmation de prose.
- Un outil qui vise le module refuse le fichier, et la conversion s'écrit alors
  chez chaque consommateur.

## 5. Les avantages

- **Le typage des polices retire du code au consommateur.** Les deux transforms
  et la table de quinze graisses du Playground existent parce que ces tokens
  sortent en `string`. Avec `fontWeight` et `fontFamily`, les transforms
  standard font ce travail.
- **La couleur porte son espace.** Le profil du document Figma cesse d'être
  perdu, et un fichier en Display P3 s'exporte pour ce qu'il est.
- **Un contrôle remplace une affirmation.** Un validateur conforme juge le
  fichier en CI, comme Ajv juge le contrat.
- **Les valeurs se rapprochent de leur source.** Figma rend des flottants de 0 à
  1 et des nombres nus. `components` et `value` attendent ces deux formes, si
  bien que l'alignement retire deux conversions au lieu d'en ajouter.
- **Le kit peut devenir strict** là où il tolère aujourd'hui deux typages.

## 6. Plan d'action

Sept étapes. Chacune nomme le contrôle qui la ferme.

### Étape 1. Les valeurs, dans le moteur

`formatValue` rend `{ colorSpace, components, alpha, hex }` pour une couleur et
`{ value, unit }` pour une dimension. `toHex` reste, son résultat devenant le
repli `hex`. Les composantes viennent des flottants Figma sans passer par
l'octet.

Ce qui le prouve : les assertions de forme de
`packages/plugin/tests/exportTokens.test.ts`, dix-huit lignes, réécrites. Les
lois du moteur ne bougent pas.

### Étape 2. Le profil colorimétrique

`buildLeaf` lit `figma.root.documentColorProfile` une fois par export.
`LEGACY` et `SRGB` donnent `srgb`, `DISPLAY_P3` donne `display-p3`.

Ce qui le prouve : un test par valeur du profil, sur une racine simulée.

### Étape 3. La marque de grammaire

`COMPATIBILITE.md` en a fixé la forme : `$extensions`, namespace `com.ucm.*`,
et un fichier sans ce champ vaut grammaire d'origine. L'écrire au niveau du
document.

Ce qui le prouve : un test qui lit la marque dans la sortie de la commande
tokens, et `COMPATIBILITE.md` mis à jour dans le même geste.

### Étape 4. Le typage des polices

`dtcgType` rend `fontFamily` pour le scope `FONT_FAMILY` et `fontWeight` pour
`FONT_WEIGHT`, quel que soit le type Figma résolu. Deux appuis existent déjà :
`isUnitless` lit le scope, et le type se décide sur la racine de la chaîne
d'alias. La valeur d'une graisse se normalise vers un mot-clé du module,
`SemiBold` donnant `semi-bold`, ou vers son nombre.

`typography-token-types.mjs` ajoute `fontWeight` et `fontFamily` aux types
tolérés sans retirer `string`.

Ce qui le prouve : les tests du kit sur les deux typages, et le corpus N-1 lu
sans erreur.

### Étape 5. Le Playground

Style Dictionary v5, puis suppression des deux transforms devenus inutiles.

Ce qui le prouve : `npm run build` du Playground, et le CSS produit comparé au
précédent. Les graisses et les familles sont les seules valeurs qui doivent
changer de provenance, sans changer de résultat.

### Étape 6. Le contrôle de conformité

Un parseur conforme au module, lancé sur la sortie de la commande tokens.

Ce qui le prouve : le contrôle rougit sur une couleur privée de `colorSpace`,
et repasse au vert quand elle le retrouve.

### Étape 7. Les documents

`FORMAT.md` partie 2 et son exemple, `COMPATIBILITE.md`, et la piste 2.3 de
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md), qui perd sa question ouverte.
`CONTRACT_VERSION` ne bouge pas : le contrat de composant ne change pas de
forme.

### Découpage en commits

Les étapes 1 à 3 tiennent dans un commit, l'étape 4 dans un deuxième, les
étapes 5 et 6 dans un troisième. L'étape 7 suit chacun d'eux pour la part qui
le concerne.

### Effort

Une demi-journée sur le moteur et ses tests, une passe sur le Playground, et le
contrôle de conformité en supplément.

## 7. Questions à trancher

- **`boolean`** : type d'extension assumé, ou valeur rangée sous `$extensions` ?
- **`fontWeight`** : publier le mot-clé normalisé, ou le nombre ?
- **`FONT_STYLE`** : aucun type du module ne le porte. Reste-t-il en `string` ?
- **Le profil colorimétrique** : lire `documentColorProfile`, ou fixer `srgb`
  tant qu'aucun fichier source en Display P3 n'est constaté ?
- **Le module de résolution** : attendre qu'un outil installé le lise, ou
  produire le document dès maintenant pour ceux qui le lisent ?
