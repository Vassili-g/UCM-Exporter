# Aligner `tokens.json` sur le module de format DTCG `2025.10`

**Statut : non engagé.** La forme publiée est celle de
[FORMAT.md](../FORMAT.md#partie-2--export-tokens). Le
[plan d'implémentation](./PLAN-ALIGNEMENT-DTCG.md) donne l'ordre des étapes si
une condition de reprise survient. Les changements de compatibilité relèvent de
[COMPATIBILITE.md](../COMPATIBILITE.md).

Cette note justifie la décision. Le plan porte les étapes et leurs critères de
fermeture.

## 1. La décision

L'export garde sa grammaire. Le fichier Figma du Playground est en sRGB : sur ce
fichier, les deux premières tranches ne changent ni le CSS produit ni un verdict
du kit (section 2). Elles coûtent pourtant trois publications de paquets, un
réexport et une publication sur la Community (section 3).

Trois conditions rouvrent la décision :

- un fichier Figma exporté est en Display P3 : l'export actuel écrit ses
  couleurs comme du sRGB ;
- un deuxième consommateur, ou un outil qu'un consommateur emploie, exige le
  module Format `2025.10` ;
- la projection des tokens change pour une autre raison, ce qui impose déjà la
  marque de grammaire
  ([COMPATIBILITE.md](../COMPATIBILITE.md#pourquoi-tokensjson-na-pas-de-version)).

Une reprise suit trois tranches. Elles sont séparées par ce qui casse un
consommateur et par ce qui dépend d'un fait que seul Figma détient.

| Tranche | Contenu | À la reprise |
|---|---|---|
| Valeurs | Dimension en `{ value, unit }` ; graisse `STRING` reconnue en `$type: "number"`, avec son poids numérique ; marque `$extensions["com.ucm.grammaire"]` au niveau du document | Après le passage du consommateur à Style Dictionary 5 |
| Profil colorimétrique | Couleur en `{ colorSpace, components, alpha }`, espace lu dans `documentColorProfile` | Dans la même publication que les valeurs pour un fichier en `SRGB` ou `LEGACY` ; après une comparaison visuelle pour un fichier en `DISPLAY_P3` |
| Typage de la famille | `fontFamily` à la place de `string` | Différée |

Le module Resolver, le traitement dédié du booléen et le typage par contexte
sont hors de cette décision.

### Ce qu'une reprise promet

« Aligner sur DTCG » recouvre quatre questions distinctes.

| Question | Promesse | Contrôle |
|---|---|---|
| Conformité au module Format | Toutes les feuilles, sauf les `STRING` hors graisse reconnue, les `BOOLEAN`, les feuilles dont la cible d'alias est absente, et les `EASING` et `TIMING` tant que le plan ne les a pas traités | Test du plugin qui applique à chaque feuille la définition `token.json` du schéma figé, avec un compte qui ne peut pas monter |
| Interopérabilité | Lecture par Style Dictionary 5 et ses transforms standard. Aucun autre outil n'est visé ni essayé | `diff` du CSS du Playground |
| Fidélité à Figma | Composantes de couleur sans quantification, profil déclaré | Comparaison visuelle consignée dans la pull request du Playground, lors de la tranche du profil |
| Lecteurs UCM | Aucun verdict ne change pour les deux premières tranches | Lecture du fichier réexporté par le kit publié et par le kit qu'épingle le Playground : zéro référence absente, zéro erreur de type |

### Les politiques retenues

- **Booléens et chaînes quelconques.** Ils restent au même chemin, avec
  `$type: "boolean"` ou `"string"`, et le fichier se déclare dialecte sur ces
  feuilles. Les exclure réduirait la portée publiée de la commande, « toutes
  les variables locales ». Les déplacer sous `$extensions` changerait
  l'adressage que les contrats citent.
- **Modes.** `com.ucm.modes` garde sa forme : un dictionnaire indexé par nom de
  mode, dont les noms passent par le même assainissement que les segments de
  chemin. Seule la forme de ses valeurs change. La décision ne publie ni axe, ni
  mode par défaut explicite, ni combinaison entre collections ; la
  [piste 2.4](./PISTES-EVOLUTION.md#24-consommer-les-modes-figma--marques-et-clairsombre)
  porte cette question.
- **Erreurs de graphe.** L'export ne refuse jamais le fichier et n'en exclut
  aucune feuille. Une cible absente sort en `$value: null` avec un
  avertissement, et le schéma juge cette feuille non conforme. Figma refuse de
  créer un cycle d'alias
  ([API REST](https://developers.figma.com/docs/rest-api/variables-endpoints/)).
- **Inférence du type.** La décision n'ajoute qu'une inférence, celle de la
  graisse. Elle reprend la règle de segment que `FORMAT.md` publie déjà pour
  `number`, et la restreint : la valeur doit être un nom de graisse connu dans
  chaque mode. L'autorité du type d'une `STRING` quelconque reste à décider
  avant le typage de la famille.

## 2. Les mesures

**Méthode.** Le schéma Format `2025.10` publié par
[designtokens.org](https://www.designtokens.org/schemas/2025.10/format.json) est
compilé par Ajv 8 en draft-07, avec `strict: false`. Sa définition `token.json`
est appliquée à chacune des 721 feuilles du `tokens.json` du Playground, et le
schéma entier au document. Le CSS est produit par la configuration du
Playground, sous Style Dictionary 4.4.0 (la version installée) et 5.5.3, puis
comparé par `diff` au fichier généré au commit courant. Les lecteurs sont
`indexerTokensDtcg` et `erreursTypesTypographiques` du kit, appliqués aux
quatre contrats du Playground. Le plan prévoit le script qui rejoue ces
mesures.

Les variantes sont des transformations du fichier actuel. Leurs composantes de
couleur sont dérivées de l'hexadécimal, et la table de poids ne couvre que les
trois noms du corpus : `Regular`, `SemiBold` et `Bold`. Les valeurs sous
`com.ucm.modes` restent en hexadécimal. Ni le schéma ni Style Dictionary ne
lisent ces valeurs de mode : aucun chiffre ci-dessous n'en dépend.

| Variante | Feuilles conformes | Lecteurs du kit | CSS sous Style Dictionary 5.5.3 | CSS sous Style Dictionary 4.4.0 |
|---|---|---|---|---|
| Fichier actuel | 529 / 721 | 0 erreur | identique à l'octet | référence |
| Couleurs et dimensions en objets, graisse en nombre | 720 / 721 | 0 erreur | identique à l'octet | 173 déclarations `[object Object]`, build sans erreur |
| Même variante, couleurs laissées en hexadécimal | 618 / 721 | 0 erreur | identique à l'octet | 71 déclarations `[object Object]` |
| Même variante, couleurs en `display-p3` | 720 / 721 | 0 erreur | 97 lignes changées | non mesuré |
| Deuxième variante, graisse en `fontWeight` | 720 / 721 | 8 erreurs bloquantes, sur 3 contrats de 4 | identique à l'octet | non mesuré |
| Deuxième variante, famille en `fontFamily` | 721 / 721 | 8 erreurs bloquantes, sur 3 contrats de 4 | 1 ligne changée | non mesuré |

Les 192 écarts du fichier actuel se répartissent en 102 couleurs littérales,
71 dimensions littérales et 19 feuilles `$type: "string"` : une famille et
18 graisses. Les 529 feuilles conformes sont toutes des alias. Le schéma
vérifie la forme `{…}` d'une référence, jamais l'existence ni le type de sa
cible. Le document entier n'est valide que dans la dernière variante, où
toutes les feuilles sont conformes ; ailleurs, le compte par feuille localise
les écarts.

Le fichier compte 187 segments de chemin distincts, et aucun ne contredit le
motif de nom du module, `^[^${}.][^{}.]*$`.

Sous Style Dictionary 5, avec le groupe `css` :

- une graisse `fontWeight` écrite `semi-bold` sort `semi-bold`, valeur
  invalide pour la propriété
  [`font-weight`](https://www.w3.org/TR/css-fonts-4/#font-weight-prop) ; `600`
  sort `600` ;
- `fontFamily/css` écrit `'Open Sans'`, sans le repli `, sans-serif` que le
  transform du Playground ajoute. Les deux transforms réunis écrivent
  `"'Open Sans'", sans-serif`, et le navigateur cherche alors une famille dont
  le nom contient les apostrophes : c'est la ligne changée de la dernière
  variante ;
- une couleur `display-p3` hors du gamut sRGB est ramenée dans ce gamut puis
  écrite en hexadécimal : `#00fb29` pour le vert P3 pur. Le transform
  `color/p3` convertit toutes les couleurs vers Display P3, sRGB comprises ;
- une couleur translucide sort `rgba(…, 0.5)`, là où `#ffffff80` donnait
  `0.50196…`. Le corpus n'en contient aucune.

## 3. Pourquoi ne pas engager la tranche des valeurs

[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md#23-produire-les-ressources-de-tokens)
nomme trois déclencheurs qui rendraient nécessaire une décision de grammaire :
un deuxième consommateur, un outil cible qui exige `2025.10`, ou la première
évolution de la projection. Aucun n'est survenu, et le Playground lit le
fichier actuel sans défaut. Rien n'impose donc l'alignement.

La tranche a deux effets. Le premier : sous Style Dictionary 5, la
tranche ne change ni le CSS du Playground ni un verdict du kit. Le second : elle
ferme la seule perte d'information de l'export. Un document en Display P3 sort
aujourd'hui comme s'il était en sRGB, et ses canaux sont arrondis à l'octet.
Seul l'objet couleur du module porte l'espace et les flottants. L'export sert
tout fichier Figma, et cette perte ne se répare pas depuis le JSON. Les
dimensions et la graisse suivent dans la même publication, parce qu'elles
exigent le même passage à Style Dictionary 5.

Le fichier du Playground est en sRGB : ce consommateur n'en verrait aucun effet
à l'écran. La perte d'information ne touche qu'un fichier en Display P3, et le
projet n'en connaît aucun.

Ce que chaque changement rapporterait :

- **Un contrôle.** Un test UCM applique à chaque feuille la définition
  `token.json` du schéma publié et rend 720 conformes sur 721. Le document
  entier reste refusé tant que la famille est en `string`. Ce jugement porte
  sur la forme : une dimension bien formée attribuée à une opacité passe le
  schéma.
- **Une graisse typée d'une seule façon.** Le moteur sort déjà en `number` une
  graisse stockée en `FLOAT`, et en `string` la même graisse stockée en
  `STRING`. La tranche retire cet écart, et le Playground peut retirer le
  transform `fontWeight/name-to-number`.
- **Un profil déclaré.** Pour un document en Display P3, le groupe `css`
  convertit chaque couleur vers sRGB. Les 97 lignes qui changent corrigent donc
  une couleur que le fichier actuel fait lire comme sRGB. Un rendu en gamut
  large demanderait en plus un transform qui lit `colorSpace`.
- **Des composantes sans quantification.** Les flottants de Figma remplacent
  l'octet. Le groupe `css` de Style Dictionary 5 les ramène à l'octet : seul un
  lecteur qui garde les flottants en profite. L'effet sur le corpus n'est pas
  mesuré, les variantes dérivant leurs composantes de l'hexadécimal.

Le coût est du travail : le passage du consommateur à Style Dictionary 5, trois
publications de paquets, un réexport depuis Figma et une publication sur la
Community. Seul le passage à Style Dictionary 5, avec la mise à jour de la
version épinglée du CLI, se répète pour chaque consommateur. Il ne pèse que sur
un consommateur qui branche la grammaire actuelle avant le changement ; le
projet en connaît un.

**Risque.** Un consommateur resté sur Style Dictionary 4 recevrait
`[object Object]` à la place de chaque couleur et de chaque dimension, sans
échec de build. Ni la marque de grammaire ni le kit ne le protègent : un
lecteur ancien ignore la marque, et le kit ne lit pas les valeurs. Le plan fait
passer le seul consommateur connu à Style Dictionary 5 avant le réexport. La
classe de compatibilité que le plan ajoute nomme ce geste pour un repository
qui emploie le kit. Le plugin est public sur la Community : un utilisateur qui
lit `tokens.json` sans le kit ne l'apprendrait que par le README du plugin et
par sa page Community.

**Bilan.** Sur le fichier du Playground, la tranche ne change aucun rendu.
L'alignement ne s'engage donc qu'à l'une des conditions de la section 1.

À la reprise, la tranche des valeurs serait la première évolution de la
projection : `COMPATIBILITE.md` lui impose la marque de grammaire. Elle
rouvrirait aussi le typage de la famille, que la section suivante diffère.

## 4. Pourquoi différer le typage de la famille

La graisse serait réglée par la tranche des valeurs : `number` donne le même
compte conforme et le même CSS que `fontWeight`, sans ses 8 erreurs.

Le typage `fontFamily` gagne une feuille, la famille, et rend le document
entier valide. Il produit 8 erreurs bloquantes chez un consommateur dont le
kit n'a pas été mis à jour, et leur message demande de corriger l'exporteur.
La tranche des valeurs élargirait les types que le lecteur typographique
tolère : ces erreurs ne toucheraient pas un repository qui a adopté cette
version.

Le typage reste différé pour deux raisons qui ne dépendent pas de cette
fenêtre :

- **L'autorité du type d'une `STRING`.** La règle de segment suffit pour la
  graisse, parce que `poidsDeGraisse` vérifie la valeur dans chaque mode.
  Aucune liste ne vérifie un nom de famille : la même règle typerait
  `fontFamily` toute chaîne rangée sous un segment `fontfamily`. Figma n'offre
  que le scope `FONT_FAMILY`, et ce scope n'est pas obligatoire.
- **Le CSS du Playground.** Sous Style Dictionary 5, le typage change la
  famille en `"'Open Sans'"`, qu'aucune police installée ne porte. Le
  Playground doit corriger `fontFamily/css-quote`, ou retirer `fontFamily/css`
  de son groupe, avant de recevoir ce type.

Le [plan](./PLAN-ALIGNEMENT-DTCG.md#phase-4--différée--le-typage-fontfamily)
nomme les conditions de sa reprise.

## 5. Les options écartées

| Option | Raison |
|---|---|
| Typer la graisse par le scope `FONT_WEIGHT` | Figma réserve ce scope aux `FLOAT`. Une `STRING` ne dispose que de `ALL_SCOPES`, `TEXT_CONTENT`, `FONT_FAMILY` et `FONT_STYLE` ([VariableScope](https://developers.figma.com/docs/plugins/api/VariableScope/)). Les 18 graisses du corpus sont des `STRING` : aucune ne serait typée |
| `$type: "fontWeight"` avec un mot-clé du module | Style Dictionary 5 recopie `semi-bold` dans le CSS, où il est invalide ; le lecteur typographique publié refuse ce type |
| `$type: "fontWeight"` avec un nombre | 8 erreurs bloquantes sur 3 contrats de 4, sans feuille conforme de plus, pour le même CSS que `number` |
| Repli `hex` dans l'objet couleur | Style Dictionary 5 ne lit `hex` que pour une couleur hors du gamut sRGB, qu'il sait déjà ramener dans ce gamut, et Style Dictionary 4 ne lit pas l'objet. Le repli remplacerait le choix de Style Dictionary par celui du plugin, et devrait être calculé dans le plugin |
| Contrôle de conformité chez le consommateur | Le test du plugin trouve l'écart une fois, avant la publication. Chez le consommateur, il apparaîtrait après, dans chaque repository, sans geste possible pour le designer ni pour le mainteneur du repository |
| Paquet tiers de validation | Ajv, déjà dépendance du kit, compile le schéma publié. La documentation de `@styleframe/dtcg` présente `string` comme un type conforme |
| Une feuille standard par variable, au même chemin | Impossible sans perte tant que Figma publie des `STRING` quelconques et des `BOOLEAN` : le fichier se déclare dialecte sur ces feuilles |
| Projection stricte dérivée, publiée à côté du `tokens.json` actuel | Elle protégerait un consommateur resté sur Style Dictionary 4. Le Playground continuerait pourtant de lire le fichier actuel, sans profil déclaré ni graisse typée, et le plugin comme la pull request d'export porteraient un second artefact. Elle redevient l'option à retenir le jour où coexistent un consommateur sur Style Dictionary 4 que le projet ne migre pas et un outil qui exige le module strict |
| Module Resolver | Aucun outil installé ne le lit. Le seul second mode du corpus vaut `#ffffff` sur ses dix tokens |
| Retrait du transform `fontFamily/css-quote` | Il porte le repli `, sans-serif`, qui est une décision de l'application |

## 6. Les contraintes que l'implémentation respecte

- **Style Dictionary est le seul lecteur de valeurs du flux.**
  `indexerTokensDtcg` reconnaît une feuille à la présence de `$value`.
  `erreursTypesTypographiques` ne lit `$value` que pour suivre un alias, et
  `cheminDeReference` rend `null` sur un objet. L'absence d'erreur du kit ne
  prouve donc pas qu'un consommateur lit le fichier.
- **Le type se décide sur la racine, dans le mode par défaut.** `buildLeaf`
  appelle `dtcgType` avec la racine de la chaîne d'alias suivie par le mode par
  défaut, et avec les scopes de cette racine. Une règle qui dépend de la valeur
  doit vérifier chaque mode.
- **Le schéma ne lit pas `$extensions`.** Il le déclare `{"type": "object"}`.
  Les valeurs de `com.ucm.modes` demandent un contrôle propre à UCM : chacune a
  la forme du `$type` de sa feuille.
- **Un segment qui commence par `$` fait disparaître un token.**
  [`indexerTokensDtcg`](../../packages/kit/src/lecteurs/tokens-dtcg.mjs) saute
  toute clé en `$`, et `normalizeName` conserve ce caractère. Le point commun
  aux deux commandes du plugin est `joinTokenPath`
  ([`variables.ts`](../../packages/plugin/src/variables.ts)). Un nom de
  variable ne produit pas ce segment : Figma y refuse `.`, `{` et `}`
  ([API REST](https://developers.figma.com/docs/rest-api/variables-endpoints/)),
  et l'éditeur refuse un `$` de tête. Le nom de la collection forme le premier
  segment du chemin, et aucune de ces règles ne le vise.
- **`EASING` et `TIMING` sont des types de variable Figma.** `dtcgType` les
  range en `string`, et une `EASING` y porte un objet `MotionEasing`. Le module
  définit `duration` et `cubicBezier`, mais un ressort, que `MotionEasing` sait
  décrire, n'a pas d'équivalent dans `cubicBezier`.
- **Un document `LEGACY` ne porte aucun profil.** Un réexport ne le retrouve
  pas. Seul un humain peut fixer le profil dans Figma, et le plugin ne modifie
  jamais le document
  ([gestion des profils](https://help.figma.com/hc/en-us/articles/360039825114-Manage-color-profiles-in-design-files)).
- **Les avertissements de l'export n'entrent pas dans `tokens.json`.** Une CI
  ne peut pas les relire depuis le fichier.
- **Aucun `tokens.json` n'est figé dans le dépôt.** La compatibilité des
  lecteurs avec un fichier ancien n'a pas encore de fixture.
- **Les classes de [COMPATIBILITE.md](../COMPATIBILITE.md#les-neuf-classes-de-changement)
  ne couvrent pas un changement de grammaire de `tokens.json`.** La classe 5
  porte sur le nom d'un token.
- **Le Playground épingle la version du CLI** dans son workflow. Une nouvelle
  version du kit ne l'atteint qu'après la mise à jour de cette ligne.

## 7. Les limites des mesures

- Les variantes dérivent du fichier actuel. Elles ne mesurent ni un export réel
  (flottants de Figma, couleurs translucides), ni un document en Display P3.
- Le corpus compte 721 feuilles et un consommateur connu. Il ne contient ni
  booléen, ni `$value` nul, et son second mode n'a pas de valeur
  réelle. Il établit l'absence de régression sur ces valeurs, sans établir la
  généralité du typage.
- Aucun contrôle visuel n'a été mené. Le rendu d'une couleur P3 se juge à
  l'œil, sur la pull request qui porte le réexport.
