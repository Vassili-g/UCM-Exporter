/**
 * OUVRIR `ucm.config.json` sur un disque, et rien de plus.
 *
 * **La grammaire n'est plus ici, et c'est T4.1 qui l'a déplacée.** Ce que ce
 * fichier CONTIENT, ce qui y est refusé et ce qu'un repo vierge décrit sans
 * rien écrire vivent dans `@ucm-kit/core/format` — le seul sous-chemin que le
 * plugin Figma atteint, lui qui doit savoir où ÉCRIRE et lit ce fichier par
 * l'API GitHub, sans `node:fs`.
 *
 * Tant que la grammaire vivait du seul côté Node, le plugin en gardait sa
 * propre idée — `src/components` et `src/tokens` en dur — et les deux ne
 * coïncidaient que par accident. Il ne reste ici que ce qui touche un disque.
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
