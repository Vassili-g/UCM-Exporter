/**
 * Relations structurelles à l'intérieur d'un slot direct.
 *
 * Un slot peut envelopper un composant unifié ou porter une visibilité plus
 * profondément que son premier calque. Ces deux relations sont analysées ici
 * sans extraire de token ni connaître le nom du composant concerné.
 */
import { getAllNodes, hasAncestorIn } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { normalizePropKey } from './parsers';
import type { ComposedDependency, VisibilityTarget } from './types';

/**
 * Dépendances directes d'un slot, que le slot soit lui-même l'instance ou
 * qu'il l'enveloppe. Les dépendances d'une dépendance sont exclues.
 */
export function composedSlotDependencies(
  child: SceneNode,
  composed: ComposedInstances,
): ComposedDependency[] {
  const direct = composed.get(child.id);
  if (direct) return [direct];
  if (composed.size === 0 || !('findAll' in child)) return [];

  return child.findAll((node) => composed.has(node.id))
    .filter((node) => !hasAncestorIn(node, child, composed))
    .map((node) => composed.get(node.id))
    .filter((dependency): dependency is ComposedDependency => Boolean(dependency));
}

/** Vrai si `node` appartient au sous-arbre de `ancestor`, racine comprise. */
function belongsTo(node: SceneNode, ancestor: SceneNode): boolean {
  let current: BaseNode | null | undefined = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

/** Chemin de calques Figma relatif au slot direct, cible comprise. */
function figmaPath(node: SceneNode, root: SceneNode): string[] {
  const path: string[] = [];
  let current: BaseNode | null | undefined = node;
  while (current && current !== root) {
    if ('name' in current) path.unshift(current.name);
    current = current.parent;
  }
  return path;
}

/**
 * Décrit les visibilités imbriquées sans élargir leur portée.
 *
 * Une cible unique qui contrôle tout le contenu rend le slot optionnel. Dès
 * qu'un autre élément rendable subsiste, chaque cible garde son chemin propre.
 *
 * `slotIsOptional` dit que le slot porte DÉJÀ sa propre visibilité. Aucune
 * cible ne peut alors être promue — la prop du slot resterait prioritaire et la
 * promotion ne ferait que masquer la seconde. Les cibles sont malgré tout
 * décrites : un slot masquable qui contient une sous-partie masquable expose
 * bien deux props, et n'en taire aucune est la règle.
 */
export function nestedSlotVisibility(
  child: SceneNode,
  composed: ComposedInstances,
  slotIsOptional = false,
): { visibilityProp?: string; visibilityTargets?: VisibilityTarget[] } {
  const nodes = getAllNodes(child, [], composed);
  const targets = nodes.filter(
    (node) =>
      node !== child
      && !composed.has(node.id)
      && Boolean(node.componentPropertyReferences?.visible),
  );
  if (targets.length === 0) return {};

  if (targets.length === 1 && !slotIsOptional) {
    const target = targets[0];
    const controlsWholeSlot = nodes
      // Une instance composée reste un contenu visible du slot, même si son
      // propre sous-arbre est élagué. L'ignorer ferait croire qu'un autre
      // descendant contrôle à lui seul la visibilité du slot entier.
      .filter((node) => node !== child)
      .every((node) => belongsTo(node, target) || belongsTo(target, node));
    if (controlsWholeSlot) {
      return {
        visibilityProp: normalizePropKey(target.componentPropertyReferences!.visible!),
      };
    }
  }

  return {
    visibilityTargets: targets.map((target) => ({
      visibilityProp: normalizePropKey(target.componentPropertyReferences!.visible!),
      figmaPath: figmaPath(target, child),
    })),
  };
}
