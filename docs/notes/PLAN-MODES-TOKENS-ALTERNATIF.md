# Plan alternatif : modes, guides et profils de consommation

Ce plan remplace `PLAN-MODES-TOKENS.md` pour les sujets suivants : modes de
jetons, transmission des règles aux agents, personnalisation d'un repository,
modèles d'implémentation et installation dans un repository consommateur.

Le plan ne modifie pas le contrat de composant pour y ajouter des préférences
de stack. Il rend explicites les frontières suivantes :

- UCM publie les données de tokens, les règles de transcription et les outils
  de vérification.
- Le repository consommateur choisit sa stack, ses conventions et ses modèles.
- Un profil installé relie ces choix aux outils UCM.
- Une règle de rendu publiée par le contrat ne devient pas une préférence
  locale. Une préférence change la manière d'organiser le code ; elle ne
  contredit pas le rendu contractuel.

## 1. Résultat attendu

Après `ucm init`, un repository qui contient un contrat et un fichier de tokens
possède les éléments suivants :

```text
.ucm/
  profile.json                 profil sélectionné et versionné
  conventions.md               préférences de stack et règles locales
  templates/                   modèles d'implémentation locaux
    component.md
    component.tsx              exemple du profil choisi, si la stack le prévoit
  guides/
    implementation.md          point d'entrée court pour les agents
  generated/                   sorties produites par UCM, ignorées par Git
```

Les noms sont configurables dans `.ucm/profile.json`. `ucm init` crée les
fichiers absents et ne remplace jamais un fichier existant. Une mise à niveau
propose les nouveaux fichiers et écrit seulement avec `--update` après une
confirmation explicite.

Le repository peut supprimer ou réécrire les conventions et les modèles après
l'installation. UCM conserve le contrat de leur interface, pas leur contenu.

## 2. Réponses aux demandes

| Demande | Réponse de ce plan | Preuve |
|---|---|---|
| Modes dans `tokens.json` | déclaration d'axes, modes, défauts et valeurs par mode | validation du format et tests du lecteur |
| Modes imbriqués et nombreuses collections | graphe d'alias global, cônes de dépendances et sélecteurs par portée | tests à trois axes, mesures de taille et de temps |
| Règles concrètes d'implémentation | `rendering.roles`, skill portable et exemples de transcription | `ucm guide`, archive npm et test de contenu |
| Personnalisation des règles locales | profil, conventions et modèles versionnés dans le repository | `ucm init`, schéma et test de non-écrasement |
| Skill pour un agent IA | skill générale publiée avec la CLI, complétée par le guide local | lecture depuis `node_modules` et test sans producteur |
| Réduction des tokens consommés | sortie résumée, chargement par caractéristiques et références ciblées | budget mesuré sur contrats synthétiques et réels |
| Préférences de stack | profils déclaratifs, sans logique UCM dans le repository | validation de profil et recette d'installation |
| Architecture uniforme | modèles, règles vérifiables et commande de génération | comparaison au modèle et contrôle de stack |
| Installation partout | `ucm init --profile <nom>` et adaptations limitées au profil | recette dans un repository vide |

Une exigence qui concerne la forme du code, le nommage, les tests ou la stack
reste dans le profil du consommateur. Une exigence qui concerne la structure du
contrat ou la traduction d'un rôle reste dans UCM.

## 3. Modèle des modes

### 3.1. Axes et collections

Une collection Figma qui possède plusieurs modes devient un axe. La racine de
`tokens.json` porte une déclaration explicite :

```json
{
  "$extensions": {
    "com.ucm.formatVersion": 2,
    "com.ucm.axes": {
      "brand": {
        "modes": ["intencial", "marque-2"],
        "default": "intencial",
        "attribute": "data-brand"
      },
      "theme": {
        "modes": ["light", "dark"],
        "default": "light",
        "attribute": "data-theme"
      }
    }
  }
}
```

`attribute` est facultatif dans le fichier produit. La configuration du
repository peut le remplacer. Le producteur écrit le préfixe canonique de la
collection, l'identité du mode, l'ordre des modes et le défaut. Le lecteur ne
déduit jamais le défaut du premier élément.

Une collection possède un préfixe unique. Deux préfixes égaux ou imbriqués
sont valides si l'export enregistre leur propriétaire feuille par feuille. Le
lecteur ne déduit pas la propriété à partir d'un simple préfixe. Chaque feuille
à modes reçoit donc une référence d'axe dans l'extension interne de la feuille,
ou dans la table de propriété de la racine si la forme DTCG impose de garder
les feuilles sans métadonnées.

Cette table supprime l'ambiguïté entre :

- une collection `brand` et une collection `brand.client` ;
- deux collections dont les feuilles partagent un chemin ;
- une feuille dérivée d'un alias mais située dans une autre collection.

Les extensions restent à la racine quand DTCG interdit les métadonnées sur un
groupe. La table de propriété est alors la seule autorité.

### 3.2. Valeurs et alias

Chaque feuille à modes contient une valeur par mode. `$value` reste la valeur
du mode par défaut pour les outils qui ne connaissent pas les modes. Les alias
ne sont jamais aplatis.

Le lecteur construit une fois le graphe inverse des alias de `$value` et de
toutes les valeurs de mode. Pour un axe donné, son cône contient :

1. les feuilles dont cet axe est propriétaire ;
2. les feuilles qui dépendent, directement ou indirectement, de ces feuilles.

Lorsqu'un mode est choisi dans une portée, UCM redéclare le cône nécessaire.
Une feuille appartenant à un autre axe conserve le mode de cet autre axe. La
résolution porte donc sur un contexte, jamais sur un produit de chaînes de
modes recomposé par le composant.

### 3.3. Imbrication

Le rendu web utilise un attribut par axe :

```html
<div data-brand="marque-2">
  <section data-theme="dark">
    <div data-density="compact">
      <button>Continuer</button>
    </div>
  </section>
</div>
```

Chaque attribut s'hérite jusqu'à une nouvelle valeur du même axe. Une portée
peut changer le thème sans réinitialiser la marque. UCM génère les règles de
croisement nécessaires quand un alias d'un axe dépend d'un autre axe.

Les croisements marque/thème/densité sont dans la première livraison. Ils ne
sont pas reportés à une décision ultérieure. La sortie doit rester correcte
quel que soit l'ordre d'imbrication des axes et quel que soit l'axe placé sur
l'élément parent.

Pour les plateformes sans héritage CSS, le même modèle expose une fonction
pure :

```text
resolveToken(document, tokenPath, { brand: "marque-2", theme: "dark" })
```

Cette fonction reste interne aux outils UCM. Le repository reçoit une sortie
adaptée à sa plateforme, et ne recopie pas le résolveur.

### 3.4. Grand nombre de modes

Le générateur ne fabrique pas une sortie par combinaison complète. Il émet :

- une règle par mode et par axe ;
- les redéclarations des feuilles du cône ;
- les règles de croisement seulement pour les dépendances entre axes.

La complexité est mesurée avec `A` axes, `V` feuilles, `E` alias et `M` modes :

- index du graphe : `O(V + E)` ;
- cônes : `O(A × (V + E))` ;
- règles simples : `O(sum(Ma × cone(a)))` ;
- croisements : `O(sum(Ma × Mb × dependances(a,b)))`.

Le fichier généré porte les statistiques de build dans un rapport séparé, pas
dans le CSS. Le build refuse un seuil configuré par le repository : nombre de
règles, octets non compressés, durée du générateur et mémoire maximale.

`ucm guide` ne déroule pas toutes les combinaisons par défaut. Il affiche les
axes touchant le contrat, les facteurs, le nombre total, puis les contextes
nécessaires à la recette selon une limite. Une option demande l'énumération
complète. Une liste tronquée est toujours signalée comme telle.

## 4. API et commandes

### 4.1. Lecteur portable

`@ucm-kit/core/lecteurs` expose le modèle de modes, sans dépendance à Node,
Figma, CSS ou une stack d'interface :

- `axesDeTokens(document)` valide la déclaration et les défauts ;
- `conesDesAxes(document)` calcule les dépendances ;
- `documentDansLeContexte(document, contexte)` sélectionne les valeurs ;
- `axesDuContrat(contrat, index)` calcule l'impact direct et transitif ;
- `contextesDeRecette(contrat, limite)` produit une couverture résumée.

Les fonctions valident les modes inconnus, les alias absents, les cycles, les
collisions et les types incompatibles. Elles renvoient des constats structurés,
pas des phrases de diagnostic.

### 4.2. Générateurs

La CLI fournit deux sorties :

```sh
ucm tokens css-modes --base-css src/generated/tokens.css --out .ucm/generated/modes.css
ucm tokens contexte brand=marque-2 theme=dark --out .ucm/generated/tokens.json
```

`css-modes` sert au web. `contexte` sert au build d'une plateforme qui veut un
fichier de tokens déjà sélectionné. Les deux commandes partagent le même
lecteur et les mêmes contrôles de données.

Une sortie est écrite après validation complète, par remplacement atomique.
Une erreur laisse la sortie précédente intacte et produit un code non nul.

## 5. Règles d'implémentation publiées

### 5.1. Skill générale

La CLI publie `skills/implementer-depuis-un-contrat/SKILL.md`. Cette skill est
portable et ne contient ni React, ni TypeScript, ni chemin vers UCM-Exporter.
Elle décrit un ordre court :

1. lancer `ucm guide <contrat>` ;
2. lire le contrat, la vue exacte et les règles de rendu ;
3. charger les conventions et le modèle désignés par le profil ;
4. implémenter les variantes, slots, compositions et tokens ;
5. appliquer les diagnostics au lieu d'inventer une donnée absente ;
6. exécuter le contrôle de parité et le test du repository ;
7. vérifier les contextes donnés par `ucm guide`.

Chaque règle indique sa source et son contrôle. La skill ne répète pas le
contrat. Elle explique comment lire ses champs.

### 5.2. Rendu sémantique

Le contrat reste l'autorité sur la traduction du rendu. La skill contient des
exemples courts et normatifs :

- un rôle `ring` se rend avec `outline` et ses paramètres d'alignement ;
- un rôle `border` se rend avec `box-shadow`, afin de ne pas modifier la boîte ;
- une couleur se prend dans la clé de la vue, pas dans le nom supposé du
  calque ;
- `paintPlacements` indique le calque à peindre ;
- `icons.*.slot` désigne un slot existant et ne donne pas le dessin de l'icône ;
- une absence de valeur contractuelle ne devient pas une valeur inventée dans
  le composant.

Ces règles sont vérifiées par les lois du contrat et par le contrôle de parité.
Le profil peut choisir la fonction CSS, le fichier et le nom de classe. Il ne
peut pas transformer `ring` en `border` si le contrat impose une géométrie hors
boîte.

### 5.3. Guide ciblé

`ucm guide` fournit un document court adapté au contrat :

- axes et modes touchant le contrat, composition comprise ;
- règles de rendu effectivement présentes ;
- slots, icônes, props et diagnostics pertinents ;
- chemin de la skill publiée ;
- chemin des conventions et du modèle du profil ;
- commandes de contrôle ;
- contextes de recette et facteur de leur nombre.

Les parties sans rapport avec le contrat ne sont pas imprimées. `--full` permet
à une personne de demander la référence complète.

## 6. Profils, préférences et personnalisation

### 6.1. Profil de stack

Un profil est un document de données versionné dans la CLI ou dans le
repository. Il décrit les entrées observables par les outils :

```json
{
  "id": "typescript-react",
  "language": "typescript",
  "componentExtension": ".tsx",
  "componentDirectory": "src/components",
  "implementationCommand": "npm test -- --runInBand",
  "buildCommand": "npm run build",
  "tokenImport": "src/index.css",
  "templates": "./.ucm/templates",
  "conventions": "./.ucm/conventions.md",
  "checks": ["npm run typecheck", "npm test"]
}
```

Le profil ne contient pas de code d'exécution arbitraire. Les commandes sont
confirmées par la personne et restent des instructions pour le guide. Une
extension peut fournir un adaptateur de parité, comme l'adaptateur TypeScript
actuel, mais le guide fonctionne sans extension.

La personne change les chemins et commandes dans `.ucm/profile.json`. Elle
change les règles d'écriture dans `.ucm/conventions.md`. Elle change les
structures proposées dans `.ucm/templates/`. Ces trois modifications ne
nécessitent ni fork d'UCM ni modification du contrat.

### 6.2. Conventions locales

`conventions.md` possède des rubriques fixes pour que `ucm guide` puisse charger
seulement la partie utile :

```text
[stack]
[structure]
[styling]
[accessibility]
[testing]
[commands]
[templates]
```

Chaque rubrique accepte des liens vers un document plus long. La commande
refuse une rubrique inconnue uniquement en mode strict ; une préférence libre
reste lisible par l'agent mais n'est pas traitée comme une règle UCM.

Une convention peut imposer, par exemple, un composant fonctionnel, une
bibliothèque CSS, le nommage des tests ou la gestion du focus. Elle ne peut pas
redéfinir la surface publique, la matrice des variantes ou la sémantique d'une
couleur du contrat.

### 6.3. Modèles d'implémentation

Un modèle contient :

- la structure de fichier attendue ;
- les points d'insertion des variantes, props, slots et tokens ;
- un exemple minimal compilable ;
- les contrôles à lancer ;
- les parties que l'agent doit remplacer.

Le modèle n'est jamais copié automatiquement sur un composant existant.
`ucm generate component --from <contrat>` peut créer une implémentation
absente, avec `--dry-run` par défaut. La commande refuse de remplacer un fichier
existant sans `--force` et confirme la liste des fichiers écrits.

Les modèles restent dans le repository après génération. Les composants ne
chargent pas le contrat au runtime et les modèles ne deviennent pas une seconde
implémentation du lecteur UCM.

### 6.4. Règles vérifiables

Le profil peut déclarer des contrôles locaux : formatage, typecheck, tests,
linter, accessibilité et parité. UCM distingue dans le guide :

- contrôle exécuté par UCM ;
- commande déclarée par le profil ;
- relecture humaine.

Une convention seulement écrite dans un modèle n'est pas présentée comme une
preuve. La personne peut donc personnaliser l'architecture tout en gardant une
liste claire de ce qui est réellement contrôlé.

## 7. Installation dans un repository consommateur

### 7.1. Commande d'initialisation

Depuis la racine du repository :

```sh
npx ucm init --profile typescript-react
```

La commande :

1. détecte le fichier de tokens, les contrats et les commandes existantes ;
2. propose un profil compatible ;
3. affiche les fichiers qui seront créés ;
4. crée les ressources absentes ;
5. ajoute les scripts UCM manquants sans modifier un script existant ;
6. ajoute les sorties générées au `.gitignore` seulement si l'entrée manque ;
7. imprime la suite de commandes et le chemin du guide.

`--yes` accepte seulement les créations non conflictuelles. `--update` met à
jour les ressources gérées par UCM dans un dossier marqué par sa version ; il
refuse les fichiers modifiés depuis leur création et produit un diff à relire.

L'installation doit fonctionner dans un repository sans `package.json`, dans un
repository web et dans un repository non web. Un profil non web n'installe pas
la commande CSS.

### 7.2. Empreinte minimale

UCM écrit au maximum :

- `.ucm/profile.json` ;
- `.ucm/conventions.md` ;
- `.ucm/templates/` ;
- `.ucm/guides/implementation.md` ;
- les scripts et entrées de configuration explicitement demandés par le profil.

UCM n'écrit aucun lecteur de contrat, aucun helper runtime et aucun composant
métier dans le repository. Le fichier `AGENTS.md` existant n'est pas modifié.
Le guide local le cite depuis le point d'entrée que la personne choisit.

### 7.3. Mise à jour

Chaque profil porte une version de structure. `ucm doctor` signale :

- les ressources absentes ;
- les ressources obsolètes ;
- les chemins qui ne pointent plus vers un fichier ;
- les commandes déclarées mais inexistantes ;
- les modèles sans point d'insertion reconnu.

Le diagnostic propose une action précise. Il ne réécrit pas le repository.

## 8. Économie de tokens pour les agents

Le guide suit une stratégie en trois niveaux :

1. **Résumé obligatoire** : chemin du contrat, axes touchés, règles présentes,
   chemins locaux et commandes.
2. **Sections conditionnelles** : modes seulement si le contrat ou une
   dépendance en utilise ; icônes seulement si une icône est publiée ;
   typographie seulement si une vue en contient.
3. **Références ciblées** : chaque règle renvoie à une section et à une ligne
   de ressource locale ; l'agent ne charge pas le dépôt producteur.

La sortie JSON de `ucm guide --json` permet aux intégrations d'agent de choisir
elles-mêmes les sections à charger. Le texte reste destiné à une personne.

Le plan mesure :

- octets et tokens du résumé ;
- octets et tokens de chaque section ;
- nombre de fichiers ouverts par l'agent ;
- taux de règles chargées mais inutilisées ;
- erreurs de parité et corrections nécessaires.

Les mesures comparent le guide complet, le résumé ciblé et une lecture manuelle.
Une version n'est déclarée plus économique qu'après trois contrats courts, un
contrat composé et un contrat touché par trois axes. Le budget maximal est une
option du profil ; le guide échoue s'il ne peut pas produire un résumé dans ce
budget.

## 9. Validation et lots

### L0 : modèle et preuve des modes

Construire les documents synthétiques suivants : deux axes croisés, trois axes
imbriqués, collections aux chemins imbriqués, alias en losange, défaut non
premier, mode accentué, mode réservé, cycle actif et cycle irréalisable.

Mesurer le graphe, les cônes, la taille de sortie et la résolution dans les
limites configurées. Vérifier les six ordres d'imbrication pour trois axes.

### L1 : format et export

Ajouter la table d'axes et de propriétaires à `tokens.json`, sans déplacer la
marque de version. Ajouter les contrôles d'export et les diagnostics de
propriété ambiguë. Mettre à jour `FORMAT.md`, `SPEC.md`, le changelog et les
lois du contrat.

### L2 : kit et CLI

Publier le lecteur portable, les commandes `css-modes` et `contexte`, leurs
codes de sortie, les contrôles de types et les seuils de coût. Tester les
sorties sur une copie temporaire et conserver la sortie précédente en cas
d'erreur.

### L3 : skill et guide

Scinder la skill générale de la skill de recette. Publier la première avec la
CLI. Implémenter `ucm guide`, sa sortie texte et sa sortie JSON. Vérifier la
skill depuis une archive installée hors du monorepo.

### L4 : profils et modèles

Ajouter le schéma de profil, le profil neutre, les profils web et TypeScript,
les rubriques de conventions et les modèles minimaux. Refuser une commande ou
un modèle mal formé avant installation.

### L5 : initialisation et doctor

Implémenter `ucm init`, `ucm doctor` et la génération facultative de composants.
Tester un repository vide, un repository existant, des fichiers modifiés, un
profil non web et une seconde exécution idempotente.

### L6 : recette

Rejouer la recette dans un repository temporaire depuis les archives npm, puis
dans le Playground depuis les paquets publiés. Vérifier :

- marque, thème et densité dans tous les ordres d'imbrication ;
- un composant composé dont un enfant touche un axe ;
- `ring` et `border` avec leurs propriétés de rendu attendues ;
- reconstruction depuis `ucm guide`, la skill publiée et le modèle local ;
- personnalisation d'une convention et d'un modèle sans modifier UCM ;
- installation dans un repository sans outillage UCM existant ;
- sortie ciblée sous le budget de tokens défini par le profil.

## 10. Garanties et limites

Le plan garantit la représentation de plusieurs axes, leur imbrication et les
croisements de dépendances couverts par les tests. Il ne promet pas que toutes
les plateformes héritent des modes comme CSS : elles utilisent la commande de
contexte ou l'adaptateur de leur profil.

Le plan garantit que les règles UCM restent portables et que les préférences
restent modifiables dans le repository. Il ne garantit pas qu'une préférence
locale soit effectivement respectée si aucun contrôle du profil ne l'exécute.
Le guide le marque alors comme relecture.

Le plan garantit une installation sans écrasement et une mise à niveau
inspectable. Il ne fusionne pas automatiquement des conflits dans un fichier
que le repository possède déjà.

Une limite de mode fixé dans un composant reste soumise à une mesure Figma.
Après cette mesure, le champ retenu doit appartenir au contrat et être contrôlé
avec `tokens.json`. Tant que cette décision n'est pas prise, UCM publie un
constat plutôt qu'une interprétation silencieuse.

## 11. Documentation à mettre à jour

Mettre à jour les documents qui portent une règle devenue fausse :

- `AGENTS.md` : carte des paquets, installation, skills et invariants ;
- `docs/FORMAT.md` : déclaration des axes, propriété des feuilles et
  compatibilité ;
- `packages/plugin/SPEC.md` : export des modes et cas refusés ;
- `docs/COMPATIBILITE.md` et `docs/CHANGELOG-FORMAT.md` ;
- `packages/cli/README.md` : commandes, profils et initialisation ;
- `docs/RECETTE.md` : recette multi-axes, guide publié et installation ;
- `UCM-Playground/AGENTS.md` et `README.md` : empreinte installée et protocole.

Chaque modification de comportement reçoit un test de régression. Le schéma
DTCG reste généré depuis les types ; aucun fichier généré n'est rédigé à la
main.
