/**
 * Ce que le plugin lit du document : la recette rangée, classée avant tout
 * emploi ([REC-03]), son empreinte, le profil de couleur du document, et la
 * couleur de la sélection. Rien ici n'écrit.
 */
import { classerRecette, ecrireHexa, fnv1a, octetsUtf8, p3VersRgb8, type Classement } from 'ucm-couleur';

/** L'espace de noms partagé : il survit à un changement d'identifiant du plugin ([REC-01]). */
export const ESPACE_PARTAGE = 'ucm_palettes';

/** La clé de la recette dans l'espace partagé. */
export const CLE_RECETTE = 'recette';

export type ProfilDuDocument = DocumentNode['documentColorProfile'];

/** Ce que la lecture demande au document, pour se tester sans Figma. */
export interface DocumentLu {
  getSharedPluginData(espace: string, cle: string): string;
  readonly documentColorProfile: ProfilDuDocument;
}

/** L'état lu : la recette classée, l'empreinte du texte rangé, et le profil. */
export interface EtatLu {
  readonly classement: Classement;
  readonly empreinte: string | null;
  readonly profil: ProfilDuDocument;
}

/**
 * L'empreinte du texte rangé, `null` sans recette. Elle porte sur les octets
 * du texte tel qu'il est rangé : un texte modifié hors du plugin change donc
 * d'empreinte, même s'il reste une recette valide.
 */
export function empreinteDuTexte(texte: string): string | null {
  return texte === '' ? null : fnv1a(octetsUtf8(texte));
}

/** La couleur proposée par la sélection, ou la raison de son absence ([ENT-04]). */
export type LectureDeSelection =
  | { readonly hexa: string; readonly ramenee: boolean }
  | { readonly raison: 'vide' | 'sans-remplissage-uni' };

/** Ce que la lecture demande à une peinture ; `figma.mixed` n'est pas un tableau. */
interface PeintureLue {
  readonly type: string;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly color?: { readonly r: number; readonly g: number; readonly b: number };
}

/**
 * La première peinture `SOLID` visible et d'opacité 1 des calques
 * sélectionnés. Dans un document `DISPLAY_P3`, ses composantes sont en P3 :
 * elles passent en sRGB, et `ramenee` dit qu'une composante sortait du gamut
 * (E10, [MOT-26]). Ailleurs, elles sont déjà en sRGB.
 */
export function couleurDeLaSelection(
  noeuds: readonly object[],
  profil: ProfilDuDocument,
): LectureDeSelection {
  if (noeuds.length === 0) return { raison: 'vide' };
  for (const noeud of noeuds) {
    const fills = (noeud as { fills?: unknown }).fills;
    if (!Array.isArray(fills)) continue;
    const peinture = (fills as PeintureLue[]).find((candidate) =>
      candidate.type === 'SOLID' && candidate.visible !== false && (candidate.opacity ?? 1) === 1 && candidate.color);
    if (!peinture?.color) continue;
    const { r, g, b } = peinture.color;
    if (profil === 'DISPLAY_P3') {
      const lue = p3VersRgb8([r, g, b]);
      return { hexa: ecrireHexa(lue.couleur), ramenee: lue.ramenee };
    }
    return { hexa: ecrireHexa([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]), ramenee: false };
  }
  return { raison: 'sans-remplissage-uni' };
}

/** Lit la recette rangée et le profil du document. */
export function lireEtat(document: DocumentLu): EtatLu {
  const texte = document.getSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE);
  return {
    classement: classerRecette(texte),
    empreinte: empreinteDuTexte(texte),
    profil: document.documentColorProfile,
  };
}
