/**
 * Les formats du sélecteur de couleur (W4.1) : teinte, saturation et valeur
 * pour la zone et le curseur, et les trois codes que le designer saisit, Hex,
 * RGB et HSL. Sans DOM : les conversions se testent hors du navigateur.
 */
import { lireHexa, ecrireHexa, type Rgb8 } from 'ucm-couleur';

export type FormatDeCode = 'hex' | 'rgb' | 'hsl';

/** L'ordre du menu de format ; Hex vient d'abord, et chaque ouverture y revient. */
export const FORMATS_DE_CODE: readonly FormatDeCode[] = ['hex', 'rgb', 'hsl'];

/** Teinte en degrés, dans [0, 360) ; saturation et valeur dans [0, 1]. */
export interface Hsv {
  readonly h: number;
  readonly s: number;
  readonly v: number;
}

const borner = (valeur: number, min: number, max: number): number => Math.min(max, Math.max(min, valeur));

export function hsvVersRgb8({ h, s, v }: Hsv): Rgb8 {
  const canal = (n: number): number => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * borner(Math.min(k, 4 - k), 0, 1)) * 255);
  };
  return [canal(5), canal(3), canal(1)];
}

/**
 * La position de `couleur` dans la zone et sur le curseur. Un gris n'a pas de
 * teinte, et un noir pas de saturation : ils gardent celles de `precedente`,
 * que le designer a peut-être posées. Une couleur que `precedente` produit
 * déjà la garde entière, sans que l'arrondi à l'octet déplace le curseur.
 */
export function positionDe(couleur: Rgb8, precedente: Hsv | null = null): Hsv {
  if (precedente && hsvVersRgb8(precedente).every((canal, rang) => canal === couleur[rang])) return precedente;
  const [r, g, b] = couleur.map((canal) => canal / 255);
  const max = Math.max(r, g, b);
  const ecart = max - Math.min(r, g, b);
  let h = precedente?.h ?? 0;
  if (ecart > 0) {
    const secteur = max === r ? ((g - b) / ecart) % 6 : max === g ? (b - r) / ecart + 2 : (r - g) / ecart + 4;
    h = (secteur * 60 + 360) % 360;
  }
  const s = max === 0 ? (precedente?.s ?? 0) : ecart / max;
  return { h, s, v: max };
}

/** Teinte en degrés, saturation et luminosité HSL dans [0, 1]. */
function rgb8VersHsl(couleur: Rgb8): { h: number; s: number; l: number } {
  const { h } = positionDe(couleur);
  const [r, g, b] = couleur.map((canal) => canal / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslVersRgb8(h: number, s: number, l: number): Rgb8 {
  const v = l + s * Math.min(l, 1 - l);
  return hsvVersRgb8({ h: h % 360, s: v === 0 ? 0 : 2 * (1 - l / v), v });
}

/** Les champs du code dans un format : un seul en Hex, sans `#` ; trois en RGB et en HSL. */
export function ecrireCode(format: FormatDeCode, couleur: Rgb8): string[] {
  if (format === 'hex') return [ecrireHexa(couleur).slice(1)];
  if (format === 'rgb') return couleur.map(String);
  const { h, s, l } = rgb8VersHsl(couleur);
  return [Math.round(h) % 360, Math.round(s * 100), Math.round(l * 100)].map(String);
}

/** Un nombre saisi, virgule décimale acceptée, et l'unité que le designer a pu recopier. */
function lireNombre(texte: string, unite = ''): number | null {
  const brut = texte.trim();
  const nettoye = (unite && brut.endsWith(unite) ? brut.slice(0, -unite.length) : brut).trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(nettoye) ? Number(nettoye) : null;
}

/**
 * La couleur que des champs saisis décrivent, ou `null`. Hex accepte `RRGGBB`,
 * `#RRGGBB` et `#RGB` ; RGB trois entiers de 0 à 255 ; HSL une teinte de 0 à
 * 360 degrés, puis saturation et luminosité de 0 à 100 %.
 */
export function lireCode(format: FormatDeCode, champs: readonly string[]): Rgb8 | null {
  if (format === 'hex') {
    const texte = (champs[0] ?? '').trim();
    return lireHexa(texte.startsWith('#') ? texte : `#${texte}`);
  }
  if (champs.length !== 3) return null;
  if (format === 'rgb') {
    const canaux = champs.map((champ) => lireNombre(champ));
    return canaux.every((canal): canal is number => canal !== null && Number.isInteger(canal) && canal <= 255)
      ? [canaux[0], canaux[1], canaux[2]]
      : null;
  }
  const h = lireNombre(champs[0], '°');
  const s = lireNombre(champs[1], '%');
  const l = lireNombre(champs[2], '%');
  if (h === null || s === null || l === null || h > 360 || s > 100 || l > 100) return null;
  return hslVersRgb8(h, s / 100, l / 100);
}

/** La position déplacée au clavier : `pas` en fraction pour la zone, en degrés pour la teinte. */
export function deplacer(position: Hsv, axe: 'h' | 's' | 'v', pas: number): Hsv {
  if (axe === 'h') return { ...position, h: (position.h + pas + 360) % 360 };
  return { ...position, [axe]: borner(Math.round((position[axe] + pas) * 1000) / 1000, 0, 1) };
}
