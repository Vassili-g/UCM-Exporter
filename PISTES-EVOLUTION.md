# Pistes d'évolution — UCM

*Document de réflexion, révisé en juillet 2026. Rien ici n'engage la roadmap :
ce sont des idées pour la suite, à réévaluer au fil des validations réelles.*

Ce document rassemble l'**analyse stratégique** du projet : positionnement,
inspirations, risques et **vision produit à horizon** (§6, tiérée). Il ne décrit
ni des fonctionnalités promises, ni le comportement actuel du plugin, **ni des
étapes de développement** — celles-ci vivent dans [`ROADMAP.md`](./ROADMAP.md).

- [`CONCEPT.md`](./CONCEPT.md) porte le concept global ;
- [`UCM-EXPORTER-SPEC.md`](./UCM-EXPORTER-SPEC.md) décrit le comportement qui fait
  foi aujourd'hui ;
- [`ROADMAP.md`](./ROADMAP.md) tient l'état d'avancement et les prochaines
  étapes ;
- ce document conserve les idées à évaluer, leur intérêt et leurs risques.

## 1. Conclusion actuelle

La direction générale est suffisamment solide pour poursuivre sans refondre
le concept ni enrichir immédiatement le contrat.

Les choix structurants à préserver sont les suivants :

- Figma porte la vérité design ;
- le développeur porte le code réel et le comportement applicatif ;
- le contrat décrit ce qui relève du design, sans prétendre décrire toute
  l'implémentation ;
- le contrat est portable, versionnable et lisible sans ouvrir Figma ;
- il vit à côté du composant qu'il spécifie ;
- les tokens partagés restent centralisés et utilisent le format DTCG ;
- le test en contexte froid évalue la qualité du contrat, mais ne remplace pas
  le développement du composant réel.

La priorité n'est donc pas d'accumuler de nouveaux champs. Elle est de vérifier
que le modèle reste générique sur plusieurs familles de composants, puis de
renforcer progressivement sa validation et son interopérabilité.

## 2. Positionnement dans l'écosystème

Le problème traité par Unified Component Exporter est largement reconnu, mais les solutions
existantes n'en couvrent généralement qu'une partie.

| Solution ou standard | Ce qu'il apporte | Différence avec Unified Component Exporter |
|---|---|---|
| [Figma Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect) | Relie les composants Figma au code réel, mappe leurs propriétés et améliore le contexte transmis aux agents par Figma | Le mapping et les exemples restent liés à l'écosystème Figma ; Unified Component Exporter produit une spécification design autonome et versionnée dans le repository |
| [Storybook](https://storybook.js.org/docs/8/writing-docs/autodocs) | Documente les composants à partir du code, des stories et des métadonnées de props | La source principale est le code ; Storybook n'extrait pas la vérité design ni les règles Figma |
| [UXPin Merge](https://www.uxpin.com/docs/merge/merge-design-system-documentation/) | Utilise les composants codés réels dans l'outil de design | L'approche est code-first, alors que l'UCM maintient deux responsabilités distinctes et fortement reliées |
| [Backlight](https://backlight.dev/docs/make-your-first-design-system) | Réunit source, stories, tests, documentation et ressources design autour des composants | La co-localisation est proche, mais sans contrat structuré exporté depuis Figma et conçu pour les agents |
| [DTCG](https://tr.designtokens.org/format/) | Standardise l'échange des design tokens entre outils | Le standard couvre les tokens, pas la spécification complète d'un composant |

Les principes de connexion entre design et code, de co-localisation et de
source de vérité ne sont donc pas nouveaux isolément. La différenciation du
projet vient de leur combinaison :

1. extraction déterministe depuis Figma ;
2. contrat design JSON générique par composant ;
3. co-localisation avec le code réel ;
4. variantes, états, tokens, icônes et règles d'usage réunis ;
5. exploitation indépendante de Figma par les humains, la CI et différents
   agents IA ;
6. test en contexte froid utilisé comme diagnostic de la qualité du contrat.

Le positionnement le plus juste est celui d'une **couche de contrat design,
Git-native et lisible par les agents, placée à côté du code réel de chaque
composant**. Unified Component Exporter peut compléter Code Connect, Storybook et DTCG plutôt
que chercher à les remplacer.

## 3. Utilité potentielle

Le concept est particulièrement pertinent pour les équipes qui disposent à la
fois d'un design system Figma et d'une bibliothèque de composants, notamment
lorsqu'elles :

- utilisent plusieurs agents ou environnements de développement assistés par
  IA ;
- doivent conserver une traçabilité et des revues Git ;
- partagent un design system entre plusieurs frameworks ou plateformes ;
- constatent des divergences de nommage entre Figma, la documentation et le
  code ;
- ne veulent pas rendre tout leur contexte dépendant d'un accès permanent à
  Figma.

Le gain sera plus faible pour une petite bibliothèque peu structurée, un
design system entièrement code-first ou une organisation déjà engagée dans un
outil où les composants codés sont directement utilisés pour concevoir.

## 4. Améliorations dont s'inspirer

### 4.1 Liaison explicite entre contrat et implémentation

Code Connect relie sans ambiguïté un composant Figma, un fichier source, un
export et les propriétés correspondantes. Le contrat Unified Component Exporter possède déjà
la traçabilité Figma (`nodeId`, `componentKey`, `url`, noms Figma).

Le repository consommateur pourrait ajouter une liaison distincte :

```json
{
  "contract": "./Button.contract.json",
  "implementation": {
    "source": "./Button.tsx",
    "export": "Button"
  }
}
```

Cette donnée ne doit pas être exportée par Figma : elle dépend du repository,
du framework et de son organisation. Une intégration ultérieure pourrait
générer un mapping Code Connect à partir de cette association, sans dupliquer
manuellement la correspondance.

Ce n'est pas contradictoire avec la friction n°3 de
[`CONCEPT.md`](./CONCEPT.md) §2 : l'UCM supprime le **coût de lecture** du
contexte design via des outils dédiés, mais peut très bien **alimenter**
Code Connect pour les équipes qui l'utilisent déjà.

**Statut :** à étudier après la validation multi-composants.

### 4.2 Validation du contrat contre le code

L'introspection employée par Storybook suggère le garde-fou le plus important
pour l'UCM : comparer la partie de l'API contrôlée par le design avec l'API
réelle du composant.

Le validateur devrait vérifier que :

- les props design existent dans le code ;
- leurs types sont compatibles ;
- les valeurs d'enum ne divergent pas ;
- les valeurs par défaut sont cohérentes lorsqu'elles sont vérifiables ;
- les props supplémentaires du code restent autorisées ;
- les attributs applicatifs (`onClick`, `aria-*`, `form`...) ne sont pas
  attendus dans le contrat design.

Cette validation doit être portée par un adaptateur du repository consommateur
(React/TypeScript dans le playground), pas par le moteur d'extraction Figma.
Elle ne doit introduire aucune règle conditionnée au nom d'un composant.

**Statut :** priorité haute après la preuve de généricité.

### 4.3 JSON Schema public

Le contrat est actuellement défini par les types TypeScript et la
spécification. Un JSON Schema officiel permettrait :

- la validation dans n'importe quel langage ;
- l'autocomplétion dans les éditeurs ;
- une documentation machine des champs obligatoires et optionnels ;
- la détection des contrats incompatibles ou obsolètes ;
- l'intégration par d'autres outils sans importer le code TypeScript de
  Unified Component Exporter.

Le contrat porte sa propre version de schéma dans `contractVersion`. Cette
version concerne le format du JSON exporté, tandis que l'UCM désigne le concept
global qui réunit ce contrat et le code réel du composant.

**Statut :** priorité moyenne, nécessaire avant une diffusion large.

### 4.4 Diff sémantique dans les pull requests

Un diff JSON brut devient difficile à relire lorsque les matrices de variantes
grandissent. Un résumé pourrait classer les changements :

```text
Button

Ruptures
- valeur "outlined" supprimée de variant
- prop iconLeft renommée

Ajouts compatibles
- taille "compact" ajoutée
- état "loading" ajouté

Tokens
- primary.contained.hover.background remplacé
```

Le diff doit rester dérivé des deux contrats comparés : il n'ajoute aucune
nouvelle vérité. Il pourrait servir de commentaire de PR ou de rapport CI.

**Statut :** priorité moyenne, après stabilisation du schéma.

### 4.5 Nom des props : accord amont, mapping en échappatoire

L'arbitrage retenu (cf. [`CONCEPT.md`](./CONCEPT.md) §3) fixe le nom des props
**en amont** : le composant Figma est co-construit designer ↔ développeur, qui
s'accordent sur l'API publique à la création. Le nom voyage alors intact de
Figma au code, sans renommage, donc **sans mapping à maintenir** — c'est le cas
le plus simple et il suffit au MVP.

Une échappatoire reste envisageable **à l'échelle**, si un jour design et code
ne peuvent réellement pas partager un même nom : le repository consommateur
déclarerait une correspondance explicite (`contrat.iconLeft ↔ code.iconStart`)
que la CI lirait pour vérifier la parité malgré la divergence. Cette mécanique
n'a d'intérêt que lorsqu'un renommage devient inévitable ; l'ajouter avant
reviendrait à outiller un problème qu'on n'a pas encore rencontré.

**Statut :** non nécessaire tant que les noms sont négociés à la création du
composant Figma.

## 5. Risques principaux

Le modèle a **trois coutures** ; chacune peut se défaire à sa manière.

**Figma ↔ contrat — la péremption (le risque le plus sournois).** Le plugin est
manuel : rien ne signale qu'un export est en retard sur Figma. Un contrat
« frais » d'apparence peut décrire un composant modifié depuis des semaines —
toute la chaîne « impossible de diverger » repose sur un humain qui pense à
ré-exporter. Mitigations envisageables : afficher `meta.exportedAt` dans le
playground, badge CI d'ancienneté des artefacts, rappel périodique côté design.

**Contrat ↔ code — la divergence silencieuse.** La co-localisation rapproche la
spécification et le code, mais ne garantit pas à elle seule leur cohérence :

```text
Figma ──► contrat de composant
                 ↕ validation encore partielle
          implémentation réelle
```

Le concept atteindra sa pleine puissance lorsque la CI saura détecter :

- une variante présente dans le contrat mais absente du code ;
- une prop design ou une valeur d'enum divergente ;
- un token référencé qui n'existe plus ;
- une règle d'icône `strict` non respectée ;
- un contrat incompatible avec la version de schéma prise en charge ;
- une modification importante difficile à repérer dans le JSON brut.

**Code ↔ runtime — les conventions hors tokens.** Ce que le contrat ne porte
pas encore se glisse dans le repo consommateur : dette non tokenisée (ratio de
glyphe, style FontAwesome — tracée dans le skill `consommer-contrat`),
dépendance au kit d'icônes distant. Chaque convention de ce type est une
mini-source de vérité parallèle à résorber par tokenisation.

## 6. Vision produit (horizon ~1 an, écrit mi-2026)

À quoi ressemble le produit **complet**, plus un MVP. **Avertissement** : ~80 %
de la valeur tient dans le Tier 1. Cette carte est un **filtre** — elle sert à
savoir quoi *ne pas* faire autant que quoi faire, pas une to-do à dérouler.

Tout est mesuré à l'aune des deux piliers du concept ([`CONCEPT.md`](./CONCEPT.md)
§2) : **A** — robustesse / non-divergence (co-création) ; **B** — confiance
des devs dans les agents.

**Tier 1 — la colonne vertébrale (le cœur du produit)**

- **Parité industrialisée avec exceptions déclarées** (Pilier A). Le garde-fou
  central du modèle : ce qu'il vérifie est détaillé en §4.2, sa mise en œuvre
  dans [`ROADMAP.md`](./ROADMAP.md) §3. Sans divergence volontaire annotable,
  la parité devient une prison qu'on finit par contourner.
- **Agent à deux niveaux, contexte servi par les fichiers du repo** (Pilier B). *Usage*
  (composer une UI, le MVP) puis *contribution* (« ajoute un variant ghost au
  bouton » exécuté dans les règles du pipeline). Le contexte est servi en
  fichiers dans le repo, jamais via un service tiers à interroger — c'est la
  friction n°3 de [`CONCEPT.md`](./CONCEPT.md) §2.
  L'agent-contributeur n'est sûr que **parce que** la parité le rattrape.
- **CODEOWNERS encodant l'arbitrage** (Pilier A, coût quasi nul). Les tokens ne
  s'approuvent que par un designer, le code que par un dev : le §3 de CONCEPT
  devient un fichier que GitHub applique à chaque PR.
- **Modèle de composition** (composant simple vs composé, parité récursive).
  Sans lui, la robustesse s'arrête aux composants simples ; les vraies UIs sont
  des arbres de composés. Structurel, pas optionnel — c'est une **priorité**
  roadmap.

**Tier 2 — multiplicateurs (réels mais dérivés ; après la colonne)**

- **Doc + stories dérivées du contrat** : jamais écrites à la main, donc jamais
  fausses. Renforce les deux piliers.
- **Changelog automatique + niveaux de confiance** (auto-merge d'un changement
  de doc, revue humaine d'un changement de token/props), dérivés du diff de
  contrats (§4.4).
- **Preview deploy avant merge** : voir l'impact d'un changement de token sur
  tous les composants, avant de fusionner.

**Tier 3 — adjacent : à ADOPTER, pas à construire**

- **Régression visuelle** (type Chromatic) : vraie valeur mais outil du marché,
  non différenciant — on l'achète, on ne le bâtit pas.
- **Observabilité / tableau de bord** (divergences non résolues, contrats
  manquants, taux de conformité des agents, tokens orphelins) : utile *à
  l'échelle*, prématuré tant qu'on a peu de composants.
- **Multi-plateforme** (React Native / iOS / Android via Style Dictionary) :
  une *portée*, pas le cœur du concept. Le multi-marque, lui, existe déjà (modes).

**Tier 4 — à NE PAS faire**

- **Write-back automatique code → Figma.** Contredit l'invariant « Unified Component Exporter
  n'écrit jamais dans Figma ». On garde la
  **détection** bidirectionnelle (signaler qu'une maquette est en retard sur le
  code), jamais l'écriture dans le document.
- **Enrichir le contrat au-delà du design.** Pas de snippets React/CSS ni de
  documentation Storybook complète dans le contrat, pas d'arbre Figma brut ni
  de reproduction de tout le layout, pas d'événements applicatifs (`activate`,
  `onClick`), pas d'attributs `aria-*` ni de règles de formulaire décrits dans
  Figma : le contrat décrit le design, jamais l'implémentation.
- **Synchronisation bidirectionnelle** avant d'avoir démontré la stabilité du
  flux actuel.

## 7. Questions ouvertes

Des questions à garder en tête pour la suite — aucune ne bloque le MVP :

- **Ce que le contrat contrôle** (à geler une fois `composes` conçu) : props +
  valeurs + états + tokens (en références) + slot icône + **dépendances de
  composition**. Ce qui n'y est pas listé ne sera jamais vérifié par la parité.
- **Sécurité du dépôt GitHub** : le PAT fine-grained local (actuel) suffit-il,
  ou une politique interne imposera-t-elle un proxy serveur ?
- **Versionner le DS en package nommé** distinct : conditionne la cohabitation
  de plusieurs versions et le suivi d'adoption.

---

Les étapes concrètes et l'ordre de développement sont tenus dans
[`ROADMAP.md`](./ROADMAP.md).
