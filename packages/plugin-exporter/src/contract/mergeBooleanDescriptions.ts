/**
 * Accroche aux props BOOLEAN la documentation déclarée par les règles
 * `@boolean`. Ce module reste pur pour pouvoir vérifier la convention sans
 * dépendre de l'API Figma.
 */
import { propByName } from './parsers';
import { pousserSansNode } from './localisation';
import type { ContractProp } from '@ucm-kit/core/format';

export function mergeBooleanDescriptions(
  props: Record<string, ContractProp>,
  descriptions: Record<string, string>,
  warnings: string[],
): void {
  for (const [propName, description] of Object.entries(descriptions)) {
    // Le nom vient du texte libre d'une règle : la lecture passe par l'unique
    // autorité, qui n'atteint jamais le prototype d'`Object`.
    const prop = propByName(props, propName);
    if (!prop || prop.type !== 'boolean') {
      pousserSansNode(warnings, `Règle @boolean « ${propName} »`, {
        manque: 'le composant n’a aucune propriété booléenne portant ce nom.',
        impact: 'La documentation de cette règle n’entre pas dans le contrat.',
        action: 'Dans le calque « prop », reprenez le nom exact de la propriété booléenne du composant, puis réexportez.',
      });
      continue;
    }
    prop.description = description;
  }
}
