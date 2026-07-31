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
      ? `Icône « ${layer.figmaLayer} » : le calque n’est pas placé directement dans le cadre ` +
        `d’auto-layout qui porte l’espacement et les marges. Le contrat ne peut pas dire où ` +
        `l’afficher. Déplacez-le dans ce cadre.`
      : `Icône « ${layer.figmaLayer} » : le calque n’occupe pas la même place selon les ` +
        `variantes (${listValues(layer.slots, 'aucune')}). Le contrat ne peut pas dire où ` +
        `l’afficher. Placez-le au même rang dans toutes les variantes.`,
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
    `Icône « ${layer.figmaLayer} » : sa taille change selon les variantes ` +
      `(${listValues(layer.sizes, 'aucune')}). Aucune taille n’est exportée. Reliez largeur ` +
      `et hauteur à la même variable dans toutes les variantes où le calque existe.`,
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
      warnings.push(`Règle @icons « ${rule.iconName} » : aucun calque de ce nom dans le composant. Vérifiez l’orthographe dans le calque « icon » de la règle.`);
      continue;
    }
    if (layer.maximumOccurrences > 1) {
      warnings.push(
        `Règle @icons « ${rule.iconName} » : jusqu’à ${layer.maximumOccurrences} calques ` +
          `portent ce nom dans une même variante. La règle est ignorée. Donnez-leur des ` +
          `noms distincts.`,
      );
      continue;
    }
    if (icons[key]) {
      warnings.push(`Règle @icons « ${rule.iconName} » : une autre règle vise déjà un calque au nom équivalent (majuscules et tirets ignorés). Celle-ci est ignorée.`);
      continue;
    }

    const visibilityProp = layer.visibilityProps.length === 1
      ? layer.visibilityProps[0] ?? undefined
      : undefined;
    if (layer.visibilityProps.length > 1) {
      warnings.push(
        `Icône « ${rule.iconName} » : sa visibilité dépend d’une propriété différente selon ` +
          `les variantes. Le contrat n’en publie aucune. Utilisez la même propriété partout.`,
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
        `Icône « ${rule.iconName} » déclarée modifiable : aucune propriété booléenne n’est ` +
          `reliée à sa visibilité, le développeur ne pourra donc pas la remplacer. Reliez ` +
          `« Visible » à une propriété booléenne du composant.`,
      );
      continue;
    }
    if (props[visibilityProp]?.type !== 'boolean') {
      warnings.push(
        `Icône « ${rule.iconName} » déclarée modifiable : « ${visibilityProp} » n'est pas une ` +
          `propriété booléenne du composant. Le développeur ne pourra pas la remplacer.`,
      );
      continue;
    }

    const runtimeProp = `${visibilityProp}Name`;
    if (runtimeProp in props) {
      warnings.push(
        `Icône « ${rule.iconName} » déclarée modifiable : le composant expose déjà une ` +
          `propriété « ${runtimeProp} ». Aucune n'est remplacée ; renommez l'une des deux.`,
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
