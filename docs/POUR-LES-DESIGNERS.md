# UCM pour les designers

Ce guide s'adresse à qui travaille dans Figma. Il n'attend aucune connaissance
du code et ne demande jamais d'ouvrir un terminal.

## 1. À quoi sert UCM

Un composant existe à deux endroits : votre maquette Figma, et le code de
l'application. Rien ne garantit que les deux disent la même chose. Un variant
ajouté dans Figma peut ne jamais arriver dans le code, et personne ne le voit.

UCM répond en donnant un propriétaire unique à chaque information.

| Information | Qui décide |
|---|---|
| Variantes, états, dimensions, couleurs, icônes, tokens | Vous, dans Figma |
| Comportement, clics, accessibilité | Le développeur, dans le code |
| Le fait que les deux correspondent | La CI, à chaque pull request |

Le plugin exporte ce que Figma possède dans un fichier appelé **contrat**. Ce
fichier est déposé à côté du code du composant. La CI le relit à chaque
modification et vous répond dans la pull request.

Vous n'écrivez pas de code, et le plugin n'en écrit pas non plus. Il ne modifie
jamais votre document Figma.

## 2. Préparer un composant

Le plugin lit votre composant tel qu'il est. Il n'invente rien et ne devine
rien. Ce qui suit augmente ce qu'il saura décrire.

**Liez vos valeurs à des variables.** Une couleur, un gap, un padding, un rayon
ou une taille reliés à une variable Figma entrent dans le contrat sous le nom de
cette variable. Une valeur saisie à la main n'y entre pas, et le plugin vous
prévient. Le geste attendu est toujours de nommer la valeur, jamais de la
retirer de la maquette.

**Nommez vos calques.** Le nom d'un calque est la seule identité que le contrat
et le code partagent. Un calque nommé `Frame 427` sera cité tel quel dans les
messages que vous recevrez.

**Sélectionnez un seul composant.** Le plugin attend exactement un composant ou
un set de variantes. Une autre sélection arrête l'export.

**Documentez votre intention** Un conteneur nommé
`<Nom>-Rules`, posé sur la même page, permet de décrire l'usage du composant,
les combinaisons recommandées et la politique de ses icônes.
Voir [7. Intention et documentation des props](./FORMAT.md#7-intention-et-documentation-des-props).

## 3. Exporter

Ajoutez-le depuis la Figma Community :
<https://www.figma.com/community/plugin/1678431364325816914>

Il apparaît ensuite dans votre menu `Plugins`, et propose deux commandes.

| Commande | Ce qu'elle produit |
|---|---|
| Exporter le composant | Un fichier `<Nom>.contract.json` : variantes, structure, tokens, icônes, règles d'usage |
| Exporter les tokens | Un fichier `tokens.json` : vos variables locales, avec leurs alias et leurs modes |

Le fichier est toujours téléchargeable. Si un dépôt GitHub a été configuré dans
le plugin, l'export crée en plus une branche et une pull request contenant ce
seul fichier. Le jeton d'accès reste dans le stockage local du plugin ; il
n'apparaît ni dans l'interface, ni dans les journaux, ni dans le fichier.

Un export identique à ce qui est déjà déposé n'ouvre pas de seconde pull
request. Le plugin vous dit où il a trouvé le même contenu.

## 4. Lire ce que le plugin vous répond

Un message du plugin répond toujours à trois questions, dans cet ordre.

| | Ce que vous lisez |
|---|---|
| **Où et quoi** | Le nom exact de l'élément Figma, tel qu'il s'affiche dans le panneau des calques, puis ce qui manque |
| **Et alors** | Ce que le développeur n'aura pas |
| **Comment** | Le geste à faire dans Figma |

Les termes employés sont ceux que Figma affiche à l'écran. Un message parle de
`padding`, de `corner radius` ou de `stroke weight`, jamais de leur nom dans le
code. Vous devez pouvoir chercher dans votre écran le mot que le message
emploie.

**Un message n'apparaît que s'il vous demande quelque chose.** Une
transformation que le plugin sait faire entièrement reste silencieuse. Si vous
lisez un message, il y a un geste à faire.

Trois cas seulement produisent un message :

1. le point empêche l'export ;
2. le point rend le contrat incomplet ;
3. le point demande une vérification ou une correction dans Figma.

## 5. Relire une pull request d'export

La pull request contient un seul fichier, celui que vous venez d'exporter. Son
corps porte deux zones.

**L'en-tête** dit ce qui est déposé : le chemin du fichier, et la version de
schéma du contrat. C'est ce qui permet de retrouver le composant Figma d'où il
vient, par son nom de fichier et son identifiant de nœud.

**La liste** ne porte que des gestes. Ce que le plugin a compté, ce que la pull
request liste et ce que le contrat publie sont la même liste.

Quelques minutes après, la CI ajoute un commentaire. C'est le seul message que
vous ayez besoin de lire ; vous n'avez jamais à ouvrir les journaux de la CI.

## 6. Ce qui bloque la fusion, et ce qui n'en bloque pas

Presque tous les blocages se lèvent par un réexport, et le rapport vous dit
lequel. Un seul fait exception : un contrat produit par une version du plugin
que le repository ne sait pas encore lire. Le message s'adresse alors à un
développeur, qui doit mettre l'outillage à jour ; réexporter n'y changerait
rien.

| Contrôle | Ce qu'il vérifie | Verdict |
|---|---|---|
| Validité | Le contrat est lisible et complet | Bloque |
| Version | Le repository sait lire cette version de contrat | Bloque |
| Composition | Chaque composant imbriqué a son propre contrat, les listes concordent, aucun cycle | Bloque |
| Typographie | Les tokens typographiques ont le type attendu | Bloque |
| Tokens | Les tokens cités existent dans `tokens.json` | Avertit, sauf si le fichier de tokens manque ou ne se lit pas |
| Parité code | Le code expose bien les props du contrat | Avertit |

Un écart avec le code attend un développeur, donc il avertit et laisse
fusionner. Un token supprimé du design system aussi : les tokens font foi, et un
ancien contrat ne retient pas leur évolution.

Le rapport relaie en plus deux choses qu'il ne mesure pas lui-même : les
avertissements que l'export a écrits dans le contrat, et le verdict des tests du
repository quand celui-ci le transmet.

**Un contrat peut arriver avant le code.** L'absence d'implémentation est un
état d'avancement autorisé, pas une erreur.

Sur le plan GitHub actuel, une pull request rouge reste techniquement
fusionnable. La CI détecte ; elle n'empêche pas.

## 7. Voir l'interface du plugin sans ouvrir Figma

Chaque écran du plugin, y compris ses cas d'erreur, est reproductible hors de
Figma. C'est utile pour juger une hiérarchie, une densité ou une place, et pour
relire un message avec le pire contenu réel.

```sh
npm run galerie --workspace ucm-exporter-plugin           # ouvre dist/galerie/index.html
npm run galerie:captures --workspace ucm-exporter-plugin  # produit les planches en PNG
```

Les couleurs de la galerie sont un décalque de celles de Figma. Elles servent à
juger une mise en page, jamais à conclure sur un contraste : pour cela, regardez
dans Figma, dans les deux thèmes.

## 8. Vocabulaire

Chaque terme renvoie au document qui en fait autorité. Les définitions
complètes vivent là-bas, jamais ici.

| Terme | En une phrase |
|---|---|
| **Contrat** | Le fichier `<Nom>.contract.json` exporté depuis Figma, posé à côté du code du composant. [Forme complète](./FORMAT.md#sortie) |
| **Token** | Une variable du design system, citée par son nom et jamais par sa valeur, pour qu'un changement de thème n'oblige pas à réexporter. [Nommer et citer un token](./FORMAT.md#nommer-et-citer-un-token) |
| **Variante** | Une combinaison de valeurs d'axes qui existe réellement dans votre set. Le contrat liste celles qui existent, jamais toutes celles qui seraient possibles. [1. Props](./FORMAT.md#1-props) |
| **État** | Un axe `State` ou `Status` : hover, focus, disabled. Il est publié à part des props, parce qu'il vient de l'exécution et non d'un choix d'API. [4. Modèle d'interaction](./FORMAT.md#4-modèle-dinteraction) |
| **Slot** | Un emplacement de l'arbre du composant, où se range un texte, une icône ou un composant imbriqué. [6. Structure](./FORMAT.md#6-structure) |
| **Structure** | L'arbre des calques que le contrat publie, avec leur flux et leurs alignements. [6. Structure](./FORMAT.md#6-structure) |
| **Vue** | La description exacte d'une variante, obtenue en suivant cinq renvois vers des catalogues partagés. Deux variantes identiques citent la même vue. [Sortie](./FORMAT.md#sortie) |
| **Composition** | Le fait qu'un composant en réutilise un autre. Le contrat cite la dépendance sans recopier son contenu. [Composition et dépendances](./FORMAT.md#composition-et-dépendances) |
| **Parité** | La comparaison entre les props du contrat et l'API réelle du composant dans le code. [ROADMAP](../ROADMAP.md) |
| **Couverture portable** | Le champ qui dit si l'export a tout su décrire. `complete` : rien n'est perdu. `partial` : un message nomme le calque et la propriété concernés. [Métadonnées](./FORMAT.md#métadonnées) |
| **Diagnostic** | Un message adressé à vous, avec son constat, son impact et son geste. [8. Rendu sémantique et garde-fous](./FORMAT.md#8-rendu-sémantique-et-garde-fous) |
| **Échantillon de maquette** | Ce que Figma affichait au moment de l'export : textes, valeurs. Il aide à retrouver l'esthétique voulue, et aucun contrôle ne le compare au code. [9. Échantillon de maquette](./FORMAT.md#9-échantillon-de-maquette) |
| **Adaptateur** | Un paquet optionnel qui apprend à la CI à lire le code d'une technologie donnée. Sans lui, les contrôles indépendants du langage fonctionnent quand même. [README du CLI](../packages/cli/README.md) |
| **Sonde** | Un composant reconstruit depuis son seul contrat, pour vérifier que ce contrat suffit. Une sonde se jette et se refait ; elle n'est jamais une bibliothèque |

## 9. Où aller ensuite

- [../packages/plugin/README.md](../packages/plugin/README.md) : où obtenir le
  plugin, et ce qu'il ne fait pas.
- [../README.md](../README.md) : la vue d'ensemble du projet.
- [FORMAT.md](./FORMAT.md) : la forme exacte de chaque champ, si vous voulez
  lire un contrat en détail.
- [../ROADMAP.md](../ROADMAP.md) : ce que le projet sait faire aujourd'hui, et
  ce qu'il ne prouve pas encore.
