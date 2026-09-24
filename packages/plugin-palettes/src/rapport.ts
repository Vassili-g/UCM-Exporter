/**
 * Le rapport de vérification ([VER-01], [VER-02]) : pour chaque palette et
 * chaque mode, chaque cran avec son hexa et ses contrastes, chaque promesse
 * avec sa paire, son contraste et son verdict, et chaque alerte avec sa
 * mesure. Il porte l'empreinte de la recette rangée qui l'a produit, et les
 * écarts de peinture du dernier dessin (L6.14). Les nombres sont ceux du
 * moteur, sans arrondi : un outil qui relit le rapport juge lui-même.
 */
import { lireHexa, mesurerCran, type Alerte, type Ancrage, type Mode, type Profil, type Promesse, type Recette } from 'ucm-couleur';

import { analyserPalette } from './analyse';
import type { ProfilDuDocument } from './lecture';
import type { EcartDePeinture } from './planche/peints';

export interface CranDuRapport {
  readonly cran: number;
  readonly hexa: string;
  /** Contrastes contre le fond de référence du mode, le blanc et le noir. */
  readonly fond: number;
  readonly blanc: number;
  readonly noir: number;
}

export interface PaletteDuRapport {
  readonly id: string;
  readonly nom: string | null;
  readonly reference: string;
  /** Le profil et les crans qui portent la référence exacte ([MOT-17]). */
  readonly ancrage: Ancrage;
  readonly crans: { readonly [M in Mode]: { readonly [P in Profil]: readonly CranDuRapport[] } };
  readonly promesses: readonly Promesse[];
  readonly alertes: readonly Alerte[];
}

/**
 * La version de la forme du rapport (section 10.2). Un champ ajouté la garde ;
 * un champ ou un code d'alerte retiré ou renommé la monte. La 1, sans ce
 * champ, portait l'alerte `reference-plus-claire-que-bouton`.
 */
export const FORMAT_DU_RAPPORT = 2;

export interface Rapport {
  readonly formatDuRapport: number;
  /** L'empreinte du texte rangé de la recette qui a produit ce rapport ([VER-02]). */
  readonly empreinte: string | null;
  readonly formatVersion: number;
  /** Le profil de couleur du document, dans lequel la planche peint ses couleurs (section 6.7). */
  readonly profilDuDocument: ProfilDuDocument;
  readonly fonds: Recette['fonds'];
  readonly seuils: Recette['seuils'];
  readonly palettes: readonly PaletteDuRapport[];
  /** Les écarts de peinture du dernier dessin ; `null` quand aucun dessin n'a eu lieu depuis l'ouverture du plugin. */
  readonly ecartsDuDernierDessin: readonly EcartDePeinture[] | null;
}

export function rapportDeLaRecette(
  recette: Recette,
  empreinte: string | null,
  profil: ProfilDuDocument,
  ecartsDuDernierDessin: readonly EcartDePeinture[] | null,
): Rapport {
  const fonds = { light: lireHexa(recette.fonds.light)!, dark: lireHexa(recette.fonds.dark)! };
  return {
    formatDuRapport: FORMAT_DU_RAPPORT,
    empreinte,
    formatVersion: recette.formatVersion,
    profilDuDocument: profil,
    fonds: recette.fonds,
    seuils: recette.seuils,
    palettes: recette.palettes.map((palette) => {
      const analyse = analyserPalette(recette, palette);
      const cransDu = (mode: Mode, profilDeRampe: Profil): CranDuRapport[] =>
        analyse.rampes[profilDeRampe][mode].map((cran, rang) => {
          const mesure = mesurerCran(cran.couleur, fonds[mode], recette.seuils);
          return { cran: recette.crans[rang], hexa: cran.hexa, fond: mesure.fond, blanc: mesure.blanc, noir: mesure.noir };
        });
      const parMode = (mode: Mode) => ({ soft: cransDu(mode, 'soft'), vivid: cransDu(mode, 'vivid') });
      return {
        id: palette.id,
        nom: palette.nom ?? null,
        reference: palette.reference,
        ancrage: analyse.ancrage,
        crans: { light: parMode('light'), dark: parMode('dark') },
        promesses: analyse.promesses,
        alertes: analyse.constats.flatMap((constat) => ('alerte' in constat ? [constat.alerte] : [])),
      };
    }),
    ecartsDuDernierDessin,
  };
}
