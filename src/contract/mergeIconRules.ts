/**
 * Fusion des règles `@icons` dans l'API publique d'un contrat de composant.
 * La liaison repose uniquement sur les noms Figma exacts et les bindings de
 * visibilité, sans heuristique de position propre à un composant.
 */
import { normalizePropKey } from './parsers';
import type { IconLayerSummary } from './extractIconLayers';
import type { IconRule } from './rulesModel';
import { indexedSlotName } from './semantics';
import type { ContractProp, IconDefinition, IconProp } from './types';

/**
 * Slot occupé par une icône, ou undefined si elle n'en occupe pas un seul.
 *
 * Le rang vient de l'ordre du document, la même source que la déduplication
 * des slots : une icône présente au premier rang de son variant remplit le
 * slot `icon`, celle du deuxième rang `icon-2`. C'est ce qui donne un slot aux
 * icônes absentes du variant de référence, sans deviner leur place. Deux rangs
 * différents décrivent une structure qui change entre variants : le contrat
 * n'en invente aucun et le dit.
 */
function iconSlot(layer: IconLayerSummary, warnings: string[]): string | undefined {
  if (layer.slotIndexes.length === 1) return indexedSlotName('icon', layer.slotIndexes[0]);
  warnings.push(
    `@icons « ${layer.figmaLayer} » : rang différent selon les variants ` +
      `(${[...layer.slotIndexes].sort((left, right) => left - right).join(', ')}) ; ` +
      'aucun slot n’est déduit. Placez l’icône au même rang dans tous les variants.',
  );
  return undefined;
}

/**
 * Token de taille de l'icône, ou undefined s'il n'est pas unique. Une taille
 * qui change d'un variant à l'autre n'est pas représentable par le schéma
 * courant : on ne conserve pas la première, qui serait celle du hasard.
 */
function iconSize(layer: IconLayerSummary, warnings: string[]): string | undefined {
  const sizes = layer.sizes.filter((size): size is string => Boolean(size));
  if (layer.sizes.length === 1) return sizes[0];
  if (sizes.length > 1) {
    warnings.push(
      `@icons « ${layer.figmaLayer} » : tailles différentes selon les variants ` +
        `(${sizes.join(', ')}) ; aucune taille n’est déduite.`,
    );
  }
  return undefined;
}

/**
 * Ajoute les métadonnées d'icônes et les props runtime des règles modifiables,
 * tout en conservant les booléens Figma comme contrôles de visibilité.
 */
export function mergeIconRules(
  props: Record<string, ContractProp>,
  layers: IconLayerSummary[],
  rules: IconRule[],
  warnings: string[],
): Record<string, IconDefinition> {
  const icons: Record<string, IconDefinition> = {};

  for (const rule of rules) {
    const key = normalizePropKey(rule.iconName);
    const layer = layers.find((candidate) => candidate.figmaLayer === rule.iconName);
    if (!layer) {
      warnings.push(`@icons « ${rule.iconName} » : aucun calque graphique de ce nom.`);
      continue;
    }
    if (layer.maximumOccurrences > 1) {
      warnings.push(
        `@icons « ${rule.iconName} » : jusqu’à ${layer.maximumOccurrences} calques graphiques ` +
          'portent ce nom dans un même variant ; règle ignorée.',
      );
      continue;
    }
    if (icons[key]) {
      warnings.push(`@icons « ${rule.iconName} » : clé normalisée dupliquée ; règle ignorée.`);
      continue;
    }

    const visibilityProp = layer.visibilityProps.length === 1
      ? layer.visibilityProps[0] ?? undefined
      : undefined;
    if (layer.visibilityProps.length > 1) {
      warnings.push(
        `@icons « ${rule.iconName} » : liaison de visibilité différente selon les variants ; ` +
          'aucune prop de visibilité n’est déduite.',
      );
    }
    const slot = iconSlot(layer, warnings);
    const size = iconSize(layer, warnings);
    const icon: IconDefinition = {
      policy: rule.policy,
      figmaName: layer.figmaLayer,
      ...(slot ? { slot } : {}),
      ...(size ? { size } : {}),
      ...(visibilityProp ? { visibilityProp } : {}),
      ...(layer.variants.length < layer.totalVariants ? { variants: layer.variants } : {}),
    };
    icons[key] = icon;
    if (rule.policy === 'strict') continue;

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
