# Plan de mise à jour de la documentation

Objectif : une documentation plus courte, exacte, et lisible par quelqu'un qui
découvre le projet, y compris un profil design UX/UI. Ce plan couvre les deux
dépôts, `UCM-Exporter` et `UCM-Playground`.

Version 2, corrigée après une revue indépendante dont les conclusions ont été
revérifiées dans le code. Ce que la revue a changé est résumé au §7.

---

## 1. Ce que la revue a mesuré

Chiffres relevés le 6 septembre 2026 sur la branche `main` des deux dépôts,
avant l'ajout de ce plan. Toutes les tailles sont en Kio.

### Volume

| Ensemble | Taille |
|---|---|
| Documents à la racine de `UCM-Exporter` | 573 Kio |
| dont plans et journaux de travail, `PISTES-EVOLUTION.md` compris | 479 Kio, soit 84 % |
| `docs/`, `SPEC.md`, READMEs de paquets, skills | 173 Kio |
| **Total** | **746 Kio, environ 115 000 mots** |

Un visiteur qui ouvre la racine du dépôt voit onze fichiers `.md`, douze depuis
que ce plan existe. Les deux plus gros sont des journaux de travail :
`PLAN-INDUSTRIALISATION.md` (310 Kio) et `refonte-ui.md` (103 Kio). Ils pèsent à
eux seuls 55 % du corpus.

### Densité de tiret cadratin

Repère mesuré par [Pangram](https://www.pangram.com/signs-of-ai-writing) sur un
grand corpus : 2 tirets cadratins pour 10 000 mots dans un texte humain, 17 dans
un texte de modèle de langage, soit 0,2 et 1,7 pour mille.

| Document | Pour mille | Rapport au repère humain |
|---|---|---|
| `CLAUDE.md` | 26,3 | ×132 |
| `packages/kit/README.md` | 17,0 | ×85 |
| `packages/plugin/SPEC.md` | 12,6 | ×63 |
| `CONTRIBUTING.md` | 11,7 | ×59 |
| `docs/CHANGELOG-FORMAT.md` | 11,0 | ×55 |
| `docs/FORMAT.md` | 10,8 | ×54 |
| `PISTES-EVOLUTION.md` | 10,0 | ×50 |
| `AGENTS.md` | 9,6 | ×48 |
| `.agents/skills/consommer-contrat/SKILL.md` | 6,0 | ×30 |
| `README.md` | 5,7 | ×29 |
| `ROADMAP.md` | 3,4 | ×17 |
| `CONCEPT.md` | 2,1 | ×11 |

`CLAUDE.md` fait 38 mots et porte un seul tiret. Ce cas montre que la densité en
pour-mille est ininterprétable sur un document court : elle punit la brièveté.
Le §3 en tire la forme du garde-fou.

### Mots en capitales pour l'emphase

**Cette mesure n'est pas reproductible et ne peut donc pas devenir un seuil.**
Deux comptages de bonne foi divergent de 15 à 28 % selon qu'on classe `BOOLEAN`,
`TEXT`, `FIXED`, `PAT`, `REST` ou `JSX` en identifiant technique ou en emphase.

| Document | Comptage 1 | Comptage 2 |
|---|---|---|
| `AGENTS.md` | 60 | 70 |
| `docs/CHANGELOG-FORMAT.md` | 47 | 51 |
| `docs/FORMAT.md` | 57 | 73 |
| `packages/plugin/SPEC.md` | 35 | 42 |

Le classement, lui, est stable. Le tic est réel, sa quantification ne l'est pas.

### Autres marqueurs relevés à la lecture

- **Narration datée** dans des documents de référence. `CONTRIBUTING.md` porte
  « La réserve du 5 septembre 2026 est levée le même jour ». `ROADMAP.md`
  raconte l'histoire d'une règle dans une table censée donner un état.
- **Personnification** : un document « dit », « ment », « poursuit », « apprend »,
  « croit ». Une règle « vit », un défaut est « muet », un compteur « descend ».
- **Construction en deux temps** du type « ce n'est pas X, c'est Y ». Dix
  occurrences sur les onze documents de référence, dont trois sont de la
  désambiguïsation technique légitime. Le tic est réel, sa fréquence est moitié
  moindre que ce que la première version de ce plan annonçait.
- **Justification systématique** : presque chaque règle est suivie du récit de
  l'erreur qui l'a produite. Utile une fois, coûteux comme forme par défaut.

### Trous et erreurs vérifiés dans le code

| Constat | Vérifié où |
|---|---|
| `packages/cli/` n'a aucun `README.md`, alors que son `package.json` déclare `"files": ["src", "README.md"]`. La page npm de `@ucm-kit/cli` est donc vide | `packages/cli/`, `packages/cli/package.json` |
| `packages/cli` et `packages/adapter-typescript` déclarent `"license": "MIT"` sans fichier `LICENSE`. Seul `packages/kit/LICENSE` existe | `packages/*/` |
| Cinq fichiers du kit citent `check-contract.mjs`, supprimé, ou `generate-contract-types.mjs`, jamais présent | `format/names.ts:48`, `lecteurs/diagnostic-tokens.mjs:9`, `lecteurs/trouver-contrats.mjs:4`, `lecteurs/verdict-bilan.mjs:12`, `tests/controleRepository.test.mjs:5` |
| La carte du code d'`AGENTS.md` omet onze entrées réelles | voir la liste de la tâche 1.1 |
| La section « Vérification » d'`AGENTS.md` cite quatre chemins faux | `AGENTS.md:569, 574, 605` |
| `CONTRIBUTING.md:287` cite `scripts/run-tests.js`. Le fichier est `scripts/run-tests.cjs` | `CONTRIBUTING.md`, `scripts/` |
| `PISTES-EVOLUTION.md:282` cite `identifiant-code.mjs`, qui n'existe nulle part | `PISTES-EVOLUTION.md` |
| La table « Architecture » du `README.md` omet `ucm.mjs` et `adaptateur.mjs` | `README.md:284-288` |
| `docs/FORMAT.md` passe de `##` à `####` sans niveau intermédiaire, et ses sections numérotées sont dans l'ordre 1, 2, 3, 4, 5, 6, 9, 7, 8 | `docs/FORMAT.md:53, 59, 712, 888, 1008` |
| `docs/FORMAT.md:55` justifie ce désordre par un risque d'ancres cassées. Le risque n'existe pas : les slugs GitHub viennent du texte du titre, aucun titre n'est dupliqué | `docs/FORMAT.md`, `tests/docLinks.test.ts` |
| Le `.gitignore` du Playground commente `check-contract.mjs` (supprimé), `src/tokens/tokens.json` (le fichier est à la racine) et `.tmp-caracterisation-*/` (tests retirés). `src/generated/` et `ci-report.md` restent valides | `UCM-Playground/.gitignore`, `style-dictionary.config.mjs` |
| Le `.vscode/settings.json` du Playground pointe vers `./node_modules/@ucm-kit/core/schema/…`, alors que le Playground ne déclare `@ucm-kit/core` nulle part. L'éditeur n'y valide aucun contrat | `UCM-Playground/.vscode/settings.json`, `package.json` |
| Trois pins `@ucm-kit/cli@0.1.7` vivent hors du filet de `pinDocumente`, qui ne lit que le `README.md` racine | `packages/adapter-typescript/README.md:13`, `UCM-Playground/.github/workflows/ucm.yml:47` et `:49` |
| Aucun document n'explique le projet à un designer. Aucun glossaire n'existe | corpus entier |
| `packages/plugin/galerie/` rend chaque écran du plugin atteignable hors de Figma. C'est le meilleur actif pour un profil design, et il n'est documenté que dans `CONTRIBUTING.md:212` | `packages/plugin/galerie/`, `CONTRIBUTING.md` |
| Le Playground n'a ni `AGENTS.md` ni `CONTRIBUTING.md`. La règle « les sondes ne se corrigent pas pour obtenir du vert » n'y a aucun domicile | `UCM-Playground/` |

### Ce qui contraint l'exécution

- `npm test` est vert. Treize cas de test vivent dans `tests/`, dont huit
  portent sur la documentation.
- **`tests/versionSuitLeContenu.test.mjs`** compare tout le dossier d'un paquet
  publiable, `tests/` et `fixtures/` exclus, fichiers non suivis compris, au
  commit qui a posé son numéro de version. Toucher un README de paquet ou un
  fichier de `packages/kit/src/` force à monter le numéro dans le même commit.
- **`tests/monorepoCoherent.test.mjs`** exige qu'un paquet publié épingle
  exactement la version du kit que le dépôt porte. Monter le kit fait donc
  monter le pin du CLI et celui de l'adaptateur, donc leur contenu publiable,
  donc leur propre numéro.
- **`tests/pinDocumente.test.mjs`** exige que le `README.md` racine montre la
  version du CLI que le dépôt porte. Monter le CLI change la commande copiable.
- **`tests/docLinks.test.ts`** refuse un lien ou une ancre morte, et exige au
  moins 20 renvois d'`AGENTS.md` vers les deux spécifications, dont au moins un
  vers chacune. État actuel : 25 vers `docs/FORMAT.md`, **3 seulement vers
  `packages/plugin/SPEC.md`**. La marge est mince. Il exclut aussi tout dossier
  nommé `fixtures`, ce qui rend invisible le lien de
  `packages/kit/fixtures/contrats/11.0/README.md:11`.
- **`tests/registrePortableDocuments.test.ts`** interdit « React », « .tsx »,
  « TSX » et « Playground » dans `CONCEPT.md`, `docs/FORMAT.md` et
  `docs/CHANGELOG-FORMAT.md`. Sa liste d'exemptions est vide et refuse une
  entrée qui ne couvrirait plus rien : aucune inscription temporaire n'est
  possible.
- Cinq renvois aux plans vivent hors du markdown, donc hors de tout test :
  `.github/workflows/publish.yml:54`, `scripts/recette-externe.mjs:9` et `:175`
  (le second est imprimé au mainteneur), `packages/plugin/src/ui/styles.css:2`.
- Aucun test ne lit `.agents/skills/*/SKILL.md`. Les lois d'adressage du skill
  `consommer-contrat` sont de la prose non protégée.
- `CONTRIBIUTING.md` porte déjà, pour les messages destinés au designer, une
  règle qui interdit le tiret cadratin, la métaphore et la question rhétorique.
  Elle est bonne, elle est appliquée dans le produit, et elle n'a jamais été
  étendue aux documents. Ce plan l'étend.

---

## 2. Les cinq objectifs

1. **Alléger.** Réduire le volume hors plans sans perdre une règle.
2. **Être exact.** Aucune affirmation qui ne se vérifie pas dans le code.
3. **Ouvrir le projet aux débutants et aux profils design.**
4. **Retirer les tics de rédaction d'agent.**
5. **Faire des READMEs de vraies portes d'entrée.**

---

## 3. Les règles de rédaction retenues

Elles s'appuient sur la mesure des marqueurs d'écriture générée
([Pangram](https://www.pangram.com/signs-of-ai-writing), reprise en français par
[PagesHub](https://www.pageshub.fr/le-tiret-cadratin-lempreinte-revelatrice-de-chatgpt-et-les-strategies-devitement/))
et sur le cadre [Diátaxis](https://diataxis.fr/) pour le découpage.

### Ponctuation et typographie

- **Le tiret cadratin ne sert pas d'incise.** Le remplacer par un point, un
  point-virgule, une virgule, deux points ou une parenthèse. Il reste admis
  dans un titre et dans une table de correspondance.
- **Pas d'emphase par capitales.** Le gras suffit, et avec parcimonie.
- **Pas de flèches ni de symboles décoratifs** dans la prose. Ils restent admis
  dans un tableau de correspondance ou un schéma.

### Tournures interdites

- « ce n'est pas X, c'est Y », « non pas X mais Y », « X, et c'est délibéré ».
- La triade rhétorique : trois éléments listés pour la cadence.
- La personnification d'un document, d'une règle ou d'un fichier. Écrire « le
  module `names.ts` porte la règle » plutôt que « la règle vit dans `names.ts` ».
- L'aphorisme et la formule frappante. Écrire la règle.

### Histoire et justification

- **Un document de référence décrit l'état actuel.** Il ne raconte pas ce qui
  s'est passé, ne date pas une décision, ne cite pas de numéro de tâche.
- **L'histoire appartient à Git et aux plans.**
- **Une justification est admise quand elle change une décision du lecteur.**
  Une ou deux phrases, jamais un paragraphe de récit.

### Structure

- Une page ne mélange pas les quatre genres de Diátaxis.
- Phrases courtes. Voix active. Une idée par phrase.
- Un exemple concret vaut mieux qu'une définition abstraite.

---

## 4. La todolist

### Lot 0 — Poser la règle

- [x] **0.1** Ajouter à `CONTRIBUTING.md` une section « Rédiger un document »
      portant les règles du §3. Elle est distincte de la section existante
      « Messages destinés au designer », qui reste l'autorité sur les textes du
      produit, et elle y renvoie.

Le test de style est écrit au lot 6, après la passe de réécriture, avec les
seuils mesurés à ce moment-là. L'écrire maintenant poserait un rouge sur onze
documents et ferait calibrer la règle pour faire passer ce rouge.

### Lot 1 — Renforcer les filets avant de bouger quoi que ce soit

- [x] **1.1** Dans `tests/docLinks.test.ts`, remplacer l'exclusion de tout
      dossier nommé `fixtures` par l'exclusion du seul `tests/fixtures/`. Le
      README de `packages/kit/fixtures/contrats/11.0/` porte des empreintes
      vivantes et un lien vers un plan que le lot 3 va déplacer.
- [x] **1.2** Étendre `tests/pinDocumente.test.mjs` à tout `.md` du dépôt, et
      lui faire couvrir aussi `@ucm-kit/adapter-typescript@`. Trois pins vivent
      aujourd'hui hors du filet.
- [x] **1.3** Vérifier que `npm test` est vert après 1.1 et 1.2, en corrigeant
      les pins que 1.2 révèle. Ce lot ne touche aucune prose.

### Lot 2 — Corriger ce qui est faux

- [x] **2.1** Corriger la carte du code d'`AGENTS.md`. Entrées à ajouter,
      vérifiées contre `git ls-files` : `packages/cli/src/check.mjs`,
      `packages/cli/src/adaptateur.mjs`, `packages/cli/tests/`,
      `packages/plugin/src/contract/localisation.ts`,
      `packages/kit/src/format/typography.ts`,
      `packages/kit/scripts/generer-refus.mjs`,
      `packages/adapter-typescript/src/index.mjs`, `types-variants.mjs` et
      `index.d.mts`, `docs/CHANGELOG-FORMAT.md`, `.agents/skills/`,
      `scripts/` racine, `.github/workflows/`, et les six fichiers de `tests/`.
      Confronter chaque ligne à l'arborescence réelle, dossier par dossier.
- [x] **2.2** Corriger les quatre chemins faux de la section « Vérification »
      d'`AGENTS.md` : `tests/schema.test.ts` est `packages/kit/tests/…`,
      `tests/exportComponent.test.ts` est `packages/plugin/tests/…`, et le
      découvreur de tests est `scripts/run-tests.cjs`, qui couvre aussi `.mjs`.
- [x] **2.3** Corriger `CONTRIBUTING.md:287` (`run-tests.js` → `run-tests.cjs`)
      et `PISTES-EVOLUTION.md:282` (`identifiant-code.mjs`, à remplacer par le
      module réel ou à retirer).
- [x] **2.4** Corriger la table « Architecture » du `README.md` : ajouter
      `ucm.mjs` et `adaptateur.mjs`.
- [x] **2.5** Réparer les niveaux de titre de `docs/FORMAT.md` : introduire le
      niveau `###` manquant, remettre les sections numérotées dans l'ordre 1 à 9,
      retirer le paragraphe qui justifiait le désordre. Aucune ancre ne bouge,
      les slugs venant du texte des titres. `tests/docLinks.test.ts` le confirme.
- [x] **2.6** Corriger les commentaires de `UCM-Playground/.gitignore`. Reprendre
      mot pour mot le texte que `packages/cli/src/init.mjs` écrit pour
      `ci-report.md`, sans en inventer un second. Retirer les entrées sans objet
      (`.tmp-caracterisation-*/`), corriger le chemin de `tokens.json`, garder
      `src/generated/`.
- [x] **2.7** Trancher le `.vscode/settings.json` du Playground : soit déclarer
      `@ucm-kit/core` en `devDependency` pour que l'éditeur valide vraiment, soit
      retirer le fichier et documenter pourquoi. Ce choix appartient au
      Playground, pas au produit.
- [x] **2.8** Recompter les contrôles annoncés par `README.md` et `AGENTS.md`.
      `controlerRepository` agrège aussi un verdict de tests transmis par
      `UCM_ECHECS_DE_TESTS` et les avertissements d'export. Écrire le nombre
      mesuré, quel qu'il soit, avant que le lot 4 ne réécrive le README.
- [x] **2.9** Passer les autres affirmations chiffrées du `README.md`, de
      `CONCEPT.md` et de `ROADMAP.md` au contrôle du code : ce que `ucm init`
      écrit (cinq fichiers), les commandes (`init`, `check`, `icons`, `--help`),
      les options de `check` (`--base`, `--report`), les versions publiées.

### Lot 3 — Ranger la racine

- [x] **3.1** Créer `docs/plans/` et y déplacer `PLAN-INDUSTRIALISATION.md`,
      `PLAN-NEUTRALISATION-PLAYGROUND.md`, `PLAN-CONFORMITE-DEV.md`,
      `refonte-ui.md` et le présent plan.
- [x] **3.2** Déplacer `PISTES-EVOLUTION.md` dans `docs/notes/`. Décision prise,
      elle porte des options non engagées et relève du travail en cours.
- [x] **3.3** Mettre à jour tous les renvois, markdown et non-markdown :
      `packages/kit/fixtures/contrats/11.0/README.md:11`,
      `.github/workflows/publish.yml:54`, `scripts/recette-externe.mjs:9` et
      `:175`, `packages/plugin/src/ui/styles.css:2`, `CONTRIBUTING.md:321-322`,
      `README.md:246` et `:329`, `packages/plugin/SPEC.md:303`, `AGENTS.md:38`
      et `:638`, `ROADMAP.md:37`. Les citations en texte nu ne sont couvertes par
      aucun test : les relever à la main, par `grep` sur chaque nom de fichier.
- [x] **3.4** Ajouter `docs/README.md`, un sommaire d'une page donnant l'ordre
      de lecture par profil : designer, développeur consommateur, contributeur
      du moteur, agent.
- [x] **3.5** Après déplacement, la racine porte exactement six fichiers `.md` :
      `README.md`, `CONCEPT.md`, `AGENTS.md`, `CONTRIBUTING.md`, `ROADMAP.md`,
      `CLAUDE.md`.

### Lot 4 — Réécrire les portes d'entrée hors paquets

- [x] **4.1** Réécrire `README.md` de `UCM-Exporter`. Ordre imposé :
      une phrase qui dit ce que fait le projet ;
      un schéma de la boucle Figma vers pull request ;
      « À qui ça sert », trois profils et ce que chacun y gagne ;
      « Essayer en cinq minutes », commandes copiables ;
      un exemple de contrat raccourci à trente lignes ;
      les contrôles en tableau, au nombre mesuré par 2.8 ;
      l'état du projet en trois phrases ;
      la table des documents, profil de lecteur en première colonne ;
      un chemin de lecture par profil.
      Le pin du CLI reste montré, et prend la version décidée par le lot 6.
- [x] **4.2** Réécrire `UCM-Playground/README.md`. Il porte déjà « sondes
      jetables » et le fait que la vérification est faite en CI par le paquet
      publié. Ce qui manque : ce qu'est un contrat, ce que contient
      `components/`, ce que le workflow `ucm.yml` contrôle, comment lire un
      rapport de CI, et la règle « on ne corrige pas une sonde pour obtenir du
      vert ».
- [x] **4.3** Décider si le Playground reçoit un `AGENTS.md` court. La règle des
      sondes jetables n'a aujourd'hui aucun domicile exécutoire dans le dépôt où
      un agent la violerait. Un fichier de vingt lignes suffirait.

### Lot 5 — Passe de style sur les documents de référence

Chaque tâche applique les règles du §3 sans changer une règle du produit. Les
diagnostics et les textes destinés au designer ne sont pas touchés.

- [x] **5.1** `CONCEPT.md`. Ajouter un exemple concret en tête, retirer les deux
      tirets cadratins et les formulations en deux temps.
- [x] **5.2** `AGENTS.md`, avant la coupe : établir l'inventaire de ses
      invariants, un par ligne, et le geler dans un test qui refuse qu'une
      clause disparaisse. La cible n'est pas une taille en octets, c'est
      l'intégralité des règles pour un volume moindre.
- [x] **5.3** `AGENTS.md`, la coupe. Réécrire chaque invariant sous la forme :
      la règle, sa borne, le fichier autorité, le lien vers la spécification.
      Retirer les récits d'erreur et les identifiants de tâche. Surveiller le
      compteur de `docLinks` : 3 renvois seulement vont vers
      `packages/plugin/SPEC.md`, et le total doit rester au-dessus de 20.
- [x] **5.4** `CONTRIBUTING.md`. Retirer le paragraphe daté sur « la réserve du
      5 septembre 2026 » (ligne 351) et les identifiants `U4.7` (89), `U4.8`
      (128), `U1.0 à U1.3` (183). Conserver intactes la section « Messages
      destinés au designer » et la table des libellés Figma.
- [x] **5.5** `ROADMAP.md`. Ramener la table « État actuel » à un état par
      ligne, avec un lien vers le document qui détaille. Déplacer la narration
      vers les plans. Dater le document une seule fois, en tête.
- [x] **5.6** `docs/FORMAT.md`. Passe de style, sans toucher aux règles.
      Vérifier après coup que `registrePortableDocuments.test.ts` reste vert :
      sa liste d'exemptions est vide et n'accepte aucune inscription temporaire.
- [x] **5.7** `docs/CHANGELOG-FORMAT.md`. Vingt-quatre entrées, de la 4.2 à la
      12.0. Condenser les entrées antérieures à la 11.0 en un tableau d'une
      ligne par version, garder le texte détaillé pour 11.0 et 12.0, les deux
      versions que les lecteurs acceptent. Même contrainte de portabilité.
- [x] **5.8** `packages/plugin/SPEC.md`. Passe de style. Le paquet est
      `private`, aucun effet sur les versions.
- [x] **5.9** `PISTES-EVOLUTION.md`, oublié par la première version de ce plan
      alors qu'il est plus dense qu'`AGENTS.md`. Passe de style après son
      déplacement.
- [x] **5.10** `packages/kit/fixtures/contrats/11.0/README.md`. Retirer la
      justification narrative, garder la provenance, les empreintes et la règle
      de cycle de vie. Sous `fixtures/`, sans effet sur les versions.
- [x] **5.11** Les deux skills de `.agents/skills/`. Passe de style. Aucun test
      ne les lit : relire deux fois les lois d'adressage de `consommer-contrat`
      avant de toucher une phrase.
- [x] **5.12** `CLAUDE.md`, cinq lignes, le document le plus dense du dépôt.

### Lot 6 — Documentation des paquets et publication

Ce lot est indivisible. Chaque tâche change le contenu publiable d'un paquet, et
`versionSuitLeContenu` exige que le numéro monte dans le même commit.

- [x] **6.1** Écrire `packages/cli/README.md`, aujourd'hui absent. Contenu : les
      quatre commandes, les deux options de `check` (`--base`, `--report`), ce
      que `ucm init` écrit et pourquoi chacun des cinq fichiers, les trois codes
      de sortie, un exemple de rapport. En anglais, comme le README du kit,
      puisque c'est une page npm.
- [x] **6.2** Alléger `packages/kit/README.md`, le plus dense du corpus après
      `CLAUDE.md`. Garder l'anglais et l'exemple de validation. Remplacer la
      section « A note on language » par une ligne.
- [x] **6.3** Étoffer `packages/adapter-typescript/README.md` : ce que
      l'adaptateur mesure (props, booléens lus, cardinalité de composition), ce
      qu'il ne mesure pas, comment `ucm check` le découvre. Corriger son pin.
- [x] **6.4** Retirer des commentaires de `packages/kit/src/` les renvois à
      `check-contract.mjs` et `generate-contract-types.mjs`, et nommer le module
      qui porte réellement la responsabilité citée. Quatre fichiers, plus
      `packages/kit/tests/controleRepository.test.mjs` qui est hors périmètre de
      version.
- [x] **6.5** Ajouter un fichier `LICENSE` à `packages/cli` et
      `packages/adapter-typescript`, et l'inscrire dans leurs `files`. Les deux
      déclarent MIT sans porter le texte.
- [x] **6.6** Monter les trois numéros dans le même commit que 6.1 à 6.5 :
      `@ucm-kit/core` 0.1.11 vers 0.1.12, `@ucm-kit/cli` 0.1.7 vers 0.1.8,
      `@ucm-kit/adapter-typescript` 0.1.0 vers 0.1.1. Monter les pins du kit
      dans les deux paquets dépendants, ce que `monorepoCoherent` exige.
      Mettre à jour les pins montrés par `README.md`,
      `packages/adapter-typescript/README.md` et le workflow du Playground.
- [ ] **6.7** Publier les trois paquets par `publish.yml`, le kit en premier.
      **Demander confirmation avant de déclencher.** Tant que la publication
      n'a pas eu lieu, la commande copiable du README rend 404.
- [ ] **6.8** Après publication, rejouer la recette externe si l'un des quatre
      déclencheurs de `scripts/recette-externe.mjs` a été touché. Vérifier :
      `init.mjs` et son workflow ne sont pas modifiés par ce plan, donc aucune
      recette ne devrait être due.

### Lot 7 — Ouvrir le projet aux profils non développeurs

- [x] **7.1** Écrire `docs/POUR-LES-DESIGNERS.md`. Guide pratique au sens de
      Diátaxis, écrit pour quelqu'un qui ouvre Figma et pas un terminal :
      ce que le plugin attend d'un composant Figma ;
      comment lancer un export et ce qu'on voit, avec les captures de
      `npm run galerie:captures` ;
      ce que la pull request contient et comment la relire ;
      comment lire un avertissement et savoir s'il faut agir ;
      ce qui bloque une fusion et ce qui avertit seulement ;
      quand c'est au développeur d'agir.
- [x] **7.2** Y intégrer une section « Vocabulaire » plutôt qu'un
      `docs/GLOSSAIRE.md` autonome. Chaque terme reçoit une phrase d'usage et
      une ancre vers `docs/FORMAT.md`, qui reste l'autorité. Un glossaire
      séparé définirait les objets dont `FORMAT.md` fait autorité et créerait la
      seconde autorité que « une règle, un domicile » interdit.
      Termes : contrat, token, variante, état, slot, structure, vue,
      composition, dépendance, parité, couverture portable, diagnostic,
      adaptateur, sonde.
- [x] **7.3** Documenter `packages/plugin/galerie/` dans ce guide. C'est le
      meilleur outil pour un profil design du dépôt, et il n'est aujourd'hui
      nommé que dans `CONTRIBUTING.md`.
- [x] **7.4** Relire le guide en se posant une question par paragraphe : un
      lecteur qui ne connaît ni le projet ni le vocabulaire comprend-il cette
      phrase sans en ouvrir une autre ?

### Lot 8 — Le garde-fou de style

Écrit maintenant, avec les valeurs mesurées après les lots 5 à 7.

- [x] **8.1** Écrire `tests/styleDocumentaire.test.ts`. Trois contrôles, tous
      reproductibles :
      **un compte absolu de tirets cadratins par document, avec cliquet.** Une
      table dans le test donne le plafond de chaque document, initialisé à la
      valeur mesurée. Un seuil ne peut jamais augmenter. Un document neuf entre
      à zéro. Les titres sont exclus du décompte.
      **une liste noire de mots français mis en capitales** (`EST`, `UN`,
      `AUCUN`, `CHAQUE`, `JAMAIS`, `TOUS`, `MÊME`, `CE`, `SON`, `TROIS`, `DEUX`,
      `PAS`, `ICI`, `SEUL`, `TOUT`). Zéro faux positif sur un sigle par
      construction. Le compteur de majuscules est abandonné, faute d'être
      reproductible.
      **aucun identifiant de tâche** dans un document de référence, par un motif
      restreint aux formes réellement employées.
      *Écrit à deux contrôles, pas trois.* Le troisième a été abandonné à
      l'écriture : la seule occurrence restante est `N6` dans `ROADMAP.md`, où
      elle nomme la recette externe que l'entrée de `publish.yml` appelle du
      même nom, avec le lien vers le plan qui la décrit. Un motif qui la
      refuserait ferait perdre le renvoi sans rien gagner. La passe de style a
      retiré tous les autres identifiants, et le test qui protège ce résultat
      n'existe pas.
- [x] **8.2** Les plans de `docs/plans/` sont exemptés, et `.agents/skills/` ne
      l'est pas : un protocole exécutable de 22 Kio relève de la référence. Une
      exemption qui ne couvre plus aucun fichier fait échouer le test, sur le
      modèle de `registrePortableDocuments.test.ts`.
- [x] **8.3** Vérifier que le test échoue quand on réintroduit un tiret dans un
      document au plafond. Un garde-fou qu'on n'a pas vu rouge n'est pas cru.

### Lot 9 — Vérification

- [x] **9.1** `npm test`, `npm run typecheck`, `npm run build` verts sur
      `UCM-Exporter`.
- [x] **9.2** `npm run build` vert sur `UCM-Playground`.
- [x] **9.3** Remesurer les densités du §1 et publier le tableau avant et après
      dans le commit final.
- [x] **9.4** Vérifier qu'aucune règle n'a disparu : le test de 5.2 le fait pour
      `AGENTS.md`, une relecture le fait pour les skills.
- [x] **9.5** Relever à la main les citations de fichiers déplacés hors du
      markdown, une seconde fois, après tous les commits.

---

## 5. Résultat mesuré

Exécuté le 6 septembre 2026. Cinquante et une tâches sur cinquante-trois. Restent
6.7 et 6.8, qui attendent une publication npm.

### Tiret cadratin

| Document | Avant | Après |
|---|---|---|
| `README.md` | 12 | 0 |
| `CONCEPT.md` | 2 | 0 |
| `AGENTS.md` | 57 | 0 |
| `CONTRIBUTING.md` | 34 | 7, tous en cellule de tableau |
| `ROADMAP.md` | 7 | 0 |
| `docs/FORMAT.md` | 139 | 3, tous en titre ou en tableau |
| `docs/CHANGELOG-FORMAT.md` | 47 | 0 |
| `packages/plugin/SPEC.md` | 59 | 4, tous en titre |
| `packages/kit/README.md` | 14 | 0 |
| `docs/notes/PISTES-EVOLUTION.md` | 40 | 0 |
| `.agents/skills/consommer-contrat/SKILL.md` | 20 | 0 |
| Autres | 8 | 0 |
| **Total** | **439** | **14** |

Densité sur ces documents : 9,8 pour mille avant, 0,3 après. Le repère d'un
texte humain est de 0,2. Les quatorze restants vivent tous en titre ou en
cellule de tableau, où le tiret n'est pas une incise, et
`tests/styleDocumentaire.test.ts` les y autorise nommément.

### Emphase par capitales

Zéro occurrence sur les vingt documents que le test couvre, contre environ deux
cents avant la passe.

### Identifiants de tâche

Deux occurrences de `N6` dans `ROADMAP.md`, où le sigle nomme la recette
externe et renvoie au plan qui la décrit. Aucune ailleurs. Les plans de
`docs/plans/` en gardent, et c'est leur rôle. Ce résultat n'est protégé par
aucun test : voir la tâche 8.1.

### Racine du dépôt

Douze fichiers `.md` avant, six après : `README.md`, `CONCEPT.md`, `AGENTS.md`,
`CONTRIBUTING.md`, `ROADMAP.md`, `CLAUDE.md`.

### Ce qui a été ajouté

- `docs/README.md`, le sommaire par profil de lecteur ;
- `docs/POUR-LES-DESIGNERS.md`, le guide du designer et son vocabulaire ;
- `packages/cli/README.md`, absent alors que le paquet le publiait ;
- `UCM-Playground/AGENTS.md`, qui donne un domicile à la règle des sondes ;
- `LICENSE` dans `packages/cli` et `packages/adapter-typescript` ;
- trois tests : `styleDocumentaire`, `inventaireInvariants`, et l'élargissement
  de `pinDocumente` à tout le dépôt.

### Vérification

`npm test` (846 cas), `npm run typecheck` et `npm run build` verts sur
`UCM-Exporter`. `npm run build` vert sur `UCM-Playground`.

## 6. Ce que ce plan ne fait pas

- Il ne touche à aucun comportement du produit, à aucun message destiné au
  designer, à aucun test existant sauf 1.1 et 1.2, qui élargissent deux filets,
  et 5.2 et 8.1, qui en ajoutent deux.
- Il ne réécrit pas les plans de travail. Ils racontent, et ils quittent
  seulement la racine.
- Il ne traduit pas les READMEs npm en français.
- Il n'introduit aucun outil de génération de documentation.

## 7. Ordre d'exécution

Le lot 0 pose la règle en prose. Le lot 1 renforce les filets avant qu'on bouge
un fichier. Le lot 2 corrige les erreurs, parce que corriger un texte qu'on va
réécrire coûte deux fois. Le lot 3 déplace, donc casse des liens, donc arrive
après le lot 1. Les lots 4, 5 et 7 sont indépendants entre eux. Le lot 6 est
indivisible et se termine par une publication npm. Le lot 8 mesure ce que les
lots précédents ont produit. Le lot 9 clôt.

Une tâche, un commit, sauf le lot 6 qui n'en fait qu'un.

## 8. Mesures faites pendant l'exécution

Ce que les tâches de vérification ont trouvé, consigné avant correction.

**2.3, `PISTES-EVOLUTION.md:282`.** La revue signalait un renvoi mort vers
`identifiant-code.mjs`. Le renvoi n'est pas mort : la phrase dit précisément que
ce fichier est parti, et elle est exacte. Ce qui reste à corriger est
l'identifiant de tâche qui l'accompagne, ce que fait la passe de style 5.9.

**2.5, `docs/FORMAT.md`.** Le réordonnancement des sections 7, 8 et 9 et la
promotion de dix-huit titres n'ont cassé aucune ancre, comme la revue l'avait
prévu. `tests/docLinks.test.ts` reste vert.

**2.8, le nombre de contrôles.** Six est exact pour ce qui peut se déclencher
sur un contrat que les lecteurs acceptent. Deux précisions manquent au `README` :

- le rapport relaie aussi deux choses qu'il ne mesure pas, les avertissements
  que l'export a écrits dans `meta.diagnostics`, et le verdict des tests du
  repository quand un orchestrateur le transmet par `UCM_ECHECS_DE_TESTS` ;
- un septième contrôle existe dans le code et **ne peut plus se déclencher**.
  `controle-repository.mjs` compare les références citées à l'index `tokensUsed`
  du contrat, et publie « L'index des tokens du contrat est incohérent ». Or
  aucun contrat de la fenêtre de lecture ne porte cet index : ni les quatre
  fixtures 11.0, ni les quatre contrats 12.0 du Playground. Le code, son
  diagnostic et son message de terminal sont donc inatteignables.

Ce dernier point est du code, pas de la documentation, et ce plan n'y touche
pas. Il est à traiter à part : retirer le contrôle, son diagnostic et son
message, ou écrire pourquoi on le garde.

## 9. Ce que la revue indépendante a corrigé

- Le blocage de `versionSuitLeContenu`, invisible dans la version 1, qui met la
  CI au rouge sur quatre tâches et impose le lot 6 indivisible.
- Le garde-fou de style, qui passait d'un taux en pour-mille ininterprétable sur
  un document court à un compte absolu avec cliquet, et d'un compteur de
  majuscules non reproductible à une liste noire.
- L'ordre : le test de style passe du premier lot au huitième.
- La cible « 28 Kio » pour `AGENTS.md`, remplacée par un inventaire d'invariants
  gelé avant la coupe.
- Le glossaire autonome, fondu dans le guide designer pour ne pas créer une
  seconde autorité sur les objets dont `docs/FORMAT.md` fait autorité.
- Six omissions de la carte du code, quatre chemins morts dans `AGENTS.md`, deux
  chemins morts ailleurs, trois pins hors filet, cinq renvois non-markdown aux
  plans, deux paquets sans `LICENSE`, un `.vscode/settings.json` inopérant.
- Des erreurs de comptage : douze fichiers à la racine et non onze, vingt-quatre
  entrées de changelog et non vingt, `U4.7` et `U4.8` dans `CONTRIBUTING.md` et
  non `T9.6`, six renvois au plan de neutralisation et non un.
- Deux affirmations fausses : le réordonnancement de `docs/FORMAT.md` ne casse
  aucune ancre, et aucun test ne protège les lois du skill `consommer-contrat`.
- La contradiction entre l'ancienne tâche 2.2, qui laissait ouverte la
  destination de `PISTES-EVOLUTION.md`, et l'ancienne 2.4, qui posait une cible
  chiffrée présupposant la réponse.
