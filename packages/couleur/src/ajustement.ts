/**
 * Ajuster la référence (W7) : la proposition à `pas` pas de 0,01 de
 * luminosité OKLCH de l'originale, chroma et teinte gardées. La chroma se
 * borne au plafond du gamut à la nouvelle luminosité, par la fabrication d'un
 * cran : garder la part de chroma de l'originale donnerait une autre couleur.
 */
import { rgb8VersOklch, type Rgb8 } from './conversions';
import { plafond, type Gamut } from './plafond';
import { fabriquerCran } from './rampe';

/** Le pas d'un ajustement, en luminosité OKLCH (réponse Q2 du mainteneur). */
export const PAS_D_AJUSTEMENT = 0.01;

/**
 * La couleur à `pas` pas de l'originale, ou `null` quand la luminosité
 * sortirait de [0, 1]. Zéro pas rend l'originale elle-même, octets compris.
 */
export function propositionDAjustement(originale: Rgb8, pas: number, gamut: Gamut): Rgb8 | null {
  if (pas === 0) return originale;
  const { L, C, H } = rgb8VersOklch(originale);
  const cible = L + pas * PAS_D_AJUSTEMENT;
  if (cible < 0 || cible > 1) return null;
  const maximum = plafond(cible, H, gamut);
  return fabriquerCran(cible, H, maximum > 0 ? Math.min(1, C / maximum) : 0, gamut).couleur;
}

/** Le nombre de pas qui mène de l'originale à `reference`, quand `reference` est bien une proposition ; sinon `null`. */
export function pasDepuisLOriginale(originale: Rgb8, reference: Rgb8, gamut: Gamut): number | null {
  const pas = Math.round((rgb8VersOklch(reference).L - rgb8VersOklch(originale).L) / PAS_D_AJUSTEMENT);
  const proposee = propositionDAjustement(originale, pas, gamut);
  return proposee && proposee.every((canal, rang) => canal === reference[rang]) ? pas : null;
}
