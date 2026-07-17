/**
 * Fusion des règles `@icons` dans l'API publique d'un contrat de composant.
 * La liaison repose uniquement sur les noms Figma exacts et les bindings de
 * visibilité, sans heuristique de position propre à un composant.
 */
import { normalizePropKey } from './parsers';
import type { IconRule } from './rulesModel';
import type { Contract, ContractProp, IconDefinition, IconProp } from './types';

/**
 * Ajoute les métadonnées d'icônes et les props runtime des règles modifiables,
 * tout en conservant les booléens Figma comme contrôles de visibilité.
 */
export function mergeIconRules(
  props: Record<string, ContractProp>,
  children: Contract['structure']['children'],
  rules: IconRule[],
  warnings: string[],
): Record<string, IconDefinition> {
  const icons: Record<string, IconDefinition> = {};

  for (const rule of rules) {
    const key = normalizePropKey(rule.iconName);
    const matches = children.filter(
      (child) => !child.typography && child.figmaLayer === rule.iconName,
    );
    if (matches.length === 0) {
      warnings.push(`@icons « ${rule.iconName} » : aucun calque graphique de ce nom.`);
      continue;
    }
    if (matches.length > 1) {
      warnings.push(
        `@icons « ${rule.iconName} » : ${matches.length} calques graphiques portent ce nom ; règle ignorée.`,
      );
      continue;
    }
    if (icons[key]) {
      warnings.push(`@icons « ${rule.iconName} » : clé normalisée dupliquée ; règle ignorée.`);
      continue;
    }

    const iconChild = matches[0];
    const icon: IconDefinition = {
      policy: rule.policy,
      figmaName: iconChild.figmaLayer ?? rule.iconName,
      ...(iconChild.visibilityProp ? { visibilityProp: iconChild.visibilityProp } : {}),
    };
    icons[key] = icon;
    if (rule.policy === 'strict') continue;

    const visibilityProp = iconChild.visibilityProp;
    if (!visibilityProp) {
      warnings.push(
        `@icons « ${rule.iconName} » modifiable : le calque doit lier « visible » à une prop BOOLEAN Figma pour exposer une prop runtime.`,
      );
      continue;
    }
    if (props[visibilityProp]?.type !== 'boolean') {
      warnings.push(
        `@icons « ${rule.iconName} » modifiable : « ${visibilityProp} » n'est pas une prop BOOLEAN Figma exploitable.`,
      );
      continue;
    }

    const runtimeProp = `${visibilityProp}Name`;
    if (runtimeProp in props) {
      warnings.push(
        `@icons « ${rule.iconName} » modifiable : la prop runtime « ${runtimeProp} » existe déjà ; aucune prop n'est remplacée.`,
      );
      continue;
    }
    const iconProp: IconProp = {
      type: 'icon',
      default: null,
      policy: 'modifiable',
      visibilityProp,
    };
    props[runtimeProp] = iconProp;
    icon.runtimeProp = runtimeProp;
  }

  return icons;
}
