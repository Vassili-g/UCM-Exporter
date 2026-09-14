/**
 * La valeur d'une feuille dans un contexte, lue sur le document de tokens et
 * jamais sur la feuille CSS : c'est ce qui rend la comparaison probante.
 * `valeurDansLeContexte` du kit le remplace dès qu'il existe.
 *
 * Un contexte associe à chaque axe un mode ; l'axe d'extension d'un axe `a`
 * s'appelle `a-extensions` et vaut `base` par défaut.
 */
import { cheminDeReference, indexerTokensDtcg } from "@ucm-kit/core/lecteurs";

export const nomDeLAxeDExtension = (axe) => `${axe}-extensions`;

/** Les axes du document dans leur ordre, chaque axe d'extension juste après son parent. */
export function contextesDesAxes(document) {
  const axes = [];
  for (const [nom, axe] of Object.entries(document.$extensions?.["com.ucm.axes"] ?? {})) {
    axes.push({ nom, contextes: axe.modes, defaut: axe.default, extension: false });
    if (axe.extensions) {
      axes.push({
        nom: nomDeLAxeDExtension(nom),
        contextes: ["base", ...Object.keys(axe.extensions)],
        defaut: "base",
        extension: true,
      });
    }
  }
  return axes;
}

function valeurBrute(feuille, declarations, contexte) {
  const extensions = feuille.$extensions ?? {};
  const axe = extensions["com.ucm.axis"];
  if (axe === undefined) return feuille.$value;

  const declaration = declarations[axe];
  const mode = contexte.get(axe) ?? declaration.default;
  const surcharges = extensions["com.ucm.extensions"] ?? {};
  let extension = contexte.get(nomDeLAxeDExtension(axe)) ?? "base";
  while (extension !== "base") {
    const parMode = surcharges[extension];
    if (parMode && Object.hasOwn(parMode, mode)) return parMode[mode];
    extension = declaration.extensions[extension].parent;
  }
  return extensions["com.ucm.modes"][mode];
}

/** Un oracle lié à un document : `valeur(chemin, contexte)` rend le littéral final. */
export function oracle(document) {
  const index = indexerTokensDtcg(document);
  const declarations = document.$extensions?.["com.ucm.axes"] ?? {};

  return {
    chemins: [...index.keys()],
    valeur(chemin, contexte) {
      const vus = new Set();
      let courant = chemin;
      for (;;) {
        if (vus.has(courant)) throw new Error(`cycle d'alias sur ${chemin}`);
        vus.add(courant);
        const feuille = index.get(courant);
        if (!feuille) throw new Error(`alias absent : ${courant}`);
        const brute = valeurBrute(feuille, declarations, contexte);
        const cible = cheminDeReference(brute);
        if (cible === null) return brute;
        courant = cible;
      }
    },
  };
}
