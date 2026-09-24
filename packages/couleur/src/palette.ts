/**
 * Une palette lue contre sa recette : ses parts, l'ancrage de sa référence,
 * ses rampes, et les parts propres d'une référence presque grise ([ENT-09]).
 *
 * Chaque fonction reçoit une recette déjà validée ([REC-05]).
 */
import { ecrireHexa, lireHexa, rgb8VersOklch, type Rgb8 } from './conversions';
import { partDeChroma } from './contraste';
import {
  arrondir,
  fabriquerPalette,
  partsEffectives,
  type Cran,
  type Mode,
  type Parts,
  type Profil,
  type Rampes,
} from './rampe';
import type { Palette, Recette } from './recette';

/** La couleur de référence d'une palette validée. */
export function referenceDe(palette: Palette): Rgb8 {
  const couleur = lireHexa(palette.reference);
  if (!couleur) throw new Error(`Référence illisible : ${palette.reference}. La recette n'a pas été validée.`);
  return couleur;
}

/**
 * Les parts de chroma qu'une palette emploie. Ses parts propres, du designer
 * ou grises, passent d'abord. Sinon une palette de base forcée ([ENT-11])
 * donne au profil forcé la part de la référence, au millième ; l'autre profil
 * garde la part commune, bornée pour que soft ne dépasse pas vivid. Ces parts
 * se calculent à la lecture et ne se rangent pas : un changement de référence
 * ou de part commune les suit sans rangement.
 */
export function partsDe(recette: Recette, palette: Palette): Parts {
  const communes = { soft: recette.profils.soft.part, vivid: recette.profils.vivid.part };
  if (palette.parts || !palette.base) return partsEffectives(communes, palette.parts);
  const part = arrondir(partDeChroma(referenceDe(palette), recette.gamut), 3);
  return palette.base === 'soft'
    ? { soft: part, vivid: Math.max(communes.vivid, part) }
    : { soft: Math.min(communes.soft, part), vivid: part };
}

/** Vrai quand la chroma de la référence est sous `seuils.chromaGrise` ([MOT-18]). */
export function estPresqueGrise(recette: Recette, palette: Palette): boolean {
  return rgb8VersOklch(referenceDe(palette)).C < recette.seuils.chromaGrise;
}

/** Une part au millième entier : la précision à laquelle une part se range ([MOT-27]). */
const enMilliemes = (part: number): number => Math.round(part * 1000);

/**
 * Le profil que le classement automatique choisit ([MOT-17]) : celui dont la
 * part **commune** est la plus proche de la part de chroma de la référence,
 * comparées au millième. Égalité : `vivid`. Une référence presque grise :
 * `soft`. Les parts propres d'une palette n'y entrent pas : les régler ne
 * fait pas passer la référence d'un profil à l'autre.
 */
export function profilAutomatique(recette: Recette, palette: Palette): Profil {
  if (estPresqueGrise(recette, palette)) return 'soft';
  const part = enMilliemes(partDeChroma(referenceDe(palette), recette.gamut));
  const versSoft = Math.abs(part - enMilliemes(recette.profils.soft.part));
  const versVivid = Math.abs(part - enMilliemes(recette.profils.vivid.part));
  return versSoft < versVivid ? 'soft' : 'vivid';
}

/** Le profil qui porte la référence exacte : la palette de base forcée ([ENT-11]), sinon le classement automatique. */
export function profilPorteur(recette: Recette, palette: Palette): Profil {
  return palette.base ?? profilAutomatique(recette, palette);
}

/**
 * Le rang de la clarté de `courbe` la plus proche de `clarte`. Égalité : le
 * premier rang, qui porte le plus petit numéro dans les deux courbes. Une
 * clarté hors de la courbe donne l'extrémité la plus proche.
 */
export function rangPorteur(courbe: readonly number[], clarte: number): number {
  let meilleur = 0;
  courbe.forEach((valeur, rang) => {
    if (Math.abs(valeur - clarte) < Math.abs(courbe[meilleur] - clarte)) meilleur = rang;
  });
  return meilleur;
}

/** Où la référence exacte se place : son profil porteur, et son rang et son numéro dans chaque mode. */
export interface Ancrage {
  readonly profil: Profil;
  readonly rangs: { readonly [M in Mode]: number };
  readonly crans: { readonly [M in Mode]: number };
}

/** L'ancrage de la référence d'une palette ([MOT-17]), l'unique désignation que toutes les vues lisent. */
export function ancrageDe(recette: Recette, palette: Palette): Ancrage {
  const clarte = rgb8VersOklch(referenceDe(palette)).L;
  const rangs = { light: rangPorteur(recette.courbes.light, clarte), dark: rangPorteur(recette.courbes.dark, clarte) };
  return {
    profil: profilPorteur(recette, palette),
    rangs,
    crans: { light: recette.crans[rangs.light], dark: recette.crans[rangs.dark] },
  };
}

/** Le cran que la référence devient : ses octets tels quels, et L, C, H lus sur eux ([MOT-11]). */
function cranDeLaReference(reference: Rgb8): Cran {
  const lu = rgb8VersOklch(reference);
  return { couleur: reference, hexa: ecrireHexa(reference), L: lu.L, C: lu.C, H: lu.H };
}

/**
 * Les quatre rampes d'une palette, la référence ancrée ([MOT-17]) : dans le
 * profil porteur, le cran de l'ancrage de chaque mode prend les octets exacts
 * de la référence. Les autres crans gardent le calcul de `fabriquerPalette`.
 * Promesses, alertes, planche et rapport lisent ces rampes-ci.
 */
export function rampesDe(recette: Recette, palette: Palette): Rampes {
  const reference = referenceDe(palette);
  const communes = fabriquerPalette({
    reference,
    courbes: recette.courbes,
    parts: partsDe(recette, palette),
    derives: { soft: palette.derive.soft, vivid: palette.derive.vivid },
    gamut: recette.gamut,
  });
  const ancrage = ancrageDe(recette, palette);
  const ancree = (mode: Mode): Cran[] => communes[ancrage.profil][mode]
    .map((cran, rang) => (rang === ancrage.rangs[mode] ? cranDeLaReference(reference) : cran));
  return { ...communes, [ancrage.profil]: { light: ancree('light'), dark: ancree('dark') } };
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
