/**
 * Dessine les cadres de palette dans la page de la planche (section 9.1).
 * Avec la recette, c'est l'une des deux écritures du plugin. Le modèle décide
 * de tout ([ARC-07]) ; ce fichier le traduit en nodes Figma.
 *
 * Un cadre se construit entier avant de remplacer l'ancien : une erreur en
 * chemin retire le cadre neuf, et aucun cadre à moitié dessiné ne reste
 * ([PLA-22]). Le cadre neuf prend la place de l'ancien ([PLA-03]).
 */
import type { Palette, Recette } from 'ucm-couleur';

import { CLE_PLANCHE, ESPACE_PARTAGE, lireEtat, lirePlanche, type PlancheRangee, type ProfilDuDocument } from '../lecture';
import { modeleDeCadre, type Noeud, type NoeudCadre, type NoeudTexte, type StyleDeTexte } from '../planche/modele';

/** Les données de plugin qu'un cadre de palette porte ([PLA-02], [PLA-19]). */
export const CLES_DU_CADRE = { cadre: 'cadre', proprietaire: 'proprietaire', empreinte: 'empreinte' } as const;

/** Le marqueur que porte chaque calque posé par le plugin (D-H). */
export const CLE_DU_MARQUEUR = 'calque';

/** Le nom de la page de la planche, et celui qu'elle prend quand une autre page porte déjà le premier ([PLA-01], E16). */
export const NOMS_DE_PAGE = ['Palettes', 'Palettes (UCM)'] as const;

/** L'écart entre deux cadres ([PLA-05], E17). */
export const ECART_ENTRE_CADRES = 200;

/** Les trois styles de la police Inter ([PLA-22]). */
export const POLICES: { readonly [S in StyleDeTexte]: { readonly family: string; readonly style: string; readonly taille: number } } = {
  titre: { family: 'Inter', style: 'Bold', taille: 24 },
  section: { family: 'Inter', style: 'Medium', taille: 13 },
  valeur: { family: 'Inter', style: 'Regular', taille: 11 },
};

interface AvecDonnees {
  setSharedPluginData(espace: string, cle: string, valeur: string): void;
}

type Remplissage = { type: 'SOLID'; color: { r: number; g: number; b: number } };

/** L'API que le dessin emploie ; `figma` la fournit, un double de test aussi. */
export type FigmaDuDessin = Pick<PluginAPI, 'root' | 'createPage' | 'createFrame' | 'createText' | 'getNodeByIdAsync' | 'loadFontAsync' | 'commitUndo'>;

/** L'issue d'un dessin, que l'interface met en mots. */
export type IssueDuDessin =
  | { readonly issue: 'dessinee'; readonly page: string; readonly cadres: readonly { readonly palette: string; readonly cadre: string }[]; readonly peints: readonly { readonly nom: string; readonly hexa: string }[] }
  /** Une police ne se charge pas : aucun calque n'est posé ([PLA-22]). */
  | { readonly issue: 'police'; readonly style: string }
  /** Une erreur au milieu d'un cadre : ce cadre est retiré, les cadres déjà dessinés restent. */
  | { readonly issue: 'interrompue'; readonly palette: string; readonly message: string; readonly dessines: number };

function marquer(noeud: AvecDonnees): void {
  noeud.setSharedPluginData(ESPACE_PARTAGE, CLE_DU_MARQUEUR, '1');
}

const remplissage = (fond: NoeudCadre['fond']): Remplissage[] =>
  fond ? [{ type: 'SOLID', color: { r: fond.composantes[0], g: fond.composantes[1], b: fond.composantes[2] } }] : [];

/** Les calques qu'une construction a créés, dans l'ordre : une erreur les retire tous. */
type Crees = (FrameNode | TextNode)[];

function construireTexte(figma: FigmaDuDessin, modele: NoeudTexte, crees: Crees): TextNode {
  const texte = figma.createText();
  crees.push(texte);
  marquer(texte);
  const police = POLICES[modele.style];
  texte.name = modele.nom;
  texte.fontName = { family: police.family, style: police.style };
  texte.fontSize = police.taille;
  texte.characters = modele.contenu;
  texte.fills = remplissage(modele.couleur);
  if (modele.largeur !== undefined) {
    // La largeur se fixe d'abord ; la hauteur suit ensuite le texte.
    texte.resize(modele.largeur, texte.height);
    texte.textAutoResize = 'HEIGHT';
  }
  return texte;
}

function construireCadre(figma: FigmaDuDessin, modele: NoeudCadre, crees: Crees): FrameNode {
  const cadre = figma.createFrame();
  crees.push(cadre);
  marquer(cadre);
  cadre.name = modele.nom;
  cadre.layoutMode = modele.direction;
  cadre.itemSpacing = modele.espacement;
  cadre.paddingTop = modele.marge;
  cadre.paddingRight = modele.marge;
  cadre.paddingBottom = modele.marge;
  cadre.paddingLeft = modele.marge;
  cadre.fills = remplissage(modele.fond);
  cadre.cornerRadius = modele.rayon;
  if (modele.centre) {
    cadre.primaryAxisAlignItems = 'CENTER';
    cadre.counterAxisAlignItems = 'CENTER';
  }
  for (const enfant of modele.enfants) cadre.appendChild(construire(figma, enfant, crees));
  if (modele.largeur !== undefined || modele.hauteur !== undefined) {
    cadre.resize(modele.largeur ?? cadre.width, modele.hauteur ?? 1);
  }
  cadre.layoutSizingHorizontal = modele.largeur !== undefined ? 'FIXED' : 'HUG';
  cadre.layoutSizingVertical = modele.hauteur !== undefined ? 'FIXED' : 'HUG';
  return cadre;
}

function construire(figma: FigmaDuDessin, modele: Noeud, crees: Crees): FrameNode | TextNode {
  return modele.type === 'texte' ? construireTexte(figma, modele, crees) : construireCadre(figma, modele, crees);
}

/**
 * La page de la planche : celle que la clé désigne si elle existe encore
 * (E14), sinon une page neuve, « Palettes (UCM) » quand une page « Palettes »
 * existe déjà ([PLA-01], [PLA-04], E16).
 */
async function pageDeLaPlanche(figma: FigmaDuDessin, planche: PlancheRangee): Promise<PageNode> {
  if (planche.page) {
    const trouvee = await figma.getNodeByIdAsync(planche.page) as PageNode | null;
    if (trouvee && trouvee.type === 'PAGE' && !trouvee.removed) return trouvee;
  }
  const page = figma.createPage();
  const pris = figma.root.children.some((existante) => existante.name === NOMS_DE_PAGE[0]);
  page.name = pris ? NOMS_DE_PAGE[1] : NOMS_DE_PAGE[0];
  return page;
}

/**
 * Les cadres que le plugin possède sur la page ([PLA-02]) : un cadre qui porte
 * l'identifiant d'une palette et dont le propriétaire rangé est lui-même.
 * Une copie faite par le designer porte un autre propriétaire : elle n'est
 * jamais réécrite ([PLA-25], E15).
 */
export function cadresPossedes(page: PageNode): Map<string, FrameNode> {
  const possedes = new Map<string, FrameNode>();
  for (const enfant of page.children) {
    if (enfant.type !== 'FRAME') continue;
    const cadre = enfant;
    const palette = cadre.getSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.cadre);
    if (palette && cadre.getSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.proprietaire) === cadre.id) possedes.set(palette, cadre);
  }
  return possedes;
}

/**
 * La place d'un cadre neuf (E17) : à 200 px à droite du cadre possédé le plus
 * à droite, aligné sur le haut du premier ; à l'origine sur une planche vide.
 */
export function placeDUnCadreNeuf(possedes: readonly FrameNode[]): { x: number; y: number } {
  if (possedes.length === 0) return { x: 0, y: 0 };
  const droite = Math.max(...possedes.map((cadre) => cadre.x + cadre.width));
  return { x: droite + ECART_ENTRE_CADRES, y: possedes[0].y };
}

/** Ce qu'un dessin rend : son issue, un refus avant tout calque, ou rien à dessiner. */
export type ResultatDuDessin =
  | IssueDuDessin
  /** La recette rangée n'est plus celle que l'interface a lue ([REC-10]). */
  | { readonly issue: 'modifiee-ailleurs' }
  /** La recette rangée est absente, future ou illisible ([REC-04]). */
  | { readonly issue: 'sans-recette' };

/** Ce que l'interface demande : des palettes par leur identifiant, sur la recette qu'elle a lue. */
export interface DemandeDeLInterface {
  readonly palettes: readonly string[];
  readonly grille: boolean;
  readonly empreinteLue: string | null;
}

/**
 * Dessine depuis la recette rangée, pourvu qu'elle soit celle que l'interface
 * a lue : un dessin d'une autre recette montrerait des couleurs que l'aperçu
 * n'a jamais montrées (E13). L'interface ne donne que des identifiants,
 * jamais des hexas ([ARC-11]).
 */
export async function dessinerLaRecetteRangee(
  figma: FigmaDuDessin,
  demande: DemandeDeLInterface,
  surProgression?: (fait: number, total: number, nom: string) => void,
): Promise<ResultatDuDessin> {
  const lu = lireEtat(figma.root);
  if (lu.empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };
  const { classement } = lu;
  if (classement.etat !== 'courante' && classement.etat !== 'migree') return { issue: 'sans-recette' };
  const palettes = classement.recette.palettes.filter((palette) => demande.palettes.includes(palette.id));
  return dessinerLaPlanche(figma, { recette: classement.recette, profil: lu.profil, palettes, grille: demande.grille }, surProgression);
}

/** Ce qu'un dessin reçoit : la recette rangée, le profil du document, et les palettes à dessiner. */
export interface DemandeDeDessin {
  readonly recette: Recette;
  readonly profil: ProfilDuDocument;
  readonly palettes: readonly Palette[];
  readonly grille: boolean;
}

/**
 * Dessine les palettes une à une ([PLA-24]), en annonçant chaque cadre. Les
 * polices se chargent avant tout calque ([PLA-22]). Un seul `commitUndo`
 * clôt le geste : Ctrl+Z défait ce dessin entier, et lui seul ([PLA-06],
 * E12).
 */
export async function dessinerLaPlanche(
  figma: FigmaDuDessin,
  demande: DemandeDeDessin,
  surProgression: (fait: number, total: number, nom: string) => void = () => {},
): Promise<IssueDuDessin> {
  for (const police of Object.values(POLICES)) {
    try {
      await figma.loadFontAsync({ family: police.family, style: police.style });
    } catch {
      return { issue: 'police', style: `${police.family} ${police.style}` };
    }
  }

  const rangee = lirePlanche(figma.root);
  const page = await pageDeLaPlanche(figma, rangee);
  await page.loadAsync();
  const possedes = cadresPossedes(page);
  const cadres: { palette: string; cadre: string }[] = [];
  const peints: { nom: string; hexa: string }[] = [];

  const ranger = () => {
    const suivante: PlancheRangee = { page: page.id, cadres: Object.fromEntries([...possedes].map(([palette, cadre]) => [palette, cadre.id])) };
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_PLANCHE, JSON.stringify(suivante));
  };

  for (const [rang, palette] of demande.palettes.entries()) {
    const modele = modeleDeCadre(demande.recette, palette, demande.profil, { grille: demande.grille });
    surProgression(rang, demande.palettes.length, modele.nom);
    const ancien = possedes.get(palette.id);
    const place = ancien ? { x: ancien.x, y: ancien.y } : placeDUnCadreNeuf([...possedes.values()]);
    // Un calque créé part d'abord dans la page courante : une erreur retire chacun, rattaché ou non.
    const crees: Crees = [];
    let neuf: FrameNode;
    try {
      neuf = construireCadre(figma, modele.racine, crees);
      page.appendChild(neuf);
      neuf.x = place.x;
      neuf.y = place.y;
      neuf.setSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.cadre, palette.id);
      neuf.setSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.proprietaire, neuf.id);
      neuf.setSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.empreinte, modele.empreinte);
    } catch (erreur) {
      for (const calque of crees.reverse()) if (!calque.removed) calque.remove();
      ranger();
      figma.commitUndo();
      return { issue: 'interrompue', palette: palette.id, message: erreur instanceof Error ? erreur.message : String(erreur), dessines: rang };
    }
    ancien?.remove();
    possedes.set(palette.id, neuf);
    cadres.push({ palette: palette.id, cadre: neuf.id });
    peints.push(...modele.peints);
  }

  ranger();
  figma.commitUndo();
  return { issue: 'dessinee', page: page.id, cadres, peints };
}
