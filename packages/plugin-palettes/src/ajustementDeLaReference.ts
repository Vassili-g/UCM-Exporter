/**
 * Ce que le panneau « Ajuster la référence » calcule (W7, section 3 de la
 * conception du format 3), sans DOM : le pas de départ, la proposition d'un
 * pas, la nuance qu'elle vise dans chaque thème, l'annonce d'un pas qui
 * changerait ce numéro, et les garanties avant et après. Rien ne se range
 * ici : seul « Appliquer » change la palette, par `appliquerLAjustement`.
 */
import {
  MODES,
  ancrageDe,
  ecrireHexa,
  lireHexa,
  pasDepuisLOriginale,
  propositionDAjustement,
  verifierPromesses,
  type Mode,
  type Palette,
  type Profil,
  type Promesse,
  type Recette,
} from 'ucm-couleur';

import { appliquerLAjustement, originaleDe } from './edition';

/**
 * Le pas à l'ouverture du panneau : 0 sur une palette jamais ajustée, sinon le
 * pas qui mène de l'originale à la référence, quand la référence en est une
 * proposition. Une référence saisie ailleurs repart de 0.
 */
export function pasALOuverture(recette: Recette, palette: Palette): number {
  if (!palette.originale) return 0;
  const originale = lireHexa(palette.originale);
  const reference = lireHexa(palette.reference);
  if (!originale || !reference) return 0;
  return pasDepuisLOriginale(originale, reference, recette.gamut) ?? 0;
}

/** La proposition à `pas` pas de l'originale, en hexa, ou `null` quand la luminosité sortirait de [0, 1]. */
export function propositionAuPas(recette: Recette, palette: Palette, pas: number): string | null {
  const originale = lireHexa(originaleDe(palette));
  if (!originale) return null;
  const proposee = propositionDAjustement(originale, pas, recette.gamut);
  return proposee ? ecrireHexa(proposee) : null;
}

/** Le pas le plus proche d'un code saisi dans le panneau : le pas suivant repart de sa luminosité. */
export function pasLePlusProche(recette: Recette, palette: Palette, hexa: string): number {
  const originale = lireHexa(originaleDe(palette));
  const saisie = lireHexa(hexa);
  if (!originale || !saisie) return 0;
  const exact = pasDepuisLOriginale(originale, saisie, recette.gamut);
  if (exact !== null) return exact;
  let meilleur = 0;
  let ecart = Infinity;
  for (let pas = -100; pas <= 100; pas += 1) {
    const proposee = propositionDAjustement(originale, pas, recette.gamut);
    if (!proposee) continue;
    const distance = proposee.reduce((total, canal, rang) => total + Math.abs(canal - saisie[rang]), 0);
    if (distance < ecart) {
      ecart = distance;
      meilleur = pas;
    }
  }
  return meilleur;
}

/** La palette telle qu'« Appliquer » la rangerait, ou `null` pour un hexa illisible. */
export function paletteAjustee(recette: Recette, palette: Palette, proposition: string): Palette | null {
  return appliquerLAjustement(recette, palette, proposition);
}

/** La nuance qui porterait la référence dans chaque thème. */
export function nuancesVisees(recette: Recette, palette: Palette): { readonly [M in Mode]: number } {
  return ancrageDe(recette, palette).crans;
}

/** Un thème où le pas voisin changerait le numéro de la référence, et le numéro qu'il prendrait. */
export interface ChangementDeNuance {
  readonly mode: Mode;
  readonly numero: number;
}

/**
 * Ce que le pas voisin, `sens` vaut −1 ou +1, ferait au numéro de la
 * référence : la liste des thèmes où il change, vide sinon, `null` quand ce
 * pas sortirait de [0, 1]. Le panneau l'annonce sous le bouton, avant le clic.
 */
export function changementAuPasVoisin(recette: Recette, palette: Palette, pas: number, sens: -1 | 1): ChangementDeNuance[] | null {
  const actuelle = propositionAuPas(recette, palette, pas);
  const voisine = propositionAuPas(recette, palette, pas + sens);
  if (!actuelle || !voisine) return null;
  const avant = paletteAjustee(recette, palette, actuelle);
  const apres = paletteAjustee(recette, palette, voisine);
  if (!avant || !apres) return null;
  const cransAvant = nuancesVisees(recette, avant);
  const cransApres = nuancesVisees(recette, apres);
  return MODES.filter((mode) => cransAvant[mode] !== cransApres[mode]).map((mode) => ({ mode, numero: cransApres[mode] }));
}

/** Les garanties manquées de chaque profil, les deux thèmes comptés. */
export function manqueesParProfil(recette: Recette, palette: Palette): { readonly [P in Profil]: number } {
  const promesses = verifierPromesses(recette, palette);
  const compte = (profil: Profil) => promesses.filter((promesse) => promesse.profil === profil && promesse.verdict === 'manquee').length;
  return { soft: compte('soft'), vivid: compte('vivid') };
}

/** Une garantie qui change avec l'ajustement, ou reste manquée : son état avant et après. */
export interface GarantieComparee {
  readonly avant: Promesse;
  readonly apres: Promesse;
}

/**
 * Les garanties à montrer dans le panneau : celles qui sont manquées avant ou
 * après la proposition, dans l'ordre du moteur. Une garantie tenue des deux
 * côtés ne se montre pas.
 */
export function garantiesComparees(recette: Recette, avant: Palette, apres: Palette): GarantieComparee[] {
  const promessesAvant = verifierPromesses(recette, avant);
  const promessesApres = verifierPromesses(recette, apres);
  return promessesAvant.flatMap((promesse, rang) => {
    const suivante = promessesApres[rang];
    if (!suivante || (promesse.verdict === 'tenue' && suivante.verdict === 'tenue')) return [];
    return [{ avant: promesse, apres: suivante }];
  });
}
