/**
 * Les contrats fabriqués que plusieurs suites partagent.
 */

export function contratCourant() {
  return {
    name: "X",
    meta: {
      contractVersion: "11.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      figma: { fileName: "f", nodeId: "1:1" },
      coverage: { portable: "complete" },
    },
    viewStructures: {
      st1: { layout: "flex-row", sizing: { width: "fit-content", height: "fit-content" } },
    },
    variantViews: { v1: { structure: "st1" } },
    variants: [{ nodeId: "1:2", figmaName: "Default", values: {}, tokens: {}, view: "v1" }],
    structure: { view: "st1" },
    rendering: { roles: {} },
  };
}

/**
 * Contrat 12.0 minimal : la forme courante, plus ce que la 12.0 ajoute.
 *
 * Le corpus réel n'exerce qu'une partie de ces champs : un seul composant y
 * porte une icône, aucun n'y porte de rotation. Les monter ici est donc la
 * seule façon d'atteindre les contrôles avant qu'un designer ne les atteigne.
 */
export function contrat120() {
  const valeur = contratCourant();
  valeur.meta.contractVersion = "12.0";
  valeur.viewStructures.st1.children = [
    { slot: "label" },
    { slot: "badge", position: "absolute", constraints: { horizontal: "left", vertical: "top" },
      inset: { top: "4px", left: "8px" }, rotation: "45deg",
      children: [{ slot: "icon" }] },
  ];
  valeur.rendering.roles = { background: { kind: "paint" }, foreground: { kind: "paint" } };
  valeur.rendering.keyRoles = { fills: { "base.surface": "background" } };
  return valeur;
}
