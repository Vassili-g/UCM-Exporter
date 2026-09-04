/**
 * Vérifie que les variables reliées aux text styles ont une unité compatible
 * avec leur propriété CSS. Le contrat connaît les références ; ce module lit
 * le type DTCG réel, sans deviner à partir du nom du token.
 *
 * Ce qu'est une feuille DTCG, et comment un chemin s'extrait d'une référence,
 * se lisent dans `tokens-dtcg.mjs` : une seule définition, pour que le contrôle
 * de type et le contrôle d'existence ne puissent pas juger deux arbres
 * différents à partir du même fichier.
 */

import {
  indexerTokensDtcg,
  cheminDeReference,
} from "./tokens-dtcg.mjs";

const TYPES_TYPOGRAPHIQUES = {
  fontFamily: ["string"],
  fontSize: ["dimension"],
  // Figma publie les variables FONT_WEIGHT comme STRING ("Regular", "Bold"),
  // puis Style Dictionary les traduit en valeur CSS numérique. Une valeur DTCG
  // numérique reste également valide pour les sources qui la publient ainsi.
  fontWeight: ["number", "string"],
  lineHeight: ["dimension"],
  letterSpacing: ["dimension"],
};

function estObjet(valeur) {
  return Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
}

/** Résout uniquement le TYPE d'une chaîne d'alias, jamais sa valeur. */
function feuilleRacine(reference, index) {
  let chemin = cheminDeReference(reference);
  const vus = new Set();
  while (chemin && !vus.has(chemin)) {
    vus.add(chemin);
    const feuille = index.get(chemin);
    if (!feuille) return null;
    const cible = cheminDeReference(feuille.$value);
    if (!cible) return feuille;
    chemin = cible;
  }
  return null;
}

/**
 * Renvoie les incohérences entre les champs réellement déclarés d'un text
 * style 4.6 et les types DTCG de leurs références.
 */
export function erreursTypesTypographiques(contrat, tokens) {
  const index = indexerTokensDtcg(tokens);
  const erreurs = [];
  const styles = estObjet(contrat?.textStyles) ? contrat.textStyles : {};

  for (const [style, definition] of Object.entries(styles)) {
    const champs = estObjet(definition?.tokens) ? definition.tokens : {};
    for (const [champ, attendus] of Object.entries(TYPES_TYPOGRAPHIQUES)) {
      const reference = champs[champ];
      if (reference === undefined) continue;
      const feuille = feuilleRacine(reference, index);
      if (!feuille || attendus.includes(feuille.$type)) continue;
      erreurs.push({
        chemin: `textStyles.${style}.tokens.${champ}`,
        reference,
        attendu: attendus.join(" ou "),
        recu: feuille.$type,
      });
    }
  }
  return erreurs;
}
