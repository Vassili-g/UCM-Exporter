# Plan de travail — un remplacement par défaut porte un nom

**Statut : proposition.** Ce document décrit un défaut connu, sa famille, et la
manière de le corriger une fois pour toutes. Aucune décision n'est prise ; les
points ouverts sont marqués **[À DÉCIDER]**.

Le comportement actuel vit dans [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md),
les priorités dans [ROADMAP.md](./ROADMAP.md).

---

## 1. Le défaut, en clair

Figma connaît trois façons de désigner un composant.

| Ce que Figma manipule | À quoi ça ressemble | Ce que ça vaut pour un développeur |
|---|---|---|
| Un **id de node** | `1:1`, `229:496` | Rien. Il est propre à un fichier, il change d'un document à l'autre, et personne ne peut l'écrire de mémoire. |
| Une **clé de publication** | `8f3c1e2a…` (40 caractères) | Rien non plus. C'est l'adresse interne d'un composant dans la bibliothèque. |
| Un **nom** | `check`, `arrow-left-long` | Tout. C'est ce que le développeur tape dans son code. |

Le contrat n'a le droit de publier que la troisième colonne. C'est la règle
fondatrice du module d'échantillons, et elle vaut pour tout l'artefact :

> **Règle 1** — le contrat n'admet que ce qu'un développeur pourrait écrire
> lui-même.
>
> **Règle 2** — ce qu'on ne sait pas nommer est omis, jamais deviné. Mais
> « omettre » n'autorise pas à « perdre » : l'omission se signale.

Or, quand un designer expose un remplacement d'icône **natif** dans Figma — une
component property de type `INSTANCE_SWAP` — Figma nous rend, comme valeur par
défaut, un id de node. Le contrat le republie tel quel :

```json
"props": {
  "iconLeftName": {
    "type": "instance-swap",
    "default": "1:1",
    "preferredValues": [{ "type": "COMPONENT", "key": "8f3c1e2a…" }]
  }
}
```

Le développeur lit ce contrat et se demande quelle icône est affichée par
défaut. La réponse est `check`. Le contrat lui répond `1:1`. Il ne peut ni la
deviner, ni la vérifier, ni l'écrire.

### Ce n'est pas un cas isolé, c'est une famille

Le même « id publié à la place d'un nom » se trouve à **trois** endroits, tous
dans [`parsers.ts`](./src/contract/parsers.ts) :

| Endroit | Nature de la valeur |
|---|---|
| `props.<x>.default` d'un `instance-swap` | id de node |
| `props.<x>.default` d'un `slot` | id de node, quand c'est une chaîne |
| `props.<x>.preferredValues[].key`, sur `instance-swap` **et** `slot` | clé de publication |

`preferredValues` est le cas le plus gênant : c'est la **liste des composants
autorisés**, celle où le développeur est justement censé choisir. Publiée en
hexadécimal, elle ne sert à rien.

Le type l'assume aujourd'hui en toutes lettres, dans
[`types.ts`](./src/contract/types.ts) : « *Id du composant Figma choisi par
défaut.* »

### Pourquoi ça n'a pas encore fait de dégât

Aucun composant du corpus n'expose d'`INSTANCE_SWAP` native. Les icônes de
Button et de TileLink passent par une **prop synthétique**, fabriquée par les
règles `@icons` dans [`mergeIconRules.ts`](./src/contract/mergeIconRules.ts) —
et celle-là publie honnêtement `default: null`.

Le jour où un designer expose le remplacement nativement, `mergeIconRules`
s'efface volontairement devant la prop native — « *pour ne pas obliger le
consommateur à choisir entre deux sources de vérité* » — et pose
`icons.<x>.runtimeProp` dessus. Le développeur suit ce renvoi et tombe sur
`1:1`. Le défaut est **latent, pas théorique** : il est sur le chemin nominal
de la composition d'icônes.

### Pourquoi la correction est un chantier à part

Un id ne devient un nom qu'en allant chercher le node. Cela demande
`figma.getNodeByIdAsync()` — un **aller-retour asynchrone**.

Or [`parsers.ts`](./src/contract/parsers.ts) est **pur et synchrone**, et c'est
délibéré. Il a deux appelants :

1. [`exportComponent.ts`](./src/contract/exportComponent.ts) — l'orchestrateur,
   qui est `async` et pourrait attendre ;
2. [`extractSamples.ts`](./src/contract/extractSamples.ts) — qui l'appelle pour
   retrouver les clés publiques du contrat d'une **dépendance**, sans la
   réexporter. Ce module-là est synchrone par contrat explicite : « *un module
   pur qui n'attend rien ne peut pas ordonner ses trouvailles au hasard des
   allers-retours* ».

Rendre `parsers.ts` asynchrone rendrait `extractSamples.ts` asynchrone, et son
ordre de sortie non déterministe. **C'est la porte qu'il ne faut pas ouvrir.**

---

## 2. Le patron de solution — il existe déjà dans le code

Le projet a déjà résolu exactement ce problème, deux fois, avec le même geste :

> **Résoudre une fois, en amont, dans l'orchestrateur asynchrone ; injecter le
> résultat sous forme de `ReadonlyMap` dans les modules purs.**

- `mainByInstanceId` — construite par `scanComposedMatrix`
  ([`composedComponents.ts`](./src/contract/composedComponents.ts)), consommée
  par `appliedValue`
  ([`propertyBindings.ts`](./src/contract/propertyBindings.ts)), qui traduit un
  `mainComponent` en **nom** sans un seul `await`.
- `swapDefaults` — même construction, même consommation synchrone dans
  `extractSamples`. Le commentaire dit pourquoi : « *les maîtres se relèvent une
  fois pour toute la matrice […] c'est aussi ce qui garde `extractSamples`
  synchrone* ».

La correction du `default` doit suivre ce patron, pas en inventer un autre.

---

## 3. Architecture proposée

```text
componentPropertyDefinitions                          (pur, sync)
        │
        ├─► swapTargets.ts          « quelles références faut-il nommer ? »
        │        └─► { nodeIds, keys }
        │
        ▼
exportComponent.ts                                    (async, une seule fois)
        └─► resolveComponentNames()  « comment s'appellent-elles ? »
                 └─► ReadonlyMap<référence, nom>
        │
        ▼
extractContractPropertyModel(defs, warnings, names?)  (pur, sync — inchangé)
```

Trois responsabilités, trois modules, aucune inversion de dépendance.

### Bloc A — `swapTargets.ts` : relever les références

Un module **pur**, nouveau. Il balaie `componentPropertyDefinitions` et rend
les références à nommer, dédupliquées : les `defaultValue` de type chaîne des
`INSTANCE_SWAP` et des `SLOT`, et tous les `preferredValues[]` avec leur `type`.
Aucun accès Figma, donc testable seul.

### Bloc B — `resolveComponentNames()` : les nommer

Asynchrone, appelé **une fois** par export dans `exportComponent.ts`, juste
avant `extractContractPropertyModel`. Trois sources, par coût croissant :

1. **L'index local déjà en mémoire.** Le scan de composition connaît déjà chaque
   `ComponentNode` maître rencontré, et un `ComponentNode` porte sa `.key`. Un
   index `key → nom` bâti depuis `mainByInstanceId` résout la majorité des
   `preferredValues` **sans aucun aller-retour**. Même raisonnement que
   `swapDefaults`.
2. **`figma.getNodeByIdAsync(id)`** pour les ids de node, batché en un seul
   `Promise.all` sur l'ensemble dédupliqué.
3. **`figma.importComponentByKeyAsync(key)`** / `importComponentSetByKeyAsync`
   pour les clés que l'index local ignore — une vraie requête vers la
   bibliothèque, qui **échoue** si le composant n'est pas publié. Chaque
   promesse est donc isolée : un échec nomme une référence de moins, il
   n'interrompt jamais l'export.

Le nom retenu est celui que le reste du contrat publie déjà, par la même
autorité : `ownerComponentName()`
([`composedComponents.ts`](./src/contract/composedComponents.ts)) — le nom du
**SET** quand il existe, celui du composant sinon. Pas de seconde convention de
nommage dans l'artefact.

> **[À DÉCIDER]** Faut-il conserver l'étape 3 ? Elle est la seule à coûter du
> réseau et la seule à pouvoir échouer. S'en passer signifie qu'une bibliothèque
> externe non instanciée dans le document n'est pas nommée, donc omise avec un
> avertissement — ce qui reste conforme à la règle 2 et garde l'export
> intégralement local. **Recommandation : livrer les étapes 1 et 2, et n'ouvrir
> la 3 qu'après un cas réel observé.**

### Bloc C — `parsers.ts` : publier un nom, ou rien

Signature étendue, troisième argument **optionnel** :

```ts
extractContractPropertyModel(definitions, warnings, names?: ReadonlyMap<string, string>)
```

Le module reste pur et synchrone. `extractSamples.ts` ne passe rien et n'est pas
touché : il n'utilise du modèle que ses clés publiques, jamais les `default`.

Comportement, strictement la règle 2 :

| Cas | `default` publié | Diagnostic |
|---|---|---|
| Référence résolue | le nom (`"check"`) | aucun |
| Référence inconnue de l'index | `null` | avertissement designer, et `coverage.portable` passe à `partial` |
| Aucune valeur par défaut | `null` | aucun |

`null` est déjà dans le type : le consommateur sait le lire. Un id ne doit
**jamais** subsister comme valeur de repli — c'est précisément le défaut qu'on
corrige.

La perte se marque `partial` parce qu'elle en est une : une valeur par défaut
que le développeur ne peut pas écrire est une limite de traduction, et
l'invariant du contrat portable l'exige. Le mécanisme existe déjà —
`projectionWarnings` dans
[`exportComponent.ts`](./src/contract/exportComponent.ts).

L'avertissement nomme le geste, comme tous les autres :

> Component property « Icon » : son composant par défaut n'a pas pu être nommé
> (référence Figma « 1:1 »). Le contrat publie `null`. Vérifiez que ce composant
> existe dans le document ou qu'il est publié, puis réexportez.

### Bloc D — `preferredValues` : le point qui change la forme

Seul bloc qui **modifie le schéma**. `PreferredComponentValue`
([`types.ts`](./src/contract/types.ts)) passerait de :

```ts
{ type: 'COMPONENT' | 'COMPONENT_SET'; key: string }
```

à :

```ts
{ type: 'COMPONENT' | 'COMPONENT_SET'; component: string | null; figmaKey: string }
```

`component` est la réponse ; `figmaKey` reste la trace vers Figma. Les deux
cohabitent par le même précédent que `figmaName` / `figmaLayer` et que
`meta.figma.componentKey` : le contrat est portable **et** traçable, à condition
que la trace ne soit jamais la seule chose publiée.

Une entrée non résolue garde `component: null` et **n'est pas retirée** : la
retirer perdrait le décompte des choix offerts, ce que la règle 2 interdit.

> **[À DÉCIDER]** `figmaKey` doit-il rester ? L'invariant « aucune donnée
> d'extraction Figma n'entre dans l'artefact » et l'invariant « Figma reste
> traçable » se tirent dessus ici. **Recommandation : le garder**, sous un nom
> préfixé `figma…` qui dit explicitement que c'est une trace, pas une valeur à
> consommer.

---

## 4. Coût de version, à regarder en face

| Bloc | Change la forme JSON ? | Change le sens d'un champ ? |
|---|---|---|
| A, B | non | non |
| C (`default`) | non — `string \| null` avant et après | **oui**, un id devient un nom |
| D (`preferredValues`) | **oui** | oui |

Les deux imposent une version de contrat. Le Playground épingle une plage
**exacte** — `VERSION_CONTRAT_MINIMALE = VERSION_CONTRAT_MAXIMALE = "10.3"` dans
`scripts/version-contrat.mjs` — donc toute livraison ici est une opération en
trois temps, dans l'ordre que `version-contrat.mjs` prescrit :

1. **Playground d'abord** : les lecteurs tolèrent la nouvelle forme, la plage
   s'ouvre, `CHANGELOG-CONTRAT.md` reçoit son entrée.
2. **Exporter ensuite** : `CONTRACT_VERSION` passe à `10.4`, `npm run schema`
   régénère le schéma commité.
3. **Réexport humain depuis Figma**, puis corpus et Playground remis à jour.
   `npm run check:fixtures` refusera tant que ce n'est pas fait — c'est son rôle,
   et un agent ne doit pas chercher à le satisfaire seul.

Le bloc C coûte déjà une version à lui seul. **Il n'y a donc aucun intérêt à
séparer C et D** : autant livrer les deux dans la même 10.4.

---

## 5. Le contrôle qui aurait attrapé toute la famille

Indépendant du reste, livrable **immédiatement**, et sans version : côté
Playground, `scripts/validation-contrat.mjs` doit **refuser toute valeur de
contrat qui a la forme d'un identifiant Figma** — `/^\d+:\d+$/`, ou une chaîne
de 32 caractères hexadécimaux ou plus — partout où le schéma attend un nom.

C'est quelques lignes, c'est générique, et cela transforme cette famille entière
de défauts en échec de CI plutôt qu'en surprise à l'écran. Aucun nom de
composant légitime ne ressemble à `1:1`.

> **Recommandation : commencer par là**, quelle que soit la suite donnée aux
> blocs A à D.

---

## 6. Ordre de livraison proposé

| # | Lot | Repo | Version | Bloquant |
|---|---|---|---|---|
| 1 | Garde-fou « ceci est un id, pas un nom » | Playground | — | non |
| 2 | Blocs A + B + C, résolution locale et par id | Exporter | 10.4 | oui |
| 3 | Bloc D | Exporter | 10.4, même lot | oui |
| 4 | Lecture de `preferredValues[].component` | Playground | 10.4 | oui |
| 5 | Réexport Figma, corpus, Playground | humain | — | oui |

Le lot 1 est indépendant et sans risque. Les lots 2 à 5 forment une seule
livraison coordonnée : les entamer séparément laisserait les deux repositories
en désaccord de version.

---

## 7. Tests attendus

Chaque bug corrigé reçoit un test de régression, et aucun de ceux-ci ne doit
passer sur le code d'avant.

`tests/swapTargets.test.ts` — nouveau
- un `INSTANCE_SWAP` et un `SLOT` rendent chacun leur `defaultValue` ;
- deux props qui visent la même référence ne la relèvent qu'une fois ;
- un `defaultValue` booléen de `SLOT` n'est pas relevé comme référence.

`tests/parsers.test.ts`
- une référence résolue publie le nom, jamais l'id ;
- une référence inconnue publie `null` **et** un avertissement ;
- aucun `default` publié ne satisfait `/^\d+:\d+$/` — le test générique qui ferme
  la famille ;
- le nom vient du COMPONENT_SET quand le maître en a un ;
- sans troisième argument, le modèle rend les mêmes clés publiques qu'avant : la
  garantie que `extractSamples` n'est pas affecté.

`tests/exportComponent.test.ts`
- trente variants qui visent le même composant par défaut ne déclenchent
  qu'**une** résolution ;
- une résolution qui échoue laisse l'export produire un contrat complet par
  ailleurs, avec `coverage.portable === 'partial'`.

---

## 8. Ce que ce plan ne fait pas

- Il ne touche pas aux props d'icône **synthétiques** de `mergeIconRules` :
  elles publient déjà `default: null`, ce qui est honnête. Leur donner l'icône
  réellement posée dans la maquette est une question distincte, à laquelle
  `samples[].composes[].swaps` répond déjà sans engager personne.
- Il n'introduit aucune logique liée au nom d'un composant.
- Il ne fait pas du catalogue d'icônes de l'application un détail du contrat :
  c'est le « Manifeste d'icônes » de
  [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md), et il reste ouvert.
