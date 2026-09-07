# Sur quoi reposent les règles de cette skill

À lire lors d'une évolution de la skill ou d'une revue rédactionnelle. Pour
écrire un texte, `SKILL.md` suffit.

## Le tiret cadratin

[Pangram](https://www.pangram.com/signs-of-ai-writing) a compté les marqueurs
d'écriture générée sur un grand corpus. Le tiret cadratin y apparaît 2 fois pour
10 000 mots dans un texte humain, 17 fois dans un texte de modèle de langage.
[PagesHub](https://www.pageshub.fr/le-tiret-cadratin-lempreinte-revelatrice-de-chatgpt-et-les-strategies-devitement/)
reprend la mesure en français.

Ce dépôt était à 9,8 pour mille avant la passe de réécriture de septembre 2026,
soit 439 tirets sur les documents de référence. Il est à 0,3 après, et les
quatorze restants vivent en titre ou en cellule de tableau, où le tiret sépare
deux colonnes au lieu de couper une phrase.

`tests/styleDocumentaire.test.ts` contrôle la règle. Il ignore les titres, les
tableaux, les blocs de code et les fragments entre accents graves, et refuse le
tiret partout ailleurs.

## Les capitales

La densité de mots en capitales a été essayée comme second contrôle, puis
abandonnée : deux comptages de bonne foi divergeaient de 15 à 28 % selon qu'un
mot comme `BOOLEAN` ou `TEXT` comptait pour un identifiant technique ou pour une
emphase. Le test porte donc une liste fermée de mots français, où un sigle ne
peut pas entrer par construction.

## Le découpage des documents

[Diátaxis](https://diataxis.fr/) sépare quatre genres : tutoriel, guide
pratique, référence, explication. Une page qui les mélange demande au lecteur de
trier lui-même. Ce cadre a produit la séparation entre `docs/FORMAT.md`, qui est
une référence, et `docs/POUR-LES-DESIGNERS.md`, qui est un guide pratique.

## Pourquoi la justification narrative est bornée

Chaque règle du dépôt vient d'une erreur réelle, et la première rédaction faisait
suivre presque chaque règle du récit de son erreur. Le récit aide une fois et
coûte à chaque relecture. La règle retenue garde la justification quand elle
change une décision du lecteur, une à deux phrases, et laisse le reste à Git,
message de commit compris.

## Mesure

La passe de réécriture de septembre 2026 a ramené les documents de référence de
439 tirets cadratins à 14, tous en titre ou en cellule de tableau, et d'environ
deux cents emphases par capitales à zéro. Le détail, document par document, est
dans le commit qui l'a faite.
