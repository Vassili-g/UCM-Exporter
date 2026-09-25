/**
 * La garantie des courbes ([ENT-10]) : le cran de `border-control` tient le
 * seuil non textuel et le cran de `text` le seuil textuel contre le cran 50 de
 * la même courbe, gris, pour toute teinte, les deux profils et les deux
 * modes, sur les couleurs à 8 bits. Une courbe éditée qui ne la tient plus
 * sonne « courbe hors garantie ». L'alerte n'empêche ni le rangement ni le
 * dessin.
 */
import { atteintLeSeuil, contraste } from './contraste';
import { TABLE_DES_EMPLOIS, rangDuCranLeger } from './emplois';
import { fabriquerCran, MODES, PROFILS, type Mode, type Profil } from './rampe';
import type { Recette } from './recette';

/** Le pire cas d'un cran qui ne tient plus son seuil. */
export interface ManqueDeGarantie {
  readonly mode: Mode;
  readonly cran: number;
  readonly profil: Profil;
  /** La teinte entière du pire cas, en degrés. */
  readonly teinte: number;
  readonly contraste: number;
  readonly seuil: number;
}

/** Les crans garantis, et le seuil que chacun tient contre le cran 50. */
function cransGarantis(recette: Recette): { cran: number; seuil: number }[] {
  return [
    { cran: TABLE_DES_EMPLOIS['border-control'], seuil: recette.seuils.nonTexte },
    { cran: TABLE_DES_EMPLOIS.text, seuil: recette.seuils.texte },
  ];
}

/**
 * Les manques de la garantie, un par mode, cran et profil qui échoue, portant
 * la teinte du pire cas. Une liste vide dit que les courbes tiennent.
 */
export function garantieDesCourbes(recette: Recette): ManqueDeGarantie[] {
  const manques: ManqueDeGarantie[] = [];
  for (const mode of MODES) {
    const courbe = recette.courbes[mode];
    const fond = fabriquerCran(courbe[rangDuCranLeger(recette.crans)], 0, 0, recette.gamut).couleur;
    for (const { cran, seuil } of cransGarantis(recette)) {
      const L = courbe[recette.crans.indexOf(cran)];
      for (const profil of PROFILS) {
        const part = recette.profils[profil].part;
        let pire = { teinte: 0, contraste: Infinity };
        for (let teinte = 0; teinte < 360; teinte += 1) {
          const valeur = contraste(fabriquerCran(L, teinte, part, recette.gamut).couleur, fond);
          if (valeur < pire.contraste) pire = { teinte, contraste: valeur };
        }
        if (!atteintLeSeuil(pire.contraste, seuil)) manques.push({ mode, cran, profil, ...pire, seuil });
      }
    }
  }
  return manques;
}
