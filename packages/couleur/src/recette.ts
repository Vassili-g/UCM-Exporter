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
import { PREREGLAGES } from './nuances';
import { DERIVE_MAXIMALE, type Profil } from './rampe';
import { RELEVE_TAILWIND, type PaireDeDerive } from './tailwind';

/**
 * La version de la forme de la recette que ce paquet écrit. La version 2
 * ajoute `base` à une palette ; la version 3, `crans` et `originale` ; la
 * version 4, `intensites` à une palette, `intensiteDesFondsSombres` et
 * `contenuDesPlanches` à la recette. Un plugin qui lit une version
 * antérieure classe donc la recette « future » au lieu de refuser une clé
 * inconnue.
 */
export const FORMAT_RECETTE = 4;

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
  /** La palette de base ([ENT-11]) : le profil porteur forcé. Absente, le classement automatique décide. */
  readonly base?: Profil;
  /** La liste d'une palette libre (W6) : ses numéros, qui suivent les courbes communes. Absente, la liste commune. */
  readonly crans?: readonly number[];
  /** La référence d'avant le premier ajustement (W7), en majuscules. Absente, aucun ajustement. */
  readonly originale?: string;
  /**
   * `1` : la palette porte une seule intensité, celle de sa référence, sans nom
   * de profil ([ENT-14]). Absent, elle porte Soft et Vivid.
   */
  readonly intensites?: 1;
}

/** Les parties d'un cadre de la planche que le designer choisit de dessiner ([PLA-28]). */
export interface ContenuDesPlanches {
  readonly note: boolean;
  readonly usages: boolean;
  readonly grilles: boolean;
  readonly light: boolean;
  readonly dark: boolean;
}

/** Tout se dessine : le contenu d'une recette qui ne l'a jamais réglé. */
export const CONTENU_COMPLET: ContenuDesPlanches = { note: true, usages: true, grilles: true, light: true, dark: true };

/** Le facteur de la part des fonds du thème Dark au numéro 50, par défaut ([MOT-28]). */
export const INTENSITE_DES_FONDS_SOMBRES = 0.3;

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
  /** Le facteur de la part des fonds du thème Dark au numéro 50, entre 0 et 1 ([MOT-28]). */
  readonly intensiteDesFondsSombres: number;
  readonly contenuDesPlanches: ContenuDesPlanches;
  readonly palettes: readonly Palette[];
}

/** La recette par défaut du paquet (section 7.2), sans palette. */
export function recetteParDefaut(): Recette {
  return {
    formatVersion: FORMAT_RECETTE,
    crans: [...PREREGLAGES[11].crans],
    courbes: { light: [...PREREGLAGES[11].courbes.light], dark: [...PREREGLAGES[11].courbes.dark] },
    profils: { soft: { part: 0.45 }, vivid: { part: 0.95 } },
    gamut: 'srgb',
    fonds: { light: '#F7F7F7', dark: '#121212' },
    seuils: { texte: 4.5, nonTexte: 3, profilsConfondus: 0.02, palettesProches: 0.05, chromaGrise: 0.03 },
    derives: RELEVE_TAILWIND.map(([nom, clair, sombre]) => [nom, clair, sombre] as PaireDeDerive),
    intensiteDesFondsSombres: INTENSITE_DES_FONDS_SOMBRES,
    contenuDesPlanches: { ...CONTENU_COMPLET },
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
  | 'crans-emplois'
  | 'base-inconnue'
  | 'crans-libres-nombre'
  | 'crans-libres-numeros'
  | 'base-libre'
  | 'originale-identique'
  | 'intensites-valeur'
  | 'intensites-incompatible'
  | 'fonds-sombres-bornes'
  | 'contenu-sans-theme';

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

/** Les bornes d'une liste libre (W6) : 4 à 13 numéros, multiples de 50, de 50 à 1050. */
export const BORNES_DES_CRANS_LIBRES = { nombre: [4, 13], pas: 50, premier: 50, dernier: 1050 } as const;

function validerCransLibres(releve: Releve, crans: unknown, chemin: string): void {
  if (!releve.nombres(crans, chemin)) return;
  const { nombre, pas, premier, dernier } = BORNES_DES_CRANS_LIBRES;
  if (crans.length < nombre[0] || crans.length > nombre[1]) releve.refuser('crans-libres-nombre', chemin, crans.length);
  crans.forEach((cran, rang) => {
    const horsPas = !Number.isInteger(cran) || cran % pas !== 0 || cran < premier || cran > dernier;
    if (horsPas || (rang > 0 && cran <= crans[rang - 1])) releve.refuser('crans-libres-numeros', `${chemin}[${rang}]`, cran);
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

/**
 * Une palette à une intensité ([ENT-14]) : `intensites` ne vaut que 1, sans
 * quoi deux textes décriraient la même palette. Sa part est celle de la
 * référence et sa rampe n'a pas de profil : ni `base`, ni `parts`, ni une
 * dérive déliée. Une palette libre n'en porte pas.
 */
function validerIntensites(releve: Releve, palette: Objet, chemin: string): void {
  if (!('intensites' in palette)) return;
  if (palette.intensites !== 1) releve.refuser('intensites-valeur', `${chemin}.intensites`, palette.intensites);
  for (const cle of ['base', 'parts', 'crans']) {
    if (cle in palette) releve.refuser('intensites-incompatible', `${chemin}.${cle}`);
  }
  if (estObjet(palette.derive) && palette.derive.lien === false) releve.refuser('intensites-incompatible', `${chemin}.derive.lien`);
}

function validerPalette(releve: Releve, palette: unknown, chemin: string): void {
  if (!releve.objet(palette, chemin, ['id', 'reference', 'derive'], ['nom', 'parts', 'base', 'crans', 'originale', 'intensites'])) return;
  if (typeof palette.id !== 'string' || !MOTIF_IDENTIFIANT.test(palette.id)) {
    releve.refuser('identifiant-forme', `${chemin}.id`, palette.id);
  }
  if ('nom' in palette && typeof palette.nom !== 'string') releve.refuser('forme', `${chemin}.nom`);
  if ('base' in palette && palette.base !== 'soft' && palette.base !== 'vivid') releve.refuser('base-inconnue', `${chemin}.base`, palette.base);
  releve.hexa(palette.reference, `${chemin}.reference`);
  if ('crans' in palette) {
    validerCransLibres(releve, palette.crans, `${chemin}.crans`);
    if ('base' in palette) releve.refuser('base-libre', `${chemin}.base`, palette.base as string);
  }
  if ('originale' in palette) {
    releve.hexa(palette.originale, `${chemin}.originale`);
    const identique = typeof palette.originale === 'string' && typeof palette.reference === 'string'
      && palette.originale.toUpperCase() === palette.reference.toUpperCase();
    if (identique) releve.refuser('originale-identique', `${chemin}.originale`, palette.originale as string);
  }

  validerIntensites(releve, palette, chemin);

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
  'intensiteDesFondsSombres',
  'contenuDesPlanches',
  'palettes',
] as const;

const PARTIES_DU_CONTENU = ['note', 'usages', 'grilles', 'light', 'dark'] as const;

function validerContenu(releve: Releve, contenu: unknown): void {
  if (!releve.objet(contenu, 'contenuDesPlanches', PARTIES_DU_CONTENU)) return;
  for (const partie of PARTIES_DU_CONTENU) {
    if (typeof contenu[partie] !== 'boolean') releve.refuser('forme', `contenuDesPlanches.${partie}`);
  }
  // Un cadre dessine au moins un thème ([PLA-28]).
  if (contenu.light === false && contenu.dark === false) releve.refuser('contenu-sans-theme', 'contenuDesPlanches');
}

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

  const fondsSombres = entree.intensiteDesFondsSombres;
  if (releve.nombre(fondsSombres, 'intensiteDesFondsSombres') && (fondsSombres < 0 || fondsSombres > 1)) {
    releve.refuser('fonds-sombres-bornes', 'intensiteDesFondsSombres', fondsSombres);
  }
  validerContenu(releve, entree.contenuDesPlanches);

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

/**
 * Les migrations connues. De 1 à 2, `base`, et de 2 à 3, `crans` et
 * `originale`, sont facultatifs : rien d'autre ne change dans le texte. Les
 * couleurs d'une liste importée qui ne porte pas 50 ou 950 changent pourtant,
 * les bouts de la dérive se lisant désormais à ces numéros. De 3 à 4,
 * `intensites` est facultatif et chaque palette garde ses deux intensités ;
 * la recette reçoit les valeurs par défaut de `intensiteDesFondsSombres` et
 * de `contenuDesPlanches`. Les fonds du thème Dark changent donc de couleur.
 */
export const MIGRATIONS: Migrations = {
  1: (ancienne) => ({ ...ancienne, formatVersion: 2 }),
  2: (ancienne) => ({ ...ancienne, formatVersion: 3 }),
  3: (ancienne) => ({
    ...ancienne,
    formatVersion: 4,
    intensiteDesFondsSombres: INTENSITE_DES_FONDS_SOMBRES,
    contenuDesPlanches: { ...CONTENU_COMPLET },
  }),
};

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
