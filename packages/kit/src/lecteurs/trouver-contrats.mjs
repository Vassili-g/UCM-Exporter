/**
 * Parcours partagé des contrats co-localisés (`*.contract.json`).
 *
 * Utilisé par check-contract.mjs et generate-contract-types.mjs pour garantir
 * que les deux garde-fous couvrent exactement le même périmètre : un contrat
 * vérifié est un contrat typé, et réciproquement.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Renvoie tous les chemins de `*.contract.json` sous `dossier` (récursif). */
export function trouverContrats(dossier) {
  const trouves = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === "node_modules") continue;
      trouves.push(...trouverContrats(chemin));
    } else if (entree.name.endsWith(".contract.json")) {
      trouves.push(chemin);
    }
  }
  return trouves;
}
