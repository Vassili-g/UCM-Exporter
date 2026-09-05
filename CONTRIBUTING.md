# Contribuer à Unified Component Exporter

Le code doit rester générique, lisible et prudent face aux données Figma
incomplètes. Avant une modification, lire la spécification concernée dans
[UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md).

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
triviale précise son contrat.

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

Un export produit deux natures de constats, et elles ne se mélangent pas :

| | Un **avertissement** | Une **note** |
|---|---|---|
| Ce qu’il dit | Une information manque à l’artefact | Le contrat publie ce point sous une forme inhabituelle |
| Geste attendu | Oui, nommé dans le message | Aucun |
| Canal interne | `warnings` | `infos` |
| Corps de la pull request | « L’export n’a pas pu décrire… », puis « Corrigez chaque point » | Rien : elle n’y apparaît pas |
| Où la lire | Pull request, journal du plugin, `meta.diagnostics` | Journal du plugin, `meta.diagnostics` |

Écrire une note dans le canal `warnings` produit un texte qui se contredit : le
titre annonce une information absente, la phrase répond qu’elle est bien là. La
piste FIXED d’une grille, publiée en pixels, est le cas type d’une note.

**Le corps de la pull request ne porte que des avertissements.** C’est la seule
page que le designer relira à froid, et ce qu’il y trouve décide s’il relira la
suivante. Une note y aurait toujours la même conclusion, « rien à faire » : la
publier, c’est lui apprendre que ces listes se survolent, et le jour où un
avertissement demandera un geste il le survolera aussi. Les notes restent donc
dans le journal du plugin, sous les yeux de qui exporte, et dans
`meta.diagnostics`, pour qui consomme le contrat.

Même règle du côté des avertissements : un constat qui ne nomme aucun geste n’a
rien à faire dans cette liste. Soit il en nomme un, soit c’est une note. La forme
unitaire ci-dessous n’est pas une recommandation, c’est ce qui distingue les deux.

`meta.diagnostics` est l’unique représentation publiée dans le contrat. Il
distingue les constats par leur `code` :
`UCM_PORTABLE_PROJECTION_WARNING` pour une perte de portabilité,
`UCM_EXPORT_INFO` pour une note, `UCM_EXPORT_NOTICE` pour le reste. Attention :
« sans perte de portabilité » ne veut pas dire « sans geste à faire » — une
combinaison de variants absente ne coûte rien à l’arbre exact, et le designer
doit pourtant y retourner. Seul `UCM_EXPORT_INFO` promet qu’il n’y a rien à
faire.

Chacun répond à trois questions, dans cet ordre :

| | Contenu |
|---|---|
| **Où** | Le nom exact de l’élément Figma — calque, variante, propriété — tel qu’il s’affiche dans le panneau des calques |
| **Quoi** | Ce qui n’a pas pu être exporté, donc ce qui manquera au développeur |
| **Comment** | Le geste à faire dans Figma |

Un avertissement unitaire emploie cette forme :

```text
{Élément Figma} : {information non exportée}. {action dans Figma}.
```

Un message emploie **les intitulés que Figma affiche**, repris tels quels : le
designer doit pouvoir chercher dans son écran le mot que le message emploie.
La phrase reste en français ; seul le nom de l’élément Figma est repris à
l’identique. Ne traduisez jamais un libellé de panneau — `padding` ne devient
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
existent parce qu’une refonte d’interface sans critère ne produit que des avis —
c’est le manque que [refonte-ui.md](./refonte-ui.md) a nommé, et U1.0 à U1.3 y
répondent. Ce qui suit fait autorité ; le plan, lui, raconte ce qui reste à
faire.

### La hiérarchie de l’information

Trois rangs, et le moyen visuel de chacun.

| Rang | Ce qui en relève | Signalé par |
|---|---|---|
| 1 — ce qui décide de l’action | la cible (nom du composant), le verdict du résultat (« 3 points à corriger », « prêt à publier », « identique au dépôt ») | la position — en haut, hors de toute carte — et la taille |
| 2 — ce sur quoi on agit | l’action principale, chaque avertissement | le poids : bouton plein, bloc à filet de sévérité |
| 3 — ce qui informe sans rien demander | destination, constats, version de schéma, journal | la couleur secondaire et la densité, jamais une carte |

Trois bornes, sans quoi la table ne tient pas :

- **un élément signale son rang par deux moyens au plus** — position et taille,
  ou poids et couleur, jamais les quatre, sinon tout crie ensemble ;
- **la couleur sémantique ne signale que la sévérité, jamais le rang** —
  autrement un constat vert paraît plus important qu’un avertissement gris, ce
  qui est l’inverse de la doctrine du projet ;
- **un rang 1 hors de vue n’est pas un rang 1.** La position est un signal, et
  la limite de la fenêtre en fait partie : ce qui décide de l’action se lit sans
  défiler, y compris quand le contenu en dessous grandit. Cette borne est venue
  des captures, pas de la table : elles ont montré le verdict, le lien de pull
  request et le bouton « Enregistrer » sous la ligne de flottaison.

### Regarder avant de conclure

`packages/plugin/galerie/` rend chaque état de l’interface atteignable hors de
Figma : `etats.cjs` déclare, pour chacun, la suite exacte de messages qui le
produit, et la galerie rejoue cette suite dans l’interface RÉELLE que le build
vient de produire — rien n’y est redessiné.

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

**(a)** Côte à côte avec un panneau natif de Figma — densité, taille de texte,
épaisseur des bordures : l’écart doit être invisible.
**(b)** Les deux thèmes, en vérifiant le contraste du texte de sévérité sur son
fond, à 11 px. Dans Figma, pas sur le décalque.
**(c)** À la plus petite taille de fenêtre admise.
**(d)** Avec le pire contenu réel — l’avertissement le plus long que le moteur
produise, et vingt avertissements d’un coup.
**(e)** Un compte des objets à l’écran : au-delà d’une douzaine, la hiérarchie
ci-dessus ne tient plus, quelle que soit la finesse du style.

## Robustesse

Une donnée facultative, illisible ou non tokenisée produit un avertissement et
reste absente de l’export. Elle n’est jamais remplacée par une valeur brute ou
une supposition.

Les préconditions définies par la spécification restent bloquantes :

- sélection invalide ;
- composant ou component set sans aucun variant exportable.

L'absence de règles et une matrice clairsemée sont des diagnostics, pas des
blocages : la liste exacte `variants` produit un contrat cohérent dans les deux
cas.

Tout accès Figma susceptible d’échouer doit être protégé. Les chaînes d’alias
doivent détecter les cycles. Une collision ou une perte d’information ne doit
jamais rester silencieuse.

## Invariants communs

- Les alias sont préservés, jamais aplatis.
- `normalizeName()` est l’unique règle de nommage des tokens.
- `indexVariables()` tranche les collisions pour les contrats et les tokens.
- Une référence de token utilise la forme `{chemin.du.token}`. `variables.ts`
  la produit (`toRef`) et la reconnaît (`isTokenReference`) : une seule autorité
  sur sa forme.
- Le contrat ne publie aucun `tokensUsed`. Un consommateur qui a besoin de cet
  index le dérive du contrat terminé, `samples` et `meta` exclus.
- Un composant imbriqué contracté devient une dépendance de composition ; son
  contenu interne n’est pas réexporté par le parent.
- Un changement de forme du contrat incrémente `contractVersion`.
- Le schéma publié par `@ucm-kit/core` est dérivé de
  `packages/kit/src/format/types.ts` par
  `npm run schema`. Il n’est jamais rédigé à la main : une seconde description
  de la même forme finirait par diverger de la première.
- Le plugin ne modifie jamais le document Figma.

## Tests

Tout bug corrigé doit être reproduit par un test. La logique pure se teste avec
des objets Figma minimaux et des dépendances injectées.

`scripts/run-tests.js` découvre automatiquement les fichiers
`tests/*.test.ts`.

Aucun artefact de contrat n’est commité ici : un `.contract.json` appartient au
repository qui le consomme. Un exemplaire gelé dans ce repository ne bougerait
qu’au réexport, et un test posé dessus ne prouverait que sa propre immobilité.

Les lois de forme d’un contrat vivent donc dans `packages/plugin/tests/lois.ts`, et
`tests/exportComponent.test.ts` les applique à CHAQUE contrat que le moteur
fabrique — renvois qui se résolvent, catalogues sans doublon ni entrée
orpheline, adresses qui désignent un calque de l’arbre qui les porte, aucune
valeur neutre écrite, accord avec le schéma publié, aller-retour de l’écriture.
La vérification est posée sur le chemin d’appel, une fois, pour qu’un scénario
ajouté demain y soit soumis sans que personne y pense. Une loi ajoutée à
`lois.ts` s’applique du même geste à tous les scénarios existants.

Avant une pull request :

```sh
npm test
npm run typecheck
npm run build
```

## Documentation

Chaque document a une autorité limitée :

| Document | Rôle |
|---|---|
| `CONCEPT.md` | Principes et responsabilités |
| `UCM-EXPORTER-SPEC.md` | Comportement actuel du plugin |
| `ROADMAP.md` | État et prochaines validations |
| `PISTES-EVOLUTION.md` | Options non engagées |
| `PLAN-CONFORMITE-DEV.md` | Recherche proposée pour les prochaines phases de conformité du rendu |
| `README.md` | Entrée dans le projet |
| `AGENTS.md` | Instructions opérationnelles |

Une modification se termine par une revue des documents concernés. Décrire
l’état actuel, supprimer les formulations périmées et préférer un lien à une
répétition. L’historique appartient à Git.

### Une règle, un domicile

Une même règle écrite à deux endroits finit par diverger. Chaque endroit en
porte donc une altitude différente, et une seule fait autorité :

| Endroit | Ce qu’il porte |
|---|---|
| `UCM-EXPORTER-SPEC.md` | La règle et son pourquoi — l’autorité |
| `AGENTS.md` | La règle, sa borne, le fichier qui la porte, un lien vers la spécification |
| Commentaire de code | Ce qui ne vaut qu’à cet endroit du code |
| Nom de test | La clause vérifiable, une par test |

Ailleurs, un lien. Une mention d’une phrase à une autre altitude — le `README`
qui résume, la `ROADMAP` qui date une étape — n’est pas une répétition.

Écrire dans la spécification demande une ancre : ses titres sont les cibles des
liens d’`AGENTS.md`, et `npm test` échoue sur un lien mort.

## API Figma et build

- Préférer les variantes asynchrones de l’API, compatibles avec
  `documentAccess: dynamic-page`.
- Garder les commandes Figma isolées et testables.
- Les sources de l’interface vivent dans `src/ui/`; le build produit
  `dist/ui.html`.
- Si un changement dépend d’une évolution récente de l’API Figma, vérifier sa
  documentation officielle avant de modifier les types ou l’architecture.
