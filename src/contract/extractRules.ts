/**
 * Lecture des règles d'usage d'un composant depuis la section « <Nom>-Rules ».
 *
 * Chaque composant décrit ses règles dans un conteneur Figma — frame, section
 * ou groupe — nommé `${nomDuSet}-Rules` (ex. « Button-Rules »), posé sur la
 * même page que le composant. On y
 * range des instances d'un composant de configuration (`ComponentConfiguration`)
 * dont la VARIANTE porte le tag (`@usage`, `@prop`, `@boolean`, `@do`, `@dont`,
 * `@pairs`, `@icons`) et
 * dont le calque « content » porte le texte de la règle (plus un calque « prop »
 * pour `@prop` et `@boolean`, ex. « variant.contained » ou « icon-left »).
 *
 * Aucune logique spécifique à un composant : la section, le composant de config
 * et les tags sont des CONVENTIONS uniformes, valables pour n'importe quel
 * composant — comme les tags `@` l'étaient dans la description.
 *
 * Le plugin n'écrit JAMAIS dans Figma : cette section reste la source de vérité,
 * lue telle quelle et reversée dans le contrat.
 */
import { buildRules, iconPolicyFromVisibility, ruleTagFromValue } from './rulesModel';
import type { RuleEntry, RuleTag, RulesResult } from './rulesModel';
export {
  buildRules,
  hasUsableRules,
  iconPolicyFromVisibility,
  ruleTagFromValue,
} from './rulesModel';
export type { IconRule, RuleEntry, RuleTag, RulesResult } from './rulesModel';

/**
 * Suffixe du conteneur qui porte les règles d'un composant. Exporté parce
 * qu'il ne sert pas qu'à lire les règles : posséder un tel conteneur est ce
 * qui fait d'un composant un composant unifié, donc une dépendance et non un
 * calque à parcourir (cf. `composedComponents.ts`).
 */
export const RULES_SECTION_SUFFIX = '-Rules';
/** Types de conteneur acceptés pour ce bloc (on ne lit que ses enfants). */
export const RULES_CONTAINER_TYPES: readonly string[] = ['SECTION', 'FRAME', 'GROUP'];
/** Nom (compacté) du composant qui matérialise une règle. */
const RULES_COMPONENT_NAME = 'componentconfiguration';
/** Compacte un nom (sans espaces, en minuscules) pour comparer un nom de composant. */
export function compactName(name: string): string {
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
  // On les cherche TOUS : n'en lire qu'un alors que la page en porte plusieurs
  // ferait disparaître des règles sans que rien ne le dise.
  const containers = figma.currentPage.findAll(
    (node) => node.name === sectionName && RULES_CONTAINER_TYPES.includes(node.type),
  ) as (SceneNode & ChildrenMixin)[];

  const container = containers[0];
  if (!container) {
    return {
      intent: null,
      propDescriptions: {},
      booleanDescriptions: {},
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
  if (containers.length > 1) {
    warnings.push(
      `${containers.length} conteneurs « ${sectionName} » sur la page : seul le premier est lu. ` +
        `Fusionnez-les dans Figma pour ne perdre aucune règle.`,
    );
  }

  for (const instance of instances) {
    if (!(await isRuleInstance(instance))) continue;

    // Le tag est la VALEUR de la variante (peu importe le nom de l'axe).
    const tag = Object.values(instance.variantProperties ?? {})
      .map(ruleTagFromValue)
      .find((value): value is RuleTag => value !== null);
    if (!tag) {
      warnings.push(
        'Instance de règle sans variante @usage/@prop/@boolean/@do/@dont/@pairs/@icons (ignorée).',
      );
      continue;
    }

    entries.push(
      tag === 'icons'
        ? iconRuleEntry(instance)
        : {
            tag,
            content: textOfLayer(instance, 'content'),
            prop: tag === 'prop' || tag === 'boolean'
              ? textOfLayer(instance, 'prop')
              : undefined,
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
    booleanDescriptions: built.booleanDescriptions,
    iconRules: built.iconRules,
    warnings: [...warnings, ...built.warnings],
    sectionFound: true,
  };
}
