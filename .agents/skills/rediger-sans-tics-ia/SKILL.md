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

## Tours relevés en relecture

Les huit tours ci-dessous ont été relevés dans les documents du dépôt. Ils
survivent à une relecture à l'oreille, parce que leur cadence est régulière. Le
test porte donc sur la structure de la phrase.

### Le binôme rythmique

Deux blocs de longueur voisine, soudés par une virgule et « et », ou par une
virgule et un pronom relatif. Le second bloc redit le premier par la négation,
ou en tire une conséquence au conditionnel. Il clôt la phrase par la cadence
sans ajouter de fait.

Relevé : « Un même composant existe à plusieurs endroits, et rien ne garantit
qu'ils disent la même chose. » ; « Deux commandes, et aucun script à écrire. »
; « `--yes` évite l'invite de confirmation de `npx`, qui bloquerait une
exécution non interactive. »

Test : couper à la virgule. Si le premier bloc porte déjà le fait attendu, le
second bloc est une cadence.

Règle : une phrase, un verbe principal, un fait. Un second fait prend une
seconde phrase et son propre sujet. Ce tour est distinct de l'opposition « ce
n'est pas X, c'est Y », que `CONTRIBUTING.md` nomme et que
`scripts/controle-style.mjs` refuse déjà.

### Le prédicat vague

Le verbe décrit la relation de loin : « dire la même chose », « rester cohérent
», « être aligné ». Le rédacteur s'épargne ainsi de nommer ce qui est comparé
et l'opération qui les compare.

Relevé : « rien ne garantit qu'ils disent la même chose ».

Test : nommer les deux objets comparés et le contrôle qui constate l'écart. Si
la phrase ne survit pas à ce remplacement, elle n'énonçait pas de fait.

Règle : un écart s'écrit avec ce qui est comparé, ce qui les sépare et le
contrôle qui le constate.

### La négation d'une objection absente

La phrase pose une valeur en niant une charge dont le lecteur n'a jamais
entendu parler. Pour la comprendre, le lecteur doit imaginer un produit qui lui
imposerait cette charge.

Relevé : « aucun script à écrire », alors qu'aucun script n'a été mentionné.

Test : chercher, en amont dans le document, l'endroit où la charge niée est
introduite. Sans cet endroit, elle vient du rédacteur.

Règle : n'écarter qu'une charge déjà nommée par le document, ou imposée par un
chemin réel que le lecteur pourrait prendre. Sinon, écrire ce que le lecteur
fait.

### Le témoin anonyme

Un sujet humain indéfini, « personne », « quelqu'un » ou « on », occupe la
place d'un fait vérifiable. Le lecteur n'a aucun référent auquel rattacher ce
sujet.

Relevé : « une version que personne n'a essayée ».

Test : remplacer le sujet indéfini par l'acteur réel. Sans acteur nommable, le
fait porte sur un état des choses.

Règle : nommer l'acteur, ou décrire l'état vérifiable. Ici, la version que le
dépôt n'a pas testée.

### Le mécanisme qui pense

Un verbe mental, « changer d'avis », « savoir », « connaître », « vouloir », «
décider », attaché à un contrôle, un fichier, une règle ou une CI. Un état
mental ne s'observe pas : la phrase ne décrit alors rien de vérifiable. Ce tour
est la forme la plus coûteuse de la personnification que `CONTRIBUTING.md`
proscrit.

Relevé : « le contrôle changerait d'avis sans qu'un fichier ait bougé ».

Test : remplacer le verbe mental par l'entrée, l'opération et le verdict. Ici,
rendre un verdict différent sur le même contrat.

Règle : un mécanisme n'a pas d'état mental. Écrire ce qu'il lit et ce qu'il
produit.

### La périphrase à la place de l'instruction

Trois couches recouvrent une instruction simple : un sujet nominal abstrait, un
passif pronominal qui efface l'acteur, et des compléments ajoutés un à un. Le
lecteur doit reconstruire le geste attendu.

Relevé : « Un chemin choisi trop tard se corrige donc à la main, dans le
fichier. »

Test : réécrire à l'impératif, avec l'objet nommé. Si rien ne se perd, la forme
abstraite n'apportait rien. Ici : pour changer un chemin ensuite, modifier
`ucm.config.json`.

Règle : une action attendue du lecteur s'écrit à l'impératif, nomme son objet
et porte un seul complément.

### Le « qui » sans antécédent

« Qui » employé comme sujet indéfini, au sens de « celui qui ». La construction
est proverbiale et retire le nom qui désigne le rôle : le lecteur entre dans la
phrase sans savoir de qui elle parle. Dans une colonne intitulée « Pour qui »,
elle répond en plus à la question par la question.

Relevé : « Qui répare dépend du sens de l'écart » ; les cellules « Qui ouvre le
plugin dans Figma », « Qui branche un repository », « Qui modifie le moteur ».

Test : remplacer par un nom de rôle du vocabulaire du dépôt, tel que designer,
développeur consommateur, contributeur du moteur ou agent. Si aucun rôle ne
convient, nommer la tâche.

Règle : pas de « qui » sans antécédent. Le sujet d'une phrase et la cellule
d'un tableau portent un nom. Une colonne garde la même forme grammaticale sur
toutes ses lignes.

### La phrase à trois étages

Une principale, une coordination négative et une relative, séparées par trois
virgules. La relative finale a deux antécédents possibles. Le lecteur tranche
lui-même.

Relevé : « Qui répare dépend du sens de l'écart, et non de la personne qui a
ouvert la pull request, que la CI ne connaît pas. » La CI ignore-t-elle la
personne ou la pull request ?

Test : compter les verbes conjugués. Au-delà de deux, couper. Vérifier ensuite
que chaque relative suit immédiatement le nom auquel elle se rattache.

Règle : une phrase porte au plus une subordonnée, et une relative se rattache
au nom qui la précède.

## Adapter la forme

Une documentation de référence décrit l'état actuel et sépare les genres de
Diátaxis : tutoriel, guide pratique, référence ou explication. Une justification
ne dépasse pas ce qui modifie une décision du lecteur. Un exemple concret vaut
mieux qu'une définition abstraite.

Un commentaire reste local et court. Une erreur ou un diagnostic reste
actionnable et vérifiable ; il ne déduit pas une cause que le contrôle n'a pas
établie.

## Relecture finale

Relire le texte du point de vue d'un lecteur qui ne connaît pas la session en
cours.

1. Chaque phrase ajoute-t-elle un fait, une règle, une conséquence ou une action
   vérifiable ? Sinon, la supprimer ou la raccourcir.
2. Le lecteur sait-il qui agit, sur quoi et pourquoi, sans deviner ?
3. Les termes sont-ils ceux du dépôt et le texte évite-t-il les synonymes de
   confort ?
4. Un commentaire paraphrase-t-il le code ou une documentation répète-t-elle
   son autorité ? Si oui, déplacer l'information ou la supprimer.
5. Le rythme semble-t-il chercher à convaincre par une formule, une opposition
   ou une métaphore ? Réécrire en phrase déclarative.
6. Les tests de la section « Tours relevés en relecture » passent-ils sur chaque
   paragraphe ? Quatre d'entre eux se vérifient sans connaître le sujet :
   couper à la virgule, compter les verbes conjugués, chercher un « qui » sans
   antécédent, chercher un sujet humain indéfini.

Pour le contexte et les raisons de ces choix, lire
[`references/recherches.md`](references/recherches.md) uniquement lors d'une
évolution de cette skill ou d'une revue rédactionnelle importante.
