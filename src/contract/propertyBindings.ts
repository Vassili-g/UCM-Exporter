/** Situe les component properties sur les calques qu'elles contrôlent. */
import type { VariantMatrix } from './componentTree';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import type { ExtractedPropertyBinding } from './types';

/**
 * Valeur appliquée de chaque prop publique, par variant.
 *
 * Le relevé se fait ici parce que c'est ici qu'on sait déjà QUEL calque porte
 * QUELLE prop dans CE variant ; le refaire ailleurs demanderait de redécider ce
 * rapprochement, que ce module possède seul. Elle reste hors de
 * `ExtractedPropertyBinding` : la définition d'une liaison se déduplique par
 * égalité de son bloc, et une valeur propre à un variant l'en empêcherait.
 */
export type AppliedPropertyValues = Map<string, Record<string, string | boolean>>;

/** Le résultat complet du relevé : la partie publiée, et la partie indicative. */
export type PropertyBindingScan = {
  bindings: ExtractedPropertyBinding[];
  applied: AppliedPropertyValues;
};

/**
 * Ce que la maquette montre pour une cible native, ou `undefined`.
 *
 * `mainComponent` ne se lit pas sur le node : sa valeur utile est le NOM du
 * composant placé, que le scan de composition a déjà rapporté pour toutes les
 * instances. Le résoudre autrement coûterait un aller-retour par swap.
 */
function appliedValue(
  node: SceneNode,
  target: 'visible' | 'characters' | 'mainComponent',
  mainByInstanceId: ReadonlyMap<string, ComponentNode>,
): string | boolean | undefined {
  if (target === 'visible') return node.visible !== false;
  if (target === 'characters') return node.type === 'TEXT' ? node.characters : undefined;
  const main = mainByInstanceId.get(node.id);
  if (!main) return undefined;
  return main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name;
}

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
  mainByInstanceId: ReadonlyMap<string, ComponentNode> = new Map(),
): PropertyBindingScan {
  const bindings: ExtractedPropertyBinding[] = [];
  const applied: AppliedPropertyValues = new Map();
  // Une clé qu'un même variant renseigne deux fois différemment n'a pas de
  // réponse : le contrat préfère se taire à trancher au hasard.
  const contested = new Map<string, Set<string>>();
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

        const value = appliedValue(node, target, mainByInstanceId);
        if (value === undefined) continue;
        const values = applied.get(entry.component.id) ?? {};
        const litiges = contested.get(entry.component.id) ?? new Set<string>();
        if (litiges.has(prop)) continue;
        if (Object.prototype.hasOwnProperty.call(values, prop) && values[prop] !== value) {
          litiges.add(prop);
          contested.set(entry.component.id, litiges);
          delete values[prop];
          continue;
        }
        Object.defineProperty(values, prop, {
          value, enumerable: true, writable: true, configurable: true,
        });
        applied.set(entry.component.id, values);
      }
    }
  }
  return { bindings, applied };
}
