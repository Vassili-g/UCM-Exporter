# ROADMAP — Design System AI-first

**Où en est le projet et ce qui reste à faire.** Le concept est expliqué dans
[`CONCEPT.md`](./CONCEPT.md), le comportement exact du plugin dans
[`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md), et l'analyse stratégique
(positionnement, inspirations, risques) dans
[`PISTES-EVOLUTION.md`](./PISTES-EVOLUTION.md).

## 1. L'objectif : un MVP qui prouve

Pas un produit fini. Un **prototype qui prouve** que le pipeline complet
Figma → tokens → code → agent fonctionne, monté le plus **solidement et
automatiquement** possible, sur **un seul composant** (le bouton), de bout en
bout — pour ensuite le **montrer aux équipes** et décider du passage à l'échelle.

Deux livrables **distincts**, tous deux nécessaires :

- **le code réel du bouton** (`Button.tsx`) — écrit et maintenu par un
  développeur : c'est **le livrable** ;
- **le playground** — l'espace où l'agent compose des interfaces avec ce bouton
  à partir du seul contrat : c'est **la preuve** qu'un agent utilise le design
  system correctement, donc qu'un développeur peut s'appuyer sur lui en
  confiance (et non un mode d'autogénération d'interfaces).

La reconstruction du Button par un agent en contexte froid est uniquement un
**test de robustesse du contrat** : si le rendu reconstruit est faux, on vérifie
si l'information était absente ou ambiguë dans le contrat. Ce code généré ne
remplace pas l'implémentation du développeur.

## 2. État d'avancement

Le pipeline complet fonctionne sur Button. Le travail restant porte surtout sur
les garde-fous du repository consommateur et la validation avec un second
composant, pour vérifier que le modèle reste générique.

| Phase | Objet | État |
|---|---|---|
| **0** | Figer TokenLintel (contrats, tokens DTCG, configuration et PR) | opérationnel sur Button |
| **A** | Repo consommateur + pipeline tokens (Vite + React + Tailwind, Style Dictionary v4 ; **noms de tokens = chemins**, alias préservés en `var(--…)`) | opérationnel |
| **B** | `Button.tsx` réel, écrit par un développeur **contre le contrat** | prototype validé ; implémentation de production à écrire |
| **C** | Garde-fous CI : `tokensUsed` ⊆ tokens générés · conformité code ↔ contrat · uniformité de nommage | partiel : parité des tokens présente **en local**, pas encore de workflow CI |
| **D** | Playground : rendu live + contexte agent + test froid léger | opérationnel sur Button |
| **E** | Passage à l'échelle : 2ᵉ composant non-Button, guide de rédaction pour les designers, industrialisation | post-MVP |

## 3. Prochaines étapes

Dans l'ordre. Les tâches 2 à 5 sont prioritaires : 2-3 achèvent le socle sur
Button, puis 4-5 attaquent les deux vrais points durs — la **parité** (Pilier A)
et la **composition**.

1. ~~**Harmoniser les références de tokens sur `{accolades}`**~~ — ✅ **fait**
   (`contractVersion` 3.0). Le plugin enrobe chaque token cité dans le contrat
   en référence DTCG (`{layouts.components.button.medium.gap}`), aligné sur
   `tokens.json` ; les deux lecteurs du playground (`check-contract.mjs`,
   `tokenVar`) retirent les accolades avant résolution. `normalizeName()` reste
   l'unique règle d'écriture et de lecture.
2. **Écrire le vrai `Button.tsx` (avec le dev).** Noms et valeurs des props
   fixés ensemble en amont (cf. [`CONCEPT.md`](./CONCEPT.md) §3). États :
   `hover` / `focus` / `press` en CSS (`:hover` / `:focus-visible` / `:active`,
   déjà portés par `stateModel`), `disabled` en prop booléenne. Ce code de
   production remplace le prototype généré.
3. **Boucler les garde-fous CI du playground (Phase C).** Aucun workflow
   n'existe aujourd'hui : `npm run check` (build des tokens + parité
   `tokensUsed ⊆ tokens générés`) ne tourne qu'en local. Ajouter une GitHub
   Action qui le lance à chaque PR. *(Rien à faire côté régénération : le CSS
   généré est reconstruit à chaque build via `prebuild`, et `outputReferences`
   préserve déjà les alias en `var(--…)`.)*
4. **Parité code ↔ contrat, industrialisée.** Un adaptateur React/TS extrait
   l'API réelle du `.tsx` (via `react-docgen-typescript`) → `Button.code.json`,
   puis un comparateur liste les écarts avec le contrat (prop manquante, valeur
   d'enum divergente, état non géré, référence de token cassée, dépendance de
   composition absente) **et le sens de correction** selon l'arbitrage de
   [`CONCEPT.md`](./CONCEPT.md) §3. Déclencheurs : hook pre-commit (retour local)
   + GitHub Action bloquante sur PR. Prévoir la **déclaration d'une divergence
   volontaire** (annotée + justifiée), sinon la parité devient une prison qu'on
   finit par désactiver. Aucune règle conditionnée au nom d'un composant.
5. **Composant composé — priorité structurelle.** Deux natures de composants :
   un **composant simple** ne consomme que des tokens et des calques (ex. Button,
   aucune instance imbriquée) ; un **composant composé** assemble d'autres
   composants du DS (ex. une Card contenant un Button). *(équivalent dev :
   primitive / composite.)* On crée **volontairement** un composé minimal (Card
   ou Header avec instances imbriquées) pour buter le vrai inconnu de
   l'architecture :
   - le plugin doit **reconnaître un nœud `INSTANCE`** d'un autre composant
     contracté et l'enregistrer comme **dépendance** dans un champ `composes`
     (au lieu de descendre dans ses calques bruts) ;
   - le contrat d'un composé ne liste que **ses propres** tokens (fond, gap entre
     éléments…), jamais les internes des composants qu'il embarque ;
   - la parité devient **récursive** : un composé est conforme s'il expose ses
     props **et** utilise réellement les composants déclarés dans `composes`,
     eux-mêmes conformes.
   C'est ce cas — pas un 2ᵉ composant simple — qui prouve que le modèle passe à
   l'échelle de la composition.
6. **Composants simples supplémentaires (généricité).** Une fois la composition
   tenue : un composant à icône `strict` (Alert) et un interactif (Checkbox /
   TextField) pour couvrir booléens, états et slots, et confirmer qu'aucune règle
   spécifique à Button ne subsiste.
7. **Au-delà du MVP.** Une fois la généricité prouvée : JSON Schema versionné du
   contrat, diff sémantique des contrats pour faciliter les revues, puis
   passerelles (génération Code Connect, exploitation Storybook). Motivations
   détaillées dans [`PISTES-EVOLUTION.md`](./PISTES-EVOLUTION.md) §4.

> **Principe d'ordonnancement.** On ne conçoit `composes` ni la parité récursive
> dans l'abstrait : créer volontairement un composé minimal (étape 5) fournit le
> cas réel contre lequel on les dessine. Une abstraction ajoutée avant son cas
> concret résout un problème théorique et réduit la généricité.

## 4. Critères de succès & de validation

**Succès du MVP** : dans le playground, l'agent n'invente aucune variante
visuelle, utilise les props design du contrat, respecte les `@dont` et produit
un rendu cohérent avec Figma, sans divergence de nom sur le trajet ; et la CI
applique les trois critères de cohérence de [`CONCEPT.md`](./CONCEPT.md) §3.

**Concept validé (au-delà de Button)** : le modèle pourra être proposé à une
expérimentation externe lorsque —

- plusieurs familles de composants sont décrites sans condition liée à leur nom ;
- leurs contrats passent un JSON Schema versionné ;
- les tokens utilisés sont vérifiés automatiquement ;
- un premier adaptateur détecte les divergences entre contrat et code ;
- un agent en contexte froid utilise correctement variantes et règles d'usage
  sans inventer d'API design ;
- les erreurs répétées des agents se relient à une ambiguïté précise du contrat
  ou à une responsabilité qui appartient explicitement au code.
