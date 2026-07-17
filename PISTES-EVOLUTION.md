# Pistes d'évolution

Ce document rassemble les réflexions stratégiques et les pistes de
développement envisagées après le MVP de TokenLintel. Il ne décrit ni des
fonctionnalités promises, ni le comportement actuel du plugin.

- [`CONCEPT.md`](./CONCEPT.md) porte la vision et le plan global ;
- [`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md) décrit le comportement qui fait
  foi aujourd'hui ;
- ce document conserve les idées à évaluer, leur intérêt et leurs risques.

## 1. Conclusion actuelle

La direction générale est suffisamment solide pour poursuivre sans refondre
le concept ni enrichir immédiatement le contrat.

Les choix structurants à préserver sont les suivants :

- Figma porte la vérité design ;
- le développeur porte le code réel et le comportement applicatif ;
- le contrat décrit ce qui relève du design, sans prétendre décrire toute
  l'implémentation ;
- le contrat est portable, versionnable et lisible sans ouvrir Figma ;
- il vit à côté du composant qu'il spécifie ;
- les tokens partagés restent centralisés et utilisent le format DTCG ;
- le test en contexte froid évalue la qualité du contrat, mais ne remplace pas
  le développement du composant réel.

La priorité n'est donc pas d'accumuler de nouveaux champs. Elle est de vérifier
que le modèle reste générique sur plusieurs familles de composants, puis de
renforcer progressivement sa validation et son interopérabilité.

## 2. Positionnement dans l'écosystème

Le problème traité par TokenLintel est largement reconnu, mais les solutions
existantes n'en couvrent généralement qu'une partie.

| Solution ou standard | Ce qu'il apporte | Différence avec TokenLintel |
|---|---|---|
| [Figma Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect) | Relie les composants Figma au code réel, mappe leurs propriétés et améliore le contexte transmis aux agents par Figma | Le mapping et les exemples restent liés à l'écosystème Figma ; TokenLintel produit une spécification design autonome et versionnée dans le repository |
| [Storybook](https://storybook.js.org/docs/8/writing-docs/autodocs) | Documente les composants à partir du code, des stories et des métadonnées de props | La source principale est le code ; Storybook n'extrait pas la vérité design ni les règles Figma |
| [UXPin Merge](https://www.uxpin.com/docs/merge/merge-design-system-documentation/) | Utilise les composants codés réels dans l'outil de design | L'approche est code-first, alors que l'UCS maintient deux responsabilités distinctes et fortement reliées |
| [Backlight](https://backlight.dev/docs/make-your-first-design-system) | Réunit source, stories, tests, documentation et ressources design autour des composants | La co-localisation est proche, mais sans contrat structuré exporté depuis Figma et conçu pour les agents |
| [DTCG](https://tr.designtokens.org/format/) | Standardise l'échange des design tokens entre outils | Le standard couvre les tokens, pas la spécification complète d'un composant |

Les principes de connexion entre design et code, de co-localisation et de
source de vérité ne sont donc pas nouveaux isolément. La différenciation du
projet vient de leur combinaison :

1. extraction déterministe depuis Figma ;
2. contrat design JSON générique par composant ;
3. co-localisation avec le code réel ;
4. variantes, états, tokens, icônes et règles d'usage réunis ;
5. exploitation indépendante de Figma par les humains, la CI et différents
   agents IA ;
6. test en contexte froid utilisé comme diagnostic de la qualité du contrat.

Le positionnement le plus juste est celui d'une **couche de contrat design,
Git-native et lisible par les agents, placée à côté du code réel de chaque
composant**. TokenLintel peut compléter Code Connect, Storybook et DTCG plutôt
que chercher à les remplacer.

## 3. Utilité potentielle

Le concept est particulièrement pertinent pour les équipes qui disposent à la
fois d'un design system Figma et d'une bibliothèque de composants, notamment
lorsqu'elles :

- utilisent plusieurs agents ou environnements de développement assistés par
  IA ;
- doivent conserver une traçabilité et des revues Git ;
- partagent un design system entre plusieurs frameworks ou plateformes ;
- constatent des divergences de nommage entre Figma, la documentation et le
  code ;
- ne veulent pas rendre tout leur contexte dépendant d'un accès permanent à
  Figma.

Le gain sera plus faible pour une petite bibliothèque peu structurée, un
design system entièrement code-first ou une organisation déjà engagée dans un
outil où les composants codés sont directement utilisés pour concevoir.

### Évaluation à l'issue du MVP Button

| Critère | Note indicative | Lecture |
|---|---:|---|
| Pertinence | 18/20 | Le manque de contexte design fiable est un obstacle majeur à l'utilisation des agents sur des interfaces réelles |
| Originalité | 14/20 | Les briques existent, mais leur assemblage autour d'un contrat design autonome reste distinctif |
| Puissance potentielle | 17/20 | Le contrat peut relier Figma, code, documentation, CI et agents sans imposer un framework |
| Exécution actuelle | 13/20 | L'architecture est sérieuse pour un MVP, mais la preuve repose encore principalement sur Button et des garde-fous partiels |

Ces notes doivent évoluer avec les validations réelles. Elles ne constituent
pas un objectif produit.

## 4. Améliorations dont s'inspirer

### 4.1 Liaison explicite entre contrat et implémentation

Code Connect relie sans ambiguïté un composant Figma, un fichier source, un
export et les propriétés correspondantes. Le contrat TokenLintel possède déjà
la traçabilité Figma (`nodeId`, `componentKey`, `url`, noms Figma).

Le repository consommateur pourrait ajouter une liaison distincte :

```json
{
  "contract": "./Button.contract.json",
  "implementation": {
    "source": "./Button.tsx",
    "export": "Button"
  }
}
```

Cette donnée ne doit pas être exportée par Figma : elle dépend du repository,
du framework et de son organisation. Une intégration ultérieure pourrait
générer un mapping Code Connect à partir de cette association, sans dupliquer
manuellement la correspondance.

**Statut :** à étudier après la validation multi-composants.

### 4.2 Validation du contrat contre le code

L'introspection employée par Storybook suggère le garde-fou le plus important
pour l'UCS : comparer la partie de l'API contrôlée par le design avec l'API
réelle du composant.

Le validateur devrait vérifier que :

- les props design existent dans le code ;
- leurs types sont compatibles ;
- les valeurs d'enum ne divergent pas ;
- les valeurs par défaut sont cohérentes lorsqu'elles sont vérifiables ;
- les props supplémentaires du code restent autorisées ;
- les attributs applicatifs (`onClick`, `aria-*`, `form`...) ne sont pas
  attendus dans le contrat design.

Cette validation doit être portée par un adaptateur du repository consommateur
(React/TypeScript dans le playground), pas par le moteur d'extraction Figma.
Elle ne doit introduire aucune règle conditionnée au nom d'un composant.

**Statut :** priorité haute après la preuve de généricité.

### 4.3 JSON Schema public

Le contrat est actuellement défini par les types TypeScript et la
spécification. Un JSON Schema officiel permettrait :

- la validation dans n'importe quel langage ;
- l'autocomplétion dans les éditeurs ;
- une documentation machine des champs obligatoires et optionnels ;
- la détection des contrats incompatibles ou obsolètes ;
- l'intégration par d'autres outils sans importer le code TypeScript de
  TokenLintel.

Le contrat porte sa propre version de schéma dans `contractVersion`. Cette
version concerne le format du JSON exporté, tandis que l'UCS désigne le concept
global qui réunit ce contrat et le code réel du composant.

**Statut :** priorité moyenne, nécessaire avant une diffusion large.

### 4.4 Diff sémantique dans les pull requests

Un diff JSON brut devient difficile à relire lorsque les matrices de variantes
grandissent. Un résumé pourrait classer les changements :

```text
Button

Ruptures
- valeur "outlined" supprimée de variant
- prop iconLeft renommée

Ajouts compatibles
- taille "compact" ajoutée
- état "loading" ajouté

Tokens
- primary.contained.hover.background remplacé
```

Le diff doit rester dérivé des deux contrats comparés : il n'ajoute aucune
nouvelle vérité. Il pourrait servir de commentaire de PR ou de rapport CI.

**Statut :** priorité moyenne, après stabilisation du schéma.

### 4.5 Propriétaire explicite de chaque information

Les approches code-first montrent l'intérêt d'une source de vérité unique pour
chaque catégorie d'information. Dans l'UCS, cette responsabilité doit rester
explicite :

| Information | Propriétaire |
|---|---|
| Variantes visuelles, tokens, états graphiques, icônes et règles d'usage | Figma |
| Comportement, accessibilité, événements et contraintes de plateforme | Code réel |
| Liaison entre contrat et implémentation | Repository consommateur |
| Vérification de cohérence | CI et adaptateurs de plateforme |

Le contrat ne doit pas devenir une seconde définition de ce qui appartient au
code.

## 5. Ce qu'il ne faut pas copier

Afin de préserver un contrat générique, lisible et stable, les évolutions
suivantes sont déconseillées :

- insérer des snippets React, CSS ou propres à une plateforme dans le contrat ;
- transformer le contrat en documentation Storybook complète ;
- exporter l'arbre Figma brut ou chercher à reproduire tout son layout ;
- ajouter des événements applicatifs génériques comme `activate` ;
- décrire `onClick`, les attributs `aria-*` ou les règles de formulaire dans
  Figma ;
- représenter toute l'implémentation dans le contrat ;
- construire une synchronisation bidirectionnelle avant d'avoir démontré la
  stabilité du flux actuel.

## 6. Risque principal

La co-localisation rapproche la spécification et le code, mais ne garantit pas
à elle seule leur cohérence :

```text
Figma ──► contrat de composant
                 ↕ validation encore partielle
          implémentation réelle
```

Le concept atteindra sa pleine puissance lorsque la CI saura détecter :

- une variante présente dans le contrat mais absente du code ;
- une prop design ou une valeur d'enum divergente ;
- un token référencé qui n'existe plus ;
- une règle d'icône `strict` non respectée ;
- un contrat incompatible avec la version de schéma prise en charge ;
- une modification importante difficile à repérer dans le JSON brut.

## 7. Ordre de développement recommandé

1. **Ne pas enrichir le contrat par anticipation.** Stabiliser le résultat
   actuel sur Button.
2. **Tester un composant Alert.** Il doit notamment valider une icône `strict`
   et une matrice visuelle différente de Button.
3. **Tester un composant interactif différent.** Checkbox, Radio ou TextField
   permettront de vérifier les booléens, états et slots sans ajouter de
   sémantique applicative au contrat.
4. **Analyser les échecs en contexte froid.** Modifier le contrat uniquement si
   une information design nécessaire est réellement absente ou ambiguë.
5. **Ajouter un JSON Schema.** Figer une base portable avant d'ouvrir le format
   à d'autres consommateurs.
6. **Construire le validateur contrat ↔ code.** Commencer par l'adaptateur
   React/TypeScript du playground.
7. **Ajouter un diff sémantique.** Faciliter les revues lorsque les contrats se
   multiplient.
8. **Étudier les passerelles.** Génération Code Connect, exploitation
   Storybook ou autres intégrations, sans en faire des dépendances du contrat.

Le deuxième et le troisième composant doivent guider les prochains changements
de schéma. Une abstraction ajoutée avant d'avoir rencontré son cas réel risque
de résoudre un problème théorique et de réduire la généricité du projet.

## 8. Critères pour considérer le concept validé

Au-delà du MVP Button, l'UCS pourra être considéré comme suffisamment robuste
pour une expérimentation externe lorsque :

- plusieurs familles de composants sont décrites sans condition spécifique à
  leur nom ;
- leurs contrats passent un JSON Schema versionné ;
- les tokens utilisés sont vérifiés automatiquement ;
- un premier adaptateur détecte les divergences entre contrat et code ;
- un agent en contexte froid utilise correctement les variantes et règles
  d'usage sans inventer d'API design ;
- les erreurs répétées des agents peuvent être reliées à une ambiguïté précise
  du contrat ou à une responsabilité qui appartient explicitement au code.
