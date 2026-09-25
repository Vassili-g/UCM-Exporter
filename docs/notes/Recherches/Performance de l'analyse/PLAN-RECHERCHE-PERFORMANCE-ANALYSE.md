# Plan de recherche : accélérer l'analyse d'un composant

Ce plan organise les mesures et les essais qui décideront comment réduire le
temps de « Analyser le composant » dans le plugin exporter. Il ne décide rien :
chaque piste reste une hypothèse jusqu'à sa mesure. Le lecteur visé est le
contributeur du moteur qui mènera les essais, puis le mainteneur qui tranchera
les questions de la dernière section.

## 1. Objet et bornes

L'analyse est `handleExportComponent`, dans
[exportComponent.ts](../../../../packages/plugin-exporter/src/contract/exportComponent.ts).
Trois formes de fichier la ralentissent :

| Cas | Forme | Ce qui grossit |
|---|---|---|
| C1 | Un component set de plusieurs centaines de variants | Le nombre de parcours de sous-arbre et d'appels `getMainComponentAsync`, proportionnel aux variants |
| C2 | Des variants profonds, avec des instances imbriquées et des calques masqués | Le coût de chaque parcours, et le coût de lecture des enfants d'instance |
| C3 | Un fichier d'une cinquantaine de pages ou plus, dont les maîtres des dépendances vivent sur d'autres pages | Le chargement de toutes les pages et le balayage de chacune |

Toute piste retenue respecte trois bornes :

- le contrat produit reste identique octet pour octet, date d'export exclue ;
- l'analyse n'écrit rien dans le document
  ([invariants d'écriture](../../../../AGENTS.md#écriture-dans-le-document)) ;
- le critère de dépendance reste celui de `rulesContainerOwner`
  ([invariants de composition](../../../../AGENTS.md#composition)), sauf
  décision contraire du mainteneur (section 8).

## 2. Ce que l'analyse paie dans le code actuel

Ce relevé vient de la lecture du code. Aucune durée n'a encore été mesurée.

**L'index des composants contractés charge tout le document.**
`indexContractedNamesInDocument`, dans
[composedComponents.ts](../../../../packages/plugin-exporter/src/contract/composedComponents.ts),
appelle `figma.loadAllPagesAsync()`, puis passe `findAllWithCriteria({ types: ['TEXT'] })`
sur chaque page et remonte de chaque calque `component-name` à son instance.
L'index est gardé tant qu'aucun `documentchange` n'arrive. Or Figma émet cet
événement pour toute modification, sur n'importe quelle page : une retouche
entre deux analyses relance le balayage complet. La première analyse d'une
session le paie toujours.

**Le même maître est résolu plusieurs fois.** `getMainComponentAsync` est
appelé dans six fonctions : `contractedOwner`, `indexMasterInstances`,
`scoreWrapper`, `instanceOwnerId`, `dependencyOpacity` et
`isRuleInstance`. `scanComposedInstances` tourne une fois par variant, puis une
fois par dépendance distincte dans `indexDependencyPropertySurfaces`. Aucune
mémoïsation ne relie ces appels. Le lot L1 du
[plan d'implémentation](./PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md) corrige
ce défaut, que la roadmap nommait.

**Chaque variant est parcouru plusieurs fois en entier.** `getAllNodes`
commence par `root.findAll(() => true)`. Vingt et un appels à `getAllNodes` ou
`textNodes` se répartissent dans treize fichiers de `src/contract/`. Le seul
test `contientDesInstances`, qui décide si l'index est nécessaire, parcourt
déjà chaque variant en entier.

**Les règles sont relues à chaque changement de sélection.** `extractRules`
balaye la page courante dans `reportSelectionState`, puis une seconde fois au
début de l'analyse.

**Aucune étape ne rend la main.** L'orchestration enchaîne ses `await` sans
pause. L'annulation demandée par un changement de sélection n'est lue qu'aux
frontières d'étape.

## 3. Ce que la documentation Figma et les retours publiés établissent

| Fait | Conséquence pour UCM | Source |
|---|---|---|
| Figma déconseille `loadAllPagesAsync` : lent dans un gros fichier, et un fichier très gros peut atteindre la limite de mémoire. | C3 est le cas que Figma désigne. | [Migrating to dynamic loading](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/) |
| `figma.on('documentchange')` exige un `loadAllPagesAsync` préalable ; `PageNode.on('nodechange')` observe une seule page chargée. | Garder l'index sans charger tout le document demande un autre signal d'invalidation. | [Migrating to dynamic loading](https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/), [PageNode](https://developers.figma.com/docs/plugins/api/PageNode/) |
| Le client reçoit la page ouverte et ses dépendances de lecture : composants, styles et variables que ses nodes référencent. Les sous-calques d'instance se matérialisent à la demande. | Le maître d'une instance imbriquée est peut-être lisible sans charger sa page. À vérifier par l'essai E2.1. | [Speeding up file load times](https://www.figma.com/blog/speeding-up-file-load-times-one-page-at-a-time/) |
| `findAllWithCriteria` filtre par `types`, `pluginData` et `sharedPluginData`. Avec `figma.skipInvisibleInstanceChildren = true`, Figma annonce jusqu'à « hundreds of times faster » ; `findAll` gagne « several times ». | Les balayages de page et de variant ont une marge. Le drapeau rend invisibles les calques masqués d'instance, dont `visibilityOfLayer` a besoin. | [findAllWithCriteria](https://developers.figma.com/docs/plugins/api/properties/nodes-findallwithcriteria/), [skipInvisibleInstanceChildren](https://developers.figma.com/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/) |
| Lire `children` coûte en proportion du nombre d'enfants ; un plugin mesurait 180 ms par composant, et 318 ms en descendant par indices. | Un parcours manuel ne bat pas un parcours natif. Réduire le nombre de parcours rapporte plus que les réécrire. | [Forum Figma, ComponentNodes lents](https://forum.figma.com/t/getting-information-from-componentnodes-is-being-really-slow/55426) |
| Le code du plugin tourne dans QuickJS compilé en WebAssembly, sur le fil principal, avec une copie du document. Un aller-retour de message coûte de l'ordre de 0,1 ms. | Le calcul pur coûte plus cher dans le sandbox que dans l'iframe. Envoyer des nodes à l'iframe coûte un message par lot. | [How we built the plugin system](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/), [macwright.com](https://macwright.com/2024/03/29/figma-plugins) |
| Un parcours mesuré à 0,013 ms par node en régime normal est monté à 0,19 ms par node sous charge, soit quinze fois plus. | Une mesure se fait sur plusieurs répétitions, et note la charge de l'hôte. | [design-os-figma-plugin, issue 125](https://github.com/jangtrinh/design-os-figma-plugin/issues/125) |
| `findAllWithCriteria` est passé de 0 à 3 ms à 18 à 1678 ms dans un gros fichier en cours d'édition, jusqu'à sa réouverture. | La médiane seule masque ce cas : relever aussi le maximum. | [Forum Figma, findAllWithCriteria](https://forum.figma.com/report-a-problem-6/sudden-performance-issue-with-findallwithcriteria-36801) |
| `ComponentNode.getInstancesAsync()` rend toutes les instances d'un composant dans le document. | Les conteneurs de règles sont des instances d'un même maître `.componentRules` : ce maître pourrait les énumérer sans balayage de texte. | [ComponentNode](https://developers.figma.com/docs/plugins/api/ComponentNode/) |
| `exportAsync({ format: 'JSON_REST_V1' })` rend un sous-arbre entier au format de l'API REST, en un appel natif. | Un component set pourrait se lire en un appel, au lieu de milliers de lectures de propriété. Couverture des champs à vérifier. | [exportAsync](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/), [Update 68](https://www.figma.com/plugin-docs/updates/2023/06/21/version-1-update-68/) |
| `figma.fileKey` est réservé aux plugins privés. | Un cache persistant ne peut pas se clefer sur le fichier sans autre identifiant. | [figma](https://developers.figma.com/docs/plugins/api/figma/) |
| Un `setTimeout(0)` entre deux lots rend la main au rendu de Figma. | Le temps total ne baisse pas, mais l'interface répond et l'annulation part plus tôt. | [Evil Martians](https://evilmartians.com/chronicles/figma-plugin-api-dive-into-advanced-algorithms-and-data-structures) |

## 4. Questions de recherche

1. Quelle part du temps prend chaque étape, dans chacun des cas C1, C2 et C3 ?
2. L'analyse peut-elle reconnaître les dépendances sans charger les pages qui
   n'en hébergent aucune ?
3. Combien d'appels `getMainComponentAsync` et de parcours de sous-arbre une
   analyse fait-elle, et combien sont des doublons ?
4. Une lecture native en bloc remplace-t-elle les lectures propriété par
   propriété, sans perte de champ ?
5. Une fois le temps total réduit, que reste-t-il à rendre supportable par la
   progression et l'annulation ?

La question 1 conditionne les autres. Sans relevé par étape, un gain ne se
distingue pas de l'écart d'un facteur quinze qu'un même parcours montre sous
charge.

## 5. Pistes

Chaque piste donne son mécanisme, la question qu'elle sert, ce qu'elle touche
et l'essai qui la tranche.

### P1. Instrumenter l'analyse (question 1)

Injecter dans `handleExportComponent` un chronomètre par étape et des
compteurs : pages chargées, nodes visités, appels `findAll`,
`findAllWithCriteria` et `getMainComponentAsync`, taille de l'index. La trace
part vers la console de développement, jamais dans `meta.diagnostics`. Cette
piste reprend la
[piste 1.5](../Evolutions%20globales/PISTES-EVOLUTION.md#15-diagnostiquer-les-lenteurs-et-les-échecs-de-lexporteur).

Essai : le même export, avec et sans instrumentation, produit le même contrat.
Le surcoût de l'instrumentation se mesure et se soustrait.

### P2. Résoudre chaque maître une fois (question 3)

Une table `id d'instance → Promise<ComponentNode | null>`, créée par analyse et
passée aux six fonctions de la section 2. Une seconde table
`id de maître → MasterInstanceDefaults` évite de relever deux fois le même
maître. Le contrat ne change pas : seule la provenance du maître change.

Essai : compter les appels avant et après sur C1. Le gain attendu croît avec le
nombre de variants qui embarquent la même dépendance.

### P3. Parcourir chaque variant une fois (question 3)

Un relevé par variant, fait une fois par analyse : liste des nodes dans
l'ordre du document, parent, type, visibilité statique. `getAllNodes` et
`textNodes` deviennent des filtres sur ce relevé, mémoïsés par couple
`(racine, composed)`. Le test `contientDesInstances` passe par
`findAllWithCriteria({ types: ['INSTANCE'] })`.

Risque : un relevé gardé au-delà d'un `await` peut porter un node que Figma ne
sert plus, et dont la lecture lève. `proprietaireDuCalque`, dans
[composedComponents.ts](../../../../packages/plugin-exporter/src/contract/composedComponents.ts),
traite déjà ce cas. Le relevé vit le temps d'une analyse, et chaque lecture
garde son `try`.

Essai : nombre de nodes visités avant et après, sur C1 et C2.

### P4. Balayer avec `skipInvisibleInstanceChildren` (question 2)

Poser le drapeau autour des relevés synchrones qui ne lisent aucune visibilité
: le balayage des calques `component-name` de chaque page,
`contientDesInstances`, `candidatsDeRegles`. L'invariant d'écriture
l'autorise déjà autour d'un relevé synchrone, à condition de restaurer la
valeur d'avant.

Question préalable : un calque `component-name` peut-il être masqué dans une
instance de `.componentRules` ? Si oui, le drapeau le cache et l'index perd un
nom. Vérifier sur le kit de règles publié et sur les fichiers du corpus.

Essai : durée du balayage d'une page, avec et sans drapeau, sur C3.

### P5. Un index des dépendances qui ne charge que les pages utiles (question 2)

L'index actuel répond à la question « quels composants du document ont des
règles ? » alors que l'analyse n'a besoin que d'une réponse par dépendance
rencontrée. Quatre variantes sont à comparer.

**P5.a. Énumérer les conteneurs par leur maître.** Trouver le maître
`.componentRules`, local ou venu de la bibliothèque, puis appeler
`getInstancesAsync()`. Chaque instance donne son calque `component-name`. À
mesurer : ce que l'appel charge, sa durée sur C3, et si une instance d'une page
non chargée se lit sans `loadAsync`.

**P5.b. Charger seulement les pages des maîtres.** Relever d'abord les
instances des variants et leur maître, remonter de chaque maître à sa page,
puis charger ces pages une à une par `PageNode.loadAsync` et y chercher les
règles. Le geste de création pose le conteneur à côté du composant, ce qui
rend ce cas nominal. Une dépendance sans conteneur sur la page de son maître
relancerait un balayage des autres pages. Or une icône non contractée n'en a
jamais : sans décision sur la portée des règles (section 8), cette variante ne
rapporte que dans le cas où toutes les dépendances sont contractées.

**P5.c. Préchauffer l'index.** Lancer `indexContractedNamesInDocument` dès
l'ouverture du plugin, en tâche de fond, pour que la première analyse le
trouve prêt. Le temps total ne baisse pas, mais le designer ne l'attend plus
au clic. À vérifier : l'effet sur la réactivité de Figma pendant le
chargement, et le comportement quand l'analyse démarre avant la fin.

**P5.d. Invalider par page.** Remplacer `documentchange` par un index par page,
invalidé par `PageNode.on('nodechange')` de chaque page chargée. Une retouche
sur une page ne relance que le balayage de cette page. À vérifier : le coût de
cinquante abonnements, et la liste des événements qui peuvent changer une
règle sans émettre de `nodechange` sur sa page (modification d'un maître de
bibliothèque, par exemple).

Essai commun : temps de la première analyse et d'une analyse après retouche,
sur C3, pour chaque variante et pour l'index actuel.

### P6. Lire un component set en un appel (question 4)

Appeler `exportAsync({ format: 'JSON_REST_V1' })` sur le component set et
comparer le JSON aux lectures actuelles. Champs à vérifier un par un :
`boundVariables`, `componentPropertyReferences`, `componentProperties`,
`componentId` avec la table `components` qui donnerait le maître de chaque
instance sans `getMainComponentAsync`, `styles`, propriétés d'auto layout,
enfants masqués d'instance, `overrides`.

Deux usages sont possibles, du plus léger au plus lourd :

1. ne remplacer que la résolution des maîtres par `componentId` ;
2. faire lire au moteur un arbre JSON plutôt que des nodes, ce qui toucherait
   tous les fichiers `extract*`.

Essai : durée de l'appel sur C1 et C2, comparée à la somme des parcours
relevés par P1. L'usage 2 ne s'étudie que si l'écart est d'un ordre de
grandeur et si la couverture des champs est complète.

### P7. Déplacer le calcul pur vers l'iframe (question 4)

La compaction, la sérialisation et les modèles purs tournent dans QuickJS.
L'iframe exécute le même code avec le compilateur du navigateur. Cette piste
ne s'étudie que si P1 montre que le calcul pur pèse dans le total : la plupart
du temps attendu est dans les lectures Figma, qui restent dans le sandbox.

### P8. Rendre la main entre deux variants (question 5)

Un `setTimeout(0)` entre deux lots de variants, et une lecture de l'annulation
à chaque lot. Le temps total ne baisse pas. L'essai mesure le délai entre le
changement de sélection et l'arrêt effectif de l'analyse.

## 6. Protocole de mesure

**Corpus.** Trois fichiers de travail, un par cas de la section 1 :

- C1 et C2 tirés des composants réels de `intencial-library` et du Playground,
  choisis pour leur nombre de variants et leur profondeur ;
- C3 construit dans un fichier jetable d'au moins cinquante pages, où les
  maîtres des dépendances et leurs conteneurs de règles sont répartis sur
  d'autres pages que le composant analysé. Aucun fichier réel n'est modifié.

Chaque fichier se décrit par son nombre de pages, de nodes, de variants et
d'instances imbriquées.

**Conditions.** Figma Desktop, même poste, un seul fichier ouvert. Trois
situations par cas :

| Situation | Définition |
|---|---|
| À froid | Fichier fraîchement ouvert, premier lancement du plugin |
| À chaud | Seconde analyse du même composant, sans retouche |
| Après retouche | Une modification sur une page sans rapport, puis une analyse |

Cinq répétitions par situation. Relever la médiane et le maximum.

**Parité.** Pour chaque piste, comparer le contrat produit sur tout le corpus
avant et après, date exclue. La suite du plugin passe dans un worktree isolé.
Le plugin chargé dans Figma se reconstruit dans la copie de travail, puisque
Figma lit `packages/plugin-exporter/dist/code.js`.

**Critère de réussite.** Sur C3, le temps de la première analyse ne croît plus
avec le nombre de pages qui n'hébergent ni le composant, ni une dépendance, ni
un conteneur de règles. Sur C1, le nombre d'appels `getMainComponentAsync`
croît avec le nombre d'instances distinctes d'un variant, et non avec le
produit des variants et des passes. Les seuils chiffrés se fixent après la
mesure de départ.

## 7. Ordre des essais

| Étape | Contenu | Condition pour passer à la suite |
|---|---|---|
| E0 | P1, puis mesure de départ sur le corpus | Une répartition du temps par étape pour C1, C2 et C3 |
| E1 | P2, P3 limité à `contientDesInstances`, P4 | Parité du contrat ; gain de chaque piste mesuré à part |
| E2 | Sondes d'API dans un plugin de développement : E2.1 lecture d'un maître d'une page non chargée, E2.2 `getInstancesAsync` sur `.componentRules`, E2.3 couverture de `JSON_REST_V1` | Un constat écrit par sonde, avec la version de Figma |
| E3 | P5 dans la variante que E2 désigne | Décision du mainteneur sur la portée des règles |
| E4 | P3 complet, P6 usage 2, P7, P8 | Seulement si E0 montre que le temps restant est dans ces étapes |

Un plan d'implémentation tiré de ces résultats passe par un agent de revue
avant son écriture, puisqu'il touche au moteur.

## 8. Décisions attendues du mainteneur

1. **Portée des règles.** Un conteneur de règles compte-t-il seulement sur la
   page du maître qu'il documente ? La réponse oui rend P5.b complète et change
   [SPEC.md](../../../../packages/plugin-exporter/SPEC.md#7-intention-et-documentation-des-props).
   La réponse non garde un balayage du document pour toute dépendance non
   contractée.
2. **Une autre source pour les noms contractés.** Le plugin lit déjà le dépôt
   de destination. La liste des contrats publiés y donne les composants
   contractés sans parcourir le document, mais ignore un composant documenté
   et pas encore publié. L'union de cette liste et d'un index de la page
   courante changerait le critère de l'invariant de composition.
3. **Un cache au-delà de la session.** `figma.clientStorage` peut garder un
   index, mais sans `figma.fileKey` rien n'identifie le fichier. Poser un
   identifiant dans le document serait une écriture : seul le geste de création
   des règles en a le droit.
