/**
 * La table des emplois de l'architecture (section 11.2 de la spécification) :
 * fixe, commune à toutes les palettes, aux deux profils et aux deux modes.
 * Aucune recette ne la porte.
 */

export type Emploi =
  | 'solid'
  | 'on-solid'
  | 'text'
  | 'surface'
  | 'border-control'
  | 'border-decorative'
  | 'focus';

/** Les sept emplois, dans l'ordre où la planche les liste (section 9.4). */
export const EMPLOIS: readonly Emploi[] = [
  'solid',
  'on-solid',
  'text',
  'surface',
  'border-control',
  'border-decorative',
  'focus',
];

/** Le cran de chaque emploi. `on-solid` prend le fond de référence du mode. */
export const TABLE_DES_EMPLOIS = {
  solid: 700,
  'on-solid': 'fond',
  text: 700,
  surface: 100,
  'border-control': 600,
  'border-decorative': 300,
  focus: 600,
} as const satisfies { readonly [E in Emploi]: number | 'fond' };

/**
 * Les crans que les paires visent, états `+1` et `+2` compris, sur les crans
 * par défaut ([VER-05]). `[REC-05]` refuse une recette dont `crans` en omet
 * un : aucune paire ne vise alors un cran absent ni ne déborde de la rampe.
 */
export const CRANS_DES_EMPLOIS: readonly number[] = [100, 200, 300, 600, 700, 800, 900];
