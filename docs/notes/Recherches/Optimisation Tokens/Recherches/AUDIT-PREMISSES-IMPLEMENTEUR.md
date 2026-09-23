# Audit des prémisses de l'implémenteur

> Statut : relevé de preuves. Ce document instruit les prémisses du
> [plan de l'implémenteur](../Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md)
> contre le code du kit, le schéma du format et les quatre contrats du corpus.
> Les points 1 à 6 sont le premier passage ; le point 7 est un second passage,
> qui revérifie les chiffres du plan et ajoute quatre constats.
> Aucune mesure d'exécution n'a été faite : tout ce qui suit est une lecture de
> fichiers, citée par chemin et par ligne. Là où le plan et le corpus se
> contredisent, le corpus tranche.

## 0. Ce que cet audit a lu, et ce qu'il n'a pas fait

Sources de preuve : `packages/kit/src/format/types.ts` et
`packages/kit/schema/ucm-contract.schema.json` pour ce qu'un champ peut porter,
`packages/kit/src/lecteurs/` pour ce que le kit sait résoudre et juger,
`packages/plugin-exporter/src/contract/` pour ce que l'export produit, et les quatre
contrats du Playground avec leurs implémentations de référence.

Les chemins du Playground sont cités sans lien : ce repository voisin n'est pas
garanti présent à côté de celui-ci, et un lien vers lui casserait le contrôle
des liens.

Ce qui n'a pas été fait : aucun rendu, aucune capture, aucun appel de modèle,
aucun harnais de mutation. Les verdicts du point 4 sont des lectures de code et
le disent à leur place.

## 1. Le jeu de questions, re-dérivé contrat par contrat

### 1.1. Ce qui ferme un genre, et par quel champ

Six champs ferment quelque chose, et la lecture de leur autorité dit quoi.

| Champ | Autorité | Ce qu'il ferme |
|---|---|---|
| `ChildStructure.visibilityProp` | [`types.ts:516`](../../../../../packages/kit/src/format/types.ts) | La prop booléenne qui montre ou masque ce slot |
| `ChildStructure.visibilityTargets` | [`types.ts:521`](../../../../../packages/kit/src/format/types.ts) | La même chose, pour une cible plus profonde que le slot |
| `ChildStructure.optional` | [`types.ts:514`](../../../../../packages/kit/src/format/types.ts) | Rien à lui seul : voir 1.2 |
| `PropertyBindingDefinition.target` | [`types.ts:1023`](../../../../../packages/kit/src/format/types.ts) | `visible`, `characters` ou `mainComponent` sur un chemin de calques Figma |
| `IconProp.visibilityProp` | [`types.ts:60`](../../../../../packages/kit/src/format/types.ts) | Le booléen apparié à une prop d'icône runtime |
| `StateDescriptor.selector` | [`types.ts:132`](../../../../../packages/kit/src/format/types.ts) | Le déclencheur d'un état, sous la réserve du point 3 |

### 1.2. `optional` porte deux faits que le plan confond

`extractLayout.ts` pose `optional: true` à deux endroits, pour deux raisons.

| Ligne | Condition | Sens |
|---|---|---|
| [`extractLayout.ts:487`](../../../../../packages/plugin-exporter/src/contract/extractLayout.ts) | Une visibilité est résolue sur ce slot | Une prop montre ou masque le slot, et `visibilityProp` la nomme |
| [`extractLayout.ts:568`](../../../../../packages/plugin-exporter/src/contract/extractLayout.ts) | Aucune dépendance et aucun texte sous le calque | Le calque est un dessin, et rien ne le masque |

`TileLink` exerce le second cas : son slot `icon` porte `optional: true` et aucun
`visibilityProp` (`TileLink.contract.json:18`). Le genre `visibilite` du plan,
qui interroge « ce qui montre ou masque un emplacement `optional` », pose donc
une question sans objet sur tout dessin du corpus : cinquante-huit slots dans
`StressTest`, comptés sur les trois vues que ses variants emploient, et un
`icon` dans `TileLink`.

La règle qui en sort : un slot `optional` porteur de `visibilityProp` est fermé
par ce champ, un slot `optional` sans `visibilityProp` est fermé par la règle du
dessin. Le genre `visibilite` ne reste ouvert dans aucun des quatre contrats.

### 1.3. Ce que `propertyBindingDefinitions` ajoute, et ce qu'il n'ajoute pas

Sur le genre `visibilite`, `propertyBindingDefinitions` ne dit rien que le slot
ne porte déjà. Les cinq définitions d'`Alert` visent les props `icon`, `title`
et `action` (`Alert.contract.json:49-53`), que les slots `icon`, `label/label` et
`action` nomment déjà dans leur `visibilityProp`. Les trois de `Button` visent
`iconLeft`, `label` et `iconRight` (`Button.contract.json` bloc
`propertyBindingDefinitions`), que les slots `label/icon`, `label/label` et
`label/icon-2` nomment déjà. La différence est de coordonnées : `figmaPath`
adresse des noms de calques Figma, `visibilityProp` vit sur le slot que le code
rend. C'est la seconde adresse qui est utilisable sans table de correspondance.

Ce que le champ ajoute vraiment est ailleurs. Son `target` ouvre `characters` et
`mainComponent` ([`types.ts:1023`](../../../../../packages/kit/src/format/types.ts)),
et l'export sait produire les trois
([`propertyBindings.ts:87`](../../../../../packages/plugin-exporter/src/contract/propertyBindings.ts)).
Une liaison `characters` nomme la prop qui écrit le texte d'un calque, et ferme
alors le genre `contenu` pour ce slot. Aucun des quatre contrats n'en porte une,
et aucun ne déclare de prop de type `string` : le format ouvre ce genre, le
corpus ne l'exerce pas.

### 1.4. Aucun champ ne détermine l'hôte

Le schéma ne porte ni balise, ni rôle, ni élément : une recherche de `element`,
`tag`, `htmlTag`, `semanticRole` et `host` dans
`packages/kit/schema/ucm-contract.schema.json` ne rend rien. `intent.usage` est
du texte libre ([`types.ts:113`](../../../../../packages/kit/src/format/types.ts)).
Le genre `hote` reste donc ouvert sur les quatre contrats, et il n'existe aucun
champ, employé ou non par le corpus, qui le fermerait.

### 1.5. Alert

`structure.variantAxes` vaut `severity, variant` ; huit variants ; pas de
`stateModel` ; une dépendance composée.

| Genre | Ce qui le ferme, ou pourquoi il reste ouvert | Ouvert |
|---|---|---|
| `hote` | Aucun champ du format ne nomme un élément | 1 |
| `etat` | `stateModel` absent : le genre n'existe pas | 0 |
| `contenu` | `label/label` et `label/label-2` portent une typographie et aucune liaison `characters` | 2 |
| `visibilite` | `icon`, `label/label` et `action` portent `visibilityProp` | 0 |
| `accessibilite` | Dépend de la réponse `hote` et du catalogue de l'adaptateur | voir 1.9 |
| `fragment` | Aucune construction hors du vocabulaire du format | 0 |
| `composition` | Genre absent du plan, instruit au point 2 | 9 |

### 1.6. Button

`structure.variantAxes` vaut `color, variant, state` ; quatre-vingt-dix
variants ; `stateModel` à cinq états ; trois tailles ; aucune composition.

| Genre | Ce qui le ferme, ou pourquoi il reste ouvert | Ouvert |
|---|---|---|
| `hote` | Aucun champ du format ne nomme un élément | 1 |
| `etat` | `hover`, `focus` et `press` portent une pseudo-classe que l'agent utilisateur déclenche seul ; `disable` porte `[disabled]`, qu'aucun champ ne relie à la prop `disabled` | 1 |
| `contenu` | `label/label` porte une typographie et aucune liaison `characters` | 1 |
| `visibilite` | `label`, `label/icon`, `label/label` et `label/icon-2` portent `visibilityProp` | 0 |
| `accessibilite` | Dépend de la réponse `hote` | voir 1.9 |
| `fragment` | Aucune construction hors du vocabulaire du format | 0 |
| `composition` | `composes` absent | 0 |

La ligne `etat` demande un mot. `Button.props.disabled` est une prop booléenne,
`Button.stateModel.states.disable` est une valeur de l'axe `state`, et rien dans
le contrat ne les apparie. L'implémentation de référence le fait à la main
(`Button.tsx:203`). La coïncidence des deux noms est le seul lien, et le
repository interdit la logique liée à un nom.

### 1.7. TileLink

`structure.variantAxes` vaut `variant, state` ; quatre variants ; `stateModel` à
deux états ; aucun calque de texte ; aucune composition.

| Genre | Ce qui le ferme, ou pourquoi il reste ouvert | Ouvert |
|---|---|---|
| `hote` | Aucun champ du format ne nomme un élément | 1 |
| `etat` | `hover` porte `:hover`, que tout élément déclenche | 0 |
| `contenu` | Aucun `viewTypographies` : le genre n'existe pas | 0 |
| `visibilite` | Le seul slot est un dessin, au sens de 1.2 | 0 |
| `accessibilite` | Dépend de la réponse `hote` | voir 1.9 |
| `fragment` | Aucune construction hors du vocabulaire du format | 0 |
| `composition` | `composes` absent | 0 |

Une conséquence de la réponse `hote` mérite d'être notée : la référence rend un
élément `a` sans adresse (`TileLink.tsx:49`), et son adresse arrive par la
diffusion des attributs natifs déclarés dans `TileLinkProps` (`TileLink.tsx:28`).
Aucun champ du contrat ne porte cette adresse, et aucun genre du plan ne la
réclame.

### 1.8. StressTest, relevé à part

`intent.usage` dit ce qu'il est : « Composant au layout complexe utilisé
uniquement pour stress-tester l'exporter de contrats »
(`StressTest.contract.json`). Un variant par valeur de `variant`, onze
dépendances composées, douze chemins de texte distincts.

| Genre | Ce qui le ferme, ou pourquoi il reste ouvert | Ouvert |
|---|---|---|
| `hote` | Aucun champ du format ne nomme un élément | 1 |
| `etat` | `stateModel` absent | 0 |
| `contenu` | Douze chemins distincts dans `viewTypographies`, aucune liaison `characters` | 12 |
| `visibilite` | Les cinquante-huit slots `optional` des vues employées sont des dessins, au sens de 1.2 | 0 |
| `accessibilite` | Dépend de la réponse `hote` | voir 1.9 |
| `fragment` | `grille`, `position-absolue` et `rotation` sont relevés par `caracteristiquesDuContrat` ; un adaptateur CSS les exprime | 0 |
| `composition` | Onze enfants, quarante-six props cumulées sur leurs contrats | 46 |

Le détail des quarante-six props cumulées : `Alert` cinq, `Button` neuf trois fois,
`TileLink` deux sept fois, soit quarante-six.

### 1.9. Combien de genres survivent, et avec quel domaine

Quatre des six genres du plan survivent, et un septième manque.

| Genre | Verdict | Domaine réel |
|---|---|---|
| `hote` | Survit, une question par composant | Les primitives que l'adaptateur déclare |
| `etat` | Survit, conditionné à la réponse `hote` | Les props booléennes du contrat, plus `pseudo-classe` et `etat-local` |
| `contenu` | Survit, une question par chemin de texte | Voir la réserve ci-dessous |
| `visibilite` | Disparaît du corpus | Sans objet |
| `accessibilite` | Indécidable sans adaptateur | Les recettes déclarées pour l'hôte retenu |
| `fragment` | Survit, et contredit la règle fondatrice | Texte libre |
| `composition` | Manque au plan, instruit au point 2 | Une énumération par prop d'enfant |

Décompte des questions ouvertes, hors `accessibilite` et hors `composition` :
`Alert` trois, `Button` trois, `TileLink` une, `StressTest` treize. Avec la
composition : douze, trois, une, cinquante-neuf.

Le plan annonce « deux questions pour `Button` et deux pour `TileLink` » :
`Button` en porte trois et `TileLink` une.

**Ce que l'adaptateur doit déclarer pour que ces domaines existent.** Le plan
dit que l'adaptateur fournit le domaine. La lecture précise ce qu'il doit
fournir, et dans quel ordre.

| Domaine | Contenu | Dépend de |
|---|---|---|
| Primitives | La liste fermée des hôtes que l'adaptateur sait émettre | Rien |
| Sélecteurs portés | Pour chaque primitive, les sélecteurs de `stateModel` qu'elle peut déclencher, et par quel attribut | La réponse `hote` |
| Recettes d'accessibilité | Pour chaque primitive, les recettes nommées | La réponse `hote` |
| Nommage du contenu | La convention qui donne un nom à la prop d'un chemin de texte | Rien |
| Capacités de rendu | Les constructions du format que l'adaptateur sait émettre, pour peupler `fragment` | Rien |

Les deux domaines qui dépendent de `hote` interdisent un relevé rempli en un
seul appel : le schéma de réponse de `etat` et de `accessibilite` ne se calcule
qu'une fois `hote` connu. Le plan budgète un appel par composant au §10 et
décrit un objet de réponse unique au §4.

**Ce qui reste est-il un choix dans une énumération ?** Trois réponses sur sept.

| Genre | Choix fermé | Preuve |
|---|---|---|
| `hote` | Oui | La liste des primitives est une donnée de l'adaptateur |
| `etat` | Oui | Les props booléennes du contrat forment une liste finie |
| `contenu` | Non | La référence répond par des props que le contrat ne publie pas : `titleContent` (`Alert.tsx:50`), `actionButtonProps` (`Alert.tsx:54`), `children` (`Button.tsx:168`). Nommer une prop nouvelle est une rédaction, pas une sélection |
| `accessibilite` | Oui, sous réserve | Choisir une recette nommée reste une sélection ; le contenu de la recette appartient à l'adaptateur |
| `fragment` | Non | Le plan écrit lui-même « Texte libre » au §3 et « Questions répondues par un fragment libre » au §11 |
| `composition` | Oui | Voir 2.5 |

Le genre `contenu` redevient un choix fermé si le repository écrit une
convention de nommage : le premier chemin de texte prend `children`, les
suivants prennent un nom dérivé du slot. Cette convention n'existe pas, et son
écriture est un préalable au dimensionnement du §10.

### 1.10. Trois adresses du contrat qu'un compilateur ne doit pas confondre

Ce point ne concerne pas le jeu de questions, mais il décide de ce que le
compilateur produit sans modèle, donc de la ligne qui sépare les deux.

`Button.structure.view` vaut `st3`, et aucune des sept entrées de
`variantViews` ne désigne `st3` : les quatre-vingt-dix variants emploient `st1`
ou `st2`. La projection de référence a trois enfants directs, les vues des
variants en ont un. Le nom de slot `label` désigne le calque de texte dans `st3`
et le cadre `.sizeWrapperButton` dans `st1`. Un compilateur qui résout une
adresse contre `structure` au lieu de la vue du variant peint donc le mauvais
calque.

`IconDefinition.slot` est documenté comme « Slot de `structure.children` que
cette icône remplit » ([`types.ts:697`](../../../../../packages/kit/src/format/types.ts)).
Sur `StressTest`, `icons.skull.slot` vaut `icon` alors que `structure.view` vaut
`st1`, dont les huit enfants directs sont `label`, `alert`, `tilesgrid`,
`userinput`, `label-2`, `divider`, `tilelinkswrap` et `scalewrap`. Le placement
réel est `["icon", "icon"]` dans `viewIcons.ic1`, sous la vue `st3` que le
variant `v3` désigne. Un nom de slot ne sait pas adresser un slot imbriqué.

La règle qui en sort : le placement d'une icône se lit dans
`viewIcons[].slotPath`, et `icons` ne sert qu'à lire `size`, `policy`,
`visibilityProp`, `runtimeProp` et `variants`.

### 1.11. Le recouvrement des signatures, sur quatre contrats

Le banc pose que la répétition des signatures demande cinq composants et que le
corpus n'en offre pas cinq. La lecture des quatre contrats permet quand même de
dire ce qui se recouvre par construction et ce qui ne se recouvre pas.

| Genre | Recouvrement observable | Ce que cela vaut |
|---|---|---|
| `hote` | Trois composants, trois réponses différentes : `button`, `a`, `div` | La signature devrait porter de quoi distinguer les trois, et aucune caractéristique du contrat ne le fait |
| `etat` | Une seule question ouverte, sur `Button` | Aucun recouvrement observable |
| `contenu` | Quinze questions sur trois composants | Le recouvrement dépend de la convention de nommage qui n'existe pas |
| `composition` | `Button` en enfant trois fois avec neuf props, `TileLink` sept fois avec deux props | Le recouvrement porte ici, et il est le plus fort du corpus |

Sur `hote`, le corpus donne le contre-exemple utile : les trois composants
employés répondent différemment, et une signature calculée sur les
caractéristiques du contrat les confondrait. `Button` et `TileLink` portent tous
deux un `stateModel`, un axe de variantes, des icônes et des tokens de peinture ;
`caracteristiquesDuContrat` rend `etats` pour les deux. Ce qui les sépare, la
nature de l'action, n'est écrit nulle part dans le contrat.

La conclusion vaut ce qu'elle vaut : quatre contrats, dont un qui n'est pas un
composant employé. Elle suffit à dire qu'une signature calculée sur les seules
caractéristiques du contrat reprendrait à tort une réponse `hote`, et elle ne
suffit pas à chiffrer une courbe.

## 2. La composition

### 2.1. Ce que le contrat détermine d'un enfant composé

`ComposedDependency` porte trois champs et trois seulement : `component`,
`figmaLayer` et `visibilityProp`
([`types.ts:678`](../../../../../packages/kit/src/format/types.ts)).
`Alert.composes` en porte une entrée, `Button` sur le calque `Button` avec
`visibilityProp: "action"` (`Alert.contract.json:82`), et `viewComposes.cp1` la
rattache à la vue que les six entrées de `variantViews` partagent.

Dans l'arbre, la dépendance est un slot qui porte `composes`
([`types.ts:670`](../../../../../packages/kit/src/format/types.ts)) : pour
`Alert`, le slot `action/button`. Le cadre `action` porte la visibilité, et le
slot de l'instance ne la reprend pas.

Aucun champ ne dit avec quelles props rendre l'enfant. Les peintures le
confirment : `viewPaintPlacements.pp1` d'`Alert` place `background` sur `[]`,
`icon` sur `["icon"]` et `foreground` sur `["label","label"]` et
`["label","label-2"]`, et ne cite jamais `["action","button"]`.

### 2.2. Ce que le compilateur émet pour un enfant composé

Une seule chose : un appel du composant enfant, désigné par
`codeIdentifier(component)`, à la place du slot. Trois lectures le bornent.

L'identifiant est celui que la parité compte
([`parite.mjs:377`](../../../../../packages/adapter-typescript/src/parite.mjs)),
et le graphe refuse deux noms qui donneraient le même
([`validation-graphe-contrats.mjs:95-105`](../../../../../packages/kit/src/lecteurs/validation-graphe-contrats.mjs)).
L'intérieur de l'enfant appartient à son contrat, invariant de composition
d'[AGENTS.md](../../../../../AGENTS.md#composition). Le cadre qui enveloppe
l'instance appartient au parent, qui publie son flux.

### 2.3. L'ordre de compilation

Le kit connaît déjà le graphe : `validerCycles` le parcourt en partant de
`document.contrat.composes`
([`validation-graphe-contrats.mjs:218`](../../../../../packages/kit/src/lecteurs/validation-graphe-contrats.mjs))
sur l'index par nom que `indexerParNom` construit, et il garantit l'acyclicité.
Un tri topologique sur ce même index donne l'ordre, et le corpus donne
`Button`, `Alert`, `TileLink`, `StressTest`.

Ce que cet ordre sert est plus étroit que le plan ne le laisse croire. Le
domaine d'une question de composition se lit dans le contrat de l'enfant, qui
est disponible sans compiler l'enfant. L'ordre devient nécessaire dans un seul
cas, celui de 2.4.

### 2.4. Enfant en mode `possede`, parent en mode `genere`

La parité contrat contre code ne bloque rien : `pariteEnEcart` est rendue sous
l'en-tête « Avertissement, jamais blocage »
([`diagnostic-parite.mjs:43`](../../../../../packages/kit/src/lecteurs/diagnostic-parite.mjs)),
et `bilanEstBloquant` ne la compte pas
([`verdict-bilan.mjs:91-97`](../../../../../packages/kit/src/lecteurs/verdict-bilan.mjs)).
Un enfant en mode `possede` peut donc publier une interface qui s'écarte de son
contrat sans que rien ne refuse la fusion.

Le parent qui compile contre le contrat de l'enfant émet alors un appel que
l'interface de l'enfant rejette, et seul le contrôle de types de la stack le
voit. La règle qui en sort : quand l'enfant est en mode `possede`, le domaine
d'une question de composition se lit sur l'interface publique réelle de
l'enfant, que `lireApiPublique` sait déjà rendre
([`parite.mjs:278`](../../../../../packages/adapter-typescript/src/parite.mjs)),
et non sur son contrat. C'est ce cas, et lui seul, qui impose l'ordre
topologique à l'émission.

### 2.5. Quand le contrat de l'enfant change seul

Le §6 du plan classe un changement en quatre cas, tous lus sur le diff du
contrat compilé. Un changement confiné à `Button.contract.json` ne touche pas
`Alert.contract.json` : le parent reste dans le cas « Mécanique », sans appel et
sans recompilation, alors que ses réponses de composition peuvent être devenues
invalides.

La règle qui manque : un changement de contrat déclenche la recompilation de ses
dépendants, trouvés en inversant le graphe de `composes`. Sur le corpus, toucher
`Button` recompile `Alert` et `StressTest`.

### 2.6. Ce que la composition ajoute au jeu de questions

Une question par prop de l'enfant, à chaque instance. L'implémentation de
référence d'`Alert` en répond sept sur les neuf props de `Button`
(`Alert.tsx:120-130`) :

| Réponse de la référence | Nature |
|---|---|
| `color={severity}` | Une prop du parent dont les valeurs sont incluses dans celles de l'enfant |
| `variant="text"`, `size="small"` | Une valeur littérale de l'énumération de l'enfant |
| `iconLeft={false}`, `iconRight={false}`, `label` | Une valeur littérale booléenne |
| `{...actionButtonProps}` | Une prop du parent qui expose toute la surface de l'enfant |

Le domaine est donc fermé, par prop d'enfant : les valeurs de l'énumération de
l'enfant, plus les props du parent dont l'ensemble de valeurs est inclus dans
celui de l'enfant, plus `exposer`. La lecture des contrats le confirme pour le
cas de `color` : `Alert.props.severity.values` vaut `info, success, warning,
error`, inclus dans les six valeurs de `Button.props.color.values`.

Deux remarques comptent pour le dimensionnement.

Le corpus porte déjà les réponses, dans `samples`. Les quatre échantillons
d'`Alert` posent `color` égal à la sévérité du variant, `variant: "text"`,
`size: "small"`, `iconLeft: false`, `iconRight: false`, `label: true` et
`state: "default"` (`Alert.contract.json:85-88`). Ces valeurs sont déjà
contrôlées contre le contrat de l'enfant : `validerArgs` refuse une clé absente
de sa surface publique et une valeur hors de son énumération
([`validation-echantillons.mjs:107-153`](../../../../../packages/kit/src/lecteurs/validation-echantillons.mjs)),
et ce refus bloque, puisqu'il entre dans `bilan.graphe`. L'échantillon fournit
donc une réponse candidate déjà jointe pour chaque question de composition.

Il ne la fournit pas comme une norme. Le même module écrit que « `samples` n'est
pas normatif : aucun contrôle ne le compare au code »
([`validation-echantillons.mjs:4`](../../../../../packages/kit/src/lecteurs/validation-echantillons.mjs)),
et le §2 du plan range `samples` sous « Les valeurs d'exemple de la galerie,
jamais du rendu ». La réponse candidate demande donc une confirmation, par
convention du repository, par la mémoire des décisions ou par le modèle.

## 3. L'émission CSS et la cascade

### 3.1. Le sens de lecture de `precedence`

`precedence` est ordonné du plus fort au plus faible. Trois autorités
concordent : le commentaire du type
([`types.ts:147`](../../../../../packages/kit/src/format/types.ts)), la
description du schéma (`ucm-contract.schema.json`, définition `StateModel`), et
la table qui le construit,
`STATE_PRECEDENCE = ['disable', 'disabled', 'press', 'focus', 'hover', 'default']`
([`semantics.ts:38`](../../../../../packages/plugin-exporter/src/contract/semantics.ts)).
`Button.stateModel.precedence` vaut `disable, press, focus, hover, default`, et
l'implémentation de référence le lit dans ce sens (`Button.tsx:156-157`, puis
`Button.tsx:209`).

Le plan écrit que l'ordre d'écriture des règles suit `precedence` « de la plus
faible à la plus forte ». Suivre l'ordre déclaré sans l'inverser écrirait
`disable` en premier et `default` en dernier, et rendrait `default` le plus
fort. L'émission doit parcourir `precedence` à l'envers.

### 3.2. Le sort de l'état `default`, et celui d'un état inconnu

`default` figure dans `precedence` et ne porte pas de `selector` : la table des
déclencheurs lui donne la chaîne vide, et le descripteur publié n'écrit alors
rien ([`semantics.ts:28-34`](../../../../../packages/plugin-exporter/src/contract/semantics.ts)).
Puisqu'il est le dernier de `precedence`, l'émission inversée l'écrit en
premier, sans partie d'état dans le sélecteur. Sa règle a donc une spécificité
plus basse d'un cran que celle des états, ce qui va dans le bon sens.

Un second cas porte la même absence, et lui pose un problème. Un état dont le
nom ne figure pas dans la table reçoit lui aussi une chaîne vide et donc aucun
`selector`, sous un avertissement
([`semantics.ts:125-131`](../../../../../packages/plugin-exporter/src/contract/semantics.ts)),
et il est rangé en queue de `precedence`
([`semantics.ts:138-142`](../../../../../packages/plugin-exporter/src/contract/semantics.ts)).
L'émission inversée l'écrirait donc juste après `default`, avec un sélecteur
identique au sien. Deux règles de même sélecteur et de même spécificité se
départagent par l'ordre d'écriture, et l'état inconnu écraserait `default` sur
toutes les combinaisons. Le corpus ne porte aucun état inconnu, et le schéma
n'impose aucune énumération à `selector` : le cas est ouvert par le format.

### 3.3. La spécificité réelle

Une règle d'état s'écrit avec la classe du composant, un attribut par axe de
variantes hors état, et la partie d'état. Un sélecteur d'attribut et une
pseudo-classe pèsent tous deux dans la même colonne de la spécificité. Les
quatre règles d'état de `Button` ont donc la même spécificité entre elles, et
celle de `default` est plus basse d'un cran. L'affirmation « à spécificité
égale » vaut pour les états porteurs d'un sélecteur, et pas pour `default`.

L'axe des tailles ne collisionne pas : `structure.sizes` écrit `gap`, `padding`
et `radius` sur le cadre, et les états écrivent des peintures et des contours.

### 3.4. La cascade ne reproduit pas la sélection de la référence

C'est le point qui casse. La référence choisit une entrée entière :
`PRECEDENCE.find(...)` rend un seul état, et `VARIANTS[...]` rend le bloc complet
de cette combinaison (`Button.tsx:209-210`). La cascade CSS, elle, fusionne
propriété par propriété : un état qui déclare moins de propriétés qu'un état
plus faible laisse passer les valeurs du plus faible.

Le contrat de `Button` porte cinquante-quatre couples de ce genre, comptés sur
les dix-huit combinaisons de `color` et `variant`.

| Couple, du plus faible au plus fort | Propriété qui fuit | Combinaisons |
|---|---|---|
| `focus` vers `disable` | contour `ring` | 18 |
| `press` vers `disable` | contour `ring` | 18 |
| `hover` vers `disable` | peinture `background` | 6 |
| `focus` vers `disable` | peinture `background` | 6 |
| `press` vers `disable` | peinture `background` | 6 |

Le cas vérifiable à la main est celui de `primary` et `variant: "text"` :
l'entrée `hover` déclare `background` et `foreground`, l'entrée `disable`
déclare `foreground` seul (`Button.tsx:69` et `Button.tsx:123`, transcription des
variants du contrat). Sur un hôte `button`, un élément désactivé reste survolé :
la règle `:hover` s'applique, la règle `[disabled]` ne redéclare pas
`background`, et le bouton désactivé garde le fond du survol. La référence ne
produit pas ce rendu.

La règle qui en sort : chaque règle d'état doit redéclarer toute propriété que
n'importe quelle autre règle du même groupe peut écrire, avec une valeur de
remise à zéro quand le contrat n'en donne pas. Une entrée de `variants[]` décrit
une combinaison en entier, jamais un écart par rapport à une autre.

La réciproque vaut pour le rayon de la racine. Sur `Button`, `focus` et `press`
emploient `st2`, qui porte `radius: "{layouts.radius.md}"` à la racine, et
`default` et `hover` emploient `st1`, qui n'en porte aucun. Sur la variante
`contained`, `disable` emploie `st1` et sur `outlined` et `text` il emploie
`st2`. La forme de la racine dépend donc du couple variante et état, et une
règle qui n'écrit rien laisse le rayon de l'état précédent.

### 3.5. Un sélecteur que l'hôte ne porte pas

`[disabled]` sur un hôte `a` reste du CSS valide : il s'analyse, et il ne
s'applique jamais, puisqu'un élément `a` ne porte pas cet attribut. Rien ne le
signale. La lecture le confirme du côté du kit : le seul module qui lise
`selector` est `caracteristiques.mjs`, et il y cherche la sous-chaîne `:focus`
pour décider d'imprimer une aide
([`caracteristiques.mjs:386`](../../../../../packages/kit/src/lecteurs/caracteristiques.mjs)).
Le schéma déclare `selector` comme une chaîne sans motif ni énumération. Aucun
contrôle ne rapproche un sélecteur d'un hôte.

L'absence passe donc en silence, et la conséquence est visible : sur un hôte qui
ne porte pas l'attribut, dix-huit des quatre-vingt-dix variants de `Button` ne
se rendent jamais. La porte de conformité de rendu est le seul contrôle qui
puisse la voir, et seulement si elle sait produire l'état.

`[disabled]` pose un second problème sur l'hôte même qui le porte. Une
pseudo-classe est déclenchée par l'agent utilisateur ; un attribut demande que
quelqu'un l'écrive. La convention du plan, qui ferme un état « dont `selector`
porte une pseudo-classe que l'hôte retenu prend en charge nativement », ferme
donc `hover`, `focus` et `press`, et laisse `disable` ouvert : il faut encore
dire quelle prop écrit l'attribut. C'est la question comptée en 1.6.

### 3.6. Une seconde stack web réutilise-t-elle le même fichier ?

La condition est plus étroite que le plan ne l'écrit. Un fichier CSS partagé
suppose que les deux adaptateurs émettent le même arbre d'éléments, les mêmes
noms de classe et d'attributs, et surtout la même réponse à `hote`. Le §8
propose comme second adaptateur un émetteur de composants web sans framework :
un élément personnalisé ne porte ni l'attribut `disabled` d'un contrôle de
formulaire, ni le comportement de focus d'un `button`. Les règles indexées par
les attributs `data-*` restent partagées ; les règles d'état, qui dépendent de
l'hôte, ne le sont que si les deux adaptateurs répondent `hote` à l'identique.

L'écart à mesurer porte donc sur les règles d'état, pas sur la coque seule.

### 3.7. La représentation intermédiaire déborde le résolveur cité

Le plan fait venir la représentation intermédiaire de `vueExacteDuVariant`. Ce
résolveur rend cinq parties, `structure`, `typography`, `composes`, `icons` et
`paintPlacements`
([`variant-views.mjs:39-45`](../../../../../packages/kit/src/lecteurs/variant-views.mjs)).
Les couleurs et les contours d'un variant ne sont pas dedans : ils vivent sur le
variant, sous `tokens` et `strokes`. `structure.sizes`, `rendering`,
`textStyles`, `icons` et `stateModel` n'y sont pas davantage.

La conséquence porte sur le banc : le programme de H1a « cherche ensuite chaque
valeur dans la vue exacte du variant ». Cherchée là, aucune référence de
peinture ne se trouve, et la classe `attribuee` resterait vide sur tout ce que
`variants[].tokens` porte.

## 4. La porte d'acceptation

### 4.1. Ce que les contrôles existants regardent

Quatre lectures bornent le sujet.

`ucm check` juge des contrats. `analyser` lit la version, la forme des champs,
le graphe, les références de tokens contre `tokens.json`, les types
typographiques, les avertissements d'export et le relevé de parité de
l'adaptateur
([`controle-repository.mjs:164-173`](../../../../../packages/kit/src/lecteurs/controle-repository.mjs)).

Le refus est plus étroit que la lecture. `bilanEstBloquant` retient cinq états :
fichier illisible, champs absents, version hors fenêtre, erreurs de graphe,
types typographiques
([`verdict-bilan.mjs:91-97`](../../../../../packages/kit/src/lecteurs/verdict-bilan.mjs)),
et le verdict final vaut `fautifs.length > 0 || echecsDeTests.echoue`
([`controle-repository.mjs:836`](../../../../../packages/kit/src/lecteurs/controle-repository.mjs)).
Ni la parité, ni les références de tokens absentes ne refusent une fusion.

`ucm icons` ne lit que les contrats, jamais le code : elle collecte les
`figmaName` de `contrat.icons` et rend la liste
([`icons.mjs:17-45`](../../../../../packages/cli/src/icons.mjs)), en sortant
toujours zéro ([`ucm.mjs:222`](../../../../../packages/cli/src/ucm.mjs)). Elle
n'oppose rien au code émis.

La parité de l'adaptateur TypeScript lit sept écarts, tous sur l'interface
publique et la composition
([`parite.mjs:374-418`](../../../../../packages/adapter-typescript/src/parite.mjs)) :
props manquantes, booléen de mauvais type, valeurs d'énumération absentes de
l'union, booléen déclaré et non lu, énumération déclarée et non lue, et compte
des enfants composés rendus. Aucun de ces écarts ne regarde une valeur de rendu.

### 4.2. Les six altérations de H4

Les altérations portent sur le code émis, jamais sur le contrat. Le verdict
ci-dessous est une lecture de code.

| Altération | Contrôle qui la verrait | Mécanisme, ou raison de l'aveuglement |
|---|---|---|
| Remplacer une référence de token par une autre du même contrat | Aucun | `ucm check` lit les références du contrat, pas celles du code. Le contrôle de types ne distingue pas deux chaînes. La référence substituée existe dans `tokens.json`, donc `referencesAbsentes` se tait |
| Retirer une entrée de la matrice | Aucun, sauf effet de bord | Rien ne compte les combinaisons émises. Si le retrait supprime la dernière lecture d'une énumération, `enumsSansEffet` avertit, sans bloquer |
| Changer `align` d'un contour de `inside` à `outside` | Aucun | `align` ne quitte jamais le contrat : aucun contrôle ne lit la géométrie du contour dans le code |
| Remplacer une pseudo-classe par une autre | Aucun | Voir 3.5 : le seul lecteur de `selector` cherche `:focus` pour imprimer une aide. Le CSS reste valide |
| Inverser deux entrées de la précédence des états | Aucun | `precedence` ne se compare à rien dans le code. Sur `Button`, l'inversion de `press` et `focus` reste sans effet visible tant que les deux entrées déclarent les mêmes propriétés |
| Retirer un emplacement d'icône | La parité, sur un seul des trois composants | Sur `Button`, retirer le rendu de l'icône gauche retire la lecture de `iconLeft`, que `booleensNonUtilises` relève. Sur `TileLink`, `chessName` est de type `icon` : ni booléen, ni énumération, et la parité ne le voit pas. `ucm icons` ne lit pas le code |

Une réserve porte sur la seule ligne verte de ce tableau : la parité avertit et
ne bloque pas (4.1). Le jeu d'altérations demande un verdict rouge, et la parité
n'en rend aucun.

**Ce verdict reste une lecture tant qu'une altération n'a pas fait rougir la
porte pour de vrai.** Aucun harnais n'a été écrit, aucune commande n'a été
lancée sur du code altéré. Un contrôle peut refuser pour une raison que cette
lecture n'a pas prévue, et l'inverse aussi.

### 4.3. Ce que l'audit ajoute au plan de conformité de rendu

Le [plan de conformité de rendu](../../Linter%20Dev/PLAN-CONFORMITE-RENDU.md)
porte le sujet, et son bloc B énumère déjà les dix familles de comparaison. Ce
qui suit s'y ajoute et n'y est pas.

Trois faits que ce plan ne relève pas, parce qu'ils appartiennent au verdict et
non à la comparaison : la parité ne bloque pas, `ucm icons` sort toujours zéro,
et le verdict de `ucm check` ne retient que cinq états. Une porte d'acceptation
qui agrège les contrôles existants hérite donc de trois contrôles qui ne
refusent rien.

Un chiffre que ce plan appelle sans le donner. Son bloc C laisse ouverte la
question des états d'interaction et note qu'un affichage sans navigateur ne les
atteint pas. Sur le corpus, la part concernée se compte : soixante-douze des
quatre-vingt-dix variants de `Button` portent un état autre que `default`, et
deux des quatre de `TileLink`. Une porte qui n'atteint pas les états
d'interaction laisse donc quatre-vingts pour cent de la matrice de `Button` hors
de sa portée.

Un point où l'audit contredit une lecture possible de ce plan. Sa règle « le
comparateur n'affirme jamais plus précisément que le contrat » vaut pour le
choix de la propriété CSS. Elle ne dispense pas de comparer l'état résolu : la
fuite de cascade de 3.4 produit un style calculé qu'aucune entrée de `variants[]`
ne porte, et le comparateur a de quoi la voir sans rien affirmer de plus que le
contrat.

## 5. Les affirmations du plan que cet audit contredit

| Affirmation | Endroit | Ce que le corpus ou le code établit |
|---|---|---|
| Le tableau « ce que le contrat détermine déjà » est complet | §2 | Il omet `composes`, `viewComposes` et `propertyBindingDefinitions`, qui déterminent respectivement la présence d'un enfant, son rattachement à une vue et les liaisons natives |
| `stateModel.states[].selector` donne « la pseudo-classe de chaque état » | §2 | `Button.stateModel.states.disable.selector` vaut `[disabled]`, un sélecteur d'attribut ; le schéma n'impose aucune forme |
| Une convention ferme les trois questions `visibilite` de `Button` | §3 | Le contrat les ferme par `ChildStructure.visibilityProp`, sans convention, et il ferme le genre sur les quatre contrats |
| La convention des pseudo-classes ferme `hover`, `focus`, `press` et `disable` | §3 | Elle ferme les trois premiers. `[disabled]` demande un écrivain que le contrat ne nomme pas |
| Il reste deux questions pour `Button` et deux pour `TileLink` | §3 | Trois pour `Button`, une pour `TileLink` |
| Le jeu de genres est clos par la liste de six | §3 | La composition ajoute un genre : neuf questions sur `Alert`, quarante-six sur `StressTest` |
| Une réponse est une valeur prise dans une énumération | §1 et §4 | Le genre `contenu` répond par une prop que le contrat ne publie pas, et le genre `fragment` répond par du texte libre |
| Le relevé se remplit en un appel, sur un schéma unique | §4 et §10 | Les domaines de `etat` et de `accessibilite` ne se calculent qu'après la réponse `hote` |
| Le fichier relu passe de 33 ko à moins de 3 ko | §5 | `Button.tsx` fait 33 305 octets, dont 26 398 pour la matrice. Retirer la matrice, la table des tailles et la machine à états laisse 3 905 octets |
| L'ordre d'écriture des règles va de la plus faible à la plus forte en suivant `precedence` | §5 | `precedence` est ordonné du plus fort au plus faible : l'émission doit le parcourir à l'envers |
| La cascade reproduit la précédence sans arbitrage supplémentaire | §5 | Cinquante-quatre couples de `Button` laissent fuir une propriété d'un état faible vers un état fort |
| Les règles sont à spécificité égale | §5 | Vrai des états porteurs d'un sélecteur, faux de `default`, dont la règle pèse un cran de moins |
| Une seconde stack web réutilise le même fichier CSS | §5 et §8 | Les règles d'état ne sont partagées que si les deux adaptateurs répondent `hote` à l'identique |
| La représentation intermédiaire vient de `vueExacteDuVariant` | §5 | Ce résolveur rend cinq parties, et laisse dehors `tokens`, `strokes`, `sizes`, `rendering`, `textStyles`, `icons` et `stateModel` |
| Un changement mécanique ne coûte aucun appel | §6 | Vrai du composant touché. Le tableau ne déclenche rien chez ses dépendants, dont les réponses de composition peuvent être devenues invalides |
| `ucm icons` oppose la correspondance des icônes au code | §11 | Elle lit les contrats seuls et sort toujours zéro |
| La parité d'API existe comme contrôle de la porte | §11 | Elle existe comme avertissement : elle ne refuse aucune fusion |
| Le programme de H1a cherche les valeurs dans la vue exacte du variant | banc, §3 | Les peintures vivent sur `variants[].tokens`, hors de cette vue |
| Au plus cinq questions par composant | banc, §2 | Treize sur `StressTest` hors composition, cinquante-neuf avec |

## 6. Ce que cet audit ne tranche pas

| Point | Ce qui manque pour le trancher |
|---|---|
| Le genre `accessibilite` porte-t-il une question | Un adaptateur qui déclare ses recettes. Si l'adaptateur en déclare une par primitive, le genre se replie sur `hote` et n'ajoute rien |
| Le décompte réel de `fragment` | Un adaptateur qui déclare lesquelles des vingt et une caractéristiques du point 7.1 il sait émettre. La liste, elle, est établie |
| La fuite de cascade se voit-elle à l'écran | Un rendu, donc H1b. Les cinquante-quatre couples sont une propriété du contrat ; leur visibilité dépend de la joignabilité de chaque paire d'états sur l'hôte retenu |
| La répétition des signatures | Cinq composants, que le corpus n'offre pas. Le contre-exemple de 1.11 porte sur `hote` seul |
| Les six verdicts de H4 | Un harnais qui altère et relance. La lecture de 4.2 annonce ce que le code peut voir, pas ce qu'il verra |
| La convention de nommage du contenu | Une décision du mainteneur. Sans elle, le genre `contenu` n'est pas un choix fermé, et les quinze questions du corpus ne se signent pas |

Le point 7 referme deux de ces lignes, celle du décompte de `fragment` et celle
de la convention de nommage, et il en ouvre une autre.

## 7. Second relevé : ce que la vérification du plan a ajouté

Ce point est un second passage, fait en relisant le plan ligne à ligne. Comme
les six premiers, il ne lit que des fichiers. Il ajoute quatre constats que les
points 1 à 4 n'avaient pas cherchés, et il revérifie les chiffres du plan.

### 7.1. Le catalogue de capacités que le plan réclame existe déjà

Le plan demande que l'adaptateur déclare ses capacités, et le point 6 range le
décompte de `fragment` parmi ce qu'il ne tranche pas, faute de cette liste. La
liste existe, en deux morceaux.

[`caracteristiquesDuContrat`](../../../../../packages/kit/src/lecteurs/caracteristiques.mjs)
relève vingt et une caractéristiques : `toujours`, `reference-token`,
`liaison-native`, `disposition`, `grille`, `dimensions`, `dimensions-par-taille`,
`position-absolue`, `rotation`, `peinture`, `contour-border`, `contour-ring`,
`typographie`, `troncature`, `icone`, `etats`, `focus`, `composition`,
`echantillon`, `modes`, `couverture-partielle`.

`packages/cli/aides/` porte vingt-neuf fichiers, chacun sous trois sections :
son sens, son écriture par défaut et sa preuve. Le champ `quand` de chaque aide
nomme la caractéristique qui la déclenche. Une section `## <aide>` de
`.ucm/conventions.md` remplace l'écriture par défaut pour un repository, ce que
[`conventions.mjs`](../../../../../packages/cli/src/conventions.mjs) lit.

Deux conséquences.

Le domaine du genre `fragment` se ferme : c'est l'ensemble des caractéristiques
qu'un adaptateur déclare ne pas savoir émettre. Les quatre contrats exercent
dix-huit des vingt et une ; `troncature`, `modes` et `couverture-partielle`
restent ouvertes par le format et non exercées.

L'ordre d'écriture des règles d'état est déjà tranché par une aide. `etats`
demande « du plus faible au plus fort », ce qui est le parcours inverse de
`precedence`. La correction du point 3.1 rejoint donc une règle écrite, et le
plan et l'aide disaient la même chose sous deux formulations.

La même aide pose que « l'état désactivé vient du booléen applicatif
correspondant ». Elle ferme la question sémantiquement et pas mécaniquement :
elle ne nomme aucune prop, et le constat du point 1.6 tient.

### 7.2. Les échantillons portent une réponse à chaque question de composition

Le point 2.6 relève que `samples` fournit une réponse candidate et que
`validerArgs` la contrôle contre le contrat de l'enfant. Le relevé chiffré
manquait, et il change le décompte.

| Contrat | Occurrences composées dans les échantillons | Portant un bloc `args` |
|---|---:|---:|
| `Alert` | 4 | 4 |
| `Button` | 0 | 0 |
| `TileLink` | 0 | 0 |
| `StressTest` | 29 | 29 |

Toutes les occurrences composées du corpus portent leurs arguments. En comptant
qu'un argument d'échantillon répond, et qu'une prop d'enfant non couverte mais
pourvue d'un `default` publié se ferme par ce défaut, les questions de
composition tombent de neuf à deux sur `Alert` et de quarante-six à dix-sept sur
`StressTest`.

### 7.3. Les dix-neuf questions restantes portent toutes sur une prop d'icône

Le relevé des dix-neuf props d'enfant qui restent ouvertes après 7.2 donne un
seul type : `icon`. Deux sur `Alert`, dix-sept sur `StressTest`.

Chacune de ces dix-neuf props est la `runtimeProp` d'une entrée `icons` du
contrat de l'enfant, entrée qui porte le `figmaName` servant de repli. Le
corpus le montre sur les deux enfants concernés :
`Button.icons.arrowLeftLong` apparie `iconLeftName` à `arrow-left-long`, et
`TileLink.icons.chess` apparie `chessName` à `chess`. L'implémentation de
référence applique déjà ce repli à la main.

Une règle « une prop d'icône runtime non fournie replie sur le `figmaName` que
le contrat de l'enfant lui apparie » ferme donc les dix-neuf, sans modèle.

### 7.4. La commande dont le plan dépendait n'existe pas

Le plan écrivait que « la commande `ucm diff --json` fournit déjà la forme
attendue ». L'aide de
[`ucm.mjs`](../../../../../packages/cli/src/ucm.mjs) liste sept commandes :
`init`, `check`, `icons`, `tokens css`, `aides`, `guide` et `rapport-gitlab`.
`ucm diff` n'y figure pas, et `packages/cli/src/` ne porte aucun module de
diff. Le [plan du diff sémantique](../../Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md)
la propose, sous la forme `ucm diff --base <révision> --json <chemin>`, et son
statut est « proposé ».

### 7.5. Les chiffres du plan, revérifiés

| Affirmation | Vérifiée |
|---|---|
| `Button.structure.view` vaut `st3`, qu'aucune entrée de `variantViews` ne désigne | Oui : les sept entrées désignent `st1` ou `st2` |
| `icons.skull.slot` de `StressTest` ne situe pas l'icône, que `viewIcons.ic1` place en `["icon", "icon"]` | Oui |
| `stateModel.precedence` de `Button` vaut `disable, press, focus, hover, default` | Oui |
| Cinquante-quatre couples de fuite de cascade, répartis comme le point 3.4 l'écrit | Oui, au couple près, sur les dix-huit combinaisons de `color` et `variant` |
| Le rayon de la racine dépend du couple variante et état | Oui : seule `st2` porte un rayon, et `disable` emploie `st1` sur `contained`, `st2` sur les deux autres |
| `Button.tsx` fait 33 305 octets | Oui. La table `VARIANTS` en occupe 26 397 et la table `SIZES` 909 ; les retirer laisse 5 989 octets |
| Quarante-six props cumulées sur les onze enfants de `StressTest` | Oui : `Alert` cinq, `Button` neuf trois fois, `TileLink` deux sept fois |
| Douze chemins de texte distincts sur `StressTest` | Oui, et les quinze chemins du corpus portent tous une valeur d'échantillon |
| `bilanEstBloquant` ne retient que cinq états | Oui |
| La parité est rendue sous l'en-tête « Avertissement, jamais blocage » | Oui |
| `ucm icons` sort toujours zéro | Oui |
| Aucun champ du schéma ne nomme un élément | Oui |

### 7.6. Ce que ce second relevé ouvre

Un point nouveau, que le plan doit trancher plutôt que résoudre. L'écriture par
défaut de l'aide `composant` demande que « le fichier transcrit le contrat en
constantes ». Un repository compilé ne transcrit plus rien à la main. Le
catalogue d'aides et le module se contrediraient donc sur ce point, et la
contradiction se referme par une décision, pas par une lecture.
