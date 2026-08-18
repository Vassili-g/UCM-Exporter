# Concept — UCM (Unified Component Model)

Ce document définit le problème, les responsabilités et les principes du
modèle. Le comportement du plugin est spécifié dans
[UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) et son avancement dans
[ROADMAP.md](./ROADMAP.md).

## 1. Le problème

Un composant existe généralement à plusieurs endroits : Figma, code,
documentation, tokens et exemples. Ces représentations peuvent diverger sans
que l’équipe le voie immédiatement. Cette ambiguïté pénalise les humains et les
agents IA : ils ne savent plus quelle variante existe, quel token employer ni
quelle source croire.

L’UCM rapproche ces informations sans prétendre les fusionner en une seule
source omnisciente.

## 2. Le composant unifié

Un **composant unifié** réunit dans le même dossier :

```text
components/Button/
  Button.tsx
  Button.contract.json
```

- le code réel implémente le comportement applicatif ;
- le contrat exporté de Figma décrit la partie visuelle ;
- les tokens partagés restent dans un fichier DTCG commun ;
- la CI contrôle les relations entre ces éléments.

Un composant **simple** consomme des tokens et rend ses propres calques. Un
composant **composé** réutilise aussi d’autres composants unifiés. Son contrat
déclare ces dépendances sans recopier leurs détails internes.

## 3. Une information, un propriétaire

| Information | Source qui fait foi |
|---|---|
| Valeurs et alias des tokens, variantes, états visuels, dimensions, icônes et règles d’usage | Figma |
| Noms de l’API visuelle | Accord designer–développeur, enregistré dans Figma |
| Comportement, événements, accessibilité et attributs natifs | Code |
| Association contrat–code et détection des écarts | Repository consommateur et CI |

Cette répartition évite deux erreurs :

- faire porter au contrat des responsabilités applicatives ;
- faire interpréter le contrat par le composant au runtime.

Le développeur écrit le composant **contre** le contrat. Le build peut dériver
des types et des variables CSS, mais le code de production ne lit pas le JSON
pour décider dynamiquement de son rendu.

## 4. Les invariants

### Les tokens restent des références

Un token conserve le même chemin de Figma jusqu’au code. Les alias ne sont pas
aplatis et le contrat cite des références comme
`{components.button.colors.primary}`. Cela permet de vérifier les noms et de
préserver les thèmes et marques.

### Les noms restent traçables

Le nom Figma lisible reste dans le contrat. Un identifiant de code canonique
sert aux fichiers et aux symboles TypeScript. Tout renommage sémantique
conserve le nom Figma d’origine.

### La composition ne duplique pas

Un composant composé référence ses dépendances et réutilise leur
implémentation. Il ne redécrit ni leurs tokens, ni leur structure interne.

### Un contrat peut précéder le code

Le contrat peut être fusionné avant l’implémentation. La parité devient
obligatoire dès que le composant correspondant existe.

### Les divergences doivent être visibles

Une information ambiguë ou inexploitable produit un diagnostic. Les seules
erreurs bloquantes de l’export sont les préconditions qui empêcheraient de
produire un contrat cohérent.

### Le contrat est portable et autosuffisant

Figma est l'entrée de construction du contrat, pas une dépendance de son
consommateur. Le contrat publié contient uniquement la projection UCM utile :
API visuelle, variantes et vues exactes, liaisons natives, structure,
typographie, icônes, composition, règles d’usage, tokens employés et
métadonnées de traçabilité. Il n'embarque ni représentation propriétaire ni
asset de rendu.

Toute information nécessaire au consommateur doit donc être modélisée dans le
vocabulaire portable. Lorsqu'elle ne peut pas l'être sans ambiguïté,
`meta.diagnostics` l'explique et `meta.coverage.portable` devient `partial` : le
contrat ne masque pas la perte et ne demande pas au consommateur d'interpréter
une autre représentation.

Chaque entrée de `variants`, jointe à la vue complète qu'elle référence dans
`variantViews`, est une vue portable autonome de la combinaison réelle : arbre,
peintures et strokes situés par chemins de slots, usages typographiques, icônes situées, dépendances et
liaisons natives. Deux combinaisons ne partagent une vue que si ces blocs sont
strictement identiques ; il n'existe ni héritage ni merge implicite. `structure`
garde la projection de référence et les dimensions par taille, mais plus aucun
index parallèle de la matrice. Les enums de `props` décrivent les valeurs
possibles axe par axe ; la liste `variants` décrit les seules combinaisons
autorisées.

## 5. Le workflow

```text
Figma
  │  export manuel et relu
  ▼
contrat + tokens
  │  pull request
  ▼
repository consommateur
  ├─ code réel
  ├─ types et CSS dérivés
  └─ contrôles CI
```

Le designer relit la vérité visuelle exportée. Le développeur implémente ou
adapte le code. La CI vérifie ce qu’elle sait prouver et signale explicitement
ce qu’elle ne peut pas vérifier.

Le playground complète ce workflow par un **test froid** : un agent reconstruit
un composant de validation à partir du seul contrat. Ce test mesure la qualité
du contrat ; son résultat n’est pas le code de production.

## 6. Ce que le modèle cherche à prouver

- **Robustesse** : un écart couvert par les garde-fous est détecté avant la
  fusion et reçoit un diagnostic actionnable.
- **Confiance** : un humain ou un agent peut choisir et utiliser un composant
  sans inventer son API visuelle.

La valeur du modèle dépend moins du nombre de champs exportés que de sa
capacité à tenir ces deux promesses sur des composants réels et variés.
