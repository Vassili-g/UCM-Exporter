---
name: rediger-sans-tics-ia
description: "Rédiger ou revoir les commentaires de code et les documents du dépôt UCM dans un français technique, direct et concis. Utiliser pour une documentation, un README, une spécification ou un commentaire ; ne remplace pas la skill des diagnostics destinés aux designers."
---

# Rédiger sans tics IA

Produire un texte qui aide un lecteur précis à comprendre, décider ou agir. La
sobriété n'est pas un but esthétique : elle évite d'enfouir une règle ou une
limite sous une explication générique.

## Domaine et autorité

Cette skill s'applique aux commentaires de code et aux documents du dépôt. Pour
un message affiché dans le plugin, une pull request ou un rapport CI destiné à
un designer, charger aussi `rediger-diagnostics-ucm` : `CONTRIBUTING.md` reste
l'autorité de cette forme de texte.

Avant d'écrire, lire dans `CONTRIBUTING.md` :

- la section « Code » pour un commentaire ;
- la section « Rédiger un document » pour un document ;
- la section « Messages destinés au designer » si le texte atteint ce public.

Lire ensuite le document ou les commentaires voisins qui font autorité. Reprendre
leur vocabulaire, leurs noms Figma et leurs termes techniques établis. Ne pas
créer de synonyme pour varier le style. Si une règle existe déjà dans
`FORMAT.md`, `SPEC.md` ou un autre document d'autorité, y renvoyer plutôt que
la réécrire.

## Décider d'écrire

N'ajouter du texte que s'il apporte au moins un fait qui ne se lit pas
directement dans le code ou le document voisin : un contrat, une précondition,
une conséquence, une limite, une décision ou une action. Supprimer le reste.

Pour un commentaire de code, tenter d'abord un meilleur nom, une fonction plus
petite ou une structure plus lisible. Conserver un commentaire seulement s'il
explique une décision, une particularité de l'API Figma ou une limite. Écrire
le contrat d'une fonction exportée non triviale, pas le déroulé de son corps.
Ne répéter ni le contrat à chaque appel ni une raison partagée dans plusieurs
fonctions : placer cette raison au point commun.

Ne raconter ni l'ancienne implémentation, ni une étape de refactorisation, ni
le déroulement de la session. Git porte cet historique.

## Écrire

- Écrire en français, avec une phrase qui porte une idée. Commencer par le fait,
  la règle ou l'action utile.
- Employer la voix active, un sujet identifiable et un verbe concret. Nommer le
  responsable lorsqu'une action est demandée.
- Préférer les mots usuels et précis au jargon de présentation. Dire le
  mécanisme observé plutôt que « améliore », « assure », « permet de » ou
  « s'inscrit dans » sans préciser comment.
- Garder un terme pour un concept. Les noms de code, Figma et champs publiés
  restent exacts et en code.
- Énoncer une affirmation directement. Éviter les entrées en matière, les
  conclusions qui répètent le titre et les promesses vagues sur la qualité.
- Employer une ponctuation courante. Le tiret cadratin ne sert pas d'incise ;
  les capitales, flèches et symboles décoratifs ne servent pas d'emphase dans la
  prose.
- Ne pas faire l'historique d'une décision, ni raconter une session de travail, ni répéter un
  contrat ou une règle déjà énoncée. 

Écarter particulièrement les tours qui signalent souvent une prose générée sans
apporter d'information :

- l'opposition décorative « ce n'est pas X, c'est Y » ;
- la triade conçue pour le rythme, la question rhétorique, la métaphore,
  l'aphorisme et l'introduction narrative ;
- la personnification d'un fichier, d'une règle ou d'un contrôle ;
- les intensificateurs et abstractions non prouvés : « robuste », « fluide »,
  « puissant », « complet », « essentiel », « à l'échelle », « de bout en
  bout », « dans une logique de ».

Ces formes ne sont pas interdites quand elles sont nécessaires à un fait exact.
Dans ce cas, écrire le fait, pas l'effet de style.

## Adapter la forme

Une documentation de référence décrit l'état actuel et sépare les genres de
Diátaxis : tutoriel, guide pratique, référence ou explication. Une justification
ne dépasse pas ce qui modifie une décision du lecteur. Un exemple concret vaut
mieux qu'une définition abstraite.

Un commentaire reste local et court. Une erreur ou un diagnostic reste
actionnable et vérifiable ; il ne déduit pas une cause que le contrôle n'a pas
établie.

## Relecture finale

Relire le texte comme quelqu'un qui ne connaît pas la session en cours.

1. Chaque phrase ajoute-t-elle un fait, une règle, une conséquence ou une action
   vérifiable ? Sinon, la supprimer ou la raccourcir.
2. Le lecteur sait-il qui agit, sur quoi et pourquoi, sans deviner ?
3. Les termes sont-ils ceux du dépôt et le texte évite-t-il les synonymes de
   confort ?
4. Un commentaire paraphrase-t-il le code ou une documentation répète-t-elle
   son autorité ? Si oui, déplacer l'information ou la supprimer.
5. Le rythme semble-t-il chercher à convaincre par une formule, une opposition
   ou une métaphore ? Réécrire en phrase déclarative.

Pour le contexte et les raisons de ces choix, lire
[`references/recherches.md`](references/recherches.md) uniquement lors d'une
évolution de cette skill ou d'une revue rédactionnelle importante.
