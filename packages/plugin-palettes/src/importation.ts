/**
 * L'import d'une recette ([REC-08]) : le fichier se classe comme la recette
 * rangée ([REC-03]), puis se compare à elle, palette par palette selon
 * l'identifiant, et paramètre commun par paramètre commun. Rien ne se range
 * avant la confirmation du designer.
 */
import { classerRecette, jsonCanonique, type Palette, type Recette, type Refus } from 'ucm-couleur';

/** Les paramètres communs, dans l'ordre où l'écart les nomme. */
export const PARAMETRES_COMMUNS = ['crans', 'courbes', 'profils', 'fonds', 'seuils', 'derives', 'gamut'] as const;
export type ParametreCommun = (typeof PARAMETRES_COMMUNS)[number];

export interface EcartDImport {
  readonly ajoutees: readonly Palette[];
  readonly retirees: readonly Palette[];
  /** Les palettes de même identifiant dont un champ diffère, telles que le fichier les porte. */
  readonly modifiees: readonly Palette[];
  readonly parametres: readonly ParametreCommun[];
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
  return {
    ajoutees: importee.palettes.filter((palette) => !avant.has(palette.id)),
    retirees: (actuelle?.palettes ?? []).filter((palette) => !apres.has(palette.id)),
    modifiees: importee.palettes.filter((palette) => avant.has(palette.id) && !identique(avant.get(palette.id), palette)),
    parametres: actuelle ? PARAMETRES_COMMUNS.filter((cle) => !identique(actuelle[cle], importee[cle])) : [...PARAMETRES_COMMUNS],
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
