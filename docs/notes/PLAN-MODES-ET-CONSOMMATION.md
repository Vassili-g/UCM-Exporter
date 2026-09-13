# Modes de tokens et consommation des contrats

Note de travail, non engagée. Elle compare les deux notes rédigées sur la même
demande, `MODES-DE-TOKENS.md` et `MODES-TOKENS-CONSOMMATION.md`, refait les
mesures dont leurs recommandations dépendent et en tire un plan d'action. Elle
traite aussi une question qu'aucune des deux n'abordait : la forme d'un module
de consommation qui porterait règles, préférences et gabarits d'implémentation.

Les faits sur ce dépôt et sur le Playground ont été relevés dans le code et les
fichiers. Les comportements CSS mesurés dans Chrome proviennent de la première
note, dont les pages de test sont conservées hors dépôt : ils sont repris sans
avoir été réexécutés. Chaque section dit ce qui reste à mesurer.

| Terme | Sens dans cette note |
|---|---|
| axe | une collection Figma qui compte plusieurs modes |
| mode | une valeur de cet axe : `marque1`, `marque-2`, `dark` |
| feuille à modes | une feuille qui porte `$extensions["com.ucm.modes"]` |
| cône d'un axe | les feuilles dont une chaîne d'alias, dans un mode quelconque, atteint une feuille à modes de cet axe ; ces feuilles à modes en font partie |
| portée | un sous-arbre de l'interface sur lequel un mode est posé |
| contexte | un mode choisi pour chaque axe |
| ancrage | une question que le format laisse ouverte et que le repository consommateur tranche |

## 1. Conclusions

1. **Le contrat n'a pas besoin de changer pour les modes.** `Button` cite
   `{components.button.colors.primary.contained.default.background}`, et cette
   référence est la même dans les deux marques. Le nom `marque1` n'apparaît
   qu'en résolvant la chaîne d'alias. La prémisse « le bouton sait seulement que
   primary vaut marque1 » décrit le CSS que le Playground génère aujourd'hui.
2. **Les modes se perdent à la production des ressources.** Style Dictionary lit
   `$value`, qui porte le mode par défaut, et ignore `com.ucm.modes`. `tokens.css`
   ne contient aucune occurrence de `marque-2`.
3. **Le fichier de tokens ne nomme pas le mode par défaut.** C'est la seule
   information d'axe qui ne se dérive pas des feuilles. Une déclaration d'axe
   posée sur le groupe de la collection la porte, dans une version 3 du format
   de tokens.
4. **Le kit porte un modèle de modes pur, sans CSS** : axes, cône, sélection
   d'un contexte, résolution contextuelle, axes qui touchent un contrat en
   comptant sa composition. Projection, contrôles et aide aux agents appellent
   ce modèle.
5. **La projection a deux niveaux.** Le premier rend un document DTCG par
   contexte, lisible par tout outil sur toute plateforme ; il suffit à une
   marque fixée au build. Le second rend pour le web une feuille de modes qui
   redéclare le cône dans chaque portée et tient l'imbrication. La CLI publie
   les deux. La feuille de base reste produite par l'outil du consommateur.
6. **Au runtime, un attribut par axe suffit.** Un composant n'expose ni marque
   ni thème en prop, ne lit pas le mode pour choisir une référence et ne déclare
   aucune variable de token. Aucune bibliothèque runtime n'est nécessaire.
7. **Comparer les références littéralement reste juste.** Sous plusieurs modes,
   l'erreur serait de comparer une valeur résolue dans un seul mode. Un contrôle
   de rendu attend la valeur exacte du contexte actif. Accepter les valeurs de
   tous les modes laisserait passer un bouton figé sur `marque1`.
8. **Le module de consommation tient en trois pièces.** UCM possède les règles
   du format et la liste fermée des ancrages. Le repository possède ses réponses
   et ses gabarits. La CLI épinglée distribue le tout par une commande
   `ucm guide`. Un paquet d'aides séparé n'apporterait rien : les aides de rendu
   voyagent déjà dans chaque contrat, sous `rendering.roles`.
9. **La skill `consommer-contrat` doit se scinder.** Elle mêle des règles de
   transcription, valables pour tout consommateur, au protocole de la
   reconstruction à froid, propre à la recette. Appliquée en production, elle
   ferait écrire un composant déclaré jetable et sans test.

## 2. Ce que valent les deux notes

### 2.1. Accords

Les deux notes établissent les mêmes faits de départ, et la mesure de la
section 3 les confirme :

- le contrat reste valide dans toutes les marques ;
- Style Dictionary ne lit pas `com.ucm.modes` ;
- une variable CSS se calcule sur l'élément qui la déclare, si bien qu'une
  portée locale doit redéclarer toute la chaîne d'alias ;
- le nom du mode par défaut manque au fichier ;
- le moteur de contrat ne lit pas les modes fixés sur un calque ;
- le contrôle typographique du kit suit les alias par `$value` seul ;
- `rendering.roles` publie déjà `border` en `box-shadow` et `ring` en `outline`.

### 2.2. `MODES-DE-TOKENS.md`

| Apport | Limite ou erreur |
|---|---|
| Deux mesures dans Chrome : cinq stratégies de redéclaration, puis huit arbres à deux axes croisés | Safari, Firefox et le Shadow DOM ne sont pas mesurés |
| La stratégie `@scope`, seule juste sur les huit arbres, et la contrainte d'une spécificité égale | Elle compte une seule permutation pour `Alert`, `StressTest` et `TileLink` ; `Alert` et `StressTest` composent `Button` et en comptent deux |
| Trois feuilles à modes dont le chemin `marque-2` ne se déduit pas du chemin `marque1` | Sa feuille de modes nomme les variables par `tokenCssVariable`, alors que le Playground en recopie une variante ASCII (section 3.4) |
| Une forme minimale du format : l'axe déclaré sur son groupe | Le constat proposé pour un mode fixé dans Figma ne nomme aucun geste honnête, ce que l'invariant des avertissements refuse (section 7.2) |
| Les contrôles V1 à V4 sur le fichier de tokens | La skill reste dans ce dépôt, hors de portée d'un repository tiers, ce qui écarte la portabilité demandée |

### 2.3. `MODES-TOKENS-CONSOMMATION.md`

| Apport | Limite ou erreur |
|---|---|
| Trois égalités distinctes : identité du token, valeur dans un contexte, rendu | Aucun essai dans un navigateur ; l'effet de l'héritage est déduit de la spécification |
| Le refus d'une liste de valeurs admises dans un contrôle | Sa première stratégie, un bloc complet par contexte sous un sélecteur, ne tient une portée partielle qu'avec un code runtime qui fusionne le contexte du parent |
| L'impact transitif par la composition | Les contraintes et profils entre choix n'ont aucune source dans Figma, où deux collections sont orthogonales et chaque variable a une valeur dans chaque mode |
| Un essai en mémoire : Style Dictionary 5.5.3 rend `marque-2` dès que `$value` porte ce mode | L'appartenance écrite sur chaque feuille double une information que `joinTokenPath` garantit par le premier segment du chemin |
| L'identité d'un mode renommé, le rendu serveur, les portails, `color-scheme`, les couleurs forcées | Un paquet `@ucm-kit/tokens` qui embarque Style Dictionary imposerait une version de cet outil sans besoin mesuré |
| Le constat que la skill n'atteint pas un repository installé par npm | Les cycles par contexte et les collections étendues reçoivent une place que le corpus et le plan Enterprise ne justifient pas encore |

### 2.4. Ce qui manque aux deux

- La scission de la skill (conclusion 9).
- L'accord des noms entre la feuille de base du consommateur et une feuille
  produite par UCM.
- La règle 4 du Playground, qui limite l'empreinte du produit aux cinq fichiers
  qu'`ucm init` écrit : une commande de build qui appelle la CLI l'étend.
- Le module de consommation : règles, préférences et gabarits.

## 3. L'état mesuré

Un script en lecture seule a relevé les feuilles, le cône, les références et la
composition sur les fichiers du Playground. Aucun fichier n'a été modifié.

### 3.1. Le fichier de tokens

`UCM-Playground/src/tokens/tokens.json` est en version 2 du format de tokens et
compte 757 feuilles. Une seule collection a plusieurs modes.

| Groupe | Feuilles | Feuilles à modes | Modes |
|---|---|---|---|
| `components` | 369 | 0 | un |
| `primitives` | 175 | 0 | un |
| `typography` | 60 | 0 | un |
| `color-utilities` | 54 | 0 | un |
| `color-brands` | 44 | 0 | un ; palettes `marque1` et `marque-2` en sous-groupes |
| `layouts` | 31 | 0 | un |
| `tests` | 14 | 0 | un |
| `color-brand-tokens` | 10 | 10 | `marque1`, `marque-2` |

```text
components.button.colors.primary.contained.default.background
  -> color-brand-tokens.primary.default            (modes marque1, marque-2)
       marque1 : {color-brands.marque1.primary.500} -> primitives.colors.terracota.500
       marque-2  : {color-brands.marque-2.primary.500}
```

Le cône de l'axe compte 60 feuilles : les 10 feuilles à modes et 50 feuilles
`components.button.colors.*`. Toutes les valeurs de mode sont des alias, aucune
n'est un littéral. Aucune feuille hors de l'axe ne cite directement une palette
de `color-brands`.

`secondary.default`, `secondary.emphasis` et `secondary.subtlest` visent des
paliers différents selon la marque : `700` et `500`, `800` et `700`, `100` et
`50`. Un consommateur qui fabriquerait le chemin `marque-2` en remplaçant le nom
de la marque dans le chemin `marque1` peindrait trois couleurs fausses.

### 3.2. Les contrats

| Contrat | Références | Traversent l'axe | Composition | Axes qui le touchent |
|---|---|---|---|---|
| `Button` | 255 | 50 | aucune | marque, directement |
| `Alert` | 39 | 0 | `Button` | marque, par `Button` |
| `StressTest` | 82 | 0 | `Alert`, `Button` ×3, `TileLink` ×7 | marque, par `Alert` et `Button` |
| `TileLink` | 11 | 0 | aucune | aucun |

Les références sont relevées hors `samples` et `meta`, et aucune n'est absente
de `tokens.json`. Les quatre contrats sont en version `13.0`.

### 3.3. Le moteur, le kit et la CLI

- `buildLeaf` ([exportTokens.ts](../../packages/plugin/src/tokens/exportTokens.ts))
  écrit dans `$value` la valeur de `defaultModeId`, puis sous `com.ucm.modes`
  une valeur par mode, dans l'ordre de `collection.modes`. Ni l'axe, ni la liste
  des modes, ni le nom du défaut ne sont écrits au niveau de la collection.
- `joinTokenPath` écrit la collection normalisée en premier segment de chaque
  chemin, sauf quand ce nom normalisé est vide. Le groupe de premier niveau
  identifie donc la collection, sous deux réserves : une collection au nom vide,
  et deux collections que la normalisation confond.
- `packages/` ne contient aucune occurrence de `explicitVariableModes` ni de
  `resolvedVariableModes`. Le moteur reconnaît une variable liée à `visible`
  (`exportableNodes.ts`) ; ce que le contrat publie quand la valeur de cette
  variable change avec le mode n'est pas établi.
- Aucun lecteur du kit ne lit `com.ucm.modes`. `feuilleRacine`
  ([typography-token-types.mjs](../../packages/kit/src/lecteurs/typography-token-types.mjs))
  suit `$value` seul.
- `ucm.config.json` décrit trois chemins
  ([configuration.ts](../../packages/kit/src/format/configuration.ts)). La CLI
  charge un adaptateur de stack installé dans le repository
  ([adaptateur.mjs](../../packages/cli/src/adaptateur.mjs)) ;
  `@ucm-kit/adapter-typescript` est le seul.

### 3.4. Le Playground

- `style-dictionary.config.mjs` produit un seul bloc `:root`, avec
  `outputReferences: true`.
- Sa projection de nom, `variableCss`, remplace `[^a-z0-9]+` par un tiret.
  `tokenCssVariable` ([names.ts](../../packages/kit/src/format/names.ts))
  remplace `[^\p{L}\p{N}]+`. Les deux rendent les mêmes noms sur le corpus, qui
  est en ASCII. Un chemin accentué, que `normalizeName` conserve, donnerait deux
  noms différents. `Button.tsx` recopie la projection ASCII.
- `AGENTS.md` pose quatre règles. La règle 1 interdit tout outillage UCM écrit
  dans le dépôt. La règle 4 limite l'empreinte du produit aux cinq fichiers
  qu'`ucm init` écrit. Son tableau des ancrages (icône, galerie, traduction d'une
  référence) sert de document de conventions à la skill.
- Les aides que le Playground portait, `tokenVar` qui appelait
  `tokenCssVariable` du kit et `ContractIcon`, ont quitté le dépôt avec la
  règle 1 ; Git les conserve. Les consignes « ce qu'est un ring » et « un contour
  en `box-shadow` » sont publiées dans chaque contrat par `rendering.roles`, et
  la skill les applique (§4.2).

### 3.5. La skill `consommer-contrat`

[La skill](../../.agents/skills/consommer-contrat/SKILL.md) contient deux
matières :

- des règles de transcription, valables pour tout consommateur : les trois lois,
  l'extraction, la matrice, la vue exacte, les règles de rendu, les interdits ;
- le protocole de la recette : composant jetable (§0), fichier supprimé avant de
  commencer (§2.6), aucun test créé et aucune suite lancée (§2.7).

Son §6 énumère sept ancrages, et aucun ne concerne un mode. Elle est rangée dans
ce dépôt et aucun paquet ne la publie.

## 4. Les sujets, classés

| Rang | Sujet | Question | Propriétaire |
|---|---|---|---|
| S1 | Format de tokens | Que dit `tokens.json` d'un axe, de ses modes, de son défaut ? | format, plugin |
| S2 | Modèle de modes | Comment lire, sélectionner et résoudre un contexte, en un seul endroit ? | kit |
| S3 | Contrat | Le contrat doit-il porter une information de mode ? | format de contrat, plugin |
| S4 | Projection | Quel outil produit les ressources par mode, et sous quelle forme ? | CLI et outil du consommateur |
| S5 | Runtime | Comment poser, détecter, basculer et imbriquer un mode ? | repository consommateur, sur une convention UCM |
| S6 | Contrôles | Que valider quand une référence a plusieurs valeurs ? | kit, adaptateur, recette |
| S7 | Module de consommation | Comment règles, ancrages et gabarits atteignent-ils un agent dans un repository quelconque ? | CLI, skill publiée, repository |
| S8 | Recette | Comment prouver le tout ? | Playground, fichier Figma |
| S9 | Hors périmètre | Collections étendues, contraintes entre choix, document de résolution publié | déclencheurs |

S1 et S2 précèdent le reste. Une API de bascule conçue avant le modèle figerait
le produit sur deux marques et deux apparences.

## 5. S1, le format de tokens

### 5.1. Ce qui manque

| Information | Aujourd'hui | Dérivable ? |
|---|---|---|
| Identité de l'axe | premier segment du chemin | oui, sous les deux réserves de `joinTokenPath` |
| Liste des modes | clés de `com.ucm.modes` d'une feuille du groupe | oui |
| Nom du mode par défaut | valeur de `$value`, sans son nom | non : deux modes peuvent porter la même valeur, et l'ordre des clés suit `collection.modes` |
| Combinaison des axes | alias entre collections | oui, par le graphe |

### 5.2. Formes comparées

| Forme | Apport | Coût | Verdict |
|---|---|---|---|
| F1 Déclaration sur le groupe de la collection | défaut nommé, déclaration à côté des feuilles, aucun chemin ne bouge | version 3 du format ; refus d'un groupe partagé par deux collections | retenue |
| F2 Catalogue à la racine et appartenance sur chaque feuille | tolère deux collections dans un même groupe | 757 renvois pour une information que le chemin porte déjà | écartée tant que F1 suffit |
| F3 Document de résolution DTCG `2025.10` publié par le plugin | standard d'échange des contextes | second artefact dans la pull request ; aucun outil installé ne le lit | dérivé par le kit, à la demande |
| F4 Un fichier par mode | chaque fichier est un DTCG simple | la vue d'ensemble d'un token disparaît ; N axes donnent N familles de fichiers | produit au build (section 8), jamais publié |
| F5 Propositions `$modes` du DTCG | proche d'un futur standard | propositions ouvertes et divergentes | à suivre |
| F6 `$extensions.mode` lu par Terrazzo | lecture directe par un outil | d'après la première note, Terrazzo range ces modes dans un seul modificateur, et marque et thème fusionnent | écartée |

Forme proposée pour F1, nom de clé à confirmer :

```json
{
  "color-brand-tokens": {
    "$extensions": {
      "com.ucm.axis": { "modes": ["marque1", "marque-2"], "default": "marque1" }
    },
    "primary": {
      "default": {
        "$type": "color",
        "$value": "{color-brands.marque1.primary.500}",
        "$extensions": {
          "com.ucm.modes": {
            "marque1": "{color-brands.marque1.primary.500}",
            "marque-2": "{color-brands.marque-2.primary.500}"
          }
        }
      }
    }
  }
}
```

`indexerTokensDtcg` saute déjà les clés en `$`, donc aucune référence ne cesse
de résoudre. L'export refuse une collection à plusieurs modes dont le nom
normalisé est vide. Il refuse aussi deux collections dont le groupe coïncide
quand l'une d'elles a plusieurs modes, comme il refuse déjà une collision entre
une feuille et un groupe.

### 5.3. L'identité d'un mode

Le nom normalisé d'un mode est son identité publique. Il devient la valeur d'un
attribut, une préférence que l'application persiste, un nom de fichier. Renommer
un mode dans Figma est donc une rupture pour le consommateur, comme retirer un
mode puis en ajouter un.

| Option | Conséquence |
|---|---|
| Publier le `modeId` Figma à côté du nom | le renommage devient traçable ; une identité Figma entre dans un artefact portable |
| Garder le nom comme seule identité, et faire signaler le renommage par le diff sémantique | aucun identifiant Figma publié ; le designer voit la rupture dans la pull request |

Recommandation : la seconde option, qui suit la règle du contrat de ne publier
aucune donnée d'extraction Figma. Aucun libellé d'affichage n'est publié non
plus : le texte d'un sélecteur de marque appartient à l'application et à sa
traduction.

### 5.4. Version et ordre

La déclaration d'axe monte le format de tokens en version 3, dans l'ordre que
fixe [COMPATIBILITE.md](../COMPATIBILITE.md#lordre-dune-nouvelle-version-du-format-de-tokens) :
le kit qui lit la version 3, puis la CLI et l'adaptateur, puis le plugin.

Un fichier en version 2 reste lisible. Le kit en tire les axes et les modes, et
rend un défaut inconnu. Les capacités qui dépendent du nom du défaut, le retour
au défaut dans une portée imbriquée et sa mention par `ucm guide`, annoncent
alors qu'elles attendent un réexport. Le défaut ne se devine ni par l'égalité des
valeurs ni par l'ordre des clés.

## 6. S2, le modèle de modes du kit

### 6.1. Fonctions

Toutes sont pures et rangées dans `@ucm-kit/core/format`, qui cible ES2019 et ne
dépend ni de Node ni de Figma. Les noms sont à confirmer.

| Fonction | Rend |
|---|---|
| `axesDeTokens(document)` | les axes, leurs modes, leur défaut ou son absence |
| `coneDeLAxe(document, axe)` | les feuilles du cône, en suivant les alias de tous les modes |
| `documentDansLeContexte(document, contexte)` | un document DTCG où chaque feuille à modes porte dans `$value` la valeur du mode choisi, sans `com.ucm.modes`, alias intacts |
| `resoudre(document, chemin, contexte)` | la valeur terminale et la chaîne parcourue |
| `axesDuContrat(contrat, contrats, document)` | les axes dont le cône croise les références du contrat ou celles de ses dépendances, par `composes` |

Un contexte donne un mode par axe. Un axe absent du contexte prend son défaut au
build, et hérite de la portée parente au runtime (section 9).

La mémorisation de `resoudre` inclut le contexte dans sa clé : un cache indexé
sur le seul chemin figerait la première marque résolue. Un cycle arrête la
résolution sous une erreur qui nomme la chaîne. Figma refuse de créer un cycle
d'alias ; la garde protège un fichier d'une autre source.

### 6.2. Ce que le modèle ne porte pas

- **Aucune contrainte entre choix.** Figma n'en exprime aucune : chaque variable
  a une valeur dans chaque mode de sa collection. Une application qui n'offre
  pas le sombre à une marque en décide dans son propre code.
- **Aucune convention de nom.** Un mode `Marque1/Dark` reste un mode. Le kit
  ne le décompose pas en deux axes et ne teste aucun nom de mode.
- **Aucune collection étendue** (section 13).

## 7. S3, le contrat

### 7.1. Les références qui dépendent d'un mode

Le contrat ne publie rien de plus. `axesDuContrat` dérive l'information du
contrat et de `tokens.json`. Publiée, elle deviendrait fausse au premier export
de tokens qui change le graphe sans réexport du composant. La règle qui a retiré
`tokensUsed` s'applique : ce qui se dérive ne se publie pas.

Faire citer au contrat la feuille à modes (`{color-brand-tokens.primary.default}`)
plutôt que la feuille de composant aplatirait la décision du palier composant,
contre l'invariant des alias.

### 7.2. Un mode fixé dans un composant

Un designer peut fixer un mode sur une variante ou sur un calque : une zone
inversée en sombre, une variante `brand=marque-2`. Le contrat cite alors les
mêmes références dans les deux cas et publie deux vues identiques, sans
diagnostic.

La première note propose un avertissement. Or un avertissement exige un geste,
et ce cas n'en offre aucun d'honnête. Retirer le mode efface une intention du
designer ; le garder ne rend le contrat ni plus juste ni plus portable. L'endroit
où le mode est fixé sépare trois situations :

| Endroit | Sens probable | Traitement proposé |
|---|---|---|
| page, section ou cadre qui contient le composant | présentation du composant | hors du composant, jamais lu |
| racine du composant ou du component set | présentation ou intention, indécidable | à trancher après mesure |
| calque interne ou instance d'une dépendance | intention visuelle | publié : un champ `modes` sur le slot de la vue exacte, par exemple `{ "color-brand-tokens": "marque-2" }` |

La publication monte `contractVersion` et ajoute une loi de forme : chaque clé de
`modes` nomme un axe de `tokens.json`. Mesurer d'abord si le fichier Figma
emploie ce geste, par une sonde qui lit `explicitVariableModes` sur les calques
publiés. Publier seulement si un composant réel en dépend.

### 7.3. Les modes qui changent autre chose qu'une couleur

Une variable liée à un padding se cite par référence et suit le mode sans rien
exiger du contrat. Une variable `BOOLEAN` liée à la visibilité d'un calque, ou
`STRING` liée à son texte, pose une autre question : si sa valeur change avec le
mode, le contrat perd une visibilité ou un texte conditionnel (section 3.3). La
sonde de 7.2 relève aussi ce cas.

### 7.4. Un mode n'est pas une prop

Un composant hérite du mode de son conteneur, comme un calque laissé sur Auto
dans Figma. Seule exception : un axe de variantes Figma dont chaque valeur fixe
un mode. Le contrat publie déjà cet axe comme une prop, et le champ `modes` de
7.2 dit quel mode la variante pose.

## 8. S4, la projection des ressources

### 8.1. Ce que la mesure impose au web

Mesures de la première note, dans Chrome 152, cohérentes avec le module CSS
Custom Properties : `var()` se substitue au calcul de la valeur, sur l'élément
qui déclare la propriété, avant l'héritage.

- Redéclarer les seules feuilles à modes sous un sélecteur de portée ne
  fonctionne que sur l'élément racine.
- Une portée imbriquée exige de redéclarer tout le cône de l'axe : 60
  déclarations par mode dans le corpus.
- Une feuille à modes d'un axe qui appartient au cône d'un autre axe exige une
  règle `@scope` par mode du premier axe, pour que la portée la plus proche
  l'emporte. `@scope` est disponible dans Chrome 118, Safari 17.4 et Firefox
  146.
- La cascade compare la spécificité avant la proximité. Toutes les déclarations
  de mode gardent donc la même spécificité.

Une alternative existe pour les axes croisés, sans mesure : une requête
`@container style(--ucm-mode-<axe>: <mode>)` sur une propriété d'identité
héritée. Les trois moteurs la prennent en charge depuis Firefox 151. Elle
interroge le conteneur parent et non l'élément lui-même. Deux axes posés sur le
même élément demanderaient alors un élément de plus. `@scope` reste la stratégie
mesurée.

### 8.2. Options

| Option | Plateformes | Imbrication | Travail UCM | Contrainte |
|---|---|---|---|---|
| P1 Style Dictionary du consommateur, lancé par mode, filtré sur le cône | toutes | seulement si le filtre calcule le cône | aucun | chaque consommateur recalcule le cône et lit `com.ucm.modes` |
| P2 Terrazzo sur un document de résolution dérivé | toutes | non mesurée | dériver le document | un outil de plus ; Terrazzo recommande de fusionner les axes |
| P3 Documents par contexte rendus par la CLI, puis bâtis par l'outil du consommateur | toutes | non : une marque par build | `documentDansLeContexte` | aucune bascule au runtime |
| P4 Feuille de modes rendue par la CLI | web | oui, axes croisés compris | cône, sélecteurs, `@scope`, conversion de quelques littéraux | une commande de build chez le consommateur |
| P5 Second artefact écrit par le plugin | web | oui | le code de P4, côté plugin | un second fichier dans la pull request, figé au moment de l'export |
| P6 Paquet `@ucm-kit/tokens` qui embarque Style Dictionary | toutes | selon le format écrit | adaptateur Style Dictionary | une version de Style Dictionary imposée au consommateur |
| P7 Chaque contexte aplati en valeurs (`outputReferences: false`) | toutes | oui si toutes les feuilles sont réémises | aucun | 735 déclarations par contexte ; la chaîne d'alias disparaît du CSS |
| P8 `light-dark()` et `color-scheme` | web | couleurs seules | aucun | deux valeurs, un seul axe |

### 8.3. Recommandation

**P3 et P4, publiés par la CLI.** P3 couvre toute plateforme sans une ligne de
CSS dans UCM : une application mobile qui fixe sa marque au build appelle la
commande, puis son outil habituel. P4 couvre la bascule et l'imbrication sur le
web. Le calcul du cône, propriété du graphe de `tokens.json`, n'existe alors
qu'une fois.

Commandes proposées, noms à confirmer :

```sh
npx @ucm-kit/cli tokens contexte color-brand-tokens=marque-2 > tokens.marque-2.json
npx @ucm-kit/cli tokens css-modes --base src/generated/tokens.css > src/generated/modes.css
```

Bornes de la feuille de modes :

1. Elle ne redéclare que les feuilles à modes et leur cône, en `var()`. La
   feuille de base reste celle de l'outil du consommateur.
2. Elle convertit un littéral de mode pour les seuls types dont le format fixe la
   forme : couleur, dimension, durée, courbe, nombre. Un littéral de famille ou
   de chaîne dans un mode refuse la sortie en nommant la feuille, parce que le
   repli `sans-serif` est une décision du consommateur. Le corpus ne compte
   aucun littéral de mode.
3. Elle lit la feuille de base passée par `--base` et refuse de sortir si une
   variable qu'elle redéclare n'y est pas déclarée sous le même nom. Ce contrôle
   attrape au build la divergence de projection de la section 3.4, sans importer
   le kit dans la configuration du consommateur.
4. Elle émet dans chaque règle de mode une propriété d'identité
   `--ucm-mode-<axe>: <mode>` (section 9.2).
5. Elle nomme chaque variable par `tokenCssVariable` et chaque attribut par la
   projection de la section 9.1.

P6 est écarté tant que la CLI suffit : un repository qui a déjà Style Dictionary
n'y gagne rien, et un repository qui n'en a pas reçoit une version imposée. P5
fige la feuille au moment de l'export, alors que le consommateur la régénère à
chaque build de `tokens.json`.

### 8.4. La règle 4 du Playground

Appeler la CLI publiée depuis le build respecte la règle 1 : aucun outil n'est
écrit dans le dépôt. Cette ligne étend en revanche l'empreinte du produit
au-delà des cinq fichiers de la règle 4. Deux réponses possibles :

- `ucm init` affiche la ligne de build à ajouter, comme il affiche déjà un
  rappel pour un fichier partagé, et la règle 4 compte ce que la commande écrit
  et ce qu'elle demande d'ajouter ;
- la règle 4 reste telle quelle, et la recette des modes se déroule sur une
  branche jetable.

Recommandation : la première. Un repository tiers qui veut basculer de marque
fait le même geste.

## 9. S5, le runtime

### 9.1. Poser un mode

Un mode se pose par un attribut sur n'importe quel élément :
`data-<axe>="<mode>"`. Le nom de l'attribut se dérive de l'axe par une
projection unique, placée à côté de `tokenCssVariable` dans
[names.ts](../../packages/kit/src/format/names.ts). Deux axes projetés sur le
même attribut forment une collision que l'export refuse.

Le nom dérivé d'une collection Figma diffère souvent de celui qu'une application
veut écrire : `data-color-brand-tokens` au lieu de `data-brand`. Le repository
déclare donc la correspondance dans `ucm.config.json` :

```json
{ "modes": { "color-brand-tokens": "data-brand" } }
```

Cet ancrage est le seul de ce plan qu'un outil lit, donc le seul qui entre dans
la configuration (section 11.3). La feuille de modes et `ucm guide` le lisent.

Le mode par défaut se déclare sur `:root` et dans sa propre règle, pour qu'une
portée imbriquée puisse revenir au défaut. Un conteneur en `display: contents`
transmet le mode sans produire de boîte (mesuré par la première note).

### 9.2. Détecter

| Besoin | Moyen |
|---|---|
| Mode effectif d'un élément, défaut compris | `getComputedStyle(element).getPropertyValue("--ucm-mode-<axe>")`, par le même héritage que les tokens ; à mesurer |
| Mode posé explicitement le plus proche | `element.closest("[data-<axe>]")` |
| Valeur d'un token pour un rendu hors CSS, canvas ou graphique | la valeur calculée sur l'élément, jamais `tokens.json` |
| Modes disponibles | `axesDeTokens`, au build |

Un composant ne lit pas le mode pour choisir une référence. Ce branchement
remplacerait une donnée du contrat par une règle écrite dans le code.

### 9.3. Basculer

La politique appartient à l'application : marque du client ou du déploiement,
préférence persistée, rendu serveur. UCM propose deux correspondances
déclaratives, à ajouter à la configuration le jour où un projet les demande :

- un mode associé à `prefers-color-scheme`, que la feuille émet sous `@media`
  pour une racine sans attribut explicite ;
- une valeur de `color-scheme` par mode, pour que les contrôles natifs suivent.

`auto` est une politique de l'application et ne devient pas un mode.

### 9.4. Imbriquer, et les frontières du DOM

Les règles de la section 8.3 tiennent l'imbrication à toute profondeur sur les
huit arbres mesurés. Trois frontières restent à mesurer :

- **Portail** : le nœud déplacé suit sa position dans le DOM et non son parent
  logique. L'application pose l'attribut sur le conteneur du portail.
- **Shadow DOM** : les propriétés personnalisées héritent à travers la
  frontière, les sélecteurs du document ne la traversent pas. Une portée à
  l'intérieur d'une racine fantôme demande la feuille de modes dans cette racine.
- **Iframe** : un document séparé charge ses propres feuilles et pose ses propres
  attributs.

Aucune bibliothèque runtime n'est proposée. Un composant `<ModeScope>` propre à
un framework se justifierait seulement s'il faisait plus que poser un attribut,
et il appartiendrait à un adaptateur de stack.

## 10. S6, les contrôles

### 10.1. Trois égalités

| Égalité | Question | Règle |
|---|---|---|
| Identité | Le code emploie-t-il le token du contrat ? | comparer la référence ou sa projection, littéralement |
| Valeur contextuelle | Ce token donne-t-il la bonne valeur dans ce contexte ? | résoudre dans le contexte effectif de la cible |
| Rendu | La valeur est-elle appliquée au bon endroit ? | observer la propriété, la géométrie, l'état |

Deux tokens de même couleur peuvent avoir des rôles différents. Une couleur
écrite en dur peut coïncider avec le défaut. L'égalité des valeurs ne prouve
donc pas l'identité. Sous `marque-2`, accepter la valeur `marque1` ou la valeur
`marque-2` masquerait le composant figé.

### 10.2. Contrôles proposés

| Contrôle | Où | Sévérité proposée |
|---|---|---|
| C1 Chaque alias de chaque mode vise une feuille existante | kit, rapport de CI | avertit, en nommant le mode |
| C2 Chaque valeur de mode a la forme du `$type` de sa feuille | kit | avertit |
| C3 Le contrôle typographique suit les alias dans chaque mode | kit | bloque, comme aujourd'hui |
| C4 La déclaration d'axe est cohérente : défaut parmi les modes, chaque feuille du groupe porte tous les modes, `$value` égale la valeur du défaut | kit, version 3 | avertit |
| C5 Chaque variable que la feuille de modes redéclare existe dans la feuille de base | CLI, au build | refuse la sortie |
| C6 Une référence du code, absente du contrat et atteinte par la chaîne d'alias d'une référence du contrat, fige une partie des modes | adaptateur | avertit |
| C7 Le code d'un composant déclare une variable de token | adaptateur ou linter du projet | avertit |
| C8 Capture et contraste par contexte, sur les axes qui touchent le composant | recette navigateur | à décider |

C1 à C3 portent sur le format, s'appliquent au rapport de CI existant et ne
dépendent pas de la version 3. C6 et C7 attendent un relevé des références dans
le code, que l'adaptateur TypeScript ne fait pas : il compare les props et la
composition. C8 porte sur le produit des modes des seuls axes qui touchent le
composant, composition comprise : deux contextes pour `Button`, `Alert` et
`StressTest`, un pour `TileLink`.

Précédents : les règles ESLint `ensure-design-token-usage` d'Atlassian et
`no-setting-ds-tokens` de Gutenberg, les modes de capture de Chromatic.

### 10.3. Le diff sémantique et la conformité du rendu

Le plan du diff sémantique, `PLAN-DIFF-SEMANTIQUE.md`, compare déjà `$value`,
`com.ucm.modes` et les alias. Il doit distinguer en plus un mode renommé, ajouté
ou retiré, qui rompt le consommateur (section 5.3), un défaut changé, et une
cible d'alias changée dans un seul mode à valeur terminale égale. Si le champ de
la section 7.2 est adopté, un mode fixé sur un slot s'y ajoute. L'impact sur les
composants passe par le graphe inverse des alias, puis par la composition.

[PLAN-CONFORMITE-RENDU.md](./PLAN-CONFORMITE-RENDU.md) ne traite pas les modes.
Une observation de rendu y reçoit le contexte effectif de sa cible.

## 11. S7, le module de consommation

### 11.1. Ce qui existe et où

| Pièce | Contenu | Portée |
|---|---|---|
| Contrat | décisions visuelles, dont `rendering.roles` (`border` en `box-shadow`, `ring` en `outline`) | tout repository |
| `tokens.json` | valeurs, alias, modes | tout repository |
| Skill `consommer-contrat` | règles de transcription et protocole de recette, mêlés | ce dépôt seulement |
| Document de conventions du consommateur | réponses aux ancrages, comme le tableau de l'`AGENTS.md` du Playground | ce repository |
| `ucm.config.json` | trois chemins | tout repository |
| `@ucm-kit/adapter-typescript` | types dérivés et parité | repository TypeScript qui l'installe |
| `ucm icons` | ce qu'il reste à couvrir, jamais ce qui est couvert | tout repository |

Un repository tiers reçoit les décisions et les contrôles, mais pas la
procédure. Son agent ne trouve nulle part qu'un contour ne consomme pas la boîte,
qu'une référence se cite telle que le contrat la publie, ni que la marque ne
passe pas en prop. Les modes ajoutent quatre ancrages et plusieurs règles à
cette procédure. La liste suit donc la version du format, et doit voyager avec
le paquet épinglé.

### 11.2. Les trois notions, questionnées

**Règles.** Deux propriétaires, deux durées de vie.

- Les règles du format appartiennent à UCM et valent pour tout consommateur :
  citer la référence publiée et jamais une cible de sa chaîne, ne jamais lire le
  contrat au runtime, ne produire aucun cartésien, rendre un contour sans
  consommer la boîte, ne pas passer un mode en prop, ne déclarer aucune variable
  de token dans un composant. Elles changent avec le format.
- Les règles du projet appartiennent au repository : transmettre une `ref`,
  interdire les styles en ligne, nommer les fichiers. Elles changent avec
  l'équipe.

Une règle vérifiable qui reste écrite sans contrôle est enfreinte sans signal.
Chaque règle du format porte donc son moyen de contrôle : `ucm check`,
adaptateur, linter du projet ou relecture. `ucm guide` imprime ce moyen. Une
règle confiée à la relecture l'annonce, et un rapport vert n'est pas lu comme la
preuve qu'elle est tenue.

**Préférences.** Le mot recouvre deux notions.

- Les **ancrages** sont les questions que le format laisse ouvertes. Sans
  réponse, un agent les tranche au hasard. La skill en énumère sept : identifiants
  publics, collisions avec les attributs natifs, traduction d'une référence,
  icône, focus clavier, contrôles, comptage des dépendances. Les modes en
  ajoutent quatre : l'attribut de chaque axe, l'endroit où la feuille de modes
  est chargée, le moyen de placer un sous-arbre dans un mode, et la source du
  mode choisi par l'application. UCM possède la liste fermée, le repository
  possède les réponses.
- Les **choix de stack et de goût** (modules CSS ou classes utilitaires,
  rangement, nommage) sont déjà écrits dans le document de conventions du
  repository, que les agents lisent. UCM n'ajoute rien en les possédant.

Recommandation : employer le terme d'ancrage, déjà celui de la skill, et laisser
les choix de goût au repository, sans structure UCM.

**Gabarits.** Quatre formes, de la plus légère à la plus lourde.

| Forme | Effet | Rapport au concept |
|---|---|---|
| G1 Description en prose de la forme d'un composant | uniformise la lecture | compatible |
| G2 Fichier squelette copié pour chaque composant | uniformise la structure ; chaque copie devient du code du composant | compatible : aucun code partagé n'interprète le contrat |
| G3 Commande qui écrit une première version depuis le contrat : surface de props, table littérale des variantes | supprime les erreurs de transcription d'une matrice de 90 variantes | compatible ; le fichier écrit une seule fois diverge au réexport suivant |
| G4 Fichier dérivé régénéré à chaque build, importé par le composant : table des variantes, feuille par composant | parité par construction | proche des types dérivés que le concept admet ; fait d'UCM un générateur de code par stack, et la reconstruction à froid mesurerait le générateur au lieu du contrat |

Une frontière sépare G2 d'une aide interdite. Un gabarit est une structure
copiée dans chaque composant. Un helper partagé qui lit une donnée du contrat au
runtime déplace l'épreuve du contrat vers lui. Le concept admet le premier dans
tout repository et refuse le second. Le Playground refuse en plus un helper de
traduction de référence, parce que l'écriture littérale y rend la comparaison
avec le contrat possible.

Recommandation : G1 et G2 appartiennent au repository, et UCM n'en publie aucun
tant qu'une seule stack consomme les contrats. G3 et G4 restent des pistes, que
déclenche un consommateur de production dont les erreurs de transcription sont
mesurées.

### 11.3. Formes de distribution

| Forme | Atteint | Limite |
|---|---|---|
| M1 Prose dans le document de conventions du consommateur, seule | l'agent de ce repository | ni règles du format, ni liste d'ancrages versionnée |
| M2 Skill copiée par `ucm init` | l'agent du repository | `ucm init` n'écrase jamais : la copie vieillit sans signal, défaut que le kit écarte déjà pour le schéma |
| M3 Skill publiée dans `@ucm-kit/cli`, lue sous `node_modules` ou câblée par un outil comme TanStack Intent | un repository qui installe le paquet | exige un `package.json` |
| M4 Commande `ucm guide [contrat]` | tout repository qui lance la CLI par `npx`, à la version épinglée | une commande à maintenir |
| M5 Section structurée dans `ucm.config.json` | les outils | fait grossir une grammaire réduite à des chemins |
| M6 Paquet d'aides séparé | comme M3 | mêle des cycles de vie différents : algorithmes, sorties, procédure |
| M7 Serveur MCP | les agents configurés pour lui | un processus à exploiter pour des fichiers qu'une commande imprime |
| M8 Adaptateur de stack qui fournit des réponses par défaut aux ancrages et un gabarit | une stack | un paquet par stack |

Recommandation : **M3 et M4**, **M5 pour les seuls ancrages qu'un outil lit**,
M8 à l'arrivée d'une deuxième stack. M6 et M7 n'apportent rien que M3 et M4 ne
couvrent.

Sans argument, `ucm guide` imprime :

- les règles du format, chacune avec son moyen de contrôle ;
- la liste des ancrages, avec la réponse de la configuration pour ceux qu'un
  outil lit et un renvoi au document de conventions pour les autres ;
- les axes du fichier de tokens, leurs modes, leur défaut et leur attribut ;
- le chemin de la skill publiée dans le paquet.

Avec un contrat, la commande ajoute ce qui se dérive de lui : ses dépendances,
les rôles de couleur qu'il emploie, les icônes à couvrir, les axes qui le
touchent composition comprise, et les contextes dans lesquels vérifier son
rendu. Elle suit l'idiome d'`ucm icons` : énumérer ce qu'il reste à faire,
jamais ce qui est fait.

Un agent découvre la commande par une ligne du document de conventions du
repository. `ucm init` affiche cette ligne à la fin de l'installation, comme il
affiche un rappel pour un fichier partagé. Il n'écrit pas dans ce document, qui
appartient au repository.

### 11.4. Scinder la skill

| Skill | Contenu | Domicile |
|---|---|---|
| `implementer-depuis-un-contrat` | trois lois, extraction, matrice, vue exacte, règles de rendu, interdits, ancrages, modes | publiée dans `@ucm-kit/cli`, écrite sans stack |
| `consommer-contrat` | protocole de la recette : composant jetable, fichier supprimé, aucun test, rapport des manques ; renvoi à la précédente pour le reste | ce dépôt |

La skill publiée entre dans la liste `PORTABLES` de
`registrePortableDocuments.test.ts`, qui refuse qu'un document portable promette
une stack.

Section proposée sur les modes :

1. Écrire la référence que le contrat publie, jamais une cible de sa chaîne
   d'alias : une cible peut n'exister que dans un mode.
2. Ne déclarer aucune variable de token dans un composant.
3. Ne pas lire un mode pour choisir une référence.
4. N'exposer ni marque ni thème en prop. Poser un mode seulement là où le
   contrat le publie (section 7.2).
5. Pour un rendu hors CSS, lire la valeur calculée sur l'élément.
6. Vérifier le rendu dans chaque contexte que `ucm guide` donne pour le
   composant.
7. Ancrage : le moyen que le projet donne pour placer un sous-arbre dans un mode.

### 11.5. Rester utilisable dans n'importe quel projet

La portabilité repose sur quatre choix de ce plan :

- le modèle de modes du kit ne dépend d'aucune plateforme ;
- les documents par contexte (P3) servent toute chaîne d'outils DTCG, et seule
  la feuille de modes (P4) est propre au web ;
- la CLI se lance par `npx` sans `package.json`, comme le contrôle de CI ;
- règles et ancrages s'écrivent sans stack, et les réponses propres à une stack
  restent dans le repository ou dans un adaptateur.

## 12. S8, la recette

1. Kit : tester le modèle sur un fichier simulé à deux axes croisés, trois
   modes, deux modes de même valeur, un défaut qui n'est pas le premier mode, un
   nom accentué.
2. Playground : générer le document du contexte `marque-2` et le passer à Style
   Dictionary.
3. Playground : générer la feuille de modes, poser une bascule de marque sur
   `<html>` dans la galerie, ajouter une case qui place `Alert` en `marque-2`
   dans une page `marque1`, puis l'imbrication inverse.
4. Reconstruire `Button` à froid avec la seule sortie de `ucm guide`, sans accès
   à ce dépôt. Comparer chaque variante à Figma dans les deux marques, en fixant
   le mode sur le cadre de comparaison.
5. Figma : créer une collection clair et sombre dont une feuille de marque cite
   une feuille de thème, réexporter, rejouer le point 3 sur deux axes.
6. Figma : fixer un mode sur un calque interne d'un composant de test, pour la
   sonde de la section 7.2.
7. Rejouer dans Safari et Firefox les arbres de la section 8.1.

Le moteur se teste sur `fichierDeVariables.ts` étendu, jamais sur un
`tokens.json` commité.

## 13. S9, hors périmètre et déclencheurs

| Sujet | Raison du report | Déclencheur |
|---|---|---|
| Collections étendues (`ExtendedVariableCollection`) | plan Enterprise ; le moteur ne lit pas `valuesByModeForCollectionAsync` | un fichier réel qui en emploie |
| Contraintes et profils entre choix | aucune source dans Figma | une contrainte que le design system, et non l'application, doit porter |
| Document de résolution DTCG publié | aucun outil installé ne le lit | un outil du consommateur qui l'exige ; le kit le dérive de F1 |
| Comparaison avec Terrazzo | P3 et P4 ne dépendent d'aucun outil de build | un consommateur qui emploie Terrazzo |
| Bibliothèque runtime par framework | le besoin tient en un attribut | un besoin qui dépasse l'attribut |
| Gabarits générés (G3, G4) | une seule stack, aucune erreur de transcription mesurée en production | un consommateur de production |
| Cycles réalisables par contexte | Figma refuse les cycles ; la garde de `resoudre` suffit | un fichier de tokens d'une autre source |
| Contour en couleurs forcées | `box-shadow` y est forcé à `none`, et un rôle `border` disparaît ; la question porte sur `rendering.roles` et non sur les modes | à ouvrir dans les pistes du format |

## 14. Plan d'action

| Lot | Contenu | Version | Preuve de sortie |
|---|---|---|---|
| L0 | Décisions de la section 15 | aucune | décisions écrites |
| L1 | Kit : `axesDeTokens`, `coneDeLAxe`, `documentDansLeContexte`, `resoudre`, `axesDuContrat` ; contrôles C1 à C3 | kit | tests sur un fichier simulé à deux axes ; cas négatifs de la section 6.1 |
| L2 | CLI : `ucm tokens contexte` | CLI | Style Dictionary du Playground rend `marque-2` depuis la sortie, configuration inchangée |
| L3 | Format de tokens 3 : `com.ucm.axis`, refus du nom vide et du groupe partagé, contrôle C4 | kit, CLI et adaptateur, puis plugin | réexport réel ; `conformiteDtcg.test.ts` et `styleDictionary.test.ts` verts |
| L4 | CLI : `ucm tokens css-modes` et C5 ; projection d'attribut dans `names.ts` ; section `modes` de la configuration | kit, CLI | points 3 et 7 de la recette |
| L5 | Skill `implementer-depuis-un-contrat` publiée ; `ucm guide` ; ligne affichée par `ucm init` ; `consommer-contrat` réduite au protocole | CLI | point 4 de la recette |
| L6 | Plugin : sonde des modes explicites et des variables `BOOLEAN` et `STRING` à modes | aucune | relevé sur le fichier Figma ; décision de la section 7.2 |
| L7 | Conditionnel : champ `modes` du contrat | contrat | loi de forme ; recette sur le composant de test |
| L8 | Conditionnel : C6 et C7 dans l'adaptateur | adaptateur | cas négatifs sur un composant qui cite une cible de chaîne |

L1 et L2 ne dépendent pas de la version 3. L4 suit L3 : sans nom du défaut, la
feuille de modes ne peut pas écrire la règle de retour au défaut, et un drapeau
de secours ajouté en attendant resterait dans la CLI. L5 avance en parallèle de
L3 pour tout ce qui ne touche pas aux modes.

## 15. Décisions à prendre

1. **La feuille de modes est-elle une responsabilité d'UCM ?** Recommandation :
   oui (P4). L'imbrication exige le graphe d'alias, et ce calcul ne doit exister
   qu'une fois. L'alternative crédible est P2, au prix d'une dérivation du
   document de résolution et d'un outil de plus chez le consommateur.
2. **Déclaration d'axe sur le groupe (F1) ou catalogue à la racine (F2) ?**
   Recommandation : F1.
3. **Le nom d'un mode est-il sa seule identité ?** Recommandation : oui, et le
   diff sémantique signale le renommage.
4. **La règle 4 du Playground compte-t-elle une ligne de build affichée par
   `ucm init` ?** Recommandation : oui.
5. **La skill se scinde-t-elle, et sa part générale est-elle publiée dans
   `@ucm-kit/cli` ?** Recommandation : oui.
6. **`ucm.config.json` reçoit-il une section `modes` ?** Recommandation : oui,
   limitée à la correspondance entre axe et attribut. Les autres ancrages restent
   dans le document de conventions.
7. **Un mode fixé dans un composant se publie-t-il ?** Recommandation : mesurer
   d'abord (L6), puis publier sur les calques internes si le fichier emploie ce
   geste.
8. **UCM publie-t-il un gabarit ?** Recommandation : non, tant qu'une seule
   stack consomme les contrats.

## Sources

Dans ce dépôt et dans le Playground : `tokens.json`, `tokens.css`, les quatre
contrats, `style-dictionary.config.mjs`, `Button.tsx`, `AGENTS.md` et son
historique Git, `exportTokens.ts`, `variables.ts`, `exportableNodes.ts`,
`names.ts`, `configuration.ts`, `init.mjs`, `adaptateur.mjs`,
`typography-token-types.mjs`, la skill `consommer-contrat`, et les deux notes
comparées.

- [DTCG, module de résolution 2025.10](https://www.designtokens.org/tr/2025.10/resolver/)
- [DTCG, format 2025.10](https://www.designtokens.org/tr/2025.10/format/)
- [DTCG, issue 210 sur les modes](https://github.com/design-tokens/community-group/issues/210)
- [Style Dictionary, prise en charge de DTCG](https://styledictionary.com/info/dtcg/)
- [Terrazzo, résolveurs](https://terrazzo.app/docs/guides/resolvers/)
- [Terrazzo, sortie CSS](https://terrazzo.app/docs/integrations/css/)
- [Figma, modes de variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Figma, `resolvedVariableModes`](https://developers.figma.com/docs/plugins/api/properties/nodes-resolvedvariablemodes/)
- [Figma, `ExtendedVariableCollection`](https://developers.figma.com/docs/plugins/api/ExtendedVariableCollection/)
- [W3C, CSS Custom Properties](https://www.w3.org/TR/css-variables-1/)
- [W3C, CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/)
- [Mozilla, référence de `@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope)
- [Frontend Masters, `@scope` en Baseline](https://frontendmasters.com/blog/how-to-scope-css-now-that-its-baseline/)
- [web.dev, nouveautés de la plateforme, requêtes de style dans Firefox 151](https://web.dev/blog/web-platform-05-2026?hl=en)
- [React, `createPortal`](https://react.dev/reference/react-dom/createPortal)
- [Atlassian, `ensure-design-token-usage`](https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage/)
- [Gutenberg, `no-setting-ds-tokens`](https://github.com/WordPress/gutenberg/blob/070c50faed75660eb6a1f81a236207e4c33f2c6f/packages/eslint-plugin/docs/rules/no-setting-ds-tokens.md)
- [Chromatic, modes](https://www.chromatic.com/docs/modes/)
- [TanStack Intent, skills livrées avec les paquets npm](https://tanstack.com/blog/from-docs-to-agents)
- [Electric, skills publiées dans les paquets npm](https://electric.ax/blog/2026/03/06/agent-skills-now-shipping)
