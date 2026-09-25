# Optimisation des tokens : par où entrer

Ce dossier porte une seule question : comment produire le code d'un composant
depuis son contrat sans dépenser ce que la reconstruction par un agent dépense
aujourd'hui.

Huit documents y répondent, et chacun a un sujet et une autorité. Un document
qui contredit celui qui fait autorité sur un sujet a tort.

## L'ordre de lecture

| Rang | Document | Lire pour |
|---|---|---|
| 1 | [Formalisation de la solution/PLAN-IMPLEMENTEUR.md](./Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md) | Ce qui se construit, partie par partie, et les quatorze décisions qui attendent l'architecte |
| 2 | [Formalisation de la solution/BANC-HYPOTHESES.md](./Formalisation%20de%20la%20solution/BANC-HYPOTHESES.md) | Ce qui se mesure avant d'écrire le module, et dans quel ordre |
| 3 | [Recherches/AUDIT-PREMISSES-IMPLEMENTEUR.md](./Recherches/AUDIT-PREMISSES-IMPLEMENTEUR.md) | La preuve, citée par fichier et par ligne, de chaque affirmation du plan sur le code et le corpus |

Les quatre autres se lisent quand une question précise les appelle.

## Qui fait autorité sur quoi

| Sujet | Document | Ce qu'il ne traite pas |
|---|---|---|
| Le module à construire, ses ports, son émission, ses lots | [PLAN-IMPLEMENTEUR.md](./Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md) | Les preuves de ses prémisses, qui sont dans l'audit |
| Les hypothèses, leurs prédicats, leurs seuils et le programme qui les mesure | [BANC-HYPOTHESES.md](./Formalisation%20de%20la%20solution/BANC-HYPOTHESES.md) | Ce qui se construit après la mesure |
| Les prémisses du plan confrontées au schéma, aux lecteurs du kit et aux quatre contrats | [AUDIT-PREMISSES-IMPLEMENTEUR.md](./Recherches/AUDIT-PREMISSES-IMPLEMENTEUR.md) | Toute mesure d'exécution : il ne lit que des fichiers |
| L'état de l'art, le classement des dix architectures de génération, et les mesures d'encodage compact | [ETUDE-GENERATION-A-FROID.md](./Recherches/ETUDE-GENERATION-A-FROID.md) | Les tarifs et les offres, qui sont dans le comparatif |
| Les outils existants pour chacune des seize sous-parties du module, avec le verdict adopter, adopter partiellement ou écrire nous-mêmes | [ETAT-DE-L-ART-OUTILS.md](./Recherches/ETAT-DE-L-ART-OUTILS.md) | Ce qui se construit, que le plan de l'implémenteur porte |
| Les modèles candidats, leurs tarifs, leurs capacités prouvées, les offres et l'auto-hébergement | [COMPARATIF-MODELES-OFFRES.md](./Recherches/COMPARATIF-MODELES-OFFRES.md) | Le travail demandé au modèle, que le plan fixe |
| Ce que coûte la reconstruction par un agent, mesuré sur douze runs | [RAPPORT-COUT-GENERATION.md](./Recherches/RAPPORT-COUT-GENERATION.md) | Les leviers qui réduisent ce coût, qui sont dans le plan de réduction |
| Les leviers du chemin agent, leur pondération et leurs lots | [PLAN-REDUCTION-TOKENS.md](./Recherches/PLAN-REDUCTION-TOKENS.md) | Le chemin compilé, que le plan de l'implémenteur remplace |
| La revue critique du besoin, de la conception et du coût de construction | [review-plan-codex-astra.md](./review/review-plan-codex-astra.md) | Les choix adoptés, qui restent soumis à l’architecte |

Deux fichiers accompagnent l'étude :
[`mesurer-representations.py`](./Recherches/mesurer-representations.py) produit
[`MESURES-REPRESENTATIONS.json`](./Recherches/MESURES-REPRESENTATIONS.json), le
relevé des encodages compacts.

## Les deux chemins, et lequel est retenu

Le dossier décrit deux façons de produire un composant, et il vaut mieux savoir
laquelle un document raconte avant de le lire.

| Chemin | Comment il produit le code | Documents |
|---|---|---|
| Agent | Un agent lit le contrat et écrit le fichier. Mesuré à 1,33 USD pour `Button` | Rapport de coût, plan de réduction |
| Compilé | Un compilateur émet le code ; le modèle ne répond qu'à des questions fermées | Plan de l'implémenteur, banc, audit |

Le chemin compilé est retenu. Le chemin agent reste décrit parce qu'il est ce
qui existe, parce que sa mesure est la seule référence de coût du projet, et
parce que ses réglages de harnais restent valables tant qu'un agent travaille
sur ce repository.

## Ce que la vérification a établi

Le plan de l'implémenteur a été vérifié contre le code et le corpus. Quatre
résultats valent d'être connus avant toute lecture :

- les 29 aides du kit et les 21 caractéristiques de contrat sont déjà la
  spécification d'émission d'un adaptateur ;
- les échantillons des contrats portent une réponse candidate, déjà validée par
  un contrôle bloquant, à chaque question de composition ;
- avec deux conventions, le décompte des questions du corpus tombe de 75 à 20 ;
- `ucm diff` n'existe pas, et le cycle de mise à jour n'en a pas besoin.

Le détail, avec ses preuves, est au §0 du plan et au point 7 de l'audit.
