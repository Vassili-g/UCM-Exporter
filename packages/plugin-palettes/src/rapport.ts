/**
 * Le rapport de vérification ([VER-01], [VER-02]) : pour chaque palette et
 * chaque mode, chaque cran avec son hexa et ses contrastes, chaque promesse
 * avec sa paire, son contraste et son verdict, et chaque alerte avec sa
 * mesure. Il porte l'empreinte de la recette rangée qui l'a produit, et les
 * écarts de peinture du dernier dessin (L6.14). Les nombres sont ceux du
 * moteur, sans arrondi : un outil qui relit le rapport juge lui-même.
 */
import { aUneIntensite, lireHexa, mesurerCran, rampeDe, type Alerte, type Intensite, type Mode, type Profil, type Promesse, type Recette } from 'ucm-couleur';

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
  /** La référence d'avant le premier ajustement (W7), `null` sans ajustement. */
  readonly originale: string | null;
  /** Vrai pour une palette libre (W6) : ses crans sont ceux de sa liste, et elle n'a aucune promesse. */
  readonly libre: boolean;
  /** Le nombre d'intensités de la palette ([ENT-14]) : une rampe sans nom de profil, ou Soft et Vivid. */
  readonly intensites: 1 | 2;
  /** Les crans qui portent la référence exacte, et son profil pour une palette à deux intensités ([MOT-17]). */
  readonly ancrage: {
    readonly profil?: Profil;
    readonly rangs: { readonly [M in Mode]: number };
    readonly crans: { readonly [M in Mode]: number };
  };
  /** Par mode, la liste des crans d'une palette à une intensité, ou une liste par profil. */
  readonly crans: { readonly [M in Mode]: readonly CranDuRapport[] | { readonly [P in Profil]: readonly CranDuRapport[] } };
  readonly promesses: readonly Promesse[];
  readonly alertes: readonly Alerte[];
}

/**
 * La version de la forme du rapport (section 10.2). Un champ ajouté la garde ;
 * un champ ou un code d'alerte retiré ou renommé la monte. La 1, sans ce
 * champ, portait l'alerte `reference-plus-claire-que-bouton` ; la 2 donnait
 * toujours des crans et un ancrage par profil.
 */
export const FORMAT_DU_RAPPORT = 3;

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
      const cransDu = (mode: Mode, intensite: Intensite): CranDuRapport[] =>
        rampeDe(analyse.rampes, intensite)[mode].map((cran, rang) => {
          const mesure = mesurerCran(cran.couleur, fonds[mode], recette.seuils);
          return { cran: analyse.grille.crans[rang], hexa: cran.hexa, fond: mesure.fond, blanc: mesure.blanc, noir: mesure.noir };
        });
      // Une palette à une intensité n'a pas de profil : ses crans et son ancrage n'en nomment pas ([ENT-14]).
      const une = aUneIntensite(palette);
      const parMode = (mode: Mode) => (une ? cransDu(mode, 'unique') : { soft: cransDu(mode, 'soft'), vivid: cransDu(mode, 'vivid') });
      const { profil: porteur, ...ancrage } = analyse.ancrage;
      return {
        id: palette.id,
        nom: palette.nom ?? null,
        reference: palette.reference,
        originale: palette.originale ?? null,
        libre: analyse.libre,
        intensites: une ? 1 : 2,
        ancrage: porteur === 'unique' ? ancrage : { profil: porteur, ...ancrage },
        crans: { light: parMode('light'), dark: parMode('dark') },
        promesses: analyse.promesses,
        alertes: analyse.alertes,
      };
    }),
    ecartsDuDernierDessin,
  };
}
