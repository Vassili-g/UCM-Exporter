/** Situe les component properties sur les calques qu'elles contrôlent. */
import type { VariantMatrix } from './componentTree';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import type { ExtractedPropertyBinding } from './types';

function pathFrom(node: SceneNode, root: ComponentNode): string[] {
  const path: string[] = [];
  let current: BaseNode | null | undefined = node;
  while (current && current !== root) {
    if ('name' in current) path.unshift(current.name);
    current = current.parent;
  }
  return path;
}

/**
 * Lit les trois cibles natives exposées par Figma. Aucun rapprochement par nom
 * de layer : la référence technique (`…#id`) est reliée à la prop publique par
 * le modèle construit depuis `componentPropertyDefinitions`.
 */
export function extractPropertyBindings(
  matrix: VariantMatrix,
  publicKeyByFigmaName: ReadonlyMap<string, string>,
  warnings: string[],
  composed: ComposedInstances = new Map(),
): ExtractedPropertyBinding[] {
  const bindings: ExtractedPropertyBinding[] = [];
  const unresolved = new Set<string>();

  for (const entry of matrix.variants) {
    // `getAllNodes` inclut déjà la racine. La préfixer publierait deux fois une
    // component property portée directement par le variant.
    const nodes = getAllNodes(entry.component, [], composed);
    for (const node of nodes) {
      const references = node.componentPropertyReferences;
      if (!references) continue;
      for (const target of ['visible', 'characters', 'mainComponent'] as const) {
        const figmaPropName = references[target];
        if (!figmaPropName) continue;
        const prop = publicKeyByFigmaName.get(figmaPropName);
        if (!prop) {
          const marker = `${figmaPropName}\u0000${target}`;
          if (!unresolved.has(marker)) {
            unresolved.add(marker);
            warnings.push(
              `Component property « ${figmaPropName.replace(/#.*$/, '')} » : le layer `
                + `« ${node.name} » la référence sur « ${target} », mais aucune prop publique `
                + `ne peut la porter. Cette liaison n'est pas publiée dans le contrat. `
                + `Renommez les propriétés en collision, puis réexportez.`,
            );
          }
          continue;
        }
        bindings.push({
          prop,
          figmaPropName,
          target,
          nodeId: node.id,
          variantNodeId: entry.component.id,
          figmaPath: pathFrom(node, entry.component),
        });
      }
    }
  }
  return bindings;
}
