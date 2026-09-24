/**
 * La géométrie du graphe de dérive ([DER-01], [ARC-08]) : où se place un cran,
 * le pivot et un angle, et l'angle qu'une ordonnée désigne. Pure, sans DOM.
 *
 * L'abscisse est le rang du cran de la courbe claire : onze positions
 * régulières, du bout clair à gauche au bout sombre à droite. Le graphe, la
 * bande de teintes et la rampe s'alignent sur ces colonnes. L'ordonnée est la
 * dérive par rapport à la teinte de la référence, sur une échelle de ±30° à
 * ±90° que `echelleDe` choisit.
 */
import {
  DERIVE_MAXIMALE,
  ecartAngulaire,
  teinteA,
  type Bouts,
  type Derive,
  type Oklch,
} from 'ucm-couleur';

/** Le cadre du graphe, en pixels : sa taille et les marges des axes. */
export interface Cadre {
  readonly largeur: number;
  readonly hauteur: number;
  readonly gauche: number;
  readonly droite: number;
  readonly haut: number;
  readonly bas: number;
}

/** Les échelles de l'ordonnée, en degrés de part et d'autre de 0° ([DER-01]). */
export const ECHELLES: readonly number[] = [30, 45, 60, DERIVE_MAXIMALE];

/**
 * L'échelle qui montre ces angles : la plus petite qui les dépasse. Un angle
 * posé au bord d'une échelle l'élargit au palier suivant, pour qu'un glisser
 * suivant puisse aller plus loin. Au-delà, ±90°.
 */
export function echelleDe(angles: readonly number[]): number {
  const plusGrand = Math.max(0, ...angles.map(Math.abs));
  return ECHELLES.find((echelle) => echelle > plusGrand) ?? DERIVE_MAXIMALE;
}

/** Les repères de l'ordonnée, tous les 15°, dans l'échelle ([DER-01]). */
export function reperes(echelle: number): number[] {
  return Array.from({ length: Math.floor((2 * echelle) / 15) + 1 }, (_, rang) => -echelle + rang * 15);
}

/** La largeur d'une colonne, pour `nombre` crans. */
export function largeurDeColonne(cadre: Cadre, nombre: number): number {
  return (cadre.largeur - cadre.gauche - cadre.droite) / nombre;
}

/** L'abscisse du centre d'un rang, fractionnaire pour le pivot. */
export function abscisse(rang: number, cadre: Cadre, nombre: number): number {
  return cadre.gauche + (rang + 0.5) * largeurDeColonne(cadre, nombre);
}

/** L'ordonnée d'un angle, de +`echelle` en haut à -`echelle` en bas. */
export function ordonnee(angle: number, cadre: Cadre, echelle = DERIVE_MAXIMALE): number {
  const utile = cadre.hauteur - cadre.haut - cadre.bas;
  return cadre.haut + ((echelle - angle) / (2 * echelle)) * utile;
}

/** L'angle qu'une ordonnée désigne, borné par `echelle`, l'inverse d'`ordonnee`. */
export function angleDe(y: number, cadre: Cadre, echelle = DERIVE_MAXIMALE): number {
  const utile = cadre.hauteur - cadre.haut - cadre.bas;
  const angle = echelle - ((y - cadre.haut) / utile) * 2 * echelle;
  return Math.max(-echelle, Math.min(echelle, angle));
}

/**
 * L'angle d'un glisser ([DER-07]) : au degré près, aux 5° avec Maj, borné par
 * `echelle`, figée pendant le geste. Le `+ 0` écrit zéro sans signe, un `-0`
 * s'afficherait « −0 ».
 */
export function angleDuGlisser(y: number, cadre: Cadre, pas: 1 | 5, echelle = DERIVE_MAXIMALE): number {
  return Math.round(angleDe(y, cadre, echelle) / pas) * pas + 0;
}

/**
 * Le rang, fractionnaire, où le pivot se place : entre les deux crans de la
 * courbe claire qui encadrent sa clarté, par interpolation linéaire ([DER-01]).
 * Une clarté hors de la courbe rend `null` : la référence est hors de la rampe
 * ([DER-14]).
 */
export function rangDuPivot(clarte: number, courbeClaire: readonly number[]): number | null {
  for (let rang = 0; rang < courbeClaire.length - 1; rang += 1) {
    const haut = courbeClaire[rang];
    const bas = courbeClaire[rang + 1];
    if (clarte <= haut && clarte >= bas) return rang + (haut - clarte) / (haut - bas);
  }
  return null;
}

/** La dérive d'un cran : l'écart signé entre sa teinte et celle de la référence (section 6.4). */
export function deriveDuCran(clarte: number, reference: Oklch, derive: Derive, bouts: Bouts): number {
  return ecartAngulaire(reference.H, teinteA(clarte, reference, derive, bouts));
}

/** Un sommet de la ligne brisée : un rang, fractionnaire au pivot, et un angle. */
export interface Sommet {
  readonly rang: number;
  readonly angle: number;
}

/**
 * La ligne brisée d'un profil : un sommet par cran de la courbe claire. Le
 * profil porteur passe `rangAncre`, le rang clair de sa référence exacte
 * ([MOT-17]) : ce cran est la référence, et sa dérive vaut 0° ([DER-02]).
 * L'autre profil passe par le pivot à 0°, entre deux crans, quand la
 * référence est dans la rampe.
 */
export function ligneBrisee(
  courbeClaire: readonly number[],
  reference: Oklch,
  derive: Derive,
  bouts: Bouts,
  rangAncre: number | null = null,
): Sommet[] {
  const sommets: Sommet[] = courbeClaire.map((clarte, rang) => ({
    rang,
    angle: rang === rangAncre ? 0 : deriveDuCran(clarte, reference, derive, bouts),
  }));
  if (rangAncre !== null) return sommets;
  const pivot = rangDuPivot(reference.L, courbeClaire);
  if (pivot !== null) sommets.push({ rang: pivot, angle: 0 });
  return sommets.sort((a, b) => a.rang - b.rang);
}
