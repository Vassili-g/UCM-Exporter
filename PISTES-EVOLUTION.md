# Pistes d’évolution — UCM

Ce document conserve uniquement les options non engagées. Il ne décrit ni le
comportement actuel, défini dans
[UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md), ni les priorités, suivies dans
[ROADMAP.md](./ROADMAP.md).

Une option n’entre dans la spécification qu’après un besoin observé sur un
composant réel, un propriétaire clair dans le modèle et un plan de validation
côté consommateur.

## Contrat portable

### Manifeste d’icônes

Une prop d’icône modifiable n’énonce pas les noms acceptés par le kit de
l’application. Un manifeste séparé pourrait associer nom Figma et identifiant
de code, sans faire du catalogue d’icônes un détail interne de chaque contrat.

À ouvrir si un test froid doit aujourd’hui inventer un nom d’icône. Il faudra
alors définir qui publie le manifeste, comment il est versionné et comment le
Playground valide une référence.

### Propriétés visuelles supplémentaires

`textCase` et `textDecoration` sont les premiers candidats connus. Une propriété
n’est ajoutée qu’avec :

- le calque qui en est propriétaire ;
- sa forme portable ;
- son applicabilité et ses valeurs neutres ;
- le comportement en cas de liaison partielle ou de valeur `figma.mixed` ;
- un diagnostic designer et un test de consommation.

L’arbre actuel reste l’unique autorité pour décider si un calque est publié. Une
extension ne doit ni recopier l’arbre Figma, ni ouvrir les tracés internes d’une
icône.

### Localisation structurée des diagnostics

`meta.diagnostics` publie `code`, `severity` et `message`, tandis que
`meta.coverage.portable` distingue une projection complète d’une projection
partielle. Le type prévoit aussi une localisation facultative :

```text
figma.variantName
figma.nodeName
figma.nodeId
figma.property
contractPath
```

L’export courant ne renseigne pas encore ces champs. Les alimenter de façon
cohérente permettrait au consommateur de corréler une propriété absente avec le
diagnostic qui l’explique. Cette étape exige un collecteur typé partagé par tous
les extracteurs ; quelques localisations isolées donneraient une représentation
incomplète.

### Compatibilité et interopérabilité

Le JSON Schema du contrat est publié : il vit dans `schema/`, dérivé de
`types.ts`, et n’est plus une option. Ce qu’il a laissé ouvert le reste :
`tokens.json` n’a pas de version explicite, et la politique de compatibilité
n’est écrite nulle part.

Une porte de CI fondée sur ce schéma a été examinée puis écartée : le
Playground prouve déjà la forme, et une seconde autorité sur la même
convention finirait par accepter ce que la première refuse. Elle ne se
rouvrira que si un consommateur hors Node en a besoin.

### Diff sémantique

Une revue pourrait résumer les props ou valeurs supprimées, les variantes
ajoutées, les tokens remplacés et les changements de composition. Le diff doit
rester entièrement dérivé des deux JSON et ne jamais devenir une nouvelle
source de vérité.

## Repository consommateur

### Vérification générique du rendu

Cette option est détaillée dans
[PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md). Le vérificateur générique de
toutes les vues reste une proposition de recherche, sans décision ni
implémentation.

### Liaison explicite avec l’implémentation

La co-localisation suffit au prototype. À plus grande échelle, un manifeste du
repository pourrait associer contrat, source et export public. Cette
information appartient au consommateur, jamais à Figma, car elle dépend du
framework et de l’organisation du code.

### Retour dans l’éditeur

Les contrôles statiques pourraient devenir des règles de linter pour signaler
un chemin de token construit, une référence absente du contrat ou une valeur
visuelle brute. Cette piste n’est utile qu’après mesure des faux positifs et
avec des exceptions rares, explicites et révisables.

### Multi-marque

Les modes Figma sont conservés dans l’export DTCG. Leur projection en CSS, leur
sélection au runtime et leur prévisualisation restent à concevoir dans le
consommateur.

### Extraction multi-repository

La condition tient en une phrase : rien à publier tant qu’un seul repository
consomme des contrats. Un découpage éventuel doit conserver une seule autorité
pour les conventions de version, d’identifiant et de références de tokens.

### Passerelles

Une fois le format stabilisé, des adaptateurs pourraient alimenter Code
Connect, une documentation, des stories ou d’autres pipelines DTCG. Une
passerelle adapte le contrat ; elle ne lui ajoute ni comportement applicatif ni
donnée propre à un framework.

## Risques à surveiller

### Export Figma périmé

L’export est manuel. Aucun contrôle du repository ne peut prouver qu’un fichier
représente le dernier état de Figma. La réponse doit rester proportionnée : date
d’export visible, discipline de revue et éventuel rappel ciblé.

### Fausse promesse de parité

La co-localisation et l’analyse statique ne prouvent pas un rendu identique.
Chaque contrôle annonce ce qu’il vérifie et ce qu’il ne vérifie pas. Une
comparaison d’images resterait le travail d’un outil de régression visuelle.

### Contrat trop large

Événements, attributs `aria-*`, règles de formulaire et détails React
appartiennent au code. Les ajouter au contrat réduirait sa portabilité et
dupliquerait une autre source de vérité.

### Friction et conventions cachées

Une CI sujette aux faux positifs finit par être contournée. Toute convention
nécessaire au rendu doit être tokenisée, portée par le contrat ou assumée dans
un adaptateur documenté ; elle ne doit pas rester implicite.

## Ce qui ne doit pas être construit

- écriture automatique du code vers Figma ;
- génération ou interprétation du code de production à partir du contrat au
  runtime ;
- reproduction brute de l’arbre Figma ;
- moteur maison de régression visuelle lorsqu’un outil spécialisé suffit ;
- plateforme centrale avant que l’usage réel le justifie.

La règle de décision reste simple : une évolution améliore la robustesse ou la
confiance sur un cas observé, sans créer une nouvelle source de vérité.
