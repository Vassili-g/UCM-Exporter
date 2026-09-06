# Plan de neutralisation d'UCM-Playground

Ce plan prolonge la Phase 7 (recette du repo vierge) et remplace la conclusion
de la Phase 9 de [PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md). La
Phase 9 a réduit les duplications sans remettre en cause le rôle du Playground.
La présente décision porte sur l'outillage : **la branche principale du
Playground ne porte plus de validation UCM, de génération de types ou de colle
spécifique écrite à la main**. Elle conserve en revanche les contrats, les
tokens et les composants reconstruits à partir d'eux. Ces composants sont des
sondes visuelles jetables : ils prouvent qu'un contrat réel suffit à
reconstruire le composant, et ne constituent ni une implémentation de
production ni une seconde autorité du format.

## État opérationnel — 6 septembre 2026

**N1 à N5 et N7 sont exécutés. N6 reste à faire**, et il demande Figma, GitHub
et une vraie pull request : il ne peut pas être joué depuis un agent. Le garde-
fou de N7 le réclame déjà : aucune des trois publications ne passera sans lui.

Le Playground n'a plus ni `scripts/`, ni test générique local, ni dépendance
`@ucm-kit`, ni skill, ni instruction d'agent. Il porte une application React
banale, les quatre contrats 12.0, `tokens.json`, les quatre sondes
reconstruites, et les cinq fichiers qu'`ucm init` écrit.

**Convention de lecture :** ce plan ne coche pas les étapes par anticipation.
Une étape est terminée seulement quand sa sortie est produite et vérifiée ; le
journal ci-dessous dit ce qui a été mesuré, et par quelle commande.

### Journal de recette

| Étape | Sortie mesurée |
|---|---|
| N1 | Dernier commit du corpus reconstruit avant le ménage : `0c7491b` sur `main` du Playground. `npm test` de l'Exporter vert sans le voisin — aucun test n'ouvre le clone frère |
| N2 | Deux garde-fous fermés chez le producteur : l'accord des deux filets de fin de CI (`918f004`, six mutations rouges) et le dépliage des vues locales sur deux crans (`30fc75d`, deux mutations rouges). L'injection d'échecs de tests était déjà couverte sur données synthétiques dans le kit et le CLI ; le parseur TAP n'a pas été déplacé. Le skill `consommer-contrat` a rejoint l'Exporter (`933062f`) |
| N3 | Trois commits chez le consommateur : `ccfe1a9` le corpus au rangement d'`ucm init`, `63308b0` le retrait de l'outillage, `fc11037` l'application minimale et le lockfile reconstruit |
| N4 | `b51796a` — README, CONCEPT, ROADMAP et AGENTS.md décrivent le consommateur réel ; AGENTS.md reçoit la frontière de recette |
| N5 | Clone neuf de `fc11037` : 27 fichiers suivis, aucun `scripts/`, aucun `*.test.*`, aucun `@ucm-kit` dans `package.json` ni dans le lockfile. `npm ci` puis `npm run build` passent. `npx --yes @ucm-kit/cli@0.1.7 check --report ci-report.md` — la commande exacte du workflow généré — sort en 0 : quatre contrats, 387 références contrôlées, implémentations présentes mais non lues faute d'adaptateur. Avec `@ucm-kit/adapter-typescript` installé dans le clone et aucun script local, les quatre passent à « code conforme » |
| N7 | `publish.yml` demande la réponse à chaque publication, et `scripts/recette-externe.mjs` la refuse quand un des quatre déclencheurs a bougé sans recette. Cinq tests couvrent le tri, dont le voisin d'un déclencheur qui n'en est pas un — il était rouge au premier essai, `init.mjs.bak` déclenchait |

État des artefacts à la fin de N5, à comparer après la recette suivante :
`Alert`, `Button`, `StressTest` et `TileLink` en `contractVersion` 12.0,
exportés les 3 et 4 septembre 2026 ; `tokens.json` produit 721 variables CSS.

## Décision

`UCM-Playground` devient une application React minimale et banale accompagnée
d'un corpus UCM réel : `tokens.json`, des contrats exportés depuis Figma et des
reconstructions visuelles de ces contrats.
React est la stack choisie pour la recette visuelle ; ce n'est pas une
prétention à la neutralité entre langages. La neutralité entre stacks reste
prouvée par les repos temporaires de `packages/cli/tests/recette.test.mjs`, dont
le cas nominal n'a même pas de `package.json`.

Ici, « neutre » signifie donc : **aucune implémentation UCM de production,
aucun contrôle UCM local et aucune autorité de format dans le Playground**. Les
seuls éléments UCM admis sont :

- les artefacts produits par l'Exporter (`*.contract.json`, `tokens.json`) ;
- les composants reconstruits depuis les contrats, maintenus comme sondes
  visuelles jetables ;
- les fichiers d'installation produits par `ucm init` ;
- le rapport produit par la CI, qui reste ignoré par Git.

La séparation se fait dans le temps :

```text
main du Playground, consommateur neutre avec contrats et tokens
  -> branche d'export
  -> export Figma (tokens puis contrat mis à jour)
  -> reconstruction éventuelle et CI
  -> pull request et constat
  -> fusion des artefacts valides, ou suppression de la branche pathologique
```

Les contrats et tokens peuvent et doivent être fusionnés dans `main` : leur
lecture depuis un vrai repository est le sujet de la recette. Ce qui ne doit pas
y entrer est le code ad hoc construit autour d'eux. Le dépôt est donc à la fois
un **consommateur de référence sans outillage local** et un corpus de données
réelles. Les scénarios volontairement cassés, eux, restent sur des branches
jetables.

« 100 % neutre » désigne l'arbre courant et les branches durables quant à leur
outillage et leurs autorités. Une reconstruction à froid n'est pas une
autorité : elle est précisément une preuve remplaçable que le contrat est
consommable. Réécrire l'historique Git pour effacer les anciens composants
n'améliorerait aucune preuve et détruirait la traçabilité ; cette opération est
hors périmètre. Si le nom ou l'historique devait lui aussi être vierge, il
faudrait créer un nouveau repository plutôt que réécrire celui-ci.

## Inventaire et destination

### Ce qui est déjà rapatrié

Les suppressions actuellement visibles dans `scripts/fixtures/`, ainsi que
`parite.mjs`, `generate-contract-types.mjs` et `types-variants.mjs`, ont leur
contrepartie dans `packages/adapter-typescript`. Il faut finir et vérifier cette
migration avant de neutraliser le Playground, sans recopier ces fichiers une
seconde fois.

Le verrou local sur le vrai `StressTest` ne doit pas suivre. La fixture
`packages/adapter-typescript/tests/fixtures/StressFixture.tsx` couvre déjà le
point générique découvert par R8 : additionner les occurrences sœurs dans une
vue et garder la cardinalité maximale entre vues.

### Ce qui est trié sans migration

| Surface actuelle du Playground | Décision | Raison |
|---|---|---|
| quatre `*.contract.json` et `src/tokens/tokens.json` | conserver, avec déplacement éventuel par un nouvel export | entrées réelles nécessaires pour éprouver le kit et le CLI |
| `src/components/**/*.tsx` et les `index.ts` | conserver et régénérer à froid | sondes visuelles jetables ; elles vérifient qu'un contrat réel suffit à reconstruire le composant |
| `src/App.tsx` actuel et `ContractIcon.tsx` | simplifier, conserver si nécessaires au rendu | galerie et correspondances propres à ce consommateur, mais utiles à la comparaison visuelle ; elles ne deviennent pas une bibliothèque |
| `src/banc-typographique.test.ts` et les classes `.ucm-type-*` | supprimer | banc manuel propre au corpus, sans rôle dans le format |
| `src/tokens.ts` | supprimer | mince convention React ; `isTokenReference`, `refPath` et `tokenCssVariable` ont déjà leur autorité dans le kit |
| `src/tokens.test.ts` | supprimer | teste soit le kit, soit le helper supprimé |
| `src/tokens-accord.test.ts` | supprimer | contrôle une configuration Style Dictionary propre à ce repo |
| `style-dictionary.config.mjs`, Tailwind, PostCSS et `@fontsource` | conserver seulement ce que l'application visuelle exige | pipeline de rendu de la sonde, pas autorité du format ni outil UCM |
| `scripts/parite.test.mjs` | supprimer | scénario générique déjà tenu par les tests de l'adaptateur |
| `scripts/check.mjs`, `run-tests.mjs`, `echecs-de-tests.mjs` et son test | supprimer | orchestration et adaptation TAP sans utilisateur dans le repo neutre |
| tests de liens, skills, surface documentaire et accord des workflows | supprimer | filets d'un dépôt UCM documenté, pas d'une application de base |
| `.agents/`, `.claude/`, `AGENTS.md` UCM et `CLAUDE.md` UCM | supprimer ou remplacer par des instructions strictement locales à l'app | aucun savoir du produit ne doit résider dans la cible de recette |
| `ucm.config.json`, réglages de schéma et `.gitattributes` UCM | conserver seulement sous la forme produite par `ucm init` | empreinte générique du produit que ce repo doit éprouver |
| `.env.example` Font Awesome | supprimer | dépendance propre à l'ancienne galerie |
| workflow UCM actuel | remplacer par la sortie de `ucm init` | supprimer l'orchestration locale, pas le contrôle des artefacts |

Le parseur TAP n'entre pas automatiquement dans un package. Le contrat public
du noyau accepte déjà des résultats de tests fournis par une stack, et ses tests
le couvrent. Tant qu'aucun deuxième consommateur réel ne demande la lecture de
TAP, publier un adaptateur Node ajouterait une surface sans usage. Si ce besoin
apparaît, il donnera lieu à un adaptateur optionnel et à ses fixtures chez
l'Exporter ; il ne justifiera pas le retour d'un script dans le Playground.

La configuration Style Dictionary suit la même règle. Elle pourra devenir un
preset optionnel après décision explicite, mais ne doit être ni déplacée telle
quelle dans `core`, ni conservée comme pseudo-exemple. `core/format` doit rester
indépendant d'une stack CSS.

### Ce que le Playground garde sur `main`

Une cible minimale suffit :

```text
.github/workflows/ucm.yml  workflow produit par ucm init
.gitignore
README.md                  deux phrases et les commandes de l'app
components/                contrats exportés et sondes reconstruites
index.html
package.json
package-lock.json
src/App.tsx                galerie minimale des sondes reconstruites
src/index.css              styles locaux de la galerie
src/main.tsx
tokens.json                export DTCG réel
tsconfig.json
ucm.config.json            configuration produite par ucm init
vite.config.ts
```

Les scripts npm se limitent à `dev`, `build` et `preview`. Il n'existe ni
dossier `scripts/`, ni test générique local, ni dépendance `@ucm-kit/*`. Les
composants reconstruits peuvent citer les tokens et les composants composés du
corpus : ce sont les sondes de rendu, pas une bibliothèque de production. La
configuration et le workflow générés restent les seuls éléments UCM hors des
artefacts et de cette galerie.

## Plan d'exécution

### N1 — Figer les deux états de départ

**Fait le 6 septembre 2026 ; la sortie mesurée est au journal de recette.**

- terminer ou isoler la migration en cours de l'adaptateur TypeScript ;
- obtenir les tests verts de l'Exporter sans utiliser le Playground ;
- relever le commit de `main` du Playground qui contient le dernier corpus
  reconstruit et préserver ses contrats et tokens pendant le ménage ;
- ne pas mélanger ces déplacements avec la réécriture de l'application.

**Sortie :** tout code générique à conserver possède un domicile et des tests
dans l'Exporter. Aucun fichier supprimé du Playground n'est encore son unique
autorité.

### N2 — Fermer les preuves manquantes chez le producteur

**Fait le 6 septembre 2026 ; la sortie mesurée est au journal de recette.**

- comparer `accord-workflows.test.mjs` aux tests de `packages/cli/src/init.mjs` ;
  ajouter chez le CLI uniquement l'assertion manquante sur le workflow généré,
  jamais une comparaison avec le Playground ;
- confirmer que les tests de `adapter-typescript` couvrent les cardinalités de
  R8, puis supprimer le verrou `StressTest` sans déplacer le corpus ;
- vérifier que l'injection d'échecs de tests reste couverte dans le CLI et le
  kit avec des données synthétiques ; ne pas déplacer le parseur TAP ;
- conserver les contrats 11.0 figés du kit pour la compatibilité N-1. Ne pas y
  ajouter les contrats 12.0 du Playground : le moteur courant se teste sur ses
  sorties générées, conformément à T7.0.

**Sortie :** `npm test` et `npm run typecheck` passent dans l'Exporter après
retrait complet du voisin.

### N3 — Réduire le Playground à l'application minimale

**Fait le 6 septembre 2026 ; la sortie mesurée est au journal de recette.**

Faire trois commits séparés pour garder le changement contrôlable :

1. séparer les artefacts exportés des sondes reconstruites, puis supprimer
  uniquement les sondes qui ne sont plus nécessaires ou qui ne peuvent pas
  être reconstruites depuis leur contrat ;
2. supprimer l'outillage, les tests, les skills et la documentation UCM ;
3. remplacer l'application par le squelette minimal, installer le workflow
   générique de `ucm init`, puis régénérer le lockfile.

Le dossier `scripts/` doit être absent à la fin, pas seulement vide. Le dossier
`src/` reste parce qu'il appartient à Vite, mais ne contient que l'application
de galerie et ses composants reconstruits.

**Sortie :** un clone neuf réussit `npm ci`, `npm run build` et le contrôle UCM
généré. Une recherche sur `UCM|ucm-kit|Figma` ne trouve rien dans le code
d'orchestration local ; les composants peuvent contenir les références de
tokens nécessaires à leur rendu. Les contrats, tokens et sondes restent
présents et valides.

### N4 — Réviser les autorités documentaires de l'Exporter

**Fait le 6 septembre 2026 ; la sortie mesurée est au journal de recette.**

Les affirmations actuelles sur le « consommateur de référence » et son corpus
deviennent fausses. Réviser ensemble :

- `CONCEPT.md` : le test froid se déroule sur une branche de recette, à partir
  des contrats suivis ;
- `README.md` : le Playground est un consommateur sans outillage local et
  héberge le corpus exporté ;
- `ROADMAP.md` : conserver l'état des contrats et des sondes reconstruites,
  mais les qualifier explicitement d'artefacts jetables de validation ;
- `AGENTS.md` : cartographier la nouvelle frontière de recette ;
- `PLAN-INDUSTRIALISATION.md` : garder les Phases 7 et 9 comme historique, puis
  enregistrer leur dépassement par le présent plan.

**Sortie :** les documents demandent de trouver les contrats, tokens et sondes
reconstruites dans le Playground, mais aucun script ou contrôle UCM local ne
porte l'autorité du format.

### N5 — Prouver la neutralité de l'intégration

**Fait le 6 septembre 2026 ; la sortie mesurée est au journal de recette.**

Sur un clone neuf de `main` du Playground :

1. vérifier l'absence de `scripts/`, de tests génériques locaux, de `ci-report.md`
  suivi et de dépendances `@ucm-kit/*` dans `package.json` ;
2. vérifier la présence des contrats, de `tokens.json` et des fichiers que
   `ucm init` doit installer ;
3. exécuter `npm ci`, `npm run build` puis la commande `ucm check` exacte du
   workflow généré ;
4. conserver la liste exacte des fichiers et les versions des artefacts avant
   la recette suivante.

Ce contrôle est une étape de recette pilotée depuis l'Exporter ou une check-list
de release. Il ne devient pas un nouveau script permanent dans le Playground.

### N6 — Rejouer un export dans le consommateur neutre

- créer une branche depuis le `main` contenant le corpus valide ;
- exporter depuis Figma les tokens puis au moins un composant vers cette
  branche, sans modifier à la main les JSON ;
- vérifier que l'export ne touche que les artefacts attendus ;
- reconstruire les sondes depuis les contrats seuls, puis comparer leurs vues
  représentatives à Figma et consigner le résultat ;
- laisser la pull request et son workflow produire le rapport designer ;
- vérifier au minimum les critères T7.1 à T7.4 : implémentation absente,
  références de tokens, version illisible et contrat cassé ;
- si la recette inclut TypeScript, installer explicitement
  `@ucm-kit/adapter-typescript` et vérifier sa découverte, sans script local ;
- consigner le commit, les versions de packages, le lien de PR et les résultats
  dans l'Exporter ; fusionner un export valide pour garder le corpus courant,
  mais fermer sans fusionner les scénarios volontairement cassés.

**Sortie :** la recette démontre que les packages relisent des artefacts réels
dans un repo sans colle locale ; `main` du Playground reste neutre quant à son
outillage, tout en avançant avec les contrats et tokens fusionnés.

### N7 — Ajouter le garde-fou de release qui manque réellement

**Fait le 6 septembre 2026 — le garde-fou existe ; la recette N6 qu'il exige,
elle, reste à jouer.**

La Phase 7 couvre déjà le cœur et le CLI dans des dossiers temporaires. La seule
preuve non automatisée restante est GitHub + plugin Figma + PR. Le corpus
permanent sert de donnée réelle, pas d'oracle figé du moteur. Ajouter à la
procédure de release une recette externe N6 lorsque changent :

- le format publié ou sa fenêtre de lecture ;
- `ucm init` ou le workflow généré ;
- le routage GitHub du plugin ;
- la découverte d'un adaptateur.

Ce n'est plus une consigne écrite quelque part : `publish.yml` demande la
réponse au moment de publier, et `scripts/recette-externe.mjs` refuse la
publication quand elle vaut « aucun déclencheur n'a bougé » alors qu'un
déclencheur a bougé depuis la version publiée précédente — en nommant les
fichiers en cause. Il ne prouve pas que la recette a eu lieu : personne ne peut
vérifier depuis une CI qu'un humain a ouvert Figma. Ce qu'il empêche est plus
petit et suffisant : publier sans s'être posé la question.

À la date de son écriture, il répond déjà rouge pour les trois paquets : la
fenêtre de lecture, `ucm init` et la découverte de l'adaptateur ont toutes
bougé depuis leur dernière publication.

## Critères de fin

Le travail est terminé lorsque les huit propositions suivantes sont vraies. **Au
6 septembre 2026, sept le sont ; la septième — la recette N6 — ne l'est pas, et
la huitième ne sera définitivement acquise qu'après elle.**

1. `UCM-Playground/scripts/` n'existe plus ;
2. aucun fichier `*.test.*` spécifique à un composant n'existe ; les contrats `*.contract.json`, `tokens.json` et les composants reconstruits, eux, sont présents et valides ;
3. aucune dépendance UCM ni orchestration UCM écrite à la main n'existe dans
   l'application ; la configuration et le workflow viennent de `ucm init` ;
4. l'application minimale se construit depuis un clone neuf ;
5. l'Exporter passe tous ses tests sans clone voisin ;
6. chaque comportement générique retiré du Playground est soit déjà couvert
   dans un package, soit explicitement abandonné faute de promesse publique ;
7. une recette N6 a mis à jour les contrats ou tokens par PR et produit le
   rapport attendu sans ajouter de script écrit à la main dans la cible ;
8. après la recette, `main` du Playground conserve ses artefacts et ses sondes
  reconstruites, tout en restant strictement neutre quant à l'outillage, aux
  autorités du format et aux implémentations de production.

## Ordre et dépendances

```text
N1 -> N2 -> N3 -> N4 -> N5 -> N6 -> N7
```

N2 précède toute suppression : c'est la preuve qu'aucune autorité ne part avec
le ménage. N3 précède la révision documentaire : les documents décrivent alors
un état réel. N5 précède le nouvel export : sans mesure du consommateur neutre,
la recette ne sait pas distinguer les artefacts modifiés de la colle locale.
