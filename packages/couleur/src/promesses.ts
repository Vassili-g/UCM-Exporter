/**
 * Les promesses des emplois : quatorze paires par palette, par mode et par
 * profil, jugées sur la table fixe des emplois ([VER-03] à [VER-07], section
 * 11.2 de la spécification).
 */
import { lireHexa, type Rgb8 } from './conversions';
import { atteintLeSeuil, contraste } from './contraste';
import { EMPLOIS, TABLE_DES_EMPLOIS, type Emploi } from './emplois';
import { rampesDe } from './palette';
import { MODES, PROFILS, type Mode, type Profil, type Rampes } from './rampe';
import type { Palette, Recette, Seuils } from './recette';

/** Un membre de paire : un emploi, avancé de `decalage` crans, ou le fond de référence du mode. */
export type MembrePaire = { readonly emploi: Emploi; readonly decalage: 0 | 1 | 2 } | { readonly fond: true };

export interface Paire {
  readonly numero: number;
  readonly premier: MembrePaire;
  readonly second: MembrePaire;
  readonly seuil: 'texte' | 'nonTexte';
}

const emploi = (nom: Emploi, decalage: 0 | 1 | 2 = 0): MembrePaire => ({ emploi: nom, decalage });
const FOND: MembrePaire = { fond: true };

/** Les quatorze paires de la section 11.2, dans leur ordre. */
export const PAIRES: readonly Paire[] = [
  { numero: 1, premier: emploi('text'), second: FOND, seuil: 'texte' },
  { numero: 2, premier: emploi('text'), second: emploi('surface'), seuil: 'texte' },
  { numero: 3, premier: emploi('text', 1), second: emploi('surface', 1), seuil: 'texte' },
  { numero: 4, premier: emploi('text', 2), second: emploi('surface', 2), seuil: 'texte' },
  { numero: 5, premier: emploi('on-solid'), second: emploi('solid'), seuil: 'texte' },
  { numero: 6, premier: emploi('on-solid'), second: emploi('solid', 1), seuil: 'texte' },
  { numero: 7, premier: emploi('on-solid'), second: emploi('solid', 2), seuil: 'texte' },
  { numero: 8, premier: emploi('border-control'), second: FOND, seuil: 'nonTexte' },
  { numero: 9, premier: emploi('border-control'), second: emploi('surface'), seuil: 'nonTexte' },
  { numero: 10, premier: emploi('border-control', 1), second: emploi('surface', 1), seuil: 'nonTexte' },
  { numero: 11, premier: emploi('border-control', 2), second: emploi('surface', 2), seuil: 'nonTexte' },
  { numero: 12, premier: emploi('focus'), second: FOND, seuil: 'nonTexte' },
  { numero: 13, premier: emploi('focus'), second: emploi('surface'), seuil: 'nonTexte' },
  { numero: 14, premier: emploi('solid', 1), second: FOND, seuil: 'nonTexte' },
];

/** Les décalages qu'un emploi prend dans les paires, 0 compris. */
export function decalagesDeLEmploi(nom: Emploi): number[] {
  const vus = new Set<number>([0]);
  for (const paire of PAIRES) {
    for (const membre of [paire.premier, paire.second]) {
      if ('emploi' in membre && membre.emploi === nom) vus.add(membre.decalage);
    }
  }
  return [...vus].sort((a, b) => a - b);
}

/** Un emploi, avancé de `decalage` crans : 1 pour le survol, 2 pour l'appui. */
export interface EmploiDUnCran {
  readonly emploi: Emploi;
  readonly decalage: number;
}

/**
 * Les emplois que la table confie au cran de rang `rang` dans `crans`, états
 * compris, dans l'ordre de la planche : la dernière ligne de la carte d'un cran
 * (section 9.3).
 * `on-solid` vise le fond et ne tombe sur aucun cran.
 */
export function emploisDuCran(crans: readonly number[], rang: number): EmploiDUnCran[] {
  const trouves: EmploiDUnCran[] = [];
  for (const nom of EMPLOIS) {
    const cible = TABLE_DES_EMPLOIS[nom];
    if (cible === 'fond') continue;
    const depart = crans.indexOf(cible);
    if (depart < 0) continue;
    for (const decalage of decalagesDeLEmploi(nom)) {
      if (depart + decalage === rang) trouves.push({ emploi: nom, decalage });
    }
  }
  return trouves;
}

/** Ce qu'un membre désigne dans la rampe d'un profil et d'un mode. */
export type Designation =
  | { readonly nature: 'cran'; readonly cran: number; readonly couleur: Rgb8 }
  | { readonly nature: 'fond'; readonly couleur: Rgb8 };

export type Verdict = 'tenue' | 'manquee';

export interface Promesse {
  readonly paire: Paire;
  readonly mode: Mode;
  readonly profil: Profil;
  readonly premier: Designation;
  readonly second: Designation;
  readonly seuil: number;
  readonly contraste: number;
  readonly verdict: Verdict;
}

/** Tout ce qu'un jugement lit : la recette, les rampes et les fonds. */
interface Contexte {
  readonly recette: Recette;
  readonly rampes: Rampes;
  readonly fonds: { readonly [M in Mode]: Rgb8 };
}

/**
 * Un cran avancé reste dans la rampe : `[REC-05]` exige chaque cran de
 * `CRANS_DES_EMPLOIS`, qui compte deux crans après 700.
 */
function designer(membre: MembrePaire, mode: Mode, profil: Profil, contexte: Contexte): Designation {
  if ('fond' in membre) return { nature: 'fond', couleur: contexte.fonds[mode] };
  const cible = TABLE_DES_EMPLOIS[membre.emploi];
  if (cible === 'fond') return { nature: 'fond', couleur: contexte.fonds[mode] };
  const crans = contexte.recette.crans;
  const depart = crans.indexOf(cible);
  const rang = depart + membre.decalage;
  if (depart < 0 || rang >= crans.length) {
    throw new Error(`Cran ${cible} absent ou sans cran suivant. La recette n'a pas été validée.`);
  }
  return { nature: 'cran', cran: crans[rang], couleur: contexte.rampes[profil][mode][rang].couleur };
}

const valeurDuSeuil = (paire: Paire, seuils: Seuils): number => seuils[paire.seuil];

function juger(paire: Paire, mode: Mode, profil: Profil, contexte: Contexte): Promesse {
  const premier = designer(paire.premier, mode, profil, contexte);
  const second = designer(paire.second, mode, profil, contexte);
  const seuil = valeurDuSeuil(paire, contexte.recette.seuils);
  const valeur = contraste(premier.couleur, second.couleur);
  return {
    paire,
    mode,
    profil,
    premier,
    second,
    seuil,
    contraste: valeur,
    verdict: atteintLeSeuil(valeur, seuil) ? 'tenue' : 'manquee',
  };
}

function contexteDe(recette: Recette, palette: Palette): Contexte {
  const fond = (hexa: string): Rgb8 => {
    const couleur = lireHexa(hexa);
    if (!couleur) throw new Error(`Fond illisible : ${hexa}. La recette n'a pas été validée.`);
    return couleur;
  };
  return {
    recette,
    rampes: rampesDe(recette, palette),
    fonds: { light: fond(recette.fonds.light), dark: fond(recette.fonds.dark) },
  };
}

/**
 * Les cinquante-six promesses d'une palette, quatorze par mode et par profil,
 * rangées par mode, puis par profil, puis dans l'ordre des paires.
 */
export function verifierPromesses(recette: Recette, palette: Palette): Promesse[] {
  const contexte = contexteDe(recette, palette);
  return MODES.flatMap((mode) =>
    PROFILS.flatMap((profil) => PAIRES.map((paire) => juger(paire, mode, profil, contexte))));
}

/** Le nombre de promesses manquées, qui fait le verdict de la palette ([VER-07]). */
export function compterManquees(promesses: readonly Promesse[]): number {
  return promesses.filter((promesse) => promesse.verdict === 'manquee').length;
}

/** Ce qu'un cran mesure : contraste contre le fond du mode, le blanc et le noir, et le seuil tenu ([VER-03]). */
export interface MesureDeCran {
  readonly fond: number;
  readonly blanc: number;
  readonly noir: number;
  /** Le seuil que le contraste contre le fond atteint, `null` sous `nonTexte`. */
  readonly seuilTenu: 'texte' | 'nonTexte' | null;
}

const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];

/**
 * Mesure un cran contre le fond de son mode. Un cran n'a pas de verdict : seule
 * une paire de la table des emplois promet un contraste ([VER-04]).
 */
export function mesurerCran(couleur: Rgb8, fond: Rgb8, seuils: Seuils): MesureDeCran {
  const contreFond = contraste(couleur, fond);
  const seuilTenu = atteintLeSeuil(contreFond, seuils.texte)
    ? 'texte'
    : atteintLeSeuil(contreFond, seuils.nonTexte) ? 'nonTexte' : null;
  return { fond: contreFond, blanc: contraste(couleur, BLANC), noir: contraste(couleur, NOIR), seuilTenu };
}
