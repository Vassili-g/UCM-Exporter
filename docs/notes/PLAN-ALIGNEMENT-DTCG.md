# Plan d'alignement DTCG

> Statut : engagé. Ce document pilote l'exécution jusqu'à la recette du plugin
> publié. Il se lit avec [l'état des lieux](./ALIGNEMENT-DTCG.md).

## Instruction donnée à l'agent

Ce document sert de consigne de travail à Claude Opus 5 ou à un agent de même
capacité. Exécuter tous les lots dans l'ordre. Après chaque interruption ou
réduction de contexte, reprendre par la procédure décrite plus bas. Ne rendre la
main que pour une porte humaine, un conflit avec une modification étrangère à
la tâche, ou une décision de produit absente de ce document.

L'objectif est un résultat vérifié de bout en bout dans `UCM-Exporter` et
`UCM-Playground`. La fin d'un lot n'est pas une fin de mission. Une case cochée
sans preuve enregistrée ne vaut rien.

## Résultat attendu

- Le plugin exporte les couleurs et dimensions dans la forme structurée de
  DTCG 2025.10.
- Chaque fichier porte à sa racine la version du format de tokens qui décrit
  cette forme.
- Le kit distingue un fichier d'origine, la version courante, une version
  future et une marque invalide avant de lire les tokens.
- Le dépôt consommateur compile les nouvelles valeurs avec une version exacte
  de Style Dictionary 5. Un test d'intégration du producteur et le build du
  Playground valident cette lecture.
- Les anciennes clés `$value` ne changent pas. Leurs valeurs changent de forme,
  et la racine reçoit la marque de version.
- Les poids typographiques connus deviennent des nombres dans chaque mode. Un
  poids libre reste une chaîne.
- Les trois paquets npm compatibles sortent ensemble avant le plugin Figma.
- Le plugin de développement et le plugin publié passent les mêmes exports
  sRGB et Display P3, la comparaison CSS et la recette visuelle.
- Les preuves permettent de savoir ce qui a été exécuté sans relire une sortie
  de terminal ni se fier au contexte de l'agent.

## Périmètre fermé

Ce plan traite :

- `$extensions` au niveau racine du document ;
- `color`, `dimension` et `fontWeight` ;
- le maintien de `fontFamily` sous le type `string` ;
- la marque de version du format et son contrôle par le kit ;
- Style Dictionary dans `UCM-Playground` ;
- la publication coordonnée du kit, de la CLI et de l'adaptateur TypeScript ;
- les validations Figma, CSS, CI et visuelles.

Ce plan ne traite pas :

- les types DTCG encore absents du format, dont `duration`, `cubicBezier`,
  `strokeStyle`, `border`, `gradient`, `shadow` et `transition` ;
- le passage de `fontFamily` du type `string` au type DTCG `fontFamily` ;
- les changements de noms ou de groupes de tokens ;
- les types composés sans source Figma complète ;
- l'ajout de nouveaux usages de tokens dans les contrats de composants.

Un besoin extérieur à cette liste va dans une note distincte. Il ne rejoint pas
la migration en cours.

## Décisions qui ne sont plus à prendre

### Forme des valeurs

| Type | Forme publiée |
|---|---|
| `color` | `{ "colorSpace": "srgb" | "display-p3", "components": [r, g, b], "alpha": a }` |
| `dimension` | `{ "value": n, "unit": "px" }` |
| `fontFamily` | chaîne |
| `fontWeight` connu | nombre |
| `fontWeight` libre | chaîne |

Les composantes de couleur gardent la précision fournie par Figma. Aucune
quantification supplémentaire n'est introduite. `alpha` est toujours écrit,
y compris quand il vaut `1`.

### Marque de version

Chaque fichier nouvellement exporté porte exactement :

```json
{
  "$extensions": {
    "com.ucm.formatVersion": 1
  }
}
```

La marque est un entier positif. Sa forme appartient au format partagé et son
interprétation appartient aux lecteurs du kit.

Le concept s'appelle « version du format de tokens ». Le plugin, la pull
request, le rapport du kit et les documents emploient ce terme. Le mot
« grammaire » n'apparaît dans aucun texte destiné au designer ou au
développeur consommateur.

### États lus par le kit

| Valeur observée | État | Effet |
|---|---|---|
| marque absente | `origine` | lecture de l'ancien fichier autorisée |
| entier `1` | `courante` | lecture autorisée |
| entier supérieur à `1` | `future` | contrôle bloqué avant l'index des tokens |
| autre valeur ou `$extensions` mal formé | `invalide` | contrôle bloqué avant l'index des tokens |

Une propriété homonyme imbriquée dans un groupe ne compte pas. Seule la racine
du document est examinée. Le contrôle s'applique même lorsqu'aucun contrat de
composant n'est trouvé : un fichier de tokens d'une version inconnue ne reçoit
pas un bilan vert.

### En-tête de la pull request des tokens

L'en-tête de la pull request qui dépose `tokens.json` annonce
« Version du format de tokens : `1` ». La valeur est lue dans le fichier
déposé, jamais dans la constante du plugin, comme le schéma d'un contrat.
L'invariant d'`AGENTS.md` selon lequel `tokens.json` ne reçoit aucune ligne
d'identité est réécrit en L1.

### Type d'un poids et graphe d'alias

La décision de type couvre tous les modes d'une variable :

1. chaque valeur littérale est classée avec `poidsDeGraisse()` ;
2. chaque alias est suivi jusqu'à une variable dont le type est décidé ;
3. une variable dont le chemin sémantique contient `fontweight` ou
   `font-weight` devient `number` si tous ses littéraux sont reconnus et tous
   ses alias aboutissent à `number` ;
4. une variable composée seulement d'alias devient `number` si toutes les
   cibles aboutissent à `number`, même si son propre nom n'est pas sémantique ;
5. toute combinaison indécise reste `string` ;
6. une cible absente suit le diagnostic existant et force `string` ;
7. une boucle, bien que refusée par Figma, est détectée et force `string` sans
   récursion infinie.

Une fois le type décidé, chaque littéral reconnu est publié sous forme de
nombre. Un alias reste une référence DTCG.

La chaîne `"700"` n'est pas un nom reconnu par `poidsDeGraisse()`. Elle reste
donc de type `string`. Cette migration n'élargit pas la table partagée des
graisses et ne modifie pas l'export des contrats.

### Racine du document

La racine du document est l'objet JSON de premier niveau. Elle porte
`$extensions` et les groupes de tokens. Le plan n'emploie pas `$root` pour la
désigner : DTCG réserve ce nom au token racine d'un groupe.

### Évolutions différées

Le passage de `fontFamily` au type DTCG homonyme reste différé. Il exige une
source de type plus sûre que le seul nom de la variable et une décision sur
`fontFamily/css-quote` dans le Playground. L'[état des lieux](./ALIGNEMENT-DTCG.md#4-pourquoi-différer-le-typage-de-la-famille)
porte les mesures qui motivent cette borne.

Les variables `EASING` et `TIMING` restent différées tant que Figma ne fournit
pas toutes les données requises par les types composés visés.

### Version de Style Dictionary

Le dépôt consommateur utilise une version exacte, sans `^` ni `~`. Au début du
lot consommateur, l'agent relève les versions stables `5.x` publiées et choisit
la plus récente qui satisfait les tests de ce plan, avec `5.4.2` comme minimum.

Si la candidate échoue pour une régression confirmée de Style Dictionary,
l'agent essaie les versions stables précédentes par ordre décroissant. Il note
chaque version refusée et sa preuve. Il ne descend jamais sous `5.4.2` et ne
choisit jamais une préversion.

### Ordre de publication

1. `@ucm-kit/core` est publié et vérifié sur npm, en L4 ;
2. `@ucm-kit/cli` est publié et vérifié, en L4 ;
3. `@ucm-kit/adapter-typescript` est publié et vérifié, en L4 ;
4. le plugin Figma est publié, en H2 ;
5. le dépôt consommateur réexporte avec le plugin publié.

Les trois paquets forment une même série, mais `publish.yml` garde une exécution
par paquet. Les deux premières exécutions peuvent finir rouges tant que les pins
de toute la série ne sont pas servis. Chaque paquet se vérifie avec
`npm view <paquet>@<version> version` avant de lancer le suivant.

La série part dans la foulée du commit qui monte ses versions, comme
`AGENTS.md` le demande. Sur un fichier d'origine, le kit publié rend le même
verdict qu'avant. Il refuse seulement une version supérieure à `1` ou une
marque invalide, et le plugin Community ne produit encore ni l'une ni l'autre.
Un contenu publiable corrigé après L4 reçoit une nouvelle série, publiée dans
le lot qui le corrige.

### Commits et branche

Le commit documentaire qui contient ce plan est un préalable à L0. L'agent ne
crée pas le journal à partir d'un plan encore présent dans le diff.

Chaque lot se ferme par un commit sur `main`, poussé dès que ses contrôles sont
verts. La CI de l'Exporter tourne donc sur chaque lot. Les commits du
Playground suivent la même règle.

Entre L1 et H2, `main` documente la version `1` du format, et le plugin servi
par la Community produit encore la forme d'origine. L'entrée de
`CHANGELOG-FORMAT.md` nomme la version du plugin qui produit la version `1` ;
L10 la complète après la publication Community.

## Journal de preuves

Le lot 0 crée `docs/notes/PREUVES-ALIGNEMENT-DTCG.md`. Ce fichier est le point
de reprise de l'agent. Il contient uniquement des faits courts :

```markdown
# Preuves de l'alignement DTCG

## État

- Lot courant : L0
- Exporter, branche et HEAD :
- Playground, branche et HEAD :
- Style Dictionary retenu :
- Versions npm prévues :
- Dernière porte humaine franchie : aucune

## Lots

### L0 — Référence

- Commit :
- Commandes :
- Résultats :
- Artefacts et empreintes :
- Écart ou réserve : aucun
```

Chaque lot ajoute les mêmes cinq lignes. Les commandes sont citées, avec leur
code de sortie et un résumé d'une ligne. Les journaux complets ne sont pas
copiés. Les artefacts temporaires reçoivent une empreinte SHA-256 et un chemin.

Une réserve non résolue interdit de commencer le lot suivant. Le journal est
mis à jour dans le même commit que la fermeture du lot.

## Procédure de reprise

Au début du travail et après toute interruption :

1. lire `AGENTS.md`, `CONTRIBUTING.md`, le présent plan et le journal de
   preuves ;
2. charger la skill exigée avant de modifier un document ou un commentaire ;
3. relever `git status --short`, la branche et `git rev-parse HEAD` dans les
   deux dépôts ;
4. comparer ces valeurs au journal ;
5. lire le dernier commit et le diff non commité sans modifier les fichiers ;
6. relancer le dernier contrôle vert du lot courant ;
7. reprendre à la première case sans preuve.

Si un fichier visé contient une modification qui ne vient pas de la migration,
l'agent conserve cette modification. Il demande une intervention seulement si
le chevauchement ne peut pas être résolu sans choisir à la place de son auteur.

## Règles d'exécution

### Un lot à la fois

Pour chaque lot :

1. écrire ou figer le test qui décrit l'état de départ ;
2. faire échouer le nouveau test pour la raison attendue ;
3. appliquer le changement minimal ;
4. passer les tests ciblés ;
5. passer les contrôles complets du dépôt touché ;
6. relire le diff et les fichiers autorisés ;
7. prouver au moins une mutation négative ;
8. mettre à jour le journal ;
9. créer un commit atomique ;
10. pousser ce commit sur `main` ;
11. continuer sans demander confirmation si aucune porte humaine n'est atteinte ;
12. utiliser les règles de rédaction du repository.

Un test de mutation négative modifie temporairement une entrée ou une condition
pour prouver que le contrôle attendu échoue. La mutation ne doit jamais rester
dans le commit.

### Raccourcis interdits

- Ne pas remplacer un attendu de test avant d'avoir expliqué l'écart.
- Ne pas régénérer un snapshot pour faire disparaître une régression.
- Ne pas désactiver un test, une règle de style ou un diagnostic.
- Ne pas modifier à la main un fichier de tokens exporté pour réussir la CI.
- Ne pas ajouter une compatibilité permissive avec une version future du format.
- Ne pas publier un paquet ou le plugin avant la porte prévue.
- Ne pas mélanger un nettoyage sans rapport avec le lot.
- Ne pas conclure à partir d'un objet en mémoire : valider le JSON sérialisé et
  le CSS effectivement produit.

### Contrôles communs

Dans `UCM-Exporter`, chaque lot qui touche au code passe au minimum :

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Chaque lot documentaire passe aussi `scripts/controle-style.mjs` sur les
documents modifiés et les tests documentaires ciblés.

Dans `UCM-Playground`, chaque lot passe au minimum :

```bash
npm run build
npm ls style-dictionary
git diff --check
```

Une installation propre est réservée aux lots L3 et L8 afin de contrôler le
lockfile sans rendre chaque boucle dépendante du réseau.

## Matrice de validation obligatoire

### Couleurs

| Cas | Vérification |
|---|---|
| sRGB, alpha `1` | espace, trois composantes, alpha présent |
| sRGB, alpha `0` et `0.5` | transparence conservée |
| Display P3 | espace `display-p3`, composantes non rabattues en sRGB |
| précision élevée | aucune troncature ajoutée par UCM |
| alias direct et chaîne d'alias | référence conservée |
| plusieurs modes | même forme dans chaque mode |
| couleur `LEGACY` | sRGB et un avertissement par export |

### Dimensions

| Cas | Vérification |
|---|---|
| zéro | `{ "value": 0, "unit": "px" }` |
| entier positif | valeur et unité conservées |
| fraction et valeur négative | aucune conversion implicite |
| alias direct et chaîne d'alias | référence conservée |
| plusieurs modes | même forme dans chaque mode |

### Poids typographiques

| Cas | Type attendu |
|---|---|
| `Regular`, `Bold` | `number` |
| chaîne numérique `"700"` | `string` |
| nom libre | `string` |
| modes tous reconnus | `number` |
| au moins un mode libre | `string` |
| littéraux reconnus et alias numériques | `number` |
| alias vers chaîne ou cible absente | `string` |
| chaîne d'alias numérique | `number` |
| boucle défensive | `string`, sans boucle d'exécution |

### Version du format

| Cas | État attendu |
|---|---|
| absence de marque | `origine` |
| `1` | `courante` |
| `2` | `future`, contrôle rouge |
| `0`, négatif, décimal, chaîne, objet | `invalide`, contrôle rouge |
| `$extensions` non objet | `invalide`, contrôle rouge |
| marque imbriquée | ignorée |
| aucun contrat et marque future | contrôle rouge |

### Comparaison du CSS

- Les noms de propriétés, les chemins d'alias et le nombre de déclarations sont
  strictement identiques.
- Les dimensions calculées sont strictement identiques après normalisation de
  l'écriture CSS en pixels.
- Une couleur sRGB se compare par canal, alpha compris, avec une tolérance de
  `0.5 / 255 + 1e-6`. Cette borne couvre l'arrondi de l'ancien hexadécimal sans
  masquer un écart supérieur à un demi-pas de quantification.
- Le build habituel du Playground emploie `color/css`. Il peut donc projeter une
  couleur Display P3 en hexadécimal sRGB.
- Une cible temporaire emploie le transform standard `color/p3`. Elle doit
  produire `color(display-p3 …)` depuis le même document, sans transform UCM.
- Les tests du producteur comparent les composantes Display P3 aux valeurs du
  mock avant toute projection CSS. H1 couvre l'export Figma réel.
- Une comparaison de snapshot seule ne ferme aucun lot.

## Lots d'implémentation

### L0 — Référence et état reproductible

But : établir l'état de départ avant tout changement de comportement.

Fichiers autorisés :

- `docs/notes/PREUVES-ALIGNEMENT-DTCG.md` ;
- aucun fichier de production.

Actions :

- [x] Relever la branche, le commit courant, le statut et la version de Node des deux
      dépôts.
- [x] Relever les versions déclarées des trois paquets UCM et la version du
      plugin.
- [x] Lancer `npm test`, `npm run typecheck` et `npm run build` dans l'Exporter.
- [x] Lancer `npm run build` dans le Playground.
- [x] Relever les fixtures de tokens existants. Aucun `tokens.json` n'est figé
      aujourd'hui : les tests construisent leurs variables en ligne, et L2 crée
      le fixture d'origine.
- [x] Enregistrer les résultats et créer le journal.

Critère de sortie : les deux dépôts ont un état de référence vert, ou toute
défaillance préexistante est expliquée et corrigée dans un lot séparé avant L1.

### L1 — Autorités du format et compatibilité

But : écrire la règle avant le code qui l'applique.

Fichiers autorisés :

- `AGENTS.md` ;
- `docs/FORMAT.md` ;
- `docs/COMPATIBILITE.md` ;
- `docs/CHANGELOG-FORMAT.md` ;
- `packages/plugin/SPEC.md` ;
- tests documentaires ;
- journal de preuves.

Actions :

- [x] Documenter les valeurs structurées, la marque de version et les quatre
      états de lecture.
- [x] Remplacer la section « Pourquoi `tokens.json` n'a pas de version » de
      `COMPATIBILITE.md`.
- [x] Documenter l'ordre de publication et le maintien des anciennes clés.
- [x] Réécrire l'invariant d'`AGENTS.md` sur l'en-tête de pull request :
      `tokens.json` y annonce la version du format lue dans le fichier.
- [x] Citer dans `AGENTS.md` le fixture de tokens d'origine et ses bornes, à
      côté du corpus de contrats du kit.
- [x] Classer séparément le changement du format des valeurs et l'ajout de la
      marque.
- [x] Décrire le choix de l'espace colorimétrique à partir de
      `documentColorProfile`.
- [x] Décrire le type des poids sur tous les modes et alias.
- [x] Ajouter les invariants correspondants dans `AGENTS.md`.
- [x] Passer le contrôle de style et les tests de liens, d'inventaire et de
      version documentaire.
- [x] Prouver qu'une suppression temporaire d'un invariant attendu fait échouer
      son test d'inventaire.

Critère de sortie : aucune décision d'implémentation des lots L3 à L6 ne reste
ouverte.

### L2 — Harnais de caractérisation et comparaison sémantique

But : distinguer les changements attendus des régressions.

Fichiers autorisés :

- mock et tests voisins de `packages/plugin/src/tokens/exportTokens.ts` ;
- `packages/kit/fixtures/tokens/` et les tests des lecteurs du kit ;
- utilitaires de test seulement ;
- journal de preuves.

Le fixture d'origine suit les bornes du corpus de contrats du kit, décrites
dans `AGENTS.md`. Les tests du kit le lisent pour l'état `origine`. Aucun test
permanent ne le compare à une sortie du moteur : un tel test serait
l'instantané qu'`AGENTS.md` interdit. Il disparaît avec le code qui lit la forme
d'origine.

La comparaison entre la sortie du moteur et ce fixture est une preuve de
migration. Son test vit de L5 à L9, et L9 le retire après avoir consigné son
dernier résultat. Le comparateur reste, avec ses propres tests sur des
documents fabriqués.

Actions :

- [x] Figer dans `packages/kit/fixtures/tokens/origine/` un export d'origine
      produit par le moteur actuel depuis le mock. Il couvre sRGB, dimensions,
      familles, graisses, modes et alias. Son empreinte SHA-256 va dans un
      README voisin.
- [x] Ajouter au mock du producteur les cas Display P3 et `LEGACY`. Leur sortie
      se calcule au moment du test et ne se commite pas.
- [x] Dériver de l'export d'origine les documents structurés sRGB et Display P3
      que L3 compile. Ce sont des artefacts temporaires : leur chemin et leur
      empreinte vont au journal.
- [x] Ajouter un comparateur, utilitaire de test, qui compare deux documents
      token par token : chemin, `$type`, alias, mode, valeur numérique et espace
      colorimétrique.
- [x] Définir les seules différences autorisées : marque racine, structure des
      couleurs et dimensions, type et valeur des graisses reconnues.
- [x] Vérifier que deux exports du même mock sont identiques octet pour octet.
- [x] Vérifier le JSON sérialisé, puis le document reparsé.
- [x] Conserver les cas de clés `$value`, `$type`, `__proto__`, `constructor` et
      `prototype`.
- [x] Faire échouer le comparateur avec une clé renommée, un alias aplati, un
      mode perdu et une composante modifiée.

Critère de sortie : le harnais échoue sur toute modification qui n'appartient
pas à la liste autorisée.

### L3 — Consommateur Style Dictionary

But : rendre le dépôt consommateur capable de compiler les valeurs structurées
avant que le producteur ne les publie.

Fichiers autorisés dans `UCM-Playground` :

- `package.json` et le lockfile ;
- configuration Style Dictionary ;
- aucun workflow, script de contrôle UCM ou fichier supplémentaire.

Actions :

- [x] Mesurer le CSS d'origine : propriétés, références, valeurs résolues et
      diagnostics.
- [x] Relever les versions stables `5.x`, appliquer l'algorithme de sélection et
      installer la version exacte retenue.
- [x] Examiner les changements majeurs de configuration entre la version
      d'origine et la version retenue.
- [x] Adapter la configuration sans créer de transform de compatibilité si les
      transforms fournis suffisent.
- [x] Construire avec le document structuré sRGB de L2.
- [x] Comparer le CSS obtenu au CSS d'origine à la tolérance colorimétrique
      décidée dans le test.
- [x] Conserver `color/css` dans la cible habituelle du Playground.
- [x] Construire le document Display P3 avec une configuration temporaire qui
      remplace `color/css` par le transform standard `color/p3`.
- [x] Vérifier que la cible temporaire produit `color(display-p3 …)` et la
      supprimer après la mesure.
- [x] Réinstaller depuis un état propre et passer `npm run build`.
- [x] Enregistrer la version exacte, le lockfile et les versions refusées.

Critère de sortie : le Playground compile le fichier d'origine et le document
structuré, sans perte de propriété ni référence.

### L4 — Lecteur de version dans le kit

But : empêcher une ancienne chaîne de lecture d'accepter un fichier qu'elle ne
comprend pas.

Fichiers autorisés :

- `packages/kit/src/format/` ;
- `packages/kit/src/lecteurs/` ;
- exports publics et déclarations TypeScript correspondants ;
- schéma et tests du kit ;
- manifestes des trois paquets et documents qui épinglent leurs versions ;
- version du CLI épinglée dans `.github/workflows/ucm.yml` du Playground ;
- journal de preuves.

Actions :

- [x] Ajouter l'autorité unique du numéro de la version courante du format.
- [x] Décrire la forme racine dans les types publics sans autoriser
      `$extensions` sous un groupe.
- [x] Ajouter le lecteur pur qui retourne `origine`, `courante`, `future` ou
      `invalide`.
- [x] Exposer le lecteur par la porte publique et sa déclaration TypeScript.
- [x] Brancher le contrôle avant `tokensDtcg()`, avant l'index des références et
      avant la sortie anticipée « aucun contrat ».
- [x] Produire un refus distinct pour une version future et une marque invalide.
- [x] Garder la lecture des fichiers d'origine.
- [x] Garder inchangée la table des types typographiques : le lecteur accepte
      déjà `number` et `string` pour `fontWeight`.
- [x] Choisir trois versions npm encore libres, monter les trois manifestes et
      leurs dépendances internes exactes dans le même commit que le premier
      changement publiable du kit.
- [x] Mettre les pins documentés en accord dans ce même commit.
- [x] Laisser `CONTRACT_VERSION` inchangé : le contrat de composant ne change
      pas ; la nouvelle marque versionne `tokens.json`.
- [x] Ajouter toute la matrice de la version du format et les tests d'API
      publique.
- [x] Muter temporairement l'ordre du contrôle pour prouver qu'un fichier futur
      serait lu ; vérifier que le test le refuse.
- [x] Produire les archives des trois paquets dans un dossier temporaire,
      examiner leur contenu, les installer dans un consommateur temporaire,
      kit en premier, et appeler leurs portes publiques.
- [x] Pousser le commit, puis publier la série dans l'ordre prévu, chaque
      paquet vérifié par `npm view` avant le suivant.
- [x] Monter la version du CLI épinglée dans le workflow du Playground ; sa CI
      doit rester verte sur son fichier d'origine.

Critère de sortie : aucune lecture métier des tokens ne précède le verdict de
version, npm sert les trois paquets, et la CI du Playground passe avec le
nouveau CLI.

### L5 — Producteur de couleurs, dimensions et marque

But : publier la nouvelle forme sans changer l'identité des tokens.

Fichiers autorisés :

- `packages/plugin/src/tokens/exportTokens.ts` ;
- `packages/plugin/src/github.ts`, pour l'en-tête de la pull request des
  tokens ;
- types et contexte communs strictement nécessaires ;
- message de résultat et galerie de l'interface ;
- tests du plugin ;
- journal de preuves.

Actions :

- [x] Ajouter `documentColorProfile` au contexte d'export obligatoire.
- [x] Faire porter `$extensions` par l'objet racine du document sans créer de
      token ni de groupe supplémentaire.
- [x] Écrire `$extensions` une fois, avant les groupes, dans un ordre stable.
- [x] Produire les couleurs sRGB et Display P3 selon le profil du document.
- [x] Traiter `LEGACY` comme sRGB et émettre un seul avertissement par export,
      avec le profil observé, son effet et le geste qui permet de choisir un
      profil explicite.
- [x] Produire toutes les dimensions sous la forme `{ value, unit: "px" }`.
- [x] Garder les alias sous la forme `{chemin.du.token}`.
- [x] Vérifier tous les modes, les valeurs limites et les chaînes d'alias de la
      matrice.
- [x] Comparer l'export au fixture d'origine avec le comparateur de L2.
- [x] Ajouter au résultat visible : « DTCG 2025.10, version 1 du format de
      tokens ».
- [x] Annoncer « Version du format de tokens : `1` » dans l'en-tête de la pull
      request des tokens, lue dans le fichier déposé.
- [x] Relire l'état de résultat dans la galerie de l'interface.
- [x] Muter l'espace, l'alpha, l'unité et la marque un par un ; chaque mutation
      doit être refusée.

Critère de sortie : seules les différences autorisées par L2 existent dans le
JSON sérialisé.

### L6 — Typographie et résolution des alias

But : décider les poids une fois pour tout le graphe avant de sérialiser les
valeurs.

Fichiers autorisés :

- exporteur de tokens et auxiliaire dédié si nécessaire ;
- autorité partagée de typographie uniquement si sa porte publique doit changer ;
- tests voisins ;
- journal de preuves.

Actions :

- [ ] Réutiliser `poidsDeGraisse()` ; ne recopier aucune table de poids.
- [ ] Construire l'index des variables avant de décider leurs types.
- [ ] Résoudre le graphe avec mémoïsation et état de visite pour borner les
      chaînes et détecter une boucle.
- [ ] Décider chaque variable sur l'ensemble de ses modes.
- [ ] Sérialiser ensuite les littéraux avec le type déjà décidé.
- [ ] Couvrir toute la matrice des poids, dont les modes mixtes et alias croisés.
- [ ] Vérifier qu'un nom libre reste strictement identique.
- [ ] Vérifier qu'un alias reste une référence et ne devient jamais un nombre
      résolu.
- [ ] Muter un seul mode en chaîne libre ; le type racine doit redevenir
      `string`.

Critère de sortie : aucune décision de type ne dépend de l'ordre des variables,
des collections ou des modes.

### L7 — Conformité DTCG et cohérence documentaire

But : faire contrôler les nouvelles garanties par une autorité extérieure au
producteur.

Fichiers autorisés :

- tests du kit ou du plugin ;
- dépendances de développement du plugin seulement ;
- schéma DTCG figé et sa notice de provenance ;
- documents d'autorité et guides déjà ouverts en L1 ;
- galerie de l'interface ;
- journal de preuves.

Actions :

- [ ] Figer la révision exacte du
      [schéma DTCG 2025.10](https://www.designtokens.org/schemas/2025.10/format.json)
      utilisée par les tests, puis enregistrer sa source et son empreinte.
- [ ] Valider un export complet et sérialisé contre ce schéma.
- [ ] Ajouter les contrôles UCM qui dépassent le schéma générique : marque à la
      racine, alpha présent, unité `px`, chemins réservés et ordre stable.
- [ ] Déclarer la version exacte de Style Dictionary retenue en L3 dans les
      `devDependencies` du plugin. Le test juge la sortie de `exportTokens.ts`,
      et le plugin dépend du kit, jamais l'inverse. Le kit ne lit aucune valeur
      de token : Style Dictionary n'y a pas d'usage.
- [ ] Ajouter dans l'Exporter un test d'intégration qui passe à cette version
      les exports sérialisés du mock, calculés au moment du test.
- [ ] Faire refuser par ce test `[object Object]`, une propriété absente, une
      référence non résolue et une valeur CSS vide.
- [ ] Prouver les quatre refus par mutation, sans ouvrir le clone voisin du
      Playground. Le test compile avec le groupe `css` standard ; la preuve que
      la configuration du Playground compile reste son build, en L3 et en L8.
- [ ] Prouver que le schéma refuse une composante ou une unité invalide.
- [ ] Mettre `FORMAT`, `SPEC`, `COMPATIBILITE`, le changelog, le README du plugin,
      la recette et la roadmap en accord avec le code terminé.
- [ ] Vérifier les liens, l'inventaire des invariants, le style documentaire et
      l'accord entre numéro de version et contenu.
- [ ] Produire les captures de la galerie pour le résultat et l'avertissement
      `LEGACY`. Le plugin ne lit aucun fichier de tokens : le refus d'une
      version future appartient au rapport du kit, que les tests de L4
      vérifient.

Critère de sortie : une validation indépendante couvre la forme DTCG, et les
documents décrivent exactement la sortie observée.

### L8 — Audit automatisé avant Figma

But : fermer les erreurs de paquet, de sérialisation et d'intégration avant de
mobiliser une personne.

Actions :

- [ ] Réinstaller les deux dépôts depuis leurs lockfiles.
- [ ] Passer deux fois les suites complètes et les builds ; la seconde exécution
      ne doit modifier aucun fichier suivi.
- [ ] Exporter deux fois chaque cas du mock et comparer les octets.
- [ ] Construire le Playground avec le fichier d'origine, puis avec l'export
      sRGB structuré du moteur.
- [ ] Construire l'export Display P3 avec la cible temporaire `color/p3`.
- [ ] Vérifier le CSS, les alias et l'absence des quatre défauts contrôlés en L7.
- [ ] Exécuter les tests de mutation de L2 à L7 puis remettre l'arbre propre.
- [ ] Vérifier que le contenu publiable des trois paquets n'a pas changé depuis
      la série publiée, ou qu'une nouvelle série publiée l'a suivi.
- [ ] Vérifier les versions exactes croisées entre paquets.
- [ ] Relire `git diff --check`, `git status --short` et la liste de fichiers de
      chaque commit.
- [ ] Préparer le paquet de validation H1 avec commandes, résultats attendus et
      chemins où déposer les deux exports Figma.

Critère de sortie : tout contrôle automatisable est vert et les deux arbres sont
propres avant la première manipulation Figma.

## Portes humaines

Quatre interventions restent nécessaires. Elles sont regroupées autour de ce
que l'agent ne peut pas conclure : exécuter Figma, publier dans Community et
juger l'image rendue.

### H1 — Plugin de développement

L'agent fournit une seule checklist. La personne :

1. charge le build de développement dans Figma ;
2. exporte le fichier Figma réel en sRGB, puis sa copie en Display P3 ;
3. dépose les deux JSON aux chemins indiqués ;
4. fournit les captures du pied de résultat et de l'avertissement `LEGACY` ;
5. confirme que les tokens sRGB et P3 correspondent visuellement au document.

L'agent reprend ensuite seul : validation du schéma, comparaison sémantique,
build CSS et archivage des empreintes. Un écart renvoie au lot responsable,
puis H1 est rejouée seulement sur le cas touché.

### H2 — Autorisation et publication Community

Après présentation du manifeste de publication, la personne donne un accord
explicite. Elle publie ensuite la version du plugin dans Figma Community et
transmet son état de revue.

L'accord porte sur les commits, le changelog et les versions npm déjà servies.
Aucune version n'est recalculée après cet accord.

### H3 — Plugin publié

Quand la version Community est disponible, la personne relance les deux exports
sRGB et Display P3 depuis le plugin publié et dépose les artefacts aux chemins
préparés. L'agent effectue toutes les comparaisons et les contrôles de CI.

### H4 — Recette visuelle et fusion

L'agent prépare le composant reconstruit, le diff final et le rapport de recette.
La personne compare visuellement le composant reconstruit au composant Figma,
vérifie les états prévus et autorise la fusion de la pull request de recette du
Playground. L'agent fusionne seulement si l'autorisation et l'accès
correspondant ont été donnés.

## Lots de livraison

### L9 — Candidat de publication

But : transformer H1 en candidat immuable.

Actions :

- [ ] Valider les exports réels de H1 avec la même matrice que les exports du
      mock.
- [ ] Ajouter un cas réel minimal et anonymisé au mock si H1 révèle une
      forme absente des mocks.
- [ ] Rejouer L8 après toute correction.
- [ ] Vérifier que chaque contenu publiable a reçu sa version dans le commit qui
      l'a modifié, et que npm sert cette version ; corriger tout écart avant de
      poursuivre.
- [ ] Retirer le test qui compare la sortie du moteur au fixture d'origine,
      après avoir consigné son dernier résultat dans le journal.
- [ ] Mettre à jour les pins documentés et le changelog.
- [ ] Écrire dans le journal le manifeste : versions servies, commits,
      empreintes, workflow et résultat H1.

Critère de sortie : le manifeste présenté en H2 désigne des commits testés et
poussés qui ne changeront plus avant la publication Community.

### L10 — Vérification après publication

But : vérifier les artefacts distribués plutôt que les seuls workspaces locaux.

Actions :

- [ ] Vérifier les trois versions et fichiers servis par le registre npm.
- [ ] Installer les versions publiées dans un consommateur temporaire vierge.
- [ ] Passer le contrôle du kit, la CLI et l'adaptateur depuis ces paquets.
- [ ] Mettre le Playground sur les versions publiées exactes.
- [ ] Passer son installation propre, son build et sa CI.
- [ ] Attendre H3, puis comparer les exports du plugin publié à ceux de H1.
- [ ] Vérifier que le CSS issu du plugin publié conserve les mêmes propriétés,
      références et valeurs attendues.
- [ ] Exécuter la recette externe de `docs/RECETTE.md` ; l'agent prend toutes les
      étapes qui ne demandent ni Figma ni jugement visuel.
- [ ] Préparer H4 avec le diff, les captures et les écarts nuls ou expliqués.

Critère de sortie : les paquets npm et le plugin Community réellement servis
produisent les résultats validés avant publication.

## Retour arrière

Avant H2, le plugin Community n'a pas changé :

- un défaut du plugin se corrige dans le lot en cause ;
- un défaut d'un paquet se corrige par une nouvelle série des trois paquets,
  publiée dans l'ordre prévu ;
- L8, H1 et L9 se rejouent sur le cas touché.

La série fautive reste servie. Elle ne refuse qu'une version du format que le
plugin Community ne produit pas encore.

Après Community :

- conserver la version publiée et documenter l'écart ;
- restaurer temporairement l'ancien exporteur dans une nouvelle version du
  plugin si le défaut rend les tokens inutilisables ;
- publier des versions corrigées des paquets si leur lecture est en cause ;
- rejouer H1 à H4 avant la version Community suivante.

Une publication npm n'est jamais supprimée. Une version Community déjà servie
ne redevient pas un brouillon par hypothèse de travail.

## Conditions de fin

Le plan est terminé seulement si :

- [ ] tous les lots portent un commit et des preuves ;
- [ ] les deux dépôts sont propres et leurs suites complètes sont vertes ;
- [ ] le schéma DTCG et le comparateur sémantique acceptent les exports réels ;
- [ ] chaque test de mutation prévu a échoué pour la bonne raison ;
- [ ] le registre npm sert les trois versions attendues ;
- [ ] le plugin Community publié reproduit les exports du build de
      développement ;
- [ ] le Playground compile ces exports sans valeur objet, référence perdue ni
      propriété manquante ;
- [ ] la recette externe et la comparaison visuelle sont validées ;
- [ ] le journal ne contient aucune réserve ouverte ;
- [ ] roadmap, changelog et documentation portent l'état livré.

À ce point, l'agent livre un résumé court : commits, versions, preuves, portes
humaines franchies et éventuelles limites hors périmètre.
