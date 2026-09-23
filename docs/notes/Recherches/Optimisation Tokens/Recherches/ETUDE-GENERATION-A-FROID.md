# Réduire les tokens d'une génération à froid

> Statut : instruit, et suivi d'effet. Cette étude est l'autorité du dossier sur
> l'état de l'art, sur le classement des dix architectures de génération et sur
> les mesures d'encodage compact. Le
> [plan de l'implémenteur](../Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md)
> retient le rang 1 de son classement et va plus loin : le modèle n'y rédige
> plus de fragments de code, il répond à des questions fermées. Le rang 6, la
> représentation compacte, y perd son sujet, puisque le modèle ne lit plus le
> contrat.

Cette étude compare les solutions pour un module autonome qui produit un
composant depuis son contrat UCM et les conventions du repository. Elle
prolonge le [plan de réduction](./PLAN-REDUCTION-TOKENS.md). Les propositions
ci-dessous restent des pistes de recherche ; elles ne changent aucune règle
du format.

**La solution recommandée est un compilateur partiel, accompagné d'un appel
de modèle pour les seules décisions d'intégration.** Le compilateur produit
les données et le rendu déductibles du contrat. Un adaptateur produit le code
de la stack choisie. Le modèle complète les parties que les conventions ne
déterminent pas encore. Un composant entièrement couvert peut ensuite se
générer sans appel de modèle.

Le choix du modèle vient après cette séparation. Un modèle moins cher
change le prix du token ; retirer une transcription au modèle supprime des
tokens d'entrée, de sortie et parfois des réparations.

Le [comparatif des modèles et des offres](./COMPARATIF-MODELES-OFFRES.md)
détaille OpenAI/Codex, Claude, Mistral, Gemini, DeepSeek, MiniMax, Qwen et
Kimi : tarifs, preuves de capacité, exécuteurs et infrastructure.

| Périmètre du relevé | Valeur |
|---|---|
| Consultation des sources publiques et mesures locales | 2026-09-21 |
| Corpus local | `Alert`, `Button`, `StressTest`, `TileLink`, contrats 13.0 du Playground |
| Mesures réalisées pour cette étude | tailles en octets, deux tokenizers, réversibilité de trois encodages |
| Générations de composants réalisées pour cette étude | aucune ; aucun appel à une API de génération |
| Résultats de génération disponibles | campagne L5 décrite dans le [rapport existant](./RAPPORT-COUT-GENERATION.md), sans réexécution ici |

## 1. Le besoin et la mesure qui permettent de choisir

### Ce que signifie « à froid »

Le module reçoit le contrat cible, les tokens, les conventions et les
interfaces publiques des dépendances autorisées. Il ne reçoit aucune ancienne
implémentation de la cible. Un adaptateur de stack réutilisable reste
admissible : il contient des règles générales de génération, sans branche
spéciale pour `Button` ou `Alert`.

Le contrat décrit le visuel. Les événements, l'accessibilité et les choix
applicatifs appartiennent au consommateur, conformément au
[concept UCM](../../../../../CONCEPT.md#3-une-information-un-propriétaire).
Un contrat seul ne suffit donc pas à produire toute implémentation
applicative imaginable. L'autonomie exige des conventions explicites et un
résultat « décision manquante » quand elles ne suffisent pas.

La portabilité porte sur le cœur du module et ses entrées. Un code exécutable
appartient nécessairement à une stack. Le module doit accepter plusieurs
adaptateurs, sans prétendre qu'un même fichier source s'exécute partout.

### Un objectif sous contrainte de qualité

La grandeur à minimiser est le nombre de tokens consommés **par composant
accepté**, en incluant les tentatives échouées :

```text
T_par_accepte = somme(T_entree + T_sortie) / nombre_de_composants_acceptes
```

`T_entree` inclut les tokens lus en cache, une seule fois dans le compteur.
`T_sortie` inclut la réflexion quand le fournisseur la compte dans la sortie.
Si le fournisseur expose la réflexion séparément, normaliser ses compteurs
sans la compter deux fois. Consigner les tokens du routeur et du compresseur
éventuels. Une réflexion non exposée reste « non disponible ».

Conserver séparément le prix et la latence. Pour les prix, ramener les
compteurs du fournisseur à des catégories disjointes : entrée ordinaire,
écriture de cache, lecture de cache, sortie. Les additionner après
pondération par leurs tarifs. Une requête échouée ou tronquée reste dans le
coût total.

Le classement doit d'abord exclure les solutions qui dégradent la conformité,
puis comparer les tokens parmi les solutions restantes. Une note pondérée
peut masquer une perte de qualité derrière un gain de coût. Quatre composants
ne suffisent pas à établir une supériorité générale.

### Points du plan à réviser

| Point | Constat ou conséquence |
|---|---|
| Extraction du contrat dans le guide | Le code actuel de [`guide.mjs`](../../../../../packages/cli/src/guide.mjs) imprime déjà les diagnostics et l'API des dépendances, sans recopier le contrat cible. Refaire la mesure du guide avant d'attribuer un gain à son retrait. |
| Contrôle de types | La [`procédure actuelle`](../../../../../packages/cli/procedure.md) le demande déjà, avec le signalement des props attendues par les consommateurs. |
| Porte `ucm icons` | [`icons.mjs`](../../../../../packages/cli/src/icons.mjs) énumère les icônes réclamées. Il ne contrôle pas leur correspondance avec le jeu du consommateur. Ajouter ce contrôle à l'adaptateur de recette. |
| Seuil de 12 ko et absence du mot `variants` | Ces critères ne prouvent ni l'exhaustivité ni l'économie en tokens. Un petit paquet peut oublier un variant ; un paquet qui cite ce champ peut être correct. |
| Absence de `var(--` dans le composant | C'est un choix d'organisation du code. Du CSS compilé avec des références littérales consomme zéro token de génération et peut être conforme. Vérifier la provenance des données au lieu d'interdire une chaîne. |
| Préfixe payé « une fois » | Les lectures suivantes restent généralement facturées. Un cache expiré ou incompatible exige une nouvelle écriture. |
| Relance sur un modèle plus fort | Elle peut augmenter les tokens totaux tout en réduisant les dollars. La comparer au modèle fort utilisé directement. |
| Réparation meilleure que plusieurs tirages | La source ReCode porte sur une réparation avec récupération d'exemples, sur AtCoder. Elle ne prouve pas que toute réparation simple gagne sur plusieurs tirages. |
| Auto-hébergement écarté à un seuil universel | Le seuil dépend du matériel déjà disponible, du débit utile, de l'occupation et du coût d'exploitation. Le recalculer pour la charge réelle. |
| Régénération par diff | Utile pour les mises à jour. Elle ne réduit pas le coût de la première génération à froid. La mesurer à part. |

## 2. Ce que les recherches établissent

Les travaux ci-dessous portent sur des tâches différentes. Leurs gains ne
s'additionnent pas et ne prédisent pas un taux de réussite UCM. Une
prépublication est distinguée d'un article de conférence lorsqu'un lieu de
publication est établi par la source consultée.

| Travail et source primaire | Résultat ou mécanisme établi | Application et limite pour UCM |
|---|---|---|
| Jones, Gomard et Sestoft, [Partial Evaluation and Automatic Program Generation](https://www.itu.dk/~sestoft/publications.html), ouvrage, 1993 | Spécialiser un programme quand une partie de ses entrées est connue. | Un moteur de rendu spécialisé au build peut produire du code ordinaire. Fondement du compilateur ; aucune mesure en tokens UCM. |
| Solar-Lezama, [The Sketching Approach to Program Synthesis](https://people.csail.mit.edu/asolar/papers/Solar-Lezama09.pdf), 2009 | Compléter un programme partiel à partir d'une spécification et de contraintes. | Générer la structure déterminée et ne demander que les parties manquantes. Remplacer le solveur par un modèle retire les garanties formelles du travail original. |
| Haque et al., [Verbatim Data Transcription Failures](https://arxiv.org/html/2601.03640v1), prépublication | Sur onze modèles, aucun run parfait à 300 ou 500 constantes dans chacun des deux lots de 1 100 runs. | Argument pour retirer les tables du travail du modèle. Le banc impose des déclarations de constantes décimales, pas des composants UCM. |
| Pan et al., [LLMLingua-2](https://aclanthology.org/2024.findings-acl.57/), Findings ACL 2024 | Compression de prompts de 2 à 5 fois ; latence totale améliorée de 1,6 à 2,9 fois sur les tâches étudiées. | À essayer sur une prose redondante. La conservation exacte des références, négations et contraintes UCM n'est pas prouvée. |
| Matveev, [TOON vs JSON](https://arxiv.org/abs/2603.03306), prépublication | Le coût des instructions de syntaxe peut annuler le gain sur les petites sorties. La justesse varie selon le modèle et le mode de décodage. | Motive un test sur le paquet réel, avec les instructions incluses. Le papier étudie la génération structurée ; il ne tranche pas toutes les lectures d'un contrat compact. |
| Scholak et al., [PICARD](https://aclanthology.org/2021.emnlp-main.779.pdf), EMNLP 2021 | Un parseur rejette les tokens incompatibles avec le langage cible pendant le décodage ; essais sur Spider et CoSQL. | Une sortie contrainte peut éviter des erreurs de forme. Un JSON valide peut toujours contenir une mauvaise décision de rendu. |
| Han et al., [Token-Budget-Aware LLM Reasoning, version 1](https://arxiv.org/html/2412.18547v1), prépublication | Réduction moyenne annoncée de 68,64 % des tokens, avec une baisse de justesse inférieure à 5 %. | Justifie de tester les budgets de réflexion. Une perte de justesse tolérée dans ce banc ne satisfait pas automatiquement la porte UCM. |
| Ong et al., [RouteLLM](https://arxiv.org/abs/2406.18665), ICLR 2025 ; [résultats des auteurs](https://www.lmsys.org/blog/2024-07-01-routellm/) | À 95 % de la performance de GPT-4 : économies supérieures à 85 % sur MT Bench, 45 % sur MMLU, 35 % sur GSM8K. | Preuve d'un compromis prix/qualité sur ces bancs. Aucun pourcentage transférable à la conformité visuelle UCM. |
| Zhao et al., [ReCode](https://arxiv.org/html/2509.02330v1), CIKM 2025 | Sur AtCoder avec GPT-4o-mini, atteindre 35 % de tests réussis demande 4 appels à ReCode, 11 au meilleur de N et 15 à l'auto-réparation. | Utiliser des échecs précis pour réparer. Le gain comprend une récupération spécialisée d'exemples, absente du pipeline UCM proposé. |
| Yang et al., [Toward Frontier-Quality Declarative UI Generation at Small-Model Cost](https://arxiv.org/abs/2609.04184), article public avec DOI associé | Un modèle affiné de 4 milliards de paramètres atteint environ 98 % de la qualité sémantique et 97 % de la qualité visuelle du professeur, à plus de dix fois moins cher. | Le modèle assemble un catalogue de composants préexistants. Cela ne prouve pas la création de primitives UCM inconnues ni la fidélité sur chaque variant. |
| Zheng et al., [SGLang](https://papers.nips.cc/paper_files/paper/2024/file/724be4472168f31ba1c9ac630f15dec8-Paper-Conference.pdf), NeurIPS 2024 | Jusqu'à 6,4 fois plus de débit dans les conditions étudiées, notamment par réutilisation du cache de préfixes. | Optimisation de service et de calcul. Ce facteur n'est pas une réduction des tokens du composant. |
| Kwon et al., [PagedAttention](https://arxiv.org/abs/2309.06180), SOSP 2023 | Gestion de mémoire et partage du cache pour servir davantage de requêtes. | Pertinent pour un service chargé ; ne raccourcit ni le contrat ni le code produit. |
| Leviathan et al., [Speculative Decoding](https://arxiv.org/abs/2211.17192), ICML 2023 | Accélération de 2 à 3 fois sur T5-XXL, en conservant la distribution de sortie du modèle cible. | Réduit la latence, sans garantie d'économie en tokens facturés. Le calcul du modèle brouillon s'ajoute. |
| Mu et al., [Gist Tokens](https://arxiv.org/abs/2304.08467), 2023 | Jusqu'à 26 fois moins de longueur de prompt, 40 % de calcul en moins et 4,2 % de gain de temps dans les expériences. | Exige un modèle adapté à ces représentations. La compression d'instructions apprises ne garantit pas l'intégrité d'un contrat inédit. |

Ces travaux soutiennent surtout la séparation entre calcul déterministe,
décisions restantes et vérification. La recherche en compression de prompts
ne remplace pas cette séparation.

## 3. Mesures locales reproductibles

### Protocole

Le script [mesurer-representations.py](./mesurer-representations.py) lit les
quatre contrats du Playground. Il n'ouvre aucun fichier d'implémentation. Les
[résultats JSON](./MESURES-REPRESENTATIONS.json) enregistrent les empreintes
des contrats et du script, la version du tokenizer et les mesures brutes.

Les comptes utilisent `tiktoken 0.12.0`, avec `cl100k_base` et `o200k_base`.
Ce sont des comptes exacts pour ces deux encodages, **pas les compteurs de
facturation de Claude, Qwen ou Kimi**. Chaque essai fournisseur devra compter
le prompt final avec son tokenizer ou son API d'usage. Les mesures présentes
excluent le système, les outils, les conventions et les instructions de
décodage.

Trois représentations expérimentales sont réversibles :

- **Dictionnaire** : chaque référence de token répétée est remplacée par un
  code court. Le dictionnaire de traduction fait partie du texte compté.
- **Colonnes** : les champs des variants deviennent des colonnes de valeurs
  distinctes. Chaque variant conserve une ligne d'indices. `-1` représente un
  champ absent et reste distinct d'une valeur nulle.
- **Combinaison** : appliquer le dictionnaire à la représentation en colonnes.

Le script vérifie l'égalité des objets avant et après décodage, ordre des clés
exclu. Il garde l'ordre des tableaux et les champs de traçabilité. Il ne
développe aucune vue UCM et n'implémente aucun second résolveur de contrat.

Un quatrième essai mesure le reste après retrait des six champs énumérés par
le plan : `variants`, `viewStructures`, `viewPaintPlacements`,
`viewTypographies`, `viewIcons`, `samples`. Ce reste contient encore des
renvois vers les données retirées. **Il ne constitue ni un contrat valide ni
un paquet suffisant pour générer un composant.** Il mesure seulement le
volume transférable à un traitement déterministe.

### Résultats en tokens d'entrée

| Composant | Original, `o200k_base` | Minifié | Dictionnaire | Colonnes | Colonnes et dictionnaire | Reste après retrait, non autosuffisant |
|---|---:|---:|---:|---:|---:|---:|
| `Alert`, 8 variants | 3 754 | 3 611 | 3 548 | 3 609 | 3 546 | 1 257 |
| `Button`, 90 variants | 14 169 | 13 862 | 13 542 | 13 130 | 12 810 | 1 466 |
| `StressTest`, 3 variants | 12 105 | 11 961 | 11 087 | 11 981 | 11 107 | 1 406 |
| `TileLink`, 4 variants | 839 | 751 | 754 | 755 | 758 | 416 |

| Composant | Meilleur encodage exact testé contre l'original | Gain supplémentaire contre le minifié | Volume retiré vers le traitement déterministe, contre l'original |
|---|---:|---:|---:|
| `Alert` | 5,5 % | 1,8 % | 66,5 % |
| `Button` | 9,6 % | 7,6 % | 89,7 % |
| `StressTest` | 8,4 % | 7,3 % | 88,4 % |
| `TileLink` | 10,5 % | 0 % | 50,4 % |

Sur `cl100k_base`, `Button` passe de 13 878 à 12 773 tokens avec la
combinaison, soit 8,0 % de moins. `Alert` et `StressTest` préfèrent alors le
dictionnaire seul. La représentation gagnante dépend du tokenizer et du
contenu.

Sur `Button`, la minification retire 1,46 % des octets mais 2,17 % des tokens
`o200k_base`. Le chiffre de 1,5 % du plan décrit donc correctement un volume
en octets proche, sans démontrer le gain de toute notation compacte. Les
25 286 tokens de `Button` cités dans le rapport L5 ne sont pas reproduits par
ces deux encodages sur le contrat actuel. Sans le tokenizer et le fichier
exact du relevé initial, les deux nombres ne sont pas directement comparables.

La représentation en colonnes seule augmente légèrement les tokens de
`StressTest` et `TileLink` par rapport au minifié. La factorisation crée des
en-têtes et des indices ; elle ne réduit pas systématiquement le contexte.

**Conclusion de la mesure :** les encodages exacts testés apportent un gain
modéré. La suppression du travail de transcription porte sur un volume bien
plus grand. Le gain de génération correspondant reste à mesurer avec un
compilateur et un composant accepté.

### Reproduire le relevé

Depuis la racine du dépôt, avec Python et `tiktoken 0.12.0` disponibles :

```powershell
python 'docs/notes/Recherches/Optimisation Tokens/mesurer-representations.py' '../UCM-Playground' --out 'docs/notes/Recherches/Optimisation Tokens/MESURES-REPRESENTATIONS.json'
```

Le tokenizer n'est pas ajouté aux dépendances du produit. Son premier
chargement peut télécharger les vocabulaires publics ; les contrats sont
comptés localement. Le relevé doit être régénéré si une empreinte change.

## 4. Classement des solutions candidates

Le rang exprime le potentiel de réduction des tokens pour la génération
initiale, sous réserve de conformité. Il ne prétend pas classer des systèmes
déjà validés sur UCM. Les solutions se combinent ; leurs gains ne se
multiplient pas mécaniquement.

| Rang | Solution | Gain en tokens établi pour UCM | Niveau de preuve | Choix proposé |
|---|---|---|---|---|
| 1 | Compiler tout ce que contrat et conventions déterminent | Zéro appel possible sur le sous-ensemble couvert ; couverture non mesurée | Conséquence de l'architecture, compilateur non construit | Cible à moyen terme |
| 2 | Compilateur partiel et complétion des parties manquantes | 50,4 à 89,7 % du texte du contrat transférable, selon l'essai de retrait ; gain total inconnu | Taille mesurée, génération non testée | Première solution à construire |
| 3 | Pipeline fermé avec vérification externe et réparation ciblée | Gain total non mesuré ; réduit les relectures et la découverte | Mécanisme établi, campagnes UCM à refaire | Infrastructure immédiate du rang 2 |
| 4 | Modèle de code sobre en réflexion, avec routage conditionnel | Aucun gain UCM établi | Travaux externes et capacités documentées | Comparer plusieurs fournisseurs sur le même travail résiduel |
| 5 | Sélection exacte du contexte et contrats publics des dépendances | Aucun gain marginal mesuré après compilation | Dérivation déterministe à vérifier | Intégrer au préparateur |
| 6 | Représentation exacte compacte, puis éventuelle refonte du format | Jusqu'à 9,6 % sur `Button` dans les encodages testés | Mesure locale sans test de génération | Optimisation secondaire |
| 7 | Affiner un petit modèle sur les décisions résiduelles | Aucun gain UCM établi | Résultats externes sur une tâche voisine | Après constitution d'un corpus |
| 8 | Compression avec perte de la prose | Aucun gain UCM établi | Résultats externes, exactitude normative non garantie | Essai isolé si la prose domine encore |
| 9 | Préfixes en cache, lots et moteur de service optimisé | Généralement zéro réduction des tokens logiques à contenu identique | Documentation et travaux de systèmes | Complément de prix ou de latence |
| 10 | Représentations latentes et modèles spécialisés | Aucun gain UCM établi | Recherche sur modèles adaptés | Veille, sans dépendance du module |

### 1. Compilation déterministe du composant couvert

**Explication.** Le contrat et les conventions deviennent les entrées d'un
compilateur. Celui-ci produit des sources, des styles et les liaisons aux
dépendances. Les choix récurrents, comme la traduction d'un contour ou le
placement d'un texte, sont implémentés une fois par l'adaptateur.

**Bénéfice réel.** Si toutes les décisions requises sont déterminées, le
nombre de tokens de génération vaut zéro. Ce résultat découle de l'absence
d'appel, sans prouver qu'un composant du corpus soit déjà couvert. Le coût de
développement, le build et la recette restent à payer. Une génération
déterministe peut reproduire systématiquement un défaut du compilateur.

**Intégration.** Réutiliser
[`vueExacteDuVariant`](../../../../../packages/kit/src/lecteurs/variant-views.mjs)
pour préparer une représentation intermédiaire exacte. L'adaptateur traduit
ensuite cette représentation vers les constructions de sa stack.

**Changements.** Ajouter un compilateur, un catalogue explicite de capacités
et des conventions d'intégration structurées. Les conventions doivent
identifier les primitives, les contenus, les événements et les règles
d'accessibilité nécessaires. Garder la prose pour les décisions encore
ouvertes. Aucun changement du contrat exporté n'est requis au départ.

**Module autonome.** Un cœur neutre charge l'adaptateur et vérifie ses
capacités. Une capacité absente produit un besoin explicite ou passe au
rang 2. Le code de production ne lit pas le contrat JSON. Un moteur générique
qui interpréterait ce JSON au runtime contredirait le
[concept actuel](../../../../../CONCEPT.md#3-une-information-un-propriétaire).
Une spécialisation au build qui élimine cet interpréteur reste compatible.

### 2. Compilation partielle et complétion ciblée

**Explication.** Le compilateur écrit les parties déterminées. Le modèle
reçoit une description courte des points encore ouverts, les signatures
nécessaires et les emplacements où sa réponse sera intégrée. Par exemple,
l'adaptateur connaît le slot de texte, mais attend la convention qui relie ce
slot à une prop publique de contenu.

**Bénéfice réel.** Les volumes du retrait mesuré donnent l'ordre de grandeur
de la matière qui peut sortir du prompt. Ils ne comprennent pas la signature
des artefacts générés ni les résumés de structure à réintroduire. Le plan
estime par ailleurs une réduction du code de `Button` de 33 à 6,7 ko ; cette
estimation n'a pas été reproduite ici. Aucun facteur global neuf n'est établi.

**Intégration.** Étendre la génération actuelle, limitée aux unions dans
[`generation.mjs`](../../../../../packages/adapter-typescript/src/generation.mjs),
vers les données puis les fragments de rendu. Conserver les matrices exactes,
y compris les combinaisons absentes. Le modèle n'a plus à réécrire chaque
référence de token.

**Changements.** Définir une interface versionnée des artefacts générés et
des parties à compléter. Le compilateur garde une correspondance entre
chaque fragment et son chemin dans le contrat. Le compte rendu distingue
décision du consommateur, manque normatif et capacité d'adaptateur absente.

**Module autonome.** Le noyau émet une demande de complétion indépendante du
fournisseur. L'adaptateur de stack possède la syntaxe des fragments et leur
assemblage. Une réponse contrainte peut choisir parmi des options typées ; un
fragment de code libre reste possible quand le langage de choix ne suffit
pas. Les contrôles jugent les deux formes après assemblage.

### 3. Pipeline fermé et réparations à partir des échecs

**Explication.** Un préparateur rassemble les fichiers autorisés avant
l'appel. Le modèle produit une réponse, puis le programme lance les
contrôles. Une réparation reçoit les erreurs utiles et les fragments
concernés, sans toute la conversation précédente.

**Bénéfice réel.** Dans un exemple calculé, un préfixe de 10 000 tokens relu
vingt fois représente 200 000 tokens d'entrée. Deux appels représentent
20 000 tokens de ce même préfixe. C'est 90 % de moins sur ce poste, sans
préjuger des sorties ni des autres entrées. Les 17 et 22 appels médians du
plan ne prouvent pas qu'UCM réussira en deux appels.

**Intégration.** Extraire les fonctions utiles de `ucm guide`, des conventions
et des lecteurs. Exécuter `ucm check` et les outils de la stack hors contexte.
Le modèle reçoit des résultats structurés : chemin, variant, propriété,
valeur attendue et valeur obtenue. Les sorties détaillées restent dans les
artefacts de recette.

**Changements.** Créer un orchestrateur et un journal d'usage. Après le budget
de réparation, rendre un résultat non accepté. Une relance dans un agent
général doit être comptée comme une nouvelle tentative, avec son coût.

**Module autonome.** L'orchestrateur peut fonctionner en bibliothèque ou en
CLI, sans Claude Code. Il impose des plafonds séparés pour le nombre d'appels,
les tokens et la dépense. Un plafond atteint ne transforme pas un échec en
succès. La syntaxe de réparation se choisit selon le fournisseur ; un
remplacement de fragment identifié évite les ambiguïtés d'un diff textuel.

### 4. Modèle de code, effort et routage

**Explication.** Tester un modèle de code sans longue réflexion sur les
parties résiduelles. Réserver un modèle plus coûteux aux cas pour lesquels
il réduit suffisamment les échecs. Une règle déterministe peut router selon
les capacités requises et les résultats des essais.

**Bénéfice réel.** Aucun modèle alternatif n'a été testé ici sur une
génération UCM. RouteLLM établit des économies en argent sur d'autres tâches.
Une cascade bon marché puis modèle fort réduit les tokens seulement si :

```text
T_petit + taux_de_repli * T_fort_apres_echec < T_fort_direct
```

Le coût en dollars suit la même comparaison avec les tarifs respectifs. Un
modèle moins cher mais plus verbeux peut gagner en dollars et perdre en
tokens. Un modèle fort qui termine du premier coup peut gagner sur les deux.

**Intégration.** Fixer le paquet, la sortie attendue et les contrôles avant
de comparer les modèles. Évaluer d'abord chaque modèle seul. Tester la
cascade seulement après avoir mesuré les erreurs qui la déclencheraient.

**Changements.** Ajouter un port fournisseur avec capacités déclarées :
sortie structurée, réglage de réflexion, tokenisation, cache et usage. Ne pas
envoyer un réglage commun que certains modèles ignorent ou refusent.

**Module autonome.** Le fournisseur se configure indépendamment de la
stack. La section 5 propose les candidats vérifiés. Le routage ne doit pas
nécessiter un modèle supplémentaire tant qu'une règle mesurée suffit.

### 5. Sélection exacte du contexte et préparation des dépendances

**Explication.** Le préparateur choisit les aides à partir des
caractéristiques du contrat. Il joint les interfaces publiques utiles des
dépendances, les conventions applicables et les signatures des fragments
générés. Un chemin ou une identité stable sert à demander un détail.

**Bénéfice réel.** Le projet possède déjà une sélection d'aides et une
extraction des props des dépendances. Le gain restant n'est pas mesuré. Il
faut compter le coût des éventuelles demandes supplémentaires. Une recherche
sémantique approximative n'est pas nécessaire pour retrouver des champs dont
les adresses sont connues.

**Intégration.** Réutiliser `caracteristiques.mjs`, les conventions et le
graphe des contrats. Une dépendance déjà implémentée fournit son API publique
et son point d'intégration. Si elle manque, l'orchestrateur la génère une
fois, avant les parents, puis répartit ce coût dans la campagne.

**Changements.** Publier un manifeste d'intégration de dépendance : chemin
d'import ou équivalent, symbole, props applicatives et slots de contenu.
Les seules props visuelles du contrat ne couvrent pas nécessairement cette
surface. Signaler un cycle ou une dépendance absente avant l'appel.

**Module autonome.** Commencer par un paquet fermé. Ajouter un outil de
lecture à la demande seulement si le paquet devient trop grand. Un serveur
MCP peut exposer ce même port à un agent externe ; il n'est pas nécessaire au
fonctionnement du noyau.

### 6. Encodage compact et refonte éventuelle des contrats

**Explication.** Réduire les répétitions par dictionnaires, tables ou
factorisation de sous-arbres. Le lecteur reconstitue exactement chaque
combinaison publiée. Les données sont toujours présentes, sous une forme
plus courte.

**Bénéfice réel.** Les encodages testés gagnent 1,8 à 7,6 % au-delà de la
minification sur les trois contrats les plus grands, avec `o200k_base`.
`TileLink` préfère le JSON minifié. Le coût des explications au modèle et
les erreurs de lecture pourraient absorber ces gains.

**Intégration.** Tester cette représentation dans le paquet de travail du
module, avant de changer l'export. Si la matrice est compilée sans être lue
par le modèle, compacter cette matrice n'économise plus de tokens d'inférence.
Cela peut encore réduire les fichiers et le temps de lecture machine.

**Changements.** Deux niveaux sont possibles :

| Niveau | Changement proposé | Condition |
|---|---|---|
| Représentation dérivée | Dictionnaires, colonnes, identifiants de sous-arbres ; contrat d'origine conservé | Décodage exact et provenance de chaque donnée ; version propre au paquet dérivé |
| Nouvelle forme publiée | Tables factorisées de valeurs et diagramme de décision exact des variants observés | Nouvelle version majeure pour cette rupture de forme, migration des lecteurs, schéma et exporteur selon la [compatibilité](../../../../format/COMPATIBILITE.md) |

Un diagramme de décision peut partager les branches identiques tout en
conservant la liste des combinaisons présentes. Il ne doit pas produire les
combinaisons manquantes par produit cartésien. Une formule de chemin de token
ne peut remplacer une table qu'après comparaison exhaustive de sa valeur
sur chaque combinaison observée. Les exceptions restent explicites.

**Module autonome.** Le préparateur peut choisir l'encodage selon le
tokenizer, avec une limite au coût de décodage. Une refonte vers héritage,
défauts et surcharges demanderait de changer l'invariant actuel d'égalité
stricte des vues. Son intérêt n'est pas établi après externalisation des
données mécaniques. Une factorisation réversible dérivée mérite l'essai avant
cette rupture.

### 7. Petit modèle affiné sur les décisions restantes

**Explication.** Constituer des exemples de demandes résiduelles et de
réponses acceptées, puis spécialiser un petit modèle. Le compilateur continue
de prendre en charge les données exactes.

**Bénéfice réel.** L'étude sur l'interface déclarative obtient un coût plus
de dix fois inférieur à celui du professeur. Elle assemble des composants
existants. Ce gain ne constitue pas une preuve pour créer les composants
UCM eux-mêmes. Aucun affinage UCM n'a été réalisé.

**Intégration.** Les sorties validées du rang 2 deviennent les exemples
d'entraînement. Séparer apprentissage et évaluation par familles de composants
et par design systems. Des variantes de `Button` réparties entre les deux
ensembles ne prouvent pas une génération à froid d'un composant inconnu.

**Changements.** Ajouter un corpus vérifié, une chaîne d'entraînement et un
suivi des versions du modèle. Compter le coût de création des exemples,
d'entraînement et de maintenance dans l'amortissement.

**Module autonome.** Brancher le modèle affiné sur le même port fournisseur.
Garder les décisions dépendantes de la stack dans les données d'entrée et
l'adaptateur. Quatre composants ne permettent pas de valider cette solution.

### 8. Compression avec perte de la prose

**Explication.** Résumer ou supprimer les passages de texte jugés
redondants, après sélection des aides pertinentes.

**Bénéfice réel.** LLMLingua-2 fournit des résultats sur plusieurs tâches
textuelles. Le contrat contient des valeurs dont chaque différence peut
changer le rendu. Une compression qui garde le sens général peut omettre une
exception normative. Aucun gain compatible avec cette contrainte n'est établi.

**Intégration.** Limiter l'essai aux explications facultatives. Conserver
intégralement les identifiants, obligations, négations et diagnostics utiles.
Une réécriture éditoriale versionnée coûte moins à exploiter qu'un résumé
recalculé à chaque génération lorsque le texte est stable.

**Changements.** Définir les passages compressibles et vérifier les clauses
conservées. Compter le modèle ou le matériel du compresseur. Retirer les
données mécaniques reste prioritaire.

**Module autonome.** Préprocesseur facultatif, désactivé pour les données
normatives et les conventions qui déterminent le code. Ne pas en faire une
condition pour lire un contrat UCM.

### 9. Cache, lots et infrastructure d'inférence

**Explication.** Réutiliser le calcul des préfixes communs, regrouper les
requêtes non urgentes ou choisir un moteur de service adapté au débit.

**Bénéfice réel.** À prompts et sorties identiques, ces mesures ne retirent
pas les tokens logiques. Elles peuvent réduire la facture, le calcul ou la
latence. Les gains de SGLang et du décodage spéculatif ne doivent pas être
inscrits comme gains de taille du contrat.

**Intégration.** Préfixe stable pour procédure, conventions et interface
d'adaptateur ; suffixe propre au composant. Un cache froid et un cache chaud
forment deux conditions de mesure. L'expiration et les changements de
version invalident le préfixe concerné.

**Changements.** Le port fournisseur expose ses règles de cache et de lots.
Les remises ne se cumulent pas nécessairement. La
[documentation tarifaire Alibaba](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
indique notamment des cas où lots et cache ne se cumulent pas.

**Module autonome.** Commencer avec des API hébergées. Ajouter un service
local si la charge, la confidentialité ou le matériel disponible le
justifient. L'hébergement reste interchangeable et extérieur au compilateur.

### 10. Instructions latentes et raisonnement hors texte

**Explication.** Un modèle adapté peut encoder des instructions dans quelques
états internes au lieu de les relire en texte. D'autres travaux étudient le
raisonnement en espace latent, notamment
[Coconut](https://arxiv.org/abs/2412.06769).

**Bénéfice réel.** Gist Tokens compresse fortement les instructions dans ses
expériences, avec un gain de temps bien plus petit que le facteur de
compression. Aucune preuve disponible ici ne porte sur la génération exacte
de composants UCM. Un état latent réduit le texte visible sans nécessairement
réduire le calcul total.

**Intégration.** Cela concerne un modèle entraîné pour ce mécanisme. Il ne
suffit pas d'envoyer un contrat encodé ou une suite de symboles à une API
ordinaire.

**Changements.** Entraînement, moteur d'inférence compatible et protocole
d'évaluation spécifique. Les tokens du tokenizer ne suffiraient plus à
comparer le coût ; relever aussi le calcul et la latence.

**Module autonome.** Éventuel fournisseur spécialisé, sans modifier la forme
portable du contrat. Investissement disproportionné tant que la compilation
et la réduction des appels n'ont pas été évaluées.

## 5. Modèles, offres et choix d'infrastructure

### Candidats à comparer

Le [comparatif détaillé](./COMPARATIF-MODELES-OFFRES.md) fait autorité sur ce
sujet. Il chiffre les offres directes de huit fournisseurs, sépare les tarifs
vérifiés des capacités publiquement documentées, distingue l'API du modèle de
l'exécuteur de développement, et range les candidats par ordre
d'investissement. Cette étude ne le répète pas.

Une règle vaut d'être retenue ici, parce qu'elle conditionne la lecture de ce
comparatif : le modèle le moins cher par million de tokens n'est pas
nécessairement celui qui consomme le moins de tokens par composant accepté. Les
deux classements se publient séparément. Aucun essai comparatif de ces modèles
n'a été exécuté.

### Ce qui dépend vraiment de l'infrastructure

| Décision | Effet attendu | Mesure avant engagement |
|---|---|---|
| Appel direct au fournisseur | Évite le contexte d'un agent général et ses outils inutiles à cette tâche | Tokens du premier appel et nombre total d'appels |
| Modèle sans réflexion ou effort réduit | Peut raccourcir la sortie | Tokens par composant accepté, avec taux de conformité identique |
| Poids ouverts avec peu de paramètres actifs | Peut réduire le calcul par token | Débit, mémoire totale, qualité après quantification |
| Service local déjà disponible | Peut réduire le coût marginal et garder les données sur site | Coût incrémental et contention avec les autres usages |
| Location dédiée | Peut amortir une charge stable | Prix horaire, taux d'occupation utile, débit et exploitation |
| Exécution par lots | Peut réduire le prix en échange d'un délai | Tarifs réellement compatibles avec le modèle et le cache |
| Plusieurs agents de génération | Ajoute des préfixes et des sorties | À réserver aux essais où le gain de réussite compense les tokens ajoutés |

Les [3 milliards de paramètres actifs de Qwen3-Coder-Next](https://huggingface.co/Qwen/Qwen3-Coder-Next) ne signifient pas
que seuls 3 milliards de paramètres doivent être stockés. À quatre bits par
poids, 80 milliards de poids représentent déjà environ 40 Go, avant
métadonnées de quantification, cache et mémoire de travail. C'est une borne
arithmétique de stockage, pas une configuration matérielle validée.

Le seuil d'auto-hébergement s'écrit plus utilement par composant accepté :

```text
C_local = cout_fixe_mensuel / composants_acceptes_par_mois
          + cout_variable_par_composant_accepte

Seuil = cout_fixe_mensuel / (C_API - C_variable_local)
```

Le seuil n'existe que si `C_API > C_variable_local`. Exemple purement
illustratif : avec 100 USD fixes par mois, 0,010 USD par composant via API et
0,002 USD de coût local variable, le seuil vaut 12 500 composants acceptés
par mois. Un matériel déjà amorti change ce résultat ; le temps d'exploitation
aussi. Aucun seuil universel en milliards de tokens ne remplace ce calcul.

## 6. Architecture du module autonome

### Répartition proposée

```text
contrat + tokens + conventions + interfaces publiques autorisées
                              |
                     validation et préparation
                              |
                représentation intermédiaire exacte
                              |
                    adaptateur de stack
                    /                 \
       fragments déterministes    décisions restantes
                    |                 |
                    |          fournisseur de modèle
                    \                 /
                       assemblage des sources
                              |
                 contrôles externes et recette
                    /                 \
                  accepté       réparation ou besoin explicite
```

Le graphe des dépendances est préparé avant ces étapes. Le module génère une
dépendance manquante avant ses parents et réutilise son interface publique.
La recette à froid garde les anciennes implémentations de la cible hors des
entrées, même si elles sont disponibles dans le repository.

Une demande du modèle doit rester petite parce que le programme a déjà
effectué le travail déterminé. Une simple suppression de champs suivie de
l'instruction « reconstruis le composant » ne remplit pas cette condition.

### Ports nécessaires

Les noms suivants décrivent une proposition d'interface, sans annoncer des
API déjà disponibles.

| Port | Entrées | Sorties et responsabilités |
|---|---|---|
| Lecteur UCM | Contrat, graphe, tokens, configuration | Validation et résolution exacte via le kit ; aucune seconde définition du format |
| Préparateur | Données validées, conventions, capacités de stack | Dossier de génération, décisions ouvertes, provenance, clés de cache |
| Adaptateur de stack | Représentation intermédiaire et conventions | Fragments déterministes, signatures des parties à compléter, assemblage, contrôles propres à la stack |
| Fournisseur de modèle | Prompt, schéma de réponse éventuel, budget | Réponse, usage brut, motif d'arrêt et identification exacte du modèle |
| Vérificateur | Sources assemblées et références de recette | Verdict structuré, erreurs localisées, artefacts de preuve |
| Orchestrateur | Configuration des ports et dossier de travail isolé | Exécution bornée, journal des coûts et résultat final |

Le résultat distingue `accepted`, `needs_decision`, `unsupported` et
`failed`. Une couverture portable partielle doit rester visible. Le module
ne complète pas silencieusement une information normative absente.

Les fragments générés comportent une empreinte des entrées dont ils
dépendent : contrat, conventions, adaptateur et version du compilateur. Les
chemins de provenance servent à rattacher une erreur au champ source.
L'assemblage refuse les références de fragment inconnues et les fichiers
périmés.

### Où faire les changements dans ce projet

| Zone | Changement proposé | Limite à conserver |
|---|---|---|
| `packages/kit` | Réutiliser les lecteurs, exposer si nécessaire les projections exactes utiles au préparateur | Le sous-chemin `format` reste sans dépendance à un fournisseur ou à une stack |
| Nouveau module de génération | Orchestrateur, préparation, provenance, budgets et ports | Fonctionnement sans Figma ni agent de développement particulier |
| `packages/adapter-typescript` | D'abord les données dérivées ; séparation éventuelle d'un adaptateur de rendu | TypeScript ne désigne pas un framework. Une génération de rendu exige une capacité plus précise. |
| Adaptateurs de rendu supplémentaires | Compilation des vues et contrôles de leur environnement | Conventions locales pour les primitives, événements et accessibilité |
| `packages/cli` | Façade éventuelle vers le nouveau module ; réemploi des fonctions du guide | La commande ne doit pas contenir un second orchestrateur |
| `packages/plugin-exporter` | Aucun changement nécessaire pour le premier prototype | L'exporteur continue de publier le contrat portable sans modifier Figma |
| Schéma et format publié | Aucun changement nécessaire pour compilation partielle et paquet dérivé | Une future refonte de l'export suit les règles de version et de compatibilité |
| Repository de recette | Banc à froid, interfaces publiques, correspondance des icônes et vérification du rendu | Les anciennes implémentations servent éventuellement d'oracle isolé, jamais d'entrée au modèle |

La portabilité doit être éprouvée avec une seconde stack. Deux frameworks
web peuvent valider la séparation du code de rendu et du noyau. Cela ne
prouverait pas encore la portabilité vers un environnement sans CSS. Les
primitives portables de layout et leurs limites doivent rester explicites.

### Propositions radicales et réponse réelle au besoin

| Proposition | Répond à la génération initiale à froid ? | Conséquence |
|---|---|---|
| Compiler le contrat en sources ordinaires | Oui, pour les capacités et conventions couvertes | Meilleur plancher en tokens ; investissement dans les adaptateurs |
| Remplacer le JSON runtime par un interpréteur de contrat | Produit un rendu, mais change le modèle de production UCM | Nécessiterait de réviser le concept et d'accepter une dépendance runtime ; non retenu ici |
| Transformer le contrat en langage de programme applicatif | Peut supprimer davantage de décisions | Déplace événements et accessibilité dans l'artefact designer ; conflit avec la répartition actuelle des responsabilités |
| Factoriser exactement les variants exportés | Oui, si chaque combinaison se reconstitue sans invention | Évaluer d'abord une projection dérivée ; gain marginal après compilation |
| Réutiliser une implémentation déjà validée par empreinte | Non pour une première génération inconnue | Cache de résultat utile en exploitation, à exclure du score à froid |
| Appliquer seulement un diff sémantique | Non pour une cible sans code antérieur | Garder une métrique distincte de mise à jour |
| Donner une capture au modèle à la place du contrat | Insuffisant pour l'API, les tokens, les états et les comportements non visibles | La vision peut aider au contrôle, avec un coût séparé ; elle ne remplace pas les données exactes |
| Générer une recette générale de rendu puis la spécialiser | Oui si la recette est écrite sans connaissance de la cible | Variante du compilateur, à vérifier sur les mêmes cas que les adaptateurs |

## 7. Ce qu'il faut prouver avant de retenir une solution

### Une porte d'acceptation indépendante du générateur

`ucm check` et le contrôle de types sont nécessaires, mais ne prouvent pas
le rendu. Une génération qui passe ces deux commandes peut encore ignorer
un état, une peinture, une icône ou une interaction.

| Contrôle | Preuve attendue |
|---|---|
| Forme et graphe | Contrats lisibles, références existantes, dépendances sans ambiguïté |
| Données compilées | Correspondance de chaque variant observé avec sa vue, ses tokens et ses liaisons ; aucune combinaison ajoutée |
| Sources | Compilation ou vérification de syntaxe, API attendue par les consommateurs et imports valides |
| Icônes | Chaque demande possède une correspondance fournie par le consommateur ; visibilité et taille correctes |
| Rendu | Propriétés et géométrie contrôlées sur les variants, tailles et modes applicables ; oracle et tolérances explicités |
| Comportements | Scénarios issus des conventions : focus, clavier, événements et états requis |
| Manques | Diagnostics conservés et décisions non couvertes signalées ; aucun succès déclaré sur simple absence de test |

Le vérificateur ne doit pas prendre toutes ses valeurs attendues dans le
même code de transformation que le générateur. Un défaut commun donnerait
un test vert. Compléter la comparaison des données par des scénarios de
rendu contrôlés indépendamment et des mutations qui doivent être détectées.

La capture doit viser la racine rendue, en excluant les éléments `style` et
`script`, comme le relève le rapport L5. Compter les défauts distincts en
plus de leurs occurrences sur les variants. Conserver les captures ratées
comme échecs de mesure, jamais comme preuves de conformité.

### Campagne minimale puis extension du corpus

La première campagne peut comparer trois architectures sur les quatre
composants, avec cinq répétitions : **60 générations**.

| Condition | Ce qu'elle isole |
|---|---|
| Témoin : contrat entier, harnais allégé | Effet de retirer le contexte général inutile, sans compiler le rendu |
| Compilation partielle, même modèle | Effet du partage déterministe avec le modèle |
| Compilation partielle, candidat de code sans réflexion | Effet du modèle et de son mode sur le même travail résiduel |

Tester ensuite les encodages, la réparation et le cache un par un sur la
meilleure architecture conforme. Randomiser l'ordre des générations et
conserver les requêtes exactes. Séparer une campagne sans cache partagé
d'une campagne à préfixes réutilisés. Une réparation compte dans le coût
du composant initial ; une dépendance partagée est comptée une fois au total.

Le relevé par run doit contenir : identité du modèle et du fournisseur,
réglage de réflexion, empreintes des entrées, usage brut, tokens normalisés,
prix appliqué, durée, appels, réparations, motif d'arrêt et verdict détaillé.
Présenter le taux d'acceptation, les médianes et les percentiles élevés du
coût. Avec cinq répétitions, un percentile élevé reste descriptif ; il
n'établit pas une borne fiable de risque.

Étendre ensuite le corpus à des cas absents de ces quatre composants :
matrice clairsemée, composition conditionnelle, structure variable,
typographie multilignes, grille, modes de tokens, couverture partielle et
capacité non prise en charge. Séparer les familles de composants entre
réglage et évaluation. La seconde stack fait partie de cette extension.

Un gain de tokens n'est retenu qu'à qualité équivalente selon la porte
annoncée. Le coût des échecs reste dans la dépense totale de la campagne,
même si un humain les corrige ensuite. Le temps humain de conventionnement
et de réparation se rapporte à part.

## 8. Décision proposée

Construire d'abord **un module autonome de compilation partielle**, avec
un adaptateur de rendu et un port fournisseur. Réutiliser les lecteurs du
kit. Le premier prototype garde les contrats exportés tels quels et mesure
la part de rendu qu'il peut produire sans modèle.

La comparaison de modèles doit commencer avec **Mistral Small 4,
GPT-5.6 Luna et Qwen3-Coder-Next**, contre Sonnet 5 témoin dans le même
pipeline. Le [comparatif des offres](./COMPARATIF-MODELES-OFFRES.md)
classe les autres candidats et décrit leurs voies d'intégration. La
sélection finale dépendra des tokens par composant accepté, puis de la
facture et de la latence. Aucun fournisseur n'est imposé au noyau.

La compilation totale représente le meilleur potentiel, avec zéro token
de génération sur le sous-ensemble couvert. La compilation partielle est
le premier investissement proposé parce qu'elle réduit déjà le travail
sans supposer que toutes les conventions sont formalisées.

Les mesures présentes justifient de placer la notation compacte après ces
deux leviers. Elles ne justifient pas une nouvelle version du contrat.
L'auto-hébergement, l'affinage et la compression latente demandent des
mesures supplémentaires de charge ou un corpus que le projet ne possède
pas encore.
