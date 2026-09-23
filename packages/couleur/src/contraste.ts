/**
 * Contraste WCAG 2, distance Oklab et part de chroma, mesurés sur la couleur à
 * 8 bits ([MOT-21] à [MOT-24]), et leur écriture décimale à virgule.
 */
import {
  CHROMA_SANS_TEINTE,
  lineaireVersOklab,
  rgb8VersLineaire,
  rgb8VersOklch,
  type Rgb8,
  type Triplet,
} from './conversions';
import { plafond, type Gamut } from './plafond';

/** La luminance relative de WCAG 2, sur des composantes sRGB linéaires. */
export function luminanceLineaire(lineaire: Triplet): number {
  return 0.2126 * lineaire[0] + 0.7152 * lineaire[1] + 0.0722 * lineaire[2];
}

/** La luminance relative de WCAG 2 d'une couleur à 8 bits ([MOT-21]). */
export function luminanceRelative(couleur: Rgb8): number {
  return luminanceLineaire(rgb8VersLineaire(couleur));
}

/** Le rapport de contraste de deux luminances relatives, le plus clair en haut. */
export function rapportDeLuminances(ya: number, yb: number): number {
  return (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);
}

/** Le contraste WCAG 2 de deux couleurs, dans un ordre quelconque ([MOT-21]). */
export function contraste(a: Rgb8, b: Rgb8): number {
  return rapportDeLuminances(luminanceRelative(a), luminanceRelative(b));
}

/**
 * La valeur que lisent le verdict et l'affichage : le contraste écrit à dix
 * décimales. `4.35` vaut `4.3499999999999996` en binaire, et une troncature
 * sur cette valeur afficherait 4,34.
 */
function aDixDecimales(x: number): string {
  return x.toFixed(10);
}

/**
 * Vrai quand un contraste atteint un seuil ([MOT-22]). La comparaison lit la
 * valeur à dix décimales que l'affichage tronque : un contraste affiché 4,50
 * tient 4,5, et 4,499 échoue.
 */
export function atteintLeSeuil(valeur: number, seuil: number): boolean {
  return Number(aDixDecimales(valeur)) >= seuil;
}

/** Remplace le point décimal par une virgule, sans `Intl` ni `toLocaleString`. */
function avecVirgule(ecriture: string): string {
  return ecriture.replace('.', ',');
}

/**
 * Tronque à `decimales` chiffres, sur l'écriture à dix décimales, et écrit la
 * virgule : 4,499 donne `4,49` ([MOT-22]).
 */
export function ecrireTronque(x: number, decimales: number): string {
  const [entier, fraction] = aDixDecimales(x).split('.');
  return decimales === 0 ? entier : avecVirgule(`${entier}.${fraction.slice(0, decimales)}`);
}

/** Un contraste tel que la planche et l'interface l'affichent : deux décimales tronquées. */
export function ecrireContraste(valeur: number): string {
  return ecrireTronque(valeur, 2);
}

/** Arrondit à `decimales` chiffres et écrit la virgule : une clarté, une chroma, une teinte. */
export function ecrireArrondi(x: number, decimales: number): string {
  return avecVirgule(x.toFixed(decimales));
}

/** La distance euclidienne en Oklab entre deux couleurs à 8 bits, notée ΔEok ([MOT-23]). */
export function distanceOk(a: Rgb8, b: Rgb8): number {
  const [La, aa, ba] = lineaireVersOklab(rgb8VersLineaire(a));
  const [Lb, ab, bb] = lineaireVersOklab(rgb8VersLineaire(b));
  return Math.hypot(La - Lb, aa - ab, ba - bb);
}

/**
 * La part de chroma d'une couleur : sa chroma rapportée au plafond du gamut à
 * sa clarté et sa teinte, bornée à `[0, 1]` ([MOT-24]). Une couleur sans teinte
 * ([MOT-04]) a une part nulle : le blanc relu porte une chroma de 4e-8 contre
 * un plafond de 2e-7, et le rapport ne dirait rien.
 */
export function partDeChroma(couleur: Rgb8, gamut: Gamut = 'srgb'): number {
  const lu = rgb8VersOklch(couleur);
  if (lu.C < CHROMA_SANS_TEINTE) return 0;
  const maximum = plafond(lu.L, lu.H, gamut);
  if (maximum <= 0) return 1;
  return Math.min(1, Math.max(0, lu.C / maximum));
}
