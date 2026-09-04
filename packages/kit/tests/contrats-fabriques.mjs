/**
 * Les contrats FABRIQUÉS que plusieurs suites partagent.
 *
 * Ils vivaient dans `validation-contrats.test.mjs`, seul consommateur jusqu'à
 * ce que le harnais de mutation de T2.1b en ait besoin lui aussi. Les recopier
 * aurait créé deux formes « courantes » qui dérivent — exactement la maladie
 * que T2.7 et T6.0 ont soignée ailleurs, et ici elle serait pire : deux
 * harnais mesureraient alors deux moteurs différents en croyant mesurer le
 * même.
 *
 * Ce ne sont PAS des instantanés du moteur. Le moteur ne fabrique que la
 * version courante ; ces objets sont écrits à la main pour atteindre des
 * champs que le corpus réel n'exerce pas — une icône, une rotation, un layer
 * hors du flux. Les comparer à une sortie du moteur rouvrirait le défaut que
 * `AGENTS.md` interdit.
 *
 * Le jeu N‑1 réel, lui, est ailleurs et figé : `fixtures/contrats/11.0/`.
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
 * Le corpus réel n'exerce qu'une partie de ces champs — un seul composant y
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
