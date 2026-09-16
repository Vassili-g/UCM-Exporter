# Plan de réduction du coût par composant

Cette note propose un plan d'exécution pour réduire les tokens dépensés par
composant reconstruit, sans perdre la qualité d'intégration. Elle prolonge
[RAPPORT-COUT-GENERATION.md](./RAPPORT-COUT-GENERATION.md), qui porte les
mesures et les sources tarifaires. Les chiffres marqués « estimé » sont des
calculs à partir des volumes mesurés, et chaque phase nomme la mesure qui les
confirme ou les infirme.

## 1. Objectif et porte d'acceptation

La cible porte sur `Button`, le composant le plus lourd du Playground :

| Étape | Tokens facturés | Coût | Appels au modèle |
|---|---|---|---|
| Aujourd'hui, médiane de `Button-S` | 1,68 M | 1,33 USD | 17 |
| Après phase 1, estimé | 0,9 M | 0,80 USD | 15 |
| Après phase 2, estimé | 0,4 M | 0,45 USD | 12 |
| Après phase 3, estimé | 60 k | 0,15 à 0,25 USD | 2 |
| Après phase 4, estimé | 60 k | 0,08 à 0,15 USD | 2 |

Les deux colonnes ne baissent pas au même rythme : une lecture de cache coûte
un cinquantième d'une écriture, donc diviser les tokens par vingt-cinq divise
le coût par sept.

**Qualité d'intégration.** Une phase se garde si les cinq contrôles suivants
restent au vert sur les quatre composants du Playground, et se retire sinon.

| Contrôle | Ce qu'il attrape | État |
|---|---|---|
| `tsc --noEmit` sur le projet entier | une prop attendue par un consommateur et non publiée, comme `children` sur `Button` | existe |
| `ucm check` | contrat illisible, graphe de composition incohérent | existe |
| `ucm icons` | une icône réclamée par le contrat et absente du point d'intégration | existe |
| Parité de rendu sur la liste fermée de propriétés | peinture, contour, typographie, dimensions faux sur une combinaison | existe hors dépôt, dans `mesure-l5/mesurer-fidelite.mjs` |
| Compte rendu des manques, format fixe | une donnée absente du contrat, inventée ou masquée | à formaliser |

Un sixième critère porte sur la relecture humaine : le mainteneur relit le code
écrit par le modèle. Sur `Button`, la phase 2 fait passer ce volume de 33 ko à
6,7 ko.

## 2. Profil des contrats à traiter

| Composant | Contrat | Part mécanique du contrat | Code de référence | Part de tables dans le code |
|---|---|---|---|---|
| `Button` | 54,6 ko | `variants` 44,8 ko, 90 entrées, 82 % | 33,0 ko | 26,3 ko, 80 % |
| `StressTest` | 44,6 ko | `viewStructures` 21,2 ko et `samples` 9,7 ko, 69 % | 20,9 ko | 0,1 ko, 0 % |
| `Alert` | 14,4 ko | `variants` 3,7 ko et `viewStructures` 2,9 ko, 46 % | 6,2 ko | 1,9 ko, 31 % |
| `TileLink` | 3,2 ko | `variants` 0,9 ko, 29 % | 2,7 ko | 0,6 ko, 24 % |

Le contrat de `Button` fait 25 k tokens à 2,2 caractères par token. La part
mécanique varie selon le composant : le gain de la phase 2 suit cette part, et
se mesure donc sur les quatre.

## 3. Phase 0 : rendre le banc décidable

Aucune phase suivante ne se juge sans cela. Les corrections sont listées dans
la section 1.8 du rapport. En résumé :

1. `mesurer-fidelite.mjs` cible le premier enfant de `.scene` qui n'est ni
   `<style>` ni `<script>` ; sinon un composant qui émet sa feuille de style
   n'est pas mesuré, comme `Button-G-1`.
2. `comparer.mjs` rend aussi le nombre de défauts distincts, par propriété et
   par valeur rendue, et lève la borne de 200 entrées de `detail`.
3. `analyser-run.mjs` décide sur `coutUsd`, relève le nombre d'erreurs de `tsc`,
   le contexte initial et le nombre d'appels.
4. `lancer-run.mjs` isole la session (phase 1) et fixe `--effort`.
5. Cinq répétitions par cellule, et le jeu des quatre composants plutôt que
   deux : `StressTest` et `TileLink` éprouvent une autre forme de contrat.

Coût de la campagne de référence, aux tarifs actuels : de l'ordre de 25 USD
pour quatre composants en cinq répétitions.

## 4. Phase 1 : session isolée et guide allégé

Aucune de ces corrections ne touche à ce que le modèle doit produire.

**Isoler la session.** Le contexte initial mesuré va de 40 k à 52 k tokens, et
pèse 21 à 59 % du coût d'un run. Il porte les skills, agents, commandes et
connecteurs MCP du compte de l'utilisateur, étrangers à la tâche.

```sh
claude -p --model claude-sonnet-5 --effort medium \
  --strict-mcp-config --setting-sources project --disable-slash-commands \
  --tools Read,Write,Edit,Bash --exclude-dynamic-system-prompt-sections \
  --max-budget-usd 1
```

La consigne du relais passe alors par `--append-system-prompt`, puisque
`--disable-slash-commands` retire les skills. Mesurer le contexte initial
obtenu avant de fixer ces options dans `lancer-run.mjs`.

**Alléger le guide.** Trois gestes, déjà prévus par le plan ou décidés par L5 :

1. retirer l'extraction du contrat cible de `ucm guide`. Sur `Button`, elle
   pèse 52,0 ko des 71,7 ko de la sortie, dont 43,1 ko pour le seul champ
   `variants` ;
2. écrire la sortie avec `--out` et nommer ce fichier dans le relais. Au-delà
   d'une taille de sortie, Claude Code enregistre le résultat d'une commande
   dans un fichier et n'en montre qu'un aperçu : les trois runs `Button-G` ont
   payé un appel et deux lectures pour récupérer leur propre guide ;
3. scinder `.agents/skills/consommer-contrat/SKILL.md`, comme le prévoit L6.
   Une skill invoquée charge tout son corps dans le contexte et l'y laisse ;
   ses fichiers voisins ne se chargent que si le modèle les ouvre. Les 23 ko de
   la skill actuelle valent environ 11 k tokens dès le premier appel.

**Rétablir la règle du contrôle de types.** `packages/cli/procedure.md` demande
de ne lancer que les contrôles nommés par les preuves des aides. La skill `S`
porte une règle que la procédure a perdue : les identifiants attendus par les
consommateurs se découvrent dans les erreurs de `tsc`. Les trois échecs de
types de la mesure sont tous en condition `G`. Ajouter à la procédure :

> Lancer le contrôle de types du projet. Une prop qu'un consommateur attend et
> que le contrat ne publie pas s'ajoute à la surface publique, et se rapporte
> dans le compte rendu.

Gain attendu de la phase : 30 à 40 % du coût, sans changement du code produit.
Mesure : campagne du banc corrigé, condition « session isolée » contre
condition actuelle.

## 5. Phase 2 : générer ce qui est mécanique

C'est le levier principal. Sur `Button`, le modèle lit 25 k tokens de contrat
pour en recopier 8 k tokens sous forme de table : 82 % du contrat et 80 % du
code écrit portent la même information.

**Ce qui se génère.** Un module de données par composant, produit depuis le
contrat par `@ucm-kit/adapter-typescript`, qui génère déjà les unions de props
et le type exact des variants. Les lecteurs publics fournissent la résolution :
`vueExacteDuVariant` et `compositionsExactesDuVariant`
(`packages/kit/src/lecteurs/variant-views.mjs`).

Contenu du module, pour chaque combinaison de variant : les références de
tokens de peinture, les contours, la vue exacte, et les tables de dimensions
par taille. Le composant de référence de `Button` porte exactement cette
table, sous le nom `VARIANTS`, suivie de `SIZES`.

**Ce que le modèle écrit.** La surface publique, l'arbre, la composition, les
états, les échantillons et le branchement des icônes, soit 6,7 ko sur `Button`.
Il importe le module généré et n'en recopie aucune valeur.

**Règles qui accompagnent la génération.**

| Règle | Où |
|---|---|
| Le composant importe le module généré ; aucune valeur du contrat ne se recopie dans le composant | `procedure.md` et aide `resolution-token` |
| Le module se régénère au build, comme `tokens.css` | script `build` du repository |
| Un module absent ou périmé est une erreur de `ucm check` | `packages/cli/src/check.mjs` |
| Le guide n'imprime ni `variants`, ni les vues, ni les échantillons complets | `packages/cli/src/guide.mjs` |

**Preuve.** Un test de parité compare le module généré au contrat, entrée par
entrée, et se voit rouge en retirant une entrée. La parité de rendu de la
porte d'acceptation reste le juge final : elle a déjà attrapé, en condition
`G`, des styles natifs de `<button>` non neutralisés sur les 58 combinaisons.

**Ce que la génération apporte à la qualité.** Une étude de janvier mesure la
transcription littérale de données par onze modèles à poids ouverts : le taux
de correspondance moyen tombe de 63 % à 100 entrées, à 16 % à 300 entrées et à
7 % à 500. Les modèles tronquent, sautent des entrées ou dérivent, tout en
produisant du code syntaxiquement correct. `Button` compte 90 entrées, et
`claude-sonnet-5` les a transcrites sans écart de rendu dans les trois runs
`S`. Le risque n'est donc pas constaté ici : il porte sur le composant suivant,
plus large, et sur les modèles moins chers que la phase 4 met en jeu.

Gain attendu sur `Button` : 20 k tokens d'entrée et 9 k tokens de sortie en
moins par reconstruction, soit environ 0,35 USD au tarif de Sonnet 5, avant
même les phases suivantes. Gain nul sur `StressTest` tant que la génération ne
couvre pas `viewStructures`, ce que la mesure dira.

## 6. Phase 3 : sortir de la boucle d'agent pour la reconstruction à froid

Une reconstruction à froid n'a rien à explorer : le contrat, les conventions,
le point d'intégration des icônes et la configuration sont connus. Les runs de
L5 consacrent pourtant 8 à 26 appels à les retrouver, et chaque appel relit
tout le contexte accumulé.

**Forme proposée.** Une commande `ucm implement <contrat>` ou un script du
Playground, qui enchaîne :

1. assemblage du paquet d'entrée : procédure, aides employées, conventions,
   contrat réduit, API et échantillon des dépendances, gabarit ;
2. un appel au modèle, sortie attendue : le fichier du composant et le compte
   rendu des manques, dans un format fixe ;
3. écriture du fichier, puis contrôles lancés par le script, hors du contexte
   du modèle ;
4. sur échec, un second appel qui reçoit les seules lignes en erreur et rend
   une modification ciblée ;
5. après deux réparations sans succès, la main revient à la boucle d'agent, et
   le script le dit.

**Mise en cache du préfixe.** La procédure, le catalogue d'aides et les
conventions ne changent pas d'un composant à l'autre. Un point de cache
explicite sur ce préfixe le fait payer une fois pour tout le corpus. Le
livre de recettes d'Anthropic mesure une facture divisée par deux environ sur
une file de tâches indépendantes partageant un préfixe, et une baisse de 44 %
entre un préfixe stable octet par octet et un préfixe instable.

**Traitement par lot.** Une régénération de tout le corpus après un réexport
n'attend personne. L'API Batches facture la moitié de chaque token, lectures et
écritures de cache comprises, pour un résultat rendu sous 24 heures.

**Garde-fous.** `max_tokens` à 64 000 en flux, un budget de tâche que le modèle
voit, et un plafond de dépense par composant. Un appel arrêté sur `max_tokens`
compte comme un échec, pas comme une réponse à relancer au même plafond.

Gain attendu : le coût passe sous 0,25 USD par composant, et le nombre d'appels
de 12 à 2. Mesure : même porte d'acceptation, plus le nombre de réparations
nécessaires par composant.

## 7. Phase 4 : effort et modèle

À faire une fois le pipeline en place, une variable à la fois, sur le banc.

1. **Effort.** La réflexion vaut 27 % du coût mesuré, à l'effort par défaut.
   Anthropic mesure sur du code long un passage en effort `medium` qui coûte
   moitié moins pour environ deux points de réussite en moins. Balayer
   `medium`, puis `low`, en gardant `Button` et `StressTest` comme cas durs.
2. **Modèle sur le reste du code.** Une fois les tables générées, la part
   écrite tient en 6,7 ko. `claude-haiku-4-5` coûte la moitié de Sonnet 5 par
   token. Le schéma mesuré par Anthropic sur du code, tout passer au niveau
   bas puis relancer les échecs au niveau par défaut, tient le même taux de
   réussite pour la moitié du prix. La porte d'acceptation fournit le signal
   d'échec dont ce schéma a besoin.
3. **Contexte.** Haiku 4.5 s'arrête à 200 k tokens de contexte. La boucle
   d'agent actuelle atteint 191 k sur `Button` : seul le pipeline de la phase 3
   laisse la place.
4. **Autre fournisseur.** À n'ouvrir qu'après la phase 3, puisqu'il faut un
   autre exécuteur que Claude Code, et à juger sur le même banc. Compter le
   contrat avec le tokeniseur du fournisseur visé avant de comparer des prix
   par million de tokens.

## 8. Phase 5 : régénérer après un réexport

Une modification du contrat ne justifie pas de réécrire le composant. Le diff
sémantique décrit dans [PLAN-DIFF-SEMANTIQUE.md](./PLAN-DIFF-SEMANTIQUE.md)
donne les champs touchés. Le paquet d'entrée se réduit alors à ces champs, au
fichier existant et aux conventions, et la sortie attendue est une modification
ciblée. Une modification du seul champ `variants` ne demande aucun appel : le
module généré se régénère, et la porte d'acceptation vérifie le rendu.

Mesure : coût par composant modifié, et nombre de cas où la modification
ciblée échoue et demande une réécriture complète.

## 9. Ordre, rattachement aux lots, budget

| Phase | Rattachement | Dépend de | Coût de mise en œuvre | Gain attendu |
|---|---|---|---|---|
| 0. Banc décidable | L5 | rien | une session d'agent, 25 USD de campagne | aucune, condition des suivantes |
| 1. Session isolée, guide allégé, règle de `tsc` | L6 | 0 | une session | 30 à 40 % |
| 2. Tables générées | nouveau lot, après L6 | 1 | adaptateur, `check`, guide, tests | 25 à 35 % de plus |
| 3. Pipeline | nouveau lot | 2 | commande `implement`, contrôles, cache, lot | 50 à 60 % de plus |
| 4. Effort et modèle | mesure | 3 | balayage sur le banc | 30 à 50 % de plus |
| 5. Régénération ciblée | après le diff sémantique | 2 | script de paquet réduit | porte sur les réexports |

## 10. Risques et parades

| Risque | Signe à surveiller | Parade |
|---|---|---|
| Le paquet d'entrée fermé oublie une convention | une aide non appliquée, un écart de rendu récurrent | la porte d'acceptation, et le compte rendu des manques relu à chaque campagne |
| Le générateur de tables devient l'autorité sans preuve | un écart de rendu que `ucm check` ne voit pas | test de parité entre module généré et contrat, vu rouge |
| Le contexte réduit prive le modèle de ce que les consommateurs attendent | `tsc` rouge sur un fichier que le modèle n'a pas écrit | la règle de la phase 1, et l'erreur de `tsc` renvoyée dans la réparation |
| Un effort trop bas dégrade la fidélité | écarts de rendu en hausse sur `Button` et `StressTest` | balayage une variable à la fois, retour au niveau précédent |
| Le cache de préfixe expire entre deux composants | `cache_read_input_tokens` à zéro sur le second composant | durée d'une heure sur le préfixe, et composants traités à la suite |
| Deux sessions écrivent le même composant | index Git partagé | le pipeline écrit un seul fichier et le dit |

## 11. Écarté, et pourquoi

| Piste | Raison |
|---|---|
| Format `TOON` ou autre notation compacte pour le contrat | le contrat est déjà sans espacement ; sa version minifiée pèse 1,5 % de moins, et la leçon de syntaxe à placer dans le prompt annule le gain |
| Affiner un petit modèle | trois composants et un consommateur ; l'étude de référence s'appuie sur un millier d'exemples |
| Serveur MCP pour servir le contrat | le pipeline de la phase 3 assemble le paquet lui-même, sans protocole à maintenir |
| Édition de contexte et compaction | les runs comptent 8 à 26 appels ; ces mécanismes visent des sessions longues et réécrivent le cache |
| Sortie prédite par le modèle | non disponible chez Anthropic ; la phase 5 vise le même but par une modification ciblée |
| Réduire `max_tokens` | le modèle ne le voit pas ; une réponse tronquée est un échec payé |

## Sources ajoutées

| Source | Contenu utilisé |
|---|---|
| [Transcription littérale de données](https://arxiv.org/abs/2601.03640) | chute du taux de correspondance de 63 % à 100 entrées, 16 % à 300, 7 % à 500, sur onze modèles à poids ouverts |
| [Table des données mal référencées](https://arxiv.org/html/2606.32029v1) | erreurs de référence à une table sur des modèles de 1,7 à 20 milliards de paramètres |
| [Skills et contexte, Claude Code](https://code.claude.com/docs/en/skills) | corps de skill chargé à l'invocation et conservé, fichiers voisins chargés à la demande |
| [Livre de recettes, coût](https://platform.claude.com/cookbook/cost-optimization-cost-optimization) | préfixe stable, point de cache explicite, gains mesurés |
| [Optimiser coût et intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) | effort, relance des échecs, budgets de tâche, lots |
