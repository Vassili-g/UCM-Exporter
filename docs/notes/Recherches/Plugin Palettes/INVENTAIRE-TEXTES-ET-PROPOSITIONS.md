# Plugin Palettes : inventaire des textes et propositions

**Statut : validation du mainteneur intégrée.** Les 462 décisions de l’[export de validation](./validation-textes-palettes.json) sont prises en compte. La colonne « Proposition » donne désormais le texte retenu, avec les ajustements demandés sur les promesses et la cohérence du vocabulaire. Les textes retirés par la recette mainteneur sont marqués ; les conditions d’affichage sont précisées dans les [décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md). L’application au plugin appartient au plan d’ergonomie.

La [page de relecture](./relecture-textes/index.html) présente les propositions une par une et conserve les décisions. Son [mode d’emploi](./relecture-textes/README.md) explique comment exporter les choix.

## Périmètre et mode de lecture

L’inventaire comprend **445 entrées** : 372 chaînes ou fragments de `ui/textes.ts` et 73 entrées complémentaires. Un message composé de trois parties compte trois entrées. Les variantes au singulier et au pluriel restent séparées. Ce nombre ne désigne donc ni 445 messages indépendants ni 445 formulations différentes.

Le relevé porte sur les sources du plugin, ses dépendances locales `ucm-couleur` et `ucm-plugin-socle`, son manifeste et son titre HTML. Il comprend les textes visibles, les libellés accessibles, les infobulles, les confirmations, les erreurs, les textes de la planche et les noms de calques générés. Les noms des téléchargements et la description du paquet figurent aussi dans les compléments.

Les documents Markdown, commentaires de code, noms de tests, messages des scripts de développement et textes du banc de galerie sont hors périmètre. Les fichiers compilés reproduisent les sources : ils ne constituent pas des textes supplémentaires. Les exceptions internes qui n’aboutissent pas à un message du plugin sont également exclues.

Les noms saisis par le designer, codes couleur, nombres et messages fournis par Figma ont une infinité de valeurs possibles. Leurs formats d’affichage sont répertoriés, sans inventer une liste de valeurs.

- **Texte actuel** reproduit la chaîne du code, avec ses espaces et sa ponctuation. Les expressions `${…}` restent exactes pour permettre une vérification. `\n` indique un saut de ligne.
- **Proposition** contient le nouveau texte à lire. Les accolades nomment les valeurs à insérer, par exemple `{palette}` ou `{contraste}`. Elles ne seront pas affichées.
- **Référence** donne le fichier, la ligne et la fonction ou la propriété. Le lien ouvre le fichier ; le numéro indique la ligne à consulter dans la version inventoriée.
- Les identifiants `T…` servent à commenter les propositions. Les numéros manquants correspondent aux chaînes de programmation écartées : séparateurs, clés de branchement, types et valeurs vides sans message. Les compléments portent un identifiant `H…`.

Les mots usuels qui conviennent déjà, comme « Annuler », sont conservés après relecture. Les noms propres, valeurs et signes ne sont pas remplacés par des synonymes artificiels.

## Vocabulaire retenu

| Terme actuel | Terme proposé | Sens conservé |
|---|---|---|
| Recette | Palettes et réglages | L’ensemble contient les palettes et les paramètres communs. |
| Configuration de la recette | Réglages communs | Les paramètres partagés par les palettes. |
| Cran | Nuance ; numéro de nuance lorsqu’on parle de 50, 100 ou 700 | Une position numérotée dans une gamme. |
| Rampe | Gamme de nuances | Les couleurs produites pour un profil et un thème. |
| Clarté | Luminosité ; luminosité L dans les mesures | La composante L du modèle OKLCH employé par le plugin. |
| Part de chroma | Intensité | La proportion de chroma disponible en sRGB pour une luminosité et une teinte données. Ce réglage reste entre 0 et 1. |
| Dérive | Dérive de teinte ; décalage pour l’angle d’une poignée | Le changement de teinte vers le côté clair ou sombre. |
| Promesse | Promesse d’usage ; contraste pour la mesure qui la vérifie | Un contrôle entre deux couleurs pour un usage donné. |
| Emploi | Usage ; rôle pour l’identifiant technique | La fonction de la couleur dans un composant. |
| Ranger | Enregistrer | La sauvegarde des données dans le fichier Figma. |
| Dessiner / redessiner | Générer / mettre à jour | La création ou le remplacement des cadres sur la planche. |
| soft / vivid | soft (doux) / vivid (vif) dans les sélecteurs | Les clés restent `soft` et `vivid` dans les données et les noms techniques. |

« Intensité » désigne ici une proportion de chroma disponible. Une aide courte est proposée plus bas pour expliquer ce réglage sans imposer la formule au designer.

« Prête » accompagne le bilan des promesses respectées. Une promesse décrit un usage entre deux couleurs ; son contraste mesuré permet de la vérifier. Le bilan ne certifie pas l’accessibilité d’une interface complète.

## Sources et surfaces contrôlées

| Source | Textes concernés |
|---|---|
| [textes.ts](../../../../packages/plugin-palettes/src/ui/textes.ts) | Libellés, états, erreurs, confirmations, mesures et textes de la planche. |
| [Interface](../../../../packages/plugin-palettes/src/ui/index.ts) | En-tête, onglets et téléchargements. Les autres fichiers d’interface consomment les textes répertoriés ; leurs exceptions figurent sous H. |
| [Modèle de planche](../../../../packages/plugin-palettes/src/planche/modele.ts) | Assemblage des textes, noms de calques, noms de fonds et valeurs de remplacement. |
| [Écriture de la planche](../../../../packages/plugin-palettes/src/ecriture/planche.ts) | Noms des pages Figma et transmission des erreurs de création. |
| [En-tête partagé](../../../../packages/plugin-socle/src/ui/EnTete.ts) | Configuration, retour et libellé du bouton accessible. |
| [Profils et modes](../../../../packages/couleur/src/rampe.ts), [usages](../../../../packages/couleur/src/emplois.ts) | Identifiants affichés directement dans les sélecteurs, les cartes et les tableaux. |
| [Rapport](../../../../packages/plugin-palettes/src/rapport.ts), [export des fichiers](../../../../packages/plugin-palettes/src/ui/index.ts) | Le rapport téléchargé contient des données JSON et des codes, sans phrases rédigées. Ses clés ne sont pas des textes d’interface à traduire. |
| [Manifeste](../../../../packages/plugin-palettes/manifest.json), [HTML](../../../../packages/plugin-palettes/src/ui/index.html), [paquet](../../../../packages/plugin-palettes/package.json) | Nom du plugin, titre de fenêtre et description du paquet. |

Les profils s’affichent notamment dans [le nuancier](../../../../packages/plugin-palettes/src/ui/nuancier.ts), [les réglages communs](../../../../packages/plugin-palettes/src/ui/configuration.ts), [les réglages de palette](../../../../packages/plugin-palettes/src/ui/intensites.ts) et [l’éditeur de teinte](../../../../packages/plugin-palettes/src/ui/derive/editeur.ts). Les propositions H012 et H013 concernent tous ces usages.

## Textes du fichier central

Les parties `ou`, `quoi` et `geste` se lisent ensemble, dans cet ordre. Les fragments tels que le nom d’un thème ou un suffixe d’état prennent place dans les messages qui les emploient.

### Navigation, création et sélection

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T001 | [L25](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.titre ` | ` UCM Palettes ` | UCM Palettes |
| T002 | [L26](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.titreConfiguration ` | ` Configuration de la recette ` | Réglages communs |
| T003 | [L27](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.etiquetteDesOnglets ` | ` Vues du plugin ` | Navigation du plugin |
| T004 | [L28](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.ongletPalettes ` | ` Palettes ` | Palettes |
| T005 | [L29](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.ongletPlanche ` | ` Planche ` | Planche |
| T006 | [L30](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.lectureEnCours ` | ` Lecture de la recette du fichier… ` | Chargement des palettes et des réglages… |
| T007 | [L31](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.recetteAbsente ` | ` Aucune recette dans ce fichier : la recette par défaut s’appliquera à la première palette. ` | Créez votre première palette. Les réglages par défaut seront utilisés. |
| T008 | [L32](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.choisirUnePalette ` | ` Choisir la palette ouverte ` | Choisir une palette |
| T009 | [L33](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.dessiner ` | ` Dessiner ` | Générer sur Figma |
| T010 | [L34](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.prete ` | ` Prête ` | Prête |
| T011 | [L35](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.reference ` | ` Référence ` | Couleur de référence |
| T012 | [L36](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.nom ` | ` Nom ` | Nom de la palette |
| T013 | [L37](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.apercu ` | ` Aperçu des rampes ` | Aperçu des nuances |
| T014 | [L38](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.modesDeLApercu ` | ` Mode de l’aperçu ` | Thème de l’aperçu |
| T015 | [L39](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.modeClair ` | ` Clair ` | Thème Light |
| T016 | [L40](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.modeSombre ` | ` Sombre ` | Thème Dark |
| T017 | [L41](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.detailParDefaut ` | ` Survolez une pastille pour lire son hexa, ses contrastes et ses emplois. ` | **Retiré de l’affichage.** Survolez une couleur pour afficher son code hexadécimal, ses contrastes et ses usages. |
| T018 | [L42](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.titrePromesses ` | ` Promesses manquées ` | Promesses à corriger |
| T019 | [L43](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.titreAlertes ` | ` Alertes ` | Points à vérifier |
| T020 | [L44](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.titreNotices ` | ` Notices ` | À savoir |
| T021 | [L45](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.nouvellePalette ` | ` Nouvelle palette ` | Ajouter une palette |
| T022 | [L46](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.creer ` | ` Créer ` | Créer la palette |
| T023 | [L47](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.depuisLaSelection ` | ` Depuis la sélection ` | Utiliser la couleur sélectionnée dans Figma |
| T024 | [L48](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.annuler ` | ` Annuler ` | Annuler |
| T025 | [L49](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.gestesDeLaPalette ` | ` Gestes de la palette ` | Actions sur la palette |
| T026 | [L50](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.dupliquer ` | ` Dupliquer ` | Dupliquer la palette |
| T027 | [L51](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.monter ` | ` Monter ` | Déplacer vers le haut |
| T028 | [L52](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.descendre ` | ` Descendre ` | Déplacer vers le bas |
| T029 | [L53](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.supprimer ` | ` Supprimer ` | Supprimer la palette |
| T030 | [L54](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.recharger ` | ` Recharger ` | Recharger les palettes |
| T031 | [L55](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.selectionVide ` | ` Aucun calque n’est sélectionné dans Figma. ` | Sélectionnez un calque dans Figma pour récupérer sa couleur. |
| T032 | [L56](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES.selectionSansRemplissage ` | ` Aucun calque sélectionné ne porte un remplissage uni, visible et opaque. ` | Sélectionnez un calque avec une couleur de remplissage unie, visible et sans transparence. |

### Réglages communs et contrôle des courbes

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T033 | [L61](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.courbes ` | ` Courbes de clarté ` | Luminosité des nuances |
| T034 | [L62](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.cran ` | ` Cran ` | Nuance |
| T035 | [L63](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.clair ` | ` Clair ` | Thème Light |
| T036 | [L64](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.sombre ` | ` Sombre ` | Thème Dark |
| T037 | [L65](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.parts ` | ` Parts de chroma ` | Intensité des couleurs |
| T038 | [L66](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.seuilProfilsConfondus ` | ` Seuil des profils confondus (ΔEok) ` | Écart minimal entre soft et vivid |
| T039 | [L67](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.fonds ` | ` Fonds de référence ` | Couleurs de fond |
| T040 | [L68](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.fondDuMode.light ` | ` Fond clair ` | Fond du thème Light |
| T041 | [L68](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.fondDuMode.dark ` | ` Fond sombre ` | Fond du thème Dark |
| T042 | [L69](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.seuilsDeContraste ` | ` Seuils de contraste ` | Contrastes minimums |
| T043 | [L70](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.seuilTexte ` | ` Texte ` | Texte |
| T044 | [L71](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.seuilNonTexte ` | ` Non-texte ` | Éléments graphiques |
| T045 | [L72](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.seuilPalettesProches ` | ` Seuil des palettes proches (ΔEok) ` | Écart minimal entre deux palettes |
| T046 | [L73](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.seuilChromaGrise ` | ` Chroma d’une référence grise ` | Seuil de détection du gris (chroma) |
| T047 | [L74](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_CONFIGURATION.sansRecette ` | ` La recette du fichier ne se lit pas : sa configuration attend une recette lisible. ` | Les palettes et les réglages enregistrés sont illisibles. Importez une sauvegarde valide pour accéder aux réglages. |
| T048 | [L79](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesTouchees ` | ` aucune palette touchée ` | Aucune palette concernée |
| T049 | [L80](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesTouchees ` | ` 1 palette touchée ` | 1 palette concernée |
| T050 | [L80](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesTouchees ` | `` `${nombre} palettes touchées` `` | {nombre} palettes concernées |
| T053 | [L90](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nombreInvalide ` | `` `« ${saisie} » n’est pas un nombre : 0,5 ou 0.5 par exemple.` `` | Saisissez un nombre, par exemple 0,5 ou 0.5. « {saisie} » n’est pas accepté. |
| T054 | [L96](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDeGarantie.ou ` | `` `Courbe ${ADJECTIF_DU_MODE[manque.mode]}, cran ${manque.cran}, ${manque.profil}` `` | Thème {mode}, nuance {cran}, profil {profil} |
| T055 | [L97](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDeGarantie.quoi ` | `` `Contre le cran 50, le contraste descend à ${ecrireContraste(manque.contraste)} à la teinte ${manque.teinte}°, pour ${seuilEcrit(manque.seuil)} garanti.` `` | Cette courbe donne un contraste de {contraste} avec la nuance 50 pour une teinte de {teinte}°. Le minimum demandé est de {seuil}:1. |
| T056 | [L98](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDeGarantie.geste ` | `` `Éloignez la clarté du cran ${manque.cran} de celle du cran 50, ou gardez la courbe en connaissance de cause.` `` | Augmentez l’écart de luminosité entre les nuances {cran} et 50. Si vous conservez ces valeurs, vérifiez les contrastes de chaque palette. |

### Réglages propres à une palette

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T057 | [L104](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_AVANCES.avance ` | ` Avancé ` | Réglages de cette palette |
| T058 | [L105](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_AVANCES.partDuProfil.soft ` | ` Part soft ` | Intensité de la palette Soft |
| T059 | [L105](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_AVANCES.partDuProfil.vivid ` | ` Part vivid ` | Intensité de la palette Vivid |
| T060 | [L106](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_AVANCES.reprendre ` | ` Reprendre les parts de la recette ` | Utiliser les réglages communs pour l’intensité |
| T062 | [L111](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` origineDesParts ` | ` Parts propres : la configuration ne touche plus les parts de cette palette. ` | Cette palette utilise ses propres intensités. Les changements d’intensité dans les réglages communs ne s’y appliquent plus. |
| T064 | [L112](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` origineDesParts ` | `` `Référence presque grise : les deux profils prennent sa part de chroma, ${nombreEcrit(part)}.` `` | La couleur de référence est presque grise. Les profils soft et vivid utilisent tous les deux son intensité : {part}. |
| T065 | [L113](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` origineDesParts ` | ` Parts de la recette : cette palette suit les parts de la configuration. ` | Les intensités de cette palette suivent les réglages communs. |

### Éditeur de variation de teinte

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T066 | [L118](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.regler ` | ` Régler ` | Configuration de la dérive |
| T067 | [L119](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.replier ` | ` Replier ` | Masquer les réglages |
| T068 | [L120](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.grisDesactive ` | ` La référence est presque grise : sa dérive ne se voit pas. ` | Le réglage de teinte est désactivé pour cette couleur presque grise. Choisissez une couleur plus saturée pour l’utiliser. |
| T069 | [L121](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.sansSegmentClair ` | ` La référence est plus claire que le bout clair de la rampe : la dérive claire n’a pas de segment à régler. ` | La couleur de référence est plus claire que toutes les nuances. Seul le réglage de teinte du côté sombre est disponible. |
| T070 | [L122](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.sansSegmentSombre ` | ` La référence est plus sombre que le bout sombre de la rampe : la dérive sombre n’a pas de segment à régler. ` | La couleur de référence est plus sombre que toutes les nuances. Seul le réglage de teinte du côté clair est disponible. |
| T071 | [L123](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.prereglage ` | ` Préréglage ` | Dérive de teinte |
| T072 | [L124](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.tailwind ` | ` Tailwind ` | Tailwind |
| T073 | [L125](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.constante ` | ` Constante ` | Teinte constante |
| T074 | [L126](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.libre ` | ` Libre ` | Personnalisée |
| T075 | [L127](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.lien ` | ` soft = vivid ` | Synchroniser la dérive de soft et vivid |
| T076 | [L128](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.profilRegle ` | ` Profil réglé ` | Profil à modifier |
| T077 | [L129](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.aligner ` | ` Aligner ` | Appliquer à soft |
| T078 | [L130](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.annuler ` | ` Annuler ` | Annuler |
| T079 | [L131](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.confirmationDuLien ` | ` Aligner soft sur vivid ? La dérive de soft sera remplacée par celle de vivid. ` | La dérive de teinte de vivid sera appliquée à soft. Les deux profils partageront ensuite les mêmes réglages. |
| T080 | [L132](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.bout.clair ` | ` Bout clair ` | Nuances claires |
| T081 | [L132](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.bout.sombre ` | ` Bout sombre ` | Nuances sombres |
| T082 | [L133](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.deriveAuBout.clair ` | ` Dérive au bout clair ` | Décalage de teinte des nuances claires |
| T083 | [L133](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.deriveAuBout.sombre ` | ` Dérive au bout sombre ` | Décalage de teinte des nuances sombres |
| T084 | [L134](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.ramenerAuPrereglage.clair ` | ` Ramener le bout clair au préréglage Tailwind ` | Rétablir la dérive Tailwind des nuances claires |
| T085 | [L134](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_DERIVE.ramenerAuPrereglage.sombre ` | ` Ramener le bout sombre au préréglage Tailwind ` | Rétablir la dérive Tailwind des nuances sombres |
| T086 | [L139](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` valeurDePoignee ` | `` `${angleEcrit(angle)}, teinte ${Math.round(teinte) % 360}°` `` | Décalage de {angle}, teinte obtenue : {teinte}° |
| T087 | [L144](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` repereTailwind ` | `` `Tailwind ${angleEcrit(angle)}` `` | Décalage Tailwind : {angle} |
| T091 | [L150](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` angleEcrit ` | `` `${signe}${ecrireArrondi(Math.abs(degres), 1)}°` `` | {angle signé}° |
| T092 | [L155](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` graduation ` | `` `${degres > 0 ? '+' : degres < 0 ? '−' : ''}${Math.abs(degres)}°` `` | {angle signé}° |
| T096 | [L160](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` etiquetteDePoignee ` | `` `${angleEcrit(angle)} · ${Math.round(teinte) % 360}°` `` | Décalage {angle} · teinte {teinte}° |
| T097 | [L165](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` infobulleDuPivot ` | `` `couleur de référence, teinte fixe, ${Math.round(teinte) % 360}°` `` | Couleur de référence : teinte {teinte}°. |

### Enregistrement, saisie et verdict

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T098 | [L170](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` STATUTS_DU_RANGEMENT.lu ` | ∅ (aucun texte) | Aucun texte affiché. |
| T099 | [L171](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` STATUTS_DU_RANGEMENT.'en-cours' ` | ` rangement… ` | Enregistrement… |
| T100 | [L172](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` STATUTS_DU_RANGEMENT.range ` | ` rangé ` | Enregistré |
| T101 | [L173](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` STATUTS_DU_RANGEMENT.refuse ` | ` non rangé ` | Non enregistré |
| T102 | [L174](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` STATUTS_DU_RANGEMENT.invalide ` | ` non rangé ` | Non enregistré |
| T103 | [L179](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nomDeLaCopie ` | `` `${nom} (copie)` `` | Copie de {nom} |
| T104 | [L184](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` hexaInvalide ` | `` `« ${saisie} » n’est pas une couleur : six chiffres hexadécimaux, #1E6FD9 par exemple.` `` | Saisissez un code couleur à 6 caractères, par exemple #1E6FD9. « {saisie} » n’est pas accepté. |
| T105 | [L189](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` confirmationDeSuppression ` | `` `Supprimer « ${nom} » ? Son cadre restera sur la planche, signalé orphelin.` `` | La palette « {nom} » sera supprimée du plugin. Sa présentation restera sur la planche, mais vous ne pourrez plus la mettre à jour. |
| T106 | [L195](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteModifieeAilleurs.ou ` | ` Recette du fichier ` | Modifications non enregistrées |
| T107 | [L196](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteModifieeAilleurs.quoi ` | ` Elle a changé depuis sa lecture, par un autre designer ou par une annulation dans Figma : votre dernière modification n’est pas rangée. ` | Les palettes ou les réglages du fichier ont changé depuis leur chargement. Votre dernière modification n’a pas été enregistrée. |
| T108 | [L197](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteModifieeAilleurs.geste ` | ` Rechargez la recette du fichier. Votre dernière modification sera perdue. ` | Rechargez les palettes pour récupérer la version du fichier. Vous perdrez la modification non enregistrée. |
| T109 | [L204](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` rangementInvalide.ou ` | ` Recette du fichier ` | Échec de l’enregistrement |
| T110 | [L206](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` rangementInvalide.quoi ` | `` `Le plugin a produit une recette invalide, qui n’a pas été rangée : ${texteDuRefus(refus[0])}` `` | Le plugin n’a pas pu enregistrer votre modification. Détail : {erreur de validation} |
| T111 | [L207](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` rangementInvalide.quoi ` | ` Le plugin a produit une recette invalide, qui n’a pas été rangée. ` | Le plugin n’a pas pu enregistrer votre modification. |
| T112 | [L208](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` rangementInvalide.geste ` | ` Rechargez la recette du fichier, puis refaites la modification. ` | Rechargez les palettes, puis refaites votre modification. |
| T113 | [L215](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` couleurRamenee.ou ` | `` `Référence ${hexa}` `` | Couleur de référence convertie : {hexa} |
| T114 | [L216](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` couleurRamenee.quoi ` | ` La couleur Display P3 de la sélection sortait du gamut sRGB : elle a été ramenée à la plus proche que sRGB porte. ` | Cette couleur Display P3 dépasse les couleurs disponibles en sRGB. Le plugin l’a ajustée pour créer une palette en sRGB. |
| T115 | [L217](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` couleurRamenee.geste ` | ` Gardez cette référence, ou choisissez une couleur que sRGB porte. ` | Vérifiez la couleur obtenue. Si elle ne convient pas, choisissez une autre couleur de référence. |
| T116 | [L229](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` verdict ` | ` 1 promesse manquée ` | 1 promesse à corriger |
| T117 | [L229](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` verdict ` | `` `${manquees} promesses manquées` `` | {nombre} promesses à corriger |

### Valeurs, états et contrastes

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T118 | [L232](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ADJECTIF_DU_MODE.light ` | ` claire ` | Light |
| T119 | [L232](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ADJECTIF_DU_MODE.dark ` | ` sombre ` | Dark |
| T120 | [L233](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOM_DU_MODE.light ` | ` clair ` | Light |
| T121 | [L233](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOM_DU_MODE.dark ` | ` sombre ` | Dark |
| T123 | [L240](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ligneDeLaPart ` | `` `part de chroma ${ecrireArrondi(part, 2)} · soft ${ecrireArrondi(soft, 2)} · vivid ${ecrireArrondi(vivid, 2)} · proche du cran ${cranProche}` `` | **Retiré de l’affichage.** Intensité de départ : {part} · soft : {soft} · vivid : {vivid} · nuance la plus proche en luminosité, thème Light : {cran} |
| T124 | [L243](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ORIGINES.tailwind ` | ` Tailwind ` | Tailwind |
| T125 | [L243](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ORIGINES.constante ` | ` Constante ` | Teinte constante |
| T126 | [L243](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ORIGINES.libre ` | ` Libre ` | Personnalisée |
| T127 | [L246](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` uneDerive ` | `` `${ORIGINES[derive.origine]} · clair ${angleEcrit(derive.clair)} · sombre ${angleEcrit(derive.sombre)}` `` | {préréglage} · nuances claires : {angle clair} · nuances sombres : {angle sombre} |
| T128 | [L252](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ligneDeLaDerive ` | `` `Dérive ${uneDerive(vivid)}` `` | Dérive de teinte : {réglages} |
| T129 | [L252](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ligneDeLaDerive ` | `` `Dérive soft ${uneDerive(soft)} ; vivid ${uneDerive(vivid)}` `` | Dérive de teinte · soft : {réglages soft} · vivid : {réglages vivid} |
| T130 | [L255](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ETATS_DU_DECALAGE ` | ∅ (aucun texte) | État par défaut : aucun suffixe. |
| T131 | [L255](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ETATS_DU_DECALAGE ` | `  survol ` | au survol |
| T132 | [L255](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ETATS_DU_DECALAGE ` | `  appui ` | à l’appui |
| T133 | [L259](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` emploiEcrit ` | `` `${emploi}${ETATS_DU_DECALAGE[decalage] ?? ` +${decalage}`}` `` | {usage traduit}{état} |
| T134 | [L259](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` emploiEcrit ` | `` ` +${decalage}` `` | (décalage de {nombre} nuances) |
| T136 | [L263](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` membre ` | ` fond ` | fond de page |
| T137 | [L278](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` seuil ` | ` – ` | Aucun minimum atteint |
| T139 | [L279](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` emplois ` | ` aucun emploi ` | Aucun usage prédéfini |
| T140 | [L283](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` detailDuCran ` | `` `fond ${ecrireContraste(detail.fond)} (${seuil})` `` | Contraste avec le fond : {contraste} · minimum atteint : {seuil} |
| T141 | [L284](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` detailDuCran ` | `` `blanc ${ecrireContraste(detail.blanc)}` `` | Avec le blanc : {contraste} |
| T142 | [L285](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` detailDuCran ` | `` `noir ${ecrireContraste(detail.noir)}` `` | Avec le noir : {contraste} |
| T147 | [L301](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDePromesse.ou ` | `` `${nom}, ${NOM_DU_MODE[mode]}, ${profil} : ${membre(paire.premier)} sur ${membre(paire.second)}` `` | {usage} sur {fond ou usage} · {palette}, thème {mode}, profil {profil} |
| T148 | [L302](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDePromesse.quoi ` | `` `Contraste ${ecrireContraste(promesse.contraste)} pour ${seuilEcrit(promesse.seuil)} demandé : le cran ${numero} ne tient pas la table des emplois.` `` | Cette association n’atteint pas le contraste demandé : {contraste}, pour un minimum de {seuil}:1. |
| T149 | [L303](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDePromesse.geste ` | `` `Réglez la dérive ou les parts de la palette, ou la courbe ${ADJECTIF_DU_MODE[mode]} dans la configuration.` `` | Ajustez l’intensité ou la dérive de teinte de cette palette, puis vérifiez cette association. Le réglage de luminosité est disponible dans les réglages communs. |

### Alertes sur les couleurs et les fonds

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T152 | [L321](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` crans ` | `` `${NOM_DU_MODE[cran.mode]} ${cran.cran}` `` | {thème} {nuance} |
| T154 | [L323](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `${contexte.nomDe(alerte.palette)}, crans ${crans}` `` | {palette} : nuances {liste des nuances et thèmes} |
| T155 | [L324](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `soft et vivid ne s’écartent que de ${ecrireArrondi(plusProche, 3)} ΔEok, sous ${ecrireArrondi(alerte.seuil, 2)}.` `` | Les couleurs soft et vivid sont très proches sur ces nuances. |
| T156 | [L325](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Éloignez les parts de chroma des deux profils dans la configuration. ` | Augmentez l’écart entre les intensités de soft et vivid. Utilisez les réglages de cette palette si elle a ses propres intensités, sinon les réglages communs. |
| T158 | [L330](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `${contexte.nomDe(alerte.palette)}, couleur de référence ${alerte.reference}` `` | **Retiré de l’affichage.** {palette} : couleur de référence {hexa} |
| T159 | [L331](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `Les boutons ne seront pas de cette couleur. Au cran 700, qui porte les boutons et les textes, elle devient ${alerte.bouton}, plus foncée.` `` | **Retiré de l’affichage.** En thème Light, le fond des boutons utilise la nuance vivid 700 : {hexa bouton}. Cette nuance est plus foncée que votre couleur de référence. |
| T160 | [L332](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Gardez cette couleur pour le logo et les aplats de charte, ou choisissez une référence plus sombre. ` | **Retiré de l’affichage.** Vérifiez la couleur proposée pour les boutons. Choisissez une couleur de référence plus sombre si vous souhaitez réduire cet écart de luminosité. |
| T162 | [L337](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `${contexte.nomDe(alerte.palettes[0])} et ${contexte.nomDe(alerte.palettes[1])}` `` | Palettes à comparer : {palette 1} et {palette 2} |
| T163 | [L338](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `Crans 500, 600 et 700 en vivid clair : ${ecrireArrondi(alerte.distance, 3)} ΔEok en moyenne, sous ${ecrireArrondi(alerte.seuil, 2)}.` `` | Les nuances vivid 500, 600 et 700 de ces deux palettes sont très proches dans le thème Light. |
| T164 | [L339](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Gardez une seule des deux palettes, ou éloignez leurs couleurs de référence. ` | Si ces palettes doivent être distinctes, modifiez leur couleur de référence. Vous pouvez aussi supprimer celle qui fait doublon. |
| T166 | [L343](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}` `` | {palette} : couleur de référence {hexa} |
| T167 | [L344](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `Chroma ${ecrireArrondi(alerte.chroma, 3)}, sous ${ecrireArrondi(alerte.seuil, 2)} : la dérive de teinte est désactivée, et les deux profils prennent la part de la référence.` `` | Cette couleur est presque grise. Le réglage de teinte est désactivé et les deux profils reprennent son intensité. Chroma : {chroma}, sous le seuil de {seuil}. |
| T168 | [L345](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Pour une rampe colorée, choisissez une référence plus saturée. ` | Choisissez une couleur de référence plus saturée pour obtenir des nuances plus colorées. |
| T170 | [L349](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}` `` | {palette} : couleur de référence {hexa} |
| T171 | [L350](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `Part de chroma ${ecrireArrondi(alerte.part, 2)}, sous celle de soft (${ecrireArrondi(alerte.partSoft, 2)}) : les deux rampes sont plus vives que la référence.` `` | Les nuances produites autour de votre couleur de référence utilisent une intensité plus élevée. Intensité de référence : {part} ; soft : {soft}. |
| T172 | [L351](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Baissez les parts de cette palette dans « Avancé », ou choisissez une référence plus saturée. ` | Réduisez les intensités dans « Réglages de cette palette » pour vous rapprocher de la couleur de référence. |
| T174 | [L355](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}` `` | {palette} : couleur de référence {hexa} |
| T175 | [L356](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `Part de chroma ${ecrireArrondi(alerte.part, 2)}, au-dessus de vivid (${ecrireArrondi(alerte.partVivid, 2)}) : la rampe vivid est un peu plus terne que la référence.` `` | Les nuances vivid produites autour de votre couleur de référence utilisent une intensité plus faible. Intensité de référence : {part} ; vivid : {vivid}. |
| T176 | [L357](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Montez la part de vivid dans « Avancé » si la rampe doit l’égaler. ` | Augmentez l’intensité de vivid dans « Réglages de cette palette » pour vous rapprocher de la couleur de référence. |
| T178 | [L361](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}` `` | {palette} : couleur de référence {hexa} |
| T179 | [L362](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `Clarté ${ecrireArrondi(alerte.clarte, 3)}, hors des bouts de la rampe (${ecrireArrondi(alerte.boutSombre, 3)} à ${ecrireArrondi(alerte.boutClair, 3)}) : un seul segment de dérive se règle.` `` | La luminosité de départ ({luminosité}) est en dehors de la plage des nuances ({minimum} à {maximum}). Vous pouvez régler la teinte d’un seul côté. |
| T180 | [L363](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Réglez la dérive du bout qui reste, ou choisissez une référence dans la rampe. ` | Utilisez le réglage encore disponible. Pour régler les deux côtés, choisissez une couleur de référence dont la luminosité se situe dans cette plage. |
| T183 | [L366](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` sens ` | ` plus sombre ` | plus sombre |
| T184 | [L366](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` sens ` | ` plus claire ` | plus claire |
| T185 | [L368](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.ou ` | `` `Fond de référence ${NOM_DU_MODE[alerte.mode]}, ${contexte.recette.fonds[alerte.mode]}` `` | Fond du thème {mode} : {hexa} |
| T186 | [L369](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.quoi ` | `` `Clarté ${ecrireArrondi(alerte.clarte, 3)}, ${sens} que le cran 50 (${ecrireArrondi(alerte.cran, 3)}) : les contrastes promis supposent ce cran.` `` | Ce fond est {plus sombre ou plus clair} que la nuance 50. Les promesses doivent être vérifiées avec ce fond. Luminosité : {luminosité du fond}, contre {luminosité de la nuance 50}. |
| T187 | [L370](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDAlerte.geste ` | ` Rapprochez le fond du cran 50, ou acceptez des promesses mesurées sur ce fond. ` | Vérifiez les contrastes calculés avec votre fond. S’ils sont insuffisants, rapprochez sa luminosité de celle de la nuance 50 dans les réglages communs. |
| T188 | [L379](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` noticeLegacy.ou ` | ` Document, profil de couleur ` | **Retiré de l’affichage.** Profil de couleur du fichier Figma |
| T189 | [L380](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` noticeLegacy.quoi ` | ` Profil non géré : Figma ne dit pas dans quel espace les couleurs de la planche seront peintes. ` | **Retiré de l’affichage.** Le fichier utilise un ancien profil de couleur. Le plugin ne peut pas garantir le rendu des couleurs sur la planche. |
| T190 | [L381](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` noticeLegacy.geste ` | ` Choisissez sRGB ou Display P3 dans les réglages de couleur du fichier. ` | **Retiré de l’affichage.** Dans Figma, réglez le profil de couleur du fichier sur sRGB ou Display P3. |

### Noms des champs et erreurs de validation

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T191 | [L387](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesDuFichier ` | ` Aucune palette dans ce fichier. ` | Ce fichier ne contient aucune palette. |
| T192 | [L388](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesDuFichier ` | ` 1 palette dans ce fichier. ` | Ce fichier contient 1 palette. |
| T193 | [L388](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesDuFichier ` | `` `${nombre} palettes dans ce fichier.` `` | Ce fichier contient {nombre} palettes. |
| T198 | [L403](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` rangEcrit ` | ` 1ᵉʳ ` | 1re |
| T199 | [L403](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` rangEcrit ` | `` `${rang + 1}ᵉ` `` | {rang}e |
| T200 | [L405](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` MODES.light ` | ` claire ` | du thème Light |
| T201 | [L405](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` MODES.dark ` | ` sombre ` | du thème Dark |
| T202 | [L406](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` FONDS.light ` | ` Fond clair ` | Fond du thème Light |
| T203 | [L406](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` FONDS.dark ` | ` Fond sombre ` | Fond du thème Dark |
| T204 | [L408](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.id ` | ` identifiant ` | identifiant de la palette |
| T205 | [L409](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.nom ` | ` nom ` | nom de la palette |
| T206 | [L410](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.reference ` | ` référence ` | couleur de référence |
| T207 | [L411](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.derive ` | ` dérive ` | dérive de teinte |
| T208 | [L412](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.parts ` | ` parts propres ` | intensités personnalisées |
| T209 | [L413](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.clair ` | ` bout clair ` | côté clair |
| T210 | [L414](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.sombre ` | ` bout sombre ` | côté sombre |
| T211 | [L415](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.lien ` | ` lien des profils ` | liaison des teintes |
| T212 | [L416](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` CLES_DE_PALETTE.origine ` | ` origine ` | origine du réglage |
| T214 | [L425](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | ` La recette ` | Palettes et réglages |
| T215 | [L427](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | `` `${rangEcrit(Number(trouve[1]))} cran` `` | {rang} nuance |
| T216 | [L429](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | `` `Courbe ${MODES[trouve[1]]}${trouve[2] ? `, ${rangEcrit(Number(trouve[2]))} cran` : ''}` `` | Luminosité {thème}{position facultative} |
| T217 | [L429](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | `` `, ${rangEcrit(Number(trouve[2]))} cran` `` | , {rang} nuance |
| T219 | [L431](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | `` `Part de ${trouve[1]}` `` | Intensité de {profil} |
| T220 | [L435](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | `` `Seuil ${trouve[1]}` `` | Minimum ou seuil : {nom du réglage traduit} |
| T221 | [L437](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | `` `Relevé Tailwind, rampe ${Number(trouve[1]) + 1}` `` | Préréglage Tailwind, gamme {numéro} |
| T223 | [L441](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nommerChamp ` | `` `Palette ${Number(trouve[1]) + 1}` `` | Palette {numéro} |
| T225 | [L444](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` connus.crans ` | ` Crans ` | Numéros des nuances |
| T226 | [L445](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` connus.profils ` | ` Parts des profils ` | Intensités des profils |
| T227 | [L446](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` connus.gamut ` | ` Gamut ` | Espace de couleur |
| T228 | [L447](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` connus.formatVersion ` | ` Version de la recette ` | Version du format de sauvegarde |
| T229 | [L448](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` connus.derives ` | ` Relevé Tailwind ` | Préréglage Tailwind |
| T230 | [L449](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` connus.palettes ` | ` Palettes ` | Palettes |
| T231 | [L456](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.forme ` | `` `${champ} : valeur absente ou du mauvais type.` `` | {champ} : une valeur manque ou son format n’est pas reconnu. |
| T232 | [L457](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'cle-inconnue' ` | `` `${champ} : champ inconnu de cette version de la recette.` `` | {champ} : ce réglage n’est pas reconnu par cette version du plugin. |
| T233 | [L459](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'crans-croissants' ` | `` `Crans : le cran ${valeur} ne suit pas le précédent.` `` | Nuances : le numéro {valeur} n’est pas valide. Utilisez des nombres entiers, sans doublon, du plus petit au plus grand. |
| T234 | [L460](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'crans-croissants' ` | ` Crans : il en faut deux au moins, en ordre croissant. ` | Ajoutez au moins deux numéros de nuance et classez-les du plus petit au plus grand. |
| T235 | [L461](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'courbes-longueur' ` | `` `${champ} : ${valeur} clartés, une par cran attendue.` `` | {champ} contient {nombre} valeurs. Indiquez une valeur de luminosité pour chaque nuance. |
| T236 | [L462](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'courbes-bornes' ` | `` `${champ} : clarté ${valeur}, hors de 0 à 1.` `` | {champ} : saisissez une luminosité entre 0 et 1. Valeur reçue : {valeur}. |
| T237 | [L463](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'courbe-claire-decroissante' ` | `` `${champ} : ${valeur} ne descend pas depuis le cran précédent.` `` | {champ} : la luminosité doit être inférieure à celle de la nuance précédente. Valeur reçue : {valeur}. |
| T238 | [L464](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'courbe-sombre-croissante' ` | `` `${champ} : ${valeur} ne monte pas depuis le cran précédent.` `` | {champ} : la luminosité doit être supérieure à celle de la nuance précédente. Valeur reçue : {valeur}. |
| T239 | [L465](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'parts-bornes' ` | `` `${champ} : ${valeur}, hors de 0 à 1.` `` | {champ} : saisissez une intensité entre 0 et 1. Valeur reçue : {valeur}. |
| T240 | [L466](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'parts-ordre' ` | `` `${champ} : la part de soft dépasse celle de vivid.` `` | {champ} : l’intensité de soft doit être inférieure ou égale à celle de vivid. |
| T241 | [L467](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'gamut-inconnu' ` | `` `Gamut « ${valeur} » : seul sRGB est pris en charge.` `` | L’espace de couleur « {valeur} » n’est pas pris en charge. Utilisez sRGB. |
| T242 | [L468](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'hexa-invalide' ` | `` `${champ} : « ${valeur} » n’est pas une couleur hexadécimale.` `` | {champ} : remplacez « {valeur} » par un code couleur à 6 caractères, par exemple #1E6FD9. |
| T243 | [L469](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'seuils-positifs' ` | `` `${champ} : ${valeur}, il doit être positif.` `` | {champ} : saisissez un nombre supérieur à 0. Valeur reçue : {valeur}. |
| T244 | [L470](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'derives-nombre' ` | `` `Relevé Tailwind : ${valeur} rampe, il en faut deux au moins.` `` | Le préréglage Tailwind doit contenir au moins deux gammes de couleurs. Nombre trouvé : {nombre}. |
| T245 | [L471](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'derives-noms' ` | `` `Relevé Tailwind : « ${valeur} » apparaît deux fois.` `` | Préréglage Tailwind : le nom « {nom} » est utilisé deux fois. Donnez un nom différent à chaque gamme. |
| T246 | [L472](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'derives-teintes' ` | `` `${champ} : teinte ${valeur}, hors de 0 à 360.` `` | {champ} : saisissez une teinte entre 0° inclus et 360° exclu. Valeur reçue : {valeur}°. |
| T247 | [L473](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'derives-teintes-claires' ` | `` `Relevé Tailwind : deux rampes partagent la teinte claire ${valeur}.` `` | Préréglage Tailwind : deux gammes utilisent la même teinte côté clair ({valeur}°). Attribuez-leur des teintes différentes. |
| T248 | [L474](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'derive-bornes' ` | `` `${champ} : ${valeur}°, hors de -90° à +90°.` `` | {champ} : saisissez un décalage entre −90° et +90°. Valeur reçue : {valeur}°. |
| T249 | [L475](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'derive-lien' ` | `` `${champ} : profils liés, mais dérives différentes.` `` | {champ} : soft et vivid sont liés, mais leurs variations de teinte diffèrent. Donnez-leur les mêmes valeurs ou désactivez la liaison. |
| T250 | [L476](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'origine-inconnue' ` | `` `${champ} : origine « ${valeur} » inconnue.` `` | {champ} : l’origine « {valeur} » n’est pas reconnue. Faites vérifier ce champ dans le fichier importé. |
| T251 | [L477](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'identifiant-forme' ` | `` `Palette « ${valeur} » : identifiant mal formé.` `` | L’identifiant de palette « {valeur} » n’a pas le format attendu. Faites vérifier cet identifiant dans le fichier importé. |
| T252 | [L478](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'identifiants-uniques' ` | `` `Deux palettes portent l’identifiant « ${valeur} ».` `` | Deux palettes utilisent l’identifiant « {valeur} ». Attribuez un identifiant différent à chacune dans le fichier importé. |
| T253 | [L479](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` REFUS.'crans-emplois' ` | `` `Crans : le cran ${valeur} manque, et la table des emplois l’emploie.` `` | La nuance {numéro} manque. Ajoutez-la : elle est nécessaire aux usages et aux contrastes vérifiés par le plugin. |

### Chargement, import et export

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T254 | [L490](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteFuture.ou ` | `` `Recette du fichier, version ${version}` `` | Sauvegarde au format {version} |
| T255 | [L491](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteFuture.quoi ` | `` `Ce plugin lit la version ${FORMAT_RECETTE} : il ne dessinera rien avec cette recette.` `` | Cette sauvegarde nécessite une version plus récente d’UCM Palettes. Votre plugin accepte le format {version prise en charge} et ne peut pas générer la planche. |
| T256 | [L492](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteFuture.geste ` | ` Mettez UCM Palettes à jour. Vous pouvez aussi exporter la recette, en importer une autre, ou repartir de la recette par défaut. ` | Mettez UCM Palettes à jour. Vous pouvez exporter les données actuelles pour les conserver avant d’importer une autre sauvegarde ou de réinitialiser le plugin. |
| T257 | [L498](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` compte ` | ` 1 champ est invalide ` | 1 erreur de validation |
| T258 | [L498](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` compte ` | `` `${refus.length} champs sont invalides` `` | {nombre} erreurs de validation |
| T259 | [L500](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteIllisible.ou ` | ` Recette du fichier ` | Palettes et réglages illisibles |
| T260 | [L501](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteIllisible.quoi ` | `` `${compte} ; le premier : ${texteDuRefus(refus[0])} Le plugin ne dessinera rien.` `` | La génération est indisponible : {nombre d’erreurs}. Première erreur : {détail} |
| T261 | [L502](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` recetteIllisible.geste ` | ` Exportez la recette pour la corriger, importez une recette valide, ou repartez de la recette par défaut. ` | Importez une sauvegarde valide. Pour conserver les données actuelles, exportez-les avant de choisir « Réinitialiser les palettes et les réglages ». |
| T262 | [L508](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.exporter ` | ` Exporter la recette ` | Exporter les palettes et les réglages |
| T263 | [L509](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.importer ` | ` Importer une recette ` | Importer les palettes et les réglages |
| T264 | [L510](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.repartir ` | ` Repartir de la recette par défaut ` | Réinitialiser les palettes et les réglages |
| T265 | [L511](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.exporterLeRapport ` | ` Exporter le rapport ` | Exporter le rapport de vérification |
| T266 | [L512](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.confirmerLImport ` | ` Importer ` | Remplacer par cette sauvegarde |
| T267 | [L513](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.confirmerLeDepart ` | ` Repartir ` | Réinitialiser |
| T268 | [L514](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.annuler ` | ` Annuler ` | Annuler |
| T269 | [L515](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.sansEcart ` | ` Aucun écart avec la recette du fichier. ` | Cette sauvegarde contient les mêmes palettes et les mêmes réglages. |
| T270 | [L516](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.importSansDessin ` | ` L’import remplace la recette du fichier ; il ne redessine rien. ` | L’import remplacera vos palettes et vos réglages dans ce fichier Figma. La planche restera telle quelle jusqu’à sa prochaine mise à jour. |
| T271 | [L517](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_RECETTE.confirmationDuDepart ` | ` Repartir de la recette par défaut ? La recette rangée sera remplacée : exportez-la d’abord pour la garder. ` | Toutes les palettes seront retirées du plugin et les réglages par défaut seront rétablis. Exportez vos données avant de continuer si vous souhaitez les conserver. |
| T272 | [L522](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titreDeLImport ` | `` `Importer « ${fichier} » ?` `` | Remplacer les palettes et les réglages par « {fichier} » ? |
| T273 | [L528](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.ajoutees ` | ` Palette ajoutée ` | Palette à ajouter |
| T274 | [L528](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.ajoutees ` | ` Palettes ajoutées ` | Palettes à ajouter |
| T275 | [L529](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.retirees ` | ` Palette retirée ` | Palette à retirer |
| T276 | [L529](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.retirees ` | ` Palettes retirées ` | Palettes à retirer |
| T277 | [L530](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.modifiees ` | ` Palette modifiée ` | Palette à modifier |
| T278 | [L530](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.modifiees ` | ` Palettes modifiées ` | Palettes à modifier |
| T279 | [L531](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.parametres ` | ` Paramètre commun modifié ` | Réglage commun à modifier |
| T280 | [L531](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titres.parametres ` | ` Paramètres communs modifiés ` | Réglages communs à modifier |
| T281 | [L533](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ligneDEcart ` | `` `${titres[genre]} : ${noms.join(', ')}.` `` | {type de changement} : {liste des noms}. |
| T283 | [L538](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOMS_DES_PARAMETRES.crans ` | ` crans ` | numéros des nuances |
| T284 | [L539](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOMS_DES_PARAMETRES.courbes ` | ` courbes de clarté ` | luminosité des nuances |
| T285 | [L540](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOMS_DES_PARAMETRES.profils ` | ` parts de chroma ` | intensités des couleurs |
| T286 | [L541](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOMS_DES_PARAMETRES.fonds ` | ` fonds de référence ` | couleurs de fond pour les contrastes |
| T287 | [L542](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOMS_DES_PARAMETRES.seuils ` | ` seuils ` | minimums et seuils de détection |
| T288 | [L543](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOMS_DES_PARAMETRES.derives ` | ` paires de Tailwind ` | préréglage Tailwind |
| T289 | [L544](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` NOMS_DES_PARAMETRES.gamut ` | ` gamut ` | espace de couleur |
| T290 | [L549](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` compte ` | ` 1 champ est invalide ` | 1 erreur de validation |
| T291 | [L549](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` compte ` | `` `${refus.length} champs sont invalides` `` | {nombre} erreurs de validation |
| T292 | [L551](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` importInvalide.ou ` | `` `Import, ${fichier}` `` | Import impossible : {fichier} |
| T293 | [L552](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` importInvalide.quoi ` | `` `${compte} ; le premier : ${texteDuRefus(refus[0])} La recette du fichier reste intacte.` `` | Ce fichier contient {nombre d’erreurs}. Première erreur : {détail} Vos palettes et vos réglages actuels sont conservés. |
| T294 | [L553](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` importInvalide.geste ` | ` Corrigez le fichier, puis importez-le de nouveau. ` | Corrigez le fichier indiqué, puis réessayez l’import. Vous pouvez aussi sélectionner une autre sauvegarde. |
| T295 | [L560](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` importFutur.ou ` | `` `Import, ${fichier}, version ${version}` `` | Import impossible : {fichier}, format {version} |
| T296 | [L561](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` importFutur.quoi ` | `` `Ce plugin lit la version ${FORMAT_RECETTE} : la recette du fichier reste intacte.` `` | Cette sauvegarde nécessite une version plus récente du plugin, qui accepte actuellement le format {version prise en charge}. Vos palettes et vos réglages actuels sont conservés. |
| T297 | [L562](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` importFutur.geste ` | ` Mettez UCM Palettes à jour, puis importez de nouveau ce fichier. ` | Installez une version plus récente d’UCM Palettes, puis réimportez cette sauvegarde. |

### Planche, progression et incidents de génération

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T298 | [L568](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.dessiner ` | ` Dessiner ` | Générer sur Figma |
| T299 | [L569](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.redessiner ` | ` Redessiner ` | Générer sur Figma |
| T300 | [L570](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.dessinerTout ` | ` Dessiner toutes les palettes ` | Générer toutes les palettes |
| T301 | [L571](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.grille ` | ` Grille de contraste ` | Inclure la grille des contrastes |
| T302 | [L572](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.aJour ` | ` à jour ` | À jour |
| T303 | [L573](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.perimee ` | ` périmée ` | À mettre à jour |
| T304 | [L574](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.jamaisDessinee ` | ` jamais dessinée ` | Pas encore sur la planche |
| T305 | [L575](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.redessinerQuandMeme ` | ` Redessiner quand même ` | Remplacer le cadre et son contenu |
| T306 | [L576](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.voirSurLaPlanche ` | ` Voir sur la planche ` | Afficher dans Figma |
| T307 | [L577](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.reessayer ` | ` Réessayer ` | Réessayer |
| T308 | [L578](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.confirmer ` | ` Dessiner ` | Générer sur Figma |
| T309 | [L579](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.annuler ` | ` Annuler ` | Annuler |
| T310 | [L580](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.plancheSansPalette ` | ` Aucune palette à dessiner : la planche attend une première palette. ` | Créez une palette dans l’onglet « Palettes » pour pouvoir générer sa présentation ici. |
| T311 | [L581](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DU_DESSIN.versLesPalettes ` | ` Ouvrir l’onglet Palettes ` | Créer une palette |
| T312 | [L586](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettes ` | ` 1 palette ` | 1 palette |
| T313 | [L586](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettes ` | `` `${nombre} palettes` `` | {nombre} palettes |
| T314 | [L587](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` enTeteDeLaPlanche ` | `` `Planche : ${palettes} · recette v${version}${empreinte ? ` · empreinte ${empreinte}` : ''} · ${ESPACES[profil]}` `` | {nombre de palettes} |
| T315 | [L587](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` enTeteDeLaPlanche ` | `` ` · empreinte ${empreinte}` `` | · identifiant des données : {empreinte} |
| T317 | [L592](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` progressionDuDessin ` | `` `Dessin de ${nom}…` `` | Génération de « {nom} »… |
| T318 | [L592](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` progressionDuDessin ` | `` `Dessin ${fait + 1}/${total} : ${nom}…` `` | Palette {numéro} sur {total} : génération de « {nom} »… |
| T319 | [L597](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesDessinees ` | ` 1 palette dessinée sur la planche. ` | **Retiré de l’affichage.** 1 palette a été générée sur la planche. |
| T320 | [L597](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` palettesDessinees ` | `` `${nombre} palettes dessinées sur la planche.` `` | **Retiré de l’affichage.** {nombre} palettes ont été générées sur la planche. |
| T321 | [L602](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` confirmationDuDessin ` | `` `Dessiner les ${nombre} palettes ? Chacune pose plus de cinq cents calques sur la planche.` `` | La génération de {nombre} palettes ajoutera plus de 1 500 calques par palette. Confirmez pour lancer la génération. |
| T322 | [L608](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` policeIndisponible.ou ` | `` `Planche, police ${style}` `` | Police indisponible : {style} |
| T323 | [L609](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` policeIndisponible.quoi ` | `` `${style} ne se charge pas : aucun cadre n’a été dessiné.` `` | Figma n’a pas pu charger {style}. Aucune palette n’a été générée sur la planche. |
| T324 | [L610](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` policeIndisponible.geste ` | ` Installez ou activez Inter, puis relancez le dessin. ` | Activez ou installez la police Inter, puis réessayez. |
| T325 | [L617](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` suite ` | ` aucun cadre n’a été posé ` | aucune nouvelle présentation de palette n’a été créée |
| T326 | [L618](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` suite ` | `` `ce cadre n’a pas été posé, ${dessines === 1 ? 'le cadre précédent reste' : `les ${dessines} cadres précédents restent`}` `` | la présentation de cette palette n’a pas été créée ; {présentations précédentes conservées} |
| T327 | [L618](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` suite ` | ` le cadre précédent reste ` | la présentation créée juste avant est conservée |
| T328 | [L618](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` suite ` | `` `les ${dessines} cadres précédents restent` `` | les {nombre} présentations déjà créées sont conservées |
| T329 | [L620](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` dessinInterrompu.ou ` | `` `Planche, ${nom}` `` | Génération interrompue : {nom} |
| T330 | [L621](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` dessinInterrompu.quoi ` | `` `Le dessin s’est arrêté (${message}) : ${suite}.` `` | La génération s’est arrêtée : {résultat partiel}. Détail de l’erreur : {message} |
| T331 | [L622](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` dessinInterrompu.geste ` | ` Relancez le dessin. ` | Réessayez de générer la palette. |
| T332 | [L629](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` dessinSurUneAutreRecette.ou ` | ` Recette du fichier ` | Les données du fichier ont changé |
| T333 | [L630](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` dessinSurUneAutreRecette.quoi ` | ` Elle a changé depuis sa lecture : le dessin montrerait d’autres couleurs que l’aperçu. Rien n’a été dessiné. ` | Les palettes ou les réglages ont changé depuis leur chargement. La génération a été annulée pour éviter de créer une planche différente de l’aperçu. |
| T334 | [L631](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` dessinSurUneAutreRecette.geste ` | ` Rechargez la recette du fichier, puis relancez le dessin. ` | Rechargez les palettes, vérifiez l’aperçu, puis relancez la génération. |
| T335 | [L635](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` citer ` | `` `« ${nom} »` `` | « {nom} » |
| T337 | [L641](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDesCalquesEtrangers.ou ` | `` `Planche, cadre de ${nom}` `` | Contenu ajouté dans le cadre de « {nom} » |
| T338 | [L643](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDesCalquesEtrangers.quoi ` | `` `Le calque ${citer(calques)}, ajouté dans ce cadre, disparaîtra au dessin.` `` | La mise à jour supprimera le calque {nom du calque} que vous avez ajouté dans ce cadre. |
| T339 | [L644](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDesCalquesEtrangers.quoi ` | `` `Les ${calques.length} calques ajoutés dans ce cadre disparaîtront au dessin : ${citer(calques)}.` `` | La mise à jour supprimera les {nombre} calques que vous avez ajoutés dans ce cadre : {liste des calques}. |
| T340 | [L645](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDesCalquesEtrangers.geste ` | ` Sortez-le du cadre pour le garder, ou redessinez quand même. ` | Déplacez ce calque hors du cadre pour le conserver. Sinon, confirmez son remplacement. |
| T341 | [L645](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` constatDesCalquesEtrangers.geste ` | ` Sortez-les du cadre pour les garder, ou redessinez quand même. ` | Déplacez ces calques hors du cadre pour les conserver. Sinon, confirmez leur remplacement. |
| T342 | [L652](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` cadreOrphelin.ou ` | `` `Planche, cadre « ${nom} »` `` | Palette supprimée : cadre « {nom} » |
| T343 | [L653](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` cadreOrphelin.quoi ` | ` Sa palette a été supprimée : aucun dessin ne touche plus ce cadre. ` | Ce cadre reste dans Figma, mais sa palette a été supprimée du plugin. Il ne sera plus mis à jour. |
| T344 | [L654](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` cadreOrphelin.geste ` | ` Supprimez le cadre dans Figma s’il ne sert plus. ` | Vous pouvez conserver ce cadre ou le supprimer directement dans Figma. |
| T345 | [L661](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` copieDeCadre.ou ` | `` `Planche, cadre « ${nom} »` `` | Copie du cadre « {nom} » |
| T346 | [L662](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` copieDeCadre.quoi ` | ` Ce cadre est une copie : le plugin ne la redessine pas, et ses couleurs datent du moment de la copie. ` | Le plugin met à jour le cadre d’origine uniquement. Les couleurs de cette copie peuvent donc être anciennes. |
| T347 | [L663](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` copieDeCadre.geste ` | ` Pour une copie à jour, redessinez la palette, puis copiez de nouveau son cadre. ` | Mettez à jour la palette, puis dupliquez son cadre d’origine pour obtenir une nouvelle copie. |
| T348 | [L670](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` noticeDisplayP3.ou ` | ` Document, profil Display P3 ` | Fichier Figma en Display P3 |
| T349 | [L671](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` noticeDisplayP3.quoi ` | ` La planche peint chaque couleur convertie en Display P3 : la pipette de Figma y lit des valeurs P3, différentes de l’hexa des cartes. ` | Dans ce fichier Display P3, la pipette peut afficher un code différent du code sRGB écrit sur la carte. |
| T350 | [L672](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` noticeDisplayP3.geste ` | ` Copiez l’hexa depuis le texte de la carte, pas avec la pipette. ` | Pour récupérer le code sRGB de la palette, copiez le code hexadécimal écrit sur la carte. |
| T351 | [L679](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` compte ` | ` 1 couleur peinte diffère ` | 1 couleur ne correspond pas |
| T352 | [L679](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` compte ` | `` `${ecarts.length} couleurs peintes diffèrent` `` | {nombre} couleurs ne correspondent pas |
| T353 | [L681](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ecartDePeinture.ou ` | `` `Planche, ${nom}` `` | Différence entre l’aperçu et la planche : {nom} |
| T354 | [L682](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ecartDePeinture.quoi ` | `` `${compte} de l’aperçu, dont ${premier.nom} : aperçu ${premier.apercu ?? 'absent'}, planche ${premier.peint}.` `` | {nombre et accord} à l’aperçu. Exemple, {couleur} : {hexa de l’aperçu ou absence} dans l’aperçu, {hexa de la planche} sur la planche. |
| T355 | [L682](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ecartDePeinture.quoi ` | ` absent ` | couleur absente |
| T356 | [L683](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ecartDePeinture.geste ` | ` Redessinez la palette. Si l’écart reste, signalez-le au mainteneur du plugin. ` | Mettez à jour la palette sur la planche. Si la différence persiste, transmettez ce message à la personne qui maintient le plugin. |

### Titres et usages affichés sur la planche

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T357 | [L689](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.avertissement ` | ` Dessiné par UCM Palettes. Ce cadre est remplacé à chaque dessin. ` | **Retiré de l’affichage.** UCM Palettes remplacera ce cadre et son contenu lors de la prochaine génération. Placez vos annotations à l’extérieur du cadre. |
| T358 | [L690](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.reference ` | ` Référence ` | Couleur de référence |
| T359 | [L691](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.emplois ` | ` Emplois ` | Usages des couleurs |
| T360 | [L692](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.emploisCites ` | ` Ces crans sont ceux que les composants citent, dans toutes les marques. ` | Chaque usage correspond au même numéro de nuance dans toutes les palettes de marque. |
| T361 | [L693](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.etats ` | ` États ` | Promesses des états interactifs |
| T362 | [L694](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.alertes ` | ` Alertes ` | Points à vérifier |
| T363 | [L695](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.aucuneAlerte ` | ` Aucune alerte. ` | Aucun point signalé ici. Consultez les tableaux d’usages pour les résultats de contraste. |
| T364 | [L696](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.legende ` | ` Légende ` | Lire les valeurs |
| T365 | [L697](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.specimen ` | ` Aa Libellé ` | Aa Exemple |
| T366 | [L698](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.tenu ` | ` tenu ` | Respectée |
| T367 | [L699](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.manque ` | ` manqué ` | À corriger |
| T368 | [L700](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.colonnes ` | ` Emploi ` | Rôle |
| T369 | [L700](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.colonnes ` | ` Usage ` | Utilisation |
| T370 | [L700](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.colonnes ` | ` Cran ` | Nuance |
| T371 | [L700](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.colonnes ` | ` Spécimen ` | Exemple |
| T372 | [L700](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.colonnes ` | ` Contraste ` | Contraste mesuré |
| T373 | [L700](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.colonnes ` | ` Seuil ` | Minimum |
| T374 | [L700](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.colonnes ` | ` Verdict ` | Promesse |
| T375 | [L701](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.bouton ` | ` Boutons ` | **Retiré de l’affichage.** Couleur des boutons |
| T376 | [L702](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.mode.light ` | ` Light ` | Thème Light |
| T377 | [L702](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.mode.dark ` | ` Dark ` | Thème Dark |
| T378 | [L704](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.usage.solid ` | ` Fond plein d’un bouton, d’un badge ` | Fond coloré d’un bouton ou d’un badge |
| T379 | [L705](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.usage.'on-solid' ` | ` Texte posé sur ce fond ` | Texte sur un fond coloré |
| T380 | [L706](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.usage.text ` | ` Texte coloré sur le fond de page ` | Texte coloré sur le fond de la page |
| T381 | [L707](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.usage.surface ` | ` Fond teinté discret ` | Fond légèrement coloré |
| T382 | [L708](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.usage.'border-control' ` | ` Contour d’un champ, d’une case ` | Bordure d’un champ ou d’une case à cocher |
| T383 | [L709](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.usage.'border-decorative' ` | ` Séparateur, filet ` | Ligne de séparation ou bordure décorative |
| T384 | [L710](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` TEXTES_DE_LA_PLANCHE.usage.focus ` | ` Anneau de focus, décalé du contrôle ` | Contour qui indique le focus clavier, à l’extérieur du composant |
| T385 | [L714](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ESPACES.SRGB ` | ` sRGB ` | sRGB |
| T386 | [L714](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ESPACES.DISPLAY_P3 ` | ` Display P3 ` | Display P3 |
| T387 | [L714](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ESPACES.LEGACY ` | ` profil non géré ` | Profil de couleur ancien |

### Mesures, légendes et messages composés de la planche

| ID | Référence | Texte actuel | Proposition |
|---|---|---|---|
| T388 | [L719](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` enTeteDuCadre ` | `` `recette v${version} · empreinte ${empreinte} · ${ESPACES[profil]} · ${tenues}/${total} promesses` `` | {nombre respecté}/{total} promesses respectées |
| T389 | [L724](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` seuilTenuEcrit ` | ` – ` | « Aucun minimum atteint » sur une carte de couleur ; « Non applicable » dans une cellule sans contrôle. |
| T390 | [L729](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` enTeteDeRangee ` | `` `${profil}\npart ${ecrireArrondi(part, 2)}` `` | {profil} |
| T391 | [L734](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` enTeteDeSection ` | `` `${TEXTES_DE_LA_PLANCHE.mode[mode]} · fond de référence ${fond}` `` | {thème} · fond utilisé pour les contrastes : {hexa} |
| T392 | [L754](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` contraire ` | `` `blanc ${ecrireContraste(carte.blanc)}` `` | Avec le blanc : {contraste} |
| T393 | [L754](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` contraire ` | `` `noir ${ecrireContraste(carte.noir)}` `` | Avec le noir : {contraste} |
| T394 | [L758](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeCarte ` | `` `L ${ecrireArrondi(carte.L, 3)}` `` | Luminosité L : {valeur} |
| T395 | [L759](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeCarte ` | `` `C ${ecrireArrondi(carte.C, 3)}` `` | Chroma C : {valeur} |
| T396 | [L760](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeCarte ` | `` `H ${Math.round(carte.H) % 360}°` `` | Teinte H : {angle}° |
| T397 | [L761](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeCarte ` | `` `fond ${ecrireContraste(carte.fond)} ${seuilTenuEcrit(carte.seuilTenu)}` `` | Avec le fond : {contraste} · minimum atteint : {seuil ou aucun} |
| T400 | [L764](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeCarte ` | `` `≈ ${carte.confondu}` `` | Très proche de {autre profil} |
| T404 | [L783](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeReference ` | `` `L ${ecrireArrondi(reference.L, 3)} · C ${ecrireArrondi(reference.C, 3)} · H ${Math.round(reference.H) % 360}°` `` | Luminosité L : {L} · chroma C : {C} · teinte H : {H}° |
| T405 | [L784](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeReference ` | `` `part de chroma ${ecrireArrondi(reference.part, 2)} · proche du cran ${reference.cranProche}` `` | Intensité : {part} · nuance la plus proche en luminosité, thème Light : {numéro} |
| T406 | [L785](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDeReference ` | `` `${contre} ${ecrireContraste(valeur)} ${seuilTenuEcrit(seuil)}` `` | Avec {fond} : {contraste} · minimum atteint : {seuil ou aucun} |
| T409 | [L792](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDesDerives ` | `` `soft et vivid : ${uneDerive(vivid)}` `` | Dérive de teinte commune à soft et vivid : {réglages} |
| T410 | [L792](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDesDerives ` | `` `soft : ${uneDerive(soft)}\nvivid : ${uneDerive(vivid)}` `` | Dérive de teinte de soft : {réglages soft}<br>Dérive de teinte de vivid : {réglages vivid} |
| T411 | [L797](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` texteDuBouton ` | `` `${TEXTES_DE_LA_PLANCHE.bouton}\n${hexa}\ncran 700 vivid, clair` `` | **Retiré de l’affichage.** Couleur des boutons<br>{hexa}<br>Nuance vivid 700, thème Light |
| T412 | [L803](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ligneDePaire ` | `` `${membre(premier)} sur ${membre(second)} · ${ecrireContraste(contraste)} · ${seuilEcrit(seuil)} · ${verdictDeLaPaire}` `` | {usage} sur {fond ou usage} · contraste : {contraste} · minimum demandé : {seuil}:1 · promesse {résultat} |
| T413 | [L808](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` titreDeTable ` | `` `${TEXTES_DE_LA_PLANCHE.emplois} · ${TEXTES_DE_LA_PLANCHE.mode[mode]} · ${profil}` `` | Usages des couleurs · {thème} · {profil} |
| T414 | [L813](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` ligneDAlerte ` | `` `${constat.ou} : ${constat.quoi}` `` | {élément concerné} : {explication}. {action} |
| T415 | [L819](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` legende ` | `` `Seuils de contraste : texte ${seuilEcrit(seuils.texte)}, non-texte ${seuilEcrit(seuils.nonTexte)}.` `` | Contrastes minimums demandés : {seuil texte}:1 pour le texte ; {seuil graphique}:1 pour les éléments graphiques. |
| T416 | [L820](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` legende ` | `` `profilsConfondus ${ecrireArrondi(seuils.profilsConfondus, 2)} et palettesProches ${ecrireArrondi(seuils.palettesProches, 2)} sont des paramètres de conception, pas des seuils d’accessibilité.` `` | Écarts minimums de couleur : {seuil profils} entre soft et vivid ; {seuil palettes} entre palettes. Ces réglages détectent les couleurs proches ; ils ne mesurent pas la lisibilité. |
| T417 | [L821](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` legende ` | `` `Parts de chroma de la recette : soft ${ecrireArrondi(parts.soft, 2)}, vivid ${ecrireArrondi(parts.vivid, 2)}.` `` | Intensités des réglages communs : soft {soft}, vivid {vivid}. |
| T418 | [L822](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` legende ` | ` fond : contraste contre le fond de référence du mode, puis le seuil tenu. blanc ou noir : le plus fort des deux. ` | « Avec le fond » donne le contraste sur le fond du thème et le minimum atteint. « Avec le blanc » ou « Avec le noir » indique celui qui contraste le plus avec la nuance. |

## Textes hors du fichier central et données affichées

Les noms de calques sont visibles dans le panneau Figma. Ils sont donc inclus même lorsqu’ils ne figurent pas sur la planche elle-même. Plusieurs lignes renvoient à un même libellé utilisé dans des sections différentes.

| ID | Référence | Texte actuel ou format | Proposition | Précision |
|---|---|---|---|---|
| H001 | [packages/plugin-socle/src/ui/EnTete.ts · L33](../../../../packages/plugin-socle/src/ui/EnTete.ts) · ` createSettingsButton · aria-label ` | ` Ouvrir la configuration ` | Ouvrir les réglages communs | Texte partagé avec Exporter : prévoir un libellé fourni par Palettes. |
| H002 | [packages/plugin-socle/src/ui/EnTete.ts · L34](../../../../packages/plugin-socle/src/ui/EnTete.ts) · ` createSettingsButton · title ` | ` Configuration ` | Réglages communs | Même précaution pour le socle partagé. |
| H003 | [packages/plugin-socle/src/ui/EnTete.ts · L45](../../../../packages/plugin-socle/src/ui/EnTete.ts) · ` createBackButton ` | ` Retour ` | Retour aux palettes et à la planche | À fournir par Palettes si le socle reste commun. |
| H004 | [manifest.json · L2](../../../../packages/plugin-palettes/manifest.json) · ` name ` | ` UCM Palettes ` | UCM Palettes | Nom du produit. |
| H005 | [src/ui/index.html · L6](../../../../packages/plugin-palettes/src/ui/index.html) · ` title ` | ` UCM Palettes ` | UCM Palettes | Titre de la fenêtre HTML. |
| H006 | [src/ui/creation.ts · L32](../../../../packages/plugin-palettes/src/ui/creation.ts) · ` saisie.placeholder ` | ` #1E6FD9 ` | #1E6FD9 | Exemple de code accepté. |
| H007 | [src/ui/ongletPalettes.ts · L130](../../../../packages/plugin-palettes/src/ui/ongletPalettes.ts) · ` plus.textContent ` | ` + ` | + | Le libellé accessible est T021. |
| H008 | [src/ui/menuPalette.ts · L31](../../../../packages/plugin-palettes/src/ui/menuPalette.ts) · ` bouton.textContent ` | ` ⋯ ` | ⋯ | Le libellé accessible est T025. |
| H009 | [src/ui/selecteur.ts · L109](../../../../packages/plugin-palettes/src/ui/selecteur.ts) · ` fleche.textContent ` | ` ▾ ` | ▾ | Symbole masqué aux lecteurs d’écran. |
| H010 | [src/ui/ongletPalettes.ts · L253](../../../../packages/plugin-palettes/src/ui/ongletPalettes.ts) · ` deplier.textContent ` | `` `{▸ si replié, ▾ sinon} ${TEXTES_AVANCES.avance}` `` | {▸ ou ▾} Réglages de cette palette | Le titre vient de T057. |
| H011 | [src/ui/derive/graphe.ts · L152](../../../../packages/plugin-palettes/src/ui/derive/graphe.ts) · ` initiale puis lettre.textContent, ligne 107 ` | `` `{vide si lié, sinon profil[0]} : s ou v` `` | s ou v | Repères graphiques de soft et vivid. Sans lettre quand les profils sont liés. |
| H012 | [packages/couleur/src/rampe.ts · L20](../../../../packages/couleur/src/rampe.ts) · ` PROFILS · soft ` | ` soft ` | soft (doux) | Libellé d’affichage ; conserver la clé soft dans les données. |
| H013 | [packages/couleur/src/rampe.ts · L20](../../../../packages/couleur/src/rampe.ts) · ` PROFILS · vivid ` | ` vivid ` | vivid (vif) | Libellé d’affichage ; conserver la clé vivid dans les données. |
| H014 | [src/ui/nuancier.ts · L511](../../../../packages/plugin-palettes/src/ui/nuancier.ts) · ` nom et aria-label, ligne 137 ` | `` `${profil}.${recette.crans[rang]} ${cran.hexa}` `` | Profil {profil}, nuance {numéro}, couleur {hexa} | Le nom de détail ne contient que {profil}.{numéro}. |
| H015 | [src/ui/ongletPalettes.ts · L377](../../../../packages/plugin-palettes/src/ui/ongletPalettes.ts) · ` nom.placeholder ` | ` courante.reference ` | {code hexadécimal de la couleur de référence} | Valeur de la palette, affichée telle quelle. |
| H016 | [src/ui/textes.ts · L222](../../../../packages/plugin-palettes/src/ui/textes.ts) · ` nomDeLaPalette ` | ` palette.nom si non vide, sinon palette.reference ` | {nom de la palette, sinon code hexadécimal} | Le texte saisi par le designer reste sa donnée. |
| H017 | [src/ui/index.ts · L92](../../../../packages/plugin-palettes/src/ui/index.ts) · ` telecharger ` | ` palettes.recette.json ` | palettes-et-reglages.json | Nom proposé au téléchargement, sans changement du format JSON. |
| H018 | [src/ui/index.ts · L97](../../../../packages/plugin-palettes/src/ui/index.ts) · ` telecharger ` | ` palettes.rapport.json ` | rapport-palettes.json | Nom proposé au téléchargement. |
| H019 | [src/ecriture/planche.ts · L29](../../../../packages/plugin-palettes/src/ecriture/planche.ts) · ` NOMS_DE_PAGE[0] ` | ` Palettes ` | Palettes | Nom de page Figma. |
| H020 | [src/ecriture/planche.ts · L29](../../../../packages/plugin-palettes/src/ecriture/planche.ts) · ` NOMS_DE_PAGE[1] ` | ` Palettes (UCM) ` | Palettes (UCM) | Nom utilisé si une page Palettes existe déjà. |
| H021 | [src/planche/modele.ts · L147](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` nomDePastille ` | `` `${profil}/${mode}/${cran}` `` | {profil}/{mode}/{numéro} | Conserver ce nom technique pour retrouver les couleurs dans les contrôles. |
| H022 | [src/planche/modele.ts · L190](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` numéro ` | Numéro de nuance |  |
| H023 | [src/planche/modele.ts · L205](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `carte ${profil}.${numero}` `` | Nuance {profil} {numéro} |  |
| H024 | [src/planche/modele.ts · L205](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` valeurs ` | Valeurs de la couleur |  |
| H025 | [src/planche/modele.ts · L221](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `rangée ${profil}` `` | Nuances {profil} |  |
| H026 | [src/planche/modele.ts · L222](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` profil ` | Profil |  |
| H027 | [src/planche/modele.ts · L226](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `section ${mode}` `` | Nuances du thème {mode traduit} |  |
| H028 | [src/planche/modele.ts · L227](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` titre ` | Titre |  |
| H029 | [src/planche/modele.ts · L240](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | ` titres ` | En-têtes du tableau |  |
| H030 | [src/planche/modele.ts · L247](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` spécimen ` | Exemple de texte |  |
| H031 | [src/planche/modele.ts · L264](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | `` `paire ${paire.numero}` `` | Promesse {numéro} |  |
| H032 | [src/planche/modele.ts · L266](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `emplois ${mode} ${profil}` `` | Usages : {thème traduit}, {profil} |  |
| H033 | [src/planche/modele.ts · L267](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` titre ` | Titre |  |
| H034 | [src/planche/modele.ts · L270](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` états ` | Promesses des états interactifs |  |
| H035 | [src/planche/modele.ts · L284](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | ` référence ` | Couleur de référence |  |
| H036 | [src/planche/modele.ts · L292](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` valeurs ` | Valeurs de la couleur |  |
| H037 | [src/planche/modele.ts · L300](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` contre · nom du fond ` | ` blanc ` | le blanc |  |
| H038 | [src/planche/modele.ts · L301](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` contre · nom du fond ` | ` noir ` | le noir |  |
| H039 | [src/planche/modele.ts · L302](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` contre · nom du fond ` | ` fond clair ` | le fond du thème Light |  |
| H040 | [src/planche/modele.ts · L303](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` contre · nom du fond ` | ` fond sombre ` | le fond du thème Dark |  |
| H041 | [src/planche/modele.ts · L306](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` dérives ` | Dérives de teinte |  |
| H042 | [src/planche/modele.ts · L311](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | ` bouton ` | **Retiré de l’affichage.** Couleur des boutons |  |
| H043 | [src/planche/modele.ts · L312](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | ` cran 700 vivid ` | **Retiré de l’affichage.** Nuance vivid 700 |  |
| H044 | [src/planche/modele.ts · L313](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` valeurs ` | **Retiré de l’affichage.** Valeurs de la couleur |  |
| H045 | [src/planche/modele.ts · L327](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `ligne ${recette.crans[i]}` `` | Contrastes de la nuance {numéro} |  |
| H046 | [src/planche/modele.ts · L329](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `${recette.crans[i]}/${recette.crans[j]}` `` | Contraste {nuance 1} / {nuance 2} |  |
| H047 | [src/planche/modele.ts · L330](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` contraste ` | Contraste mesuré |  |
| H048 | [src/planche/modele.ts · L333](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `grille ${mode} ${profil}` `` | Grille des contrastes : {thème traduit}, {profil} |  |
| H049 | [src/planche/modele.ts · L349](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` alerte ` | Point à vérifier |  |
| H050 | [src/planche/modele.ts · L351](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | `` `emplois ${mode}` `` | Usages du thème {mode traduit} |  |
| H051 | [src/planche/modele.ts · L354](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | ` grilles ` | Grilles des contrastes |  |
| H052 | [src/planche/modele.ts · L357](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cadre · nom de calque ` | ` en-tête ` | En-tête de la palette |  |
| H053 | [src/planche/modele.ts · L358](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` titre ` | Titre |  |
| H054 | [src/planche/modele.ts · L359](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` recette ` | **Retiré de l’affichage.** Informations de génération |  |
| H055 | [src/planche/modele.ts · L360](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` avertissement ` | **Retiré de l’affichage.** Mise à jour du cadre |  |
| H056 | [src/planche/modele.ts · L365](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` titre ` | Titre |  |
| H057 | [src/planche/modele.ts · L366](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` note ` | Répartition des usages |  |
| H058 | [src/planche/modele.ts · L371](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` titre ` | Titre |  |
| H059 | [src/planche/modele.ts · L372](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` aucune ` | Aucun point à vérifier |  |
| H060 | [src/planche/modele.ts · L375](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` titre ` | Titre |  |
| H061 | [src/planche/modele.ts · L376](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` texte · nom de calque ` | ` texte ` | Explication des valeurs |  |
| H062 | [packages/couleur/src/emplois.ts · L18](../../../../packages/couleur/src/emplois.ts) · ` EMPLOIS → tableDEmplois et emploiEcrit ` | ` solid ` | Fond plein (solid) | Traduire le libellé affiché ; conserver la clé dans les données. |
| H063 | [packages/couleur/src/emplois.ts · L19](../../../../packages/couleur/src/emplois.ts) · ` EMPLOIS → tableDEmplois et emploiEcrit ` | ` on-solid ` | Texte sur fond plein (on-solid) | Traduire le libellé affiché ; conserver la clé dans les données. |
| H064 | [packages/couleur/src/emplois.ts · L20](../../../../packages/couleur/src/emplois.ts) · ` EMPLOIS → tableDEmplois et emploiEcrit ` | ` text ` | Texte coloré (text) | Traduire le libellé affiché ; conserver la clé dans les données. |
| H065 | [packages/couleur/src/emplois.ts · L21](../../../../packages/couleur/src/emplois.ts) · ` EMPLOIS → tableDEmplois et emploiEcrit ` | ` surface ` | Fond léger (surface) | Traduire le libellé affiché ; conserver la clé dans les données. |
| H066 | [packages/couleur/src/emplois.ts · L22](../../../../packages/couleur/src/emplois.ts) · ` EMPLOIS → tableDEmplois et emploiEcrit ` | ` border-control ` | Bordure de contrôle (border-control) | Traduire le libellé affiché ; conserver la clé dans les données. |
| H067 | [packages/couleur/src/emplois.ts · L23](../../../../packages/couleur/src/emplois.ts) · ` EMPLOIS → tableDEmplois et emploiEcrit ` | ` border-decorative ` | Bordure décorative (border-decorative) | Traduire le libellé affiché ; conserver la clé dans les données. |
| H068 | [packages/couleur/src/emplois.ts · L24](../../../../packages/couleur/src/emplois.ts) · ` EMPLOIS → tableDEmplois et emploiEcrit ` | ` focus ` | Contour de focus (focus) | Traduire le libellé affiché ; conserver la clé dans les données. |
| H069 | [packages/couleur/src/emplois.ts · L30](../../../../packages/couleur/src/emplois.ts) · ` TABLE_DES_EMPLOIS.on-solid → cellule de nuance ` | ` fond ` | Fond du thème | Valeur de la colonne Nuance pour le texte sur fond plein. |
| H070 | [src/planche/modele.ts · L249](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` cellule sans paire · lignes 253–255 aussi ` | ` – ` | Non applicable | Absence de paire de contraste pour border-decorative. |
| H071 | [src/planche/modele.ts · L165](../../../../packages/plugin-palettes/src/planche/modele.ts) · ` EMPREINTE_EN_ATTENTE ` | ` ········ ` | **Retiré de l’affichage.** ········ | Valeur de calcul uniquement, remplacée avant le dessin. Aucune réécriture destinée au designer. |
| H072 | [src/ecriture/planche.ts · L323](../../../../packages/plugin-palettes/src/ecriture/planche.ts) · ` IssueDuDessin.message → dessinInterrompu ` | ` erreur.message ou String(erreur) ` | Détail de l’erreur : {message fourni par Figma} | Texte externe de longueur et de langue inconnues. Le message principal est T330. |
| H073 | [package.json · L6](../../../../packages/plugin-palettes/package.json) · ` description ` | ` Plugin Figma qui fabrique les palettes d'une marque, vérifie leurs contrastes et les dessine sur une planche. Il n'écrit que sa recette et les cadres qu'il possède. ` | Créez vos palettes de couleurs dans Figma, vérifiez leurs contrastes et générez une planche pour les partager. | Métadonnée du paquet privé ; absente de la fenêtre du plugin. |

## Assemblage des textes

Certains textes ne sont pas des phrases isolées. Cette table précise comment leurs fragments forment le contenu affiché.

| Fonction | Contenu actuel complet, dans l’ordre d’affichage | Proposition d’assemblage |
|---|---|---|
| [detailDuCran, L277](../../../../packages/plugin-palettes/src/ui/textes.ts) | Nom de nuance · code hexadécimal · T140 · T141 · T142 · liste des usages T133, ou T139. Le minimum absent est T137. | Profil et nuance · code hexadécimal · contraste avec le fond et minimum atteint · contraste avec le blanc · contraste avec le noir · usages traduits. |
| [texteDeCarte, L753](../../../../packages/plugin-palettes/src/ui/textes.ts) | Nom de nuance, code hexadécimal, T394, T395, T396, T397, T392 ou T393, usages T133 s’il y en a, T400 si les profils sont proches. Chaque élément occupe une ligne. | Même ordre, avec les nouveaux libellés. La mention de proximité cite le profil comparé. |
| [texteDeReference, L780](../../../../packages/plugin-palettes/src/ui/textes.ts) | Code hexadécimal, T404, T405, puis quatre T406 pour le blanc, le noir, le fond clair et le fond sombre. | Code hexadécimal, mesures nommées, intensité et nuance proche en luminosité dans le thème clair, puis les quatre contrastes. |
| [texteDesDerives, L790](../../../../packages/plugin-palettes/src/ui/textes.ts) | T409 si les profils sont liés, sinon T410. Chaque réglage est composé par T127 avec l’origine T124–T126. | Une ligne commune lorsque les profils partagent leurs variations de teinte ; une ligne par profil sinon. |
| [nommerChamp, L424](../../../../packages/plugin-palettes/src/ui/textes.ts) | T214–T230 ; les champs de palette emploient T204–T212. Une clé inconnue reste écrite telle quelle. | Employer les noms de champs proposés. Garder une clé inconnue dans le détail technique sans lui inventer de traduction. |
| [texteDuRefus, L483](../../../../packages/plugin-palettes/src/ui/textes.ts) | T231–T253 avec le nom de champ et la valeur reçue. | Insérer le diagnostic correspondant dans les erreurs de saisie, de chargement ou d’import. |
| [ligneDAlerte, L812](../../../../packages/plugin-palettes/src/ui/textes.ts) | Partie « où », deux-points, partie « quoi ». L’action du diagnostic est omise. | Ajouter l’action à la fin pour que la planche indique aussi comment corriger le point. |
| [tableDEmplois, L232](../../../../packages/plugin-palettes/src/planche/modele.ts) | Colonnes T368–T374 ; rôle H062–H068 ; description T378–T384 ; numéro de nuance ou H069 ; exemple T365 ; contraste ; minimum ; résultat T366 ou T367. H070 remplace les cellules sans contrôle. | Garder les mêmes informations avec les rôles traduits et les nouveaux titres. Afficher « Non applicable » lorsqu’aucun contrôle n’existe pour cet usage. |

Les nombres gardent leur précision actuelle et la virgule décimale. Les codes hexadécimaux, noms de palettes, noms de fichiers et noms de calques cités dans les erreurs restent ceux du fichier concerné.

## Aides supplémentaires proposées

Ces cinq aides sont validées. Elles accompagnent les champs concernés et restent accessibles à la demande ; leur validation n’impose pas cinq paragraphes permanents.

| ID | Emplacement proposé | Nouveau texte |
|---|---|---|
| A01 | Sous « Intensité des couleurs », dans les réglages communs et les réglages de palette | Une valeur proche de 0 produit des nuances plus grises. Une valeur proche de 1 utilise davantage la couleur disponible. |
| A02 | Sous « Luminosité des nuances » | Réglez la luminosité de chaque nuance entre 0 et 1. Les changements s’appliquent à toutes les palettes. |
| A03 | Sous les seuils d’écart entre couleurs | Ce seuil déclenche un signalement lorsque les couleurs sont trop proches. Augmentez-le pour signaler davantage de ressemblances. |
| A04 | Sous les contrastes minimums | Ces valeurs définissent les contrastes minimums de vos promesses. Les modifier change leur résultat, sans modifier les couleurs ni les niveaux WCAG. |
| A05 | Sous le seuil de détection du gris | En dessous de cette valeur de chroma, la couleur est considérée comme presque grise. Le réglage de dérive de teinte est alors désactivé. |

## Ajouts de l’implémentation

Le plan d’ergonomie crée des contrôles et des états que l’inventaire ne couvrait pas. Leurs textes portent un identifiant `N…`. La colonne « Origine » dit d’où vient la formulation : « Plan » pour un libellé écrit dans le plan d’ergonomie ou dans les retours du mainteneur, « À valider » pour une rédaction de l’implémentation, que le mainteneur n’a pas encore lue. Un texte « À valider » se relit avec les autres avant d’être considéré comme retenu.

| ID | Emplacement | Texte | Origine |
|---|---|---|---|
| N001 | Nuancier et planche, repère de la nuance qui porte la référence | Référence | Plan |
| N002 | Configuration, sous la couleur de référence | Référence : {profil} · nuance {numéro} | Plan |
| N003 | En-tête d’un cadre et fiche de l’onglet Planche | Couleur de référence · {profil} · nuance {numéro} | Plan |
| N004 | Onglet Palettes, titre de la première section | Palette | Plan |
| N005 | Onglet Palettes, titre de la seconde section | Configuration · {nom} | Plan |
| N006 | Au-dessus du nuancier, fond du thème et son lien | Fond · Modifier | Plan |
| N007 | Familles d’usages du nuancier | Fonds · Bordures et focus · Fonds pleins · Textes | Plan |
| N008 | Repli sous « Générer sur Figma » | Options de génération | Plan |
| N009 | États d’un cadre, en plus de T302 à T304 | Lecture impossible · Copie | Plan |
| N010 | Fiche de l’onglet Planche | Modifier la palette | Plan |
| N011 | Niveaux WCAG d’un contraste mesuré | AAA · AA · Insuffisant · AA grand texte · Minimum 3:1 atteint · Minimum 3:1 non atteint | Plan |
| N012 | Réglages communs, titres de groupe | Intensités · Minimums des promesses · Détection des couleurs proches | Plan |
| N013 | Infobulle du pivot de la dérive, suite de T097 | Couleur de référence : teinte {teinte}°. {profil} · nuance {numéro} en Thème Light, {numéro} en Thème Dark. | À valider |
| N014 | Titre d’un groupe de messages, avec son nombre | {titre du groupe} · {nombre} | À valider |
| N015 | Liens d’un message vers le réglage qui agit | Intensités de la palette · Dérive de teinte · Luminosité des nuances · Couleurs de fond · Intensités communes · Couleur de référence | À valider |
| N016 | Lien d’un message de promesse vers le nuancier | Voir les deux couleurs | À valider |
| N017 | Repli qui porte l’exception de Figma ou l’exemple d’un écart | Détail technique | À valider |
| N018 | Nuancier, bouton qui ramène au thème d’avant une promesse de l’autre thème | Revenir au thème {Light ou Dark} | À valider |
| N019 | Détail d’une nuance, copie de son code | Copier le code · Code copié | À valider |
| N020 | Détail de la nuance qui porte la référence | Cette nuance est votre couleur de référence exacte. | À valider |
| N021 | Détail d’une nuance identique à sa voisine | Même couleur que la nuance {numéro}. | À valider |
| N022 | Détail d’une nuance, repli des mesures OKLCH et WCAG | Mesures avancées | À valider |
| N023 | Détail d’un usage sans promesse de contraste | Cet usage n’a pas de promesse de contraste. | À valider |
| N024 | Détail d’une association, sous ses spécimens | Minimum demandé : {seuil}:1 | À valider |
| N025 | Repère sur chaque curseur d’intensité, en infobulle | Intensité de la couleur de référence : {intensité} | À valider |
| N026 | Onglet Palettes, titre de premier rang, remplace N004 et N005 | Configuration de la palette | Plan |
| N027 | Titres des cartes de la configuration | Couleur de base · Aperçu · Garanties de contraste · Intensités · Dérive de teinte | Plan |
| N028 | Carte Couleur de base, troisième colonne, et ses trois choix | Palette de base · Auto · Soft · Vivid | Plan |
| N029 | Sous le choix de la palette de base, en Auto | Auto a choisi {profil} | Plan |
| N030 | Nom français d’un rôle, sous son nom en police de code | `solid` fond plein · `on-solid` texte sur fond plein · `text` texte coloré · `surface` fond léger · `border-control` bordure de champ · `border-decorative` séparateur · `focus` anneau de focus | À valider |
| N031 | Relation d’une garantie ; le fond de page s’écrit « fond » | {rôle} sur {rôle} · {rôle} sur fond | À valider |
| N032 | Carte des garanties, titres des deux groupes et leur minimum | Textes lisibles · Éléments visibles · minimum {seuil}:1 | À valider |
| N033 | Sous un spécimen : numéros, résultat et état | {numéro} / {numéro} · fond / {numéro} · ✓ {ratio} · ✗ {ratio} · repos · survol · appui | À valider |
| N034 | Légende de la réglette des garanties | Trait plein : repos · tireté : survol · pointillé : appui. L’état avance d’une nuance, texte et fond ensemble. | À valider |
| N035 | Résultat d’un profil, sur la bascule et dans l’en-tête replié | {profil} ✓ · {profil} ✗ {nombre} | À valider |
| N036 | Ligne des garanties manquées de l’autre thème | Thème {mode} : 1 garantie manquée · Thème {mode} : {nombre} garanties manquées · Voir le thème {mode} | À valider |
| N037 | Garantie `on-solid`, explication unique du fond de page | `on-solid` est le fond de page du thème, `neutral.50` du design system. | À valider |
| N038 | Dernière ligne de la carte des garanties | `border-decorative` {numéro} · séparateur, sans minimum de contraste | À valider |
| N039 | Détail d’une nuance | Sert à · Nuance libre : aucun usage prévu · Mesures détaillées · ◆ Votre couleur de référence exacte | À valider |
| N040 | Résumé replié de la carte Intensités | Communes · Propres · Palette de base {profil} · Soft {intensité} · Vivid {intensité} | À valider |
| N041 | Résumé replié de la carte Dérive de teinte | {préréglage} · synchronisée · {préréglage soft} et {préréglage vivid} · désynchronisée | À valider |
| N042 | Sous les réglettes de la dérive, remplace le bilan | Garanties : {résultat soft} · {résultat vivid} · Voir les garanties | À valider |
| N043 | État d’un cadre rangé que Figma ne connaît plus, en plus de N009 | Cadre introuvable | À valider |
| N044 | En-tête de l’onglet Planche, relecture de la planche | Actualiser | À valider |
| N045 | Notice d’un cadre introuvable, geste de recherche étendue | Chercher dans tout le fichier | À valider |
| N046 | Onglet Planche, carte repliée de l’import, de l’export et du rapport | Palettes et réglages | À valider |
| N047 | Onglet Planche, étiquette de la bascule de thème des fiches | Thème des fiches | À valider |
| N048 | État d’un cadre rangé hors de la page de la planche | {état} · Page « {nom de la page} » | À valider |
| N049 | Pied de l’onglet Planche, génération groupée | Générer la palette qui n’est pas à jour · Générer les {nombre} palettes qui ne sont pas à jour | À valider |
| N050 | Carte « Palettes et réglages », ligne technique | Format des palettes et réglages : {format} · empreinte : {empreinte} · suivi des cadres : version {version} | À valider |
| N051 | Notice d’un cadre introuvable après une recherche bornée | Cadre introuvable : {palette} · Le plugin a cherché ce cadre sur la page « {page} » seulement. Un cadre supprimé, ou coupé puis collé sur une autre page, n’y figure plus. Générer la palette crée un nouveau cadre. · Cherchez dans tout le fichier avant de générer, pour ne pas créer de doublon. | À valider |
| N052 | Génération refusée, cadre existant illisible | Lecture impossible : {palettes} · Figma n’a pas pu lire le cadre existant de cette palette. Aucune palette n’a été générée, pour ne pas créer un second cadre à côté du premier. · Actualisez l’onglet Planche, puis relancez la génération. | À valider |
| N053 | Suivi des cadres d’une version plus récente | Planche d’une version plus récente · Les cadres de ce fichier ont été générés par une version plus récente d’UCM Palettes. Cette version ne peut ni les lire ni les mettre à jour. · Mettez le plugin à jour pour générer les palettes. | À valider |
| N054 | Génération groupée interrompue, suite de T325 à T330 | celle de {palette} est conservée · celles de {palettes} sont conservées · {palette} n’a pas encore été générée · {palettes} n’ont pas encore été générées · Réessayez : la génération reprend à cette palette. | À valider |
| N055 | Tête des Réglages communs, au-dessus de l’aperçu compact | Palette ouverte : {nom} · Thème {mode} | À valider |
| N056 | Légende du tracé des courbes, Réglages communs | Trait plein : Thème Light · tireté : Thème Dark. ◆ : la référence de « {nom} », insérée à la nuance {numéro} en Thème Light et {numéro} en Thème Dark, à sa propre luminosité. | À valider |
| N057 | Résumés repliés des cartes de seuils | Texte {seuil}:1 · Éléments graphiques {seuil}:1 · Soft et Vivid {écart} · Deux palettes {écart} · Gris {chroma} | À valider |
| N058 | Nom accessible de « Rétablir » | Rétablir les valeurs par défaut : {titre de la carte} | À valider |
| N059 | Sous l’alerte « courbe hors garantie » | Cette vérification porte sur les courbes communes, pour toutes les teintes. Les garanties d’une palette se lisent dans sa carte « Garanties de contraste ». | À valider |
| N060 | Infobulle de « Rétablir » inactif, carte Luminosité des nuances | Ces réglages n’ont pas les onze nuances par défaut : les courbes par défaut ne s’y appliquent pas. | À valider |
| N061 | Unités après les champs de seuil | :1 · ΔEok · chroma | À valider |
| N062 | En-tête d’un cadre de la planche, sous le nom | Couleur de référence {hexa} · {profil} · nuance {numéro} · nuance {numéro} en Thème Light, {numéro} en Thème Dark · Garanties : {résultat soft} · {résultat vivid} | À valider |
| N063 | Bloc « Couleur de référence » de la planche | Profil porteur : {profil} · nuance {numéro} · Palette de base : {profil}, choisie pour cette palette | À valider |
| N064 | Bloc « Couleur de référence », tableau et mesures | Contrastes de la couleur de référence · Comparée avec · Contraste · Niveau WCAG · Blanc · Noir · Fond du thème Light · Fond du thème Dark · Mesures avancées · Luminosité L : {L} · chroma C : {C} · teinte H : {H}° · intensité : {part} · CSS : oklch({L} {C} {H}) | À valider |
| N065 | Carte d’une nuance, niveau WCAG le plus haut pour du texte | AAA · AA · AA grand texte · Insuffisant | À valider |
| N066 | Carte d’une nuance, un rôle par ligne, puis le contraste au fond | {rôle} · {nom français} · {état} · Fond {contraste}:1 · {niveau} · Très proche de {profil} | À valider |
| N067 | Garanties de la planche : titre, note, mesure sous un spécimen | Garanties de contraste · Thème {mode} · Chaque rôle correspond au même numéro de nuance dans toutes les palettes de marque. · {profil} · {numéro} / {numéro} · ✓ {ratio}:1 | À valider |
| N068 | Grilles de contraste : titre, note et légende | Grilles de contraste · Thème {mode} · {profil} · Chaque case compare librement deux nuances de la même rampe. Ces cases ne sont pas des garanties : elles répondent à la question « quelle nuance puis-je poser sur quelle nuance ». · Vert : au moins {seuil}:1, pour du texte. Jaune : au moins {seuil}:1, pour un élément visible ou du grand texte. Gris : en dessous de {seuil}:1. | À valider |
| N069 | « Lire les valeurs », remplace la légende de la planche | Lire une garantie : chaque ligne nomme deux rôles, le premier posé sur le second. Sous chaque spécimen, les deux numéros de nuance comparés, puis ✓ quand le contraste atteint le minimum de son groupe, ✗ sinon. Minimums demandés : {seuil}:1 pour les textes, {seuil}:1 pour les éléments visibles. · Soft et Vivid : chaque état montre deux spécimens aux mêmes numéros de nuance, Soft, plus doux, puis Vivid, plus intense. · « Fond » donne, sous chaque nuance, son contraste avec le fond du thème et le niveau WCAG le plus haut qu’il atteint pour du texte. · Couleurs proches : un écart sous {écart} entre Soft et Vivid, ou sous {écart} entre deux palettes, est signalé. Ces écarts détectent les ressemblances ; ils ne mesurent pas la lisibilité. | À valider |
| N070 | Bannière du conflit d’enregistrement, avant « Recharger les palettes » ; remplace aussi le geste de T107 | Exporter mes modifications · Exportez vos modifications pour les conserver, puis rechargez les palettes pour récupérer la version du fichier. | À valider |
| N071 | Infobulle des gestes inactifs pendant un conflit | Exportez vos modifications ou rechargez les palettes avant d’enregistrer, d’importer ou de générer. | À valider |
| N072 | Écart d’import, valeurs modifiées et seuils | Palette à modifier : {palette} ({champs}) · nom · couleur de référence · palette de base · intensités propres · dérive de teinte · minimum des textes · minimum des éléments visibles · écart minimal entre Soft et Vivid · écart minimal entre deux palettes · seuil de détection du gris | À valider |
| N073 | Écart d’import, nature de l’effet | Couleurs : les nuances des palettes concernées changent. · Minimums des promesses : le résultat des garanties peut changer, sans changer les couleurs. · Détection des couleurs proches : seuls les signalements peuvent changer. | À valider |
| N074 | Écart d’import, conséquence sur la planche | Sur la planche : aucun cadre à jour n’est touché. · {nombre} cadres passeront « À mettre à jour » ({palettes}) · {nombre} cadres resteront sans palette ({palettes}) | À valider |
| N026 | Résumé du repli N008 | Options de génération : sans grille des contrastes · Options de génération : avec la grille des contrastes | À valider |
| N027 | Détail d’un usage peint sur le fond du thème | {usage} · Fond du thème | À valider |
| N075 | Barre du sélecteur, bouton qui ouvre la création ; remplace T021 | + Nouvelle palette | Plan |
| N076 | Onglet Palettes, titre de premier rang ; remplace N026 | Palette {nom} | Plan |
| N077 | Première carte de la configuration ; remplace « Couleur de base » dans N027 | Configuration de la palette | Plan |
| N078 | Second onglet du plugin ; remplace T005 | Planches | Plan |
| N079 | Carte d’une palette supprimée, geste qui retire son cadre de Figma | Supprimer définitivement | Plan |
| N080 | Carte d’une palette supprimée, sous son nom | Palette supprimée du plugin. Ce cadre ne sera plus mis à jour. | À valider |
| N081 | Sous le sélecteur de couleur ouvert sur le fond du thème | Ce fond s’applique à toutes les palettes. | À valider |
| N082 | Étiquette accessible de la pastille du fond | Modifier le fond du thème {Light ou Dark}, actuellement {hexa} | À valider |
| N083 | Après « Supprimer définitivement » | Cadre « {nom} » supprimé. Ctrl+Z dans Figma le rétablit. | À valider |
| N084 | Infobulle de « Supprimer définitivement » inactif pendant un conflit | Exportez vos modifications ou rechargez les palettes avant de supprimer un cadre. | À valider |
| N085 | Suppression refusée par le sandbox | Cadre non supprimé : {nom} · Le fichier a changé depuis la dernière lecture : ce cadre n’est plus celui d’une palette supprimée. · Actualisez l’onglet Planches. | À valider |
| N086 | Titre de la carte de création | Nouvelle palette | À valider |
| N087 | Sélecteur de couleur, nom et valeur lue des deux commandes | Saturation et luminosité · Saturation {s} %, luminosité {v} % · Teinte · {h}° | À valider |
| N088 | Sélecteur de couleur, menu de format et champs du code | Format du code · Hex · RGB · HSL · Code hexadécimal · Rouge, de 0 à 255 · Vert, de 0 à 255 · Bleu, de 0 à 255 · Teinte, en degrés · Saturation, en % · Luminosité, en % | À valider |
| N089 | Sélecteur de couleur, titre des pastilles proposées | Nuances de la palette ouverte · Fonds par défaut et premières nuances | À valider |
| N090 | Sélecteur de couleur, nom d'une pastille proposée | Fond {Light ou Dark} par défaut · Blanc · Vivid {numéro} · {nom}, {hexa} | À valider |
| N091 | Luminosité des nuances, titre de chaque ligne de la table | Light · Dark | À valider |
| N092 | Minimums et détection, aide sous chaque libellé | Pour text sur surface, on-solid sur solid et text sur le fond. · Pour la bordure de champ, l’anneau de focus et le fond plein, état hover. · Mesuré entre les deux profils d’une même nuance. · Mesuré sur les nuances 500, 600 et 700 de Vivid, en Thème Light. | À valider |
| N093 | Planche, titres des sections d’un thème | Les deux rampes · Quelle nuance pour quel usage · {profil} · Interface d’exemple · {profil} · Contrastes, nuance par nuance | Maquette W3.6 |
| N094 | Planche, chaque usage : nom, rôle et ce qu’il habille | Fonds légers · fond d’un bloc, d’un bouton soft · Textes colorés · lien, texte d’accent · Fonds pleins · bouton principal, badge plein · Bordures de champ · champ de saisie, case · Anneau de focus · focus clavier · focus · état focus · Séparateurs · filet, bordure de carte | Maquette W3.6 |
| N095 | Planche, libellés des spécimens | Soft · Lien coloré · Bouton · Champ | Maquette W3.6 |
| N096 | Planche, repères d’une pastille et note sous les rampes | ◆ · ≈ · ◆ : la couleur de référence exacte. · ≈ : Soft et Vivid presque identiques à cette nuance. | À valider |
| N097 | Planche, interface d’exemple E2 | Paramètres de l’équipe · Nouveau · Général · Membres · Facturation · Nom de l’équipe · Studio Nord · Notifier les membres · Accès invité · Les membres invités reçoivent un e-mail. En savoir plus · Annuler · Brouillon · Enregistrer | Maquette W3.6 |
| N098 | Planche, en-tête d’un thème et verdict ; remplace N062 pour le résultat, et l’en-tête de section | Thème {Light ou Dark} · fond {hexa} · ✓ Toutes les garanties tenues · 1 garantie manquée · {nombre} garanties manquées | À valider |
| N099 | Planche, garantie sous un état, et légende des grilles ; remplace N064 à N069 | ✓ sur {partenaire} : {ratio}:1 · ✗ {partenaire} dessus : {ratio}:1 · Ligne : fond · colonne : texte · gras dès {seuil}:1 · maigre dès {seuil}:1 · effacé en dessous | À valider |
| N100 | États d’une paire, dans le plugin et sur la planche ; remplace T131, T132 et les états de N033 et N034 | default · hover · active · « {emploi}, état hover » · « État {état} : {ratio} pour un minimum de {seuil}:1 » · Trait plein : default · tireté : hover · pointillé : active. | Mainteneur, W3.4 |

## Points à conserver lors de l’application

- **T107** retire une cause présentée comme certaine. Le code constate un changement depuis la lecture ; il n’identifie pas l’auteur de ce changement.
- **T123 et T405** précisent que la nuance la plus proche est choisie selon la luminosité du thème clair. La fonction [cranLePlusProche](../../../../packages/couleur/src/palette.ts) ne compare pas la ressemblance globale des couleurs.
- **T156** distingue les intensités personnalisées des réglages communs. Modifier les réglages communs ne corrige pas une palette qui utilise ses propres intensités.
- **T246** respecte la borne réelle : 360° est exclu par [validerDerives](../../../../packages/couleur/src/recette.ts).
- **T257, T258, T290 et T291** parlent d’erreurs de validation. Plusieurs refus peuvent concerner le même champ ; leur nombre n’est pas un nombre de champs distincts.
- **T264 et T271** annoncent que la réinitialisation retire les palettes du plugin. Les cadres déjà créés dans Figma restent présents.
- **T314 et T388** conservent la version et l’identifiant technique après les informations utiles au designer. Si ces détails deviennent repliables dans l’interface, ce sera une modification d’interface à valider.
- **T325–T330** décrivent la création interrompue sans annoncer la suppression de l’ancien cadre. Le code conserve cet ancien cadre lorsqu’un remplacement échoue.
- **T330 et H072** gardent le message technique reçu de Figma comme détail. Le plugin ne peut pas prévoir ni réécrire toutes les formulations de Figma.
- **T363** limite l’absence d’alerte à cette liste. Les contrastes insuffisants restent visibles dans les tableaux d’usages.
- **T389 et H070** distinguent un minimum non atteint d’un contrôle non applicable. Cette distinction demandera de traiter les emplacements séparément.
- **T414** demande de transmettre aussi l’action sur la planche. Changer les mots de l’alerte ne suffit pas à faire apparaître cette partie actuellement omise.
- **H001–H003** proviennent du socle partagé avec Plugin Exporter. L’application devra fournir les libellés de Palettes au socle pour éviter un changement involontaire dans l’autre plugin.
- **H012–H013 et H062–H068** proposent des noms d’affichage. Les identifiants enregistrés, clés du rapport et noms techniques des pastilles restent des données.
- Les nouveaux libellés sont parfois plus longs. Leur application devra inclure une relecture dans la fenêtre minimale et sur les cartes de la planche, dont certaines colonnes ont une largeur fixe.

## Application par l’agent

L’agent lit les [décisions de rédaction](./DECISIONS-REDACTION-PALETTES.md), puis le [plan d’ergonomie](./PLAN-ERGONOMIE-PALETTES.md). L’export de validation conserve les réponses originales du mainteneur ; il ne doit pas être réécrit.

La validation d’une formulation n’impose pas de maintenir son emplacement. Le plan retire plusieurs éléments de la recette mainteneur et déplace les détails techniques. Les repères T/H/A restent utilisables pour ces changements.
