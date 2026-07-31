/**
 * Accroche aux props BOOLEAN la documentation déclarée par les règles
 * `@boolean`. Ce module reste pur pour pouvoir vérifier la convention sans
 * dépendre de l'API Figma.
 */
import type { ContractProp } from './types';

export function mergeBooleanDescriptions(
  props: Record<string, ContractProp>,
  descriptions: Record<string, string>,
  warnings: string[],
): void {
  for (const [propName, description] of Object.entries(descriptions)) {
    const prop = props[propName];
    if (!prop || prop.type !== 'boolean') {
      warnings.push(`Règle @boolean « ${propName} » : le composant n’a aucune propriété booléenne portant ce nom. Vérifiez l’orthographe dans le calque « prop ».`);
      continue;
    }
    prop.description = description;
  }
}
