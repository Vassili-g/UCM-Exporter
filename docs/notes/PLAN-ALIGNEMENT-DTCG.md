# Plan d'implémentation de l'alignement DTCG

**Statut : aucune tâche commencée.** Ce plan exécute la décision de
[ALIGNEMENT-DTCG.md](./ALIGNEMENT-DTCG.md), qui porte les mesures et leur
justification. Chaque tâche nomme ce qui la ferme. Une tâche marquée
**[humain]** demande Figma, et personne d'autre que le mainteneur ne peut la
faire ; l'agent publie les paquets et le plugin lui-même.

Deux frontières fixent l'ordre. La première sépare ce qui casse un
consommateur : sous Style Dictionary 4, la forme objet des valeurs écrit
`[object Object]` sans faire échouer le build. La seconde sépare ce qui dépend
du profil colorimétrique du fichier Figma, que `tokens.json` ne porte pas.

Une seule étape est irréversible pour les utilisateurs, la publication sur la
Figma Community. La section [Retrait](#retrait) dit comment revenir de chaque
côté de cette étape.

---

## Phase 0 — Cadre

- [ ] **0.1. Ajouter une classe de changement à `docs/COMPATIBILITE.md`.**
      Aucune des neuf ne couvre un changement de la forme des valeurs de
      `tokens.json` : la classe 5 porte sur un nom de token, la classe 6 sur un
      adaptateur sans changement de format.
      - Classe 10, « changement de grammaire de `tokens.json` » : aucun effet
        sur `CONTRACT_VERSION` ; le designer réexporte ; le mainteneur du
        repository monte Style Dictionary à 5 ou plus, puis les paquets UCM.
      - Retitrer la section sans nombre, « Les classes de changement ». Mettre
        à jour dans le même commit le lien de `ALIGNEMENT-DTCG.md` vers l'ancre
        `#les-neuf-classes-de-changement`, et sa puce du paragraphe 6 qui dit
        que ces classes ne couvrent pas ce cas.
      - L'historique des grammaires va dans `CHANGELOG-FORMAT.md`, une entrée
        par valeur de marque. `AGENTS.md` y envoie déjà toute question de
        compatibilité.
      *Ferme :* `npm test` vert, liens et style compris.

- [ ] **0.2. Fixer la marque de grammaire.**
      Le lecteur de 2A part sur npm avant que le producteur écrive la marque :
      sa valeur se décide donc en premier.
      - `$extensions["com.ucm.grammaire"]` au niveau du document, valeur
        entière. Un fichier sans marque vaut la grammaire d'origine ; la
        tranche des valeurs porte `1`.
      - Toute évolution de la forme publiée après une publication Community
        incrémente cette valeur, correctif compris.
      - La constante vit dans `packages/kit/src/format/`, exportée par
        `format/index.ts` : le plugin l'écrit, le lecteur la compare. Une
        recopie diverge sans produire d'erreur.
      - Lecture : marque absente vaut `origine` ; entier inférieur ou égal à la
        constante vaut une grammaire connue ; toute autre valeur vaut
        `inconnue`.
      *Ferme :* la règle écrite dans `FORMAT.md` partie 2 et sous la classe 10.

- [ ] **0.3. Écrire la règle du dialecte dans `FORMAT.md` partie 2.**
      « La commande exporte toutes les variables locales. Une variable dont le
      type Figma n'a pas d'équivalent dans le module Format sort en
      `$type: "string"` ou `"boolean"`, et le fichier n'est pas conforme sur ces
      feuilles. »
      Garder les deux lignes de la table des écarts qui portent la couleur et
      la dimension : elles décrivent la forme publiée jusqu'à 2B.8.
      *Ferme :* la règle et la table présentes dans la partie 2 ;
      `node scripts/controle-style.mjs docs/FORMAT.md` sans faute.

- [ ] **0.4. Décider le traitement de `EASING` et `TIMING`.**
      `VariableResolvedDataType` les contient
      (`@figma/plugin-typings/plugin-api.d.ts:11710`). `dtcgType` les range en
      `string` et `formatValue` rend leur valeur brute, alors que le module
      définit `duration` et `cubicBezier`.
      Aucune feuille ne s'exclut : la commande publie toutes les variables
      locales. Décision proposée : convertir quand la courbe est disponible
      (`easingFunctionCubicBezier`, optionnel dans les typings) et quand
      l'unité d'un `TIMING` est établie, laisser la feuille en `string` sinon,
      sous la règle de 0.3. L'implémentation appartient à 2B.
      *Ferme :* la décision écrite dans `FORMAT.md` partie 2, avec ce que
      recouvre chaque cas.

- [ ] **0.5. [humain] Lire le profil colorimétrique du fichier Figma du
      Playground.**
      Moyen : le profil affiché dans le menu du fichier Figma, ou
      `figma.root.documentColorProfile` dans la console d'un build de dev du
      plugin.
      - `SRGB` ou `LEGACY` : la phase 2 convertit les couleurs ; 720 feuilles
        conformes sur 721 à son issue.
      - `DISPLAY_P3` : les couleurs passent en phase 3 ; 618 feuilles conformes
        à l'issue de la phase 2.
      Le faire pendant la recette externe, qui ouvre ce fichier.
      *Ferme :* la valeur et le nom du fichier Figma écrits dans
      `ALIGNEMENT-DTCG.md`, section 1.

- [ ] **0.6. Décider l'ordre entre la recette externe et la phase 2.**
      La recette joue le plugin publié sur la Community. La phase 2 exige une
      nouvelle publication, Style Dictionary 5 chez le consommateur et un
      réexport. Recommandation : la recette d'abord. Elle est la prochaine
      validation de `ROADMAP.md`, elle ouvre le fichier Figma qui porte le fait
      de 0.5, et elle ne valide pas une projection changée juste avant elle.
      *Ferme :* l'ordre écrit dans `ROADMAP.md` ; `RECETTE.md` mis à jour si la
      phase 2 passe la première.

---

## Phase 1 — Indépendant de toute décision DTCG

- [ ] **1.1. Monter un `figma` simulé réutilisable.**
      `exportTokens.test.ts` ne teste jamais `handleExportTokens`, faute de
      global `figma`. Le seul mock existant est local à
      `exportComponent.test.ts`, non exporté, avec des variables codées en dur
      et une racine sans `documentColorProfile`. Les tests de 2A.1, 2B.1, 2B.2
      et 2B.7 en dépendent.
      Sortir un mock partagé : collections, variables, modes, liaisons et
      `documentColorProfile` paramétrables.
      *Ferme :* `exportComponent.test.ts` passe sur le mock partagé, et un test
      exerce `handleExportTokens` de bout en bout.

- [ ] **1.2. Passer le Playground à Style Dictionary 5.5.3.**
      Prérequis de la phase 2B.
      - `UCM-Playground/package.json` : `"style-dictionary": "^5.5.3"`.
      - Régénérer et commiter `package-lock.json`, sans quoi le `npm ci` du
        workflow `ucm.yml` échoue. Style Dictionary 5 demande Node 22, que ce
        workflow emploie déjà.
      - `src/generated/` est ignoré par Git, et la CI du Playground ne lance pas
        Style Dictionary. La preuve se fait donc à la main : build au commit
        courant, copie de `tokens.css`, changement, build, `diff`.
      *Ferme :* `npm ls style-dictionary` rend 5.5.3, et le `diff` est vide.

- [ ] **1.3. Figer une fixture de tokens en grammaire d'origine.**
      `packages/kit/fixtures/tokens/origine/tokens.json`, copie du
      `tokens.json` actuel du Playground, gelée par sha256 dans un `README.md`
      voisin, sur le modèle de `fixturesContrats.test.ts`. « Origine » est le
      terme de `COMPATIBILITE.md` pour un fichier sans marque.
      Le test lit ses contrats dans `packages/kit/tests/contrats-fabriques.mjs`,
      avec des `textStyles` qui citent la famille et les graisses de la
      fixture. Les contrats figés en 11.0 disparaîtront quand la fenêtre de
      lecture se refermera au-dessus de leur version, bien avant la phase 4.
      Cette fixture garde la phase 4. Elle ne garde pas la phase 2, car le kit
      ne lit pas `$value`. Elle n'est jamais comparée à une sortie du moteur.
      *Ferme :* le test constate zéro référence absente et zéro erreur de type ;
      `AGENTS.md` cite la fixture et ses bornes.

- [ ] **1.4. Figer le schéma Format `2025.10`.**
      Sous `packages/plugin/tests/fixtures/`, avec un `README.md` qui donne son
      URL et son sha256. La date de récupération va dans le message de commit :
      un document décrit l'état courant.
      *Ferme :* le fichier commité, et son empreinte vérifiée par le test de
      2B.7.

- [ ] **1.5. Script de mesure sans verdict.**
      `scripts/mesurer-conformite-tokens.mjs` rejoue les mesures de la note :
      il génère les variantes à partir d'un `tokens.json`, compte les feuilles
      conformes à la définition `token.json` du schéma de 1.4, valide le
      document entier, et lance les lecteurs d'un kit dont le chemin est un
      paramètre, sur des contrats donnés. Le paramètre sert aussi en 2C.1, où
      deux kits sont à comparer. Le CSS se compare à part, par la procédure de
      1.2.
      *Ferme :* sur la fixture 1.3, le script rend 529, 720, 618 et 721 feuilles
      conformes ; avec un kit antérieur à 2A.4, il rend 0 et 8 erreurs de
      lecteur ; `AGENTS.md` le cite dans la carte du dépôt.

---

## Phase 2 — Valeurs en objets et graisse en nombre

Sans effet sur les lecteurs du kit, cassante pour tout consommateur resté sur
Style Dictionary 4.

La phase 2A n'est un prérequis de 2B que pour la valeur de la marque : le kit
qu'épingle aujourd'hui le Playground lit déjà la nouvelle grammaire sans
erreur. Aucune protection ne vient de 2A ; ce kit ignore les valeurs.

### 2A — Le kit, un seul commit et une seule publication

`versionSuitLeContenu.test.mjs` n'excepte que `tests/` et `fixtures/` : tout
commit qui touche `packages/kit/src/lecteurs` ou `src/format` monte les
versions dans le même commit, et `monorepoCoherent` impose alors de monter
aussi cli et adapter. Ces cinq tâches forment donc **un commit**.

- [ ] **2A.1. Assainir le segment de collection, si Figma le laisse passer.**
      Un segment qui commence par `$` fait disparaître le token :
      `indexerTokensDtcg` saute toute clé en `$`, et le contrôle du repository
      déclare ensuite la référence absente, en avertissement. Un nom de
      variable ne produit ni ce segment ni une accolade (section 6 de la note).
      Seul le nom de la collection le peut.
      **[humain]** Renommer une collection en `$test`, puis en `{test}`. Si
      Figma refuse les deux noms, la tâche disparaît.
      Sinon, `packages/kit/src/format/names.ts` porte la règle, puisqu'il porte
      les projections de nom, et `joinTokenPath`
      (`packages/plugin/src/variables.ts`) l'applique au nom de collection.
      `normalizeName` ne change pas : elle nomme aussi les props, les valeurs
      d'enum, les slots et les clés de `textStyles`, et la toucher modifierait
      des clés du contrat sans `CONTRACT_VERSION`.
      Règle : retirer `{` et `}` partout, tous les `$` de tête d'un segment, et
      retirer un segment devenu vide. Les noms de modes n'y passent pas : ils
      deviennent des clés sous `$extensions`, que `indexerTokensDtcg` ne lit
      pas.
      Aucun diagnostic : la transformation est entièrement prise en charge, et
      `collisionWarnings` signale déjà la collision qu'elle pourrait provoquer.
      *Ferme :* le constat de Figma écrit dans la section 6 de la note ; un test
      de la fonction ; un test qui exporte un composant et les tokens depuis la
      même collection, sur le mock de 1.1, et vérifie que les deux artefacts
      citent le même chemin.

- [ ] **2A.2. Lire la marque de grammaire.**
      Un module du kit lit `$extensions["com.ucm.grammaire"]` au niveau du
      document et rend `origine`, une grammaire connue ou `inconnue`, selon la
      règle de 0.2. L'exporter depuis `lecteurs/index.mjs` et `index.d.mts`,
      que `surfaceLecteurs.test.mjs` compare.
      *Ferme :* un test par cas.

- [ ] **2A.3. Spécifier le verdict d'une grammaire inconnue.**
      Tant qu'aucune grammaire n'est retirée, le verdict avertit sans bloquer.
      Il change l'attribution des erreurs typographiques : devant une grammaire
      inconnue, le message de `controle-repository.mjs` qui demande de corriger
      l'exporteur demande au mainteneur du repository de mettre à jour les
      paquets UCM.
      *Ferme :* la décision écrite sous la classe 10 ; un test du verdict et du
      message, sur une grammaire supérieure à la constante.

- [ ] **2A.4. Élargir les types typographiques tolérés.**
      `typography-token-types.mjs` accepte `fontFamily` à côté de `string` pour
      une famille, et `fontWeight` à côté de `number` et `string` pour une
      graisse. Corriger son commentaire de tête, qui décrit la projection
      actuelle. Un verdict qui se relâche relève de la classe 6, et la fenêtre
      d'adoption de la phase 4 s'ouvre avec cette publication.
      *Ferme :* les tests du kit sur les deux typages ; la fixture 1.3 lue sans
      erreur.

- [ ] **2A.5. Publier core, cli et adapter.**
      - Monter les trois versions dans le commit du code. cli et adapter
        épinglent `@ucm-kit/core` à l'exact.
      - Mettre à jour les versions épinglées des README
        (`pinDocumente.test.mjs`) ; le README du kit annonce le verdict qui
        change.
      - Lancer `publish.yml` dans l'ordre core, cli, adapter. Une exécution
        intermédiaire finit rouge par construction.
      *Ferme :* `npm view <paquet>@<version> version` rend la version pour les
      trois paquets.

- [ ] **2A.6. Monter la version épinglée du CLI dans
      `UCM-Playground/.github/workflows/ucm.yml`.** `ucm init` ne réécrit pas
      ce fichier. Ce geste ne dépend pas de Figma, et il vient donc avant le
      producteur.
      *Ferme :* la CI du Playground verte avec la nouvelle version.

### 2B — Le producteur

Aucune tâche de 2B ne touche un fichier publiable de `packages/kit`,
`packages/cli` ou `packages/adapter-typescript`. Un tel besoin repasse par 2A
et par une nouvelle publication.

- [ ] **2B.1. Écrire la marque de grammaire.**
      En tête de 2B : tout build intermédiaire qui change la forme porte alors
      sa marque. Valeur et emplacement fixés en 0.2. Afficher aussi la marque
      dans le pied de page du plugin, à côté de la version de schéma du
      contrat : c'est ce qui distingue le plugin publié du précédent.
      *Ferme :* un test lit la marque dans la sortie de `handleExportTokens` ;
      le module de 2A.2 la reconnaît ; le pied de page l'affiche.

- [ ] **2B.2. Faire passer le profil par `ExportContext`.**
      `handleExportTokens` lit `figma.root.documentColorProfile` une fois et le
      range dans un champ **optionnel** de `ExportContext`. `buildLeaf` ne lit
      jamais `figma` : un champ obligatoire casserait le typecheck des
      littéraux `ExportContext` de `exportTokens.test.ts`.
      Un document `LEGACY` est traité comme `srgb`, avec un avertissement par
      export. Un profil absent, hors de Figma, vaut également `srgb`, sans
      avertissement : le cas n'existe que dans un test. Le plugin ne fixe
      jamais le profil du document.
      *Ferme :* typecheck vert ; un test par valeur du profil et un pour son
      absence ; le message écrit en constat, avec son manque, son impact et son
      action.

- [ ] **2B.3. Dimensions en objet.**
      `formatValue` rend `{ value, unit: 'px' }`. Une référence reste une chaîne
      `"{cible}"`, dans `$value` comme sous `com.ucm.modes`. Réécrire les
      assertions en `'8px'` et `'24px'` de `exportTokens.test.ts`.
      *Ferme :* ces assertions réécrites ; un test qu'un alias vers une
      dimension reste une chaîne, y compris dans un mode.

- [ ] **2B.4. Couleurs en objet.** *Bloquée par 0.5 si le profil est
      `DISPLAY_P3`.*
      `formatValue` rend `{ colorSpace, components, alpha }`, composantes prises
      sur les flottants de Figma, sans repli `hex`. Retirer `toHex` et son test
      si plus rien ne l'appelle. Réécrire les assertions de
      `exportTokens.test.ts` qui attendent un hexadécimal sous `com.ucm.modes`.
      *Ferme :* ces assertions réécrites ; un test d'une couleur translucide ;
      un test qu'une composante `0.123456789` sort telle quelle et que
      `colorSpace` suit le profil.

- [ ] **2B.5. Graisse `STRING` en `$type: "number"`.**
      Le type se décide une fois par racine, comme aujourd'hui. Une racine
      `STRING` devient `number` si un segment de son chemin vaut `fontweight`
      ou `font-weight`, et si sa valeur dans chacun de **ses** modes est un nom
      que `poidsDeGraisse` connaît. Tester ce segment seul : `UNITLESS_GROUPS`
      contient aussi `opacity`, `zindex` et `aspectratio`, et une `STRING`
      « Regular » sous `opacity` deviendrait 400.
      Une feuille reçoit le type de sa racine, à condition que chacune de ses
      propres valeurs littérales soit aussi un nom connu ; sinon elle reste
      `string`. Une valeur littérale devient son poids, une référence reste une
      référence : le type d'une feuille ne peut pas contredire celui de sa
      cible.
      Le scope `FONT_WEIGHT` n'entre pas dans la règle : Figma le réserve aux
      `FLOAT`.
      `dtcgType` et `formatValue` reçoivent le type décidé en paramètre
      optionnel final. Leur seul appelant est `buildLeaf`.
      *Ferme :* un test par cas : `Regular` donne 400 ; `SemiBold` donne 600 ;
      `Italic` reste `string` ; une `STRING` sous `opacity` reste `string` ; une
      racine dont un mode porte un nom inconnu reste `string`, et une feuille
      qui l'aliase aussi ; un `FLOAT` sous `fontweight` ne change pas.

- [ ] **2B.6. Convertir `EASING` et `TIMING`** selon la décision de 0.4.
      *Ferme :* un test par cas retenu, et un test qu'une feuille laissée en
      `string` porte une valeur inchangée.

- [ ] **2B.7. Contrôler la conformité dans les tests du plugin.**
      - Ajv, `devDependency` du plugin, avec `{ allErrors: true, strict: false }`
        comme `lois.ts`. Sans `strict: false`, Ajv refuse le format
        `uri-reference`. Pour valider une feuille : `addSchema`, puis
        `getSchema('https://www.designtokens.org/schemas/2025.10/format/token.json')`.
      - Le contrôle porte sur la sortie de `handleExportTokens`, calculée sur
        le mock de 1.1. La fixture couvre une couleur, une dimension, une
        graisse `STRING` aliasée, une famille, une collection à deux modes, un
        `BOOLEAN`, une `STRING` sous `opacity`, une cible d'alias absente, un
        `EASING`, un `TIMING` et un `FLOAT` sans unité.
      - Le cliquet fige l'**ensemble exact des chemins** non conformes, jamais
        leur nombre : un compte laisse passer une feuille réparée contre une
        autre cassée.
      - Valider aussi le document entier par le schéma racine, ce qui couvre la
        forme de la marque. Les seules erreurs attendues sont celles des
        chemins figés.
      - Une assertion propre à UCM : chaque valeur sous `com.ucm.modes` a la
        forme du `$type` de sa feuille. Le schéma ne lit pas `$extensions`.
      *Ferme :* le test vu rouge, consigné dans le commit, sur une couleur
      privée de `colorSpace`, sur une dimension restée en chaîne et sur une
      marque mal formée ; fichiers restaurés par copie.

- [ ] **2B.8. Documents.**
      - `FORMAT.md` partie 2 : la table des écarts de 0.3, l'exemple, la
        mention de Style Dictionary 4 comme entrée visée, la phrase sur
        `FONT_WEIGHT` et le transform de plateforme, et le passage qui décrit
        la forme des valeurs. Ajouter que le contrat garde sa grammaire de
        dimension, `"15px"`, écrite hors de `formatValue`.
      - `COMPATIBILITE.md` : « Pourquoi `tokens.json` n'a pas de version » et la
        phrase « Un fichier sans ce champ voudra dire ».
      - `SPEC.md` : la lecture de `documentColorProfile`, et l'en-tête de pull
        request si elle doit annoncer la grammaire.
      - `AGENTS.md` : les invariants de tokens et ceux de la pull request
        d'export.
      - `README.md`, `CONCEPT.md`, la piste 2.3 de `PISTES-EVOLUTION.md`, et
        `ROADMAP.md` : la ligne sur la version de `tokens.json` et celle sur le
        diff sémantique.
      - `docs/README.md` et le statut de la note de décision.
      - `packages/plugin/README.md` : un utilisateur qui lit `tokens.json` sans
        le kit doit y apprendre qu'il faut Style Dictionary 5.
      - L'entrée de `CHANGELOG-FORMAT.md`, à la marque `1`.
      Deux pièges : `registrePortableDocuments` refuse le mot Playground dans
      `FORMAT.md`, `CONCEPT.md` et `CHANGELOG-FORMAT.md` ;
      `inventaireInvariants` protège plusieurs énoncés de la partie 2, dont
      « référence DTCG », « 2. Résolution des alias (tous types) », « 3. Modes =
      marques », `normalizeName()` et `indexVariables()`.
      *Ferme :* `npm test` vert, et
      `grep -rn "Style Dictionary v4\|pas de version propre\|voudra dire" --include=*.md .`
      ne rend que l'entrée de changelog.

### 2C — Figma, et la porte avant l'irréversible

- [ ] **2C.1. [humain] Exporter depuis le build de dev, sans configuration
      GitHub.** Charger `packages/plugin/dist/manifest.json` dans Figma et
      télécharger le fichier. Ne pas ouvrir de pull request : un export
      identique n'en ouvre jamais une seconde, et 2C.3 ne rendrait plus rien.
      Cet export est la porte avant la publication Community. Sur le fichier
      téléchargé :
      - le script de 1.5 rend 720 feuilles conformes sur 721, ou 618 si le
        document est en `DISPLAY_P3`, la famille étant la seule non conforme ;
      - le CSS produit sous Style Dictionary 5 est identique à celui de 1.2 ;
      - `npx --yes @ucm-kit/cli@<version 2A> check`, dans une copie du
        Playground où ce fichier remplace `src/tokens/tokens.json`, ne rend
        aucune référence absente ni erreur de type ;
      - le diff de 2C.4 ne montre que des différences attendues.
      *Ferme :* les quatre constats, avant toute publication.

- [ ] **2C.2. Publier le plugin sur la Figma Community**, et mettre à jour le
      texte de sa page. Une nouvelle version passe par la revue de Figma :
      pendant ce délai, l'ancienne version reste servie.
      *Ferme :* la version publiée exporte la marque et l'affiche dans son pied
      de page.

- [ ] **2C.3. [humain] Réexporter les tokens du Playground** par le plugin
      publié, dans une pull request. Le fichier ne se retouche jamais à la
      main.
      *Ferme :* la CI de la pull request verte, avec le CLI épinglé en 2A.6 ;
      `npx --yes @ucm-kit/cli@<version 2A> check` sur la branche, sans
      référence absente ni erreur de type ; le `diff` du CSS de 1.2 vide.

- [ ] **2C.4. Comparer les deux fichiers de tokens réels.**
      `ROADMAP.md` diffère le diff sémantique jusqu'au premier changement réel,
      à spécifier sur deux artefacts successifs. La paire est
      `git show <commit avant 2C.3>:src/tokens/tokens.json` et le fichier de la
      pull request, jouée d'abord sur l'export de 2C.1. Un CSS identique à
      l'octet ne suffit pas : il ne voit ni les modes, que le CSS ne
      sélectionne pas, ni les types.
      La comparaison porte sur :
      - l'ensemble des chemins, identique ;
      - la cible de chaque alias, dans chaque mode, identique ;
      - les `$type`, identiques sauf les graisses passées de `string` à
        `number` ;
      - les valeurs après interprétation : une dimension objet vaut la chaîne
        `px` d'origine, une couleur `srgb` opaque vaut son hexadécimal, une
        graisse vaut le poids de son nom.
      *Ferme :* chaque écart entre dans l'une des différences attendues, avant
      la fusion ; l'outil de comparaison commité à côté du script de 1.5.

- [ ] **2C.5. [humain] Attribuer un profil colorimétrique explicite au fichier
      Figma**, si 0.5 a rendu `LEGACY`. Sans ce geste, chaque export avertira
      indéfiniment. Le plugin ne peut pas le faire.
      *Ferme :* un export sans cet avertissement.

### 2D — Le consommateur

- [ ] **2D.1. (optionnel) Retirer le transform `fontWeight/name-to-number`.**
      Après 2C.3 seulement : sur le fichier actuel, le retirer écrit
      `--primitives-fontweight-400: Regular;`. Garder `fontFamily/css-quote`,
      qui porte le repli `, sans-serif`. Mettre à jour le commentaire de tête de
      `style-dictionary.config.mjs`.
      *Ferme :* `diff` du CSS vide.
- [ ] **2D.2. (optionnel) Contrôler le CSS produit dans la CI du Playground.**
      Un build sous Style Dictionary 4 rend `--x: [object Object];`, qui est
      une propriété personnalisée valide : ni Style Dictionary ni le navigateur
      n'échouent. Le contrôle est donc un `grep` de `[object Object]` après le
      build, et non le build lui-même.
      *Ferme :* le `grep` vu rouge sur une branche de rebut où le build tourne
      sous Style Dictionary 4, puis vert une fois la branche abandonnée.

---

## Phase 3 — Conditionnelle : un document en Display P3

Seulement si 0.5 rend `DISPLAY_P3`. La couleur en objet change la forme
publiée : cette phase est une seconde grammaire, pas seulement une tâche de
code.

- [ ] **3.1. Incrémenter la marque, publier le kit, monter le pin.** Sans cet
      incrément, le lecteur de 2A.2 rendrait `inconnue` au Playground. Reprend
      2A.2 à 2A.6 pour la valeur suivante.
      *Ferme :* les mêmes critères que 2A.5 et 2A.6.
- [ ] **3.2. Réaliser 2B.2 et 2B.4**, dans cet ordre : lire le profil sans
      convertir les couleurs n'a pas d'objet.
      *Ferme :* les critères de ces deux tâches.
- [ ] **3.3. Reprendre 2C.1 à 2C.4.** 97 lignes du CSS du Playground changent.
      Il s'agit d'une couleur qui sortait fausse ; seul un contrôle visuel la
      distingue d'une régression.
      *Ferme :* la comparaison visuelle et ses captures dans la pull request du
      Playground, et la preuve visuelle notée dans `ROADMAP.md`.
- [ ] **3.4. Décider si le Playground rend le P3.** Le groupe `css` de Style
      Dictionary 5 ramène une couleur P3 dans le gamut sRGB, et `color/p3`
      convertit toutes les couleurs vers Display P3. Un rendu en gamut large
      demande un transform qui lit `colorSpace`. La décision appartient à
      l'application.
      *Ferme :* la décision écrite dans le `AGENTS.md` du Playground.

---

## Phase 4 — Différée : le typage `fontFamily`

Conditions d'ouverture : la version publiée en 2A.5 adoptée par les
consommateurs connus, et un outil ou un consommateur qui demande le type
`fontFamily`. Le typage gagne une feuille et rend le document entier valide ;
il produit 8 erreurs bloquantes chez un consommateur au kit non mis à jour.

- [ ] **4.1. Décider l'autorité du type d'une `STRING`.** Trois traitements :
      imposer le scope `FONT_FAMILY` dans Figma, une annotation UCM, ou une
      spécialisation par usage. La règle de segment de la graisse ne suffit
      pas ici : aucune liste ne vérifie un nom de famille.
      *Ferme :* la règle écrite dans `SPEC.md`, et un diagnostic pour la
      variable qui n'y satisfait pas.
- [ ] **4.2. Préparer le CSS du Playground.** Sous Style Dictionary 5, le
      typage `fontFamily` fait écrire `"'Open Sans'", sans-serif` : le
      transform `fontFamily/css` pose des apostrophes que
      `fontFamily/css-quote` entoure de guillemets. Le Playground corrige son
      transform, ou retire `fontFamily/css` de son groupe, avant de recevoir ce
      type.
      *Ferme :* sur un `tokens.json` dont la famille est typée `fontFamily`, le
      CSS rend `"Open Sans", sans-serif`.
- [ ] **4.3. Typer `fontFamily` dans le producteur**, avec un nouvel incrément
      de marque et la publication qui va avec.
      *Ferme :* le kit antérieur à 2A.5 rend les 8 erreurs sur la fixture 1.3 ;
      celui de 2A.5 n'en rend aucune.

---

## Retrait

- **Avant 2C.2**, revert sur `main`. Les paquets publiés en 2A restent : ils
  lisent les deux grammaires.
- **Après 2C.2**, revert des commits de 2B, build, puis republication sur la
  Community, avec le délai de revue de Figma. Le Playground revient par un
  réexport depuis le build de dev du commit antérieur à 2B : sous Style
  Dictionary 5, l'ancien fichier rend le même CSS.
- **Un correctif qui change la forme publiée** incrémente la marque et
  republie le kit, comme en 3.1.
- **1.2 se retire** par un revert dans le Playground.

---

## Hors de ce plan

- **Resolver** : aucun outil installé ne le lit.
- **Sémantique des modes** : axes, mode par défaut explicite et combinaisons
  entre collections relèvent de la piste 2.4 de `PISTES-EVOLUTION.md`.
- **Projection stricte dérivée** : écartée par la note de décision, avec la
  condition qui la rendrait nécessaire.
- **Typage par contexte** : `buildLeaf` décide le `$type` dans le mode par
  défaut. C'est une politique de modes, à traiter avec le Resolver.
- **Scope de l'alias écarté au profit de la racine** : défaut de `buildLeaf`
  sans occurrence constatée. La tâche est de l'inscrire dans les fragilités
  connues de `ROADMAP.md`, avec son contre-exemple.
