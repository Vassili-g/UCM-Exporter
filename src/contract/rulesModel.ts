/**
 * Modèle pur des règles d'usage d'un contrat de composant.
 *
 * Il transforme les entrées déjà lues dans Figma en intention, documentation
 * de props et politiques d'icônes, sans dépendre de l'API Figma.
 */
import { normalizePropKey, normalizePropValue } from './parsers';
import type { IconPolicy, Intent } from './types';

/** Tags reconnus une fois normalisés sans `@`. */
export type RuleTag = 'usage' | 'prop' | 'boolean' | 'do' | 'dont' | 'pairs' | 'icons';

/** Reconnaît un tag porté par une valeur de variante Figma. */
export function ruleTagFromValue(value: string): RuleTag | null {
  const match = /^@?(usage|prop|boolean|do|dont|pairs|icons)$/i.exec(value);
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
  // écrit dans le layer « prop » — le seul canal réellement ouvert de tout
  // l'export. Une `Map` n'a aucune clé héritée : avec un objet littéral, une
  // règle « constructor.foo » lisait `Object`, le trouvait déjà rempli, puis
  // écrivait sa description SUR la fonction `Object` globale du runtime.
  const propDescriptions = new Map<string, Map<string, string>>();
  const booleanDescriptions = new Map<string, string>();
  const iconRules: IconRule[] = [];

  for (const entry of entries) {
    const content = entry.content.trim();
    if (!content && entry.tag !== 'icons') {
      warnings.push(`Règle @${entry.tag} : le layer « content » est vide. Écrivez-y le texte de la règle.`);
      continue;
    }

    if (entry.tag === 'usage') {
      if (usage === null) usage = content;
      else warnings.push('Plusieurs règles @usage : seule la première est exportée. Ne gardez qu’un seul @usage.');
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
        warnings.push('Règle @boolean : le layer « prop » est vide. Écrivez-y le nom de la boolean property du composant, par exemple « icon-left ».');
      } else if (booleanDescriptions.has(propName)) {
        warnings.push(`Règle @boolean « ${propName} » : elle apparaît deux fois. Seule la première est exportée ; supprimez la seconde.`);
      } else {
        booleanDescriptions.set(propName, content);
      }
    } else if (entry.tag === 'icons') {
      const iconName = entry.iconName?.trim() ?? '';
      if (!iconName) {
        warnings.push('Règle @icons : le layer « icon » est vide. Écrivez-y le nom exact du layer d’icône, tel qu’il apparaît dans le composant.');
      } else if (!entry.iconPolicy) {
        warnings.push(
          `Règle @icons « ${iconName} » : aucune politique n’est choisie. Rendez visible exactement un des deux layers « modifiable » ou « strict ».`,
        );
      } else if (iconRules.some((rule) => (
        normalizePropKey(rule.iconName) === normalizePropKey(iconName)
      ))) {
        warnings.push(`Règle @icons « ${iconName} » : elle apparaît deux fois. Seule la première est exportée ; supprimez la seconde.`);
      } else {
        iconRules.push({ iconName, policy: entry.iconPolicy });
      }
    } else {
      const key = (entry.prop ?? '').trim();
      const separator = key.indexOf('.');
      if (separator <= 0 || separator === key.length - 1) {
        warnings.push(`Règle @prop : le layer « prop » contient « ${key || 'rien'} », alors qu’il faut « property.valeur », par exemple « variant.contained ».`);
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
        warnings.push(`Règle @prop « ${propName}.${value} » : elle apparaît deux fois. Seule la première est exportée ; supprimez la seconde.`);
        continue;
      }
      valueDescriptions.set(value, content);
    }
  }

  const hasIntent = usage !== null || doItems.length > 0 || dontItems.length > 0 || pairs.length > 0;
  const intent: Intent | null = hasIntent
    ? { usage, do: doItems, dont: dontItems, pairs }
    : null;
  return {
    intent,
    propDescriptions: Object.fromEntries(
      Array.from(propDescriptions, ([propName, valueDescriptions]) =>
        [propName, Object.fromEntries(valueDescriptions)] as const),
    ),
    booleanDescriptions: Object.fromEntries(booleanDescriptions),
    iconRules,
    warnings,
  };
}

/** Indique si au moins une intention, documentation ou règle d'icône existe. */
export function hasUsableRules(result: RulesResult): boolean {
  return result.intent !== null
    || Object.keys(result.propDescriptions).length > 0
    || Object.keys(result.booleanDescriptions).length > 0
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
