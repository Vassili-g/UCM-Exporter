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
import { buildRules, iconPolicyFromVisibility } from './rulesModel';
import type { RuleEntry, RuleTag, RulesResult } from './rulesModel';
export { buildRules, hasUsableRules, iconPolicyFromVisibility } from './rulesModel';
export type { IconRule, RuleEntry, RuleTag, RulesResult } from './rulesModel';

/** Suffixe du conteneur qui porte les règles d'un composant. */
const RULES_SECTION_SUFFIX = '-Rules';
/** Types de conteneur acceptés pour ce bloc (on lit ses enfants, le type importe peu). */
const RULES_CONTAINER_TYPES: readonly string[] = ['SECTION', 'FRAME', 'GROUP'];
/** Nom (compacté) du composant qui matérialise une règle. */
const RULES_COMPONENT_NAME = 'componentconfiguration';
/** Tags de règle reconnus, avec ou sans « @ » devant. */
const TAG_PATTERN = /^@?(usage|prop|do|dont|pairs|icons)$/i;

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
