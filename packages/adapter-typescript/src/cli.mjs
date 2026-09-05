#!/usr/bin/env node
/** Point d'entrée du générateur de types UCM. */
import { genererTypes, rendreGeneration } from "./generation.mjs";

function lireArguments(arguments_) {
  if (arguments_.length === 0) return { dossierSortie: "src/generated/contracts" };
  if (arguments_.length === 2 && arguments_[0] === "--out" && arguments_[1]) {
    return { dossierSortie: arguments_[1] };
  }
  return null;
}

const options = lireArguments(process.argv.slice(2));
if (!options) {
  console.error("Usage : ucm-typescript [--out <dossier>]");
  process.exit(2);
}

try {
  const texte = rendreGeneration(genererTypes(process.cwd(), options));
  if (texte) console.log(texte);
} catch (erreur) {
  console.error(`✗ ${erreur?.message ?? erreur}`);
  process.exit(2);
}
