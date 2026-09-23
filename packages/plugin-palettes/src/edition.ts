/**
 * Les modifications qu'une saisie du designer fait à une palette, sans rien
 * ranger : le rangement suit la fin du geste (D-D).
 */
import {
  ajusterPartsGrises,
  boutsDe,
  ecrireHexa,
  lireHexa,
  prereglageTailwind,
  rgb8VersOklch,
  type DeriveRangee,
  type Palette,
  type Recette,
} from 'ucm-couleur';

/** Un hexa de six chiffres, avec ou sans dièse. */
export const MOTIF_HEXA = /^#?[0-9a-f]{6}$/i;

/**
 * La palette avec une nouvelle référence ([ENT-01]). Une dérive d'origine
 * `tailwind` suit le préréglage recalculé sur la recette ; une dérive `libre`
 * ou `constante` reste telle quelle. Les parts `grise` se posent ou se
 * retirent selon la nouvelle référence ([ENT-09]). Rend `null` pour un hexa
 * qui ne se lit pas.
 */
export function changerReference(recette: Recette, palette: Palette, saisie: string): Palette | null {
  if (!MOTIF_HEXA.test(saisie.trim())) return null;
  const couleur = lireHexa(saisie.trim().startsWith('#') ? saisie.trim() : `#${saisie.trim()}`);
  if (!couleur) return null;
  const prereglage = prereglageTailwind(
    rgb8VersOklch(couleur),
    boutsDe(recette.courbes),
    recette.derives,
    recette.seuils.chromaGrise,
  );
  const suivre = (derive: DeriveRangee): DeriveRangee =>
    derive.origine === 'tailwind' ? { ...prereglage, origine: 'tailwind' } : derive;
  return ajusterPartsGrises(recette, {
    ...palette,
    reference: ecrireHexa(couleur),
    derive: { ...palette.derive, soft: suivre(palette.derive.soft), vivid: suivre(palette.derive.vivid) },
  });
}

/** La palette avec un nouveau nom ; un nom vide retire la clé, et la palette s'affiche sous son hexa. */
export function renommer(palette: Palette, nom: string): Palette {
  const { nom: _ancien, ...sansNom } = palette;
  return nom.trim() === '' ? sansNom : { ...sansNom, nom };
}

/** La recette où la palette d'identifiant `palette.id` est remplacée. */
export function remplacerPalette(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: recette.palettes.map((candidate) => (candidate.id === palette.id ? palette : candidate)) };
}
