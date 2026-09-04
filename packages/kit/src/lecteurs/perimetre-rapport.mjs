/**
 * Délimite les états informatifs du rapport CI à la pull request courante.
 *
 * La cohérence du repository reste contrôlée globalement. En revanche, un
 * contrat valide mais encore sans composant ne doit être mentionné que dans
 * la pull request qui le modifie : sinon un export Button reparle indéfiniment
 * d'un Alert déjà présent dans `main`.
 */

/** Uniformise les chemins Git (`/`) et Node sous Windows (`\`). */
function normaliserChemin(chemin) {
  return chemin.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
}

/**
 * Sélectionne les bilans qui peuvent produire un état informatif dans la PR.
 *
 * Sans liste fournie, l'appel est local ou lancé sur `main` : tous les bilans
 * restent visibles. Une liste vide est au contraire une PR sans contrat
 * modifié, donc aucun ancien état « implémentation en attente » n'y est repris.
 */
export function selectionnerBilansDuRapport(bilans, cheminsModifies) {
  if (cheminsModifies === undefined) return bilans;

  const modifies = new Set(
    cheminsModifies
      .split(/\r?\n/)
      .map(normaliserChemin)
      .filter(Boolean),
  );

  return bilans.filter((bilan) => modifies.has(normaliserChemin(bilan.relatif)));
}
