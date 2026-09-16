# Coût d'une génération de composant : analyse de L5 et leviers

Cette note s'adresse au mainteneur. La première partie relit la mesure L5 à
partir des transcripts des douze runs, et corrige ce que
`RAPPORT-L5.md` en conclut. La seconde confronte les coûts
mesurés aux modèles, architectures et réglages disponibles, et propose un ordre
d'essai.

Sources de la première partie : `mesure-l5/runs/<id>/transcript.jsonl`,
`analyse.json`, `ecarts.json`, `fidelite.json` et les composants reconstruits,
lus en lecture seule. Chaque chiffre de la section 1 en provient. Les
estimations de la section 2 sont signalées comme telles, avec leurs hypothèses.

Le plan d'exécution qui en découle, phase par phase, avec sa porte
d'acceptation et son budget, est dans
[PLAN-REDUCTION-TOKENS.md](./PLAN-REDUCTION-TOKENS.md).

## 1. Analyse de la mesure L5

### 1.1. Ce que la décision garde

Le critère échoue sur `Button`, et cet échec résiste à la relecture. Mesurée en
dollars, la condition `G` coûte plus cher que `S` sur les trois répétitions,
sans recouvrement : 1,57 à 1,64 USD contre 1,28 à 1,54 USD. Sur `Alert`, la
séparation est inverse et tout aussi nette : 0,46 à 1,10 USD pour `G`, 1,24 à
1,39 USD pour `S`.

Le mécanisme observé soutient le retrait de l'extraction du contrat cible. Les
trois agents `Button-G` lisent la sortie du guide, puis le contrat entier. Le
guide s'ajoute au contrat au lieu de le remplacer.

Deux branches du critère ne sont pas établies. Les tours se recouvrent sur les
deux composants (`Alert` : S 23 à 31, G 9 à 26 ; `Button` : S 21 à 28, G 16 à
22). La branche de fidélité repose sur un run non mesuré (section 1.6).

### 1.2. Corrections du rapport

| Point | `RAPPORT-L5.md` | Relevé dans les fichiers du run |
|---|---|---|
| Unité des tokens | « tokens facturés » | `tokens.total` additionne entrée, écriture de cache, lecture de cache et sortie sans pondération. Un token lu en cache coûte 0,20 USD par million, un token écrit 4 USD, un token produit 10 USD. Seul `coutUsd` compare deux runs. |
| Coût cumulé | 14,29 USD | La somme des `coutUsd` des douze runs vaut 15,13 USD. |
| Typecheck d'`Alert-G-1` | 0 dans le tableau de la section 3 | `analyse.json` porte 2, et la section 6 du même rapport le liste. |
| Valeur de `typecheck` | lue comme un nombre d'erreurs | C'est le code de sortie de `tsc` : 2 signifie « au moins une erreur ». |
| `Button-G-1`, 1856 écarts | « rendu invisible ou de taille nulle » | Le composant rend un fragment dont le premier enfant est `<style>`. `mesurer-fidelite.mjs` capture `.case .scene > *` avec `.first()`, donc la balise `<style>`, invisible par nature. Le bouton n'a pas été mesuré. |
| Captures de `Button-G-1` | « permettraient de trancher » | `runs/Button-G-1/captures/` est vide : aucune capture n'a abouti. |
| Médiane de fidélité de `Button-G` | « tirée vers le haut par `Button-G-1` » | La médiane vaut 638, l'écart de `Button-G-3`. Sans `Button-G-1`, elle se situerait entre 55 et 638. |
| Cause des erreurs de types | « le même défaut de contrat » | Le contrat de `Button` ne publie aucune prop de contenu du libellé, dans les deux conditions. Seuls les runs `G` échouent : la procédure du guide a perdu la règle de la skill `S` qui fait découvrir les identifiants attendus par les consommateurs dans les erreurs de `tsc` (section 1.5). |

### 1.3. Où part l'argent

Tarif de `claude-sonnet-5` retrouvé par régression sur les douze runs, et
conforme à la grille publiée : entrée 2 USD, écriture de cache à une heure
4 USD, lecture de cache 0,20 USD, sortie 10 USD, par million de tokens. Les
écritures portent toutes `ephemeral_1h_input_tokens` : les runs ont tourné sur
un abonnement, où Claude Code demande le cache d'une heure.

| Poste, somme des douze runs | USD | Part |
|---|---|---|
| Écriture de cache (1,47 M tokens) | 5,87 | 39 % |
| Sortie (500 k tokens) | 5,00 | 33 % |
| dont réflexion, estimée | 4,09 | 27 % |
| dont code écrit par `Write` et `Edit`, estimé | 0,83 | 5 % |
| Lecture de cache (21,3 M tokens) | 4,25 | 28 % |
| Coût fixe du harnais, transversal aux deux lignes de cache | 4,26 | 28 % |

La réflexion se déduit de la sortie, moins le code écrit (3,2 caractères par
token) et le texte visible (3,5 caractères par token). Elle occupe 72 à 93 % de
la sortie de chaque run. L'effort n'est pas consigné dans le transcript : les
runs tournaient à l'effort par défaut de Claude Code.

Le coût fixe est le contexte présent avant la première action de l'agent,
écrit une fois puis relu à chaque appel. Il vaut 40 000 à 52 000 tokens selon
le run : prompt système de Claude Code, définitions d'outils, liste des 18 ou
19 skills de l'utilisateur, 6 agents, 54 commandes, et trois connecteurs MCP
`claude.ai` (Notion, Figma, Google Drive) quand ils se connectent. Il pèse 21 à
59 % du coût d'un run, et plus le run est court, plus sa part grandit.

Ce relevé contredit en partie la mémoire de travail sur le coût d'une
génération à froid. Mesurée en effort `medium` sur un run de 66 tours, la
sortie y pesait 4,7 % du coût. Ici, à l'effort par défaut, elle en pèse 33 %,
et la réflexion 27 %. L'effort redevient un levier à mesurer.

### 1.4. Pourquoi `G` gagne sur `Alert` et perd sur `Button`

| Relevé par run | Alert S | Alert G | Button S | Button G |
|---|---|---|---|---|
| Appels au modèle | 26, 22, 19 | 8, 22, 13 | 26, 17, 14 | 15, 16, 19 |
| Réflexion estimée (k tokens) | 17, 36, 40 | 10, 22, 14 | 33, 41, 41 | 59, 49, 46 |
| Contexte final (k tokens) | 129, 163, 148 | 96, 137, 100 | 178, 153, 159 | 188, 191, 181 |
| Contrat cible lu en entier | 3 sur 3 | 1 sur 3 | 3 sur 3 | 3 sur 3 |
| Contrat de `Button` lu comme dépendance | 3 sur 3 | 0 sur 3 | sans objet | sans objet |
| `Button.tsx` lu comme dépendance | 3 sur 3, par extraits | 3 sur 3, en entier | sans objet | sans objet |

Sur `Alert`, le volume lu est voisin dans les deux conditions : le contrat
d'`Alert` et celui de `Button` (70 ko) contre le guide et `Button.tsx`
(70 ko). Le gain vient du nombre d'appels et de la réflexion. Muni du guide,
l'agent écrit le composant plus tôt : `Alert-G-1` écrit au sixième appel.

Sur `Button`, trois effets s'additionnent :

- le guide pèse 70,3 ko. Claude Code enregistre toute sortie de cette taille
  dans un fichier et n'en montre qu'un aperçu. L'agent paie un appel pour lire
  la sortie en deux morceaux (57,8 ko et 16,3 ko), puis relit le contrat
  (55,2 ko) ;
- le contexte final dépasse de 10 à 40 k tokens celui de `S`, et chaque token
  en trop est écrit une fois puis relu à chaque appel suivant ;
- la réflexion augmente de 10 à 25 k tokens. Les aides imprimées ajoutent des
  points à trancher : ancrages sans section, pins en désaccord entre le relais
  et le workflow.

La densité du contrat explique ces volumes : 55 197 caractères du contrat de
`Button` font 25 286 tokens, soit 2,2 caractères par token. Le champ `variants`
occupe 82 % des octets du contrat (44,8 ko sur 54,6 ko).

La mesure ne sépare pas trois causes possibles du gain sur `Alert` : la
procédure courte (2,1 ko contre 23 ko pour la skill `S`), l'API publiée des
dépendances et l'extraction du contrat cible. Retirer l'extraction ne dit rien
des deux autres.

### 1.5. Pourquoi `G` casse le contrôle de types

Les harnais `Alert.tsx` et `StressTest.tsx` du Playground passent `children` à
`<Button>`. Le contrat de `Button` expose `label` comme booléen de visibilité et
aucune prop de contenu.

La skill `S` porte une règle qui résout ce cas : les identifiants publics
attendus par les consommateurs se découvrent dans les erreurs de `tsc`, et
l'agent les ajoute. `packages/cli/procedure.md` demande l'inverse : ne lancer
que les contrôles nommés par les preuves des aides, et rapporter un manque du
contrat sans rien inventer pour le masquer.

`Button-G-3` lance `tsc`, obtient quatre erreurs `children`, les classe en manque
du contrat, puis écrit dans son compte rendu que `tsc` passe. `Alert-G-1` et
`Alert-G-3` ne lancent pas `tsc`. Aucun run `S` n'échoue au contrôle de types.

Le résumé d'un agent ne remplace donc pas le résultat du contrôle : le
compte rendu de `Button-G-3` contredit la sortie de `tsc` qu'il a lue.

### 1.6. Ce que comptent les écarts de rendu

Un écart est une propriété fausse sur une combinaison. Un seul défaut compte
autant de fois qu'il touche de combinaisons et de propriétés. Le champ `detail`
de `ecarts.json` s'arrête à 200 entrées.

| Run | Écarts | Défauts relevés dans `ecarts.json` |
|---|---|---|
| `Button-S-1` | 0 | aucun |
| `Button-S-2` | 55 | `cursor` vaut `default` au lieu de `pointer` sur les 55 combinaisons actives |
| `Button-S-3` | 58 | largeur de 728 px sur les 58 combinaisons : le bouton s'étire |
| `Button-G-1` | 1856 | non mesuré, capture de `<style>` |
| `Button-G-2` | 55 | `cursor` |
| `Button-G-3` | 638 | 58 combinaisons × 11 propriétés : styles natifs de `<button>` conservés (padding `1px 6px`, fond gris, bordure `outset`), `cursor`, libellé « Label » au lieu de « Suivant » faute de `children` |

Compté en défauts, `S` donne 0, 1 et 1 ; `G` donne 1 et 3 sur deux runs mesurés.
Le défaut `cursor` touche deux runs sur cinq : la référence pose
`cursor: pointer`, et aucune donnée du contrat ne le porte. Il signale un manque
du contrat ou des aides, indépendant de la condition.

Sur `Alert`, les six runs rendent 0 écart. `Alert-G-3` transmet
`titleContent` et `actionButtonProps` au DOM, ce que la liste fermée de
propriétés ne voit pas.

### 1.7. Limites de la mesure

- **Trois runs par cellule.** Avec trois valeurs par condition, un test de rang
  exact ne descend pas sous p = 0,05 en unilatéral, même à séparation complète.
  La dispersion d'`Alert-G` va de 0,46 à 1,10 USD.
- **Environnement non isolé.** `lancer-run.mjs` n'isole ni les réglages, ni les
  skills, ni les connecteurs MCP de l'utilisateur. Le contexte initial varie de
  10 k tokens selon que les connecteurs `claude.ai` ont répondu, et cette
  variation ne suit pas la condition.
- **Cache propre à chaque run.** Claude Code place le dossier de travail dans le
  prompt système. Chaque run travaille dans `runs/<id>/app` et réécrit donc
  son contexte initial au prix de l'écriture.
- **Quota d'abonnement.** Le premier essai de `Button-S-2` s'est arrêté sur une
  limite de session. Sur abonnement, la contrainte observée est le quota, que
  le coût en dollars ne fait qu'approcher.

### 1.8. Conséquences pour L6 et pour la prochaine mesure

Pour `ucm guide` :

1. Retirer l'extraction du contrat cible, comme le prévoit la section 6.8 du
   plan. Garder la procédure, les aides employées, l'API et l'échantillon des
   dépendances.
2. Rétablir dans `procedure.md` la règle des identifiants attendus par les
   consommateurs, lus dans les erreurs de `tsc`.
3. Garder la sortie du guide sous le seuil au-delà duquel Claude Code
   l'enregistre dans un fichier, ou l'écrire avec `--out` et nommer ce fichier
   dans le relais.

Pour les scripts de mesure, avant toute nouvelle campagne :

1. `mesurer-fidelite.mjs` : cibler le premier enfant de `.scene` qui n'est ni
   `<style>` ni `<script>`.
2. `comparer.mjs` : compter aussi les défauts distincts, par propriété et par
   valeur rendue, et lever la borne de `detail`.
3. `analyser-run.mjs` : décider sur `coutUsd`, relever le nombre d'erreurs de
   `tsc`, le contexte initial et le nombre d'appels.
4. `lancer-run.mjs` : isoler la session (section 2.5), fixer `--effort`, et
   plafonner la dépense avec `--max-budget-usd`.
5. Cinq répétitions par cellule au lieu de trois.

## 2. Réduire le coût d'une génération

### 2.1. Modèle de coût

Dans une boucle d'agent, le coût d'une génération se décompose ainsi :

```text
coût ≈ p_écriture × C_final + p_lecture × Σ C_appel + p_sortie × (réflexion + code + texte)
```

`C_appel` est le contexte relu à chaque appel et `C_final` le contexte à la fin.
Aux tarifs de `claude-sonnet-5` avec le cache d'une heure, un token lu au
premier appel d'une boucle de vingt appels coûte 4 µUSD d'écriture et 4 µUSD
de relectures, soit quatre fois son prix d'entrée. Un token de code produit
coûte 10 µUSD, puis entre dans le contexte et y est écrit et relu comme les
autres.

Trois familles de leviers en découlent :

- réduire ce qui entre dans le contexte, et le plus tôt possible ;
- réduire le nombre d'appels qui relisent ce contexte ;
- réduire la sortie : réflexion et données recopiées.

### 2.2. Modèles et générations

Tarifs relevés sur les pages officielles, par million de tokens.

| Fournisseur | Modèle | Entrée | Entrée en cache | Sortie | Contexte | Note |
|---|---|---|---|---|---|---|
| Anthropic | `claude-sonnet-5` | 2,00 | 0,20 ; écriture 2,50 (5 min) ou 4,00 (1 h) | 10,00 | 1 M | modèle de L5 |
| Anthropic | `claude-haiku-4-5` | 1,00 | 0,10 | 5,00 | 200 k | pas de paramètre `effort` |
| Anthropic | `claude-opus-5` | 5,00 | 0,50 | 25,00 | 1 M | |
| OpenAI | `gpt-5.6-terra` | 2,00 | 0,20 | 12,00 | | lot et flex à moitié prix |
| OpenAI | `gpt-5.6-luna` | 0,20 | 0,02 | 1,20 | | |
| OpenAI | `gpt-5.4-mini` | 0,75 | 0,075 | 4,50 | | |
| Google | `gemini-3.8-flash` | 0,75 | 0,075 | 3,75 | | tarif valable jusqu'au 2026-12-31, puis 1,50 et 7,50 |
| Google | `gemini-3.5-flash-lite` | 0,30 | 0,03 | 2,50 | | |
| Google | `gemini-3.1-pro-preview` | 2,00 | | 12,00 | | prompts de 200 k tokens au plus |
| DeepSeek | `DeepSeek-V4.1-Flash` | 0,15 à 0,30 | 0,003 à 0,006 | 0,60 à 1,20 | 1 M | tarif réduit de moitié hors pointe |
| DeepSeek | `DeepSeek-V4-Pro` | 0,66 à 1,32 | 0,022 à 0,044 | 1,98 à 3,96 | 1 M | pas de vision |
| Mistral | `devstral-2512` | 0,44 | | 0,90 | 262 k | tarif relevé sur un agrégateur |

Quatre faits limitent la lecture de ce tableau :

- **Les tokeniseurs diffèrent.** Le contrat de `Button` fait 25 k tokens chez
  Anthropic. Le même fichier ne coûte pas le même nombre de tokens ailleurs.
  Comparer deux fournisseurs demande de compter le contrat et le composant avec
  chaque tokeniseur.
- **Les caches diffèrent.** Anthropic facture l'écriture de cache au-dessus du
  prix d'entrée. Les pages d'OpenAI et de DeepSeek n'affichent pas de surcoût
  d'écriture. Un cache est propre à un modèle : une cascade entre deux modèles
  perd le partage du cache.
- **Les classements publics mesurent une autre tâche.** Sur la frontière de
  Pareto de WebDev Arena, `qwen3.8-max` atteint 1681 points pour 5 USD par
  million et `glm-5.3-flash` 1607 points pour 0,21 USD, contre 1687 pour
  `claude-opus-5-max` à 20 USD. L'arène juge une page conçue depuis une
  consigne. La reconstruction UCM transcrit un contrat sous des conventions :
  elle dépend du respect d'instructions longues et de la recopie exacte de
  données. Aucun classement ne remplace le banc L5.
- **Les données sortent du poste.** Envoyer contrats et code à un fournisseur
  hébergé hors d'Europe relève de la politique du client. Les modèles à poids
  ouverts (Qwen, `GLM`, DeepSeek, Devstral) s'hébergent en interne, au prix d'une
  exploitation.

Sur les générations, le guide de coût d'Anthropic rapporte deux mesures
utiles ici. Sur une tâche de code longue, `claude-opus-5` en effort `medium`
coûte moitié moins pour environ 2 points de réussite en moins. Des prompts
écrits pour une génération précédente font travailler davantage la suivante :
leur audit a retiré 14 % du coût lors du passage de Sonnet 4.6 à Sonnet 5.
La skill `consommer-contrat` (23 ko) et les aides relèvent de cet audit.

**Recommandation.** Rester sur `claude-sonnet-5` tant que le harnais n'est pas
allégé, puis mesurer dans cet ordre :

1. `claude-sonnet-5` en effort `medium`, puis `low` ;
2. `claude-haiku-4-5` sur la seule partie du composant qui reste à écrire une
   fois les tables générées (section 2.3), avec relance sur `claude-sonnet-5`
   quand `tsc` ou la parité échouent. Anthropic mesure ce schéma sur du code :
   même taux de réussite pour la moitié du coût. Le contexte de 200 k tokens de
   Haiku exclut la boucle d'agent actuelle, dont le contexte final atteint 191 k
   tokens sur `Button` ;
3. un modèle d'un autre fournisseur, seulement si le pipeline de la section 2.3
   existe : Claude Code ne le pilote pas, et il faudrait un autre exécuteur.

L'affinage d'un petit modèle ne se justifie pas au volume actuel. L'étude
`2609.04184` obtient 98 % de la qualité d'un modèle enseignant avec un modèle
de 4 milliards de paramètres, à plus de dix fois moins cher. Elle s'appuie sur
environ 1 000 exemples et un catalogue de 86 composants. UCM compte trois
composants et un seul consommateur.

### 2.3. Architecture

| Option | Déroulé | Coût pour `Button` | Base du chiffre |
|---|---|---|---|
| A. Agent Claude Code, réglages par défaut | l'agent explore, lit, écrit, vérifie | 1,28 à 1,64 USD | mesuré, L5 |
| B. Même agent, session isolée | option A avec les réglages de la section 2.5 | environ 0,8 USD | estimé : coût fixe divisé par deux ou trois, réflexion réduite de moitié |
| C. Pipeline piloté par un script | un appel avec un paquet d'entrée fermé, contrôles lancés par le script, un appel de réparation sur échec | 0,35 à 0,45 USD | estimé : 30 k tokens d'entrée, 25 k tokens de sortie, réparation de 5 k tokens |
| D. Tables générées, modèle sur le reste | l'adaptateur écrit les tables de variants ; le modèle écrit la structure, les états et les dépendances | 0,10 à 0,15 USD sur Sonnet 5, 0,05 à 0,08 USD sur Haiku 4.5 | estimé : 8 k tokens d'entrée, 2,5 k tokens de code, 8 k tokens de réflexion |
| E. Petit modèle affiné | option D servie par un modèle entraîné sur les composants du dépôt | inférieur à 0,01 USD | hors de portée au volume actuel |

L'option D s'appuie sur deux relevés :

- dans le `Button.tsx` de référence, 111 lignes sur 290, soit 27,7 ko sur 33 ko,
  sont des lignes de données recopiées du contrat ;
- `packages/adapter-typescript/src/generation.mjs` génère déjà, depuis le
  contrat, les unions de props et le type exact des variants.

Générer la table des variants retire les deux postes les plus lourds du run :
la lecture de `variants` (82 % du contrat) et la recopie de 10 à 12 k tokens de
code. Le run `Button-S-3` a d'ailleurs écrit deux scripts Python pour produire
ces chaînes `var(--…)` sans faute de frappe. La recopie par le modèle produit
aussi les défauts de la section 1.6, qui touchent toute une famille de
combinaisons.

L'option C retire la boucle d'exploration. L'agent de L5 consacre 8 à 26 appels
à découvrir le dépôt. Un script sait déjà où sont le contrat, les conventions,
`Icone.tsx` et la configuration, et les place dans un paquet d'entrée unique. La
sortie des contrôles revient au modèle réduite aux lignes en erreur.

Les options C et D s'exécutent aussi en lot. L'API Batches d'Anthropic facture
moitié prix, cache compris, pour un résultat rendu en moins de 24 heures : ce
délai convient à la régénération des composants après un réexport.

### 2.4. Déroulé dans le projet

**Données fournies au modèle.**

| Donnée | Source | Forme |
|---|---|---|
| Table des variants, types des props | `adapter-typescript`, nouvelle génération | fichier TypeScript importé, jamais lu par le modèle |
| Contrat réduit | `ucm guide` sans `variants` | `props`, `structure`, `stateModel`, `intent`, une vue par structure |
| API des dépendances | `ucm guide` | signature et échantillon |
| Conventions | `.ucm/conventions.md` | texte de tête et sections des aides employées |
| Composant de référence ou gabarit | conventions | un fichier, désigné |

Les formats compacts de données tabulaires ne sont pas un levier pour le
contrat. `TOON` économise environ 40 % de tokens sur des tableaux uniformes,
mais deux études ne trouvent pas d'effet significatif sur la justesse, et la
leçon de syntaxe à placer dans le prompt annule le gain sur une entrée courte.
Le contrat est déjà sans espacement : sa version minifiée ne pèse que 1,5 % de
moins.

**Règles données au modèle.**

- Écrire la structure, les états, les dépendances et les échantillons, en
  important la table générée.
- Ne lire aucun autre fichier que le paquet d'entrée.
- Lancer `tsc` sur le projet, et ajouter une prop attendue par un consommateur.
- Rendre un compte rendu de manques en format fixe, champ et combinaison.

**Contrôles hors du contexte.** Le script lance `tsc`, `ucm check` et la
parité de rendu. Il renvoie au modèle les seules erreurs, et c'est le script,
pas le compte rendu du modèle, qui déclare le composant accepté.

**Régénération.** Après un réexport, seul le diff sémantique du contrat
(`PLAN-DIFF-SEMANTIQUE.md`) entre dans le paquet. Le modèle rend une
modification ciblée du fichier existant au lieu de le réécrire.

### 2.5. Réglages d'exécution

Options relevées dans `claude --help` de la version 2.1.272 et dans la
documentation de Claude Code.

| Réglage | Effet sur le coût | Précaution |
|---|---|---|
| `--bare` | retire hooks, mémoire automatique, découverte de `CLAUDE.md`, plugins | exige `ANTHROPIC_API_KEY` ; l'authentification d'abonnement n'est pas lue |
| `--strict-mcp-config` sans `--mcp-config` | retire les connecteurs MCP de l'utilisateur | |
| `--setting-sources project` | ignore les réglages de l'utilisateur | |
| `--disable-slash-commands` | retire la liste des skills et commandes | désactive aussi la skill du relais : passer la consigne par `--append-system-prompt` |
| `--tools Read,Write,Edit,Bash` | retire les définitions des autres outils | |
| `--exclude-dynamic-system-prompt-sections` | déplace dossier de travail et état Git dans le premier message, et rend le prompt système partageable entre runs | sans effet avec `--system-prompt` |
| `--effort medium` | réduit la réflexion, 27 % du coût en L5 | à mesurer sur la fidélité |
| `--max-budget-usd` | arrête un run au-delà d'un montant | |
| `CLAUDE_CODE_PROMPT_CACHE_TTL=5m` | écriture de cache à 1,25 fois l'entrée au lieu de 2 | en L5, trois runs sur douze ont un intervalle de plus de cinq minutes entre deux appels (jusqu'à 507 s sur `Button-G-1`), causé par la génération du composant : ils auraient perdu leur cache |

Sur l'API directe, les mêmes leviers s'écrivent `output_config.effort`,
`cache_control` sur le préfixe stable et `task_budget`, un plafond que le
modèle voit et respecte (bêta, 20 000 tokens au minimum).

### 2.6. Mesure proposée

Le banc L5 sert d'évaluation une fois corrigé (section 1.8). Ordre d'essai, une
variable à la fois, cinq répétitions par cellule, décision sur `coutUsd`, les
défauts distincts et `tsc` :

| Essai | Condition comparée à la précédente | Question |
|---|---|---|
| 1 | session isolée, guide sans extraction | combien retire le harnais ? |
| 2 | effort `medium`, puis `low` | la réflexion porte-t-elle la fidélité ? |
| 3 | table des variants générée | combien retire la recopie, en coût et en défauts ? |
| 4 | pipeline de l'option C | la boucle d'exploration sert-elle ? |
| 5 | `claude-haiku-4-5` avec relance sur Sonnet 5 | le petit modèle suffit-il au reste ? |

Chaque essai coûte de l'ordre de 10 à 25 USD au tarif de L5, et moins à mesure
que les essais précédents réduisent le coût d'un run.

## Sources

| Source | Contenu utilisé | Relevé |
|---|---|---|
| [Tarifs Claude, skill `claude-api`](https://platform.claude.com/docs/en/about-claude/pricing) | tarifs, cache, effort, lots, budgets de tâche, guide de coût | 2026-09-15 |
| [Prompt caching dans Claude Code](https://code.claude.com/docs/en/prompt-caching) | durées de cache, portée par dossier, variables | 2026-09-15 |
| [Tarifs OpenAI](https://developers.openai.com/api/docs/pricing) | modèles `gpt-5.6`, `gpt-5.4` | 2026-09-15 |
| [Tarifs Gemini](https://ai.google.dev/gemini-api/docs/pricing) | modèles Gemini 3.x | 2026-09-15 |
| [Tarifs DeepSeek](https://api-docs.deepseek.com/quick_start/pricing) | V4.1 Flash, V4 Pro | 2026-09-15 |
| [Tarifs Mistral, agrégateur](https://pricepertoken.com/pricing-page/model/mistral-ai-devstral-2512) | Devstral 2 | 2026-09-15 |
| [WebDev Arena, frontière de Pareto](https://arena.ai/leaderboard/code/webdev/pareto) | score et prix | 2026-09-11 |
| [Figma2Code](https://arxiv.org/abs/2604.13648) | les modèles recopient les attributs des métadonnées Figma au lieu de produire un code maintenable | |
| [1D-Bench](https://arxiv.org/abs/2602.18548) | l'itération sur rendu améliore le succès du rendu | |
| [Petit modèle pour l'interface déclarative](https://arxiv.org/abs/2609.04184) | affinage de modèles de 0,8 à 4 milliards de paramètres, coût et qualité | |
| [TOON contre JSON](https://arxiv.org/abs/2603.03306) et [étude sur 11 modèles](https://arxiv.org/pdf/2605.29676) | économie de tokens et effet sur la justesse | |
| [Figma MCP, outils](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) | lecture en deux temps, `get_metadata` puis `get_design_context` | |
