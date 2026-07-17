/**
 * Lecture de la structure d'un Component Set : ses axes de variantes, ses
 * variants, et la détection du « wrapper de dimensions » imbriqué.
 *
 * Tout est dynamique : aucun nom d'axe ni de composant n'est codé en dur.
 */
import { normalizePropKey, normalizePropValue } from './parsers';
import { getAllNodes, getBinding } from './nodeBindings';

/** Un variant du set : ses valeurs d'axes normalisées + le node Figma. */
export type VariantEntry = {
  /** Ex. { color: 'primary', variant: 'contained', state: 'default' }. */
  values: Record<string, string>;
  component: ComponentNode;
};

/** La matrice complète des variants d'un Component Set. */
export type VariantMatrix = {
  /** Les axes de variantes, dans l'ordre de déclaration Figma. */
  axes: string[];
  variants: VariantEntry[];
};

/** Le wrapper de dimensions trouvé dans un variant : l'instance + son set maître. */
export type WrapperReference = {
  instance: InstanceNode;
  componentSet: ComponentSetNode | null;
};

/**
 * Décode le nom d'un variant Figma (« Color=Primary, State=Hover ») en
 * paires clé/valeur normalisées.
 */
function parseVariantName(name: string): Record<string, string> {
  const variants: Record<string, string> = {};
  for (const entry of name.split(',')) {
    const separator = entry.indexOf('=');
    if (separator === -1) continue;
    const key = normalizePropKey(entry.slice(0, separator));
    variants[key] = normalizePropValue(entry.slice(separator + 1));
  }
  return variants;
}

/**
 * Valeurs d'axes d'un variant. On lit d'abord le nom (toujours présent),
 * puis `variantProperties` (plus fiable) écrase en cas de différence.
 */
export function getVariantValues(component: ComponentNode): Record<string, string> {
  const source = component.variantProperties ?? {};
  const variants = parseVariantName(component.name);

  for (const [propertyName, value] of Object.entries(source)) {
    const key = normalizePropKey(propertyName);
    variants[key] = normalizePropValue(value);
  }

  return variants;
}

/** Les axes VARIANT du set (clés normalisées), dans l'ordre de déclaration. */
export function getVariantAxes(componentSet: ComponentSetNode): string[] {
  return Object.entries(componentSet.componentPropertyDefinitions)
    .filter(([, definition]) => definition.type === 'VARIANT')
    .map(([name]) => normalizePropKey(name));
}

/**
 * Construit la matrice complète : chaque variant du set avec ses valeurs
 * d'axes. Aucune hypothèse sur les noms d'axes — un Button a Color/Variant/
 * State, un autre composant aura les siens.
 */
export function groupComponentsByVariant(componentSet: ComponentSetNode): {
  matrix: VariantMatrix;
  warnings: string[];
} {
  const warnings: string[] = [];
  const components = componentSet.children.filter(
    (node): node is ComponentNode => node.type === 'COMPONENT',
  );

  let axes = getVariantAxes(componentSet);
  const variants: VariantEntry[] = components.map((component) => ({
    values: getVariantValues(component),
    component,
  }));

  // Cas limite : si le set n'expose pas ses axes, on les découvre sur les
  // variants eux-mêmes pour ne jamais perdre d'information.
  if (axes.length === 0 && variants.length > 0) {
    const discovered = new Set<string>();
    for (const entry of variants) {
      for (const key of Object.keys(entry.values)) discovered.add(key);
    }
    axes = Array.from(discovered);
  }

  if (components.length === 0) {
    warnings.push('Aucun variant trouvé sur le Component Set sélectionné.');
  }

  return { matrix: { axes, variants }, warnings };
}

/** Propriétés Figma dont la liaison à une variable signale un porteur de dimensions. */
const LAYOUT_BINDING_FIELDS = [
  'itemSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'cornerRadius',
];

/** Compte les liaisons de dimensions dans tout le sous-arbre d'une instance. */
function countLayoutBindings(root: InstanceNode): number {
  let count = 0;
  for (const node of getAllNodes(root)) {
    for (const field of LAYOUT_BINDING_FIELDS) {
      if (getBinding(node, field)) count += 1;
    }
  }
  return count;
}

/**
 * `componentProperties` peut lever une exception sur une instance orpheline ;
 * un node cassé ne doit pas faire échouer tout l'export.
 */
function hasComponentProperties(instance: InstanceNode): boolean {
  try {
    return Object.keys(instance.componentProperties).length > 0;
  } catch {
    return false;
  }
}

/**
 * Note une instance candidate au rôle de wrapper de dimensions.
 * Le critère principal est le NOMBRE de tokens de layout qu'elle porte
 * (c'est ce qui définit un wrapper), le nom n'est qu'un léger bonus.
 * Score nul si elle ne porte aucune dimension liée.
 */
async function scoreWrapper(instance: InstanceNode): Promise<{
  score: number;
  componentSet: ComponentSetNode | null;
}> {
  const mainComponent = await instance.getMainComponentAsync().catch(() => null);
  const parent = mainComponent?.parent;
  const componentSet = parent?.type === 'COMPONENT_SET' ? parent : null;
  const searchableName = `${instance.name} ${mainComponent?.name ?? ''} ${componentSet?.name ?? ''}`.toLowerCase();

  const layoutBindings = countLayoutBindings(instance);
  let score = layoutBindings * 10;
  if (searchableName.includes('wrapper')) score += 5;
  if (componentSet && hasComponentProperties(instance)) score += 3;

  return { score: layoutBindings > 0 ? score : 0, componentSet };
}

/**
 * Cherche le wrapper de dimensions imbriqué dans un variant. Optionnel :
 * un composant « plat » (sans instance de layout imbriquée) renvoie null
 * et ses dimensions seront lues directement sur lui.
 */
export async function findWrapperReference(root: ComponentNode): Promise<WrapperReference | null> {
  const instances = root
    .findAll((node) => node.type === 'INSTANCE')
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');
  const scored = await Promise.all(
    instances.map(async (instance) => ({ instance, ...(await scoreWrapper(instance)) })),
  );
  const candidates = scored.filter((candidate) => candidate.score > 0);
  candidates.sort((left, right) => right.score - left.score);

  const best = candidates[0];
  return best ? { instance: best.instance, componentSet: best.componentSet } : null;
}
