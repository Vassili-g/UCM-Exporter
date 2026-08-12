# Pistes d’évolution — UCM

Ce document conserve les options qui ne sont pas engagées. Il ne décrit ni le
comportement actuel du plugin ni l’ordre de développement : voir
[UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) et
[ROADMAP.md](./ROADMAP.md).

## Positionnement

L’UCM est une **couche de contrat design, versionnée dans Git et placée à côté
du code réel**. Il peut compléter des outils comme Code Connect, Storybook ou
les pipelines DTCG :

- DTCG transporte les tokens ;
- Storybook documente et exerce le code ;
- Code Connect relie des composants Figma et code ;
- l’UCM transporte la spécification visuelle exportée de Figma et la rend
  contrôlable dans le repository.

Le projet est surtout utile aux équipes qui possèdent déjà un design system
Figma, une bibliothèque de composants et un besoin de traçabilité. Sa valeur
est plus faible pour un système entièrement code-first ou une petite
bibliothèque sans workflow de revue.

### Comparaison avec handoff (Convertiv)

[handoff](https://github.com/Convertiv/handoff-app) lit Figma et produit des
variables CSS, comme l’UCM. Le chevauchement s’arrête là. Il lit par l’API
REST, donc sans les Variables — leur endpoint est réservé aux organisations
Enterprise — et s’appuie sur les Styles Figma. Il aplatit les valeurs et ne
conserve une référence que lorsqu’un Style est appliqué. Son mapping est écrit
à la main par composant, sous forme de chemins de calques. Son livrable est un
site de documentation statique dont les composants de prévisualisation sont
distincts du code de production : rien n’y compare une implémentation réelle à
Figma.

handoff documente ; l’UCM contraint. Les deux peuvent coexister, l’export DTCG
alimentant un pipeline Style Dictionary équivalent au leur.

Deux enseignements. Leur option `useVariables`, ajoutée après coup pour émettre
`var(--x)` plutôt qu’une valeur, confirme par l’échec l’invariant « les tokens
restent des références ». Et leur `fetch` tourne en CI quand notre export
demande un humain dans Figma : c’est le prix de l’accès aux Variables, mais il
rend le risque « export périmé » plus concret, donc `meta.exportedAt` mérite de
remonter dans le rapport développeur.

## Options à étudier après le MVP

### Manifeste d’icônes

Une prop `type: "icon"` en `policy: "modifiable"` n’énonce aucune valeur
légale : ni la CI ni un agent ne peuvent savoir quels noms existent. Exporter
le catalogue des icônes du fichier — nom Figma et identifiant de code —
fermerait ce cas. C’est la seule donnée du contrat qu’un agent en contexte
froid doit aujourd’hui inventer.

### Chemin de slot pour une icône imbriquée

`icons.*.slot` est un nom de slot unique, donc toujours celui d’un enfant direct
du node de layout. Depuis que `structure.children` est récursif (4.3), une icône
peut se trouver dans un slot décrit par ses parts : le contrat la situe alors
sur le slot parent, pas sur la part exacte qui la contient. Rien n’est faux — le
slot cité existe bel et bien — mais la position est moins précise que l’arbre ne
le permettrait. Y remédier demanderait de transformer ce champ en chemin, et
d’adapter `iconSlotsByLayer` ainsi que le garde-fou qui vérifie que le slot cité
existe. À faire le jour où un design réel présentera ce cas.

### Liaison explicite avec l’implémentation

La convention de co-localisation suffit au prototype. À plus grande échelle,
un manifeste propre au repository pourrait associer explicitement contrat,
fichier source et export public. Cette information ne doit pas venir de Figma,
car elle dépend du framework et de l’organisation du code.

### JSON Schema et politique de compatibilité

Un schéma public rendrait le contrat validable dans d’autres langages et
éditeurs. Il devra préciser les versions acceptées et distinguer clairement
ajout compatible et rupture. Cette étape vient après les validations
multi-composants afin de ne pas figer une abstraction prématurée.

### Diff sémantique

Un commentaire de pull request pourrait résumer un changement de contrat :
props ou valeurs supprimées, variantes ajoutées, tokens remplacés,
composition modifiée. Ce rapport serait entièrement dérivé des deux JSON et
n’introduirait aucune nouvelle source de vérité.

### Passerelles

Une fois le format stabilisé, le contrat pourrait alimenter des intégrations
existantes : Code Connect, documentation ou stories dérivées, outils de
prévisualisation et autres plateformes via Style Dictionary. Ces passerelles
doivent rester des adaptateurs, pas élargir le contrat au comportement
applicatif.

### Multi-marque

Les modes Figma sont déjà conservés dans l’export DTCG. Leur projection en CSS,
leur sélection au runtime et leur prévisualisation restent à concevoir dans le
consommateur.

## Risques à surveiller

### Export Figma périmé

L’export est manuel. Aucun contrôle du repository ne peut prouver qu’un fichier
représente la toute dernière version du document Figma. La bonne réponse doit
rester proportionnée : traçabilité de la date, discipline de revue et
éventuellement rappel ciblé, sans scanner tout le catalogue à chaque
validation.

### Fausse promesse de parité

La co-localisation et l’analyse statique ne prouvent pas un rendu identique.
Chaque contrôle doit annoncer exactement ce qu’il vérifie. Les comportements
conditionnels et la visibilité peuvent nécessiter des tests de rendu locaux.

### Contrat trop large

Ajouter événements, attributs `aria-*`, règles de formulaire ou détails
propres à React rendrait le format moins portable et dupliquerait le code. Le
contrat doit rester limité à la responsabilité design.

### Friction excessive

Une CI trop stricte ou sujette aux faux positifs finit par être contournée.
Les exceptions volontaires devront être rares, explicites et révisables.

### Conventions cachées

Toute convention nécessaire au rendu mais absente des tokens ou du contrat
devient une source de vérité supplémentaire. Elle doit être soit tokenisée,
soit clairement assumée dans l’adaptateur consommateur.

## Ce qui ne doit pas être construit

- écriture automatique du code vers Figma ;
- génération du code de production à partir du contrat au runtime ;
- reproduction brute de l’arbre Figma ;
- moteur maison de régression visuelle lorsqu’un outil spécialisé suffit ;
- tableau de bord ou plateforme centrale avant que l’usage réel le justifie.

La règle de décision reste simple : une évolution doit améliorer la robustesse
ou la confiance sur un cas observé, sans créer une nouvelle source de vérité.
