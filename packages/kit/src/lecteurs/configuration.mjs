/**
 * Ouvre `ucm.config.json` sur disque. Sa grammaire et ses défauts vivent dans
 * `@ucm-kit/core/format`, également accessible au plugin sans `node:fs`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CONFIGURATION_PAR_DEFAUT, NOM_CONFIGURATION, configurationDepuisJson } from "@ucm-kit/core/format";

/**
 * Lit la configuration d'un repository, et rend toujours une configuration
 * complète.
 *
 * `erreur` porte ce qui n'a pas pu être lu : fichier illisible, JSON cassé,
 * champs invalides. L'appelant décide s'il refuse — ce module ne lève pas, pour
 * la même raison que le validateur de contrats ne lève pas : un garde-fou doit
 * diagnostiquer là où il serait tentant d'exploser.
 */
export function lireConfiguration(racine) {
  const chemin = join(racine, NOM_CONFIGURATION);
  if (!existsSync(chemin)) {
    return { configuration: { ...CONFIGURATION_PAR_DEFAUT }, chemin: null, erreur: null };
  }

  let brut;
  try {
    // Un BOM en tête ferait échouer JSON.parse, et l'éditeur qui l'a écrit ne
    // le montre pas : le retirer évite un refus que personne ne saurait lire.
    brut = JSON.parse(readFileSync(chemin, "utf8").replace(/^﻿/, ""));
  } catch {
    return {
      configuration: { ...CONFIGURATION_PAR_DEFAUT },
      chemin,
      erreur: `${NOM_CONFIGURATION} est illisible : ce n'est pas du JSON valide.`,
    };
  }

  const { configuration, erreur } = configurationDepuisJson(brut);
  return { configuration, chemin, erreur };
}
