/**
 * Ce que la configuration de la recette modifie (section 8.3) : le préréglage
 * du nombre de nuances, les deux courbes, les parts des profils et celle des
 * fonds du thème Dark, les deux fonds, les cinq seuils et le contenu des
 * planches, rangés en six cartes que « Rétablir » remet une à une aux valeurs
 * par défaut (V9.5). Une autre liste que les trois préréglages ne vient que
 * d'un import ([ENT-08]).
 */
import {
  CONTENU_COMPLET,
  MODES,
  PREREGLAGES,
  aUneIntensite,
  ajusterPartsGrises,
  ecrireHexa,
  grilleAuPrereglage,
  grilleDe,
  intensitesDe,
  lireHexa,
  nombreDeNuancesDe,
  rampeDe,
  rampesDe,
  recetteParDefaut,
  type Mode,
  type ContenuDesPlanches,
  type NombreDeNuances,
  type Palette,
  type Profil,
  type Recette,
  type Seuils,
} from 'ucm-couleur';

/** Un champ numérique de la configuration. */
export type ChampDeConfiguration =
  | { readonly courbe: Mode; readonly rang: number }
  | { readonly part: Profil }
  | { readonly fondsSombres: true }
  | { readonly seuil: keyof Seuils };

/** Les groupes de champs, chacun avec le compte des palettes qu'il modifie ([ENT-07]). */
export type GroupeDeConfiguration = 'courbes' | 'parts' | 'fondsSombres' | 'fonds' | 'contraste' | 'profilsConfondus' | 'palettesProches' | 'chromaGrise' | 'contenu';

/**
 * Un nombre saisi, à virgule ou à point, signe moins ordinaire ou
 * typographique ; `null` pour une saisie qui n'en est pas un.
 */
export function lireNombre(saisie: string): number | null {
  const nettoyee = saisie.trim().replace(',', '.').replace('−', '-');
  if (!/^-?\d+(\.\d+)?$/.test(nettoyee)) return null;
  return Number(nettoyee);
}

/**
 * La recette où le champ prend la valeur, sans validation : `validerRecette` en
 * juge. Le seuil de chroma grise décide quelles palettes portent des parts
 * `grise` ([ENT-09]) : le changer les recalcule toutes.
 */
export function poserValeur(recette: Recette, champ: ChampDeConfiguration, valeur: number): Recette {
  if ('courbe' in champ) {
    const courbe = [...recette.courbes[champ.courbe]];
    courbe[champ.rang] = valeur;
    return { ...recette, courbes: { ...recette.courbes, [champ.courbe]: courbe } };
  }
  if ('part' in champ) {
    return { ...recette, profils: { ...recette.profils, [champ.part]: { part: valeur } } };
  }
  if ('fondsSombres' in champ) return { ...recette, intensiteDesFondsSombres: valeur };
  const suivante = { ...recette, seuils: { ...recette.seuils, [champ.seuil]: valeur } };
  if (champ.seuil !== 'chromaGrise') return suivante;
  return { ...suivante, palettes: suivante.palettes.map((palette) => ajusterPartsGrises(suivante, palette)) };
}

/** La valeur que le champ porte dans la recette. */
export function valeurDe(recette: Recette, champ: ChampDeConfiguration): number {
  if ('courbe' in champ) return recette.courbes[champ.courbe][champ.rang];
  if ('part' in champ) return recette.profils[champ.part].part;
  if ('fondsSombres' in champ) return recette.intensiteDesFondsSombres;
  return recette.seuils[champ.seuil];
}

/** La recette où le fond du mode prend l'hexa saisi, écrit en majuscules ; `null` pour une saisie qui n'est pas une couleur. */
export function poserFond(recette: Recette, mode: Mode, saisie: string): Recette | null {
  const couleur = lireHexa(saisie);
  return couleur ? { ...recette, fonds: { ...recette.fonds, [mode]: ecrireHexa(couleur) } } : null;
}

/** La recette où une partie des cadres de la planche se dessine ou non ([PLA-28]) ; la validation refuse un cadre sans thème. */
export function poserPartie(recette: Recette, partie: keyof ContenuDesPlanches, dessinee: boolean): Recette {
  return { ...recette, contenuDesPlanches: { ...recette.contenuDesPlanches, [partie]: dessinee } };
}

/**
 * Le nombre de palettes qu'un groupe de champs modifie ([ENT-07]). Courbes,
 * fonds, fonds du thème Dark, seuils de contraste et contenu des planches les
 * modifient toutes. Une part de profil épargne les palettes qui portent leurs
 * parts propres et celles à une intensité, qui prennent la part de leur
 * référence ([ENT-14]). Le seuil des profils
 * confondus épargne les palettes aux parts `grise`, pour lesquelles l'alerte
 * se tait ; celui de chroma grise, les palettes aux parts du designer, qu'il
 * ne touche jamais. Le seuil des palettes proches compare deux palettes : seul,
 * une palette n'en a aucune à comparer.
 */
export function palettesModifiees(recette: Recette, groupe: GroupeDeConfiguration): number {
  const { palettes } = recette;
  switch (groupe) {
    case 'parts': return palettes.filter((palette) => !palette.parts && !aUneIntensite(palette)).length;
    case 'profilsConfondus': return palettes.filter((palette) => palette.parts?.origine !== 'grise').length;
    case 'chromaGrise': return palettes.filter((palette) => palette.parts?.origine !== 'designer').length;
    case 'palettesProches': return palettes.length < 2 ? 0 : palettes.length;
    default: return palettes.length;
  }
}

/**
 * Les cartes des Réglages communs, dans leur ordre (V9.2), et les groupes que
 * chacune porte. Deux cartes repliées réunissent les seuils.
 */
export const CARTES_DES_REGLAGES = {
  fonds: ['fonds'],
  parts: ['parts', 'fondsSombres'],
  courbes: ['courbes'],
  minimums: ['contraste'],
  proches: ['profilsConfondus', 'palettesProches', 'chromaGrise'],
  contenu: ['contenu'],
} as const satisfies Record<string, readonly GroupeDeConfiguration[]>;

export type CarteDesReglages = keyof typeof CARTES_DES_REGLAGES;

/** La carte qui porte un groupe : celle qu'un lien ouvre avant de focaliser le champ (V9.7). */
export function carteDuGroupe(groupe: GroupeDeConfiguration): CarteDesReglages {
  const cartes = Object.keys(CARTES_DES_REGLAGES) as CarteDesReglages[];
  return cartes.find((carte) => (CARTES_DES_REGLAGES[carte] as readonly GroupeDeConfiguration[]).includes(groupe))!;
}

const SEUILS_DE_LA_CARTE = { minimums: ['texte', 'nonTexte'], proches: ['profilsConfondus', 'palettesProches', 'chromaGrise'] } as const;

/** Les courbes par défaut du préréglage que la liste reconnaît ; `null` pour une liste importée, qui n'en a pas. */
function courbesParDefaut(recette: Recette): Recette['courbes'] | null {
  const nombre = nombreDeNuancesDe(recette.crans);
  return nombre === null ? null : PREREGLAGES[nombre].courbes;
}

/**
 * La recette où une carte reprend ses valeurs par défaut (V9.5). Les autres
 * cartes restent, et les palettes aussi : leurs intensités propres, celles du
 * designer comme celles d'une palette de base forcée, ne changent pas. Seul
 * le seuil de gris recalcule les parts `grise`, comme une saisie de ce seuil.
 * `null` pour les courbes d'une recette dont la liste des crans a changé par
 * import ([ENT-08]) : les courbes par défaut n'ont pas sa longueur.
 */
export function retablir(recette: Recette, carte: CarteDesReglages): Recette | null {
  const defaut = recetteParDefaut();
  switch (carte) {
    case 'fonds': return { ...recette, fonds: defaut.fonds };
    case 'parts': return { ...recette, profils: defaut.profils, intensiteDesFondsSombres: defaut.intensiteDesFondsSombres };
    case 'contenu': return { ...recette, contenuDesPlanches: { ...CONTENU_COMPLET } };
    case 'courbes': {
      const courbes = courbesParDefaut(recette);
      return courbes ? { ...recette, courbes: { light: [...courbes.light], dark: [...courbes.dark] } } : null;
    }
    default: return SEUILS_DE_LA_CARTE[carte].reduce((suivante: Recette, seuil) => poserValeur(suivante, { seuil }, defaut.seuils[seuil]), recette);
  }
}

/** Vrai quand la carte porte déjà ses valeurs par défaut : « Rétablir » n'a rien à faire. */
export function estParDefaut(recette: Recette, carte: CarteDesReglages): boolean {
  const defaut = recetteParDefaut();
  switch (carte) {
    case 'fonds': return MODES.every((mode) => recette.fonds[mode] === defaut.fonds[mode]);
    case 'parts': return recette.profils.soft.part === defaut.profils.soft.part && recette.profils.vivid.part === defaut.profils.vivid.part
      && recette.intensiteDesFondsSombres === defaut.intensiteDesFondsSombres;
    case 'contenu': return Object.values(recette.contenuDesPlanches).every(Boolean);
    case 'courbes': {
      const courbes = courbesParDefaut(recette);
      return courbes !== null && MODES.every((mode) => recette.courbes[mode].join(',') === courbes[mode].join(','));
    }
    default: return SEUILS_DE_LA_CARTE[carte].every((seuil) => recette.seuils[seuil] === defaut.seuils[seuil]);
  }
}

/** Ce que le passage à un préréglage ferait (W6.4), avant que le designer ne le confirme. */
export interface EffetDuPrereglage {
  /** La recette au nouveau préréglage, à juger puis à ranger. */
  readonly recette: Recette;
  readonly ajoutes: readonly number[];
  readonly retires: readonly number[];
  /**
   * Les palettes dont une nuance gardée change de couleur : une référence qui
   * s'ancre sur une autre nuance, ou une palette libre dont un numéro
   * s'interpole autrement.
   */
  readonly changees: readonly Palette[];
}

/** Les couleurs d'une palette, par intensité, thème et numéro. */
function couleursParNumero(recette: Recette, palette: Palette): Map<string, string> {
  const rampes = rampesDe(recette, palette);
  const { crans } = grilleDe(recette, palette);
  const couleurs = new Map<string, string>();
  for (const intensite of intensitesDe(palette)) {
    for (const mode of MODES) rampeDe(rampes, intensite)[mode].forEach((cran, rang) => couleurs.set(`${intensite}/${mode}/${crans[rang]}`, cran.hexa));
  }
  return couleurs;
}

export function effetDuPrereglage(recette: Recette, nombre: NombreDeNuances): EffetDuPrereglage {
  const suivante = { ...recette, ...grilleAuPrereglage(recette, nombre) };
  const changees = recette.palettes.filter((palette) => {
    const avant = couleursParNumero(recette, palette);
    const apres = couleursParNumero(suivante, palette);
    return [...avant].some(([cle, hexa]) => apres.has(cle) && apres.get(cle) !== hexa);
  });
  return {
    recette: suivante,
    ajoutes: suivante.crans.filter((cran) => !recette.crans.includes(cran)),
    retires: recette.crans.filter((cran) => !suivante.crans.includes(cran)),
    changees,
  };
}

