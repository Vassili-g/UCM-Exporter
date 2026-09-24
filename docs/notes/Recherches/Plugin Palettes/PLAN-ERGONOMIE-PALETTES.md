# UCM Palettes : plan d’amélioration de l’ergonomie

## Résultat attendu

Le designer crée une palette, retrouve sa couleur de référence exacte, règle
les nuances en voyant leur effet, puis génère une planche lisible dans Figma.
L’aperçu des couleurs est le contenu principal. Les promesses montrent les
associations utilisables ; les détails techniques se consultent à la demande.

Ce plan est destiné à l’agent qui réalisera les changements. Les cases décrivent
du travail à faire, pas des fonctionnalités déjà livrées.

## Autorités et décisions acquises

Lire dans cet ordre :

1. les [retours du mainteneur](./REVUE-ERGONOMIE-PLUGIN-PALETTES.md#retours-du-mainteneur),
   conservés sans modification ;
2. les décisions ci-dessous, qui intègrent ses précisions sur la couleur de
   référence et ses validations de rédaction ;
3. les [décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md) et les textes
   retenus dans l’[inventaire](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) ;
4. les sections utiles de la [spécification](./RECHERCHE-PLUGIN-PALETTES.md),
   [AGENTS.md](../../../../AGENTS.md) et
   [CONTRIBUTING.md](../../../../CONTRIBUTING.md).

L’[export de validation](./validation-textes-palettes.json) contient les 462
réponses originales. Il reste intact. Une phrase validée peut disparaître
lorsque le mainteneur a demandé de supprimer le bloc qui la contient.

| Sujet | Décision à appliquer |
|---|---|
| Couleur de référence | Présente dans la palette, code hexadécimal inchangé. Le plugin choisit son profil et son numéro de nuance. |
| Profil porteur | Soft pour une référence peu intense, Vivid pour une référence plus intense. L’affectation est automatique et visible. |
| Thèmes | Même référence exacte et même profil porteur en Light et Dark ; numéro de nuance calculé séparément pour chaque thème. |
| Ajustement volontaire de la référence | Fonction distincte, exploratoire, avec aperçu et application explicite. Elle ne conditionne jamais la création d’une palette. |
| Promesse | Relation d’usage entre deux couleurs ; le contraste est la mesure qui la vérifie. |
| État « Prête » | Conservé selon la validation, associé au bilan des promesses de la palette ouverte. |
| Vocabulaire | Couleur de référence, nuance, intensité, dérive de teinte, Réglages communs, Palettes et réglages, Thème Light, Thème Dark. |
| Extrémités de la dérive | Nuances claires et nuances sombres. Elles ne correspondent pas aux deux thèmes. |
| Action de génération | « Générer sur Figma », au pied de la configuration de la palette. |
| Suppressions | Ligne de part de chroma, aide permanente au survol, phrase de succès répétée, notice LEGACY, alerte sur la couleur du bouton, bloc Boutons et avertissement permanent de remplacement sur la planche. |
| Tokens du design system | Hors périmètre ; aucun bouton inactif qui annoncerait déjà cette fonction. |

La précision sur le profil porteur remplace la recommandation antérieure
d’ancrer systématiquement la référence dans Vivid. Elle ne nécessite pas un
nouveau choix manuel Soft/Vivid à la création.

## Corrections apportées au plan

| Défaut du plan à corriger | Consigne pour l’agent |
|---|---|
| Tous les textes attendaient encore Q1 | Reprendre les textes validés et leurs ajustements. Ne pas redemander 462 validations. |
| Courbe entièrement déformée recommandée, alors que seul le rang devait s’adapter | Commencer par l’insertion exacte à la nuance la plus proche. Une déformation générale reste une autre stratégie de moteur à justifier séparément. |
| Référence toujours affectée à Vivid | Choisir le profil selon son intensité relative, puis afficher le profil et la nuance. |
| Promesse remplacée partout par contraste | Conserver la relation d’usage et montrer sa mesure avec son unité. |
| Pied fixe avec bouton, option, état, résultat et navigation | Réduire la ligne d’action ; placer les options dans un repli adjacent et le résultat dans un seul emplacement. |
| Toutes les données devaient tenir sans défiler à 440 × 520 | Préserver la vue des couleurs ; les détails et la configuration avancée restent dans le flux vertical. |
| Aperçu dynamique fondé sur les couleurs du thème Figma | Séparer le thème de l’hôte du fond choisi pour la palette. |
| Niveau « AA » indistinct selon la paire | Distinguer texte courant, grand texte et éléments graphiques. |
| Toutes les erreurs de sauvegarde rendaient les onglets inertes | Geler les gestes d’écriture concernés ; garder la consultation, l’export du brouillon et la récupération accessibles. |
| Table de promesses remplacée par un immense tableau de spécimens | Organiser par usage et par thème, avec comparaison Soft/Vivid puis états détaillés. |
| Les cadres déplacés étaient assimilés à des cadres absents | Retrouver leur identité et leur emplacement ; distinguer absence, copie et lecture impossible. |

Les anciens points Q1 à Q6 sont remplacés par les choix de ce document.
Q7 est couvert par l’exigence de référence et le lot R1b. Q8 devient
l’exploration facultative R4.10. Aucun de ces anciens points ne bloque la
reprise des textes ou la préparation des vues.

## Direction visuelle et interaction

### Garder les codes du panneau Figma

Utiliser le socle existant : Inter, corps 11 px / 16 px, libellé 12 px / 16 px,
titre 15 px / 20 px, trame de 4 px, contrôles de 24 ou 32 px, rayon du socle.
Ces valeurs viennent de
[socle.css](../../../../packages/plugin-socle/src/ui/socle.css).
Ne pas reproduire l’esthétique de la page web de validation des textes.

Les fonds, séparateurs, états de contrôle et couleurs sémantiques viennent
des variables Figma du socle. Les cadres de section ont un filet discret ;
la différence de titre, d’espacement et de densité suffit à les distinguer.
Éviter les grandes cartes flottantes, ombres décoratives, titres de page
surdimensionnés et accumulation de fonds teintés.

Deux sections structurent l’onglet Palettes : choix/création, puis
configuration de la palette. Le nuancier est une surface de prévisualisation
à l’intérieur de la seconde. Un message ne devient pas une nouvelle carte de
même poids que le nuancier.

Le bleu de marque signale une action ou une sélection. Les couleurs de
sévérité signalent un résultat. Elles ne servent pas à décorer les sections.

### Donner la place aux couleurs

L’aperçu occupe la largeur réellement disponible. Les valeurs 46 px et 31 px
du relevé initial sont des ordres de grandeur, pas des largeurs à coder en dur.
Calculer les colonnes après les espacements et bordures réels.

À 600 px, le nom du profil peut partager la rangée des nuances. À 440 px,
placer le nom et son réglage au-dessus de sa rangée pour préserver la largeur
des pastilles. Les onze numéros restent alignés avec leurs couleurs. Ne pas
réduire le corps du texte pour faire tenir un libellé.

La surface porte le fond Light ou Dark choisi dans les réglages. Les éléments
qui sont posés dessus disposent de couleurs de texte, bordure, sélection et
focus adaptées à ce fond. L’interface hors de cette surface garde le thème
de Figma. Tester aussi Figma sombre avec Thème Light, et l’inverse.

L’identification de la référence, la sélection d’une nuance et une promesse
en échec utilisent des signes différents :

- référence : repère fixe et libellé « Référence », associé au profil porteur ;
- sélection : contour de focus/sélection ;
- promesse choisie : deux couleurs reliées par leur aperçu d’usage et un
  résultat explicite.

Ne pas entourer en permanence toutes les nuances impliquées dans tous les
échecs. La paire choisie est mise en évidence ; les autres échecs restent dans
le compte et la liste.

### Révéler le détail au bon moment

Un clic ou une activation clavier ouvre le détail d’une nuance ou d’un usage.
Le survol peut signaler la cible, mais ne remplace plus un paragraphe et ne
déplace plus la page. La sélection persiste jusqu’à un autre choix.

Le détail utilise une place stable lorsqu’il est ouvert. Il peut grandir pour
un contenu long ; aucune hauteur fixe ne coupe le texte. Son ouverture
volontaire peut déplacer la suite du panneau. Éviter un second grand ascenseur
à l’intérieur de la fenêtre.

Les identifiants `solid`, `on-solid`, `text` et les autres rôles restent
retrouvables, avec un nom français. Leur explication se fait par un spécimen
réel et une phrase située. Un tableau de ratios seul ne décrit pas une promesse.

## Couleur de référence : contrat de conception

### Profil porteur automatique

Employer la part de chroma disponible déjà calculée par `partDeChroma`.
La chroma brute dépend de la luminosité et de la teinte ; une valeur de
saturation d’un autre modèle ne peut pas lui être substituée.

Règle proposée pour l’implémentation :

1. comparer l’intensité relative de la référence aux intensités **communes**
   de Soft et Vivid ;
2. retenir le profil dont la cible est la plus proche ;
3. à égalité, retenir Vivid ; une référence classée presque grise retient Soft ;
4. employer ce profil dans les deux thèmes.

Avec les valeurs communes 0,45 et 0,95, la frontière est 0,70. C’est une
règle de classement du plugin, pas un seuil perceptif universel.

Les intensités propres à la palette ne déplacent pas la référence d’un
profil à l’autre pendant un glisser. Elles modifient les nuances autour de
la référence. Une modification des intensités communes peut changer le
profil porteur : l’aperçu le montre avant la génération, avec sa nouvelle
désignation. Le classement reste dérivé des données ; aucun choix caché
n’est enregistré.

Si la mesure sur les références du mainteneur révèle un classement
manifestement inadéquat, présenter les exemples et proposer une autre
frontière. Ne jamais résoudre ce problème en modifiant la couleur fournie.

### Nuance porteuse et invariants

Pour chaque thème, chercher dans sa courbe la luminosité la plus proche de la
référence. À égalité de distance, retenir le premier numéro dans l’ordre
croissant. Le profil porteur prend à cet endroit les octets RGB exacts de la
référence. Les autres nuances conservent d’abord leur calcul habituel.

Le numéro peut donc différer entre Light et Dark. L’autre profil garde son
intensité ; il n’est pas présenté comme porteur d’une référence exacte si sa
couleur diffère. S’il produit fortuitement le même code, le repère continue de
désigner l’ancrage choisi par le moteur.

La référence ne passe pas par un aller-retour de conversion qui pourrait
changer un octet. Les valeurs L/C/H publiées dans les aperçus et les rapports
sont celles de la couleur réellement utilisée à cette nuance.

L’exigence tient aussi pour une référence plus claire ou plus sombre que la
courbe : l’extrémité la plus proche devient porteuse. Le noir, le blanc, les
gris et les références proches d’un changement de rang font partie des cas
à traiter. Ne pas masquer ces références avec un message « hors palette ».

La suite des luminosités cibles doit garder son sens. Après quantification
en couleurs affichables, deux nuances peuvent se confondre ; ne pas écrire
une loi de stricte différence sur toutes les couleurs à 8 bits sans en établir
la possibilité. Signaler un doublon utile au réglage sans changer la référence.

Les promesses sont recalculées sur les couleurs finales, après insertion.
Une promesse peut ne plus être respectée. Le plugin montre alors le problème
et permet de régler les autres couleurs ; il ne corrige jamais silencieusement
la référence pour faire passer un contrôle.

### Repère commun aux vues

Exemple de libellé : « Couleur de référence · Soft · nuance 400 ».
Il accompagne le code hexadécimal et le repère de la pastille.

L’aperçu, l’éditeur de dérive, la fiche Planche et le cadre Figma utilisent
la même désignation calculée. Chaque vue reçoit le thème, le profil et le
numéro ; aucune ne retrouve la référence par proximité de nom ou de couleur.

Le graphe de dérive utilise la courbe effective du profil qu’il montre.
Lorsque ce profil porte la référence, le pivot tombe sur sa colonne exacte.
Dans l’autre profil, un pivot mathématique n’est pas étiqueté comme une
pastille égale à la référence.

## Promesses et niveaux de contraste

Le détail d’une promesse donne l’association, le thème, le profil, l’état,
le ratio mesuré, le minimum demandé et le résultat. L’aperçu montre le
premier élément dans le second : par exemple le texte `on-solid` dans le
fond `solid`.

`on-solid` utilise la couleur de fond du thème dans le moteur actuel. Il n’a
pas de numéro de nuance. Son repère vise une pastille de fond distincte ;
ne pas inventer une nuance 50 pour compléter une liaison.

Le verdict de la promesse suit le seuil configurable. Les niveaux WCAG
suivent leurs critères propres :

| Ratio mesuré, sans arrondi avant classement | Texte courant | Grand texte | Éléments graphiques concernés |
|---|---|---|---|
| Au moins 7:1 | AAA | AAA | Minimum 3:1 atteint |
| De 4,5:1 inclus à 7:1 exclu | AA | AAA | Minimum 3:1 atteint |
| De 3:1 inclus à 4,5:1 exclu | Insuffisant | AA | Minimum 3:1 atteint |
| Moins de 3:1 | Insuffisant | Insuffisant | Minimum 3:1 non atteint |

Le grand texte dépend de sa taille et de sa graisse. Un simple couple de
couleurs ne prouve pas cette condition. Afficher « AA grand texte » comme
un usage possible, jamais comme le niveau d’un texte dont la taille est inconnue.
Les critères de contraste non textuel ne définissent pas une gradation
« AAA » à déduire d’un ratio plus élevé.

Sources : [contraste du texte, critère 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[contraste renforcé, critère 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html),
[contraste non textuel, critère 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Ne pas ajouter de seuil AAA dans les données enregistrées. La mesure
existante suffit à classer le ratio. Une promesse respectée avec un seuil
texte abaissé à 4 peut rester insuffisante pour AA texte courant ; les deux
résultats restent distincts.

Une grille exhaustive compare toutes les nuances. Sa légende classe des
ratios, sans appeler chaque case une promesse. Une bordure décorative sans
promesse affiche « Non applicable » pour ce contrôle.

## Ordre d’exécution

| Étape | Lots | Dépendance |
|---|---|---|
| Préparer les règles et les vues | R0 | Textes et décisions de ce plan |
| Définir les messages et l’ancrage | R1, R1b | Spécification correspondante |
| Construire la vue de travail | R2, R3, R4, R5 | R1 ; repère exact après R1b |
| Organiser le document | R6, R7 | État partagé de la palette ; R1b pour les aperçus définitifs |
| Dessiner la planche | R8 | R1b, R4 et R6 |
| Achever la récupération et la recette | R9 | Parcours complets |

R6 et R7 peuvent avancer pendant R4/R5. Les traitements de conflit
d’enregistrement de R9.1 accompagnent chaque nouveau contrôle dès sa création.
R4.10 reste exploratoire et ne bloque aucun lot.

Chaque lot lit ses exigences, prépare les exemples représentatifs et met à
jour la documentation concernée. Les règles de code et de tests viennent de
CONTRIBUTING.md. Préserver les modifications des autres sessions. La lecture
de ce plan ne constitue pas une demande de publier ou de pousser le dépôt.

Une capture ne prouve ni une interaction ni une sauvegarde. Une assertion
sur le modèle ne prouve pas la qualité du rendu dans Figma. Les critères de
chaque lot précisent le type de preuve attendu lors de son implémentation.

## Lot R0 : règles, textes et composition

- [x] **R0.1** Préciser dans CONTRIBUTING.md les surfaces propres à Palettes,
  sans modifier la règle d’Exporter. Le nuancier peut dominer le panneau ;
  l’action de génération reste rattachée à la palette configurée.
  Fait : section « Les surfaces d’UCM Palettes » de CONTRIBUTING.md.
- [x] **R0.2** Mettre à jour les exigences UI-02, UI-04, UI-05, PLA-06 à
  PLA-10, DER-01, DER-12, VER-12 et les sections 9.3, 9.5, 11.3, 11.4 et
  13.2. R1b porte MOT-17 et les conséquences sur les autres calculs.
  Fait : la spécification décrit l’état visé. Ajouts : `[VER-13]` (niveaux
  WCAG), `[VER-14]` (groupes et sévérités), `[VER-15]` (cibles d’action),
  `[DER-17]` (bilan sous l’éditeur). VER-12 est retirée. Les promesses de la
  planche se groupent en huit associations (section 9.4), le même
  regroupement que R1.5. Le graphe de dérive garde l’abscisse de la courbe
  claire (DER-02, DER-04), décision prise après la revue de R1b.
- [x] **R0.3** Ajouter les états nécessaires à la galerie : création ouverte,
  référence Soft, référence Vivid, promesse choisie, fond personnalisé,
  génération réussie, génération partielle, cadre déplacé, conflit de
  sauvegarde et import avec différences.
  Fait : huit états annoncés dans `galerie/etats.cjs`, chacun avec la case
  qui le rendra atteignable ; le conflit de sauvegarde et l’import avec
  différences existent déjà (`recette-modifiee-ailleurs`, `ecart-d-import`)
  et changent avec R9.
- [x] **R0.4** Préparer les compositions Palettes, Planche et Réglages
  communs aux deux tailles. Utiliser le socle réel pour rendre les espacements
  et les contrôles examinables. Ne pas inventer une seconde bibliothèque
  visuelle pour ces maquettes.
  Fait : section 13.2 de la spécification, à 600 et à 440 px de large. Le
  rendu examinable est celui de la galerie, construite sur le socle, à mesure
  que les lots livrent les contrôles.
- [x] **R0.5** Construire une table des textes par identifiant T/H/A et des
  ajouts N de l’inventaire. Les textes retirés ne passent pas dans le code.
  Les changements d’affichage ne renomment aucune clé enregistrée.
  Fait : l’inventaire reste la table T/H/A ; sa section « Ajouts de
  l’implémentation » porte les textes N, marqués « Plan » ou « À valider ».
- [ ] **R0.6** Donner des exemples complets de messages assemblés :
  sujet, explication, ratio et action. Examiner le rendu avec un nom long,
  le singulier et le pluriel.

Critère : l’agent peut désigner l’emplacement de chaque contrôle sans
accumuler tous les états sur un seul écran. Les textes validés ne font pas
l’objet d’une nouvelle validation générale.

## Lot R1 : promesses et messages

- [ ] **R1.1** Retirer l’alerte `reference-plus-claire-que-bouton` et le
  bloc Boutons associé, avec leurs chemins d’affichage et leurs attentes de
  tests obsolètes. Ne pas retirer l’usage `solid` ni sa promesse.
- [ ] **R1.2** Retirer la notice `LEGACY` de l’interface et de la planche.
  Conserver la politique de conversion des couleurs et les informations
  techniques nécessaires au rapport.
- [ ] **R1.3** Présenter la proximité Soft/Vivid près du réglage qui peut
  agir : intensités locales si personnalisées, sinon Réglages communs.
  Garder un indice discret sur les nuances concernées. Ne pas déplacer
  systématiquement ce constat vers un réglage global inopérant.
- [ ] **R1.4** Remplacer la notice répétée sur une référence plus vive par
  un repère d’intensité. La référence exacte n’est jamais décrite comme
  plus terne qu’elle-même. Les nuances autour d’elle peuvent différer.
- [ ] **R1.5** Regrouper les échecs par paire, thème et état ; montrer
  séparément le résultat de Soft et de Vivid. Le compte reste celui des
  contrôles, pas celui des blocs de messages.
- [ ] **R1.6** Définir des cibles d’action typées indépendantes des phrases :
  intensités locales, dérive, luminosité commune, fonds, intensités communes.
  Une fonction de présentation choisit l’action selon la cause connue et la
  portée du réglage. Les textes ne pilotent pas le routage.
- [ ] **R1.7** Rattacher un écart entre couleurs générées et aperçu à la
  génération de la palette concernée. Résumé près de son action et état
  dans Planche ; détails dans le rapport. Ne pas cacher toute erreur dans
  un autre onglet après un clic sur Générer.
- [ ] **R1.8** Réserver l’exception brute aux détails techniques et au
  rapport. Le message principal nomme l’arrêt et les palettes déjà créées.
  Préserver les cadres existants quand un remplacement échoue.
- [ ] **R1.9** Afficher « Prête » avec le bilan lorsque toutes les promesses
  sont respectées ; sinon le nombre de promesses à corriger. Une promesse
  en échec ne bloque pas la génération d’une planche de travail.
- [ ] **R1.10** Conserver les données de diagnostic utiles au rapport même
  lorsqu’une notice disparaît de l’écran. Si le format du rapport change,
  définir sa compatibilité avant d’ajouter les détails d’erreur.

Critère : chaque message nomme un problème ou une information utile, situe
la palette et mène au contrôle pertinent. Les mesures de proximité ne
dominent plus la création d’une palette ordinaire.

## Lot R1b : ancrer la référence exacte

Ce lot change le moteur. Il précède toute présentation qui affirme qu’une
pastille est égale à la référence.

- [ ] **R1b.1** Réécrire MOT-17 : profil automatique, nuance par thème,
  référence inchangée, classification de gris, égalités et cas extrêmes.
  Décrire l’écart avec les courbes communes, sans promettre une régularité
  parfaite de tous les pas.
- [ ] **R1b.2** Ajouter une fonction pure de désignation du profil et de la
  nuance porteuse. Elle fournit une donnée partagée à l’analyse, au graphe,
  à l’aperçu, au rapport et au modèle de planche.
- [ ] **R1b.3** Insérer les octets exacts de la référence dans le profil
  porteur pour chaque thème. Recalculer mesures et promesses après cette
  insertion. Les autres couleurs gardent le calcul habituel.
- [ ] **R1b.4** Couvrir par des cas déterministes : terne vers Soft, saturée
  vers Vivid, égalité, gris, noir, blanc, référence hors de la courbe et
  changement de nuance entre thèmes. Ajouter des propriétés sur l’identité
  exacte et la cohérence de désignation des vues.
- [ ] **R1b.5** Revoir les vecteurs attendus, les lois de luminosité et de
  chroma et la garantie des courbes. Une garantie calculée sur la courbe
  commune n’établit plus toutes les promesses de la palette ancrée.
  Conserver les échecs réels au lieu d’abaisser les seuils pour les effacer.
- [ ] **R1b.6** Garder le format enregistré si l’ancrage reste entièrement
  dérivé. Toute nouvelle donnée persistante demande une décision de format
  et une migration, notamment pour l’éventuel ajustement volontaire R4.10.
- [ ] **R1b.7** Relever l’effet sur les voisins de la référence et les
  promesses avec les couleurs du mainteneur. Une marche visuelle trop forte
  conduit à une proposition de stratégie différente, jamais à une
  altération silencieuse de la référence.
- [ ] **R1b.8** Mettre à jour l’invariant du moteur et les empreintes des
  cadres. Vérifier aussi le rendu Display P3 : conserver l’hexa sRGB de
  référence et convertir la peinture selon le profil du document.

Critère : la référence exacte est retrouvée dans le bon profil des deux
thèmes. Le repère de l’interface, les couleurs générées et les ratios évalués
décrivent les mêmes valeurs.

## Lot R2 : sévérités et repères

- [ ] **R2.1** Distinguer blocage d’écriture, promesse à corriger, point à
  vérifier et information. Un échec de promesse a un signal de danger plus
  net qu’une proximité de couleurs, sans transformer tout le nuancier en
  surface rouge.
- [ ] **R2.2** Donner à chaque groupe son titre et son nombre. Une
  information ordinaire reste secondaire ; aucune alerte permanente ne
  félicite la génération de couleurs attendues.
- [ ] **R2.3** Employer texte, icône ou forme en plus de la couleur.
  Réserver `role="alert"` aux événements qui demandent une intervention
  immédiate ; ne pas l’annoncer à chaque mouvement de poignée.
- [ ] **R2.4** Différencier référence, focus, sélection et paire inspectée
  dans les thèmes de l’hôte et sur les fonds personnalisés.

Critère : sans lire la couleur du signal, le designer distingue le résultat,
l’objet sélectionné et la référence.

## Lot R3 : onglet Palettes

```text
Palette
[● Nom de la palette             ▾] [+] [⋯]
  Création ouverte ici, seulement après +

Configuration · Nom                     Prête
Couleur de référence [■ #A0B599]     Nom [       ]
Référence : Soft · nuance 400

[Thème Light] [Thème Dark]           Fond [■] Modifier
┌ Nuancier sur le fond du thème ─────────────────────┐
│ Numéros alignés · Soft · Vivid · repère Référence   │
│ Usages et accès au détail de la nuance choisie      │
└───────────────────────────────────────────────────┘
Intensité Soft  [────●────]   Vivid [───────●─]
▸ Configuration de la dérive      Tailwind · …
Promesses     bilan puis associations à corriger

[Générer sur Figma]                 Afficher dans Figma
Options de génération ▸            À jour / À mettre à jour
```

- [ ] **R3.1** Créer les deux sections décrites, en conservant les éléments
  DOM pendant les rendus. Un changement de résultat ne fait pas perdre le
  focus du champ en cours.
- [ ] **R3.2** Ouvrir la création sous le sélecteur. Demander couleur et
  nom, permettre la sélection Figma et l’annulation. Après création,
  sélectionner la palette et ouvrir sa configuration. Après annulation,
  rendre le focus au bouton plus.
- [ ] **R3.3** Retirer les lignes de part de chroma, d’aide au survol et de
  succès répétées. Conserver les informations utiles dans leur contrôle ou
  leur résultat.
- [ ] **R3.4** Associer le nom, la référence et le bilan à la palette
  ouverte. Un résultat d’une autre palette ou d’une ancienne demande
  ne remplace jamais ce sujet.
- [ ] **R3.5** Placer Générer sur Figma en fin de configuration. Une barre
  compacte peut rester visible pendant le défilement à la taille par défaut ;
  à la taille minimale, la laisser dans le flux si elle masque l’aperçu ou
  un champ. Une seule ligne forte : génération et accès au cadre.
- [ ] **R3.6** Porter l’option de grille dans un état partagé, avec un
  résumé visible près des actions qui l’utilisent. Garder le détail des
  options replié ; ne pas dépendre d’une case cachée dans l’autre onglet.
- [ ] **R3.7** Ouvrir et focaliser les réglages depuis les messages. Le
  retour conserve palette, thème, nuance sélectionnée et position de lecture.
- [ ] **R3.8** Traiter la suppression en action destructive, confirmer ses
  conséquences et préserver l’annulation accessible. Une suppression ne
  supprime pas silencieusement le cadre dessiné.
- [ ] **R3.9** Après génération, remplacer l’état de l’action par son
  résultat et proposer l’accès au cadre. Rendre les erreurs dans cette même
  zone. Ne pas empiler une nouvelle bannière à chaque clic.

Critère : à 440 × 520, le choix de palette et un nuancier lisible ont la
priorité. Les contrôles supplémentaires s’atteignent par défilement, sans
barre flottante qui recouvre le contenu.

## Lot R4 : nuances, usages et intensités

- [ ] **R4.1** Peindre le fond de prévisualisation et adapter tous les
  éléments qu’il contient. Le lien Modifier ouvre Couleurs de fond dans les
  Réglages communs, avec retour vers l’aperçu initial.
- [ ] **R4.2** Répartir les pastilles sur la largeur utile et conserver une
  cible clavier par nuance. Sur petit écran, les noms de profils passent
  au-dessus des rangées.
- [ ] **R4.3** Garder les numéros alignés entre Soft et Vivid et afficher
  leurs fonctions. Les plages d’états se déduisent de TABLE_DES_EMPLOIS et
  decalagesDeLEmploi ; aucune copie d’une seconde table métier.
- [ ] **R4.4** Afficher l’ancrage exact fourni par R1b. Le libellé nomme
  référence, profil et numéro ; le repère change de colonne avec le thème.
  Ne jamais contourer la simple nuance la plus proche comme si elle était
  identique à la référence.
- [ ] **R4.5** Organiser les usages en familles Fonds, Bordures et focus,
  Fonds pleins, Textes. À 600 px, montrer leurs plages dans des lignes
  compactes. À 440 px, un sélecteur de famille peut réduire les pistes
  simultanées ; le nom des familles et le lien vers chaque usage restent
  visibles. Focus, bordure décorative et bordure de contrôle ne fusionnent
  pas en une promesse fictive.
- [ ] **R4.6** Au clic sur une nuance : hexa, usages, rôle éventuel de
  référence, mesures contextualisées. Au clic sur un usage : spécimen,
  états disponibles, partenaire de sa promesse et résultat Soft/Vivid.
  Les mesures avancées sont repliées.
- [ ] **R4.7** Une promesse sélectionnée désigne ses deux couleurs et
  montre un spécimen commun. Lorsque l’une est le fond du thème, désigner la
  pastille de fond. Une demande située dans l’autre thème bascule ce thème
  explicitement et conserve un chemin de retour.
- [ ] **R4.8** Montrer les intensités Soft et Vivid près des rangées, avec
  curseur et saisie numérique. Un glisser prévisualise ; la fin du geste
  enregistre ; Échap restaure l’état avant geste. Soft ne dépasse pas Vivid.
  Afficher l’origine commune/personnalisée et un retour au réglage commun.
  La nuance de référence reste inchangée dans son profil porteur.
- [ ] **R4.9** Conserver flèches, Origine, Fin, Entrée/Espace et focus
  visible. Une copie de code est un geste distinct de la sélection : cliquer
  une pastille ne copie pas et ne navigue pas simultanément.
- [ ] **R4.10** Explorer séparément « Ajuster la référence ». Présenter la
  référence originale, la proposition, le numéro visé et un aperçu des
  promesses. Offrir de petits incréments/décréments, une saisie et une
  annulation. La valeur d’un pas reste à établir. Seul Appliquer change la
  référence ; l’originale doit pouvoir être restaurée après réouverture.
  Définir la migration nécessaire avant de persister cette origine.
  Aucun alignement automatique, aucun changement imposé pour respecter
  une courbe, aucun effet de bord à la simple ouverture du panneau.

Critère : le designer peut nommer sa référence exacte, identifier l’usage
d’une nuance, voir une promesse et modifier l’intensité sans perdre son point
de comparaison. L’exploration R4.10 ne retarde pas ces fonctions.

## Lot R5 : dérive de teinte

- [ ] **R5.1** Placer Configuration de la dérive sous le nuancier, avec le
  préréglage et un résumé à droite. À largeur minimale, le résumé passe sur
  une ligne suivante ; le titre reste entier.
- [ ] **R5.2** Utiliser les désignations et courbes effectives de R1b. La
  référence est fixe dans son profil porteur pendant le déplacement des
  poignées. Une autre teinte pivot ne se présente pas comme une autre base.
- [ ] **R5.3** Utiliser ±30° comme amplitude initiale lorsque les valeurs y
  tiennent, puis des paliers lisibles jusqu’à ±90°. Figer l’échelle pendant
  un glisser ; réévaluer avant ou après le geste pour éviter un saut sous
  le pointeur. Les valeurs extrêmes restent accessibles au clavier et en
  saisie numérique.
- [ ] **R5.4** Employer un contrôle coché « Synchroniser la dérive de soft
  et vivid ». Décoché, montrer le sélecteur de profil et différencier les
  courbes par le trait et leur nom. Le recochage confirme le remplacement
  de Soft par Vivid si leurs réglages diffèrent.
- [ ] **R5.5** Garder un bilan des promesses près de l’éditeur et actualiser
  le spécimen choisi. Les annonces assistives sont regroupées à la fin du
  geste, sans lecture continue de chaque valeur.
- [ ] **R5.6** Employer Nuances claires / Nuances sombres sur les poignées.
  Les champs et leurs unités restent lisibles à 440 px. Les boutons de
  préréglage restaurent le réglage annoncé, sans toucher à l’hexa de référence.

Critère : le déplacement reste prévisible, la désynchronisation se comprend
par l’état du contrôle et la référence reste identifiable dans le graphe.

## Lot R6 : onglet Planche et cadres retrouvés

- [ ] **R6.1** Une fiche par palette, dans l’ordre enregistré : nom,
  aperçu de Soft et Vivid, profil/nuance de référence, bilan des promesses,
  état du cadre. Une bascule de thème commune à la liste évite un onglet
  répété sur chaque fiche. Ne pas réduire la vue à une seule rampe Vivid.
- [ ] **R6.2** Séparer les états du cadre et les promesses. À jour,
  À mettre à jour, Pas encore sur la planche, Lecture impossible et Copie
  ont des sens distincts. Un ratio insuffisant n’est pas une panne de
  génération.
- [ ] **R6.3** Trois gestes : Afficher dans Figma, Modifier la palette,
  Générer sur Figma. Le premier est proposé seulement pour une cible
  localisée. Le deuxième conserve la palette et le thème choisis.
- [ ] **R6.4** Proposer la génération des palettes à mettre à jour et
  l’accès à Tout générer. Gérer singulier/pluriel et confirmer les
  générations volumineuses. Montrer progression, annulation si réellement
  supportée, et résultat partiel par palette.
- [ ] **R6.5** Garder le compte de palettes en tête. Ranger import, export,
  rapport et détails techniques dans une section secondaire identifiée.
- [ ] **R6.6** Résoudre d’abord les identifiants enregistrés, valider les
  marqueurs de propriété et retrouver page, parent et position réels.
  Prévoir un cadre déplacé dans une section ou sur une autre page, sans
  assimiler une copie à l’original. Définir et vérifier les capacités de
  lecture avec documentAccess dynamic-page avant le code qui en dépend.
  Aucun chargement complet du document à chaque saisie.

  Au remplacement, préserver parent, ordre et placement effectif. Le seul
  couple x/y ne suffit pas dans un parent transformé ou en auto layout.
  Une lecture impossible ne devient pas « jamais générée » et n’autorise
  pas un doublon silencieux. Si le scan de secours reste borné à la page
  connue, l’interface annonce cette limite et propose une recherche
  explicite. Le plan n’autorise pas une reconstitution de réglages depuis
  les couleurs d’un cadre d’origine inconnue.
- [ ] **R6.7** Actualiser à l’ouverture du plugin, à l’accès à Planche et
  après génération. Prévoir une actualisation explicite pour les gestes
  externes que les événements Figma ne permettent pas de suivre. Borner
  le coût ; aucune boucle qui parcourt le document en continu.
- [ ] **R6.8** Adapter les données de suivi si plusieurs pages deviennent
  possibles. Une ancienne entrée unique de page doit rester lisible ;
  distinguer version du suivi des cadres et version des palettes/réglages.

Critère : déplacer ou ranger un cadre ne crée pas une seconde planche au
clic suivant. Une cible introuvable est distinguée d’une cible jamais créée.

## Lot R7 : Réglages communs

- [ ] **R7.1** Reprendre la même échelle typographique que Palettes.
  Réserver le gras aux titres de groupe ; valeurs et libellés de champs
  gardent le poids courant.
- [ ] **R7.2** Présenter dans l’ordre : Couleurs de fond, Intensités,
  Luminosité des nuances, puis les groupes repliés Minimums des promesses
  et Détection des couleurs proches. Les textes détaillés restent associés
  aux champs qu’ils expliquent.
- [ ] **R7.3** Conserver un aperçu compact de la palette ouverte et un
  bilan global des promesses. En l’absence de palette, afficher les
  réglages sans inventer une palette de marque.
- [ ] **R7.4** Montrer les courbes au-dessus des valeurs. Les champs restent
  utilisables au clavier. Distinguer courbe commune et point de référence
  réellement inséré ; la garantie commune ne remplace pas les résultats
  des palettes.
- [ ] **R7.5** Rétablir les valeurs par défaut d’un groupe sans écraser
  les autres groupes ou les intensités personnalisées des palettes.
  Afficher combien de palettes sont concernées ; il s’agit d’une portée,
  pas d’une confirmation d’enregistrement.
- [ ] **R7.6** Associer hexa, pastille et sélecteur de couleur complet avec
  aperçu. Réutiliser le contrôle existant en premier lieu. Si le sélecteur
  natif ne répond pas au besoin dans Figma, choisir un contrôle embarqué
  après examen de son interaction et de son coût, sans requête externe.
- [ ] **R7.7** Ouvrir le bon groupe depuis les liens, conserver le contexte
  de retour et rendre le focus au déclencheur. L’engrenage reste l’entrée
  générale des réglages.
- [ ] **R7.8** Employer les textes retenus et afficher l’unité de chaque
  mesure avancée. Ne pas renommer une intensité relative en pourcentage
  de saturation HSL.
- [ ] **R7.9** Prévisualiser une saisie valide ; conserver les saisies
  intermédiaires sans écraser leur champ. Enregistrer selon le geste
  prévu, avec retour visible en cas de refus.

Critère : le designer voit l’effet de ses réglages, sait quelles palettes
sont concernées et retrouve son point de départ après fermeture.

## Lot R8 : planche générée dans Figma

La planche est un livrable destiné à être parcouru et partagé. Sa hiérarchie
reprend les concepts du plugin, sans recopier les contraintes d’une fenêtre
étroite.

- [ ] **R8.1** En-tête : nom, référence, bilan des promesses.
  Retirer version, empreinte imprimée, espace technique du document et
  avertissement permanent de remplacement. Garder les métadonnées utiles
  dans les données de plugin et le rapport. L’empreinte ne dépend plus d’un
  texte qui doit contenir sa propre empreinte.
- [ ] **R8.2** Bloc Couleur de référence : grande pastille, hexa, profil
  porteur et nuance de chaque thème. Regrouper les contrastes comparés
  dans un tableau légendé ; placer les mesures avancées dans une zone
  séparée. Toute chaîne présentée comme copiable en CSS doit utiliser
  la syntaxe machine, avec points décimaux ; un affichage français à
  virgules reste une mesure à lire.
- [ ] **R8.3** Chaque rangée nomme Soft ou Vivid, sans ligne « part ».
  Le repère exact se retrouve au même endroit que dans l’aperçu du thème.
- [ ] **R8.4** Délimiter chaque section Light/Dark par un filet visible sur
  fond blanc et sombre. La peinture utilise le profil de couleur du
  document. Les couleurs de légende restent distinctes des couleurs de
  la palette.
- [ ] **R8.5** Une nuance porte son numéro, son hexa et ses usages.
  Donner les contrastes utiles avec un nom de comparaison ; ne pas
  empiler systématiquement tous les ratios et L/C/H sous chaque pastille.
  Retirer le doublon soft.50 lorsque profil et numéro sont déjà lisibles.
- [ ] **R8.6** Organiser les promesses par thème puis usage. Une fiche ou
  ligne principale montre l’association et compare Soft/Vivid sur le
  même fond. Les états Repos, Survol, Appui sont alignés sous leur usage,
  avec leur propre ratio et résultat. Toutes les paires du moteur restent
  représentées ; ne pas les réduire aux seules promesses principales.
- [ ] **R8.7** Ajouter titre de thème/profil, numéros sur les deux axes,
  légende des ratios et valeur dans chaque cellule de la grille.
  Les catégories de couleurs sont expliquées en mots. Distinguer
  cette comparaison exhaustive des promesses prévues par le moteur.
- [ ] **R8.8** Définir la hiérarchie de planche avec des styles nommés :
  titre de palette, thème, usage, valeur, note. Prévoir des largeurs
  suffisantes et charger toutes les polices avant le premier calque.
  Une longue palette ne coupe ni hexa ni résultat.
- [ ] **R8.9** Retirer les noms internes des seuils de la légende.
  Expliquer comment lire une promesse et comment distinguer Soft/Vivid
  par les spécimens, avec une aide courte seulement si nécessaire.
- [ ] **R8.10** Répercuter toute modification du modèle dans sa fraîcheur.
  Les anciens cadres deviennent À mettre à jour. Préserver la
  confirmation des calques ajoutés même si l’avertissement permanent
  disparaît de la planche.

Critère : le designer trouve la référence, choisit un usage et comprend
une promesse avec son spécimen. Il peut lire la grille sans deviner ses axes
ou la signification de ses couleurs.

## Lot R9 : récupération et clôture

- [ ] **R9.1** En cas de conflit d’enregistrement, préserver le brouillon,
  bloquer les gestes qui écriraient une version périmée et garder les vues
  consultables. L’export du brouillon et Recharger restent accessibles.
  Ne pas rendre la bannière de récupération inerte avec les éditeurs.
- [ ] **R9.2** Avant import, montrer les palettes ajoutées/retirées et les
  valeurs modifiées. Distinguer changement de couleurs, changement de
  minimums et conséquence sur la planche. Aucune écriture avant la
  confirmation ; une annulation conserve le brouillon.
- [ ] **R9.3** Exécuter la recette ci-dessous sur les parcours finis.
  Consigner les observations et les limites restantes sans déclarer
  terminée une interaction vérifiée uniquement en capture.
- [ ] **R9.4** Mettre à jour AGENTS.md, spécification et liens du plan
  de développement. Marquer l’ancien TEXTES-A-VALIDER comme référence
  remplacée si nécessaire ; ne pas supprimer les réponses du mainteneur.
- [ ] **R9.5** Construire ensemble code et interface distribués et
  recharger le plugin avant la recette Figma. Une différence de version
  entre les deux ne doit pas être confondue avec un défaut de couleur.

Critère de clôture de l’implémentation : contrôles du dépôt appropriés,
typecheck, build complet, tests d’interface Palettes et recette Figma
terminés. Cette revue documentaire ne les exécute pas.

## Recette mainteneur et critères d’acceptation

| Scénario | Résultat observable | Lots |
|---|---|---|
| Créer depuis le bouton plus | Formulaire sous le sélecteur ; nom et référence ; palette ouverte après création | R3 |
| Utiliser la sélection Figma | Lit sa couleur de remplissage ; n’annonce pas la récupération d’une palette complète | R3 |
| Référence terne | Repère Soft explicite ; hexa fourni retrouvé sans modification | R1b, R4, R8 |
| Référence saturée | Repère Vivid explicite ; hexa fourni retrouvé sans modification | R1b, R4, R8 |
| Changer Light/Dark | Même hexa et profil porteur, numéro éventuellement différent et annoncé | R1b, R4, R5 |
| Noir, blanc, gris, référence hors courbe | Référence conservée et classée ; aucun faux repère sur une couleur proche | R1b |
| Régler l’intensité locale | Aperçu des nuances ; référence intacte ; aucune bascule de profil pendant le glisser | R4 |
| Régler les intensités communes | Portée visible ; affectation éventuelle de la référence rendue explicite | R1b, R7 |
| Choisir on-solid sur solid | Vrai spécimen texte/fond ; partenaire de fond identifié ; ratio et minimum lisibles | R1, R4 |
| Une promesse échoue dans deux profils | Un groupe de lecture, deux résultats, compteur cohérent | R1 |
| Minimum de texte abaissé | Promesse et niveau WCAG restent deux résultats distincts | R1, R4, R8 |
| Déplier la dérive | Sous l’aperçu ; référence identifiée ; titre et résumé lisibles | R5 |
| Désynchroniser puis resynchroniser | Profil actif évident ; confirmation de remplacement ; annulation sans perte | R5 |
| Générer depuis Palettes | Action en fin de configuration ; progression et résultat au même endroit | R3 |
| Échec ou génération partielle | Cadres précédents conservés ; palette fautive identifiée ; reprise accessible | R1, R6, R9 |
| Ouvrir Planche avec huit palettes | Aperçus Soft/Vivid, états et trois actions faciles à distinguer | R6 |
| Déplacer le cadre dans une section/autre page | Retrouvé par identité ; pas de doublon silencieux | R6 |
| Copier ou supprimer un cadre | Copie distincte de l’original ; absence distincte d’une erreur de lecture | R6 |
| Modifier un fond puis revenir | Aperçu réactualisé ; palette, thème, sélection et focus retrouvés | R7 |
| Conflit de sauvegarde | Brouillon exportable ; aucune écriture perdue présentée comme enregistrée | R9 |
| Importer puis annuler | Différences lisibles ; aucune donnée remplacée | R9 |
| Lire la planche | Référence, usages, promesses et légendes identifiables sans le plugin | R8 |
| Interface minimale et contenus longs | Aucun chevauchement, aucune action masquée par le pied, défilement vertical utilisable | R0–R9 |
| Navigation clavier | Focus visible, sélection persistante, retour après dialogue, mêmes fonctions qu’à la souris | R3–R7 |

La recette visuelle couvre 600 × 720 et 440 × 520, les deux thèmes Figma,
les deux thèmes de palette, un fond personnalisé saturé, un nom long et
plusieurs promesses en échec. La galerie sert la densité et les interactions ;
le rendu réel dans Figma sert la comparaison avec le panneau natif.

## Relevés existants et limites

Le plan initial rapportait un échantillon de 39 références : dix-sept couleurs
Tailwind 500, dix-sept 600, puis #B00100, #A0B599, #FACC15, #1E6FD9 et #2B760F.
Ces mesures n’ont pas été rejouées pendant cette revue.

| Observation rapportée | Utilité pour l’implémentation |
|---|---|
| 0 promesse en échec avant ancrage ; 37 alertes sur le bouton ; 25 proximités Soft/Vivid | Motive la réduction des messages systématiques, sans garantir les mêmes résultats après ancrage. |
| Proximités surtout sur la nuance 100 | Éviter une alerte globale lorsque la différence n’est utile que dans un usage local. |
| Sur 78 décalages Tailwind, 76 étaient dans ±30° | Point de départ pour l’échelle ; les valeurs extrêmes restent supportées. |
| Insertion simple et courbe déformée produisaient des échecs différents | Recalculer les promesses finales ; aucune stratégie ne justifie de retoucher la référence. |
| Recherche limitée aux enfants directs de la page connue | Couvre mal le rangement courant dans des sections et les déplacements. |

Ces relevés sont des indications, pas des seuils de test ni une preuve de
conformité du futur moteur. Les mesures utiles sont à rendre reproductibles
dans le lot qui change le comportement.

## Hors périmètre

- Création de variables et ajout aux tokens du design system.
- Reconstruction de réglages depuis une planche étrangère sans données
  d’origine.
- Modification silencieuse de la référence pour satisfaire une courbe ou un
  contrôle de contraste.
- Déformation générale des courbes sans comparaison et décision explicites.
- Livraison obligatoire de l’exploration Ajuster la référence avant la
  refonte d’ergonomie.
