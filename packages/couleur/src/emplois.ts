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
  | 'surface-card'
  | 'border-control'
  | 'border-decorative'
  | 'focus';

/** Les huit emplois. */
export const EMPLOIS: readonly Emploi[] = [
  'solid',
  'on-solid',
  'text',
  'surface',
  'surface-card',
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
  'surface-card': 50,
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

/**
 * Les emplois qu'une liste peut ne pas porter : `surface-card` n'existe, avec
 * ses paires, que dans une liste qui a la 50. Les trois préréglages l'ont ;
 * une liste importée qui commence à 100 reste lisible ([VER-05]).
 */
export const EMPLOIS_FACULTATIFS: readonly Emploi[] = ['surface-card'];

/** Vrai quand la liste porte le cran de l'emploi ; `on-solid`, qui vise le fond, l'est toujours. */
export function emploiPresent(emploi: Emploi, crans: readonly number[]): boolean {
  const cible = TABLE_DES_EMPLOIS[emploi];
  return cible === 'fond' || crans.includes(cible);
}

/**
 * Le rang du cran 50 dans la liste, que la garantie des courbes et l'alerte
 * des fonds lisent ; le premier cran quand la liste ne porte pas la 50.
 */
export function rangDuCranLeger(crans: readonly number[]): number {
  return Math.max(0, crans.indexOf(TABLE_DES_EMPLOIS['surface-card']));
}
