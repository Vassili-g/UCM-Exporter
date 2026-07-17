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

Une **UCS** regroupe tout ça **au même endroit**, dans un **vocabulaire
partagé**, lisible à la fois par un humain et par un agent IA **sans
interprétation externe**. Design et développement parlent la même langue et
partagent la même source de vérité.

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
Repo React : code réel typé + garde-fous CI
   │
   ▼
Playground : on parle à Claude Code en langage naturel,
il compose une interface avec le composant, on voit le rendu en direct
```

1. **Figma** — tokens en 5 tiers, composant avec toutes ses variantes
   (couleur / taille / variant / état), et ses **règles d'usage** dans un
   conteneur `<Nom>-Rules`.
2. **TokenLintel** (ce plugin) — extrait **deux artefacts** : `tokens.json`
   (toutes les variables, chaîne d'alias préservée, entrée Style Dictionary) et
   `<Composant>.contract.json` (props, structure, `tokensUsed`, `intent`,
   doc par valeur). Cf. [`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md).
3. **Co-localisation** (voir §4) — les artefacts atterrissent dans le repo.
4. **Code réel** — `Button.tsx` consomme les tokens, props strictement typées,
   alignées sur le contrat.
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

*Ouvert* : l'emplacement des **tokens** (partagés par tous les composants)
reste à définir — vraisemblablement une racine commune (`tokens/`), puisqu'ils
ne sont pas propres à un composant.

## 5. L'objectif : un MVP qui prouve

Pas un produit fini. Un **prototype qui prouve** que le pipeline complet
Figma → tokens → code → agent fonctionne, monté le plus **solidement et
automatiquement** possible, sur **un seul composant** (le bouton), de bout en
bout — pour ensuite le **montrer aux équipes** et décider du passage à l'échelle.

Deux livrables **distincts**, tous deux nécessaires :

- **le code réel du bouton** (`Button.tsx`) — celui qui partirait en prod :
  c'est **le livrable** ;
- **le playground** — l'espace où l'agent génère des interfaces avec ce
  bouton : c'est **la preuve**.

## 6. État & plan d'action

**Amont ~90 %** (Figma + extraction TokenLintel, validés sur Button).
**Aval 0 %** (stack de consommation + preuve) — c'est là que se joue la
démonstration.

| Phase | Objet | État |
|---|---|---|
| **0** | Figer TokenLintel (commit du socle) | en cours |
| **A** | Repo consommateur + pipeline tokens (Vite + React + Tailwind, Style Dictionary v4 ; **noms de tokens = chemins**) | à lancer |
| **B** | `Button.tsx` réel, écrit **contre le contrat** (types idéalement générés depuis le contrat) | à venir |
| **C** | Garde-fous CI : `tokensUsed` ⊆ tokens générés · conformité code ↔ contrat · uniformité de nommage | à venir |
| **D** | Playground : rendu live + `CLAUDE.md` qui apprend à lire contrat/tokens/`intent` + prompts de test | à venir |
| **E** | Passage à l'échelle : 2ᵉ composant non-Button, guide de rédaction pour les designers, industrialisation | post-MVP |

**Critère de succès du MVP** : dans le playground, quoi qu'on demande, l'agent
n'utilise que les props du contrat, respecte les `@dont`, et le rendu est
cohérent avec Figma — le tout sans qu'aucun nom n'ait divergé sur tout le
trajet.
