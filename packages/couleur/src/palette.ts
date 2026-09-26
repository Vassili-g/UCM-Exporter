/**
 * Une palette lue contre sa recette : ses intensités, ses parts, l'ancrage de
 * sa référence, ses rampes, et les parts propres d'une référence presque
 * grise ([ENT-09]).
 *
 * Chaque fonction reçoit une recette déjà validée ([REC-05]).
 */
import { ecrireHexa, lireHexa, rgb8VersOklch, type Rgb8 } from './conversions';
import { partDeChroma } from './contraste';
import { PREREGLAGES, boutsDe, estLibre, grilleDe } from './nuances';
import {
  arrondir,
  fabriquerPalette,
  fabriquerRampe,
  partsEffectives,
  PROFILS,
  type Cran,
  type FondsSombres,
  type Intensite,
  type Mode,
  type Parts,
  type Profil,
  type RampeParMode,
  type Rampes,
} from './rampe';
import type { Palette, Recette } from './recette';

/** Vrai pour une palette à une intensité ([ENT-14]). */
export function aUneIntensite(palette: Palette): boolean {
  return palette.intensites === 1;
}

/**
 * Les intensités qu'une palette porte, dans l'ordre de l'affichage : `unique`,
 * ou `soft` puis `vivid` ([ENT-14]). Toute vue qui parcourt les rampes, les
 * promesses ou les pastilles d'une palette lit cette liste.
 */
export function intensitesDe(palette: Palette): readonly Intensite[] {
  return aUneIntensite(palette) ? ['unique'] : PROFILS;
}

/** La part d'une intensité, par intensité présente. */
export type PartsDePalette = { readonly [I in Intensite]?: number };

/** La couleur de référence d'une palette validée. */
export function referenceDe(palette: Palette): Rgb8 {
  const couleur = lireHexa(palette.reference);
  if (!couleur) throw new Error(`Référence illisible : ${palette.reference}. La recette n'a pas été validée.`);
  return couleur;
}

/** La part de chroma de la référence, au millième : la précision à laquelle une part se range ([MOT-27]). */
export function partDeLaReference(recette: Recette, palette: Palette): number {
  return arrondir(partDeChroma(referenceDe(palette), recette.gamut), 3);
}

/**
 * Les parts de chroma qu'une palette emploie, une par intensité. Une palette
 * à une intensité prend la part de sa référence ([ENT-14]). Sinon ses parts
 * propres, du designer ou grises, passent d'abord. Sinon une palette de base
 * forcée ([ENT-11]) donne au profil forcé la part de la référence ; l'autre
 * profil garde la part commune, bornée pour que soft ne dépasse pas vivid.
 * Ces parts se calculent à la lecture et ne se rangent pas : un changement de
 * référence ou de part commune les suit sans rangement.
 */
export function partsDe(recette: Recette, palette: Palette): PartsDePalette {
  return aUneIntensite(palette) ? { unique: partDeLaReference(recette, palette) } : partsDesProfils(recette, palette);
}

/** Les parts des deux profils d'une palette à deux intensités, celles que `partsDe` lui donne. */
export function partsDesProfils(recette: Recette, palette: Palette): Parts {
  const communes = { soft: recette.profils.soft.part, vivid: recette.profils.vivid.part };
  if (palette.parts || !palette.base) return partsEffectives(communes, palette.parts);
  const part = partDeLaReference(recette, palette);
  return palette.base === 'soft'
    ? { soft: part, vivid: Math.max(communes.vivid, part) }
    : { soft: Math.min(communes.soft, part), vivid: part };
}

/**
 * La clarté Dark d'un numéro qui borne les fonds : celle de la courbe commune
 * quand la liste le porte, sinon celle de la courbe par défaut des onze
 * nuances. Une interpolation déplacerait la borne quand un préréglage retire
 * le 400, et les fonds changeraient de couleur sans qu'aucune nuance gardée
 * n'ait bougé.
 */
function borneDesFonds(recette: Recette, numero: 50 | 400): number {
  const rang = recette.crans.indexOf(numero);
  if (rang >= 0) return recette.courbes.dark[rang];
  const { crans, courbes } = PREREGLAGES[11];
  return courbes.dark[crans.indexOf(numero)];
}

/**
 * Les fonds du thème Dark d'une recette ([MOT-28]) : le facteur rangé, et les
 * clartés Dark des numéros 50 et 400 (`borneDesFonds`).
 */
export function fondsSombresDe(recette: Recette): FondsSombres {
  return {
    depart: recette.intensiteDesFondsSombres,
    clarteBasse: borneDesFonds(recette, 50),
    clarteHaute: borneDesFonds(recette, 400),
  };
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

/**
 * Le profil qui porte la référence exacte d'une palette à deux intensités :
 * la palette de base forcée ([ENT-11]), sinon le classement automatique. Une
 * palette libre n'a pas de base : la validation la refuse.
 */
export function profilPorteur(recette: Recette, palette: Palette): Profil {
  return (estLibre(palette) ? undefined : palette.base) ?? profilAutomatique(recette, palette);
}

/** L'intensité qui porte la référence exacte : `unique`, ou le profil porteur. */
export function intensitePorteuse(recette: Recette, palette: Palette): Intensite {
  return aUneIntensite(palette) ? 'unique' : profilPorteur(recette, palette);
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

/** Où la référence exacte se place : son intensité porteuse, et son rang et son numéro dans chaque mode. */
export interface Ancrage {
  readonly profil: Intensite;
  readonly rangs: { readonly [M in Mode]: number };
  readonly crans: { readonly [M in Mode]: number };
}

/**
 * L'ancrage de la référence d'une palette ([MOT-17]), l'unique désignation
 * que toutes les vues lisent, sur la grille de la palette : la liste commune,
 * ou sa liste libre.
 */
export function ancrageDe(recette: Recette, palette: Palette): Ancrage {
  const clarte = rgb8VersOklch(referenceDe(palette)).L;
  const { crans, courbes } = grilleDe(recette, palette);
  const rangs = { light: rangPorteur(courbes.light, clarte), dark: rangPorteur(courbes.dark, clarte) };
  return {
    profil: intensitePorteuse(recette, palette),
    rangs,
    crans: { light: crans[rangs.light], dark: crans[rangs.dark] },
  };
}

/** Le cran que la référence devient : ses octets tels quels, et L, C, H lus sur eux ([MOT-11]). */
function cranDeLaReference(reference: Rgb8): Cran {
  const lu = rgb8VersOklch(reference);
  return { couleur: reference, hexa: ecrireHexa(reference), L: lu.L, C: lu.C, H: lu.H };
}

/**
 * La rampe d'une palette à une intensité ([ENT-14]) : celle que le profil
 * porteur forcé donnerait, à la part de la référence, avec la dérive liée.
 */
function rampeUnique(recette: Recette, palette: Palette): RampeParMode {
  const reference = rgb8VersOklch(referenceDe(palette));
  const { courbes } = grilleDe(recette, palette);
  const rampe = (mode: Mode): Cran[] => fabriquerRampe({
    courbe: courbes[mode],
    bouts: boutsDe(recette),
    reference,
    derive: palette.derive.vivid,
    part: partDeLaReference(recette, palette),
    gamut: recette.gamut,
    sombre: mode === 'dark' ? fondsSombresDe(recette) : undefined,
  });
  return { light: rampe('light'), dark: rampe('dark') };
}

/**
 * Les rampes d'une palette, une par intensité présente, la référence ancrée
 * ([MOT-17]) : dans l'intensité porteuse, le cran de l'ancrage de chaque mode
 * prend les octets exacts de la référence, fonds du thème Dark compris. Les
 * autres crans gardent le calcul commun. Promesses, alertes, planche et
 * rapport lisent ces rampes-ci.
 */
export function rampesDe(recette: Recette, palette: Palette): Rampes {
  const reference = referenceDe(palette);
  const ancrage = ancrageDe(recette, palette);
  const ancrer = (rampe: RampeParMode): RampeParMode => {
    const ancree = (mode: Mode): Cran[] => rampe[mode]
      .map((cran, rang) => (rang === ancrage.rangs[mode] ? cranDeLaReference(reference) : cran));
    return { light: ancree('light'), dark: ancree('dark') };
  };
  if (aUneIntensite(palette)) return { unique: ancrer(rampeUnique(recette, palette)) };
  const communes = fabriquerPalette({
    reference,
    courbes: grilleDe(recette, palette).courbes,
    bouts: boutsDe(recette),
    parts: partsDesProfils(recette, palette),
    derives: { soft: palette.derive.soft, vivid: palette.derive.vivid },
    gamut: recette.gamut,
    sombre: fondsSombresDe(recette),
  });
  return { ...communes, [ancrage.profil]: ancrer(communes[ancrage.profil as Profil]) };
}

/**
 * Pose ou retire les parts d'origine `grise` ([ENT-09]). Une référence presque
 * grise reçoit des parts égales à sa part de chroma, au millième ; une
 * référence qui cesse de l'être les perd. Des parts d'origine `designer`
 * restent dans les deux cas. Une palette à une intensité n'a jamais de parts
 * propres : sa part est déjà celle de la référence ([ENT-14]).
 */
export function ajusterPartsGrises(recette: Recette, palette: Palette): Palette {
  if (aUneIntensite(palette)) {
    const { parts: _retirees, ...sansParts } = palette;
    return sansParts;
  }
  if (palette.parts?.origine === 'designer') return palette;
  if (estPresqueGrise(recette, palette)) {
    const part = partDeLaReference(recette, palette);
    return { ...palette, parts: { soft: part, vivid: part, origine: 'grise' } };
  }
  if (palette.parts?.origine === 'grise') {
    const { parts: _retirees, ...sansParts } = palette;
    return sansParts;
  }
  return palette;
}
