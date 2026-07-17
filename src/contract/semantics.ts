/**
 * Couche sémantique — les « naming conventions & mappings » de l'UCS
 * (voir concept.md).
 *
 * Les noms Figma accidentels (axe « Button-Construc-Type », calque
 * « Suivant »…) sont traduits vers un vocabulaire partagé, lisible par un
 * humain ou un agent IA sans interprétation externe. L'appelant conserve
 * toujours le nom Figma d'origine (figmaName / figmaLayer) : zéro perte.
 *
 * Règle d'or : le mapping se décide sur les VALEURS ou le RÔLE, jamais sur
 * le nom d'un composant — aucun cas particulier codé en dur.
 */

/**
 * Échelles de tailles connues. Un enum dont TOUTES les valeurs figurent ici
 * est un axe de tailles, quel que soit son nom Figma.
 */
const SIZE_VALUES = new Set([
  'tiny', 'small', 'medium', 'large', 'big', 'huge',
  '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl',
]);

/**
 * Nom sémantique d'un axe enum, ou null pour garder le nom brut.
 * Seule règle actuelle : toutes les valeurs sont des tailles → `size`.
 * La liste est faite pour grandir (emphasis, tone…) au fil des besoins.
 */
export function semanticEnumName(values: string[]): string | null {
  if (values.length >= 2 && values.every((value) => SIZE_VALUES.has(value))) {
    return 'size';
  }
  return null;
}

/**
 * Rôle sémantique d'un calque : un calque texte est toujours le `label`,
 * peu importe son nom Figma (souvent le texte d'exemple, ex. « Suivant »).
 */
export function semanticSlotName(isText: boolean): string | null {
  return isText ? 'label' : null;
}
