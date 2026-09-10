# Corrections de rédaction, document par document

Relevé des tours proscrits dans les 26 documents Markdown d'`UCM-Exporter` et
d'`UCM-Playground`. Les mécaniques et leurs tests sont définis par
[`.agents/skills/rediger-sans-tics-ia/SKILL.md`](../../.agents/skills/rediger-sans-tics-ia/SKILL.md).

Les numéros de ligne datent du relevé et bougent à mesure des corrections.
Une case cochée signale un passage réécrit.

## Les mécaniques comptées

| Code | Mécanique | Autorité |
|---|---|---|
| M1 | Le binôme rythmique, deux blocs soudés par une virgule et « et » | skill |
| M2 | Le prédicat vague | skill |
| M3 | La négation d'une objection absente | skill |
| M4 | Le témoin anonyme | skill |
| M5 | Le mécanisme qui pense | skill |
| M6 | La périphrase à la place de l'instruction | skill |
| M7 | Le « qui » sans antécédent | skill |
| M8 | La phrase à trois étages | skill |
| M9 | La personnification par « vit dans » et « vivent dans » | `CONTRIBUTING.md` |
| M10 | L'opposition décorative, la triade, l'aphorisme, la question rhétorique | `CONTRIBUTING.md` |

## Ce que la passe a changé

Quatre indicateurs se comptent sans jugement, sur les 26 documents et hors de
cette page :

| Indicateur | Avant | Après |
|---|---|---|
| « vit », « vivent », personnification proscrite par `CONTRIBUTING.md` | 59 | 1 |
| Second temps nié : « , et rien », « , et aucun », « , et non » | 54 | 26 |
| Phrase ou cellule ouverte par « Qui » | 20 | 7 |
| Clivage « , et c'est ... qui » | 34 | 0 |

Le « vit » restant est le contre-exemple que `CONTRIBUTING.md` cite pour énoncer
sa règle. Les sept « Qui » restants sont des en-têtes de colonne et deux
questions ouvertes d'une note. Les 26 seconds temps niés portent chacun une
borne de format, listée plus bas avec sa raison.

## Ce qu'une correction change, et ce qu'elle garde

M1, M2, M3, M4, M5, M6, M7, M8 et M9 se corrigent sans exception : leur test ne
dépend pas du sens du passage.

M10 demande un jugement. Une exclusion comme « jamais sur son nom » écarte une
lecture qu'un consommateur pourrait faire, et elle porte alors un fait. Elle
reste, sous une forme qui ne se lise pas comme une cadence. Une opposition qui
n'écarte aucune lecture réelle disparaît. Une case cochée sans réécriture porte
la raison de ce choix.

## packages/kit/fixtures/contrats/11.0/README.md

- [x] Hors périmètre. Le fichier décrit un corpus figé, que `horsPerimetre`
  écarte des contrôles de style pour que son texte ne bouge plus.

## CLAUDE.md

- [x] Aucun relevé. Le fichier tient en trois phrases déclaratives.

## docs/README.md

- [x] L59 M1 : « Une seule fait donc autorité, et les autres y renvoient. »
- [x] L78 M1 : « Elles ne font autorité sur rien, et rien du produit ne dépend d'elles. »
- [x] L74 M9 : cellule « Comment éprouver le produit à la main » et son voisinage employant « vit ».

## .agents/skills/rediger-diagnostics-ucm/SKILL.md

- [x] L9 M1 : « c'est l'autorité unique sur la forme d'un diagnostic, et ce fichier-ci n'en est qu'une procédure d'application. »
- [x] L17 M1 et M9 : « reste silencieuse dans le plugin, dans la pull request et dans `meta.diagnostics`, et sa règle vit dans la spécification et dans les tests du format. »
- [x] L20 M10 : « Un message qui écrit [...] n'est pas mal rangé, il est de trop. »

## README.md

- [x] L9 M1 et M2 : « Un même composant existe à plusieurs endroits, et rien ne garantit qu'ils disent la même chose. »
- [x] L43 M3 : « Aucun log de CI à ouvrir. »
- [x] L56 M1 et M3 : « Deux commandes, et aucun script à écrire. »
- [x] L63 M1 : « `--yes` évite l'invite de confirmation de `npx`, qui bloquerait une exécution non interactive. »
- [x] L64 M4 et M5 : « une plage laisserait npx choisir une version que personne n'a essayée, et le contrôle changerait d'avis sans qu'un fichier ait bougé. »
- [x] L80 M5 : « ce fichier décide seul de l'endroit où un export atterrit ».
- [x] L82 M6 : « Un chemin choisi trop tard se corrige donc à la main, dans le fichier. »
- [x] L84 M3 : « Votre repository n'a pas besoin d'être un projet Node. » Conservé : la phrase écarte une lecture qu'un lecteur fait vraiment, puisque la commande passe par npx.
- [x] L92 M6 et M8 : « Ce cas se documente et ne s'outille pas », puis la phrase de quarante mots sur le binaire par plateforme.
- [x] L98 M9 : « Les détails vivent dans packages/cli/README.md. »
- [x] L105 M5 : cellule « Le repository sait-il lire cette version de contrat ? »
- [x] L106 M1 : cellule « les listes concordent-elles, et aucun cycle n'existe-t-il ? »
- [x] L116 M7, M1 et M8 : « Qui répare dépend du sens de l'écart, et non de la personne qui a ouvert la pull request, que la CI ne connaît pas. »
- [x] L118 M1 : « un contrat trop récent demande une mise à jour du repository, et aucun réexport n'y changerait rien. »
- [x] L190 M7 : « Ce chemin s'adresse à qui modifie le moteur. »
- [x] L227 M3 : « sans écrire une ligne de script ni être un projet Node ».
- [x] L231 M3 et M10 : « Il n'y a rien à y copier, et c'est cette absence qui le rend probant ».
- [x] L236 M9 : « La maturité, les limites connues et les prochaines validations vivent dans ROADMAP.md. »
- [x] L241 M9 : « Le sommaire complet [...] vit dans docs/README.md. »
- [x] L246 M7 : les onze cellules ouvertes par « Qui », de « Qui ouvre le plugin » à « Qui veut savoir ce qui est prouvé ».
- [x] L247 M7 : la colonne mélange un nom de rôle et douze propositions relatives.

## packages/plugin/README.md

- [x] L21 M7 : « Le chemin de développement, pour qui modifie le moteur ».
- [x] L31 M1 : « Deux projections divergeraient, et un contrat citerait alors un token que `tokens.json` écrit sous un autre nom. »
- [x] L43 M5 et M6 : « un fichier fautif se sait ainsi avant le travail plutôt qu'après ».
- [x] L45 M5 et M8 : « Un chemin rangé sur le poste du designer ne pourrait décider que face à un repository qui ne se décrit pas [...] »

## packages/adapter-typescript/README.md

- [x] L32 M1 : « The gap is in the code, and a developer closes it; a re-export changes nothing. »
- [x] L42 M3 et M10 : « there is no exception list, no annotation, and no per-component opt-out ».
- [x] L43 M1 : « The warning itself says what it does not see, and it blocks nothing. »
- [x] L61 M10 : « A contract describes the views that exist; it says nothing about the logic that picks one. »
- [x] L70 M10 : « it is a capability of one adapter, never a guarantee of the format ».

## packages/cli/README.md

- [x] L17 M1 et M4 : « A range would let npx pick a build nobody tested, and the check would change its verdict without a single file moving. »
- [x] L85 M1 : « Five files, and it explains each one as it writes it. »
- [x] L100 M1 : « Three paths, and nothing else. »
- [x] L105 M10 : « Its absence is the nominal case, not an error ».
- [x] L127 M10 : « written for the designer who validates the export, not for the developer who reads CI logs ».
- [x] L135 M7, M5 et M8 : « Who fixes it depends on the direction of the gap, never on who opened the pull request, which the CI does not know. »
- [x] L151 M1 : « tokens are the source of truth, and an older contract does not hold back their evolution ».
- [x] L156 M10 : « A missing implementation is an allowed state, not an error. »
- [x] L163 M4 : « those contracts cite tokens nobody can resolve ».
- [x] L172 : ligne de 96 caractères, à replier comme le reste du fichier.

## packages/kit/README.md

- [x] L21 M10 : la question rhétorique sur la lisibilité d'un contrat.
- [x] L59 M4 : « that contract cites tokens nobody can resolve ».
- [x] L63 M1 et M7 dans un titre : « A version gap has a direction, and it names who fixes it ».
- [x] L68 M1 : « A re-export from Figma fixes it, and the designer owns that gesture. »
- [x] L74 M1 et M5 : « A validator that only says invalid cannot tell these apart, and will blame the designer for a gap the developer owns. »
- [x] L86 M1 dans un titre : « Three entry points, and why they are separate ».
- [x] L110 M10 : « The schema describes the shape of a contract, never its coherence. »
- [x] L111 M1 : « are not its job, and its own `description` says so ».
- [x] L119 M1 : « Producing contracts is the plugin's job, and implementing the component is yours. »

## UCM-Playground/README.md

- [x] L14 M10 : « Cette absence d'outillage local est ce qui rend la recette probante. »
- [x] L34 M5 : « le résultat ressemble à un contrat qui aurait oublié ses icônes ».
- [x] L77 M1 : « Le protocole de reconstruction attend ce chemin absent, et il s'arrête en le signalant s'il l'y trouve encore. »
- [x] L79 M1 : « le composant obtenu montrerait alors ce que son auteur précédent savait, et non ce que le contrat publie ».
- [x] L110 M10 : « Un écart accuse le contrat, l'export ou le moteur, jamais le composant. »
- [x] L119 M1 : « Trois éléments viennent de l'application, et aucun contrat ne les porte. »
- [x] L126 M1 : « Un contrat porte un nom d'icône opaque, et le kit le résout en glyphe. »
- [x] L139 M10 : « C'est cette écriture littérale qui rend la comparaison avec le contrat possible. »
- [x] L150 M10 : « Un composant retouché efface la preuve du défaut, cesse de mesurer quoi que ce soit, et rend invisible ce qu'il signalait. »
- [x] L164 M1 et M3 : « Ce rapport est écrit pour le designer qui valide l'export, et il n'y a jamais besoin d'ouvrir les journaux de la CI. »
- [x] L171 M1 et M10 : « Aucun de ces contrôles ne compare un rendu à une maquette, et c'est ce que la reconstruction à froid ajoute. »
- [x] L174 M1 : « le rapport dit que l'implémentation n'a pas été lue, et jamais qu'elle est conforme ».

## UCM-Playground/AGENTS.md

- [x] L5 M5 : « un repository qui ne sait rien du produit ».
- [x] L14 M1 et M10 : « Une seconde implémentation divergerait de la première, et c'est celle qui n'est pas jetable qui deviendrait la vérité. »
- [x] L29 M10 : « C'est cette absence d'outillage local qui rend la recette probante : ce qui fonctionne ici fonctionne chez n'importe qui. »
- [x] L41 M4 : « une reconstruction que personne ne regarde n'a mesuré que le contrôle de types ».
- [x] L43 M1 et M6 : « Ce que la skill laisse au projet, en revanche, se décide ici, et nulle part ailleurs. »
- [x] L48 M5 : cellule « le kit décide seul du préfixe ».
- [x] L52 M1 et M10 : « chaque composant écrit ses références en toutes lettres, et c'est ce qui rend la comparaison avec le contrat possible ».
- [x] L58 M9 : « une variable qui vit dans un `.env.local` non versionné ».

## CONCEPT.md

- [x] L12 M4 et M10 : « personne ne sait si le code la rend [...] Rien n'a signalé l'écart parce que rien ne le regardait. »
- [x] L22 M3 : « sans prétendre les fusionner en une seule source omnisciente ».
- [x] L122 M9 : « La forme exacte de cette projection vit dans docs/FORMAT.md. »
- [x] L141 M5 : « La CI vérifie ce qu'elle sait prouver ».
- [x] L144 M6 : « Ce workflow se complète par un test froid ».
- [x] L157 M10 : « La valeur du modèle dépend moins du nombre de champs exportés que de sa capacité à tenir ces deux promesses ».

## docs/COMPATIBILITE.md

- [x] L13 M1 dans un titre : « Les cinq numéros, et ce que chacun couvre ».
- [x] L18 M10 : cellule « il décrit la forme, jamais la cohérence ». Conservé : l'exclusion écarte une lecture réelle, un schéma passant pour un contrôle de cohérence.
- [x] L21 M10 : cellule « ce qu'il mesure est une capacité, pas une garantie ». Conservé : l'exclusion écarte une lecture réelle.
- [x] L23 M1 : « Un paquet peut monter sans que le format bouge, et le format peut bouger en n'obligeant qu'un seul paquet. »
- [x] L42 M1 et M10 : « la 4.2 a renommé des slots d'icônes et cassé un lecteur, et c'est de là que vient la plage explicite. »
- [x] L45 M10 : « est un choix temporaire d'une migration, jamais un état par défaut ». Redite de `CHANGELOG-FORMAT.md` L22. Conservé : la borne est ici chez son autorité ; la redite part de CHANGELOG-FORMAT.md.
- [x] L65 M1 et M10 : « et c'est ce qui la rend coûteuse : la forme ne bouge pas, donc le schéma accepte, les lecteurs acceptent, et le sens a changé. »
- [x] L97 M1 dans un titre : « `tokens.json` n'a pas de version, et c'est une décision ».
- [x] L101 M1 et M10 : « Un numéro écrit aujourd'hui serait un champ décoratif, et un champ décoratif se lit comme une garantie. »
- [x] L126 M6 et M8 : « Un verdict qui se relâche se publie comme une nouveauté [...] sans cette mention, la date à laquelle un contrôle a cessé de refuser reste introuvable. »
- [x] L140 M1 : « un contrat hors de la fenêtre de lecture bloque, et rien d'autre ici ne bloque ».
- [x] L142 M10 : « parce qu'il accuse le code et non l'artefact déposé ».
- [x] L147 M5 : « elles supposent de connaître, chez le producteur, ce qu'un repository tiers fait de son contrat ».
- [x] L149 M2 : « Un réexport et une fenêtre explicite disent la même chose sans le supposer. »

## docs/CHANGELOG-FORMAT.md

- [x] L4 M7 : « Il s'adresse à qui lit un contrat qu'il n'a pas exporté ».
- [x] L7 M10 : « Ici, on ne trouve que le passé et ce qu'il coûte. »
- [x] L13 M8 et M9 : la phrase de cinq propositions sur la fenêtre de lecture, dont « la plage vit dans `version-contrat.mjs` ».
- [x] L22 M4 et M10 : « jamais un état par défaut : la laisser survivre à sa migration ferait rentrer en silence un schéma que plus personne n'adapte. »
- [x] L26 M10 : « Ce fichier n'est pas un garde-fou et ne prouve rien [...] Ces notes servent autre chose ».
- [x] L40 M9 : « le détail de chacune vit dans le commit qui l'a adoptée ».
- [x] L71 M8 : « un contrat coûte 53 % de tokens en moins à lire, c'est un fichier lu par un agent avant d'écrire une ligne de code, et sa longueur se paie à chaque lecture. »
- [x] L86 M10 : « Exception, et elle compte : ».
- [x] L101 M1 et M10 : « C'est de là que vient l'essentiel du gain, et ça ne change pas un octet de donnée. »
- [x] L113 M1 : « Trois champs de plus, et un champ qui cesse de se répéter. »
- [x] L139 M8 : la phrase de la 12.0 identique à la 11.0, qui enchaîne sur « trois des quatre contrats [...] l'ont vérifié » sans point.
- [x] L154 : deux lignes vides consécutives avant le titre « Adresses de slots et clés de props ».
- [x] L184 M1 : « Aucun artefact de cette forme n'existe donc chez un consommateur, et rien n'est à migrer ».

## docs/POUR-LES-DESIGNERS.md

- [x] L3 M7 : « Ce guide s'adresse à qui travaille dans Figma. »
- [x] L9 M2 : « Rien ne garantit que les deux disent la même chose. »
- [x] L10 M1 et M4 : « Un variant ajouté dans Figma peut ne jamais arriver dans le code, et personne ne le voit. »
- [x] L18 M2 : cellule « Le fait que les deux correspondent ».
- [x] L24 M1 : « Vous n'écrivez pas de code, et le plugin n'en écrit pas non plus. »
- [x] L29 M5 : « Il n'invente rien et ne devine rien », redite de la phrase précédente.
- [x] L30 M5 : « Ce qui suit augmente ce qu'il saura décrire. »
- [x] L45 : « **Documentez votre intention** » sans ponctuation avant la phrase qui suit.
- [x] L108 M3 : « vous n'avez jamais à ouvrir les journaux de la CI ».
- [x] L110 M1 dans un titre : « Ce qui bloque la fusion, et ce qui n'en bloque pas ».
- [x] L114 M5 : « une version du plugin que le repository ne sait pas encore lire ».
- [x] L121 M5 : cellule « Le repository sait lire cette version de contrat ».
- [x] L127 M1 : « les tokens font foi, et un ancien contrat ne retient pas leur évolution ».
- [x] L135 M10 : « L'absence d'implémentation est un état d'avancement autorisé, pas une erreur. » Conservé : un designer lit une implémentation absente comme une erreur ; l'exclusion porte un fait.
- [x] L139 M10 : « La CI détecte ; elle n'empêche pas. » Redite de `ROADMAP.md` L56.
- [x] L152 M10 : « Elles servent à juger une mise en page, jamais à conclure sur un contraste ». Conservé : l'exclusion écarte une lecture réelle sur le contraste.
- [x] L158 M9 et M10 : « Les définitions complètes vivent là-bas, jamais ici. »
- [x] L165 M10 : cellule « Le contrat liste celles qui existent, jamais toutes celles qui seraient possibles. » Conservé : l'exclusion écarte la matrice dense, que le lecteur présume.
- [x] L174 M1 : cellule « Il aide à retrouver l'esthétique voulue, et aucun contrôle ne le compare au code. »
- [x] L176 M1 : cellule « Il se jette et se refait, et ne forme jamais une bibliothèque ».

## ROADMAP.md

- [x] L3 M9 : « Les principes vivent dans CONCEPT.md ».
- [x] L28 M1 : « sur au moins un composant composé, et non de couvrir un catalogue entier ».
- [x] L36 M5 : cellule « Aucune ne connaît le nom d'un composant ».
- [x] L44 M1 et M10 : cellule « Il décrit la forme, jamais la cohérence, et ne bloque aucune fusion ».
- [x] L55 M10 : cellule « La généralité du moteur se mesure sur ses invariants, pas sur ce corpus ». Conservé : l'exclusion écarte une lecture réelle du corpus comme preuve.
- [x] L56 M10 : cellule « La CI détecte, elle n'empêche pas. »
- [x] L64 M5 : « Le moteur ne peut plus savoir qu'elle provenait d'un composant unifié ».
- [x] L78 M10 : « se paie une fois par composant propriétaire, jamais par variant ». Conservé : l'exclusion écarte le coût par variant, que le lecteur présume.
- [x] L84 M10 : « C'est la mesure qui manque, pas la correction. »
- [x] L93 M1 : « Le Playground ne porte aucun test par composant, et aucun vérificateur générique n'exerce les vues exactes ».
- [x] L102 M1 et M10 : « et c'est celle qui n'est pas jetable qui deviendrait la vérité ». Redite d'`UCM-Playground/AGENTS.md` L14.
- [x] L115 M1 : « Deux trous restent, et aucun contrat existant ne les touche. »
- [x] L122 M1 et M10 : « C'est la seule preuve visuelle du projet, et elle n'est écrite nulle part. »
- [x] L159 M5 : « car elle ne saurait le faire pour toutes les écritures sans présenter son silence comme une garantie ».
- [x] L180 M1 et M10 : « C'est la seule preuve du projet qui traverse Figma, GitHub et npm dans le même geste, et aucun test de ce dépôt ne peut la remplacer. »
- [x] L186 M10 : « Ce que la recette ajoute et qu'aucune de ces épreuves ne couvre : Figma, une vraie pull request, et la comparaison ».

## CONTRIBUTING.md

- [x] L8 M9 : « chacune sa borne et son fichier autorité. Leur raisonnement vit dans les deux »
- [x] L78 M8 : « - employer la voix active et des verbes concrets ; - nommer la personne qui doit agir : designer, développeur ou mainteneur du plu » Conservé : liste à puces, non une phrase.
- [x] L100 M1 : « portes d’entrée, et rien d’autre : le point bloque l’export, il rend le contrat »
- [x] L108 M10 : « et à ses tests, pas à un résultat d’export. » Conservé : l'exclusion écarte une lecture réelle, la règle passant pour un effet d'export.
- [x] L112 M3 : « qu’il n’a rien à faire, lui apprend que ces listes se survolent. Le jour où un » Conservé : le passage décrit le message fautif, il ne l'emploie pas.
- [x] L205 M8 : « - **un élément signale son rang par deux moyens au plus** : position et taille, ou poids et couleur, jamais les quatre, sinon tout » Conservé : liste à puces, non une phrase.
- [x] L205 M8 : « Ce qui vaut pour les deux, l’alerte de repli local, vit entre elles et sans surface ; - **un résultat ne survit pas à son sujet.** » Conservé : liste à puces, non une phrase.
- [x] L206 M10 : « ou poids et couleur, jamais les quatre, sinon tout crie ensemble ; »
- [x] L207 M10 : « - **la couleur sémantique ne signale que la sévérité, jamais le rang.** » Conservé : l'exclusion porte la règle elle-même.
- [x] L216 M1 : « concerne l’autre commande n’y entre, et rien ne porte de surface en dehors »
- [x] L219 M9 : « de repli local, vit entre elles et sans surface ; »
- [x] L239 M10 : « Les couleurs viennent d’un décalque des variables `--figma-color-*`, pas de » Conservé : l'exclusion écarte l'hôte Figma, source plausible.
- [x] L251 M8 : « C’est ce compte qui a fait retirer le journal replié, le dépôt visé et ses deux chemins, la ligne d’emplacement et le titre « Publ »
- [x] L254 M10 : « fond, à 11 px. Dans Figma, pas sur le décalque. » Conservé : l'instruction oppose deux endroits réels.
- [x] L274 M10 : « est une règle du format, pas un choix d’implémentation : » Conservé : l'exclusion écarte une lecture réelle.
- [x] L302 M9 : « docs/README.md en tient la table. Deux »
- [x] L325 M8 : « `` en tient cinq, sur les documents et sur les commentaires de code : tiret cadratin en incise, capitales d’emphase, opposition en » Conservé : énumération des cinq contrôles, non une cadence.
- [x] L329 M9 : « autre un passage de vingt-cinq mots. Les règles vivent dans »
- [x] L345 M9 : « « le module `names.ts` porte la règle » plutôt que « la règle vit dans » Conservé : contre-exemple cité par la règle.
- [x] L382 M8 : « **Deux autorités, et la frontière entre elles.** Une règle qui décrit un champ, sa forme, ce que son absence signifie et ce qu’un  »
- [x] L403 M6 : « quoi chacun se vide en supposant que l’autre garde. Une borne ne se retire »
- [x] L404 M9 : « jamais au motif qu’elle vit ailleurs, sauf à l’avoir lue à l’endroit où elle »
- [x] L412 M9 : « - Les sources de l’interface vivent dans `src/ui/`; le build produit »

## docs/RECETTE.md

- [x] L7 M1 : « C'est un guide, et rien ne l'exige. Elle couvre les trois chemins qu'aucun test »
- [x] L14 M9 : « - **UCM-Exporter**, le produit. C'est ici que vivent le plugin et le code des »
- [x] L35 M10 : « **La recette se joue sur ce qui est publié, jamais sur la copie de travail.** Le » Conservé : l'exclusion écarte la copie de travail, que le lecteur prendrait.
- [x] L75 M8 : « **Le pied de page de la fenêtre porte la version de schéma que ce bundle produit.** Notez-la : c'est la seule chose qui distingue  »
- [x] L121 M9 : « | `--implementation <motif>` | Où vit l'implémentation d'un contrat | »
- [x] L242 M10 : « du rapport, pas sur sa couleur : titre, cause, geste attendu, état de la fusion. » Conservé : l'instruction oppose la forme et la couleur du rapport.
- [x] L261 M10 : « et cette absence est un état d'avancement, pas une erreur. La pull request doit »
- [x] L272 M1 : « Sans cette règle, le contrat ne publie aucun défaut pour `color`, et c'est »
- [x] L273 M10 : « voulu : la position du premier variant est un effet de la mise en page, pas une » Conservé : l'exclusion écarte une lecture réelle de la position d'un variant.
- [x] L318 M1 : « version`, et non celle du dépôt : quand les deux diffèrent, c'est l'étape 8 qui »
- [x] L335 M10 : « | 6. L'absence d'implémentation est un état d'avancement, pas une erreur | Étape 5 | »
- [x] L409 M1 : « numéro rend une erreur 409, et c'est le comportement voulu. »
- [x] L441 M10 : « C'est ce dernier passage qui prouve que ce qui a été publié fonctionne chez un » Conservé : le contraste porte le résultat de la recette.
- [x] L442 M1 : « consommateur, et pas seulement dans le monorepo qui l'a produit. »
- [x] L451 M1 : « plugin y est publié, et c'est ce bundle que la recette éprouve ; ce qui reste »
- [x] L451 M10 : « plugin y est publié, et c'est ce bundle que la recette éprouve ; ce qui reste »
- [x] L454 M9 : « - **Le code du plugin qui vit dans ce dépôt** n'est pas éprouvé ici, sauf s'il »
- [x] L457 M1 : « - Les paquets sont en `0.x`. La surface publique n'est pas gelée, et c'est »

## .agents/skills/consommer-contrat/SKILL.md

- [x] L11 M10 : « Le composant est un artefact jetable du sandbox, jamais une implémentation de » Conservé : l'exclusion écarte l'implémentation de production, que l'agent produirait sinon.
- [x] L45 M10 : « fournit (§6), jamais à la main. » Conservé : l'exclusion écarte la résolution à la main.
- [x] L67 M8 : « Ne jamais afficher linéairement un gros contrat, et ne jamais l'ouvrir en plusieurs lectures successives : **une commande unique,  » Conservé : instruction, non une cadence.
- [x] L89 M5 : « diagnostic : ils tracent Figma, ils ne décident pas du rendu. À l'inverse, »
- [x] L131 M8 : « - respecter l'ordre de `` pour former une clé stable ; - conserver chaque référence `` en toutes lettres ; - ne jamais produire un » Conservé : liste à puces.
- [x] L177 M8 : « - chaque `` retire sa cible à `` et la rend à `` ; - les variantes représentatives sélectionnent leurs vue, peintures, icônes et c » Conservé : liste à puces.
- [x] L185 M10 : « projet** : elle porte sur le moteur, pas sur ce composant, elle ne peut rien » Conservé : phrase coupée en deux.
- [x] L190 M10 : « leur reconstruction évalue la robustesse du contrat, pas la pérennité de leur » Conservé : l'exclusion écarte la pérennité, que l'agent viserait sinon.
- [x] L267 M8 : « Certaines sont partagées par tous les contrats (``, ``, ``, ``, ``) mais **ne pas présumer qu'il n'y en a que celles-là** : un com » Conservé : l'exclusion porte la règle.
- [x] L275 M10 : « écrire sont celles que publie `rendering.roles[clé]`, jamais une propriété » Conservé : l'exclusion écarte trois déductions que l'agent ferait.
- [x] L303 M10 : « par le résolveur. `figmaName` est une identité, jamais un chemin de token ni un » Conservé : l'exclusion écarte le chemin de token.
- [x] L311 M8 : « - `` situe l'icône dans cette vue ; - `` définit sa boîte et alimente le point d'intégration (§6.4) ; - `` rend toujours `` ; - `` » Conservé : liste à puces.
- [x] L339 M10 : « et le nombre maximal d'occurrences, pas la liste à rendre dans chaque vue. » Conservé : l'exclusion écarte la liste par vue.
- [x] L344 M6 : « occurrence absente de la vue courante se neutralise sur place, elle ne se retire »
- [x] L353 M10 : « la maquette, jamais un token, une dimension ou un layout. Les rendre comme » Conservé : l'exclusion écarte token, dimension et layout.
- [x] L372 M10 : « positions, jamais une map par nom. » Conservé : l'exclusion écarte la map par nom.
- [x] L392 M10 : « les erreurs du contrôle de type (§6.6), jamais en lisant un source. » Conservé : l'exclusion écarte la lecture d'un source.
- [x] L407 M8 : « **Ne pas retirer une occurrence de dépendance du source.** Le contrôle de parité compte les occurrences statiquement, sans exécute » Conservé : instruction.
- [x] L438 M5 : « quelques secondes de plus ; un contrôle qu'on croit ciblé et qui ne l'est pas »

## .agents/skills/rediger-sans-tics-ia/references/recherches.md

- [x] L16 M9 : « quatorze restants vivent en titre ou en cellule de tableau, où le tiret sépare »
- [x] L25 M8 : « La densité de mots en capitales a été essayée comme second contrôle, puis abandonnée : deux comptages de bonne foi divergeaient de »

## packages/plugin/SPEC.md

- [x] L9 M9 : « Le pourquoi et la répartition des responsabilités vivent dans »
- [x] L21 M8 : « L'UI expose le statut GitHub, les deux commandes, la configuration, un compte rendu, un retour en direct sur la sélection, et en p »
- [x] L31 M1 : « disque, et rien d'autre ne le dirait. » Conservé : le fait porte, rien d'autre ne révèle un bundle périmé.
- [x] L43 M5 : « Ce que le contrat suppose d'un design system (clé de base, allongement, » Conservé : le contrat pose des hypothèses, ce que le mot décrit exactement.
- [x] L77 M10 : « Le geste demandé au designer est toujours de **nommer** la valeur, jamais de la » Conservé : l'exclusion écarte le retrait de la valeur, geste que le designer ferait.
- [x] L86 M9 : « Les props du contrat vivent dans un espace de noms plat, là où deux component »
- [x] L92 M8 : « - **Les axes réservent leur clé avant les autres propriétés.** Sans cette priorité, une `` déclarée plus haut dans le fichier pren » Conservé : liste à puces.
- [x] L128 M8 : « Ce score dépend de la racine d'où part la recherche, si bien que l'élection a lieu **une seule fois par variant**, avec la même rè » Conservé : phrase de spécification, une seule subordonnée.
- [x] L138 M8 : « Ce que l'élection écarte n'est pas oublié : un calque posé **à côté** du node élu (un badge, un liseré, un second bloc) ne reçoit  » Conservé : phrase de spécification.
- [x] L143 M1 : « La liste s'arrête là, et c'est délibéré : `RECTANGLE`, `ELLIPSE` et `LINE` en »
- [x] L178 M5 : « moteur décide en lisant Figma : ce dont il avertit, ce qu'il arrondit, et où il »
- [x] L183 M8 : « Un calque dont le sous-arbre ne porte ni texte, ni dépendance, ni icône déclarée, mais bien un tracé, est donc publié avec sa plac » Conservé : phrase de spécification.
- [x] L190 M8 : « Le message part une seule fois par dessin, et nomme le calque le plus profond qui contienne encore tout le dessin, celui que le de » Conservé : l'exclusion nomme le calque que Figma aurait nommé.
- [x] L193 M10 : « tout le dessin, celui que le designer déclarerait : « skull », jamais le « » Conservé : l'exclusion nomme le calque que Figma aurait nommé.
- [x] L225 M9 : « Ce relevé vit dans l'extraction, jamais dans un balayage à part : on n'avertit » Conservé : l'exclusion écarte le balayage à part.
- [x] L230 M10 : « réserve, et elle se lit sur la valeur, jamais sur l'usage supposé du calque. Les » Conservé : l'exclusion écarte l'usage supposé du calque.
- [x] L247 M10 : « **Une notice, jamais un avertissement.** Deux échantillons là où le design en » Conservé : l'exclusion sépare deux canaux réels.
- [x] L254 M9 : « **Toute cette section vit dans [7. Intention et documentation des »
- [x] L255 M1 : « props](../../docs/FORMAT.md#7-intention-et-documentation-des-props), et c'est un »
- [x] L258 M8 : « Mais chaque règle n'a de sens qu'à côté du champ qu'elle remplit : `` et sa politique, son slot, sa prop runtime, ses variants for » Conservé : phrase de spécification.
- [x] L267 M10 : « main, pas le repository qui lit l'artefact. Cette section est donc un renvoi, » Conservé : la frontière oppose deux documents réels.
- [x] L268 M1 : « volontairement, et non un oubli du dédoublonnage. » Conservé : le fait écarte l'oubli, lecture qu'un relecteur ferait.
- [x] L283 M5 : « Le moteur ne choisit pas librement le nom de ce qu'il dépose : il projette le » Conservé : le verbe est suivi du mécanisme qui le remplace.
- [x] L320 M8 : « Le moteur écrit dans `` tout ce qu’il a eu à signaler en lisant Figma, et rien d’autre : **un diagnostic parle de l’export, jamais » Conservé : phrase de spécification.
- [x] L321 M1 : « Figma, et rien d’autre : **un diagnostic parle de l’export, jamais du » Conservé : l'exclusion porte la règle du diagnostic.
- [x] L327 M8 : « Une transformation entièrement prise en charge : une piste `` publiée en pixels, la distance aux bords d’un calque hors du flux, u » Conservé : énumération des transformations.
- [x] L334 M3 : « interne de l’exporteur pour lui dire qu’il n’a rien à faire. » Conservé : le passage décrit le message fautif.
- [x] L343 M1 : « **`meta.figma.url` est absent des contrats produits aujourd’hui, et c’est un »
- [x] L354 M10 : « c’est là que se constate si elle suffit à une revue. **L’absence de lien ne »
- [x] L357 M9 : « apprendrait à survoler la liste où vivent les gestes à faire. »
- [x] L383 M8 : « Un chemin rangé sur le poste du designer ne pourrait décider que face à un repository qui ne se décrit pas, c'est-à-dire au moment » Conservé : phrase réécrite.
- [x] L386 M9 : « défaut vivent dans `packages/kit/src/format/configuration.ts`, »
- [x] L391 M1 : « connexion, et non à la publication, pour qu'un fichier fautif se sache avant le »
- [x] L408 M8 : « Pour un artefact modifié, le plugin lit la ref de base, crée la branche `` (le type d'artefact et les secondes évitent toute colli » Conservé : phrase de spécification.
- [x] L421 M8 : « **« Identique » se juge à deux endroits : la branche de base, et les pull requests d'export encore ouvertes.** Un artefact déposé  » Conservé : phrase de spécification.
- [x] L421 M8 : « Le compte rendu du plugin dit lequel des deux endroits a répondu, et donne le lien de la pull request quand c'est elle : « aucun c » Conservé : phrase de spécification.
- [x] L421 M8 : « Un contenu différent pendant qu'une pull request d'export est ouverte n'est pas bloqué pour autant, réexporter après correction ét » Conservé : phrase de spécification.
- [x] L429 M1 : « réexporter après correction étant le geste normal, et c'est Git qui signale le »
- [x] L438 M8 : « **Le corps de la pull request a deux zones, et la frontière compte.** L'en-tête dit l'identité de ce qui est déposé : le chemin du » Conservé : phrase de spécification.
- [x] L450 M8 : « **Le schéma annoncé est lu dans le fichier déposé, jamais dans la constante du plugin.** `` est le seul champ qui décide si le fic » Conservé : l'exclusion écarte la constante du plugin.
- [x] L461 M8 : « Les trois sont exigés, un constat qui ne nomme aucun geste n'étant pas émis : une liste dont la conclusion est toujours « rien à f » Conservé : le passage décrit le message fautif.
- [x] L464 M3 : « une liste dont la conclusion est toujours « rien à faire » apprend à son lecteur » Conservé : le passage décrit le message fautif.
- [x] L466 M9 : « règle et le vocabulaire vivent dans »
- [x] L479 M8 : « **Un avertissement arrive inerte dans la page GitHub.** Le message cite les intitulés de Figma tels quels, et GitHub lit dans cert » Conservé : phrase de spécification.
- [x] L506 M7 : « | Variable | Qui l'écrit | Qui la lit | Ce qu'elle porte | » Conservé : en-tête de colonne, non un sujet de phrase.
- [x] L512 M1 : « **Aucune n'est figée, et c'est la décision.** Geler une interface publique avant »
- [x] L524 M10 : « Pas d'écriture dans le document Figma, pas d'auto-merge, pas de multi-composant » Conservé : énumération des limites.
- [x] L525 M10 : « en une commande, pas de scoring. Aucun domaine réseau autre que GitHub API » Conservé : énumération des limites.
- [x] L557 M8 : « **La frontière que cette décision ne déplace pas.** Créer, renommer, déplacer, supprimer un node, écrire une variable ou un style  » Conservé : phrase de spécification.
- [x] L560 M10 : « est celle entre regarder et écrire, non une affaire de degré. » Conservé : l'exclusion écarte l'affaire de degré.

## AGENTS.md

- [x] L6 M9 : « Ce document dit **ce que le projet garantit** : où vit chaque chose, et quelles »
- [x] L27 M10 : « versionnage. Lire le groupe que la tâche touche, pas la section entière. » Conservé : l'instruction oppose deux lectures réelles.
- [x] L29 M8 : « **Avant d'écrire une phrase, dans un document ou dans un commentaire, charger la skill [``](./.agents/skills/rediger-sans-tics-ia/ » Conservé : liste et instruction.
- [x] L40 M9 : « `consommer-contrat`. Elle vit »
- [x] L49 M9 : « La maturité et les priorités vivent dans ROADMAP.md. Les idées »
- [x] L191 M9 : « Le raisonnement vit dans la spécification, en lien. »
- [x] L195 M8 : « - Une propriété native garde son type (``, ``) et ses liaisons ``, ``, `` : définition dans ``, `` dans ``, aucun rapprochement pa » Conservé : phrase d'invariant.
- [x] L195 M8 : « Une vue est cinq renvois : ``, ``, ``, ``, ``, chacun catalogué à part et partagé par égalité stricte de son bloc JSON, à l’ordre  » Conservé : phrase d'invariant.
- [x] L208 M10 : « `[]` est absente. Borne, et elle porte tout : un seul passage, jamais de point » Conservé : l'exclusion écarte le point fixe.
- [x] L222 M5 : « propriétés, si bien que l'ordre des déclarations Figma ne décide de rien. Deux » Conservé : le verbe décrit une détermination, non un avis.
- [x] L229 M9 : « - Les axes d’API vivent dans `props`, l’axe d’états dans `stateModel` ; une règle »
- [x] L236 M8 : « → spec - Un nom de token se projette de trois façons, et chacune a un proprié » Conservé : liste à puces.
- [x] L267 M1 : « `ring` d’un `border`, et c’est tout ce dont il décide. Un `…/foreground` posé »
- [x] L269 M10 : « du token, jamais sur la clé publiée. » Conservé : l'exclusion écarte la clé publiée, lecture que fait un consommateur.
- [x] L296 M8 : « Une seule chose en remonte, et elle n’est pas normative : ce que ce parent a changé par rapport au maître, soit les surcharges de  » Conservé : phrase d'invariant.
- [x] L325 M8 : « → spec - Le contrat donne le carré d’une icône, jamais son dessin ni de » Conservé : l'exclusion écarte le dessin de l'icône.
- [x] L333 M10 : « vivent, jamais une sélection. `variants[].tokens` relève les couleurs du » Conservé : l'exclusion écarte la sélection.
- [x] L333 M9 : « vivent, jamais une sélection. `variants[].tokens` relève les couleurs du » Conservé : l'exclusion écarte la sélection.
- [x] L369 M8 : « - Un calque hors du flux est placé : `` dit à quels bords il s’accroche, `` à quelle distance, en pixels et avec une seule signifi » Conservé : phrase d'invariant.
- [x] L369 M8 : « Les côtés d’un même champ peuvent citer des variables différentes : le contrat publie alors le détail (``, ``, ``, largeur d’un st » Conservé : phrase d'invariant.
- [x] L369 M8 : « Un calque hors du node élu, ou à côté d’une dépendance dans son cadre, ne reçoit ni slot, ni typographie, ni visibilité, alors que » Conservé : phrase d'invariant.
- [x] L369 M8 : « → spec - Un tracé n’est pas une boîte : sur un ``, ``, `` ou ``, la dimension est le dess » Conservé : phrase d'invariant.
- [x] L386 M10 : « liaison, jamais le fait d’être figé : sans variable une largeur fixe vaut » Conservé : l'exclusion écarte le fait d'être figé.
- [x] L410 M10 : « la borne, jamais de la retirer. Un calque intermédiaire n’en est pas » Conservé : l'exclusion écarte le retrait de la borne.
- [x] L422 M5 : « - Une propriété Figma que le schéma ne sait pas porter avertit au lieu de »
- [x] L425 M5 : « - Une propriété à effet visuel que le schéma ne sait pas écrire avertit, mais »
- [x] L436 M8 : « - Exception propre aux grilles : une piste `` publie sa valeur en pixels, sans devenir un token ni dégrader la couverture, et **sa » Conservé : phrase d'invariant.
- [x] L436 M8 : « - L’exception s’étend de la piste à la cellule, et là seulement : sous une piste ``, `` n’existe pas et la mesure ne vit que sur l » Conservé : phrase d'invariant.
- [x] L436 M8 : « Trois bornes : une variable liée l’emporte et se publie dans ``, qui reste strictement tokenisé ; une seule piste non `` sous l’ét » Conservé : phrase d'invariant.
- [x] L448 M9 : « `HUG`, `GridTrackSize.value` n’existe pas et la mesure ne vit que sur l’enfant, »
- [x] L458 M8 : « La phrase compacte que publient ``, la pull request et le journal s’en dérive (``), sans seconde rédaction ; l’interface, elle, me »
- [x] L479 M9 : « dans le plugin, dans la pull request et dans `meta.diagnostics` ; sa règle vit »
- [x] L483 M7 : « contrat. Qui veut la liste lisible lit `diagnostics[].message`, sans filtrer »
- [x] L490 M1 : « - `meta.figma.url` est absent des contrats produits aujourd’hui, et c’est normal. »
- [x] L514 M10 : « - `figmaLayer` est une **identité** Figma, jamais un contenu, que Figma nomme ou » Conservé : l'exclusion écarte le contenu.
- [x] L520 M1 : « manque au contrat normatif, et c’est là qu’il faut la corriger. »
- [x] L521 M1 : « - Tout le non normatif vit sous `samples` et `variants[].sample`, et nulle part » Conservé : l'exclusion écarte tout autre emplacement, borne de l'invariant.
- [x] L521 M9 : « - Tout le non normatif vit sous `samples` et `variants[].sample`, et nulle part » Conservé : l'exclusion écarte tout autre emplacement, borne de l'invariant.
- [x] L526 M1 : « un catalogue à part, et non un champ dans `variantViews`. » Conservé : l'exclusion écarte le champ dans variantViews, borne de l'invariant.
- [x] L549 M10 : « dépendance, parce que c’est elle qui a élu son wrapper, du même geste que » Conservé : phrase réécrite.
- [x] L580 M10 : « schema`, jamais rédigé. Il décrit la forme, pas la cohérence : il ignore les » Conservé : l'exclusion écarte la cohérence.
- [x] L604 M5 : « dessus ne prouverait que sa propre immobilité. Ce que le moteur fabrique se juge »
- [x] L607 M8 : « **Le lecteur, lui, pose la question inverse.** `` porte un corpus de la version **précédente**, quatre contrats 11.0, et c’est néc »
- [x] L609 M1 : « quatre contrats 11.0, et c’est nécessaire : la fenêtre de lecture à deux »
- [x] L610 M5 : « versions n’est observable qu’à partir de contrats que le moteur ne sait plus »
- [x] L616 M8 : « Ses empreintes SHA‑256, dans le README voisin, sont ce qui empêche de le croire frais ; - il **disparaît** quand la fenêtre de lec »
- [x] L626 M8 : « `` est l’unique autorité sur les lois de forme d’un contrat, et `` les applique à chaque contrat que le moteur fabrique : renvois  »
- [x] L635 M1 : « La vérification est posée sur le chemin d’appel, une fois, et non à chaque » Conservé : l'exclusion écarte le placement par scénario, borne de l'invariant.
- [x] L635 M8 : « La vérification est posée sur le chemin d’appel, une fois, et non à chaque scénario : un cas ajouté demain y est soumis sans que p » Conservé : l'exclusion écarte le placement par scénario, borne de l'invariant.
- [x] L638 M9 : « C’est aussi là que vit la seule question que le schéma ne peut pas trancher »
- [x] L639 M1 : « seul : accepte-t-il ce que le moteur écrit, et non ce que `types.ts` déclare ? » Conservé : l'exclusion écarte la déclaration de types.ts, borne de la question.
- [x] L645 M8 : « `` couvre le moteur sur ses propres sorties, les lecteurs sur des contrats fabriqués, le CLI et l’adaptateur sur des fixtures, et  »
- [x] L655 M1 : « aux cinq fichiers qu’`ucm init` écrit, et c’est ce qui rend la recette probante : » Conservé : phrase réécrite.
- [x] L655 M10 : « aux cinq fichiers qu’`ucm init` écrit, et c’est ce qui rend la recette probante : » Conservé : phrase réécrite.
- [x] L658 M9 : « qui la suit vivent dans docs/RECETTE.md. »

## docs/FORMAT.md

- [x] L6 M9 : « vit dans CONCEPT.md ; la façon dont le plugin lit Figma pour »
- [x] L7 M9 : « produire tout ceci vit dans »
- [x] L32 M8 : « Celui qui installe `` emploie `` ; celui qui écrit la sienne applique la même règle, décrite ici pour qu'une copie dans une autre  »
- [x] L44 M1 : « Aucune convention de nommage n'est imposée aux couleurs de variante, et aucun »
- [x] L44 M8 : « Aucune convention de nommage n'est imposée aux couleurs de variante, et aucun renommage n'est demandé au designer : le dernier seg »
- [x] L48 M9 : « et son pourquoi vivent en 2. Tokens de variantes. »
- [x] L63 M8 : « - une valeur reliée à une variable se publie, comme référence de token ; - une valeur figée qu'aucune variable ne nomme avertit et »
- [x] L71 M8 : « Deux règles auto-détectées : - *Convention State* : un axe ``/`` décrit des états d'interaction dérivés du runtime (hover, focus…) »
- [x] L71 M8 : « La convention porte sur un **axe**, donc sur le seul type `` : une ``, une ``, un `` ou un `` que le designer a nommé `` ou `` res »
- [x] L88 M1 : « indexe les arbres de variantes. C'est donc là, et non dans `props`, que sa »
- [x] L108 M1 : « | enum | la règle `@default` du frame `<Nom>-Rules`, et elle seule | oui, et c'est le cas courant | »
- [x] L124 M1 : « applique sont deux décisions distinctes, et aucun outil ne les arbitre. Le »
- [x] L152 M8 : « Ce que la couleur peint se lit sur le **calque qui la porte**, jamais sur son nom : un `` sur un texte est un ``, sur un calque dé »
- [x] L153 M10 : « couleur peint se lit sur le **calque qui la porte**, jamais sur son nom : un »
- [x] L161 M8 : « Un design system reste libre de nommer ses rôles (``, ``, ``, ``, ``) : cette **déclaration fait autorité** sur la déduction, et c »
- [x] L163 M1 : « autorité** sur la déduction, et c'est le seul moyen de distinguer un `ring` d'un »
- [x] L164 M10 : « `border`. Elle se lit sur le dernier segment du **token**, jamais sur la clé »
- [x] L180 M8 : « **Une clé que deux couleurs partagent s'allonge.** Deux calques d'un même variant dont les variables finissent par le même segment »
- [x] L189 M8 : « Le choix des segments est décidé **une seule fois pour tout le composant**, et `` en est l'unique autorité : il décide sur des feu »
- [x] L216 M9 : « vit précisément sur son tracé. Situer cette couleur sur le slot de l'icône est »
- [x] L217 M1 : « la seule lecture qui laisse le consommateur la peindre, et c'est de toute façon »
- [x] L221 M1 : « tracés, et aucun geste du designer ne l'en ferait changer. Chaque feuille décrit »
- [x] L242 M10 : « est une donnée structurelle Figma, pas un token, jamais d'accolades. Une largeur »
- [x] L248 M9 : « vivent dans le champ séparé `strokes` de chaque variant pour que `tokens` reste »
- [x] L287 M5 : « contrat ne saurait pas écrire. Elle garde donc l'exigence d'une variable unique, »
- [x] L290 M8 : « **Un tracé n'est pas une boîte.** Sur un ``, un ``, un `` ou un ``, la largeur et la hauteur sont celles que Figma calcule sur la  »
- [x] L292 M10 : « sur la géométrie du chemin : c'est le dessin, pas une décision du design system. »
- [x] L299 M8 : « - **pas d'auto-layout** (``, ou un node qui n'en a pas), gap et paddings restent absents et un warning unique par calque dit au de »
- [x] L299 M8 : « Le `` reste donc absent, mais `` décrit la répartition ; une liaison conservée sur `` ne produit ni token ni warning ; - **auto la »
- [x] L301 M10 : « que leur absence **ne vaut pas zéro** ; c'est ce qui permet à un consommateur »
- [x] L311 M1 : « sans aucun effet : le `gap` reste absent, et rien n'est signalé, il n'y a »
- [x] L330 M8 : « Lorsqu'un axe `` ou `` est présent, le contrat ajoute `` avec le déclencheur et, si une règle `` la déclare, la description de cha »
- [x] L354 M8 : « `` = enfants directs réels du node de layout : - calque **texte** → slot `` (nom d'origine dans ``) ; son style est situé par la ` »
- [x] L363 M8 : « **La descente ne connaît ni profondeur, ni nature de composant.** Un calque est un conteneur dès qu'un de ses descendants porte un »
- [x] L363 M8 : « Un auto layout dans un auto layout dans une grille est donc décrit jusqu'au bout, chaque niveau avec son ``, son ``, son ``, son ` »
- [x] L363 M8 : « Une feuille dit son nom, sa taille, ses bornes et sa place dans le flux ; elle ne sait dire ni la disposition interne, ni les coul »
- [x] L375 M1 : « variable, et non le type du node, est le signal : le contrat décrit ce que le »
- [x] L381 M10 : « Un conteneur publie **tous** ses calques rendables, jamais une sélection : un »
- [x] L390 M8 : « ``, ``, `` et `` sont relevés dès que le conteneur est un auto layout linéaire ; ``, ``, ``, ``, `` et `` dès qu'il est une grille »
- [x] L403 M8 : « **Deux enfants d'un même parent ne portent jamais le même slot.** Le numéro se cherche parmi les slots déjà attribués sous ce pare »
- [x] L404 M1 : « cherche parmi les slots déjà attribués sous ce parent, et non sur le compte des »
- [x] L425 M8 : « L'égalité stricte reste l'unique règle de partage, appliquée à chaque partie : aucun merge, défaut ou héritage ne peut masquer une »
- [x] L436 M1 : « la même `st1`, et aucun n'a de typographie à cataloguer : »
- [x] L454 M8 : « Le nommer par son rôle le rend **stable sur toute la matrice** : des icônes qui s'excluent entre variants (`` en info, `` en succe »
- [x] L461 M8 : « La liaison peut être portée par un descendant : elle est remontée sur le slot uniquement si ce descendant contrôle tout son conten »
- [x] L480 M8 : « Sur un auto-layout `` ou ``, le contrat publie toujours les deux alignements du conteneur : `` devient `` (`` → ``, `` → ``, `` →  »
- [x] L501 M8 : « **Une absence de dimensionnement vaut ``.** Le contrat ne publie que les exceptions, et cette lecture est valide parce que les deu »
- [x] L545 M10 : « Le dimensionnement est lu sur le variant, jamais sur le wrapper de layout, et »
- [x] L577 M1 : « Le calcul passe par le **centre** du layer, et c'est ce qui le rend juste pour »
- [x] L577 M10 : « Le calcul passe par le **centre** du layer, et c'est ce qui le rend juste pour »
- [x] L585 M8 : « Une rotation est une décision de design comme une autre (un badge incliné, un chevron retourné) et le contrat l'écrit, ``, sur le  »
- [x] L589 M1 : « Reste un écart que CSS ne comble pas, et c'est ici qu'il est écrit, pas dans un »
- [x] L589 M8 : « Reste un écart que CSS ne comble pas, et c'est ici qu'il est écrit, pas dans un diagnostic d'export : dans un auto layout, Figma e »
- [x] L602 M8 : « **Sous une grille, c'est la cellule qui décide de la boîte.** Remplir sa cellule est le défaut d'un enfant de grille (`` en CSS, « »
- [x] L610 M8 : « Un enfant explicitement aligné fait exception, avec le même mot qu'en CSS : il ne s'étire plus, sa dimension redevient la sienne,  »
- [x] L626 M8 : « **Cette exception s'étend de la piste à la cellule, et là seulement.** Une piste `` est le seul endroit d'une grille où la cellule »
- [x] L628 M9 : « `GridTrackSize.value` n'existe que sur `FIXED` et `FLEX`, et la mesure ne vit »
- [x] L634 M8 : « Et l'exception tient à ce que le panneau affiche « Fill », qu'un alignement explicite retire : l'enfant reprend alors la règle com »
- [x] L649 M5 : « **Ce que Figma porte et que le schéma ne sait pas écrire** avertit plutôt que de »
- [x] L654 M8 : « La grille n'est pas concernée : elle est décrite ; - les bornes d'un calque intermédiaire, entre le composant et ses slots, n'ont  »
- [x] L671 M8 : « Le `` est le seul de cette liste dont le contrat ne perd pas la propriété mais en **invente** une : la couleur du calque masquant  »
- [x] L683 M8 : « Rien n'est exporté et rien n'est signalé : il n'y a pas de deuxième ligne, donc rien ne manque ; - **champ synchronisé** : `` ne r »
- [x] L690 M5 : « répartit lui-même l'espace entre les lignes. Aucun champ ne sait l'écrire, à la »
- [x] L698 M8 : « - `` → politique d'icône dans `` : - **Déclaration**, la variante de règle contient un calque texte `` (nom exact du calque graphi »
- [x] L698 M8 : « Les occurrences répétées d'un même calque à travers la matrice sont résumées, tandis que plusieurs occurrences dans un même varian »
- [x] L698 M8 : « Sinon, le nom synthétique suit le BOOLEAN de visibilité quand le calque graphique lie `` à l'un d'eux (`` → ``, qui se lisent alor »
- [x] L698 M8 : « Un calque situé hors de ce conteneur n'occupe aucun slot ; un slot ou une taille qui change selon les variants, y compris une tail »
- [x] L713 M9 : « l'axe là où il vit. Un nom ou une valeur introuvable reste un warning. »
- [x] L722 M1 : « `values` produisent chacun un warning, et rien n'est publié. »
- [x] L741 M1 : « le variant de référence n'apparaît dans aucun slot, et sans eux le contrat »
- [x] L768 M1 : « En résumé, trois responsabilités distinctes, et c'est bien parce qu'elles »
- [x] L793 M8 : « Autour de lui, le contrat dit **quand** rendre l'icône (``), **où** (``, et `` par vue exacte), **si** le consommateur a le droit  »
- [x] L800 M8 : « **Ce qu'il ne garantit pas, et ne garantira pas.** Il ne nomme aucun jeu d'icônes ; il ne porte aucune correspondance entre `` et  »
- [x] L809 M1 : « *Ce que cela donne concrètement chez un consommateur*, et c'est l'ordre de »
- [x] L809 M8 : « *Ce que cela donne concrètement chez un consommateur*, et c'est l'ordre de grandeur du travail attendu : le repository de référenc »
- [x] L817 M8 : « **La contrepartie de cette responsabilité est ``.** Une responsabilité qu'on confie sans la rendre visible est une responsabilité  »
- [x] L827 M8 : « Le contrat publie aussi le mapping générique des rôles vers les propriétés de rendu : ``, avec `` → ``, `` → ``/``, `` → ``, `` →  »
- [x] L831 M8 : « **Une clé de couleur n'est pas un rôle**, et `` porte la part propre au composant : le rôle de chaque clé observée qui n'en porte  »
- [x] L851 M8 : « Pour un rôle avec ``, les `` sont le rendu candidat et le `` le rendu **recommandé** dès que la fidélité l'exige : un `` aligné `` »
- [x] L857 M8 : « **Aucun rôle de contour ne cite une propriété qui consomme la boîte.** Le rôle `` se rend donc avec ``, et `` en donne la forme, ` »
- [x] L896 M10 : « `args` est une projection fermée de l'API publique, jamais une copie libre de »
- [x] L896 M8 : « Pour une dépendance, le moteur lit d'abord les propriétés de son owner, puis celles de l'unique occurrence exposée qui appartient  »
- [x] L907 M8 : « Le **relevé positionnel nu** suit la visibilité **effective** de l'instantané : le calque et tous ses parents jusqu'à la racine du »
- [x] L909 M1 : « être visibles, et non jusqu'à l'instance de dépendance, car un cadre optionnel »
- [x] L915 M10 : « C'est ce qui explique l'exception apparente d'`args` : le texte d'une TEXT »
- [x] L915 M8 : « C'est ce qui explique l'exception apparente d'`` : le texte d'une TEXT property et le composant d'un INSTANCE_SWAP sont bien affic »
- [x] L926 M10 : « variant, pas la réunion de ce que la maquette pourrait montrer. »
- [x] L931 M1 : « `figmaLayer` sur chacun de ses slots, et c'est la clé de jointure. D'où »
- [x] L935 M8 : « **La frontière avec la composition.** Le parent ne réexporte pas les internes d'une dépendance, et ce que `` publie n'en est pas : »
- [x] L943 M1 : « par Figma les `fills` des `Vector` du nouveau tracé, et rien ne distingue ce »
- [x] L947 M8 : « **Ce que `` ne peut pas voir : ``.** Figma ne rapporte pas un remplacement d'instance, `` ne contenant pas ``, et la prop d'icône  »
- [x] L958 M10 : « - la comparaison porte sur le composant **propriétaire**, non sur la variante : »
- [x] L958 M8 : « - la comparaison porte sur le composant **propriétaire**, non sur la variante : choisir une autre variante d'un même component set »
- [x] L958 M8 : « Cette borne est propre au positionnel : la résolution nominale d'une INSTANCE_SWAP, joindre `` à une propriété déclarée, traverse  »
- [x] L973 M8 : « `` nomme les calques du maître, pas ceux de l'instance : Figma renomme le calque qu'on remplace d'après son nouveau composant, si  »
- [x] L977 M1 : « `icons.*.figmaName`. C'est ce nom distinct, et non `figmaPath`, qui empêche le »
- [x] L977 M10 : « `icons.*.figmaName`. C'est ce nom distinct, et non `figmaPath`, qui empêche le »
- [x] L980 M8 : « Lorsque la dépendance déclare une INSTANCE_SWAP sur ce calque, elle en a un, et son contrat en tire une prop : `` pose alors `` su »
- [x] L1004 M8 : « - une prop d'une dépendance portée par son wrapper de dimensions quand Figma n'expose pas exactement une occurrence de ce wrapper  »
- [x] L1011 M1 : « reconstruite à la volée, qui ignorerait le wrapper ; »
- [x] L1014 M1 : « `args`, et c'est précisément pourquoi `swaps` existe ; »
- [x] L1015 M9 : « - un remplacement dont le composant maître est illisible, qui vit sous un »
- [x] L1031 M10 : « **La reconstruction est un zipper récursif, pas une recherche globale.** Pour »
- [x] L1031 M8 : « **La reconstruction est un zipper récursif, pas une recherche globale.** Pour chaque variant, le consommateur résout d'abord sa vu »
- [x] L1031 M8 : « Le consommateur ouvre alors le contrat de cette dépendance, choisit son variant depuis les valeurs connues de ``, applique son pro »
- [x] L1038 M5 : « contrat de cette dépendance, choisit son variant depuis les valeurs connues de »
- [x] L1224 M9 : « La typographie suit la même discipline d'adresse unique : rien n'en vit dans »
- [x] L1244 M8 : « Ce cadre appartient à ce contrat-ci, pas au Button, et se décrit donc comme n'importe quel conteneur : son ``, son ``, son ``, sa  »
- [x] L1276 M8 : « Ce que le cadre range à côté de ses dépendances lui appartient tout autant : un tag, un texte, un dessin y sont des calques de ce  »
- [x] L1294 M1 : « contrat terminé. La séquence se lit sur chaque arbre, et non dans l'ordre où »
- [x] L1300 M8 : « Le consommateur comptant les occurrences de `` pour vérifier la parité du code, un composant qui disparaît ainsi du contrat rendra »
- [x] L1300 M8 : « Une dépendance qu'aucun arbre exact n'a su situer, par exemple rangée sous un calque masqué, sort donc des deux champs à la fois,  »
- [x] L1301 M10 : « calque masqué, sort donc des deux champs à la fois, jamais d'un seul, et un »
- [x] L1307 M8 : « Si la composition varie dans la matrice, rien n'est signalé et rien n'est perdu : `` reste la projection de référence, les vues ca »
- [x] L1312 M10 : « `figmaLayer` y nomme le calque de **l'instance**, jamais le cadre qui »
- [x] L1313 M10 : « l'enveloppe : c'est ce calque qu'on retrouve dans Figma. »
- [x] L1323 M8 : « `` porte la version du schéma (``), la date d’export, la couverture portable, les diagnostics et la traçabilité Figma : nom du fic »
- [x] L1327 M10 : « `diagnostics` documente l’export, pas le composant. Chaque entrée porte un »
- [x] L1333 M8 : « Ce qu’un lecteur doit en retenir tient en une règle : **accepter les deux formes.** Des contrats antérieurs portent l’URL, les con »
- [x] L1335 M9 : « distribution du plugin et vit [dans la spécification du »
- [x] L1357 M10 : « **référence DTCG** `"{cible}"`, jamais la valeur finale. Vaut pour COLOR comme »
- [x] L1368 M8 : « Le scope Figma précis prévaut (``, ``, `` restent des dimensions ; `` conserve son type Figma, souvent ``, que le transform de pla »
- [x] L1378 M10 : « type se décide sur la racine de la chaîne d'alias**, pas sur le token courant : »
- [x] L1378 M5 : « type se décide sur la racine de la chaîne d'alias**, pas sur le token courant : »
- [x] L1380 M1 : « chaque maillon. Ex. `lineheight` alias `spacing` (des px) → `dimension`, et non »
- [x] L1413 M9 : « `samples` est le seul champ non normatif du contrat, et il vit hors de »
- [x] L1439 M9 : « donc le seul endroit à toucher. Une phrase qui décrit **un** champ y vit ; une »
- [x] L1443 M8 : « La règle est qualitative : *un champ dont l'**absence** a une signification, ou dont la valeur oriente une décision du consommateu »
- [x] L1449 M1 : « CI, et c'est délibéré : un seuil ferait écrire des phrases pour le satisfaire. »

Les M10 et les M1 encore présents dans ce fichier après correction portent une
borne du format : l'exclusion nomme la lecture qu'un consommateur ferait sinon.
Les M8 restants sont des listes à puces que le relevé a jointes en une phrase.

## docs/notes/PISTES-EVOLUTION.md

- [x] L39 M10 : « | DTCG | Standardise l’échange des tokens entre outils | Couvre les tokens, pas la spécific »
- [x] L41 M8 : « La différenciation tient à leur combinaison : extraction déterministe depuis Figma, contrat générique par composant, co-localisé a »
- [x] L51 M8 : « **Où le gain est réel** : équipes disposant à la fois d’un design system Figma et d’une bibliothèque de composants, travaillant av »
- [x] L77 M8 : « Une propriété n’est ajoutée qu’avec : le calque qui en est propriétaire, sa forme portable, son applicabilité et ses valeurs neutr »
- [x] L125 M6 : « termes de l'arbitrage, la décision se relit mieux à côté de ce qu'elle a écarté. »
- [x] L139 M4 : « **Publier sur la Community.** N'importe qui installe le plugin et produit des »
- [x] L143 M10 : « tombe est un raccourci de navigation, pas une donnée du design. Reconstituer le »
- [x] L157 M1 : « aucun lecteur ne le réclame, et rien dans le schéma ne change : la »
- [x] L159 M1 : « ailleurs, et c'est le point suivant. »
- [x] L169 M1 : « **L'avertissement « Lien vers Figma absent » est supprimé, et c'est la moitié la »
- [x] L175 M6 : « appliquée à sa propre décision. Un état normal du format se documente une fois, »
- [x] L187 M8 : « **Ce que la décision rouvrait, et qui n'était pas technique, tranché le même jour.** Publier sur la Community met le projet devant »
- [x] L187 M8 : « **Le français reste**, et le choix est assumé plutôt que subi : le paquet npm est lu par un repository consommateur que le projet  »
- [x] L219 M10 : « pull request ou rapport CI, jamais une nouvelle vérité. Il conditionne tout »
- [x] L242 M6 : « tiennent. Ce qui manque est leur **répétabilité**, une comparaison qui se rejoue »
- [x] L247 M8 : « Deux garde-fous à ne pas perdre en l’ouvrant : elle ne doit connaître le nom d’aucun composant, et elle ne doit pas devenir une se »
- [x] L250 M1 : « implémentations divergent, et c’est la non-jetable qui deviendrait la vérité. »
- [x] L273 M10 : « Cette information appartient au consommateur, jamais à Figma : elle dépend du »
- [x] L300 M10 : « portée, pas le cœur du concept. »
- [x] L307 M8 : « `` et `` sont publiés, et l’extraction a été décidée sur l’argument inverse de celui qui la retenait : un seul consommateur ne jus »
- [x] L313 M1 : « Ce que le découpage devait **réaliser**, et non préserver, est l’autorité unique »
- [x] L315 M9 : « vit dans `@ucm-kit/core/format` : `CONTRACT_VERSION`, `codeIdentifier`, »
- [x] L317 M9 : « qui vivaient chez le consommateur sont parties, la dernière regex de référence »
- [x] L347 M5 : « sans garantir. La CI sait détecter une forme invalide, une référence de token »
- [x] L397 M10 : « | (3) → (4) | des composants s’assemblent en un écran réel, fidèle à sa maquette | **jamais tenté** : le consommateur est une gale »
- [x] L414 M8 : « Si elle casse, elle cassera à des endroits précis et instructifs : le layout de page et ses grilles, le responsive, les données ré »
- [x] L428 M8 : « Pour chacun, la même question : que voit le réexport, que dit le diff, que voit la revue, que doit faire l’agent, que doit tranche »
- [x] L435 M10 : « C’est là, et seulement là, que le diff sémantique, la parité étendue et les »
- [x] L442 M8 : « Se mesurent le nombre d’allers-retours jusqu’à un rendu accepté, les props, valeurs et tokens inventés, les écarts au design const »
- [x] L446 M10 : « tours, pas en lignes produites. »
- [x] L463 M8 : « Le consommateur actuel est un banc d’essai, pas une production : la question revient, avec `` encodant l’arbitrage designer/dévelo »
- [x] L465 M10 : « Le consommateur actuel est un banc d’essai, pas une production : la question »
- [x] L480 M8 : « **Le test de généricité du moteur** reste une famille de composants de plus, pas un champ de plus : états booléens, `` réel, `` na »
- [x] L487 M8 : « Le plugin est une implémentation d’extraction parmi d’autres possibles : un autre outil de design, un catalogue de tokens, un desi »
- [x] L495 M8 : « Mais construire d’une manière qui l’interdirait serait une erreur nette, et c’est pourquoi « le contrat ne connaît ni framework, n »
- [x] L497 M5 : « c’est pourquoi « le contrat ne connaît ni framework, ni nom de composant, ni »
- [x] L498 M10 : « représentation Figma » est un invariant, pas un goût. »
- [x] L510 M8 : « - écriture automatique du code vers Figma, et plus largement toute synchronisation bidirectionnelle, la **détection** qu’une maque »
- [x] L527 M8 : « - **Le contrat s’arrête-t-il au composant ?** Un écran est-il un composé comme un autre, ou demande-t-il un vocabulaire que le mod »
- [x] L846 M10 : « un changement visuel ; l'accepter serait une décision de revue, jamais un »
- [x] L1090 M8 : « **Capacité documentée.** MCP expose trois primitives : les outils, qui exécutent une action, les ressources, qui servent une donné »
- [x] L1161 M9 : « 2. La propriété et la lisibilité. Le contrat vit dans le repository et se lit »
- [x] L1166 M10 : « de maintenance des modules, pas à zéro. »
- [x] L1300 M5 : « Chaque paquet déclarerait les versions du kit et des outils qu'il sait »
- [x] L1369 M6 : « | 7. Déclenchement automatique | Orchestration des exports acceptés, reprise après panne et publication | La chaîne se rejoue sans »

## docs/notes/PLAN-CONFORMITE-RENDU.md

- [x] L36 M5 : « Une règle gouverne tout le reste : **aucun contrôle ne connaît le nom d'un »
- [x] L66 M8 : « Ce qui compte ici : les contrôles tournent en local pendant l'écriture et en CI au push, avec le même rapport et les mêmes mots, e »
- [x] L142 M8 : « C'est le cœur de la proposition : **une fonction qui reçoit un contrat, une combinaison et une observation normalisée du composant »
- [x] L159 M8 : « L'entrée est donc une **observation normalisée**, produite par la couche d'affichage du bloc C depuis un navigateur réel : la raci »
- [x] L171 M8 : « **Un token ne se lit pas dans une valeur calculée.** `` rend la valeur résolue, jamais la variable qui l'a produite : deux tokens  »
- [x] L172 M10 : « valeur résolue, jamais la variable qui l'a produite : deux tokens de même valeur »
- [x] L199 M1 : « | Icônes | L'icône affichée est celle que le contrat associe à cette combinaison, et pas une autre. | »
- [x] L267 M10 : « Changer de technologie plus tard revient à réécrire cette couche, jamais les »
- [x] L273 M5 : « sont le cas courant d'un vrai repository, et ce sont eux qui décident si un »
- [x] L306 M10 : « compté, jamais un silence. »
- [x] L321 M1 : « entrer dans ce message, et pas dans une sortie séparée. »
- [x] L330 M9 : « test qui a échoué. Si le vérificateur vit ailleurs, ses échecs seront présentés »
- [x] L337 M8 : « Ajouter une section « écarts de rendu » au message, avec pour chaque écart : le composant, la combinaison, ce que dit le contrat,  »
- [x] L406 M10 : « arbitrage, non un développement. »
- [x] L410 M7 : « Qui porte cette décision, et sous quel délai ? »
- [x] L525 M7 : « 10. Qui porte la décision sur le plan GitHub, et sous quel délai ? »

## .agents/skills/rediger-sans-tics-ia/SKILL.md

- [x] L33 M8 : « N'ajouter du texte que s'il apporte au moins un fait qui ne se lit pas directement dans le code ou le document voisin : un contrat »
- [x] L40 M10 : « le contrat d'une fonction exportée non triviale, pas le déroulé de son corps. »
- [x] L69 M8 : « - l'opposition décorative « ce n'est pas X, c'est Y » ; - la triade conçue pour le rythme, la question rhétorique, la métaphore, l »
- [x] L93 M1 : « Relevé : « Un même composant existe à plusieurs endroits, et rien ne garantit »
- [x] L94 M1 : « qu'ils disent la même chose. » ; « Deux commandes, et aucun script à écrire. » »
- [x] L94 M2 : « qu'ils disent la même chose. » ; « Deux commandes, et aucun script à écrire. » »
- [x] L94 M3 : « qu'ils disent la même chose. » ; « Deux commandes, et aucun script à écrire. » »
- [x] L95 M1 : « ; « `--yes` évite l'invite de confirmation de `npx`, qui bloquerait une »
- [x] L108 M2 : « Le verbe décrit la relation de loin : « dire la même chose », « rester cohérent »
- [x] L112 M2 : « Relevé : « rien ne garantit qu'ils disent la même chose ». »
- [x] L126 M3 : « Relevé : « aucun script à écrire », alors qu'aucun script n'a été mentionné. »
- [x] L137 M4 : « Un sujet humain indéfini, « personne », « quelqu'un » ou « on », occupe la »
- [x] L141 M4 : « Relevé : « une version que personne n'a essayée ». »
- [x] L151 M8 : « Un verbe mental, « changer d'avis », « savoir », « connaître », « vouloir », « décider », attaché à un contrôle, un fichier, une r »
- [x] L171 M6 : « Relevé : « Un chemin choisi trop tard se corrige donc à la main, dans le »
- [x] L205 M1 : « Relevé : « Qui répare dépend du sens de l'écart, et non de la personne qui a »
- [x] L206 M5 : « ouvert la pull request, que la CI ne connaît pas. » La CI ignore-t-elle la »
- [x] L228 M4 : « Relire le texte comme quelqu'un qui ne connaît pas la session en cours. »
