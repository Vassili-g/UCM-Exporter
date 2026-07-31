/**
 * Fusion des règles `@icons` dans l'API publique d'un contrat de composant.
 * La liaison repose uniquement sur les noms Figma exacts et les bindings de
 * visibilité, sans heuristique de position propre à un composant.
 */
import { normalizePropKey } from './parsers';
import type { IconLayerSummary } from './extractIconLayers';
import type { IconRule } from './rulesModel';
import type { ContractProp, IconDefinition, IconProp } from './types';

/**
 * Énumère des valeurs relevées sur la matrice pour un message d'avertissement.
 * Le tri rend le message stable : deux exports d'un design inchangé doivent
 * produire le même contrat, avertissements compris.
 */
function listValues(values: Array<string | null>, absentLabel: string): string {
  return [...new Set(values.map((value) => value ?? absentLabel))].sort().join(', ');
}

/**
 * Slot occupé par une icône, ou undefined si elle n'en occupe pas exactement un.
 *
 * Plusieurs slots décrivent une structure qui change d'un variant à l'autre ;
 * `null` désigne un calque posé hors du conteneur de dimensions, que
 * `structure.children` ne décrit donc pas. Dans les deux cas le contrat préfère
 * se taire à situer l'icône au hasard.
 */
function iconSlot(layer: IconLayerSummary, warnings: string[]): string | undefined {
  const onlySlot = layer.slots.length === 1 ? layer.slots[0] : null;
  if (onlySlot) return onlySlot;

  warnings.push(
    layer.slots.length === 1
      ? `@icons « ${layer.figmaLayer} » : le calque n’est pas un enfant direct du conteneur ` +
        'qui porte les dimensions ; aucun slot n’est déduit, donc aucun consommateur ne ' +
        'saura où le rendre. Déplacez-le dans ce conteneur.'
      : `@icons « ${layer.figmaLayer} » : slot différent selon les variants ` +
        `(${listValues(layer.slots, 'aucun')}) ; aucun slot n’est déduit. Placez l’icône au ` +
        'même emplacement dans tous les variants.',
  );
  return undefined;
}

/**
 * Token de taille de l'icône, ou undefined s'il n'est pas unique sur toute la
 * matrice.
 *
 * Une taille absente d'une partie des variants compte comme une divergence, au
 * même titre que deux tokens concurrents : une icône sans taille n'est pas
 * rendable, et retenir la seule valeur trouvée affirmerait une uniformité que
 * Figma ne montre pas.
 */
function iconSize(layer: IconLayerSummary, warnings: string[]): string | undefined {
  const onlySize = layer.sizes.length === 1 ? layer.sizes[0] : null;
  if (onlySize) return onlySize;
  if (layer.sizes.length <= 1) return undefined;

  warnings.push(
    `@icons « ${layer.figmaLayer} » : taille non uniforme sur la matrice ` +
      `(${listValues(layer.sizes, 'aucune')}) ; aucune taille n’est déduite. Liez width et ` +
      'height au même token dans tous les variants où le calque existe.',
  );
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
