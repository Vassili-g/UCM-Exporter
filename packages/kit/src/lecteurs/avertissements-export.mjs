/**
 * Remonte dans le rapport de CI ce que l'export a signalé.
 *
 * L'exporteur écrit ses avertissements dans `meta.diagnostics`, et le plugin les
 * publie déjà dans le corps de la pull request. Mais le rapport de CI, lui, se
 * taisait : un composant dont une propriété n'a pas pu être décrite pouvait
 * finir en « ✅ Contrats et tokens cohérents » sans que rien ne le nuance. Le
 * verdict était exact — toutes les références citées existent — et pourtant il
 * se lisait comme un feu vert sur le design, parce qu'une propriété absente du
 * contrat n'est citée par personne et n'a donc aucun écart à produire.
 *
 * Depuis la v8, `meta.diagnostics` distingue une perte portable
 * (`UCM_PORTABLE_PROJECTION_WARNING`) d'une explication
 * (`UCM_EXPORT_NOTICE`). Seule la première demande une correction Figma. La
 * 11.0 a retiré `meta.warnings`, qui n'en était que le miroir en texte brut :
 * le filtre textuel du lien Figma reste le repli des contrats historiques, et
 * un contrat 11.0 sans rien à signaler n'écrit aucun des deux champs.
 */
const AVERTISSEMENTS_STRUCTURELS = [/^Lien vers Figma absent du contrat/];

/** Vrai si l'avertissement décrit une limite que personne ne peut lever. */
function estStructurel(avertissement) {
  return AVERTISSEMENTS_STRUCTURELS.some((motif) => motif.test(avertissement));
}

/** Avertissements d'un contrat sur lesquels le designer peut agir. */
export function avertissementsCorrigeables(contrat) {
  const diagnostics = contrat?.meta?.diagnostics;
  if (Array.isArray(diagnostics)) {
    return diagnostics
      .filter((diagnostic) => (
        diagnostic?.code === "UCM_PORTABLE_PROJECTION_WARNING"
        && typeof diagnostic.message === "string"
      ))
      .map((diagnostic) => diagnostic.message);
  }
  const warnings = contrat?.meta?.warnings;
  if (!Array.isArray(warnings)) return [];
  return warnings.filter((avertissement) =>
    typeof avertissement === "string" && !estStructurel(avertissement));
}

/** Titre de la section, cité par les diagnostics qui y renvoient. */
export const TITRE_AVERTISSEMENTS = "L'export n'a pas pu décrire certaines informations";

/**
 * Section markdown listant, par contrat, ce que l'export n'a pas pu décrire.
 *
 * Rend un tableau vide quand il n'y a rien à dire : le rapport reste alors
 * exactement ce qu'il était.
 *
 * `bloquant` dit si la pull request est refusée par ailleurs. Même sur un
 * rapport rouge, ces points ne deviennent pas automatiquement la cause d'un
 * test sans lien : le texte indique comment vérifier la relation sans la
 * déduire de la seule coexistence des deux diagnostics.
 */
export function sectionAvertissementsExport(bilans, { bloquant = false } = {}) {
  const concernes = bilans.filter((bilan) => bilan.avertissements.length > 0);
  if (concernes.length === 0) return [];

  const total = concernes.reduce((somme, bilan) => somme + bilan.avertissements.length, 0);
  const details = concernes.flatMap((bilan) =>
    bilan.avertissements.map((avertissement) => `**\`${bilan.fichier}\`** : ${avertissement}`));

  return [
    "",
    ...rendreDiagnostic({
      severity: "warning",
      title: TITRE_AVERTISSEMENTS,
      count: total,
      itemSingular: "point",
      summary: bloquant
        ? "Ces avertissements ne bloquent pas la fusion à eux seuls. Vérifiez s'ils concernent le même composant et la même propriété que l'erreur bloquante."
        : "Les informations listées sont absentes des contrats, mais elles ne bloquent pas la fusion.",
      detailsTitle: "Points à corriger",
      details,
      action: "Corrigez chaque point dans Figma, puis réexportez le composant concerné.",
      status: "Ces avertissements ne bloquent pas la fusion.",
    }),
  ];
}

/** Résumé d'une ligne pour le terminal, vide s'il n'y a rien à signaler. */
export function resumeTerminalAvertissements(bilans) {
  const total = bilans.reduce((somme, bilan) => somme + bilan.avertissements.length, 0);
  return total === 0
    ? null
    : `⚠ ${libelleNombre(total, "point")} signalé${total === 1 ? "" : "s"} par l'export. ` +
      "Consultez le rapport publié.";
}
import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
