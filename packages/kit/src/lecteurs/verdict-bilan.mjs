/**
 * Décide si le bilan d'un contrat doit refuser la pull request.
 *
 * Ce que cette fonction rend est vrai au sens propre : le CONTRAT est
 * inexploitable, incompatible ou incohérent. Deux écarts en sont donc absents,
 * pour la même raison — ils ne disent rien du contrat et personne ne les
 * corrige en réexportant :
 *
 * - les références absentes de `tokens.json`, la source DTCG faisant foi
 *   (publiées par `diagnostic-tokens.mjs`) ;
 * - l'écart de parité contrat ↔ code, qui accuse l'implémentation et attend un
 *   développeur (publié par `check-contract.mjs`, cf. `pariteEnEcart`).
 *
 * Les deux sont des avertissements. Un verdict qui les inclurait refuserait la
 * pull request d'un designer pour l'état du repository, sous un titre qui
 * mentirait sur son contrat.
 */
/**
 * Un contrat que SEULE sa version bloque n'est pas un contrat invalide.
 *
 * C'est la moitié de T2.1b que la correction de l'ordre ne réglait pas. Le
 * verdict de version parvient désormais au rapport, mais le TITRE comptait
 * encore ce contrat parmi les invalides — or il est parfaitement formé, et
 * seule sa version le sépare de ce repository. Le titre nommait donc le
 * mauvais responsable au moment le plus visible du rapport.
 *
 * *Ce que cette fonction ne décide PAS, et T7.3 l'a appris à ses dépens :* à
 * QUI le geste appartient. Elle ne lit pas `verdict`, et ne le doit pas — un
 * contrat hors fenêtre n'est pas un contrat invalide, quel que soit le sens de
 * l'écart. C'est `phraseDuSensDeLEcart` qui tranche le responsable.
 *
 * `bilanEstBloquant` ne bouge pas : ces contrats bloquent toujours, et ils le
 * doivent. Ce qui change est ce que le titre en DIT.
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
 * La phrase d'en-tête d'un refus qui ne tient qu'à la version, et elle DÉPEND
 * DU SENS de l'écart.
 *
 * **Défaut trouvé par la recette du repo vierge (T7.3), et il est du genre le
 * plus coûteux : deux phrases vraies séparément qui se contredisent dans le
 * même rapport.** Le titre écrivait « réexporter n'y changerait rien » pour
 * TOUT contrat hors fenêtre, y compris un contrat trop ANCIEN dont la section,
 * trois lignes plus bas, demande précisément de réexporter. Le designer lisait
 * d'abord qu'il n'y pouvait rien, puis qu'il devait agir.
 *
 * La cause est identifiable : `seuleLaVersionBloque` répond « oui » sans
 * regarder `verdict`, et le commentaire de T2.1b qui justifiait la phrase — «
 * aucun réexport ne le rendra lisible » — n'était vrai que du sens `recent`.
 * Aucun test ne l'a vu parce que tous fabriquaient une version FUTURE (99.0) :
 * le sens `ancien` n'était éprouvé qu'au niveau de la section, jamais du titre.
 *
 * Les deux sens ont deux responsables, et c'est tout l'objet du critère de
 * réussite n° 4 — le message doit dire QUI corrige :
 * - `recent` : le contrat vient d'un plugin en avance sur ce repository. Le
 *   geste appartient à un développeur, et réexporter ne ferait rien.
 * - `ancien` : le contrat vient d'un plugin en retard, ou sa version est
 *   illisible. Le geste appartient au designer, et c'est un réexport.
 * - les deux à la fois : aucune phrase unique n'est vraie, donc on n'en écrit
 *   aucune et on renvoie au détail, qui nomme le geste contrat par contrat.
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

  // Le titre « version non lue » ne s'écrit que si TOUS les contrats bloquants
  // le sont pour cette seule raison. Dès qu'un contrat est réellement cassé, le
  // rapport doit le dire en premier : c'est le seul des deux qu'un réexport
  // corrige, donc le seul qui appelle un geste immédiat.
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

export function bilanEstBloquant(bilan) {
  return bilan.illisible
    || bilan.champsAbsents.length > 0
    || Boolean(bilan.version)
    || bilan.graphe.length > 0
    || bilan.nonListes.length + bilan.fantomes.length > 0
    || bilan.typesTypographiques.length > 0;
}
