/**
 * Nommage des slots d'un composant.
 *
 * `structure.children` décrit les enfants directs du node de layout : eux seuls
 * portent un slot. Une icône, à quelque profondeur qu'elle se trouve, reçoit le
 * slot de l'enfant direct qui la contient.
 *
 * Ce nommage est décidé ici et nulle part ailleurs. `extractLayout` s'en sert
 * pour bâtir `structure.children`, `extractIconLayers` pour situer les icônes de
 * toute la matrice. Un second calcul, même équivalent en apparence, finirait par
 * attribuer à une icône un slot que le contrat ne contient pas.
 */
import { normalizeName } from '@ucm-kit/core/format';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { indexedSlotName, semanticSlotName } from './semantics';
import { composedSlotDependencies } from './slotRelations';

/** Un enfant direct du node de layout, et le slot qu'il occupe. */
export type SlotAssignment = {
  child: SceneNode;
  slot: string;
};

/**
 * Vrai si ce node est un calque graphique visé par une règle `@icons`.
 * Un texte ou un composant ne peut pas l'être : la règle désigne le dessin à
 * rendre, jamais le calque qui l'entoure.
 */
export function isIconLayer(node: SceneNode, iconNames: ReadonlySet<string>): boolean {
  return iconNames.has(node.name)
    && node.type !== 'TEXT'
    && node.type !== 'COMPONENT'
    && node.type !== 'COMPONENT_SET';
}

/**
 * Nom de slot d'un enfant direct, avant déduplication des homonymes.
 *
 * Un enfant qui porte une ou plusieurs dépendances unifiées garde le nom de son
 * calque, sans jamais devenir un `label` : ce cadre est un conteneur de ce
 * contrat-ci, et son rôle n'est pas celui d'un texte. Ses propres calques, eux,
 * sont bien décrits — par ses enfants, chacun nommé par cette même règle. C'est
 * le test que `extractLayout`, `extractVariantTypography` et les signatures
 * appliquent tous : le déplacer ferait bouger tous les chemins de slots.
 */
function baseSlotName(
  child: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
): string {
  const isDependency = composedSlotDependencies(child, composed).length > 0;
  // `getAllNodes` renvoie le calque lui-même en plus de ses descendants : un
  // slot qui EST un texte est donc reconnu comme un slot qui en contient un.
  const contents = isDependency ? [] : getAllNodes(child, [], composed);
  const hasText = contents.some((node) => node.type === 'TEXT');
  const hasIcon = contents.some((node) => isIconLayer(node, iconNames));

  const layerName = normalizeName(child.name).replace(/\./g, '-') || 'unnamed';
  return semanticSlotName(hasText, hasIcon) ?? layerName;
}

/**
 * Slot de chaque enfant direct du node de layout, dans l'ordre du document.
 * Les homonymes sont numérotés par `indexedSlotName` (`icon`, `icon-2`…).
 */
export function assignSlots(
  layoutNode: SceneNode,
  iconNames: ReadonlySet<string>,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): SlotAssignment[] {
  const exportable = new Set(getAllNodes(layoutNode, warnings, composed));
  const children = 'children' in layoutNode
    ? layoutNode.children.filter((child) => exportable.has(child))
    : [];

  const countByBaseName = new Map<string, number>();
  return children.map((child) => {
    const baseName = baseSlotName(child, iconNames, composed);
    const alreadySeen = countByBaseName.get(baseName) ?? 0;
    countByBaseName.set(baseName, alreadySeen + 1);
    return { child, slot: indexedSlotName(baseName, alreadySeen) };
  });
}

/**
 * Slot de chaque calque d'icône, d'après les slots fournis.
 *
 * Un calque absent du résultat n'appartient à aucun enfant direct du node de
 * layout : il n'occupe donc aucun slot. L'appelant doit le signaler plutôt que
 * lui en attribuer un que `structure.children` ne contient pas.
 */
export function iconSlotsByLayer(
  assignments: readonly SlotAssignment[],
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
): Map<SceneNode, string> {
  const slotByLayer = new Map<SceneNode, string>();
  for (const { child, slot } of assignments) {
    for (const node of getAllNodes(child, [], composed)) {
      if (!composed.has(node.id) && isIconLayer(node, iconNames)) slotByLayer.set(node, slot);
    }
  }
  return slotByLayer;
}
