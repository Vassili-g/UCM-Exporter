# Plan de travail — vérification de conformité côté développeur

**Statut : proposition. Aucune décision n'est prise.** Ce document sert de
support de discussion. Les points marqués **[À DÉCIDER]** sont ouverts.

---

## 1. Vocabulaire

À lire en premier si vous découvrez le projet. Cinq termes suffisent.

| Terme | Définition |
|---|---|
| **Contrat** | Un fichier JSON par composant, exporté depuis Figma et rangé à côté du code de ce composant. Il décrit la partie visuelle : les options du composant, ses couleurs par variante, ses dimensions, sa structure interne. Il ne décrit **pas** le comportement (événements, accessibilité, clavier). |
| **Token** | Une valeur du design system — une couleur, un espacement — désignée par un chemin stable, par exemple `components.button.sizes.medium.gap`. |
| **Référence de token** | L'écriture de ce chemin entre accolades : `{components.button.sizes.medium.gap}`. Le contrat ne recopie jamais la valeur, il cite toujours le chemin. Le code la traduit en variable CSS : `var(--components-button-sizes-medium-gap)`. |
| **Axe et combinaison** | Un axe est une option qui change l'apparence : `color`, `variant`, `size`, `state`. Une combinaison est un choix de valeur sur chaque axe, par exemple `primary / contained / medium / default`. L'ensemble des combinaisons forme la **matrice** du composant. |
| **Slot** | Un emplacement nommé à l'intérieur du composant : `label`, `icon`, `action`. Le contrat les liste et décrit leur disposition. |

Deux mots employés dans le code existant :

- **parité** : vérification que les options déclarées dans le contrat existent
  bien dans l'API publique du composant écrit en code ;
- **garde-fou** : le nom donné dans le code à un contrôle automatique. Ce
  document dit simplement « contrôle ».

---

## 2. Le principe du projet

Une règle gouverne tout le reste : **aucun contrôle ne connaît le nom d'un
composant**. Les contrôles sont pilotés par la forme du contrat, jamais par des
cas particuliers. Ajouter un composant ne doit demander aucune modification de
l'outillage.

Une seconde règle, développée dans [CONCEPT.md](./CONCEPT.md) : **le code ne
lit pas le contrat quand l'application tourne**. Sans elle, la vérification
n'aurait plus de témoin indépendant.

---

## 3. Ce qui existe aujourd'hui

Forme et version du contrat, existence des tokens, graphe de composition,
parité, références de tokens du code, construction : ces contrôles tournent à
chaque pull request et produisent un message unique, dans le terminal comme en
commentaire. [ROADMAP.md](./ROADMAP.md) en tient l'état.

**Ce qui manque : la vérification du rendu.** Rien ne prouve, de façon
générique, que le composant affiche réellement la bonne couleur, la bonne
dimension et la bonne disposition pour chaque combinaison. Cette vérification
n'existe que dans des fichiers de test écrits à la main, un par composant, ce
qui contredit la règle du point 2.

---

## 4. Où ça intervient dans le workflow

Le workflow est décrit par [CONCEPT.md](./CONCEPT.md). Ce qui compte ici : les
contrôles tournent en local pendant l'écriture ET en CI au push, avec le même
rapport et les mêmes mots, et un réexport ultérieur fait apparaître l'écart
quand le design a changé sans que le code suive.

---

## 5. Architecture proposée

Sept blocs. Les blocs A à D forment le cœur de la proposition ; E à G sont
utiles mais indépendants.

```
A. Conventions          ce que le code doit respecter pour être vérifiable
B. Comparateur          la fonction qui compare un contrat à un rendu
C. Vérificateur         ce qui affiche les composants et parcourt les matrices
D. Rapport              le branchement dans le message existant
E. Boucle locale        commandes et retour dans l'éditeur
F. Verrou de fusion     empêcher, et non seulement détecter
G. Extraction           réutilisation dans plusieurs repositories
```

---

## Bloc A — Conventions

### À quoi ça sert

Un contrôle générique doit pouvoir, sans connaître le composant : l'importer,
l'afficher dans une combinaison donnée, et retrouver chaque slot dans le
résultat affiché. Trois conventions suffisent. **Deux existent déjà.**

| Convention | État | Ce qu'elle permet |
|---|---|---|
| Le dossier d'un composant contient son contrat, son code et un `index.ts` qui l'exporte | Déjà en place | Importer n'importe quel composant sans liste ni configuration. |
| Un axe de variante porte le même nom que l'option correspondante du composant | Déjà garanti par l'exporteur | Passer une combinaison au composant en la transmettant directement comme options. |
| Chaque slot porte son nom dans le résultat affiché, sous la forme d'un attribut `data-ucm-slot="label"` | **À adopter** | Retrouver précisément chaque slot dans le HTML produit. |

### Quand ça intervient

Au moment où le développeur écrit le composant. Une ligne par slot, écrite une
seule fois. Rien à maintenir ensuite.

```tsx
{label ? <span data-ucm-slot="label" style={…}>{children}</span> : null}
{iconLeft ? <Icon data-ucm-slot="icon" data-ucm-icon={nom} … /> : null}
```

### Étapes

1. Écrire la convention dans la documentation du repository consommateur.
2. L'ajouter aux composants existants (Button, Alert).
3. L'ajouter à la procédure suivie pour écrire un nouveau composant.

### Ce que ça ne fait pas

Cet attribut ne change rien à l'affichage : la page est identique avec ou sans
lui. Il ne fait entrer aucune donnée de design dans le code. Il sert uniquement
à rendre le composant observable.

### [À DÉCIDER]

- Adopte-t-on cet attribut ? C'est le point qui conditionne tout le reste. Sans
  lui, retrouver un slot demande du code écrit pour chaque composant, ce qui
  ramène au problème actuel.
- Le laisse-t-on en production, ou le retire-t-on à la construction ? Le
  retirer signifie vérifier autre chose que ce qui est livré.

---

## Bloc B — Comparateur

### À quoi ça sert

C'est le cœur de la proposition : **une fonction qui reçoit un contrat, une
combinaison et le HTML produit, et rend la liste des écarts.** Elle ne dépend
d'aucun framework, ne connaît aucun composant, et n'affiche rien elle-même.

C'est aussi la partie réutilisable dans n'importe quel repository, quelle que
soit la technologie utilisée pour afficher les composants.

### Quand ça intervient

Elle est appelée par le bloc C, une fois par combinaison de chaque composant.

### Ce qu'elle vérifie

| Donnée du contrat | Ce qui est comparé |
|---|---|
| Couleurs par combinaison | Chaque rôle déclaré (fond, texte, icône) est peint avec le token du contrat, et un rôle absent n'est peint par rien. |
| Bordures et contours | Couleur et épaisseur présentes ensemble. Une épaisseur absente ne doit rien afficher. |
| Typographie | Les cinq propriétés du style de texte arrivent sur le slot désigné par le contrat. |
| Dimensions | Espacement interne, marges et rayon des angles pour la taille en cours. |
| Disposition | Sens et alignement du conteneur, et les exceptions déclarées sur chaque slot. |
| Occupation de la place | Comment le composant occupe la largeur et la hauteur qu'on lui donne. |
| Icônes | L'icône affichée est celle que le contrat associe à cette combinaison, et pas une autre. |
| Visibilité | Une option qui masque un slot le fait réellement disparaître, sans emporter ses voisins. |
| Composants imbriqués | Le contenu d'un composant embarqué est exclu : il relève de son propre contrat. |
| Valeurs écrites en dur | Aucune couleur ni dimension brute ne subsiste dans le résultat. |

### Règle à respecter impérativement

**Le comparateur n'affirme jamais plus précisément que le contrat.**

Exemple : le contrat range les couleurs par rôle (« fond », « texte »), sans
dire sur quel élément exact elles se posent. Le comparateur vérifie donc que la
variable est employée quelque part dans le composant, avec un usage compatible
— jamais « sur tel élément », que le contrat ne dit pas. À l'inverse, la
typographie est rattachée à un slot précis : là, la vérification est exacte.

Sans cette règle, le comparateur imposerait une façon d'écrire le code, et
deviendrait une source de vérité concurrente du contrat.

### Étapes

1. Définir le format d'un écart : composant, combinaison, slot, attendu, obtenu.
2. Écrire les dix familles de comparaison ci-dessus.
3. Les tester sur des fragments de HTML écrits à la main, sans afficher aucun
   composant réel. Cette partie doit pouvoir être validée seule.

### Effort indicatif

3 à 4 jours.

---

## Bloc C — Vérificateur de rendu

### À quoi ça sert

C'est la partie qui trouve les composants, les affiche dans chaque combinaison,
et appelle le comparateur. Un seul fichier, identique dans tous les
repositories, qui ne mentionne aucun composant.

### Quand ça intervient

À chaque exécution des contrôles : en local pendant le développement, et en CI
sur chaque pull request.

### Comment il procède

1. Il trouve tous les contrats du repository.
2. Pour chacun, il importe le composant depuis le dossier voisin.
3. Il lit les axes dans le contrat et construit toutes les combinaisons.
4. Pour chaque combinaison, il affiche le composant et appelle le comparateur.
5. Il affiche en plus chaque option de visibilité à `vrai` puis à `faux`, pour
   vérifier que le slot concerné apparaît et disparaît.
6. Si un composant ne peut pas être affiché, il le signale explicitement au
   lieu de l'ignorer.

### Découpage important

Ce bloc contient la seule partie liée à la technologie utilisée : environ
trente lignes qui savent importer un composant React et produire son HTML.
Tout le reste — la logique de comparaison du bloc B — n'en dépend pas.

Changer de technologie plus tard revient à réécrire ces trente lignes, jamais
les vérifications.

### Ce que ça ne fait pas

Un affichage sans navigateur n'atteint pas les états déclenchés par la souris
ou le clavier : survol, focus, appui. Tout ce qui passe par une option du
composant, comme « désactivé », est couvert. Le reste demande un environnement
de navigateur simulé.

### Étapes

1. Écrire la découverte des contrats et l'import des composants.
2. Écrire la couche d'affichage React.
3. Écrire le parcours des combinaisons et des options de visibilité.
4. Ajouter l'attribut du bloc A à Button et Alert.
5. Vérifier que le résultat est vert sur ces deux composants.
6. Retirer les deux fichiers de vérification écrits à la main, dans le même
   changement, et mettre à jour les documents qui les décrivent.

### [À DÉCIDER]

- Couvre-t-on les états d'interaction ? Cela suppose un environnement de
  navigateur simulé, donc une dépendance supplémentaire et un temps
  d'exécution plus long.
- Que fait-on d'un composant qui ne peut pas être affiché seul, parce qu'il
  a besoin d'un contexte applicatif ? Proposition : un avertissement nommé et
  compté, jamais un silence.

### Effort indicatif

2 à 3 jours.

---

## Bloc D — Rapport

### À quoi ça sert

Le repository produit déjà un message unique, publié dans le terminal et en
commentaire de pull request. Chaque constat y désigne son responsable : le
designer, ou le développeur. Les écarts trouvés par le vérificateur doivent
entrer dans ce message, et pas dans une sortie séparée.

### Quand ça intervient

À la fin de chaque exécution des contrôles.

### Point technique à traiter

Le code actuel attribue un échec à un composant en lisant le nom du fichier de
test qui a échoué. Si le vérificateur vit ailleurs, ses échecs seront présentés
comme une panne de l'outillage — donc avec le mauvais responsable et le mauvais
message. Il faut soit qu'il produise un nom rattachable au composant, soit
adapter cette attribution.

### Étapes

1. Ajouter une section « écarts de rendu » au message, avec pour chaque écart :
   le composant, la combinaison, ce que dit le contrat, ce qui est affiché.
2. Corriger l'attribution du responsable.
3. Afficher en tête un décompte : combien de composants vérifiés, combien en
   écart, combien non vérifiables.

### Effort indicatif

1 jour.

---

## Bloc E — Boucle locale et éditeur

### À quoi ça sert

Réduire le délai entre l'erreur et sa découverte. Aujourd'hui, un développeur
découvre la plupart des écarts après avoir lancé une commande, ou en CI.

### Quand ça intervient

Pendant l'écriture du code.

### Étapes

1. Permettre de limiter les contrôles à un composant ou aux fichiers modifiés.
2. Ajouter la vérification des types TypeScript à la commande de contrôle.
   Actuellement elle n'y est pas, donc un résultat vert en local peut devenir
   rouge en CI.
3. Reprendre dans le message deux informations du contrat qui n'y figurent
   pas : les avertissements produits par l'export, et la date de l'export.
4. Optionnel : trois règles d'éditeur qui signalent en direct un chemin de
   token construit morceau par morceau, une référence absente du contrat, et
   une couleur écrite en dur.

### [À DÉCIDER]

- Fait-on les règles d'éditeur ? Elles supposent d'installer et configurer
  ESLint, qui n'est pas présent aujourd'hui.
- Branche-t-on les contrôles sur un `git push` ? Si oui, en avertissement
  plutôt qu'en blocage : un blocage se contourne, et l'habitude se garde.

### Effort indicatif

2 jours, dont 1 pour les règles d'éditeur.

---

## Bloc F — Verrou de fusion

### À quoi ça sert

Aujourd'hui, les contrôles détectent les écarts mais **n'empêchent pas** de
fusionner une pull request en échec. La protection de branche n'est pas
disponible sur le plan GitHub actuel des deux repositories.

### Quand ça intervient

Au moment de la fusion.

### Étapes

1. Trancher la question du plan GitHub ou de la visibilité des repositories.
2. Activer la protection de branche sur `main`.
3. Déposer un fichier `CODEOWNERS` désignant qui valide quoi.

### Pourquoi c'est important

Sans ce bloc, tous les autres restent consultatifs. Ce n'est pas un
développement, c'est un arbitrage.

### [À DÉCIDER]

Qui porte cette décision, et sous quel délai ?

---

## Bloc G — Extraction multi-repository

### À quoi ça sert

Permettre à un second repository d'utiliser les mêmes contrôles sans les
recopier.

### Quand ça intervient

Au moment où un deuxième repository consomme des contrats. **Pas avant** :
publier et maintenir des paquets pour un seul utilisateur coûte plus que ça ne
rapporte.

### Découpage visé

| Paquet | Contenu | Réutilisable tel quel |
|---|---|---|
| Cœur | Contrôles de contrat, de tokens, de parité, comparateur, rapport | Oui |
| Couche d'affichage | Import et affichage des composants | Un par technologie |
| Règles d'éditeur | Les trois règles du bloc E | Oui |
| Workflow GitHub | Exécution et publication du commentaire | Oui |

### Ce qu'il faut faire dès maintenant

Rien à publier, mais **une chose à respecter dès le bloc B** : garder la
séparation entre le cœur, qui ne dépend d'aucune technologie, et la couche
d'affichage. Si cette séparation n'est pas posée au départ, l'extraction
devient une réécriture.

### Effort indicatif

2 jours, le jour où c'est utile.

---

## 6. Ce qui ne sera pas vérifié

À annoncer clairement à côté des contrôles, pour éviter qu'on leur prête des
garanties qu'ils n'ont pas.

- **La ressemblance avec la maquette Figma.** Rien ne compare des images. Les
  contrôles prouvent que le composant emploie les valeurs du contrat, pas qu'il
  ressemble à la maquette.
- **La fraîcheur d'un export.** Aucun contrôle ne peut prouver qu'un contrat
  correspond au dernier état du document Figma. La date d'export peut être
  affichée, l'état ne peut pas être garanti.
- **L'ordre de priorité des états.** Vérifier que « désactivé » l'emporte sur
  « survol » demanderait un vrai navigateur.
- **La propriété CSS employée pour un rôle.** Peindre un fond avec
  `background` ou `background-color` reste un choix du développeur.
- **Le comportement applicatif.** Événements, clavier, accessibilité : le
  contrat ne les décrit pas, donc les contrôles ne les vérifient pas. Si des
  tests de comportement sont utiles à l'application, ils existent séparément et
  ne sont jamais présentés comme une preuve de conformité au design.

---

## 7. Règle de sévérité proposée

| Niveau | Signification | Exemples |
|---|---|---|
| **Bloquant** | Un écart a été constaté. | Token inexistant, option manquante, et tout écart de rendu constaté par le vérificateur : couleur comme disposition. |
| **Avertissement** | La vérification n'a pas pu avoir lieu. Ce n'est pas un écart moins grave, c'est un trou dans la preuve. | Composant impossible à afficher, état d'interaction non couvert, avertissement produit par l'export. |
| **Informatif** | État d'avancement, aucune action attendue. | Contrat sans composant associé, nombre de combinaisons vérifiées. |

**Point à discuter :** faut-il traiter la disposition et l'architecture
différemment des couleurs ? La proposition dit non : dès lors que l'écart est
constaté sur un affichage réel, la nature de la donnée ne change rien. Un
contrôle constaté mais non bloquant ne sera jamais corrigé.

### [À DÉCIDER]

Le vérificateur bloque-t-il dès sa mise en service, ou avertit-il pendant une
période d'observation ?

---

## 8. Ordre proposé

| Ordre | Bloc | Effort indicatif | Dépend de |
|---|---|---|---|
| 1 | B — Comparateur | 3–4 j | — |
| 2 | A — Conventions | inclus | décision préalable |
| 3 | C — Vérificateur | 2–3 j | A et B |
| 4 | D — Rapport | 1 j | C |
| 5 | E — Boucle locale | 2 j | indépendant |
| — | F — Verrou de fusion | décision | à lancer en parallèle dès maintenant |
| — | G — Extraction | 2 j | second repository |

Total indicatif pour les blocs A à E : **8 à 10 jours de développement**.

Le bloc F ne consomme aucun jour de développement mais conditionne l'utilité de
tous les autres : tant qu'une pull request en échec reste fusionnable, les
contrôles restent des recommandations.

---

## 9. Questions à trancher, récapitulatif

1. Adopte-t-on l'attribut `data-ucm-slot` dans le code des composants ?
2. Le laisse-t-on en production ?
3. Retire-t-on les deux fichiers de vérification actuels dans le même
   changement que la mise en service du vérificateur ?
4. Le vérificateur bloque-t-il dès sa mise en service ?
5. Couvre-t-on les états d'interaction, et à quel moment ?
6. Que fait-on d'un composant impossible à afficher seul ?
7. Installe-t-on les règles d'éditeur ?
8. Qui porte la décision sur le plan GitHub, et sous quel délai ?
9. À quel moment extrait-on les paquets réutilisables ?
