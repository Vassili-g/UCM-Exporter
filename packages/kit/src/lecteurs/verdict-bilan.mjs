/**
 * Vrai si seule la version bloque. Les tokens absents et la parité avertissent
 * sans bloquer, car ils accusent le dépôt ou le code, pas le contrat exporté.
 */
function seuleLaVersionBloque(bilan) {
  return Boolean(bilan?.version)
    && !bilan.illisible
    && (bilan.champsAbsents?.length ?? 0) === 0
    && (bilan.graphe?.length ?? 0) === 0
    && (bilan.nonListes?.length ?? 0) + (bilan.fantomes?.length ?? 0) === 0
    && (bilan.typesTypographiques?.length ?? 0) === 0;
}

/**
 * Forme l'en-tête d'un refus dû uniquement à la version. Un contrat récent
 * demande une mise à jour du repo ; un ancien demande un réexport. Si les deux
 * sens coexistent, aucun résumé unique n'est écrit et le détail fait foi.
 */
function phraseDuSensDeLEcart(bilans, pluriel) {
  const sujet = pluriel
    ? "Ces contrats sont bien formés. "
    : "Ce contrat est bien formé. ";
  const sens = new Set(bilans.map((bilan) => bilan.version?.verdict ?? "ancien"));

  if (sens.size > 1) {
    return sujet
      + "Ils ne viennent pas tous de la même version : le détail ci-dessous nomme "
      + "le geste attendu pour chacun.";
  }
  return sens.has("recent")
    ? sujet + "C'est le repository qui doit rattraper le format ; réexporter n'y changerait rien."
    : sujet
      + (pluriel
        ? "Ils viennent d'une version que ce repository ne lit plus : réexportez-les depuis Figma."
        : "Il vient d'une version que ce repository ne lit plus : réexportez-le depuis Figma.");
}

/**
 * Écrit l'en-tête du rapport rouge, et rien d'autre que ce qui est vrai.
 *
 * « N contrats invalides » accuse un fichier produit par l'export, donc le
 * designer qui l'a produit : ce titre ne s'écrit que si un contrat l'est
 * réellement, au sens de `bilanEstBloquant`, et il annonce alors le compte
 * exact plutôt qu'un « des contrats » suivi d'un « (1 contrat) » qui le
 * dément. Dès qu'aucun contrat n'est en
 * cause, le rapport bascule sur un titre qui nomme le repository — même quand
 * une pull request est refusée par ailleurs. Un rapport peut ainsi refuser une
 * fusion sans jamais désigner le mauvais coupable.
 *
 * `fautifs` accepte les bilans eux-mêmes, et plus seulement leur nombre : c'est
 * ce qui permet de distinguer un contrat cassé d'un contrat que seule sa
 * version rend illisible ici. Un nombre reste accepté — les tests qui ne
 * s'intéressent qu'au compte n'ont pas à monter un bilan complet.
 */
export function enteteDuVerdict(fautifs, avecAvertissements = false) {
  const bilans = Array.isArray(fautifs) ? fautifs : [];
  const contratsFautifs = Array.isArray(fautifs) ? fautifs.length : fautifs;
  const versionsSeules = bilans.filter(seuleLaVersionBloque).length;

  if (contratsFautifs > 0 && versionsSeules === contratsFautifs) {
    const pluriel = versionsSeules === 1 ? "" : "s";
    return [
      `## ❌ ${versionsSeules} contrat${pluriel} dans une version que ce repository ne lit pas`,
      "",
      // Le TITRE est vrai dans les deux sens de l'écart — la version n'est pas
      // lue, c'est tout ce qu'il dit. La phrase qui suit, elle, désigne un
      // responsable : elle se calcule.
      phraseDuSensDeLEcart(bilans.filter(seuleLaVersionBloque), pluriel === "s"),
      "",
    ];
  }
  if (contratsFautifs > 0) {
    const pluriel = contratsFautifs === 1 ? "" : "s";
    return [
      `## ❌ ${contratsFautifs} contrat${pluriel} invalide${pluriel}`,
      "",
      "Les contrôles ont détecté des contrats inexploitables, incompatibles ou incohérents.",
      "",
    ];
  }
  return [
    "## ❌ Les contrôles du repository bloquent la fusion",
    "",
    avecAvertissements
      ? "Les contrats sont valides. Les avertissements d'export sont présentés séparément et ne bloquent pas à eux seuls."
      : "Les contrats sont valides. Les sections suivantes indiquent les contrôles en échec.",
    "",
  ];
}

/** Centralise les états d'un bilan qui refusent la fusion. */
export function bilanEstBloquant(bilan) {
  return bilan.illisible
    || bilan.champsAbsents.length > 0
    || Boolean(bilan.version)
    || bilan.graphe.length > 0
    || bilan.nonListes.length + bilan.fantomes.length > 0
    || bilan.typesTypographiques.length > 0;
}
