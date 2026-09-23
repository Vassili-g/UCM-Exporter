/**
 * Les alertes de la section 11.3 : une mesure qui franchit un seuil de
 * conception ([VER-08], [VER-10], [VER-11], [ENT-06]). Une alerte n'empêche
 * rien ; elle porte la mesure, le seuil et ce qu'ils visent, et l'interface
 * les met en mots.
 */
import { lireHexa, rgb8VersOklch, type Rgb8 } from './conversions';
import { distanceOk, partDeChroma } from './contraste';
import { cablageDe, estPresqueGrise, partsDe, rampesDe, referenceDe } from './palette';
import { decalagesDuRole } from './promesses';
import { arrondir, boutsDe, MODES, type Mode } from './rampe';
import { ROLES, type Palette, type Recette } from './recette';

/** Un cran où `soft` et `vivid` se confondent. */
export interface Confusion {
  readonly mode: Mode;
  readonly cran: number;
  readonly distance: number;
}

export type Alerte =
  | { readonly code: 'profils-confondus'; readonly palette: string; readonly crans: readonly Confusion[]; readonly seuil: number }
  | { readonly code: 'palettes-proches'; readonly palettes: readonly [string, string]; readonly distance: number; readonly seuil: number }
  | { readonly code: 'couleur-presque-grise'; readonly palette: string; readonly chroma: number; readonly seuil: number }
  | { readonly code: 'reference-plus-terne'; readonly palette: string; readonly part: number; readonly partSoft: number }
  | { readonly code: 'reference-plus-vive'; readonly palette: string; readonly part: number; readonly partVivid: number }
  | { readonly code: 'reference-hors-rampe'; readonly palette: string; readonly clarte: number; readonly boutClair: number; readonly boutSombre: number }
  | { readonly code: 'fond-hors-courbe'; readonly mode: Mode; readonly clarte: number; readonly cran: number };

/** La tolérance sur la clarté d'un fond : `#121212` vaut 0,1822 contre une courbe à 0,18 ([ENT-06]). */
export const TOLERANCE_FOND = 0.005;

/** Les crans où l'on compare les deux profils pour juger deux palettes proches. */
export const CRANS_PALETTES_PROCHES: readonly number[] = [500, 600, 700];

/**
 * Les rangs de crans que le câblage d'une palette vise, états `+1` et `+2`
 * compris quand le rôle les prend dans une paire ([VER-11]).
 */
export function rangsCables(recette: Recette, palette: Palette): number[] {
  const cablage = cablageDe(recette, palette);
  const rangs = new Set<number>();
  for (const role of ROLES) {
    const cible = cablage[role];
    if (!('cran' in cible)) continue;
    const rang = recette.crans.indexOf(cible.cran);
    for (const decalage of decalagesDuRole(role)) {
      if (rang + decalage < recette.crans.length) rangs.add(rang + decalage);
    }
  }
  return [...rangs].sort((a, b) => a - b);
}

function profilsConfondus(recette: Recette, palette: Palette): Alerte | null {
  // Des parts `grise` rendent les deux profils égaux par construction ([ENT-09]).
  if (palette.parts?.origine === 'grise') return null;
  const rampes = rampesDe(recette, palette);
  const crans: Confusion[] = [];
  for (const mode of MODES) {
    for (const rang of rangsCables(recette, palette)) {
      const distance = distanceOk(rampes.soft[mode][rang].couleur, rampes.vivid[mode][rang].couleur);
      if (distance < recette.seuils.profilsConfondus) crans.push({ mode, cran: recette.crans[rang], distance });
    }
  }
  return crans.length > 0
    ? { code: 'profils-confondus', palette: palette.id, crans, seuil: recette.seuils.profilsConfondus }
    : null;
}

/** Les alertes et la notice qui portent sur une palette seule, dans l'ordre de la table 11.3. */
export function alertesDePalette(recette: Recette, palette: Palette): Alerte[] {
  const alertes: Alerte[] = [];
  const reference: Rgb8 = referenceDe(palette);
  const lue = rgb8VersOklch(reference);
  const parts = partsDe(recette, palette);
  // La part se compare au millième, la précision à laquelle une part se range ([MOT-27]).
  const part = arrondir(partDeChroma(reference, recette.gamut), 3);
  const bouts = boutsDe(recette.courbes);

  const confondus = profilsConfondus(recette, palette);
  if (confondus) alertes.push(confondus);
  if (estPresqueGrise(recette, palette)) {
    alertes.push({ code: 'couleur-presque-grise', palette: palette.id, chroma: lue.C, seuil: recette.seuils.chromaGrise });
  }
  if (part < parts.soft) alertes.push({ code: 'reference-plus-terne', palette: palette.id, part, partSoft: parts.soft });
  if (part > parts.vivid) alertes.push({ code: 'reference-plus-vive', palette: palette.id, part, partVivid: parts.vivid });
  if (lue.L > bouts.clair || lue.L < bouts.sombre) {
    alertes.push({ code: 'reference-hors-rampe', palette: palette.id, clarte: lue.L, boutClair: bouts.clair, boutSombre: bouts.sombre });
  }
  return alertes;
}

/** La distance moyenne de deux palettes sur les crans 500, 600 et 700 de `vivid`, en clair ; `null` si un cran manque. */
export function distanceDePalettes(recette: Recette, a: Palette, b: Palette): number | null {
  const rangs = CRANS_PALETTES_PROCHES.map((cran) => recette.crans.indexOf(cran));
  if (rangs.some((rang) => rang < 0)) return null;
  const rampesA = rampesDe(recette, a).vivid.light;
  const rampesB = rampesDe(recette, b).vivid.light;
  const somme = rangs.reduce((total, rang) => total + distanceOk(rampesA[rang].couleur, rampesB[rang].couleur), 0);
  return somme / rangs.length;
}

/** Un fond plus sombre que le cran 50 clair, ou plus clair que le cran 50 sombre, à 0,005 près ([ENT-06]). */
function fondsHorsCourbe(recette: Recette): Alerte[] {
  const alertes: Alerte[] = [];
  for (const mode of MODES) {
    const fond = lireHexa(recette.fonds[mode]);
    if (!fond) continue;
    const clarte = rgb8VersOklch(fond).L;
    const cran = recette.courbes[mode][0];
    const hors = mode === 'light' ? clarte < cran - TOLERANCE_FOND : clarte > cran + TOLERANCE_FOND;
    if (hors) alertes.push({ code: 'fond-hors-courbe', mode, clarte, cran });
  }
  return alertes;
}

/**
 * Toutes les alertes d'une recette : ses fonds, chaque palette dans l'ordre de
 * la recette, puis chaque paire de palettes proches.
 */
export function alertesDeRecette(recette: Recette): Alerte[] {
  const alertes = fondsHorsCourbe(recette);
  for (const palette of recette.palettes) alertes.push(...alertesDePalette(recette, palette));
  recette.palettes.forEach((a, rang) => {
    for (const b of recette.palettes.slice(rang + 1)) {
      const distance = distanceDePalettes(recette, a, b);
      if (distance !== null && distance < recette.seuils.palettesProches) {
        alertes.push({ code: 'palettes-proches', palettes: [a.id, b.id], distance, seuil: recette.seuils.palettesProches });
      }
    }
  });
  return alertes;
}
