/**
 * Liste les icônes réclamées par les contrats, sans choisir de bibliothèque ni
 * juger leur couverture : cette correspondance appartient au consommateur.
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
