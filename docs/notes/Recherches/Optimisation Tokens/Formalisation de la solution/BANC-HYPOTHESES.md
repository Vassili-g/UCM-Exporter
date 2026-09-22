# Banc d'hypothèses de l'implémenteur

> Statut : proposé. Ce banc est le premier lot du
> [plan de l'implémenteur](./PLAN-IMPLEMENTEUR.md). Il mesure les hypothèses
> dont dépend le dimensionnement du module, avant d'écrire le module.
>
> L'[audit des prémisses](../Recherches/AUDIT-PREMISSES-IMPLEMENTEUR.md) a déjà
> lu le corpus et le code. Il déplace le sens de H1a, de H2 et de H4, et fournit
> à chacune une prédiction que la mesure confirme ou refuse.
>
> Une partie de H2 est déjà mesurée. Le §4.2 du plan donne le décompte des
> questions du corpus sous quatre politiques de conventions, et le point 7 de
> l'audit en porte les relevés. Ce banc garde de H2 ce qui reste ouvert : la
> répétition des signatures.

## 1. Pourquoi mesurer d'abord

Le plan repose sur une hypothèse centrale : la part du code d'un composant que
le contrat et les conventions déterminent est assez grande pour que le modèle
n'ait plus qu'à choisir dans des énumérations. Si cette part est basse, le jeu
de questions grossit, les réponses redeviennent du code libre, et le plan
retombe sur la compilation partielle déjà décrite par
l'[étude](../Recherches/ETUDE-GENERATION-A-FROID.md).

Cette part se mesure sur le corpus existant sans appeler aucun modèle. C'est la
mesure la moins chère du projet et celle qui décide du reste.

Le banc mesure aussi ce que les contrôles actuels laissent passer. L'étude
relève des défauts dans le vérificateur de la campagne précédente : tant qu'une
porte n'a pas rougi sur des altérations connues, un taux d'acceptation ne
prouve rien.

## 2. Les hypothèses et leur prédicat

| Clé | Hypothèse | Prédicat proposé | Dépense de modèle |
|---|---|---|---|
| H1a | Le code de rendu des composants de référence est attribuable au contrat | Part des déclarations de rendu attribuées supérieure à 80 %, relevée composant par composant | Nulle |
| H1b | Un compilateur reproduit ce rendu | Style calculé identique au composant de référence sur chaque variant, chaque taille et chaque mode | Nulle |
| H2 | Le jeu de questions est petit et se répète | Mesuré pour la taille : 75 questions sur le corpus sans convention, 20 sous la politique P2 du plan. Reste à mesurer : la répétition des signatures, qui demande cinq composants que le corpus n'offre pas | Nulle |
| H3 | Un modèle économique répond correctement | Réponse exacte sur plus de 95 % des questions, réponses de référence tirées du corpus | Quelques centièmes de dollar |
| H4 | La porte rougit sur une altération | Aucune altération non détectée, et le contrôle qui la voit rend un verdict qui refuse la fusion | Nulle |
| H5 | Une mise à jour mécanique ne coûte aucun appel | Aucun appel sur les changements qui ne touchent pas le jeu de questions | Nulle |
| H6 | La relecture par un développeur raccourcit | Durée relevée sur le relevé de décisions et le diff émis, contre la relecture du fichier écrit à la main | Nulle |

Les seuils sont des propositions. Le mainteneur les fixe avant la première
exécution, et le relevé les enregistre avec les mesures : un seuil déplacé après
coup ne juge plus rien.

### Le corpus sur lequel ces seuils portent

Le Playground porte quatre contrats : `Alert`, `Button`, `TileLink` et
`StressTest`. Le dernier est une sonde construite pour éprouver l'exportateur,
et aucune équipe ne l'utilise comme composant. Une moyenne qui le mélange aux
trois autres ne répond donc pas à la question de H1a. Le relevé donne la part
par composant avant toute moyenne, et signale la sonde.

La sonde pèse aussi sur H2, et dans l'autre sens : elle porte onze dépendances
composées contre une pour `Alert` et aucune pour les deux autres. Le relevé
sépare donc les questions de composition des autres, par composant.

La bibliothèque du premier consommateur porte ses tokens et aucun contrat,
vérifié. Le seuil de H2 compte les signatures déjà vues après cinq composants,
et le corpus n'en offre pas cinq. Deux issues, que le mainteneur tranche avant
la première exécution :

- H2 reste hors du relevé. Le plan garde alors un appel par composant, dont il
  établit déjà que le prix reste faible, et la mémoire des décisions perd son
  argument de décroissance jusqu'à ce qu'un corpus l'établisse ;
- le corpus s'étend d'abord, par export de contrats depuis la bibliothèque du
  consommateur. Ce travail précède le banc au lieu d'en faire partie.

H1a, H1b et H4 se mesurent sur le corpus tel qu'il est. Ce sont aussi les trois
mesures dont dépend la décision de construire le compilateur.

## 3. Ce que chaque mesure demande

### H1a, attribution des déclarations de rendu

Le programme lit un composant de référence et son contrat. Il relève chaque
déclaration de rendu du fichier : propriété CSS, valeur, chemin dans l'arbre,
combinaison de variantes sous laquelle elle s'applique. Il cherche ensuite
chaque valeur dans deux endroits, parce que le contrat les sépare : les cinq
parties que rend
[`vueExacteDuVariant`](../../../../../packages/kit/src/lecteurs/variant-views.mjs),
et ce que ce résolveur laisse sur le variant ou à la racine du contrat, soit
`variants[].tokens`, `variants[].strokes`, `structure.sizes`, `rendering`,
`textStyles`, `icons` et `stateModel`. Cherchée dans la vue seule, aucune
référence de peinture ne se joint.

Trois classes de sortie :

| Classe | Sens |
|---|---|
| `attribuee` | La valeur vient d'un champ du contrat, et le programme nomme ce champ |
| `convention` | La valeur ne vient pas du contrat mais se répète sur les quatre composants |
| `libre` | La valeur n'a ni source dans le contrat ni répétition dans le corpus |

Le rapport énumère les déclarations `libre`, composant par composant. Cette
liste est la matière du jeu de questions : ce sont les seuls points qu'un
compilateur ne peut pas produire sans décision.

Le programme rend cinq sorties, et la troisième décide du reste.

| Sortie | Contenu |
|---|---|
| Part attribuée | La part des déclarations de rendu `attribuee`, par composant, avant toute moyenne |
| Déclarations libres | Chacune avec sa propriété, sa valeur, son chemin et sa combinaison |
| Jeu de questions | Une entrée par question ouverte : genre, adresse, domaine, et le champ du contrat qui ferme les autres |
| Réponse de la référence | Pour chaque question, la valeur que le composant écrit à la main, et si elle appartient au domaine |
| Réponses hors domaine | Les questions dont la référence répond par quelque chose que l'énumération ne contient pas |

La quatrième et la cinquième sorties sont ce qui manquait au prédicat. Une
question dont la référence répond hors domaine n'est pas un choix dans une
énumération, et le plan la traite comme tel : c'est la mesure qui tranche, et
elle ne coûte rien.

Aucun compilateur n'est nécessaire pour cette mesure. Elle porte sur des
fichiers qui existent.

### H1b, reproduction du rendu

Cette mesure demande le prototype de compilateur du lot 1. Elle rend chaque
combinaison de variantes, de tailles et de modes de tokens dans un navigateur
sans interface, relève le style calculé de chaque chemin de l'arbre publié, et
le compare à celui du composant de référence.

La capture vise la racine rendue, les éléments `style` et `script` exclus. Une
capture ratée reste un échec de mesure et n'entre pas dans le taux de réussite.

Le rapport compte les défauts distincts en plus de leurs occurrences : une
référence de token fausse sur 90 variants est un défaut, pas quatre-vingt-dix.

### H2, taille et répétition du jeu de questions

**La taille est mesurée.** Le §4.2 du plan la donne, composant par composant et
genre par genre, sous quatre politiques de conventions : 75 questions sur le
corpus sans convention, 39 quand un argument d'échantillon répond, 20 quand une
prop d'icône runtime replie sur le `figmaName` de son contrat, 5 quand le
nommage des props de contenu est écrit. Le programme du banc rejoue ce décompte
pour qu'il se régénère avec le corpus, et il n'a plus à l'établir.

Le décompte sépare les questions de composition des autres : les premières
croissent avec le nombre de dépendances, les secondes avec le nombre
d'emplacements de texte. Les mêler rendrait une moyenne qui ne dimensionne rien.

**La répétition reste ouverte.** Le programme calcule la signature de chaque
question et rejoue le corpus dans plusieurs ordres tirés au hasard. Il rend,
pour chaque ordre, le nombre de questions nouvelles au n-ième composant.

La courbe obtenue décide de la valeur de la mémoire des décisions. Une courbe
qui ne descend pas retire l'argument de décroissance des appels ; le plan garde
alors un appel par composant, dont le prix reste faible.

Le corpus n'offre pas les cinq composants que cette moitié demande, et le point
1.11 de l'audit lui oppose déjà un contre-exemple sur le genre le plus fréquent :
trois composants employés, trois réponses `hote` différentes, et aucune
caractéristique de contrat qui les sépare. La mesure sert donc surtout à savoir
quels genres peuvent être promus de « proposé » à « résolu », et le plan livre
la mémoire en proposition tant qu'elle n'a rien promu.

### H3, fidélité du modèle

Les réponses de référence viennent des implémentations écrites à la main, pas
des contrats : `Button` porte l'hôte `button`, `TileLink` porte l'hôte `a`, et
chaque emplacement de texte porte la prop que le développeur lui a donnée. Le
banc envoie le jeu de questions à chaque modèle candidat, avec le schéma de
réponse, et compare.

Une question dont la référence répond hors domaine, relevée par H1a, sort de
cette mesure : aucun modèle ne peut répondre juste dans une énumération qui ne
contient pas la bonne réponse.

| Grandeur relevée | Usage |
|---|---|
| Réponse exacte par genre de question | Classement des modèles |
| Tokens d'entrée, de cache, de sortie et de raisonnement | Coût par composant accepté |
| Prix appliqué et durée | Deux classements séparés, comme l'étude le demande |
| Motif d'arrêt et identifiant exact du modèle servi | Reproductibilité |

Quatre composants, quatre configurations, cinq répétitions donnent 80 appels.
À la taille de dossier projetée, la campagne coûte quelques centièmes de dollar.
La campagne équivalente dans l'architecture actuelle coûterait environ cent
dollars. Cet écart est lui-même un résultat à consigner.

Ce que cette campagne peut établir dépend du nombre de questions qu'elle pose.
Sous la politique P0 du plan, elle porte sur 75 questions ; sous P2, sur 20 ;
sous P3, sur 5. Au bas de cette échelle, un taux de réponse exacte ne classe
plus rien, et la campagne attend un corpus plus large.

### H4, altérations que la porte doit voir

Le jeu d'altérations s'applique au code émis, jamais au contrat.

| Altération | Ce qu'elle simule |
|---|---|
| Remplacer une référence de token par une autre du même contrat | Une couleur fausse sur une combinaison |
| Retirer une entrée de la matrice | Une combinaison non rendue |
| Changer `align` d'un contour de `inside` à `outside` | Un contour qui consomme la boîte |
| Remplacer une pseudo-classe par une autre | Un état branché sur le mauvais signal |
| Inverser deux entrées de la précédence des états | Un état masqué par un autre |
| Retirer un emplacement d'icône | Une icône absente que le type ne voit pas |

Chaque altération est appliquée seule. La porte doit rendre un verdict rouge et
nommer le chemin concerné. Une altération non détectée est consignée avec le
contrôle qui aurait dû la voir.

Un verdict compte deux fois : voir une altération et la refuser sont deux
choses. Le relevé note donc, pour chaque altération, le contrôle qui la voit et
le code de sortie qu'il rend.

Cette mesure se lance d'abord contre les contrôles actuels, avant tout
développement. L'audit des prémisses en donne déjà la lecture, altération par
altération, et le relevé la confirme ou la refuse. Son résultat chiffre ce que
la conformité de rendu doit ajouter.

### H5, coût d'une mise à jour

L'historique du Playground porte peu de réexports successifs dans la fenêtre de
versions que le kit lit : les changements de format dominent. La mesure combine
donc deux sources.

| Source | Contenu |
|---|---|
| Historique | Les transitions réelles entre deux exports d'un même composant dans la fenêtre lisible |
| Changements construits | Ajout d'un variant, changement d'une référence de token, ajout d'une prop, ajout d'un état, retrait d'un emplacement |

Pour chaque transition, le programme recompile avec le relevé de décisions du
contrat précédent et relève : questions nouvelles, réponses orphelines, réponses
invalides, appels au modèle, verdict de la porte.

### H6, durée de relecture

Deux développeurs relisent, pour un même composant, le fichier écrit à la main
et le couple relevé de décisions plus diff émis. Le banc enregistre la durée et
les défauts trouvés. Deux relecteurs et un composant ne fondent pas une loi ;
la mesure sert à décider si le mode `genere` est acceptable par l'équipe.

## 4. Le programme

Le banc vit dans `UCM-Exporter`, sous `banc/implementeur/`. Il lit les contrats
et les composants du Playground en lecture seule et n'ouvre pas Figma.

```sh
node banc/implementeur/mesurer.mjs --corpus ../UCM-Playground \
  --hypotheses H1a,H4 \
  --out "docs/notes/Recherches/Optimisation Tokens/Recherches/MESURES-IMPLEMENTEUR.json"
```

Le relevé enregistre, comme le fait déjà
[`MESURES-REPRESENTATIONS.json`](../Recherches/MESURES-REPRESENTATIONS.json) :

- l'empreinte de chaque contrat, de chaque composant lu et du programme ;
- la version du kit, celle de l'adaptateur et celle du schéma ;
- les seuils fixés avant l'exécution ;
- les mesures brutes, avant tout taux dérivé ;
- pour H3, l'identifiant exact du modèle servi, l'usage brut du fournisseur et
  le texte exact transmis.

Le relevé se commite. Chaque lot le met à jour et le message de commit porte la
différence.

## 5. Ordre et règles d'arrêt

| Rang | Mesure | Ce qu'elle débloque |
|---|---|---|
| 1 | H1a | La décision de construire le compilateur |
| 2 | H4 contre les contrôles actuels | Le dimensionnement de la conformité de rendu |
| 3 | H1b | La validation du prototype de compilateur |
| 4 | H5 | Le cycle de mise à jour |
| 5 | H6 | Le mode par défaut des fichiers émis |
| 6 | H2, moitié répétition, après extension du corpus | La promotion d'un genre dans la mémoire des décisions |
| 7 | H3 | Le choix du modèle et de son réglage |

Les cinq premiers rangs ne dépensent aucun token et ne demandent aucune clé
d'API. Ils se lancent sur le corpus tel qu'il est.

H3 descend en dernier rang parce que le §13 du plan lui retire son assiette :
sous la politique P2, le corpus entier pose vingt questions, et vingt réponses
ne départagent pas huit fournisseurs. La campagne attend donc l'extension du
corpus, comme H2.

Deux règles d'arrêt :

- H1a sous le seuil : le plan de l'implémenteur est abandonné au profit de la
  compilation partielle de l'étude, avec un appel par composant et des fragments
  de code en sortie. Le banc reste utile pour cette autre architecture ;
- H4 laissant passer une altération de peinture ou de matrice : aucune campagne
  de modèles ne démarre avant que la porte ne la voie. Un taux d'acceptation
  mesuré par une porte aveugle ne classe rien.
