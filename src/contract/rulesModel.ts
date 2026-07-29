/**
 * Modèle pur des règles d'usage d'un contrat de composant.
 *
 * Il transforme les entrées déjà lues dans Figma en intention, documentation
 * de props et politiques d'icônes, sans dépendre de l'API Figma.
 */
import { normalizePropKey, normalizePropValue } from './parsers';
import type { IconPolicy, Intent } from './types';

/** Tags reconnus une fois normalisés sans `@`. */
export type RuleTag = 'usage' | 'prop' | 'do' | 'dont' | 'pairs' | 'icons';

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
  const propDescriptions: Record<string, Record<string, string>> = {};
  const iconRules: IconRule[] = [];

  for (const entry of entries) {
    const content = entry.content.trim();
    if (!content && entry.tag !== 'icons') {
      warnings.push(`Règle @${entry.tag} sans texte (calque « content » vide).`);
      continue;
    }

    if (entry.tag === 'usage') {
      if (usage === null) usage = content;
      else warnings.push('Plusieurs @usage : seul le premier est retenu.');
    } else if (entry.tag === 'do') {
      doItems.push(content);
    } else if (entry.tag === 'dont') {
      dontItems.push(content);
    } else if (entry.tag === 'pairs') {
      for (const pair of content.split(',').map((item) => item.trim()).filter(Boolean)) {
        if (!pairs.includes(pair)) pairs.push(pair);
      }
    } else if (entry.tag === 'icons') {
      const iconName = entry.iconName?.trim() ?? '';
      if (!iconName) {
        warnings.push('Règle @icons : le calque « icon » doit contenir un nom d’icône.');
      } else if (!entry.iconPolicy) {
        warnings.push(
          `Règle @icons « ${iconName} » : rendez visible exactement un calque « modifiable » ou « strict ».`,
        );
      } else if (iconRules.some((rule) => (
        normalizePropKey(rule.iconName) === normalizePropKey(iconName)
      ))) {
        warnings.push(`Règle @icons « ${iconName} » dupliquée : seule la première est retenue.`);
      } else {
        iconRules.push({ iconName, policy: entry.iconPolicy });
      }
    } else {
      const key = (entry.prop ?? '').trim();
      const separator = key.indexOf('.');
      if (separator <= 0 || separator === key.length - 1) {
        warnings.push(`Règle @prop mal formée (« ${key || '∅'} ») : attendu « prop.valeur ».`);
        continue;
      }
      const propName = normalizePropKey(key.slice(0, separator));
      const value = normalizePropValue(key.slice(separator + 1));
      if (!propDescriptions[propName]) propDescriptions[propName] = {};
      // Deux règles décrivant la même valeur se contredisent : c'est au
      // designer de trancher, pas à l'export d'arbitrer en silence.
      if (propDescriptions[propName][value] !== undefined) {
        warnings.push(`Règle @prop « ${propName}.${value} » dupliquée : seule la première est retenue.`);
        continue;
      }
      propDescriptions[propName][value] = content;
    }
  }

  const hasIntent = usage !== null || doItems.length > 0 || dontItems.length > 0 || pairs.length > 0;
  const intent: Intent | null = hasIntent
    ? { usage, do: doItems, dont: dontItems, pairs }
    : null;
  return { intent, propDescriptions, iconRules, warnings };
}

/** Indique si au moins une intention, documentation ou règle d'icône existe. */
export function hasUsableRules(result: RulesResult): boolean {
  return result.intent !== null
    || Object.keys(result.propDescriptions).length > 0
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
