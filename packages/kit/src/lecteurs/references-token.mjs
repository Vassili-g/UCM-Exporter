/**
 * Relevé des références de token que porte un contrat.
 *
 * Ce module DÉFINISSAIT aussi ce qu'est une référence, et son en-tête affirmait
 * qu'un seul module le faisait. C'était faux : trois autres copies de la même
 * regex vivaient ailleurs. La définition est passée dans
 * `@ucm-kit/core/format`, le seul sous-chemin que le bundle du plugin, Node et
 * un navigateur atteignent tous les trois. Ce module ne garde que ce qu'il est
 * seul à savoir faire : ce qui, DANS UN CONTRAT, se relève.
 */
import { isTokenReference } from "@ucm-kit/core/format";

/**
 * Ramasse toute référence présente dans une valeur, à profondeur quelconque.
 * Aucune connaissance du schéma du contrat n'est nécessaire : un champ ajouté
 * plus tard est couvert sans toucher à ce module.
 */
/**
 * Le contrat privé de ce qui n'est pas normatif.
 *
 * `collecterReferences` ne connaît volontairement aucun schéma : elle ramasse
 * toute chaîne en forme de référence, à profondeur quelconque. C'est ce qui la
 * rend robuste aux champs ajoutés plus tard — sauf pour celui-ci, qui porte du
 * TEXTE écrit par un designer. « Montant : {montant.total} » dans une maquette
 * n'est pas une référence de token, et la traiter comme telle enverrait au
 * designer un diagnostic sur une variable que personne n'a jamais voulu créer.
 *
 * L'exclusion vit ici, avec la définition d'une référence, plutôt qu'à chacun
 * des deux appels : deux `delete` finiraient par diverger, et l'un des deux
 * contrôles accepterait ce que l'autre refuse.
 */
export function sansEchantillon(contrat) {
  if (!contrat || typeof contrat !== "object") return contrat;
  const { samples: _echantillons, meta: _meta, ...corps } = contrat;
  return corps;
}

export function collecterReferences(valeur, trouvees = new Set()) {
  if (typeof valeur === "string") {
    if (isTokenReference(valeur)) trouvees.add(valeur);
  } else if (Array.isArray(valeur)) {
    for (const item of valeur) collecterReferences(item, trouvees);
  } else if (valeur && typeof valeur === "object") {
    for (const item of Object.values(valeur)) collecterReferences(item, trouvees);
  }
  return trouvees;
}
