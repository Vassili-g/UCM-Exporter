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
import type { ComposedDependency } from '@ucm-kit/core/format';

/** Vrai si la visibilité peut changer via l'API publique ou un mode de variable. */
function hasDynamicVisibility(node: SceneNode): boolean {
  return Boolean(node.componentPropertyReferences?.visible)
    || variableAliases(getBinding(node, 'visible')).length > 0;
}

/**
 * Un node masqué sans liaison de visibilité ne peut être rendu dans cet état.
 *
 * Exporté pour rester l'unique autorité : l'échantillon compare une instance à
 * son maître par POSITION, donc sans passer par `getAllNodes`, et doit taire
 * les mêmes calques que lui — sans quoi la maquette « montrerait » un calque
 * que le contrat déclare invisible.
 */
export function isStaticallyHidden(node: SceneNode): boolean {
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
  return nearestAncestorIn(node, root, composed) !== null;
}

/**
 * Le PLUS PROCHE ancêtre strict du node qui est une instance composée, ou null.
 *
 * Même remontée que `hasAncestorIn`, dont elle est devenue l'implémentation :
 * répondre « lequel » plutôt que « y en a-t-il un » suffit à rattacher chaque
 * dépendance imbriquée à celle qui la contient, sans qu'une seconde remontée
 * d'ancêtres existe ailleurs.
 *
 * Strictement ANCÊTRE, comme son aînée : inclure le node lui-même ferait
 * élaguer l'instance de dépendance par `getAllNodes`, et le composé perdrait le
 * slot qui la rend.
 */
export function nearestAncestorIn(
  node: SceneNode,
  root: SceneNode,
  composed: ComposedInstances,
): ComposedDependency | null {
  if (composed.size === 0) return null;

  let current: BaseNode | null | undefined = node.parent;
  while (current && current !== root) {
    const dependency = composed.get(current.id);
    if (dependency) return dependency;
    current = current.parent;
  }
  return null;
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
  // La racine elle-même peut ÊTRE un composant unifié : c'est la forme d'un
  // slot qui rend directement sa dépendance. `hasAncestorIn` ne teste que les
  // ancêtres STRICTS et ne la couvre donc pas ; sans cette ligne, le parent
  // décrirait les calques, les visibilités et les icônes d'un contrat voisin.
  if (composed.has(root.id)) return [root];

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
