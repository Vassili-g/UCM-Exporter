/** Mise en forme commune des diagnostics destinés au designer. */

const ICONES = {
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  success: "✅",
};

function texteDesigner(texte) {
  return String(texte).replaceAll(" — ", ", ");
}

/** Écrit un nombre avec le bon singulier ou pluriel. */
export function libelleNombre(nombre, singulier, pluriel = `${singulier}s`) {
  return `${nombre} ${nombre === 1 ? singulier : pluriel}`;
}

function ajouterParagraphes(lignes, contenu) {
  const paragraphes = Array.isArray(contenu) ? contenu : [contenu];
  for (const paragraphe of paragraphes.filter(Boolean)) lignes.push(texteDesigner(paragraphe), "");
}

/**
 * Rend une section dans l'ordre imposé par la charte : problème, périmètre,
 * écarts, action, puis état de la fusion.
 */
export function rendreDiagnostic({
  severity,
  title,
  count,
  itemSingular,
  itemPlural,
  summary,
  items = [],
  detailsTitle = "Détails",
  details = [],
  action,
  status,
  level = 3,
}) {
  const suffixe = typeof count === "number"
    ? ` (${libelleNombre(count, itemSingular, itemPlural)})`
    : "";
  const lignes = [`${"#".repeat(level)} ${ICONES[severity]} ${texteDesigner(title)}${suffixe}`, ""];

  if (summary) ajouterParagraphes(lignes, summary);
  if (items.length > 0) lignes.push(...items.map((item) => `- ${texteDesigner(item)}`), "");

  if (details.length > 0) {
    lignes.push(`${"#".repeat(level + 1)} ${detailsTitle}`, "");
    lignes.push(...details.map((detail) => `- ${texteDesigner(detail)}`), "");
  }

  if (action) {
    lignes.push(`${"#".repeat(level + 1)} Action`, "");
    ajouterParagraphes(lignes, action);
  }

  if (status) ajouterParagraphes(lignes, status);
  return lignes;
}
