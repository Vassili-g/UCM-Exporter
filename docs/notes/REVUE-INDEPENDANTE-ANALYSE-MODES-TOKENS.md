# Revue indépendante de l'analyse des modes

Cette revue examine la [proposition](ANALYSE-CRITIQUE-MODES-TOKENS.md) et la
confronte au [plan courant](PLAN-MODES-TOKENS.md). La proposition examinée porte
l'empreinte SHA256
`7D936DEA094E921C9B40A14F6382F1D887F2763D9C9EC7AA580B3846A81A6070`.
Les corrections ultérieures peuvent donc avoir traité les constats ci-dessous.

L'analyse distingue correctement les choix de mode, l'héritage des collections
et les portées de l'interface. Ses objections sur le Resolver sont confirmées
par la spécification. Il reste deux corrections de portée prioritaires et
quatre décisions à préciser avant de transformer cette note en plan de travail.

## 1. Priorité haute : distinguer contenu indicatif et rendu normatif

La section 3.6 demande un diagnostic et une couverture partielle pour les usages
texte ou visibilité que le contrat ne décrit pas. Cette prescription peut
dépasser les responsabilités actuelles du format.

[CONCEPT.md](../../CONCEPT.md) attribue le contenu de maquette aux échantillons
indicatifs. [FORMAT.md](../FORMAT.md) décrit `samples` comme non normatif.
Une traduction de « Envoyer » en « Send », sélectionnée par une variable Figma,
ne suffit donc pas à établir une perte de rendu contractuel. Le texte applicatif
peut venir du système de traduction du consommateur.

Correction demandée : séparer la valeur d'échantillon, la liaison publiée et
l'obligation visuelle. Dégrader la couverture lorsqu'une liaison ou une
obligation normative est perdue. Ne pas transformer tout contenu variable en
exigence contractuelle. La visibilité demande la même distinction : une valeur
d'exemple de prop et une règle de présence du calque n'ont pas le même statut.

Preuve attendue : deux cas voisins. Le premier change seulement le texte de
l'échantillon ; le second perd une règle normative de visibilité. Leurs
diagnostics doivent refléter cette différence.

## 2. Priorité haute : le Resolver ne rend pas tout le dialecte UCM standard

La section 4.1 décrit un Resolver autonome dont tout le jeu tiendrait dans un
fichier standard. Cette formulation doit être conditionnée au type des feuilles.

Le test [conformiteDtcg.test.ts](../../packages/plugin/tests/conformiteDtcg.test.ts)
énumère les feuilles du dialecte : `string`, `boolean` et certaines valeurs
`null`. Le [schéma Resolver officiel](https://www.designtokens.org/schemas/2025.10/resolver.json)
juge les sources embarquées avec le schéma Format. Son énumération des types
n'inclut ni `string` ni `boolean`. Une référence externe peut passer le contrôle
du wrapper sans que les feuilles du fichier chargé soient conformes.

Correction demandée : annoncer séparément la grammaire du Resolver, le profil
UCM des sources et l'interopérabilité réellement éprouvée. Appliquer cette
distinction aux tableaux de solutions et aux critères de publication. Le
maintien du dialecte peut constituer un choix explicite de transition ; retirer
des feuilles pour obtenir une validation ne conserve pas le besoin initial.

Ce point a été signalé en complément par l'auteur de la proposition. La lecture
indépendante du schéma et du test local le confirme. Aucun validateur du
Resolver n'a été exécuté dans cette revue.

## 3. Priorité moyenne : attribuer la responsabilité des portails

La recette de la section 6 attend la même marque et le même thème dans une
modale rendue ailleurs. La section 4.2 cite un provider parmi les solutions,
mais la recommandation conserve le générateur CSS comme candidat principal.
Il manque une règle d'intégration entre ces deux propositions.

Exemple : la page est Groupe et claire. Une carte est Filiale et sombre. Une
modale ouverte depuis cette carte est insérée directement sous `body`. Les
sélecteurs de la carte ne ciblent plus la modale. La documentation
[React createPortal](https://react.dev/reference/react-dom/createPortal)
distingue précisément le déplacement dans le document du maintien du contexte
React. La déduction CSS concerne la nouvelle ascendance de la modale.

Correction demandée : le consommateur fournit un conteneur de portail dans la
bonne portée, ou reporte explicitement le contexte effectif sur la racine de
la modale. Le preset de stack décrit le geste retenu. La recette vérifie aussi
un changement de thème pendant que la modale est ouverte. Ce cas teste
l'intégration applicative ; il ne prouve pas à lui seul le générateur de tokens.

## 4. Priorité moyenne : qualifier la restriction sur les défauts synchronisés

La section 3.8 exige les mêmes modes et le même défaut lorsque deux collections
partagent un attribut. C'est une restriction produit compréhensible. Ce n'est
pas une nécessité technique de la synchronisation.

Contre-exemple : deux collections utilisent `light/dark`. Sans attribut, la
première conserve son défaut clair et la seconde son défaut sombre. Un attribut
`data-theme="dark"` sélectionne explicitement le sombre dans les deux.
Cette règle est déterministe, même si son état initial peut surprendre.

Deux solutions sont donc possibles : refuser les défauts différents pour
obtenir un seul défaut applicatif, ou conserver les défauts individuels jusqu'à
une sélection explicite. La proposition peut retenir la première. Elle doit
la présenter comme un choix de simplicité et prévoir un message de refus qui
explique comment harmoniser les défauts.

La validité du Resolver reste distincte des contextes accessibles dans une
application. Synchroniser deux axes pour la recette ne dispense pas de juger
les autres contextes si le fichier publié les autorise.

## 5. Priorité moyenne : préciser la livraison pour une plateforme sans CSS

La section 4.7 distingue correctement l'accès aux aides de la génération des
tokens. La section 5 évoque aussi un export par contexte. Aucun lot ne nomme
cependant clairement sa livraison ou son report.

Exemple : un projet mobile reçoit les conventions et les modèles. Il lui faut
encore une réponse concrète pour obtenir les valeurs Filiale et sombre dans
son format de ressources. Une archive de Markdown ne fournit pas cette sortie.

Correction demandée : retenir explicitement une borne. Soit le premier lot
garantit les aides pour toutes les stacks et la génération pour le web, avec
la génération native annoncée séparément. Soit il livre un document de tokens
sélectionné par contexte, avec alias conservés, puis documente la conversion
par la plateforme. Ne pas présenter ce second chemin comme déjà disponible.

## 6. Priorité moyenne : limiter les presets à une première cible

Les sections 4.5 à 5 introduisent la sélection par dossier dans un monorepo,
plusieurs familles de modèles et des presets indépendants des adaptateurs.
Ces solutions répondent aux besoins exprimés, mais augmentent le travail avant
la première recette.

Un projet React existant peut commencer avec un fichier de conventions et un
composant de référence choisi par l'équipe. Il n'a pas besoin d'un système de
distribution de presets pour modifier sa classe de contour.

Correction demandée : livrer une première cible avec ces ressources éditables.
Décrire ensuite l'interface d'un preset à partir de cet exemple. Prévoir la
sélection par dossier lorsqu'une recette mobilise plusieurs cibles. Conserver
les variantes d'architecture comme solutions comparées jusqu'à ce que leur
usage impose plusieurs modèles publiés.

## 7. Constats confirmés et niveau de preuve

La [spécification Resolver](https://www.designtokens.org/tr/2025.10/resolver/)
autorise les recouvrements entre modifiers et les départage par leur ordre.
Elle définit aussi les références relatives au document. La correction 3.1
est fondée. Son exemple de cycle impossible en 3.7 est également valide :
l'union des dépendances ne suffit pas à établir un cycle actif.

La documentation [ExtendedVariableCollection](https://developers.figma.com/docs/plugins/api/ExtendedVariableCollection/)
décrit une chaîne d'extensions et les identifiants de modes parents. La
documentation [Variable](https://developers.figma.com/docs/plugins/api/Variable/)
indique que la lecture par collection conserve les alias. Ces éléments appuient
la recette Enterprise demandée, sans remplacer son exécution.

L'inspection de [parite.mjs](../../packages/adapter-typescript/src/parite.mjs)
confirme que les contrôles de props et de composition ne prouvent pas le rendu
d'un contour ou l'organisation des fichiers. La proposition évite à juste
titre d'assimiler cette parité à une garantie d'architecture.

Cette revue repose sur les textes, le code et les sources primaires citées.
Elle n'a exécuté ni export Figma, ni test navigateur, ni mesure de consommation
d'un agent. Les contre-exemples proposés deviennent des cas à éprouver lors
de l'implémentation ; ils ne constituent pas une recette déjà passée.

## 8. Vérification de clôture

La proposition d'empreinte SHA256
`72CA02E3513ECFFE8D9CE6F62D81D880037A00F3F06DB284A9D1FBDECF7DEE19`
traite les six constats de cette revue. Elle distingue le contenu indicatif,
conditionne la conformité des sources et attribue les portails à l'application.
Le défaut commun est présenté comme un choix produit. La sélection de tokens
possède un lot explicite, distinct de la conversion native. Les premières
ressources de stack se limitent à une cible et un exemple.

La contre-relecture ne relève pas d'erreur ajoutée dans ces corrections. Ce
résultat clôt les constats documentaires ci-dessus. Il ne valide aucune
implémentation du générateur ni les capacités qui restent à mesurer.
