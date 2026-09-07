/**
 * Fusion des règles `@icons` dans l'API publique d'un contrat de composant.
 * La liaison repose uniquement sur les noms Figma exacts et les bindings de
 * visibilité, sans heuristique de position propre à un composant.
 */
import { pousserSansNode } from './localisation';
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

  pousserSansNode(warnings, `Icône « ${layer.figmaLayer} »`, layer.slots.length === 1
    ? {
      manque: `le layer n’est pas placé directement dans l’auto layout frame qui porte le `
        + `gap et le padding.`,
      impact: `Le contrat ne peut pas dire où l’afficher.`,
      action: `Déplacez-le dans ce frame, puis réexportez.`,
    }
    : {
      manque: `le layer n’occupe pas la même place selon les variants `
        + `(${listValues(layer.slots, 'aucune')}).`,
      impact: `Le contrat ne peut pas dire où l’afficher.`,
      action: `Placez-le au même rang dans tous les variants, puis réexportez.`,
    });
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

  pousserSansNode(warnings, `Icône « ${layer.figmaLayer} »`, {
    manque: `sa taille change selon les variants (${listValues(layer.sizes, 'aucune')}).`,
    impact: `Aucune taille n’est exportée.`,
    action: `Reliez width et height à la même variable dans tous les variants où le layer `
      + `existe.`,
  });
  return undefined;
}

/**
 * Ajoute les métadonnées d'icônes et les props runtime des règles modifiables,
 * tout en conservant les booléens Figma comme contrôles de visibilité.
 *
 * Les deux responsabilités restent séparées : le booléen dit si le calque
 * s'affiche, la prop runtime dit quelle icône y rendre. Une icône modifiable
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
      pousserSansNode(warnings, `Règle @icons « ${rule.iconName} »`, {
        manque: 'aucun layer de ce nom dans le composant.',
        impact: 'La règle est ignorée, et cette icône ne sera pas décrite.',
        action: 'Vérifiez l’orthographe dans le layer « icon » de la règle, puis réexportez.',
      });
      continue;
    }
    if (layer.maximumOccurrences > 1) {
      pousserSansNode(warnings, `Règle @icons « ${rule.iconName} »`, {
        manque: `jusqu’à ${layer.maximumOccurrences} layers portent ce nom dans un même `
          + `variant.`,
        impact: `La règle est ignorée.`,
        action: `Donnez-leur des noms distincts, puis réexportez.`,
      });
      continue;
    }
    if (icons.has(key)) {
      pousserSansNode(warnings, `Règle @icons « ${rule.iconName} »`, {
        manque: `une autre règle vise déjà un layer au nom équivalent (majuscules et tirets `
          + `ignorés).`,
        impact: `Celle-ci est ignorée.`,
        action: `Renommez l'un des deux layers ou supprimez la règle en double, puis `
          + `réexportez.`,
      });
      continue;
    }

    const visibilityProp = layer.visibilityProps.length === 1
      ? layer.visibilityProps[0] ?? undefined
      : undefined;
    if (layer.visibilityProps.length > 1) {
      pousserSansNode(warnings, `Icône « ${rule.iconName} »`, {
        manque: `sa visibilité dépend d’une component property différente selon les variants.`,
        impact: `Le contrat n’en publie aucune.`,
        action: `Utilisez la même partout, puis réexportez.`,
      });
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
      pousserSansNode(warnings, `Icône « ${rule.iconName} »`, {
        manque: `son remplacement dépend d’une INSTANCE_SWAP différente selon les variants.`,
        impact: `Le contrat ne publie aucune prop de remplacement pour elle.`,
        action: `Utilisez la même component property partout, puis réexportez.`,
      });
      continue;
    }
    if (swapProp) {
      const nativeSwap = propByName(props, swapProp);
      if (nativeSwap?.type !== 'instance-swap') {
        pousserSansNode(warnings, `Icône « ${rule.iconName} »`, {
          manque: `le layer référence « ${swapProp} » pour son remplacement, mais cette `
            + `INSTANCE_SWAP n’existe pas dans les component properties publiées.`,
          impact: `Le contrat ne publie aucune prop de remplacement pour elle.`,
          action: `Corrigez sa liaison dans Figma, puis réexportez.`,
        });
        continue;
      }
      // Figma expose déjà exactement la liberté demandée par `@icons`. Publier
      // une seconde prop synthétique obligerait le consommateur à choisir entre
      // deux sources de vérité pour le même remplacement.
      icon.runtimeProp = swapProp;
      continue;
    }

    if (visibilityProp && propByName(props, visibilityProp)?.type !== 'boolean') {
      pousserSansNode(warnings, `Icône « ${rule.iconName} » déclarée modifiable`, {
        manque: `« ${visibilityProp} » n'est pas une boolean property du composant.`,
        impact: `Le développeur ne pourra pas la remplacer.`,
        action: `Citez une boolean property du composant, puis réexportez.`,
      });
      continue;
    }

    // « Modifiable » dit quelle icône rendre, jamais si on la rend : une icône
    // toujours affichée est remplaçable comme une autre. Le nom de la prop
    // runtime suit donc le booléen de visibilité seulement quand il existe
    // (pour que « iconLeft » et « iconLeftName » se lisent en paire) et vient
    // sinon du calque lui-même.
    const runtimeProp = `${visibilityProp ?? key}Name`;
    if (propByName(props, runtimeProp)) {
      pousserSansNode(warnings, `Icône « ${rule.iconName} » déclarée modifiable`, {
        manque: `le composant expose déjà une component property « ${runtimeProp} ».`,
        impact: `Aucune n'est remplacée.`,
        action: `Renommez l'une des deux, puis réexportez.`,
      });
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
