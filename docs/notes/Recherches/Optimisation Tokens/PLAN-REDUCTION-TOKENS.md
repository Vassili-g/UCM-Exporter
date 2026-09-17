# Plan de réduction du coût par composant

Cette note propose un plan d'exécution pour réduire les tokens dépensés par
composant reconstruit, sans perdre la qualité d'intégration. Elle prolonge
[RAPPORT-COUT-GENERATION.md](./RAPPORT-COUT-GENERATION.md), qui porte les
mesures de la campagne L5 et les sources tarifaires.

Trois choses la composent : un protocole qui rend chaque réduction vérifiable
(section 3), un inventaire pondéré de vingt-quatre options (section 4), et le
plan retenu, découpé en lots qui se branchent sur ceux du plan des modes
(section 5).

## 1. Ce que coûte un composant aujourd'hui

Médianes de la condition `S` de L5, sur `claude-sonnet-5` à l'effort par
défaut de Claude Code.

| Poste | `Alert` | `Button` |
|---|---|---|
| Contexte initial du harnais | 48,5 k tokens | 39,9 k tokens |
| Matière lue pour la tâche | 70 ko, dont le contrat de la dépendance | 55 ko |
| Appels au modèle | 22 | 17 |
| Sortie, dont réflexion | 38,9 k, dont 35,5 k | 53,8 k, dont 41,4 k |
| Tokens facturés, toutes catégories | 2,64 M | 1,68 M |
| Coût | 1,25 USD | 1,33 USD |

Le coût suit la formule : prix d'écriture fois le contexte final, plus prix de
lecture fois la somme des contextes relus, plus prix de sortie fois la
réflexion et le code. Aux tarifs de Sonnet 5 avec un cache d'une heure, un
token posé au premier appel d'une boucle de vingt appels coûte quatre fois son
prix d'entrée.

## 2. Le plancher atteignable

Un composant reconstruit a besoin de trois choses : la procédure et les aides,
le contrat, les conventions du repository. Les deux premières se mesurent.

| Composant | Contrat | Contrat sans ses données mécaniques | Guide entier | Guide sans l'extraction | Aides imprimées |
|---|---|---|---|---|---|
| `Alert` | 14,4 ko | 7,8 ko | 33,9 ko | 18,0 ko | 11 |
| `Button` | 54,6 ko | 9,8 ko | 71,7 ko | 19,7 ko | 13 |
| `StressTest` | 44,6 ko | 10,2 ko | 68,0 ko | 18,9 ko | 13 |
| `TileLink` | 3,2 ko | 2,3 ko | 14,1 ko | 11,1 ko | 6 |

Les données mécaniques sont `variants`, `viewStructures`, `viewPaintPlacements`,
`viewTypographies`, `viewIcons` et `samples` : un script les résout depuis le
contrat, avec `vueExacteDuVariant` et `compositionsExactesDuVariant`
(`packages/kit/src/lecteurs/variant-views.mjs`).

D'où un plancher, à 2,2 caractères par token pour le `JSON` et 3,5 pour la
prose :

| Élément | Volume | Payé |
|---|---|---|
| Préfixe partagé : procédure, catalogue d'aides entier, conventions, gabarit | 9 k tokens | une fois par campagne, si le cache tient |
| Paquet variable, par composant | 1,5 k (`TileLink`) à 5,3 k (`StressTest`) tokens | à chaque composant |
| Code que le modèle écrit encore | 0,6 k (`TileLink`) à 2,1 k (`Button`) tokens | à chaque composant |

Coût plancher d'un composant de la taille de `Button`, un appel et une
réparation, effort `medium` : environ 0,14 USD sur Sonnet 5, 0,07 USD sur
Haiku 4.5, moitié moins en traitement par lot. Le facteur par rapport à
aujourd'hui vaut environ neuf en dollars et vingt-cinq en tokens, l'écart entre
les deux venant du prix d'une lecture de cache.

## 3. Rendre les réductions vérifiables

Sans ce protocole, aucune des options suivantes ne se juge.

### 3.1. Un relevé versionné

Sur le modèle de `scripts/mesurer-prose.mjs` et de
`docs/notes/qualite/baseline-prose.json`, ajouter `scripts/mesurer-cout.mjs` et
`docs/notes/produit/baseline-cout.json`. Le script lit les transcripts d'une campagne
et rend, par composant et par condition : appels au modèle, contexte initial,
tokens par catégorie, coût, octets du paquet d'entrée, octets écrits par le
modèle, défauts de rendu, code de sortie de `tsc`.

Le relevé se commite. Chaque lot le met à jour, et le commit porte la
différence.

### 3.2. Les compteurs disponibles

| Compteur | Où | Ce qu'il prouve |
|---|---|---|
| `usage` du premier message d'un transcript | `--output-format stream-json` | contexte initial du harnais |
| `total_cost_usd` et `modelUsage` de l'événement `result` | même source | coût et répartition par catégorie |
| Ligne `Prompt cache (main)` de `/usage` | session interactive | part des entrées servies par le cache, nombre de manques, cause probable du dernier |
| `--max-budget-usd` | session non interactive | plafond par composant, arrêt au dépassement |
| Exporteur OpenTelemetry de Claude Code | par utilisateur et par session | suivi si la pratique s'étend à une équipe |

### 3.3. Un prédicat par lot

Chaque lot porte un prédicat mesurable, vérifié par `mesurer-cout.mjs` ou par
un test. Un lot dont le prédicat échoue se retire.

| Lot | Prédicat |
|---|---|
| A. Harnais | contexte initial du premier appel inférieur à 15 k tokens |
| B. Matière | paquet d'entrée inférieur à 12 ko par composant, et aucune occurrence de `"variants"` dans le paquet |
| C. Génération | le fichier du composant ne contient aucune référence de token littérale, motif `{components.` ou `var(--` |
| D. Boucle | au plus trois appels au modèle par composant |
| E. Modèle | coût médian par composant inférieur au budget inscrit dans `baseline-cout.json` |

### 3.4. La porte d'acceptation

Un lot se garde si les cinq contrôles restent au vert sur les quatre
composants du Playground, et se retire sinon.

| Contrôle | Ce qu'il attrape | État |
|---|---|---|
| `tsc --noEmit` sur le projet entier | une prop attendue par un consommateur et non publiée, comme `children` sur `Button` | existe |
| `ucm check` | contrat illisible, graphe de composition incohérent | existe |
| `ucm icons` | une icône réclamée par le contrat et absente du point d'intégration | existe |
| Parité de rendu sur la liste fermée de propriétés | peinture, contour, typographie, dimensions faux sur une combinaison | existe hors dépôt, dans `mesure-l5/mesurer-fidelite.mjs` |
| Compte rendu des manques, format fixe | une donnée absente du contrat, inventée ou masquée | à formaliser |

Un sixième critère porte sur la relecture humaine. Le lot C fait passer le
volume relu sur `Button` de 33 ko à 6,7 ko.

## 4. Inventaire pondéré

Chaque option reçoit une note de 0 à 5 sur cinq critères, multipliée par le
poids du critère. Total sur 55.

| Critère | Poids | Note 5 signifie |
|---|---|---|
| Gain | 3 | retire une part majeure du coût mesuré |
| Qualité préservée | 3 | ne touche à aucun contrôle de la porte |
| Effort | 2 | quelques heures, sans code à maintenir |
| Vérifiabilité | 2 | un compteur existant prouve le gain |
| Portée | 1 | vaut pour tous les composants et dans la durée |

### 4.1. Options retenues

| Option | Gain | Qualité | Effort | Vérif. | Portée | Total |
|---|---|---|---|---|---|---|
| A1. Session isolée : `--strict-mcp-config`, `--setting-sources project`, `--tools`, `--disable-slash-commands` | 4 | 5 | 5 | 5 | 4 | 51 |
| C1. Générer les données mécaniques, le modèle n'écrit plus de table | 5 | 5 | 2 | 5 | 5 | 49 |
| B2. Extraction réduite dans `ucm guide` : props, structure, états, intentions, vues résumées | 4 | 4 | 4 | 5 | 5 | 47 |
| D1. Pipeline : paquet fermé, un appel, contrôles hors contexte, une réparation | 5 | 4 | 2 | 5 | 4 | 45 |
| E2. Effort `medium`, puis `low` | 4 | 3 | 5 | 5 | 3 | 44 |
| A3. Durée de cache choisie selon l'intervalle entre appels | 2 | 5 | 5 | 5 | 2 | 43 |
| D4. Traitement par lot pour une régénération de corpus | 3 | 5 | 3 | 5 | 3 | 43 |
| A2. `--exclude-dynamic-system-prompt-sections` : préfixe partagé entre runs | 2 | 5 | 5 | 4 | 3 | 42 |
| B5. Point de cache explicite sur le préfixe partagé | 3 | 5 | 3 | 4 | 4 | 42 |
| B4. Paquet d'entrée fermé, aucune découverte du dépôt | 5 | 3 | 2 | 5 | 4 | 42 |
| C3. Modification ciblée à la régénération plutôt que réécriture | 4 | 4 | 3 | 4 | 4 | 42 |
| E1. Haiku 4.5 sur le reste du code, relance sur Sonnet à l'échec | 4 | 3 | 3 | 5 | 3 | 40 |
| C5. Compte rendu des manques en format fixe | 1 | 5 | 4 | 5 | 4 | 40 |
| C4. Budget de tâche vu par le modèle, et plafond de dépense | 2 | 4 | 4 | 5 | 3 | 39 |
| A6. Skill scindée, chargement progressif | 2 | 4 | 4 | 4 | 4 | 38 |
| B1. Retrait sec de l'extraction du contrat cible | 2 | 3 | 5 | 5 | 3 | 38 |
| D2. Arrêt après deux réparations, main rendue à la boucle d'agent | 2 | 4 | 4 | 4 | 3 | 37 |

`B1` est la décision brute que le critère de L5 impose. `B2` la remplace et la
contient : l'extraction cesse d'imprimer les données mécaniques, que le lot
`C1` génère, et garde ce qui aide le modèle à écrire.

### 4.2. Options écartées

| Option | Total | Raison |
|---|---|---|
| A5. Hook qui filtre la sortie des commandes | 35 | le pipeline du lot D filtre déjà, hors du contexte |
| A4. Sous-agent pour absorber les sorties volumineuses | 33 | même raison ; un sous-agent repart sur un préfixe neuf, sans cache partagé |
| `TOON` ou autre notation compacte | 26 | le contrat minifié pèse 1,5 % de moins, et la leçon de syntaxe annule le gain ; deux études ne mesurent aucun effet net sur la justesse |
| D3. Tirage multiple, meilleur des N | 26 | multiplie le coût par N ; la littérature donne l'avantage à la réparation guidée à budget égal |
| E3. Autre fournisseur | 25 | exige un autre exécuteur que Claude Code ; à rouvrir une fois le pipeline en place |
| E4. Affiner un petit modèle | 25 | quatre composants et un consommateur ; l'étude de référence s'appuie sur un millier d'exemples |
| B8. Serveur MCP pour servir le contrat | 23 | le pipeline assemble le paquet lui-même, sans protocole à maintenir |
| B6. Compression de prompt, famille `LLMLingua` | 22 | ces méthodes retirent des tokens jugés peu informatifs ; un contrat est une donnée exacte, et une référence de token perdue est un défaut de rendu |
| E5. Auto-hébergement d'un modèle à poids ouverts | 16 | le seuil de rentabilité d'une carte dédiée se situe vers 2,5 à 3 milliards de tokens par mois ; le corpus en consomme quatre ordres de grandeur de moins |

## 5. Le plan

### Lot A. Harnais et guide, sans toucher au code produit

**Gestes.**

1. Fixer la session de reconstruction dans `lancer-run.mjs` puis dans le
   relais :

```sh
claude -p --model claude-sonnet-5 --effort medium \
  --strict-mcp-config --setting-sources project --disable-slash-commands \
  --tools Read,Write,Edit,Bash --exclude-dynamic-system-prompt-sections \
  --append-system-prompt "$(cat .ucm/consigne.md)" --max-budget-usd 1
```

`--disable-slash-commands` retire les skills, donc la consigne du relais passe
par `--append-system-prompt`. L'aide de `--bare` nomme aussi une variante
`--append-system-prompt-file`, absente de la liste des drapeaux de la version
2.1.272 : vérifier avant de s'en servir.

2. Choisir la durée de cache selon l'intervalle entre deux appels. En L5,
   trois runs sur douze ont dépassé cinq minutes entre deux appels, jusqu'à
   507 s sur `Button-G-1`, le temps d'écrire le composant. Tant que le modèle
   écrit un fichier de 33 ko d'un bloc, garder une heure ; après le lot C, le
   plus long appel tombe sous la minute et `CLAUDE_CODE_PROMPT_CACHE_TTL=5m`
   retire 37 % du prix des écritures.
3. Écrire la sortie du guide avec `--out` et nommer ce fichier dans le relais.
   Au-delà d'une taille, Claude Code enregistre le résultat d'une commande dans
   un fichier et n'en montre qu'un aperçu : les trois runs `Button-G` ont payé
   un appel et deux lectures pour récupérer leur propre guide.
4. Scinder `.agents/skills/consommer-contrat/SKILL.md`, comme L6 le prévoit.
   Une skill invoquée charge tout son corps et l'y laisse ; ses fichiers
   voisins ne se chargent que si le modèle les ouvre. Les 23 ko actuels valent
   environ 11 k tokens dès le premier appel.
5. Rétablir dans `packages/cli/procedure.md` la règle que la skill portait :

> Lancer le contrôle de types du projet. Une prop qu'un consommateur attend et
> que le contrat ne publie pas s'ajoute à la surface publique, et se rapporte
> dans le compte rendu.

**Prédicat.** Contexte initial inférieur à 15 k tokens, mesuré par
`claude -p "ok" --output-format json` avec ces options.

**Gain attendu.** 30 à 40 % du coût. **Risque.** Aucun sur la porte, sauf le
point 5, qui la remonte.

### Lot B. Ce que le guide imprime

**Geste.** `packages/cli/src/guide.mjs` imprime une extraction réduite : props,
axes de variantes, `structure`, `stateModel`, `intent`, `meta`, une ligne par
vue utilisée, l'API et l'échantillon de chaque dépendance. Les données
mécaniques ne sont plus imprimées : le lot C les génère. Sur `Button`,
l'extraction passe de 52,0 ko à moins de 10 ko.

**Prédicat.** Paquet inférieur à 12 ko par composant, et aucune occurrence de
`"variants"` dans la sortie. Un test de `guide.test.mjs` le tient.

**Dépend de.** Le lot C, sinon le modèle n'a plus les données et les invente.
Les deux sortent ensemble.

### Lot C. Générer les données mécaniques

C'est le levier principal : sur `Button`, 82 % du contrat et 80 % du code de
référence portent la même information.

**Geste.** `@ucm-kit/adapter-typescript` gagne une génération de données, à
côté des unions de props et du type exact des variants qu'il produit déjà. Par
composant, un module qui porte, pour chaque combinaison de variant : les
références de tokens de peinture, les contours, la vue exacte, les dimensions
par taille, et les échantillons. Le composant de référence de `Button` porte
exactement cette forme, sous les noms `VARIANTS` et `SIZES`.

**Règles.**

| Règle | Où |
|---|---|
| Le composant importe le module généré et ne recopie aucune valeur du contrat | `procedure.md`, aide `resolution-token` |
| Le module se régénère au build, comme `tokens.css` | script `build` du repository consommateur |
| Un module absent ou périmé est une erreur de `ucm check` | `packages/cli/src/check.mjs` |

**Preuve.** Un test compare le module généré au contrat, entrée par entrée, et
se voit rouge quand une entrée est retirée. Une loi du dépôt consommateur
refuse une référence de token littérale dans un composant, motif
`{components.` ou `var(--`, ce qui rend le prédicat du lot vérifiable par
`grep`.

**Ce que la génération apporte à la qualité.** Une étude mesure la
transcription littérale de données par onze modèles à poids ouverts : le taux
de correspondance moyen tombe de 63 % à 100 entrées, à 16 % à 300 et à 7 % à
500 ; les modèles tronquent, sautent des entrées ou dérivent tout en produisant
du code syntaxiquement correct. `Button` compte 90 entrées, et
`claude-sonnet-5` les a transcrites sans écart de rendu dans les trois runs
`S` : le risque n'est pas constaté ici, il porte sur le composant suivant et
sur les modèles moins chers du lot E.

**Gain attendu.** 20 k tokens d'entrée et 9 k tokens de sortie en moins par
reconstruction de `Button`, soit environ 0,35 USD. Sur `StressTest`, le gain
suit `viewStructures` et `samples`, 69 % de son contrat.

**Risque.** Le générateur devient l'autorité sur ces données. La parade est le
test de parité, plus la parité de rendu de la porte.

**Décision à prendre.** Le module généré est du TypeScript, donc il vit dans
l'adaptateur. La question du gabarit neutre en technologie, ouverte en L7, ne
se referme pas pour autant : le gabarit montre une forme, le module porte des
données.

### Lot D. Le pipeline

Une reconstruction à froid n'a rien à explorer. Les runs de L5 consacrent
pourtant 8 à 26 appels à retrouver le contrat, les conventions, `Icone.tsx` et
la configuration, et chaque appel relit tout le contexte accumulé.

**Geste.** Une commande `ucm implement <contrat>`, ou un script du Playground
si la commande doit rester hors de la CLI :

1. assembler le paquet : préfixe partagé, puis paquet variable du composant ;
2. un appel, sortie attendue : le fichier du composant et le compte rendu des
   manques, dans un format fixe ;
3. écrire le fichier, puis lancer les contrôles, hors du contexte du modèle ;
4. sur échec, un second appel qui reçoit les seules lignes en erreur et rend
   une modification ciblée, au format « chercher et remplacer » plutôt qu'un
   diff unifié, que les mesures publiques donnent moins fiable ;
5. après deux réparations sans succès, rendre la main à la boucle d'agent et le
   dire.

**Cache.** Un point de cache explicite sur le préfixe partagé le fait payer une
fois pour toute la campagne. Le livre de recettes d'Anthropic mesure une
facture divisée par deux environ sur une file de tâches indépendantes
partageant un préfixe, et 44 % d'écart entre un préfixe stable octet par octet
et un préfixe instable.

**Lot de traitement.** Une régénération de tout le corpus après un réexport
n'attend personne : l'API Batches facture la moitié de chaque token, lectures
et écritures de cache comprises, sous 24 heures.

**Garde-fous.** `max_tokens` à 64 000 en flux, un budget de tâche que le modèle
voit, un plafond de dépense par composant. Un appel arrêté sur `max_tokens`
compte comme un échec, pas comme une réponse à relancer au même plafond.

**Prédicat.** Au plus trois appels au modèle par composant, coût médian sous
0,30 USD.

**Risque.** Le paquet fermé peut oublier une convention. La parade est la porte
d'acceptation et la relecture du compte rendu des manques à chaque campagne.

### Lot E. Effort, modèle, régénération

1. **Effort.** La réflexion vaut 27 % du coût mesuré. Anthropic mesure sur du
   code long un passage en effort `medium` qui coûte moitié moins pour environ
   deux points de réussite en moins. Balayer `medium` puis `low`, avec `Button`
   et `StressTest` comme cas durs.
2. **Modèle.** Une fois les données générées, la part écrite tient en 6,7 ko
   sur `Button`. Haiku 4.5 coûte la moitié de Sonnet 5 par token. Le schéma
   mesuré par Anthropic, tout passer au niveau bas puis relancer les échecs au
   niveau par défaut, tient le même taux de réussite pour la moitié du prix ;
   la porte fournit le signal d'échec dont il a besoin. Le contexte de Haiku
   s'arrête à 200 k tokens, ce que seul le pipeline laisse tenir.
3. **Régénération.** Après un réexport, le diff sémantique
   ([PLAN-DIFF-SEMANTIQUE.md](../verification/PLAN-DIFF-SEMANTIQUE.md)) donne les champs
   touchés. Une modification qui ne porte que sur des données mécaniques ne
   demande aucun appel : le module se régénère, et la porte vérifie le rendu.
   Sinon, le paquet se réduit aux champs touchés et au fichier existant.

**Prédicat.** Coût médian par composant sous le budget inscrit dans
`baseline-cout.json`, porte au vert.

## 6. Ordre, budget et points de décision

| Lot | Rattachement | Dépend de | Effort | Budget visé pour `Button` |
|---|---|---|---|---|
| 0. Banc corrigé et relevé versionné | L5 | rien | une session, 25 USD de campagne | 1,33 USD, mesuré |
| A. Harnais, guide, procédure | L6 | 0 | une session | 0,80 USD |
| B. Extraction réduite | L6 | C | une session, tests | avec C |
| C. Données générées | nouveau lot L11 | 0 | adaptateur, `check`, tests, loi du dépôt consommateur | 0,45 USD |
| D. Pipeline | nouveau lot L12 | A, B, C | commande, contrôles, cache, lot | 0,25 USD |
| E. Effort, modèle, régénération | nouveau lot L13 | D | balayage sur le banc | 0,08 à 0,15 USD |

Le lot 0 reprend les corrections de la section 1.8 du rapport : sélecteur de
`mesurer-fidelite.mjs` qui ignore `<style>`, défauts distincts dans
`comparer.mjs`, décision sur `coutUsd`, cinq répétitions, et les quatre
composants au lieu de deux.

Trois décisions appartiennent au mainteneur :

1. la forme du module généré, qui fixe TypeScript pour les données et croise la
   question du gabarit de L7 ;
2. la place du pipeline, commande `ucm implement` de la CLI ou script du
   repository consommateur. La CLI le rend reproductible ailleurs ; le script
   garde la CLI hors du métier d'appeler un modèle ;
3. le budget inscrit dans `baseline-cout.json`, qui devient le seuil d'échec du
   contrôle de non-régression.

## 7. Risques et parades

| Risque | Signe à surveiller | Parade |
|---|---|---|
| Le paquet fermé oublie une convention | une aide non appliquée, un écart de rendu récurrent | porte d'acceptation, compte rendu des manques relu à chaque campagne |
| Le générateur devient l'autorité sans preuve | un écart de rendu que `ucm check` ne voit pas | test de parité module contre contrat, vu rouge |
| Le contexte réduit prive le modèle de ce que les consommateurs attendent | `tsc` rouge sur un fichier que le modèle n'a pas écrit | règle du lot A, erreur renvoyée dans la réparation |
| Un effort trop bas dégrade la fidélité | écarts de rendu en hausse sur `Button` et `StressTest` | balayage une variable à la fois, retour au niveau précédent |
| Le cache du préfixe expire entre deux composants | part des entrées servies par le cache en baisse dans `/usage` | durée d'une heure sur le préfixe, composants traités à la suite |
| La réparation boucle sans converger | plus de deux réparations sur un composant | arrêt et main rendue à la boucle d'agent |
| Le budget devient un plafond de qualité | composants acceptés avec des manques non traités | la porte décide, le budget ne la contourne pas |

## 8. Poids des preuves

| Affirmation | Origine | Force |
|---|---|---|
| Répartition du coût, contexte initial, réflexion | douze runs de L5 | mesurée ici |
| Part mécanique des contrats et des composants | quatre contrats du Playground | mesurée ici |
| Taille du guide par partie | `ucm guide` sur les quatre contrats | mesurée ici |
| Effort `medium` à moitié prix pour deux points | guide de coût d'Anthropic, tâche de code longue | mesurée ailleurs, autre tâche |
| Relance des échecs à effort supérieur | même source | mesurée ailleurs, autre tâche |
| Préfixe caché, facture divisée par deux | livre de recettes d'Anthropic | mesurée ailleurs, autre tâche |
| Chute de la transcription littérale au-delà de 100 entrées | étude sur onze modèles à poids ouverts | publiée, modèles différents |
| Dégradation de la justesse quand l'entrée s'allonge | travaux sur le vieillissement du contexte | publiée, tâches différentes |
| Format « chercher et remplacer » plus sûr qu'un diff unifié | bancs publics d'édition de code | publiée, outil différent |
| Petit modèle affiné à qualité proche | étude sur une interface déclarative | publiée, volume hors de portée |

## Sources ajoutées

| Source | Contenu utilisé |
|---|---|
| [Transcription littérale de données](https://arxiv.org/abs/2601.03640) | 63 % de correspondance à 100 entrées, 16 % à 300, 7 % à 500, sur onze modèles à poids ouverts |
| [Tables mal référencées](https://arxiv.org/html/2606.32029v1) | erreurs de référence sur des modèles de 1,7 à 20 milliards de paramètres |
| [Compression de prompt, revue](https://arxiv.org/pdf/2410.12388) et [compression sur tâches de dépôt](https://arxiv.org/pdf/2604.13725) | méthodes, taux, et sensibilité à la tâche |
| [Réparation guidée contre meilleur des N](https://arxiv.org/pdf/2509.02330) | quatre appels contre onze et quinze pour le même résultat |
| [Arrêt anticipé d'un agent de génie logiciel](https://arxiv.org/pdf/2601.05777) | l'arrêt après échecs répétés comme levier de coût |
| [Formats d'édition d'un fichier](https://aider.chat/docs/benchmarks.html) | « chercher et remplacer » à parité avec la réécriture, diff unifié en retrait |
| [Exécution de code contre appels d'outils](https://github.com/orgs/modelcontextprotocol/discussions/629) | le passage par du code plutôt que par des appels d'outils retire l'essentiel des tokens de définition |
| [Skills et contexte](https://code.claude.com/docs/en/skills) | corps de skill chargé à l'invocation et conservé, fichiers voisins à la demande |
| [Suivi des coûts de Claude Code](https://code.claude.com/docs/en/costs) | `/usage`, statistiques de cache, exporteur OpenTelemetry, plafond de dépense |
| [Livre de recettes, coût](https://platform.claude.com/cookbook/cost-optimization-cost-optimization) | préfixe stable, point de cache explicite, gains mesurés |
| [Optimiser coût et intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) | effort, relance des échecs, budgets de tâche, lots |
| [Seuil d'auto-hébergement](https://www.spheron.network/blog/vllm-vs-sglang-2026/) | rentabilité d'une carte dédiée vers 2,5 à 3 milliards de tokens par mois |
| [Chaîne de Visual Copilot](https://www.builder.io/blog/figma-to-code-ai) | modèle, compilateur déterministe, passe de modèle affiné : même partage que le lot C |
