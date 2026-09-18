/**
 * Délimite le rapport CI à la demande de fusion courante.
 *
 * Ce module répond à deux questions, et il est l'autorité unique des deux :
 * quels états informatifs cette demande peut publier, et si elle concerne UCM.
 * Les séparer ferait diverger deux définitions du même périmètre.
 *
 * La cohérence du repository reste contrôlée globalement. En revanche, un
 * contrat valide mais encore sans composant ne doit être mentionné que dans
 * la demande qui le modifie : sinon un export Button reparle indéfiniment
 * d'un Alert déjà présent dans `main`.
 */
import { NOM_CONFIGURATION } from "@ucm-kit/core/format";

import { cheminImplementation } from "./implementation.mjs";

/** Uniformise les chemins Git (`/`) et Node sous Windows (`\`). */
function normaliserChemin(chemin) {
  return chemin.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
}

/**
 * Ce que la demande de fusion touche, du point de vue d'UCM.
 *
 * Sans liste fournie, l'appel est local ou lancé sur la branche par défaut :
 * tous les bilans restent visibles et le rapport s'écrit en entier. Une liste
 * vide est au contraire une demande sans aucun fichier d'UCM, donc aucun
 * ancien état « implémentation en attente » n'y est repris.
 *
 * **Un bilan entre dans le périmètre par son contrat ou par son
 * implémentation.** Le contrat seul laissait passer la demande qui casse la
 * conformité dans le code : elle ne modifie aucun `*.contract.json`, donc
 * l'écart de parité qu'elle vient d'ouvrir disparaissait du rapport. L'adresse
 * de l'implémentation se résout par le motif de `ucm.config.json` ; aucune
 * extension n'est écrite ici, puisque le format ne connaît aucune stack.
 *
 * **Un contrat se reconnaît à son nom, jamais à sa présence sur le disque.**
 * Une demande qui supprime un contrat, ou qui dépose un premier export hors du
 * dossier déclaré, ne rencontre aucun bilan : ce sont pourtant les deux
 * demandes où le rapport doit parler, la seconde parce que lui seul nomme le
 * dossier que le contrôle a cherché.
 */
export function perimetreDeLaDemande(bilans, cheminsModifies, { motif, tokensModifies = false } = {}) {
  if (cheminsModifies === undefined) return { bilans, concerne: true };

  const modifies = new Set(
    cheminsModifies
      .split(/\r?\n/)
      .map(normaliserChemin)
      .filter(Boolean),
  );

  const retenus = bilans.filter((bilan) =>
    modifies.has(normaliserChemin(bilan.relatif))
    || modifies.has(normaliserChemin(cheminImplementation(bilan.relatif, motif))));

  const concerne = Boolean(tokensModifies)
    || modifies.has(NOM_CONFIGURATION)
    || [...modifies].some((chemin) => chemin.endsWith(".contract.json"))
    || retenus.length > 0;

  return { bilans: retenus, concerne };
}
