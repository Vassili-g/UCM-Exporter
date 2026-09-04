/**
 * Compatibilité entre la version de schéma d'un contrat et celle que ce repo
 * sait consommer.
 *
 * Un écart de version a DEUX sens opposés, et les confondre envoie le lecteur
 * dans le mur : un contrat trop ancien tait des informations dont le code
 * dépend, et un ré-export le corrige ; un contrat trop récent vient d'un
 * plugin en avance sur ce repo, et aucun ré-export n'y changera rien — c'est
 * le repo qui doit rattraper. Le verdict distingue donc les deux.
 */

/**
 * Version de schéma que ce repository sait lire.
 *
 * Les deux bornes existent parce que `verdictDeVersion` distingue les deux
 * sens de l'écart, pas parce qu'une plage serait ouverte : elles sont égales,
 * et ce repository lit exactement UN schéma. Toute autre version est refusée,
 * majeure comme mineure — l'historique a prouvé qu'une mineure pouvait
 * renommer un champ lu.
 *
 * Les changer est un geste à part, et dans cet ordre : adapter les lecteurs,
 * réexporter les contrats, vérifier que les tests de rendu passent, PUIS
 * toucher ces constantes. Ce qui prouve l'adaptation est la suite de tests,
 * jamais une note écrite à côté du changement. La forme actuellement lue vit
 * dans `CONTRAT-CONSOMME.md`.
 */
export const VERSION_CONTRAT_MINIMALE = "12.0";
export const VERSION_CONTRAT_MAXIMALE = "12.0";

/** Parse strictement une version de schéma `majeure.mineure`. */
function lireVersion(version) {
  const resultat = /^(\d+)\.(\d+)$/.exec(String(version));
  return resultat ? [Number(resultat[1]), Number(resultat[2])] : null;
}

/** Compare deux couples `[majeure, mineure]`. */
function comparerVersions(gauche, droite) {
  return gauche[0] - droite[0] || gauche[1] - droite[1];
}

/**
 * Verdict sur une version de contrat : `ok`, `ancien` ou `recent`.
 *
 * Une version hors de la plage explicitement supportée est refusée, même si
 * seule sa mineure diffère. Une version illisible est traitée comme ancienne :
 * c'est le seul cas qu'un ré-export peut effectivement corriger.
 *
 * @example verdictDeVersion('4.2') // → 'ok'
 * @example verdictDeVersion('4.1') // → 'ancien'
 * @example verdictDeVersion('4.10') // → 'recent'
 */
export function verdictDeVersion(
  version,
  {
    minimum = VERSION_CONTRAT_MINIMALE,
    maximum = VERSION_CONTRAT_MAXIMALE,
  } = {},
) {
  const courante = lireVersion(version);
  const borneMinimale = lireVersion(minimum);
  const borneMaximale = lireVersion(maximum);

  if (!courante) return "ancien";
  if (!borneMinimale || !borneMaximale || comparerVersions(borneMinimale, borneMaximale) > 0) {
    throw new Error(`Plage de versions de contrat invalide : ${minimum} → ${maximum}.`);
  }
  if (comparerVersions(courante, borneMinimale) < 0) return "ancien";
  if (comparerVersions(courante, borneMaximale) > 0) return "recent";
  return "ok";
}
