/**
 * Les pastilles que le sélecteur de couleur propose, validées en W3.1 : sur la
 * référence, les nuances Vivid de la palette ouverte, ou celles de sa rampe
 * unique ([ENT-14]) ; sur un fond, les deux fonds par défaut, le blanc et les
 * deux premières de ces nuances dans le thème.
 */
import { rampeDe, recetteParDefaut, type Mode } from 'ucm-couleur';

import type { AnalyseDePalette } from '../../analyse';
import { TEXTES_DU_SELECTEUR } from '../textes';
import type { PastilleProposee } from './selecteur';

/** Les nuances Vivid de la palette, ou de sa rampe unique, nommées par les numéros de sa liste, commune ou libre. */
export function nuancesProposees(analyse: AnalyseDePalette, mode: Mode): PastilleProposee[] {
  const unique = !analyse.intensites.includes('vivid');
  const rampe = rampeDe(analyse.rampes, unique ? 'unique' : 'vivid')[mode];
  return rampe.map((cran, rang) => ({ hexa: cran.hexa, titre: TEXTES_DU_SELECTEUR.nuance(unique ? 'Nuance' : 'Vivid', analyse.grille.crans[rang]) }));
}

/** `analyse` est absente quand aucune palette n'est ouverte : seuls les fonds et le blanc restent. */
export function fondsProposes(analyse: AnalyseDePalette | null, mode: Mode): PastilleProposee[] {
  const { fonds } = recetteParDefaut();
  return [
    { hexa: fonds.light, titre: TEXTES_DU_SELECTEUR.fondParDefaut('light') },
    { hexa: fonds.dark, titre: TEXTES_DU_SELECTEUR.fondParDefaut('dark') },
    { hexa: '#FFFFFF', titre: TEXTES_DU_SELECTEUR.blanc },
    ...(analyse ? nuancesProposees(analyse, mode).slice(0, 2) : []),
  ];
}
