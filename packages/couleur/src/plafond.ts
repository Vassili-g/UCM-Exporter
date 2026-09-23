/**
 * Le plafond de chroma : la plus grande chroma qu'un gamut porte à une clarté
 * et une teinte données ([MOT-06] à [MOT-08]).
 */
import { oklchVersLineaire, type Triplet } from './conversions';

/** Le seul gamut implémenté. La lecture de la recette refuse les autres ([MOT-08]). */
export type Gamut = 'srgb';

/** Tolérance d'appartenance au gamut, par composante linéaire. */
const TOLERANCE_GAMUT = 1e-6;
const ITERATIONS = 50;
const CHROMA_HAUTE = 0.5;
/** Au-delà, la mémoire est vidée plutôt que de grandir sans borne ([MOT-07]). */
export const TAILLE_MEMOIRE_PLAFOND = 20000;

const memoire = new Map<string, number>();

/** Vrai quand chaque composante linéaire est dans `[0, 1]`, à `1e-6` près. */
export function dansLeGamut(lineaire: Triplet): boolean {
  return lineaire.every((canal) => canal >= -TOLERANCE_GAMUT && canal <= 1 + TOLERANCE_GAMUT);
}

/**
 * La plus grande chroma que `gamut` porte à la clarté `L` et la teinte `H`, par
 * dichotomie sur `[0, 0.5]` en 50 itérations. Le résultat est toujours dans le
 * gamut : la dichotomie ne garde que des bornes basses vérifiées.
 */
export function plafond(L: number, H: number, gamut: Gamut = 'srgb'): number {
  const cle = `${L}|${H}|${gamut}`;
  const connu = memoire.get(cle);
  if (connu !== undefined) return connu;

  let bas = 0;
  let haut = CHROMA_HAUTE;
  for (let i = 0; i < ITERATIONS; i += 1) {
    const milieu = (bas + haut) / 2;
    if (dansLeGamut(oklchVersLineaire({ L, C: milieu, H }))) bas = milieu;
    else haut = milieu;
  }

  if (memoire.size >= TAILLE_MEMOIRE_PLAFOND) memoire.clear();
  memoire.set(cle, bas);
  return bas;
}

/** Le nombre d'entrées mémorisées, pour vérifier la borne de [MOT-07]. */
export function tailleMemoirePlafond(): number {
  return memoire.size;
}
