---
name: rediger-diagnostics-ucm
description: Rédiger ou revoir les erreurs, avertissements et rapports CI destinés aux designers dans les projets UCM. Utiliser pour toute modification de texte visible dans le plugin ou une pull request.
---

# Rédiger un diagnostic UCM

Lire la section « Messages destinés au designer » du [`CONTRIBUTING.md` de
l’exporteur](../../../CONTRIBUTING.md) avant de modifier un message : c’est l’autorité unique sur la
forme d’un diagnostic, et ce fichier-ci n’en est qu’une procédure d’application.

Identifier d’abord le fait prouvé, les éléments concernés, la personne qui peut
corriger, l’action nécessaire et le caractère bloquant. Ne pas déduire une
cause de la simple coexistence de plusieurs diagnostics.

Trancher ensuite : le message demande-t-il un geste ? Si non, c’est une NOTE, et
elle part dans le canal `infos`, jamais dans `warnings`. Un message qui écrit
« aucune modification n’est demandée » sous un titre qui réclame une correction
se contredit devant son lecteur.

Pour un rapport agrégé, présenter dans cet ordre : problème, éléments
concernés, écarts, action, état de la fusion. Pour un avertissement unitaire,
utiliser la forme définie dans `CONTRIBUTING.md`.

Relire le résultat comme un designer. Retirer les détails internes du texte
principal et supprimer toute phrase qui n’aide pas à décider ou à agir.
