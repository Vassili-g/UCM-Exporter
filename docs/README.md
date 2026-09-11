# La documentation d'UCM

Chaque document a un lecteur et une autorité. Cette page dit lequel lire et dans
quel ordre.

## Par profil

### Vous êtes designer et vous travaillez dans Figma

1. [../packages/plugin/README.md](../packages/plugin/README.md) : où obtenir le
   plugin sur la Figma Community, et ce que chacune de ses deux commandes écrit.
2. [POUR-LES-DESIGNERS.md](./POUR-LES-DESIGNERS.md) : ce que le plugin attend
   d'un composant, comment exporter, comment relire la pull request, et le
   vocabulaire du projet.
3. [../README.md](../README.md) si vous voulez la vue d'ensemble du projet.

Vous n'avez besoin d'aucun autre document.

### Vous branchez UCM sur un repository

1. [../README.md](../README.md#brancher-un-repository) : les commandes qui
   branchent un repository, et ce qu’elles attendent de lui.
2. [FORMAT.md](./FORMAT.md) : la forme de chaque champ d'un contrat et de
   `tokens.json`. C'est l'autorité sur ce que vous recevez.
3. [FORMAT.md, « Ce que le contrat ne dit pas d'une
   icône »](./FORMAT.md#ce-que-le-contrat-ne-dit-pas-dune-icône) : la seule
   responsabilité que le contrat vous laisse entière, à trancher avant d'écrire
   le premier composant.
4. [../packages/cli/README.md](../packages/cli/README.md) : les commandes, ce
   qu'`ucm init` installe, les codes de sortie.
5. [../packages/adapter-typescript/README.md](../packages/adapter-typescript/README.md)
   si le repository est en TypeScript : c'est ce qui ajoute la parité avec le
   code et les types dérivés des contrats.
6. [../packages/kit/README.md](../packages/kit/README.md) si vous appelez les
   lecteurs depuis votre propre code.
7. [COMPATIBILITE.md](./COMPATIBILITE.md) pour savoir ce qui peut fusionner et
   qui doit migrer lors d'un changement.
8. [CHANGELOG-FORMAT.md](./CHANGELOG-FORMAT.md) le jour où une version de
   contrat ou du format de tokens change.

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

## Quel document porte quelle règle

Une même règle écrite à deux endroits finit par diverger. Une seule fait donc
autorité. Les autres y renvoient.

| Document | Ce dont il fait autorité |
|---|---|
| [../CONCEPT.md](../CONCEPT.md) | Le problème résolu, les responsabilités et le [positionnement parmi les outils de design system](../CONCEPT.md#7-ucm-parmi-les-outils-de-design-system) |
| [FORMAT.md](./FORMAT.md) | La forme de ce qui est publié, et ce que l'absence d'un champ signifie |
| [../packages/plugin/README.md](../packages/plugin/README.md) | Où obtenir le plugin, ce que ses commandes écrivent, et ce qu'il ne fait pas |
| [../packages/plugin/SPEC.md](../packages/plugin/SPEC.md) | Ce que le plugin lit dans Figma, ce qu'il élit, ce dont il avertit |
| [COMPATIBILITE.md](./COMPATIBILITE.md) | Les classes de changement, la fenêtre de lecture, les états de la version du format de tokens et les responsabilités de migration |
| [CHANGELOG-FORMAT.md](./CHANGELOG-FORMAT.md) | Ce que chaque version du contrat, et chaque version du format de tokens, a publié |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Les règles de code, de test, de message et de rédaction |
| [../AGENTS.md](../AGENTS.md) | Les invariants, avec leur borne et leur fichier autorité |
| [../ROADMAP.md](../ROADMAP.md) | L'état du projet et ses limites |
| [POUR-LES-DESIGNERS.md](./POUR-LES-DESIGNERS.md) | Le geste du designer. Il définit le vocabulaire par renvoi, jamais par une seconde définition |
| [RECETTE.md](./RECETTE.md) | Comment éprouver le produit à la main, de Figma à la pull request |

## Ce qui n'est pas décidé

Ces notes tiennent des options ouvertes. Elles ne font autorité sur rien. Aucune
partie du produit n'en dépend.

| Document | Contenu |
|---|---|
| [notes/PISTES-EVOLUTION.md](./notes/PISTES-EVOLUTION.md) | Les modules d'évolution à étudier, leurs conditions et leurs essais |
| [notes/PLAN-CONFORMITE-RENDU.md](./notes/PLAN-CONFORMITE-RENDU.md) | La piste d'une vérification générique du rendu, non engagée |
| [notes/ALIGNEMENT-DTCG.md](./notes/ALIGNEMENT-DTCG.md) | L'alignement engagé de `tokens.json` sur le module de format `2025.10` : la décision, les mesures et les limites |
| [notes/PLAN-ALIGNEMENT-DTCG.md](./notes/PLAN-ALIGNEMENT-DTCG.md) | Le protocole autonome, les preuves et les portes humaines de cet alignement |
