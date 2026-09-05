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
 * Versions de schéma qu'un consommateur du kit sait lire : la COURANTE et la
 * PRÉCÉDENTE.
 *
 * **Pourquoi deux, et pourquoi ça se décide plutôt que ça se subit.** Avec une
 * seule version, il n'existe aucun recouvrement : à l'instant où le kit monte,
 * tout contrat déjà fusionné devient « trop ancien » et chaque pull request du
 * consommateur passe au rouge jusqu'au réexport. La fenêtre est le temps qu'on
 * laisse au designer pour réexporter sans que son dépôt soit rouge entre-temps.
 *
 * **Le prix a été mesuré, pas supposé (T7.6).** Il était écrit qu'un validateur
 * lisant réellement le N‑1 serait le coût de cette fenêtre. Exercé sur les
 * quatre contrats 11.0 figés — leur seul emploi restant — :
 * `champsInvalidesDuContrat` rend zéro champ invalide sur chacun,
 * `validerGrapheDesContrats` ne signale rien, `validerAdressesDEchantillons`
 * ne trouve aucune adresse en défaut, et `vueExacteDuVariant` résout les 104
 * variants. La raison tient en une phrase : la 12.0 n'a fait qu'AJOUTER des
 * champs optionnels — `inset`, `rotation`, `keyRoles` —, et sa règle de
 * résolution des rôles retombe sur la clé quand `keyRoles` est absent, ce qui
 * est exactement l'état d'un contrat 11.0.
 *
 * **Ce que la fenêtre n'est PAS : un état par défaut.** Elle décrit la version
 * précédente RÉELLE, et elle se referme d'un cran à chaque montée. Une borne
 * basse qu'on laisserait vieillir ferait rentrer en silence un schéma que plus
 * personne n'adapte — c'est le sens qu'avait la fermeture précédente, et il ne
 * change pas. Hors de la fenêtre, tout est refusé, majeure comme mineure :
 * l'historique a prouvé qu'une mineure pouvait renommer un champ lu.
 *
 * Les changer est un geste à part, et dans cet ordre : adapter les lecteurs,
 * réexporter les contrats, vérifier que les tests de rendu passent, PUIS
 * toucher ces constantes. Ce qui prouve l'adaptation est la suite de tests,
 * jamais une note écrite à côté du changement. La forme courante est décrite
 * par `docs/FORMAT.md` ; ce que chaque version publie, et ce que la suivante
 * casse, par `docs/CHANGELOG-FORMAT.md`.
 */
export const VERSION_CONTRAT_MINIMALE = "11.0";
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
