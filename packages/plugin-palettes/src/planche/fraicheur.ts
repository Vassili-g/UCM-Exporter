/**
 * La fraîcheur de la planche ([PLA-19], [PLA-20]) : l'empreinte rangée sur
 * chaque cadre possédé, comparée à celle du modèle que la recette donne
 * aujourd'hui. S'y ajoutent les cadres orphelins ([ENT-03]) et les copies
 * ([PLA-25]). L'interface la calcule après chaque lecture et chaque rangement ;
 * elle ne redessine jamais.
 *
 * Un cadre rangé que la lecture ne retrouve pas n'est pas « jamais généré » :
 * il est introuvable, ou illisible quand Figma a refusé de le lire (V8.2).
 */
import type { Recette } from 'ucm-couleur';

import type { CadreLu, EtatDeLaPlanche, ProfilDuDocument } from '../lecture';
import { empreinteDuModele } from './modele';

export type EtatDuCadre = 'jamais-dessinee' | 'a-jour' | 'perimee' | 'introuvable' | 'illisible';

/** L'état du cadre d'une palette, et où il se trouve quand il est localisé. */
export interface CadreDUnePalette {
  readonly etat: EtatDuCadre;
  readonly cadre: string | null;
  readonly page: string | null;
  readonly nomDeLaPage: string | null;
}

export interface FraicheurDeLaPlanche {
  /** Une entrée par palette, dans l'ordre de la recette. */
  readonly palettes: readonly ({ readonly palette: string } & CadreDUnePalette)[];
  /** Les cadres possédés dont la palette a quitté la recette. */
  readonly orphelins: readonly CadreLu[];
  /** Les copies de cadre faites par le designer. */
  readonly copies: readonly CadreLu[];
}

/**
 * Le cadre d'une seule palette : ce que l'onglet Palettes montre à côté de
 * « Générer sur Figma » ([UI-05]). Le calcul reconstruit le modèle de ce seul
 * cadre. Le modèle attendu porte la grille des contrastes, que chaque
 * génération dessine (section 9.5) : un cadre dessiné sans elle est à mettre
 * à jour.
 */
export function fraicheurDUnePalette(recette: Recette, profil: ProfilDuDocument, planche: EtatDeLaPlanche, id: string): CadreDUnePalette {
  const palette = recette.palettes.find((candidate) => candidate.id === id);
  const cadre = planche.cadres.find((candidat) => candidat.possede && candidat.palette === id);
  if (palette && cadre) {
    const attendue = empreinteDuModele(recette, palette, profil, { grille: true });
    return { etat: attendue === cadre.empreinte ? 'a-jour' : 'perimee', cadre: cadre.cadre, page: cadre.page, nomDeLaPage: cadre.nomDeLaPage };
  }
  const manquant = planche.manquants.find((candidat) => candidat.palette === id);
  return { etat: manquant ? manquant.raison : 'jamais-dessinee', cadre: null, page: null, nomDeLaPage: null };
}

export function fraicheurDeLaPlanche(recette: Recette, profil: ProfilDuDocument, planche: EtatDeLaPlanche): FraicheurDeLaPlanche {
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  return {
    palettes: recette.palettes.map((palette) => ({ palette: palette.id, ...fraicheurDUnePalette(recette, profil, planche, palette.id) })),
    orphelins: planche.cadres.filter((cadre) => cadre.possede && !presentes.has(cadre.palette)),
    copies: planche.cadres.filter((cadre) => !cadre.possede),
  };
}
