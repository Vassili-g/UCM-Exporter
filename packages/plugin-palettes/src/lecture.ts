/**
 * Ce que le plugin lit du document : la recette rangée, classée avant tout
 * emploi ([REC-03]), son empreinte, et le profil de couleur du document.
 * Rien ici n'écrit.
 */
import { classerRecette, fnv1a, octetsUtf8, type Classement } from 'ucm-couleur';

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

/** Lit la recette rangée et le profil du document. */
export function lireEtat(document: DocumentLu): EtatLu {
  const texte = document.getSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE);
  return {
    classement: classerRecette(texte),
    empreinte: empreinteDuTexte(texte),
    profil: document.documentColorProfile,
  };
}
