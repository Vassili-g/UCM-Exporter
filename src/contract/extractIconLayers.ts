/**
 * Inventaire des calques graphiques ciblés par les règles `@icons`.
 *
 * Les icônes d'un composant peuvent s'exclure mutuellement : une Alert montre
 * `circle-info` en severity=info et `circle-check` en severity=success, au même
 * emplacement. Le variant de référence n'en contient donc qu'une, et décrire
 * les icônes depuis lui seul en perdrait la moitié. L'inventaire parcourt toute
 * la matrice et résume chaque nom exact — sa visibilité, sa taille et le rang
 * du slot qu'il occupe — sans recopier une entrée par variant.
 *
 * Les sous-arbres des composants composés restent élagués : leurs icônes
 * appartiennent à leur propre contrat.
 */
import type { TokenResolver } from '../variables';
import type { VariantMatrix } from './componentTree';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { findLayoutNode } from './extractLayout';
import { BINDING_PATTERNS, resolveField } from './nodeBindings';
import { normalizePropKey, normalizePropValue } from './parsers';
import { assignSlots, iconSlotsByLayer, isIconLayer } from './slotNames';

/** Ce que la matrice complète apprend sur un nom de calque graphique. */
export type IconLayerSummary = {
  figmaLayer: string;
  /** Liaisons de visibilité distinctes rencontrées ; `null` signifie aucune liaison. */
  visibilityProps: Array<string | null>;
  /** Plus grand nombre de calques homonymes dans un même variant. */
  maximumOccurrences: number;
  /**
   * Slots distincts occupés à travers la matrice (cf. `slotNames.ts`). Un slot
   * unique est stable, donc publiable ; plusieurs décrivent une structure qui
   * change d'un variant à l'autre. `null` marque un calque qui n'appartient à
   * aucun enfant direct du node de layout, donc à aucun slot.
   */
  slots: Array<string | null>;
  /** Tokens de taille distincts relevés sur le calque ; `null` si aucun. */
  sizes: Array<string | null>;
  /** Combinaisons exactes d'axes dans lesquelles le calque existe. */
  variants: Array<Record<string, string>>;
  /** Nombre total de variants inspectés, pour reconnaître une présence globale. */
  totalVariants: number;
};

/** Ce qu'on accumule pour un nom de calque avant de le résumer. */
type IconLayerAccumulator = {
  visibilityProps: Set<string | null>;
  maximumOccurrences: number;
  slots: Set<string | null>;
  sizes: Set<string | null>;
  variants: Array<Record<string, string>>;
};

function newAccumulator(): IconLayerAccumulator {
  return {
    visibilityProps: new Set(),
    maximumOccurrences: 0,
    slots: new Set(),
    sizes: new Set(),
    variants: [],
  };
}

/** Le variant que `structure.children` décrit, et le node de layout retenu pour lui. */
export type ReferenceLayout = {
  component: ComponentNode;
  layoutNode: SceneNode;
};

/**
 * Résume les calques dont le nom est demandé par les règles, sur tous les
 * variants. La correspondance reste strictement nominale : aucune position ni
 * convention propre à un composant n'est devinée. Le slot vient de
 * `slotNames.assignSlots`, la même source que `structure.children`.
 *
 * `referenceLayout` porte le node de layout déjà retenu pour le variant de
 * référence. Le fournir est ce qui garantit que les slots cités décrivent bien
 * ceux du contrat : le node de layout d'un variant s'élit au score, et une
 * seconde élection menée depuis une autre racine peut en désigner un autre. Les
 * autres variants élisent le leur ; un désaccord se solde par plusieurs slots,
 * donc par un avertissement et aucune valeur — jamais par un slot inventé.
 */
export async function extractIconLayers(
  matrix: VariantMatrix,
  iconNames: readonly string[],
  resolver: TokenResolver,
  tokenNames: Set<string>,
  warnings: string[],
  composed: ComposedInstances = new Map(),
  referenceLayout: ReferenceLayout | null = null,
): Promise<IconLayerSummary[]> {
  const uniqueNames = Array.from(new Set(iconNames));
  if (uniqueNames.length === 0) return [];

  const requested = new Set(uniqueNames);
  const summaries = new Map<string, IconLayerAccumulator>();

  for (const entry of matrix.variants) {
    const layoutNode = entry.component === referenceLayout?.component
      ? referenceLayout.layoutNode
      : findLayoutNode(entry.component, [], composed);
    const slotByLayer = iconSlotsByLayer(
      assignSlots(layoutNode, requested, [], composed),
      requested,
      composed,
    );
    const layers = getAllNodes(entry.component, [], composed).filter(
      (node) => !composed.has(node.id) && isIconLayer(node, requested),
    );

    const occurrences = new Map<string, number>();
    for (const node of layers) {
      occurrences.set(node.name, (occurrences.get(node.name) ?? 0) + 1);
      const summary = summaries.get(node.name) ?? newAccumulator();
      summaries.set(node.name, summary);

      const reference = node.componentPropertyReferences?.visible;
      summary.visibilityProps.add(reference ? normalizePropKey(reference) : null);
      summary.slots.add(slotByLayer.get(node) ?? null);
      // La taille se relève ici parce qu'une icône absente du variant de
      // référence n'a aucun slot où la lire. Le résolveur met ses résolutions
      // en cache, et les avertissements identiques se dédupliquent à l'export.
      summary.sizes.add(
        await resolveField(
          node,
          BINDING_PATTERNS.slotSize,
          `${node.name}-size`,
          resolver,
          tokenNames,
          warnings,
        ),
      );
    }

    for (const [name, count] of occurrences) {
      const summary = summaries.get(name);
      if (!summary) continue;
      summary.maximumOccurrences = Math.max(summary.maximumOccurrences, count);
      // Un Component Set sans axe déclaré laisse `values` vide : le nom du
      // variant reste la seule condition citable.
      const values = matrix.axes.length > 0
        ? entry.values
        : { variant: normalizePropValue(entry.component.name) };
      summary.variants.push({ ...values });
    }
  }

  return uniqueNames.flatMap((name) => {
    const summary = summaries.get(name);
    return summary
      ? [{
        figmaLayer: name,
        visibilityProps: Array.from(summary.visibilityProps),
        maximumOccurrences: summary.maximumOccurrences,
        slots: Array.from(summary.slots),
        sizes: Array.from(summary.sizes),
        variants: summary.variants,
        totalVariants: matrix.variants.length,
      }]
      : [];
  });
}
