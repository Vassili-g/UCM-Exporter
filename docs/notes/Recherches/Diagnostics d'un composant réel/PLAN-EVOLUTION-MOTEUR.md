# Plan d'évolution du moteur : propriétés visuelles et messages de racine

> Statut : en cours. E0 à E5 sont faits, H0, H1 et H2
> franchies ; leurs preuves, décisions et textes retenus sont dans
> [PREUVES-EVOLUTION-MOTEUR.md](./PREUVES-EVOLUTION-MOTEUR.md), qui fait foi
> sur la section 9. Le prochain lot est E6. Ce plan réunit deux sujets qui
> touchent les mêmes sites du moteur. Le premier exécute les décisions de H3
> ([DECISION-PROPRIETES-VISUELLES.md](./DECISION-PROPRIETES-VISUELLES.md)) et
> fait passer le contrat en 14.0. Le second étend le regroupement des messages
> de racine (L6 du [plan précédent](./PLAN-DIAGNOSTICS-COMPOSANT-REEL.md)) aux
> messages que le mainteneur n'a pas encore validés. Les faits de la section 2
> ont été relus dans le code et dans `@figma/plugin-typings` 1.138.0 ; les
> mesures de H0 complètent ce que les typings ne disent pas. Une relecture critique
> a remesuré chaque fait et corrigé le plan ; la section 11 dit ce qu'elle a
> changé.

## Instruction donnée à l'agent

Exécuter les lots dans l'ordre de la section 7. Après une interruption,
reprendre depuis le journal de preuves (section 6). Ne rendre la main qu'à la
porte H1, à la lecture du rang des ombres (E3), sur un contrôle de référence
rouge, sur une modification
étrangère qui recouvre un fichier visé, ou quand le code contredit un fait de la
section 2. Dans ce dernier cas, le journal consigne le fait, la mesure qui le
contredit et le lot arrêté.

L'agent travaille dans `UCM-Exporter`. Il lit UCM-Playground pour en copier les
contrats 13.0 (lot E1) et n'y modifie rien.

Avant d'écrire un document ou un commentaire, charger la skill
`rediger-sans-tics-ia`. Avant d'écrire un texte lu par le designer, charger
aussi `rediger-diagnostics-ucm`, et ne reprendre que le texte retenu à H1, mot
pour mot.

## 1. Point de départ

**Sujet A, les décisions de H3.** Le mainteneur a tranché quatre propriétés que
le contrat n'écrit pas :

| Propriété | Décision |
|---|---|
| ombre et flou | un catalogue `effectStyles`, sur le modèle de `textStyles` |
| opacité | un champ `opacity` tokenisé ; une opacité sans variable avertit |
| enfants d'un cadre sans auto layout | `position: "absolute"`, `constraints` et `inset`. H2 revient sur la seconde moitié : un axe figé en `stretch` ou `scale` réclame toujours sa variable de dimension |
| masque | l'avertissement reste |

Ensemble, elles font passer `CONTRACT_VERSION` de 13.0 à 14.0.

**Sujet B, les textes restants de L6.** Sur un component set, un message qui
vise la racine de chaque variant s'écrit une fois, sans nom de calque, si son
texte de groupe est validé. Trois le sont : la borne sans variable, `effect` et
le champ sans variable. Les autres donnent encore une ligne par variant. La
section 2.5 les recense, la section 9.2 propose leurs textes.

Les deux sujets se croisent : l'opacité quitte le relevé des propriétés sans
champ et prend un message à elle, le texte de groupe d'`effect` change de sens
quand les effect styles se publient, et l'absence d'auto layout sur une racine
change de message avec le cadre libre. Les lots du sujet B viennent donc après
ceux du sujet A.

## 2. Faits vérifiés

Chaque fait porte sa source. Un fait tiré des typings cite
`node_modules/@figma/plugin-typings/plugin-api.d.ts` (version 1.138.0) par son
numéro de ligne, sans lien : le dossier n'est pas suivi par Git.

### 2.1 L'API Figma

- **F1. Un calque porte sept familles d'effets, pas quatre.** Le type `Effect`
  (`plugin-api.d.ts:4584`) réunit `DropShadowEffect`, `InnerShadowEffect`,
  `BlurEffect` (`LAYER_BLUR` ou `BACKGROUND_BLUR`, chacun en `NORMAL` ou
  `PROGRESSIVE`), `NoiseEffect`, `TextureEffect`, `GlassEffect` et
  `ShaderEffect`. Le relevé actuel les confond sous `effect`
  ([unsupportedProperties.ts:94](../../../../packages/plugin-exporter/src/contract/unsupportedProperties.ts)).
- **F2. Un effet porte ses liaisons champ par champ.** Une ombre expose
  `boundVariables` sur `color`, `radius`, `spread`, `offsetX` et `offsetY`
  (`VariableBindableEffectField`, `plugin-api.d.ts:6854` ; ombre portée en
  `plugin-api.d.ts:4298`). Un flou ne lie que `radius` (`plugin-api.d.ts:4360`).
  Bruit, texture et verre déclarent `boundVariables?: {}` : aucune liaison
  possible.
- **F3. Un effect style range ses effets dans `effects`**, chacun avec ses
  propres `boundVariables`. Au niveau du style, `boundVariables.effects` n'est
  qu'une liste d'alias sans champ (`EffectStyle`, `plugin-api.d.ts:12634`). Le
  même constat vaut pour le calque (`boundVariables.effects`,
  `plugin-api.d.ts:6562`). Le champ d'une liaison ne se lit donc que sur
  l'effet.
- **F4. Un calque cite son style par `effectStyleId`**, une chaîne
  (`BlendMixin`, `plugin-api.d.ts:7498`), vide sans style. Les typings ne disent
  pas ce que devient cet identifiant quand le designer modifie un effet du
  calque : c'est la mesure M2.
- **F5. L'opacité d'un calque se lie à une variable.** `VariableBindableNodeField`
  contient `opacity` (`plugin-api.d.ts:6814`), et la liaison se lit dans
  `node.boundVariables.opacity`, comme `width`. Les typings ne disent pas sur
  quelle échelle la variable liée s'exprime (0 à 1, ou 0 à 100) : c'est la
  mesure M1.
- **F6. Sous un GROUP ou une `BOOLEAN_OPERATION`, la position d'un enfant ne
  vient pas de son parent.** `relativeTransform` est relatif au conteneur
  englobant, cadre, composant ou instance, et saute les groupes
  (`plugin-api.d.ts:7196`). Ces deux types n'ont pas de `constraints` : leurs
  enfants suivent celles du cadre englobant (`plugin-api.d.ts:7134`).
  `absoluteInset` calcule pourtant avec la largeur et la hauteur du parent
  direct ([flexLayout.ts:329](../../../../packages/plugin-exporter/src/contract/flexLayout.ts)).
- **F7. Un enfant de cadre sans auto layout lit `FIXED` dans son menu**, sauf un
  texte à taille automatique : `HUG` n'est valide que sur un auto layout et sur
  un texte, `FILL` que sur un enfant d'auto layout (`plugin-api.d.ts:7266`).
- **F8. Seul un texte rend des fills « mixed ».** `fills` peut valoir
  `figma.mixed` quand des caractères n'ont pas la même couleur
  (`plugin-api.d.ts:8640`) ; `strokes` n'a pas cette valeur
  (`plugin-api.d.ts:8560`). La branche « mixed » des strokes
  ([unsupportedProperties.ts:122](../../../../packages/plugin-exporter/src/contract/unsupportedProperties.ts))
  ne se déclenche donc jamais.

### 2.2 Le moteur, pour le sujet A

- **F9. Le relevé des propriétés sans champ** vit dans `proprietesNonPortees`
  ([unsupportedProperties.ts:87](../../../../packages/plugin-exporter/src/contract/unsupportedProperties.ts)) :
  effets en ligne 94, opacité en ligne 108. `warnUnsupportedProperties`
  l'appelle sur le node de layout et sur chaque calque publié qui n'est pas une
  dépendance ([extractLayout.ts:142](../../../../packages/plugin-exporter/src/contract/extractLayout.ts),
  appels en lignes 430 et 662).
- **F10. Le modèle de `textStyles` est une passe séparée.**
  `extractVariantTypography` parcourt la matrice par `textSlots`, charge chaque
  style une fois par un chargeur injectable (`TextStyleLoader`, défaut
  `figma.getStyleByIdAsync`), lit les liaisons du style et jamais celles du
  calque, puis publie un catalogue et des usages `{ slotPath, style }`
  ([extractVariantTypography.ts:128](../../../../packages/plugin-exporter/src/contract/extractVariantTypography.ts),
  [extractVariantTypography.ts:263](../../../../packages/plugin-exporter/src/contract/extractVariantTypography.ts)).
  Un calque sans style avertit et ne publie aucun usage (ligne 136). Un chemin
  de typographie part toujours d'un enfant : la racine n'a pas de texte.
- **F11. Une vue publiée est cinq renvois**, `structure`, `typography`,
  `composes`, `icons` et `paintPlacements`
  ([types.ts:935](../../../../packages/kit/src/format/types.ts)), catalogués par
  `compactVariants` ([compactVariants.ts:142](../../../../packages/plugin-exporter/src/contract/compactVariants.ts)).
  `paintPlacements` désigne la racine par le chemin `[]`.
- **F12. `describeNode` porte déjà un collecteur par variant**, les chemins
  publiés (`publishedNodePaths`,
  [extractLayout.ts:422](../../../../packages/plugin-exporter/src/contract/extractLayout.ts)).
  Ce relevé inscrit aussi les descendants d'une feuille (ligne 455) pour les
  peintures : il ne peut pas servir à savoir quel calque est publié.
- **F13. Un enfant n'est placé que dans trois cas.** `flexItemProperties` rend
  la position absolue, la place de grille ou le flux linéaire, et `{}` pour
  tout autre parent ([flexLayout.ts:587](../../../../packages/plugin-exporter/src/contract/flexLayout.ts)).
- **F14. Trois messages disent l'absence d'auto layout.** « il range N layers »
  et « il enveloppe X » sur un conteneur publié
  ([extractLayout.ts:252](../../../../packages/plugin-exporter/src/contract/extractLayout.ts)) ;
  « il n'utilise pas d'auto layout » sur le node de layout
  (`warnMissingDirection`, ligne 621) ; « Figma ne lui applique ni gap ni
  padding » quand `extractLayout` sonde le gap et le padding du node de layout
  sans tester sa disposition (lignes 667 à 681, message en
  [nodeBindings.ts:372](../../../../packages/plugin-exporter/src/contract/nodeBindings.ts)).
  `extractDimensions` sonde les mêmes champs sur le node de layout de chaque
  représentant de taille ([extractSizes.ts:63](../../../../packages/plugin-exporter/src/contract/extractSizes.ts)),
  par `resolveField` et `resolveSidedField` : les deux passent par la branche
  `no-auto-layout` de `resolveGroup`, et un garde posé dans `extractLayout`
  seul laisserait sortir ce message.
- **F15. Un cadre libre qui sert de node de layout n'a pas de taille dans le
  contrat.** Son menu lit `FIXED` (F7), que `containerSizing` publie en
  `stretch` sans avertir ([flexLayout.ts:468](../../../../packages/plugin-exporter/src/contract/flexLayout.ts),
  règle de [FORMAT.md, « Dimensions et bornes »](../../../format/FORMAT.md#dimensions-et-bornes)).
  Tant que ses enfants restent dans un flux de repli, leur contenu lui donne
  une hauteur. Placés en absolu, ils ne lui en donnent plus : un consommateur
  qui écrit `height: stretch` hors d'un parent dimensionné rend une boîte vide.
  `structure.sizing` se lit sur le composant, jamais sur le node de layout
  (`resolveContainerSizing(component)`,
  [extractLayout.ts:688](../../../../packages/plugin-exporter/src/contract/extractLayout.ts)).
  Les vues exactes passent le composant comme node de layout
  ([extractStructure.ts:257](../../../../packages/plugin-exporter/src/contract/extractStructure.ts)) ;
  seule la projection de référence peut élire un wrapper, dont aucun champ ne
  porte la taille. Un cadre libre enfant, lui, réclame déjà sa dimension
  `FIXED` par `resolveSlotSize` : le scénario le montre sur `Overlay`.
- **F16. `menuDeDimensionnement` est l'unique lecture du menu d'un enfant**
  ([flexLayout.ts:438](../../../../packages/plugin-exporter/src/contract/flexLayout.ts)).
  Un enfant absolu et un enfant de cadre libre y lisent le menu seul : un axe
  `FIXED` y réclame sa variable par `resolveSlotSize`
  ([nodeBindings.ts:718](../../../../packages/plugin-exporter/src/contract/nodeBindings.ts)),
  même sous une contrainte `STRETCH` ou `SCALE`.
- **F17. Le type d'un token d'opacité dépend de son scope ou de son nom.**
  `isUnitless` rend `number` pour un scope `OPACITY` ou `FONT_WEIGHT`, ou pour
  un segment de chemin reconnu ; une variable en `ALL_SCOPES` au nom neutre
  sort en dimension `px`
  ([exportTokens.ts:94](../../../../packages/plugin-exporter/src/tokens/exportTokens.ts)).

### 2.3 Le kit et les paquets

- **F18. La version et la fenêtre.** `CONTRACT_VERSION = '13.0'`
  ([version.ts:16](../../../../packages/kit/src/format/version.ts)) ;
  `VERSION_CONTRAT_MINIMALE = "12.0"` et `VERSION_CONTRAT_MAXIMALE = "13.0"`
  ([version-contrat.mjs:13](../../../../packages/kit/src/lecteurs/version-contrat.mjs)).
- **F19. Les jeux figés.** `packages/kit/fixtures/contrats/` porte 11.0, hors
  fenêtre, et 12.0, le jeu N-1. UCM-Playground porte quatre contrats 13.0 à son
  commit `2f2f9b8` (Alert, Button, StressTest, TileLink), mesurés par
  `git show HEAD:<chemin>`.
- **F20. Chaque version a son validateur borné.** `validation-contrat.mjs`
  ajoute, par version, une fonction qui refuse un champ avant sa version
  (`validerTypographie130`, ligne 1544, par `versionAuMoins(contrat, 13, 0)`).
  Les parties d'une vue sont énumérées deux fois : la liste des clés d'une vue
  (ligne 1159) et `CATALOGUES_DE_VUES_11` (ligne 1316).
  [variant-views.mjs](../../../../packages/kit/src/lecteurs/variant-views.mjs)
  résout les cinq renvois (lignes 41 à 44).
- **F21. Les références de token se relèvent sans liste de champs.**
  `collecterReferences` balaie tout le contrat hors `samples` et `meta`
  ([references-token.mjs:38](../../../../packages/kit/src/lecteurs/references-token.mjs)) :
  un champ tokenisé nouveau entre au contrôle des tokens sans code ajouté.
- **F22. Chaque champ du schéma relève d'une aide.** `CHAMPS` et `SANS_AIDE`
  ([caracteristiques.mjs:52](../../../../packages/kit/src/lecteurs/caracteristiques.mjs))
  couvrent chaque couple du schéma publié, et `packages/cli/tests/aides.test.mjs`
  refuse un couple sans aide ni raison, et une caractéristique sans aide.
- **F23. Les numéros publiés.** `@ucm-kit/core` 0.1.40, `@ucm-kit/cli` 0.1.48 et
  `@ucm-kit/adapter-typescript` 0.1.41 ; les deux derniers épinglent
  `@ucm-kit/core` 0.1.40 à l'exact. `tests/versionSuitLeContenu.test.mjs`
  refuse un fichier publiable modifié depuis le commit qui a posé le numéro,
  `tests/` et `fixtures/` exceptés. Le numéro de la CLI est écrit dans
  `README.md`, `docs/guides/RECETTE.md`, `packages/cli/README.md` et
  `packages/adapter-typescript/README.md`, celui du noyau dans `README.md` et
  `packages/kit/README.md` ; `tests/pinDocumente.test.mjs` les compare.
- **F24. La 13.0 est montée en un commit** (`e393ef4`) : types, schéma,
  version, fenêtre, jeu 12.0 figé, validateurs, `refus-enregistres.json`,
  trois paquets, `CHANGELOG-FORMAT.md`, `COMPATIBILITE.md`, `FORMAT.md`,
  `AGENTS.md`, `SPEC.md` et la skill `consommer-contrat`.

### 2.4 Le moteur, pour le sujet B

- **F25. Le mécanisme de L6.** `declarerLesRacinesDeVariants` inscrit les
  racines par canal ([localisation.ts:179](../../../../packages/plugin-exporter/src/contract/localisation.ts)),
  `estUneRacineDeVariant` les reconnaît (ligne 192), `pousserPourLesVariants`
  pousse un point sans nom de calque (ligne 202). `extractStructure` déclare
  les racines sur `warnings` pour un set de plus d'un variant
  ([extractStructure.ts:155](../../../../packages/plugin-exporter/src/contract/extractStructure.ts)).
  `impactDesVariants` n'est posé que sur `effect`
  ([unsupportedProperties.ts:102](../../../../packages/plugin-exporter/src/contract/unsupportedProperties.ts)).
- **F26. Les peintures d'une racine passent par un autre canal.**
  `extractVariantTokens` donne à chaque variant un tableau `variantWarnings`
  ([extractVariantTokens.ts:161](../../../../packages/plugin-exporter/src/contract/extractVariantTokens.ts)),
  que `getSlotTokens` remplit, puis le recopie dans `warnings` (ligne 187).
  Les racines ne sont pas déclarées sur ce tableau. Le stroke weight d'une
  racine, résolu par `resolveGroup` depuis ce canal
  ([extractSlotTokens.ts:79](../../../../packages/plugin-exporter/src/contract/extractSlotTokens.ts)),
  garde donc une ligne par variant alors que son texte de groupe est validé.
- **F27. Deux messages nomment la racine sans la viser.** L'alignement illisible
  d'un enfant et son `layout grow` écrivent `parent.name` dans le titre et
  l'impact ([flexLayout.ts:605](../../../../packages/plugin-exporter/src/contract/flexLayout.ts),
  ligne 625). Sous une racine de variant, ce nom change d'un variant à l'autre
  et la phrase ne fusionne pas.
- **F28. Une variable introuvable ne s'annonce qu'une fois.** `resolveById`
  garde la promesse par variable ([variables.ts:305](../../../../packages/plugin-exporter/src/variables.ts)),
  et le message nomme le calque du premier appel (ligne 316). Sur les racines,
  ce message fait déjà une ligne, qui ne cible que la première racine.

### 2.5 Les messages qui peuvent viser une racine

Une racine de variant est un `COMPONENT`, jamais un texte : tout réglage propre
à un calque texte est écarté. La colonne « Détail » dit si le texte change
d'une racine à l'autre ; la fusion se faisant sur le texte, un détail qui varie
donne une ligne par valeur distincte.

| # | Message actuel (manque) | Site | Détail | Suite |
|---|---|---|---|---|
| R1 | effect : aucun champ | `unsupportedProperties.ts:94` | aucun | groupé ; son sens change en E3 (texte en 9.1) |
| R2 | opacity : aucun champ | `unsupportedProperties.ts:108` | aucun | quitte le relevé en E2 (texte en 9.1) |
| R3 | fill non uni | `unsupportedProperties.ts:130` | aucun | 9.2 |
| R4 | stroke non uni | `unsupportedProperties.ts:130` | aucun | 9.2, avec R3 |
| R5 | blend mode | `unsupportedProperties.ts:139` | aucun | 9.2 |
| R6 | mask | `unsupportedProperties.ts:152` | aucun | 9.2 |
| R7 | dash | `unsupportedProperties.ts:160` | aucun | 9.2 |
| R8 | fill ou stroke « mixed » | `unsupportedProperties.ts:122` | aucun | écarté : F8 |
| R9 | réglages de texte | `unsupportedProperties.ts:242` | aucun | écarté : une racine n'est pas un texte |
| R10 | ni gap ni padding sans auto layout | `nodeBindings.ts:372` | aucun | reste (H2) ; texte de groupe en 9.1.7, écrit en E4 |
| R11 | vertical gap « Auto » | `nodeBindings.ts:396` | aucun | 9.2 |
| R12 | côtés reliés à des variables différentes | `nodeBindings.ts:452` | liste des tokens | 9.2 |
| R13 | deux réglages se contredisent | `nodeBindings.ts:464` | liste des tokens | 9.2 |
| R14 | côtés sans variable exploitable | `nodeBindings.ts:508` et `:558` | liste des côtés | 9.2 |
| R15 | champ sans variable | `nodeBindings.ts:522` | libellé du champ | groupé ; F26 pour le stroke weight |
| R16 | borne sans variable | `nodeBindings.ts:815` | liste des bornes | groupé |
| R17 | pas d'auto layout (node de layout) | `extractLayout.ts:621` | aucun | reste (H2) ; impact et texte de groupe en 9.1.7, écrits en E4 |
| R18 | alignement d'auto layout illisible | `flexLayout.ts:554` | aucun | 9.2 |
| R19 | taille d'une piste de grille illisible | `flexLayout.ts:81` | rang de la piste | 9.2 |
| R20 | alignement d'un enfant illisible, nom de la racine dans le corps | `flexLayout.ts:605` | nom de la racine | 9.2 (F27) |
| R21 | `layout grow` hors menu, nom de la racine dans le corps | `flexLayout.ts:625` | nom de la racine, valeur | 9.2 (F27) |
| R22 | fill ou stroke relié à aucune variable | `extractSlotTokens.ts:232` | nombre de peintures | 9.2 (F26) |
| R23 | alignement du stroke illisible | `extractSlotTokens.ts:66` | aucun | 9.2 (F26) |
| R24 | deux fills reliés à des variables différentes | `extractSlotTokens.ts:332` | tokens | 9.2 (F26) |
| R25 | couleur ou stroke qui change de rôle | `extractSlotTokens.ts:358` et `:388` | nom de l'autre calque | écarté : le message nomme deux calques, et son geste dépend de celui qu'il nomme |
| R26 | variable introuvable | `variables.ts:351` | nom du premier calque | écarté du regroupement : une ligne déjà (F28) ; sa cible reste à corriger, hors de ce plan |
| R27 | variant sans aucune couleur liée | `extractVariantTokens.ts:190` | nom du variant | écarté : genre `Variant`, la règle de L6 garde le nom d'un variant précis |

Les textes actuels complets figurent en section 9.2, en tête de chaque message.

## 3. Prémisses de la note remesurées

| Prémisse de la note | Mesure | Conséquence |
|---|---|---|
| Figma porte quatre types d'effets. | Sept familles, et le flou progressif (F1). | E3 ne publie que l'ombre portée, l'ombre intérieure et les deux flous en `NORMAL`. Les autres gardent un avertissement, porté par le style (texte en 9.1). |
| Les champs de l'effet sont liés à des variables (`boundVariables.effects`). | La liste du style et du calque n'a pas de champ ; la liaison par champ se lit sur chaque effet (F2, F3). | E3 lit `style.effects[i].boundVariables`, comme la typographie lit le style et jamais le calque. |
| Un calque cite son style dans sa vue exacte. | `effectStyleId` existe, vide sans style (F4). Le détachement n'est pas documenté. | Mesure M2 à H0. E3 compare les effets du calque à ceux du style seulement si M2 montre que l'identifiant survit à une modification. |
| Une ombre portée s'ajoute après le `border`, dans l'ordre des effets Figma. | Les typings ne disent pas quel effet de la liste Figma peint au-dessus. | Mesure M3 à H0 ; l'aide `ombre` écrit l'ordre mesuré. |
| `tokens.json` ne change pas : une variable `FLOAT` s'y écrit déjà en `number`. | Faux sans scope `OPACITY` ni nom reconnu : la variable sort en `px` (F17). L'échelle de la valeur n'est pas documentée (F5). | Mesure M1 à H0, décision de H2 sur l'échelle publiée. Le type DTCG reste hors de ce plan (section 4). |
| Cadre libre, forme A : le schéma ne change pas, et le calcul par le centre vaut tel quel. | Vrai pour un cadre, un composant et une instance. Faux sous un GROUP ou une `BOOLEAN_OPERATION` (F6). | E4 ne place que les enfants d'un parent qui a des `constraints` ; un groupe garde son avertissement. |
| Cadre libre : classe 1. | Les champs sont connus d'un lecteur 13.0. H2 garde la règle du menu : un axe figé réclame sa variable, même sous `STRETCH` ou `SCALE`. | L'absence de `size` garde son sens ; le point reste en classe 1. |
| Le repli `flex-row` ne s'avertit plus que si le cadre range des enfants que rien ne place. | Tous les enfants d'un cadre sont placés. Le cadre, lui, perd sa taille (F15). | H2 garde les trois avertissements d'absence d'auto layout (F14) : le repli `flex-row` se signale toujours. E4 ajoute, sur le composant, l'avertissement d'une dimension figée sans token (9.1.6). L'impact de R17 et de « il range N layers » disait la disposition perdue ; E4 publie cette disposition, et l'impact change (9.1.7). |

## 4. Décisions prises et hors périmètre

- Aucune loi existante ne se relâche pour faire passer un lot. Un conflit avec
  un invariant d'`AGENTS.md` arrête le lot. E4 réécrit un seul invariant, avec
  l'accord de H2 : la taille de maquette cesse de valoir sur un axe figé d'un
  composant sans auto layout. H2 a refusé l'autre réécriture : le repli
  `flex-row` se signale toujours, même quand tous les enfants sont placés.
- Les tests construisent des arbres synthétiques à noms neutres (`Root`,
  `Card`, `Overlay`, `Badge`). Aucun test ne cite un nom du composant réel.
- Un comportement mesuré à H0 s'encode dans le faux node du test et dans un
  commentaire « Mesuré : … » au site qui en dépend.
- Un seul numéro de contrat pour les trois sujets : 14.0, posé en E1 avec
  toute la forme. Les lots moteur E2 à E4 ne touchent pas au kit ; un lot qui
  devrait le faire monte de nouveau les trois paquets dans son commit.
- E4 place les enfants d'un cadre libre sans toucher à `menuDeDimensionnement`
  (F16). H2 l'a décidé : une contrainte `STRETCH` ou `SCALE` ne dispense pas
  un axe figé de sa variable, sous un cadre libre comme sous « ignore auto
  layout ».
- Un effet posé sur une dépendance n'est ni publié ni averti, comme
  aujourd'hui. L'opacité d'une dépendance se publie, décision de H2 : H3 a
  décidé un champ « sur le composant et sur chaque slot », et une dépendance
  est un slot. Un variant `Disabled` qui atténue l'instance d'une icône
  perdait cette opacité sans message. E2 publie `opacity` sur l'entrée de la
  dépendance quand l'opacité de l'instance diffère de celle de son composant
  principal ; l'égalité ne publie rien, pour ne pas appliquer deux fois
  l'opacité propre à la dépendance.
- Hors périmètre : la publication npm, le masque, le token DTCG `shadow` et le
  type d'un token d'opacité dans `tokens.json` (classe 10), les enfants d'un
  groupe, le flou progressif, les captures de galerie, la cible de R26.

### Forme proposée pour la 14.0

H2 la fixe avant E1. Les noms suivent le vocabulaire CSS, comme le reste du
contrat.

```ts
/** Une ombre d'un effect style. Chaque valeur est une référence de token. */
export type ShadowEffect = {
  type: 'drop-shadow' | 'inner-shadow';
  color?: string;
  offsetX?: string;
  offsetY?: string;
  blur?: string;
  spread?: string;
};

/** Un flou d'un effect style : `filter` ou `backdrop-filter`. */
export type BlurEffect = { type: 'layer-blur' | 'backdrop-blur'; blur?: string };

/** `Contract.effectStyles[clé]`, dans l'ordre de M3. */
export type EffectStyleDefinition = {
  figmaName: string;
  effects: Array<ShadowEffect | BlurEffect>;
};

/** Un usage dans `viewEffects`, `[]` désignant la racine. */
export type EffectStyleUse = { slotPath: string[]; style: string };
```

- `Contract.effectStyles` et `Contract.viewEffects` sont facultatifs ;
  `ContractVariantView.effects` devient le sixième renvoi, et
  `ExpandedVariantView.effects` sa partie développée.
- Un champ d'effet absent vaut zéro, ou manque sous un avertissement : c'est la
  règle d'un groupe par côté. Une couleur d'ombre n'a pas de valeur neutre, et
  son absence avertit toujours.
- `opacity?: string` s'ajoute à `ChildStructure` et à `ContractStructure`, donc
  à `VariantStructure`. Absent à 1 sans variable, comme `IMPLICIT_DEFAULTS`
  le fait d'un padding nul. Le token cité s'exprime de 0 à 100 (M1) :
  l'aide `opacite` dit de diviser sa valeur par 100.

### Classes de l'entrée 14.0

| Point | Classe |
|---|---|
| `effectStyles`, `viewEffects` et le renvoi `effects` | 2 : un lecteur 13.0 rend le composant sans ombre |
| `opacity` | 2 : un lecteur 13.0 rend opaque ce que la maquette montre transparent |
| enfants d'un cadre libre en `position: "absolute"` | 1 : les champs sont connus d'un lecteur 13.0 |

## 5. Règles d'exécution

Chaque lot suit cette séquence :

1. écrire le test du comportement visé, sur un arbre synthétique ;
2. le lancer et constater l'échec pour la raison attendue ;
3. appliquer le changement minimal ;
4. passer les tests ciblés, puis `npm test`, `npm run typecheck` et
   `npm run build` à la racine ;
5. copier le fichier protégé, muter la ligne exacte que le test protège,
   constater le rouge, restaurer par la copie, constater le vert ;
6. relire le diff, puis `git diff --check` ;
7. mettre à jour le journal ;
8. commiter par chemins, puis pousser sur `main`.

Un lot qui change un comportement décrit par `FORMAT.md`, `SPEC.md` ou
`AGENTS.md` met ce texte à jour dans son commit. `tests/inventaireInvariants.test.ts`
vérifie qu'un invariant réécrit nomme une autorité qui existe.

Règles de dépôt :

- Commiter avec `git commit --only -F <message> -- <chemins>`, jamais sans
  chemins : d'autres sessions partagent l'index. Lire
  `git diff --cached --name-only` avant. Pousser si
  `git rev-list --left-right --count origin/main...main` ne montre aucun
  retard ; sinon `git pull --ff-only`, jamais de rebase.
- Aucune branche, aucune pull request.
- Ne jamais restaurer un fichier par `git checkout --` : copier avant la
  mutation, recopier après.
- Écrire les fichiers avec les outils d'édition, jamais par heredoc : le shell
  avale les antislashs et les accents graves. Le dépôt est en LF ;
  `git ls-files --eol` le vérifie avant d'écrire.
- Si une autre session modifie la copie de travail pendant un lot, vérifier le
  lot dans un worktree isolé : `git -c core.autocrlf=false worktree add
  --detach <dossier> <commit>`, `npm ci`, `npm test`, `npm run typecheck`,
  puis les étapes du build lancées une par une.
- Aucun nom de projet, d'équipe ou de design system privé dans le dépôt,
  messages de commit compris : « Button », « Color=Primary ». Relire chaque
  diff avec cette règle avant de commiter.
- Un plafond de compteur ne bouge qu'à la fin du lot qui change les fichiers
  mesurés.
- Le message de commit termine par la ligne d'attribution demandée par
  l'environnement.

## 6. Journal de preuves

E0 crée `PREUVES-EVOLUTION-MOTEUR.md` dans ce dossier, sur la forme de
[PREUVES-DIAGNOSTICS-COMPOSANT-REEL.md](./PREUVES-DIAGNOSTICS-COMPOSANT-REEL.md) :
un état (lot courant, `HEAD`, dernière porte franchie), puis une entrée par lot
avec son commit, ses commandes et leur code de sortie, ses mutations et ses
réserves. Une réserve non résolue arrête le lot suivant. Les mesures de H0 y
sont recopiées avec leur protocole.

Au début du travail et après une interruption : lire `AGENTS.md`,
`CONTRIBUTING.md`, ce plan et le journal ; relever `git rev-parse HEAD` et
`git status --short` ; relancer le dernier contrôle vert ; reprendre à la
première action sans preuve.

## 7. Lots

Ordre : E0 (fait), E5 (fait), H0 et H2 (franchies), E1 (fait), porte H1
(franchie), E2, E3 et E4 (faits), E6, E7, E8, E9, E10.

E1 n'attend plus rien : il ne dépend d'aucun texte de H1. La porte H1 vient
après lui ; l'agent y présente la section 9 et s'arrête.

### E0 : référence

Fichiers autorisés : le journal ;
`packages/plugin-exporter/tests/diagnosticsComposantReel.test.ts`.

- [x] Relever la branche, `HEAD` et l'état ; passer `npm test`,
      `npm run typecheck`, `npm run build`.
- [x] Ajouter au scénario une racine `State=Disabled` d'opacité 0,5 sans
      variable. Deux attendus existants changent avec elle : la borne sans
      variable vise quatre racines au lieu de trois, et le point de l'imbriqué
      sans règles huit instances au lieu de six.
- [x] Scinder la famille `calqueAbsolu`, qui réunit des messages de trois
      lots : l'opacité de `Overlay` (E2), « il range 2 layers » sur `Overlay`
      (E4), les dimensions de `Mask` et `Circle` sous contrainte `SCALE`
      (aucun lot, depuis la décision de H2), et ce qui reste après ces lots (le mask, le rayon de `Circle`, les
      dimensions de `Overlay` en `MIN`). Ajouter la famille de l'opacité d'une
      racine (E2). Aucun cadre n'est ajouté pour E4 : `Overlay` est déjà une
      instance sans auto layout dont les deux enfants sont en `SCALE`. Le cas
      `STRETCH` contre `MIN` relève des tests unitaires de E4.
- [x] Consigner les lignes par famille. Ces nombres sont les attendus rouges
      des lots suivants.

### Porte H0 : mesures dans Figma

Le mainteneur les fait, ou désigne un fichier `/design/` qu'un agent lit par le
MCP Figma. Chaque mesure consigne le protocole et la valeur lue.

- **M1.** Une variable `FLOAT` de valeur 50 liée à l'opacité d'un calque :
  valeur de `node.opacity`, valeur de la variable, scopes proposés par Figma.
  Puis la même chose avec une valeur de 0,5.
- **M2.** Un calque qui porte un effect style : `effectStyleId` après
  modification d'un seul champ d'un effet dans le panneau, et `node.effects`
  comparé à `style.effects`.
- **M3.** Deux ombres portées de couleurs opposées dans un même style : laquelle
  peint au-dessus, et son rang dans `effects`.
- **M4.** Un flou de calque de rayon 8 : la valeur CSS que Dev Mode propose, pour
  savoir si `blur()` reçoit le rayon ou sa moitié.
- **M5.** Une ombre portée sur un cadre sans fill qui contient un cercle : l'ombre
  suit-elle la boîte du cadre ou le cercle ? Puis sur un calque texte.

M4 et M5 décident de ce que l'aide `ombre` écrit (`box-shadow`, `text-shadow`
ou `filter: drop-shadow()`), sans changer la forme.

Résultats, consignés dans le journal :

- M1 : l'opacité se lit de 0 à 100 % ; le token cité s'exprime sur cette
  échelle.
- M2 : après la modification d'un effet, le calque garde son style, marqué
  modifié.
- M3 : de deux ombres, celle ajoutée en dernier peint au-dessus. Son rang dans
  `effects` n'est pas lu : le MCP Figma n'a pas pu se connecter. L'agent qui
  dispose du MCP le lit sur le fichier de test du mainteneur (le demander au
  mainteneur, jamais l'écrire dans le dépôt). Sans cette lecture, E3 s'arrête
  à la case de l'ordre des ombres.
- M4 : un flou de 8 donne `blur(4px)` : `blur()` reçoit la moitié du rayon.
- M5 : l'ombre suit la forme dessinée, le cercle dans un cadre sans fill, les
  lettres d'un texte.

### Porte H1 : textes du designer

L'agent présente la section 9 au mainteneur, message par message, rédactions
rendues en entier, puis s'arrête. Le mainteneur choisit ou réécrit. Il lit
mieux une présentation simple : un message à la fois, ce que le designer voit,
les rédactions côte à côte, sans vocabulaire du moteur. La section
« Textes retenus » de [TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md) reçoit le
texte retenu dans le commit du lot qui l'écrit ; la section « Reste à valider »
perd chaque message traité.

### Porte H2 : forme de la 14.0

Franchie. Décisions du mainteneur :

- la forme de la section 4 et le sixième renvoi `effects` : acceptés ;
- l'échelle de `opacity` : l'aide `opacite` dit de diviser la valeur du token
  par 100 ;
- une contrainte `STRETCH` ou `SCALE` ne dispense pas un axe figé de sa
  variable, pour le moment ;
- un axe figé sans token d'un composant sans auto layout avertit (9.1.6) ;
- les avertissements d'absence d'auto layout restent tous, le repli
  `flex-row` compris ;
- l'opacité d'une dépendance se publie quand elle diffère de celle de son
  composant principal (section 4).

### E1 : le kit connaît la 14.0

Faits : F11, F18 à F24. Attend H2. Tests : `packages/kit/tests/`,
`packages/cli/tests/aides.test.mjs`.

Fichiers autorisés : `packages/kit/src/format/types.ts`, `version.ts`,
`index.ts` si un type s'exporte ; `packages/kit/schema/` ;
`packages/kit/src/lecteurs/version-contrat.mjs`, `validation-contrat.mjs`,
`variant-views.mjs`, `caracteristiques.mjs` ; `packages/kit/fixtures/contrats/` ;
`packages/kit/tests/` ; `packages/cli/aides/` ; les trois `package.json`, le
`package-lock.json` et les fichiers qui écrivent un numéro (F23) ;
`docs/format/CHANGELOG-FORMAT.md`, `docs/format/COMPATIBILITE.md` ;
`.agents/skills/consommer-contrat/SKILL.md`.

- [x] Tests d'abord, dans `validation-contrats.test.mjs` et
      `contrats-fabriques.mjs` : un contrat 14.0 avec `effectStyles`,
      `viewEffects`, le renvoi `effects` et `opacity` est valide ; le même
      contrat marqué 13.0 est refusé sur chacun de ces champs ; un usage dont le
      `slotPath` ne désigne aucun calque de sa vue, ou dont le style manque au
      catalogue, est refusé ; `[]` désigne la racine. Les voir rouges.
- [x] `types.ts` : les types de la section 4, et les commentaires de
      `ChildStructure.position`, `ChildStructure.size` et `LayoutDirection`
      réécrits pour le cadre libre. `npm run schema` dans `packages/kit`.
- [x] `version.ts` : `CONTRACT_VERSION = '14.0'` ; `version-contrat.mjs` :
      fenêtre 13.0 à 14.0.
- [x] `validation-contrat.mjs` : `validerEffets140` et `validerOpacite140`, sur
      le modèle de `validerTypographie130` ; `effects` dans la liste des clés
      d'une vue et dans `CATALOGUES_DE_VUES_11`. `variant-views.mjs` résout le
      sixième renvoi, vide par défaut.
- [x] Jeu figé : copier les quatre contrats 13.0 de UCM-Playground par
      `git show 2f2f9b8:<chemin>`, jamais depuis sa copie de travail ;
      `README.md` avec provenance et empreintes SHA-256, sur le modèle du jeu
      12.0. Le README du jeu 12.0 passe « hors de la fenêtre », comme celui de
      11.0 ; ses contrats restent, avec le code qui les lit.
- [x] `npm run refus` dans `packages/kit`, puis relire le diff de
      `refus-enregistres.json` : aucun refus existant ne disparaît.
- [x] `caracteristiques.mjs` : deux caractéristiques, `ombre` et `opacite`, et
      chaque couple nouveau dans `CHAMPS`. Deux aides, `ombre.md` et
      `opacite.md`, avec Sens, Écriture par défaut et Preuve ;
      `position-absolue.md` étendue aux enfants d'un cadre libre. `ombre.md`
      écrit les mesures de H0 : l'ombre suit la forme dessinée (M5), donc
      `box-shadow` sur un calque qui a un fill, `filter: drop-shadow()` sur un
      calque sans fill, qui ne sait pas écrire `spread`, et `text-shadow` sur
      un texte ; un flou écrit la moitié du rayon dans `blur()` (M4). L'ordre
      des ombres dans `effects` du contrat se définit ici, la première peinte
      au-dessus comme en CSS ; E3 y traduit l'ordre de Figma. `opacite.md` dit
      de diviser la valeur du token par 100 (M1).
- [x] `CHANGELOG-FORMAT.md` : l'entrée 14.0, avec la classe de chaque point
      (section 4), ce que le réexport fait taire, la fenêtre, et ce qui ne
      change pas. `COMPATIBILITE.md` : `textTransform` en 13.0 reste l'exemple ;
      ajouter `opacity` en 14.0 dans la phrase qui classe un ajout.
- [x] Monter `@ucm-kit/core` en 0.1.41, `@ucm-kit/cli` en 0.1.49 et
      `@ucm-kit/adapter-typescript` en 0.1.42 ; épingler le noyau 0.1.41 dans
      les deux ; réécrire chaque numéro montré par une commande (F23) ;
      `npm install` pour le verrou. `pinDocumente`, `monorepoCoherent` et
      `versionSuitLeContenu` passent.
- [x] Chercher `13.0`, `12.0` et « cinq renvois » dans `README.md`, les
      README des paquets, `docs/` hors `notes/` et la skill
      `consommer-contrat`, et corriger ce qui décrit la fenêtre ou la vue.
- [x] Mutation : retirer `effects` de la liste des clés d'une vue, constater le
      refus du contrat 14.0.

### E2 : l'opacité se publie

Faits : F5, F9, F17. Attend E1 et H1 (texte 9.1.1). Tests :
`nodeBindings.test.ts`, `unsupportedProperties.test.ts`,
`messagesDeRacine.test.ts`, le scénario.

- [x] Tests : un calque d'opacité 0,3 liée publie `opacity` avec sa référence ;
      d'opacité 1 sans liaison ne publie rien et ne dit rien ; d'opacité 0,3
      sans liaison ne publie rien et produit le texte retenu à H1 ; trois
      racines d'opacité 0,5 sans liaison donnent une ligne à trois cibles ; un
      composant doté d'un axe de tailles publie son opacité ; l'instance d'une
      dépendance d'opacité 0,4 liée, dont le composant principal est à 1,
      publie `opacity` sur son entrée, et rien à égalité.
- [x] `messagesDeRacine.test.ts` : le test « une propriété dont le texte n'est
      pas validé garde une ligne par racine » prend l'opacité comme exemple.
      Il passe au blend mode dans ce commit, pour garder ce qu'il prouve ; E6
      le supprime.
- [x] `nodeBindings.ts` : `BINDING_PATTERNS.opacity`, `FIELD_LABELS.opacity`,
      `IMPLICIT_DEFAULTS.opacity = 1`. La résolution passe par `resolveField`,
      donc par le texte de groupe du champ sans variable, sauf si H1 retient un
      texte propre.
- [x] `extractLayout.ts` : `opacity` sur le node de layout et dans
      `describeNode`, après la sortie des dépendances. L'opacité se résout hors
      de `publishDimensions`, qui vaut `false` sous un axe de tailles : sinon
      elle disparaît de ces composants. Sur l'entrée d'une dépendance, qui
      sort de `describeNode` avant les autres relevés, l'opacité se compare à
      celle du composant principal (`getMainComponentAsync`) avant d'être
      résolue.
- [x] `unsupportedProperties.ts` : retirer l'opacité du relevé.
- [x] `FORMAT.md` : `opacity` dans « 6. Structure » et hors de « Propriétés non
      portables » ; `AGENTS.md`, invariant des propriétés à effet visuel ;
      `SPEC.md`, section du relevé. Scénario : les deux familles d'opacité
      posées en E0 passent dans les familles corrigées ; les textes retenus à
      H1, sur un calque et sur les racines, forment deux familles nouvelles.
- [x] Mutation : retirer `opacity` de `IMPLICIT_DEFAULTS`, constater
      l'avertissement sur un calque opaque.

### E3 : les effect styles se publient

Faits : F1 à F4, F10 à F12. Attend E1, H0 (M2, M3) et H1 (textes 9.1.2 à
9.1.5). Tests : un nouveau `effectStyles.test.ts`, `compactVariants.test.ts`,
`unsupportedProperties.test.ts`, `messagesDeRacine.test.ts`, le scénario.

- [x] Tests : une racine et un enfant portant le même style donnent une entrée
      de catalogue et deux usages, `[]` et le chemin de l'enfant ; un style
      dont `offsetY` vaut 4 sans variable avertit une fois et publie l'effet
      sans `offsetY` ; un calque sans style avertit et ne publie aucun usage ;
      un style qui contient un bruit publie ses ombres et avertit du bruit ;
      deux vues qui ne diffèrent que par leur ombre partagent leur structure.
- [x] Un module `effectStyles.ts`, sur le modèle de
      `extractVariantTypography.ts` : chargeur injectable et mis en cache par
      identifiant, liaisons lues sur `style.effects[i]`, traduction en
      vocabulaire CSS dans l'ordre mesuré à M3, texte de H1 pour un calque sans
      style, un style introuvable, un champ sans variable et un effet que le
      moteur n'écrit pas. Un style chargé dont `type` n'est pas `EFFECT` compte
      comme introuvable.
- [x] L'écart entre les effets d'un calque et ceux de son style (9.1.3)
      s'écrit : M2 montre que le style reste appliqué après la modification
      d'un effet, marqué modifié.
- [x] Ordre des ombres : M3 montre que l'ombre ajoutée en dernier peint
      au-dessus. Son rang dans `effects` se lit par l'API avant d'écrire la
      traduction ; sans cette lecture, E3 s'arrête à cette case.
- [x] Scénario : le faux `getStyleByIdAsync` rend aujourd'hui le même text
      style pour tout identifiant, `S:ombre` compris. Il répond désormais par
      identifiant, avec un effect style pour `S:ombre`.
- [x] `extractLayout.ts` : un collecteur de calques à effets, rempli là où
      `warnUnsupportedProperties` est appelé, donc sur les seuls calques
      publiés (F12). `extractLayout` sert aussi la projection de référence :
      seuls les appels des vues exactes reçoivent le collecteur, comme
      `exactPaths`. `extractStructure.ts` en tire les usages de chaque vue
      exacte.
- [x] `compactVariants.ts` : la partie `effects`, cataloguée en `viewEffects`.
      `packages/plugin-exporter/tests/lois.ts` : chaque usage désigne un calque
      de sa vue et un style du catalogue.
- [x] `unsupportedProperties.ts` : `effect` ne relève plus que ce que
      `effectStyles.ts` ne prend pas en charge ; son `impactDesVariants` suit
      H1.
- [x] `FORMAT.md` : une section « Effets » après « 5. Typographie », sans
      numéro, pour garder les ancres des sections 6 à 9 que `AGENTS.md` et
      `SPEC.md` citent ; « Sortie » passe à six renvois ; « 8. Rendu
      sémantique » dit la composition avec `border`. `AGENTS.md` : la vue est
      six renvois, et l'invariant des propriétés à effet visuel.
      `docs/guides/POUR-LES-DESIGNERS.md`, glossaire : la vue suit six renvois.
      `SPEC.md` : la lecture d'un effect style.
- [x] Mutation : lire les liaisons sur le calque au lieu du style, constater
      l'échec du test du champ sans variable.

### E4 : les enfants d'un cadre libre sont placés

Faits : F6, F7, F13 à F16. Attend E1 et H1 (textes 9.1.6 et 9.1.7). Tests :
`extractLayout.test.ts`, `layoutSilences.test.ts`, `nodeBindings.test.ts`,
`messagesDeRacine.test.ts`, le scénario.

Ce que H2 a fixé pour ce lot : les enfants d'un cadre libre sont placés, les
avertissements d'absence d'auto layout restent tous (R10, R17, « il range N
layers », « il enveloppe X »), et une contrainte ne dispense aucun axe figé de
sa variable.

- [x] Tests : sous un cadre sans auto layout, deux enfants publient
      `position: "absolute"`, `constraints` et `inset`, et le cadre garde
      « il range 2 layers » avec l'impact retenu en 9.1.7 ; un enfant en
      `STRETCH` horizontal et en taille fixe sans variable réclame toujours sa
      variable sur cet axe ; sous un GROUP, rien ne change ; un composant sans
      auto layout dont la hauteur n'a pas de variable produit le texte 9.1.6,
      à côté de R17 ; le même composant aux deux dimensions liées ne produit
      pas 9.1.6 ; trois racines sans auto layout donnent une ligne à trois
      cibles pour R17 et pour R10.
- [x] `flexLayout.ts` : une fonction qui dit si un enfant est placé par ses
      contraintes, absolu ou enfant d'un cadre, d'un composant ou d'une
      instance sans auto layout ; `flexItemProperties` l'emploie à la place du
      seul test `isAbsolutePositioned`. `menuDeDimensionnement` ne change
      pas.
- [x] `extractLayout.ts` : le texte 9.1.6 part de la résolution de
      `structure.sizing` (F15) : un axe figé sans token d'un composant sans
      auto layout. R17 et « il range N layers » prennent l'impact retenu en
      9.1.7, et R17 son texte de groupe par `estUneRacineDeVariant`.
- [x] `nodeBindings.ts` : R10 prend son texte de groupe (9.1.7) par
      `estUneRacineDeVariant`, dans la branche `no-auto-layout` de
      `resolveGroup`. Ce site sert `extractLayout` et `extractSizes` (F14).
- [x] `FORMAT.md` : « Position absolue », le paragraphe de « 6. Structure »
      sur un node sans disposition, la première puce de « Propriétés non
      portables ». `AGENTS.md` : les invariants du calque hors du flux et de la
      taille de maquette ; celui du repli `flex-row` ne change pas. `SPEC.md` :
      « 3. Layout ».
- [x] Scénario : `cadreSansAutoLayout` compte toujours une ligne, au texte
      de 9.1.7 ; `dimensionSousContrainte` garde ses quatre lignes.
- [x] Mutation : rendre `false` pour un cadre sans auto layout dans la
      nouvelle fonction, constater que les enfants perdent
      `position: "absolute"`.

### E5 : les peintures d'une racine se regroupent

Faits : F25, F26. Aucune porte : le texte du champ sans variable est déjà
retenu. Passe juste après E0. Tests : `messagesDeRacine.test.ts`.

- [x] Test : trois racines au stroke weight fixe sans variable donnent une
      ligne à trois cibles. Le voir rouge : trois lignes aujourd'hui. Un
      composant seul garde son nom de calque.
- [x] Déclarer les racines sur chaque `variantWarnings` avant `getSlotTokens`,
      par `declarerLesRacinesDeVariants`, sans nouvelle API, à la condition
      d'`extractStructure` : un set de plus d'un variant.
- [x] Mutation : retirer la déclaration, constater trois lignes.

### E6 à E9 : les textes de groupe validés

Attendent H1 et E5. Chaque lot reprend les textes de la section 9.2 retenus à
H1, mot pour mot, par le mécanisme de L6 : `estUneRacineDeVariant` au site,
`pousserPourLesVariants` pour pousser, `impactDesVariants` pour une propriété
de `unsupportedProperties.ts`. Chaque apostrophe suit celle de son fichier.

| Lot | Messages | Fichiers |
|---|---|---|
| E6 | R3 à R7 | `unsupportedProperties.ts` |
| E7 | R11 à R14 | `nodeBindings.ts` |
| E8 | R18 à R21 | `flexLayout.ts` |
| E9 | R22 à R24 | `extractSlotTokens.ts` |

Pour chaque lot :

- [ ] tests d'abord dans `messagesDeRacine.test.ts` : trois racines donnent une
      ligne à trois cibles, avec le titre, l'impact et l'action retenus ; un
      calque qui n'est pas une racine garde son texte par calque ; un message
      dont le détail varie donne une ligne par valeur retenue à H1. Les voir
      rouges pour la bonne raison ;
- [ ] le scénario `diagnosticsComposantReel.test.ts` compte les familles
      regroupées ;
- [ ] une mutation par condition ajoutée : rendre `false` le test
      `estUneRacineDeVariant` du site, constater une ligne par racine ;
- [ ] `SPEC.md`, section « Racine de variant : une phrase pour tous les
      variants », nomme les messages regroupés ;
- [ ] `TEXTES-A-VALIDER.md` : textes retenus ajoutés, « Reste à valider »
      réduit.

E6 supprime aussi le test de `messagesDeRacine.test.ts` qui garde une ligne
par racine pour une propriété non validée : après E6, le relevé n'en compte
plus. Le test « sans déclaration, chaque racine garde son message et son nom »
couvre toujours le mécanisme.

E9 met aussi à jour l'état `resultat-avertissement-regroupe` de
`packages/plugin-exporter/galerie/etats.cjs` : une carte de fill sans token
s'ajoute aux trois, et `regarder` le dit.

### E10 : fermeture

- [ ] Vérifier dans un worktree isolé : `git -c core.autocrlf=false worktree
      add --detach <dossier> HEAD`, `npm ci`, `npm test`, `npm run typecheck`,
      puis les étapes du build une par une. Supprimer le worktree par Node.
- [ ] Lancer `npm run build:code` dans `packages/plugin-exporter` de la copie
      partagée, que Figma charge, puis vérifier par `grep` qu'un nom introduit
      par E3 est dans `dist/code.js`.
- [ ] Écrire dans le journal la liste attendue sur le composant réel : l'ombre
      publiée, l'opacité du calque d'onde avertie une fois si elle reste sans
      variable, le masque averti, ses rectangles placés. Leurs dimensions et
      leur rayon sans variable avertissent toujours : H2 garde la règle du
      menu, et aucun lot ne touche au rayon.
- [ ] Demander au mainteneur de relancer l'analyse du composant réel et de
      comparer. Consigner son retour. La recette exporte aussi un style à deux
      ombres de couleurs opposées et compare leur ordre au rendu de Figma :
      E3 suppose que le dernier effet de la liste peint au-dessus.
- [ ] Publier les trois paquets par `publish.yml`, noyau en premier, à la
      demande du mainteneur ; le plugin qui écrit la 14.0 part après eux
      ([COMPATIBILITE.md](../../../format/COMPATIBILITE.md#qui-publie-qui-migre-qui-peut-fusionner)).

## 8. Portes humaines

| Porte | Avant | Ce que le mainteneur décide |
|---|---|---|
| H0 | E1, E2, E3 | franchie ; reste le rang des ombres dans `effects` (section 7, M3) |
| H1 | E2, E3, E4, E6 à E9 | un texte par message de la section 9 ; à présenter après E1 |
| H2 | E1, E4 | franchie ; décisions en section 7, « Porte H2 » |

## 9. Textes à valider

L'exemple reprend le composant de [TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md) :
un component set « Button » de 140 variants, nommés comme « Color=Primary,
Variant=Filled, State=Default ». Un message par calque garde la forme
`Layer « … »` ; un message de groupe n'a pas de nom de calque, et le bouton de
sa carte dit « Sélectionner les N calques ». Le style retenu : titre court,
impact qui commence par ce que font les variants, « token » plutôt que
« variable Figma », propriété en gras par `**`, « Le contrat n'exportera
pas … ».

Deux messages de groupe peuvent partager un titre ; l'impact les distingue
alors par la propriété en gras.

### 9.1 Messages créés ou changés par le sujet A

#### 9.1.1 Opacité sans token (E2)

Texte actuel, qui disparaît :

- titre : Layer « Overlay », opacity : le contrat n'a aucun champ pour cette
  propriété.
- impact : Le développeur n'aura pas la transparence de ce layer, qui sera
  rendu opaque.
- action : Exprimez cette transparence par une couleur reliée à une variable,
  ou signalez cette limite au mainteneur du plugin, puis réexportez.

Sur un calque :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Layer « Overlay », opacity : aucune variable Figma n'est reliée. | Le développeur n'aura pas cette valeur. | Reliez-la à une variable, puis réexportez. |
| 2 | Layer « Overlay », opacity : aucun token n'est relié à cette propriété. | Le contrat n'exportera pas cette opacité : le développeur rendra ce layer opaque. | Reliez l'opacité à un token, puis réexportez. |
| 3 | Layer « Overlay » : son opacité n'est reliée à aucun token. | Le développeur rendra ce layer opaque. | Reliez cette opacité à un token, puis réexportez. |

Sur les racines :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | opacity : aucun token n'est relié à cette propriété. | Le contrat n'exportera pas cette propriété. | Reliez-la à un token, puis réexportez. |
| 2 | Propriété sans token associé. | Des variants déclarent une **opacity** sans token. Le contrat n'exportera pas cette opacité : ces variants seront rendus opaques. | Reliez l'opacité à un token dans chaque variant concerné, puis réexportez. |

La rédaction 1 de chaque tableau est le texte générique du champ sans variable,
que E2 obtient sans code propre au message. Les autres demandent un texte à
part dans `resolveGroup`, ou une branche avant lui.

#### 9.1.2 Effet sans effect style (E3)

Sur un calque « Card » qui porte une ombre sans style :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Layer « Card », effect : aucun effect style n'est appliqué. | Le contrat n'exportera pas l'ombre ou le flou de ce layer. | Appliquez un effect style à ce layer, puis réexportez. |
| 2 | Layer « Card » : son effect n'utilise aucun effect style. | Le contrat n'exporte que les effects rangés dans un effect style : le développeur rendra ce layer sans son ombre ou son flou. | Appliquez un effect style publié à ce layer, puis réexportez. |

Sur les racines :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété non supportée par le moteur. | Des variants portent un **effect** sans effect style. Le contrat n'exportera pas l'ombre ou le flou de ces variants. | Appliquez un effect style dans chaque variant concerné, puis réexportez. |
| 2 | Effect sans effect style. | Des variants portent un **effect** qui n'utilise aucun effect style. Le contrat n'exportera pas cette ombre ou ce flou. | Appliquez un effect style à ces effects dans chaque variant concerné, puis réexportez. |

Le texte de groupe actuel d'`effect` (« Retirez cet effect si le rendu peut
s'en passer ») ne propose plus le bon geste une fois les styles publiés : il
disparaît avec E3.

#### 9.1.3 Effect style introuvable ou détaché (E3)

Le style appliqué est introuvable :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Layer « Card » : l'effect style appliqué est introuvable. | Le contrat n'exportera pas l'ombre ou le flou de ce layer. | Appliquez de nouveau un effect style publié, puis réexportez. |
| 2 | Layer « Card », effect : son effect style est introuvable. | Le développeur rendra ce layer sans son ombre ou son flou. | Appliquez de nouveau un effect style publié, puis réexportez. |

Les effects du calque diffèrent de ceux de son style (cas que M2 dira possible
ou non) :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Layer « Card », effect : sa valeur diffère de celle de l'effect style « Shadow/Focus ». | Le développeur rendra la valeur de l'effect style. | Appliquez au layer un effect style qui porte ce réglage, puis réexportez. |
| 2 | Layer « Card » : ses effects s'écartent de l'effect style « Shadow/Focus ». | Le contrat exportera l'effect style tel qu'il est défini. | Réappliquez l'effect style, ou créez-en un qui porte ce réglage, puis réexportez. |

La rédaction 1 reprend le gabarit des surcharges de text style
([extractVariantTypography.ts:232](../../../../packages/plugin-exporter/src/contract/extractVariantTypography.ts)).
Sur les racines, ces deux messages suivent la forme retenue en 9.1.2.

#### 9.1.4 Champ d'un effect style sans variable (E3)

Le sujet est le style, sans node, comme pour un text style. Exemple : un style
« Shadow/Focus » dont `offsetY` vaut 4 sans variable.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Effect style « Shadow/Focus », offset y : aucune variable Figma n'est reliée. | Cette propriété de l'ombre manquera au développeur. | Reliez-la à une variable dans l'effect style, puis réexportez. |
| 2 | Effect style « Shadow/Focus », offset y : aucun token n'est relié à cette propriété. | Le contrat n'exportera pas cette propriété de l'ombre. | Reliez-la à un token dans l'effect style, puis réexportez. |

La rédaction 1 reprend le texte du text style
([extractVariantTypography.ts:189](../../../../packages/plugin-exporter/src/contract/extractVariantTypography.ts)).
Les libellés suivent le panneau Figma : « x », « y », « blur », « spread »,
« color ».

#### 9.1.5 Effet que le moteur n'écrit pas (E3)

Bruit, texture, verre, shader, flou progressif, ombre dans un autre mode de
fusion que « Normal » ou visible derrière un calque transparent. Le sujet est le
style qui le contient. Exemple : « Glass/Frost », qui porte un effect Glass.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Effect style « Glass/Frost » : il contient un effect Glass que le contrat ne sait pas écrire. | Le développeur rendra ce style sans cet effect. | Retirez cet effect du style si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 2 | Effect style « Glass/Frost », effect Glass : propriété non supportée par le moteur. | Le contrat n'exportera pas cet effect. | Retirez-le du style si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |

Le nom de l'effect suit le panneau : Noise, Texture, Glass, et « Progressive
blur » pour le flou progressif. Un effect de ce genre posé sans style tombe
sous 9.1.2.

#### 9.1.6 Cadre sans auto layout sans dimension tokenisée (E4)

S'ajoute à R17 sur un composant sans auto layout. Exemple : un composant
« Badge » dont la hauteur fixe n'a pas de variable. Deux dimensions
s'écrivent « **width** et **height** », comme deux bornes.

Sur un calque :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Layer « Badge » : il n'utilise pas d'auto layout, et sa height n'est reliée à aucun token. | Ses layers sont placés par leurs contraintes : le contrat ne donnera aucune hauteur à ce layer. | Reliez sa height à un token, ou appliquez-lui un auto layout, puis réexportez. |
| 2 | Layer « Badge », height : aucun token n'est relié à cette propriété. | Ce layer n'utilise pas d'auto layout : sans cette dimension, le développeur ne saura pas quelle taille lui donner. | Reliez-la à un token, ou appliquez un auto layout à ce layer, puis réexportez. |

Sur les racines :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété sans token associé. | Des variants sans auto layout déclarent une **height** sans token. Le contrat ne donnera aucune taille à ces variants, dont les layers sont placés par leurs contraintes. | Reliez ces paramètres à une variable dans chaque variant concerné, ou appliquez un auto layout, puis réexportez. |
| 2 | Variants sans auto layout. | Des variants placent leurs layers par leurs contraintes et laissent leur **height** sans token. Le contrat n'exportera pas leur taille. | Reliez cette dimension à un token dans chaque variant concerné, ou appliquez un auto layout, puis réexportez. |

#### 9.1.7 Absence d'auto layout, une fois les layers placés (E4)

H2 garde les avertissements d'absence d'auto layout. Leur impact disait que la
disposition manquait au développeur ; E4 la publie, en pixels, par les
contraintes. L'impact change donc, et le geste reste le même. Le titre et
l'action ne changent pas.

Textes actuels :

- R17, sur le composant : « Layer « Badge » : il n'utilise pas d'auto
  layout. » ; impact : « Le contrat annonce par défaut une disposition
  horizontale : le développeur placera ses layers autrement que dans Figma. » ;
  action : « Appliquez un auto layout à ce layer, puis réexportez. »
- Sur un conteneur : « Layer « Overlay » : il range 2 layers mais n'utilise pas
  d'auto layout. » ; impact : « Le contrat ne décrit pas leur disposition : le
  développeur les placera autrement que dans Figma. »

« il enveloppe le composant X » dit aussi une disposition perdue, et prend le
même impact.

Impact proposé, pour les trois :

| | Impact |
|---|---|
| 1 | Le contrat place ses layers en pixels, par leurs contraintes : ils ne suivront ni la longueur d'un texte ni la taille d'un layer voisin. |
| 2 | Le développeur placera ses layers en position absolue : leur place ne s'adaptera pas à leur contenu. |

Sur les racines, R17 et R10 n'ont pas de texte de groupe :

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Disposition sans auto layout. | Des variants n'utilisent pas d'auto layout. Le contrat placera leurs layers en pixels, par leurs contraintes. | Appliquez un auto layout dans chaque variant concerné, puis réexportez. |
| 2 | Gap et padding sans auto layout. | Des variants n'utilisent pas d'auto layout : Figma ne leur applique ni gap ni padding. Le contrat n'exporte aucun espacement pour eux, ce qui ne veut pas dire zéro. | Appliquez un auto layout dans chaque variant concerné si leur espacement doit être contractuel, puis réexportez. |

La ligne 1 est le texte de groupe de R17, la ligne 2 celui de R10 ; le
mainteneur retient ou réécrit chacune.

### 9.2 Textes de groupe du sujet B

Chaque section donne le texte actuel sur une racine, puis les rédactions de
groupe.

#### 9.2.1 Fill ou stroke non uni (R3, R4, E6)

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », fill : le
  contrat n'a aucun champ pour cette propriété.
- impact : Le développeur n'aura pas le fill de ce layer : le contrat ne cite
  qu'une couleur unie reliée à une variable, jamais un dégradé ni une image.
- action : Remplacez ce fill par une couleur unie reliée à une variable si sa
  couleur doit être contractuelle, ou signalez cette limite au mainteneur du
  plugin, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété non supportée par le moteur. | Des variants peignent un **fill** en dégradé ou en image. Le contrat n'exportera que les couleurs unies reliées à un token. | Remplacez ce fill par une couleur unie reliée à un token si sa couleur doit être contractuelle, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 2 | Propriété non supportée par le moteur. | Le contrat n'exportera pas le **fill** de ces variants, qui n'est pas une couleur unie. | Remplacez ce fill par une couleur unie reliée à un token dans chaque variant concerné, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 3 | fill : dégradé ou image non supporté par le moteur. | Des variants peignent ce fill autrement qu'en couleur unie. Le contrat n'exportera pas cette couleur. | Remplacez-le par une couleur unie reliée à un token, ou signalez cette limite au mainteneur du plugin, puis réexportez. |

Le stroke reprend le texte retenu, « fill » devenant « stroke ».

#### 9.2.2 Blend mode (R5, E6)

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », blend mode :
  le contrat n'a aucun champ pour cette propriété.
- impact : Le développeur n'aura pas le mode de fusion de ce layer, qui sera
  rendu en normal.
- action : Repassez ce layer en blend mode « Normal » si sa fusion n'est pas
  nécessaire, ou signalez cette limite au mainteneur du plugin, puis
  réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété non supportée par le moteur. | Des variants appliquent un **blend mode** autre que « Normal ». Le contrat n'exportera pas ce mode de fusion : ces variants seront rendus en normal. | Repassez ces variants en blend mode « Normal » si leur fusion n'est pas nécessaire, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 2 | Propriété non supportée par le moteur. | Le contrat n'exportera pas le **blend mode** de ces variants, qui seront rendus en normal. | Repassez ce blend mode à « Normal » si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 3 | blend mode : propriété non supportée par le moteur. | Des variants appliquent un mode de fusion : le contrat les rendra en normal. | Repassez ce blend mode à « Normal » si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |

La rédaction 3 met la propriété dans le titre, comme le champ sans variable :
deux cartes de ce genre ne partagent alors plus leur titre.

#### 9.2.3 Mask (R6, E6)

L'API permet `isMask` sur un `COMPONENT` ; le cas reste rare sur une racine.

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », mask : le
  contrat n'a aucun champ pour cette propriété.
- impact : Le développeur n'aura pas le découpage que ce layer applique : sa
  surface sera rendue par-dessus les layers qu'il masque.
- action : Aplatissez ce mask dans le dessin qu'il découpe si le rendu peut
  s'en passer, ou signalez cette limite au mainteneur du plugin, puis
  réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété non supportée par le moteur. | Des variants servent de **mask**. Le contrat n'exportera pas ce découpage : leur surface sera rendue par-dessus les layers qu'ils masquent. | Retirez ce mask des variants concernés si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 2 | mask : propriété non supportée par le moteur. | Le contrat n'exportera pas le découpage de ces variants. | Retirez ce mask si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |

#### 9.2.4 Dash (R7, E6)

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », dash : le
  contrat n'a aucun champ pour cette propriété.
- impact : Le développeur n'aura pas le pointillé de son stroke, qui sera rendu
  en trait plein.
- action : Repassez ce stroke en trait plein si le pointillé n'est pas
  nécessaire, ou signalez cette limite au mainteneur du plugin, puis
  réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété non supportée par le moteur. | Des variants tracent leur stroke en **dash**. Le contrat n'exportera pas ce pointillé : le stroke sera rendu en trait plein. | Repassez ce stroke en trait plein si le pointillé n'est pas nécessaire, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 2 | dash : propriété non supportée par le moteur. | Le contrat n'exportera pas le pointillé du stroke de ces variants. | Repassez ce stroke en trait plein si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |

#### 9.2.5 Vertical gap « Auto » (R11, E7)

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default » : son vertical
  gap est réglé sur « Auto », donc Figma répartit lui-même l'espace entre ses
  lignes.
- impact : Le contrat ne publie aucun espacement entre ses lignes, ce qui ne
  veut pas dire zéro.
- action : Si cet espacement doit être contractuel, donnez au vertical gap une
  valeur reliée à une variable, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété sans token associé. | Des variants règlent leur **vertical gap** sur « Auto » : Figma répartit lui-même l'espace entre leurs lignes. Le contrat n'exportera aucun espacement entre ces lignes, ce qui ne veut pas dire zéro. | Si cet espacement doit être contractuel, donnez au vertical gap une valeur reliée à un token dans chaque variant concerné, puis réexportez. |
| 2 | vertical gap : réglé sur « Auto ». | Des variants laissent Figma répartir l'espace entre leurs lignes. Le contrat n'exportera pas cet espacement. | Donnez au vertical gap une valeur reliée à un token si cet espacement doit être contractuel, puis réexportez. |

#### 9.2.6 Côtés reliés à des variables différentes (R12, E7)

Sur une racine, le cas demande deux représentations complètes à la fois, par
exemple `strokeWeight` et les quatre bords : il est rare. Le détail, la liste
des tokens, varie d'un variant à l'autre.

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », stroke
  weight : les côtés ne sont pas reliés à la même variable (border.thin,
  border.thick).
- impact : Le développeur n'aura pas cette valeur.
- action : Reliez-les tous à la même variable, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | stroke weight : les côtés ne citent pas le même token. | Des variants relient les côtés de **stroke weight** à border.thin et border.thick. Le contrat n'exportera pas cette propriété. | Reliez-les tous au même token, puis réexportez. |
| 2 | stroke weight : les côtés ne citent pas le même token. | Des variants relient les côtés de **stroke weight** à des tokens différents. Le contrat n'exportera pas cette propriété. | Reliez-les tous au même token dans chaque variant concerné, puis réexportez. |

La rédaction 1 garde les tokens et donne une ligne par paire distincte ; la
rédaction 2 donne une ligne en tout, et le designer retrouve les tokens dans
Figma.

#### 9.2.7 Deux réglages qui se contredisent (R13, E7)

Même rareté, même détail variable.

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », corner radius
  : deux réglages Figma se contredisent (radius.sm, radius.md).
- impact : Le développeur n'aura pas cette valeur.
- action : Ne définissez cette valeur que d'une seule façon, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | corner radius : deux réglages se contredisent. | Des variants relient **corner radius** à radius.sm et à radius.md à la fois. Le contrat n'exportera pas cette propriété. | Ne définissez cette valeur que d'une seule façon, puis réexportez. |
| 2 | corner radius : deux réglages se contredisent. | Des variants relient **corner radius** à deux tokens à la fois. Le contrat n'exportera pas cette propriété. | Ne définissez cette valeur que d'une seule façon dans chaque variant concerné, puis réexportez. |

#### 9.2.8 Côtés sans variable exploitable (R14, E7)

Deux sites : un groupe par côté, padding ou rayon, où les côtés liés restent
publiés, et un groupe sans côté, où rien ne l'est. Le détail, la liste des
côtés, varie d'un variant à l'autre.

Textes actuels, pour un padding horizontal dont le côté droit vaut 8 :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », horizontal
  padding : certains côtés n'ont pas de variable exploitable (sans variable :
  right padding).
- impact : Ces côtés manqueront au développeur. Sur le second site : Le
  développeur n'aura pas cette valeur.
- action : Reliez ces côtés à des variables, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété sans token associé. | Des variants déclarent un **right padding** sans token. Le contrat n'exportera que les côtés reliés à un token. | Reliez ces côtés à une variable dans chaque variant concerné, puis réexportez. |
| 2 | horizontal padding : certains côtés n'ont pas de token. | Des variants laissent des côtés de **horizontal padding** sans token. Le contrat n'exportera pas ces côtés. | Reliez ces côtés à un token dans chaque variant concerné, puis réexportez. |

La rédaction 1 nomme les côtés, en gras un par un comme deux bornes, et donne
une ligne par liste distincte ; la rédaction 2 donne une ligne par champ. Une
variable introuvable s'ajoute par une seconde phrase : « Des variants relient
**right padding** à une variable introuvable. »

#### 9.2.9 Alignement d'auto layout illisible (R18, E8)

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default » : son
  alignement d'auto layout est illisible.
- impact : Le développeur ne saura pas comment aligner ses enfants.
- action : Réglez l'alignement principal et secondaire dans Figma, puis
  réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Alignement d'auto layout illisible. | Des variants portent un alignement que le moteur ne sait pas lire. Le contrat n'exportera pas l'alignement de leurs enfants. | Réglez l'alignement principal et secondaire dans chaque variant concerné, puis réexportez. |
| 2 | Propriété non supportée par le moteur. | Le contrat n'exportera pas l'**alignment** d'auto layout de ces variants. | Réglez l'alignement principal et secondaire dans Figma, puis réexportez. |

#### 9.2.10 Piste de grille illisible (R19, E8)

Le rang de la piste reste dans le texte : il est le même d'un variant à
l'autre quand la grille l'est.

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default » : la taille de
  la colonne 2 de sa grille est illisible.
- impact : Le développeur rendra cette colonne en taille automatique.
- action : Vérifiez ce réglage dans Figma, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Taille de piste illisible. | Des variants portent une grille dont la **colonne 2** a une taille illisible. Le contrat l'exportera en taille automatique. | Vérifiez ce réglage dans chaque variant concerné, puis réexportez. |
| 2 | Propriété non supportée par le moteur. | Le contrat n'exportera pas la taille de la **colonne 2** de la grille de ces variants. | Vérifiez ce réglage dans Figma, puis réexportez. |

#### 9.2.11 Le nom de la racine dans le corps d'un message (R20, R21, E8)

Ces messages visent un enfant et gardent son nom ; seul le nom de la racine
disparaît. Le designer clique vers les enfants de chaque variant.

Texte actuel de l'alignement :

- titre : Layer « Label » : son alignement dans l'auto layout « Color=Primary,
  Variant=Filled, State=Default » est illisible.
- impact : Le développeur ne saura pas comment l'aligner dans « Color=Primary,
  Variant=Filled, State=Default ».
- action : Réglez son alignement dans cet auto layout, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Layer « Label » : son alignement dans l'auto layout de son variant est illisible. | Le développeur ne saura pas comment l'aligner dans chaque variant. | Réglez son alignement dans l'auto layout de chaque variant, puis réexportez. |
| 2 | Layer « Label » : son alignement est illisible. | Le développeur ne saura pas comment l'aligner dans le variant qui le contient. | Réglez son alignement dans cet auto layout, puis réexportez. |

Texte actuel du `layout grow` :

- titre : Layer « Label » : son layout grow vaut « 2 » dans l'auto layout
  « Color=Primary, Variant=Filled, State=Default », une valeur que le menu Fill
  de Figma ne produit pas.
- impact : Le développeur ne saura pas si ce layer s'étire.
- action : Choisissez Fill ou Fixed pour sa dimension dans le sens de cet auto
  layout, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Layer « Label » : son layout grow vaut « 2 » dans l'auto layout de son variant, une valeur que le menu Fill de Figma ne produit pas. | Le développeur ne saura pas si ce layer s'étire. | Choisissez Fill ou Fixed pour sa dimension dans le sens de cet auto layout, puis réexportez. |
| 2 | Layer « Label » : son layout grow n'est ni Fill ni Fixed. | Le développeur ne saura pas si ce layer s'étire. | Choisissez Fill ou Fixed pour sa dimension dans chaque variant concerné, puis réexportez. |

La rédaction 1 garde la valeur, qui donne une ligne par valeur distincte.

#### 9.2.12 Fill ou stroke relié à aucune variable (R22, E9)

Le plus fréquent de la liste : une racine qui peint son fond à la main. Le
nombre de peintures libres varie d'un variant à l'autre.

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default » : son fill
  n'est relié à aucune variable Figma.
- impact : Le contrat ne publie que les couleurs liées : le développeur rendra
  ce layer sans cette couleur.
- action : Reliez ce fill à une variable, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Propriété sans token associé. | Des variants déclarent un **fill** sans token. Le contrat ne publiera que les couleurs reliées à un token : ces variants seront rendus sans cette couleur. | Reliez ce fill à une variable dans chaque variant concerné, puis réexportez. |
| 2 | Couleur sans token associé. | Des variants peignent un **fill** sans token. Le contrat n'exportera pas cette couleur. | Reliez ce fill à un token dans chaque variant concerné, puis réexportez. |
| 3 | fill : aucun token n'est relié à cette couleur. | Le contrat n'exportera pas cette couleur. | Reliez-la à un token, puis réexportez. |

Les trois écrivent « un fill » quel que soit le nombre de peintures libres,
pour que la fusion se fasse. Le stroke reprend le texte retenu, « fill »
devenant « stroke ».

#### 9.2.13 Alignement du stroke illisible (R23, E9)

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default » : l'alignement
  du stroke est illisible.
- impact : Le contrat ne dira pas s'il est inside, center ou outside.
- action : Vérifiez ce réglage dans Figma, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Alignement du stroke illisible. | Des variants portent un **stroke** dont l'alignement ne se lit pas. Le contrat ne dira pas s'il est inside, center ou outside. | Vérifiez ce réglage dans chaque variant concerné, puis réexportez. |
| 2 | Propriété non supportée par le moteur. | Le contrat n'exportera pas l'alignement du **stroke** de ces variants. | Vérifiez ce réglage dans Figma, puis réexportez. |

#### 9.2.14 Deux fills reliés à des variables différentes (R24, E9)

Le détail, la paire de tokens, change souvent avec l'axe de couleur.

Texte actuel :

- titre : Layer « Color=Primary, Variant=Filled, State=Default » : deux fills y
  sont reliés à des variables différentes ({color.primary} et
  {color.overlay}).
- impact : Le développeur recevra les deux couleurs sans savoir laquelle passe
  au-dessus.
- action : Ne gardez qu'un fill lié sur ce layer, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Deux fills superposés. | Des variants empilent deux **fills** reliés à des tokens différents. Le développeur recevra les deux couleurs sans savoir laquelle passe au-dessus. | Ne gardez qu'un fill lié dans chaque variant concerné, puis réexportez. |
| 2 | Deux fills superposés. | Des variants empilent {color.primary} et {color.overlay} en **fills**. Le développeur ne saura pas laquelle passe au-dessus. | Ne gardez qu'un fill lié sur ces variants, puis réexportez. |

La rédaction 1 donne une ligne en tout ; la rédaction 2 une ligne par paire de
tokens, soit une par couleur du set dans l'exemple.

## 10. Conditions de fin

- [x] H0 et H2 portent leurs décisions dans le journal.
- [ ] H1 porte ses textes dans le journal, et le rang des ombres dans
      `effects` y est consigné.
- [ ] Chaque lot E1 à E9 a son test vu rouge, sa mutation consignée et son
      commit poussé sur `main`.
- [ ] Aucune loi existante n'a été relâchée ; chaque texte normatif modifié
      l'a été dans le commit de son lot.
- [ ] Un contrat 14.0 fabriqué par le moteur passe `lois.ts` et le contrôle du
      kit ; les jeux 13.0 et 12.0 figés gardent leurs verdicts attendus.
- [ ] Sur le scénario de E0, `meta.diagnostics`, le corps de la demande de
      fusion et la liste du plugin portent la même liste.
- [ ] « Reste à valider » de `TEXTES-A-VALIDER.md` ne cite plus que R25 à R27,
      avec leur raison.
- [ ] `dist/code.js` de la copie partagée contient les corrections.

## 11. Ce que la relecture a changé

Chaque fait de la section 2 a été relu à son site ; les numéros de ligne cités
tiennent. Le scénario sortait 15 lignes avant E0. Les corrections :

| Lot | Constat | Correction |
|---|---|---|
| E4 | `extractSizes` sonde gap et padding par `resolveGroup` : un garde dans `extractLayout` seul laissait sortir R10 sous un axe de tailles. | Sans objet depuis H2, qui garde R10 : son texte de groupe passe par ce même site (F14). |
| E4 | `structure.sizing` se lit sur le composant. Un message posé sur « le node de layout » visait un wrapper dont aucun champ ne porte la taille. | Le texte 9.1.6 vise le composant (F15). |
| E4 | Deux invariants d'`AGENTS.md` changent, alors que la section 4 arrête tout lot en conflit avec un invariant. | H2 accepte la réécriture de la taille de maquette et refuse celle du repli `flex-row`. |
| E0 | La famille `calqueAbsolu` mêlait des messages de E2, de E4 et des messages qui restent : « la famille `opacity` » de E2 n'existait pas. Le cadre ajouté sous le wrapper doublait `Overlay`. La racine `Disabled` change deux attendus que le plan taisait. | Familles scindées, cadre retiré, attendus nommés. |
| E2 | L'opacité dépendait de `publishDimensions`, faux sous un axe de tailles. | Résolue hors de ce drapeau, avec un test. |
| E2 | Le test qui prouve qu'un texte non validé garde une ligne par racine prend l'opacité : changer son attendu effaçait sa preuve. | Il passe au blend mode ; E6 le supprime. |
| E3 | Le faux `getStyleByIdAsync` du scénario rend un text style pour `S:ombre`. | Chargeur qui refuse un `type` autre qu'`EFFECT` ; scénario qui répond par identifiant. |
| E3 | `extractLayout` sert aussi la projection de référence. | Le collecteur d'effets ne sert que les vues exactes. |
| E3 | La comparaison du calque à son style tournait quel que soit M2. | Elle attend que M2 montre un identifiant qui survit. |
| E5 | Sans condition, un composant seul perdait son nom de calque. | Même condition qu'`extractStructure` : plus d'un variant. |
| Section 4 | La règle des dépendances venait du plan et contredisait H3, qui pose `opacity` « sur chaque slot ». | Question ouverte à H2, avec une règle proposée. |
| Ordre | E5 n'attendait aucune porte, et trois arrêts se succédaient sans travail entre eux. | E5 est passé avant les portes ; H0 et H2 sont franchies, H1 suit E1. |
