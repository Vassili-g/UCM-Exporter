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
  // Le producteur publie une famille en `fontFamily` dès qu'une preuve
  // l'établit dans le fichier Figma, et en `string` sinon. Les deux sont
  // acceptés quelle que soit la version : ce contrôle bloque la fusion dans la
  // CI du consommateur, et une variable STRING sans liaison locale ni scope
  // précis est une configuration Figma légitime, dont le CSS reste juste. Une
  // régression du producteur se constate chez lui, par un test qui exige
  // qu'une famille prouvée sorte en `fontFamily`.
  fontFamily: ["fontFamily", "string"],
  fontSize: ["dimension"],
  // Figma publie les variables FONT_WEIGHT comme STRING ("Regular", "Bold"),
  // puis Style Dictionary les traduit en valeur CSS numérique. Une valeur DTCG
  // numérique reste également valide pour les sources qui la publient ainsi.
  fontWeight: ["number", "string"],
  lineHeight: ["dimension"],
  letterSpacing: ["dimension"],
  paragraphSpacing: ["dimension"],
  paragraphIndent: ["dimension"],
};

function estObjet(valeur) {
  return Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
}

/** Le premier mode d'une feuille qui cite une feuille d'un autre type, ou `null`. */
function ecartDeMode(chemin, feuille, index) {
  const modes = feuille.$extensions?.["com.ucm.modes"];
  if (!estObjet(modes)) return null;
  for (const [mode, valeur] of Object.entries(modes)) {
    const cible = index.get(cheminDeReference(valeur));
    if (cible && cible.$type !== feuille.$type) {
      return { feuille: chemin, mode, attendu: feuille.$type, recu: cible.$type };
    }
  }
  return null;
}

/**
 * Résout le type d'une chaîne d'alias, jamais sa valeur.
 *
 * La chaîne suit `$value`, donc le mode par défaut. Ce parcours n'est exact que
 * si chaque feuille traversée cite, dans tous ses modes, des feuilles de son
 * propre type : la première qui s'en écarte est rendue dans `ecart`.
 */
function parcourirChaine(reference, index) {
  let chemin = cheminDeReference(reference);
  const vus = new Set();
  while (chemin && !vus.has(chemin)) {
    vus.add(chemin);
    const feuille = index.get(chemin);
    if (!feuille) return { racine: null, ecart: null };
    const ecart = ecartDeMode(chemin, feuille, index);
    if (ecart) return { racine: feuille, ecart };
    const cible = cheminDeReference(feuille.$value);
    if (!cible) return { racine: feuille, ecart: null };
    chemin = cible;
  }
  return { racine: null, ecart: null };
}

/**
 * Renvoie les incohérences entre les champs réellement déclarés d'un text
 * style 4.6 et les types DTCG de leurs références. Une incohérence qui vient
 * d'un mode porte en plus `feuille` et `mode`.
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
      const chemin = `textStyles.${style}.tokens.${champ}`;
      const { racine, ecart } = parcourirChaine(reference, index);
      if (ecart) {
        erreurs.push({ chemin, reference, ...ecart });
        continue;
      }
      if (!racine || attendus.includes(racine.$type)) continue;
      erreurs.push({
        chemin,
        reference,
        attendu: attendus.join(" ou "),
        recu: racine.$type,
      });
    }
  }
  return erreurs;
}
