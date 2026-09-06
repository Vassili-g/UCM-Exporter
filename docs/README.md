# La documentation d'UCM

Chaque document a un lecteur et une autorité. Cette page dit lequel lire, dans
quel ordre, et ce qu'il faut arrêter de chercher ailleurs.

## Par profil

### Vous êtes designer et vous travaillez dans Figma

1. [POUR-LES-DESIGNERS.md](./POUR-LES-DESIGNERS.md) : ce que le plugin attend
   d'un composant, comment exporter, comment relire la pull request, et le
   vocabulaire du projet.
2. [../README.md](../README.md) si vous voulez la vue d'ensemble du projet.

Vous n'avez besoin d'aucun autre document.

### Vous branchez UCM sur un repository

1. [../README.md](../README.md), section « Utilisation ».
2. [FORMAT.md](./FORMAT.md) : la forme de chaque champ d'un contrat et de
   `tokens.json`. C'est l'autorité sur ce que vous recevez.
3. [../packages/cli/README.md](../packages/cli/README.md) : les commandes, ce
   qu'`ucm init` installe, les codes de sortie.
4. [../packages/kit/README.md](../packages/kit/README.md) si vous appelez les
   lecteurs depuis votre propre code.
5. [COMPATIBILITE.md](./COMPATIBILITE.md) pour savoir ce qui peut fusionner et
   qui doit migrer lors d'un changement.
6. [CHANGELOG-FORMAT.md](./CHANGELOG-FORMAT.md) le jour où une version de
   contrat change.

### Vous modifiez le moteur ou les paquets

1. [../AGENTS.md](../AGENTS.md) : la carte du code et les invariants.
2. [../CONTRIBUTING.md](../CONTRIBUTING.md) : les règles de code, de test et de
   rédaction.
3. [FORMAT.md](./FORMAT.md) pour la forme publiée,
   [../packages/plugin/SPEC.md](../packages/plugin/SPEC.md) pour ce que le
   plugin lit dans Figma.
4. [../ROADMAP.md](../ROADMAP.md) pour la maturité et les limites connues.

### Vous êtes un agent

Commencez par [../AGENTS.md](../AGENTS.md). Il donne l'ordre de lecture, la
carte du code et les invariants, puis renvoie aux procédures de
[`.agents/skills/`](../.agents/skills/).

## Où vit quelle règle

Une même règle écrite à deux endroits finit par diverger. Une seule fait donc
autorité, et les autres y renvoient.

| Document | Ce dont il fait autorité |
|---|---|
| [../CONCEPT.md](../CONCEPT.md) | Le problème résolu, et qui possède quelle information |
| [FORMAT.md](./FORMAT.md) | La forme de ce qui est publié, et ce que l'absence d'un champ signifie |
| [../packages/plugin/SPEC.md](../packages/plugin/SPEC.md) | Ce que le plugin lit dans Figma, ce qu'il élit, ce dont il avertit |
| [COMPATIBILITE.md](./COMPATIBILITE.md) | Les classes de changement, la fenêtre de lecture et les responsabilités de migration |
| [CHANGELOG-FORMAT.md](./CHANGELOG-FORMAT.md) | Ce que chaque version du contrat a publié |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Les règles de code, de test, de message et de rédaction |
| [../AGENTS.md](../AGENTS.md) | Les invariants, avec leur borne et leur fichier autorité |
| [../ROADMAP.md](../ROADMAP.md) | L'état du projet et ses limites |
| [POUR-LES-DESIGNERS.md](./POUR-LES-DESIGNERS.md) | Le geste du designer. Il définit le vocabulaire par renvoi, jamais par une seconde définition |

## Travail en cours

Ces documents datent, racontent et citent leurs tâches. Ils ne font autorité
sur rien.

| Document | Contenu |
|---|---|
| [plans/PLAN-INDUSTRIALISATION.md](./plans/PLAN-INDUSTRIALISATION.md) | Rendre les artefacts consommables par n'importe quel repository |
| [plans/PLAN-NEUTRALISATION-PLAYGROUND.md](./plans/PLAN-NEUTRALISATION-PLAYGROUND.md) | Retirer tout outillage UCM du consommateur de recette |
| [plans/refonte-ui.md](./plans/refonte-ui.md) | La refonte de l'interface du plugin |
| [plans/PLAN-CONFORMITE-DEV.md](./plans/PLAN-CONFORMITE-DEV.md) | Recherche sur la vérification générique du rendu |
| [plans/PLAN-DOCUMENTATION.md](./plans/PLAN-DOCUMENTATION.md) | La mise à jour de cette documentation |
| [notes/PISTES-EVOLUTION.md](./notes/PISTES-EVOLUTION.md) | Les options ouvertes, non engagées |
