# Coût d'une génération de composant : analyse de L5 et leviers

Cette note s'adresse au mainteneur. La première partie relit la mesure L5 à
partir des transcripts des douze runs, et corrige ce que
`mesure-l5/RAPPORT-L5.md` en conclut. Ce rapport reste hors du dépôt, à côté
des runs dont il vient. La seconde partie dit où va la suite, et ne la répète
pas.

Sources de la première partie : `mesure-l5/runs/<id>/transcript.jsonl`,
`analyse.json`, `ecarts.json`, `fidelite.json` et les composants reconstruits,
lus en lecture seule. Chaque chiffre de la section 1 en provient.

Ce document est l'autorité du dossier sur ce que coûte la reconstruction d'un
composant par un agent. Il ne porte ni tarifs de fournisseurs, ni leviers, ni
architecture : la section 2 dit qui les porte.

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

### 2.2. Où ce rapport s'arrête, et qui prend la suite

Ce rapport mesure. Ce qu'il faut en faire vit ailleurs, et le répéter ici
ferait deux versions d'une même chose.

| Sujet | Document qui fait autorité |
|---|---|
| Les tarifs par million de tokens, les capacités prouvées de chaque modèle, les offres et l'auto-hébergement | [COMPARATIF-MODELES-OFFRES.md](./COMPARATIF-MODELES-OFFRES.md) |
| Les leviers du chemin agent, leur pondération, leurs lots et les réglages d'exécution d'une session | [PLAN-REDUCTION-TOKENS.md](./PLAN-REDUCTION-TOKENS.md) |
| Le classement des architectures de génération et l'état de l'art | [ETUDE-GENERATION-A-FROID.md](./ETUDE-GENERATION-A-FROID.md) |
| L'architecture retenue, où le modèle n'écrit plus de code | [PLAN-IMPLEMENTEUR.md](../Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md) |

Trois conclusions de la section 1 valent d'être retenues par qui lit ces
documents :

- la recopie de données par le modèle porte à la fois le coût et les défauts.
  Les 111 lignes de données du `Button.tsx` de référence, 27,7 ko sur 33 ko,
  sont la même information que le champ `variants` du contrat, qui pèse 82 % de
  ses octets. Le modèle la lit, puis la réécrit ;
- le résumé d'un agent ne remplace pas le résultat d'un contrôle. Le compte
  rendu de `Button-G-3` écrit que le contrôle de types passe, après avoir lu ses
  quatre erreurs ;
- le vérificateur de cette campagne portait lui-même des défauts, dont une
  capture qui visait une balise invisible. Un taux d'acceptation mesuré par un
  vérificateur non éprouvé ne classe rien.

## Sources

| Source | Contenu utilisé | Relevé |
|---|---|---|
| [Tarifs Claude, skill `claude-api`](https://platform.claude.com/docs/en/about-claude/pricing) | la grille retrouvée par régression sur les douze runs | 2026-09-15 |
| [Prompt caching dans Claude Code](https://code.claude.com/docs/en/prompt-caching) | durées de cache, portée par dossier, variables | 2026-09-15 |

Les autres sources de la campagne, tarifaires et académiques, sont citées par
les documents qui les emploient : le
[comparatif](./COMPARATIF-MODELES-OFFRES.md) pour les grilles des huit
fournisseurs, l'[étude](./ETUDE-GENERATION-A-FROID.md) pour les travaux
publiés, et le [plan de réduction](./PLAN-REDUCTION-TOKENS.md) pour les
mesures d'exploitation.
