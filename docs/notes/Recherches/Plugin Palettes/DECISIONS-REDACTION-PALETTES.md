# Décisions de rédaction pour Plugin Palettes

## Autorité des textes

L’[export de validation du mainteneur](./validation-textes-palettes.json) contient 462 décisions approuvées : 445 entrées T/H, 12 choix de vocabulaire et 5 aides. Il conserve les textes saisis et les remarques sans correction.

L’[inventaire](./INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) donne les formulations à appliquer. Il intègre les décisions, l’ajustement demandé autour du mot « promesse » et les harmonisations décrites ici. Le [plan d’ergonomie](./PLAN-ERGONOMIE-PALETTES.md) détermine les emplacements et les suppressions. Valider une phrase ne rétablit pas un bloc que la recette mainteneur demande de retirer.

Ces documents préparent l’application par un agent. Les sources du plugin conservent encore leurs textes actuels. La page de relecture précédente reste liée à l’inventaire qui a produit l’export ; ne pas la régénérer en effaçant les décisions du mainteneur.

## Promesse, usage et contraste

Une **promesse d’usage** décrit une association prévue entre deux couleurs. Pour `on-solid` sur `solid`, elle signifie que le texte reste lisible sur le fond plein. Pour une bordure ou un focus, elle concerne la distinction de cet élément par rapport au fond.

Le **contraste** est la mesure de cette association. Le plugin compare son ratio au minimum demandé pour établir si la promesse est respectée. Une promesse est située : thème, profil et état interactif. Changer le fond ou les réglages oblige à la vérifier à nouveau.

La relation a donc un nom, une représentation et une mesure :

| Élément | Présentation |
|---|---|
| Sujet de la relation | Texte sur fond plein ; identifiants `on-solid` sur `solid` en complément |
| Aperçu | Un texte dans la couleur `on-solid`, réellement posé sur `solid` |
| Mesure | Contraste mesuré : 3,8:1 |
| Attente | Minimum demandé : 4,5:1 |
| Résultat | Promesse à corriger |
| Action | Ouvrir les réglages utiles à cette association |

Les nombres ci-dessus sont un exemple de rédaction, pas le résultat d’une palette mesurée.

Le titre général est « Promesses ». La liste des échecs s’appelle « Promesses à corriger ». Employer « promesse respectée » pour le résultat et « contraste mesuré » devant un ratio. Une grille qui compare librement toutes les nuances reste une « Grille de contraste » : toutes ses cases ne sont pas des promesses définies.

« Prête », explicitement conservé dans la validation, reste possible lorsque toutes les promesses sont respectées. Il accompagne le bilan et désigne la palette ouverte. Il ne remplace ni l’état d’enregistrement ni l’état du cadre Figma.

Le compteur compte les contrôles réellement évalués, chacun défini par une paire, un thème et un profil. Deux profils en échec sur la même paire comptent deux promesses à corriger, même si l’interface regroupe leur présentation dans un seul message. Le total vient du résultat du moteur.

Respecter une promesse au minimum choisi ne certifie pas un niveau d’accessibilité de l’interface entière. Le plan distingue le minimum configurable et le niveau de contraste WCAG.

## Harmonisations et réponses aux remarques

| Décision ou remarque | Traitement |
|---|---|
| V01 | « Palettes et réglages » pour le contenu enregistré et transféré ; « Réglages communs » pour le panneau de paramètres. |
| V07 | « Dérive de teinte » pour l’évolution sur la gamme ; « Décalage de teinte » pour une poignée et sa valeur en degrés. |
| T010 | « Prête » conservé avec un bilan explicite des promesses. |
| T011 et T097 | « Couleur de référence » est le libellé commun. La « couleur de base » de la recette mainteneur désigne cette même couleur, à conserver exactement. |
| T015, T016, T035, T036 | « Thème Light » et « Thème Dark » dans les contrôles de thème. |
| T080–T085 | « Nuances claires » et « Nuances sombres » aux extrémités de la dérive. « Côté Light » et « Côté Dark » laisseraient croire que les poignées règlent les deux thèmes séparément. Elles désignent les extrémités de luminosité. |
| T031 | « Récupérer sa couleur » : la sélection lit un remplissage uni. Retrouver une palette déjà créée est une autre fonction, dans l’onglet Planche. |
| T048–T050 | « Aucune palette concernée », « 1 palette concernée », « {nombre} palettes concernées ». Le code compte la portée du réglage avant une saisie ; il ne dénombre pas des modifications déjà réalisées. |
| T058–T060 | Les remarques deviennent les libellés des intensités Soft/Vivid et du retour aux réglages communs. |
| T038, T045, T155, T163, T416 | Les unités techniques quittent les titres et messages principaux. Une mesure affichée dans les détails conserve son unité ΔEok. |
| T017 | Retiré, conformément à la remarque. Le détail s’ouvre au clic ou au clavier ; l’aide au survol n’est pas remplacée par une nouvelle phrase permanente. |
| Génération | « Générer sur Figma » suit la recette mainteneur. « Afficher dans Figma » navigue vers un cadre existant. Un texte validé « Générer » ne réduit pas cette distinction. |
| Couleur de référence | Sa présence exacte est une exigence du moteur. Aucun texte ne doit appeler « couleur de référence » une nuance seulement proche. |

L’export mélange quelques textes modifiés et des approbations de textes encore contradictoires. Ces harmonisations rendent le vocabulaire cohérent ; elles ne sont pas présentées comme des phrases saisies par le mainteneur.

## Textes retirés ou déplacés

Le texte approuvé reste consultable dans l’inventaire. La règle ci-dessous détermine s’il doit encore apparaître.

| ID | Application |
|---|---|
| T017 | Retiré. Aide au survol supprimée : détails accessibles au clic et au clavier, lot R4. |
| T123 | Retiré. Ligne de part de chroma retirée de l’onglet Palettes, lot R3. |
| T158 | Retiré. Alerte sur la couleur du bouton supprimée, lot R1. |
| T159 | Retiré. Alerte sur la couleur du bouton supprimée, lot R1. |
| T160 | Retiré. Alerte sur la couleur du bouton supprimée, lot R1. |
| T188 | Retiré. Notice LEGACY retirée de l’interface et de la planche, lot R1. |
| T189 | Retiré. Notice LEGACY retirée de l’interface et de la planche, lot R1. |
| T190 | Retiré. Notice LEGACY retirée de l’interface et de la planche, lot R1. |
| T319 | Retiré. Phrase de succès retirée ; état de génération près du bouton, lot R3. |
| T320 | Retiré. Phrase de succès retirée ; état de génération près du bouton, lot R3. |
| T357 | Retiré. Mention de remplacement retirée du cadre, lot R8. La confirmation des calques ajoutés reste. |
| T375 | Retiré. Bloc Boutons retiré de la planche, lot R8. |
| T411 | Retiré. Bloc Boutons retiré de la planche, lot R8. |
| H042 | Retiré. Bloc Boutons retiré de la planche, lot R8. |
| H043 | Retiré. Bloc Boutons retiré de la planche, lot R8. |
| H044 | Retiré. Bloc Boutons retiré de la planche, lot R8. |
| H054 | Retiré. Métadonnées techniques retirées de l’en-tête imprimé, lot R8. |
| H055 | Retiré. Avertissement permanent retiré de la planche, lot R8. |
| H071 | Retiré. Empreinte de calcul sans affichage utilisateur ; ne pas en créer un texte. |
| T054 | Réglages communs : contrôle des courbes, distinct des promesses calculées sur les palettes. |
| T055 | Réglages communs : mesure des courbes ; ne pas renommer ce contraste en promesse. |
| T056 | Réglages communs : aide au réglage de luminosité. |
| T154 | Affiché à proximité des intensités concernées ; pas de bloc systématique en tête de palette. |
| T155 | Mesure précise et unité ΔEok dans les détails uniquement. |
| T156 | Lien vers les intensités locales si personnalisées, sinon vers les réglages communs. |
| T163 | Distance et unité ΔEok dans les détails ; les deux palettes restent nommées. |
| T174 | Remplacé dans l’affichage courant par un repère sur le réglage d’intensité ; disponible dans les détails. |
| T175 | Disponible dans les détails du réglage d’intensité ; pas de notice permanente. |
| T176 | Action locale du réglage d’intensité. |
| T038 | Unité ΔEok dans l’aide du champ, absente du titre. |
| T045 | Unité ΔEok dans l’aide du champ, absente du titre. |
| T314 | Version et empreinte restent dans les données et les détails techniques. |
| T330 | Exception Figma réservée au détail technique ; titre et action restent visibles. |
| T351 | Écart de génération : conserver le nombre de couleurs, distinct d’une promesse. |
| T352 | Écart de génération : conserver le nombre de couleurs, distinct d’une promesse. |
| T388 | Nombre calculé, jamais figé à 56 ; aucun identifiant technique dans l’en-tête imprimé. |
| T390 | Part d’intensité retirée de la rangée, conservée dans le réglage. |
| T394 | Mesure avancée ; pas de ligne permanente sous chaque pastille. |
| T395 | Mesure avancée ; pas de ligne permanente sous chaque pastille. |
| T396 | Mesure avancée ; pas de ligne permanente sous chaque pastille. |
| T404 | Mesures avancées regroupées ; ne pas recopier cette ligne dense dans l’en-tête du cadre. |
| T405 | Le bloc de référence final donne les nuances porteuses réelles par thème ; avant R1b, ne pas présenter la nuance proche comme identique. |
| T416 | Remplacé sur la planche par la légende utile aux promesses ; mesures de proximité dans les détails de configuration. |
| T417 | Valeurs accessibles dans les réglages ; retirer cette phrase de la légende imprimée. |
| H001 | Libellé fourni par Palettes au socle partagé. |
| H002 | Libellé fourni par Palettes au socle partagé. |
| H003 | Libellé fourni par Palettes au socle partagé. |

## Règles à proposer pour les skills de rédaction

Les problèmes relevés sont observables dans ce corpus. Ils ne permettent pas d’attribuer chaque phrase à un modèle particulier. Les règles ci-dessous visent le résultat, quel que soit le rédacteur.

| Problème observé | Exemple actuel | Règle proposée | Contrôle de relecture |
|---|---|---|---|
| Vocabulaire du stockage exposé | « rangement », « recette rangée » | Nommer l’objet manipulé par le designer et le geste visible. | Le lecteur retrouve-t-il cet objet dans l’écran ? |
| Métaphore sans relation nommée | « 1 promesse manquée » seul | Une promesse doit nommer l’association concernée et afficher son résultat. | Le lecteur peut-il montrer les deux couleurs concernées ? |
| Mesure sans signification | « 0,012 ΔEok, sous 0,02 » | Dire d’abord ce qui se ressemble, manque ou change. Réserver la mesure aux détails. | Sans le nombre, comprend-on encore le problème ? |
| Liste de valeurs sans libellés | « fond 1,00 – noir 19,59 » | Toute valeur visible nomme sa mesure, sa référence et, si nécessaire, son unité. | Peut-on dire à quoi correspond chaque nombre ? |
| Action vague ou trop dispersée | « Réglez la dérive ou les parts… ou la courbe… » | Donner le geste adapté au cas et un accès direct à son contrôle. | L’action proposée ouvre-t-elle le bon réglage ? |
| Résultat confondu avec une portée | « palettes touchées », « palettes modifiées » | Distinguer la portée d’un réglage, son application et son enregistrement. | Le temps de la phrase correspond-il à l’état réel ? |
| Cause supposée | « par un autre designer ou par une annulation » | Ne nommer une cause que si le code l’établit. | Quelle donnée prouve la cause annoncée ? |
| Niveau de garantie exagéré | « Prête » ou « AA » sans portée | Situer le verdict : promesse, paire, type de texte ou génération. | Le texte pourrait-il être compris comme une certification globale ? |
| Phrase qui compense une interface manquante | Longue explication de soft et vivid | Préférer un aperçu comparatif et le réglage concerné ; garder une aide à la demande. | L’utilisateur peut-il comprendre en agissant ? |
| Traductions incohérentes | « référence », « base », « départ » pour un même champ | Utiliser un glossaire d’affichage et conserver les identifiants techniques séparément. | Le même objet garde-t-il le même nom dans le plugin et la planche ? |

Répartition proposée : ajouter à [rediger-sans-tics-ia](../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md) la procédure qui identifie le public, le contexte, le vocabulaire et le temps de l’action. Placer les règles de diagnostic dans [rediger-diagnostics-ucm](../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md), en accord avec [CONTRIBUTING.md](../../../../CONTRIBUTING.md#messages-destinés-au-designer).

Les contrôles automatiques peuvent repérer un terme retiré ou un libellé incohérent. Ils ne peuvent pas déterminer seuls si une action est pertinente ou si une promesse est compréhensible. La relecture doit se faire avec le texte rendu dans son contexte.

Les skills ne sont pas modifiées par cette proposition.

