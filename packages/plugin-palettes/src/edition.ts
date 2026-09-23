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

/**
 * Un identifiant de palette neuf (D-K) : `p-` et huit chiffres hexadécimaux
 * tirés par `tirer`, qui rend un entier de 32 bits. Le hasard vient de
 * l'interface ; le moteur reste sans hasard. Un tirage déjà pris se refait.
 */
export function nouvelIdentifiant(recette: Recette, tirer: () => number): string {
  const pris = new Set(recette.palettes.map((palette) => palette.id));
  for (;;) {
    const id = `p-${(tirer() >>> 0).toString(16).padStart(8, '0')}`;
    if (!pris.has(id)) return id;
  }
}

/**
 * Une palette neuve de référence `saisie`, au préréglage Tailwind, profils
 * liés. Rend `null` pour un hexa qui ne se lit pas.
 */
export function nouvellePalette(recette: Recette, id: string, saisie: string): Palette | null {
  const nulle: DeriveRangee = { clair: 0, sombre: 0, origine: 'tailwind' };
  return changerReference(recette, { id, reference: '#000000', derive: { lien: true, soft: nulle, vivid: nulle } }, saisie);
}

/** La recette avec la palette ajoutée en dernier. */
export function ajouter(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: [...recette.palettes, palette] };
}

/** Une copie de la palette, sous un autre identifiant et un autre nom, placée juste après elle. */
export function dupliquer(recette: Recette, id: string, nouvelId: string, nom: string): Recette {
  const rang = recette.palettes.findIndex((palette) => palette.id === id);
  if (rang < 0) return recette;
  const copie: Palette = { ...recette.palettes[rang], id: nouvelId, nom };
  const palettes = [...recette.palettes];
  palettes.splice(rang + 1, 0, copie);
  return { ...recette, palettes };
}

/** La palette avancée d'un rang (`1`) ou reculée (`-1`) dans l'ordre d'affichage ; rien aux bouts. */
export function deplacer(recette: Recette, id: string, sens: -1 | 1): Recette {
  const rang = recette.palettes.findIndex((palette) => palette.id === id);
  const cible = rang + sens;
  if (rang < 0 || cible < 0 || cible >= recette.palettes.length) return recette;
  const palettes = [...recette.palettes];
  [palettes[rang], palettes[cible]] = [palettes[cible], palettes[rang]];
  return { ...recette, palettes };
}

/**
 * La recette sans la palette. Son cadre reste sur la planche, et la planche le
 * signalera orphelin ([ENT-03]).
 */
export function supprimer(recette: Recette, id: string): Recette {
  return { ...recette, palettes: recette.palettes.filter((palette) => palette.id !== id) };
}

/** La recette où la palette d'identifiant `palette.id` est remplacée. */
export function remplacerPalette(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: recette.palettes.map((candidate) => (candidate.id === palette.id ? palette : candidate)) };
}
