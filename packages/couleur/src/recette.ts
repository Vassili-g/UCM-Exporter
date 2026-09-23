/**
 * La recette : sa forme, la recette par défaut, sa validation et son
 * classement à la lecture ([REC-03] à [REC-05], section 7 de la
 * spécification).
 *
 * La validation ne rédige aucune phrase. Elle rend des refus structurés, la
 * règle et le chemin du champ fautif ; l'interface les met en mots.
 */
import { lireHexa } from './conversions';
import { CRANS_DES_EMPLOIS } from './emplois';
import { DERIVE_MAXIMALE } from './rampe';
import { RELEVE_TAILWIND, type PaireDeDerive } from './tailwind';

/** La version de la forme de la recette que ce paquet écrit. */
export const FORMAT_RECETTE = 1;

export type OrigineDerive = 'tailwind' | 'constante' | 'libre';

export interface DeriveRangee {
  readonly clair: number;
  readonly sombre: number;
  readonly origine: OrigineDerive;
}

export type OrigineParts = 'designer' | 'grise';

export interface PartsPropres {
  readonly soft: number;
  readonly vivid: number;
  readonly origine: OrigineParts;
}

export interface Palette {
  readonly id: string;
  readonly nom?: string;
  readonly reference: string;
  readonly derive: {
    readonly lien: boolean;
    readonly soft: DeriveRangee;
    readonly vivid: DeriveRangee;
  };
  readonly parts?: PartsPropres;
}

export interface Seuils {
  readonly texte: number;
  readonly nonTexte: number;
  readonly profilsConfondus: number;
  readonly palettesProches: number;
  readonly chromaGrise: number;
}

export interface Recette {
  readonly formatVersion: number;
  readonly crans: readonly number[];
  readonly courbes: { readonly light: readonly number[]; readonly dark: readonly number[] };
  readonly profils: { readonly soft: { readonly part: number }; readonly vivid: { readonly part: number } };
  readonly gamut: 'srgb';
  readonly fonds: { readonly light: string; readonly dark: string };
  readonly seuils: Seuils;
  readonly derives: readonly PaireDeDerive[];
  readonly palettes: readonly Palette[];
}

/** La recette par défaut du paquet (section 7.2), sans palette. */
export function recetteParDefaut(): Recette {
  return {
    formatVersion: FORMAT_RECETTE,
    crans: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
    courbes: {
      light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
      dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
    },
    profils: { soft: { part: 0.45 }, vivid: { part: 0.95 } },
    gamut: 'srgb',
    fonds: { light: '#F7F7F7', dark: '#121212' },
    seuils: { texte: 4.5, nonTexte: 3, profilsConfondus: 0.02, palettesProches: 0.05, chromaGrise: 0.03 },
    derives: RELEVE_TAILWIND.map(([nom, clair, sombre]) => [nom, clair, sombre] as PaireDeDerive),
    palettes: [],
  };
}

/** Les règles de [REC-05], une par refus possible. */
export type RegleRecette =
  | 'forme'
  | 'cle-inconnue'
  | 'crans-croissants'
  | 'courbes-longueur'
  | 'courbes-bornes'
  | 'courbe-claire-decroissante'
  | 'courbe-sombre-croissante'
  | 'parts-bornes'
  | 'parts-ordre'
  | 'gamut-inconnu'
  | 'hexa-invalide'
  | 'seuils-positifs'
  | 'derives-nombre'
  | 'derives-noms'
  | 'derives-teintes'
  | 'derives-teintes-claires'
  | 'derive-bornes'
  | 'derive-lien'
  | 'origine-inconnue'
  | 'identifiant-forme'
  | 'identifiants-uniques'
  | 'crans-emplois';

/** Un refus : la règle, le chemin du champ fautif, et la valeur lue quand elle se montre. */
export interface Refus {
  readonly regle: RegleRecette;
  readonly chemin: string;
  readonly valeur?: string | number;
}

/** L'identifiant d'une palette : `p-` et huit chiffres hexadécimaux minuscules. */
export const MOTIF_IDENTIFIANT = /^p-[0-9a-f]{8}$/;

type Objet = Record<string, unknown>;

const estObjet = (x: unknown): x is Objet => typeof x === 'object' && x !== null && !Array.isArray(x);
const estNombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Accumule les refus d'une validation, dans l'ordre où les champs sont lus. */
class Releve {
  readonly refus: Refus[] = [];

  refuser(regle: RegleRecette, chemin: string, valeur?: unknown): void {
    const montree = typeof valeur === 'string' || typeof valeur === 'number' ? valeur : undefined;
    this.refus.push(montree === undefined ? { regle, chemin } : { regle, chemin, valeur: montree });
  }

  /** Un objet aux clés attendues ; une clé en trop est refusée, une clé manquante aussi. */
  objet(x: unknown, chemin: string, obligatoires: readonly string[], facultatives: readonly string[] = []): x is Objet {
    if (!estObjet(x)) {
      this.refuser('forme', chemin);
      return false;
    }
    for (const cle of obligatoires) if (!(cle in x)) this.refuser('forme', joindre(chemin, cle));
    for (const cle of Object.keys(x)) {
      if (!obligatoires.includes(cle) && !facultatives.includes(cle)) this.refuser('cle-inconnue', joindre(chemin, cle));
    }
    return true;
  }

  nombre(x: unknown, chemin: string): x is number {
    if (estNombre(x)) return true;
    this.refuser('forme', chemin);
    return false;
  }

  nombres(x: unknown, chemin: string): x is number[] {
    if (!Array.isArray(x)) {
      this.refuser('forme', chemin);
      return false;
    }
    return x.map((valeur, rang) => this.nombre(valeur, `${chemin}[${rang}]`)).every(Boolean);
  }

  hexa(x: unknown, chemin: string): void {
    if (typeof x !== 'string' || lireHexa(x) === null) this.refuser('hexa-invalide', chemin, x);
  }
}

const joindre = (chemin: string, cle: string): string => (chemin ? `${chemin}.${cle}` : cle);

function validerCrans(releve: Releve, crans: unknown): number[] | null {
  if (!releve.nombres(crans, 'crans')) return null;
  if (crans.length < 2) releve.refuser('crans-croissants', 'crans');
  crans.forEach((cran, rang) => {
    if (!Number.isInteger(cran) || (rang > 0 && cran <= crans[rang - 1])) {
      releve.refuser('crans-croissants', `crans[${rang}]`, cran);
    }
  });
  for (const cran of CRANS_DES_EMPLOIS) if (!crans.includes(cran)) releve.refuser('crans-emplois', 'crans', cran);
  return crans;
}

function validerCourbes(releve: Releve, courbes: unknown, longueur: number | null): void {
  if (!releve.objet(courbes, 'courbes', ['light', 'dark'])) return;
  for (const mode of ['light', 'dark'] as const) {
    const chemin = `courbes.${mode}`;
    const courbe = courbes[mode];
    if (!releve.nombres(courbe, chemin)) continue;
    if (longueur !== null && courbe.length !== longueur) releve.refuser('courbes-longueur', chemin, courbe.length);
    courbe.forEach((L, rang) => {
      if (L < 0 || L > 1) releve.refuser('courbes-bornes', `${chemin}[${rang}]`, L);
      if (rang === 0) return;
      if (mode === 'light' && L >= courbe[rang - 1]) releve.refuser('courbe-claire-decroissante', `${chemin}[${rang}]`, L);
      if (mode === 'dark' && L <= courbe[rang - 1]) releve.refuser('courbe-sombre-croissante', `${chemin}[${rang}]`, L);
    });
  }
}

function validerParts(releve: Releve, soft: unknown, vivid: unknown, chemin: string, suffixe: string): void {
  const lues: number[] = [];
  for (const [profil, part] of [['soft', soft], ['vivid', vivid]] as const) {
    const ici = `${chemin}.${profil}${suffixe}`;
    if (!releve.nombre(part, ici)) continue;
    if (part < 0 || part > 1) releve.refuser('parts-bornes', ici, part);
    lues.push(part);
  }
  if (lues.length === 2 && lues[0] > lues[1]) releve.refuser('parts-ordre', chemin);
}

function validerDerives(releve: Releve, derives: unknown): void {
  if (!Array.isArray(derives)) {
    releve.refuser('forme', 'derives');
    return;
  }
  if (derives.length < 2) releve.refuser('derives-nombre', 'derives', derives.length);
  const noms = new Set<string>();
  const teintesClaires = new Set<number>();
  derives.forEach((paire, rang) => {
    const chemin = `derives[${rang}]`;
    if (!Array.isArray(paire) || paire.length !== 3 || typeof paire[0] !== 'string'
      || !estNombre(paire[1]) || !estNombre(paire[2])) {
      releve.refuser('forme', chemin);
      return;
    }
    const [nom, clair, sombre] = paire as [string, number, number];
    if (noms.has(nom)) releve.refuser('derives-noms', chemin, nom);
    noms.add(nom);
    for (const teinte of [clair, sombre]) {
      if (teinte < 0 || teinte >= 360) releve.refuser('derives-teintes', chemin, teinte);
    }
    if (teintesClaires.has(clair)) releve.refuser('derives-teintes-claires', chemin, clair);
    teintesClaires.add(clair);
  });
}

const ORIGINES_DERIVE: readonly string[] = ['tailwind', 'constante', 'libre'];
const ORIGINES_PARTS: readonly string[] = ['designer', 'grise'];

function validerDerivePalette(releve: Releve, derive: unknown, chemin: string): void {
  if (!releve.objet(derive, chemin, ['clair', 'sombre', 'origine'])) return;
  for (const bout of ['clair', 'sombre'] as const) {
    const angle = derive[bout];
    if (releve.nombre(angle, `${chemin}.${bout}`) && Math.abs(angle) > DERIVE_MAXIMALE) {
      releve.refuser('derive-bornes', `${chemin}.${bout}`, angle);
    }
  }
  if (!ORIGINES_DERIVE.includes(derive.origine as string)) {
    releve.refuser('origine-inconnue', `${chemin}.origine`, derive.origine);
  }
}

function validerPalette(releve: Releve, palette: unknown, chemin: string): void {
  if (!releve.objet(palette, chemin, ['id', 'reference', 'derive'], ['nom', 'parts'])) return;
  if (typeof palette.id !== 'string' || !MOTIF_IDENTIFIANT.test(palette.id)) {
    releve.refuser('identifiant-forme', `${chemin}.id`, palette.id);
  }
  if ('nom' in palette && typeof palette.nom !== 'string') releve.refuser('forme', `${chemin}.nom`);
  releve.hexa(palette.reference, `${chemin}.reference`);

  const derive = palette.derive;
  if (releve.objet(derive, `${chemin}.derive`, ['lien', 'soft', 'vivid'])) {
    if (typeof derive.lien !== 'boolean') releve.refuser('forme', `${chemin}.derive.lien`);
    validerDerivePalette(releve, derive.soft, `${chemin}.derive.soft`);
    validerDerivePalette(releve, derive.vivid, `${chemin}.derive.vivid`);
    const soft = derive.soft as Objet;
    const vivid = derive.vivid as Objet;
    const identiques = estObjet(soft) && estObjet(vivid)
      && ['clair', 'sombre', 'origine'].every((cle) => soft[cle] === vivid[cle]);
    if (derive.lien === true && !identiques) releve.refuser('derive-lien', `${chemin}.derive`);
  }

  if ('parts' in palette) {
    const parts = palette.parts;
    if (releve.objet(parts, `${chemin}.parts`, ['soft', 'vivid', 'origine'])) {
      validerParts(releve, parts.soft, parts.vivid, `${chemin}.parts`, '');
      if (!ORIGINES_PARTS.includes(parts.origine as string)) {
        releve.refuser('origine-inconnue', `${chemin}.parts.origine`, parts.origine);
      }
    }
  }
}

const CLES_RECETTE = [
  'formatVersion',
  'crans',
  'courbes',
  'profils',
  'gamut',
  'fonds',
  'seuils',
  'derives',
  'palettes',
] as const;

/**
 * Valide la forme d'une recette de la version courante ([REC-05]). Rend la
 * recette, ou la liste de tous les refus, dans l'ordre des champs.
 */
export function validerRecette(entree: unknown): { recette: Recette } | { refus: Refus[] } {
  const releve = new Releve();
  if (!releve.objet(entree, '', CLES_RECETTE)) return { refus: releve.refus };

  if (entree.formatVersion !== FORMAT_RECETTE) releve.refuser('forme', 'formatVersion', entree.formatVersion as number);
  const crans = validerCrans(releve, entree.crans);
  validerCourbes(releve, entree.courbes, crans?.length ?? null);

  const profils = entree.profils;
  if (releve.objet(profils, 'profils', ['soft', 'vivid'])) {
    const soft = profils.soft;
    const vivid = profils.vivid;
    if (releve.objet(soft, 'profils.soft', ['part']) && releve.objet(vivid, 'profils.vivid', ['part'])) {
      validerParts(releve, soft.part, vivid.part, 'profils', '.part');
    }
  }

  if (entree.gamut !== 'srgb') releve.refuser('gamut-inconnu', 'gamut', entree.gamut);

  if (releve.objet(entree.fonds, 'fonds', ['light', 'dark'])) {
    releve.hexa(entree.fonds.light, 'fonds.light');
    releve.hexa(entree.fonds.dark, 'fonds.dark');
  }

  const seuils = entree.seuils;
  const nomsSeuils = ['texte', 'nonTexte', 'profilsConfondus', 'palettesProches', 'chromaGrise'];
  if (releve.objet(seuils, 'seuils', nomsSeuils)) {
    for (const nom of nomsSeuils) {
      const valeur = seuils[nom];
      if (releve.nombre(valeur, `seuils.${nom}`) && valeur <= 0) releve.refuser('seuils-positifs', `seuils.${nom}`, valeur);
    }
  }

  validerDerives(releve, entree.derives);

  if (!Array.isArray(entree.palettes)) {
    releve.refuser('forme', 'palettes');
  } else {
    const identifiants = new Set<unknown>();
    entree.palettes.forEach((palette, rang) => {
      const chemin = `palettes[${rang}]`;
      validerPalette(releve, palette, chemin);
      const id = estObjet(palette) ? palette.id : undefined;
      if (identifiants.has(id)) releve.refuser('identifiants-uniques', `${chemin}.id`, id as string);
      identifiants.add(id);
    });
  }

  return releve.refus.length > 0 ? { refus: releve.refus } : { recette: entree as unknown as Recette };
}

/** Une migration fait passer un objet de la version `n` à la version `n + 1`. */
export type Migrations = Readonly<Record<number, (ancienne: Objet) => Objet>>;

/** Les migrations connues : aucune tant que la version courante est la première. */
export const MIGRATIONS: Migrations = {};

/** Ce que la lecture conclut d'une recette rangée ([REC-03]). */
export type Classement =
  | { readonly etat: 'absente'; readonly recette: Recette }
  | { readonly etat: 'courante'; readonly recette: Recette }
  | { readonly etat: 'migree'; readonly recette: Recette; readonly depuis: number }
  | { readonly etat: 'future'; readonly version: number }
  | { readonly etat: 'illisible'; readonly refus: readonly Refus[] };

/**
 * Classe le texte rangé sous la clé de la recette avant tout emploi
 * ([REC-03]). Absent ou vide, la recette par défaut est proposée. Une version
 * supérieure est `future`. Une version antérieure passe par chaque migration
 * jusqu'à la courante, en mémoire ; une étape manquante la rend illisible.
 * Aucune branche n'écrit : le refus laisse la recette rangée intacte
 * ([REC-04]).
 */
export function classerRecette(texte: string | undefined, migrations: Migrations = MIGRATIONS): Classement {
  if (texte === undefined || texte === '') return { etat: 'absente', recette: recetteParDefaut() };

  let objet: unknown;
  try {
    objet = JSON.parse(texte);
  } catch {
    return { etat: 'illisible', refus: [{ regle: 'forme', chemin: '' }] };
  }
  if (!estObjet(objet)) return { etat: 'illisible', refus: [{ regle: 'forme', chemin: '' }] };

  const version = objet.formatVersion;
  if (!Number.isInteger(version) || (version as number) < 0) {
    return { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'formatVersion' }] };
  }
  if ((version as number) > FORMAT_RECETTE) return { etat: 'future', version: version as number };

  let courante: Objet = objet;
  for (let depuis = version as number; depuis < FORMAT_RECETTE; depuis += 1) {
    const etape = migrations[depuis];
    if (!etape) return { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'formatVersion', valeur: version as number }] };
    courante = etape(courante);
  }

  const lue = validerRecette(courante);
  if ('refus' in lue) return { etat: 'illisible', refus: lue.refus };
  return version === FORMAT_RECETTE
    ? { etat: 'courante', recette: lue.recette }
    : { etat: 'migree', recette: lue.recette, depuis: version as number };
}
