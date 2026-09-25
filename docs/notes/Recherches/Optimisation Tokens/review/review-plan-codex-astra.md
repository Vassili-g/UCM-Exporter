# Revue de conception de l'implémenteur de contrats

> Statut : avis de conception destiné à l'architecte. Recommandation : ne pas
> engager les lots 0 à 6 comme un programme acquis. Éprouver d'abord le besoin
> de contrôle du rendu et une extraction limitée des données mécaniques.
>
> Lu : les neuf sources demandées, les quatre contrats et leurs quatre
> implémentations, les règles de contribution et les lecteurs cités ci-dessous.
> L'étude de génération, le plan de réduction et le plan de conformité ont été
> consultés pour comparer les alternatives et préciser l'observation du rendu.
>
> Éprouvé : un script Node temporaire, hors du dépôt, a vérifié les seize
> combinaisons de quatre signaux d'état et les calculs économiques du §2.1.
> Les assertions d'exclusivité passent. Ce test porte sur une formule logique,
> pas sur la joignabilité des états dans un navigateur.
>
> Non réalisé : implémentation, installation, génération de composant, appel de
> modèle, rendu, mutation du corpus ou nouvel audit des chiffres des prémisses.
> Les seuls fichiers écrits dans le dépôt sont cette revue et la ligne de son
> index. Aucun commit.
>
> Non vérifiable ici : stack du consommateur, fréquence des réexports, temps de
> maintenance, accord sur les fichiers générés et disponibilité des tokens dans
> son environnement de rendu. Aucun entretien d'équipe n'a été réalisé.

Les registres employés sont **vérifié** pour une lecture ou une exécution,
**déduit** pour une conséquence de ces sources, **supposé** pour une hypothèse
de calcul. Une estimation de travail n'est jamais une mesure du projet.

Les références abrégées désignent les documents suivants. Un numéro de section
après leur nom localise le constat.

| Référence | Document |
|---|---|
| Plan | [Plan de l'implémenteur](../Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md) |
| Banc | [Banc d'hypothèses](../Formalisation%20de%20la%20solution/BANC-HYPOTHESES.md) |
| Audit | [Audit des prémisses](../Recherches/AUDIT-PREMISSES-IMPLEMENTEUR.md) |
| Outils | [État de l'art des outils](../Recherches/ETAT-DE-L-ART-OUTILS.md) |
| Coût | [Rapport de coût](../Recherches/RAPPORT-COUT-GENERATION.md) |
| Réduction | [Plan de réduction du chemin agent](../Recherches/PLAN-REDUCTION-TOKENS.md) |
| Étude | [Étude de génération à froid](../Recherches/ETUDE-GENERATION-A-FROID.md) |
| Rendu | [Plan de conformité de rendu](../../Linter%20Dev/PLAN-CONFORMITE-RENDU.md) |

Les chemins du corpus sont relatifs à `../UCM-Playground/src/components/`.
Ils restent sans liens, car ce dépôt voisin n'est pas garanti chez le lecteur.
Le contexte d'usage des deux équipes provient de la mission et du Plan, §1.1 ;
ce n'est pas le résultat d'une enquête auprès du consommateur.

## 1. Verdict en une page

**Ne pas construire le module proposé dans son périmètre actuel.** Le coût
d'API de la reconstruction ne justifie pas les sept lots. Le bénéfice possible
porte sur le temps humain des mises à jour et sur les écarts détectés avant
fusion. Aucun de ces deux bénéfices n'est mesuré aujourd'hui (Coût, §1.7 ;
Banc, H5 et H6).

La compilation des matrices est justifiée techniquement : elle retire une
transcription répétitive dont le volume est établi. Le contrat constitue une
entrée adaptée, les lecteurs du kit évitent une seconde résolution du format,
et le mode hors ligne correspond au consommateur décrit. Ces trois points
résistent à la revue (Plan, §1.1, §1.2, §6 ; CONCEPT, §3).

En revanche, la promesse d'un composant accepté dépasse la transcription.
Il manque une forme exécutable des conventions, un protocole d'observation du
rendu et une définition des décisions applicatives que l'équipe souhaite
réellement déléguer. Cinq réponses sous P3 ne mesurent ni la difficulté de ces
décisions, ni l'étendue du code restant à écrire (§2.2 à §2.4 ci-dessous).

| Axe demandé | Verdict | Motif vérifiable |
|---|---|---|
| Concept global | Tient sous condition | Compiler le visuel déterminé tient. Émettre toute la coque suppose un catalogue de comportements et des conventions exécutables absents du Plan, §3 et §4 |
| Sous-parties | Ne tient pas | Le port fournisseur et la mémoire mutualisée n'ont pas de volume justifiant leur construction ; le contrôle du rendu et les conventions demandent davantage que les ports décrits. Voir §5 |
| Communication | Ne tient pas | API réelle de l'enfant, contexte de build, observation des états et dépendances de validité ne disposent pas d'un transport défini. Le mode `possede` sort du protocole de réponses fermées. Plan, §9 et §10 |
| Workflow global | Ne tient pas | Le consommateur reçoit les contrats sans les prérequis de la porte. L'installation et l'ouverture automatique d'une demande de fusion supposent une intégration encore inconnue. Plan, §1.1, §12 et §14 |
| Solutions retenues | Tient sous condition | Relevé local et vérification indépendante sont utiles. Cascade par recouvrement, mémoire par signature et exactitude contre une référence manuelle demandent des corrections. Voir §2.5 à §2.9 |
| Lots et décisions | Ne tient pas | Le banc n'a aucune sortie « ne rien construire ». Le relevé nécessaire au mode hors ligne arrive après ce mode. Les choix de paquets précèdent la connaissance du consommateur. Banc, §5 ; Plan, §15 |

La première tranche proposée est un essai limité du contrôle sur du code
existant, avec un raccordement explicite des slots et des états. Comparer
ensuite le chemin actuel simplifié à une génération de données séparées, sur
une mise à jour réelle. Le compilateur de coques devient une décision ultérieure,
soumise au temps humain économisé. Cette recommandation contredit le choix
acquis du chemin compilé dans l'index ; elle ne modifie pas cette autorité.

## 2. Failles classées par gravité

### 2.1. Bloquant : le coût de construction n'entre pas dans la décision

**Vérifié.** Le Plan, §13, exclut développement, porte, réparations et échecs
du facteur de réduction annoncé. La mesure de 1,33 USD concerne `Button` dans
un harnais particulier. Le Coût, §1.2, précise que les 1,68 million de tokens
additionnent des catégories tarifaires différentes ; ils ne constituent pas
une facture homogène. Les contraintes d'abonnement sont également distinctes
de cette valorisation en dollars (Coût, §1.7).

**Estimation.** Une session désigne ici quatre heures de travail concentré,
incluant code, tests et relecture. Les bornes ci-dessous sont un découpage des
livrables du Plan, §15, pour un contributeur familier du dépôt. Elles ne
comprennent ni attente d'équipe ni entretien futur ; elles ne constituent pas
un devis.

| Lot | Sessions estimées | Travail inclus |
|---|---:|---|
| 0 | 2 à 4 | Attribution limitée du corpus, relevé et premières altérations |
| 1 | 1 à 2 | Choix des conventions et traduction en réglages exécutables |
| 2 | 10 à 18 | Représentation, émission React, styles, décisions locales et refus |
| 3 | 8 à 14 | Montage, slots, états, attentes indépendantes, mutations discriminantes |
| 4 | 4 à 7 | Mémoire, schémas, fournisseur, usage, budgets et erreurs |
| 5 | 4 à 7 | Invalidation, fichiers possédés, transactions et intégration continue |
| 6 | 5 à 9 | Second adaptateur, protocole externe et distribution autonome |
| Total | 34 à 61 | 136 à 244 heures, hors lot 7 |

**Calcul.** Soit `S` le nombre de sessions, `h` leur durée, `r` le coût
horaire dans une même devise, `g` l'économie d'API par génération acceptée,
`t` le temps humain économisé et `e` le coût supplémentaire de son exécution.
Hors maintenance, le remboursement demande :

```text
N = plafond(S × h × r / (g + t × r - e))
```

Le dénominateur doit être positif. Les régénérations déjà déterministes ou les
composants qui n'auraient jamais été reconstruits ne comptent pas comme une
économie de 1,33 USD.

**Supposé.** Avec `r = 50 USD/h`, le coût initial vaut 6 800 à 12 200 USD.
En accordant au compilateur toute la dépense de 1,33 USD, sans coût d'exécution
ni maintenance, il faut **5 113 à 9 173 générations acceptées**. Avec trente
minutes humaines économisées à chaque génération, il en faut **259 à 464**.
Le taux horaire et les trente minutes sont des scénarios, pas des données des
équipes. Les résultats ont été calculés par le script temporaire.

Quatre reconstructions à 1,33 USD valent 5,32 USD. Quarante en valent
53,20 USD. Un scénario de douze reconstructions annuelles de chacun des quatre
composants vaut 63,84 USD ; pour quarante composants, 638,40 USD. Même ce
dernier scénario demanderait environ 11 à 20 ans de seules économies d'API,
en arrondissant à l'année supérieure et sans entretien. Aucune fréquence de
douze réexports n'est attestée. Le corpus comporte en outre une sonde qui
n'est pas utilisée en production (Banc, §2).

**Conséquence.** En construisant quand même, le mainteneur finance surtout un
nouvel outil à entretenir, sans volume annoncé pour l'amortir.

**Correction.** Mesurer le temps de correction et de relecture d'un vrai
réexport. Fixer avec l'équipe un horizon de remboursement et un plafond de
sessions avant tout prototype. Le gain de qualité peut justifier une dépense
distincte, mais il doit nommer les défauts évités et leur coût.

### 2.2. Bloquant : un domaine fini ne rend pas le comportement déductible

**Vérifié.** CONCEPT, §3, attribue au code comportement, accessibilité et
attributs natifs. Le Plan, §4.1, les réduit à `hote`, `etat` et une recette
d'accessibilité associée à l'hôte. L'Audit, §1.11, établit que les
caractéristiques visuelles ne déterminent pas l'action. Dans le corpus,
`TileLink/TileLink.tsx`, lignes 28 à 50, accepte ses attributs natifs, dont
l'adresse, par l'API de code. `Alert/Alert.tsx`, lignes 50 à 54, expose du
contenu et des props d'enfant absents de la seule surface visuelle.

**Déduit.** Une primitive `button` ne dit pas si l'appelant attend une
soumission, une action locale ou une commande à état. Un hôte `div` ne fixe
pas à lui seul l'annonce d'une alerte. Le choix dans un catalogue reste une
décision applicative. Un modèle privé de cette intention peut produire un
JSON valide et une décision fausse ; aucun gain de sortie structurée ne
répare l'information absente.

Le Plan, §4.1, propose aussi `etat-local` sans définir ses événements ni ses
transitions. Cette valeur ne suffit pas à émettre le code correspondant.
Le constat ne demande pas d'ajouter des événements au contrat : il demande de
borner ce que le module produit.

**Conséquence.** La coque générée peut passer les types et le rendu tout en
effectuant une mauvaise action. Agrandir le corpus par dix ajoute des
comportements possibles, pas seulement des lignes de matrice.

**Correction.** Garder le comportement dans une coque humaine ou dans une
recette de code explicitement choisie par le développeur. Déclarer pour chaque
recette ses paramètres, événements, limites et tests. Le compilateur peut
ensuite produire la partie visuelle contre cette interface, sans inférer le
comportement d'après la forme ou le nom.

### 2.3. Bloquant : les conventions textuelles n'ont pas de sémantique exécutable

**Vérifié dans le code.**
[`lireConventions`, lignes 86 à 158](../../../../../packages/cli/src/conventions.mjs),
extrait du texte, des titres et des commandes. Cette fonction ne transforme
pas une consigne comme « le premier texte devient children » en une politique
d'émission typée. Le Plan, §3.2 et §3.3, réutilise ces sections pour fermer
mécaniquement les questions. L'Étude, §4, rubrique compilation déterministe,
mentionne pourtant des conventions structurées ; leur forme manque au Plan.

**Déduit.** La liste des caractéristiques est un catalogue utile de capacités,
mais une aide en prose n'est pas son implémentation. Une section personnalisée
peut demander une écriture étrangère aux recettes disponibles. Le module hors
ligne doit alors refuser ou obtenir un choix explicite. Ignorer cette section
contredirait l'autorité accordée aux conventions.

**Conséquence.** Le lot 1 peut être déclaré terminé après rédaction des trois
conventions alors que le lot 2 ne dispose toujours pas de règles exécutables.
Ajouter un modèle pour interpréter cette prose déplacerait le coût et
contredirait le chemin nominal sans clé.

**Correction.** Définir un petit ensemble de politiques typées, versionnées
avec l'adaptateur, sélectionnées une seule fois dans la configuration locale.
La prose explique ce choix par renvoi ; elle n'en porte pas une seconde
valeur. Une personnalisation non traduite devient `decision_requise` ou
`capacite_absente`. Cette décision précède l'émission.

### 2.4. Bloquant : produire les artefacts ne fournit pas leur contexte d'observation

**Vérifié.** Le port vérificateur reçoit artefacts, contrat et feuille de
tokens (Plan, §10.4). Le plan Rendu, blocs A à C, exige en plus montage,
identification des slots, géométrie et état réellement obtenu. Il avertit
déjà que le style calculé ne prouve pas l'identité du token. Le consommateur
décrit au Plan, §1.1, ne reçoit ni tokens ni chaîne d'intégration.

**Déduit.** Le port est sous-spécifié : il manque la racine à importer, les
dépendances de code, les contenus d'essai, les polices et icônes, la taille du
conteneur, les modes et le moyen d'actionner les états. Ces données peuvent
être fournies par un adaptateur de test ; elles ne se déduisent pas d'un
fichier CSS. Une feuille existante chez le consommateur pourrait suffire,
mais sa présence, son nommage et sa version restent à établir.

La provenance du compilateur n'est pas une preuve que tous les slots attendus
existent. Un fragment omis n'a précisément aucune provenance émise. Le
vérificateur doit énumérer les obligations depuis le contrat puis retrouver
les observations, en signalant toute cible absente ou ambiguë.

**Conséquence.** La promesse d'une commande qui rend un composant accepté
bloque à l'installation réelle. Une acceptation fondée seulement sur les
artefacts présents laisserait passer les omissions du générateur.

**Correction.** Définir d'abord un raccordement d'observation applicable au
code écrit à la main. Une sortie de compilation sans tokens résolus reste un
artefact non vérifié ; elle ne reçoit pas `accepte`. Distinguer une
non-conformité observée d'une mesure impossible, même si les deux empêchent
l'acceptation.

### 2.5. Majeur : la cascade choisie fabrique un problème qui peut être évité

**Vérifié.** Les cinquante-quatre couples du Plan, §7.2, décrivent la rencontre
de blocs exacts et de règles CSS simultanément applicables. Le chiffre de
l'Audit, §3.4, reste acquis. Il ne démontre pas que toute émission CSS exige
une redéclaration de l'union des propriétés.

**Déduction éprouvée.** Pour des signaux ordonnés `s0…sn`, définir le
prédicat de l'état `i` par `si && !s0 && … && !s(i-1)`. Le défaut correspond
à l'absence de tous les signaux. Le script temporaire vérifie que les seize
combinaisons de quatre booléens sélectionnent exactement le premier signal
actif, ou le défaut. Des sélecteurs CSS peuvent exprimer cette exclusion ;
la négation est définie par [Selectors, §4.3](https://www.w3.org/TR/selectors-4/#negation).

Exemple de forme à éprouver, limité aux déclencheurs simples du corpus :

```css
.c:where([disabled]) { /* déclaration de disable */ }
.c:where(:active:not([disabled])) { /* déclaration de press */ }
.c:where(:focus-visible:not(:active):not([disabled])) { /* focus */ }
.c:where(:hover:not(:focus-visible):not(:active):not([disabled])) { /* hover */ }
.c:where(:not(:hover):not(:focus-visible):not(:active):not([disabled])) { /* default */ }
```

Avec une base limitée aux propriétés réellement communes, le fond du survol
ne reste pas applicable pendant `disable`. Une autre solution consiste à
calculer l'état en code et à porter une unique classe de combinaison. Elle
conserve un résolveur d'état, mais peut déplacer toute la table de valeurs dans
un fichier généré. L'invariant interdit de lire le contrat à l'exécution ; il
n'interdit pas cette sélection entre artefacts compilés (CONCEPT, §3).

**Limites.** L'exclusion ne neutralise ni les styles natifs ni les styles de
l'application. Une base explicite reste nécessaire. La forme de tous les
sélecteurs admis doit être bornée ; une concaténation naïve de chaînes ne
couvre pas une liste ou un sélecteur complexe. L'essai logique ne prouve ni
la compatibilité navigateur ni le rendu.

**Conséquence.** La remise à zéro universelle ajoute un inventaire de valeurs
neutres, de propriétés héritées et de raccourcis CSS avant d'avoir comparé une
émission exclusive. Une valeur absente du contrat ne signifie pas toujours
`initial` : le rayon de taille et celui de racine concernent notamment des
cibles différentes (Plan, §7.2 ; `Button/Button.tsx`, lignes 256 et 272).

**Correction.** Comparer sur la même tranche les trois émissions : règles
exclusives, état explicite et règles avec remise à zéro. Mesurer les défauts,
la taille totale livrée et le coût de maintenance. Le nombre d'octets retirés
du seul fichier JavaScript ne tranche pas cette décision.

### 2.6. Majeur : le signal d'état et la vue structurelle n'ont pas de raccord défini

**Vérifié.** La coque doit monter l'arbre de la vue courante (Plan, §7.3),
tandis que le §7.5 propose de supprimer la machine à états au profit du CSS.
Une vue peut aussi porter typographie, icônes et composition, selon
[`types.ts`, lignes 936 à 956](../../../../../packages/kit/src/format/types.ts).
Sur `Button`, les vues `st1` et `st2` diffèrent par le rayon de racine
(Audit, §3.4), ce qui reste exprimable en style ; ce corpus ne prouve donc
pas une impossibilité générale.

**Déduit.** Si un état change un enfant composé ou une icône, un sélecteur CSS
ne choisit pas à lui seul l'arbre React. Il faut soit conserver un signal
partagé avec la coque, soit construire un arbre commun dont les différences
sont exprimables en CSS, soit refuser ce cas. Monter toutes les vues puis les
masquer peut instancier plusieurs dépendances et leurs effets. Le catalogue
actuel `etats` ne distingue pas ces capacités.

**Correction d'une prémisse.** Le Plan, §7.2, et l'Audit, §3.5, disent que
`[disabled]` ne s'applique jamais à un hôte `a`. Cette affirmation est trop
forte : le sélecteur teste la présence de l'attribut, indépendamment de sa
sémantique HTML ([Selectors, §6.1](https://www.w3.org/TR/selectors-4/#attribute-representation)).
Un attribut effectivement écrit peut donc donner le style sans désactiver la
navigation. La liste des éléments réellement désactivés relève d'une autre
règle ([HTML, §4.15](https://html.spec.whatwg.org/multipage/semantics-other.html#disabled-elements)).
Cela ne contredit ni le décompte des variants ni le manque de liaison à une
prop ; cela contredit l'assimilation entre appariement CSS et comportement.

**Conséquence.** Un contrôle visuel peut accepter un état dont l'interaction
reste active. Inversement, une coque correcte peut ne jamais produire le
sélecteur littéral attendu par l'émetteur.

**Correction.** Documenter un raccord explicite entre état visuel, signal
applicatif et hôte, avec preuve du déclenchement. Le partage de CONCEPT, §3,
reste défendable. Le champ `selector` apporte une convention CSS que [FORMAT.md](../../../../../docs/format/FORMAT.md),
§4 « Modèle d'interaction », et l'aide `etats` demandent actuellement
d'employer telle quelle : une adaptation de cette convention devra être
spécifiée, pas introduite silencieusement par une recette.

### 2.7. Majeur : validité d'échantillon, choix applicatif et conservation sont confondus

**Vérifié.** Le Plan, §4.2, distingue déjà le caractère non normatif des
échantillons. `Alert/Alert.contract.json`, lignes 85 à 88, donne quatre
valeurs différentes de `args.color` pour la même dépendance selon
l'échantillon. `Alert/Alert.tsx`, lignes 54 et 127, permet en outre à
l'appelant de transmettre ses propres props. Le Plan, §4.1, cite `exposer`
dans le domaine de composition, mais le choix de l'API exposée n'est pas
instruit dans la décision 2.

**Déduit.** La validation d'une valeur dans une union ne prouve pas que le
développeur souhaite la figer. Les trois issues de la décision 2 portent sur
l'autorité de l'échantillon. Elles omettent la question préalable : la prop
d'enfant doit-elle être fixée, dérivée du parent ou exposée à l'appelant ?
Une confirmation « par signature » ne résout pas non plus la différence entre
occurrences et vues.

La décision 2 est donc celle dont les trois issues manquent la question
principale. Elle doit être reformulée avant d'utiliser P2 ou P3 comme budget
du travail. Les décomptes restent vrais sous leurs politiques respectives ;
leur interprétation comme travail résiduel prêt à automatiser ne tient pas.

**Conséquence.** Une modification de maquette peut modifier un comportement
de production par l'intermédiaire d'une réponse automatiquement reprise.
À l'inverse, une réponse conservée parce que son domaine reste identique peut
devenir inadaptée au nouvel usage (Plan, §8.1).

**Correction.** Enregistrer le choix applicatif par occurrence et contexte
de variante, avec la dépendance qui l'a motivé. Un échantillon peut amorcer
une proposition ; après validation humaine, la valeur devient une décision
du code. Sa modification ultérieure dans `samples` ne réécrit pas cette
décision. Exiger une nouvelle revue si l'intention, la liaison ou le contexte
change, même quand l'ancienne valeur appartient encore au domaine.

### 2.8. Majeur : le banc ne peut pas justifier toutes ses conclusions

**Vérifié.** H1a compte des déclarations de rendu attribuables ; H1b exige
l'égalité avec la référence manuelle ; H4 demande le refus de toute altération
(Banc, §2 et §3). Le Coût, §1.6, relève pourtant une attente `cursor` absente
du contrat. L'Audit, §4.2, signale qu'une inversion de `press` et `focus`
peut ne produire aucun écart observable. Le plan Rendu, bloc B, décrit le cas
de deux tokens ayant la même valeur calculée.

**Déduit.** Une forte part de déclarations attribuées ne mesure pas le temps
nécessaire au dernier choix de comportement. Des répétitions de valeurs dans
quatre fichiers ne suffisent pas à établir une convention souhaitée. H1b
mesure une reproduction de référence, qui doit être distinguée d'une
conformité au contrat. Le coût d'un analyseur capable d'attribuer du code
React arbitraire est lui-même absent de l'expression « mesure la moins chère ».

H4 doit distinguer mutant appliqué, mutant observable et mutant tué par le
bon contrôle. Un changement sans effet observable ne justifie pas un refus
de rendu. Ce problème est aussi décrit dans la documentation primaire sur les
[mutants équivalents](https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/).
Changer un contour `inside` en `outside` déplace son dessin ; cela ne prouve
pas en soi qu'il consomme la boîte, contrairement au libellé du Banc, H4.

**Conséquence.** Le projet risque soit de rejeter une implémentation conforme,
soit d'adapter le contrôle aux mêmes six fautes jusqu'à obtenir un score sans
preuve sur les omissions. Le partage d'un oracle d'émission entre mutation et
vérification n'est pas établi dans le code, puisque ces modules n'existent pas ;
le risque est dans leur protocole proposé.

**Correction.** Annoter d'abord manuellement un petit relevé d'obligations.
Séparer les attentes normatives des choix de référence. Vérifier un témoin
conforme, un témoin altéré et le retour au vert après restauration. Relire le
diff du mutant et nommer à l'avance l'écart attendu ; conserver des cas
indépendants de la transformation du compilateur. Ajouter omissions de slots,
combinaisons d'états, tokens de même valeur et changement de mode.

La règle d'arrêt doit enfin autoriser l'abandon de tout générateur. Aujourd'hui,
H1a sous le seuil conduit à la compilation partielle ; H4 en échec retarde
seulement la campagne de modèles (Banc, §5). Le résultat ne peut donc pas
réfuter la nécessité d'investir dans une génération.

### 2.9. Majeur : le mode possédé contredit le protocole et ignore la première migration

**Vérifié.** Le Plan, §9, prévoit un appel au modèle quand le remplacement
exact échoue. Les deux fragments et la zone concernée sortent alors du port
fournisseur du §10.3, dont la sortie est un relevé de décisions. La règle
du §2.1 interdit pourtant au modèle de rédiger le code.

**Déduit.** Le remplacement exact protège bien un fragment déjà produit par
une version identifiée du générateur. La transcription littérale de `VARIANTS`
ne prouve pas que le premier émetteur reproduira les espaces, le typage et
l'ordre du fichier manuel. Une mise à jour d'émetteur peut aussi empêcher de
retrouver l'ancien fragment sans aucune modification humaine.

**Conséquence.** Le mode nominal sans API s'arrête au premier conflit. Le mode
en ligne ouvre une seconde architecture de réparation que le plan ne chiffre
ni ne contrôle.

**Correction.** Préférer un fichier généré importé par une coque possédée.
Pour une région interne nécessaire, effectuer une adoption explicite une fois,
conserver les octets ou l'empreinte du fragment réellement installé et refuser
son écrasement en cas d'écart. Le développeur résout le conflit. Aucun appel
de réparation libre n'est nécessaire au noyau.

### 2.10. Secondaire : le fournisseur et la mémoire mutualisée n'ont pas d'assiette

**Vérifié.** Sous P3, cinq questions subsistent sur le corpus, hors
accessibilité ; sous P2, vingt (Plan, §4.2). Un contre-exemple de reprise de
`hote` est déjà établi (§4.5). Pourtant le §10.6 promet que le composant
suivant portant les mêmes signatures se compile sans question, sans rappeler
la restriction de proposition du §4.5.

**Déduit.** Le relevé local sert aux mises à jour et mérite une forme validée.
La généralisation d'une décision à un autre composant est une fonction
distincte. Cinq composants sans collision ne prouveraient pas que des
caractéristiques visuelles déterminent une intention absente. Réordonner
aléatoirement quatre composants n'ajoute aucune intention au corpus.

**Conséquence.** Le coût du lot 4 s'ajoute à celui d'une fonction humaine qui
ne porte actuellement que quelques décisions. Les schémas par fournisseur,
les deux tours et le journal de prix ne réduisent pas le travail de rendu.

**Correction.** Conserver un relevé local validé, supprimer du premier
périmètre fournisseur, promotion de signatures et campagne de modèles. Une
convention générale décidée par l'équipe peut être appliquée automatiquement ;
une ressemblance observée reste une suggestion. Réouvrir l'assistance par
modèle seulement après mesure d'un coût humain récurrent de décision.

## 3. Angles morts et examen des dix classes de failles

### 3.1. Les inconnues du consommateur qui conditionnent les décisions

Chaque ligne est une dépendance de conception déduite du Plan. Son absence
dans les informations d'usage disponibles ne prouve pas que l'équipe n'a pas
de solution ; elle interdit de la supposer acquise.

| Propriété inconnue | Décisions qui en dépendent | Ce qu'il faut observer |
|---|---|---|
| Stack, moteur de rendu et versions | Émission CSS, premier adaptateur, types et second adaptateur ; décisions 7, 11 et 15 | Un composant réel compilé et testé dans le dépôt destinataire |
| Source, nommage et livraison des tokens | Mode hors ligne accepté, modes, déclenchement sur changement de tokens | Une référence résolue dans le rendu consommateur et sa version de source |
| Polices et bibliothèque d'icônes | Recettes d'icônes, défaut `figmaName`, mesures de typographie | Assets effectivement disponibles et règles d'import |
| Contrôle des styles par l'application | Base CSS, surcharges `style`, isolation, ordre des feuilles | Une intégration dans une page existante, pas seulement une galerie isolée |
| API attendue par les appelants | Nommage du contenu, props natives, composition ; décisions 2, 3 et 9 | Appels réels, callbacks, refs et interfaces d'enfants |
| Propriété des fichiers | `genere`, régions internes, conflit ; décisions 9 et 17 | Accord explicite et essai d'une modification manuelle suivie d'un réexport |
| Intégration continue, forge, droits d'écriture | Installation et ouverture d'une demande de fusion ; Plan, §12 | Un parcours de contribution exécuté, avec responsable du verdict rouge |
| Volume et fréquence des modifications | Rentabilité, mémoire, fournisseur, budget ; décisions 5, 12 et 13 | Historique des changements utiles et temps de correction |
| Plateformes réellement ciblées | Adaptateur externe, exécutable et conteneur ; lot 6 | Un besoin de seconde cible fourni par une équipe utilisatrice |

### 3.2. Le workflow et ses responsables

| Étape | Responsable nécessaire | Blocage ou correction de périmètre |
|---|---|---|
| Export et relecture | Designer | Le contrat partiel doit rester identifiable ; une génération ne récupère pas ce que l'export n'a pas décrit. Plan, §1.3 et §14 |
| Réception du contrat | Mainteneur du dépôt consommateur | Installer les tokens ou déclarer leur résolution avant toute acceptation de rendu. Plan, §1.1 et §10.4 |
| Choix de comportement et de contenu | Développeur consommateur | Répondre depuis les usages réels, puis conserver ce choix localement. CONCEPT, §3 |
| Montage et observation | Développeur de l'adaptateur avec le consommateur | Déclarer les imports, slots, contenus et déclencheurs ; le designer ne fournit pas ces éléments. Rendu, blocs A à C |
| Mise à jour | Développeur ou commande locale | Traiter contrats et dépendants, mais aussi changements de conventions, décisions, adaptateur et API réelle des enfants. Plan, §8 ne déclenche explicitement que sur les contrats |
| Vérification après changement de tokens | Responsable de la chaîne de tokens | Relancer le rendu même si aucun contrat ni fichier généré ne change. Les références émises peuvent rester identiques. Plan, §7.4 |
| Acceptation et fusion | Relecteur de code | Lire les décisions nouvelles et les manques ; les états non observés ne comptent pas comme conformes. Plan, §14 |

La CI du §12 ouvre une demande de fusion après réception d'un contrat par
demande de fusion. Le plan ne fixe pas si le code rejoint cette même demande
ou une seconde, ni ce qui empêche une boucle de déclenchement. CONCEPT, §4,
autorise déjà qu'un contrat précède le code. Choisir un seul parcours explicite :
contrat accepté puis adaptation, ou changement atomique relu ensemble. Installer
un fichier de workflow ne fournit ni les droits ni cette décision d'équipe.

### 3.3. Réversibilité et croissance

**Passage en 14.0.** La fenêtre actuelle est 12.0 à 13.0
([`version-contrat.mjs`, lignes 12 à 14](../../../../../packages/kit/src/lecteurs/version-contrat.mjs)).
Le sens du futur changement est inconnu. Il faut prévoir la lecture du format,
l'adaptation vers la représentation, la migration des décisions et la
revalidation du rendu. Un chemin comme `viewStructures.st2` constitue une
provenance dans une révision, pas une identité persistante entre réexports.
Le relevé du Plan, §5, contient déjà contrat et adaptateur ; il manque les
empreintes des conventions, dépendances et politiques nécessaires à sa validité.
Le remplacement en mode `possede` peut aussi exiger l'ancien émetteur.

**Abandon du mode `genere`.** Le code compilé peut être figé puis possédé par
le développeur. Il faut néanmoins retirer sa régénération automatique,
stabiliser ses imports et rendre explicites ses dépendances de bibliothèque.
Le coût est au moins une revue par composant et une vérification de son API ;
aucune durée n'est établie. Des fichiers de données séparés réduisent cette
migration à leur interface et au branchement de build (§2.9).

**Autre stack.** Une seconde cible exige émetteur, raccordement d'observation,
recettes de comportement et migration des réponses propres à l'hôte. React
et composants web éprouvent deux intégrations web ; ils ne prouvent pas la
portabilité vers une plateforme sans CSS. Les sélecteurs et littéraux CSS du
contrat restent des entrées à adapter. Le protocole JSON externe ne réalise
aucune de ces traductions (Plan, §7.5 et §11).

**Corpus multiplié par dix.** Le coût d'émission dépend des variants et slots,
pas seulement du nombre de composants. Celui du contrôle dépend aussi des
tailles, modes, configurations de visibilité et états simultanés. Les
270 cas `90 × 3` de `Button` précèdent déjà les modes et les actions combinées
(Plan, §4.2 et §7.1). Quarante composants apparentés exerceraient peu de
nouvelles capacités ; quarante composants à comportements distincts peuvent
exiger de nouvelles recettes. Aucune projection de débit n'est mesurée.

### 3.4. Résultat du filtre demandé

| Classe de faille | Résultat de la revue |
|---|---|
| Problème mal posé | Trouvé : économies d'API comparées sans investissement ni volume ; calcul au §2.1 |
| Solution évidente non instruite | Trouvé : autonomie du contrôle, copropriété par fichiers séparés et option de ne rien construire ; comparaison au §4. La réduction du chemin agent existe déjà dans Réduction, elle n'est pas une découverte de cette revue |
| Partie sans justification | Trouvé : fournisseur, promotion de mémoire et distribution multi-stack avant demande réelle ; §2.10 et §5 |
| Frontière qui fuit | Trouvé : `selector` conventionnel est traité comme comportement déclenchable ; §2.2 et §2.6. La répartition de CONCEPT peut être conservée |
| Exigence qui fabrique son défaut | Trouvé : règles d'états concurrentes puis neutralisation universelle ; alternative exclusive au §2.5 |
| Hypothèse invérifiable sur le corpus | Trouvé : signatures, recettes d'accessibilité, capacités non exercées, deuxième stack et fidélité du modèle ; §6.1. Les refus locaux et propriétés de forme restent vérifiables |
| Dépendance cachée à une inconnue | Trouvé : neuf groupes de propriétés consommateur au §3.1 |
| Coût de réversibilité | Trouvé : migration des décisions, de la représentation et des artefacts possédés ; §3.3 |
| Circulaire | Risque trouvé, pas de boucle exécutée observée : faux positifs de mutation et référence prise pour norme ; §2.8. Aucune preuve d'un oracle partagé en code n'existe puisque le module est à construire |
| Difficulté reportée | Trouvé : conditions techniques de compilation et de mesure reportées après leur utilisation ; §6.1. Les limites de volume reconnues par les auteurs sont en revanche explicites |

## 4. Solutions comparées et coût de leur instruction

Toutes les durées suivantes sont des estimations de conception en sessions
de quatre heures. Elles incluent une vérification limitée et excluent toute
industrialisation cachée. Les comparer aux 34 à 61 sessions du §2.1 indique
l'ordre de l'investissement, pas un délai garanti.

| Solution | Sessions estimées | Gain et limite | Recommandation |
|---|---:|---|---|
| Ne rien construire | 0 de développement | Conserver le chemin actuel et payer ses exécutions. Les écarts de rendu restent au niveau actuel. Coût, §1.6 | Option recevable si les mises à jour sont rares |
| Écrire ou corriger à la main | 1 à 2 pour relever le coût d'un réexport réel ; aucun générateur | Les quatre composants existent déjà. Leur réécriture initiale est un coût passé. Entretien futur à mesurer, pas à supposer nul. Plan, §9 | Comparateur économique obligatoire |
| Réduire le contexte et l'effort du chemin agent | 2 à 4 avec une petite campagne corrigée | Attaque les 28 % de contexte fixe et les 27 % de réflexion sans les additionner comme économie garantie. Coût, §1.3 ; Réduction, lots 0 et A | À comparer avant le compilateur de coques |
| Générer seulement matrices et tailles dans un module importé | 3 à 6 sur le sous-ensemble du corpus | Retire la recopie des valeurs, conserve l'état et la coque existants. Gain de volume mesuré, gain de temps encore inconnu. Plan, §7.1 ; Réduction, lot C | Premier candidat à la génération |
| Générer seulement le CSS avec un raccordement de slots | 5 à 9 sur le web du corpus | Conserve la propriété de la coque. Demande encore états, base de style et mapping DOM. §2.5 et §2.6 | Alternative au module de données, à départager par un essai |
| Contrôler le rendu du code existant | 3 à 5 pour une preuve limitée ; 8 à 14 pour le périmètre estimé du lot 3 | Valeur indépendante du générateur. Exige un protocole d'observation et ne prouve pas tout le comportement. Rendu, blocs A à C | Premier travail technique utile si l'équipe veut un contrôle |
| Faire émettre la représentation par le plugin | 2 à 4 pour en éprouver une tranche, puis adaptation du format et de ses lecteurs | Ne supprime ni conventions consommateur ni traduction de stack. Une représentation dérivable publiée double les formes à versionner. Plan, §6 ; AGENTS, invariant sur les données dérivables | Écarter, sauf information normative réellement absente du contrat |
| Interpréter le contrat à l'exécution | Non chiffré, non proposé | Abandonnerait l'invariant de CONCEPT, §3, sans retirer le travail sur hôtes, comportement et observation | Aucun motif établi d'abandonner cet invariant |

La génération de données séparées et la génération de CSS sont deux limites
de périmètre distinctes. La première conserve davantage de JavaScript mais
réemploie la sélection existante ; la seconde peut réduire ce JavaScript
moyennant les décisions d'état et de raccordement. Le Plan privilégie la taille
du fichier relu ; la décision économique doit compter toutes les sources
générées, leur vérification et le temps de modification.

L'état de l'art a recherché des outils satisfaisant les exigences du Plan.
Ses essais de Panda et de `class-variance-authority` restent valides pour ces
entrées (Outils, §5.2). Leur résultat ne suffit pas à éliminer une sélection
exclusive ni une feuille adossée à une coque humaine : ces alternatives
changent le besoin d'émission. La revue ne propose aucune nouvelle dépendance
et n'infère aucune capacité non éprouvée d'un outil tiers.

## 5. Revue des sous-parties et de leur communication

### 5.1. Les seize sous-parties de l'état de l'art

| N | Sous-partie | Verdict | Dimensionnement et correction |
|---|---|---|---|
| 1 | Pipeline complet | Ne tient pas | Surdimensionné pour les usages établis. Conditionner sa construction au gain humain ; §2.1 et §3.2 |
| 2 | Lecture et format | Tient | Le kit est l'autorité existante. Aucun besoin démontré de nouveau format ; Plan, §6, et `variant-views.mjs`, lignes 33 à 46 |
| 3 | Représentation intermédiaire | Tient sous condition | Utile comme donnée interne versionnée. Définir états, absences, adresses et provenances sans recopier tous les catalogues bruts ; Plan, §6 |
| 4 | Émission multi-stack | Tient sous condition | Un adaptateur pour la stack confirmée. Le second sert une demande réelle ou une épreuve ciblée ; il ne justifie pas d'avance le lot 6. Plan, §11 |
| 5 | Styles par combinaison | Tient sous condition | Conserver les combinaisons exactes, comparer les formes d'émission et la neutralisation des styles natifs ; §2.5 |
| 6 | Comportement, états, accessibilité | Ne tient pas | Une recette par hôte ne spécifie pas l'intention applicative. Séparer coque humaine et rendu ; §2.2 et §2.6 |
| 7 | Tokens et modes | Tient sous condition | Réutiliser la chaîne existante, après confirmation de la source consommateur. L'émission de références est indépendante de leur disponibilité ; Plan, §7.4 |
| 8 | Types dérivés | Tient sous condition | Réutiliser l'adaptateur TypeScript sur sa stack. Un type de combinaison ne garantit ni état joignable ni API native correctement transmise ; Plan, §7.1 |
| 9 | Conformité de rendu | Tient sous condition | Prioritaire comme produit autonome, avec observation indépendante et limites de preuve. Playwright ne remplace pas ces spécifications ; Rendu, blocs A à C |
| 10 | Mutations | Tient sous condition | Refuser les défauts observables, distinguer mutants équivalents et mesures impossibles, vérifier aussi un témoin conforme ; §2.8 |
| 11 | Fournisseur et sortie structurée | Ne tient pas | Inutile au périmètre actuel. Garder seulement la validation des décisions humaines ; Plan, §4.2 et §10.6 |
| 12 | Remplacement de fragments | Tient sous condition | Valable après adoption d'un fragment identifié, sans réparation libre implicite. Préférer un fichier séparé ; §2.9 |
| 13 | Diff structuré | Tient sous condition | Un diff de données suffit au rapport initial. `microdiff` ne définit ni identité de question ni validité sémantique d'une réponse ; Plan, §8.3 |
| 14 | Relevé et mémoire | Tient sous condition | Relevé local nécessaire ; mémoire entre composants non justifiée. Les deux fonctions ne doivent pas former un lot indivisible ; §2.10 |
| 15 | Orchestration, budgets et journal | Tient sous condition | Commencer par un parcours local fini, avec sorties et empreintes. Budgets d'API et normalisation multi-fournisseur attendent un besoin ; Plan, §10.1 et §13 |
| 16 | Installation et CI | Tient sous condition | Réemployer l'installation sans écrasement. Reporter l'écriture distante jusqu'à validation du parcours et des droits ; Plan, §12 |

### 5.2. Parties que cette liste ne suffit pas à couvrir

| Partie | Verdict | Travail nécessaire |
|---|---|---|
| Conventions exécutables | Ne tient pas | Définir une configuration typée avec un seul domicile pour chaque choix ; §2.3 |
| Jeu de questions | Tient sous condition | Adresser la vue, l'occurrence et la dépendance ; séparer choix applicatif et capacité absente. Plan, §4 et §5 |
| Mode hors ligne | Tient sous condition | Livrer lecture et validation du relevé dès le premier émetteur. Un conflit reste une demande humaine ; §2.9 |
| Provenance | Tient sous condition | Associer révision du contrat, variante et chemin de slot aux fragments ; ajouter l'origine conventionnelle et les décisions. Plan, §6 |
| Mise à jour et invalidation | Ne tient pas | Ajouter les dépendances hors contrat, préserver l'origine des choix humains et revoir les réponses encore typées mais devenues inadaptées ; §2.7 et §3.3 |
| Propriété et publication des fichiers | Tient sous condition | Définir adoption, refus d'écrasement et publication atomique des fichiers vérifiés. Plan, §9 et §12 ne fixent pas la transaction |
| Banc et règle d'arrêt | Ne tient pas | Comparer au chemin actuel et autoriser l'abandon sans autre générateur ; §2.8 |

### 5.3. Les ports : données présentes, données manquantes, ordre

Une entrée absente d'une table de port peut être ajoutée à son dossier.
Le constat est donc une sous-spécification, pas la preuve que l'architecture
serait irréalisable. En revanche, ces données sont des prérequis du lot 2.

| Frontière | Ce qui tient | Donnée ou règle à préciser |
|---|---|---|
| `capacites` | Un catalogue statique peut être interrogé sans contrat | Version de protocole, forme d'émission et paramètres des capacités. `etats` seul ne distingue pas changement de style et changement d'arbre ; §2.6 |
| `domaines` | Les réponses déjà connues permettent un domaine dépendant de l'hôte | Questions contextualisées, politiques exécutables et API réelle de l'enfant possédé. Dire qui lit cette API et comment elle traverse le port ; Plan, §9 et §10.2 |
| `emettre` | Représentation, conventions et décisions suffisent à la transformation si elles sont résolues | Identifiants d'import, chemins de sortie et interface effective des dépendances. L'adaptateur ne doit pas rouvrir silencieusement le contrat ; Plan, §6 |
| `controler` | Les artefacts sont nécessaires au contrôle de stack | Racine du projet, configuration, dépendances et portée des contrôles. `lireApiPublique` exige notamment un `tsconfig.json` ; `parite.mjs`, lignes 256 à 284 |
| Fournisseur | Questions, schéma et budget définissent une demande fermée | Identifiant de question, empreinte du contexte, refus, réponse manquante et validation après chaque tour. Le cas de réparation du §9 n'y entre pas |
| Vérificateur | Contrat et feuille de tokens fournissent des attentes normatives | Montage, observation, déclencheurs, modes, slots et politique d'acceptation ; §2.4 |
| Représentation | Les cinq parties de `vueExacteDuVariant` et les champs racine couvrent les deux origines décrites | Schéma, compatibilité et valeur de l'absence ; provenance d'une valeur composée ou d'un défaut, pas seulement chemin d'un fragment. Plan, §6 |
| Provenance émise | Localise un défaut dans une sortie | Elle ne doit pas fixer la liste des obligations à contrôler. L'absence d'un fragment doit produire un écart depuis le contrat ; §2.4 |

La lecture de l'API existante mérite une limite supplémentaire.
[`lireApiPublique`, lignes 309 à 327](../../../../../packages/adapter-typescript/src/parite.mjs),
expose booléens, texte du type et unions de chaînes quand elles sont
énumérables. Ce n'est pas un domaine fini pour un callback, un contenu React
ou une chaîne libre. Le domaine « API réelle de l'enfant » exige donc soit
une prop exposée à l'appelant, soit une décision de code hors compilation.
La simple disponibilité d'une fonction de lecture ne ferme pas ce choix.

Un ordre réalisable, dans le périmètre réduit, serait :

1. Charger et valider contrats, versions, graphe et environnement de rendu.
2. Lire capacités et politiques exécutables ; relever les API existantes.
3. Construire les adresses et questions, puis charger les décisions locales.
4. Résoudre les domaines dans l'ordre de leurs dépendances ; demander les
   réponses humaines manquantes. Détecter une dépendance non résolue.
5. Émettre dans une zone temporaire, contrôler les types dans le contexte du
   projet et observer le rendu contre les obligations du contrat.
6. Installer ensemble les artefacts acceptés et leur relevé. En cas d'échec,
   conserver les fichiers installés et rendre le motif.

Les deux tours du fournisseur constituent une réalisation possible pour les
seules dépendances `hote` puis `etat` et `accessibilite`. Ils ne sont pas une
nécessité logique universelle : un questionnaire humain peut être progressif,
et un catalogue fini peut énumérer des réponses conditionnelles. Les décisions
de composition dépendantes d'enfants ajoutent leur propre ordre. Compiler
topologiquement les enfants ne résout pas automatiquement l'API d'un enfant
dont le développeur possède toujours le fichier.

Les sorties de budget et d'usage alimentent le journal seulement sur le chemin
avec modèle. Le jeu de questions sert au développeur ; le relevé sert à la
recompilation ; les preuves servent au rapport. La provenance sert à la
localisation. Aucune sortie centrale n'est démontrée inutilisée par principe,
mais l'usage exact de la provenance dans la porte n'est pas spécifié et le
journal fournisseur n'a aucun consommateur dans le chemin hors ligne.

## 6. Banc, ordre des lots et décisions existantes

### 6.1. Ce que quatre composants peuvent établir

| Mesure ou report | Ce qui peut être établi | Ce qui reste indécidable et effet sur le plan |
|---|---|---|
| H1a, attribution | Une liste locale d'obligations et de décisions hors contrat | Une proportion de code ne prédit pas l'effort de maintenance. Ajouter temps humain et classement des écarts |
| H1b, reproduction | Une équivalence sur les cas réellement observés | Ni couverture du format entier ni vérité de la référence. La mesure exige un prototype, malgré sa place parmi les préalables du Banc, §2 |
| H2, répétition | Les collisions de réponses déjà présentes | La promotion automatique d'un genre. Le cinquième composant ne constitue pas une preuve causale |
| H3, modèle | Des réponses sur quelques questions connues | Un taux général supérieur à 95 %. Répéter cinq fois les mêmes questions n'ajoute pas de cas distincts |
| H4, mutations | La détection et le refus d'altérations choisies | L'absence de défaut non testé. Ajouter faux positifs et cas hors domaine ; §2.8 |
| H5, mise à jour | Une absence d'appel sur une transition déterministe | Le gain de temps réel et l'invalidation de l'intention. Une réponse typée peut rester fausse ; §2.7 |
| H6, relecture | Temps et erreurs des deux relecteurs sur un essai | L'accord sur la propriété des fichiers. Alterner l'ordre des deux formes pour réduire l'effet d'apprentissage ; obtenir ensuite un choix d'équipe |
| Accessibilité, Plan §18 | Recettes présentes et tests associés | Le nombre de décisions applicatives ; c'est un préalable au catalogue, pas une mesure à reporter après émission |
| Cascade, Plan §18 | Les couples potentiellement concurrents, déjà acquis | Leur joignabilité et leur visibilité. Reporter la preuve au rendu est justifié, mais pas conclure à l'émission retenue avant comparaison |
| `fragment` hors corpus, Plan §18 | Refus des constructions déclarées non supportées | Support de troncature, modes et couverture partielle ; ajouter des cas ciblés du format avant de publier la capacité |

Si l'on retire les promesses non tranchables, restent les lecteurs du kit,
la génération locale de données et de styles couverts, un relevé humain et
un contrôle limité aux observations annoncées. Fournisseur, mémoire promue,
coque universelle et preuve multi-stack disparaissent du premier périmètre.
Ce sous-ensemble demeure utile sans inventer de résultats sur un corpus futur.

### 6.2. Ordre proposé avec arrêts effectifs

| Rang | Travail | Condition de poursuite |
|---|---|---|
| 0 | Relever le parcours réel, les prérequis et le coût humain d'un réexport | Un responsable consommateur confirme le problème, sa stack et un budget ; sinon arrêt sans générateur |
| 1 | Éprouver le raccordement d'observation et quelques défauts sur du code existant | Témoin conforme accepté, défauts localisés refusés, mesures impossibles distinguées ; sinon limiter le contrôle ou arrêter |
| 2 | Comparer chemin agent réduit et génération de données séparées | Gain humain net ou défauts évités justifiant le coût sur l'horizon choisi ; sinon conserver le chemin actuel |
| 3 | Stabiliser politiques exécutables, relevé et petite représentation, puis émission retenue | Acceptation du mode de propriété et preuves pour chaque capacité annoncée |
| 4 | Ajouter invalidation, dépendants et mise à jour transactionnelle | Une transition réelle et un conflit manuel traités sans écrasement |
| 5 | Brancher la CI du consommateur | Parcours de fusion et responsabilité du refus décidés |
| Hors engagement | Fournisseur, mémoire mutualisée, autre stack et distribution autonome | Besoin réel mesuré séparément pour chaque ajout |

La porte précède donc l'industrialisation du compilateur, sans exiger de
construire son périmètre entier avant un essai d'émission. Le relevé local et
sa validation arrivent avec le mode hors ligne. Dans le découpage actuel, le
lot 2 utilise déjà ce que le lot 4 annonce construire (Plan, §10.6 et §15).

### 6.3. Les quatorze décisions du plan

| N | Rang réel | Position de la revue |
|---|---|---|
| 1 | Secondaire | La génération peut exécuter une écriture. Le préalable est la politique exécutable du §2.3, pas une variante rédactionnelle d'aide |
| 2 | Bloquante et mal posée | Choisir d'abord fixation, dérivation ou exposition de la prop d'enfant ; l'autorité de l'échantillon vient ensuite. §2.7 |
| 3 | Bloquante si coque générée | Partir des appels existants, traiter les collisions et stabiliser l'API de contenu |
| 4 | Déjà tranchée par le périmètre fermé | Une capacité absente produit un refus ou une partie humaine séparée. Une réponse libre serait une autre architecture |
| 5 | À différer | Mémoire en proposition seulement ; aucune promotion sur cinq composants |
| 6 | Sans conflit d'invariant | Un fichier de données nommé par composant est compatible. Seule une branche de moteur conditionnée par ce nom violerait la règle |
| 7 | Bloquante après connaissance de la stack | Comparer CSS exclusif, CSS avec neutralisation et données avec état explicite ; réduire le JavaScript seul n'est pas le critère |
| 8 | Non bloquante | Démarrer sans diff sémantique. Il ne corrige pas les règles d'invalidation |
| 9 | Bloquante pour adoption | Décider avec l'équipe. Proposer une coque possédée et des données séparées avant le choix binaire actuel |
| 10 | À différer | Emplacement et nom publié après validation de l'utilité ; travailler près du kit ne nécessite pas encore un nouveau paquet distribué |
| 11 | Bloquante pour le raccordement, secondaire pour le paquet | Définir données, observation et capacités. Choisir ensuite où publier cette interface |
| 12 | À différer sans date | Aucun modèle à comparer dans le premier périmètre |
| 13 | Sans objet hors ligne | Fixer d'abord le plafond de sessions et de temps de contrôle. Un budget d'API ne répond pas à ce coût |
| 14 | À remplacer | Fixer une règle d'arrêt sur utilité et gain net. H1a reste un diagnostic, pas une justification économique |

Pour les décisions 15 à 20 d'Outils : 15 peut être instruite dans l'essai du
contrôle ; 16 et 18 attendent un besoin ; 17 devient une question d'adoption
des fragments ; 19 est une correction documentaire extérieure à ce livrable ;
20 peut commencer par un relevé courant versionné dans Git. Un journal en ajout
seul n'est utile que si un usage exige de relire plusieurs décisions actives ou
leurs raisons sans passer par Git. Rien de tel n'est établi ici.

## 7. Réponses aux sept questions

1. **Faut-il construire ce module ? Non.** Le programme proposé ne se rembourse
   pas par l'économie d'API aux volumes connus (§2.1). Autoriser plutôt un
   essai de contrôle et une comparaison de génération limitée, avec abandon
   possible avant industrialisation.

2. **Faut-il construire le port fournisseur ? Non.** Le mode hors ligne suffit
   au besoin actuellement établi et aux quelques décisions du corpus (§2.10).
   « Pour toujours » n'est pas démontrable : réouvrir ce choix seulement si le
   temps humain de décision mesuré dépasse le coût d'entretien du port.

3. **La porte a-t-elle de la valeur sans le compilateur ? Oui.** Elle peut
   opposer le contrat au code possédé et détecter les écarts aujourd'hui hors
   du contrôle (§2.4). Aucun prérequis technique ne justifie son rang après le
   compilateur ; seul son raccordement d'observation doit précéder la mesure.

4. **Le contrat est-il la bonne entrée du compilateur ? Oui.** Il constitue
   l'entrée normative du rendu et conserve l'indépendance envers Figma
   (CONCEPT, §3 et §4). Il doit être accompagné des politiques de code, des
   décisions locales et de l'environnement de tokens pour produire un résultat
   accepté.

5. **Le relevé par composant respecte-t-il l'invariant sur les noms ? Oui.**
   Nommer un artefact et indexer des données n'est pas conditionner une règle
   de moteur au nom du composant (Plan, §5). La généralisation automatique par
   signature pose un problème de validité sémantique distinct, traité au §2.10.

6. **Peut-on tenir l'acceptation du mode `genere` pour acquise ? Non.** Aucun
   accord de l'équipe n'est fourni, et H6 mesure une durée de relecture, pas
   un consentement à céder la propriété des fichiers (Banc, H6). Il faut une
   mise à jour réelle suivie d'un choix explicite entre les formes essayées.

7. **Le banc mesure-t-il les bonnes choses, dans le bon ordre, avec abandon
   réel possible ? Non.** Attribution, rendu et mutations sont utiles, mais
   coût humain, prérequis consommateur et limites de l'oracle manquent aux
   décisions de départ (§2.8). Ses arrêts actuels conduisent à une autre
   génération ou retardent une campagne ; le §6.2 ajoute une sortie sans
   construction.

## 8. Décisions ouvertes par cette revue

Numérotation à la suite des décisions 15 à 20 de l'état de l'art. Ces lignes
sont des propositions soumises à l'architecte, pas des changements adoptés.

| N | Décision | Où elle se pose | Ce qu'elle change |
|---|---|---|---|
| 21 | Suspendre le programme des lots 0 à 6 au profit d'une preuve limitée, avec quelle dépense maximale et quel horizon de remboursement ? | §2.1 et §6.2 | Une règle d'arrêt portant sur le besoin réel |
| 22 | Livrer d'abord le contrôle de rendu sur code possédé, avec quel sous-ensemble d'obligations ? | §2.4 et §4 | Une valeur utile même sans générateur |
| 23 | Générer des données, une feuille CSS ou une coque, après comparaison sur un réexport réel ? | §2.5 et §4 | Le périmètre du générateur et la propriété des sources |
| 24 | Quels choix locaux deviennent des politiques typées, et où se trouve leur seule valeur exécutable ? | §2.3 | Le fonctionnement hors ligne et le traitement des conventions personnalisées |
| 25 | Pour chaque dépendance, qui choisit les props fixes, dérivées ou exposées, et comment confirme-t-il une suggestion d'échantillon ? | §2.7 | Remplace la décision 2 et préserve la frontière normative |
| 26 | Quel raccord relie signaux applicatifs, états visuels et changements de structure ? | §2.6 | Borne les capacités d'émission et les attentes de la porte |
| 27 | Quels événements invalident une décision encore valide de type ? | §2.7 et §3.3 | L'empreinte de validité et les mises à jour sans réponse silencieusement périmée |
| 28 | Adopter les fichiers générés séparés ou des régions internes identifiées, avec quel refus hors ligne en cas de conflit ? | §2.9 | Le premier passage depuis le code manuel et la sortie du mode généré |
| 29 | Quel protocole d'observation et quelles mutations discriminantes fondent l'acceptation ? | §2.4, §2.8 et §5.3 | Les limites du verdict et la prévention des contrôles circulaires |
| 30 | Retirer fournisseur et mémoire mutualisée jusqu'à quel constat de charge humaine ? | §2.10 | Le retrait du lot 4 actuel, en conservant le relevé local |
| 31 | Quel parcours de fusion et quel responsable pour les prérequis de tokens et de CI ? | §3.1 et §3.2 | L'intégration réelle chez le consommateur |

## 9. Ce qui reste à trancher et limites de preuve

| Question | Élément manquant | Effet sur le verdict |
|---|---|---|
| Gain réel de temps humain | Un réexport représentatif, son adaptation et sa relecture chronométrées | Empêche d'affirmer la rentabilité d'un générateur ; ne réfute pas son potentiel |
| Source consommateur de tokens et d'assets | Une exécution dans son environnement | Empêche de promettre une acceptation de rendu dès l'installation |
| Accord sur la coque générée | Décision de l'équipe après essai | Interdit de choisir `genere` par défaut pour les fichiers existants |
| Meilleure émission CSS | Rendu des trois alternatives sur mêmes états et même contexte | L'exclusivité logique est prouvée sur les seize cas, pas sa supériorité pratique |
| Valeur des recettes de comportement | Usages, paramètres et tests de code fournis par le consommateur | Empêche d'affirmer que cinq réponses suffisent à produire les composants attendus |
| Coût du support 14.0 | Nature du prochain changement de format | Les surfaces à migrer sont identifiées, pas la durée |
| Portabilité au-delà du web | Besoin réel et adaptateur d'une autre famille | Deux sorties web ne suffisent pas à cette preuve |

**Hypothèses à part.** L'estimation de 34 à 61 sessions peut être trop basse
si la première cible diffère du Playground. L'adoption de fichiers de données
séparés pourrait être plus facile que celle d'une coque générée, mais aucun
avis utilisateur ne le confirme. Ces deux hypothèses ne sont pas nécessaires
au constat principal : le Plan ne mesure actuellement ni son coût de
construction ni le volume d'usage qui le justifierait.

La revue conserve les chiffres de l'audit. Elle contredit explicitement sa
prémisse sur `[disabled]` appliqué à un lien (§2.6), la nécessité générale des
deux tours (§5.3) et l'interprétation d'une attribution majoritaire comme
justification de construction (§2.1 et §2.8). Elle ne prétend pas avoir prouvé
une erreur de rendu des quatre références ni remplacé les mesures du banc.

Le script d'épreuve a été lancé par `node` depuis un dossier temporaire créé
sous le répertoire temporaire du système. Il a parcouru les masques de 0 à 15,
comparé le premier signal actif aux prédicats exclusifs, puis calculé les
formules du §2.1. Aucun fichier du corpus n'a été altéré pour cette épreuve.
