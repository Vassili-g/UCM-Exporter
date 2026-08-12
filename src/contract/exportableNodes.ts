/**
 * Parcours des nodes qui peuvent réellement participer au contrat.
 *
 * Un calque masqué reste pertinent si une prop ou une variable peut le rendre
 * visible. À l'inverse, un sous-arbre statiquement masqué est élagué avant
 * toute extraction pour qu'il ne fournisse ni tokens, ni slots, ni wrapper.
 *
 * Deuxième motif d'élagage : les composants unifiés imbriqués. Leurs calques
 * appartiennent à LEUR contrat, pas à celui du composé qui les embarque
 * (cf. `composedComponents.ts`) ; l'instance elle-même reste visible, car le
 * composé doit pouvoir la décrire comme un de ses slots.
 */
import { variableAliases } from '../variables';
import { getBinding } from './nodeBindings';
import type { ComposedDependency } from './types';

/** Vrai si la visibilité peut changer via l'API publique ou un mode de variable. */
function hasDynamicVisibility(node: SceneNode): boolean {
  return Boolean(node.componentPropertyReferences?.visible)
    || variableAliases(getBinding(node, 'visible')).length > 0;
}

/** Un node masqué sans liaison de visibilité ne peut être rendu dans cet état. */
function isStaticallyHidden(node: SceneNode): boolean {
  return node.visible === false && !hasDynamicVisibility(node);
}

/** Détecte une liaison, y compris dans `boundVariables.componentProperties`. */
function containsVariableAlias(value: unknown): boolean {
  if (variableAliases(value).length > 0) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).some(containsVariableAlias);
}

function hasVariableBindings(node: SceneNode): boolean {
  return containsVariableAlias(node.boundVariables);
}

/** Plus haut ancêtre statiquement masqué entre le node et la racine exclue. */
function hiddenAncestor(node: SceneNode, root: SceneNode): SceneNode | null {
  let current: BaseNode | null | undefined = node;
  let hidden: SceneNode | null = null;

  while (current && current !== root) {
    if ('visible' in current && isStaticallyHidden(current as SceneNode)) {
      hidden = current as SceneNode;
    }
    current = current.parent;
  }
  return hidden;
}

function pushOnce(warnings: string[], warning: string): void {
  if (!warnings.includes(warning)) warnings.push(warning);
}

/**
 * Les composants unifiés imbriqués d'un sous-arbre : id de l'instance →
 * dépendance complète. Une seule structure sert les deux besoins — élaguer le
 * parcours (`has`) et décrire fidèlement le slot (`get`), visibilité comprise.
 */
export type ComposedInstances = ReadonlyMap<string, ComposedDependency>;

/**
 * Vrai si un ancêtre STRICT du node, sous la racine, est une instance composée.
 *
 * La remontée d'ancêtres vit ici, avec les autres règles de parcours, pour
 * n'exister qu'une fois : `getAllNodes` s'en sert pour élaguer, et
 * `composedComponents` pour ne déclarer que ses dépendances directes.
 */
export function hasAncestorIn(
  node: SceneNode,
  root: SceneNode,
  composed: ComposedInstances,
): boolean {
  if (composed.size === 0) return false;

  let current: BaseNode | null | undefined = node.parent;
  while (current && current !== root) {
    if (composed.has(current.id)) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Renvoie la racine et les descendants qui peuvent être rendus.
 *
 * La racine contractée reste toujours lisible : sa visibilité sur le canvas
 * Figma ne décide pas si le composant lui-même existe. Pour les descendants,
 * un parent statiquement masqué élague tout son sous-arbre. Un seul warning
 * est produit si ce sous-arbre portait des variables ; un simple repère de
 * travail masqué est ignoré sans bruit.
 *
 * `composed` élague de la même façon les composants unifiés imbriqués, mais
 * SANS avertir : leurs calques ne sont pas perdus, ils sont décrits par leur
 * propre contrat et l'instance reste listée dans `composes`.
 */
export function getAllNodes(
  root: SceneNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): SceneNode[] {
  const descendants = 'findAll' in root ? root.findAll(() => true) : [];
  const ignoredBindings = new Map<SceneNode, boolean>();
  const exportable: SceneNode[] = [root];

  for (const node of descendants) {
    // L'instance composée elle-même n'est pas élaguée : seul son contenu l'est.
    if (hasAncestorIn(node, root, composed)) continue;

    const hidden = hiddenAncestor(node, root);
    if (!hidden) {
      exportable.push(node);
      continue;
    }
    ignoredBindings.set(hidden, (ignoredBindings.get(hidden) ?? false) || hasVariableBindings(node));
  }

  for (const [hidden, hasBindings] of ignoredBindings) {
    if (!hasBindings) continue;
    pushOnce(
      warnings,
      `Layer « ${hidden.name} » : masqué dans Figma, il est exclu de l'export avec tout ` +
        `son contenu et les variables qu'il porte. Si le composant doit pouvoir l'afficher, ` +
        `reliez sa visibilité à une boolean property ou à une variable.`,
    );
  }

  return exportable;
}

/**
 * Renvoie TOUS les calques TEXTE d'un sous-arbre, dans l'ordre du document.
 * Le libellé d'un composant embarqué n'en est pas un : sans l'élagage, une
 * Alert emprunterait la typographie du bouton qu'elle contient.
 *
 * Le compte importe autant que le premier élément : un calque qui en contient
 * plusieurs porte plusieurs typographies, et n'en retenir qu'une appliquerait
 * celle du titre à la description. Les deux besoins partagent donc ce parcours,
 * plutôt qu'un « premier texte » et un « compte des textes » libres de diverger.
 */
export function textNodes(
  node: SceneNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): TextNode[] {
  if (node.type === 'TEXT') return [node];
  return getAllNodes(node, warnings, composed).filter(
    (child): child is TextNode => child.type === 'TEXT',
  );
}
