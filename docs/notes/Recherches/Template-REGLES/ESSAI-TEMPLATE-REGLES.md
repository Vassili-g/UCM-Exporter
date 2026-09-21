# Essais du template de règles : ce qui a été mesuré

Résultats de la [phase 1 du plan](PLAN-TEMPLATE-REGLES.md#phase-1-essai-dans-figma),
menés par le mainteneur dans Figma avec le plugin d'essai jetable
`UCM-Essais-Template/`, sur une copie du fichier de tests. Chaque fait porté
ici est **mesuré** : il vient d'un relevé du plugin ou d'une observation du
mainteneur, jamais d'une déduction. Ce qui reste déduit est nommé comme tel.

Le fichier d'essai portait le maître `.componentRules` sur une page voisine,
`Règles [.componentRules]`, et les essais ont tourné sur la page `Components`,
sur le component set `Alert` (8 variants, deux axes, trois booléens).

## Verdict

| Essai | Résultat | Ce qu'il établit |
|---|---|---|
| E1 | réussi | l'instance naît sur la page active depuis un maître rangé ailleurs |
| E2 | réussi | `.remove()` retire un enfant de slot ; `resetSlot` rend le contenu par défaut |
| E3 | chemin F seul | le chemin F reproduit l'arbre attendu ; le chemin E ne se relit pas |
| E4 | mesuré | un handle de sous-calque périme, et une écriture perdue ne lève pas |
| E5 | réussi | `layoutSizingHorizontal = 'FILL'` est nécessaire |
| E6 et E6 bis | mesuré | un Ctrl+Z défait toute la création ; `commitUndo` n'y change rien |
| E7 | réussi | le moteur lit les règles créées et refuse celles qui portent le marqueur |
| E8 | mesuré | la pose dans la section ancêtre marche, et elle chevauche un voisin |
| E9 | non joué | aucune page de bibliothèque disponible |
| E10 | mesuré | 22 règles en 2 secondes ; le conteneur partiel est supprimé |

**La porte H2 ne s'ouvre pas.** Elle se ferme sur l'échec d'E1, E2, E4 ou E7,
ou sur l'échec d'E3 des deux côtés. E1, E2 et E7 sont verts, E3 est vert d'un
côté, et le rouge d'E4 ne porte pas sur l'écriture mais sur la relecture d'un
node dans la session qui vient de l'écrire, ce que la discipline retenue évite.

## E1. Créer l'instance depuis un maître lu sur une autre page

Geste : `createInstance` sur le maître obtenu par `getMainComponentAsync`
depuis une instance de la page, le maître vivant sur une autre page, sous
`documentAccess: dynamic-page`.

Résultat : **réussi**, 62 ms. L'instance naît sous `figma.currentPage`.

```text
source : maître de l'instance INSTANCE « .componentRules » (713:1391)
maître : COMPONENT « .componentRules » (713:1390), remote = false,
         page du maître : PAGE « Règles [.componentRules] »
parent de l'instance : PAGE « Components », page active : Components
```

L'ordre des sources de [5.2](PLAN-TEMPLATE-REGLES.md#52-ordre-des-sources) tient
donc, et `src/template/sources.ts` n'a rien à corriger.

## E2. Retirer un enfant d'un slot d'instance

Geste : `.remove()` sur une section du slot `Sections-Wrapper`, puis sur un
exemple d'un `Rules-Wrapper` ; `resetSlot` sur une autre instance.

Résultat : **réussi**, 323 ms.

```text
remove, section : 5 → 4 enfants, retiré = true, instance vivante = true
remove, exemple : 1 → 0 enfants, retiré = true, instance vivante = true
resetSlot, slot des sections : 5 par défaut → 4 après retrait → 5 après resetSlot
```

Le forum rapportait ce retrait impossible ; il ne l'est pas. `resetSlot` rend
bien le contenu par défaut, ce que la première mesure ne pouvait pas voir :
elle l'appelait sur un slot resté par défaut, où ne rien faire est le
comportement juste.

## E3. Les deux chemins de l'écriture

Geste : chemin E sur une instance, chemin F sur une autre, d'après les
propriétés du component set.

Résultat : **chemin F seul**, 2 054 ms pour les deux.

Chemin E : toutes les écritures sont relues correctement, puis la vérification
lève.

```text
relecture : ERREUR in findOne: "findOne" callback crashed:
Error: in get_name: The node (instance sublayer or table cell)
with id "I2004:7472;175:228" does not exist
```

Chemin F : l'arbre posé est exactement l'arbre attendu, et le harnais compte
quatre calques morts, un par section ajoutée.

```text
.rulesSection : @usage
.rulesSection : @prop severity.info | @prop severity.success |
                @prop severity.warning | @prop severity.error | divider |
                @prop variant.standard | @prop variant.outlined
.rulesSection : @boolean icon | @boolean title | @boolean action
.rulesSection : @icons
calques morts dans le conteneur : 4
```

E7 bis a relu les deux conteneurs depuis une session neuve du plugin : **les
deux sont intacts et complets**, douze règles chacun. Le défaut du chemin E est
donc borné à la session qui écrit, et il y est total : aucun parcours n'y est
possible après le premier ajout dans un slot imbriqué.

**Chemin retenu : F.** Le plan préférait E à succès égal ; le succès n'est pas
égal. Et la raison est plus forte qu'une préférence : après la création, le
plugin relance la lecture de la sélection, donc il parcourt la page dans la
session même qui vient d'écrire. Seul le chemin F survit à ce parcours.

## E4. Écrire dans un sous-arbre de slot

Geste : plusieurs écritures de `characters` dans le même sous-arbre, avant et
après l'ajout, polices chargées.

Résultat : **mesuré**, 411 ms. Deux faits, et une limite.

Un handle de sous-calque pris avant une écriture voisine est périmé, et
l'écriture qu'il reçoit est perdue sans rien lever :

```text
handle capturé avant toute écriture : TEXT « prop » (I2004:7803;713:1318;713:1232;175:228)
component-name : écrit « Root », relu « Root »
écriture 1, par le handle capturé : écrit « tone.a », relu « prop.name »
handle capturé après une écriture voisine : périmé
écriture 2, par recherche fraîche : écrit « tone.b », relu « tone.b »
```

Un node rangé dans un slot change d'id, puisque l'id d'un sous-calque est un
chemin. L'ancien ne résout plus, et le sous-arbre garde une coquille à
l'ancien chemin : relire le conteneur par son id ne la purge pas, et le
parcours lève.

```text
écriture 3, avant ajout : écrit « tone.c », relu « tone.c » sur TEXT « prop » (I2004:7889;175:228)
ERREUR in findOne: ... The node ... with id "I2004:7889;175:228" does not exist
```

**Discipline d'écriture, pour le lot 5.** Retrouver chaque calque juste avant
d'écrire ; relire après chaque écriture et recommencer une fois sur un calque
retrouvé ; écrire dans une règle avant de la ranger, jamais après ; ne
parcourir un conteneur qu'une fois la pose finie, et seulement si le chemin F a
été suivi.

## E5. Largeur d'une règle ajoutée

Geste : une règle ajoutée sans affectation, une autre avec
`layoutSizingHorizontal = 'FILL'` ; `limitViolations` des deux slots.

Résultat : **réussi**, 396 ms. L'affectation est nécessaire.

```text
Rules-Wrapper : largeur 526, layoutMode VERTICAL, limitViolations []
Sections-Wrapper : largeur 546, limitViolations []
sans affectation : layoutSizingHorizontal FIXED, largeur 689, rognée = true
avec FILL : layoutSizingHorizontal FILL, largeur 526, rognée = false
.componentRules, propriété Sections-Wrapper#713:2 : slotSettings = null
.rulesSection, propriété Rules-Wrapper#713:1 : slotSettings = null
```

`stretchChildOnInsert` ne joue donc pas : les deux `slotSettings` sont nuls, et
sans l'affectation la règle garde les 689 px du variant et déborde.

## E6 et E6 bis. Le retour arrière

Geste : un geste manuel dans le canevas, puis une création, puis deux Ctrl+Z,
focus dans le canevas puis dans la fenêtre du plugin. E6 bis rejoue le tout
avec `figma.commitUndo()` appelé juste avant la création.

Résultat : **mesuré**, et les deux essais donnent la même chose.

| Focus | Premier Ctrl+Z | Second Ctrl+Z |
|---|---|---|
| canevas | le conteneur créé disparaît en entier | le geste d'avant la création est défait |
| fenêtre du plugin | rien | rien |

**H1-H est tranché : le template n'appelle pas `commitUndo`.** La création est
déjà un pas d'annulation unique, et l'appel ne sépare rien de plus. Le second
Ctrl+Z qui remonte au geste précédent est le comportement ordinaire de la pile
d'annulation de Figma, pas une conséquence de la création.

## E7. Le moteur relit les règles créées

Geste : analyse du component set avec le plugin UCM, sur les règles créées.
Relevé complet obtenu par E7 bis, qui rejoue la lecture du moteur pas à pas.

Résultat : **réussi**, 244 ms.

```text
conteneurs qui écrivent ce nom : 2
instances dans le conteneur : 16
reconnues comme règle : 12, avec un tag : 11,
retenues : 1, écartées par le marqueur : 10
```

Le moteur lit les deux conteneurs en entier, reconnaît chaque `.ruleItem` par
son component set, lit le tag affiché de chacune, et écarte les dix règles dont
un calque lu porte encore `[À compléter]`. Le séparateur est reconnu comme
`.ruleItem` sans tag et n'écrit rien : il traverse la lecture sans un mot,
comme la borne du dépôt le demande. La onzième règle, `@icons`, passe le
marqueur, son calque `icon` portant un nom de calque et non une phrase, puis
`buildRules` l'écarte faute d'une politique d'icône lisible : le maître montre
à la fois `modifiable` et `strict`, ce qui est précisément ce que le designer
doit trancher.

Rien n'est donc publiable, et la carte du plugin le dit : « Aucune règle
d'usage exploitable ne documente quand l'utiliser ». C'est le comportement
prévu en [6.5](PLAN-TEMPLATE-REGLES.md#65-exemple-pour-un-component-set-fictif-button),
et non un défaut de lecture.

**Le maître n'a rien à corriger.** Les textes d'aide de `@usage`, `@prop` et
`@boolean` portent déjà le marqueur, et `@icons` dit autrement la même chose :
ses trois mots restent visibles tant que le designer n'a pas masqué celui qui
ne vaut pas, et la règle ne publie rien jusque-là. La vérification des textes
d'aide du lot 4 a donc été réduite à ces trois `content` : exiger le marqueur
sur le calque `icon` aurait refusé la création sur un maître correct.

## E8. Où le conteneur se pose

Geste : pose dans la section ancêtre du component set, sélection gardée,
cadrage.

Résultat : **mesuré**, 1 486 ms.

```text
parent du set : FRAME « Alert », section ancêtre : SECTION « Alert »
section avant : {"x":2802,"y":-1586,"width":1730,"height":2142}
section après : {"x":2802,"y":-1586,"width":1730,"height":2142}
conteneur : parent SECTION « Alert », boîte absolue
            {"x":3724.3,"y":-1428,"width":588,"height":1417}
chevauchements : INSTANCE « .componentRules » (727:1685)
sélection : COMPONENT_SET « Alert »
```

La section accepte l'enfant sans s'agrandir, et la sélection reste sur le
component set. **Le chevauchement est avéré** : posé à 80 px à droite du set,
le conteneur recouvre une instance déjà présente. Le plan le donnait pour non
vérifié ; la pose du lot 5 doit donc regarder les voisins avant de choisir sa
place.

## E9. Maître de bibliothèque

**Non joué** : aucune page dont la seule source soit une instance venue d'une
bibliothèque publiée n'était disponible. Les relevés portent tous
`remote = false`.

Ce qui reste inconnu : `createInstance` sur un maître distant, l'accès au
component set parent de `.ruleItem` depuis un maître distant, et donc la
variante `divider`. L'issue de la
[section 12.1](PLAN-TEMPLATE-REGLES.md#121-léquipe-consommatrice) reste ouverte,
et elle ne concerne que l'équipe consommatrice : le template fonctionne avec un
maître local, qui est le cas de l'équipe du design system.

## E10. Volume et retour arrière

Geste : 22 règles et 3 séparateurs, puis un échec provoqué après la onzième
règle.

Résultat : **mesuré**.

| Chemin | Pose complète | Conteneur partiel supprimé |
|---|---|---|
| E | 1 926 ms | oui |
| F | 1 987 ms | oui |

Deux secondes pour le pire contenu réel, et le retour arrière est complet des
deux côtés : `inst.remove()` suffit, et `getNodeByIdAsync` ne retrouve plus le
conteneur partiel. Le chemin F coûte 61 ms de plus, écart sans conséquence
devant ce que le designer perçoit.

## Ce que le lot 5 hérite

1. Chemin F : construire chaque section hors de l'arbre, la remplir, puis la
   ranger d'un seul geste. Jamais d'ajout dans un slot déjà imbriqué.
2. Ne garder aucun handle : retrouver chaque calque juste avant d'écrire.
3. Relire après chaque écriture, et recommencer une fois sur un calque
   retrouvé : une écriture perdue ne lève pas.
4. `layoutSizingHorizontal = 'FILL'` sur chaque node ajouté à un slot.
5. Pas de `commitUndo`.
6. Choisir la place du conteneur en regardant les voisins.
7. Échec à mi-parcours : `remove()` sur le conteneur créé, vérifié par
   `getNodeByIdAsync`.
