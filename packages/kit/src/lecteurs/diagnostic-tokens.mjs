import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";

/**
 * Avertit qu'un contrat conserve des références absentes de la source DTCG.
 *
 * `tokens.json` fait foi : un contrat plus ancien ne doit ni empêcher son
 * évolution ni imposer un alias de compatibilité. L'écart reste visible afin
 * que le designer sache quels composants réexporter, mais il n'entre pas dans
 * le verdict bloquant de `check-contract.mjs`.
 */
export function sectionTokensManquants(bilans, { tokensModifies, sourceTokens }) {
  const concernes = bilans.filter((bilan) => bilan.manquants.length > 0);
  if (concernes.length === 0) return [];

  const total = concernes.reduce((somme, bilan) => somme + bilan.manquants.length, 0);
  const details = concernes.flatMap((bilan) =>
    bilan.manquants.map((token) => `**\`${bilan.fichier}\`** : \`${token}\``));

  return rendreDiagnostic({
    severity: "warning",
    title: "Des contrats utilisent des tokens absents de la source",
    count: total,
    itemSingular: "référence",
    summary: `\`${sourceTokens}\` est la source de vérité. Les références ci-dessous n'y existent pas.`,
    detailsTitle: "Références à mettre à jour",
    details,
    action: tokensModifies
      ? "Réexportez les composants concernés pour aligner leurs contrats sur les tokens de cette pull request."
      : "Vérifiez que l'export de tokens est à jour, puis réexportez les composants concernés.",
    status: "Cet avertissement ne bloque pas la fusion.",
  });
}

export function resumeTerminalTokensManquants(bilans, sourceTokens) {
  const total = bilans.reduce((somme, bilan) => somme + bilan.manquants.length, 0);
  return total === 0
    ? null
    : `⚠ ${libelleNombre(total, "référence")} de contrat absente${total === 1 ? "" : "s"} de ${sourceTokens}. ` +
      "Réexportez les composants concernés. Ce point ne bloque pas la fusion.";
}
