/** Les contrats d'un repository, lus par les commandes qui les parcourent. */
import { trouverContrats } from "@ucm-kit/core/lecteurs";

/**
 * Les chemins des contrats sous `dossier`, et `[]` quand ce dossier n'existe
 * pas : un repository neuf n'a pas de dossier de contrats avant son premier
 * export, et `npm run dev` y lance déjà `ucm tokens css`. Toute autre erreur
 * remonte, une panne ne valant pas zéro contrat.
 */
export function contratsDuDossier(dossier) {
  try {
    return trouverContrats(dossier);
  } catch (erreur) {
    if (erreur?.code === "ENOENT") return [];
    throw erreur;
  }
}
