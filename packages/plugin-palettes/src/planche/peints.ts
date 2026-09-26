/**
 * La comparaison entre les couleurs que le sandbox relit sur la planche et
 * celles de l'aperçu (L6.14). Les deux viennent du même moteur et de la même
 * recette : un écart attendu vaut zéro, et tout écart se signale.
 */
import { MODES, grilleDe, intensitesDe, rampeDe, rampesDe, type Recette } from 'ucm-couleur';

import type { CouleurPeinte } from '../ecriture/planche';
import { nomDePastille } from './modele';

export interface EcartDePeinture {
  readonly palette: string;
  /** Le nom de la pastille, `vivid/light/700` ou `light/700` par exemple ([PLA-14]). */
  readonly nom: string;
  /** L'hexa de l'aperçu, `null` quand la recette n'a pas cette pastille. */
  readonly apercu: string | null;
  readonly peint: string;
}

export function ecartsDePeinture(recette: Recette, peints: readonly CouleurPeinte[]): EcartDePeinture[] {
  const apercus = new Map<string, string>();
  for (const palette of recette.palettes) {
    const rampes = rampesDe(recette, palette);
    const { crans } = grilleDe(recette, palette);
    for (const intensite of intensitesDe(palette)) {
      for (const mode of MODES) {
        rampeDe(rampes, intensite)[mode].forEach((cran, rang) => apercus.set(`${palette.id} ${nomDePastille(intensite, mode, crans[rang])}`, cran.hexa));
      }
    }
  }
  return peints.flatMap((peinte) => {
    const apercu = apercus.get(`${peinte.palette} ${peinte.nom}`) ?? null;
    return apercu === peinte.hexa ? [] : [{ palette: peinte.palette, nom: peinte.nom, apercu, peint: peinte.hexa }];
  });
}
