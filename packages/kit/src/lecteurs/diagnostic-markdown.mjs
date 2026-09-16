/** Mise en forme commune des diagnostics destinés au designer. */

const ICONES = {
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  success: "✅",
};

/**
 * Formes qu'une forge relie d'elle-même dans un commentaire : `@nom` et `#1`
 * sur GitHub et GitLab ; `!1`, `~label`, `%jalon`, `$1`, `&1` et la référence
 * croisée `groupe/projet#1` sur GitLab. La référence croisée précède les formes
 * courtes, qui en captureraient la fin, et un point final n'appartient pas au
 * nom. La borne de gauche exclut l'accent grave : ce qui est déjà du code l'est.
 */
const FORMES_AUTOLIEES = new RegExp(
  "(^|[^\\w`])("
    + "[\\w.-]+(?:/[\\w.-]+)+[#!]\\d+"
    + "|@[A-Za-z0-9](?:[\\w.-]*[\\w-])?"
    + "|[#!$&]\\d+"
    + "|[~%](?:\"[^\"\\n]+\"|[A-Za-z0-9_](?:[\\w.-]*[\\w-])?)"
    + ")",
  "g",
);

/** Une ligne qui commence par `/` : GitLab l'exécute comme action rapide dans une note. */
const ACTION_RAPIDE = /^([ \t]*)(\/\S+)/gm;

/** Ce qui est déjà inerte : un segment de code, ou la cible d'un lien. */
const SEGMENTS_INERTES = /(`[^`\n]*`|\]\([^)\s]*\))/;

/**
 * Rend inertes les formes qu'une forge relierait ou exécuterait.
 *
 * Le rapport cite les intitulés Figma tels quels : `@icons` y est une règle,
 * pas un compte à notifier. Le kit ne sait pas sur quelle forge le rapport
 * sera publié, et neutralise donc les formes des deux. Un segment de code et la
 * cible d'un lien restent intacts.
 */
function sansLienAutomatique(texte) {
  return texte
    .split(SEGMENTS_INERTES)
    .map((segment, rang) => (rang % 2 === 1 ? segment : segment.replace(FORMES_AUTOLIEES, "$1`$2`")))
    .join("")
    .replace(ACTION_RAPIDE, "$1`$2`");
}

function texteDesigner(texte) {
  return sansLienAutomatique(String(texte).replaceAll(" — ", ", "));
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
