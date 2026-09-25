/**
 * Les listes de nuances : les trois préréglages communs, la luminosité d'un
 * numéro que la liste commune ne porte pas, les bouts de la dérive, et la
 * liste d'une palette libre (conception W6, `CONCEPTION-NUANCES-ET-FORMAT-3.md`).
 */
import type { Bouts, Courbes, Mode } from './rampe';
import type { Palette, Recette } from './recette';

/** Une liste de numéros et une luminosité par numéro, dans chaque thème. */
export interface Grille {
  readonly crans: readonly number[];
  readonly courbes: Courbes;
}

export type NombreDeNuances = 9 | 11 | 13;

const ONZE: Grille = {
  crans: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  courbes: {
    light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
    dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
  },
};

/** Une grille de onze nuances, sans les numéros retirés. */
function sans(retires: readonly number[]): Grille {
  const garde = (_: number, rang: number) => !retires.includes(ONZE.crans[rang]);
  return {
    crans: ONZE.crans.filter((cran) => !retires.includes(cran)),
    courbes: { light: ONZE.courbes.light.filter(garde), dark: ONZE.courbes.dark.filter(garde) },
  };
}

/**
 * Les trois préréglages et leurs courbes par défaut (W6.1). Treize nuances
 * ajoutent 1000 et 1050 après 950 ; neuf retirent 400 et 950. Aucun
 * n'insère de nuance entre deux numéros d'emploi : les états gardent leurs
 * numéros.
 */
export const PREREGLAGES: { readonly [N in NombreDeNuances]: Grille } = {
  9: sans([400, 950]),
  11: ONZE,
  13: {
    crans: [...ONZE.crans, 1000, 1050],
    courbes: { light: [...ONZE.courbes.light, 0.215, 0.165], dark: [...ONZE.courbes.dark, 0.96, 0.98] },
  },
};

/** Le préréglage qu'une liste de numéros reconnaît, `null` pour une liste importée. */
export function nombreDeNuancesDe(crans: readonly number[]): NombreDeNuances | null {
  for (const nombre of [9, 11, 13] as const) {
    const attendus = PREREGLAGES[nombre].crans;
    if (attendus.length === crans.length && attendus.every((cran, rang) => cran === crans[rang])) return nombre;
  }
  return null;
}

/** L'interpolation linéaire d'une courbe sur ses numéros, pour un numéro compris entre le premier et le dernier. */
function interpoler(crans: readonly number[], courbe: readonly number[], numero: number): number {
  const apres = crans.findIndex((cran) => cran >= numero);
  if (crans[apres] === numero) return courbe[apres];
  const t = (numero - crans[apres - 1]) / (crans[apres] - crans[apres - 1]);
  return courbe[apres - 1] + t * (courbe[apres] - courbe[apres - 1]);
}

/** La courbe par défaut du préréglage 13, bornée à ses extrémités : elle ne sert qu'à mesurer des écarts. */
function courbeDeReference(mode: Mode, numero: number): number {
  const { crans, courbes } = PREREGLAGES[13];
  const borne = Math.min(crans[crans.length - 1], Math.max(crans[0], numero));
  return interpoler(crans, courbes[mode], borne);
}

/**
 * La luminosité du numéro `numero` dans une grille. Un numéro de la liste
 * garde sa valeur ; un numéro entre deux numéros s'interpole. Au-delà de la
 * liste, la luminosité avance vers le bord, 0 ou 1, dans la proportion où la
 * courbe par défaut du préréglage 13 y avance : elle rend exactement 0,215 et
 * 0,165 en Light, 0,96 et 0,98 en Dark sur les courbes par défaut, reste
 * strictement monotone et n'atteint jamais le bord.
 */
export function luminositeAuNumero(grille: Grille, mode: Mode, numero: number): number {
  const { crans } = grille;
  const courbe = grille.courbes[mode];
  const premier = crans[0];
  const dernier = crans[crans.length - 1];
  if (numero >= premier && numero <= dernier) return interpoler(crans, courbe, numero);
  const apres = numero > dernier;
  const voisin = apres ? dernier : premier;
  const valeur = courbe[apres ? courbe.length - 1 : 0];
  // Après la liste, Light descend vers 0 et Dark monte vers 1 ; avant, l'inverse.
  const bord = apres === (mode === 'light') ? 0 : 1;
  const depart = courbeDeReference(mode, voisin);
  return valeur + ((bord - valeur) * (courbeDeReference(mode, numero) - depart)) / (bord - depart);
}

/**
 * Les bouts de la dérive (section 6.4) : la luminosité des numéros 50 et 950
 * de la courbe claire commune. Lus à ces numéros, et non aux extrémités de la
 * liste, ils ne bougent pas quand treize nuances ajoutent 1000 et 1050.
 */
export function boutsDe(grille: Grille): Bouts {
  return { clair: luminositeAuNumero(grille, 'light', 50), sombre: luminositeAuNumero(grille, 'light', 950) };
}

/** L'étendue d'une rampe : la première et la dernière luminosité de sa liste, en Light. */
export function etendueDe(grille: Grille): Bouts {
  const courbe = grille.courbes.light;
  return { clair: courbe[0], sombre: courbe[courbe.length - 1] };
}

/** Vrai pour une palette libre, qui porte sa propre liste de numéros. */
export function estLibre(palette: Palette): palette is Palette & { readonly crans: readonly number[] } {
  return palette.crans !== undefined;
}

/**
 * La grille d'une palette : la liste commune, ou sa liste libre, dont chaque
 * numéro prend la luminosité que donnent les courbes communes. La courbe
 * d'une palette libre ne se range pas : elle suit les courbes communes.
 */
export function grilleDe(recette: Recette, palette: Palette): Grille {
  if (!estLibre(palette)) return { crans: recette.crans, courbes: recette.courbes };
  const au = (mode: Mode) => palette.crans.map((numero) => luminositeAuNumero(recette, mode, numero));
  return { crans: palette.crans, courbes: { light: au('light'), dark: au('dark') } };
}

const monotone = (courbe: readonly number[], mode: Mode): boolean =>
  courbe.every((valeur, rang) => rang === 0 || (mode === 'light' ? valeur < courbe[rang - 1] : valeur > courbe[rang - 1]));

/**
 * Une grille passée à un préréglage (W6.4). Un numéro gardé garde sa
 * luminosité, réglée ou non. Un numéro ajouté prend celle du préréglage quand
 * la courbe reste strictement monotone ; sinon, parce que le designer a réglé
 * ses voisines, chaque numéro ajouté prend celle que `luminositeAuNumero`
 * donne sur la grille courante, monotone par construction, au millième : la
 * précision d'une luminosité rangée.
 */
export function grilleAuPrereglage(grille: Grille, nombre: NombreDeNuances): Grille {
  const cible = PREREGLAGES[nombre];
  const courbe = (mode: Mode): number[] => {
    const valeur = (numero: number, rang: number, ajoute: (numero: number, rang: number) => number): number => {
      const garde = grille.crans.indexOf(numero);
      return garde >= 0 ? grille.courbes[mode][garde] : ajoute(numero, rang);
    };
    const parDefaut = cible.crans.map((numero, rang) => valeur(numero, rang, (_, ici) => cible.courbes[mode][ici]));
    return monotone(parDefaut, mode)
      ? parDefaut
      : cible.crans.map((numero, rang) => valeur(numero, rang, (ajoute) => Math.round(luminositeAuNumero(grille, mode, ajoute) * 1000) / 1000));
  };
  return { crans: cible.crans, courbes: { light: courbe('light'), dark: courbe('dark') } };
}
