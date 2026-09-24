/**
 * Le modèle de planche d'une palette ([ARC-07]) : un arbre de données pur,
 * cadres et textes, couleurs peintes, tailles et noms de calque, calculé
 * depuis la recette rangée ([ARC-11]). `ecriture/planche.ts` le traduit en
 * nodes Figma sans rien décider ; tout ce que la section 9 exige se teste ici,
 * hors de Figma.
 */
import {
  MODES,
  PAIRES,
  PROFILS,
  TABLE_DES_EMPLOIS,
  EMPLOIS,
  atteintLeSeuil,
  contraste,
  ecrireContraste,
  distanceOk,
  emploisDuCran,
  empreinte,
  lireHexa,
  mesurerCran,
  referenceDe,
  rgb8VersOklch,
  rgb8VersP3,
  ecrireHexa,
  type Emploi,
  type Mode,
  type Palette,
  type Profil,
  type Recette,
  type Rgb8,
} from 'ucm-couleur';

import { analyserPalette } from '../analyse';
import type { ProfilDuDocument } from '../lecture';
import {
  TEXTES_DE_LA_PLANCHE,
  constatDAlerte,
  enTeteDeRangee,
  enTeteDeSection,
  enTeteDuCadre,
  legende,
  ligneDAlerte,
  ligneDePaire,
  nomDeLaPalette,
  seuilTenuEcrit,
  texteDeCarte,
  texteDeReference,
  texteDesDerives,
  titreDeTable,
} from '../ui/textes';

/** Une couleur peinte : son hexa sRGB, et ses composantes dans l'espace du document (section 6.7). */
export interface Peinture {
  readonly hexa: string;
  readonly composantes: readonly [number, number, number];
}

/** Les trois styles de texte de la planche ([PLA-22]). */
export type StyleDeTexte = 'titre' | 'section' | 'valeur';

export interface NoeudTexte {
  readonly type: 'texte';
  readonly nom: string;
  readonly contenu: string;
  readonly style: StyleDeTexte;
  readonly couleur: Peinture;
  /** Une largeur fixe : le texte passe à la ligne dedans. Sans elle, il suit son contenu. */
  readonly largeur?: number;
}

export interface NoeudCadre {
  readonly type: 'cadre';
  readonly nom: string;
  readonly direction: 'VERTICAL' | 'HORIZONTAL';
  readonly espacement: number;
  readonly marge: number;
  readonly fond: Peinture | null;
  readonly rayon: number;
  /** Une taille fixe ; sans elle, le cadre épouse son contenu (auto layout, [PLA-21]). */
  readonly largeur?: number;
  readonly hauteur?: number;
  readonly centre?: boolean;
  readonly enfants: readonly Noeud[];
}

export type Noeud = NoeudTexte | NoeudCadre;

/** Le modèle d'un cadre de palette, et ce qu'il peint. */
export interface ModeleDeCadre {
  readonly palette: string;
  readonly nom: string;
  /** L'empreinte du modèle ([PLA-19], E2), que l'en-tête affiche et que le cadre range. */
  readonly empreinte: string;
  readonly racine: NoeudCadre;
  /** Chaque pastille peinte, son nom de calque et son hexa : le rapport du dessin les compare à l'aperçu (L6.14). */
  readonly peints: readonly { readonly nom: string; readonly hexa: string }[];
}

/** La trame de la planche ([PLA-21]). */
export const TRAME = 8;

/** Les couleurs de légende, de filet et de fond, séparées des couleurs de la palette ([PLA-23]). */
export const COULEURS_DE_LA_PLANCHE = {
  fondDuCadre: '#FFFFFF',
  encre: '#1E1E1E',
  encreClaire: '#F5F5F5',
  encreSecondaire: '#6B6B6B',
  tenu: '#DCF5E3',
  limite: '#FFF1C2',
  faible: '#ECECEC',
} as const;

/** La taille d'une pastille de carte (section 9.3). */
export const PASTILLE = { largeur: 96, hauteur: 56 } as const;

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

/** Le nom de calque d'une pastille ([PLA-14]) : `vivid/light/700`. */
export function nomDePastille(profil: Profil, mode: Mode, cran: number): string {
  return `${profil}/${mode}/${cran}`;
}

/** La paire qui juge chaque emploi dans sa table (section 9.4) ; aucune pour `border-decorative`. */
export const PAIRE_PRINCIPALE: { readonly [E in Emploi]: number | null } = {
  solid: 5,
  'on-solid': 5,
  text: 1,
  surface: 2,
  'border-control': 8,
  'border-decorative': null,
  focus: 12,
};

/** Les largeurs des colonnes d'une table d'emplois, dans l'ordre des titres. */
const COLONNES = [112, 200, 40, 120, 64, 40, 56];

/** Le texte que l'en-tête affiche pendant le calcul de l'empreinte, qu'il ne peut pas contenir. */
const EMPREINTE_EN_ATTENTE = '········';

interface Contexte {
  readonly recette: Recette;
  readonly palette: Palette;
  readonly profil: ProfilDuDocument;
  readonly peints: { nom: string; hexa: string }[];
}

function texte(nom: string, contenu: string, style: StyleDeTexte, couleur: Peinture, largeur?: number): NoeudTexte {
  return largeur === undefined ? { type: 'texte', nom, contenu, style, couleur } : { type: 'texte', nom, contenu, style, couleur, largeur };
}

function cadre(nom: string, direction: NoeudCadre['direction'], enfants: readonly Noeud[], reglages: Partial<Omit<NoeudCadre, 'type' | 'nom' | 'direction' | 'enfants'>> = {}): NoeudCadre {
  return { type: 'cadre', nom, direction, espacement: TRAME, marge: 0, fond: null, rayon: 0, ...reglages, enfants };
}

function carteDeCran(contexte: Contexte, mode: Mode, profil: Profil, rang: number, fond: Rgb8, encre: Peinture, confondu: string | null, rampes: ReturnType<typeof analyserPalette>['rampes']): NoeudCadre {
  const { recette } = contexte;
  const cran = rampes[profil][mode][rang];
  const numero = recette.crans[rang];
  const mesure = mesurerCran(cran.couleur, fond, recette.seuils);
  const nom = nomDePastille(profil, mode, numero);
  contexte.peints.push({ nom, hexa: cran.hexa });
  const pastille = cadre(nom, 'VERTICAL', [
    texte('numéro', String(numero), 'section', peinture(noirOuBlanc(cran.couleur), contexte.profil)),
  ], { fond: peinture(cran.couleur, contexte.profil), rayon: 4, largeur: PASTILLE.largeur, hauteur: PASTILLE.hauteur, centre: true });
  const valeurs = texteDeCarte({
    nom: `${profil}.${numero}`,
    hexa: cran.hexa,
    L: cran.L,
    C: cran.C,
    H: cran.H,
    fond: mesure.fond,
    seuilTenu: mesure.seuilTenu === null ? null : recette.seuils[mesure.seuilTenu],
    blanc: mesure.blanc,
    noir: mesure.noir,
    emplois: emploisDuCran(recette.crans, rang),
    confondu,
  });
  return cadre(`carte ${profil}.${numero}`, 'VERTICAL', [pastille, texte('valeurs', valeurs, 'valeur', encre, PASTILLE.largeur)], { largeur: PASTILLE.largeur });
}

function sectionDeMode(contexte: Contexte, mode: Mode, analyse: ReturnType<typeof analyserPalette>): NoeudCadre {
  const { recette } = contexte;
  const fond = hexaLu(recette.fonds[mode]);
  const encre = peinture(encreSur(fond), contexte.profil);
  const rangees = PROFILS.map((profil) => {
    const autre: Profil = profil === 'soft' ? 'vivid' : 'soft';
    const cartes = recette.crans.map((_, rang) => {
      const ici = analyse.rampes[profil][mode][rang].couleur;
      const la = analyse.rampes[autre][mode][rang].couleur;
      // [PLA-15] : la mention « ≈ » vaut sur tous les crans, pas seulement ceux de la table des emplois.
      const confondu = distanceOk(ici, la) < recette.seuils.profilsConfondus ? autre : null;
      return carteDeCran(contexte, mode, profil, rang, fond, encre, confondu, analyse.rampes);
    });
    return cadre(`rangée ${profil}`, 'HORIZONTAL', [
      texte('profil', enTeteDeRangee(profil, analyse.parts[profil]), 'section', encre, 64),
      ...cartes,
    ]);
  });
  return cadre(`section ${mode}`, 'VERTICAL', [
    texte('titre', enTeteDeSection(mode, recette.fonds[mode]), 'section', encre),
    ...rangees,
  ], { fond: peinture(fond, contexte.profil), marge: 3 * TRAME, espacement: 2 * TRAME, rayon: TRAME });
}

function tableDEmplois(contexte: Contexte, mode: Mode, profil: Profil, analyse: ReturnType<typeof analyserPalette>): NoeudCadre {
  const { recette } = contexte;
  const encre = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encre), contexte.profil);
  const secondaire = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encreSecondaire), contexte.profil);
  const promesse = (numero: number) => analyse.promesses.find((candidate) =>
    candidate.mode === mode && candidate.profil === profil && candidate.paire.numero === numero);
  const cellule = (colonne: number, contenu: string, couleur = encre) =>
    texte(TEXTES_DE_LA_PLANCHE.colonnes[colonne], contenu, 'valeur', couleur, COLONNES[colonne]);
  const titres = cadre('titres', 'HORIZONTAL', TEXTES_DE_LA_PLANCHE.colonnes.map((titre, colonne) => cellule(colonne, titre, secondaire)));
  const lignes = EMPLOIS.map((emploi) => {
    const numero = PAIRE_PRINCIPALE[emploi];
    const paire = numero === null ? undefined : promesse(numero);
    const cran = TABLE_DES_EMPLOIS[emploi];
    const specimen = paire
      ? cadre(TEXTES_DE_LA_PLANCHE.colonnes[3], 'HORIZONTAL', [
        texte('spécimen', TEXTES_DE_LA_PLANCHE.specimen, 'valeur', peinture(paire.premier.couleur, contexte.profil)),
      ], { fond: peinture(paire.second.couleur, contexte.profil), largeur: 120, hauteur: 32, centre: true, rayon: 4 })
      : cellule(3, '–');
    return cadre(emploi, 'HORIZONTAL', [
      cellule(0, emploi),
      cellule(1, TEXTES_DE_LA_PLANCHE.usage[emploi]),
      cellule(2, String(cran)),
      specimen,
      cellule(4, paire ? ecrireContraste(paire.contraste) : '–'),
      cellule(5, paire ? seuilTenuEcrit(paire.seuil) : '–'),
      cellule(6, paire ? (paire.verdict === 'tenue' ? TEXTES_DE_LA_PLANCHE.tenu : TEXTES_DE_LA_PLANCHE.manque) : '–'),
    ]);
  });
  const principales = new Set(Object.values(PAIRE_PRINCIPALE));
  const etats = PAIRES.filter((paire) => !principales.has(paire.numero)).map((paire) => {
    const jugee = promesse(paire.numero);
    if (!jugee) throw new Error(`Promesse ${paire.numero} absente de l'analyse.`);
    return texte(`paire ${paire.numero}`, ligneDePaire(paire.premier, paire.second, jugee.contraste, jugee.seuil, jugee.verdict === 'tenue'), 'valeur', encre);
  });
  return cadre(`emplois ${mode} ${profil}`, 'VERTICAL', [
    texte('titre', titreDeTable(mode, profil), 'section', encre),
    titres,
    ...lignes,
    texte('états', TEXTES_DE_LA_PLANCHE.etats, 'section', secondaire),
    ...etats,
  ]);
}

function blocDeReference(contexte: Contexte, analyse: ReturnType<typeof analyserPalette>): NoeudCadre {
  const { recette, palette } = contexte;
  const encre = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encre), contexte.profil);
  const reference = referenceDe(palette);
  const lue = rgb8VersOklch(reference);
  const contre = (nom: string, fond: Rgb8) => {
    const mesure = mesurerCran(reference, fond, recette.seuils);
    return { contre: nom, valeur: mesure.fond, seuil: mesure.seuilTenu === null ? null : recette.seuils[mesure.seuilTenu] };
  };
  const pastille = cadre('référence', 'VERTICAL', [], {
    fond: peinture(reference, contexte.profil),
    largeur: 2 * PASTILLE.largeur,
    hauteur: PASTILLE.hauteur,
    rayon: 4,
  });
  const enfants: Noeud[] = [
    pastille,
    texte('valeurs', texteDeReference({
      hexa: ecrireHexa(reference),
      L: lue.L,
      C: lue.C,
      H: lue.H,
      part: analyse.part,
      ancrage: analyse.ancrage,
      contrastes: [
        contre('blanc', [255, 255, 255]),
        contre('noir', [0, 0, 0]),
        contre('fond clair', hexaLu(recette.fonds.light)),
        contre('fond sombre', hexaLu(recette.fonds.dark)),
      ],
    }), 'valeur', encre),
    texte('dérives', texteDesDerives(palette), 'valeur', encre),
  ];
  return cadre(TEXTES_DE_LA_PLANCHE.reference, 'HORIZONTAL', enfants, { espacement: 3 * TRAME });
}

/** La grille de contraste d'une rampe (section 9.5), sur demande. */
function grilleDeContraste(contexte: Contexte, mode: Mode, profil: Profil, analyse: ReturnType<typeof analyserPalette>): NoeudCadre {
  const { recette } = contexte;
  const encre = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encre), contexte.profil);
  const rampe = analyse.rampes[profil][mode];
  const fondDe = (valeur: number) => hexaLu(atteintLeSeuil(valeur, recette.seuils.texte)
    ? COULEURS_DE_LA_PLANCHE.tenu
    : atteintLeSeuil(valeur, recette.seuils.nonTexte) ? COULEURS_DE_LA_PLANCHE.limite : COULEURS_DE_LA_PLANCHE.faible);
  const lignes = rampe.map((ligne, i) => cadre(`ligne ${recette.crans[i]}`, 'HORIZONTAL', rampe.map((colonne, j) => {
    const valeur = contraste(ligne.couleur, colonne.couleur);
    return cadre(`${recette.crans[i]}/${recette.crans[j]}`, 'HORIZONTAL', [
      texte('contraste', ecrireContraste(valeur), 'valeur', encre),
    ], { fond: peinture(fondDe(valeur), contexte.profil), largeur: 40, hauteur: 24, centre: true });
  }), { espacement: 0 }));
  return cadre(`grille ${mode} ${profil}`, 'VERTICAL', lignes, { espacement: 0 });
}

function construire(contexte: Contexte, empreinteAffichee: string, grille: boolean): NoeudCadre {
  const { recette, palette } = contexte;
  const analyse = analyserPalette(recette, palette);
  const encre = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encre), contexte.profil);
  const secondaire = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encreSecondaire), contexte.profil);
  const tenues = analyse.promesses.length - analyse.manquees;
  const nomDeRecette = (id: string) => {
    const trouvee = recette.palettes.find((candidate) => candidate.id === id);
    return trouvee ? nomDeLaPalette(trouvee) : id;
  };
  const alertes = analyse.constats.flatMap((constat) => {
    if ('promesse' in constat) return [];
    return [texte('alerte', ligneDAlerte(constatDAlerte(constat.alerte, { recette, nomDe: nomDeRecette })), 'valeur', encre, 800)];
  });
  const emplois = MODES.map((mode) => cadre(`emplois ${mode}`, 'HORIZONTAL',
    PROFILS.map((profil) => tableDEmplois(contexte, mode, profil, analyse)), { espacement: 4 * TRAME }));
  const grilles = grille
    ? [cadre('grilles', 'VERTICAL', MODES.flatMap((mode) => PROFILS.map((profil) => grilleDeContraste(contexte, mode, profil, analyse))), { espacement: 3 * TRAME })]
    : [];
  return cadre(nomDeLaPalette(palette), 'VERTICAL', [
    cadre('en-tête', 'VERTICAL', [
      texte('titre', nomDeLaPalette(palette), 'titre', encre),
      texte('recette', enTeteDuCadre(recette.formatVersion, empreinteAffichee, contexte.profil, tenues, analyse.promesses.length), 'valeur', secondaire),
      texte('avertissement', TEXTES_DE_LA_PLANCHE.avertissement, 'valeur', secondaire),
    ]),
    blocDeReference(contexte, analyse),
    ...MODES.map((mode) => sectionDeMode(contexte, mode, analyse)),
    cadre(TEXTES_DE_LA_PLANCHE.emplois, 'VERTICAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.emplois, 'section', encre),
      texte('note', TEXTES_DE_LA_PLANCHE.emploisCites, 'valeur', secondaire),
      ...emplois,
    ], { espacement: 2 * TRAME }),
    ...grilles,
    cadre(TEXTES_DE_LA_PLANCHE.alertes, 'VERTICAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.alertes, 'section', encre),
      ...(alertes.length > 0 ? alertes : [texte('aucune', TEXTES_DE_LA_PLANCHE.aucuneAlerte, 'valeur', secondaire)]),
    ]),
    cadre(TEXTES_DE_LA_PLANCHE.legende, 'VERTICAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.legende, 'section', encre),
      texte('texte', legende(recette.seuils, { soft: recette.profils.soft.part, vivid: recette.profils.vivid.part }), 'valeur', secondaire, 800),
    ]),
  ], { fond: peinture(hexaLu(COULEURS_DE_LA_PLANCHE.fondDuCadre), contexte.profil), marge: 4 * TRAME, espacement: 3 * TRAME, rayon: 2 * TRAME });
}

/**
 * L'empreinte du modèle du cadre d'une palette ([PLA-19], E2). Elle porte sur
 * le modèle dont l'en-tête montre un texte d'attente à la place de
 * l'empreinte : l'empreinte ne peut pas se contenir. Elle change donc avec
 * tout ce que le cadre montre, et seulement avec cela. La fraîcheur n'a besoin
 * que d'elle, et ne construit pas le cadre affiché.
 */
export function empreinteDuModele(recette: Recette, palette: Palette, profil: ProfilDuDocument, options: { grille: boolean } = { grille: false }): string {
  return empreinte(construire({ recette, palette, profil, peints: [] }, EMPREINTE_EN_ATTENTE, options.grille));
}

/** Le modèle du cadre d'une palette, dont l'en-tête affiche l'empreinte. */
export function modeleDeCadre(recette: Recette, palette: Palette, profil: ProfilDuDocument, options: { grille: boolean } = { grille: false }): ModeleDeCadre {
  const empreinteAffichee = empreinteDuModele(recette, palette, profil, options);
  const peints: { nom: string; hexa: string }[] = [];
  const racine = construire({ recette, palette, profil, peints }, empreinteAffichee, options.grille);
  return { palette: palette.id, nom: nomDeLaPalette(palette), empreinte: empreinteAffichee, racine, peints };
}

/** Le nombre de calques qu'un modèle pose, racine comprise. */
export function compterCalques(noeud: Noeud): number {
  return noeud.type === 'texte' ? 1 : 1 + noeud.enfants.reduce((total, enfant) => total + compterCalques(enfant), 0);
}
