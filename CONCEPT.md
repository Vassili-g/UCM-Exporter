# Concept — Design System AI-first

Ce document porte la **vision** et le **plan d'action global**. Il fait
autorité sur le « pourquoi » et le « où on va ». La spécification technique du
plugin d'extraction vit dans [`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md).

---

## 1. La vision : Unified Component Specification (UCS)

Un composant n'est pas seulement du code. C'est du code **plus** tout ce qui
permet de le concevoir, le configurer et l'utiliser correctement :

- design tokens ;
- props, variantes, états ;
- conventions de nommage et mappings ;
- intentions et bonnes pratiques d'usage (quand l'utiliser, quand ne pas) ;
- métadonnées de traçabilité vers la source.

Une **UCS** regroupe ces informations dans un **vocabulaire partagé**, lisible
par un humain comme par un agent IA. Elle décrit les décisions contrôlées par le
design ; les conventions propres à une plateforme (React, Font Awesome, etc.)
restent dans le repository consommateur.

## 2. Le problème qu'on résout

Deux frustrations concrètes, à l'origine du projet :

1. **Les agents IA produisent des interfaces incohérentes** — faute d'assez
   d'informations sur le design system et sur les intentions design.
2. **Les noms divergent** entre le design system (Figma) et la réalité du code.

L'UCS règle les deux :

- l'agent **lit** le contrat et les tokens : il *sait* quoi utiliser **et
  quand** (l'intention est explicite, pas devinée) ;
- **un seul nom** vaut de Figma jusqu'au code — plus de divergence possible.

## 3. Le workflow complet

```
Figma (DS propre)
   │  TokenLintel (plugin d'extraction)
   ▼
{ tokens.json (DTCG) + <Composant>.contract.json (UCS) }
   │  déposés dans le repo, AU MÊME ENDROIT que le composant
   ▼
Repo React : contrat co-localisé + code réel écrit par un développeur
   │
   ▼
Playground : un agent compose une interface avec les composants disponibles
```

1. **Figma** — collections de tokens organisées par niveaux d'alias, composant avec toutes ses variantes
   (couleur / taille / variant / état), et ses **règles d'usage** dans un
   conteneur `<Nom>-Rules`.
2. **TokenLintel** (ce plugin) — extrait **deux artefacts** : `tokens.json`
   (toutes les variables, chaîne d'alias préservée, entrée Style Dictionary) et
   `<Composant>.contract.json` (props, structure, `tokensUsed`, `intent`,
   doc par valeur). Cf. [`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md).
3. **Co-localisation** (voir §4) — les artefacts atterrissent dans le repo.
4. **Code réel** — un développeur écrit `Button.tsx` contre le contrat et les
   tokens. Les props contrôlées par le design restent alignées sur l'UCS ; les
   attributs natifs, événements et règles d'accessibilité relèvent du code.
5. **Garde-fous** — la CI vérifie que le code **ne peut pas** diverger du
   contrat ni des tokens.
6. **Playground** — on demande une interface (« trois boutons de ce type,
   deux de cet autre, disposés comme ça »), l'agent l'écrit à partir du
   contrat, on constate de ses yeux qu'il respecte le design system.

## 4. Principe fondateur : la co-localisation

**Toutes les données d'un composant vivent au même endroit.** Le contrat UCS
est exporté **dans le dossier du composant réel**, à côté de son `.tsx` :

```
components/Button/
  Button.tsx            ← le code réel
  Button.contract.json  ← l'UCS exportée de Figma
  …
```

Un agent (ou un humain) qui ouvre le dossier d'un composant y trouve **à la
fois** l'implémentation et sa spécification design. Aucune chasse à
l'information ailleurs.

Les **tokens**, partagés par tous les composants, vivent dans
`src/tokens/tokens.json` dans le repo consommateur. Ils restent ainsi dans les
sources applicatives, au même niveau architectural que `src/components`, sans
être artificiellement co-localisés avec un composant particulier.

## 5. L'objectif : un MVP qui prouve

Pas un produit fini. Un **prototype qui prouve** que le pipeline complet
Figma → tokens → code → agent fonctionne, monté le plus **solidement et
automatiquement** possible, sur **un seul composant** (le bouton), de bout en
bout — pour ensuite le **montrer aux équipes** et décider du passage à l'échelle.

Deux livrables **distincts**, tous deux nécessaires :

- **le code réel du bouton** (`Button.tsx`) — écrit et maintenu par un
  développeur : c'est **le livrable** ;
- **le playground** — l'espace où l'agent génère des interfaces avec ce
  bouton : c'est **la preuve**.

La reconstruction du Button par un agent en contexte froid est uniquement un
**test de robustesse du contrat**. Si le rendu reconstruit est faux, on vérifie
si l'information était absente ou ambiguë dans l'UCS. Ce code généré n'est pas
destiné à remplacer l'implémentation du développeur.

## 6. État & plan d'action

Le pipeline complet fonctionne sur Button. Le travail restant porte surtout
sur les garde-fous du repository consommateur et la validation avec un second
composant, afin de vérifier que le modèle reste générique.

| Phase | Objet | État |
|---|---|---|
| **0** | Figer TokenLintel (export UCS/DTCG, configuration et PR) | opérationnel sur Button |
| **A** | Repo consommateur + pipeline tokens (Vite + React + Tailwind, Style Dictionary v4 ; **noms de tokens = chemins**) | opérationnel |
| **B** | `Button.tsx` réel, écrit par un développeur **contre le contrat** | prototype validé ; implémentation de production à écrire |
| **C** | Garde-fous CI : `tokensUsed` ⊆ tokens générés · conformité code ↔ contrat · uniformité de nommage | partiel : contrôle des tokens présent |
| **D** | Playground : rendu live + contexte agent + test froid léger | opérationnel sur Button |
| **E** | Passage à l'échelle : 2ᵉ composant non-Button, guide de rédaction pour les designers, industrialisation | post-MVP |

**Critère de succès du MVP** : dans le playground, l'agent n'invente aucune
variante visuelle, utilise les props design du contrat, respecte les `@dont` et
produit un rendu cohérent avec Figma, sans divergence de nom sur le trajet.
