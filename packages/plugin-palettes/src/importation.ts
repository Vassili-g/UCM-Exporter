/**
 * L'import d'une recette ([REC-08]) : le fichier se classe comme la recette
 * rangée ([REC-03]), puis se compare à elle, palette par palette selon
 * l'identifiant, et paramètre commun par paramètre commun. Rien ne se range
 * avant la confirmation du designer.
 */
import { classerRecette, jsonCanonique, type Palette, type Recette, type Refus, type Seuils } from 'ucm-couleur';

/** Les paramètres communs, dans l'ordre où l'écart les nomme. */
export const PARAMETRES_COMMUNS = ['crans', 'courbes', 'profils', 'fonds', 'seuils', 'derives', 'gamut'] as const;
export type ParametreCommun = (typeof PARAMETRES_COMMUNS)[number];

/** Les champs d'une palette que l'écart nomme, palette de base comprise (V12.2). */
export const CHAMPS_DE_PALETTE = ['nom', 'reference', 'base', 'parts', 'derive'] as const;
export type ChampDePalette = (typeof CHAMPS_DE_PALETTE)[number];

export interface EcartDImport {
  readonly ajoutees: readonly Palette[];
  readonly retirees: readonly Palette[];
  /** Les palettes de même identifiant dont un champ diffère, telles que le fichier les porte. */
  readonly modifiees: readonly Palette[];
  /** Les champs qui diffèrent, par identifiant de palette modifiée. */
  readonly champs: { readonly [id: string]: readonly ChampDePalette[] };
  readonly parametres: readonly ParametreCommun[];
  /** Les seuils qui diffèrent, quand `parametres` nomme `seuils`. */
  readonly seuils: readonly (keyof Seuils)[];
}

/**
 * Ce qu'un import change, par nature (V12.2) : les couleurs des nuances, le
 * résultat des garanties sans toucher aux couleurs, ou les seuls
 * signalements de couleurs proches.
 */
export interface NatureDeLEcart {
  readonly couleurs: boolean;
  readonly minimums: boolean;
  readonly detection: boolean;
}

const PARAMETRES_DE_COULEUR: readonly ParametreCommun[] = ['crans', 'courbes', 'profils', 'fonds', 'derives', 'gamut'];
const CHAMPS_DE_COULEUR: readonly ChampDePalette[] = ['reference', 'base', 'parts', 'derive'];

export function natureDeLEcart(ecart: EcartDImport): NatureDeLEcart {
  const palettesColorees = Object.values(ecart.champs).some((champs) => champs.some((champ) => CHAMPS_DE_COULEUR.includes(champ)));
  return {
    couleurs: ecart.ajoutees.length > 0 || palettesColorees || ecart.parametres.some((cle) => PARAMETRES_DE_COULEUR.includes(cle)),
    minimums: ecart.seuils.includes('texte') || ecart.seuils.includes('nonTexte'),
    detection: ecart.seuils.some((seuil) => seuil !== 'texte' && seuil !== 'nonTexte'),
  };
}

export type LectureDImport =
  /** Le fichier ne se lit pas : JSON cassé, forme ou valeurs refusées. */
  | { readonly issue: 'invalide'; readonly refus: readonly Refus[] }
  /** Une version que ce plugin ne lit pas. */
  | { readonly issue: 'future'; readonly version: number }
  | { readonly issue: 'prete'; readonly recette: Recette; readonly ecart: EcartDImport };

const identique = (a: unknown, b: unknown): boolean => jsonCanonique(a) === jsonCanonique(b);

/** L'écart entre la recette du fichier et celle qu'on importerait ; sans recette lisible, tout est ajouté. */
export function ecartDImport(actuelle: Recette | null, importee: Recette): EcartDImport {
  const avant = new Map((actuelle?.palettes ?? []).map((palette) => [palette.id, palette]));
  const apres = new Set(importee.palettes.map((palette) => palette.id));
  const modifiees = importee.palettes.filter((palette) => avant.has(palette.id) && !identique(avant.get(palette.id), palette));
  const parametres = actuelle ? PARAMETRES_COMMUNS.filter((cle) => !identique(actuelle[cle], importee[cle])) : [...PARAMETRES_COMMUNS];
  const seuils = (Object.keys(importee.seuils) as (keyof Seuils)[]).filter((seuil) => !actuelle || actuelle.seuils[seuil] !== importee.seuils[seuil]);
  return {
    ajoutees: importee.palettes.filter((palette) => !avant.has(palette.id)),
    retirees: (actuelle?.palettes ?? []).filter((palette) => !apres.has(palette.id)),
    modifiees,
    champs: Object.fromEntries(modifiees.map((palette) => [palette.id, CHAMPS_DE_PALETTE.filter((champ) => !identique(avant.get(palette.id)?.[champ], palette[champ]))])),
    parametres,
    seuils: parametres.includes('seuils') ? seuils : [],
  };
}

/** Lit un fichier importé. Un fichier vide n'est pas une recette : il se refuse comme un JSON cassé. */
export function lireLImport(texte: string, actuelle: Recette | null): LectureDImport {
  const classement = classerRecette(texte);
  if (classement.etat === 'future') return { issue: 'future', version: classement.version };
  if (classement.etat === 'illisible') return { issue: 'invalide', refus: classement.refus };
  if (classement.etat === 'absente') return { issue: 'invalide', refus: [{ regle: 'forme', chemin: '' }] };
  return { issue: 'prete', recette: classement.recette, ecart: ecartDImport(actuelle, classement.recette) };
}
