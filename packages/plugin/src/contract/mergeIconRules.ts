/**
 * Fusion des règles `@icons` dans l'API publique d'un contrat de composant.
 * La liaison repose uniquement sur les noms Figma exacts et les bindings de
 * visibilité, sans heuristique de position propre à un composant.
 */
import { definePropOn, normalizePropKey, propByName } from './parsers';
import type { IconLayerSummary } from './extractIconLayers';
import type { IconRule } from './rulesModel';
import type { ContractProp, IconDefinition, IconProp } from '@ucm-kit/core/format';

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
      ? `Icône « ${layer.figmaLayer} » : le layer n’est pas placé directement dans l’auto ` +
        `layout frame qui porte le gap et le padding. Le contrat ne peut pas dire où ` +
        `l’afficher. Déplacez-le dans ce frame.`
      : `Icône « ${layer.figmaLayer} » : le layer n’occupe pas la même place selon les ` +
        `variants (${listValues(layer.slots, 'aucune')}). Le contrat ne peut pas dire où ` +
        `l’afficher. Placez-le au même rang dans tous les variants.`,
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
    `Icône « ${layer.figmaLayer} » : sa taille change selon les variants ` +
      `(${listValues(layer.sizes, 'aucune')}). Aucune taille n’est exportée. Reliez width et ` +
      `height à la même variable dans tous les variants où le layer existe.`,
  );
  return undefined;
}

/**
 * Ajoute les métadonnées d'icônes et les props runtime des règles modifiables,
 * tout en conservant les booléens Figma comme contrôles de visibilité.
 *
 * Les deux responsabilités restent séparées : le booléen dit SI le calque
 * s'affiche, la prop runtime dit QUELLE icône y rendre. Une icône modifiable
 * sans booléen est donc normale, pas une anomalie à signaler.
 */
export function mergeIconRules(
  props: Record<string, ContractProp>,
  layers: IconLayerSummary[],
  rules: IconRule[],
  warnings: string[],
): Record<string, IconDefinition> {
  // Les clés viennent du nom Figma du calque d'icône. Une `Map` n'a aucune clé
  // héritée, là où un objet littéral rendrait `Object` pour une icône nommée
  // « constructor » : la règle serait écartée sous un avertissement de doublon
  // qui désigne une autre règle inexistante.
  const icons = new Map<string, IconDefinition>();

  for (const rule of rules) {
    const key = normalizePropKey(rule.iconName);
    const layer = layers.find((candidate) => candidate.figmaLayer === rule.iconName);
    if (!layer) {
      warnings.push(`Règle @icons « ${rule.iconName} » : aucun layer de ce nom dans le composant. Vérifiez l’orthographe dans le layer « icon » de la règle.`);
      continue;
    }
    if (layer.maximumOccurrences > 1) {
      warnings.push(
        `Règle @icons « ${rule.iconName} » : jusqu’à ${layer.maximumOccurrences} layers ` +
          `portent ce nom dans un même variant. La règle est ignorée. Donnez-leur des ` +
          `noms distincts.`,
      );
      continue;
    }
    if (icons.has(key)) {
      warnings.push(`Règle @icons « ${rule.iconName} » : une autre règle vise déjà un layer au nom équivalent (majuscules et tirets ignorés). Celle-ci est ignorée. Renommez l'un des deux layers ou supprimez la règle en double, puis réexportez.`);
      continue;
    }

    const visibilityProp = layer.visibilityProps.length === 1
      ? layer.visibilityProps[0] ?? undefined
      : undefined;
    if (layer.visibilityProps.length > 1) {
      warnings.push(
        `Icône « ${rule.iconName} » : sa visibilité dépend d’une component property ` +
          `différente selon les variants. Le contrat n’en publie aucune. Utilisez la même ` +
          `partout.`,
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
    icons.set(key, icon);
    if (rule.policy === 'strict') continue;

    const swapProp = layer.swapProps.length === 1
      ? layer.swapProps[0] ?? undefined
      : undefined;
    if (layer.swapProps.length > 1) {
      warnings.push(
        `Icône « ${rule.iconName} » : son remplacement dépend d’une INSTANCE_SWAP différente ` +
          `selon les variants. Le contrat ne publie aucune prop de remplacement pour elle. ` +
          `Utilisez la même component property partout.`,
      );
      continue;
    }
    if (swapProp) {
      const nativeSwap = propByName(props, swapProp);
      if (nativeSwap?.type !== 'instance-swap') {
        warnings.push(
          `Icône « ${rule.iconName} » : le layer référence « ${swapProp} » pour son ` +
            `remplacement, mais cette INSTANCE_SWAP n’existe pas dans les component properties ` +
            `publiées. Corrigez sa liaison dans Figma, puis réexportez.`,
        );
        continue;
      }
      // Figma expose déjà exactement la liberté demandée par `@icons`. Publier
      // une seconde prop synthétique obligerait le consommateur à choisir entre
      // deux sources de vérité pour le même remplacement.
      icon.runtimeProp = swapProp;
      continue;
    }

    if (visibilityProp && propByName(props, visibilityProp)?.type !== 'boolean') {
      warnings.push(
        `Icône « ${rule.iconName} » déclarée modifiable : « ${visibilityProp} » n'est pas ` +
          `une boolean property du composant. Le développeur ne pourra pas la remplacer. ` +
          `Citez une boolean property du composant, puis réexportez.`,
      );
      continue;
    }

    // « Modifiable » dit QUELLE icône rendre, jamais SI on la rend : une icône
    // toujours affichée est remplaçable comme une autre. Le nom de la prop
    // runtime suit donc le booléen de visibilité seulement quand il existe —
    // pour que « iconLeft » et « iconLeftName » se lisent en paire — et vient
    // sinon du calque lui-même.
    const runtimeProp = `${visibilityProp ?? key}Name`;
    if (propByName(props, runtimeProp)) {
      warnings.push(
        `Icône « ${rule.iconName} » déclarée modifiable : le composant expose déjà une ` +
          `component property « ${runtimeProp} ». Aucune n'est remplacée ; renommez l'une ` +
          `des deux.`,
      );
      continue;
    }
    const iconProp: IconProp = {
      type: 'icon',
      policy: 'modifiable',
      ...(visibilityProp ? { visibilityProp } : {}),
    };
    definePropOn(props, runtimeProp, iconProp);
    icon.runtimeProp = runtimeProp;
  }

  return Object.fromEntries(icons);
}
