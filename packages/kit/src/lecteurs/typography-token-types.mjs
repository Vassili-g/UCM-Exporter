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

/**
 * Chaque valeur contextuelle d'une feuille : ses modes, puis les surcharges de
 * chaque extension, sous `{ mode, extension?, valeur }`.
 */
function valeursContextuelles(feuille) {
  const valeurs = [];
  const modes = feuille.$extensions?.["com.ucm.modes"];
  for (const [mode, valeur] of Object.entries(estObjet(modes) ? modes : {})) valeurs.push({ mode, valeur });
  const surcharges = feuille.$extensions?.["com.ucm.extensions"];
  for (const [extension, parMode] of Object.entries(estObjet(surcharges) ? surcharges : {})) {
    for (const [mode, valeur] of Object.entries(estObjet(parMode) ? parMode : {})) valeurs.push({ mode, extension, valeur });
  }
  return valeurs;
}

/** Le premier mode ou la première surcharge d'une feuille qui cite une feuille d'un autre type, ou `null`. */
function ecartDeMode(chemin, feuille, index) {
  for (const { mode, extension, valeur } of valeursContextuelles(feuille)) {
    const cible = index.get(cheminDeReference(valeur));
    if (cible && cible.$type !== feuille.$type) {
      return {
        feuille: chemin,
        mode,
        ...(extension === undefined ? {} : { extension }),
        attendu: feuille.$type,
        recu: cible.$type,
      };
    }
  }
  return null;
}

/** La feuille où finit la chaîne de `$value` partie de `chemin`, ou `null` sur une cible absente ou une boucle. */
function racineDeLaChaine(chemin, index) {
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
 * Résout le type d'une référence, jamais sa valeur.
 *
 * `racine` finit la chaîne de `$value`, donc du mode par défaut. Son type ne
 * vaut dans tous les contextes que si chaque feuille atteignable par `$value`,
 * un mode ou une surcharge cite des feuilles de son propre type. La première
 * qui s'en écarte, dans l'ordre d'un parcours en largeur, est rendue dans
 * `ecart`.
 */
function parcourirChaine(reference, index) {
  const depart = cheminDeReference(reference);
  const file = depart ? [depart] : [];
  const vus = new Set(file);
  for (let rang = 0; rang < file.length; rang += 1) {
    const feuille = index.get(file[rang]);
    if (!feuille) continue;
    const ecart = ecartDeMode(file[rang], feuille, index);
    if (ecart) return { racine: feuille, ecart };
    const valeurs = [feuille.$value, ...valeursContextuelles(feuille).map(({ valeur }) => valeur)];
    for (const cible of valeurs.map(cheminDeReference)) {
      if (!cible || vus.has(cible)) continue;
      vus.add(cible);
      file.push(cible);
    }
  }
  return { racine: racineDeLaChaine(depart, index), ecart: null };
}

/**
 * Renvoie les incohérences entre les champs réellement déclarés d'un text
 * style 4.6 et les types DTCG de leurs références. Une incohérence qui vient
 * d'un mode porte en plus `feuille` et `mode`, et `extension` quand elle vient
 * d'une surcharge.
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
