# Recherche sur les réglages du plugin

> Statut : sujets à instruire. Ce document liste ce qu'il faut étudier avant de
> concevoir une page de configuration en deux onglets, « Général » et « Repos ».
> Il ne retient aucune solution. Les faits cités renvoient au code, qui fait
> autorité sur l'état actuel.

## Demande et utilisateurs

La demande porte sur trois changements de la page de configuration :

- un onglet « Général » pour les options du plugin, dont une option qui
  désactive la gestion des tokens : elle masque la commande d'export des tokens
  et neutralise les contrôles qui s'y rapportent ;
- un onglet « Repos » qui enregistre plusieurs configurations de dépôt. Une
  seule, le dépôt actif, reçoit les exports ;
- dans ce même onglet, un interrupteur qui débranche temporairement tous les
  dépôts pour exporter en local.

Deux équipes utilisent le plugin, avec des besoins opposés :

| Équipe | Besoin |
|---|---|
| Équipe du design system UCM | Toutes les commandes : contrats, tokens, contrôle de CI sur chaque demande de fusion |
| Équipe consommatrice | La publication des contrats seule. Ses tokens viennent d'une autre chaîne d'outils. Elle écrit ses propres contrôles |

Le mainteneur publie en plus vers trois dépôts : deux sur GitHub, un sur GitLab.
Chaque changement de dépôt lui demande aujourd'hui de ressaisir l'adresse et la
branche. Passer d'une forge à l'autre demande aussi de recoller le jeton.

## 1. État de départ

Ces faits servent à chaque sujet ci-dessous. La règle complète est dans la
[partie 3 de SPEC.md](../../../../packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge).

- **Un seul dépôt.** `figma.clientStorage` garde quatre clés : `repoUrl`,
  `baseBranch`, `github_pat` et `forge_du_jeton`
  ([config.ts](../../../../packages/plugin/src/config.ts)).
- **Un seul jeton pour les deux forges.** Enregistrer un jeton GitLab retire le
  jeton GitHub enregistré. Revenir à un dépôt GitHub demande de recoller un
  jeton GitHub.
- **Deux hôtes.** `lireAdresseDuDepot` n'accepte que `github.com` et
  `gitlab.com`. Le [manifeste](../../../../packages/plugin/manifest.json)
  n'autorise que `https://api.github.com` et `https://gitlab.com`.
- **Le jeton ne passe jamais à l'interface.** L'UI reçoit seulement
  `forgeDuJeton` ([messages.ts](../../../../packages/plugin/src/messages.ts)).
- **Le test de connexion part à l'ouverture et après chaque enregistrement.** Il
  lit aussi le `ucm.config.json` du dépôt.
- **Enregistrer vide les analyses gardées** (`analysesGardees.clear()` dans
  [code.ts](../../../../packages/plugin/src/code.ts)). Une analyse faite contre
  l'ancien dépôt ne se publie donc pas sur le nouveau.
- **Sans configuration valide, l'export se télécharge.** Le pré-vol rend le
  verdict `sans-depot`. L'écran de travail affiche alors la ligne « Aucun
  repository connecté » entre les deux cartes (`etatDuDepot`,
  [connexion.ts](../../../../packages/plugin/src/connexion.ts)). Un échec de la
  forge pendant la publication retombe aussi sur le téléchargement.
- **L'écran de travail ne montre pas le dépôt visé** quand un dépôt est
  connecté. Le compte des objets du protocole de relecture exclut cette ligne.

## 2. Contraintes à respecter

- La hiérarchie de l'information en trois rangs, et la règle des deux cartes
  ([CONTRIBUTING.md](../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation)).
- Le [protocole de relecture](../../../../CONTRIBUTING.md#le-protocole-de-relecture) :
  comparaison avec un panneau natif de Figma, deux thèmes, fenêtre minimale de
  320 × 320 px ([fenetre.ts](../../../../packages/plugin/src/fenetre.ts)), pire
  contenu réel, compte des objets.
- La galerie : chaque message de `messages.ts` a un état dans
  [etats.cjs](../../../../packages/plugin/galerie/etats.cjs), sans quoi
  `tests/galerie.test.ts` échoue.
- Le plugin n'écrit rien dans le document Figma
  ([AGENTS.md](../../../../AGENTS.md)).
- Un jeton ne part que vers la forge qui l'a reçu. L'ordre d'écriture de
  l'enregistrement protège cette règle contre une sauvegarde interrompue.
- Les textes nomment la forge par
  [termes.ts](../../../../packages/plugin/src/forges/termes.ts) et suivent les
  règles des [messages destinés au designer](../../../../CONTRIBUTING.md#messages-destinés-au-designer).
- La sandbox n'offre aucune boîte de dialogue. Une confirmation passe par un
  second clic sur le même bouton, comme la suppression du jeton
  ([ConfigurationPage.ts](../../../../packages/plugin/src/ui/components/ConfigurationPage.ts)).

## 3. Les onglets

### 3.1. Mesurer le contenu avant de choisir la structure

Instruire le nombre d'objets de chaque onglet une fois les sections 4 à 7
tranchées. Un onglet « Général » limité à une option ajoute une barre d'onglets
pour un seul interrupteur.

Comparer sur le contenu réel des onglets, des sections empilées sur une seule
page, et une liste de dépôts qui ouvre un détail. Critères : nombre de gestes
vers l'action la plus fréquente, compte des objets, lecture à 320 px.

### 3.2. Suivre les onglets natifs de Figma

Le panneau de droite de Figma porte des onglets. Relever leur hauteur, leur
typographie, la marque de l'onglet actif et leur comportement au clavier. Les
comparer ensuite au décalque des variables `--figma-color-*` de la galerie.

Relever aussi le motif d'onglets du guide des pratiques d'accessibilité : rôles
`tablist`, `tab` et `tabpanel`, flèches pour changer d'onglet.

### 3.3. L'onglet ouvert à l'arrivée

Deux gestes mènent aujourd'hui à la configuration : l'icône d'engrenage et la
pastille de connexion. La pastille mène à l'endroit où se fait le geste qu'elle
annonce ([Header.ts](../../../../packages/plugin/src/ui/components/Header.ts)).

À instruire :

- l'onglet que chaque geste ouvre ;
- la mémoire du dernier onglet consulté ;
- la cible de la pastille quand la panne concerne une entrée précise de la
  liste des dépôts.

### 3.4. Enregistrer

Le formulaire actuel a un bouton « Enregistrer ». Le drapeau `settingsDirty`
empêche un rechargement d'écraser une saisie en cours.

À instruire :

- un interrupteur prend-il effet au clic ou à l'enregistrement ;
- le sort d'une saisie non enregistrée quand le designer change d'onglet ;
- un bouton d'enregistrement par onglet, ou un seul pour la page.

### 3.5. Nommer les onglets et la page

« Repos » est une abréviation anglaise. GitHub parle de « repository », GitLab
de « projet », et `termes.ts` porte ces deux mots. Les documents du dépôt
écrivent « dépôt ».

Instruire le libellé des onglets avec la skill
[`rediger-diagnostics-ucm`](../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md).
Le sous-titre de la page décrit aujourd'hui un seul dépôt : « Le dépôt où les
exports sont déposés, et le jeton qui les y autorise. »

## 4. L'onglet Général

### 4.1. Trouver les options candidates

**Les comportements fixés dans le code.** Chacun est candidat tant qu'aucune
raison écrite ne le fixe.

| Comportement | Où | Question |
|---|---|---|
| La demande de fusion s'ouvre dans le navigateur après la publication | `figma.openExternal`, partie 3 de SPEC.md | Un designer qui publie plusieurs composants d'affilée veut-il un onglet de navigateur par demande ? |
| L'avertissement « Aucune règle d'usage exploitable » s'affiche à chaque sélection d'un composant sans `.componentRules` | `reportSelectionState`, `code.ts` | Une équipe sans composant de règles le lit à chaque sélection. Le veut-elle ? |
| Les variables locales sont lues à l'ouverture | `etatDesTokensDuFichier`, `code.ts` | Quel est son coût sur un gros fichier, et sert-elle quand les tokens sont désactivés ? |
| La demande de fusion s'ouvre hors brouillon | `src/forges/` | Les deux forges acceptent-elles un brouillon par leur API, et une équipe le demande-t-elle ? |
| Les branches portent le préfixe `ucm-exporter/export-` | `prefixeDeBranche`, `depot.ts` | La détection des exports en vol lit ce préfixe. Une règle de nom de branche imposée par une forge peut-elle exiger de le changer ? |
| L'interface est en français | commentaire des libellés, `ConfigurationPage.ts` | La langue est tranchée. Hors périmètre sans nouvelle demande |
| La taille de la fenêtre est rangée automatiquement | `fenetre.ts` | Un geste de remise à la taille par défaut manque-t-il ? |
| Seul le jeton s'efface du poste | `supprimerPat`, `config.ts` | Avec plusieurs jetons, faut-il un geste qui efface toutes les données du plugin sur le poste ? |

**Les plugins Figma comparables.** Relever les réglages des plugins qui publient
vers une forge ou vers une plateforme de tokens. Noter pour chaque réglage sa
portée : poste, fichier ou compte.

**Les deux équipes.** Les questions sont rassemblées en
[section 8](#8-questions-aux-équipes).

### 4.2. Décider de la portée de chaque option

| Portée | Stockage | Lecteurs |
|---|---|---|
| Le poste du designer | `figma.clientStorage` | Ce plugin, sur cette machine |
| Une entrée de la liste des dépôts, si l'onglet Repos en crée | `figma.clientStorage`, par entrée | Ce plugin, quand l'entrée est active |
| Le repository | `ucm.config.json` | Le plugin de chaque designer, et `ucm check` en CI |

Instruire la portée de chaque option retenue. Un réglage de poste reste le même
quand le designer change de dépôt actif. Un réglage de repository s'applique à
tous les designers qui publient dans ce dépôt.

La documentation de `figma.clientStorage` ne dit pas si l'application de bureau
et le navigateur partagent ce stockage. Le mesurer.

### 4.3. Compter le coût d'une option

Chaque interrupteur double les états à couvrir pour les écrans qu'il touche,
dans la galerie comme dans le protocole de relecture. Recenser, pour chaque
option candidate, les états qu'elle ajoute à `etats.cjs` et les tests qu'elle
demande.

## 5. Désactiver la gestion des tokens

### 5.1. Où ce réglage vit

La demande le place dans l'onglet Général, donc sur le poste. Quatre faits sont
à peser :

- les deux équipes publient dans des dépôts différents. Un designer qui publie
  dans les deux changerait ce réglage à chaque changement de dépôt actif ;
- chaque designer de l'équipe consommatrice poserait le réglage sur son propre
  poste ;
- `ucm check` refuse tout contrat quand le fichier de tokens manque
  ([controle-repository.mjs](../../../../packages/kit/src/lecteurs/controle-repository.mjs)).
  Un réglage du plugin ne modifie pas ce verdict ;
- une clé ajoutée à `ucm.config.json` modifie la grammaire publiée par
  `@ucm-kit/core` ([configuration.ts](../../../../packages/kit/src/format/configuration.ts))
  et relève de la [politique de compatibilité](../../../format/COMPATIBILITE.md).

Comparer les trois portées de la section 4.2 sur les cas réels des deux équipes.

### 5.2. Inventorier ce qui relève des tokens

| Élément | Où | Question |
|---|---|---|
| La carte « Tokens », son analyse et sa publication | `CarteTokens.ts`, `code.ts` | Masquée, ou absente du DOM ? |
| Le message `tokens` de l'ouverture, qui lit toutes les variables locales | `etatDesTokensDuFichier` | Faut-il encore le lire ? |
| L'état des tokens dans le dépôt, lu au pré-vol d'un composant : fichier présent, export en vol | `etatDesTokens`, `depot.ts` | Ces appels réseau restent-ils utiles ? |
| La consigne « publiez les tokens et faites fusionner leur demande », et l'état `warning` qui l'accompagne | `ordreDesTokens` dans `prevol.ts`, `postVerdict` dans `code.ts`, `verdict` dans `etats.cjs` | Trois endroits recopient la même condition : lequel fait autorité ? |
| Le résumé « Contrats dans …, tokens dans … » et l'avertissement sur `ucm.config.json` | `etatDuDepot`, `connexion.ts` | Quel texte sans tokens ? |
| Les diagnostics qui demandent de relier une couleur, un stroke ou une propriété typographique à une variable | `extractVariantTokens.ts`, `extractSlotTokens.ts`, `extractVariantTypography.ts` | Le contrat ne publie que les valeurs liées. Ces diagnostics relèvent-ils des tokens ou du contrat ? |
| L'index des variables et ses collisions de noms | `variables.ts`, commun aux deux commandes | Même question |

Les deux dernières lignes fixent le sens de « neutraliser les contrôles ». Un
contrat cite ses tokens par le chemin de la variable Figma, que UCM exporte les
tokens ou non ([FORMAT.md](../../../format/FORMAT.md#nommer-et-citer-un-token)).

### 5.3. Ce que le contrat promet sans `tokens.json`

[references.ts](../../../../packages/kit/src/format/references.ts) décrit un
token cité dans un contrat comme un lien vers `tokens.json`. La skill
`consommer-contrat` et `ucm guide` supposent ce fichier.

À instruire :

- ce que `FORMAT.md` doit dire à un consommateur dont les tokens viennent d'une
  autre chaîne d'outils ;
- la correspondance entre les chemins cités par un contrat réel et les noms de
  tokens de l'équipe consommatrice. Premier essai : exporter un contrat depuis
  son fichier Figma, puis chercher chaque référence dans ses tokens ;
- la nécessité, pour un contrat, de déclarer qu'aucun `tokens.json` ne
  l'accompagne. Ce point touche le format, donc `FORMAT.md` et la version du
  contrat.

### 5.4. L'écran de travail avec une seule carte

La règle « une carte est une commande, et il n'y en a que deux » suppose deux
cartes. L'alerte de repli local se place « entre elles ». Instruire la
hiérarchie, la position de cette alerte et la hauteur disponible quand la carte
des tokens disparaît.

### 5.5. Réactiver

À instruire : l'état de la carte des tokens au retour, et le verdict d'un
composant analysé pendant la désactivation, qui ne portait pas la consigne sur
les tokens.

## 6. L'onglet Repos

### 6.1. Mesurer le besoin de bascule

L'équipe consommatrice publie dans un seul projet. Le mainteneur publie dans
trois dépôts. Mesurer, avant de dessiner, la fréquence des changements de dépôt
et leur déclencheur.

Deux hypothèses mènent à des interfaces différentes : le dépôt suit le fichier
Figma ouvert, ou il suit la tâche en cours. Relever une semaine de publications
du mainteneur : fichier Figma, dépôt, intervalle entre deux changements.

### 6.2. Ce qu'une entrée contient

Champs actuels : adresse, branche de base, jeton. Champs candidats : un libellé,
l'hôte d'une instance GitLab ([section 6.9](#69-instances-gitlab-auto-hébergées)),
les options de portée dépôt ([section 4.2](#42-décider-de-la-portée-de-chaque-option)).

À instruire :

- l'identité d'une entrée : un même dépôt avec deux branches de base
  donne-t-il une entrée ou deux ;
- l'ordre des entrées, leur nombre maximal et le refus d'un doublon.

### 6.3. Les jetons

Un jeton fine-grained GitHub ne vaut que pour les repositories choisis à sa
création, et l'aide du plugin conseille de le limiter au dépôt (`aideDuJeton`).
Un jeton d'accès projet GitLab ne vaut que pour son projet. Deux dépôts peuvent
donc exiger deux jetons, ou partager un jeton qui couvre les deux.

À instruire :

- un jeton par entrée, ou un jeton partagé entre les entrées d'une même forge ;
- ce que l'interface affiche d'un jeton qu'elle ne reçoit jamais ;
- le sort du jeton quand son entrée est supprimée ;
- la nouvelle forme de la règle « un jeton ne part que vers la forge qui l'a
  reçu » : vers quelle entrée, quel hôte ou quel projet un jeton peut-il partir ?

La [documentation de `clientStorage`](https://developers.figma.com/docs/plugins/api/figma-clientStorage/)
accorde 5 Mo par plugin. Elle précise que le stockage est privé « for
stability, not security » : un utilisateur de la machine peut lire ce qui y est
rangé. Plusieurs jetons enregistrés augmentent ce qu'un poste expose. Chercher
si la sandbox Figma offre un autre rangement.

### 6.4. Migrer la configuration existante

Les clés `repoUrl`, `baseBranch`, `github_pat` et `forge_du_jeton` portent la
configuration des designers actuels. `github_pat` garde son nom pour qu'une
mise à jour ne retire pas le jeton.

À instruire :

- la conversion de ces clés en première entrée, sans perte du jeton ;
- une migration interrompue en cours d'écriture ;
- un bundle plus ancien, que Figma peut encore servir après la mise à jour :
  retrouve-t-il une configuration valable ?
- les tests de la migration hors de `figma`, sur le modèle de
  `validateSettings`.

### 6.5. Portée du dépôt actif

Le dépôt actif peut valoir pour le poste, pour le fichier Figma ou pour la
session du plugin.

- **Pour le poste.** Mesurer le cas de deux fichiers ouverts, chacun avec le
  plugin lancé, quand l'un change le dépôt actif.
- **Pour le fichier.** La [documentation de `figma.fileKey`](https://developers.figma.com/docs/plugins/api/figma/)
  le réserve aux plugins privés et aux ressources de Figma. Le plugin est
  publié sur la Community. Le nom du fichier n'est pas unique
  ([piste 1.3](../Evolutions%20globales/PISTES-EVOLUTION.md#13-retrouver-la-source-figma-depuis-une-revue)).
  Écrire une association dans le document par `setPluginData` enfreindrait la
  règle qui interdit au plugin d'écrire dans le document.
- **Pour la session.** Le choix ne survit pas à la fermeture du plugin. Mesurer
  le coût d'un choix répété à chaque lancement.

### 6.6. Changer de dépôt actif

Le verdict d'une analyse dépend du dépôt : contenu identique, collision, export
en vol, emplacement.

À instruire :

- une bascule pendant une analyse ou une publication (`operationEnCours`,
  `publicationEnCours` dans `code.ts`) ;
- la règle « un résultat ne survit pas à son sujet » quand le dépôt change et
  que la sélection reste la même ;
- le test de connexion à l'ouverture, pour l'entrée active seule ou pour toutes
  les entrées, avec son coût réseau et son délai d'affichage ;
- l'affichage d'une entrée inactive en panne.

### 6.7. Où le dépôt actif se lit et se change

Le compte des objets du protocole de relecture exclut le dépôt visé de l'écran
de travail. Un designer qui change souvent de dépôt ne voit donc pas, au moment
de publier, le dépôt qui recevra l'export.

À instruire :

- le coût d'une publication dans le mauvais dépôt : une demande à fermer et une
  branche à supprimer, ou un contrat fusionné par erreur ;
- le coût d'un objet permanent sur l'écran de travail, au regard du compte des
  objets ;
- les emplacements possibles, dont la pastille de l'en-tête, qui ouvre déjà la
  configuration.

### 6.8. Interfaces à étudier

Pour chaque référence, relever :

- l'affichage de l'entrée active ;
- le nombre de gestes pour changer d'entrée ;
- l'ajout, la modification et la suppression d'une entrée ;
- l'affichage d'un secret enregistré ;
- l'affichage de l'erreur d'une entrée ;
- la représentation de l'état sans entrée active.

| Famille | Exemples à étudier | Ce qu'elle éclaire |
|---|---|---|
| Plugins Figma synchronisés avec une forge | Tokens Studio et ses fournisseurs de synchronisation | Une liste d'identifiants dans la même sandbox et la même largeur |
| Sélecteurs de contexte dans un en-tête | Le sélecteur d'équipe de Figma, « Current repository » de GitHub Desktop | La bascule sans quitter l'écran de travail |
| Environnements nommés avec un état vide | Les environnements de Postman et leur choix « No environment » | Une entrée active parmi plusieurs, et l'absence voulue d'entrée active |
| Comptes des clients Git | Fork, Tower, GitKraken | Plusieurs identités sur plusieurs forges |
| Listes dans un panneau étroit | Liste et détail, édition en ligne, accordéon | La lecture à 320 px |

Critères de comparaison : gestes vers la bascule, risque de publier au mauvais
endroit, compte des objets, lecture à 320 px, écart avec un panneau natif de
Figma.

### 6.9. Instances GitLab auto-hébergées

Elles sont hors périmètre ([ROADMAP.md](../../../../ROADMAP.md), partie 3 de
SPEC.md). Une liste d'entrées rend la question concrète pour une équipe sur sa
propre instance.

La liste des domaines se fixe au build, dans le manifeste. La
[documentation du manifeste](https://developers.figma.com/docs/plugins/manifest/)
admet `*` comme joker de sous-domaine ou pour tous les domaines, et exige alors
le champ `reasoning`.

À instruire :

- l'effet d'un domaine large sur la revue de publication Community et sur la
  confiance d'une équipe qui installe le plugin ;
- la table `HOTES` de `config.ts`, qui déduit la forge de l'hôte ;
- l'hébergement réel du GitLab de l'équipe consommatrice.

### 6.10. Erreurs et suppression

- Les causes de `CauseConnexion` (jeton refusé, projet introuvable,
  `ucm.config.json` fautif) s'affichent aujourd'hui pour un seul dépôt.
  Instruire leur place dans une liste.
- `validateSettings` produit des erreurs par champ. Même question pour une
  entrée en cours d'édition.
- Instruire le sort du jeton quand son entrée est supprimée, et la suffisance
  d'une confirmation par second clic pour effacer un secret.
- Instruire l'entrée qui devient active quand l'entrée active est supprimée.

## 7. Débrancher les dépôts

### 7.1. Distinguer les situations

Le booléen `repli` de `etatDuDepot` couvre aujourd'hui deux situations : aucun
dépôt configuré, configuration invalide. L'interrupteur en ajoute une
troisième : dépôts débranchés par le designer. Un échec de la forge pendant la
publication produit lui aussi un téléchargement.

Instruire, pour chaque situation, la pastille, la ligne de repli et le verdict
du pré-vol.

### 7.2. Persistance et oubli

- L'interrupteur survit-il à la fermeture du plugin ? Un débranchement oublié
  fait télécharger chaque export sans ouvrir de demande de fusion.
- Instruire le rang du rappel sur l'écran de travail, selon la hiérarchie de
  l'information.

### 7.3. Le réseau pendant le débranchement

- Le test de connexion de l'ouverture part-il encore ?
- Le pré-vol lit le dépôt pour annoncer un contenu identique ou une collision.
  Débranché, il ne peut plus le faire. Instruire ce que le verdict `sans-depot`
  en dit.
- Le travail hors ligne est-il un cas visé ?

### 7.4. Articulation avec la liste et avec les tokens

- Au rebranchement, l'entrée active précédente revient-elle ?
- Comparer un interrupteur global et une entrée « aucun dépôt » dans la liste
  ([section 6.8](#68-interfaces-à-étudier)).
- La demande place l'interrupteur dans l'onglet Repos. Compter les gestes vers
  cet état temporaire, puis les comparer à un emplacement sur l'écran de
  travail.
- Instruire le téléchargement local des tokens quand la gestion des tokens est
  désactivée.

## 8. Questions aux équipes

**Équipe consommatrice :**

- son GitLab est-il `gitlab.com` ou une instance auto-hébergée ?
- combien de designers publient, et dans combien de projets ?
- les chemins cités par un de ses contrats existent-ils dans ses tokens
  ([section 5.3](#53-ce-que-le-contrat-promet-sans-tokensjson)) ?
- son projet impose-t-il des règles de nom de branche ou de message de commit,
  que GitLab signale par un refus 400 ?
- ses composants portent-ils un composant de règles `.componentRules` ?
- où les contrats doivent-ils atterrir, et l'équipe écrira-t-elle
  `ucm.config.json` ?

**Équipe du design system UCM :** combien de dépôts reçoivent ses exports, et
un même designer publie-t-il dans plusieurs ?

**Mainteneur :** le relevé de la [section 6.1](#61-mesurer-le-besoin-de-bascule).

## 9. Dépendances entre les sujets

| Sujet amont | Sujet qu'il conditionne |
|---|---|
| Portée du réglage des tokens (5.1) | Présence de cette option dans l'onglet Général ou dans une entrée de dépôt |
| Essai de correspondance des noms (5.3) | Intérêt de l'option tokens pour l'équipe consommatrice |
| Modèle des jetons (6.3) | Migration de la configuration existante (6.4) |
| Portée du dépôt actif (6.5) | Endroit où il se lit et se change (6.7) |
| Contenu mesuré des sections 4, 6 et 7 | Structure en onglets (3.1) |
