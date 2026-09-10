/**
 * Modèle pur des règles d'usage d'un contrat de composant.
 *
 * Il transforme les entrées déjà lues dans Figma en intention, documentation
 * de props et politiques d'icônes, sans dépendre de l'API Figma.
 */
import { pousserSansNode } from './localisation';
import { normalizePropKey, normalizePropValue } from './parsers';
import type { IconPolicy, Intent } from '@ucm-kit/core/format';

/** Tags reconnus une fois normalisés sans `@`. */
export type RuleTag =
  | 'usage'
  | 'prop'
  | 'boolean'
  | 'do'
  | 'dont'
  | 'pairs'
  | 'icons'
  | 'default';

/** Reconnaît un tag porté par une valeur de variante Figma. */
export function ruleTagFromValue(value: string): RuleTag | null {
  const match = /^@?(usage|prop|boolean|do|dont|pairs|icons|default)$/i.exec(value);
  return match ? match[1].toLowerCase() as RuleTag : null;
}

/**
 * Reconnaît un tag écrit sur un calque, où le « @ » est obligatoire.
 *
 * L'écart avec `ruleTagFromValue` n'est pas une tolérance de moins pour la
 * forme : une règle range sa cible dans un calque nommé `prop`, qui serait lu
 * comme le tag `@prop` si le « @ » était facultatif. Avec lui, les deux calques
 * d'une même règle se distinguent sans qu'aucun nom de frame ne les sépare.
 */
export function ruleTagFromLayerName(name: string): RuleTag | null {
  const match = /^@(usage|prop|boolean|do|dont|pairs|icons|default)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() as RuleTag : null;
}

/** Entrée brute extraite d'une instance de règle Figma. */
export type RuleEntry = {
  tag: RuleTag;
  content: string;
  prop?: string;
  iconName?: string;
  iconPolicy?: IconPolicy;
};

/** Règle d'icône normalisée, reliée par son nom Figma exact. */
export type IconRule = { iconName: string; policy: IconPolicy };

/** Résultat exploitable de la lecture de toutes les règles. */
export type RulesResult = {
  intent: Intent | null;
  propDescriptions: Record<string, Record<string, string>>;
  booleanDescriptions: Record<string, string>;
  /**
   * La valeur par défaut de chaque axe, déclarée par une règle `@default`.
   * Un axe absent d'ici n'a aucun défaut : la position d'un variant dans un
   * component set est un choix de mise en page, jamais une décision.
   */
  enumDefaults: Record<string, string>;
  iconRules: IconRule[];
  warnings: string[];
};

/** Assemble les entrées brutes en intention et documentation normalisées. */
export function buildRules(entries: RuleEntry[]): RulesResult {
  const warnings: string[] = [];
  let usage: string | null = null;
  const doItems: string[] = [];
  const dontItems: string[] = [];
  const pairs: string[] = [];
  // Les noms de props et les valeurs viennent du texte libre que le designer
  // écrit dans le layer « prop » : le seul canal réellement ouvert de tout
  // l'export. Une `Map` n'a aucune clé héritée : avec un objet littéral, une
  // règle « constructor.foo » lisait `Object`, le trouvait déjà rempli, puis
  // écrivait sa description sur la fonction `Object` globale du runtime.
  const propDescriptions = new Map<string, Map<string, string>>();
  const booleanDescriptions = new Map<string, string>();
  const enumDefaults = new Map<string, string>();
  const iconRules: IconRule[] = [];

  for (const entry of entries) {
    const content = entry.content.trim();
    // `@icons` porte sa cible ailleurs, `@default` n'a rien à décrire : sa
    // cible est son contenu utile, et exiger un texte le rendrait bavard.
    if (!content && entry.tag !== 'icons' && entry.tag !== 'default') {
      pousserSansNode(warnings, `Règle @${entry.tag}`, {
        manque: 'le layer « content » est vide.',
        impact: 'La règle n’est pas exportée.',
        action: 'Écrivez-y le texte de la règle, puis réexportez.',
      });
      continue;
    }

    if (entry.tag === 'usage') {
      if (usage === null) usage = content;
      else {
        pousserSansNode(warnings, 'Plusieurs règles @usage', {
          manque: 'le composant en déclare plus d’une.',
          impact: 'Seule la première est exportée.',
          action: 'Ne gardez qu’un seul @usage, puis réexportez.',
        });
      }
    } else if (entry.tag === 'do') {
      doItems.push(content);
    } else if (entry.tag === 'dont') {
      dontItems.push(content);
    } else if (entry.tag === 'pairs') {
      for (const pair of content.split(',').map((item) => item.trim()).filter(Boolean)) {
        if (!pairs.includes(pair)) pairs.push(pair);
      }
    } else if (entry.tag === 'boolean') {
      const propName = normalizePropKey(entry.prop?.trim() ?? '');
      if (!propName) {
        pousserSansNode(warnings, 'Règle @boolean', {
          manque: 'le layer « prop » est vide.',
          impact: 'La règle n’est pas exportée.',
          action: 'Écrivez-y le nom de la boolean property du composant, par exemple '
            + '« icon-left », puis réexportez.',
        });
      } else if (booleanDescriptions.has(propName)) {
        pousserSansNode(warnings, `Règle @boolean « ${propName} »`, {
          manque: 'elle apparaît deux fois.',
          impact: 'Seule la première est exportée.',
          action: 'Supprimez la seconde, puis réexportez.',
        });
      } else {
        booleanDescriptions.set(propName, content);
      }
    } else if (entry.tag === 'default') {
      const cible = (entry.prop ?? '').trim();
      const separator = cible.indexOf('.');
      if (separator <= 0 || separator === cible.length - 1) {
        pousserSansNode(warnings, 'Règle @default', {
          manque: `elle vise « ${cible || 'rien'} », alors qu’il faut `
            + `« propriété.valeur », par exemple « color.secondary ».`,
          impact: 'Aucune valeur par défaut n’entre dans le contrat pour cette propriété.',
          action: 'Corrigez cette règle, puis réexportez.',
        });
        continue;
      }
      const propName = normalizePropKey(cible.slice(0, separator));
      const value = normalizePropValue(cible.slice(separator + 1));
      // Deux défauts pour une même propriété se contredisent. Choisir en
      // silence rendrait au contrat un défaut que personne n'a décidé, ce
      // qui est exactement le défaut que cette règle existe pour fermer.
      if (enumDefaults.has(propName)) {
        pousserSansNode(warnings, `Règle @default « ${propName} »`, {
          manque: 'elle apparaît deux fois.',
          impact: 'Seule la première est exportée.',
          action: 'Supprimez la seconde, puis réexportez.',
        });
        continue;
      }
      enumDefaults.set(propName, value);
    } else if (entry.tag === 'icons') {
      const iconName = entry.iconName?.trim() ?? '';
      if (!iconName) {
        pousserSansNode(warnings, 'Règle @icons', {
          manque: 'le layer « icon » est vide.',
          impact: 'La règle n’est pas exportée, et l’icône ne sera pas décrite.',
          action: 'Écrivez-y le nom exact du layer d’icône, tel qu’il apparaît dans le '
            + 'composant, puis réexportez.',
        });
      } else if (!entry.iconPolicy) {
        pousserSansNode(warnings, `Règle @icons « ${iconName} »`, {
          manque: 'aucune politique n’est choisie.',
          impact: 'La règle n’est pas exportée, et l’icône ne sera pas décrite.',
          action: 'Rendez visible exactement un des deux layers « modifiable » ou « strict », '
            + 'puis réexportez.',
        });
      } else if (iconRules.some((rule) => (
        normalizePropKey(rule.iconName) === normalizePropKey(iconName)
      ))) {
        pousserSansNode(warnings, `Règle @icons « ${iconName} »`, {
          manque: 'elle apparaît deux fois.',
          impact: 'Seule la première est exportée.',
          action: 'Supprimez la seconde, puis réexportez.',
        });
      } else {
        iconRules.push({ iconName, policy: entry.iconPolicy });
      }
    } else {
      const key = (entry.prop ?? '').trim();
      const separator = key.indexOf('.');
      if (separator <= 0 || separator === key.length - 1) {
        pousserSansNode(warnings, 'Règle @prop', {
          manque: `le layer « prop » contient « ${key || 'rien'} », alors qu’il faut `
            + `« property.valeur », par exemple « variant.contained ».`,
          impact: 'La règle n’est pas exportée.',
          action: 'Corrigez ce layer, puis réexportez.',
        });
        continue;
      }
      const propName = normalizePropKey(key.slice(0, separator));
      const value = normalizePropValue(key.slice(separator + 1));
      let valueDescriptions = propDescriptions.get(propName);
      if (!valueDescriptions) {
        valueDescriptions = new Map<string, string>();
        propDescriptions.set(propName, valueDescriptions);
      }
      // Deux règles décrivant la même valeur se contredisent : c'est au
      // designer de trancher, pas à l'export d'arbitrer en silence.
      if (valueDescriptions.has(value)) {
        pousserSansNode(warnings, `Règle @prop « ${propName}.${value} »`, {
          manque: 'elle apparaît deux fois.',
          impact: 'Seule la première est exportée.',
          action: 'Supprimez la seconde, puis réexportez.',
        });
        continue;
      }
      valueDescriptions.set(value, content);
    }
  }

  const hasIntent = usage !== null || doItems.length > 0 || dontItems.length > 0 || pairs.length > 0;
  const intent: Intent | null = hasIntent
    ? {
      ...(usage !== null ? { usage } : {}),
      do: doItems,
      dont: dontItems,
      pairs,
    }
    : null;
  return {
    intent,
    propDescriptions: Object.fromEntries(
      Array.from(propDescriptions, ([propName, valueDescriptions]) =>
        [propName, Object.fromEntries(valueDescriptions)] as const),
    ),
    booleanDescriptions: Object.fromEntries(booleanDescriptions),
    enumDefaults: Object.fromEntries(enumDefaults),
    iconRules,
    warnings,
  };
}

/** Indique si au moins une intention, documentation ou règle d'icône existe. */
export function hasUsableRules(result: RulesResult): boolean {
  return result.intent !== null
    || Object.keys(result.propDescriptions).length > 0
    || Object.keys(result.booleanDescriptions).length > 0
    || Object.keys(result.enumDefaults).length > 0
    || result.iconRules.length > 0;
}

/** Exige la visibilité exclusive de `modifiable` ou `strict`. */
export function iconPolicyFromVisibility(
  modifiable: boolean | null,
  strict: boolean | null,
): IconPolicy | undefined {
  return modifiable === true && strict === false
    ? 'modifiable'
    : strict === true && modifiable === false
      ? 'strict'
      : undefined;
}
