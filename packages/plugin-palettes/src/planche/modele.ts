/**
 * Le modèle de planche d'une palette ([ARC-07]) : un arbre de données pur,
 * cadres et textes, couleurs peintes, tailles et noms de calque, calculé
 * depuis la recette rangée ([ARC-11]). `ecriture/planche.ts` le traduit en
 * nodes Figma sans rien décider ; tout ce que la section 9 exige se teste ici,
 * hors de Figma.
 *
 * Le cadre reprend les termes et l'organisation de l'onglet Palettes (lot
 * V10) : les rôles du design system et leur nom français, la pastille
 * `on-solid` et les accolades de l'aperçu, puis les garanties de chaque thème
 * groupées par minimum, une ligne par association, chaque état avec son
 * spécimen Soft et Vivid et les deux numéros comparés.
 */
import {
  ASSOCIATIONS,
  MODES,
  PROFILS,
  TABLE_DES_EMPLOIS,
  associationDe,
  atteintLeSeuil,
  cleDeLAssociation,
  contraste,
  distanceOk,
  ecrireContraste,
  ecrireHexa,
  emploisDuCran,
  empreinte,
  etatDeLaPaire,
  lireHexa,
  mesurerCran,
  niveauxWcag,
  referenceDe,
  rgb8VersOklch,
  rgb8VersP3,
  type Association,
  type Mode,
  type Palette,
  type Profil,
  type Promesse,
  type Recette,
  type Rgb8,
} from 'ucm-couleur';

import { analyserPalette, type AnalyseDePalette } from '../analyse';
import type { ProfilDuDocument } from '../lecture';
import { accoladesDe } from '../presentation';
import {
  NOM_DE_L_ETAT,
  NOM_DU_PROFIL,
  NOM_DU_ROLE,
  TEXTES_DES_GARANTIES,
  TEXTES_DE_LA_PLANCHE,
  constatDAlerte,
  contrasteEcrit,
  enTeteDeLaReference,
  enTeteDeSection,
  enTeteDesGaranties,
  legende,
  legendeDesGrilles,
  ligneDAlerte,
  mesureDuSpecimen,
  mesuresDeLaReference,
  niveauxEcrits,
  nomDeLaPalette,
  porteurDeLaReference,
  relationEcrite,
  texteDeCarte,
  texteDesDerives,
  titreDeGrille,
  titreDesGaranties,
} from '../ui/textes';

/** Une couleur peinte : son hexa sRGB, et ses composantes dans l'espace du document (section 6.7). */
export interface Peinture {
  readonly hexa: string;
  readonly composantes: readonly [number, number, number];
}

/**
 * Les styles nommés de la planche (V10.8), du plus haut au plus bas : titre de
 * palette, thème, rôle, valeur, note. Ils entrent dans l'empreinte : changer
 * une taille ou une graisse périme les cadres déjà dessinés (V10.10).
 */
export const STYLES_DE_TEXTE = {
  palette: { family: 'Inter', style: 'Bold', taille: 24 },
  theme: { family: 'Inter', style: 'Semi Bold', taille: 16 },
  role: { family: 'Inter', style: 'Medium', taille: 13 },
  valeur: { family: 'Inter', style: 'Regular', taille: 11 },
  note: { family: 'Inter', style: 'Regular', taille: 10 },
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

/** Un contour : le filet d'une section, la pastille `on-solid`, le spécimen d'une bordure. */
export interface Trait {
  readonly couleur: Peinture;
  readonly epaisseur: number;
  readonly tirets: boolean;
}

export interface NoeudCadre {
  readonly type: 'cadre';
  readonly nom: string;
  readonly direction: 'VERTICAL' | 'HORIZONTAL';
  readonly espacement: number;
  readonly marge: number;
  readonly fond: Peinture | null;
  readonly rayon: number;
  readonly trait?: Trait;
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
  /** L'empreinte du modèle ([PLA-19], E2), que le cadre range dans ses données de plugin. */
  readonly empreinte: string;
  readonly racine: NoeudCadre;
  /** Chaque pastille de nuance peinte, son nom de calque et son hexa : le rapport du dessin les compare à l'aperçu (L6.14). */
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
  /** Le filet d'une section de thème : 3,4:1 sur le blanc, 5,5:1 sur un fond presque noir (V10.4). */
  filet: '#8C8C8C',
  tenu: '#DCF5E3',
  limite: '#FFF1C2',
  faible: '#ECECEC',
} as const;

/** La taille d'une pastille de carte (section 9.3). */
export const PASTILLE = { largeur: 96, hauteur: 56 } as const;

/** La colonne du nom des profils, à gauche des rangées ([PLA-10]). */
const COLONNE_DU_PROFIL = 64;

/** Un spécimen de garantie. */
const SPECIMEN = { largeur: 120, hauteur: 32 } as const;

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

interface Contexte {
  readonly recette: Recette;
  readonly palette: Palette;
  readonly profil: ProfilDuDocument;
  readonly analyse: AnalyseDePalette;
  readonly peints: { nom: string; hexa: string }[];
  readonly encre: Peinture;
  readonly secondaire: Peinture;
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

/** La carte d'une nuance : sa pastille, le repère de la référence, puis son code, ses rôles et son contraste au fond. */
function carteDeCran(contexte: Contexte, mode: Mode, profil: Profil, rang: number, fond: Rgb8, encre: Peinture, confondu: string | null): NoeudCadre {
  const { recette, analyse } = contexte;
  const cran = analyse.rampes[profil][mode][rang];
  const numero = recette.crans[rang];
  const nom = nomDePastille(profil, mode, numero);
  contexte.peints.push({ nom, hexa: cran.hexa });
  const surLaPastille = peinture(noirOuBlanc(cran.couleur), contexte.profil);
  // Le repère de la référence se pose dans la pastille, comme le ◆ de l'aperçu (V10.3).
  const reference = analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang;
  const pastille = cadre(nom, 'VERTICAL', [
    texte('numéro', String(numero), 'role', surLaPastille),
    ...(reference ? [texte('référence', TEXTES_DE_LA_PLANCHE.reperage, 'note', surLaPastille)] : []),
  ], { fond: peinture(cran.couleur, contexte.profil), rayon: 4, largeur: PASTILLE.largeur, hauteur: PASTILLE.hauteur, centre: true, espacement: 0 });
  const valeurs = texteDeCarte({
    hexa: cran.hexa,
    fond: mesurerCran(cran.couleur, fond, recette.seuils).fond,
    emplois: emploisDuCran(recette.crans, rang),
    confondu,
  });
  return cadre(`carte ${profil}.${numero}`, 'VERTICAL', [pastille, texte('valeurs', valeurs, 'valeur', encre, PASTILLE.largeur)], { largeur: PASTILLE.largeur });
}

/** La pastille `on-solid` : le fond du thème, détaché de la section par un contour tireté (V10.5). */
function carteOnSolid(contexte: Contexte, mode: Mode, fond: Rgb8, encre: Peinture): NoeudCadre {
  const pastille = cadre(`on-solid/${mode}`, 'VERTICAL', [
    texte('numéro', TEXTES_DE_LA_PLANCHE.fond, 'role', encre),
  ], {
    fond: peinture(fond, contexte.profil),
    trait: { couleur: peinture(hexaLu(COULEURS_DE_LA_PLANCHE.filet), contexte.profil), epaisseur: 1, tirets: true },
    rayon: 4,
    largeur: PASTILLE.largeur,
    hauteur: PASTILLE.hauteur,
    centre: true,
  });
  return cadre('carte on-solid', 'VERTICAL', [
    pastille,
    texte('valeurs', `${TEXTES_DE_LA_PLANCHE.onSolid}\n${TEXTES_DE_LA_PLANCHE.onSolidEnMots}`, 'valeur', encre, PASTILLE.largeur),
  ], { largeur: PASTILLE.largeur });
}

/** L'abscisse d'une colonne des rangées : `-2` le nom du profil, `-1` la pastille `on-solid`, puis les nuances. */
const abscisse = (colonne: number): number => (colonne === -2 ? 0 : COLONNE_DU_PROFIL + TRAME + (colonne + 1) * (PASTILLE.largeur + TRAME));
const finDeColonne = (colonne: number): number => abscisse(colonne) + (colonne === -2 ? COLONNE_DU_PROFIL : PASTILLE.largeur);

/**
 * Les accolades des rôles sous les rangées, comme dans l'aperçu (V10.5) : un
 * trait fin sur les nuances du rôle, son nom dans le design system, puis son
 * nom français. `accoladesDe` place chaque libellé dans une zone libre.
 */
function accolades(contexte: Contexte, encre: Peinture, secondaire: Peinture): NoeudCadre[] {
  return accoladesDe(contexte.recette.crans).map((ligne, rang) => {
    const enfants: Noeud[] = [];
    let curseur = 0;
    for (const accolade of ligne) {
      const debutDeZone = Math.min(accolade.debut, accolade.libelle.debut);
      const finDeZone = Math.max(accolade.fin, accolade.libelle.fin);
      if (abscisse(debutDeZone) > curseur) enfants.push(espace(abscisse(debutDeZone) - curseur, 2));
      const largeur = finDeColonne(finDeZone) - abscisse(debutDeZone);
      const decalage = abscisse(accolade.debut) - abscisse(debutDeZone);
      const trait = cadre('trait', 'HORIZONTAL', [], { fond: encre, largeur: finDeColonne(accolade.fin) - abscisse(accolade.debut), hauteur: 2 });
      enfants.push(cadre(`accolade ${accolade.emplois.join(' · ')}`, 'VERTICAL', [
        cadre('portée', 'HORIZONTAL', decalage > 0 ? [espace(decalage, 2), trait] : [trait], { espacement: 0 }),
        texte('rôle', accolade.emplois.join(' · '), 'valeur', encre, largeur),
        texte('nom', accolade.emplois.map((emploi) => NOM_DU_ROLE[emploi]).join(' · '), 'note', secondaire, largeur),
      ], { espacement: 0, largeur }));
      curseur = finDeColonne(finDeZone);
    }
    return cadre(`accolades ${rang + 1}`, 'HORIZONTAL', enfants, { espacement: 0 });
  });
}

/** Une section de thème, peinte de son fond et bordée d'un filet (V10.3, V10.4, V10.5). */
function sectionDeMode(contexte: Contexte, mode: Mode): NoeudCadre {
  const { recette, analyse } = contexte;
  const fond = hexaLu(recette.fonds[mode]);
  const encre = peinture(encreSur(fond), contexte.profil);
  const rangees = PROFILS.map((profil, rangDuProfil) => {
    const autre: Profil = profil === 'soft' ? 'vivid' : 'soft';
    const cartes = recette.crans.map((_, rang) => {
      const ici = analyse.rampes[profil][mode][rang].couleur;
      const la = analyse.rampes[autre][mode][rang].couleur;
      // [PLA-15] : la mention « ≈ » vaut sur tous les crans, pas seulement ceux de la table des emplois.
      const confondu = distanceOk(ici, la) < recette.seuils.profilsConfondus ? NOM_DU_PROFIL[autre] : null;
      return carteDeCran(contexte, mode, profil, rang, fond, encre, confondu);
    });
    // La pastille on-solid ne se montre qu'une fois, dans la première rangée ; la seconde lui garde sa colonne.
    const onSolid = rangDuProfil === 0 ? carteOnSolid(contexte, mode, fond, encre) : espace(PASTILLE.largeur);
    return cadre(`rangée ${profil}`, 'HORIZONTAL', [
      texte('profil', NOM_DU_PROFIL[profil], 'role', encre, COLONNE_DU_PROFIL),
      onSolid,
      ...cartes,
    ]);
  });
  return cadre(`section ${mode}`, 'VERTICAL', [
    texte('titre', enTeteDeSection(mode, recette.fonds[mode]), 'theme', encre),
    ...rangees,
    ...accolades(contexte, encre, encre),
  ], {
    fond: peinture(fond, contexte.profil),
    trait: { couleur: peinture(hexaLu(COULEURS_DE_LA_PLANCHE.filet), contexte.profil), epaisseur: 1, tirets: false },
    marge: 3 * TRAME,
    espacement: 2 * TRAME,
    rayon: TRAME,
  });
}

/** Le numéro d'un membre d'une promesse, ou « fond ». */
function numeroDuMembre(promesse: Promesse, rang: 'premier' | 'second'): string {
  const designe = promesse[rang];
  return designe.nature === 'cran' ? String(designe.cran) : TEXTES_DES_GARANTIES.fond;
}

/**
 * Le spécimen d'une promesse, le premier membre posé sur le second : un texte
 * pour `text` et `on-solid`, un aplat pour `solid`, un contour pour une
 * bordure ou un anneau de focus.
 */
function specimen(contexte: Contexte, promesse: Promesse): NoeudCadre {
  const { premier } = associationDe(promesse.paire);
  const couleur = peinture(promesse.premier.couleur, contexte.profil);
  const fond = peinture(promesse.second.couleur, contexte.profil);
  const contenu = premier === 'text' || premier === 'on-solid'
    ? texte('spécimen', TEXTES_DE_LA_PLANCHE.specimen, 'role', couleur)
    : premier === 'solid'
      ? cadre('aplat', 'HORIZONTAL', [], { fond: couleur, largeur: 72, hauteur: 16, rayon: 4 })
      : cadre('contour', 'HORIZONTAL', [], { trait: { couleur, epaisseur: 2, tirets: false }, largeur: 72, hauteur: 16, rayon: 4 });
  return cadre('spécimen', 'HORIZONTAL', [contenu], { fond, largeur: SPECIMEN.largeur, hauteur: SPECIMEN.hauteur, centre: true, rayon: 4 });
}

/** Une ligne d'association : la relation, puis chaque état avec ses spécimens Soft et Vivid (V10.6). */
function ligneDAssociation(contexte: Contexte, association: Association, mode: Mode): NoeudCadre {
  const { analyse, encre, secondaire } = contexte;
  const cle = cleDeLAssociation(association);
  const promesses = analyse.promesses.filter((promesse) => promesse.mode === mode && cleDeLAssociation(associationDe(promesse.paire)) === cle);
  const etats = [...new Set(promesses.map((promesse) => etatDeLaPaire(promesse.paire)))].sort();
  const relation = relationEcrite(association);
  const qui = cadre('relation', 'VERTICAL', [
    texte('rôles', relation.code, 'role', encre, 200),
    texte('noms', relation.francais, 'note', secondaire, 200),
    ...(association.premier === 'on-solid' ? [texte('on-solid', TEXTES_DES_GARANTIES.onSolid, 'note', secondaire, 200)] : []),
  ], { espacement: 0, largeur: 200 });
  const lignesDEtat = etats.map((etat) => cadre(`état ${NOM_DE_L_ETAT[etat]}`, 'HORIZONTAL', [
    texte('état', NOM_DE_L_ETAT[etat], 'valeur', secondaire, 56),
    ...PROFILS.map((profil) => {
      const promesse = promesses.find((candidate) => candidate.profil === profil && etatDeLaPaire(candidate.paire) === etat);
      if (!promesse) throw new Error(`Promesse ${cle} ${profil} ${etat} absente de l'analyse.`);
      return cadre(`${profil}`, 'VERTICAL', [
        specimen(contexte, promesse),
        texte('mesure', mesureDuSpecimen(profil, numeroDuMembre(promesse, 'premier'), numeroDuMembre(promesse, 'second'), promesse.verdict === 'tenue', promesse.contraste), 'note', encre, 200),
      ], { largeur: 200 });
    }),
  ], { espacement: 2 * TRAME }));
  return cadre(`garantie ${cle}`, 'HORIZONTAL', [qui, cadre('états', 'VERTICAL', lignesDEtat)], { espacement: 2 * TRAME });
}

/** Les garanties d'un thème, en deux groupes par minimum, puis `border-decorative` (V10.6, [PLA-17], [PLA-18]). */
function garantiesDuMode(contexte: Contexte, mode: Mode): NoeudCadre {
  const { recette, analyse, encre, secondaire } = contexte;
  const groupes = [
    { seuil: 'texte' as const, titre: TEXTES_DES_GARANTIES.textes, minimum: recette.seuils.texte },
    { seuil: 'nonTexte' as const, titre: TEXTES_DES_GARANTIES.visibles, minimum: recette.seuils.nonTexte },
  ];
  const seuilDe = (association: Association) => analyse.promesses.find((promesse) => cleDeLAssociation(associationDe(promesse.paire)) === cleDeLAssociation(association))?.paire.seuil;
  return cadre(`garanties ${mode}`, 'VERTICAL', [
    texte('titre', titreDesGaranties(mode), 'theme', encre),
    texte('note', TEXTES_DE_LA_PLANCHE.garantiesCitees, 'note', secondaire),
    ...groupes.map((groupe) => cadre(`groupe ${groupe.seuil}`, 'VERTICAL', [
      texte('titre', `${groupe.titre} · ${TEXTES_DES_GARANTIES.minimum(groupe.minimum)}`, 'role', encre),
      ...ASSOCIATIONS.filter((association) => seuilDe(association) === groupe.seuil).map((association) => ligneDAssociation(contexte, association, mode)),
    ], { espacement: 2 * TRAME })),
    texte('border-decorative', `border-decorative ${TEXTES_DES_GARANTIES.decoratif(TABLE_DES_EMPLOIS['border-decorative'])}`, 'valeur', secondaire),
  ], { espacement: 2 * TRAME });
}

/** Le bloc « Couleur de référence » : pastille, code, profil porteur, tableau des contrastes, mesures avancées (V10.2). */
function blocDeReference(contexte: Contexte): NoeudCadre {
  const { recette, palette, analyse, encre, secondaire } = contexte;
  const reference = referenceDe(palette);
  const lue = rgb8VersOklch(reference);
  const LARGEURS = [160, 80, 360];
  const ligne = (nom: string, cellules: readonly string[], style: StyleDeTexte, couleur: Peinture) =>
    cadre(nom, 'HORIZONTAL', cellules.map((contenu, rang) => texte(TEXTES_DE_LA_PLANCHE.colonnesDesContrastes[rang], contenu, style, couleur, LARGEURS[rang])), { espacement: 0 });
  const comparaisons: readonly [string, Rgb8][] = [
    [TEXTES_DE_LA_PLANCHE.contre.blanc, [255, 255, 255]],
    [TEXTES_DE_LA_PLANCHE.contre.noir, [0, 0, 0]],
    [TEXTES_DE_LA_PLANCHE.contre.light, hexaLu(recette.fonds.light)],
    [TEXTES_DE_LA_PLANCHE.contre.dark, hexaLu(recette.fonds.dark)],
  ];
  const tableau = cadre(TEXTES_DE_LA_PLANCHE.contrastes, 'VERTICAL', [
    texte('titre', TEXTES_DE_LA_PLANCHE.contrastes, 'role', encre),
    ligne('titres', TEXTES_DE_LA_PLANCHE.colonnesDesContrastes, 'note', secondaire),
    ...comparaisons.map(([nom, fond]) => {
      const valeur = contraste(reference, fond);
      return ligne(nom, [nom, contrasteEcrit(valeur), niveauxEcrits(niveauxWcag(valeur))], 'valeur', encre);
    }),
  ], { espacement: 0 });
  const mesures = cadre(TEXTES_DE_LA_PLANCHE.mesures, 'VERTICAL', [
    texte('titre', TEXTES_DE_LA_PLANCHE.mesures, 'role', encre),
    texte('valeurs', mesuresDeLaReference(lue.L, lue.C, lue.H, analyse.part), 'valeur', encre),
    texte('dérives', texteDesDerives(palette), 'valeur', encre),
  ], { espacement: 0 });
  return cadre(TEXTES_DE_LA_PLANCHE.reference, 'HORIZONTAL', [
    cadre('référence', 'VERTICAL', [], { fond: peinture(reference, contexte.profil), largeur: 2 * PASTILLE.largeur, hauteur: PASTILLE.hauteur, rayon: 4 }),
    cadre('valeurs', 'VERTICAL', [
      texte('code', ecrireHexa(reference), 'role', encre),
      texte('porteur', porteurDeLaReference(analyse.ancrage, palette.base), 'valeur', encre),
      tableau,
      mesures,
    ], { espacement: 2 * TRAME }),
  ], { espacement: 3 * TRAME });
}

/** La grille de contraste d'une rampe (section 9.5, V10.7) : numéros sur les deux axes, valeur dans chaque case. */
function grilleDeContraste(contexte: Contexte, mode: Mode, profil: Profil): NoeudCadre {
  const { recette, analyse, encre, secondaire } = contexte;
  const rampe = analyse.rampes[profil][mode];
  const fondDe = (valeur: number) => hexaLu(atteintLeSeuil(valeur, recette.seuils.texte)
    ? COULEURS_DE_LA_PLANCHE.tenu
    : atteintLeSeuil(valeur, recette.seuils.nonTexte) ? COULEURS_DE_LA_PLANCHE.limite : COULEURS_DE_LA_PLANCHE.faible);
  const case_ = (nom: string, contenu: string, fond: Peinture | null) =>
    cadre(nom, 'HORIZONTAL', contenu === '' ? [] : [texte('valeur', contenu, 'note', fond ? encre : secondaire)], { fond, largeur: 40, hauteur: 24, centre: true });
  const axe = cadre('axe', 'HORIZONTAL', [case_('coin', '', null), ...recette.crans.map((cran) => case_(`colonne ${cran}`, String(cran), null))], { espacement: 0 });
  const lignes = rampe.map((ligne, i) => cadre(`ligne ${recette.crans[i]}`, 'HORIZONTAL', [
    case_(`nuance ${recette.crans[i]}`, String(recette.crans[i]), null),
    ...rampe.map((colonne, j) => {
      const valeur = contraste(ligne.couleur, colonne.couleur);
      return case_(`${recette.crans[i]}/${recette.crans[j]}`, ecrireContraste(valeur), peinture(fondDe(valeur), contexte.profil));
    }),
  ], { espacement: 0 }));
  return cadre(`grille ${mode} ${profil}`, 'VERTICAL', [
    texte('titre', titreDeGrille(mode, profil), 'role', encre),
    cadre('cases', 'VERTICAL', [axe, ...lignes], { espacement: 0 }),
  ]);
}

function construire(recette: Recette, palette: Palette, profil: ProfilDuDocument, peints: { nom: string; hexa: string }[], grille: boolean): NoeudCadre {
  const analyse = analyserPalette(recette, palette);
  const encre = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encre), profil);
  const secondaire = peinture(hexaLu(COULEURS_DE_LA_PLANCHE.encreSecondaire), profil);
  const contexte: Contexte = { recette, palette, profil, analyse, peints, encre, secondaire };
  const manquees = (duProfil: Profil) => analyse.promesses.filter((promesse) => promesse.profil === duProfil && promesse.verdict === 'manquee').length;
  const nomDeRecette = (id: string) => {
    const trouvee = recette.palettes.find((candidate) => candidate.id === id);
    return trouvee ? nomDeLaPalette(trouvee) : id;
  };
  // Les repères d'intensité se lisent dans les réglages de la palette, pas sur la planche.
  const alertes = analyse.alertes
    .filter((alerte) => alerte.code !== 'reference-plus-terne' && alerte.code !== 'reference-plus-vive')
    .map((alerte) => texte('alerte', ligneDAlerte(constatDAlerte(alerte, { recette, nomDe: nomDeRecette })), 'valeur', encre, 800));
  const grilles = grille
    ? [cadre(TEXTES_DE_LA_PLANCHE.grilles, 'VERTICAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.grilles, 'theme', encre),
      texte('note', TEXTES_DE_LA_PLANCHE.noteDesGrilles, 'note', secondaire, 800),
      texte('légende', legendeDesGrilles(recette.seuils), 'note', secondaire, 800),
      ...MODES.flatMap((mode) => PROFILS.map((duProfil) => grilleDeContraste(contexte, mode, duProfil))),
    ], { espacement: 3 * TRAME })]
    : [];
  return cadre(nomDeLaPalette(palette), 'VERTICAL', [
    cadre('en-tête', 'VERTICAL', [
      texte('titre', nomDeLaPalette(palette), 'palette', encre),
      texte('référence', enTeteDeLaReference(ecrireHexa(referenceDe(palette)), analyse.ancrage), 'valeur', secondaire),
      texte('garanties', enTeteDesGaranties(manquees('soft'), manquees('vivid')), 'valeur', encre),
    ]),
    blocDeReference(contexte),
    ...MODES.map((mode) => sectionDeMode(contexte, mode)),
    ...MODES.map((mode) => garantiesDuMode(contexte, mode)),
    ...grilles,
    cadre(TEXTES_DE_LA_PLANCHE.alertes, 'VERTICAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.alertes, 'theme', encre),
      ...(alertes.length > 0 ? alertes : [texte('aucune', TEXTES_DE_LA_PLANCHE.aucuneAlerte, 'valeur', secondaire)]),
    ]),
    cadre(TEXTES_DE_LA_PLANCHE.legende, 'VERTICAL', [
      texte('titre', TEXTES_DE_LA_PLANCHE.legende, 'theme', encre),
      texte('texte', legende(recette.seuils), 'valeur', secondaire, 800),
    ]),
  ], { fond: peinture(hexaLu(COULEURS_DE_LA_PLANCHE.fondDuCadre), profil), marge: 4 * TRAME, espacement: 4 * TRAME, rayon: 2 * TRAME });
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
