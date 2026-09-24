# Décision sur les propriétés visuelles non portées

Lot L8 du [plan](./PLAN-DIAGNOSTICS-COMPOSANT-REEL.md). Cette note ne change
rien au format : elle prépare la porte H3, où le mainteneur décide, sujet par
sujet, de publier, de garder l'avertissement ou de reporter. Une décision de
publier ouvre un plan à part, relu par un agent indépendant avant son exécution.

Elle part de la piste 1.1 de
[PISTES-EVOLUTION.md](../Evolutions%20globales/PISTES-EVOLUTION.md) et des faits
F3, F4 et F14 du plan. Les quatre sujets viennent du composant de la section 1
du plan : l'ombre de 28 variants, puis l'opacité, le masque et la disposition
du calque d'onde des variants `Pressed`.

## Ce qui ne change pas, quelle que soit la décision

- Un nombre brut n'est jamais contractuel ; une variable liée l'est. Chaque forme
  ci-dessous publie une référence de token quand Figma permet de lier la valeur,
  et avertit sinon.
- Une propriété publiée cesse d'avertir, et une propriété avertie rend
  `meta.coverage.portable` partiel. Le relevé de `unsupportedProperties.ts`
  perd donc chaque propriété que le contrat se met à écrire.
- `CONTRACT_VERSION` ne monte qu'une fois pour tous les sujets retenus ensemble.
  Chaque sujet a son entrée dans `CHANGELOG-FORMAT.md`, avec sa classe de
  [COMPATIBILITE.md](../../../format/COMPATIBILITE.md).

## 1. Ombre d'un calque (E3)

Figma : un effect style d'ombre dont `offsetX`, `offsetY`, `radius` et `spread`
sont liés à des variables (F3). La couleur de l'ombre se lie aussi. Figma porte
plusieurs effets par calque, et quatre types : ombre portée, ombre intérieure,
flou de calque, flou d'arrière-plan.

**Forme A : un catalogue `effectStyles`, sur le modèle de `textStyles`.** Chaque
style publie ses références (`tokens`) et ce qu'aucune variable ne porte
(`literals`). Un calque cite son style dans sa vue exacte, par le même chemin de
slots que la typographie. Le contrat suit ce que le design system a déjà
nommé : un style, pas cinq valeurs par calque.

**Forme B : un champ `shadow` par calque.** Une liste d'ombres, chacune avec ses
cinq références et `inset` ; le flou prend un second champ, `blur`. Plus simple à
lire, mais le nom du style se perd, et deux calques qui partagent une ombre la
répètent dans deux vues.

Composition avec le rôle `border`, rendu en `box-shadow`
([FORMAT.md, « 8. Rendu sémantique »](../../../format/FORMAT.md#8-rendu-sémantique-et-garde-fous)) :
`RenderingRole.cssProperties` prévoit déjà que plusieurs rôles se composent en
une seule déclaration `box-shadow`, les `inset` d'abord. Une ombre portée
s'ajoute après le `border`, dans l'ordre des effets Figma. Le `ring` reste en
`outline` et n'entre pas dans cette liste. Les deux flous se rendent par
`filter: blur()` et `backdrop-filter: blur()`, sans conflit avec les contours.

`tokens.json` : les variables des champs sont déjà des dimensions et des
couleurs. La forme A peut s'en tenir à elles. Publier aussi le style comme token
DTCG `shadow` ajouterait des feuilles d'un type composite que le fichier ne
porte pas aujourd'hui : c'est une nouvelle forme de valeur, qui monte
`TOKENS_FORMAT_VERSION` (classe 10) ; ce n'est pas nécessaire au contrat.

Coût : `types.ts` et le schéma régénéré ; `validation-contrat.mjs` et
`variant-views.mjs` pour le nouveau renvoi ; une aide CLI par caractéristique
(`caracteristiques.mjs`, `packages/cli/aides/`) ; le relevé de
`unsupportedProperties.ts` perd `effect`. Classe 2 : un lecteur 13.0 qui ignore
le champ rend le composant sans son ombre.

## 2. Opacité d'un calque (E5)

Figma lie l'opacité d'un calque à une variable (`VariableBindableNodeField`
contient `opacity`, F3). C'est le premier réglage d'un état `disabled`, et le
calque d'onde du composant analysé porte 0,3.

**Forme A : un champ `opacity` tokenisé**, sur le composant et sur chaque slot,
absent à 1. Une opacité inférieure à 1 sans variable avertit, à la règle
commune, et le geste demandé devient « reliez-la à une variable ».

**Forme B : l'opacité brute publiée en nombre**, comme une piste `FIXED` de
grille. Elle contredit la règle commune sans raison propre à Figma, qui permet
ici la liaison : cette forme est écartée, et n'est citée que pour mémoire.

`tokens.json` ne change pas : une variable `FLOAT` s'y écrit déjà en `number`.
Coût : `types.ts`, schéma, `validation-contrat.mjs`, une aide CLI ; le relevé
perd `opacity`. Classe 2 : un lecteur 13.0 rend opaque ce que la maquette montre
transparent.

## 3. Enfants d'un cadre sans auto layout (E5)

Aujourd'hui, un enfant n'a de place que dans un auto layout linéaire, une grille,
ou en position `Absolute` (F14). Les enfants d'un cadre libre n'en ont aucune, et
le moteur avertit « il range N layers mais n'utilise pas d'auto layout ». Leurs
axes en `STRETCH` ou `SCALE` réclament en plus une variable de dimension, alors
que leurs contraintes décident de cette dimension.

**Forme A : publier ces enfants en `position: "absolute"`, avec `constraints` et
`inset`.** Ces champs existent : un lecteur 13.0 les rend déjà, parent en
`position: relative`. Le calcul par le centre, déjà écrit pour la position
absolue, vaut tel quel. Un axe en `stretch` ou en `scale` publie ses deux côtés
et ne réclame plus de variable de dimension, l'`inset` la déterminant. Le schéma
ne change pas ; seul le texte de
[« Position absolue »](../../../format/FORMAT.md#position-absolue) s'étend aux
enfants d'un cadre libre, et l'invariant d'`AGENTS.md` sur la place d'un calque
hors du flux avec lui. Classe 1 (mineure) : un lecteur 13.0 lit ces champs sans
rien changer. La fenêtre de lecture se referme tout de même d'un cran.

**Forme B : une valeur `layout: "free"` sur le parent**, les enfants gardant
`constraints` et `inset` sans `position`. Plus fidèle au vocabulaire de Figma,
mais `layout` gagne une valeur que les lecteurs 13.0 ne connaissent pas, et
chaque enfant change de sens selon son parent. Classe 2 ou 3, majeure.

Le repli `flex-row` du parent reste obligatoire dans les deux formes. Dans la
forme A, il ne place plus aucun enfant, et son avertissement ne se justifie
plus que si le cadre range aussi des enfants que rien ne place.

## 4. Masque (E5)

Un calque `isMask` découpe les calques posés au-dessus de lui dans le même
parent. Le contrat publie aujourd'hui sa couleur dans `variants[].tokens` et
avertit : sans l'avertissement, le développeur peindrait par-dessus le contenu
la couleur qui devait le révéler.

**Forme A : publier la découpe quand sa forme s'écrit en CSS.** Un masque
`RECTANGLE` ou `ELLIPSE` se traduit par `overflow: hidden` et un
`border-radius` sur le parent, ou par `clip-path: inset()` ou `ellipse()`. Le
calque masquant ne publie plus sa couleur comme une surface. Un masque vectoriel
reste averti : le contrat n'exporte aucun tracé, donc aucune forme à découper.

**Forme B : garder l'avertissement.** Le geste demandé reste d'aplatir le
masque dans le dessin, ou de signaler la limite. C'est la forme actuelle.

Coût de la forme A : un champ de découpe dans `types.ts`, le schéma, les
lecteurs, une aide CLI, et une règle d'extraction qui distingue la forme du
masque. Classe 2 : un lecteur 13.0 rend la surface du masque par-dessus le
contenu.

## Versions et fenêtre de lecture

| Sujets retenus | `contractVersion` | Fenêtre de lecture | `tokens.json` |
|---|---|---|---|
| 3 forme A seul | 13.1 (classe 1) | 13.0 et 13.1 | inchangé |
| au moins un des sujets 1, 2 ou 4 en forme A | 14.0 (classe 2) | 13.0 et 14.0 | inchangé, sauf token DTCG `shadow` (classe 10) |
| aucun | inchangé | inchangée | inchangé |

Une montée de `CONTRACT_VERSION` suit l'ordre de
[COMPATIBILITE.md, « Qui publie, qui migre »](../../../format/COMPATIBILITE.md#qui-publie-qui-migre-qui-peut-fusionner) :
entrée de changelog avec sa classe, schéma régénéré, fenêtre déplacée dans
`version-contrat.mjs`, contrat N-1 figé dans `packages/kit/fixtures/contrats/`,
paquets montés dans le même commit.

## Ce que le mainteneur tranche à H3

Pour chaque sujet : publier (et sous quelle forme), garder l'avertissement, ou
reporter.

| Sujet | Recommandation | Raison |
|---|---|---|
| 1. Ombre | publier, forme A | le design system nomme déjà ses ombres par des effect styles liés à des variables |
| 2. Opacité | publier, forme A | Figma permet la liaison, et un état `disabled` en dépend |
| 3. Cadre sans auto layout | publier, forme A | aucun champ nouveau, et deux messages sans geste utile disparaissent |
| 4. Masque | garder l'avertissement | seuls les masques rectangulaires ou elliptiques s'écrivent en CSS ; le composant analysé en porte un, mais le cas vectoriel resterait averti |

## Décision du mainteneur (H3)

| Sujet | Décision |
|---|---|
| 1. Ombre | publier, forme A : un catalogue `effectStyles` |
| 2. Opacité | publier, forme A : un champ `opacity` tokenisé |
| 3. Cadre sans auto layout | publier, forme A : `position: "absolute"`, `constraints` et `inset` |
| 4. Masque | garder l'avertissement |

Les sujets 1 et 2 font monter le contrat en 14.0 (classe 2), le sujet 3 relevant
de la classe 1 dans la même montée. Ces décisions ouvrent un plan à part, relu
par un agent indépendant avant son exécution ; le plan des diagnostics d'un
composant réel ne les implémente pas.
