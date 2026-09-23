/**
 * Le préréglage Tailwind : la dérive de teinte que les rampes colorées de
 * Tailwind montrent, prédite pour une couleur de référence ([MOT-18] à
 * [MOT-20]).
 */
import type { Oklch } from './conversions';
import { arrondir, type Bouts, type Derive } from './rampe';

/** Une rampe relevée : son nom, la teinte de son cran 50 et celle de son cran 950. */
export type PaireDeDerive = readonly [nom: string, teinteClaire: number, teinteSombre: number];

/**
 * Le relevé par défaut, les dix-sept rampes colorées de Tailwind. La recette
 * le porte sous `derives` : c'est elle qui fait autorité une fois rangée.
 */
export const RELEVE_TAILWIND: readonly PaireDeDerive[] = [
  ['rose', 12.422, 12.094],
  ['red', 17.38, 26.042],
  ['orange', 73.684, 36.259],
  ['amber', 95.277, 45.635],
  ['yellow', 102.212, 53.813],
  ['lime', 120.757, 132.109],
  ['green', 155.826, 152.934],
  ['emerald', 166.113, 172.552],
  ['teal', 180.72, 192.524],
  ['cyan', 200.873, 229.695],
  ['sky', 236.62, 243.157],
  ['blue', 254.604, 267.935],
  ['indigo', 272.314, 281.288],
  ['violet', 293.756, 291.089],
  ['purple', 308.299, 302.717],
  ['fuchsia', 320.058, 325.661],
  ['pink', 343.198, 3.907],
];

/** L'écart signé le plus court de `a` à `b`, dans `[-180, 180)`. */
export function ecartAngulaire(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

/**
 * La dérive totale, du bout clair au bout sombre, prédite à la teinte `h` : les
 * deux rampes voisines de `h` sur le cercle, triées par teinte claire, et
 * l'interpolation linéaire de leur dérive totale selon la position angulaire
 * de `h` entre elles. Le relevé doit compter deux teintes claires distinctes
 * au moins, ce que la validation de la recette garantit ([REC-05]).
 */
export function deriveTailwind(h: number, releve: readonly PaireDeDerive[] = RELEVE_TAILWIND): number {
  const triees = [...releve].sort((x, y) => x[1] - y[1]);
  let suivante = triees.findIndex((paire) => paire[1] > h);
  if (suivante < 0) suivante = 0;
  const apres = triees[suivante];
  const avant = triees[(suivante - 1 + triees.length) % triees.length];
  const position = ((h - avant[1] + 360) % 360) / ((apres[1] - avant[1] + 360) % 360);
  const deriveAvant = ecartAngulaire(avant[1], avant[2]);
  const deriveApres = ecartAngulaire(apres[1], apres[2]);
  return deriveAvant + (deriveApres - deriveAvant) * position;
}

/** Le seuil de chroma sous lequel une référence est presque grise, par défaut. */
export const CHROMA_GRISE = 0.03;

/**
 * Le préréglage Tailwind pour une référence (section 6.5). Une seule
 * évaluation de `deriveTailwind`, sur la teinte de la référence ([MOT-19]).
 * La dérive totale se répartit entre les deux bouts selon la place de la
 * référence dans la rampe, et chaque angle est arrondi au centième
 * ([MOT-27]). Une référence presque grise rend deux dérives nulles
 * ([MOT-18]).
 */
export function prereglageTailwind(
  reference: Oklch,
  bouts: Bouts,
  releve: readonly PaireDeDerive[] = RELEVE_TAILWIND,
  chromaGrise: number = CHROMA_GRISE,
): Derive {
  if (reference.C < chromaGrise) return { clair: 0, sombre: 0 };
  const totale = deriveTailwind(reference.H, releve);
  const place = Math.min(1, Math.max(0, (bouts.clair - reference.L) / (bouts.clair - bouts.sombre)));
  return {
    clair: arrondir(-totale * place, 2),
    sombre: arrondir(totale * (1 - place), 2),
  };
}

/** Le préréglage « Constante » : aucune dérive ([DER-11]). */
export const PREREGLAGE_CONSTANTE: Derive = { clair: 0, sombre: 0 };
