/**
 * Une palette lue contre sa recette : ses parts, ses rampes, et les parts
 * propres d'une référence presque grise ([ENT-09]).
 *
 * Chaque fonction reçoit une recette déjà validée ([REC-05]).
 */
import { lireHexa, rgb8VersOklch, type Rgb8 } from './conversions';
import { partDeChroma } from './contraste';
import { arrondir, fabriquerPalette, partsEffectives, type Parts, type Rampes } from './rampe';
import type { Palette, Recette } from './recette';

/** La couleur de référence d'une palette validée. */
export function referenceDe(palette: Palette): Rgb8 {
  const couleur = lireHexa(palette.reference);
  if (!couleur) throw new Error(`Référence illisible : ${palette.reference}. La recette n'a pas été validée.`);
  return couleur;
}

/** Les parts de chroma qu'une palette emploie. */
export function partsDe(recette: Recette, palette: Palette): Parts {
  return partsEffectives(
    { soft: recette.profils.soft.part, vivid: recette.profils.vivid.part },
    palette.parts,
  );
}

/** Les quatre rampes d'une palette. */
export function rampesDe(recette: Recette, palette: Palette): Rampes {
  return fabriquerPalette({
    reference: referenceDe(palette),
    courbes: recette.courbes,
    parts: partsDe(recette, palette),
    derives: { soft: palette.derive.soft, vivid: palette.derive.vivid },
    gamut: recette.gamut,
  });
}

/** Vrai quand la chroma de la référence est sous `seuils.chromaGrise` ([MOT-18]). */
export function estPresqueGrise(recette: Recette, palette: Palette): boolean {
  return rgb8VersOklch(referenceDe(palette)).C < recette.seuils.chromaGrise;
}

/**
 * Pose ou retire les parts d'origine `grise` ([ENT-09]). Une référence presque
 * grise reçoit des parts égales à sa part de chroma, au millième ; une
 * référence qui cesse de l'être les perd. Des parts d'origine `designer`
 * restent dans les deux cas.
 */
export function ajusterPartsGrises(recette: Recette, palette: Palette): Palette {
  if (palette.parts?.origine === 'designer') return palette;
  if (estPresqueGrise(recette, palette)) {
    const part = arrondir(partDeChroma(referenceDe(palette), recette.gamut), 3);
    return { ...palette, parts: { soft: part, vivid: part, origine: 'grise' } };
  }
  if (palette.parts?.origine === 'grise') {
    const { parts: _retirees, ...sansParts } = palette;
    return sansParts;
  }
  return palette;
}
