# Le concept UCM

Ce document définit le problème, les responsabilités et les principes du modèle,
puis situe UCM parmi les outils de design system.
La forme de ce qui est publié est spécifiée dans
[docs/FORMAT.md](./docs/FORMAT.md), le comportement du plugin dans
[packages/plugin/SPEC.md](./packages/plugin/SPEC.md), et l’avancement dans
[ROADMAP.md](./ROADMAP.md).

## 1. Le problème

Un designer ajoute une variante `danger` à son bouton. Trois mois plus tard,
l'équipe ne sait plus si le code la rend, si le token de sa couleur existe
encore, ni laquelle des deux versions fait foi. Aucun contrôle n'a comparé les
deux.

Un composant existe à plusieurs endroits : la maquette, le code, la
documentation, les tokens et les exemples. Ces représentations peuvent diverger
sans que l’équipe s'en aperçoive. L'ambiguïté pénalise les humains comme les
agents : ils ne savent plus quelle variante existe, quel token employer ni
quelle source croire.

L’UCM rapproche ces informations sans les fusionner en une source unique.

## 2. Le composant unifié

Un **composant unifié** réunit dans le même dossier :

```text
components/Button/
  Button.contract.json    le contrat : son nom est fixé par le format
  Button.<ext>            le code : son extension est celle du repository
```

Ce que le modèle fixe est le contrat et sa co-localisation ; où le code se
trouve et comment il se nomme est déclaré par le repository, dans
`ucm.config.json` (défaut `{dir}/{id}.tsx`, que tout dépôt remplace par le
sien).

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
| Contenu et props affichés dans la maquette | Figma, à titre **indicatif** |

La dernière ligne se lit autrement que les autres. Tout ce qui précède est
**normatif** : le contrat l'affirme, et un contrôle peut l'opposer au code. Le
contenu de maquette est **indicatif** : il dit ce que Figma montrait au moment
de l'export, pour qu'un humain ou un agent retrouve l'esthétique voulue sans
avoir à la deviner. Aucun contrôle ne le compare au code.

L'échantillon ne contient jamais de donnée de rendu. Une couleur ou une
dimension qui manquerait là est un trou du contrat normatif, à corriger là-bas.

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
sert aux fichiers et aux symboles TypeScript. Tout renommage sémantique conserve
le nom Figma d’origine.

### La composition ne duplique pas

Un composant composé référence ses dépendances et réutilise leur implémentation.
Il ne redécrit ni leurs tokens, ni leur structure interne.

### Un contrat peut précéder le code

Le contrat peut être fusionné avant l’implémentation. La parité devient
obligatoire dès que le composant correspondant existe.

### Les divergences doivent être visibles

Une information ambiguë ou inexploitable produit un diagnostic. Les seules
erreurs bloquantes de l’export sont les préconditions qui empêcheraient de
produire un contrat cohérent.

### Le contrat est portable et autosuffisant

Figma est l'entrée de construction du contrat, pas une dépendance de son
consommateur. Le contrat publié n'embarque ni représentation propriétaire ni
asset de rendu.

Toute information nécessaire au consommateur doit donc être modélisée dans le
vocabulaire portable. Lorsqu'elle ne peut pas l'être sans ambiguïté,
`meta.diagnostics` l'explique et `meta.coverage.portable` devient `partial` : le
contrat ne masque pas la perte et ne demande pas au consommateur d'interpréter
une autre représentation.

Chaque combinaison réelle est décrite de façon autonome, sans héritage ni merge
implicite entre elles : deux combinaisons ne partagent une description que si
elle leur est strictement identique. [docs/FORMAT.md](./docs/FORMAT.md) porte la
forme exacte de cette projection.

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
adapte le code. La CI vérifie ce qu’elle peut prouver et signale explicitement
ce qu’elle ne vérifie pas.

Un **test froid** complète ce workflow : sur une branche de recette du
repository consommateur, un agent reconstruit un composant à partir du seul
contrat suivi, sans ouvrir l’implémentation précédente. Ce test mesure la
qualité du contrat ; son résultat n’est pas du code de production, et le
composant obtenu est jetable.

## 6. Ce que le modèle cherche à prouver

- **Robustesse** : un écart couvert par les garde-fous est détecté avant la
  fusion et reçoit un diagnostic actionnable.
- **Confiance** : un humain ou un agent peut choisir et utiliser un composant
  sans inventer son API visuelle.

Le modèle vaut par ces deux promesses tenues sur des composants réels et variés.
Le nombre de champs exportés ne le mesure pas.

## 7. UCM parmi les outils de design system

UCM décrit les décisions visuelles de Figma dans un contrat versionné à côté du
code. Le tableau compare cette responsabilité à celles des outils et du
standard ci-dessous, à partir de leurs documentations.

| Solution ou standard | Ce qu’il apporte | Place de l’UCM |
|---|---|---|
| [Figma Code Connect](https://developers.figma.com/docs/code-connect/) | Associe les composants Figma à leurs implémentations et enrichit le contexte fourni aux agents par Figma | Le contrat UCM décrit les obligations visuelles dans un fichier lisible et contrôlable sans accès à Figma. Une correspondance Code Connect peut relier ce composant à son code |
| [Storybook](https://storybook.js.org/docs/writing-docs/autodocs) | Documente les composants depuis le code, les stories et les métadonnées de props | UCM fournit les obligations issues de Figma ; les stories montrent le comportement de l’implémentation. Leur comparaison permet d’étudier les écarts |
| [UXPin Merge](https://www.uxpin.com/docs/merge/merge-design-system-documentation/) | Intègre une bibliothèque de composants codés dans l’outil de conception et en dérive la documentation | UCM conserve une source visuelle dans Figma, distincte du code applicatif, et contrôle leur relation |
| [Backlight](https://backlight.dev/docs/make-your-first-design-system) | Regroupe le code, les stories, les tests, la documentation et les ressources design par composant, avec une intégration Git | UCM ajoute à cette organisation un contrat visuel exporté de Figma. Ce fichier peut être lu par les outils du repository |
| [DTCG](https://www.designtokens.org/tr/2025.10/format/) | Définit un format d’échange pour les tokens et leurs références | UCM emprunte à DTCG la structure de `tokens.json`, ses alias, ses `$extensions` et la forme des couleurs et des dimensions du module `2025.10`, que Style Dictionary 5 lit ; [docs/FORMAT.md](./docs/FORMAT.md#partie-2--export-tokens) donne les écarts qui restent. Le contrat de composant décrit les variantes, états, placements et règles d’usage qui emploient ces tokens |

L’apport recherché est de rendre ces obligations visuelles accessibles à un
développeur, une CI ou un agent depuis le repository. La reconstruction à froid
éprouve si le contrat contient assez d’informations pour implémenter le rendu.

Cette approche vise les équipes qui maintiennent à la fois une source Figma et
une bibliothèque de composants codés. Son intérêt dépend des écarts qu’elles
ont besoin de détecter et du coût de leur suivi. Lorsqu’une équipe conçoit
directement avec ses composants codés, le besoin d’un contrat visuel séparé
reste à établir.
