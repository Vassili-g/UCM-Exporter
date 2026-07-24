/**
 * Traduction des propriétés Figma en props publiques du contrat.
 */
import normalizeName from '../utils';
import { semanticEnumName } from './semantics';
import type { ContractProp } from './types';

/**
 * Normalise un nom de propriété Figma en clé camelCase.
 * Étapes : retirer l'identifiant interne (« #12:3 »), marquer les frontières
 * du camelCase existant pour ne pas l'aplatir (`iconLeft` reste `iconLeft`),
 * puis recomposer mot à mot.
 *
 * @example normalizePropKey('Icon Position#12:3') // → 'iconPosition'
 */
export function normalizePropKey(name: string): string {
  const withoutFigmaId = name.replace(/#.*$/, '');
  // Insère une frontière avant chaque majuscule interne ('iconLeft' → 'icon Left').
  const withCamelBoundaries = withoutFigmaId.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const words = normalizeName(withCamelBoundaries)
    .replace(/\./g, '-')
    .split('-')
    .filter(Boolean);

  return words
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');
}

/** Normalise une valeur de variante (minuscules, espaces → tirets). */
export function normalizePropValue(value: string): string {
  return normalizeName(value).replace(/\./g, '-');
}

/**
 * Un axe « état » (hover, focus, disabled…) est design-only : il décrit des
 * états d'interaction, pas des choix d'API. Il est exclu des props — seule
 * sa valeur Disable devient une prop booléenne `disabled`. Détecté par le
 * nom de l'axe, donc valable pour n'importe quel composant.
 */
function isStateProperty(key: string): boolean {
  return key === 'state' || key === 'status';
}

/**
 * Convertit les définitions de propriétés Figma en props publiques :
 * VARIANT → enum, BOOLEAN → boolean, TEXT → string.
 * La couche sémantique renomme les axes reconnus (ex. axe de tailles →
 * `size`) en gardant le nom Figma d'origine dans `figmaName`.
 */
export function extractContractProps(
  definitions: ComponentPropertyDefinitions,
): Record<string, ContractProp> {
  const props: Record<string, ContractProp> = {};

  for (const [propertyName, definition] of Object.entries(definitions)) {
    const key = normalizePropKey(propertyName);

    if (isStateProperty(key)) {
      const states = definition.variantOptions ?? [];
      const hasDisabledState = states.some((state) => /^disabl(?:e|ed)$/i.test(state.trim()));
      if (definition.type === 'VARIANT' && hasDisabledState) {
        props.disabled = {
          type: 'boolean',
          default: /^disabl(?:e|ed)$/i.test(String(definition.defaultValue).trim()),
        };
      }
      continue;
    }

    if (definition.type === 'VARIANT') {
      const values = (definition.variantOptions ?? []).map((value) => normalizePropValue(value));
      const semantic = semanticEnumName(values);
      // On applique le nom sémantique sans jamais écraser une prop existante.
      const publicKey = semantic && !(semantic in props) ? semantic : key;
      const rawFigmaName = propertyName.replace(/#.*$/, '');
      props[publicKey] = {
        type: 'enum',
        values,
        default:
          typeof definition.defaultValue === 'string'
            ? normalizePropValue(definition.defaultValue)
            : values[0] ?? null,
        // figmaName n'apparaît que si la clé publique diffère du nom Figma.
        ...(publicKey !== key ? { figmaName: rawFigmaName } : {}),
      };
      continue;
    }

    if (definition.type === 'BOOLEAN') {
      props[key] = { type: 'boolean', default: Boolean(definition.defaultValue) };
      continue;
    }

    if (definition.type === 'TEXT') {
      props[key] = {
        type: 'string',
        default: typeof definition.defaultValue === 'string' ? definition.defaultValue : null,
      };
    }
  }

  return props;
}
