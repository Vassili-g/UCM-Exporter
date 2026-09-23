/**
 * L'éditeur de dérive (section 12), déplié sous sa ligne par « Régler » (E22) :
 * le graphe, et la note d'un bout que la référence dépasse ([DER-14]).
 */
import { referenceDe, rgb8VersOklch, type Cran, type Palette, type Profil, type Recette } from 'ucm-couleur';

import { TEXTES_DE_LA_DERIVE } from '../textes';
import { createGraphe } from './graphe';

export interface EditeurUi {
  element: HTMLDivElement;
  afficher(recette: Recette, palette: Palette, rampe: readonly Cran[]): void;
}

export function createEditeur(): EditeurUi {
  const element = document.createElement('div');
  element.className = 'editeur-derive';
  const graphe = createGraphe();
  const note = document.createElement('p');
  note.className = 'ligne-secondaire';
  element.append(graphe.element, note);

  /** Le profil dont les poignées se règlent ; `vivid` tant que les profils sont liés. */
  const profil: Profil = 'vivid';

  return {
    element,
    afficher(recette, palette, rampe) {
      graphe.afficher({ recette, palette, profil, rampe });
      const clarte = rgb8VersOklch(referenceDe(palette)).L;
      const courbe = recette.courbes.light;
      note.textContent = clarte > courbe[0]
        ? TEXTES_DE_LA_DERIVE.sansSegmentClair
        : clarte < courbe[courbe.length - 1] ? TEXTES_DE_LA_DERIVE.sansSegmentSombre : '';
      note.hidden = note.textContent === '';
    },
  };
}
