/**
 * Ce que le plugin lit du document : la recette rangée, classée avant tout
 * emploi ([REC-03]), son empreinte, le profil de couleur du document, les
 * cadres de la planche et la couleur de la sélection. Rien ici n'écrit.
 */
import { classerRecette, ecrireHexa, fnv1a, octetsUtf8, p3VersRgb8, type Classement } from 'ucm-couleur';

/** L'espace de noms partagé : il survit à un changement d'identifiant du plugin ([REC-01]). */
export const ESPACE_PARTAGE = 'ucm_palettes';

/** La clé de la recette dans l'espace partagé. */
export const CLE_RECETTE = 'recette';

/**
 * La clé de la planche : la page et les cadres dessinés. Elle vit hors de la
 * recette, dont un dessin changerait sinon l'empreinte (E1). L'export l'ignore.
 */
export const CLE_PLANCHE = 'planche';

/** Ce que la planche range : sa page, et le cadre de chaque palette dessinée. */
export interface PlancheRangee {
  readonly page: string | null;
  readonly cadres: { readonly [palette: string]: string };
}

/** La planche rangée ; illisible ou absente, une planche vide, que le prochain dessin remplace. */
export function lirePlanche(racine: { getSharedPluginData(espace: string, cle: string): string }): PlancheRangee {
  const vide: PlancheRangee = { page: null, cadres: {} };
  const texte = racine.getSharedPluginData(ESPACE_PARTAGE, CLE_PLANCHE);
  if (texte === '') return vide;
  try {
    const lue = JSON.parse(texte) as { page?: unknown; cadres?: unknown };
    const page = typeof lue.page === 'string' ? lue.page : null;
    const cadres: Record<string, string> = {};
    if (lue.cadres && typeof lue.cadres === 'object') {
      for (const [palette, cadre] of Object.entries(lue.cadres as Record<string, unknown>)) {
        if (typeof cadre === 'string') cadres[palette] = cadre;
      }
    }
    return { page, cadres };
  } catch {
    return vide;
  }
}

/** Les données de plugin qu'un cadre de palette porte ([PLA-02], [PLA-19]). */
export const CLES_DU_CADRE = { cadre: 'cadre', proprietaire: 'proprietaire', empreinte: 'empreinte', grille: 'grille' } as const;

/** Un cadre de premier niveau de la planche qui porte l'identifiant d'une palette. */
export interface CadreLu {
  readonly palette: string;
  readonly cadre: string;
  readonly nom: string;
  /** L'empreinte du modèle au moment du dessin ([PLA-19]). */
  readonly empreinte: string;
  /** Vrai quand le cadre a été dessiné avec la grille de contraste, qui entre dans l'empreinte. */
  readonly grille: boolean;
  /** Faux pour une copie faite par le designer, que le plugin ne réécrit jamais ([PLA-25], E15). */
  readonly possede: boolean;
}

/** La planche telle que la page la porte : sa page, `null` sans planche, et ses cadres de palette. */
export interface EtatDeLaPlanche {
  readonly page: string | null;
  readonly cadres: readonly CadreLu[];
}

/** Ce que la lecture demande à un nœud de premier niveau de la page. */
interface NoeudDePage {
  readonly type: string;
  readonly id: string;
  readonly name: string;
  getSharedPluginData(espace: string, cle: string): string;
}

/** Les cadres de palette parmi les enfants de la page ; un cadre sans identifiant de palette est au designer. */
export function cadresDeLaPage(enfants: readonly NoeudDePage[]): CadreLu[] {
  const cadres: CadreLu[] = [];
  for (const noeud of enfants) {
    if (noeud.type !== 'FRAME') continue;
    const donnee = (cle: string) => noeud.getSharedPluginData(ESPACE_PARTAGE, cle);
    const palette = donnee(CLES_DU_CADRE.cadre);
    if (!palette) continue;
    cadres.push({
      palette,
      cadre: noeud.id,
      nom: noeud.name,
      empreinte: donnee(CLES_DU_CADRE.empreinte),
      grille: donnee(CLES_DU_CADRE.grille) === '1',
      possede: donnee(CLES_DU_CADRE.proprietaire) === noeud.id,
    });
  }
  return cadres;
}

/** Ce que la lecture de la planche demande à Figma. */
export interface FigmaDeLaLecture {
  readonly root: { getSharedPluginData(espace: string, cle: string): string };
  getNodeByIdAsync(id: string): Promise<unknown>;
}

/**
 * La page de la planche et ses cadres de palette. Seule la page rangée se
 * charge ([PLA-01], E14) ; une page supprimée depuis donne une planche vide.
 */
export async function lireLaPlanche(figma: FigmaDeLaLecture): Promise<EtatDeLaPlanche> {
  const { page: id } = lirePlanche(figma.root);
  if (id === null) return { page: null, cadres: [] };
  const page = await figma.getNodeByIdAsync(id) as PageNode | null;
  if (!page || page.type !== 'PAGE' || page.removed) return { page: null, cadres: [] };
  await page.loadAsync();
  return { page: page.id, cadres: cadresDeLaPage(page.children) };
}

export type ProfilDuDocument = DocumentNode['documentColorProfile'];

/** Ce que la lecture demande au document, pour se tester sans Figma. */
export interface DocumentLu {
  getSharedPluginData(espace: string, cle: string): string;
  readonly documentColorProfile: ProfilDuDocument;
}

/** L'état lu : la recette classée, le texte rangé et son empreinte, et le profil. */
export interface EtatLu {
  readonly classement: Classement;
  /** Le texte rangé tel quel, qu'une recette illisible ou future exporte ([REC-11]). */
  readonly texte: string;
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
    texte,
    empreinte: empreinteDuTexte(texte),
    profil: document.documentColorProfile,
  };
}
