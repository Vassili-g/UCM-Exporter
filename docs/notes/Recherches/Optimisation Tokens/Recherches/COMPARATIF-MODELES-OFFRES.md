# Modèles, offres et infrastructure pour générer un composant UCM

> Statut : autorité du dossier sur les tarifs, les capacités publiées, les
> offres et l'infrastructure. Une réserve porte sur son emploi : le
> [plan de l'implémenteur](../Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md)
> réduit le travail du modèle à un choix dans des énumérations, et le corpus
> entier y pose vingt questions. La campagne de la section 4 attend donc un
> corpus plus large, faute de quoi elle classerait huit fournisseurs sur vingt
> réponses.

Ce comparatif complète l'[étude de génération à froid](./ETUDE-GENERATION-A-FROID.md).
Il compare des configurations précises : **modèle, mode de raisonnement,
fournisseur, offre et exécuteur**. Codex et Claude Code sont des exécuteurs
de développement ; leur nom seul ne désigne ni un modèle ni un prix.

**Le premier choix proposé est une API facturée à l'usage, derrière un port
indépendant du fournisseur.** Le noyau compile les données déterminées par
le contrat. Le modèle ne reçoit que les décisions restantes et les éléments
nécessaires à leur intégration. Sonnet 5 sert de témoin pour raccorder les
mesures à la campagne existante. Les candidats économiques doivent être
évalués sur ce même travail avant de désigner un gagnant.

| Portée du relevé | Valeur |
|---|---|
| Consultation des sources | 2026-09-21 |
| Devise | USD, hors taxes ; aucune conversion en euros |
| Tarifs comparés | API directe, traitement standard, petits contextes ; hors gratuité initiale et contrats négociés |
| Générations exécutées pour ce comparatif | Aucune ; les montants par appel sont des calculs, pas des résultats de recette |
| Preuve UCM disponible | [Rapport L5](./RAPPORT-COUT-GENERATION.md), avec Sonnet 5 et les limites de mesure décrites dans l'étude |

## 1. Ce que coûte un appel, puis un composant accepté

Le scénario ci-dessous fixe **10 000 tokens d'entrée et 2 000 tokens de
sortie facturés**, cache froid, un appel. La sortie inclut tout raisonnement
facturé : ce scénario ne suppose pas que chaque modèle produira 2 000
tokens de code avec ce budget. Il sert uniquement à comparer les tarifs.
Il exclut écritures de cache, outils payants, exécution des tests et reprises.

Les colonnes entrée, cache et sortie donnent le prix d'un million de
tokens. La colonne appel donne `0,010 × entrée + 0,002 × sortie`.
Le classement est arithmétique. Il ne classe pas les capacités.

| Modèle et identifiant | Offre tarifaire | Entrée | Lecture du cache | Sortie | Appel calculé |
|---|---|---:|---:|---:|---:|
| Mistral Small 4, `mistral-small-2603` | Mistral, standard [M] | 0,15 | 0,015 | 0,60 | **0,0027** |
| DeepSeek V4.1 Flash, `deepseek-flash` | Direct, heures creuses [D] | 0,15 | 0,003 | 0,60 | **0,0027** |
| GPT-5.6 Luna, `gpt-5.6-luna` | OpenAI, standard [O] | 0,20 | 0,02 | 1,20 | **0,0044** |
| MiniMax M3, `MiniMax-M3` | Open Platform, Pay-as-you-go standard [N] | 0,30 | 0,06 | 1,20 | **0,0054** |
| DeepSeek V4.1 Flash, `deepseek-flash` | Direct, heures pleines [D] | 0,30 | 0,006 | 1,20 | **0,0054** |
| Qwen3-Coder-Next, `qwen3-coder-next` | Model Studio, Singapour, International [Q] | 0,30 | Non retenu | 1,50 | **0,0060** |
| Mistral Large 3, `mistral-large-2512` | Mistral, standard [M] | 0,50 | 0,05 | 1,50 | **0,0080** |
| Gemini 3.8 Flash, `gemini-3.8-flash` | Gemini Developer API, Paid Standard [G] | 0,75 | 0,075 | 3,75 | **0,0150** |
| Kimi K2.6, `kimi-k2.6` | Kimi API internationale, à l'usage [K] | 0,95 | 0,16 | 4,00 | **0,0175** |
| Kimi K2.7 Code, `kimi-k2.7-code` | Même offre [K] | 0,95 | 0,19 | 4,00 | **0,0175** |
| Claude Haiku 4.5, `claude-haiku-4-5-20251001` | Claude API, standard [A] | 1,00 | 0,10 | 5,00 | **0,0200** |
| Mistral Medium 3.5, `mistral-medium-3-5` | Mistral, standard [M] | 1,50 | 0,15 | 7,50 | **0,0300** |
| Claude Sonnet 5, `claude-sonnet-5` | Claude API, standard [A] | 2,00 | 0,20 | 10,00 | **0,0400** |
| GPT-5.6 Terra, `gpt-5.6-terra` | OpenAI, standard [O] | 2,00 | 0,20 | 12,00 | **0,0440** |
| Kimi K3, `kimi-k3` | Kimi API internationale, à l'usage [K] | 3,00 | 0,30 | 15,00 | **0,0600** |
| GPT-5.6 Sol, `gpt-5.6-sol` | OpenAI, standard [O] | 4,00 | 0,40 | 20,00 | **0,0800** |
| Claude Opus 5, `claude-opus-5` | Claude API, standard [A] | 5,00 | 0,50 | 25,00 | **0,1000** |
| GPT-6 Astra, `gpt-6-astra` | OpenAI, standard [O] | 10,00 | 1,00 | 50,00 | **0,2000** |
| Claude Fable 5.1, `claude-fable-5-1` | Claude API, standard [A] | 10,00 | 0,25 | 50,00 | **0,2000** |

Sources tarifaires officielles :

- [O : OpenAI API](https://developers.openai.com/api/docs/pricing).
- [A : Claude API](https://platform.claude.com/docs/en/about-claude/pricing).
- [M : Mistral](https://docs.mistral.ai/inference/pricing).
- [G : Gemini Developer API](https://ai.google.dev/gemini-api/docs/pricing).
- [N : MiniMax Pay-as-you-go](https://platform.minimax.io/docs/guides/pricing-paygo).
- [Q : Alibaba Cloud Model Studio](https://www.alibabacloud.com/help/en/model-studio/model-pricing).
- [K : plateforme internationale Kimi](https://platform.kimi.ai/).
- [D : DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/).
  Pour DeepSeek, les valeurs viennent de l'extrait indexé de cette page
  officielle ; son ouverture directe a échoué pendant la recherche.
  Revalider cette ligne dans la console avant une campagne payante.

| Condition tarifaire | Conséquence pour ce tableau |
|---|---|
| Gemini Flash : prix indiqué jusqu'au 2026-12-31 ; entrée 1,50 et sortie 7,50 à partir du 2027-01-01 | L'appel calculé passe à 0,0300 ; stockage de cache facturé séparément |
| OpenAI Sol : tarif promotionnel maintenu au moins jusqu'au 2026-11-21 | Enregistrer la grille effectivement appliquée ; ne pas projeter ce tarif sans borne |
| OpenAI : contexte long au-delà de 272 000 tokens d'entrée ; Qwen : première tranche jusqu'à 32 000 ; MiniMax : première tranche jusqu'à 512 000 | Recalculer le prix si le dossier dépasse la tranche |
| DeepSeek : heures pleines de 01 h à 04 h et de 06 h à 10 h UTC, du lundi au vendredi | Les autres créneaux utilisent les heures creuses ; conserver l'heure de facturation |
| Cache : écritures, durée, minimum admissible et stockage propres au fournisseur | Le prix d'une lecture ne donne pas le coût du premier appel ni celui du cache complet |

La minification mesurée avec `o200k_base` ne prédit pas les tokens facturés
par tous ces fournisseurs. Chaque modèle utilise son tokenizer et son
enveloppe de messages. Relever les compteurs d'usage renvoyés par le service.
Conserver aussi le texte transmis pour comparer le volume à représentation
constante.

Avec le scénario du tableau, Small 4 coûte environ 14,8 fois moins que
Sonnet 5. Ce rapport ne vaut plus si le petit modèle produit davantage de
raisonnement, relit le dossier ou échoue. Un supplément de 10 000 tokens de
sortie coûte 0,006 USD avec Small 4 et 0,10 USD avec Sonnet 5.

```text
cout_par_composant_accepte = depense_totale_de_la_campagne / nombre_acceptes

depense_totale = appels_initiaux + reparations + appels_des_cas_abandonnes
                + cache + outils + execution + part_des_couts_fixes
```

Une cascade doit aussi battre l'appel direct au modèle de recours.
Exemple illustratif : un premier appel à 0,0044 USD, puis un recours à
0,0400 USD dans 20 % des cas, coûtent en moyenne 0,0124 USD par demande.
Ce calcul suppose un recours de même taille et une acceptation finale
identique. Les diagnostics ajoutés et les échecs du recours doivent entrer
dans la mesure réelle. Le seuil théorique de rentabilité de cet exemple
est un taux de recours inférieur à 89 %, sous ces seules hypothèses.

## 2. Ce que les preuves permettent de dire des capacités

Un score de réparation de repository ne mesure pas la reconstruction d'un
composant depuis une spécification visuelle structurée. Les comparaisons
publiques portent aussi sur des exécuteurs, des budgets et des outils
différents. Elles servent à sélectionner les candidats ; la recette UCM
doit vérifier les variants, les tokens, les icônes et les interactions.

| Famille | Preuve disponible et limite | Usage à éprouver dans le module |
|---|---|---|
| Claude Sonnet 5 | Le rapport local L5 fournit des générations UCM, mais ses contrôles de rendu présentent des défauts. Il ne prouve pas un taux de conformité complet. | Témoin local, intégration et réparation ; refaire les mesures avec le vérificateur corrigé |
| GPT-5.6 Terra et Sol | La [documentation Codex](https://learn.chatgpt.com/docs/models) les propose pour le développement. Ce catalogue ne fournit pas un score UCM. | Terra comme candidat de génération complète ; Sol comme recours, avec même dossier et mêmes contrôles |
| GPT-5.6 Luna | La [fiche officielle](https://developers.openai.com/api/docs/models/gpt-5.6-luna) annonce outils, sorties structurées et effort réglable, dont `none`. | Petits fragments d'intégration ; comparer `none` et `low` avant de retenir le mode le moins coûteux |
| Mistral Medium 3.5 | Mistral rapporte **77,6 % sur SWE-bench Verified** dans son [annonce](https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/). Ce résultat fournisseur porte sur des corrections de code. | Candidat au rôle de Sonnet ou Terra ; capacité à générer le rendu exact encore à mesurer |
| Mistral Small 4 et Large 3 | Le [catalogue](https://docs.mistral.ai/models) permet de les servir et documente leurs capacités. Aucun résultat UCM trouvé. | Small pour les décisions résiduelles ; Large comme comparaison intermédiaire au sein du même fournisseur |
| Qwen3-Coder-Next | [Modèle spécialisé code](https://huggingface.co/Qwen/Qwen3-Coder-Next), sans mode de réflexion ; poids ouverts et outils de service documentés. | Candidat pour une sortie courte et exacte, puis pour l'hébergement local si les résultats le justifient |
| Kimi K2.6 et K2.7 Code | [K2.6](https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart) permet de désactiver la réflexion. [K2.7 Code](https://platform.kimi.com/docs/guide/kimi-k2-7-code-quickstart) refuse cette désactivation. | Tester K2.6 sans réflexion ; retenir K2.7 seulement si ses réussites compensent le raisonnement supplémentaire |
| Kimi K3 | Le [rapport technique](https://arxiv.org/abs/2607.24653) décrit un modèle de code et de vision de grande taille. Aucun essai UCM local. | Recours possible sur les cas complexes ; sa fenêtre de contexte ne justifie pas de lui transmettre tout le repository |
| Gemini 3.8 Flash | Google documente des usages de génie logiciel dans la [fiche tarifaire du modèle](https://ai.google.dev/gemini-api/docs/pricing). Aucune preuve locale de conformité. | Comparaison économique avec vision si les contrôles ont besoin de captures |
| MiniMax M3 | Le [rapport de lancement](https://www.minimax.io/blog/minimax-m3) expose des tâches longues de code et un banc interne de génération SVG. Ce dernier ne couvre pas les obligations UCM. | Candidat économique supplémentaire ; compter les tokens de raisonnement et les appels d'outils |
| DeepSeek V4.1 Flash | L'[annonce officielle](https://api-docs.deepseek.com/news/news260910/) décrit des améliorations de code et d'agents. Les allégations générales ne remplacent pas un test de composant. | Candidat économique, particulièrement pour des campagnes planifiables |
| Haiku 4.5, Opus 5, Fable 5.1 et Astra | Les catalogues [Claude](https://platform.claude.com/docs/en/models/overview) et [OpenAI](https://developers.openai.com/api/docs/models) décrivent des niveaux de capacité et leurs interfaces. Aucun classement UCM disponible. | Haiku comme petit modèle témoin ; Opus, Fable ou Astra comme recours dont le gain doit justifier la dépense |

Les modèles spécialisés de complétion ne couvrent pas nécessairement une
demande entière. [Codestral](https://docs.mistral.ai/models) mérite un essai
si le compilateur produit des trous de code précisément délimités. Un modèle
Ministral de 3 ou 8 milliards de paramètres pourrait servir un petit travail
de ce type sur site. Leur prix bas ne suffit pas à les retenir pour générer
un composant complet. Le catalogue Mistral classe Devstral 2 et Devstral
Small 2 parmi les modèles dépréciés ; une expérimentation avec leurs poids
doit préciser qu'elle n'utilise pas l'offre hébergée courante.

## 3. Quelle offre et quelle intégration choisir

### Module autonome : API directe et exécution locale des contrôles

Le serveur de génération peut fonctionner sur une machine ordinaire avec
le runtime de la stack et son navigateur de test. Le fournisseur héberge
le modèle. Aucun accélérateur local n'est nécessaire pour ces appels.
Le compilateur, l'assemblage et les contrôles restent dans le module.

| Fournisseur | Offre proposée | Interface du port fournisseur et source |
|---|---|---|
| OpenAI | Projet API facturé à l'usage, service standard ; modèle explicite | [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) ; `POST https://api.openai.com/v1/responses` ; clé de projet, effort de raisonnement et budget de sortie |
| Anthropic | Claude API, facturation à l'usage, standard | [Client SDK et API directe](https://code.claude.com/docs/en/agent-sdk/overview) ; Messages API ; clé API, modèle explicite, gestion des blocs de contenu et d'usage |
| Mistral | Studio, API payante à l'usage, standard | [Référence de l'API](https://docs.mistral.ai/api) ; Chat Completions ; clé API et identifiant exact, sans dépendre de Vibe |
| Google | Gemini Developer API, niveau Paid | [API Gemini](https://ai.google.dev/api/generate-content) ; `generateContent` ; projet avec facturation et clé ; conserver séparément les tokens de réflexion |
| Alibaba / Qwen | Model Studio à l'usage, région Singapour, périmètre International | [Interface compatible](https://www.alibabacloud.com/help/en/model-studio/base-url) ; base `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` ; clé de la même région |
| Moonshot / Kimi | Plateforme internationale Kimi, solde à l'usage | [Guide d'intégration](https://platform.kimi.ai/docs/overview) ; base `https://api.moonshot.ai/v1` et Chat Completions ; clé de cette plateforme |
| MiniMax | Open Platform, Pay-as-you-go standard | [Interface compatible OpenAI](https://platform.minimax.io/docs/api-reference/text-openai-api) ; base `https://api.minimax.io/v1` et Chat Completions ; clé API de l'offre à l'usage |
| DeepSeek | API directe, compte prépayé, tarification selon l'heure | [Documentation API](https://api-docs.deepseek.com/) ; base `https://api.deepseek.com` ; vérifier le modèle effectivement servi quand un alias est utilisé |

Un protocole compatible ne garantit pas les mêmes paramètres. Chaque
adaptateur traduit les outils, les sorties structurées, les limites et les
compteurs de son fournisseur. Il refuse un mode non pris en charge. Le
compilateur ne contient aucun nom de modèle.

Une offre de cloud d'entreprise ou un intermédiaire constitue une autre
configuration : identifiant, région, prix, débit et accès au modèle peuvent
changer. La table chiffre les offres directes nommées ci-dessus. Elle ne
transfère pas leurs prix à Bedrock, à une offre Google d'entreprise ou à un
routeur tiers. Le besoin éventuel de résidence des données devra être
attaché au fournisseur et à la région retenus.

### Codex et Claude Code : acheter aussi l'exécuteur

| Voie | Offre et coût d'accès | Intégration exacte | Place dans le projet |
|---|---|---|---|
| Codex avec abonnement | Plus : 20 USD/mois ; Pro à partir de 100 USD/mois ; quotas selon modèle et tâche, selon la [grille Codex](https://learn.chatgpt.com/docs/pricing) | Application, extension ou CLI avec authentification du compte ; l'accès effectif aux modèles dépend du compte | Usage accompagné et essai du harnais ; mesurer le coût amorti et les limites réelles |
| Codex avec clé API | Tokens aux prix OpenAI du modèle choisi ; coût du runner ajouté | [`codex exec --json`](https://learn.chatgpt.com/docs/non-interactive-mode), ou [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) ; dossier isolé, modèle et permissions explicites | Adaptateur d'exécuteur facultatif, utile lorsque le modèle doit explorer et modifier plusieurs fichiers |
| Claude Code avec abonnement | Pro : 20 USD/mois en facturation mensuelle, accès sous limites ; [tarifs Claude](https://claude.com/pricing) | CLI avec compte utilisateur | Usage accompagné et témoin de coût amorti ; l'abonnement n'est pas un budget de tokens API |
| Claude Agent SDK avec clé API | Tokens Claude facturés à l'usage ; runner fourni par le projet | [Bibliothèque Python ou TypeScript](https://code.claude.com/docs/en/agent-sdk/overview), avec outils et boucle d'agent | Autre adaptateur d'exécuteur ; mesurer son contexte et les appels supplémentaires |

Codex documente la réutilisation de l'authentification enregistrée en mode
non interactif. Un abonnement n'est donc pas exclu de toute automatisation
locale. Pour un service distribué, l'authentification, les quotas et le coût
doivent être conçus pour cet usage. Anthropic précise que les développeurs
tiers ne peuvent pas proposer la connexion `claude.ai` ou ses limites à
leurs utilisateurs sans accord préalable ; son `Agent SDK` recommande la clé
API pour cette intégration. Ces deux voies ne sont pas interchangeables.

Avec un abonnement de 20 USD et 100 composants acceptés dans le mois,
l'amortissement vaut 0,20 USD par composant ; à 1 000, il vaut 0,02 USD.
Ce sont des divisions illustratives, sans garantie que le quota permette
ces volumes. Un abonnement déjà payé peut avoir un coût monétaire marginal
nul jusqu'au quota. Il consomme néanmoins de la capacité et des tokens.
Rapporter le coût marginal et le coût amorti séparément.

Pour un dossier fermé, commencer par l'appel direct. Pour une génération
complète avec exploration, comparer aussi un exécuteur existant : ses outils
peuvent éviter des réparations. Un exécuteur complet et un appel direct au
même modèle forment deux conditions expérimentales distinctes.

### Poids ouverts : quand l'infrastructure change la décision

L'auto-hébergement exige un service d'inférence, des poids versionnés, un
tokenizer, un moteur compatible et une exploitation suivie. Qwen documente
`vLLM` et `SGLang` dans sa fiche. Un point d'accès compatible permet de
réutiliser le port fournisseur, après contrôle du format des outils et des
sorties. La quantification constitue une nouvelle condition de qualité.

| Modèle | Information matérielle utile | Décision proposée |
|---|---|---|
| Qwen3-Coder-Next | 80 milliards de paramètres au total, 3 actifs ; au moins 40 Go pour les seuls poids à 4 bits, par calcul | Essai sur matériel adapté déjà disponible, après validation via API ; prévoir mémoire de travail et cache en plus |
| Mistral Small 4 | [119 milliards au total, 6,5 actifs](https://docs.mistral.ai/models/mistral-small-4-0-26-03) ; environ 59,5 Go de poids à 4 bits, avant surcoûts | « Small » ne désigne pas une configuration de portable ; pas d'achat de machine sur la seule taille active |
| Kimi K3 | Le rapport technique indique 2 800 milliards de paramètres au total | Hors du premier prototype local ; comparer une offre hébergée avant tout projet de déploiement dédié |
| Petit modèle spécialisé | Le modèle et sa quantification restent à sélectionner après constitution d'un corpus résiduel | Piste ultérieure si les décisions restantes sont assez simples et répétitives |

Ces tailles sont des bornes arithmétiques, pas des configurations validées.
Le débit, le contexte, le nombre de requêtes simultanées et la qualité après
quantification doivent être mesurés. Le calcul de seuil d'amortissement est
donné dans l'étude principale. Une API à quelques millièmes de dollar par
appel peut rendre un serveur dédié difficile à amortir à faible volume.

## 4. Sélection des candidats et ordre des essais

Le rang ci-dessous classe **l'ordre d'investissement**, pas une qualité UCM
déjà mesurée. Il évite d'évaluer tous les modèles sur toutes les combinaisons
avant d'avoir vérifié que le banc détecte les défauts du rendu.

| Priorité | Configuration candidate | Pourquoi la retenir | Condition pour la garder |
|---|---|---|---|
| 1 | Compilation partielle + API directe ; Sonnet 5 témoin, Small 4, Luna et Qwen3-Coder-Next concurrents | Trois candidats peu coûteux avec profils différents ; témoin relié au rapport local | Même porte de conformité et coût complet inférieur ; aucune préférence de marque |
| 2 | Même architecture avec DeepSeek Flash, MiniMax M3 et Gemini Flash | Élargit le choix économique ; horaires pour DeepSeek, multimodalité pour les cas utiles | Tarifs et quotas accessibles confirmés, sorties et compteurs correctement pris en charge |
| 3 | Terra et Medium 3.5, puis Kimi K2.6/K2.7 et Large 3 | Alternatives pour les décisions plus difficiles et comparaison entre familles de modèles | Leur taux d'acceptation ou leur nombre de reprises doit compenser le prix |
| 4 | Sol ou Opus 5 en recours, puis K3, Astra ou Fable si besoin | Coût supérieur admissible sur les cas où il évite un échec ou une réparation humaine | Mesurer les échecs restants ; fixer une borne de dépense par demande |
| 5 | Codex ou Claude Agent SDK à modèle identique | Vérifie si un exécuteur plus autonome améliore le résultat | Compter tout son contexte et tous ses outils ; ne pas attribuer au modèle le gain du harnais |
| 6 | Service local, puis petit modèle spécialisé | Répond à un besoin d'exploitation établi ou à une charge amortissable | Conformité, débit et coût d'exploitation mesurés sur le matériel retenu |

Pour la première comparaison de modèles : quatre composants, quatre
configurations de priorité 1, cinq répétitions donnent **80 générations**.
Cette campagne isole le choix du modèle sur une architecture fixe. Elle
s'ajoute à la comparaison d'architectures de l'étude ; elle ne la remplace
pas. Les défauts du vérificateur doivent être corrigés avant ces essais.

Retenir les candidats non dominés sur trois axes : tokens par composant
accepté, dollars par composant accepté et temps jusqu'à acceptation. Fixer
d'abord le niveau de qualité requis. Le modèle qui minimise les dollars
peut consommer davantage de tokens. Publier les deux classements séparément.

## 5. Changements à prévoir dans le module autonome

| Élément | Changement nécessaire | Ce qui permet de vérifier l'intégration |
|---|---|---|
| Configuration d'une génération | Fournisseur, modèle exact, offre, région, mode de raisonnement, budgets et politique de recours | Configuration jointe à chaque résultat ; alias résolu consigné si le service le fournit |
| Port fournisseur | Requête indépendante de la stack ; adaptateurs Responses, Messages, Gemini et Chat Completions | Capacités déclarées ; paramètres non pris en charge refusés avant l'appel |
| Comptabilité | Usage brut, entrées non cachées, lectures et écritures du cache, sorties et raisonnement | Éviter de recompter un raisonnement déjà inclus dans le total de sortie ; rapprocher des factures |
| Exécuteur | Appel direct par défaut ; Codex et Claude Agent SDK facultatifs | Dossier et outils autorisés identiques à la condition annoncée ; isolation du code antérieur de la cible |
| Vérificateur | Compilation, API publique, données, rendu et interactions indépendants du modèle | Toute réparation repasse les contrôles ; aucun modèle ne prononce seul l'acceptation |
| Relevé économique | Tarifs versionnés, durée, reprises, échecs et temps humain | Coût de campagne rapporté aux seuls composants acceptés ; échecs conservés au numérateur |

Ces ajouts concernent le module de génération et le repository de recette.
Ils ne nécessitent aucun changement du contrat exporté ni de l'interface
Figma. L'adaptateur de stack continue de produire et de vérifier le code
propre à son environnement. Le fournisseur ne reçoit aucune responsabilité
sur la définition du format UCM.

Le choix final reste expérimental : **aucune source consultée ne démontre
aujourd'hui qu'un des modèles du tableau minimise le coût d'un composant
UCM conforme**. Les tarifs vérifiés permettent de réduire le nombre de
candidats. La compilation partielle réduit le travail demandé à chacun.
Le banc à froid doit ensuite départager leurs capacités réelles.
