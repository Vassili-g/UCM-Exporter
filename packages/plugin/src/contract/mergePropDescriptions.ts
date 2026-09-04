/**
 * Accroche la documentation par valeur (règles `@prop`) à l'axe qu'elle décrit.
 *
 * Un axe de variantes est publié à DEUX endroits selon sa nature : les axes
 * d'API dans `props`, l'axe d'états dans `stateModel`. Ce module suit cette
 * répartition plutôt que de la contredire — sans quoi une règle visant un axe
 * réellement publié serait refusée au designer comme une faute de frappe.
 * Il reste pur pour pouvoir vérifier la convention sans l'API Figma.
 */
import { propByName } from './parsers';
import type { ContractProp, StateModel } from '@ucm/kit/format';

/**
 * Message unique pour une valeur citée par une règle mais absente de l'axe :
 * les deux axes publiés parlent au designer du même vocabulaire Figma.
 */
function unknownValueWarning(propName: string, value: string): string {
  return `Règle @prop « ${propName}.${value} » : la variant property « ${propName} » n’a pas de valeur « ${value} ». Vérifiez l’orthographe dans le layer « prop ».`;
}

/**
 * Documente les états d'interaction, là où le contrat les publie déjà.
 *
 * L'axe `State`/`Status` est exclu des props — le développeur ne choisit pas
 * `hover` — mais `stateModel` le publie avec toutes ses valeurs, et les arbres
 * de variantes en sont indexés. Sa documentation a donc un propriétaire.
 */
function mergeStateDescriptions(
  stateModel: StateModel,
  valueDescriptions: Record<string, string>,
  warnings: string[],
): void {
  for (const [value, description] of Object.entries(valueDescriptions)) {
    // Même précaution que partout où une clé vient de Figma : un état nommé
    // « constructor » trouverait une fonction héritée et recevrait sa
    // description sur le prototype d'`Object`.
    const state = Object.prototype.hasOwnProperty.call(stateModel.states, value)
      ? stateModel.states[value]
      : undefined;
    if (!state) {
      warnings.push(unknownValueWarning(stateModel.axis, value));
      continue;
    }
    state.description = description;
  }
}

/**
 * Range chaque documentation `@prop` sur la prop enum ou l'état visé. Un nom
 * ou une valeur introuvable déclenche un warning précis (faute de frappe dans
 * une règle) sans jamais bloquer l'export.
 */
export function mergePropDescriptions(
  props: Record<string, ContractProp>,
  stateModel: StateModel | null,
  propDescriptions: Record<string, Record<string, string>>,
  warnings: string[],
): void {
  for (const [propName, valueDescriptions] of Object.entries(propDescriptions)) {
    if (stateModel && propName === stateModel.axis) {
      mergeStateDescriptions(stateModel, valueDescriptions, warnings);
      continue;
    }

    const prop = propByName(props, propName);
    if (!prop || prop.type !== 'enum') {
      warnings.push(`Règle @prop « ${propName} » : le composant n’a aucune variant property portant ce nom. Vérifiez l’orthographe dans le layer « prop ».`);
      continue;
    }
    for (const [value, description] of Object.entries(valueDescriptions)) {
      if (!prop.values.includes(value)) {
        warnings.push(unknownValueWarning(propName, value));
        continue;
      }
      if (!prop.descriptions) prop.descriptions = {};
      // La valeur vient de Figma : une valeur nommée « __proto__ » fixerait le
      // prototype au lieu d'occuper une clé, et la documentation quitterait le
      // contrat sans un mot. Même précaution que partout ailleurs.
      Object.defineProperty(prop.descriptions, value, {
        value: description, enumerable: true, writable: true, configurable: true,
      });
    }
  }
}
