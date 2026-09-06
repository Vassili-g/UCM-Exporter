/**
 * OÙ vit l'implémentation d'un contrat, et SI elle est là.
 * Le noyau résout un chemin et teste son existence sans lire le langage ni
 * comparer l'API ; cette mesure propre à la stack appartient à l'adaptateur.
 */
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// Le motif par défaut est une VALEUR du format, pas une décision de ce module :
// il est aussi le défaut de `ucm.config.json`, et deux constantes pour la même
// chaîne dériveraient. Il vit donc dans `@ucm-kit/core/format`, avec le reste
// de la grammaire de configuration.
import { MOTIF_IMPLEMENTATION_PAR_DEFAUT } from "@ucm-kit/core/format";

/** L'identifiant d'artefact que porte un chemin de contrat : son nom de base. */
export function identifiantDuContrat(cheminContrat) {
  return basename(cheminContrat, ".contract.json");
}

/**
 * Le chemin où l'implémentation de ce contrat est censée se trouver.
 *
 * Le motif est résolu, pas interprété : aucun glob, aucune recherche. Un
 * emplacement calculable est ce qui permet de dire « absente » sans avoir à
 * fouiller le repo, donc sans jamais confondre « pas écrite » et « pas
 * trouvée ».
 */
export function cheminImplementation(cheminContrat, motif = MOTIF_IMPLEMENTATION_PAR_DEFAUT) {
  // Ce refus a été écrit APRÈS s'être fait prendre : `contrats.map(cheminDuComposant)`
  // passe l'index de `map` en second argument, donc un motif valant `0`. La
  // panne était un `motif.replaceAll is not a function` à trois appels de
  // profondeur, dans le kit, pour une faute commise chez le consommateur. Dire
  // ce qu'on attendait et ce qu'on a reçu coûte deux lignes et rend le
  // coupable au premier coup d'œil.
  if (typeof motif !== "string") {
    throw new TypeError(
      `cheminImplementation attend un motif textuel, par exemple `
        + `"${MOTIF_IMPLEMENTATION_PAR_DEFAUT}", et a reçu ${JSON.stringify(motif)}. `
        + `Si l'appel vient d'un \`map\`, c'est l'index que vous lui passez : `
        + `enveloppez la fonction dans une lambda.`,
    );
  }
  const remplace = motif
    .replaceAll("{dir}", dirname(cheminContrat))
    .replaceAll("{id}", identifiantDuContrat(cheminContrat));
  // `join` normalise les séparateurs : le motif s'écrit avec des `/` sur toutes
  // les plateformes, et le chemin rendu est celui du système hôte.
  return join(remplace);
}

/**
 * L'implémentation de ce contrat existe-t-elle ?
 *
 * `existe` est injectable pour que la question se pose sans toucher au disque —
 * un test, ou un jour un lecteur d'archive. Le défaut reste `existsSync` : le
 * cas courant ne doit pas coûter une configuration.
 */
export function implementationPresente(
  cheminContrat,
  { motif = MOTIF_IMPLEMENTATION_PAR_DEFAUT, existe = existsSync } = {},
) {
  return Boolean(existe(cheminImplementation(cheminContrat, motif)));
}
