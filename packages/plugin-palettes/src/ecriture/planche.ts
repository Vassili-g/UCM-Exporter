/**
 * Dessine les cadres de palette dans la page de la planche (section 9.1), et
 * retire le cadre d'une palette supprimée ([PLA-27]). Avec la recette, ce
 * sont les écritures du plugin. Le modèle décide de tout ([ARC-07]) ; ce
 * fichier le traduit en nodes Figma.
 *
 * Un cadre se construit entier avant de remplacer l'ancien : une erreur en
 * chemin retire le cadre neuf, et aucun cadre à moitié dessiné ne reste
 * ([PLA-22]). Le cadre neuf prend la place de l'ancien, dans son parent et à
 * son rang ([PLA-03], V8.6).
 */
import type { Palette, Recette } from 'ucm-couleur';

import {
  CLES_DU_CADRE,
  CLE_PLANCHE,
  ESPACE_PARTAGE,
  VERSION_DU_SUIVI,
  couleurDeLaSelection,
  lireEtat,
  lirePlanche,
  resoudreLesCadres,
  type PageLue,
  type PlancheRangee,
  type ProfilDuDocument,
} from '../lecture';
import { STYLES_DE_TEXTE, modeleDeCadre, type Noeud, type NoeudCadre, type NoeudTexte } from '../planche/modele';

/** Le marqueur que porte chaque calque posé par le plugin (D-H). */
export const CLE_DU_MARQUEUR = 'calque';

/** Le nom de la page de la planche, et celui qu'elle prend quand une autre page porte déjà le premier ([PLA-01], E16). */
export const NOMS_DE_PAGE = ['Palettes', 'Palettes (UCM)'] as const;

/** L'écart entre deux cadres ([PLA-05], E17). */
export const ECART_ENTRE_CADRES = 200;

/** Les styles nommés de la planche, que le modèle porte et que son empreinte couvre ([PLA-22], V10.8). */
export const POLICES = STYLES_DE_TEXTE;

interface AvecDonnees {
  setSharedPluginData(espace: string, cle: string, valeur: string): void;
}

type Remplissage = { type: 'SOLID'; color: { r: number; g: number; b: number } };

/** L'API que le dessin emploie ; `figma` la fournit, un double de test aussi. */
export type FigmaDuDessin = Pick<PluginAPI, 'root' | 'createPage' | 'createFrame' | 'createText' | 'getNodeByIdAsync' | 'loadFontAsync' | 'commitUndo'>;

/** Un calque que le designer a posé dans un cadre du plugin : redessiner le retire (D-H). */
export interface CalqueEtranger {
  readonly id: string;
  readonly nom: string;
}

/** Une couleur relue sur une pastille posée, en hexa sRGB, que l'interface compare à son aperçu. */
export interface CouleurPeinte {
  readonly palette: string;
  readonly nom: string;
  readonly hexa: string;
}

/** L'issue d'un dessin, que l'interface met en mots. */
export type IssueDuDessin =
  | { readonly issue: 'dessinee'; readonly page: string; readonly cadres: readonly { readonly palette: string; readonly cadre: string }[]; readonly peints: readonly CouleurPeinte[] }
  /**
   * Des cadres à redessiner portent des calques que le designer n'a pas
   * confirmés : rien n'est posé, et l'interface demande confirmation en les
   * nommant ([PLA-03], D-H).
   */
  | { readonly issue: 'etrangers'; readonly cadres: readonly { readonly palette: string; readonly calques: readonly CalqueEtranger[] }[] }
  /** Une police ne se charge pas : aucun calque n'est posé ([PLA-22]). */
  | { readonly issue: 'police'; readonly style: string }
  /** Une erreur au milieu d'un cadre : ce cadre est retiré, les cadres déjà dessinés restent. */
  | { readonly issue: 'interrompue'; readonly palette: string; readonly message: string; readonly dessines: number }
  /**
   * Figma a refusé de lire le cadre existant de ces palettes : un cadre neuf
   * en ferait un doublon, rien n'est posé (V8.6).
   */
  | { readonly issue: 'lecture-impossible'; readonly palettes: readonly string[] }
  /** Le suivi des cadres vient d'une version plus récente du plugin : rien n'est posé (V8.8). */
  | { readonly issue: 'suivi-futur' };

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
  cadre.paddingRight = modele.margeLaterale ?? modele.marge;
  cadre.paddingBottom = modele.marge;
  cadre.paddingLeft = modele.margeLaterale ?? modele.marge;
  cadre.fills = remplissage(modele.fond);
  cadre.cornerRadius = modele.rayon;
  // Un contour intérieur : le filet d'un thème, la bordure d'un champ, l'anneau de focus (V10.4).
  if (modele.trait) {
    cadre.strokes = remplissage(modele.trait.couleur);
    cadre.strokeWeight = modele.trait.epaisseur;
    cadre.strokeAlign = 'INSIDE';
    cadre.dashPattern = modele.trait.tirets ? [4, 3] : [];
  }
  cadre.primaryAxisAlignItems = modele.alignement?.principal ?? 'MIN';
  cadre.counterAxisAlignItems = modele.alignement?.secondaire ?? 'MIN';
  for (const enfant of modele.enfants) {
    const pose = construire(figma, enfant, crees);
    cadre.appendChild(pose);
    // Remplir la largeur du parent ne se règle qu'une fois l'enfant posé dans l'auto layout.
    if (enfant.type === 'cadre' && enfant.remplir) {
      if (modele.direction === 'VERTICAL') pose.layoutSizingHorizontal = 'FILL';
      else pose.layoutGrow = 1;
    }
  }
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
function pageDeLaPlanche(figma: FigmaDuDessin, rangee: PageLue | null): PageNode {
  if (rangee) return rangee as unknown as PageNode;
  const page = figma.createPage();
  const pris = figma.root.children.some((existante) => existante.name === NOMS_DE_PAGE[0]);
  page.name = pris ? NOMS_DE_PAGE[1] : NOMS_DE_PAGE[0];
  return page;
}

/**
 * Pose le cadre neuf à la place de l'ancien (V8.6) : même parent, même rang,
 * puis la transformation de l'ancien. Dans un parent en auto layout, le rang
 * suffit, sauf pour un cadre en position absolue ; le couple x/y ne suffirait
 * pas dans un parent tourné. L'ancien part ensuite.
 */
function prendreLaPlace(neuf: FrameNode, ancien: FrameNode): void {
  const parent = ancien.parent as (BaseNode & ChildrenMixin) | null;
  if (!parent) throw new Error('Le cadre à remplacer n’a plus de parent.');
  parent.insertChild(parent.children.indexOf(ancien), neuf);
  const enAutoLayout = 'layoutMode' in parent && (parent as FrameNode).layoutMode !== 'NONE';
  if (enAutoLayout) neuf.layoutPositioning = ancien.layoutPositioning;
  if (!enAutoLayout || ancien.layoutPositioning === 'ABSOLUTE') neuf.relativeTransform = ancien.relativeTransform;
}

/**
 * Les calques sans marqueur d'un cadre possédé ([PLA-03], D-H). La recherche
 * ne descend pas sous un calque étranger : ses enfants partent avec lui, et
 * une instance n'est jamais parcourue.
 */
export function calquesEtrangers(cadre: FrameNode): CalqueEtranger[] {
  const trouves: CalqueEtranger[] = [];
  const parcourir = (parent: ChildrenMixin): void => {
    for (const enfant of parent.children) {
      if (enfant.getSharedPluginData(ESPACE_PARTAGE, CLE_DU_MARQUEUR) !== '1') trouves.push({ id: enfant.id, nom: enfant.name });
      else if ('children' in enfant) parcourir(enfant);
    }
  };
  parcourir(cadre);
  return trouves;
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

/**
 * Les couleurs relues sur les pastilles posées (L6.14) : la peinture que Figma
 * garde, ramenée en hexa sRGB comme la couleur d'une sélection. Elle diffère
 * de l'aperçu si la peinture perd la couleur en chemin.
 */
function couleursPeintes(crees: Crees, attendues: readonly { readonly nom: string }[], palette: string, profil: ProfilDuDocument): CouleurPeinte[] {
  const pastilles = new Set(attendues.map(({ nom }) => nom));
  const couleurs: CouleurPeinte[] = [];
  for (const calque of crees) {
    if (calque.type !== 'FRAME' || !pastilles.has(calque.name)) continue;
    const lue = couleurDeLaSelection([calque], profil);
    couleurs.push({ palette, nom: calque.name, hexa: 'hexa' in lue ? lue.hexa : '' });
  }
  return couleurs;
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
  /** Les calques étrangers que le designer a accepté de perdre (D-H). */
  readonly etrangersConfirmes: readonly string[];
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
  return dessinerLaPlanche(figma, {
    recette: classement.recette,
    profil: lu.profil,
    palettes,
    grille: demande.grille,
    etrangersConfirmes: demande.etrangersConfirmes,
  }, surProgression);
}

/** Ce qu'un dessin reçoit : la recette rangée, le profil du document, et les palettes à dessiner. */
export interface DemandeDeDessin {
  readonly recette: Recette;
  readonly profil: ProfilDuDocument;
  readonly palettes: readonly Palette[];
  readonly grille: boolean;
  readonly etrangersConfirmes?: readonly string[];
}

/**
 * Dessine les palettes une à une ([PLA-24]), en annonçant chaque cadre. Les
 * polices se chargent avant tout calque ([PLA-22]) ; un calque étranger que
 * le designer n'a pas confirmé arrête aussi le dessin avant tout calque
 * (D-H). Un seul `commitUndo`
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

  if (lirePlanche(figma.root).version > VERSION_DU_SUIVI) return { issue: 'suivi-futur' };
  const resolus = await resoudreLesCadres<FrameNode>(figma);
  const demandees = new Set(demande.palettes.map((palette) => palette.id));
  const illisibles = resolus.manquants.filter(({ palette, raison }) => raison === 'illisible' && demandees.has(palette));
  if (illisibles.length > 0) return { issue: 'lecture-impossible', palettes: illisibles.map(({ palette }) => palette) };

  const possedes = new Map([...resolus.possedes].map(([palette, { noeud }]) => [palette, noeud]));

  const etrangers = demande.palettes.flatMap((palette) => {
    const ancien = possedes.get(palette.id);
    const calques = ancien ? calquesEtrangers(ancien) : [];
    return calques.length > 0 ? [{ palette: palette.id, calques }] : [];
  });
  const confirmes = new Set(demande.etrangersConfirmes ?? []);
  if (etrangers.some(({ calques }) => calques.some(({ id }) => !confirmes.has(id)))) return { issue: 'etrangers', cadres: etrangers };

  const cadres: { palette: string; cadre: string }[] = [];
  const peints: CouleurPeinte[] = [];

  // La page de la planche ne se crée qu'au premier cadre neuf, après les refus : un dessin qui ne fait que
  // remplacer des cadres rangés ailleurs n'en laisse pas une vide ([PLA-04]).
  let page: PageNode | null = resolus.page as unknown as PageNode | null;
  const pageDesNeufs = async (): Promise<PageNode> => {
    if (!page) {
      page = pageDeLaPlanche(figma, null);
      await page.loadAsync();
    }
    return page;
  };

  // Un cadre manquant garde son entrée tant que sa palette reste dans la recette : un cadre illisible se
  // relira, un cadre introuvable le reste, et aucun ne devient « jamais dessiné » (V8.2). Redessiner sa
  // palette remplace l'entrée.
  const presentes = new Set(demande.recette.palettes.map((palette) => palette.id));
  const gardes = Object.fromEntries(resolus.manquants.filter(({ palette }) => presentes.has(palette)).map(({ palette, cadre }) => [palette, cadre]));
  const ranger = () => {
    const suivante: PlancheRangee = {
      version: VERSION_DU_SUIVI,
      page: page?.id ?? null,
      cadres: { ...gardes, ...Object.fromEntries([...possedes].map(([palette, cadre]) => [palette, cadre.id])) },
    };
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_PLANCHE, JSON.stringify(suivante));
  };

  for (const [rang, palette] of demande.palettes.entries()) {
    const modele = modeleDeCadre(demande.recette, palette, demande.profil, { grille: demande.grille });
    surProgression(rang, demande.palettes.length, modele.nom);
    const ancien = possedes.get(palette.id);
    // Un cadre neuf se range parmi les cadres du premier niveau de la page (E17).
    const pageDuNeuf = ancien ? null : await pageDesNeufs();
    const place = pageDuNeuf ? placeDUnCadreNeuf([...possedes.values()].filter((cadre) => cadre.parent === pageDuNeuf)) : null;
    // Un calque créé part d'abord dans la page courante : une erreur retire chacun, rattaché ou non.
    const crees: Crees = [];
    let neuf: FrameNode;
    try {
      neuf = construireCadre(figma, modele.racine, crees);
      if (ancien) prendreLaPlace(neuf, ancien);
      else if (pageDuNeuf && place) {
        pageDuNeuf.appendChild(neuf);
        neuf.x = place.x;
        neuf.y = place.y;
      }
      neuf.setSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.cadre, palette.id);
      neuf.setSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.proprietaire, neuf.id);
      neuf.setSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.empreinte, modele.empreinte);
      neuf.setSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.grille, demande.grille ? '1' : '');
    } catch (erreur) {
      for (const calque of crees.reverse()) if (!calque.removed) calque.remove();
      ranger();
      figma.commitUndo();
      return { issue: 'interrompue', palette: palette.id, message: erreur instanceof Error ? erreur.message : String(erreur), dessines: rang };
    }
    ancien?.remove();
    possedes.set(palette.id, neuf);
    cadres.push({ palette: palette.id, cadre: neuf.id });
    peints.push(...couleursPeintes(crees, modele.peints, palette.id, demande.profil));
  }

  ranger();
  figma.commitUndo();
  // Sans cadre neuf ni page rangée, la page rendue est celle du premier cadre remplacé.
  const pageRendue = (page as PageNode | null)?.id ?? pageDuCadre(possedes.get(demande.palettes[0]?.id ?? ''));
  return { issue: 'dessinee', page: pageRendue, cadres, peints };
}

/** L'identifiant de la page qui porte un cadre, en remontant ses parents. */
function pageDuCadre(cadre: FrameNode | undefined): string {
  let courant: BaseNode | null = cadre?.parent ?? null;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return courant?.id ?? '';
}

/** L'API que le retrait d'un cadre emploie. */
export type FigmaDuRetrait = Pick<PluginAPI, 'root' | 'getNodeByIdAsync' | 'commitUndo'>;

/** Ce que l'interface demande : le cadre d'une palette supprimée, par les identifiants qu'elle a lus. */
export interface DemandeDeRetrait {
  readonly palette: string;
  readonly cadre: string;
}

/** L'issue de « Supprimer définitivement » ([PLA-27]). */
export type IssueDuRetrait =
  /** Le cadre est retiré de Figma, et son entrée du suivi avec lui. */
  | { readonly issue: 'retire' }
  /** Le cadre avait déjà disparu : seule son entrée du suivi est oubliée. */
  | { readonly issue: 'deja-absent' }
  /**
   * Rien n'est écrit : la recette ne se lit pas ou contient de nouveau la
   * palette, Figma refuse de lire le cadre, ou le cadre n'est plus celui que
   * le plugin possède pour cette palette.
   */
  | { readonly issue: 'refuse' }
  /** Le suivi vient d'une version plus récente du plugin : rien n'est écrit (V8.8). */
  | { readonly issue: 'suivi-futur' };

/**
 * Retire le cadre d'une palette supprimée et son entrée du suivi, dans une
 * seule écriture close par un seul `commitUndo` : un Ctrl+Z rend les deux, et
 * le cadre revient comme celui d'une palette supprimée ([PLA-27]). Le sandbox
 * relit tout : il ne retire qu'un cadre possédé, qui porte encore
 * l'identifiant de sa palette, quand la recette rangée ne la contient plus.
 */
export async function retirerLeCadre(figma: FigmaDuRetrait, demande: DemandeDeRetrait): Promise<IssueDuRetrait> {
  const rangee = lirePlanche(figma.root);
  if (rangee.version > VERSION_DU_SUIVI) return { issue: 'suivi-futur' };
  const { classement } = lireEtat(figma.root);
  if (classement.etat !== 'courante' && classement.etat !== 'migree') return { issue: 'refuse' };
  if (classement.recette.palettes.some((palette) => palette.id === demande.palette)) return { issue: 'refuse' };

  let cadre: BaseNode | null;
  try {
    cadre = await figma.getNodeByIdAsync(demande.cadre);
  } catch {
    return { issue: 'refuse' };
  }
  const present = cadre !== null && !cadre.removed;
  if (present) {
    const possede = cadre!.type === 'FRAME'
      && cadre!.getSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.cadre) === demande.palette
      && cadre!.getSharedPluginData(ESPACE_PARTAGE, CLES_DU_CADRE.proprietaire) === cadre!.id;
    if (!possede) return { issue: 'refuse' };
  }

  const cadres = Object.fromEntries(Object.entries(rangee.cadres).filter(([, id]) => id !== demande.cadre));
  const suiviChange = Object.keys(cadres).length !== Object.keys(rangee.cadres).length;
  if (!present && !suiviChange) return { issue: 'deja-absent' };

  if (present) {
    // La page du cadre se charge avant de le retirer (`documentAccess: "dynamic-page"`).
    let page: BaseNode | null = cadre!.parent;
    while (page && page.type !== 'PAGE') page = page.parent;
    if (page) await (page as PageNode).loadAsync();
    cadre!.remove();
  }
  if (suiviChange) {
    const suivante: PlancheRangee = { version: VERSION_DU_SUIVI, page: rangee.page, cadres };
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_PLANCHE, JSON.stringify(suivante));
  }
  figma.commitUndo();
  return { issue: present ? 'retire' : 'deja-absent' };
}
