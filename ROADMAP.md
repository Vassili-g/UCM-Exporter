# Roadmap — UCM

Ce document suit la maturité du projet et les validations restantes. Les
principes sont dans [CONCEPT.md](./CONCEPT.md), le comportement actuel dans
[UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md), et les idées non engagées dans
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

## Objectif du MVP

Le MVP doit prouver un flux complet :

```text
Figma → contrat et tokens → code → contrôles CI → utilisation par un agent
```

Il doit établir deux résultats :

- **robustesse** : les divergences couvertes sont détectées avant fusion ;
- **confiance** : le contrat suffit pour utiliser correctement l’API visuelle
  d’un composant.

Le MVP n’a pas besoin de couvrir tout un catalogue. Il doit en revanche tenir
sur plusieurs formes de composants, dont au moins un composant composé.

## État actuel

Ce tableau décrit **`main` des deux repositories**. Une branche en cours peut
être rouge sans le contredire ; les validations listées ci-dessous désignent
uniquement ce qui est déjà intégré et vérifié.

| Domaine | État |
|---|---|
| Export des contrats 4.2 à 4.8 | 4.7 consommée : contrats Figma Alert et Button fusionnés dans le Playground. Le moteur écrit la 4.8, qui attend un premier réexport |
| Export Flex 4.4 | Validé par les contrats Figma Alert et Button, leurs reconstructions froides, leurs tests et le corpus Figma 4.4 de l’Exporter |
| Export DTCG avec alias et modes | Opérationnel |
| Téléchargement local et dépôt par PR GitHub | Opérationnel |
| Validation des contrats, de la forme des props et des références de tokens | Opérationnelle |
| Contrat accepté avant son implémentation | Opérationnel |
| Parité statique dès que le TSX existe | Props, booléens consommés et composition JSX couverts |
| Composition entre composants | Export, graphe, cardinalité et cycles couverts |
| Types TypeScript et variables CSS dérivés | Opérationnels |
| Tests de rendu : visibilité, cible imbriquée, icône par variante | Opérationnels |
| Refus des valeurs brutes par `tokenVar` | Opérationnel |
| Tokens du code vérifiés contre leur contrat | Opérationnelle |
| CI des deux repositories | Tests, builds et contrôle complet du Playground verts avec les contrats 4.7 |
| Rapport unique destiné au développeur | Opérationnel : `check.mjs` enchaîne les contrôles sans s’arrêter au premier échec, `check-contract` agrège le terminal, le résumé CI et le commentaire de pull request |
| Références de tokens du code | Opérationnelles : chemins assemblés et tokens absents du contrat sont bloquants ; audit visuel navigateur hors périmètre |
| Blocage effectif d’une fusion non conforme | Absent — voir « Fragilités connues » |
| Composants du consommateur | Button et Alert reconstruits à froid contre leurs contrats 4.6, typographies et références littérales vérifiées ; leurs tests suivent les contrats 4.7 |
| Validation multi-composants | Partielle |
| JSON Schema public | Non commencé |
| Multi-marque au runtime | Modes exportés, consommation non implémentée |

Le projet est un **prototype avancé** dont l’outillage tient : la chaîne
Figma → PR → CI → `main` a été éprouvée jusqu'aux contrats 4.7, et les deux
repositories construisent et se testent. Alert et Button appliquent désormais
les text styles exportés à leurs vrais slots texte ; les tests relisent les cinq
propriétés typographiques et la totalité des références déclarées. Le flux Flex ne prétend pas
couvrir grille, wrap ni positionnement absolu. Le **dimensionnement**, lui, est
complet : l'absence d'une dimension sur un slot vaut `fit-content`, puisqu'un
remplissage se publie et qu'une dimension figée cite une variable ou avertit ;
et le composant publie toujours son propre comportement, en valeurs de `width`
et de `height`.

Deux réserves bornent ce qu’on peut en conclure. La robustesse est prouvée comme
**détection** et non comme **prévention** : rien n’empêche la fusion d’une pull
request rouge. Et la confiance n’est pas acquise : un composant peut rendre
juste tout en échappant à la comparaison avec son contrat.

## Fragilités connues

### Les contrôles détectent, mais n’empêchent rien

Les deux repositories sont privés sur un plan GitHub qui n’ouvre pas les
protections de branche ; l’API répond « Upgrade to GitHub Pro or make this
repository public ». Une pull request rouge reste donc fusionnable. Aucun
`CODEOWNERS` n’est déposé, si bien que l’arbitrage des sources
([CONCEPT.md](./CONCEPT.md)) ne vit qu’en prose.

C’est la seule fragilité qui ne se règle pas en écrivant du code : elle demande
un changement de plan ou de visibilité. Tant qu’elle tient, « la CI détecte
l’écart » est exact, « le code ne peut pas diverger » ne l’est pas.

### Une donnée du contrat peut être remplacée par une règle écrite dans le code

Le code est écrit **contre** le contrat, qu’il n’interprète pas au runtime
([CONCEPT.md](./CONCEPT.md)). Le contrat sert alors à vérifier les valeurs que
le composant emploie — encore faut-il pouvoir les énumérer.

Deux formes l’empêchent : un chemin de token assemblé à l’exécution, qu’il
faudrait exécuter pour connaître, et une donnée du contrat reproduite par une
règle — deviner quel rôle se peint à partir de la variante, câbler une
correspondance sévérité → icône. Le composant rend juste et échappe au contrôle.

La première forme est détectée. La seconde est couverte, pour les cas
reconstruits, par des tests pilotés par le contrat qui relisent variantes,
icônes, visibilités et flux Flex. Cette couverture reste ciblée : un nouveau
champ ou une nouvelle branche de rendu doit recevoir son propre test de rendu.

## Contrôles du code et rapport développeur

### Principe : deux destinataires, une source

Un constat porte un **propriétaire**, conformément à l’arbitrage des sources
([CONCEPT.md](./CONCEPT.md)). Ce champ suffit à le router :

| Propriétaire | Destination | Nature des constats |
|---|---|---|
| Designer | Commentaire de pull request | Contrat, tokens, props ou slots absents du code |
| Développeur | Rapport en terminal et en CI | Valeurs brutes, tokens invérifiables, variables inexistantes |

Le commentaire de pull request et le rapport développeur existent dans
`check-contract.mjs`. Le rapport agrège les contrats, le graphe, la parité et
les références de tokens du code, puis publie le même diagnostic dans le
terminal, le résumé CI et le commentaire de pull request.

### État du rapport développeur

`check-contract` exécute ses validations de contrat, de graphe, de parité et de
références de tokens avant de composer un diagnostic unique. Chaque constat
nomme son propriétaire, le fichier concerné et le geste correctif.

La chaîne globale `npm run check` ne s'arrête pas au premier échec :
`check.mjs` exécute les tests, les tokens puis `check-contract`, et lui
transmet les tests en échec pour qu'ils figurent dans le même rapport. La règle
qu'elle sert : **tout contrôle qui refuse une fusion laisse un message au
designer**, y compris les sorties anticipées du garde-fou et l'échec de la
construction, que le workflow ajoute au rapport.

Un constat porte : contrôle, propriétaire, gravité, fichier, ligne, ce qui ne va
pas, quoi faire.

### Les contrôles

| Contrôle | Ce qu’il attrape | Ce qu’il ne voit pas |
|---|---|---|
| Audit du rendu | Une variable CSS absente des tokens générés, une valeur qui n’en est pas une | Qu’un token valide soit le bon pour cette variante |
| Tokens du code | Un chemin assemblé à l’exécution, une référence que le contrat ne déclare pas | Les données du contrat figées hors d’un chemin de token |
| Valeurs brutes | Une couleur ou une dimension écrite à la main | Une valeur produite dynamiquement |
| Tests pilotés par le contrat | Un rendu qui ne correspond plus au contrat après un changement de design | Ce qu’aucun test ne couvre |

L’audit du rendu est le seul à garantir qu’un token **renommé** se voie : les
contrôles de contrat ne relèvent que les références du contrat, jamais celles
écrites dans le code. Sans lui, un renommage laisse une variable inexistante,
que le navigateur ignore sans erreur.

Les tests pilotés par le contrat relisent le contrat à chaque exécution. C’est
ce qui fait d’eux le contrôle central : ils signalent une donnée du contrat
figée dans le code au moment où elle devient un écart réel.

### Suite ciblée

| # | Étape | Motif de l’ordre |
|---|---|---|
| 1 | Étendre les tests de rendu pilotés par contrat au prochain cas réel | Toute donnée figée hors d’une référence de token doit avoir une preuve dynamique |
| 2 | Mesurer les valeurs brutes sur un corpus réel | Régler les faux positifs avant de rendre ce contrôle bloquant |
| 3 | Écrire les limites de chaque contrôle avec son diagnostic | Éviter que les garanties soient surinterprétées |

Une option reste ouverte à l’étape 4 : porter les contrôles statiques dans un
linter, pour un retour dans l’éditeur et des exceptions justifiées et traçables.
Le rapport et les contrôles fonctionnent sans lui.

## Prochaines validations

### 1. Éprouver la généricité

Tester le flux complet sur quelques composants choisis pour leurs différences,
pas pour leur nombre :

- un composant simple avec plusieurs axes ;
- un composant interactif avec booléens et états ;
- un composant composé avec plusieurs dépendances ;
- un composant dont la structure ou les icônes changent selon les variantes.

Chaque cas doit révéler soit que le modèle suffit, soit une limite précise. Un
nouveau champ de contrat ne se justifie qu’à partir d’une limite réelle.

**Alert** couvre le dernier point et entame l’avant-dernier : elle embarque une
dépendance — une seule, pas plusieurs — et change d’icône selon la sévérité.
Restent un composé à plusieurs dépendances et un composant interactif à booléens
(Checkbox, TextField).

La validation 4.6 laisse un cas typographique précis à éprouver. Button expose
`size` depuis un wrapper imbriqué, tandis que `variantTypography` suit les axes
du Component Set principal. Le contrat actuel est complet parce que toutes les
tailles utilisent réellement `Label/Large`, mais il ne démontre pas le cas où
le text style varierait selon un axe du wrapper. Avant de changer le schéma :

1. construire dans Figma un cas réel où le style varie selon cet axe imbriqué ;
2. vérifier si l’export peut parcourir les variants du wrapper sans perdre les
   overrides portés par ses instances ;
3. si la limite est confirmée, donner à la typographie ses propres axes effectifs
   et compresser ceux qui n’influencent aucun style, plutôt que de dupliquer une
   feuille identique sur toute la matrice ;
4. versionner cette nouvelle forme, puis adapter validateur, test froid et
   documentation dans le même changement.

### 2. Éprouver le workflow d’équipe

Le premier point conditionne les autres : sans lui, on mesure la lisibilité de
diagnostics que rien n’oblige à lire.

- rendre les contrôles bloquants — protection de branche et `CODEOWNERS` — ce
  qui suppose de trancher la question du plan GitHub (« Fragilités connues ») ;
- faire relire de vraies pull requests d’export par un designer et un
  développeur ;
- vérifier que les diagnostics sont compréhensibles sans ouvrir les logs ;
- mesurer les faux positifs et le coût quotidien des contrôles.

### 3. Compléter la parité utile

La parité actuelle ne cherche pas à prouver le rendu complet. Les prochains
contrôles candidats sont :

- valeurs d’enum réellement gérées par le composant ;
- valeurs par défaut alignées sur `props.<x>.default` ;
- exceptions volontaires, explicites et justifiées.

Le choix final dépendra des résultats multi-composants. Un garde-fou coûteux ou
fragile ne doit pas être ajouté uniquement pour viser une parité théorique.

### 4. Stabiliser l’interopérabilité

Après la validation des cas réels :

- publier un JSON Schema versionné du contrat ;
- versionner aussi le format de `tokens.json` ;
- documenter la politique de compatibilité ;
- produire éventuellement un diff sémantique pour les revues.

Le schéma ne doit pas figer trop tôt un format encore susceptible d’évoluer.

## Critères de sortie du MVP

Le MVP est validé lorsque :

- plusieurs familles de composants passent sans règle liée à leur nom ;
- un composé réutilise réellement ses dépendances et passe la parité ;
- les références de tokens cassées et les écarts d’API couverts bloquent la
  **fusion** — pas seulement la CI — avec un diagnostic actionnable ;
- un contrat peut être fusionné avant son code sans désactiver les contrôles
  futurs ;
- un agent en contexte froid n’invente ni prop, ni variante, ni token, et
  n’emploie que des valeurs comparables à celles du contrat ;
- les limites non vérifiables sont documentées sans être présentées comme des
  garanties.

À ce stade seulement, le projet pourra être proposé à une expérimentation sur
un catalogue plus large.
