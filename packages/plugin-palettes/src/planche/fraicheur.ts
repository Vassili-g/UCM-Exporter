/**
 * La fraîcheur de la planche ([PLA-19], [PLA-20]) : l'empreinte rangée sur
 * chaque cadre possédé, comparée à celle du modèle que la recette donne
 * aujourd'hui. S'y ajoutent les cadres orphelins ([ENT-03]) et les copies
 * ([PLA-25]). L'interface la calcule après chaque lecture et chaque rangement ;
 * elle ne redessine jamais.
 */
import type { Recette } from 'ucm-couleur';

import type { CadreLu, EtatDeLaPlanche, ProfilDuDocument } from '../lecture';
import { empreinteDuModele } from './modele';

export type EtatDuCadre = 'jamais-dessinee' | 'a-jour' | 'perimee';

export interface FraicheurDeLaPlanche {
  /** Une entrée par palette, dans l'ordre de la recette. */
  readonly palettes: readonly { readonly palette: string; readonly etat: EtatDuCadre; readonly cadre: string | null }[];
  /** Les cadres possédés dont la palette a quitté la recette. */
  readonly orphelins: readonly CadreLu[];
  /** Les copies de cadre faites par le designer. */
  readonly copies: readonly CadreLu[];
}

/**
 * Le modèle se recalcule avec la grille du cadre : elle entre dans
 * l'empreinte, et un cadre dessiné avec elle n'est pas périmé pour autant.
 */
export function fraicheurDeLaPlanche(recette: Recette, profil: ProfilDuDocument, planche: EtatDeLaPlanche): FraicheurDeLaPlanche {
  const possedes = new Map(planche.cadres.filter((cadre) => cadre.possede).map((cadre) => [cadre.palette, cadre]));
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  return {
    palettes: recette.palettes.map((palette) => {
      const cadre = possedes.get(palette.id);
      if (!cadre) return { palette: palette.id, etat: 'jamais-dessinee', cadre: null };
      const attendue = empreinteDuModele(recette, palette, profil, { grille: cadre.grille });
      return { palette: palette.id, etat: attendue === cadre.empreinte ? 'a-jour' : 'perimee', cadre: cadre.cadre };
    }),
    orphelins: planche.cadres.filter((cadre) => cadre.possede && !presentes.has(cadre.palette)),
    copies: planche.cadres.filter((cadre) => !cadre.possede),
  };
}
