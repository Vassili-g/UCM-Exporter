# Revue critique de l’architecture de tokens multi-marques

La forme retenue est dans
[ARCHITECTURE-FINALE-MULTIMARQUES.md](./ARCHITECTURE-FINALE-MULTIMARQUES.md).
La collection que cette revue nomme `scheme` s’y appelle `theme`, et le profil
doux s’y nomme `soft`.

La [recherche](./RECHERCHE-ARCHI-MULTIMARQUES.md) identifie correctement le
problème du Playground : la majorité des couleurs de composants contournent la
collection qui porte les marques. Sa proposition de séparer marque et mode
d’affichage mérite d’être conservée. **La cible demande toutefois une révision
avant de servir de base au nouveau design system.**

Le besoin douce/vibrante manque, le miroir sombre reçoit une garantie que les
calculs ne démontrent pas, et les exceptions de composants introduisent un
problème de synchronisation entre collections. La génération des palettes
contient aussi une contradiction entre la conservation de la couleur de marque
et la courbe de clarté imposée.

Cette revue évalue les propositions par rapport à la demande initiale. Les
sections numérotées citées sans lien sont celles de la recherche. L’architecture
amendée ci-dessous reste une proposition ; elle ne modifie aucune règle UCM.

## 1. Couverture du besoin initial

| Besoin | Couverture dans la recherche | Verdict |
|---|---|---|
| Partir du Playground | Inventaire chiffré des tokens et des rampes | Base factuelle confirmée |
| Au moins six marques | Collection à six modes, références stables | À conserver ; l’indépendance des collections demande une règle de synchronisation |
| Clair et sombre | Collection `scheme`, rampes `-dark`, rôles distincts | Commutation plausible ; qualité du sombre non démontrée |
| Une palette douce et une vibrante pour chaque famille primitive | Aucune représentation explicite | Besoin absent de la cible et de son chiffrage |
| Style propre à un composant selon la marque | Rôles, transparence, exceptions, variants | Réponse partielle, surtout chromatique |
| Génération logique et vérifiable des palettes | Courbes OKLCH, contrôle de contraste proposé | Direction exploitable ; recette insuffisamment définie pour être reproduite |

Le document ajoute en section 1 un critère prioritaire : pouvoir citer
n’importe quel cran sans définir de rôle. La demande initiale ne place pas
cette liberté avant la maintenance, les contrastes ou la souplesse multimarque.
Ce choix oriente ensuite la comparaison contre une couche sémantique.

Pour le nouveau projet, je recommande de donner priorité à la stabilité des
emplois visuels quand une marque change. L’accès aux crans peut rester ouvert
pour les usages qui le justifient, avec des contrôles sur ces usages.

## 2. Ce que les données permettent d’affirmer

### Le diagnostic du Playground est confirmé

Les deux scripts voisins ont été exécutés sur
`UCM-Playground/src/tokens/tokens.json`. La lecture des feuilles confirme :

- 760 tokens, dont 369 tokens de composants ;
- 306 tokens de couleur de composants, visant 55 cibles distinctes ;
- 50 références vers `color-brand-tokens`, contre 256 vers des collections sans
  axe de marque ;
- deux marques et dix tokens dans l’unique axe déclaré.

Les valeurs OKLCH et les contrastes de la section 2.3 sont également reproduits.
La dispersion du cran 500 existe. En revanche, ces mesures ne démontrent pas
que les rampes ont été dessinées à l’œil, ni que cette méthode serait la cause
de tous les écarts. Des ancres de marque ou des usages différents peuvent
produire une dispersion intentionnelle.

Le contraste calculé contre le cran 50 de chaque rampe ne prouve pas, à lui
seul, le contraste d’un composant. Il faut résoudre son fond réel. Le relevé
justifie une enquête sur les usages, sans tenir lieu de test d’accessibilité.

Les 55 cibles bornent le nombre d’alias distincts à examiner. Elles ne bornent
pas le travail de conception : une même cible sert aujourd’hui au fond, au
texte et à la bordure d’un bouton. Les 306 feuilles ne sont pas davantage un
compte des liaisons de calques à modifier dans Figma.

### Le cas de production reste une preuve incomplète

La section 3 cite trois erreurs précises dans un fichier de production, sans
indiquer son emplacement ni fournir un relevé reproductible associé. Le fichier
local `intencial-library/src/tokens/tokens.json` porte les mêmes huit collections
et le même nombre de feuilles que celui du Playground ; les chemins `theme` et
`mode` cités n’y existent pas.

Les anomalies de production restent donc des observations rapportées par la
recherche. Joindre la provenance du fichier et le résultat du script rendrait
leur vérification possible. Elles ne suffisent pas à conclure que toute
architecture portant des dossiers `light` et `dark` conduit à ces erreurs.

### Les limites Figma annoncées sont confirmées

La documentation Figma indique dix modes par collection sur Professional et
vingt sur Organization. Six marques tiennent dans ces offres. Douze modes
combinant six marques et deux apparences dépassent Professional, mais tiennent
sur Organization. La contrainte doit donc rester attachée à l’offre choisie.
[Offres Figma](https://help.figma.com/hc/en-us/articles/360040328273)

## 3. Points à corriger avant adoption

### 3.1 Douce/vibrante constitue une dimension distincte du clair/sombre

**Priorité : bloquante. Sections 5, 6 et 8.** Une rampe `primary-dark` ne répond
pas au besoin d’une variante douce de `primary`. Une couleur peut être douce
sur fond clair ou sombre ; une couleur vibrante peut servir dans les deux.

La formulation « avoir du choix » suggère deux familles disponibles
simultanément. Je retiens cette interprétation pour la proposition : un bouton
vibrant et un encart doux doivent pouvoir coexister dans la même marque et le
même mode.

Deux organisations répondent à des besoins différents :

| Organisation | Usage adapté | Conséquence |
|---|---|---|
| Chemins `primary.soft.*` et `primary.vivid.*` | Choix local dans une maquette ou un composant | Les deux profils coexistent sans changer de contexte |
| Axe supplémentaire `expression = soft / vivid` | Toute une zone doit changer de profil d’un geste | Troisième axe à résoudre et 24 contextes pour six marques et deux apparences |

Le premier choix suffit à la demande exprimée. Le second reste une option
produit, à justifier avant d’ajouter une collection. Avec plusieurs familles
choisies indépendamment, un seul axe global ne représente d’ailleurs pas tous
les choix possibles.

Il faut préciser le traitement des neutres : deux profils teintés, ou deux
profils identiques pour un gris achromatique. Dans ce dernier cas, la duplication
des valeurs n’apporte aucun choix perceptible. Le besoin de deux profils doit
aussi être examiné pour les palettes utilitaires, pas seulement pour les deux
couleurs de marque.

### 3.2 Le miroir garantit un ordre, pas un rendu utilisable

**Priorité : bloquante. Sections 5.4, 6.3 et 6.5.** Associer le premier cran au
dernier conserve une relation d’ordre. Cela ne garantit ni les contrastes entre
deux couleurs, ni la distinction des surfaces, ni le rendu des états interactifs.

Même pour un gris sans chroma, les rapports dépendent de la luminance relative,
qui vaut approximativement `L³` en OKLCH. Avec la courbe proposée :

| Clarté `L` | Contraste sur blanc |
|---|---|
| 0,670, cran 500 | 2,9935:1 |
| 0,585, cran 600 | 4,1966:1 |
| 0,500, cran 700 | 6:1 |

Le cran 500 présenté comme candidat à 3:1 est légèrement sous ce seuil avant
même d’ajouter une teinte. Les valeurs arrondies sont utiles pour lire un
rapport ; la décision doit utiliser les valeurs non arrondies.
[Seuils de contraste WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Le miroir laisse aussi le cran 500 d’une rampe à onze crans au milieu, mais
envoie celui d’une rampe à dix crans sur le cran 400. Les palettes de marque
et les utilitaires n’ont donc pas la même correspondance. `white` et `black`,
présents dans les neutres, ne reçoivent aucune règle explicite.

Radix ne constitue pas une preuve du miroir proposé. Ses crans ont des usages
définis, dont les fonds pleins aux crans 9 et 10 et les textes aux crans 11 et
12. Dans ses données, `blue9` vaut `#0090ff` en clair comme en sombre, tandis
que les extrémités changent. Cette construction conserve les emplois avec des
valeurs choisies par thème.
[Usages des crans Radix](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale),
[palette claire](https://raw.githubusercontent.com/radix-ui/colors/main/src/light.ts),
[palette sombre](https://raw.githubusercontent.com/radix-ui/colors/main/src/dark.ts)

**Correction recommandée :** traiter le miroir comme un générateur de
candidats. Valider chaque paire utile et autoriser une autre affectation en
sombre. Les mêmes noms publics peuvent rester stables avec des mappings clairs
et sombres différents.

### 3.3 La recette sombre confond hypothèse perceptuelle et règle de génération

**Priorité : forte. Section 6.5.** Multiplier toute la chroma par un facteur
supérieur à un est un réglage possible. La recherche ne démontre pas qu’il
convient à toutes les teintes, surfaces et densités d’interface. L’exemple Radix
ci-dessus montre au moins qu’une couleur d’accent peut rester identique.

Dans OKLCH, `C` désigne la chroma. La qualifier de saturation masque la
différence entre sa valeur absolue et sa part du gamut disponible. La borne du
gamut dépend de la clarté et de la teinte.
[Définition d’OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab)

Trois difficultés rendent les clauses proposées insuffisantes :

- une couleur déjà à la limite du gamut ne peut pas gagner de chroma en
  conservant sa clarté et sa teinte ;
- multiplier une chroma nulle conserve zéro ; l’exigence d’une valeur
  strictement supérieure n’est donc pas universelle ;
- un écart maximal de dix degrés ne démontre pas la reconnaissance d’une
  marque. Près du gris, la teinte devient peu significative.

Le décalage de cinq degrés évoqué en section 6.2 demande également une
justification par famille. La référence à un effet perceptuel ne fournit pas
une correction universelle applicable à tous les angles de teinte.

**Correction recommandée :** séparer les profils douce/vibrante de la sélection
des couleurs en sombre. Autoriser des courbes sombres distinctes quand les
essais le justifient. Comparer les couleurs après leur conversion dans le gamut
de livraison.

### 3.4 Courbe immuable et couleur de marque exacte sont incompatibles en général

**Priorité : forte. Sections 6.3, 6.4 et 6.7.** Une couleur dont la clarté vaut
`0,556` ne correspond à aucun cran de la courbe proposée. La placer au cran le
plus proche, `0,585`, exige de modifier soit la couleur, soit la courbe. Même
une clarté correspondante ne garantit pas que la chroma générée sera celle de
la couleur de marque.

Les deux exemples de la recherche, `L = 0,50` et `L = 0,67`, tombent exactement
sur la courbe. Ils évitent le cas général. La recette relève de plus `H` et
`L`, mais ne spécifie pas comment la chroma de la couleur d’entrée contraint
la rampe.

**Correction recommandée :** conserver la couleur exacte dans un token d’ancre,
par exemple `brand.identity.primary`, séparé des crans générés. Un rôle peut
viser cette ancre si son usage passe les contrôles. Sinon, il vise une couleur
dérivée. La mesure doit indiquer cet écart à la couleur officielle.

Une autre politique peut imposer l’ancre dans la rampe, avec une déformation
locale et bornée de la courbe. Elle doit alors annoncer que la clarté des
crans n’est plus strictement commune à toutes les marques.

### 3.5 Les rôles facultatifs laissent les garanties facultatives

**Priorité : forte. Sections 1, 5.3 et 5.6.** Le choix entre cran et rôle est
présenté comme dépendant de l’égalité de la valeur entre marques. Pourtant,
`scheme.primary.500` change déjà de valeur avec la marque. La distinction utile
porte sur la stabilité de l’emploi : un texte doit rester lisible même quand
le cran adapté change.

Les 96 contrôles proposés ne portent que sur dix rôles. Un composant qui cite
un cran pour son texte échappe à ces contrôles. Rien n’empêche donc une nouvelle
marque de produire un texte illisible avec tous les tests de rôles au vert.

Conserver dix rôles parce que la couche existante contient dix tokens ne
justifie pas cette taille. Le nouveau besoin comprend des surfaces, des états
et des usages absents du corpus de départ. Un survol exige une couleur et un
contraste contrôlés même si les deux premières marques utilisent le même cran.

**Correction recommandée :** employer des rôles par défaut pour les usages
fonctionnels : texte, surface, action, feedback et focus. Les tokens de
composants expriment déjà une partie de cette sémantique. Toute référence
directe à une rampe dans ces usages doit recevoir les mêmes tests de paires que
les rôles partagés. Les illustrations ou graphiques peuvent conserver un accès
plus large aux rampes.

### 3.6 La collection d’exceptions ajoute un axe de marque indépendant

**Priorité : bloquante pour cette option. Sections 5.5 et 9.** Deux collections
portant six modes aux mêmes noms ne commutent pas ensemble par leur seul nom.
Figma sélectionne le mode d’une collection sur l’objet ou son ancêtre. Une
maquette peut donc employer la palette de la marque A et les exceptions de la
marque B.
[Modes et héritage Figma](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)

Côté code, cette difficulté a déjà une réponse partielle :
`attributsDesAxes` dans
[`tokens-css.mjs`](../../../../packages/cli/src/tokens-css.mjs) accepte un même
attribut HTML pour plusieurs axes si leurs ensembles de modes sont égaux.
La configuration de la section 9 doit alors inclure l’axe d’exceptions :

```json
{
  "modes": {
    "color-brands": "data-brand",
    "component-overrides": "data-brand",
    "scheme": "data-theme"
  }
}
```

Il faut aussi aligner les défauts. Le générateur signale des défauts différents,
mais les conserve en l’absence d’attribut. Cette configuration ne règle pas
la sélection des collections dans Figma.

La position des exceptions après `scheme` pose une autre borne. Elle suffit
si une marque remplace un rôle par un autre dans les deux modes. Elle ne
décrit pas directement une exception propre à une marque uniquement en sombre.
Il faut alors des valeurs conditionnées par les deux dimensions quelque part.

**Correction recommandée :** commencer avec les exceptions dans la collection
qui porte déjà la marque, sous des chemins de composants. Y séparer les sources
claires et sombres, puis les sélectionner dans `scheme`. Une collection
distincte devient pertinente si son coût de synchronisation est assumé et
testé.

### 3.7 Transparence, bordure et focus demandent des rôles distincts

**Priorité : forte. Sections 5.3 et 5.5.** `role.primary.border` promet un
contraste de 3:1, puis reçoit la valeur `transparent` pour supprimer certaines
bordures. Une transparence totale rend le contraste avec le fond égal à 1:1.
Ces deux clauses se contredisent.

Une bordure décorative peut être absente. Une limite nécessaire à
l’identification d’un contrôle et un indicateur de focus demandent un examen
de leurs couleurs adjacentes. Un unique test contre le fond de page ne couvre
pas un contrôle posé sur une surface teintée ou un anneau intérieur.
[Contraste non textuel WCAG](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

La transparence ne supprime pas non plus une épaisseur, un espacement ou un
calque. Son effet géométrique dépend du rendu. Pour un composant qui exige
une modification de structure, il faut un variant ou une composition adaptée.

**Correction recommandée :** distinguer `border.decorative`, `border.control`
et `focus.ring`, puis documenter les fonds autorisés. Réserver l’absence de
bordure à un token ou à une variante du composant concerné.

### 3.8 Les styles de marque dépassent les couleurs

**Priorité : forte. Sections 5.2 et 5.5.** Maintenir `layouts` et `typography`
inchangés peut servir à une migration progressive. Pour le nouveau système,
cela laisse sans réponse une marque qui demande des boutons arrondis, une autre
police, une autre graisse, davantage d’espace ou une ombre particulière.

Une différence de rayon ou de padding peut passer par un token de composant
porté par la marque. Une différence d’ordre des éléments ou de présence d’un
calque relève d’une variante structurelle. Le choix d’un logo relève aussi des
assets ; un rôle de couleur ne suffit pas à le remplacer.

La recherche devrait fournir au moins un exemple pour chaque classe de
divergence, avec le geste dans Figma et sa traduction dans le composant.
Les différences typographiques doivent être essayées sur des libellés longs,
car elles changent les dimensions et les retours à la ligne.

### 3.9 Le chiffrage sous-estime le périmètre et surestime la factorisation

**Priorité : moyenne. Sections 7 et 8.** Le total de 1 019 valeurs additionne
correctement les quatre lignes du tableau. Il omet cependant les primitives,
les layouts, la typographie, les exceptions et les palettes douce/vibrante.
Il mesure un sous-ensemble de la cible.

Le calcul concurrent de 3 672 valeurs suppose que chacun des 306 tokens de
couleur soit explicitement écrit dans chaque contexte. Une architecture à
rôles ou à thèmes peut partager ses alias et générer les répétitions. Le coût
des données livrées doit être distingué du nombre de décisions manuelles.

La cible conserve elle-même vingt affectations de rôles par marque, soit 120
pour six marques et deux modes. Elle factorise les composants, mais garde les
décisions marque × mode au niveau des rôles. La promesse d’aucune combinaison
écrite à la main est donc trop forte.

Une estimation comparable doit compter, pour chaque solution : les décisions
à renseigner, les valeurs générées, les collections à commuter et les
contextes à vérifier. Ajouter une marque au schéma peut coûter une colonne ;
concevoir et valider cette colonne demande toujours du travail.

## 4. Architecture amendée recommandée

### Séparer les concepts avant de fixer les collections

| Concept | Responsabilité proposée |
|---|---|
| Famille primitive | Définir une rampe et sa recette, indépendamment d’un emploi |
| Profil doux ou vibrant | Offrir deux expressions disponibles simultanément |
| Marque | Choisir ses familles, ses ancres, ses paramètres et ses exceptions |
| Apparence claire ou sombre | Choisir les couleurs adaptées aux mêmes emplois |
| Rôle | Définir un emploi et les relations de contraste à contrôler |
| Token de composant | Localiser une décision ou une exception à une partie et un état |

Un nom stable entre thèmes est une interface utile. Il n’impose ni un miroir,
ni un point unique de commutation pour tous les types de données.

### Une organisation physique possible dans Figma

| Collection | Modes | Contenu et dépendances |
|---|---|---|
| `primitives` | Un mode | Rampes générées douce/vibrante, ancres exactes, valeurs élémentaires |
| `brand` | Six marques | Sélection des palettes ; affectations claires et sombres des rôles ; exceptions de composants ; paramètres de marque |
| `scheme` | `light`, `dark` | Noms publics des rôles et exceptions chromatiques, sélectionnés dans `brand` |
| `components` | Un mode | Alias vers `scheme` pour les couleurs ; vers les paramètres de `brand` pour les différences sans rapport avec l’apparence |

Cette organisation conserve deux sélections de contexte. Les dossiers clairs
et sombres sont limités aux affectations qui dépendent des deux dimensions.
Les exceptions restent localisées par leur chemin, même si elles partagent
physiquement la collection `brand`.

Exemple de résolution d’un fond de bouton :

```text
components.button.primary.background
  -> scheme.component.button.primary.background
     light -> brand.component.button.light.primary.background
     dark  -> brand.component.button.dark.primary.background

Dans le mode marque A de brand :
  component.button.light.primary.background -> color.light.action.primary.solid
  component.button.dark.primary.background  -> color.dark.action.primary.solid

Dans le mode marque B de brand :
  component.button.light.primary.background -> color.light.action.primary.solid
  component.button.dark.primary.background  -> color.dark.surface.strong
```

Le texte du bouton reçoit une affectation associée, testée contre ce fond.
L’exception sombre de B ne modifie aucun autre composant. Les alias internes à
`brand` ne remontent jamais vers `scheme`, ce qui évite une boucle de dépendance.

Créer ce niveau de passage pour les décisions qui doivent varier par marque.
Un token ordinaire de composant peut viser directement un rôle de `scheme`.
Une règle partagée par plusieurs composants remonte dans les rôles.

Pour les palettes expressives, garder des noms tels que
`scheme.palette.primary.soft.500` et `scheme.palette.primary.vivid.500` si leur
emploi commute avec l’apparence. Documenter leur table de correspondance sans
promettre un contraste attaché au numéro. Une couleur identitaire fixe dispose
d’un chemin distinct et d’un usage déclaré.

Le coût de ce choix est explicite : `brand` rassemble plusieurs types de
décisions. Des groupes, des scopes de variables et une publication sélective
doivent faciliter leur sélection. Fractionner cette collection plus tard
demande de reprendre le problème de synchronisation de la section 3.6.

### Comparaison des options sur le besoin réel

| Option | Ce qu’elle simplifie | Coût ou limite | Position proposée |
|---|---|---|---|
| Miroir généralisé de la recherche | Ajout mécanique de crans commutables | Garantie visuelle insuffisante, profils absents | Générateur de candidats seulement |
| Rôles par défaut et exceptions locales | Contrôles par emploi, ajustements de marque | Concevoir et entretenir le vocabulaire | Base recommandée |
| Douze thèmes explicites | Liberté d’affectation dans chaque contexte | Répétitions et plafond Professional | Option recevable si les différences sont nombreuses et la génération organisée |
| Collection distincte par famille d’exceptions | Séparation éditoriale | Synchronisation Figma et defaults à contrôler | À différer jusqu’à un besoin mesuré |

Un vocabulaire de rôles extensible ne limite pas nécessairement l’expression
visuelle. Son coût est le travail de nommage et de revue. En retour, il donne
un emplacement commun aux décisions que les six marques doivent partager.

## 5. Rendre la génération des palettes reproductible

### Définir les entrées et les libertés de la recette

La section 6 propose une direction, mais ne donne ni l’équation de la parabole,
ni ses coefficients, ni l’algorithme de réduction au gamut. Deux scripts peuvent
donc respecter le texte et produire des palettes différentes.

Une recette versionnée devrait déclarer :

- la couleur d’ancre et son espace colorimétrique ;
- la liste des crans et les courbes de clarté de référence ;
- les paramètres de chroma des profils doux et vibrant ;
- la courbe de teinte, les exceptions et les tolérances ;
- le gamut de livraison et l’algorithme de conversion ;
- la précision de sortie et les retouches manuelles autorisées.

Une construction possible, à évaluer, consiste à calculer une borne
`Cmax(L, H, gamut)`, puis à choisir deux parts de cette chroma disponible :

```text
Csoft(i)  = qsoft(i)  * Cmax(L(i), H(i), gamut)
Cvivid(i) = qvivid(i) * Cmax(L(i), H(i), gamut)
0 <= qsoft(i) <= qvivid(i) <= 1
```

Cette proposition tient compte de la forme du gamut. Elle ne garantit pas que
l’écart sera visible aux extrémités. Une mesure de distance dans Oklab doit
relever les crans presque identiques après conversion. Les seuils sont des
paramètres de conception à calibrer sur les palettes ; ils ne constituent pas
des seuils d’accessibilité.

La clarté commune peut servir de point de départ. Il faut définir une tolérance
et traiter séparément les neutres, dont la liste de crans diffère déjà. Pour
les teintes, employer une distance angulaire circulaire : 359° et 1° sont
distants de 2°. En dessous d’un seuil de chroma, suspendre ce contrôle.

Les contrôles se font après conversion et arrondi dans la représentation
livrée. Une réduction de chroma dans OKLCH fournit une méthode possible de
traitement du gamut ; son choix doit être fixé dans la recette.
[Conversion et gamut dans CSS Color](https://www.w3.org/TR/css-color-4/#gamut-mapping)

### Les scripts existants servent au relevé, pas encore à la certification

[`mesurer-rampes.mjs`](./mesurer-rampes.mjs) suit uniquement `$value`. Il ignore
`com.ucm.modes`, suppose sRGB pour tout objet portant `components` et ignore
l’alpha. Sa coupure après douze alias ne distingue pas une chaîne longue d’une
boucle. Son parcours vise les marques en dossiers du Playground ; il ne lit
pas directement la cible où elles deviennent des modes.

Le Playground comporte déjà deux couleurs littérales avec un alpha inférieur
à un. Cette limite doit donc être traitée même avant une extension à Display
P3. Le format UCM accepte les deux profils, comme l’indique la
[spécification des tokens](../../../format/FORMAT.md#partie-2--export-tokens).

[`mesurer-duplication.mjs`](./mesurer-duplication.mjs) imprime une matrice de
citations. Il ne définit aucune dépendance interdite et n’échoue pas lorsqu’un
composant contourne `scheme`. Présenter son relevé n° 5 comme une règle déjà
contrôlée à chaque export surestime sa portée. Une règle globale interdisant
toute référence de `components` à `primitives` serait en outre trop large :
des tokens non chromatiques empruntent aussi ce chemin.

Le validateur à construire doit résoudre les alias avec un contexte explicite,
détecter les cycles et les valeurs absentes, puis indiquer la chaîne qui mène
à chaque échec. Les contrôles de dépendances doivent tenir compte du type du
token et des exceptions déclarées.

### Étendre les preuves au rendu des composants

| Niveau de contrôle | Preuve attendue |
|---|---|
| Graphe | Références existantes, types compatibles, absence de cycle dans chaque contexte autorisé |
| Couverture | Valeur définie dans chaque marque et apparence ; aucun défaut utilisé par oubli |
| Palette | Gamut, progression de clarté, écart doux/vibrant, distance à l’ancre, retouches tracées |
| Rôles | Paires texte/fond et indicateur/fond, sur toutes les surfaces autorisées |
| Composants | Paires réellement utilisées dans chaque état, y compris les références directes aux rampes |
| Intégration | Même résolution dans Figma et dans le navigateur, y compris les contextes imbriqués |

Pour le texte courant, le seuil de départ est 4,5:1 ; le grand texte relève
d’un seuil distinct de 3:1. Les transparences demandent une composition sur le
fond effectivement rendu.
[Contraste du texte WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Les contrôles non textuels doivent qualifier l’usage : une décoration et un
indicateur nécessaire à l’identification d’un contrôle n’ont pas la même
obligation. Un contrôle inactif bénéficie d’exemptions ; le système peut choisir
une exigence interne plus forte. Un changement de couleur ne suffit pas à lui
seul à prouver que tous les états sont compréhensibles.
[Contraste non textuel WCAG](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

Les 96 tests de rôles constituent ainsi un premier lot. Leur succès ne couvre
ni les composants qui contournent ces rôles, ni les usages sur d’autres fonds.
Avec deux profils globalement commutables, ce même lot compterait 192 tests.
Avec deux palettes coexistantes, il faut couvrir les usages de chacune plutôt
que multiplier artificiellement tous les contextes.

## 6. Protocole de décision pour le nouveau projet

### Essayer les cas qui mettent les hypothèses en défaut

Avant un repointage général, construire un échantillon avec les six marques
prévues. Si leurs chartes ne sont pas disponibles, ajouter aux marques connues
des profils d’essai : accent jaune clair, bleu sombre, teinte très chromatique
et identité presque neutre. Ces profils testent les bornes ; ils ne remplacent
pas la validation des futures chartes.

Le corpus doit comprendre un bouton plein et son survol, un bouton contour,
une alerte, un champ avec focus, une carte sur une autre surface, un logo et un
cas typographique avec libellé long. Ajouter une exception propre à une seule
marque en sombre, puis afficher un élément doux à côté d’un élément vibrant.

Le prototype doit répondre à cinq questions concrètes :

1. Changer la marque conserve-t-il des contrastes valides dans chaque état ?
2. Les deux profils sont-ils distincts et utilisables en clair comme en sombre ?
3. Une exception de bouton laisse-t-elle inchangés les autres composants ?
4. Un sous-arbre sombre dans une page claire conserve-t-il la bonne marque ?
5. Ajouter une marque exige-t-il de modifier des composants déjà publiés ?

Le générateur CSS existant redéclare les dépendants et traite les croisements
d’axes avec `@scope`. Les
[tests de cascade](../../../../packages/cli/tests/cascade/cascade.test.mjs)
couvrent trois moteurs. Cette revue a examiné leur présence et le générateur ;
elle ne les a pas réexécutés sur une cible multimarque qui n’existe pas encore.
Le futur prototype doit exercer son propre graphe, avec ses exceptions.

### Adapter le plan au fait qu’il s’agit d’un nouveau système

Le plan de la section 10 donne une place importante à la migration du
Playground. Le nouveau projet peut reprendre ses constats sans reprendre
d’abord ses 306 affectations.

| Ordre | Livrable avant de poursuivre |
|---|---|
| 1 | Définition du choix doux/vibrant, des usages de marque et des exceptions attendues |
| 2 | Schéma des collections et exemple résolu d’une exception marque × apparence |
| 3 | Recette déterministe de palettes, ancres exactes et rapport des écarts |
| 4 | Prototype des composants et profils d’essai ci-dessus |
| 5 | Rapport des contrastes, relecture visuelle, coût de génération CSS |
| 6 | Validation de l’architecture, puis extension à la bibliothèque |

Si une migration du Playground reste souhaitée, séparer le changement de
références du changement de couleurs. Le contrôle de non-régression doit
comparer les valeurs résolues et le rendu. La feuille CSS peut changer par ses
sélecteurs et ses redéclarations même lorsque les valeurs visibles restent
identiques ; l’égalité à l’octet de la section 10 n’est pas le bon critère.

Une colonne Figma nouvellement créée copie les valeurs de la première. Une
marque encore non renseignée peut donc sembler couverte. Distinguer une valeur
revue d’une valeur simplement copiée doit faire partie de la recette d’ajout.
[Création d’un mode Figma](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)

La génération pose enfin une question de responsabilité. Dans UCM, Figma porte
les valeurs publiées. Une recette de palette produit donc des candidats à
importer et à valider dans Figma ; l’export demeure l’artefact consommé.
Conserver les paramètres et comparer l’export au résultat attendu évite deux
sources concurrentes. Le générateur de candidats ne doit pas introduire une
nouvelle écriture dans la commande d’analyse ou d’export du plugin.

## 7. Décisions proposées

| Proposition de la recherche | Décision recommandée |
|---|---|
| Marque et apparence dans des collections distinctes | Conserver |
| Noms publics stables entre thèmes | Conserver |
| Rôles pour séparer fond, texte et premier plan | Étendre aux surfaces, états et usages contrôlés |
| Références directes aux crans partout | Encadrer par des tests sur les usages réels |
| Miroir sombre correct par construction | Retirer la garantie ; garder l’outil de génération comme option |
| Chroma systématiquement accrue en sombre | Remplacer par des profils et des essais documentés |
| Couleur de marque exacte dans une courbe immuable | Séparer l’ancre exacte de la rampe générée |
| Collection d’exceptions à six modes | Éviter au départ, ou spécifier sa synchronisation dans Figma et le code |
| Transparence sur le rôle commun de bordure/focus | Séparer les usages et localiser l’exception |
| Deux palettes douce/vibrante | Ajouter explicitement à la cible, aux coûts et aux tests |
| Migration avant démonstration du sombre | Prototyper d’abord le nouveau besoin complet |

Le choix à engager est une architecture à deux contextes, marque et apparence,
avec deux palettes expressives coexistantes et des rôles vérifiés par emploi.
L’adoption reste conditionnée au prototype : couleurs d’ancre difficiles,
exceptions de composants et contextes imbriqués doivent y être représentés.

Une dernière précision concerne les sources : le lien de la recherche vers le
Resolver DTCG vise une version de travail. Pour une décision d’implémentation,
employer la [version publiée 2025.10 du Resolver](https://www.designtokens.org/tr/2025.10/resolver/).
Les extensions `com.ucm.*` restent définies par le format UCM ; leur présence
dans un fichier DTCG ne démontre pas qu’un lecteur générique interprète les
modes de la même façon.
