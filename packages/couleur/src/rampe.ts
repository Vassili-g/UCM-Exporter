/**
 * Fabriquer un cran, une rampe et les quatre rampes d'une palette ([MOT-09] à
 * [MOT-17]), avec la teinte pivotée autour de la couleur de référence.
 */
import {
  ecrireHexa,
  lineaireVersRgb8,
  normaliserTeinte,
  oklchVersLineaire,
  rgb8VersOklch,
  type Oklch,
  type Rgb8,
  type Triplet,
} from './conversions';
import { plafond, type Gamut } from './plafond';

export type Profil = 'soft' | 'vivid';
export type Mode = 'light' | 'dark';

export const PROFILS: readonly Profil[] = ['soft', 'vivid'];
export const MODES: readonly Mode[] = ['light', 'dark'];

/** Une dérive de teinte, en degrés signés, à chaque bout de la rampe (section 6.4). */
export interface Derive {
  readonly clair: number;
  readonly sombre: number;
}

/** Une dérive se borne à `[-90, 90]` degrés ([MOT-15]). */
export const DERIVE_MAXIMALE = 90;

/** Les deux clartés qui bornent la dérive : `Lc = courbes.light[0]`, `Ls = courbes.light[dernier]`. */
export interface Bouts {
  readonly clair: number;
  readonly sombre: number;
}

/** Les courbes de clarté d'une recette, un nombre par cran. */
export interface Courbes {
  readonly light: readonly number[];
  readonly dark: readonly number[];
}

/** Les bouts d'une recette, lus sur sa courbe claire. */
export function boutsDe(courbes: Courbes): Bouts {
  return { clair: courbes.light[0], sombre: courbes.light[courbes.light.length - 1] };
}

/**
 * Arrondi à `decimales` chiffres, symétrique en signe : `signe(x) × round(|x| ×
 * 10ⁿ) / 10ⁿ` ([MOT-27]). Un angle se range au centième, une part au millième.
 */
export function arrondir(x: number, decimales: number): number {
  const facteur = 10 ** decimales;
  const arrondi = Math.round(Math.abs(x) * facteur) / facteur;
  // `-0` s'écrit `0` en JSON mais n'égale pas `0` pour `Object.is` : un angle
  // nul reste positif.
  return x < 0 && arrondi !== 0 ? -arrondi : arrondi;
}

/**
 * La teinte à la clarté `L` (section 6.4). La référence est le pivot : à sa
 * clarté, la teinte vaut la sienne quelle que soit la dérive. Une clarté hors
 * de `[Ls, Lc]` prend la dérive entière du bout le plus proche ([MOT-14]).
 */
export function teinteA(L: number, reference: Oklch, derive: Derive, bouts: Bouts): number {
  if (L >= reference.L) {
    const u = bouts.clair > reference.L
      ? Math.min(1, Math.max(0, (L - reference.L) / (bouts.clair - reference.L)))
      : 0;
    return normaliserTeinte(reference.H + derive.clair * u);
  }
  const v = reference.L > bouts.sombre
    ? Math.min(1, Math.max(0, (reference.L - L) / (reference.L - bouts.sombre)))
    : 1;
  return normaliserTeinte(reference.H + derive.sombre * v);
}

/** Un cran produit : la couleur à 8 bits et sa lecture OKLCH recalculée ([MOT-09], [MOT-11]). */
export interface Cran {
  readonly couleur: Rgb8;
  readonly hexa: string;
  readonly L: number;
  readonly C: number;
  readonly H: number;
}

/** La couleur visée par un cran, avant tout arrondi. */
export function cranVise(L: number, H: number, part: number, gamut: Gamut): Oklch {
  return { L, C: part * plafond(L, H, gamut), H };
}

/**
 * Le chemin sans arrondi à 8 bits : les composantes linéaires bornées à
 * `[0, 1]`. Il sert à comparer le moteur aux relevés en virgule flottante de
 * l'architecture ; le plugin ne l'affiche jamais.
 */
export function cranFlottant(L: number, H: number, part: number, gamut: Gamut): Triplet {
  const lineaire = oklchVersLineaire(cranVise(L, H, part, gamut));
  return [
    Math.min(1, Math.max(0, lineaire[0])),
    Math.min(1, Math.max(0, lineaire[1])),
    Math.min(1, Math.max(0, lineaire[2])),
  ];
}

/** Fabrique un cran (section 6.3). */
export function fabriquerCran(L: number, H: number, part: number, gamut: Gamut): Cran {
  const couleur = lineaireVersRgb8(oklchVersLineaire(cranVise(L, H, part, gamut)));
  const lu = rgb8VersOklch(couleur);
  return { couleur, hexa: ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H };
}

/** Ce qu'une rampe demande : une courbe, un pivot, une dérive, une part. */
export interface ParametresRampe {
  readonly courbe: readonly number[];
  readonly bouts: Bouts;
  readonly reference: Oklch;
  readonly derive: Derive;
  readonly part: number;
  readonly gamut: Gamut;
}

/** Les crans d'une rampe, dans l'ordre de la courbe. */
export function fabriquerRampe(parametres: ParametresRampe): Cran[] {
  return parametres.courbe.map((L) =>
    fabriquerCran(
      L,
      teinteA(L, parametres.reference, parametres.derive, parametres.bouts),
      parametres.part,
      parametres.gamut,
    ));
}

/** Une part de chroma par profil. */
export interface Parts {
  readonly soft: number;
  readonly vivid: number;
}

/**
 * Les parts qu'une palette emploie : ses parts propres quand elle en porte,
 * sinon celles de la recette.
 */
export function partsEffectives(recette: Parts, propres?: Parts): Parts {
  return propres ? { soft: propres.soft, vivid: propres.vivid } : recette;
}

/** Ce qu'une palette demande pour produire ses quatre rampes. */
export interface EntreesPalette {
  readonly reference: Rgb8;
  readonly courbes: Courbes;
  readonly parts: Parts;
  readonly derives: { readonly soft: Derive; readonly vivid: Derive };
  readonly gamut: Gamut;
}

/** Les quatre rampes d'une palette : `soft` et `vivid`, en clair et en sombre. */
export type Rampes = { readonly [P in Profil]: { readonly [M in Mode]: Cran[] } };

/**
 * Fabrique les quatre rampes d'une palette. La référence ne se recalcule
 * jamais ([MOT-17]) : elle fixe le pivot, et aucune rampe ne la contient.
 */
export function fabriquerPalette(entrees: EntreesPalette): Rampes {
  const reference = rgb8VersOklch(entrees.reference);
  const bouts = boutsDe(entrees.courbes);
  const rampe = (profil: Profil, mode: Mode): Cran[] =>
    fabriquerRampe({
      courbe: entrees.courbes[mode],
      bouts,
      reference,
      derive: entrees.derives[profil],
      part: entrees.parts[profil],
      gamut: entrees.gamut,
    });
  return {
    soft: { light: rampe('soft', 'light'), dark: rampe('soft', 'dark') },
    vivid: { light: rampe('vivid', 'light'), dark: rampe('vivid', 'dark') },
  };
}
