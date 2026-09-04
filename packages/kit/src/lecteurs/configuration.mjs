/**
 * `ucm.config.json` : ce qu'un repository dit de LUI-MÊME.
 *
 * C'est la deuxième des trois règles de tri du plan — « ce qui décrit le REPO
 * reste dans le repo, en configuration ». Trois chemins, et rien d'autre : où
 * vivent les contrats, où vit le fichier de tokens, où vit l'implémentation
 * d'un contrat. Le LECTEUR, lui, est du moteur : il vit ici.
 *
 * **Aucun numéro de version ne s'écrit dans ce fichier, et c'est une règle, pas
 * un oubli.** La fenêtre de versions lues appartient au kit installé (D7, D8) :
 * la republier dans le repo créerait une seconde autorité, qui dériverait au
 * premier `npm update` — et le désaccord serait muet, chacun des deux se
 * croyant le bon. Un repo dit OÙ sont ses fichiers ; il ne dit pas ce que le
 * format est.
 *
 * **Le fichier est facultatif.** Un repo neuf avec un seul dossier
 * `components/` doit fonctionner sans écrire une ligne — c'est le critère de
 * réussite n° 1. L'absence de configuration n'est donc pas une erreur : c'est
 * le cas nominal, et les valeurs par défaut décrivent exactement ce repo-là.
 * Ce qui est une erreur, c'est un fichier PRÉSENT et mal formé : là, quelqu'un
 * a voulu dire quelque chose, et le taire en retombant sur les défauts ferait
 * chercher un contrat là où il n'est pas, sans rien signaler.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { MOTIF_IMPLEMENTATION_PAR_DEFAUT } from "./implementation.mjs";

/** Le nom du fichier, écrit une fois. */
export const NOM_CONFIGURATION = "ucm.config.json";

/**
 * Ce qu'un repository vierge décrit sans rien écrire.
 *
 * `components` à la racine et non `src/components` : le critère de réussite
 * décrit « un repo GitHub neuf, un dossier `components/`, rien d'autre ». Un
 * repo qui range autrement le dit, et c'est précisément à quoi sert ce fichier.
 */
export const CONFIGURATION_PAR_DEFAUT = Object.freeze({
  components: "components",
  tokens: "tokens.json",
  implementation: MOTIF_IMPLEMENTATION_PAR_DEFAUT,
});

const estTexteNonVide = (valeur) => typeof valeur === "string" && valeur.trim() !== "";

/**
 * Les champs absents ou mal formés d'une configuration.
 *
 * Même forme de réponse que `champsInvalidesDuContrat` — une liste de chemins,
 * vide quand tout va bien — pour que l'appelant traite les deux refus de la
 * même façon. Un champ ABSENT n'est pas invalide : il prend son défaut. Seul
 * un champ écrit et inutilisable l'est.
 */
export function champsInvalidesDeLaConfiguration(configuration) {
  if (configuration === null || typeof configuration !== "object" || Array.isArray(configuration)) {
    return ["ucm.config.json"];
  }
  const invalides = [];
  for (const cle of Object.keys(CONFIGURATION_PAR_DEFAUT)) {
    if (Object.hasOwn(configuration, cle) && !estTexteNonVide(configuration[cle])) {
      invalides.push(cle);
    }
  }
  // Un numéro de version écrit ici est refusé, pas ignoré. L'ignorer laisserait
  // croire qu'il compte : quelqu'un le mettrait à jour en pensant déplacer la
  // fenêtre de lecture, et rien ne bougerait — un geste sans effet est pire
  // qu'un geste refusé.
  for (const cle of ["contractVersion", "version", "schemaVersion"]) {
    if (Object.hasOwn(configuration, cle)) invalides.push(cle);
  }
  return invalides.sort();
}

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

  const invalides = champsInvalidesDeLaConfiguration(brut);
  if (invalides.length > 0) {
    return {
      configuration: { ...CONFIGURATION_PAR_DEFAUT },
      chemin,
      erreur: `${NOM_CONFIGURATION} : ${invalides.join(", ")}. `
        + `Chaque champ est un chemin non vide, et aucun numéro de version ne s'y écrit — `
        + `la fenêtre de versions lues appartient au paquet installé.`,
    };
  }

  const configuration = { ...CONFIGURATION_PAR_DEFAUT };
  for (const cle of Object.keys(CONFIGURATION_PAR_DEFAUT)) {
    if (Object.hasOwn(brut, cle)) configuration[cle] = brut[cle];
  }
  return { configuration, chemin, erreur: null };
}
