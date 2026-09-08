# Contribuer à Unified Component Exporter

Ce document dit **comment travailler** sur ce dépôt : écrire du code, un
message, un test, un document, et vérifier avant de proposer un changement.

Il ne dit pas ce que le produit garantit. Les règles que le code doit tenir
sont les invariants d'[AGENTS.md](./AGENTS.md#invariants), qui donnent pour
chacune sa borne et son fichier autorité. Leur raisonnement vit dans les deux
spécifications : [docs/FORMAT.md](./docs/FORMAT.md) pour la forme de ce qui est
publié, [packages/plugin/SPEC.md](./packages/plugin/SPEC.md) pour ce que le
plugin lit dans Figma. Lire la spécification concernée avant de modifier, et
l'invariant avant de croire qu'une règle n'existe pas.

Le code doit rester générique, lisible et prudent face aux données Figma
incomplètes.

## Code

- Préférer des fonctions courtes et pures aux orchestrateurs monolithiques.
- Le code doit être le plus simple possible, lisible même pour un débutant.
- Donner une seule responsabilité à chaque module.
- Utiliser des noms complets ; éviter les abréviations et les astuces
  implicites.
- Respecter TypeScript `strict` et limiter les dépendances.
- Ne jamais conditionner une règle au nom d’un composant.
- Centraliser le vocabulaire sémantique dans
  `src/contract/semantics.ts`.
- Conserver les noms Figma d’origine lorsqu’une valeur est normalisée ou
  renommée.

Les commentaires sont en français. Ils expliquent une décision, une
particularité de l’API Figma ou une limite ; ils ne paraphrasent pas le code.
Chaque fichier décrit brièvement son rôle, et chaque fonction exportée non
triviale précise son contrat. Les règles de
[Rédiger un document](#rédiger-un-document) valent pour eux, et le même contrôle
les lit.

## Messages destinés au designer

Les messages de l’interface, des pull requests et des rapports CI sont lus par
un designer. Ils donnent un constat et une action, sans raconter le
fonctionnement interne des contrôles.

Un diagnostic agrégé suit cet ordre :

1. le problème principal, puis le nombre d’éléments concernés ;
2. la liste des composants, contrats ou tokens concernés ;
3. les écarts précis, sous forme de liste ;
4. l’action, avec son responsable ;
5. l’état de la fusion.

```md
### ❌ Le code n’est plus conforme aux contrats (2 composants)

Les tests de conformité échouent pour :

- Alert
- Button

#### Écarts détectés

- Alert : le texte n’utilise pas le style déclaré par le contrat.

#### Action

Un développeur doit mettre à jour les composants.

La fusion reste bloquée.
```

Le titre commence par le problème, jamais par une liste de composants. Une
phrase porte une seule idée et un paragraphe deux phrases au maximum. Le texte
principal reste court ; les chemins, piles d’erreur et autres détails réservés
au développeur peuvent être placés dans un bloc repliable.

Règles de rédaction :

- employer la voix active et des verbes concrets ;
- nommer la personne qui doit agir : designer, développeur ou mainteneur du
  plugin ;
- écrire explicitement si le point bloque la fusion ;
- distinguer le fait observé de sa cause supposée ;
- gérer le singulier et le pluriel, sans forme comme `composant(s)` ;
- ne pas employer de tiret cadratin, de métaphore, de question rhétorique ou
  d’introduction narrative ;
- supprimer toute phrase qui n’aide pas à comprendre le problème ou à agir.

Une assertion de conformité en échec prouve un écart entre le code et le
contrat. Une erreur d’exécution prouve seulement que le contrôle n’a pas pu
aboutir. Le message ne doit jamais attribuer une cause que le contrôle n’a pas
établie.

### Avertissements de l’export

Les avertissements d’un export sont adressés au **designer**, et lui parviennent
par le corps de la pull request que le plugin ouvre. Ils sont donc écrits dans
son vocabulaire, jamais dans celui du code.

**Un export ne remonte au designer que ce qui demande une décision.** Trois
portes d’entrée, et rien d’autre : le point bloque l’export, il rend le contrat
partiel, ou il demande une vérification ou une correction dans Figma.

Une transformation entièrement prise en charge reste **silencieuse partout** :
dans le plugin, dans la pull request et dans `meta.diagnostics`. C’est le cas
d’une piste FIXED de grille publiée en pixels, d’un calque hors du flux dont la
distance aux bords est calculée, d’une rotation publiée, ou d’une structure
propre à un variant que sa vue exacte conserve. Leur règle appartient au format
et à ses tests, pas à un résultat d’export.

Il n’existe aucun canal pour un constat sans geste. Un compte rendu qui fait
relire au designer le fonctionnement interne de l’exporteur, pour lui dire
qu’il n’a rien à faire, lui apprend que ces listes se survolent. Le jour où un
avertissement demandera un geste, il le survolera aussi.

Un constat qui ne nomme aucun geste ne s’écrit donc pas. La forme unitaire
ci-dessous est ce qui distingue les deux.

`meta.diagnostics` est l’unique représentation publiée dans le contrat. Son
`code` répond à une seule question, celle de savoir si la projection portable a
perdu quelque chose :
`UCM_PORTABLE_PROJECTION_WARNING` pour une perte de portabilité,
`UCM_EXPORT_NOTICE` pour le reste. Attention : « sans perte de portabilité » ne
veut pas dire « sans geste à faire » : une combinaison de variants absente ne
coûte rien à l’arbre exact, et le designer doit pourtant y retourner. Les deux
codes demandent un geste ; seul le premier dégrade `meta.coverage.portable`, et
seul le premier remonte dans le rapport de CI.

Chacun répond à trois questions, dans cet ordre :

| | Champ | Contenu |
|---|---|---|
| **Où + Quoi** | `titre` | Le nom exact de l’élément Figma — calque, variante, propriété — tel qu’il s’affiche dans le panneau des calques, puis ce qui manque ou ce qui est illisible |
| **Et alors** | `impact` | Ce que le développeur n’aura pas, en une phrase |
| **Comment** | `action` | Le geste à faire dans Figma, à l’impératif |

**Les trois voyagent séparées, du moteur jusqu’à l’interface.** Un site
d’émission n’écrit pas une phrase : il écrit un `Constat`
(`src/contract/localisation.ts`), et l’autorité en compose le titre puis la
phrase compacte. Deux lois le tiennent. L’une refuse qu’un message s’écrive
ailleurs, l’autre refuse qu’un message sorte du moteur sans ses parties.

```ts
pousserLocalise(warnings, 'Layer', node, {
  // `champ` est facultatif : « Layer « Card », padding : … ».
  manque: 'l’alignement du stroke est illisible.',
  impact: 'Le contrat ne dira pas s’il est inside, center ou outside.',
  action: 'Vérifiez ce réglage dans Figma, puis réexportez.',
});
```

La phrase compacte, celle que le journal, `meta.diagnostics` et la pull request
publient, s’en dérive et ne se rédige jamais une seconde fois :

```text
{Élément Figma}[, {champ}] : {ce qui manque}. {impact}. {action}.
```

L’interface, elle, ne recoupe pas cette phrase : elle met les trois parties en
page, sous une pastille qui nomme la sévérité. C’est pour cela qu’elles voyagent
séparées : un paragraphe unique fait lire le geste en dernier, après deux
phrases de contexte.

Un message emploie **les intitulés que Figma affiche**, repris tels quels : le
designer doit pouvoir chercher dans son écran le mot que le message emploie.
La phrase reste en français ; seul le nom de l’élément Figma est repris à
l’identique. Ne traduisez jamais un libellé de panneau : `padding` ne devient
pas « marges intérieures ».

| Terme du code | Terme employé | | Terme du code | Terme employé |
|---|---|---|---|---|
| `node de layout` | auto layout frame | | `itemSpacing` | gap, ou horizontal gap sous le wrap |
| `sous-arbre` | le layer et son contenu | | `padding*` | left / right / top / bottom padding |
| `matrice` | les variants | | `cornerRadius` | corner radius |
| `slot`, `calque` | layer | | `strokeWeight` | stroke weight |
| `componentPropertyDefinition` | component property | | `fills` | fill |
| `prop enum` | variant property | | `strokes` | stroke |
| `prop BOOLEAN` | boolean property | | `fontSize`, `lineHeight` | font size, line height |
| `Component Set` | component set | | `feuille` / `groupe` | token / groupe de tokens |
| `layoutWrap` | wrap | | `counterAxisSpacing` | vertical gap |

`fieldLabel()` dans `src/contract/nodeBindings.ts` tient cette table pour les
propriétés Figma citées dans un message ; les libellés passés à `resolveField()`
suivent la même règle. Aucune couche de remplacement : la traduction se fait à
la source.

## Interface du plugin

Ce que le designer voit dans la fenêtre du plugin se juge contre deux choses
écrites : une hiérarchie de l’information et un protocole de relecture. Elles
existent parce qu’une refonte d’interface sans critère ne produit que des avis.
Ce qui suit fait autorité.

### La hiérarchie de l’information

Trois rangs, et le moyen visuel de chacun.

| Rang | Ce qui en relève | Signalé par |
|---|---|---|
| 1 — ce qui décide de l’action | la cible (nom du composant), le verdict du résultat (« 3 points à corriger », « prêt à publier », « identique au dépôt ») | la position — en tête, sans rien défiler — et la taille |
| 2 — ce sur quoi on agit | l’action principale, chaque avertissement | le poids : bouton plein, bloc à filet de sévérité |
| 3 — ce qui informe sans rien demander | constats, version de schéma, surtitre d’une carte | la couleur secondaire et la densité |

Quatre bornes, sans quoi la table ne tient pas :

- **un élément signale son rang par deux moyens au plus** : position et taille,
  ou poids et couleur, jamais les quatre, sinon tout crie ensemble ;
- **la couleur sémantique ne signale que la sévérité, jamais le rang.**
  autrement un constat vert paraît plus important qu’un avertissement gris, ce
  qui est l’inverse de la doctrine du projet ;
- **un rang 1 hors de vue n’est pas un rang 1.** La position est un signal, et
  la limite de la fenêtre en fait partie : ce qui décide de l’action se lit sans
  défiler, y compris quand le contenu en dessous grandit ;
- **une carte est une commande, et il n’y en a que deux.** Une carte regroupe un
  sujet, son état, le geste qui porte dessus et tout ce que ce geste produit :
  verdict, publication, points à corriger, lien de pull request. Rien de ce qui
  concerne l’autre commande n’y entre, et rien ne porte de surface en dehors
  d’elles : un troisième objet à surface remettrait trois zones de poids égal à
  l’écran, c’est-à-dire aucune hiérarchie. Ce qui vaut pour les deux, l’alerte
  de repli local, vit entre elles et sans surface ;
- **un résultat ne survit pas à son sujet.** Le verdict et la publication
  disparaissent quand la sélection qui les a produits n’est plus là : un
  « prêt à publier » sous « aucun composant sélectionné » nomme un composant que
  l’écran ne montre plus. C’est l’identité du sujet qui décide, jamais l’arrivée
  d’un message, car le sandbox en envoie deux par sélection et le second peut
  retomber pendant une analyse.

### Regarder avant de conclure

`packages/plugin/galerie/` rend chaque état de l’interface atteignable hors de
Figma : `etats.cjs` déclare, pour chacun, la suite exacte de messages qui le
produit, et la galerie rejoue cette suite dans l’interface réelle que le build
vient de produire. Rien n’y est redessiné.

```sh
npm run galerie --workspace ucm-exporter-plugin           # dist/galerie/index.html
npm run galerie:captures --workspace ucm-exporter-plugin  # les planches, en PNG
```

Les couleurs viennent d’un décalque des variables `--figma-color-*`, pas de
l’hôte : la galerie sert à juger une hiérarchie, une densité et une place, et
jamais à conclure sur un contraste. Un état ajouté sans entrée dans `etats.cjs`
fait échouer `tests/galerie.test.ts`, qui refuse qu’un message déclaré dans
`messages.ts` n’ait aucun écran où être regardé.

### Le protocole de relecture

Cinq points, passés sur les captures. Une vérification qui coûte cher ne se fait
qu’une fois : celle-ci est courte pour être répétée à chaque phase qui ajoute un
état.

**(a)** Côte à côte avec un panneau natif de Figma. Densité, taille de texte,
épaisseur des bordures : l’écart doit être invisible.
**(b)** Les deux thèmes, en vérifiant le contraste du texte de sévérité sur son
fond, à 11 px. Dans Figma, pas sur le décalque.
**(c)** À la plus petite taille de fenêtre admise.
**(d)** Avec le pire contenu réel : l’avertissement le plus long que le moteur
produise, et vingt avertissements d’un coup.
**(e)** Un compte des objets à l’écran : au-delà d’une douzaine, la hiérarchie
ci-dessus ne tient plus, quelle que soit la finesse du style. C’est ce compte
qui a fait retirer le journal replié, le dépôt visé et ses deux chemins, la ligne
d’emplacement et le titre « Publication » de l’écran de travail : chacun coûtait
un objet permanent et ne servait aucune décision qui se prenne là, ou redisait ce
que la ligne d’à côté disait déjà.

## Écrire du code prudent

Tout accès Figma susceptible d’échouer doit être protégé. Les chaînes d’alias
doivent détecter les cycles. Une collision ou une perte d’information ne doit
jamais rester silencieuse.

Une donnée facultative, illisible ou non tokenisée produit un avertissement et
reste absente de l’export ; elle n’est jamais remplacée par une valeur brute ou
une supposition. Ce que le produit bloque et ce dont il se contente d’avertir
est une règle du format, pas un choix d’implémentation :
[AGENTS.md](./AGENTS.md#diagnostics) en tient la liste.

## Tests

Tout bug corrigé doit être reproduit par un test. La logique pure se teste avec
des objets Figma minimaux et des dépendances injectées.

Chaque paquet a son `scripts/run-tests.cjs`, qui découvre les fichiers
`tests/*.test.ts` et `tests/*.test.mjs` de son dossier.

Une loi de forme d’un contrat s’écrit dans `packages/plugin/tests/lois.ts` et
nulle part ailleurs : elle s’applique alors du même geste à tous les scénarios
existants. La raison de ce point unique, et celle qui interdit de commiter un
`.contract.json` ici, sont dans
[AGENTS.md](./AGENTS.md#vérification).

Avant une pull request :

```sh
npm test
npm run typecheck
npm run build
```

## Documentation

Chaque document a une autorité limitée, et
[docs/README.md](./docs/README.md#où-vit-quelle-règle) en tient la table. Deux
seulement concernent qui contribue :

| Document | Rôle |
|---|---|
| `AGENTS.md` | Ce que le produit garantit : la carte du code, les invariants, leur borne et leur fichier autorité |
| `CONTRIBUTING.md` | Comment travailler : code, message, test, document, vérification |

Une modification se termine par une revue des documents concernés. Décrire
l’état actuel, supprimer les formulations périmées et préférer un lien à une
répétition. L’historique appartient à Git.

### Rédiger un document

Ces règles portent sur les documents du dépôt. Les textes du produit, lus par un
designer dans le plugin ou dans une pull request, relèvent de
[Messages destinés au designer](#messages-destinés-au-designer), qui reste leur
autorité.

Elles existent parce que la documentation avait pris les tics d’écriture des
modèles de langage, mesurables et reconnaissables : la densité de tiret cadratin
atteignait cinquante fois celle d’un texte humain.

`tests/styleDocumentaire.test.ts` en tient cinq, sur les documents et sur les
commentaires de code : tiret cadratin en incise, capitales d’emphase,
opposition en deux temps, qualificatif que rien n’établit, date posée sur une
décision. Un sixième contrôle refuse qu’un document d’autorité recopie d’un
autre un passage de vingt-cinq mots. Les règles vivent dans
`scripts/controle-style.mjs`, que le hook `PostToolUse` de
`.claude/settings.json` rejoue au moment où un agent écrit un fichier : le hook
donne le retour immédiat, le test est la barrière que rien ne franchit. Un mot
en capitales qui est un sigle, un type de l’API Figma ou un nom de document
s’ajoute à `ACRONYMES`, dans le même commit.

**Ponctuation.** Le tiret cadratin ne sert pas d’incise. Employer un point, un
point-virgule, une virgule, deux points ou une parenthèse. Il reste admis dans
un titre et dans une table de correspondance. Pas d’emphase par capitales : le
gras suffit, et avec parcimonie. Pas de flèche ni de symbole décoratif dans la
prose ; ils restent admis dans un tableau ou un schéma.

**Tournures à éviter.** La construction en deux temps « ce n’est pas X, c’est
Y » et ses variantes. La triade rhétorique, trois éléments listés pour la
cadence. La personnification d’un document, d’une règle ou d’un fichier : écrire
« le module `names.ts` porte la règle » plutôt que « la règle vit dans
`names.ts` ». L’aphorisme et la formule frappante : écrire la règle.

**Histoire.** Un document décrit l’état actuel. Il ne raconte pas ce qui s’est
passé, ne date pas une décision et ne cite aucun identifiant de tâche.
L’historique appartient à Git, message de commit compris : c’est le seul endroit
qui ne périme pas, parce qu’il est daté par construction. Cette règle vaut aussi
pour les commentaires de code. Une justification est admise quand elle change
une décision du lecteur ; elle tient en une ou deux phrases.

**Structure.** Une page ne mélange pas les quatre genres de
[Diátaxis](https://diataxis.fr/) : le tutoriel enseigne, le guide pratique
résout un problème, la référence énonce, l’explication justifie. Phrases
courtes, voix active, une idée par phrase. Un exemple concret vaut mieux qu’une
définition abstraite.

**Volume.** Une passe de réduction menée sur tout le dépôt a rendu 20 710
caractères, soit 2,4 % de sa prose, et le gain vient d’un seul geste : rendre à
`types.ts` ou à une spécification ce qu’elle portait déjà. Ce qui reste porte
une règle, sa borne ou son pourquoi, et en retirer une phrase retire une clause.
Une nouvelle passe visant un volume plutôt qu’une redite coûterait donc de
l’information. `scripts/mesurer-prose.mjs` mesure l’état courant et
`docs/notes/baseline-prose.json` en garde un relevé de départ.

### Une règle, un domicile

Une même règle écrite à deux endroits finit par diverger. Chaque endroit en
porte donc une altitude différente, et une seule fait autorité :

| Endroit | Ce qu’il porte |
|---|---|
| `docs/FORMAT.md` | L’autorité sur la règle et son pourquoi, quand elle porte sur ce qui est publié |
| `packages/plugin/SPEC.md` | L’autorité sur la règle et son pourquoi, quand elle porte sur ce que le plugin lit |
| `AGENTS.md` | La règle, sa borne, le fichier qui la porte, un lien vers la spécification |
| Commentaire de code | Ce qui ne vaut qu’à cet endroit du code |
| Nom de test | La clause vérifiable, une par test |

**Deux autorités, et la frontière entre elles.** Une règle qui décrit un champ,
sa forme, ce que son absence signifie et ce qu’un consommateur peut en conclure,
appartient à `FORMAT.md`. Une règle qui décrit une lecture, ce que le plugin
élit dans l’arbre Figma, ce qu’il refuse de deviner et ce dont il avertit le
designer, appartient à `SPEC.md`. Une règle qui fait les deux se range du côté
de ce qu’un consommateur doit savoir pour lire l’artefact, et l’autre document y
renvoie : c’est le consommateur qui n’a pas accès au code.

La table ci-dessus ne dit pas où une règle atterrira : elle dit où elle est.

Ailleurs, un lien. Une mention d’une phrase à une autre altitude, comme le
`README` qui résume ou la `ROADMAP` qui date une étape, n’est pas une
répétition.

Écrire dans une spécification demande une ancre : ses titres sont les cibles des
liens d’`AGENTS.md`, et `npm test` échoue sur un lien mort.

**Déplacer une information entre deux altitudes.** Le message de commit nomme
l’altitude d’arrivée et l’emplacement exact ; sans cette phrase, le retrait ne
se fait pas. Et deux altitudes ne se touchent jamais dans le même commit : un
document et le code qu’il décrit se raccourcissent à des moments séparés, sans
quoi chacun se vide en supposant que l’autre garde. Une borne ne se retire
jamais au motif qu’elle vit ailleurs, sauf à l’avoir lue à l’endroit où elle
vivrait.

## API Figma et build

- Préférer les variantes asynchrones de l’API, compatibles avec
  `documentAccess: dynamic-page`.
- Garder les commandes Figma isolées et testables.
- Les sources de l’interface vivent dans `src/ui/`; le build produit
  `dist/ui.html`.
- Si un changement dépend d’une évolution récente de l’API Figma, vérifier sa
  documentation officielle avant de modifier les types ou l’architecture.
