/**
 * Forme d'une référence de token, et relevé des références d'un contrat.
 *
 * Un seul module définit ce qu'est une référence, pour la même raison que
 * l'exporteur n'a qu'un `normalizeName()` : deux définitions finiraient par
 * diverger, et un contrôle accepterait ce qu'un autre refuse.
 */

/**
 * Référence complète : la chaîne ENTIÈRE est entre accolades et porte au moins
 * un point séparateur, sans espace ni accolade interne. C'est ce qui distingue
 * `{components.button.sizes.medium.gap}` d'une phrase écrite par le designer
 * dans `intent` ou d'une note comme `{à définir}`.
 */
export const REFERENCE = /^\{[^{}\s]+\.[^{}\s]+\}$/;

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
    if (REFERENCE.test(valeur)) trouvees.add(valeur);
  } else if (Array.isArray(valeur)) {
    for (const item of valeur) collecterReferences(item, trouvees);
  } else if (valeur && typeof valeur === "object") {
    for (const item of Object.values(valeur)) collecterReferences(item, trouvees);
  }
  return trouvees;
}
