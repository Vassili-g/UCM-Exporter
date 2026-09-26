/**
 * Fabriquer un cran, une rampe et les rampes d'une palette ([MOT-09] à
 * [MOT-17]), avec la teinte pivotée autour de la couleur de référence, et la
 * part des fonds du thème Dark ([MOT-28]).
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

/**
 * Une intensité d'une palette : l'un des deux profils d'une palette à deux
 * intensités, ou la rampe `unique` d'une palette à une intensité, qui n'a pas
 * de nom de profil ([ENT-14]).
 */
export type Intensite = Profil | 'unique';

export const PROFILS: readonly Profil[] = ['soft', 'vivid'];
export const MODES: readonly Mode[] = ['light', 'dark'];

/** Une dérive de teinte, en degrés signés, à chaque bout de la rampe (section 6.4). */
export interface Derive {
  readonly clair: number;
  readonly sombre: number;
}

/** Une dérive se borne à `[-90, 90]` degrés ([MOT-15]). */
export const DERIVE_MAXIMALE = 90;

/** Les deux clartés qui bornent la dérive : celles des numéros 50 et 950 en Light (`boutsDe`, nuances.ts). */
export interface Bouts {
  readonly clair: number;
  readonly sombre: number;
}

/** Les courbes de clarté d'une recette, un nombre par cran. */
export interface Courbes {
  readonly light: readonly number[];
  readonly dark: readonly number[];
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

/**
 * Ce que les fonds du thème Dark retiennent de la part ([MOT-28]) : le facteur
 * `depart` jusqu'à `clarteBasse`, la clarté du numéro 50 de la courbe Dark,
 * puis un facteur qui remonte linéairement en clarté jusqu'à 1 à
 * `clarteHaute`, celle du numéro 400, et au-delà.
 */
export interface FondsSombres {
  readonly depart: number;
  readonly clarteBasse: number;
  readonly clarteHaute: number;
}

/**
 * Le facteur de la part d'un cran du thème Dark de clarté `L`, la clarté que
 * la courbe vise ([MOT-28]). Il vaut 1 dès `clarteHaute` : les accents
 * gardent leur part.
 */
export function facteurSombre(L: number, fonds: FondsSombres): number {
  const t = Math.min(1, Math.max(0, (L - fonds.clarteBasse) / (fonds.clarteHaute - fonds.clarteBasse)));
  return fonds.depart + (1 - fonds.depart) * t;
}

/** Fabrique un cran (section 6.3). */
export function fabriquerCran(L: number, H: number, part: number, gamut: Gamut): Cran {
  const couleur = lineaireVersRgb8(oklchVersLineaire(cranVise(L, H, part, gamut)));
  const lu = rgb8VersOklch(couleur);
  return { couleur, hexa: ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H };
}

/** Ce qu'une rampe demande : une courbe, un pivot, une dérive, une part, et pour le thème Dark ses fonds. */
export interface ParametresRampe {
  readonly courbe: readonly number[];
  readonly bouts: Bouts;
  readonly reference: Oklch;
  readonly derive: Derive;
  readonly part: number;
  readonly gamut: Gamut;
  /** Présent pour une rampe du thème Dark : la part de ses fonds baisse ([MOT-28]). */
  readonly sombre?: FondsSombres;
}

/** Les crans d'une rampe, dans l'ordre de la courbe. */
export function fabriquerRampe(parametres: ParametresRampe): Cran[] {
  const { sombre } = parametres;
  return parametres.courbe.map((L) =>
    fabriquerCran(
      L,
      teinteA(L, parametres.reference, parametres.derive, parametres.bouts),
      sombre ? parametres.part * facteurSombre(L, sombre) : parametres.part,
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

/** Ce qu'une palette demande pour produire ses quatre rampes : ses courbes, et les bouts de la recette. */
export interface EntreesPalette {
  readonly reference: Rgb8;
  readonly courbes: Courbes;
  readonly bouts: Bouts;
  readonly parts: Parts;
  readonly derives: { readonly soft: Derive; readonly vivid: Derive };
  readonly gamut: Gamut;
  /** Absent, les fonds du thème Dark gardent la part de leur profil ([MOT-28]). */
  readonly sombre?: FondsSombres;
}

/** Une rampe par thème. */
export type RampeParMode = { readonly [M in Mode]: Cran[] };

/** Les quatre rampes des deux profils : `soft` et `vivid`, en clair et en sombre. */
export type RampesDesProfils = { readonly [P in Profil]: RampeParMode };

/**
 * Les rampes d'une palette, une par intensité présente : `soft` et `vivid`,
 * ou `unique` ([ENT-14]). Une intensité absente n'a pas de clé.
 */
export type Rampes = { readonly [I in Intensite]?: RampeParMode };

/** La rampe d'une intensité que la palette porte ; une intensité absente est une faute de l'appelant. */
export function rampeDe(rampes: Rampes, intensite: Intensite): RampeParMode {
  const rampe = rampes[intensite];
  if (!rampe) throw new Error(`Intensité absente de la palette : ${intensite}.`);
  return rampe;
}

/**
 * Fabrique les quatre rampes communes des deux profils : la référence fixe le
 * pivot de la teinte, et chaque cran suit sa courbe. `rampesDe` (palette.ts) y
 * ancre ensuite les octets exacts de la référence ([MOT-17]).
 */
export function fabriquerPalette(entrees: EntreesPalette): RampesDesProfils {
  const reference = rgb8VersOklch(entrees.reference);
  const { bouts } = entrees;
  const rampe = (profil: Profil, mode: Mode): Cran[] =>
    fabriquerRampe({
      courbe: entrees.courbes[mode],
      bouts,
      reference,
      derive: entrees.derives[profil],
      part: entrees.parts[profil],
      gamut: entrees.gamut,
      sombre: mode === 'dark' ? entrees.sombre : undefined,
    });
  return {
    soft: { light: rampe('soft', 'light'), dark: rampe('soft', 'dark') },
    vivid: { light: rampe('vivid', 'light'), dark: rampe('vivid', 'dark') },
  };
}
