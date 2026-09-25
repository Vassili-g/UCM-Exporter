# Conception : accélérer l'analyse d'un composant

Ce document tranche les pistes du
[plan de recherche](./PLAN-RECHERCHE-PERFORMANCE-ANALYSE.md) et décrit
l'implémentation retenue. Il est écrit pour le contributeur du moteur qui la
réalisera, et pour le mainteneur qui tranchera les décisions de la section 7.
Le [plan d'implémentation](./PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md) en tire
les tâches.

Aucune durée n'a encore été mesurée. Les choix ci-dessous reposent sur la
lecture du code et sur la documentation Figma. Chaque accélération dont le gain
reste incertain est placée derrière une mesure, et le plan dit laquelle.

## 1. Ce que la lecture du code ajoute au plan de recherche

Le plan de recherche relevait cinq coûts. La lecture complète du chemin
d'analyse en précise quatre.

**Trois résolutions de maître portent sur des instances déjà résolues.**
`scanComposedInstances` résout le maître de chaque instance rendue de chaque
variant, et `scanComposedMatrix` les range dans `mainByInstanceId`. Ensuite,
`scoreWrapper` résout de nouveau les instances du variant de référence,
`instanceOwnerId` celles des autres variants, et `dependencyOpacity` chaque
instance de dépendance. Aucune de ces trois fonctions ne lit
`mainByInstanceId`.

**Une dépendance est parcourue deux fois de plus que ses occurrences.**
`indexDependencyPropertySurfaces` relance `scanComposedInstances` sur le variant
représentatif de chaque dépendance, puis `findWrapperReference` sur le même
variant. Chacune de ces deux passes appelle `getAllNodes`, et la première
résout le maître de chaque instance du sous-arbre.

**`releverLesImbriques` refait un parcours complet de chaque variant.** Il
appelle `getAllNodes(variant)` sans `composed`, après que `scanComposedMatrix`
a fait le même parcours.

**Un second balayage de pages existe déjà.** `lancerLeParcours`, dans
`code.ts`, charge les pages une par une pour trouver une source de règles. Il
se suspend pendant une opération par `laisserPasserLesOperations`, et il est
réclamé par un clic qui l'attend. Le préchauffage de l'index (section 4.4)
reprend ce motif au lieu d'en inventer un.

## 2. Verdict sur les pistes

| Piste | Verdict | Raison | Lot |
|---|---|---|---|
| P1 Instrumenter | Retenue | Toutes les autres décisions chiffrées en dépendent | L0 |
| P2 Un maître par instance | Retenue | Parité certaine ; cinq sites d'appel dans l'analyse, dont trois relisent des instances déjà résolues | L1 |
| P3 réduit, `contientDesInstances` | Retenue | Le filtre natif par type remplace un parcours complet de chaque variant | L1 |
| P3 complet, relevé par variant | Conditionnelle | Dépend de la part des parcours dans E0, et de la sonde S5 sur l'ordre de `findAll` | L5 |
| P4 sur `contientDesInstances` | Écartée | Le test ne descend dans aucune instance : le drapeau n'y économise rien | |
| P4 sur le balayage des pages | Décision D4 | Un calque `component-name` masqué dans une instance sortirait de l'index | L6 |
| P5.a `getInstancesAsync` | Écartée comme source de l'index | Trouver le maître demande déjà un balayage, et les instances d'une autre version du maître échapperaient | |
| P5.b Pages des maîtres seules | Décision D1 | Change le critère de dépendance | L6 |
| P5.c Préchauffage | Retenue, déclenchée par la sélection | Le coût à froid quitte le clic ; le déclenchement à l'ouverture chargerait tout le document pour un export de tokens | L3 |
| P5.d Index par page | Retenue | Une retouche ne relance que le balayage de sa page | L2 |
| P6 `JSON_REST_V1` | Écartée | La couverture des champs est inconnue et l'usage 2 réécrit tous les `extract*` ; la sonde S4 reste facultative | |
| P7 Calcul pur dans l'iframe | Écartée | Rouverte seulement si E0 attribue plus d'un cinquième du temps au calcul pur | |
| P8 Rendre la main | Retenue, à budget de temps | L'annulation part dans la boucle, et Figma redessine pendant l'analyse | L4 |

Deux pistes non listées par le plan de recherche ont été examinées et écartées.

- **Arrêter le balayage dès que chaque dépendance est trouvée.** Une réponse
  positive se prouve sur une page, une réponse négative demande toutes les
  pages. Une icône n'a jamais de conteneur de règles, et presque chaque
  composant réel en embarque une : l'arrêt anticipé ne servirait presque
  jamais.
- **Garder l'index dans `figma.clientStorage` entre deux sessions.** Sans
  `figma.fileKey`, rien n'identifie le fichier. C'est la décision D3.

## 3. Bornes

Les trois bornes du plan de recherche restent entières : contrat identique
octet pour octet hors `meta.exportedAt`, aucune écriture dans le document,
critère de dépendance inchangé. Quatre bornes s'y ajoutent.

- Aucune signature publique de `src/contract/` ne change pour transporter un
  cache. Les caches vivent dans une portée d'analyse (section 4.2).
- Aucun appel à `figma.loadAllPagesAsync` ne reste dans `src/contract/` après
  le lot L2. Une loi le tient.
- `figma.skipInvisibleInstanceChildren` reste posé dans le seul fichier
  `src/template/sources.ts`, tant que la décision D4 n'est pas prise.
- Une mémoire qui manque, parce qu'un abonnement est refusé ou qu'une portée
  est déjà ouverte, rend le calcul sans mémoire. Elle ne rend jamais un
  résultat périmé.

## 4. Architecture retenue

### 4.1. La trace de mesure (L0)

Nouveau module `src/contract/mesure.ts`. Il tient, pour une analyse :

- un chronomètre par étape, nommée comme les annonces de `handleExportComponent`,
  plus les étapes internes `index`, `composition`, `wrapper`, `structure`,
  `echantillons`, `compaction` et `serialisation` ;
- des compteurs : `pagesChargees`, `pagesBalayees`, `pagesReutilisees`,
  `nodesParcourus` (somme des longueurs rendues par `findAll` dans
  `getAllNodes`), `appelsGetAllNodes`, `appelsFindAllWithCriteria`,
  `appelsGetMainComponentAsync`, `maitresReutilises`, `respirations`,
  `tailleIndex` ;
- une empreinte du contrat : FNV-1a 32 bits de `content`, dont la valeur de
  `exportedAt` est remplacée par une chaîne fixe. Deux builds qui produisent la
  même empreinte sur le même composant produisent le même contrat.

La trace est activée à la compilation. `build:code` passe
`--define:__UCM_MESURE__=false` à esbuild, qui retire alors le code de mesure
du bundle. Un script `build:code:mesure` passe `true`. Le module lit la
constante par `typeof __UCM_MESURE__ !== 'undefined' && __UCM_MESURE__`, ce qui
garde les tests sous Node sans définition. À la fin de l'analyse, la trace part
en un seul `console.log('[ucm:mesure]', …)`, jamais dans `meta.diagnostics` ni
vers l'interface.

Les compteurs se posent aux points de passage uniques que créent L1 et L2 :
`maitreDe`, `getAllNodes`, le balayage d'une page. L0 pose d'abord les
chronomètres et les compteurs qui ne demandent aucun de ces points, puis chaque
lot suivant branche les siens.

### 4.2. La portée d'analyse et le résolveur de maîtres (L1)

Nouveau module `src/contract/porteeDAnalyse.ts` :

```ts
export async function dansUnePorteeDAnalyse<T>(
  options: { respirer?: () => Promise<void> },
  corps: () => Promise<T>,
): Promise<T>;

/** Le maître d'une instance, ou null quand Figma ne le sert pas. */
export function maitreDe(instance: InstanceNode): Promise<ComponentNode | null>;

/** Rend la main si le budget de temps est écoulé ; sans effet hors portée. */
export function respirerSiBesoin(): Promise<void>;
```

`handleExportComponent` ouvre la portée et la ferme dans un `finally`. La
portée est une variable du module, et une seule est ouverte à la fois : `code.ts`
refuse déjà une seconde opération par `operationEnCours`. Une ouverture pendant
qu'une portée est ouverte exécute `corps` sans mémoire, et la trace compte ce
refus.

`maitreDe` range une `Promise` par `instance.id`. Il remplace l'appel direct
dans cinq fonctions :

| Fonction | Fichier | Traitement actuel d'un échec |
|---|---|---|
| `contractedOwner` | `composedComponents.ts` | `.catch(() => null)` |
| `indexMasterInstances` | `composedComponents.ts` | `.catch(() => null)` |
| `scoreWrapper` | `componentTree.ts` | `.catch(() => null)` |
| `instanceOwnerId` | `layoutNodes.ts` | `try`, `null` |
| `dependencyOpacity` | `extractLayout.ts` | `?.()` puis `.catch(() => null)` |

Les cinq rendent déjà `null` sur un échec, et `maitreDe` fait de même,
méthode absente comprise. L'avertissement de `contractedOwner` reste où il
est : il dépend de l'instance, et la mémoire ne le rend pas une seule fois.

`isRuleInstance`, dans `extractRules.ts`, ne passe pas par `maitreDe`. Chaque
instance de règle n'y est résolue qu'une fois par analyse, et
`reportSelectionState` l'appelle hors de toute portée.

Une portée ne sert pas au-delà de son analyse. Un maître remplacé par le
designer pendant l'analyse est lu dans son état d'avant, comme aujourd'hui une
lecture faite avant son remplacement.

### 4.3. Le test `contientDesInstances` (L1)

Nouvelle fonction `contientUneInstanceRendue(racine)` dans
`exportableNodes.ts`. Elle demande les instances par
`findAllWithCriteria({ types: ['INSTANCE'] })`, avec le repli sur `findAll`
déjà employé ailleurs. Elle rend vrai dès qu'une instance n'a, entre elle et la
racine, aucun calque `isStaticallyHidden`, elle comprise.

Le résultat est celui du test actuel. `getAllNodes(component)` sans `composed`
garde exactement les nodes dont aucun ancêtre, ni eux-mêmes, n'est
statiquement masqué. Le test existant « un composant sans instance ne charge
pas les autres pages du document » reste vert.

### 4.4. L'index des composants contractés, page par page (L2)

`indexContractedNamesInDocument` garde son nom et son résultat : l'ensemble
des noms compactés que `rulesContainerOwner` reconnaît sur toutes les pages.
Sa mémoire change de grain.

```ts
type EntreeDePage = { noms: ReadonlySet<string>; sale: boolean; ecoutee: boolean };
const pages = new Map<string, EntreeDePage>(); // clé : id de la page
```

Un appel fait, dans l'ordre :

1. lire les pages de `figma.root.children`, la page courante en tête, et
   retirer les entrées des pages disparues ;
2. pour chaque page sans entrée, ou dont l'entrée est sale : appeler
   `avantChaquePage()`, puis `page.loadAsync()`, puis s'abonner à
   `page.on('nodechange')` si l'entrée n'est pas encore écoutée, puis marquer
   l'entrée propre et balayer la page par `indexContractedNames(page)` ;
3. rendre un `Set` neuf, union des entrées.

Le balayage d'une page est synchrone. Un `nodechange` arrive donc avant ou
après lui, jamais pendant : l'ordre « marquer propre, puis balayer » ne perd
aucun changement. Un abonnement refusé laisse l'entrée non écoutée, et une page
non écoutée est rebalayée à chaque appel. Un `loadAsync` qui lève fait échouer
l'analyse, comme le fait aujourd'hui `loadAllPagesAsync` : une page ignorée en
silence retirerait des noms de l'index.

Un seul balayage court à la fois. Un appel qui arrive pendant un balayage
attend celui-ci, puis rebalaye les pages salies entre-temps. Deux tours
suffisent : le second ne porte que sur les pages modifiées pendant le premier.

`oublierLIndexDuDocument()` reste, et vide toutes les entrées : les tests et
le repli en ont besoin. `creerRegles` appelle à sa place
`oublierLaPage(figma.currentPage)`, puisque l'écriture pose le conteneur sur
la page du composant. Le `nodechange` émis par l'écriture arrive par lots, trop
tard pour l'analyse qui suit la création.

**Le signal dépend de la sonde S1.** La documentation Figma présente
`PageNode.on('nodechange')` comme le remplaçant de `documentchange` en
chargement dynamique. S1 vérifie qu'il est émis pour une page qui n'est pas la
page courante, pour une modification faite par un autre utilisateur, et pour
la mise à jour d'une bibliothèque qui touche un conteneur. Si l'un de ces cas
manque, le repli est le suivant : charger les pages une à une comme ci-dessus,
puis appeler `loadAllPagesAsync`, qui ne charge plus rien, et s'abonner à
`documentchange`. Chaque `DocumentChange` salit la page de son node. Un node
supprimé, dont la page ne se lit plus, salit toutes les pages. Ce repli garde
le gain « après retouche » sauf pour les suppressions.

### 4.5. Le préchauffage (L3)

`reportSelectionState` lance l'index en tâche de fond quand la sélection est
un composant exportable dont un variant contient une instance rendue
(section 4.3). L'index démarre alors environ 200 ms après la sélection, délai
de `SELECTION_DEBOUNCE_MS`, pendant que le designer lit la carte du composant.

L'appel de fond passe `avantChaquePage: laisserPasserLesOperations`, comme
`lancerLeParcours`. L'analyse appelle l'index avec une priorité `analyse` :
tant qu'une analyse attend, le balayage en cours remplace sa suspension par
une respiration de `setTimeout(0)`. Sans cette levée, l'analyse attendrait un
balayage suspendu par sa propre opération, le cas que `parcoursReclame` règle
déjà pour les sources.

Un composant sans instance ne déclenche rien. Un export de tokens ne charge
aucune page.

### 4.6. Rendre la main (L4)

`respirer`, passé à `dansUnePorteeDAnalyse` par `code.ts`, fait deux choses :
un `setTimeout(0)`, puis `verifierAnnulation()`. `respirerSiBesoin` ne
l'appelle que si 30 ms au moins se sont écoulées depuis la dernière
respiration. Une analyse rapide ne paie donc presque aucune pause.

Trois boucles l'appellent :

- `scanComposedMatrix` traite les variants par tranches de 16 et respire entre
  deux tranches. L'ordre des résultats reste celui de `roots`, donc celui des
  avertissements aussi ;
- la boucle par variant de `extractStructure` respire à chaque tour ;
- le balayage de l'index respire entre deux pages (section 4.5).

Une annulation lève `ExportAnnule` depuis la respiration. L'exception remonte
jusqu'au `catch` d'`analyser`, qui la traite déjà. La portée se ferme dans son
`finally`.

### 4.7. Accélérations conditionnelles (L5)

Chacune n'est réalisée que si la mesure E0, refaite après L4, l'appelle.

**Relevé par variant.** Condition : `nodesParcourus` et `appelsGetAllNodes`
pèsent plus du quart du temps restant. La portée garde, par id de racine, le
résultat de `root.findAll(() => true)`, et pour chaque node l'indice de fin de
son sous-arbre. `getAllNodes(racine)` sur un node déjà couvert par un relevé
découpe ce relevé au lieu de rappeler `findAll`. Le découpage suppose que
`findAll` rend un parcours en profondeur préfixe. La sonde S5 le vérifie sur le
corpus, et un test sur les mocks compare le découpage à `findAll` sur chaque
sous-arbre.

**Règles relues à chaque sélection.** Condition : `extractRules` pèse plus
d'un dixième du temps. `reportSelectionState` garde son résultat pour le
composant sélectionné, et l'analyse le reprend tant que la page courante n'a
émis aucun `nodechange` depuis.

### 4.8. Ce qui attend une décision (L6)

Les décisions D1, D2 et D4 de la section 7 changent le critère de dépendance
ou un invariant. Le plan d'implémentation ne les réalise pas : il s'arrête au
constat, et le mainteneur ouvre un plan à part pour chacune.

## 5. Parité et tests

**Banc de parité.** Un test nouveau, `tests/paritePerformance.test.ts`, exporte
chaque composant simulé de `exportComponent.test.ts` deux fois : dans une
portée, puis avec la portée désactivée par un interrupteur que seul ce test
emploie. Il compare les deux `content` après avoir remplacé `exportedAt`. Le
test vaut aussi pour L4 et L5, qui passent par la même portée.

**Comptes.** Un mock de `getMainComponentAsync` qui compte ses appels. Pour un
set de N variants qui embarquent chacun la même dépendance, le compte égale le
nombre d'ids d'instance distincts rencontrés, et non ce nombre multiplié par
les passes.

**Index.** Les trois tests actuels de `composedComponents.test.ts` sur
`documentchange` sont réécrits pour le nouveau signal. S'y ajoutent : une
retouche sur une page ne rebalaye qu'elle ; une page ajoutée est balayée ; une
page supprimée sort de l'index ; un abonnement refusé ne garde pas la page ; un
appel pendant un balayage attend puis rebalaye les pages salies.

**Lois.** Une loi refuse `loadAllPagesAsync` dans `src/contract/`, sur le modèle
de celle du template dans `loiDuDocumentIntact.test.ts`. Elle se voit rouge
avant d'être crue.

**Respiration.** Une annulation posée pendant la boucle de `extractStructure`
arrête l'analyse avant le variant suivant. L'ordre des avertissements est
identique avec et sans tranches.

**Dans Figma.** Le mainteneur compare l'empreinte de la trace avant et après
chaque lot, sur les trois fichiers du corpus.

## 6. Sondes Figma

Elles répondent à ce que les mocks ne montrent pas. Chacune est un script du
plugin de développement, lancé par le mainteneur dans Figma Desktop, dont le
constat s'écrit avec la version de Figma.

| Sonde | Question | Conséquence |
|---|---|---|
| S1 | `nodechange` est-il émis pour une page non courante, une modification distante, une mise à jour de bibliothèque ? | Signal de L2, ou repli `documentchange` |
| S2 | Figma reste-t-il réactif pendant le préchauffage d'un fichier de cinquante pages ? | Garde L3, ou le limite aux fichiers de moins de N pages |
| S3 | Un calque `component-name` est-il masqué dans une instance, dans le kit de règles publié ou le corpus ? | Données de la décision D4 |
| S4 | Que couvre `exportAsync({ format: 'JSON_REST_V1' })` ? | Facultative ; rouvre P6 seulement si le gain est d'un ordre de grandeur |
| S5 | `node.findAll(() => true)` est-il la tranche du relevé de son ancêtre, dans le même ordre ? | Condition du relevé par variant |

## 7. Décisions attendues du mainteneur

- **D1. Portée des règles.** Un conteneur ne compte-t-il que sur la page du
  maître qu'il documente ? Oui rend P5.b possible et modifie
  [SPEC.md](../../../../packages/plugin-exporter/SPEC.md#7-intention-et-documentation-des-props).
- **D2. Les contrats publiés comme source des noms.** Change l'invariant de
  composition.
- **D3. Un cache au-delà de la session.** Sans `figma.fileKey`, aucune clé
  n'identifie le fichier sans écriture dans le document.
- **D4. Le drapeau `skipInvisibleInstanceChildren` sur le balayage des
  pages.** Un calque `component-name` masqué sortirait de l'index. Oui
  demande de déplacer la loi du drapeau vers un module partagé, et de
  modifier l'invariant d'écriture.
- **D5. Le préchauffage.** Accepter que la sélection d'un composant à
  instances charge les autres pages avant tout clic. La sonde S2 renseigne
  cette décision, et le lot L3 attend sa réponse.
