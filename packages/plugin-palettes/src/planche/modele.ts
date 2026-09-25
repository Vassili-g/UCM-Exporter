/**
 * Le modèle de planche d'une palette ([ARC-07]) : un arbre de données pur,
 * cadres et textes, couleurs peintes, tailles et noms de calque, calculé
 * depuis la recette rangée ([ARC-11]). `ecriture/planche.ts` le traduit en
 * nodes Figma sans rien décider ; tout ce que la section 9 exige se teste ici,
 * hors de Figma.
 *
 * Le cadre répond à une question : quelle nuance pour quel usage (récit R1,
 * maquette W3.6). Chaque thème, peint de son fond, montre les deux rampes,
 * puis les usages du profil porteur dans leurs états `default`, `hover` et
 * `active`, chacun avec les garanties qu'il porte, puis une interface
 * d'exemple, puis les grilles des contrastes, alignées sur les rampes.
 */
import {
  MODES,
  PROFILS,
  TABLE_DES_EMPLOIS,
  atteintLeSeuil,
  contraste,
  decalagesDeLEmploi,
  ecrireContraste,
  ecrireHexa,
  empreinte,
  lireHexa,
  referenceDe,
  rgb8VersP3,
  type Cran,
  type Emploi,
  type MembrePaire,
  type Mode,
  type Palette,
  type Profil,
  type Promesse,
  type Recette,
  type Rgb8,
} from 'ucm-couleur';

import { analyserPalette, type AnalyseDePalette } from '../analyse';
import type { ProfilDuDocument } from '../lecture';
import {
  NOM_DU_PROFIL,
  TEXTES,
  TEXTES_DE_LA_PLANCHE,
  TEXTES_DU_DETAIL,
  enTeteDeLaReference,
  enTeteDuTheme,
  legendeDesContrastes,
  nomDeLaPalette,
  verdictDuTheme,
} from '../ui/textes';

/** Une couleur peinte : son hexa sRGB, et ses composantes dans l'espace du document (section 6.7). */
export interface Peinture {
  readonly hexa: string;
  readonly composantes: readonly [number, number, number];
}

/**
 * Les styles nommés de la planche (V10.8), du plus haut au plus bas : titre de
 * palette, titre de section, titre d'usage, valeur, note, et les chiffres
 * appuyés. Ils entrent dans l'empreinte : changer une taille ou une graisse
 * périme les cadres déjà dessinés (V10.10).
 */
export const STYLES_DE_TEXTE = {
  palette: { family: 'Inter', style: 'Semi Bold', taille: 28 },
  theme: { family: 'Inter', style: 'Semi Bold', taille: 16 },
  role: { family: 'Inter', style: 'Semi Bold', taille: 12 },
  valeur: { family: 'Inter', style: 'Regular', taille: 11 },
  note: { family: 'Inter', style: 'Regular', taille: 10 },
  chiffre: { family: 'Inter', style: 'Semi Bold', taille: 10 },
} as const;

export type StyleDeTexte = keyof typeof STYLES_DE_TEXTE;

export interface NoeudTexte {
  readonly type: 'texte';
  readonly nom: string;
  readonly contenu: string;
  readonly style: StyleDeTexte;
  readonly couleur: Peinture;
  /** Une largeur fixe : le texte passe à la ligne dedans. Sans elle, il suit son contenu et ne se coupe jamais. */
  readonly largeur?: number;
}

/** Un contour : le filet d'un thème, la bordure d'un champ, l'anneau de focus. */
export interface Trait {
  readonly couleur: Peinture;
  readonly epaisseur: number;
  readonly tirets: boolean;
}

/** L'alignement des enfants d'un cadre, sur son axe puis sur l'axe croisé ; `MIN` par défaut. */
export interface Alignement {
  readonly principal?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  readonly secondaire?: 'MIN' | 'CENTER' | 'MAX';
}

export interface NoeudCadre {
  readonly type: 'cadre';
  readonly nom: string;
  readonly direction: 'VERTICAL' | 'HORIZONTAL';
  readonly espacement: number;
  readonly marge: number;
  /** La marge de gauche et de droite, quand elle diffère de `marge`. */
  readonly margeLaterale?: number;
  readonly fond: Peinture | null;
  readonly rayon: number;
  readonly trait?: Trait;
  /** Une taille fixe ; sans elle, le cadre épouse son contenu (auto layout, [PLA-21]). */
  readonly largeur?: number;
  readonly hauteur?: number;
  /** Le cadre prend la largeur de son parent : un filet, un soulignement. */
  readonly remplir?: boolean;
  readonly alignement?: Alignement;
  readonly enfants: readonly Noeud[];
}

export type Noeud = NoeudTexte | NoeudCadre;

/** Le modèle d'un cadre de palette, et ce qu'il peint. */
export interface ModeleDeCadre {
  readonly palette: string;
  readonly nom: string;
  /** L'empreinte du modèle ([PLA-19], E2), que le cadre range dans ses données de plugin. */
  readonly empreinte: string;
  readonly racine: NoeudCadre;
  /** Chaque pastille de nuance peinte, son nom de calque et son hexa : le rapport du dessin les compare à l'aperçu (L6.14). */
  readonly peints: readonly { readonly nom: string; readonly hexa: string }[];
}

/** La trame de la planche ([PLA-21]). */
export const TRAME = 8;

/** Les couleurs du cadre, séparées des couleurs de la palette ([PLA-23]). */
export const COULEURS_DE_LA_PLANCHE = {
  fondDuCadre: '#FFFFFF',
  encre: '#1E1E1E',
  encreClaire: '#F5F5F5',
  encreSecondaire: '#6B6B6B',
  /** Le filet d'un thème : 3,4:1 sur le blanc, 5,5:1 sur un fond presque noir (V10.4). */
  filet: '#8C8C8C',
  /** Une garantie manquée, sur un fond clair puis sur un fond sombre. */
  dangerSombre: '#B42318',
  dangerClair: '#FF9C8A',
} as const;

/** Une colonne de rampe, et celle de son libellé à gauche : la grille des contrastes s'aligne dessus. */
export const COLONNE = { largeur: 56, libelle: 48 } as const;

/** La hauteur d'une pastille de rampe. */
const HAUTEUR_DE_PASTILLE = 32;

/** Les colonnes des usages : libellé, puis une colonne par état. */
const USAGE = { libelle: 176, etat: 168 } as const;

/** Un spécimen d'usage, et l'interface d'exemple. */
const SPECIMEN = { largeur: 96, hauteur: 32 } as const;
const EXEMPLE = { largeur: 420, marge: 3 * TRAME } as const;

/** Les usages, dans l'ordre du récit : du fond léger au séparateur. `on-solid` se lit sur `solid`. */
const USAGES: readonly Emploi[] = ['surface', 'text', 'solid', 'border-control', 'focus', 'border-decorative'];

/** Les états d'un emploi, dans le vocabulaire des composants (W3.6), rangés par décalage. */
export const ETATS = ['default', 'hover', 'active'] as const;

/** Peint une couleur à 8 bits dans l'espace du document (section 6.7, [MOT-25]). */
export function peinture(couleur: Rgb8, profil: ProfilDuDocument): Peinture {
  const composantes = profil === 'DISPLAY_P3'
    ? rgb8VersP3(couleur)
    : [couleur[0] / 255, couleur[1] / 255, couleur[2] / 255] as const;
  return { hexa: ecrireHexa(couleur), composantes: [composantes[0], composantes[1], composantes[2]] };
}

const hexaLu = (hexa: string): Rgb8 => {
  const couleur = lireHexa(hexa);
  if (!couleur) throw new Error(`Couleur de la planche illisible : ${hexa}.`);
  return couleur;
};

/** Le noir ou le blanc, celui qui contraste le plus avec un fond ([PLA-13]). */
export function noirOuBlanc(fond: Rgb8): Rgb8 {
  return contraste(fond, [0, 0, 0]) >= contraste(fond, [255, 255, 255]) ? [0, 0, 0] : [255, 255, 255];
}

/** L'encre des légendes posées sur un fond : la sombre ou la claire, celle qui s'y lit le mieux ([PLA-09]). */
export function encreSur(fond: Rgb8): Rgb8 {
  const sombre = hexaLu(COULEURS_DE_LA_PLANCHE.encre);
  const claire = hexaLu(COULEURS_DE_LA_PLANCHE.encreClaire);
  return contraste(fond, sombre) >= contraste(fond, claire) ? sombre : claire;
}

/** `part` de `encre` posée sur `fond`, en octets : une encre atténuée sans transparence. */
function melanger(encre: Rgb8, fond: Rgb8, part: number): Rgb8 {
  return [0, 1, 2].map((canal) => Math.round(fond[canal] + (encre[canal] - fond[canal]) * part)) as unknown as Rgb8;
}

/** Le nom de calque d'une pastille ([PLA-14]) : `vivid/light/700`. */
export function nomDePastille(profil: Profil, mode: Mode, cran: number): string {
  return `${profil}/${mode}/${cran}`;
}

/** Les encres d'un thème, toutes lisibles sur son fond : texte, texte second, filet, aplat neutre et danger. */
interface Encres {
  readonly fond: Rgb8;
  readonly encre: Peinture;
  readonly seconde: Peinture;
  readonly filet: Peinture;
  readonly neutre: Peinture;
  readonly danger: Peinture;
}

interface Contexte {
  readonly recette: Recette;
  readonly palette: Palette;
  readonly profil: ProfilDuDocument;
  readonly analyse: AnalyseDePalette;
  readonly peints: { nom: string; hexa: string }[];
}

function texte(nom: string, contenu: string, style: StyleDeTexte, couleur: Peinture, largeur?: number): NoeudTexte {
  return largeur === undefined ? { type: 'texte', nom, contenu, style, couleur } : { type: 'texte', nom, contenu, style, couleur, largeur };
}

function cadre(nom: string, direction: NoeudCadre['direction'], enfants: readonly Noeud[], reglages: Partial<Omit<NoeudCadre, 'type' | 'nom' | 'direction' | 'enfants'>> = {}): NoeudCadre {
  return { type: 'cadre', nom, direction, espacement: TRAME, marge: 0, fond: null, rayon: 0, ...reglages, enfants };
}

/** Un cadre vide qui réserve une place dans une rangée. */
function espace(largeur: number, hauteur = TRAME): NoeudCadre {
  return cadre('espace', 'HORIZONTAL', [], { largeur, hauteur });
}

/** Un filet d'un pixel, à la largeur de son parent. */
function filet(couleur: Peinture): NoeudCadre {
  return cadre('filet', 'HORIZONTAL', [], { fond: couleur, hauteur: 1, remplir: true });
}

const CENTRE: Alignement = { principal: 'CENTER', secondaire: 'CENTER' };
const A_GAUCHE: Alignement = { secondaire: 'CENTER' };

/**
 * Les encres d'un thème. L'encre seconde atténue l'encre vers le fond, tant
 * qu'elle y garde 4,5:1 ; le danger est celui des deux qui s'y lit le mieux.
 */
function encresDuTheme(fond: Rgb8, profil: ProfilDuDocument): Encres {
  const encre = encreSur(fond);
  const attenuee = melanger(encre, fond, 0.7);
  const seconde = contraste(attenuee, fond) >= 4.5 ? attenuee : encre;
  const [sombre, clair] = [hexaLu(COULEURS_DE_LA_PLANCHE.dangerSombre), hexaLu(COULEURS_DE_LA_PLANCHE.dangerClair)];
  const danger = contraste(sombre, fond) >= contraste(clair, fond) ? sombre : clair;
  return {
    fond,
    encre: peinture(encre, profil),
    seconde: peinture(seconde, profil),
    filet: peinture(melanger(encre, fond, 0.16), profil),
    neutre: peinture(melanger(encre, fond, 0.06), profil),
    danger: peinture(danger, profil),
  };
}

/** La nuance d'une rampe à son numéro. */
function nuance(contexte: Contexte, profil: Profil, mode: Mode, numero: number): Cran {
  const rang = contexte.analyse.grille.crans.indexOf(numero);
  if (rang < 0) throw new Error(`La nuance ${numero} manque aux crans de la recette.`);
  return contexte.analyse.rampes[profil][mode][rang];
}

/* Les deux rampes */

/** La ligne des numéros, au-dessus des rampes. */
function numeros(contexte: Contexte, encres: Encres): NoeudCadre {
  return cadre('numéros', 'HORIZONTAL', [
    espace(COLONNE.libelle, 1),
    ...contexte.analyse.grille.crans.map((numero) => texte(String(numero), String(numero), 'chiffre', encres.seconde, COLONNE.largeur)),
  ]);
}

/**
 * Une rampe en rangée de pastilles, chacune nommée `profil/mode/cran`
 * ([PLA-14]) : ◆ sur la référence exacte ([MOT-17]), ≈ quand les deux profils
 * s'y confondent ([PLA-15]), et son code dessous.
 */
function rangeeDeRampe(contexte: Contexte, profil: Profil, mode: Mode, encres: Encres): NoeudCadre {
  const { analyse } = contexte;
  const { crans } = analyse.grille;
  const colonnes = analyse.rampes[profil][mode].map((cran, rang) => {
    const nom = nomDePastille(profil, mode, crans[rang]);
    contexte.peints.push({ nom, hexa: cran.hexa });
    const surLaPastille = peinture(noirOuBlanc(cran.couleur), contexte.profil);
    const reperes = [
      ...(analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang ? [texte('référence', TEXTES_DE_LA_PLANCHE.reperage, 'valeur', surLaPastille)] : []),
      ...(analyse.confusions.some((confusion) => confusion.mode === mode && confusion.cran === crans[rang]) ? [texte('confondu', TEXTES_DE_LA_PLANCHE.confondu, 'valeur', surLaPastille)] : []),
    ];
    return cadre(`colonne ${crans[rang]}`, 'VERTICAL', [
      cadre(nom, 'HORIZONTAL', reperes, { fond: peinture(cran.couleur, contexte.profil), rayon: 6, largeur: COLONNE.largeur, hauteur: HAUTEUR_DE_PASTILLE, alignement: CENTRE, espacement: 0 }),
      texte('code', cran.hexa.slice(1), 'note', encres.seconde),
    ], { espacement: 0, largeur: COLONNE.largeur });
  });
  return cadre(`rampe ${profil}`, 'HORIZONTAL', [texte('profil', NOM_DU_PROFIL[profil], 'role', encres.encre, COLONNE.libelle), ...colonnes]);
}

function sectionDesRampes(contexte: Contexte, mode: Mode, encres: Encres): NoeudCadre {
  const { analyse } = contexte;
  const confondus = analyse.confusions.some((confusion) => confusion.mode === mode);
  return cadre('les deux rampes', 'VERTICAL', [
    texte('titre', TEXTES_DE_LA_PLANCHE.rampes, 'theme', encres.encre),
    numeros(contexte, encres),
    ...PROFILS.map((profil) => rangeeDeRampe(contexte, profil, mode, encres)),
    texte('note', confondus ? `${TEXTES_DE_LA_PLANCHE.noteDuRepere} ${TEXTES_DE_LA_PLANCHE.noteDesConfondus}` : TEXTES_DE_LA_PLANCHE.noteDuRepere, 'note', encres.seconde),
  ]);
}

/* Quelle nuance pour quel usage */

/**
 * Le spécimen d'un usage, peint de la nuance de son état : un aplat pour
 * `surface` et `solid`, un lien pour `text`, un champ pour `border-control`,
 * un anneau pour `focus`, un filet pour `border-decorative`.
 */
function specimen(contexte: Contexte, emploi: Emploi, couleur: Rgb8, mode: Mode, encres: Encres): NoeudCadre {
  const { analyse } = contexte;
  const porteur = analyse.ancrage.profil;
  const peint = peinture(couleur, contexte.profil);
  const fond = peinture(encres.fond, contexte.profil);
  const texteColore = peinture(nuance(contexte, porteur, mode, TABLE_DES_EMPLOIS.text).couleur, contexte.profil);
  const boite = { largeur: SPECIMEN.largeur, hauteur: SPECIMEN.hauteur, rayon: 6 };
  const a = TEXTES_DE_LA_PLANCHE.specimens;
  switch (emploi) {
    case 'surface':
      return cadre('spécimen', 'HORIZONTAL', [texte('libellé', a.soft, 'role', texteColore)], { ...boite, fond: peint, margeLaterale: TRAME, alignement: A_GAUCHE });
    case 'text':
      return cadre('spécimen', 'HORIZONTAL', [texte('libellé', a.lien, 'role', peint)], { ...boite, alignement: A_GAUCHE });
    case 'solid':
      return cadre('spécimen', 'HORIZONTAL', [texte('libellé', a.bouton, 'role', fond)], { ...boite, fond: peint, alignement: CENTRE });
    case 'border-control':
      return cadre('spécimen', 'HORIZONTAL', [texte('libellé', a.champ, 'valeur', encres.seconde)], {
        ...boite, fond, trait: { couleur: peint, epaisseur: 1, tirets: false }, margeLaterale: TRAME, alignement: A_GAUCHE,
      });
    case 'focus': {
      const bordure = peinture(nuance(contexte, porteur, mode, TABLE_DES_EMPLOIS['border-control']).couleur, contexte.profil);
      const champ = cadre('champ', 'HORIZONTAL', [texte('libellé', a.champ, 'valeur', encres.encre)], {
        ...boite, fond, trait: { couleur: bordure, epaisseur: 1, tirets: false }, margeLaterale: TRAME, alignement: A_GAUCHE,
      });
      return cadre('spécimen', 'HORIZONTAL', [champ], {
        largeur: SPECIMEN.largeur + TRAME, hauteur: SPECIMEN.hauteur + TRAME, rayon: 8, trait: { couleur: peint, epaisseur: 2, tirets: false }, alignement: CENTRE,
      });
    }
    default:
      return cadre('spécimen', 'HORIZONTAL', [cadre('trait', 'HORIZONTAL', [], { fond: peint, largeur: SPECIMEN.largeur, hauteur: 1 })], { ...boite, alignement: A_GAUCHE });
  }
}

const estLeMembre = (membre: MembrePaire, emploi: Emploi, decalage: number): boolean =>
  'emploi' in membre && membre.emploi === emploi && membre.decalage === decalage;

/** Le nom d'un membre dans une ligne de garantie : « fond », « on-solid » ou « surface 100 ». */
function partenaire(membre: MembrePaire, designe: Promesse['premier']): string {
  if ('fond' in membre) return TEXTES_DE_LA_PLANCHE.fond;
  return designe.nature === 'cran' ? `${membre.emploi} ${designe.cran}` : membre.emploi;
}

/**
 * Les garanties qu'un état porte, dans le profil porteur : une ligne par
 * paire dont il est membre, « sur » son second membre quand il est premier,
 * « dessus » quand il est second. Chaque paire du moteur apparaît ainsi sous
 * chacun de ses membres qui a un usage sur la planche.
 */
function garantiesDeLEtat(contexte: Contexte, emploi: Emploi, decalage: number, mode: Mode, encres: Encres): NoeudTexte[] {
  const { analyse } = contexte;
  return analyse.promesses
    .filter((promesse) => promesse.mode === mode && promesse.profil === analyse.ancrage.profil)
    .flatMap((promesse) => {
      const { premier, second } = promesse.paire;
      const sens = estLeMembre(premier, emploi, decalage)
        ? TEXTES_DU_DETAIL.sur(partenaire(second, promesse.second))
        : estLeMembre(second, emploi, decalage) ? TEXTES_DU_DETAIL.dessus(partenaire(premier, promesse.premier)) : null;
      if (sens === null) return [];
      const tenue = promesse.verdict === 'tenue';
      return [texte(`garantie ${promesse.paire.numero}`, TEXTES_DU_DETAIL.garantie(tenue, sens, promesse.contraste), tenue ? 'note' : 'chiffre', tenue ? encres.seconde : encres.danger, USAGE.etat)];
    });
}

function ligneDUsage(contexte: Contexte, emploi: Emploi, mode: Mode, encres: Encres): NoeudCadre {
  const porteur = contexte.analyse.ancrage.profil;
  const usage = TEXTES_DE_LA_PLANCHE.usages[emploi as keyof typeof TEXTES_DE_LA_PLANCHE.usages];
  const depart = TABLE_DES_EMPLOIS[emploi];
  if (depart === 'fond') throw new Error(`${emploi} n'a pas de nuance sur la planche.`);
  const rangDeDepart = contexte.analyse.grille.crans.indexOf(depart);
  const etats = decalagesDeLEmploi(emploi).map((decalage) => {
    const numero = contexte.analyse.grille.crans[rangDeDepart + decalage];
    const couleur = contexte.analyse.rampes[porteur][mode][rangDeDepart + decalage].couleur;
    return cadre(`${emploi} ${ETATS[decalage]}`, 'VERTICAL', [
      specimen(contexte, emploi, couleur, mode, encres),
      cadre('mesures', 'VERTICAL', [texte('numéro', String(numero), 'chiffre', encres.encre), ...garantiesDeLEtat(contexte, emploi, decalage, mode, encres)], { espacement: 0 }),
    ], { largeur: USAGE.etat });
  });
  return cadre(`usage ${emploi}`, 'HORIZONTAL', [
    cadre('libellés', 'VERTICAL', [
      texte('usage', usage.titre, 'role', encres.encre, USAGE.libelle),
      texte('rôle', emploi === 'focus' ? TEXTES_DE_LA_PLANCHE.etatFocus : emploi, 'note', encres.seconde, USAGE.libelle),
      texte('exemples', usage.exemples, 'note', encres.seconde, USAGE.libelle),
    ], { espacement: 0, largeur: USAGE.libelle }),
    ...etats,
  ], { espacement: 2 * TRAME });
}

function sectionDesUsages(contexte: Contexte, mode: Mode, encres: Encres, largeur: number): NoeudCadre {
  const entete = cadre('états', 'HORIZONTAL', [
    espace(USAGE.libelle, 1),
    ...ETATS.map((etat) => texte(etat, etat, 'chiffre', encres.seconde, USAGE.etat)),
  ], { espacement: 2 * TRAME });
  return cadre('quelle nuance pour quel usage', 'VERTICAL', [
    texte('titre', TEXTES_DE_LA_PLANCHE.titreDesUsages(NOM_DU_PROFIL[contexte.analyse.ancrage.profil]), 'theme', encres.encre),
    entete,
    ...USAGES.flatMap((emploi) => [filet(encres.filet), ligneDUsage(contexte, emploi, mode, encres)]),
  ], { espacement: 2 * TRAME, largeur });
}

/* L'interface d'exemple E2 : un écran de réglages où chaque emploi a sa place (W3.6). */

function bouton(nom: string, libelle: string, fond: Peinture | null, encre: Peinture): NoeudCadre {
  return cadre(nom, 'HORIZONTAL', [texte('libellé', libelle, 'role', encre)], { fond, hauteur: SPECIMEN.hauteur, margeLaterale: 2 * TRAME, rayon: 6, alignement: CENTRE });
}

function exempleEcran(contexte: Contexte, mode: Mode, encres: Encres): NoeudCadre {
  const porteur = contexte.analyse.ancrage.profil;
  const n = (emploi: Exclude<Emploi, 'on-solid'>) => peinture(nuance(contexte, porteur, mode, TABLE_DES_EMPLOIS[emploi]).couleur, contexte.profil);
  const fond = peinture(encres.fond, contexte.profil);
  const e = TEXTES_DE_LA_PLANCHE.exemple;
  const utile = EXEMPLE.largeur - 2 * EXEMPLE.marge;
  const pastilleDeCase = cadre('case', 'HORIZONTAL', [texte('coche', e.coche, 'chiffre', fond)], { fond: n('solid'), largeur: 16, hauteur: 16, rayon: 4, alignement: CENTRE });
  // Le curseur de l'interrupteur est un disque du fond cerclé de l'aplat : il paraît posé à l'intérieur.
  const interrupteur = cadre('interrupteur', 'HORIZONTAL', [
    cadre('curseur', 'HORIZONTAL', [], { fond, trait: { couleur: n('solid'), epaisseur: 2, tirets: false }, largeur: 18, hauteur: 18, rayon: 9 }),
  ], { fond: n('solid'), largeur: 32, hauteur: 18, rayon: 9, alignement: { principal: 'MAX', secondaire: 'CENTER' } });
  return cadre('écran de réglages', 'VERTICAL', [
    cadre('en-tête', 'HORIZONTAL', [
      texte('titre', e.titre, 'theme', encres.encre),
      cadre('badge', 'HORIZONTAL', [texte('libellé', e.badge, 'chiffre', n('text'))], { fond: n('surface'), hauteur: 24, margeLaterale: TRAME, rayon: 12, alignement: CENTRE }),
    ], { largeur: utile, alignement: { principal: 'SPACE_BETWEEN', secondaire: 'CENTER' } }),
    cadre('onglets', 'VERTICAL', [
      cadre('titres', 'HORIZONTAL', [
        cadre(e.onglets[0], 'VERTICAL', [texte('libellé', e.onglets[0], 'role', encres.encre), cadre('soulignement', 'HORIZONTAL', [], { fond: n('solid'), hauteur: 2, remplir: true })]),
        ...e.onglets.slice(1).map((onglet) => texte(onglet, onglet, 'valeur', encres.seconde)),
      ], { espacement: 2 * TRAME }),
      filet(n('border-decorative')),
    ], { espacement: 0, largeur: utile }),
    cadre('champ', 'VERTICAL', [
      texte('libellé', e.libelle, 'valeur', encres.encre),
      cadre('anneau', 'HORIZONTAL', [
        cadre('saisie', 'HORIZONTAL', [texte('valeur', e.valeur, 'valeur', encres.encre)], {
          fond, trait: { couleur: n('border-control'), epaisseur: 1, tirets: false }, largeur: utile - TRAME, hauteur: SPECIMEN.hauteur, rayon: 6, margeLaterale: TRAME, alignement: A_GAUCHE,
        }),
      ], { trait: { couleur: n('focus'), epaisseur: 2, tirets: false }, largeur: utile, hauteur: SPECIMEN.hauteur + TRAME, rayon: 8, alignement: CENTRE }),
    ]),
    cadre('options', 'HORIZONTAL', [
      cadre('case à cocher', 'HORIZONTAL', [pastilleDeCase, texte('libellé', e.caseACocher, 'valeur', encres.encre)], { alignement: A_GAUCHE }),
      cadre('accès', 'HORIZONTAL', [interrupteur, texte('libellé', e.interrupteur, 'valeur', encres.encre)], { alignement: A_GAUCHE }),
    ], { espacement: 2 * TRAME, alignement: A_GAUCHE }),
    cadre('encart', 'HORIZONTAL', [
      texte('icône', e.icone, 'chiffre', n('text')),
      texte('message', e.encart, 'valeur', n('text'), utile - 5 * TRAME),
    ], { fond: n('surface'), trait: { couleur: n('border-decorative'), epaisseur: 1, tirets: false }, marge: TRAME, margeLaterale: 2 * TRAME, rayon: 8, largeur: utile }),
    cadre('actions', 'HORIZONTAL', [
      bouton('annuler', e.boutons[0], null, n('text')),
      bouton('brouillon', e.boutons[1], n('surface'), n('text')),
      bouton('enregistrer', e.boutons[2], n('solid'), fond),
    ], { largeur: utile, alignement: { principal: 'MAX', secondaire: 'CENTER' } }),
  ], {
    fond, trait: { couleur: n('border-decorative'), epaisseur: 1, tirets: false }, marge: EXEMPLE.marge, espacement: 2 * TRAME, rayon: 12, largeur: EXEMPLE.largeur,
  });
}

function sectionDExemple(contexte: Contexte, mode: Mode, encres: Encres): NoeudCadre {
  return cadre('interface d’exemple', 'VERTICAL', [
    texte('titre', TEXTES_DE_LA_PLANCHE.titreDeLExemple(NOM_DU_PROFIL[contexte.analyse.ancrage.profil]), 'theme', encres.encre),
    exempleEcran(contexte, mode, encres),
  ], { espacement: 2 * TRAME });
}

/* Les contrastes, nuance par nuance */

/**
 * La grille d'un profil, sous ses pastilles et dans leurs colonnes : la ligne
 * donne le fond, la colonne le texte. Une paire à 3:1 ou plus se peint telle
 * qu'elle se lira, le ratio en gras à partir du minimum des textes ; en
 * dessous, la case s'efface ([PLA-16], W3.6).
 */
function grilleDuProfil(contexte: Contexte, profil: Profil, mode: Mode, encres: Encres): NoeudCadre {
  const { recette, analyse } = contexte;
  const { crans } = analyse.grille;
  const rampe = analyse.rampes[profil][mode];
  const tete = cadre(`teintes ${profil}`, 'HORIZONTAL', [
    texte('profil', NOM_DU_PROFIL[profil], 'role', encres.encre, COLONNE.libelle),
    ...rampe.map((cran, rang) => cadre(`teinte ${crans[rang]}`, 'HORIZONTAL', [], { fond: peinture(cran.couleur, contexte.profil), largeur: COLONNE.largeur, hauteur: 24, rayon: 6 })),
  ]);
  const lignes = rampe.map((fond, i) => cadre(`fond ${crans[i]}`, 'HORIZONTAL', [
    cadre('nuance', 'HORIZONTAL', [
      cadre('teinte', 'HORIZONTAL', [], { fond: peinture(fond.couleur, contexte.profil), largeur: 12, hauteur: 12, rayon: 3 }),
      texte('numéro', String(crans[i]), 'chiffre', encres.seconde),
    ], { largeur: COLONNE.libelle, alignement: A_GAUCHE }),
    ...rampe.map((lettre, j) => {
      const nom = `${crans[i]}/${crans[j]}`;
      if (i === j) return cadre(nom, 'HORIZONTAL', [], { largeur: COLONNE.largeur, hauteur: 24 });
      const valeur = contraste(fond.couleur, lettre.couleur);
      const lisible = atteintLeSeuil(valeur, recette.seuils.nonTexte);
      return cadre(nom, 'HORIZONTAL', [
        texte('contraste', ecrireContraste(valeur), atteintLeSeuil(valeur, recette.seuils.texte) ? 'chiffre' : 'note', lisible ? peinture(lettre.couleur, contexte.profil) : encres.seconde),
      ], { fond: lisible ? peinture(fond.couleur, contexte.profil) : encres.neutre, largeur: COLONNE.largeur, hauteur: 24, rayon: 4, alignement: CENTRE });
    }),
  ]));
  return cadre(`grille ${mode} ${profil}`, 'VERTICAL', [tete, ...lignes]);
}

function sectionDesContrastes(contexte: Contexte, mode: Mode, encres: Encres, largeur: number): NoeudCadre {
  return cadre('contrastes', 'VERTICAL', [
    cadre('en-tête', 'HORIZONTAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.contrastes, 'theme', encres.encre),
      texte('légende', legendeDesContrastes(contexte.recette.seuils), 'note', encres.seconde),
    ], { largeur, alignement: { principal: 'SPACE_BETWEEN', secondaire: 'CENTER' } }),
    ...PROFILS.map((profil) => grilleDuProfil(contexte, profil, mode, encres)),
  ], { espacement: 2 * TRAME });
}

/* Le cadre */

/**
 * Un thème : son en-tête et son verdict, puis les rampes, les usages,
 * l'exemple et les grilles. Une palette libre sort du modèle : ni usages, ni
 * interface d'exemple, et son en-tête dit « Palette libre · N nuances » à la
 * place du verdict (W6.6).
 */
function sectionDuTheme(contexte: Contexte, mode: Mode, grille: boolean): NoeudCadre {
  const { recette, analyse } = contexte;
  const encres = encresDuTheme(hexaLu(recette.fonds[mode]), contexte.profil);
  const largeur = COLONNE.libelle + analyse.grille.crans.length * (COLONNE.largeur + TRAME);
  const manquees = analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.verdict === 'manquee').length;
  const resultat = analyse.libre ? TEXTES.paletteLibre(analyse.grille.crans.length) : verdictDuTheme(manquees);
  const verdict = cadre('verdict', 'HORIZONTAL', [texte('résultat', resultat, 'chiffre', manquees > 0 ? encres.danger : encres.encre)], {
    fond: encres.neutre, hauteur: 24, margeLaterale: TRAME, rayon: 12, alignement: CENTRE,
  });
  const section = (enfant: NoeudCadre): NoeudCadre[] => [filet(encres.filet), enfant];
  const modele = analyse.libre ? [] : [...section(sectionDesUsages(contexte, mode, encres, largeur)), ...section(sectionDExemple(contexte, mode, encres))];
  return cadre(`thème ${mode}`, 'VERTICAL', [
    cadre('en-tête', 'HORIZONTAL', [texte('titre', enTeteDuTheme(mode, recette.fonds[mode]), 'chiffre', encres.seconde), verdict], {
      largeur, alignement: { principal: 'SPACE_BETWEEN', secondaire: 'CENTER' },
    }),
    sectionDesRampes(contexte, mode, encres),
    ...modele,
    ...(grille ? section(sectionDesContrastes(contexte, mode, encres, largeur)) : []),
  ], {
    fond: peinture(encres.fond, contexte.profil),
    trait: { couleur: peinture(hexaLu(COULEURS_DE_LA_PLANCHE.filet), contexte.profil), epaisseur: 1, tirets: false },
    marge: 3 * TRAME,
    espacement: 3 * TRAME,
    rayon: 12,
  });
}

function construire(recette: Recette, palette: Palette, profil: ProfilDuDocument, peints: { nom: string; hexa: string }[], grille: boolean): NoeudCadre {
  const analyse = analyserPalette(recette, palette);
  const contexte: Contexte = { recette, palette, profil, analyse, peints };
  const blanc = hexaLu(COULEURS_DE_LA_PLANCHE.fondDuCadre);
  return cadre(nomDeLaPalette(palette), 'VERTICAL', [
    cadre('en-tête', 'VERTICAL', [
      texte('titre', nomDeLaPalette(palette), 'palette', peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encre), profil)),
      texte('référence', enTeteDeLaReference(ecrireHexa(referenceDe(palette)), analyse.ancrage), 'valeur', peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encreSecondaire), profil)),
    ]),
    ...MODES.map((mode) => sectionDuTheme(contexte, mode, grille)),
  ], { fond: peinture(blanc, profil), marge: 3 * TRAME, espacement: 2 * TRAME, rayon: TRAME });
}

/**
 * L'empreinte du modèle du cadre d'une palette ([PLA-19], E2) : elle change
 * avec tout ce que le cadre montre, styles de texte compris, et seulement avec
 * cela (V10.10). Aucun texte du cadre ne l'imprime ([PLA-07]) : elle se range
 * dans les données de plugin du cadre.
 */
export function empreinteDuModele(recette: Recette, palette: Palette, profil: ProfilDuDocument, options: { grille: boolean } = { grille: false }): string {
  return empreinte({ styles: STYLES_DE_TEXTE, racine: construire(recette, palette, profil, [], options.grille) });
}

/** Le modèle du cadre d'une palette, et son empreinte. */
export function modeleDeCadre(recette: Recette, palette: Palette, profil: ProfilDuDocument, options: { grille: boolean } = { grille: false }): ModeleDeCadre {
  const peints: { nom: string; hexa: string }[] = [];
  const racine = construire(recette, palette, profil, peints, options.grille);
  return { palette: palette.id, nom: nomDeLaPalette(palette), empreinte: empreinte({ styles: STYLES_DE_TEXTE, racine }), racine, peints };
}

/** Le nombre de calques qu'un modèle pose, racine comprise. */
export function compterCalques(noeud: Noeud): number {
  return noeud.type === 'texte' ? 1 : 1 + noeud.enfants.reduce((total, enfant) => total + compterCalques(enfant), 0);
}
