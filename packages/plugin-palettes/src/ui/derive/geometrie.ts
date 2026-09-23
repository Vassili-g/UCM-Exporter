/**
 * La géométrie du graphe de dérive ([DER-01], [ARC-08]) : où se place un cran,
 * le pivot et un angle, et l'angle qu'une ordonnée désigne. Pure, sans DOM.
 *
 * L'abscisse est le rang du cran de la courbe claire : onze positions
 * régulières, du bout clair à gauche au bout sombre à droite. Le graphe, la
 * bande de teintes et la rampe s'alignent sur ces colonnes. L'ordonnée est la
 * dérive par rapport à la teinte de la référence, de +90° en haut à -90° en bas.
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

/** Les repères de l'ordonnée, tous les 15° ([DER-01]). */
export const REPERES: readonly number[] = Array.from({ length: 13 }, (_, rang) => -DERIVE_MAXIMALE + rang * 15);

/** La largeur d'une colonne, pour `nombre` crans. */
export function largeurDeColonne(cadre: Cadre, nombre: number): number {
  return (cadre.largeur - cadre.gauche - cadre.droite) / nombre;
}

/** L'abscisse du centre d'un rang, fractionnaire pour le pivot. */
export function abscisse(rang: number, cadre: Cadre, nombre: number): number {
  return cadre.gauche + (rang + 0.5) * largeurDeColonne(cadre, nombre);
}

/** L'ordonnée d'un angle, de +90° en haut à -90° en bas. */
export function ordonnee(angle: number, cadre: Cadre): number {
  const utile = cadre.hauteur - cadre.haut - cadre.bas;
  return cadre.haut + ((DERIVE_MAXIMALE - angle) / (2 * DERIVE_MAXIMALE)) * utile;
}

/** L'angle qu'une ordonnée désigne, borné à `[-90, 90]`, l'inverse d'`ordonnee`. */
export function angleDe(y: number, cadre: Cadre): number {
  const utile = cadre.hauteur - cadre.haut - cadre.bas;
  const angle = DERIVE_MAXIMALE - ((y - cadre.haut) / utile) * 2 * DERIVE_MAXIMALE;
  return Math.max(-DERIVE_MAXIMALE, Math.min(DERIVE_MAXIMALE, angle));
}

/**
 * L'angle d'un glisser ([DER-07]) : au degré près, aux 5° avec Maj. Le `+ 0`
 * écrit zéro sans signe, un `-0` s'afficherait « −0 ».
 */
export function angleDuGlisser(y: number, cadre: Cadre, pas: 1 | 5): number {
  return Math.round(angleDe(y, cadre) / pas) * pas + 0;
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
 * La ligne brisée d'un profil : un sommet par cran de la courbe claire, et le
 * pivot à 0° quand la référence est dans la rampe.
 */
export function ligneBrisee(courbeClaire: readonly number[], reference: Oklch, derive: Derive, bouts: Bouts): Sommet[] {
  const sommets: Sommet[] = courbeClaire.map((clarte, rang) => ({ rang, angle: deriveDuCran(clarte, reference, derive, bouts) }));
  const pivot = rangDuPivot(reference.L, courbeClaire);
  if (pivot !== null) sommets.push({ rang: pivot, angle: 0 });
  return sommets.sort((a, b) => a.rang - b.rang);
}
