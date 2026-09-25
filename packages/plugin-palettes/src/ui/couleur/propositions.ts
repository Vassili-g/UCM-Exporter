/**
 * Les pastilles que le sélecteur de couleur propose, validées en W3.1 : sur la
 * référence, les nuances Vivid de la palette ouverte ; sur un fond, les deux
 * fonds par défaut, le blanc et les deux premières nuances Vivid du thème.
 */
import { recetteParDefaut, type Mode, type Rampes, type Recette } from 'ucm-couleur';

import { TEXTES_DU_SELECTEUR } from '../textes';
import type { PastilleProposee } from './selecteur';

const VIVID = 'Vivid';

export function nuancesProposees(recette: Recette, rampes: Rampes, mode: Mode): PastilleProposee[] {
  return rampes.vivid[mode].map((cran, rang) => ({ hexa: cran.hexa, titre: TEXTES_DU_SELECTEUR.nuance(VIVID, recette.crans[rang]) }));
}

/** `rampes` est absent quand aucune palette n'est ouverte : seuls les fonds et le blanc restent. */
export function fondsProposes(recette: Recette, rampes: Rampes | null, mode: Mode): PastilleProposee[] {
  const { fonds } = recetteParDefaut();
  return [
    { hexa: fonds.light, titre: TEXTES_DU_SELECTEUR.fondParDefaut('light') },
    { hexa: fonds.dark, titre: TEXTES_DU_SELECTEUR.fondParDefaut('dark') },
    { hexa: '#FFFFFF', titre: TEXTES_DU_SELECTEUR.blanc },
    ...(rampes ? nuancesProposees(recette, rampes, mode).slice(0, 2) : []),
  ];
}
