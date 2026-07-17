/**
 * Couche sémantique — les « naming conventions & mappings » de l'UCS
 * (voir CONCEPT.md).
 *
 * Les noms Figma accidentels (axe « Button-Construc-Type », calque
 * « Suivant »…) sont traduits vers un vocabulaire partagé, lisible par un
 * humain ou un agent IA sans interprétation externe. L'appelant conserve
 * toujours le nom Figma d'origine (figmaName / figmaLayer) : zéro perte.
 *
 * Règle d'or : le mapping se décide sur les VALEURS ou le RÔLE, jamais sur
 * le nom d'un composant — aucun cas particulier codé en dur.
 */
import type { RenderingSemantics, StateModel } from './types';

/** Déclencheurs web connus pour les valeurs d'un axe d'état. */
const STATE_SELECTORS: Record<string, string | null> = {
  default: null,
  hover: ':hover',
  focus: ':focus-visible',
  press: ':active',
  disable: '[disabled]',
  disabled: '[disabled]',
};

/** Priorité générique appliquée quand plusieurs états sont simultanés. */
const STATE_PRECEDENCE = ['disable', 'disabled', 'press', 'focus', 'hover', 'default'];

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

/**
 * Construit le modèle d'interaction d'un composant à partir de ses axes et
 * de ses variants. Les états inconnus restent visibles dans le contrat, mais
 * leur déclencheur est nul et un warning demande une convention explicite.
 */
export function buildStateModel(
  axes: string[],
  variantValues: Array<Record<string, string>>,
  warnings: string[],
): StateModel | null {
  const axis = axes.find((candidate) => candidate === 'state' || candidate === 'status');
  if (!axis) return null;

  const values = Array.from(
    new Set(variantValues.map((entry) => entry[axis]).filter((value): value is string => Boolean(value))),
  );
  const states: StateModel['states'] = {};

  for (const value of values) {
    const selector = Object.prototype.hasOwnProperty.call(STATE_SELECTORS, value)
      ? STATE_SELECTORS[value]
      : null;
    states[value] = { selector };
    if (!(value in STATE_SELECTORS)) {
      warnings.push(`Axe d'état « ${axis} » : état « ${value} » sans déclencheur connu.`);
    }
  }

  const precedence = [
    ...STATE_PRECEDENCE.filter((value) => values.includes(value)),
    ...values.filter((value) => !STATE_PRECEDENCE.includes(value)),
  ];

  return { axis, states, precedence };
}

/**
 * Retourne le mapping de rendu partagé par tous les contrats. Il est exporté
 * dans chaque UCS afin qu'un agent n'ait pas à deviner le CSS d'un rôle.
 */
export function defaultRenderingSemantics(): RenderingSemantics {
  return {
    roles: {
      background: { kind: 'paint', cssProperties: ['background-color'] },
      foreground: { kind: 'paint', cssProperties: ['color', 'fill'] },
      border: { kind: 'stroke', cssProperties: ['border-color', 'border-width'] },
      ring: {
        kind: 'stroke',
        cssProperties: ['outline-color', 'outline-width'],
        fallback: 'box-shadow',
      },
    },
  };
}
