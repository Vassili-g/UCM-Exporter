/**
 * `ucm icons` : ce que ce repository doit savoir dessiner.
 *
 * Un contrat publie le `figmaName` d'une icône, et **rien d'autre** : ni kit, ni
 * correspondance, ni taille de glyphe. Traduire ce nom vers un jeu d'icônes
 * appartient au repo consommateur — c'est la décision de T3.1, qui a écarté un
 * champ `icons` de la configuration pour cette raison.
 *
 * Mais une responsabilité qu'on confie sans la rendre visible est une
 * responsabilité aveugle. Cette commande est la contrepartie de cette décision :
 * elle dit au repo ce qu'il a à couvrir, sans rien décider pour lui.
 *
 * *Elle ne juge pas, et c'est délibéré.* Qu'un nom soit ou non résolu par le
 * repo, cette commande l'ignore : elle n'a aucune idée de ce qu'est un jeu
 * d'icônes ici. Elle liste. Un jour où un `icons` existera dans la
 * configuration, elle pourra comparer — pas avant, sinon elle inventerait la
 * règle qu'elle prétend vérifier.
 */
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { trouverContrats } from "@ucm-kit/core/lecteurs";

/**
 * Les icônes réclamées par les contrats d'un repository.
 *
 * Rendues triées et dédoublonnées, avec les contrats qui les citent : le nom
 * seul ne suffit pas à agir — pour couvrir une icône ou pour discuter d'elle
 * avec un designer, il faut savoir où elle est demandée.
 */
export function iconesDuRepository(racine, dossierComponents) {
  const parNom = new Map();

  for (const chemin of trouverContrats(join(racine, dossierComponents))) {
    let contrat;
    try {
      contrat = JSON.parse(readFileSync(chemin, "utf8").replace(/^﻿/, ""));
    } catch {
      // Un contrat illisible est l'affaire de `ucm check`, pas de celle-ci.
      // Le lister ici produirait deux diagnostics du même défaut, dont un
      // dans une commande qui n'a pas mandat pour le rendre.
      continue;
    }
    const icons = contrat?.icons;
    if (icons === null || typeof icons !== "object") continue;

    for (const definition of Object.values(icons)) {
      const nom = definition?.figmaName;
      if (typeof nom !== "string" || nom === "") continue;
      const cites = parNom.get(nom) ?? new Set();
      cites.add(relative(racine, chemin).split("\\").join("/"));
      parNom.set(nom, cites);
    }
  }

  return [...parNom.entries()]
    .map(([nom, cites]) => ({ figmaName: nom, contrats: [...cites].sort() }))
    .sort((gauche, droite) => gauche.figmaName.localeCompare(droite.figmaName));
}

/** Le compte rendu terminal, qui dit aussi ce que la liste n'affirme pas. */
export function rendreIcones(icones) {
  if (icones.length === 0) {
    return "Aucune icône n'est réclamée par les contrats de ce repository.";
  }
  const lignes = icones.map(
    ({ figmaName, contrats }) => `  ${figmaName}\n      ${contrats.join("\n      ")}`,
  );
  return [
    `${icones.length} icône${icones.length === 1 ? "" : "s"} réclamée${icones.length === 1 ? "" : "s"} par les contrats :`,
    "",
    ...lignes,
    "",
    "Traduire ces noms vers un jeu d'icônes appartient à ce repository : le contrat",
    "publie le nom Figma et rien d'autre. Cette liste dit ce qu'il y a à couvrir,",
    "elle ne dit pas ce qui est couvert.",
  ].join("\n");
}
