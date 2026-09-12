# Plan du diff sémantique

> Statut : proposé. Ce plan ferme les décisions nécessaires à une première
> expérimentation locale. Son exécution commence après validation du périmètre.
> Il développe la [piste 3.3](./PISTES-EVOLUTION.md#33-comparer-deux-exports-et-identifier-leur-impact)
> sans modifier le format des contrats ni celui de `tokens.json`.

## Instruction donnée à l'agent

Exécuter les lots dans l'ordre. Après une interruption, reprendre depuis le
journal de preuves. Ne rendre la main que pour la porte humaine H1, une
modification étrangère qui recouvre un fichier visé ou un écart entre le code
et une décision de ce plan.

L'agent travaille dans `UCM-Exporter`. Il utilise les contrats du Playground
comme corpus en lecture seule. Il n'ouvre pas Figma et ne modifie aucun fichier
exporté pour fabriquer une preuve.

La fin d'un lot exige les contrôles et les mutations prévus. Une sortie de
terminal sans résultat consigné ne ferme pas un lot.

## 1. Résultat visé

Une bibliothèque compare deux ensembles de contrats et de tokens. Elle rend un
résultat structuré qui distingue :

- les changements de l'API visuelle ;
- les changements de rendu et de composition ;
- les changements de tokens, mode par mode ;
- la documentation d'usage, les échantillons et les métadonnées ;
- les composants potentiellement touchés par un alias ou une composition.

La commande locale compare une révision Git à l'arbre de travail :

```sh
ucm diff --base <révision>
ucm diff --base <révision> --json <chemin>
```

Le terminal présente un résumé lisible. L'option `--json` écrit le résultat
structuré. Deux exécutions sur les mêmes entrées produisent le même JSON.

Le diff rapporte des faits. Il ne qualifie aucun changement de `major`,
`minor`, compatible ou bloquant. Ces verdicts dépendent des usages du
repository, que la première version ne lit pas.

L'expérimentation répond à deux questions lors de H1 : le résumé réduit-il le
temps de revue, et relève-t-il un changement utile que le diff JSON brut rend
difficile à trouver ? Une sortie exacte mais trop volumineuse ne suffit pas à
adopter la commande.

## 2. Périmètre fermé

Le plan traite :

- les contrats que la fenêtre courante de `@ucm-kit/core` sait lire ;
- les formes de `tokens.json` que `VERSIONS_DE_TOKENS_LUES` accepte ;
- les contrats ajoutés, retirés, renommés ou déplacés ;
- la résolution des catalogues de vues, de liaisons et d'échantillons ;
- les coordonnées de variants, y compris leurs doublons ;
- les valeurs et alias de tokens dans `$value` et `com.ucm.modes` ;
- la propagation par les alias et la composition dans les deux révisions ;
- un résultat JSON versionné et un résumé terminal ;
- la comparaison entre une révision Git et l'arbre de travail.

Le plan ne traite pas :

- l'API Figma, le plugin et son interface ;
- la comparaison du rendu dans un navigateur ;
- les usages dans le code applicatif ;
- la détection automatique d'un renommage de prop ou de token ;
- la qualification d'une rupture ;
- un commentaire de pull request ou un rapport destiné au designer ;
- un serveur, un service externe ou une nouvelle dépendance ;
- la comparaison de deux repositories ou de deux révisions distantes.

Un renommage ou un déplacement de contrat n'est reconnu que si
`componentKey` ou `nodeId` établit son identité. Un token déplacé produit un
retrait et un ajout.

Un besoin extérieur à cette liste rejoint une note distincte. Il ne rallonge
pas la première expérimentation.

## 3. Appuis et limites du code actuel

`vueExacteDuVariant()` résout les cinq catalogues d'une vue.
`projectionDeReference()` résout la structure générale.
`nomFigmaDuVariant()` reconstruit le nom affiché. Le diff doit appeler ces
lecteurs au lieu de connaître les représentations propres à chaque version.

`indexerTokensDtcg()` rend les feuilles et leurs types hérités.
`cheminDeReference()` lit un alias. `collecterReferences()` relève les
références d'un contrat. Ces fonctions fournissent les entrées du calcul
d'impact ; elles ne calculent pas encore le graphe inverse des alias.

`comparerIdentiteDeContrat()` arbitre déjà l'identité par `componentKey`, puis
par `nodeId`. Le rapprochement d'ensembles complète cette règle par le chemin
relatif lorsque les deux arbitres sont absents.

`packages/plugin/tests/comparerTokens.ts` compare une migration précise du
format de tokens. Il admet seulement les différences décidées pour cette
migration. Il reste un utilitaire de test et ne devient pas le comparateur
générique.

Le CLI sait relever des chemins modifiés avec Git. Le nouveau collecteur doit
aussi lire le contenu d'une révision. Il appelle Git avec une liste d'arguments
et sans shell.

## 4. Décisions qui ne sont plus à prendre

### D1. Emplacement et activation

Les fonctions pures appartiennent à `@ucm-kit/core/lecteurs`. La commande
appartient à `@ucm-kit/cli` sous le nom `ucm diff`.

La première version ne crée pas de paquet. Le module ne s'exécute que lorsque
le développeur appelle la commande. Son absence d'appel produit donc le même
effet qu'une désactivation : aucun fichier, verdict ou coût supplémentaire.

Cette décision évite de construire le mécanisme général de modules décrit dans
les pistes d'évolution. Un besoin de versionnement indépendant pourra justifier
un paquet après H1.

### D2. Entrées de la bibliothèque et de la commande

La bibliothèque reçoit deux instantanés déjà chargés. Chaque instantané porte :

- une étiquette stable pour le côté comparé ;
- les couples `{ path, document }` des contrats ;
- le couple `{ path, document }` de `tokens.json`, s'il existe ;
- la configuration complète employée pour trouver ces fichiers.

La bibliothèque ne lit ni le disque ni Git.

La commande exige `--base <révision>`. Elle lit l'instantané de gauche dans
l'objet Git et celui de droite dans l'arbre de travail. Chaque côté utilise son
propre `ucm.config.json`, ou les valeurs par défaut si ce fichier est absent à
cette révision. Les fichiers non suivis de l'arbre de travail entrent dans le
côté droit.

La commande résout d'abord `--base` en identifiant de commit. Tous les appels
suivants emploient cet identifiant, jamais la valeur fournie par l'utilisateur.
Les chemins de configuration doivent être relatifs au repository, normalisés
et rester sous sa racine. Un chemin absolu ou qui remonte au-dessus de la
racine rend l'instantané illisible. Le côté droit lit tous les contrats
présents sur disque sous `components`, qu'ils soient suivis, ignorés ou non
suivis.

La première version n'accepte ni `--head`, ni URL, ni branche distante. La
bibliothèque reste appelable par un futur adaptateur qui fournit d'autres
instantanés.

### D3. Validation avant comparaison

Chaque instantané passe les contrôles suivants avant le premier calcul :

1. lecture de sa configuration ;
2. analyse JSON de chaque artefact ;
3. `verdictDeVersion()` sur chaque contrat ;
4. `champsInvalidesDuContrat()` ;
5. `validerGrapheDesContrats()` sur l'ensemble ;
6. `etatDuFormatDeTokens()` lorsque le fichier existe ;
7. validation des groupes, feuilles, modes et références de tokens ;
8. détection des cibles d'alias absentes et des cycles d'alias.

Un contrat ou un fichier de tokens illisible rend l'instantané non comparable.
Le résultat passe à `failed`, nomme le côté, le chemin et la cause, puis laisse
`changes` et `impacts` vides. Aucun sous-ensemble valide ne reçoit alors un
relevé présenté comme complet. Une ambiguïté d'identité entre contrats passe à
`partial` : les artefacts ambigus rejoignent `uncompared`, tandis que les
autres restent comparés.

`verdictDeVersion()` précède la validation de forme. Seuls les contrats dont le
verdict vaut `ok` passent à `champsInvalidesDuContrat()`. La validation des
tokens appartient au nouveau module de diff : `indexerTokensDtcg()` indexe des
feuilles déjà jugées, mais ne valide pas un document DTCG.

L'absence d'un contrat d'un seul côté constitue un ajout ou un retrait.
L'absence de `tokens.json` des deux côtés ne produit aucun changement. Sa
présence d'un seul côté produit l'ajout ou le retrait du fichier.

### D4. Identité des contrats

Le rapprochement suit la priorité de `comparerIdentiteDeContrat()` :

1. même `componentKey`, présent et unique dans les deux instantanés ;
2. même `nodeId`, présent et unique des deux côtés, seulement si au moins un
   contrat ne porte pas de `componentKey` ;
3. même chemin relatif, seulement si aucun des deux contrats ne porte un
   arbitre comparable ;
4. aucune association dans les autres cas.

Deux contrats associés par un arbitre stable peuvent changer de nom ou de
chemin. Le diff rapporte alors ce changement d'identité en plus de leurs autres
écarts.

Deux `componentKey` présents et différents désignent des contrats distincts,
même lorsque leurs `nodeId` coïncident. Deux `componentKey` égaux établissent
l'identité ; un écart de `nodeId` devient alors un changement de métadonnée.
La même règle vaut pour deux `nodeId` lorsque cet arbitre prend la main. Une
valeur candidate à l'association, mais dupliquée dans un instantané, rend le
rapprochement ambigu. Le résultat place les artefacts concernés dans
`uncompared` et ne suppose aucun renommage.

### D5. Identité des variants

La coordonnée d'un variant est son objet `values`, ordonné par clé pour la
comparaison. Le `COMPONENT` sans axe utilise la coordonnée vide. `nodeId`,
`figmaName`, `view` et les clés de catalogues ne participent pas à cette
identité.

Plusieurs variants peuvent porter la même coordonnée. Le comparateur les traite
comme un multiensemble :

1. il retire les projections complètes strictement égales, tous domaines
   comparés compris ;
2. il compare les deux occurrences restantes lorsqu'il n'en reste qu'une de
   chaque côté ;
3. il rapporte les occurrences ajoutées et retirées lorsque plusieurs
   appariements restent possibles.

Cette règle conserve chaque variant sans inventer une correspondance fondée sur
sa position ou son identifiant Figma.

### D6. Projection comparée d'un contrat

Chaque variant est développé avant comparaison :

- `view` devient les cinq parties rendues par `vueExacteDuVariant()` ;
- une liaison devient sa définition et son emplacement résolus ;
- `sample` devient l'échantillon référencé ;
- les clés intermédiaires de catalogues disparaissent.

La projection générale est résolue avec `projectionDeReference()`. Le diff
compare son arbre, ses dimensions par taille et ses axes. Les noms Figma des
variants viennent de `nomFigmaDuVariant()` et rejoignent `metadata`.

La projection sépare sept domaines :

| Domaine | Contenu |
|---|---|
| `api` | props sans leur documentation, coordonnées disponibles, états et sélecteurs |
| `rendering` | structure, typographie, peintures, strokes, icônes et sémantique de rendu |
| `composition` | dépendances exactes de chaque variant |
| `documentation` | descriptions de props et d'états, `intent` |
| `sample` | contenu résolu depuis `samples` |
| `metadata` | couverture, diagnostics, noms et adresses Figma |
| `tokens` | fichier DTCG, traité par la projection de D7 |

`meta.exportedAt` et `meta.contractVersion` ne produisent jamais de changement.
Leur rôle est de dater l'export et de choisir la grammaire de lecture. Les clés
de catalogues, leurs entrées non utilisées et l'ordre des propriétés JSON ne
produisent aucun changement. Les tableaux dont le format porte l'ordre le
conservent, notamment les enfants, la précédence des états et les occurrences
de composition.

Chaque champ public reçoit un seul domaine. Les axes, les états et les
liaisons natives résolues relèvent de `api`; `sizes`, les références de couleur
des variants et les cinq parties d'une vue relèvent de `rendering`, sauf
`composes`; les libellés Figma, identifiants de nodes et adresses Figma relèvent
de `metadata`. Les descriptions restent dans `documentation`, y compris celles
qui vivent sous une prop ou un état. Un test d'exhaustivité construit un
contrat minimal, mute chaque feuille publique et refuse toute feuille non
classée ou classée deux fois.

Les objets se comparent récursivement par clé. Les scalaires se comparent avec
leur type. Un tableau ordonné se compare comme une valeur au chemin du tableau :
la première version ne lui invente pas d'identité interne. Les seules
exceptions sont les valeurs d'enum, comparées comme un ensemble, et les
variants, rapprochés par D5. Cette granularité évite qu'une insertion dans
`children` produise une cascade de faux changements par position.

Les valeurs d'un enum sont comparées comme un ensemble. Leur ajout ou retrait
est rapporté séparément. Le diff n'interprète jamais un retrait suivi d'un ajout
comme un renommage.

Le champ global `composes` se dérive des vues. Il alimente le graphe d'impact,
mais ne produit pas un second changement en plus de la vue concernée.

### D7. Projection comparée des tokens

Les tokens sont identifiés par leur chemin pointé. Pour chaque feuille, le diff
compare :

- le `$type` effectif, héritage compris ;
- `$value` ;
- chaque valeur de `com.ucm.modes` ;
- les extensions autres que la marque de version du format.

Un mode absent se distingue d'un mode présent à `null`. Un alias se compare
comme une référence. Un alias remplacé par un autre est rapporté même lorsque
les deux chaînes aboutissent au même littéral.

Les métadonnées de groupe sont comparées par chemin. La marque de version sert
à décider si le document est lisible ; sa seule variation entre deux versions
acceptées ne constitue pas un changement de token.

Le `$type` d'un groupe n'est pas rapporté une seconde fois : son effet apparaît
sur le `$type` effectif de chaque feuille descendante. Les autres métadonnées de
groupe, dont `$description` et `$extensions`, restent comparées à leur chemin.
Une feuille ajoutée ou retirée produit un seul fait portant sa valeur complète.
L'ajout ou le retrait de `tokens.json` se développe de la même façon, feuille
par feuille, avec les métadonnées de groupe concernées.

### D8. Calcul de l'impact potentiel

Le résultat distingue un changement direct d'un impact potentiel.

Pour les tokens, le moteur construit le graphe inverse des alias dans chaque
instantané. Il prend l'union des deux graphes. Un token modifié touche
potentiellement ses alias transitifs, puis les contrats normatifs qui citent
l'un de ces chemins. `samples` et `meta` restent exclus de ce relevé.

Pour les contrats, le moteur construit le graphe inverse de composition dans
chaque instantané. Il prend leur union. Un contrat directement modifié ou
touché par un token rend chacun de ses parents transitifs potentiellement
touché.

Le graphe ne prend pas le nom du composant pour identité commune aux deux
instantanés. Dans chaque côté, une cible de `composes` est d'abord résolue vers
son contrat validé, puis ce contrat est remplacé par l'identité issue de D4.
Ainsi, un composant renommé conserve ses anciennes et nouvelles arêtes dans
l'union. Un contrat non rapproché garde une identité limitée à son côté.

Chaque impact porte une cause et un chemin de propagation. Le moteur conserve
un chemin minimal déterministe. Le mot `potential` reste dans la sortie
structurée et « à vérifier » dans le terminal. Le diff ne prétend pas qu'un
parent ou son code doit changer.

La déduplication porte sur le couple cause-cible. Deux causes distinctes restent
visibles. À cause égale, le chemin minimal contient le moins d'arêtes ; à
longueur égale, l'ordre des identités de contrats et des chemins de tokens
tranche selon les points de code Unicode.

### D9. Forme du résultat

Le JSON porte `diffFormatVersion: 1` et `status`, qui vaut `complete`, `partial`
ou `failed`. Les discriminants et clés publiques sont en anglais, comme ceux
des contrats. Les textes du terminal sont en français.

Chaque changement structuré porte au minimum :

```json
{
  "artifact": {
    "type": "contract",
    "before": { "name": "Button", "path": "components/Button/Button.contract.json" },
    "after": { "name": "Button", "path": "components/Button/Button.contract.json" }
  },
  "domain": "api",
  "kind": "removed",
  "path": "/props/variant/values/text",
  "before": "text"
}
```

`kind` vaut `added`, `removed` ou `changed`. Un changement situé dans un
variant porte aussi sa coordonnée. `path` est un JSON Pointer dans la projection
sémantique du domaine, avec l'échappement de la RFC 6901. Un fait sur un contrat
entier emploie le pointeur vide. Un changement de token porte un artefact de
type `token`, identifié par son chemin pointé, et un pointeur dans sa feuille.
Les valeurs complètes restent dans le JSON ; le terminal affiche le chemin et
un résumé borné. Un ajout ou un retrait de contrat porte sa projection complète
une seule fois et ne se développe pas en un fait par feuille.

Le document porte cinq collections : `changes`, `impacts`, `uncompared`,
`issues` et `inputs`. `uncompared` contient les contrats dont l'identité reste
ambiguë. `issues` contient les causes d'un résultat `partial` ou `failed`, avec
le côté, le chemin et un code stable. `inputs` porte les étiquettes, les
configurations et l'identifiant de commit résolu pour la base ; il ne porte ni
chemin absolu ni date courante.

Les collections et les clés des objets sérialisés sont triées avec un
comparateur de points de code Unicode, sans `localeCompare()`. La sérialisation
canonique fixe aussi l'ordre des clés imbriquées. Deux exécutions qui reçoivent
les mêmes documents produisent ainsi le même JSON à l'octet.

### D10. Codes de sortie et écritures

La commande sort avec :

| Code | Sens |
|---|---|
| `0` | résultat `complete`, avec ou sans changement |
| `2` | invocation invalide, révision absente ou résultat `partial` ou `failed` |

Le code `1` reste réservé aux contrôles rouges de `ucm check`. Le diff ne rend
aucun verdict de conformité.

Sans `--json`, la commande n'écrit aucun fichier. Avec cette option, elle écrit
uniquement le chemin demandé. Elle n'ouvre aucune pull request et ne modifie
aucun artefact comparé.

## 5. Matrice de validation obligatoire

### Contrats et catalogues

| Cas | Résultat attendu |
|---|---|
| mêmes contrats reparsés | aucun changement |
| propriétés JSON réordonnées | aucun changement |
| catalogues et renvois renumérotés à contenu égal | aucun changement |
| `exportedAt` seul modifié | aucun changement |
| `contractVersion` seule modifiée entre deux versions lues | aucun changement |
| nom ou chemin modifié sous la même identité Figma | changement `metadata` |
| même `componentKey`, `nodeId` modifié | contrat rapproché et changement `metadata` |
| `componentKey` différents, `nodeId` identiques | contrats distincts |
| prop ajoutée ou retirée | fait `api` distinct |
| prop retirée et autre prop ajoutée | deux faits, aucun renommage supposé |
| type ou défaut de prop modifié | changement `api` |
| valeur d'enum ajoutée ou retirée | ajout ou retrait ciblé |
| description seule modifiée | changement `documentation` |
| variant ajouté ou retiré | fait situé à sa coordonnée |
| vue égale sous une autre clé de catalogue | aucun changement |
| structure, typographie ou peinture modifiée | changement `rendering` situé |
| `nodeId` de variant seul modifié | changement `metadata` |
| contenu de maquette seul modifié | changement `sample` |
| diagnostic ou couverture modifié | changement `metadata` |
| feuille publique mutée | un seul domaine, jamais aucun ni deux |
| enfant inséré dans un tableau ordonné | un changement au chemin du tableau |

### Coordonnées dupliquées

| Cas | Résultat attendu |
|---|---|
| deux occurrences égales inversées | aucun changement |
| une occurrence égale et une modifiée | une modification située au groupe |
| une occurrence retirée | un retrait |
| plusieurs appariements possibles | ajouts et retraits, aucune association inventée |
| projections normatives égales, échantillons différents | écart `sample` conservé |

### Tokens

| Cas | Résultat attendu |
|---|---|
| mêmes feuilles sous des clés JSON réordonnées | aucun changement |
| token ajouté, retiré ou déplacé | faits distincts par chemin |
| `$type` hérité modifié | changement sur chaque feuille concernée |
| `$type` d'un groupe modifié | aucun second fait sur le groupe |
| littéral modifié | changement dans le mode concerné |
| mode ajouté, retiré ou passé à `null` | trois faits distincts |
| alias modifié, valeur résolue identique | dépendance modifiée |
| alias aplati | dépendance remplacée par un littéral |
| chaîne d'alias touchée | impacts transitifs rendus |
| cycle d'alias | comparaison refusée avec sa cause |
| version de tokens acceptée différente | aucun changement pour la marque seule |
| version future ou invalide | comparaison refusée avant l'index |
| cible d'alias absente | résultat `failed` avec le chemin de l'alias |

### Composition et impact

| Cas | Résultat attendu |
|---|---|
| dépendance ajoutée dans une vue | changement direct sur le parent |
| dépendance retirée | ancien graphe encore utilisé pour calculer les parents potentiels |
| dépendance conditionnelle | seuls les variants concernés sont situés |
| deux occurrences identiques | cardinalité conservée |
| contrat enfant modifié | parents transitifs marqués `potential` |
| contrat enfant renommé sous le même `componentKey` | anciennes et nouvelles arêtes réunies |
| token modifié derrière deux alias | contrats qui citent les alias relevés |
| token cité seulement dans `samples` ou `meta` | aucun impact normatif |
| graphe de contrats invalide | comparaison refusée avant la propagation |

### CLI et reproductibilité

| Cas | Résultat attendu |
|---|---|
| base Git inconnue | code `2`, cause explicite |
| base commençant par `-` | valeur résolue sans interprétation comme option Git |
| configuration différente entre les révisions | chaque côté lit ses propres chemins |
| chemin absolu ou sortant du repository | code `2`, aucun fichier extérieur lu |
| contrat suivi retiré | retrait relevé |
| contrat non suivi ajouté | ajout relevé |
| changement présent | code `0` |
| aucune différence | code `0` et résumé explicite |
| identité ambiguë | statut `partial`, code `2` et autres contrats comparés |
| artefact invalide | statut `failed`, code `2`, aucun changement partiel |
| deux exécutions identiques | JSON identique à l'octet |
| chemin `--json` fourni | ce seul fichier est écrit |
| argument inconnu ou valeur manquante | code `2` et aide ciblée |

## 6. Journal de preuves

Le lot L0 crée `docs/notes/PREUVES-DIFF-SEMANTIQUE.md`. Ce fichier sert de
point de reprise. Il suit cette forme :

```markdown
# Preuves du diff sémantique

## État

- Lot courant : L0
- Exporter, branche et HEAD :
- Playground, branche et HEAD :
- Révisions du corpus :
- Dernière porte humaine franchie : aucune

## Lots

### L0 : référence

- Commit :
- Commandes :
- Résultats :
- Mutations :
- Écart ou réserve : aucun
```

Chaque lot renseigne les cinq lignes. Les commandes portent leur code de sortie
et un résultat court. Les sorties complètes ne sont pas copiées. Un artefact
temporaire reçoit un chemin et une empreinte SHA-256.

Une réserve non résolue arrête le lot suivant. Le journal indique le commit qui
ferme le lot, ou `non créé` lorsque le mainteneur n'a pas autorisé les commits.
Dans ce second cas, il porte aussi les chemins modifiés et l'empreinte du diff.

## 7. Procédure de reprise

Au début du travail et après une interruption :

1. lire `AGENTS.md`, `CONTRIBUTING.md`, ce plan et le journal ;
2. charger la skill requise avant tout texte ou commentaire ;
3. relever la branche, `git rev-parse HEAD` et `git status --short` ;
4. comparer ces valeurs à l'état du journal ;
5. lire les modifications non commitées sans les remplacer ;
6. vérifier que les chemins et l'empreinte du diff correspondent au journal ;
7. relancer le dernier contrôle vert du lot courant ;
8. reprendre à la première action sans preuve.

L'agent s'arrête avant H1 si une modification étrangère recouvre un fichier
visé, si un contrôle de référence échoue ou si une action exige une autorisation
absente. Le journal nomme alors le lot et la preuve manquante.

## 8. Règles d'exécution

Chaque lot suit cette séquence :

1. écrire le test du comportement visé ;
2. constater son échec pour la raison attendue ;
3. appliquer le changement minimal ;
4. passer les tests ciblés ;
5. passer les contrôles complets des paquets touchés ;
6. relire le diff ;
7. exécuter la mutation négative prévue ;
8. restaurer la mutation sans toucher aux modifications antérieures au lot ;
9. mettre à jour le journal ;
10. relever les chemins modifiés et l'empreinte du diff.

Les lots sont des points de preuve, pas des commits obligatoires. Les lots L1 à
L7 restent dans une même montée de version : les commiter séparément obligerait
chaque lot qui touche le contenu publié à monter de nouveau la version du
paquet. Si le mainteneur autorise les commits, un commit ferme L0, puis un seul
commit d'implémentation ferme L1 à L7 après la montée des versions et les
contrôles complets. L8 reçoit son propre commit lorsqu'il modifie l'issue de
H1.

Raccourcis interdits :

- comparer directement les clés de `variantViews` ou des catalogues ;
- employer `JSON.stringify()` comme seule définition de l'égalité ;
- apparier deux variants par leur position ;
- déduire un renommage d'un retrait suivi d'un ajout ;
- aplatir un alias avant de le comparer ;
- présenter un impact potentiel comme une modification certaine ;
- continuer après une entrée invalide avec un résultat partiel silencieux ;
- modifier un fixture ou un export réel pour satisfaire un attendu.

Chaque lot de code passe les tests, le typecheck et le build des paquets qu'il
touche, puis `git diff --check`. L7 monte une seule fois les versions des
paquets publiables concernés, met à jour leurs dépendances exactes et passe les
contrôles complets du repository :

```sh
npm test
npm run typecheck
npm run build
git diff --check
```

Chaque lot documentaire passe aussi le contrôle de style sur les documents
modifiés et les tests documentaires ciblés.

## 9. Lots d'implémentation

### L0 : état de référence et corpus

But : enregistrer un état reproductible avant le premier changement.

Fichiers autorisés :

- `docs/notes/PREUVES-DIFF-SEMANTIQUE.md` ;
- fixtures et utilitaires de test ajoutés pour ce plan ;
- aucun fichier de production.

Actions :

- [ ] Relever l'état de `UCM-Exporter` et de `UCM-Playground`.
- [ ] Passer les contrôles complets de l'Exporter.
- [ ] Choisir deux paires de contrats suivis dans l'historique : une avec un
      changement réel, une avec du bruit de catalogage si elle existe.
- [ ] Copier les entrées minimales dans des fixtures anonymisées lorsque les
      tests ne peuvent pas dépendre de l'historique Git.
- [ ] Enregistrer les révisions et empreintes du corpus.
- [ ] Créer le journal.

Critère de sortie : le corpus contient un changement normatif et un changement
de représentation, ou la réserve sur le second est consignée avant L1.

### L1 : modèle public du résultat

But : fixer la sortie avant d'écrire les algorithmes qui la remplissent.

Fichiers autorisés :

- nouveau module de diff dans `packages/kit/src/lecteurs/` ;
- porte publique et déclaration TypeScript des lecteurs ;
- tests de surface du kit ;
- README du kit ;
- manifestes concernés si la surface publiable change ;
- journal.

Actions :

- [ ] Définir `diffFormatVersion`, les quatre collections et leurs
      discriminants.
- [ ] Écrire le tri déterministe du résultat.
- [ ] Séparer `changes` et `impacts` dans les types et les tests.
- [ ] Représenter une comparaison impossible sans exception non contrôlée.
- [ ] Exposer les fonctions pures par `@ucm-kit/core/lecteurs`.
- [ ] Vérifier la déclaration TypeScript depuis un consommateur temporaire.
- [ ] Muter un discriminant et prouver que le test de surface échoue.

Critère de sortie : les lots suivants peuvent produire le résultat sans ajouter
de champ public ni de catégorie.

### L2 : rapprochement et normalisation des contrats

But : retirer le bruit propre au stockage avant de relever les changements.

Fichiers autorisés :

- modules de diff du kit ;
- tests voisins ;
- journal.

Actions :

- [ ] Valider les deux ensembles avant comparaison.
- [ ] Rapprocher les contrats selon D4.
- [ ] Résoudre les vues, liaisons et échantillons avec les lecteurs publics.
- [ ] Construire les groupes de variants selon D5.
- [ ] Canonicaliser les objets sans trier les tableaux significatifs.
- [ ] Écarter `exportedAt` et les clés intermédiaires de catalogues.
- [ ] Couvrir la section « Contrats et catalogues » de la matrice.
- [ ] Renuméroter temporairement tous les catalogues d'un fixture ; le résultat
      doit rester vide.

Critère de sortie : une différence de représentation ne produit aucun fait.

### L3 : comparaison des obligations d'un contrat

But : relever les changements directs et les situer dans leur domaine.

Fichiers autorisés :

- modules de diff du kit ;
- tests voisins ;
- journal.

Actions :

- [ ] Comparer l'API et les valeurs d'enum sans dépendre de leur ordre.
- [ ] Comparer les vues développées, partie par partie.
- [ ] Comparer la composition avec son ordre et sa cardinalité.
- [ ] Séparer descriptions, `intent`, échantillons et métadonnées.
- [ ] Traiter les coordonnées dupliquées sans appariement arbitraire.
- [ ] Produire un ajout ou un retrait pour un contrat non rapproché.
- [ ] Muter successivement une prop, une structure, une dépendance et un
      échantillon ; chaque écart doit rejoindre son domaine.

Critère de sortie : chaque cas des deux premières sections de la matrice produit
le fait attendu et aucun fait voisin.

### L4 : comparaison des tokens

But : comparer les feuilles et leurs modes sans aplatir leurs dépendances.

Fichiers autorisés :

- modules de diff du kit ;
- tests voisins ;
- journal.

Actions :

- [ ] Contrôler la version avant l'index des feuilles.
- [ ] Comparer les chemins, types effectifs, valeurs, modes et extensions.
- [ ] Distinguer un mode absent d'une valeur `null`.
- [ ] Construire les graphes d'alias des deux instantanés.
- [ ] Détecter les cibles absentes et les cycles avant le calcul d'impact.
- [ ] Ignorer la seule variation d'une marque de version acceptée.
- [ ] Couvrir la section « Tokens » de la matrice.
- [ ] Aplatir temporairement un alias et prouver que le test le signale.

Critère de sortie : un changement de dépendance reste visible même si sa valeur
résolue ne change pas.

### L5 : impact transitif

But : rendre les contrats à vérifier sans leur attribuer un changement certain.

Fichiers autorisés :

- modules de diff du kit ;
- tests voisins ;
- journal.

Actions :

- [ ] Construire l'union des graphes d'alias avant et après.
- [ ] Relever les références normatives des contrats.
- [ ] Construire l'union des graphes inverses de composition.
- [ ] Propager chaque cause avec un chemin minimal déterministe.
- [ ] Dédupliquer les impacts atteints par plusieurs chemins.
- [ ] Couvrir la section « Composition et impact » de la matrice.
- [ ] Retirer temporairement les anciennes arêtes de l'union ; le test d'une
      dépendance supprimée doit échouer.

Critère de sortie : tout impact porte sa cause, son chemin et le marqueur
`potential`.

### L6 : adaptateur Git et commande locale

But : rendre le moteur utilisable dans une revue courante.

Fichiers autorisés :

- `packages/cli/src/diff.mjs` ;
- `packages/cli/src/ucm.mjs` ;
- tests du CLI ;
- README et aide du CLI ;
- manifestes concernés si leur contenu publiable change ;
- journal.

Actions :

- [ ] Lire `--base` et `--json`, puis refuser tout argument restant.
- [ ] Vérifier la révision sans interpolation dans un shell.
- [ ] Charger la configuration et les artefacts de la base depuis Git.
- [ ] Charger l'arbre de travail et ses fichiers non suivis depuis le disque.
- [ ] Appeler la bibliothèque sans recopier sa logique dans le CLI.
- [ ] Rendre un résumé terminal groupé par domaine et composant.
- [ ] Écrire le JSON seulement sous `--json`.
- [ ] Appliquer les codes de sortie de D10.
- [ ] Couvrir la section « CLI et reproductibilité » dans des repositories
      temporaires.
- [ ] Passer une révision contenant des caractères réservés comme argument ;
      aucune commande supplémentaire ne doit être exécutée.

Critère de sortie : la commande compare une base à l'arbre de travail sans
checkout et sans modifier les artefacts.

### L7 : recette automatisée et audit

But : vérifier le flux complet avant la lecture humaine du résultat.

Actions :

- [ ] Exécuter la commande sur chaque paire du corpus de L0.
- [ ] Comparer le résultat au diff brut et expliquer chaque ligne supprimée.
- [ ] Exécuter deux fois chaque comparaison et comparer les JSON à l'octet.
- [ ] Exécuter toutes les mutations de L1 à L6, puis restaurer l'arbre.
- [ ] Installer les archives du kit et du CLI dans un repository temporaire.
- [ ] Appeler la porte publique et le binaire depuis les archives installées.
- [ ] Passer deux fois `npm test`, `npm run typecheck` et `npm run build`.
- [ ] Vérifier que la seconde passe ne modifie aucun fichier suivi.
- [ ] Passer les tests documentaires et `git diff --check`.
- [ ] Préparer pour H1 le diff brut, le résultat structuré et le résumé
      terminal des deux paires.

Critère de sortie : tout contrôle automatisable est vert et chaque différence
du résultat possède une entrée connue dans le corpus.

## 10. Porte humaine

### H1 : utilité en revue

Le mainteneur lit le diff brut et le résumé sémantique des deux paires sans
ouvrir le code du comparateur. Il relève :

1. les changements utiles présents dans les deux vues ;
2. les changements utiles visibles seulement dans le diff sémantique ;
3. les lignes du résumé qui demandent encore d'ouvrir le JSON brut ;
4. les faits absents ou présentés dans un mauvais domaine ;
5. le temps de lecture de chaque vue.

Le mainteneur choisit ensuite l'une de ces issues :

- adopter la commande locale ;
- demander une correction bornée et rejouer H1 ;
- conserver la bibliothèque sans exposer la commande ;
- retirer l'expérimentation.

Une intégration au rapport de pull request demande une décision distincte. H1
ne l'autorise pas implicitement.

## 11. Fermeture

### L8 : décision et documentation

But : mettre le repository en accord avec l'issue de H1.

Actions selon la décision :

- [ ] Si la commande est adoptée, documenter son usage dans les README du kit
      et du CLI.
- [ ] Si la bibliothèque seule est retenue, retirer la route et l'aide du CLI.
- [ ] Si l'expérimentation est retirée, supprimer son code et conserver les
      mesures dans le journal.
- [ ] Mettre à jour `ROADMAP.md` et la piste 3.3 sans recopier les décisions
      portées par le code.
- [ ] Vérifier les versions des paquets dont le contenu publiable a changé.
- [ ] Produire les archives et vérifier leur contenu.
- [ ] Passer les contrôles complets une dernière fois.
- [ ] Fermer le journal sans réserve ouverte, ou nommer chaque réserve
      conservée.

La publication npm reste hors de ce plan. Elle exige l'autorisation du
mainteneur et suit le workflow de publication existant.

## 12. Conditions de fin

Le plan est terminé seulement si :

- [ ] les deux instantanés sont validés avant tout calcul ;
- [ ] les identités ambiguës restent dans `uncompared` ;
- [ ] une renumérotation de catalogue ne produit aucun changement ;
- [ ] chaque changement direct porte un domaine, un chemin et ses valeurs ;
- [ ] chaque impact transitif reste qualifié de potentiel ;
- [ ] les anciens graphes participent aux impacts d'une suppression ;
- [ ] les changements d'alias restent visibles sans résolution préalable ;
- [ ] le JSON est identique à l'octet sur deux exécutions ;
- [ ] les archives installées exposent la même API et la même commande ;
- [ ] H1 porte une décision explicite ;
- [ ] la documentation et les versions correspondent à cette décision ;
- [ ] le journal ne contient aucune réserve ouverte.

L'agent livre alors les commits, les commandes exécutées, les résultats des
mutations et la décision issue de H1.
