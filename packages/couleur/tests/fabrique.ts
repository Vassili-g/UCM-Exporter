/** Des palettes et des recettes fabriquées pour les tests, à partir de la recette par défaut. */
import {
  boutsDe,
  lireHexa,
  prereglageTailwind,
  recetteParDefaut,
  rgb8VersOklch,
  type Palette,
  type Recette,
} from '../src/index';

/** Une palette au préréglage Tailwind, les deux profils liés. */
export function paletteTailwind(id: string, reference: string, autres: Partial<Palette> = {}): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recetteParDefaut()));
  return {
    id,
    reference,
    derive: {
      lien: true,
      soft: { ...derive, origine: 'tailwind' },
      vivid: { ...derive, origine: 'tailwind' },
    },
    ...autres,
  };
}

/** La recette par défaut, avec les palettes données. */
export function recetteAvec(...palettes: Palette[]): Recette {
  return { ...recetteParDefaut(), palettes };
}

/** Une copie modifiable d'une valeur JSON. */
export function copie<T>(valeur: T): any {
  return JSON.parse(JSON.stringify(valeur));
}
