# Conception : accélérer l'analyse d'un composant

Ce document tranche les pistes du
[plan de recherche](./PLAN-RECHERCHE-PERFORMANCE-ANALYSE.md) et décrit
l'implémentation retenue. Il est écrit pour le contributeur du moteur qui la
réalisera. Le [plan d'implémentation](./PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md)
en tire les tâches. Les décisions du mainteneur sont en section 2 ; elles
changent le critère de dépendance.

Aucune durée n'a encore été mesurée. Chaque accélération dont le gain reste
incertain est placée derrière une mesure, et le plan dit laquelle.

## 1. Ce que la lecture du code ajoute au plan de recherche

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

**Un balayage de pages existe déjà en tâche de fond.** `lancerLeParcours`, dans
`code.ts`, charge les pages une par une pour trouver une source de règles. Il
se suspend pendant une opération par `laisserPasserLesOperations`, et un clic
qui l'attend le réclame. Le préchauffage (section 5.5) reprend ce motif.

## 2. Décisions du mainteneur

| Décision | Réponse | Effet sur la conception |
|---|---|---|
| D1. Un conteneur de règles ne compte que sur la page du maître qu'il documente | Oui | L'index ne balaye que les pages des maîtres rencontrés |
| D2. Les contrats publiés dans le dépôt disent aussi quels composants sont contractés | Non | Le contrat ne dépend que du fichier Figma : ni réseau, ni dépôt actif, ni rapprochement par nom de fichier |
| D3. Garder l'index d'une session à l'autre | Non | Aucune mémoire hors session |
| D4. Balayer une page avec `skipInvisibleInstanceChildren` | Oui | Un calque `component-name` masqué dans une instance ne déclare plus de dépendance |
| D5. Préchauffer l'index à la sélection | Oui, seulement si Figma ne fige pas | Le lot L3 attend la sonde S2 et son seuil (section 6) |

Conséquence de D1 pour une dépendance venue d'une bibliothèque : son maître n'a
aucune page dans le fichier, et ses règles vivent dans le fichier de la
bibliothèque. Elle n'est donc jamais contractée : le contrat du parent la
décrit par ses calques, et `releverLesImbriques` la signale comme un imbriqué
sans règles. Aujourd'hui, un conteneur collé n'importe où dans le fichier
suffisait à la déclarer.

Conséquence de D1 pour un fichier qui range ses règles sur une page de
documentation : les dépendances documentées là cessent d'être reconnues. Le
geste de création pose le conteneur à côté du composant, donc sur la page de
son maître.

Le gain de D1 dépend de la sonde S6 (section 6). Si le maître d'une instance ne
donne pas sa page sans que cette page soit chargée, l'index charge les pages
une à une jusqu'à la trouver. Dans le pire cas, il charge alors tout le
document, comme aujourd'hui.

## 3. Verdict sur les pistes

| Piste | Verdict | Lot |
|---|---|---|
| P1 Instrumenter | Retenue | L0 |
| P2 Un maître par instance | Retenue, par une portée d'analyse | L1 |
| P3 réduit, `contientDesInstances` | Retenue | L1 |
| P3 complet, relevé par variant | Conditionnelle : part des parcours dans M1, sonde S5 | L5 |
| P4 sur le balayage des pages | Retenue (D4) | L2 |
| P4 sur `contientDesInstances` | Écartée : le test ne descend dans aucune instance | |
| P5.a `getInstancesAsync` | Écartée : trouver le maître demande déjà un balayage | |
| P5.b Pages des maîtres seules | Retenue (D1) | L2 |
| P5.c Préchauffage | Retenue sous condition (D5) | L3 |
| P5.d Invalidation par page | Retenue, sur les seules pages balayées | L2 |
| Liste des contrats du dépôt | Écartée (D2) | |
| P6 `JSON_REST_V1` | Écartée : couverture des champs inconnue, réécriture de tous les `extract*` | |
| P7 Calcul pur dans l'iframe | Écartée, sauf si M1 lui attribue plus d'un cinquième du temps | |
| P8 Rendre la main | Retenue, à budget de temps | L4 |

## 4. Bornes

- Le contrat reste identique octet pour octet, hors `meta.exportedAt`, pour
  tout ce qui ne dépend pas de D1 et D4. Les lots L0, L1, L4 et L5 ne changent
  aucun contrat. Le lot L2 change la liste des dépendances reconnues, et
  seulement elle.
- L'analyse n'écrit rien dans le document.
- Aucune signature publique de `src/contract/` ne change pour transporter un
  cache. Les caches vivent dans une portée d'analyse (section 5.2).
- Aucun appel à `figma.loadAllPagesAsync` ne reste dans `src/contract/`.
- `figma.skipInvisibleInstanceChildren` ne se pose qu'autour d'un relevé
  synchrone et reprend sa valeur d'avant, dans `src/template/sources.ts` et dans
  le seul fichier du balayage de page.
- Une mémoire qui manque, parce qu'un abonnement est refusé ou qu'une portée
  est déjà ouverte, rend le calcul sans mémoire. Elle ne rend jamais un
  résultat périmé.

## 5. Architecture retenue

### 5.1. La trace de mesure (L0)

Nouveau module `src/contract/mesure.ts`. Il tient, pour une analyse :

- un chronomètre par étape : les étapes de `ETAPES_DE_L_ANALYSE`
  (`exportComponent.ts`), dont les passes de `extractStructure` sous le préfixe
  `structure.`, plus `depot`, la lecture du dépôt que `code.ts` ajoute ;
- des compteurs : `pagesChargees`, `pagesBalayees`, `pagesReutilisees`,
  `nodesParcourus` (somme des longueurs rendues par `findAll` dans
  `getAllNodes`), `appelsGetAllNodes`, `appelsFindAllWithCriteria`,
  `appelsGetMainComponentAsync`, `maitresReutilises`, `respirations`,
  `msEnRespiration`, `msGetAllNodes`, `tailleIndex`. Chaque étape close
  porte aussi ce que ces compteurs ont gagné pendant elle ;
- un maximum : `plusLongSilenceMs`, le plus long intervalle entre deux
  contacts de l'analyse avec l'interface, annonce ou respiration. C'est le plus
  long moment où la note de chargement reste immobile ;
- une empreinte du contrat : FNV-1a 32 bits de `content`, dont la valeur de
  `exportedAt` est remplacée par une chaîne fixe.

La trace court à chaque analyse, dans le build courant, sans build dédié. `code.ts` l'ouvre
au clic et la ferme au verdict. Il l'imprime alors en un seul
`console.log('[ucm:mesure]', …)` et l'envoie à l'interface, qui pose la durée
totale en pied de page et déplie le détail par étape. Elle n'entre jamais dans
`meta.diagnostics`. Une analyse annulée ou en échec avant le contrat jette sa
trace.

La même trace porte l'avancement de la barre de chargement. Chaque étape de
`ETAPES_DE_L_ANALYSE` a un poids, et les boucles longues (pages de l'index,
tranches de la composition, variants de la structure) disent où elles en sont
par `avancer`. `code.ts` envoie l'avancement à chaque annonce et à chaque
respiration, au plus une fois par point de pourcentage ou par seconde de
temps restant. Les poids sont une estimation à corriger d'après les traces
relevées.

Le temps restant vaut le temps écoulé multiplié par `(1 - fraction) /
fraction`. Il n'est rendu qu'après 2 s d'analyse et 5 % d'avancement : plus
tôt, une première étape lente ferait annoncer plusieurs minutes. L'interface
l'écrit sous la barre, « Environ 12 s restantes », arrondi à 5 s au-delà de
20 s.

### 5.2. La portée d'analyse et le résolveur de maîtres (L1)

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

`handleExportComponent` ouvre la portée et la ferme dans un `finally`. Une
seule portée est ouverte à la fois : `code.ts` refuse déjà une seconde
opération par `operationEnCours`. Une ouverture pendant qu'une portée est
ouverte exécute `corps` sans mémoire, et la trace compte ce refus.

`maitreDe` range une `Promise` par `instance.id`. Il remplace l'appel direct
dans cinq fonctions :

| Fonction | Fichier | Traitement actuel d'un échec |
|---|---|---|
| `contractedOwner` | `composedComponents.ts` | `.catch(() => null)` |
| `indexMasterInstances` | `composedComponents.ts` | `.catch(() => null)` |
| `scoreWrapper` | `componentTree.ts` | `.catch(() => null)` |
| `instanceOwnerId` | `layoutNodes.ts` | `try`, `null` |
| `dependencyOpacity` | `extractLayout.ts` | `?.()` puis `.catch(() => null)` |

Les cinq rendent déjà `null` sur un échec, et `maitreDe` fait de même, méthode
absente comprise. L'avertissement de `contractedOwner` reste où il est.
`isRuleInstance` ne passe pas par `maitreDe` : chaque instance de règle n'y est
résolue qu'une fois par analyse, et `reportSelectionState` l'appelle hors de
toute portée.

### 5.3. Le test `contientDesInstances` (L1)

Nouvelle fonction `contientUneInstanceRendue(racine)` dans
`exportableNodes.ts`. Elle demande les instances par
`findAllWithCriteria({ types: ['INSTANCE'] })`, avec le repli sur `findAll`
déjà employé ailleurs. Elle rend vrai dès qu'une instance n'a, entre elle et la
racine, aucun calque `isStaticallyHidden`, elle comprise. C'est le résultat de
`getAllNodes(component).some(…)` sans `composed`.

### 5.4. L'index des composants contractés (L2)

`indexContractedNamesInDocument` est remplacée par :

```ts
export async function indexContractedNames(
  variants: readonly SceneNode[],
  options?: { avantChaquePage?: () => Promise<void>; priorite?: 'fond' | 'analyse' },
): Promise<Set<string>>;
```

Le résultat garde sa forme, un ensemble de noms compactés, et
`scanComposedMatrix`, `releverLesImbriques` et `indexMasterInstances` le lisent
sans changement. La fonction de page actuelle, qui porte déjà ce nom, est
renommée `nomsDeLaPage`.

**Qui est contracté.** Un propriétaire, component set ou composant seul, est
contracté s'il est local et qu'un conteneur de sa propre page écrit son nom
(D1). Un propriétaire distant (`remote === true`) ne l'est jamais.

**Trouver la page d'un maître.** Le calcul part des instances, jamais du
document. `maitreDe(instance)` rend le maître par `getMainComponentAsync`, que
Figma résout par référence, sans balayage. La remontée de `parent` depuis ce
maître atteint le node `PAGE` qui le porte. Seule cette page est ensuite
chargée par `loadAsync`. La sonde S6 vérifie que la remontée fonctionne quand
la page n'est pas chargée. Sinon, le repli charge les pages une à une, page
courante en tête, et s'arrête à celle qui contient le maître.

**Quels propriétaires interroger.** Un calcul en tours :

1. Relever les instances rendues de chaque variant par `getAllNodes(variant)`,
   résoudre leur maître par `maitreDe`, en déduire les propriétaires.
2. Pour chaque propriétaire local nouveau, lire sa page. Charger et balayer
   chaque page nouvelle (ci-dessous). Juger chaque propriétaire nouveau.
3. Pour chaque propriétaire contracté nouveau, relever les instances de son
   maître et de son variant représentatif, que `indexMasterInstances` et
   `indexDependencyPropertySurfaces` parcourront, puis reprendre en 1.

Le calcul s'arrête quand un tour n'ajoute aucun propriétaire. Les maîtres
résolus ici restent dans la portée, et la composition ne les résout pas une
seconde fois.

Le résultat reste indexé par nom, comme aujourd'hui. Deux composants homonymes
sur deux pages partagent donc leur verdict : la même limite que l'index actuel.

**Balayer une page.** `nomsDeLaPage(page)` pose
`figma.skipInvisibleInstanceChildren = true`, relève les calques
`component-name` par `findAllWithCriteria({ types: ['TEXT'] })`, remonte de
chacun à son instance par `proprietaireDuCalque`, puis restaure la valeur
d'avant. Le relevé est synchrone de bout en bout.

**Garder une page.** Une entrée par page balayée, pour la session :

```ts
type EntreeDePage = { noms: ReadonlySet<string>; sale: boolean; ecoutee: boolean };
```

Avant un balayage : `avantChaquePage()`, `page.loadAsync()`, abonnement à
`page.on('nodechange')` si l'entrée n'est pas écoutée, entrée marquée propre,
puis balayage. Un `nodechange` salit l'entrée. Le balayage étant synchrone, un
événement arrive avant ou après lui, jamais pendant. Un abonnement refusé
laisse l'entrée non écoutée, et elle est rebalayée à chaque appel. Un
`loadAsync` qui lève fait échouer l'analyse : une page ignorée en silence
retirerait des noms de l'index.

`creerRegles` appelle `oublierLaPage(figma.currentPage)` après l'écriture :
le `nodechange` qu'elle émet arrive par lots, trop tard pour l'analyse qui
suit. `oublierLIndexDuDocument` vide toutes les entrées ; les tests s'en
servent.

### 5.5. Le préchauffage (L3, sous condition S2)

`reportSelectionState` lance `indexContractedNames` en priorité `fond` quand la
cible est exportable et qu'un variant satisfait `contientUneInstanceRendue`.
Il dure au plus le temps de résoudre les maîtres et de charger les
pages de ces maîtres.

L'appel de fond passe `avantChaquePage: laisserPasserLesOperations`. L'analyse
appelle l'index en priorité `analyse` : tant qu'elle attend, le balayage en
cours remplace sa suspension par une respiration de `setTimeout(0)`. Sans
cette levée, l'analyse attendrait un balayage suspendu par sa propre
opération, le cas que `parcoursReclame` règle déjà pour les sources.

Un composant sans instance ne déclenche rien. Un export de tokens ne charge
aucune page.

### 5.6. Rendre la main (L4)

`respirer`, passé par `code.ts`, fait un `setTimeout(0)` puis
`verifierAnnulation()`. `respirerSiBesoin` ne l'appelle que si
`BUDGET_DE_CALCUL_MS`, 200 ms, se sont écoulées depuis la dernière
respiration. Dans Figma, un `setTimeout(0)` coûte environ 8 ms : à 200 ms, les
respirations coûtent 4 % du calcul, et la note de chargement bouge cinq fois
par seconde. Figma reste figé pendant l'analyse ; le mainteneur l'accepte, et
le budget ne se règle que sur l'envoi de l'avancement et sur l'annulation.

Ces boucles l'appellent : `scanComposedMatrix` entre deux tranches de 16
variants, le calcul de l'index entre deux pages, et chaque boucle par variant
séquentielle, c'est-à-dire l'élection des nodes de layout, les vues exactes de
`extractStructure`, les deux passes de typographie et les échantillons.
`extractVariantTokens` ne respire pas : son `Promise.all` fait tout son calcul
avant le premier `await`, et le découper pourrait changer l'ordre des
avertissements du résolveur. Une annulation lève `ExportAnnule` depuis la
respiration ; le `catch` d'`analyser` la traite déjà, et la portée se ferme
dans son `finally`.

Chaque annonce rend aussi la main, sans lire l'annulation : sans cela, son
texte n'atteindrait l'interface qu'à la respiration suivante, souvent après le
calcul qu'elle annonce. Le moteur attend l'annonce.

### 5.7. Accélérations conditionnelles (L5)

**Relevé par variant.** Condition : `nodesParcourus` et `appelsGetAllNodes`
pèsent plus du quart du temps restant dans M1, et S5 confirme l'ordre préfixe
de `findAll`. La portée garde, par id de racine, le résultat de
`root.findAll(() => true)` et l'indice de fin du sous-arbre de chaque node.
`getAllNodes(racine)` sur un node déjà couvert découpe ce relevé.

**Règles relues à chaque sélection.** Condition : `extractRules` pèse plus d'un
dixième du temps. `reportSelectionState` garde son résultat pour le composant
sélectionné, et l'analyse le reprend tant que la page courante n'a émis aucun
`nodechange` depuis.

## 6. Sondes Figma

Le mainteneur lance chaque sonde dans Figma Desktop, par un script collé dans
un plugin de développement, et consigne le constat avec la version de Figma.

| Sonde | Question | Conséquence |
|---|---|---|
| S1 | `nodechange` est-il émis pour une page non courante, une modification distante, une mise à jour de bibliothèque ? | Sinon, une page balayée est rebalayée à chaque analyse |
| S2 | Le préchauffage fige-t-il Figma ? | Garde ou retire L3 |
| S5 | `node.findAll(() => true)` est-il la tranche du relevé de son ancêtre, dans le même ordre ? | Condition du relevé par variant |
| S6 | Le maître d'une instance, rendu par `getMainComponentAsync`, donne-t-il sa page par ses parents quand cette page n'est pas chargée ? | Sinon, l'index charge les pages une à une jusqu'à trouver le maître |

**Seuil de S2.** Un battement `setTimeout(0)` tourne pendant le préchauffage,
dans le plugin, et relève l'écart entre deux battements. Figma est réputé figé
quand un écart dépasse 100 ms. Le préchauffage est retenu si, sur les trois
fichiers du corpus, à froid, aucun écart ne dépasse 100 ms sur cinq essais, et
si le mainteneur ne constate aucun arrêt du canevas pendant qu'il le fait
défiler. Un seul dépassement retire L3.

## 7. Parité et tests

**Banc de parité.** `tests/paritePerformance.test.ts` exporte chaque composant
simulé de `exportComponent.test.ts` avec la portée, puis sans elle, et compare
les deux `content` après avoir remplacé `exportedAt`. Il couvre L1, L4 et L5.

**Comptes.** Pour un set de N variants qui embarquent la même dépendance,
`getMainComponentAsync` est appelé au plus une fois par id d'instance.

**Index.** Tests du critère : dépendance locale avec conteneur sur sa page,
contractée ; conteneur sur une autre page, non contractée ; dépendance de
bibliothèque, non contractée même si un conteneur du fichier écrit son nom ;
calque `component-name` masqué dans une instance, ignoré. Tests de mémoire : seules les pages des maîtres sont
chargées ; un `nodechange` fait rebalayer sa page seule ; abonnement refusé,
page rebalayée ; tours successifs pour une dépendance de dépendance.

**Lois.** Une loi refuse `loadAllPagesAsync` dans `src/contract/`. La loi du
drapeau accepte deux fichiers, et vérifie dans chacun la pose, la restauration
et l'absence d'`await` entre les deux. Chaque loi se voit rouge avant d'être
crue.

**Dans Figma.** Le mainteneur compare l'empreinte de la trace avant et après
L1 et L4 sur le corpus. Après L2, l'écart d'empreinte se lit dans le diff des
contrats, limité à `composes`, `viewComposes` et ce qui dépend de la
reconnaissance d'une dépendance.
