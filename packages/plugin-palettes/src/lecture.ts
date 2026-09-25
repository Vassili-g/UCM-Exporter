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

/**
 * La version du suivi des cadres, distincte de celle de la recette (V8.8).
 * La version 1, sans champ `version`, date du temps où chaque cadre vivait
 * au premier niveau de la page ; la version 2 retrouve un cadre sur
 * n'importe quelle page, par son identifiant. Les deux se lisent de même.
 */
export const VERSION_DU_SUIVI = 2;

/** Ce que la planche range : la page des cadres neufs, et le cadre de chaque palette dessinée, où qu'il soit. */
export interface PlancheRangee {
  readonly version: number;
  readonly page: string | null;
  readonly cadres: { readonly [palette: string]: string };
}

/** La planche rangée ; illisible ou absente, une planche vide, que le prochain dessin remplace. */
export function lirePlanche(racine: { getSharedPluginData(espace: string, cle: string): string }): PlancheRangee {
  const vide: PlancheRangee = { version: VERSION_DU_SUIVI, page: null, cadres: {} };
  const texte = racine.getSharedPluginData(ESPACE_PARTAGE, CLE_PLANCHE);
  if (texte === '') return vide;
  try {
    const lue = JSON.parse(texte) as { version?: unknown; page?: unknown; cadres?: unknown };
    const version = typeof lue.version === 'number' ? lue.version : 1;
    const page = typeof lue.page === 'string' ? lue.page : null;
    const cadres: Record<string, string> = {};
    if (lue.cadres && typeof lue.cadres === 'object') {
      for (const [palette, cadre] of Object.entries(lue.cadres as Record<string, unknown>)) {
        if (typeof cadre === 'string') cadres[palette] = cadre;
      }
    }
    return { version, page, cadres };
  } catch {
    return vide;
  }
}

/** Les données de plugin qu'un cadre de palette porte ([PLA-02], [PLA-19]). */
export const CLES_DU_CADRE = { cadre: 'cadre', proprietaire: 'proprietaire', empreinte: 'empreinte', grille: 'grille' } as const;

/** Un cadre de palette, où qu'il soit rangé : page, section ou autre cadre. */
export interface CadreLu {
  readonly palette: string;
  readonly cadre: string;
  readonly nom: string;
  /** La page qui porte le cadre, et son nom. */
  readonly page: string;
  readonly nomDeLaPage: string;
  /** L'empreinte du modèle au moment du dessin ([PLA-19]). */
  readonly empreinte: string;
  /** Vrai quand le cadre a été dessiné avec la grille de contraste, qui entre dans l'empreinte. */
  readonly grille: boolean;
  /** Faux pour une copie faite par le designer, que le plugin ne réécrit jamais ([PLA-25], E15). */
  readonly possede: boolean;
}

/**
 * Un cadre rangé que la lecture n'a pas trouvé : `introuvable` quand Figma ne
 * le connaît plus (supprimé, ou coupé puis collé, ce qui change son
 * identifiant) ; `illisible` quand Figma a refusé de le lire. Un cadre
 * illisible n'est pas absent : aucun dessin n'en pose un second (V8.6).
 */
export interface CadreManquant {
  readonly palette: string;
  readonly cadre: string;
  readonly raison: 'introuvable' | 'illisible';
}

/** La planche telle que le document la porte. */
export interface EtatDeLaPlanche {
  /** La page où se posent les cadres neufs, et son nom ; `null` avant tout dessin. */
  readonly page: string | null;
  readonly nomDeLaPage: string | null;
  readonly cadres: readonly CadreLu[];
  readonly manquants: readonly CadreManquant[];
  /**
   * Où la recherche de secours a regardé : la seule page de la planche, ou
   * toutes les pages à la demande du designer. Un cadre coupé puis collé sur
   * une autre page n'est trouvé que par la seconde.
   */
  readonly recherche: 'page' | 'fichier';
  /** Le suivi vient d'une version plus récente du plugin : rien ne s'y lit, rien ne s'y écrit. */
  readonly suiviFutur: boolean;
}

export const PLANCHE_SANS_CADRE: EtatDeLaPlanche = { page: null, nomDeLaPage: null, cadres: [], manquants: [], recherche: 'page', suiviFutur: false };

/** Ce que la résolution demande à un nœud. */
interface NoeudLu {
  readonly type: string;
  readonly id: string;
  readonly name: string;
  readonly removed: boolean;
  readonly parent: NoeudLu | null;
  getSharedPluginData(espace: string, cle: string): string;
}

/** Ce que la résolution demande à une page. */
export interface PageLue extends NoeudLu {
  loadAsync(): Promise<void>;
  findAllWithCriteria(criteres: { types: ['FRAME']; sharedPluginData: { namespace: string; keys: string[] } }): readonly NoeudLu[];
}

/** Ce que la lecture de la planche demande à Figma. */
export interface FigmaDeLaLecture {
  readonly root: { getSharedPluginData(espace: string, cle: string): string; readonly children: readonly unknown[] };
  getNodeByIdAsync(id: string): Promise<unknown>;
}

/** Les cadres retrouvés, sous le type que l'appelant manipule : `FrameNode` pour le dessin. */
export interface CadresResolus<N> {
  readonly rangee: PlancheRangee;
  /** La page rangée, chargée ; `null` si elle a disparu. */
  readonly page: PageLue | null;
  /** Le cadre possédé de chaque palette, et sa page. */
  readonly possedes: Map<string, { readonly noeud: N; readonly page: PageLue }>;
  readonly copies: readonly { readonly noeud: N; readonly page: PageLue }[];
  readonly manquants: readonly CadreManquant[];
}

const estPossede = (noeud: NoeudLu): boolean => noeud.getSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.proprietaire) === noeud.id;
const paletteDu = (noeud: NoeudLu): string => noeud.getSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.cadre);

/** La page qui porte un nœud, en remontant ses parents ; `null` hors du document. */
function pageDu(noeud: NoeudLu): PageLue | null {
  let courant: NoeudLu | null = noeud.parent;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return courant as PageLue | null;
}

/**
 * Retrouve les cadres de la planche ([PLA-26], V8.6). D'abord chaque identifiant rangé,
 * sur n'importe quelle page : un cadre rangé dans une section, ou déplacé sur
 * une autre page par « Déplacer vers la page », garde son identifiant. Un
 * cadre ne compte que s'il porte encore l'identifiant de sa palette et se
 * possède lui-même. Ensuite, la recherche de secours parcourt la page rangée
 * en profondeur, sections comprises, ou toutes les pages quand le designer le
 * demande : elle relève les copies, et les cadres possédés que le suivi ne
 * nomme pas. Chaque page lue se charge d'abord ; aucune ne se charge en
 * dehors de celles-là.
 */
export async function resoudreLesCadres<N>(figma: FigmaDeLaLecture, toutesLesPages = false): Promise<CadresResolus<N>> {
  const rangee = lirePlanche(figma.root);
  const possedes = new Map<string, { noeud: N; page: PageLue }>();
  const copies: { noeud: N; page: PageLue }[] = [];
  const manquants: CadreManquant[] = [];
  const vus = new Set<string>();

  let page: PageLue | null = null;
  if (rangee.page !== null) {
    const trouvee = await figma.getNodeByIdAsync(rangee.page) as PageLue | null;
    if (trouvee && trouvee.type === 'PAGE' && !trouvee.removed) {
      await trouvee.loadAsync();
      page = trouvee;
    }
  }

  for (const [palette, id] of Object.entries(rangee.cadres)) {
    try {
      const noeud = await figma.getNodeByIdAsync(id) as NoeudLu | null;
      const saPage = noeud && !noeud.removed && noeud.type === 'FRAME' && paletteDu(noeud) === palette && estPossede(noeud) ? pageDu(noeud) : null;
      if (!saPage) {
        manquants.push({ palette, cadre: id, raison: 'introuvable' });
        continue;
      }
      await saPage.loadAsync();
      possedes.set(palette, { noeud: noeud as N, page: saPage });
      vus.add(id);
    } catch {
      manquants.push({ palette, cadre: id, raison: 'illisible' });
    }
  }

  // Figma peut lever en lisant un nœud qu'il annonce : la recherche saute ce nœud, ou cette page, sans perdre la lecture.
  const retrouves = new Map<string, string>();
  const pages = toutesLesPages ? figma.root.children as PageLue[] : page ? [page] : [];
  for (const parcourue of pages) {
    let trouves: readonly NoeudLu[];
    try {
      await parcourue.loadAsync();
      trouves = parcourue.findAllWithCriteria({ types: ['FRAME'], sharedPluginData: { namespace: ESPACE_PARTAGE, keys: [CLES_DU_CADRE.cadre] } });
    } catch {
      continue;
    }
    for (const noeud of trouves) {
      try {
        if (vus.has(noeud.id)) continue;
        vus.add(noeud.id);
        const palette = paletteDu(noeud);
        if (!estPossede(noeud)) copies.push({ noeud: noeud as unknown as N, page: parcourue });
        else if (!possedes.has(palette)) {
          possedes.set(palette, { noeud: noeud as unknown as N, page: parcourue });
          retrouves.set(palette, noeud.id);
        }
      } catch {
        continue;
      }
    }
  }

  return {
    rangee,
    page,
    possedes,
    copies,
    // Un cadre possédé retrouvé par la recherche remplace l'entrée perdue de sa palette ;
    // une entrée illisible ne tombe que si la recherche a lu ce même cadre.
    manquants: manquants.filter(({ palette, cadre, raison }) => (raison === 'illisible' ? retrouves.get(palette) !== cadre : !possedes.has(palette))),
  };
}

function cadreLu(noeud: NoeudLu, page: PageLue): CadreLu {
  const donnee = (cle: string) => noeud.getSharedPluginData(ESPACE_PARTAGE, cle);
  return {
    palette: donnee(CLES_DU_CADRE.cadre),
    cadre: noeud.id,
    nom: noeud.name,
    page: page.id,
    nomDeLaPage: page.name,
    empreinte: donnee(CLES_DU_CADRE.empreinte),
    grille: donnee(CLES_DU_CADRE.grille) === '1',
    possede: estPossede(noeud),
  };
}

/**
 * La planche et ses cadres de palette ([PLA-01], E14). Un suivi d'une version
 * plus récente ne se lit pas : ses cadres ne sont ni comptés ni redessinés.
 */
export async function lireLaPlanche(figma: FigmaDeLaLecture, toutesLesPages = false): Promise<EtatDeLaPlanche> {
  const recherche = toutesLesPages ? 'fichier' : 'page';
  if (lirePlanche(figma.root).version > VERSION_DU_SUIVI) return { ...PLANCHE_SANS_CADRE, recherche, suiviFutur: true };
  const resolus = await resoudreLesCadres<NoeudLu>(figma, toutesLesPages);
  return {
    page: resolus.page?.id ?? null,
    nomDeLaPage: resolus.page?.name ?? null,
    cadres: [
      ...[...resolus.possedes.values()].map(({ noeud, page }) => cadreLu(noeud, page)),
      ...resolus.copies.map(({ noeud, page }) => cadreLu(noeud, page)),
    ],
    manquants: resolus.manquants,
    recherche,
    suiviFutur: false,
  };
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
