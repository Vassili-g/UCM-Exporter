/**
 * Range chaque `@default` sur l'axe qu'il vise.
 *
 * Le contrat ne publie un défaut d'axe que si le designer l'a déclaré. Une
 * cible introuvable ou une valeur qui n'existe pas produit un avertissement
 * précis et ne pose rien : un défaut inventé voyagerait jusque dans le code
 * sans que personne l'ait décidé.
 */
import { propByName } from './parsers';
import { pousserSansNode } from './localisation';
import type { ContractProp } from '@ucm-kit/core/format';

export function mergeEnumDefaults(
  props: Record<string, ContractProp>,
  enumDefaults: Record<string, string>,
  warnings: string[],
): void {
  for (const [propName, value] of Object.entries(enumDefaults)) {
    const prop = propByName(props, propName);
    if (!prop || prop.type !== 'enum') {
      pousserSansNode(warnings, `Règle @default « ${propName} »`, {
        manque: 'le composant n’a aucun axe de variantes portant ce nom.',
        impact: 'Le contrat ne publiera aucune valeur par défaut pour cette propriété.',
        action: 'Vérifiez l’orthographe de cette règle, puis réexportez.',
      });
      continue;
    }
    if (!prop.values.includes(value)) {
      pousserSansNode(warnings, `Règle @default « ${propName} »`, {
        manque: `la propriété « ${propName} » n’a pas de valeur « ${value} ».`,
        impact: 'Le contrat ne publiera aucune valeur par défaut pour cette propriété.',
        action: 'Corrigez la valeur visée par cette règle, puis réexportez.',
      });
      continue;
    }
    prop.default = value;
  }
}
