# Concept — Design System AI-first

Ce document explique le **concept global** du projet — le « pourquoi » et les
principes. Il ne contient ni planning ni détails techniques : l'état
d'avancement et les prochaines étapes vivent dans [`ROADMAP.md`](./ROADMAP.md),
et le comportement exact du plugin dans
[`UCM-EXPORTER-SPEC.md`](./UCM-EXPORTER-SPEC.md).

---

## 1. La vision : le modèle de composant unifié (UCM)

Un composant n'est pas seulement du code. C'est du code **plus** tout ce qui
permet de le concevoir, le configurer et l'utiliser correctement :

- design tokens ;
- props, variantes, états ;
- conventions de nommage et mappings ;
- intentions et bonnes pratiques d'usage (quand l'utiliser, quand ne pas) ;
- métadonnées de traçabilité vers la source.

Un **composant unifié** réunit tout cela au même endroit : **dans le dossier de
chaque composant, son code réel et sa spécification issue de Figma**. Le
**contrat** exporté depuis Figma porte la spécification design — props visuelles,
variantes, états, tokens, règles d'usage ; le code porte l'implémentation
applicative. Leur co-localisation les maintient fortement reliés, là où design et
développement vivaient auparavant dans des sources séparées.

Le **modèle** — *Unified Component Model*, en abrégé **UCM** — est l'ensemble des
règles qui définissent ce qui fait d'un composant un composant unifié : **qui
fait foi** sur quoi (§3), la **co-localisation** (§5), et la façon dont les
composants **se composent**. Trois niveaux à ne jamais confondre : le *modèle*
(les règles), le *composant unifié* (l'unité), le *contrat* (l'artefact design).

Un tel composant est **co-créé** : designer et développeur s'accordent ensemble
sur le composant et son API publique, au lieu de le retravailler chacun dans son
coin. C'est ce qui rend le design system **robuste** — il ne diverge ni côté
design ni côté code.

L'ensemble utilise un **vocabulaire partagé**, lisible par un humain comme par
un agent IA : le frontend reste ainsi **« future proof »** face aux agents — non
pour générer des interfaces à la volée, mais pour que les développeurs s'appuient
sur eux **en confiance** (cf. §2). Les conventions propres à une plateforme
(React, Font Awesome, etc.) restent dans le repository consommateur.

## 2. Le problème qu'on résout

Aujourd'hui, **design et développement divergent**. Chaque composant est
travaillé séparément — le designer dans Figma, le développeur dans le code,
chacun dans son coin — et rien ne garantit qu'ils restent alignés : noms,
variantes, états et tokens finissent par ne plus correspondre d'un côté à
l'autre. Le design system n'est robuste ni pour l'un, ni pour l'autre.

À l'ère de l'IA, ce cloisonnement doit changer. **Designer et développeur
co-créent des composants unifiés**, pour un design system qui ne diverge
d'aucun côté.

Ce changement de paradigme sert un objectif : rendre le frontend
**« future proof »** vis-à-vis des agents IA. Le but n'est **pas** de générer
des interfaces à la volée, mais de permettre aux développeurs d'**utiliser les
agents en confiance** : parce que chaque composant porte un contrat explicite
(variantes, états, intention, quand l'utiliser et quand l'éviter), l'agent sait
avec précision **quel composant utiliser, dans quel contexte et comment**. Les
développeurs vont plus vite et commettent moins d'erreurs.

Trois frictions concrètes que l'UCM lève :

1. **La divergence design ↔ code** — le travail en silo, sans alignement garanti.
2. **Le manque de contexte design fiable pour les agents** — sans lui, leurs
   productions sont incohérentes, donc inexploitables en confiance.
3. **Le coût des outils dédiés** (Code Connect, appels au MCP de Figma) pour
   obtenir ce contexte.

Réponse de l'UCM :

- **un seul composant unifié**, co-créé design + dev : un seul nom vaut de Figma
  jusqu'au code — plus de divergence possible ;
- l'agent **lit** le contrat et les tokens : il *sait* quoi utiliser **et quand**
  (l'intention est explicite, pas devinée) ;
- toutes les références **sont disponibles dans un format lisible**, sans requête
  vers un autre outil ou service.

## 3. Qui fait foi ? — l'arbitrage des sources

L'UCM réunit deux mondes. Pour qu'ils ne se contredisent **jamais**, chaque
information a **un seul propriétaire**. C'est la règle qui tranche en cas de
doute.

| Information | Fait foi | Ce qui empêche la divergence |
|---|---|---|
| Tokens (valeurs, alias) et **structure visuelle** (variantes, états, dimensions, icônes, règles d'usage) | **Figma** | nom mécanique de bout en bout ; le code s'aligne |
| **API publique** : noms et valeurs des props | **accord designer ↔ développeur, gravé dans Figma** | un seul nom validé dès la création du composant ; la CI vérifie |
| Comportement, accessibilité, événements, attributs natifs | **code réel** | hors périmètre du contrat |
| Liaison contrat ↔ implémentation, vérification de cohérence | **repo consommateur / CI** | adaptateurs de plateforme |

Trois règles en découlent.

**Tokens : un seul nom, mécanique.** Aucun humain ne retape un nom de token.
`normalizeName()` produit le même identifiant de Figma → contrat → CSS. La
divergence est impossible par construction.

**Props : un seul nom, négocié en amont.** Le nom et les valeurs d'une prop
(`variant`, `size`, `iconLeft`…) ne sont pas devinés après coup. **Le composant
Figma est construit et nommé en collaboration entre le designer et le
développeur** : ils s'accordent sur l'API publique **au moment même de la
création du composant**, avant qu'une ligne de code ne soit écrite. Ce nom
voyage ensuite intact — Figma → contrat → code — et le code le reprend à
l'identique ; la CI le vérifie. Le contrat conserve toujours le nom Figma
d'origine dans `figmaName` pour la traçabilité. Ce qui reste au code **seul** :
le comportement, `onClick`, les attributs `aria-*`, les règles de formulaire —
le contrat ne les décrit pas.

**Références de tokens : toujours un lien, jamais une valeur.** Dans les deux
artefacts, un token est cité comme **référence** vers `tokens.json`, jamais
comme valeur aplatie. La référence n'est résolue qu'à la **lecture** (agent,
build, parité) : c'est ce qui permet à la parité de vérifier les *noms*, pas
seulement les valeurs finales, et ce qui préserve le multi-marque et le theming.
Syntaxe unifiée : accolades + séparateur point, `{chemin.du.token}`, le chemin
pointant le token tel qu'il apparaît dans `tokens.json`. Les **deux** artefacts —
`tokens.json` et le contrat — utilisent désormais cette syntaxe
(`contractVersion` 3.0).

**Critères de cohérence que la CI doit garantir :**

- si le code d'un composant ne correspond plus à sa spec Figma (prop, variante
  ou valeur divergente), la CI **détecte et bloque** ;
- si un token change dans Figma, le composant qui ne l'a pas suivi est
  **signalé** ;
- un token référencé qui n'existe plus → **erreur**.

## 4. Le workflow complet

```
Figma (DS propre)
   │  Unified Component Exporter (plugin d'extraction)
   ▼
{ tokens.json (DTCG) + <Composant>.contract.json }
   │  déposés dans le repo, AU MÊME ENDROIT que le composant
   ▼
Repo React : contrat co-localisé + code réel écrit par un développeur
   │
   ▼
Playground : un agent compose une interface avec les composants disponibles
```

1. **Figma** — collections de tokens organisées par niveaux d'alias, composant
   avec toutes ses variantes (couleur / taille / variant / état), et ses
   **règles d'usage** dans un conteneur `<Nom>-Rules`. Le composant et le **nom
   de ses props** sont définis en collaboration designer ↔ développeur (cf. §3).
2. **Unified Component Exporter** (ce plugin) — extrait **deux artefacts** : `tokens.json`
   (toutes les variables, chaîne d'alias préservée, entrée Style Dictionary) et
   `<Composant>.contract.json` (props, structure, `tokensUsed`, `intent`,
   doc par valeur). Cf. [`UCM-EXPORTER-SPEC.md`](./UCM-EXPORTER-SPEC.md).
3. **Co-localisation** (voir §5) — les artefacts atterrissent dans le repo.
4. **Code réel** — un développeur écrit `Button.tsx` contre le contrat et les
   tokens. Les props contrôlées par le design reprennent les noms fixés en
   amont ; les attributs natifs, événements et règles d'accessibilité relèvent
   du code.
5. **Garde-fous** — la CI vérifie que le code **ne peut pas** diverger du
   contrat ni des tokens (cf. §3, critères de cohérence).
6. **Playground** — on demande une interface (« trois boutons de ce type,
   deux de cet autre, disposés comme ça »), l'agent l'écrit à partir du seul
   contrat, on constate de ses yeux qu'il respecte le design system. C'est la
   **preuve de fiabilité** qui fonde la confiance d'un développeur à déléguer à
   un agent — pas un mode de production d'interfaces à la volée.

## 5. Principe fondateur : la co-localisation

**Toutes les données d'un composant vivent au même endroit.** Le contrat
est exporté **dans le dossier du composant réel**, à côté de son `.tsx` :

```
components/Button/
  Button.tsx            ← le code réel
  Button.contract.json  ← la spécification design exportée de Figma
  …
```

Un agent (ou un humain) qui ouvre le dossier d'un composant y trouve **à la
fois** l'implémentation et sa spécification design. Aucune chasse à
l'information ailleurs.

Les **tokens**, partagés par tous les composants, vivent dans
`src/tokens/tokens.json` dans le repo consommateur. Ils restent ainsi dans les
sources applicatives, au même niveau architectural que `src/components`, sans
être artificiellement co-localisés avec un composant particulier.

---

**Suite.** L'objectif MVP, l'état d'avancement et les prochaines étapes sont
dans [`ROADMAP.md`](./ROADMAP.md). Le positionnement dans l'écosystème, les
inspirations et les risques sont dans
[`PISTES-EVOLUTION.md`](./PISTES-EVOLUTION.md).
