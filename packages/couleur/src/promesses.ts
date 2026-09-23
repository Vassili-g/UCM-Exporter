/**
 * Les promesses des rôles : quatorze paires par palette et par mode, jugées
 * sur le câblage résolu ([VER-03] à [VER-07], section 11 de la spécification).
 */
import { lireHexa, type Rgb8 } from './conversions';
import { atteintLeSeuil, contraste } from './contraste';
import { cablageDe, rampesDe, referenceDe } from './palette';
import { MODES, type Cran, type Mode, type Profil, type Rampes } from './rampe';
import type { Cablage, Palette, Recette, Role, Seuils } from './recette';

/** Un membre de paire : un rôle, avancé de `decalage` crans, ou le fond de référence du mode. */
export type MembrePaire = { readonly role: Role; readonly decalage: 0 | 1 | 2 } | { readonly fond: true };

export interface Paire {
  readonly numero: number;
  readonly premier: MembrePaire;
  readonly second: MembrePaire;
  readonly seuil: 'texte' | 'nonTexte';
}

const role = (nom: Role, decalage: 0 | 1 | 2 = 0): MembrePaire => ({ role: nom, decalage });
const FOND: MembrePaire = { fond: true };

/** Les quatorze paires de la section 11.2, dans leur ordre. */
export const PAIRES: readonly Paire[] = [
  { numero: 1, premier: role('text'), second: FOND, seuil: 'texte' },
  { numero: 2, premier: role('text'), second: role('surface'), seuil: 'texte' },
  { numero: 3, premier: role('text', 1), second: role('surface', 1), seuil: 'texte' },
  { numero: 4, premier: role('text', 2), second: role('surface', 2), seuil: 'texte' },
  { numero: 5, premier: role('on-solid'), second: role('solid'), seuil: 'texte' },
  { numero: 6, premier: role('on-solid'), second: role('solid', 1), seuil: 'texte' },
  { numero: 7, premier: role('on-solid'), second: role('solid', 2), seuil: 'texte' },
  { numero: 8, premier: role('border-control'), second: FOND, seuil: 'nonTexte' },
  { numero: 9, premier: role('border-control'), second: role('surface'), seuil: 'nonTexte' },
  { numero: 10, premier: role('border-control', 1), second: role('surface', 1), seuil: 'nonTexte' },
  { numero: 11, premier: role('border-control', 2), second: role('surface', 2), seuil: 'nonTexte' },
  { numero: 12, premier: role('focus'), second: FOND, seuil: 'nonTexte' },
  { numero: 13, premier: role('focus'), second: role('surface'), seuil: 'nonTexte' },
  { numero: 14, premier: role('solid', 1), second: FOND, seuil: 'nonTexte' },
];

/** Les décalages qu'un rôle prend dans les paires, 0 compris. */
export function decalagesDuRole(nom: Role): number[] {
  const vus = new Set<number>([0]);
  for (const paire of PAIRES) {
    for (const membre of [paire.premier, paire.second]) if ('role' in membre && membre.role === nom) vus.add(membre.decalage);
  }
  return [...vus].sort((a, b) => a - b);
}

/** Ce qu'un membre désigne une fois le câblage lu. */
export type Designation =
  | { readonly nature: 'cran'; readonly profil: Profil; readonly cran: number; readonly couleur: Rgb8 }
  | { readonly nature: 'fond'; readonly couleur: Rgb8 }
  | { readonly nature: 'reference'; readonly couleur: Rgb8 }
  /** Le cran avancé sort de `crans`. */
  | { readonly nature: 'debordement'; readonly profil: Profil; readonly cran: number; readonly decalage: number }
  /** Le rôle vise le fond ou la référence, et la paire demande un cran suivant. */
  | { readonly nature: 'sans-cran-suivant'; readonly cible: 'fond' | 'reference'; readonly decalage: number };

export type Verdict = 'tenue' | 'manquee' | 'non-verifiable';

/** Un cran de la même rampe qui tiendrait la paire, et toutes les paires de son rôle ([VER-06]). */
export interface Proposition {
  readonly role: Role;
  readonly profil: Profil;
  readonly cran: number;
  readonly contraste: number;
}

export interface Promesse {
  readonly paire: Paire;
  readonly mode: Mode;
  readonly premier: Designation;
  readonly second: Designation;
  readonly seuil: number;
  readonly verdict: Verdict;
  /** Absent quand la paire est non vérifiable. */
  readonly contraste?: number;
  /** Présente sur une promesse manquée quand un cran la tiendrait. */
  readonly proposition?: Proposition;
}

/** Tout ce qu'un jugement lit : la recette, les rampes, le câblage et les couleurs fixes. */
interface Contexte {
  readonly recette: Recette;
  readonly rampes: Rampes;
  readonly cablage: Cablage;
  readonly reference: Rgb8;
  readonly fonds: { readonly [M in Mode]: Rgb8 };
}

function designer(membre: MembrePaire, mode: Mode, contexte: Contexte): Designation {
  if ('fond' in membre) return { nature: 'fond', couleur: contexte.fonds[mode] };
  const cible = contexte.cablage[membre.role];
  if ('fond' in cible || 'reference' in cible) {
    const nature = 'fond' in cible ? 'fond' : 'reference';
    if (membre.decalage > 0) return { nature: 'sans-cran-suivant', cible: nature, decalage: membre.decalage };
    return nature === 'fond'
      ? { nature: 'fond', couleur: contexte.fonds[mode] }
      : { nature: 'reference', couleur: contexte.reference };
  }
  const rang = contexte.recette.crans.indexOf(cible.cran) + membre.decalage;
  if (rang >= contexte.recette.crans.length) {
    return { nature: 'debordement', profil: cible.profil, cran: cible.cran, decalage: membre.decalage };
  }
  const cran: Cran = contexte.rampes[cible.profil][mode][rang];
  return { nature: 'cran', profil: cible.profil, cran: contexte.recette.crans[rang], couleur: cran.couleur };
}

const valeurDuSeuil = (paire: Paire, seuils: Seuils): number => seuils[paire.seuil];

function juger(paire: Paire, mode: Mode, contexte: Contexte): Promesse {
  const premier = designer(paire.premier, mode, contexte);
  const second = designer(paire.second, mode, contexte);
  const seuil = valeurDuSeuil(paire, contexte.recette.seuils);
  if (!('couleur' in premier) || !('couleur' in second)) {
    return { paire, mode, premier, second, seuil, verdict: 'non-verifiable' };
  }
  const valeur = contraste(premier.couleur, second.couleur);
  return { paire, mode, premier, second, seuil, contraste: valeur, verdict: atteintLeSeuil(valeur, seuil) ? 'tenue' : 'manquee' };
}

function jugerTout(contexte: Contexte): Promesse[] {
  return MODES.flatMap((mode) => PAIRES.map((paire) => juger(paire, mode, contexte)));
}

/** Les rôles qui peuvent bouger, dans l'ordre où on les essaie : ceux qui visent un cran, le premier membre d'abord ([VER-06]). */
function rolesQuiBougent(paire: Paire, contexte: Contexte): Role[] {
  const roles: Role[] = [];
  for (const membre of [paire.premier, paire.second]) {
    if ('role' in membre && 'cran' in contexte.cablage[membre.role] && !roles.includes(membre.role)) roles.push(membre.role);
  }
  return roles;
}

/** Range des candidats : distance croissante au cran courant, puis contraste décroissant ([VER-06]). */
export function ordonnerCandidats<T extends { readonly distance: number; readonly contraste: number }>(
  candidats: readonly T[],
): T[] {
  return [...candidats].sort((a, b) => a.distance - b.distance || b.contraste - a.contraste);
}

/**
 * Le cran qui tiendrait une promesse manquée ([VER-06]). Le premier membre qui
 * vise un cran bouge ; s'il ne trouve aucun cran, le second bouge à son tour.
 * Le candidat garde le profil de la cible, se cherche par distance croissante
 * au cran courant, et à égalité le plus contrasté sur la paire manquée
 * l'emporte. Il doit tenir toutes les paires du rôle dans les deux modes : le
 * câblage est commun aux deux. Une paire du rôle que le candidat fait déborder
 * de `crans` le refuse.
 */
function proposer(manquee: Promesse, contexte: Contexte): Proposition | undefined {
  for (const nom of rolesQuiBougent(manquee.paire, contexte)) {
    const proposition = proposerPourLeRole(nom, manquee, contexte);
    if (proposition) return proposition;
  }
  return undefined;
}

function proposerPourLeRole(nom: Role, manquee: Promesse, contexte: Contexte): Proposition | undefined {
  const cible = contexte.cablage[nom] as { profil: Profil; cran: number };
  const crans = contexte.recette.crans;
  const courant = crans.indexOf(cible.cran);

  const candidats = crans
    .map((cran, rang) => ({ cran, distance: Math.abs(rang - courant) }))
    .filter(({ distance }) => distance > 0);

  const tenables = candidats.flatMap(({ cran, distance }) => {
    const cablage = { ...contexte.cablage, [nom]: { profil: cible.profil, cran } } as Cablage;
    const essai = { ...contexte, cablage };
    const duRole = jugerTout(essai).filter(({ paire }) =>
      [paire.premier, paire.second].some((membre) => 'role' in membre && membre.role === nom));
    const tient = duRole.every((promesse) =>
      promesse.verdict === 'tenue'
      || (promesse.verdict === 'non-verifiable'
        && promesse.premier.nature !== 'debordement' && promesse.second.nature !== 'debordement'));
    if (!tient) return [];
    const surLaPaire = juger(manquee.paire, manquee.mode, essai);
    return [{ cran, distance, contraste: surLaPaire.contraste ?? 0 }];
  });

  const retenu = ordonnerCandidats(tenables)[0];
  return retenu && { role: nom, profil: cible.profil, cran: retenu.cran, contraste: retenu.contraste };
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
    cablage: cablageDe(recette, palette),
    reference: referenceDe(palette),
    fonds: { light: fond(recette.fonds.light), dark: fond(recette.fonds.dark) },
  };
}

/**
 * Les vingt-huit promesses d'une palette, quatorze par mode, dans l'ordre des
 * paires et des modes. Une promesse manquée porte sa proposition quand un cran
 * la tiendrait.
 */
export function verifierPromesses(recette: Recette, palette: Palette): Promesse[] {
  const contexte = contexteDe(recette, palette);
  return jugerTout(contexte).map((promesse) =>
    promesse.verdict === 'manquee' ? { ...promesse, proposition: proposer(promesse, contexte) } : promesse);
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
 * Mesure un cran contre le fond de son mode. Un cran n'a pas de verdict : seul
 * un rôle promet un contraste ([VER-04]).
 */
export function mesurerCran(couleur: Rgb8, fond: Rgb8, seuils: Seuils): MesureDeCran {
  const contreFond = contraste(couleur, fond);
  const seuilTenu = atteintLeSeuil(contreFond, seuils.texte)
    ? 'texte'
    : atteintLeSeuil(contreFond, seuils.nonTexte) ? 'nonTexte' : null;
  return { fond: contreFond, blanc: contraste(couleur, BLANC), noir: contraste(couleur, NOIR), seuilTenu };
}
