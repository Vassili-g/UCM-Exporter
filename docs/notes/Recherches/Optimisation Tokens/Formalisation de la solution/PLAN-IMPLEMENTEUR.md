# Plan de l'implémenteur de contrats

> Statut : proposé, prémisses vérifiées. Ce plan décrit un module installable
> qui produit le code d'un composant depuis son contrat, puis le met à jour
> quand un nouveau contrat arrive.
>
> Ce qu'il doit aux autres documents : l'[étude de génération à
> froid](../Recherches/ETUDE-GENERATION-A-FROID.md) classe les architectures,
> le [comparatif des offres](../Recherches/COMPARATIF-MODELES-OFFRES.md) chiffre
> les fournisseurs, le [rapport de coût](../Recherches/RAPPORT-COUT-GENERATION.md)
> mesure ce que coûte le chemin actuel, et l'[audit des
> prémisses](../Recherches/AUDIT-PREMISSES-IMPLEMENTEUR.md) porte les preuves
> de code citées ici.
>
> Aucune génération n'a été exécutée pour l'écrire. Les décomptes de questions
> du §4.2 sont des mesures sur les quatre contrats du Playground ; les chiffres
> du §13 sont des projections tarifaires. Le [banc](./BANC-HYPOTHESES.md)
> remplace les secondes par des mesures.
>
> Les décisions qui appartiennent à l'architecte sont rassemblées au §17 et
> rappelées par la mention **[Décision N]** à l'endroit où elles se posent.

## 0. Ce que la vérification a déplacé

Quatre résultats de la vérification changent le dimensionnement du module, et
il vaut mieux les lire avant le reste.

| Résultat | Où il est établi | Ce qu'il déplace |
|---|---|---|
| Les 29 aides du kit et les 21 caractéristiques de contrat sont déjà la spécification d'émission d'un adaptateur | §3.2 | Le module n'invente aucun catalogue de capacités : il en implémente un qui existe, est versionné et se personnalise par repository |
| Les échantillons portent déjà, validée par un contrôle bloquant, une réponse candidate à chaque question de composition | §4.2 | Le décompte des questions du corpus tombe de 75 à 39 avec une seule convention |
| Les 19 questions de composition qui restent portent toutes sur une prop d'icône dont le contrat de l'enfant nomme le repli | §4.2 | Une seconde convention les ferme toutes : 39 tombe à 20 |
| `ucm diff` n'existe pas, et le cycle de mise à jour n'en a pas besoin | §8.3 | Le lot du cycle de mise à jour perd sa dépendance au plan du diff sémantique |

La conséquence d'ensemble : sur le corpus mesuré, ce que le modèle décide se
réduit à une question d'hôte par composant et une question d'état sur `Button`.
Le module reste utile ; le modèle y devient marginal. Le travail porte sur le
compilateur, sur les conventions et sur la porte, dans cet ordre.

## 1. Le besoin

### 1.1. Qui s'en sert

Deux équipes touchent UCM, et le module ne leur rend pas le même service.

| Utilisateur | Ce qu'il fait aujourd'hui | Ce que le module lui rend |
|---|---|---|
| L'équipe du design system, sur le Playground | Écrit les composants à la main contre le contrat, et éprouve toute la chaîne | Le code mécanique cesse d'être écrit à la main, et la relecture porte sur les décisions |
| L'équipe consommatrice, qui reçoit des contrats par demande de fusion | Reçoit des contrats, sans tokens ni chaîne d'intégration | Une commande qui compile un contrat reçu, sans clé d'API et sans changer son geste |

Le second cas fixe une contrainte : le mode hors ligne du §10.6 n'est pas un
repli, il est le mode nominal du seul consommateur qui existe.

### 1.2. Ce que coûte le chemin actuel

Le [rapport de coût](../Recherches/RAPPORT-COUT-GENERATION.md) mesure, pour la
reconstruction de `Button` par un agent dans sa configuration par défaut :
1,33 USD et 1,68 million de tokens facturés. La sortie y pèse 33 % de la
dépense, dont 27 % de réflexion ; le contexte fixe du harnais en pèse 28 %.

Deux faits de cette mesure portent le reste du plan :

- 82 % des octets du contrat de `Button` sont dans `variants`, et
  26 397 octets sur 33 305 de son implémentation de référence sont la
  transcription littérale de ce champ. Le même contenu traverse donc le modèle
  deux fois, à l'entrée et à la sortie ;
- la transcription littérale de tables est le point faible mesuré des modèles.
  Le travail de Haque et al. relève un taux de correspondance moyen qui tombe de
  63 % à cent entrées à 7 % à cinq cents. `Button` en compte quatre-vingt-dix.

### 1.3. Ce que le module doit rendre

| Exigence | Formulation vérifiable |
|---|---|
| Produire le code d'un composant depuis son contrat | Un fichier de style et une coque, acceptés par la porte du §14 |
| Ne jamais inventer une donnée absente | Tout manque sort en `decision_requise` ou `capacite_absente`, jamais en silence |
| Fonctionner sans clé d'API | Le mode hors ligne du §10.6 compile et écrit le jeu de questions |
| Ne pas devenir un second lecteur du format | Toute résolution de renvoi passe par les lecteurs du kit |
| Rester portable entre stacks | L'adaptateur est le seul endroit qui connaisse une technologie |
| Ne porter aucune logique liée au nom d'un composant | La signature d'une question se calcule sur des caractéristiques, jamais sur un nom |

## 2. La décision d'architecture

### 2.1. La règle

L'étude classe au premier rang la compilation de tout ce que le contrat et les
conventions déterminent, et au deuxième rang la compilation partielle avec
complétion des parties manquantes. Ce plan retient les deux, sous une règle qui
change le dimensionnement du reste :

**Le modèle ne rédige pas de code. Il remplit un relevé de décisions.**

Le compilateur énumère les points que ni le contrat, ni les aides, ni les
conventions ne déterminent. Chaque point est une question typée dont le domaine
de réponse est fermé et dérivé du contrat. Le modèle répond par un objet JSON
validé contre un schéma. Le compilateur émet ensuite tout le code, décisions
comprises.

### 2.2. Ce que la règle change

| Conséquence | Mécanisme |
|---|---|
| La sortie du modèle passe de quelques milliers de tokens à quelques dizaines | Une réponse est une suite de valeurs prises dans des énumérations, pas un fichier source |
| L'échec de transcription littérale disparaît | Aucune table de tokens ne traverse le modèle |
| La régénération après un nouveau contrat coûte zéro appel tant que le jeu de questions ne change pas | Le relevé de décisions survit au contrat |
| L'encodage compact du contrat devient sans objet | Le modèle ne lit plus le contrat, et le sixième rang de l'étude perd son sujet |
| L'auto-hébergement perd son seuil de rentabilité | La dépense d'API par composant tombe sous le millième de dollar |

Le relevé de décisions est aussi l'objet que le développeur relit. Pour
`Button`, la relecture porte sur trois lignes au lieu de 289.

### 2.3. Ce que la règle ne résout pas

Deux genres de questions ne sont pas des choix dans une énumération, et le §4.3
les traite à part. Deux domaines dépendent d'une réponse précédente, ce qui
interdit un relevé rempli en un seul appel. Et la règle ne dit rien de la
qualité du compilateur : un compilateur déterministe peut reproduire un défaut
sur tout le corpus, ce que seule la porte du §14 voit.

## 3. Les trois sources qui ferment une décision

Une décision d'implémentation se ferme par le contrat, par une aide du kit, ou
par une convention du repository. Ce qu'aucune des trois ne ferme devient une
question. La ligne qui sépare le compilateur du modèle passe donc ici, et non
dans le contrat seul.

### 3.1. Ce que le contrat détermine

Établi en comparant les quatre contrats du Playground aux quatre
implémentations de référence.

| Champ du contrat | Sortie compilée |
|---|---|
| `props` | Surface publique typée, unions comprises, comme [`generation.mjs`](../../../../../packages/adapter-typescript/src/generation.mjs) le fait déjà pour les enums |
| `props[].default` | La valeur par défaut d'une prop, publiée telle quelle |
| `variants[].tokens` et `variants[].strokes` | Une règle par combinaison, peinture et contour cités par référence de token |
| `rendering.roles` | La propriété de style qui reçoit chaque rôle, et son repli quand il en porte un |
| `structure.sizes` | Les espacements, marges intérieures et rayons de chaque taille |
| `viewStructures` | L'arbre rendu, le flux, l'alignement et les dimensions |
| `viewPaintPlacements` | Le chemin de l'arbre auquel chaque rôle de couleur s'applique |
| `viewTypographies` et `textStyles` | Les propriétés de texte de chaque chemin, et sa troncature |
| `viewIcons` | Le chemin de slots où placer chaque icône, dans la vue du variant |
| `icons` | La taille, la politique, la `visibilityProp`, la `runtimeProp` et le `figmaName` de repli de chaque icône, jamais son emplacement |
| `stateModel.precedence` | L'ordre de résolution des états, du plus fort au plus faible |
| `stateModel.states[].selector` | Le sélecteur de chaque état qui en porte un, pseudo-classe ou sélecteur d'attribut |
| `composes` et `viewComposes` | La présence d'un enfant composé, son calque, sa vue, la cardinalité maximale et la prop qui le masque |
| `propertyBindingDefinitions` | La prop qui pilote `visible`, `characters` ou `mainComponent` sur un calque |
| `ChildStructure.visibilityProp` et `visibilityTargets` | La prop booléenne qui montre ou masque un slot, ou ses descendants désignés |
| `samples` | Les valeurs d'exemple de la galerie, et les réponses candidates du §4.2 |
| `meta.diagnostics` et `meta.coverage` | Les manques rapportés au développeur, commentés à l'endroit du manque |

Le contrat ne détermine ni le comportement, ni les événements, ni
l'accessibilité, ni l'élément qui porte la racine :
[CONCEPT.md](../../../../../CONCEPT.md#3-une-information-un-propriétaire) les
attribue au code. C'est de cette frontière que vient le jeu de questions.

### 3.2. Ce que les aides du kit ferment

Le kit publie 29 aides sous `packages/cli/aides/`, chacune avec trois sections :
son sens, son écriture par défaut et sa preuve.
[`caracteristiquesDuContrat`](../../../../../packages/kit/src/lecteurs/caracteristiques.mjs)
relève les 21 caractéristiques d'un contrat et sélectionne les aides qui
s'appliquent. Une section `## <aide>` de `.ucm/conventions.md` remplace
l'écriture par défaut d'une aide pour ce repository.

Ce dispositif est le catalogue de capacités que le module réclame, et il
existe. Trois conséquences pour le plan :

| Conséquence | Détail |
|---|---|
| Le domaine du genre `fragment` est fermé et se compte sans modèle | C'est l'ensemble des caractéristiques que l'adaptateur déclare ne pas savoir émettre |
| L'ordre d'écriture des règles d'état est déjà tranché | L'aide `etats` demande « du plus faible au plus fort », ce qui revient à parcourir `precedence` à l'envers, puisque ce champ est ordonné du plus fort au plus faible |
| L'état désactivé a déjà sa règle sémantique | L'aide `etats` pose qu'il « vient du booléen applicatif correspondant », sans nommer la prop : la question reste ouverte mécaniquement, avec un domaine d'une seule bonne réponse |

Les caractéristiques que les quatre contrats exercent sont au nombre de dix-huit :
`toujours`, `reference-token`, `liaison-native`, `disposition`, `grille`,
`dimensions`, `dimensions-par-taille`, `position-absolue`, `rotation`,
`peinture`, `contour-border`, `contour-ring`, `typographie`, `icone`, `etats`,
`focus`, `composition`, `echantillon`. Les trois restantes, `troncature`,
`modes` et `couverture-partielle`, sont ouvertes par le format et non exercées
par le corpus.

**[Décision 1]** L'écriture par défaut de l'aide `composant` demande aujourd'hui
que « le fichier transcrit le contrat en constantes ». Un repository compilé ne
transcrit plus rien à la main. Ou bien l'aide gagne une écriture pour les
repositories compilés, ou bien le compilateur est déclaré comme l'exécutant de
l'écriture par défaut existante.

### 3.3. Ce que les conventions du repository ferment

Une convention ferme un genre entier et le retire du jeu de questions. Le §4.2
mesure combien chacune en retire. Elles se rangent en sections de
`.ucm/conventions.md`, que
[`conventions.mjs`](../../../../../packages/cli/src/conventions.mjs) lit déjà.

### 3.4. Trois règles d'adressage qu'un compilateur ne doit pas confondre

Une adresse du contrat se résout contre la vue que le variant désigne, jamais
contre `structure`. Vérifié sur le corpus : `Button.structure.view` vaut `st3`,
et aucune des sept entrées de `variantViews` ne désigne `st3` ; les
quatre-vingt-dix variants emploient `st1` ou `st2`. Le nom de slot `label`
désigne le calque de texte dans `st3` et un cadre dans `st1`. Un compilateur qui
résout une adresse contre `structure` peint donc le mauvais calque.

`viewIcons[].slotPath` est la seule adresse d'une icône. Vérifié : sur
`StressTest`, `icons.skull.slot` vaut `icon` alors que le placement réel est
`["icon", "icon"]` dans `viewIcons.ic1`, sous une vue que `structure.view` ne
désigne pas. Un nom de slot ne sait pas adresser un slot imbriqué.

`variants[].tokens` et `variants[].strokes` décrivent une combinaison en entier,
jamais un écart par rapport à une autre combinaison. Le §7.2 en tire la règle de
cascade.

## 4. Le jeu de questions

### 4.1. Les genres

Une question porte un genre, un domaine fermé, les éléments du contrat qui la
motivent, et l'endroit du code que sa réponse remplit. Le genre est une liste
close ; l'adaptateur fournit le domaine.

| Genre | Question | Domaine | Dépend de |
|---|---|---|---|
| `hote` | Quelle primitive porte la racine du composant | Les primitives que l'adaptateur déclare | Rien |
| `etat` | Qui écrit l'attribut d'un état dont le sélecteur en demande un | Les props booléennes du contrat, plus `pseudo-classe` et `etat-local` | La réponse `hote` |
| `contenu` | Comment un emplacement de texte rejoint l'API publique | `children`, `prop:<nom>`, `fixe` | La convention de nommage du repository |
| `composition` | Avec quelle valeur rendre chaque prop d'un enfant composé | Les valeurs de l'énumération de l'enfant, les props du parent dont les valeurs y sont incluses, et `exposer` | Le contrat de l'enfant, ou son interface réelle en mode `possede` |
| `accessibilite` | Le rôle, les attributs et le clavier de l'hôte retenu | Les recettes que l'adaptateur déclare pour la réponse de `hote` | La réponse `hote` |
| `fragment` | Ce que l'adaptateur ne sait pas compiler | Texte libre, signalé comme capacité absente | Les caractéristiques déclarées de l'adaptateur |

Le genre `visibilite` n'existe pas. Vérifié sur le corpus : tout slot `optional`
porte soit une `visibilityProp` qui le ferme, soit aucune dépendance et aucun
texte, ce qui en fait un dessin que rien ne masque. Sur les quatre contrats, le
compte des slots `optional` sans `visibilityProp` et sans texte est de
cinquante-neuf, et aucun n'ouvre de question.

Les domaines de `etat` et de `accessibilite` dépendent de la réponse `hote` :
leur schéma ne se calcule qu'une fois cette réponse connue. **Un relevé ne se
remplit donc pas en un seul appel.** Le §10.3 en tire la forme du port
fournisseur : deux tours, le premier fermant `hote`.

### 4.2. Le décompte mesuré, sous quatre politiques de conventions

Mesuré sur les quatre contrats du Playground, hors `accessibilite`. Chaque
politique ajoute une convention à la précédente.

| Politique | Convention ajoutée | Alert | Button | TileLink | StressTest | Corpus |
|---|---|---:|---:|---:|---:|---:|
| P0 | Aucune, le contrat seul | 12 | 3 | 1 | 59 | **75** |
| P1 | Un argument d'échantillon valide répond, et un `default` publié répond | 5 | 3 | 1 | 30 | **39** |
| P2 | Une prop d'icône runtime replie sur le `figmaName` que le contrat de l'enfant lui apparie | 3 | 3 | 1 | 13 | **20** |
| P3 | Le nommage des props de contenu | 1 | 2 | 1 | 1 | **5** |

Le détail par genre, sous P0 puis sous P3 :

| Genre | Alert | Button | TileLink | StressTest | Ce qui le ferme |
|---|---:|---:|---:|---:|---|
| `hote` | 1 | 1 | 1 | 1 | Rien dans le format : aucune recherche de `element`, `tag`, `htmlTag`, `semanticRole` ni `host` ne rend quoi que ce soit dans le schéma |
| `etat` | 0 | 1 | 0 | 0 | Les pseudo-classes se ferment seules ; `[disabled]` demande un écrivain |
| `contenu` | 2 | 1 | 0 | 12 | Un chemin de `viewTypographies`, fermé par une convention de nommage |
| `visibilite` | 0 | 0 | 0 | 0 | `visibilityProp`, ou la règle du dessin |
| `composition` sous P0 | 9 | 0 | 0 | 46 | Les props cumulées des enfants, une par instance |
| `composition` sous P2 | 0 | 0 | 0 | 0 | Les deux conventions ci-dessous |
| `fragment` | 0 | 0 | 0 | 0 | Un adaptateur qui déclare les dix-huit caractéristiques du §3.2 |

**Les deux conventions qui ferment la composition.** Elles valent d'être
détaillées, parce qu'elles retirent à elles seules cinquante-cinq des
soixante-quinze questions du corpus.

La première tient à `samples`. Les quatre contrats portent vingt-neuf
occurrences composées, et **toutes** portent un bloc `args`. Ces arguments sont
déjà contrôlés contre le contrat de l'enfant :
[`validerArgs`](../../../../../packages/kit/src/lecteurs/validation-echantillons.mjs)
refuse une clé absente de sa surface publique et une valeur hors de son
énumération, et ce refus bloque, puisqu'il entre dans `bilan.graphe`. Une prop
d'enfant non couverte par l'échantillon et pourvue d'un `default` publié se
ferme par ce défaut. Restent dix-neuf questions sur le corpus.

La seconde tient aux icônes. Les dix-neuf questions restantes portent **toutes**
sur une prop de type `icon`, et chacune est la `runtimeProp` d'une entrée
`icons` du contrat de l'enfant, qui porte le `figmaName` de repli. La règle
« une prop d'icône runtime non fournie replie sur le `figmaName` que le contrat
de l'enfant lui apparie » les ferme toutes les dix-neuf, mécaniquement.

**[Décision 2]** `samples` est déclaré non normatif par
[CONCEPT.md](../../../../../CONCEPT.md#3-une-information-un-propriétaire), et le
module qui le valide écrit lui-même qu'aucun contrôle ne le compare au code. Une
convention qui en fait une réponse lui donne une autorité que le concept ne lui
donne pas. Trois issues : l'échantillon répond et le relevé consigne sa
provenance ; l'échantillon propose et un humain confirme une fois par signature ;
l'échantillon ne répond pas et la composition reste à cinquante-cinq questions.
Le décompte du corpus passe de 20 à 39 ou à 75 selon l'issue.

**[Décision 3]** La convention de nommage des props de contenu ferme quinze
questions et n'existe pas. Elle doit trancher : quel chemin de texte reçoit
`children`, quel nom prennent les autres, et que faire d'une collision avec une
prop booléenne du contrat. Le corpus exerce cette collision : `Button.props.label`
est un booléen de visibilité, et la référence a donné le contenu à `children`.

### 4.3. Ce qui n'est pas un choix dans une énumération

Le §2.1 pose qu'une réponse est une valeur prise dans un domaine fermé. Trois
genres sur six y échappent, et il vaut mieux le dire que de le masquer.

| Genre | Choix fermé | Pourquoi |
|---|---|---|
| `hote` | Oui | La liste des primitives est une donnée de l'adaptateur |
| `etat` | Oui | Les props booléennes du contrat forment une liste finie |
| `composition` | Oui | Les valeurs de l'énumération de l'enfant, plus les props incluses du parent, plus `exposer` |
| `accessibilite` | Oui, sous réserve | Choisir une recette nommée reste une sélection ; le contenu de la recette appartient à l'adaptateur |
| `contenu` | Non, sans convention | La référence répond par des props que le contrat ne publie pas : `titleContent`, `actionButtonProps`, `children`. Nommer une prop nouvelle est une rédaction |
| `fragment` | Non | La réponse est du texte libre, et sort en `capacite_absente` |

Sous P3, `contenu` devient un choix fermé et `fragment` reste la seule sortie
libre du module. **[Décision 4]** Le module accepte-t-il une réponse libre du
modèle sur un `fragment`, ou refuse-t-il de compiler et rend-il
`capacite_absente` en réclamant une capacité d'adaptateur ? La seconde issue
garde la règle du §2.1 intacte au prix d'un composant non produit.

### 4.4. La signature d'une question

Une question porte une signature calculée sur son genre et sur les
caractéristiques du contrat qui la motivent, jamais sur le nom du composant.
Une signature déjà répondue se résout depuis la mémoire, sans appel au modèle.

### 4.5. La mémoire des décisions, et la limite que le corpus lui oppose

La mémoire est un fichier du repository consommateur, `.ucm/decisions-memoire.json`,
relu comme du code. Chaque entrée cite le composant qui l'a établie et la
réponse retenue. Un développeur qui corrige une entrée corrige tous les
composants suivants. Le rapport de génération distingue une réponse reprise de
la mémoire d'une réponse produite par le modèle.

**Le corpus donne un contre-exemple à cette mémoire, et il porte sur le genre le
plus fréquent.** Les trois composants employés répondent différemment à `hote` :
`button`, `a`, `div`. `Button` et `TileLink` portent tous deux un `stateModel`,
un axe de variantes, des icônes et des tokens de peinture, et
`caracteristiquesDuContrat` rend `etats` pour les deux. Ce qui les sépare, la
nature de l'action, n'est écrit nulle part dans le contrat. Une signature
calculée sur les seules caractéristiques les confondrait et reprendrait à tort
une réponse `hote`.

La règle qui en sort : **une entrée de mémoire propose, elle ne répond pas**,
tant que le banc n'a pas mesuré que sa signature détermine sa réponse. La
promotion d'un genre de « proposée » à « résolue » est une mesure de H2, qui
demande cinq composants que le corpus n'offre pas.

**[Décision 5]** Le module livre-t-il la mémoire en proposition seule, ou la
promotion d'un genre est-elle laissée à un réglage du repository ? Dans le
premier cas, l'argument de décroissance des appels ne tient pas avant le banc, et
le §13 garde un appel par composant.

## 5. Le relevé de décisions

```json
{
  "ucmDecisions": 1,
  "component": "Button",
  "contract": { "sha256": "…", "contractVersion": "13.0" },
  "adapter": { "name": "@ucm-kit/adapter-react", "version": "0.1.0" },
  "answers": {
    "hote": { "value": "button", "source": "modele", "model": "gpt-5.6-luna" },
    "etat:disable": { "value": "prop:disabled", "source": "humain" },
    "contenu:label/label": { "value": "children", "source": "convention" }
  },
  "manques": [
    { "genre": "fragment", "chemin": "viewStructures.st2", "raison": "capacité d'adaptateur absente" }
  ]
}
```

`source` prend quatre valeurs : `convention`, `memoire`, `modele`, `humain`. Une
réponse `humain` ne repart jamais au modèle. Le fichier se range à côté du
contrat, sous `Button.decisions.json`, et se commite.

Le schéma de réponse envoyé au modèle est dérivé du jeu de questions : chaque
domaine devient une énumération. Un fournisseur qui ne prend pas en charge la
sortie structurée est refusé avant l'appel, sans repli silencieux sur du texte
libre.

**[Décision 6]** Le relevé se range à côté du contrat, donc dans le repository
consommateur, et il porte le nom du composant. C'est le seul artefact du module
qui nomme un composant. Cela ne contredit pas l'invariant, qui porte sur la
logique du moteur, mais il vaut mieux le poser explicitement que le laisser
découvrir.

## 6. La représentation intermédiaire

L'adaptateur ne lit jamais le contrat. Il reçoit une représentation
intermédiaire que le noyau assemble en appelant les lecteurs du kit.

La représentation assemble deux ensembles, parce que le contrat les sépare :

| Origine | Contenu |
|---|---|
| [`vueExacteDuVariant`](../../../../../packages/kit/src/lecteurs/variant-views.mjs) | Les cinq parties qu'il rend : `structure`, `typography`, `composes`, `icons`, `paintPlacements` |
| Le variant et la racine du contrat | `variants[].tokens`, `variants[].strokes`, `structure.sizes`, `rendering`, `textStyles`, `icons`, `stateModel`, `props`, `samples`, `meta` |

Ce partage est vérifié : le résolveur rend un objet à cinq parties, et les
couleurs et contours d'un variant vivent sur le variant. Une représentation
construite depuis la vue seule ne porterait aucune référence de peinture.

La représentation porte en outre, pour chaque fragment qu'elle décrit, le chemin
du contrat dont il vient. C'est ce lien qui permet à la porte de rattacher un
écart de rendu à un champ.

## 7. L'émission

### 7.1. Les artefacts

Pour une stack qui rend du CSS, l'émission produit cinq artefacts par composant,
et non deux.

| Artefact | Contenu | Propriétaire | Relu |
|---|---|---|---|
| `Button.ucm.css` | Une règle par combinaison de variantes et par taille, sélectionnée par des attributs `data-*` et par les sélecteurs des états | Le compilateur | Non |
| `Button.tsx` | La coque : surface publique, arbre des emplacements, calcul des attributs `data-*` | Le compilateur ou le développeur, selon le §9 | Oui |
| `Button.types.ts` | Les unions des props enum et le type des combinaisons exactes | `generation.mjs`, qui le produit déjà | Non |
| `Button.decisions.json` | Le relevé du §5 | Le compilateur, corrigé à la main | Oui |
| `Button.questions.json` | Le jeu de questions ouvertes, en mode hors ligne seulement | Le compilateur | Oui |

Le découpage retire du JavaScript les quatre-vingt-dix entrées de la matrice de
`Button`. Mesuré : le fichier de référence fait 33 305 octets, dont 26 397 pour
la table `VARIANTS` et 909 pour la table `SIZES`. Retirer ces deux tables laisse
5 989 octets ; retirer en plus la machine à états, qui devient du CSS, laisse
environ 3 900 octets.

### 7.2. La feuille de style

**L'ordre d'écriture.** `stateModel.precedence` est ordonné du plus fort au plus
faible : trois autorités concordent, le commentaire du type, la description du
schéma et la table `STATE_PRECEDENCE` de l'exportateur. L'émission le parcourt
donc à l'envers, ce qui écrit `default` en premier, comme l'aide `etats` le
demande.

**La spécificité.** Une règle d'état s'écrit avec la classe du composant, un
attribut par axe de variantes hors état, et la partie d'état. Un sélecteur
d'attribut et une pseudo-classe pèsent dans la même colonne. Les règles d'état
ont donc entre elles la même spécificité, et celle de `default`, qui ne porte
aucune partie d'état, est plus basse d'un cran. C'est le bon sens. L'axe des
tailles ne collisionne pas : `structure.sizes` écrit `gap`, `padding` et
`radius`, et les états écrivent des peintures et des contours.

**La fuite de cascade, et la règle qui la ferme.** C'est le point qui casse une
émission naïve. La référence choisit une entrée entière : elle résout l'état par
`precedence`, puis lit le bloc complet de cette combinaison. La cascade fusionne
propriété par propriété : un état fort qui déclare moins qu'un état faible laisse
passer les valeurs du faible.

Mesuré sur les dix-huit combinaisons de `color` et `variant` de `Button` :
cinquante-quatre couples de ce genre.

| Couple, du plus faible au plus fort | Propriété qui fuit | Combinaisons |
|---|---|---:|
| `focus` vers `disable` | contour `ring` | 18 |
| `press` vers `disable` | contour `ring` | 18 |
| `hover` vers `disable` | peinture `background` | 6 |
| `focus` vers `disable` | peinture `background` | 6 |
| `press` vers `disable` | peinture `background` | 6 |

Le cas vérifiable à la main : sur `primary` et `variant: "text"`, l'entrée
`hover` déclare `background` et `foreground`, l'entrée `disable` déclare
`foreground` seul. Sur un hôte `button`, un élément désactivé reste survolé : le
bouton désactivé garderait le fond du survol.

**Règle :** chaque règle d'état redéclare toute propriété que n'importe quelle
autre règle du même groupe peut écrire, avec une valeur de remise à zéro quand le
contrat n'en donne pas. Une entrée de `variants[]` décrit sa combinaison en
entier, jamais un écart.

**La même règle vaut pour la forme de la racine.** Vérifié : `focus` et `press`
emploient une vue dont la racine porte `radius: "{layouts.radius.md}"`, `default`
et `hover` emploient une vue qui n'en porte aucun, et `disable` emploie l'une ou
l'autre selon la variante. Une règle qui n'écrit rien laisse le rayon de l'état
précédent.

**Un état dont le nom est inconnu.** L'exportateur donne une chaîne vide à un
état hors de sa table et le range en queue de `precedence`. L'émission inversée
l'écrirait juste après `default`, avec le même sélecteur, et il écraserait
`default` sur toutes les combinaisons. Le corpus n'en porte aucun, et le schéma
n'impose aucune énumération à `selector` : le cas est ouvert par le format et le
compilateur doit le refuser plutôt que l'émettre.

**Un sélecteur que l'hôte ne porte pas.** `[disabled]` sur un hôte `a` reste du
CSS valide, s'analyse et ne s'applique jamais. Aucun contrôle du kit ne
rapproche un sélecteur d'un hôte : le seul module qui lise `selector` y cherche
la sous-chaîne `:focus` pour décider d'imprimer une aide. Sur un tel hôte,
dix-huit des quatre-vingt-dix variants de `Button` ne se rendraient jamais, en
silence. La porte de conformité de rendu est le seul contrôle qui puisse le voir.

### 7.3. La coque

La coque publie la surface du contrat, monte l'arbre des emplacements de la vue
du variant, calcule les attributs `data-*` qui sélectionnent la règle, et rend
les enfants composés. Elle ne porte aucune valeur de rendu.

Pour la composition, l'aide `composition` donne la règle d'émission : une
occurrence écrite par position de la cardinalité maximale de `composes`,
conditionnée par la vue courante, une occurrence absente d'une vue se
neutralisant sur place. L'ordre d'émission est le tri topologique du graphe, dont
[`validation-graphe-contrats.mjs`](../../../../../packages/kit/src/lecteurs/validation-graphe-contrats.mjs)
garantit l'acyclicité, et qui donne sur le corpus `Button`, `Alert`, `TileLink`,
`StressTest`.

L'appel d'un enfant désigne le composant par `codeIdentifier(component)`, celui
que la parité compte et dont le graphe refuse les collisions. L'intérieur de
l'enfant appartient à son contrat ; le cadre qui enveloppe l'instance appartient
au parent, qui publie son flux.

### 7.4. Les modes de tokens

Le compilateur émet des références `var(--…)`, et
[`ucm tokens css`](../../../../../packages/cli/src/tokens-css.mjs) écrit la
feuille qui les résout, modes compris. Pour une stack CSS, le support des modes
est donc gratuit et n'ouvre aucune question. Pour une stack sans CSS, `modes`
devient une caractéristique que l'adaptateur déclare savoir émettre ou non.

### 7.5. Une stack sans CSS

Une stack sans CSS reçoit la même représentation intermédiaire et une autre
émission : une table de valeurs et un sélecteur explicite. L'adaptateur déclare
laquelle des deux formes il produit.

**[Décision 7]** L'émission CSS est-elle la forme retenue pour les adaptateurs
web ? Elle porte le gain principal du §7.1 et elle rend les états sans machine à
états. La forme « table et sélecteur » reproduit la référence actuelle et ne
retire rien du JavaScript.

## 8. Le cycle de mise à jour

### 8.1. Les quatre cas

Un nouveau contrat arrive. La commande recompile et classe le changement.

| Cas | Ce qui a changé | Appels au modèle |
|---|---|---|
| Mécanique | Variants, tokens, vues, tailles ; le jeu de questions est identique | Aucun |
| Question nouvelle | Une prop, un emplacement ou un état apparaît | Les seules questions nouvelles |
| Réponse orpheline | Une prop ou un emplacement disparaît | Aucun ; la réponse est retirée et consignée |
| Réponse invalide | Le domaine d'une question a changé et la réponse stockée n'y figure plus | Cette seule question, signalée en tête du rapport |

Le premier cas couvre le réexport ordinaire d'un design system : une couleur
change dans Figma, le code se régénère sans dépense.

### 8.2. Les dépendants

Un cinquième déclencheur porte sur les voisins. Un changement confiné à
`Button.contract.json` ne touche pas `Alert.contract.json` : le parent resterait
dans le cas « Mécanique », sans recompilation, alors que ses réponses de
composition peuvent être devenues invalides. Un contrat qui change recompile donc
ses dépendants, trouvés en inversant le graphe de `composes`. Sur le corpus,
toucher `Button` recompile `Alert` et `StressTest`.

### 8.3. Ce dont ce cycle ne dépend pas

La commande `ucm diff` n'existe pas. Le
[plan du diff sémantique](../../Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md) la
propose, sous la forme `ucm diff --base <révision> --json <chemin>`, et son
exécution n'a pas commencé.

Le cycle de mise à jour n'en a pas besoin. Les quatre cas se décident en
comparant deux objets que le compilateur produit lui-même : le jeu de questions
de l'ancien contrat et celui du nouveau. Le diff sémantique reste utile au
rapport lisible par un humain, et il devient une amélioration, non une
dépendance.

**[Décision 8]** Le lot du cycle de mise à jour attend-il le diff sémantique
pour son rapport, ou sort-il avec un rapport calculé sur les jeux de questions
seuls ?

## 9. Les deux modes de propriété du fichier

Le corpus existant a été écrit à la main. Un fichier généré ne peut pas les
remplacer sans décision du mainteneur. Deux modes coexistent, déclarés dans
`.ucm/implementeur.json` par composant.

| Mode | Écriture | Mise à jour |
|---|---|---|
| `genere` | Le compilateur possède le fichier, qui porte un en-tête de non-édition | Réécriture intégrale |
| `possede` | Le développeur possède le fichier | Remplacement exact des fragments mécaniques |

Le mode `possede` exploite un fait vérifié du corpus : la table `VARIANTS` de
`Button.tsx` est la transcription littérale de `variants[]`, délimitée et
repérable. Le compilateur produit le fragment attendu pour l'ancien contrat et
pour le nouveau, puis remplace le premier par le second. Un remplacement exact
échoue quand le développeur a modifié le fragment ; l'échec seul déclenche un
appel au modèle, avec les deux fragments et la zone concernée.

Le mode `possede` a une conséquence sur la composition. La parité contrat contre
code ne bloque rien : elle est rendue sous l'en-tête « Avertissement, jamais
blocage », et `bilanEstBloquant` ne la compte pas. Un enfant en mode `possede`
peut donc publier une interface qui s'écarte de son contrat sans que rien ne
refuse la fusion. Quand l'enfant est en mode `possede`, le domaine d'une
question de composition se lit sur son interface publique réelle, que
[`lireApiPublique`](../../../../../packages/adapter-typescript/src/parite.mjs)
sait déjà rendre, et non sur son contrat. C'est ce cas, et lui seul, qui impose
l'ordre topologique à l'émission.

**[Décision 9]** Quel mode par défaut pour les composants existants ? Le mode
`genere` porte le gain du §7.1 et demande que l'équipe accepte de ne plus
éditer ces fichiers. Le mode `possede` ne retire rien du JavaScript et garde la
main au développeur.

## 10. Le module et ses ports

### 10.1. L'arborescence

Le paquet rejoint le monorepo, à côté du kit dont il lit les contrats. La
commande `ucm implement` de la ligne de commande n'en est que la façade, sans
second orchestrateur.

```text
packages/implementer/
  src/
    noyau/
      orchestrateur.mjs     la boucle bornée, les budgets et le verdict
      dossier.mjs           le dossier de génération : contrat résolu, aides retenues, conventions, capacités
      representation.mjs    l'assemblage du §6, par appel aux lecteurs du kit
      questions.mjs         l'énumération des questions et leur signature
      memoire.mjs           les décisions déjà prises, et leur provenance
      decisions.mjs         la forme d'un relevé, sa validation contre un jeu de questions
      schema-reponse.mjs    le schéma dérivé du jeu de questions
      provenance.mjs        le lien entre un fragment émis et son chemin dans le contrat
      journal.mjs           usage brut, tokens normalisés, prix appliqué, empreintes
    ports/
      adaptateur.mjs        le port qu'un adaptateur de stack implémente
      adaptateur-externe.mjs le même port, par échange JSON sur l'entrée standard
      fournisseur.mjs       le port d'un fournisseur de modèle
      verificateur.mjs      le port de la porte d'acceptation
    fournisseurs/
      messages.mjs  responses.mjs  chat-completions.mjs  gemini.mjs
    cli.mjs
```

**[Décision 10]** Le paquet vit-il dans le monorepo ou dans un repository
séparé, et sous quel nom publié ? Le nom npm `ucm` appartient à un tiers ; le
préfixe `@ucm-kit/` est celui des paquets existants.

### 10.2. Le port adaptateur

| Message | Entrées | Sorties |
|---|---|---|
| `capacites` | Rien | Les caractéristiques du §3.2 que l'adaptateur sait émettre, les primitives qu'il déclare, la forme d'émission du §7.5 |
| `domaines` | Le jeu de questions, les réponses déjà connues | Le domaine de chaque question, y compris ceux qui dépendent de `hote` |
| `emettre` | Représentation intermédiaire, conventions, relevé de décisions | Les artefacts du §7.1, avec leur provenance |
| `controler` | Les artefacts émis | Les contrôles propres à la stack |

L'adaptateur existant, `@ucm-kit/adapter-typescript`, publie trois fonctions et
sert la parité. Il est découvert par
[`adaptateur.mjs`](../../../../../packages/cli/src/adaptateur.mjs) sous un nom
codé en dur, depuis la racine contrôlée. Le port ci-dessus est plus large, et un
adaptateur de rendu est une autre famille : `@ucm-kit/adapter-typescript` type,
`@ucm-kit/adapter-react` rendrait.

**[Décision 11]** Le port de rendu s'ajoute-t-il au paquet existant, ou un
second paquet le porte-t-il ? Et la découverte passe-t-elle d'un nom codé en dur
à un nom lu dans `.ucm/implementeur.json` ?

### 10.3. Le port fournisseur

| Entrées | Sorties |
|---|---|
| Dossier de questions, schéma de réponse, budget | Relevé de décisions, usage brut, motif d'arrêt, identifiant exact du modèle servi |

Le port procède en deux tours, parce que les domaines de `etat` et
`accessibilite` dépendent de `hote`. Le premier tour ne pose que les questions
dont le domaine ne dépend de rien ; le second pose le reste, une fois `hote`
connu. Un fournisseur qui ne prend pas en charge la sortie structurée est refusé
avant l'appel.

### 10.4. Le port vérificateur

| Entrées | Sorties |
|---|---|
| Artefacts émis, contrat, feuille de tokens | Verdict structuré, erreurs localisées, artefacts de preuve |

Aucune valeur attendue par ce port ne passe par le code de transformation du
compilateur : un défaut commun rendrait un test vert sur un rendu faux. Le §14
en détaille les contrôles.

### 10.5. Les verdicts

Le résultat d'une exécution prend quatre valeurs : `accepte`,
`decision_requise`, `capacite_absente`, `echec`. Un budget atteint rend `echec`,
jamais `accepte`.

### 10.6. Le mode hors ligne

Sans clé d'API, le module compile tout ce qu'il peut, écrit le jeu de questions
dans `Button.questions.json` et rend `decision_requise`. Un développeur répond
une fois, la mémoire retient, et le composant suivant qui porte les mêmes
signatures se compile sans question.

Ce mode n'est pas un repli. Sous la politique P2 du §4.2, le corpus entier
demande vingt réponses, et sous P3 il en demande cinq. Un repository peut donc
adopter le module et ne jamais choisir de fournisseur. C'est ce que le seul
consommateur existant, qui reçoit des contrats sans chaîne d'intégration,
obtiendrait le premier.

## 11. Plusieurs stacks

L'adaptateur est le seul endroit qui connaisse une technologie. Deux formes de
raccordement.

**Dans le processus.** Un paquet npm que le repository installe, découvert
depuis la racine contrôlée. Premier adaptateur visé : React.

**Hors du processus.** Un exécutable que `.ucm/implementeur.json` désigne. Le
noyau lui envoie des messages JSON sur l'entrée standard et lit ses réponses sur
la sortie standard. Les quatre messages du §10.2 suffisent. Un adaptateur écrit
en Python, en Go ou en Kotlin implémente ce protocole sans dépendre de Node.

La preuve de portabilité demande deux adaptateurs de familles différentes. La
proposition retient React dans le processus, puis un adaptateur hors processus
qui émet des composants web sans framework.

**Ce second adaptateur ne réutilise pas tout le fichier CSS du premier.** Un
élément personnalisé ne porte ni l'attribut `disabled` d'un contrôle de
formulaire, ni le comportement de focus d'un `button`. Les règles indexées par
les attributs `data-*` restent partagées ; les règles d'état ne le sont que si
les deux adaptateurs répondent `hote` à l'identique. L'écart à mesurer porte
donc sur les règles d'état, et non sur la coque seule.

## 12. Installation et intégration

```sh
# Repository Node
npm i -D @ucm-kit/implementer @ucm-kit/adapter-react
npx ucm implement init
npx ucm implement src/components/Button/Button.contract.json

# Repository sans Node : exécutable autonome ou conteneur
ucm-implement src/components/Button/Button.contract.json
```

`ucm implement init` écrit `.ucm/implementeur.json`, une mémoire vide, un
squelette de conventions et le fichier de la chaîne d'intégration continue. Il
n'écrase aucun fichier existant, comme `ucm init`.

| Réglage | Emplacement | Contenu |
|---|---|---|
| Adaptateur, mode par composant, budgets | `.ucm/implementeur.json` | Aucun secret |
| Fournisseur et modèle exact | `.ucm/implementeur.json` | Identifiant de modèle, région, mode de raisonnement |
| Clé d'API | Variable d'environnement | Jamais dans le repository |
| Conventions du repository | `.ucm/conventions.md` | Les sections d'aides que la commande lit déjà |

L'intégration continue ajoute un travail déclenché par un changement de contrat.
Il recompile, lance la porte, et ouvre une demande de fusion dont le corps porte
le diff du relevé de décisions, le diff du code émis et le rapport de la porte.
Le consommateur qui pousse ses contrats vers une branche d'intégration par
demande de fusion reçoit ce travail sur son chemin existant, sans changer le
geste du designer.

Aucun serveur n'est nécessaire. Un serveur MCP resterait un raccordement
facultatif vers un agent externe, sans rôle dans le fonctionnement du noyau.

## 13. Le modèle, son réglage et son prix

La tâche demandée au modèle est un choix dans des énumérations, avec une sortie
structurée et sans exploration de fichiers. Elle ne demande ni long
raisonnement, ni fenêtre de contexte étendue. Le premier réglage proposé est
donc un modèle économique à raisonnement désactivé, avec Sonnet 5 en témoin pour
relier les mesures à la campagne existante.

| Poste | Volume estimé | Origine de l'estimation |
|---|---|---|
| Préfixe partagé mis en cache | 3 000 tokens | Procédure, capacités de l'adaptateur, conventions, schéma de réponse |
| Suffixe par composant | 150 à 900 tokens | Identité, axes, états, emplacements, dépendances, `intent.usage`, une ligne de preuve par question |
| Sortie | 20 à 300 tokens | Une à treize réponses prises dans des énumérations, selon la politique de conventions |

Projection de dépense pour un composant de la taille de `Button`, cache chaud,
un appel, sans réparation :

| Configuration | Dépense projetée | Tokens facturés projetés |
|---|---|---|
| GPT-5.6 Luna, effort `none` | 0,0003 USD | 3 520 |
| Mistral Small 4 | 0,0002 USD | 3 520 |
| Sonnet 5 témoin | 0,0026 USD | 3 520 |
| Mémoire complète, aucune question ouverte | 0 USD | 0 |
| Mode hors ligne | 0 USD | 0 |

Le rapport de coût mesure 1,33 USD et 1,68 million de tokens pour le même
composant dans l'architecture actuelle. Le rapport des deux colonnes vaut
environ 4 400 en dépense et 480 en tokens. Ces nombres sont des projections
calculées sur les tarifs publiés et sur une taille de dossier estimée. Ils
excluent le développement du compilateur, l'exécution de la porte, les
réparations et les échecs.

Trois propriétés de cette répartition comptent plus que le choix du modèle :

- la part variable du dossier est si petite que le prix du million de tokens
  cesse de décider. Le classement des modèles se fait alors sur le taux de
  réponse correcte, mesuré par le banc ;
- sous la politique P2 du §4.2, le corpus entier tient en vingt questions. La
  campagne de comparaison des modèles y perd son sujet : vingt réponses ne
  classent pas huit fournisseurs ;
- l'auto-hébergement, l'affinage d'un petit modèle et la compression de prompt
  perdent tous leur assiette pour la même raison.

**[Décision 12]** La campagne de comparaison des modèles garde-t-elle son rang,
ou passe-t-elle après l'extension du corpus ? Vingt questions sur quatre
composants ne départagent pas des modèles, et le corpus ne s'étend qu'en
exportant des contrats depuis la bibliothèque du consommateur, qui n'en porte
aucun.

**[Décision 13]** Quel plafond de dépense par composant s'inscrit dans le relevé
de référence, et que fait le module quand il l'atteint ?

## 14. La porte d'acceptation

La porte décide seule de l'acceptation. Aucune de ses valeurs attendues ne passe
par le code de transformation du compilateur.

| Contrôle | Ce qu'il oppose au code | État vérifié |
|---|---|---|
| `ucm check` | Forme du contrat, graphe de composition, références de tokens | Existe. `bilanEstBloquant` ne retient que cinq états : fichier illisible, champs absents, version hors fenêtre, erreurs de graphe, types typographiques |
| Contrôle de types de la stack | Surface publique attendue par les consommateurs | Existe |
| `ucm icons` | Rien du code : elle collecte les `figmaName` des contrats et sort toujours zéro | Existe, sans verdict |
| Parité d'API | `props` contre l'interface publique émise, sept écarts relevés | Existe en avertissement qui ne refuse rien |
| Conformité de rendu | Style calculé de chaque variant contre la valeur du contrat, résolue par `ucm tokens css` | À construire, cadré par le [plan de conformité](../../Linter%20Dev/PLAN-CONFORMITE-RENDU.md) |
| Mutations | La porte rougit quand une référence de token, un variant ou un contour est altéré | À construire |
| Manques | Questions répondues par un fragment libre, diagnostics d'export, couverture partielle | À construire |

**Trois de ces contrôles existent sans refuser.** Une porte qui agrège les
contrôles existants hérite donc de trois silences, et doit rendre son propre
verdict.

**Ce que la porte ne voit pas aujourd'hui.** La lecture du code, altération par
altération, annonce qu'aucun des six cas du banc ne serait vu, sauf le retrait
d'un emplacement d'icône sur un seul des trois composants, et par un contrôle
qui avertit sans bloquer. Cette lecture reste une lecture : rien n'a rougi pour
de vrai, et c'est la mesure H4 qui tranche.

**La part de la matrice hors de portée d'une porte sans navigateur.**
Soixante-douze des quatre-vingt-dix variants de `Button` portent un état autre
que `default`, et deux des quatre de `TileLink`. Une porte qui n'atteint pas les
états d'interaction laisse donc quatre-vingts pour cent de la matrice de
`Button` hors de sa portée.

La conformité de rendu lit les valeurs attendues par un second chemin : les
références du contrat résolues contre la feuille produite par `ucm tokens css`.
La capture vise la racine rendue, `style` et `script` exclus. Une capture ratée
reste un échec de mesure.

## 15. L'ordre des lots

| Lot | Contenu | Dépense de modèle |
|---|---|---|
| 0 | [Banc d'hypothèses](./BANC-HYPOTHESES.md) : couverture mécanique, jeu de questions, mutations | Nulle |
| 1 | Les trois conventions du §4.2, écrites dans `.ucm/conventions.md` et dans les aides | Nulle |
| 2 | Représentation intermédiaire, compilateur, adaptateur React, émission CSS, mode hors ligne | Nulle |
| 3 | Conformité de rendu et mutations | Nulle |
| 4 | Relevé de décisions, mémoire, schéma de réponse, port fournisseur | Faible |
| 5 | Cycle de mise à jour et intégration continue | Faible |
| 6 | Adaptateur hors processus, exécutable autonome, conteneur | Nulle |
| 7 | Extension du corpus, puis campagne de comparaison des modèles | Selon la campagne |

Deux changements par rapport au découpage précédent. Les conventions passent
devant le compilateur, parce que ce sont elles qui décident du nombre de
questions et donc du dimensionnement du port fournisseur. Et le port fournisseur
passe derrière la porte, parce qu'un taux d'acceptation mesuré par une porte
aveugle ne classe rien.

Les lots 0 à 3 ne dépensent aucun token et portent l'essentiel du résultat.

## 16. Les risques

| Risque | Signe à surveiller | Parade |
|---|---|---|
| La couverture mécanique est plus basse que prévu | Beaucoup de questions `fragment` sur le corpus | Le banc la mesure avant tout développement ; sous le seuil, le plan revient à la compilation partielle de l'étude. **[Décision 14]** fixe ce seuil, et le banc demande qu'il soit posé avant la première exécution : un seuil déplacé après coup ne juge plus rien |
| Le compilateur reproduit systématiquement un défaut | Un écart de rendu présent sur tous les composants | Porte indépendante et mutations, dont le lot 3 |
| Une entrée de mémoire est reprise à tort | Un composant accepté dont le comportement ne correspond pas à son archétype | La mémoire propose et ne répond pas, tant que H2 n'a pas mesuré la signature du genre |
| L'échantillon devient normatif par la porte de service | Un rendu qui suit l'échantillon contre le contrat | La convention du §4.2 porte sur les props d'un enfant, jamais sur une valeur de rendu, que l'échantillon ne contient pas |
| Le mode `genere` est refusé par l'équipe | Des modifications à la main dans un fichier généré | Mode `possede` avec remplacement exact des fragments mécaniques |
| L'émission CSS ne couvre pas une stack native | Un adaptateur qui ne sait pas produire de feuille | La représentation intermédiaire porte les deux formes ; l'adaptateur déclare la sienne |
| Le module devient un second lecteur du format | Une résolution de renvoi écrite hors du kit | Le noyau appelle les lecteurs du kit ; un test refuse un second résolveur |
| Le module et les aides divergent | Une écriture par défaut d'aide que l'adaptateur n'applique pas | La caractéristique est la clé commune ; un test oppose les capacités déclarées au catalogue du kit |

## 17. Les décisions qui appartiennent à l'architecte

| N | Décision | Où elle se pose | Ce qu'elle change |
|---|---|---|---|
| 1 | L'aide `composant` gagne-t-elle une écriture pour les repositories compilés, ou le compilateur exécute-t-il l'écriture existante ? | §3.2 | La cohérence entre le catalogue d'aides et le module |
| 2 | Un argument d'échantillon valide répond-il à une question de composition, propose-t-il, ou ne compte-t-il pas ? | §4.2 | Le décompte du corpus : 20, 39 ou 75 questions |
| 3 | Quelle convention de nommage pour les props de contenu, et que faire d'une collision avec une prop booléenne ? | §4.2 | Quinze questions, et le genre `contenu` devient ou non un choix fermé |
| 4 | Un `fragment` accepte-t-il une réponse libre du modèle, ou rend-il `capacite_absente` ? | §4.3 | La règle du §2.1 tient ou plie |
| 5 | La mémoire propose-t-elle seulement, ou un réglage permet-il de promouvoir un genre ? | §4.5 | L'argument de décroissance des appels, et le risque de reprise à tort |
| 6 | Le relevé de décisions nommé d'après le composant est-il accepté comme seul artefact du module qui nomme un composant ? | §5 | Un point de friction avec l'invariant, à poser plutôt qu'à découvrir |
| 7 | L'émission CSS est-elle la forme retenue pour les adaptateurs web ? | §7.5 | Le gain de taille du fichier relu, et la façon dont les états se rendent |
| 8 | Le cycle de mise à jour attend-il le diff sémantique pour son rapport ? | §8.3 | Une dépendance de lot, et la lisibilité du rapport |
| 9 | Quel mode par défaut pour les composants existants, `genere` ou `possede` ? | §9 | Ce que l'équipe accepte de ne plus éditer |
| 10 | Le paquet vit-il dans le monorepo ou à part, et sous quel nom publié ? | §10.1 | La publication et la découverte |
| 11 | Le port de rendu s'ajoute-t-il au paquet d'adaptateur existant, et la découverte devient-elle configurable ? | §10.2 | Une rupture de forme dans un paquet publié |
| 12 | La campagne de comparaison des modèles garde-t-elle son rang, ou passe-t-elle après l'extension du corpus ? | §13 | L'ordre des lots et le budget de campagne |
| 13 | Quel plafond de dépense par composant, et quel comportement à l'atteinte ? | §13 | Le verdict d'une exécution qui déborde |
| 14 | Quel seuil de couverture mécanique sous lequel le lot 2 est abandonné au profit de la compilation partielle ? | §16 | La règle d'arrêt du banc |

## 18. Ce que la mesure ne tranche pas

| Point | Ce qui manque pour le trancher |
|---|---|
| Le genre `accessibilite` porte-t-il une question | Un adaptateur qui déclare ses recettes. Si l'adaptateur en déclare une par primitive, le genre se replie sur `hote` et n'ajoute rien |
| La répétition des signatures | Cinq composants, que le corpus n'offre pas. Le contre-exemple du §4.5 porte sur `hote` seul |
| La fuite de cascade se voit-elle à l'écran | Un rendu. Les cinquante-quatre couples sont une propriété du contrat ; leur visibilité dépend de la joignabilité de chaque paire d'états sur l'hôte retenu |
| Ce que la porte voit vraiment | Un harnais qui altère et relance. La lecture de code annonce ce que la porte peut voir, pas ce qu'elle verra |
| Le décompte de `fragment` hors du corpus | Les trois caractéristiques que le corpus n'exerce pas, et celles qu'un design system plus large exercerait |
| La durée de relecture | Deux relecteurs et un composant, mesure du banc, qui décide du mode par défaut du §9 |
