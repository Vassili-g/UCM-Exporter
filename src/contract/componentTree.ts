/**
 * Lecture de la structure d'un Component Set : ses axes de variantes, ses
 * variants, et la détection du « wrapper de dimensions » imbriqué.
 *
 * Tout est dynamique : aucun nom d'axe ni de composant n'est codé en dur.
 */
import { normalizePropKey, normalizePropValue } from './parsers';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { BINDING_PATTERNS, hasCompleteBinding } from './nodeBindings';

/** Un variant du set : ses valeurs indexées par clés publiques + le node Figma. */
export type VariantEntry = {
  /** Ex. { color: 'primary', variant: 'contained', state: 'default' }. */
  values: Record<string, string>;
  component: ComponentNode;
};

/** La matrice complète des variants d'un Component Set. */
export type VariantMatrix = {
  /** Les clés publiques des axes, dans l'ordre de déclaration Figma. */
  axes: string[];
  variants: VariantEntry[];
};

/** Diagnostic compact d'un Component Set dont certains mélanges n'existent pas. */
export type MissingVariantSummary = {
  axes: Array<{ name: string; values: string[] }>;
  expected: number;
  found: number;
  missing: number;
  /** Cinq variants réellement présents au plus, écrits comme dans Figma. */
  presentExamples: string[];
  /** Cinq exemples au plus, écrits avec les noms et valeurs visibles dans Figma. */
  examples: string[];
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

/** Remplace les clés Figma par les clés publiques décidées lors de l'extraction des props. */
function remapVariantValues(
  values: Record<string, string>,
  publicKeyByRawKey: ReadonlyMap<string, string>,
): Record<string, string> {
  const remapped: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(values)) {
    remapped[publicKeyByRawKey.get(rawKey) ?? rawKey] = value;
  }
  return remapped;
}

/**
 * Construit la matrice complète : chaque variant du set avec ses valeurs
 * d'axes. La table optionnelle applique les mêmes renommages sémantiques que
 * les props. Aucune hypothèse sur les noms d'axes — un Button a
 * Color/Variant/State, un autre composant aura les siens.
 */
export function groupComponentsByVariant(componentSet: ComponentSetNode): {
  matrix: VariantMatrix;
  warnings: string[];
};
export function groupComponentsByVariant(
  componentSet: ComponentSetNode,
  publicKeyByRawKey: ReadonlyMap<string, string>,
): {
  matrix: VariantMatrix;
  warnings: string[];
};
export function groupComponentsByVariant(
  componentSet: ComponentSetNode,
  publicKeyByRawKey: ReadonlyMap<string, string> = new Map(),
): {
  matrix: VariantMatrix;
  warnings: string[];
} {
  const warnings: string[] = [];
  const components = componentSet.children.filter(
    (node): node is ComponentNode => node.type === 'COMPONENT',
  );

  let axes = getVariantAxes(componentSet).map(
    (rawKey) => publicKeyByRawKey.get(rawKey) ?? rawKey,
  );
  const variants: VariantEntry[] = components.map((component) => ({
    values: remapVariantValues(getVariantValues(component), publicKeyByRawKey),
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

/**
 * Vérifie que les valeurs des axes sont combinables comme des props
 * indépendantes. Le nombre manquant se calcule sans parcourir tout le produit ;
 * la recherche s'arrête dès que cinq exemples ont été trouvés. Le coût reste
 * donc proportionnel au nombre de variants réellement présents.
 */
export function findMissingVariantCombinations(
  componentSet: ComponentSetNode,
  exampleLimit = 5,
): MissingVariantSummary | null {
  const components = componentSet.children.filter(
    (node): node is ComponentNode => node.type === 'COMPONENT',
  );
  const rawVariants = components.map((component) => getVariantValues(component));
  const axes = Object.entries(componentSet.componentPropertyDefinitions)
    .filter(([, definition]) => definition.type === 'VARIANT')
    .map(([figmaName, definition]) => {
      const key = normalizePropKey(figmaName);
      const valuesByKey = new Map<string, string>();
      for (const value of definition.variantOptions ?? []) {
        const normalized = normalizePropValue(value);
        if (!valuesByKey.has(normalized)) valuesByKey.set(normalized, value.trim());
      }
      // Défense pour les vieux documents où `variantOptions` serait absent.
      for (const variant of rawVariants) {
        const normalized = variant[key];
        if (normalized && !valuesByKey.has(normalized)) valuesByKey.set(normalized, normalized);
      }
      return {
        key,
        name: figmaName.replace(/#.*$/, '').trim(),
        valuesByKey,
      };
    });

  if (axes.length < 2 || axes.some((axis) => axis.valuesByKey.size === 0)) return null;

  const signature = (values: readonly string[]) => values.join('\u0000');
  const existing = new Set<string>();
  const presentExamples: string[] = [];
  for (const variant of rawVariants) {
    const values = axes.map((axis) => variant[axis.key]);
    if (values.every((value, index) => axes[index].valuesByKey.has(value))) {
      const key = signature(values);
      if (!existing.has(key) && presentExamples.length < exampleLimit) {
        presentExamples.push(
          axes
            .map((axis, index) => `${axis.name}=${axis.valuesByKey.get(values[index])}`)
            .join(', '),
        );
      }
      existing.add(key);
    }
  }

  const expected = axes.reduce((total, axis) => total * axis.valuesByKey.size, 1);
  const found = existing.size;
  const missing = expected - found;
  if (missing <= 0) return null;

  const examples: string[] = [];
  const current: string[] = [];
  const visit = (axisIndex: number): boolean => {
    if (axisIndex === axes.length) {
      if (!existing.has(signature(current))) {
        examples.push(
          axes
            .map((axis, index) => `${axis.name}=${axis.valuesByKey.get(current[index])}`)
            .join(', '),
        );
      }
      return examples.length >= exampleLimit;
    }
    for (const value of axes[axisIndex].valuesByKey.keys()) {
      current[axisIndex] = value;
      if (visit(axisIndex + 1)) return true;
    }
    return false;
  };
  visit(0);

  return {
    axes: axes.map((axis) => ({ name: axis.name, values: [...axis.valuesByKey.values()] })),
    expected,
    found,
    missing,
    presentExamples,
    examples,
  };
}

/** Dimensions complètes dont la liaison signale un porteur de layout. */
const LAYOUT_BINDING_PATTERNS = [
  BINDING_PATTERNS.gap,
  BINDING_PATTERNS.paddingX,
  BINDING_PATTERNS.paddingY,
  BINDING_PATTERNS.radius,
];

/** Compte les liaisons de dimensions dans tout le sous-arbre rendable d'une instance. */
function countLayoutBindings(
  root: InstanceNode,
  warnings: string[],
  composed: ComposedInstances,
): number {
  let count = 0;
  for (const node of getAllNodes(root, warnings, composed)) {
    for (const alternatives of LAYOUT_BINDING_PATTERNS) {
      if (hasCompleteBinding(node, alternatives)) count += 1;
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
async function scoreWrapper(
  instance: InstanceNode,
  warnings: string[],
  composed: ComposedInstances,
): Promise<{
  score: number;
  componentSet: ComponentSetNode | null;
}> {
  const mainComponent = await instance.getMainComponentAsync().catch(() => null);
  const parent = mainComponent?.parent;
  const componentSet = parent?.type === 'COMPONENT_SET' ? parent : null;
  const searchableName = `${instance.name} ${mainComponent?.name ?? ''} ${componentSet?.name ?? ''}`.toLowerCase();

  const layoutBindings = countLayoutBindings(instance, warnings, composed);
  let score = layoutBindings * 10;
  if (searchableName.includes('wrapper')) score += 5;
  if (componentSet && hasComponentProperties(instance)) score += 3;

  return { score: layoutBindings > 0 ? score : 0, componentSet };
}

/**
 * Cherche le wrapper de dimensions imbriqué dans un variant. Optionnel :
 * un composant « plat » (sans instance de layout imbriquée) renvoie null
 * et ses dimensions seront lues directement sur lui.
 *
 * Un composant unifié imbriqué n'est JAMAIS candidat, quel que soit son score :
 * un wrapper est une coquille de mise en page interne, alors qu'une dépendance
 * est un composant à part entière. Les confondre revient à décrire les
 * dimensions du voisin — et, par ricochet, ses slots et ses props.
 */
export async function findWrapperReference(
  root: ComponentNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): Promise<WrapperReference | null> {
  const instances = getAllNodes(root, warnings, composed)
    .filter((node): node is InstanceNode => node.type === 'INSTANCE' && !composed.has(node.id));
  const scored = await Promise.all(
    instances.map(async (instance) => ({
      instance,
      ...(await scoreWrapper(instance, warnings, composed)),
    })),
  );
  const candidates = scored.filter((candidate) => candidate.score > 0);
  candidates.sort((left, right) => right.score - left.score);

  const best = candidates[0];
  return best ? { instance: best.instance, componentSet: best.componentSet } : null;
}
