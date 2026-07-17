/**
 * Lecture des règles d'usage d'un composant depuis la section « <Nom>-Rules ».
 *
 * Chaque composant décrit ses règles dans un conteneur Figma (frame, section ou
 * groupe) nommé `${nomDuSet}-Rules` (ex. « Button-Rules »), posé à côté du
 * composant — le type exact du conteneur importe peu, seul son nom compte. On y
 * range des instances d'un composant de configuration (`ComponentConfiguration`)
 * dont la VARIANTE porte le tag (`@usage`, `@prop`, `@do`, `@dont`, `@pairs`, `@icons`) et
 * dont le calque « content » porte le texte de la règle (plus un calque « prop »
 * pour `@prop`, ex. « variant.contained »).
 *
 * Aucune logique spécifique à un composant : la section, le composant de config
 * et les tags sont des CONVENTIONS uniformes, valables pour n'importe quel
 * composant — comme les tags `@` l'étaient dans la description.
 *
 * Le plugin n'écrit JAMAIS dans Figma : cette section reste la source de vérité,
 * lue telle quelle et reversée dans le contrat.
 */
import { normalizePropKey, normalizePropValue } from './parsers';
import type { IconPolicy, Intent } from './types';

/** Suffixe du conteneur qui porte les règles d'un composant. */
const RULES_SECTION_SUFFIX = '-Rules';
/** Types de conteneur acceptés pour ce bloc (on lit ses enfants, le type importe peu). */
const RULES_CONTAINER_TYPES: readonly string[] = ['SECTION', 'FRAME', 'GROUP'];
/** Nom (compacté) du composant qui matérialise une règle. */
const RULES_COMPONENT_NAME = 'componentconfiguration';
/** Tags de règle reconnus, avec ou sans « @ » devant. */
const TAG_PATTERN = /^@?(usage|prop|do|dont|pairs|icons)$/i;

/** Les tags de règle, une fois normalisés (sans « @ », en minuscules). */
export type RuleTag = 'usage' | 'prop' | 'do' | 'dont' | 'pairs' | 'icons';

/**
 * Une règle brute lue dans la section : son tag, le texte du calque « content »,
 * et — pour `@prop` seulement — le texte du calque « prop » (ex.
 * « variant.contained »).
 */
export type RuleEntry = {
  tag: RuleTag;
  content: string;
  prop?: string;
  /** Nom lu dans le calque `icon` d'une règle `@icons`. */
  iconName?: string;
  /** Politique déduite de la visibilité exclusive de `modifiable` ou `strict`. */
  iconPolicy?: IconPolicy;
};

/** Règle d'icône normalisée, reliée à son calque par son nom Figma exact. */
export type IconRule = {
  iconName: string;
  policy: IconPolicy;
};

/** Ce que produit la lecture des règles : intention + doc par valeur + avertissements. */
export type RulesResult = {
  /** Intention d'usage (usage/do/dont/pairs), ou null si aucune règle exploitable. */
  intent: Intent | null;
  /** Doc par valeur d'enum : `{ variant: { contained: "…" } }`. */
  propDescriptions: Record<string, Record<string, string>>;
  iconRules: IconRule[];
  warnings: string[];
};

/**
 * Assemble des règles brutes en intention + documentation par valeur.
 * Fonction PURE (aucun accès Figma) : c'est elle qui porte la logique, donc
 * c'est elle qu'on teste. `extractRules` ne fait que la nourrir.
 */
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
    // Une règle `@icons` n'utilise pas le calque `content` : ses données sont
    // portées par les calques `icon`, `modifiable` et `strict`.
    if (!content && entry.tag !== 'icons') {
      warnings.push(`Règle @${entry.tag} sans texte (calque « content » vide).`);
      continue;
    }

    if (entry.tag === 'usage') {
      // Un seul `@usage` fait foi : le premier rencontré.
      if (usage === null) usage = content;
      else warnings.push('Plusieurs @usage : seul le premier est retenu.');
    } else if (entry.tag === 'do') {
      doItems.push(content);
    } else if (entry.tag === 'dont') {
      dontItems.push(content);
    } else if (entry.tag === 'pairs') {
      // Les compagnons peuvent être listés en une ligne séparée par des virgules.
      for (const pair of content.split(',').map((item) => item.trim()).filter(Boolean)) {
        if (!pairs.includes(pair)) pairs.push(pair);
      }
    } else if (entry.tag === 'icons') {
      const iconName = entry.iconName?.trim() ?? '';
      const policy = entry.iconPolicy;
      if (!iconName) {
        warnings.push('Règle @icons : le calque « icon » doit contenir un nom d’icône.');
        continue;
      }
      if (!policy) {
        warnings.push(
          `Règle @icons « ${iconName} » : rendez visible exactement un calque « modifiable » ou « strict ».`,
        );
        continue;
      }
      const normalizedName = normalizePropKey(iconName);
      if (iconRules.some((rule) => normalizePropKey(rule.iconName) === normalizedName)) {
        warnings.push(`Règle @icons « ${iconName} » dupliquée : seule la première est retenue.`);
        continue;
      }
      iconRules.push({ iconName, policy });
    } else {
      // entry.tag === 'prop' : on attend « prop.valeur » dans le calque « prop ».
      const key = (entry.prop ?? '').trim();
      const separator = key.indexOf('.');
      if (separator <= 0 || separator === key.length - 1) {
        warnings.push(`Règle @prop mal formée (« ${key || '∅'} ») : attendu « prop.valeur ».`);
        continue;
      }
      const propName = normalizePropKey(key.slice(0, separator));
      const value = normalizePropValue(key.slice(separator + 1));
      if (!propDescriptions[propName]) propDescriptions[propName] = {};
      propDescriptions[propName][value] = content;
    }
  }

  const hasIntent =
    usage !== null || doItems.length > 0 || dontItems.length > 0 || pairs.length > 0;
  const intent: Intent | null = hasIntent
    ? { usage, do: doItems, dont: dontItems, pairs }
    : null;

  return { intent, propDescriptions, iconRules, warnings };
}

/**
 * Vrai s'il existe au moins une règle exploitable : une intention
 * (`@usage`/`@do`/`@dont`/`@pairs`) OU au moins une doc par valeur (`@prop`)
 * OU une politique d'icône (`@icons`).
 * Sert de garde à l'export (règles obligatoires) et au retour en direct sur
 * sélection.
 */
export function hasUsableRules(result: RulesResult): boolean {
  return (
    result.intent !== null ||
    Object.keys(result.propDescriptions).length > 0 ||
    result.iconRules.length > 0
  );
}

/** Compacte un nom (sans espaces, en minuscules) pour comparer un nom de composant. */
function compactName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

/** Texte du premier calque TEXTE d'un nom donné dans une instance (vide si absent). */
function textOfLayer(instance: InstanceNode, layerName: string): string {
  const target = layerName.trim().toLowerCase();
  const node = instance.findOne(
    (child) => child.type === 'TEXT' && child.name.trim().toLowerCase() === target,
  ) as TextNode | null;
  return node ? node.characters : '';
}

/**
 * Lit la visibilité d'un calque de règle. `null` signifie que le calque est
 * absent : on le distingue d'un calque présent mais masqué pour diagnostiquer
 * correctement une configuration Figma incomplète.
 */
function visibilityOfLayer(instance: InstanceNode, layerName: string): boolean | null {
  const target = layerName.trim().toLowerCase();
  const node = instance.findOne((child) => child.name.trim().toLowerCase() === target) as
    | (SceneNode & { visible?: boolean })
    | null;
  return node ? node.visible !== false : null;
}

/**
 * Déduit la politique à partir de la visibilité exclusive des deux options.
 * Les cas ambigus renvoient `undefined` pour que l'export avertisse sans
 * décider à la place du designer.
 */
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

/** Construit l'entrée `@icons` à partir de ses trois calques dédiés. */
function iconRuleEntry(instance: InstanceNode): RuleEntry {
  const modifiable = visibilityOfLayer(instance, 'modifiable');
  const strict = visibilityOfLayer(instance, 'strict');

  return {
    tag: 'icons',
    content: '',
    iconName: textOfLayer(instance, 'icon'),
    iconPolicy: iconPolicyFromVisibility(modifiable, strict),
  };
}

/**
 * Vrai si une instance est bien un `ComponentConfiguration` : on remonte à son
 * composant maître, puis à son component set (les variantes portent les tags).
 */
async function isRuleInstance(instance: InstanceNode): Promise<boolean> {
  const main = await instance.getMainComponentAsync().catch(() => null);
  const owner = main?.parent?.type === 'COMPONENT_SET' ? main.parent.name : main?.name ?? '';
  return compactName(owner) === RULES_COMPONENT_NAME;
}

/**
 * Point d'entrée : lit la section « <Nom>-Rules » du composant sélectionné et en
 * tire l'intention + la doc par valeur. `sectionFound` distingue « pas de section »
 * (composant sans règles) de « section présente mais vide », pour un warning précis.
 */
export async function extractRules(
  componentSet: ComponentSetNode,
): Promise<RulesResult & { sectionFound: boolean }> {
  const sectionName = `${componentSet.name}${RULES_SECTION_SUFFIX}`;
  const container = figma.currentPage.findOne(
    (node) => node.name === sectionName && RULES_CONTAINER_TYPES.includes(node.type),
  ) as (SceneNode & ChildrenMixin) | null;

  if (!container) {
    return {
      intent: null,
      propDescriptions: {},
      iconRules: [],
      warnings: [`Aucun conteneur « ${sectionName} » : composant sans règles définies.`],
      sectionFound: false,
    };
  }

  const instances = container
    .findAll((node) => node.type === 'INSTANCE')
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');

  const entries: RuleEntry[] = [];
  const warnings: string[] = [];

  for (const instance of instances) {
    if (!(await isRuleInstance(instance))) continue;

    // Le tag est la VALEUR de la variante (peu importe le nom de l'axe).
    const rawTag = Object.values(instance.variantProperties ?? {}).find((value) =>
      TAG_PATTERN.test(value),
    );
    if (!rawTag) {
      warnings.push('Instance de règle sans variante @usage/@prop/@do/@dont/@pairs/@icons (ignorée).');
      continue;
    }

    const tag = rawTag.replace('@', '').toLowerCase() as RuleTag;
    entries.push(
      tag === 'icons'
        ? iconRuleEntry(instance)
        : {
            tag,
            content: textOfLayer(instance, 'content'),
            prop: tag === 'prop' ? textOfLayer(instance, 'prop') : undefined,
          },
    );
  }

  if (entries.length === 0) {
    warnings.push(`Conteneur « ${sectionName} » vide : aucune règle ComponentConfiguration lisible.`);
  }

  const built = buildRules(entries);
  return {
    intent: built.intent,
    propDescriptions: built.propDescriptions,
    iconRules: built.iconRules,
    warnings: [...warnings, ...built.warnings],
    sectionFound: true,
  };
}
