/**
 * Élection du node de layout de chaque variant — une fois, pour tout l'export.
 *
 * Le node de layout est celui dont les enfants directs deviennent les slots du
 * contrat. Il s'élit au score (`findLayoutNode`), et ce score dépend de la
 * RACINE d'où part la recherche : partir du composant ou de son wrapper de
 * dimensions peut désigner deux nodes différents dès que le variant porte
 * autant de dimensions liées que le wrapper. Le contrat aurait alors trois
 * lectures d'un même arbre — `structure.children` d'un côté, les slots des
 * icônes et les chemins de `variantTypography` de l'autre.
 *
 * L'élection a donc lieu ici, une seule fois par variant, et les extractions
 * consultent son résultat sans jamais le recalculer. C'est la même règle que
 * `slotNames.ts` applique au nommage des slots, et pour la même raison : un
 * second calcul, même équivalent en apparence, finit toujours par diverger.
 */
import { findWrapperReference } from './componentTree';
import type { WrapperReference } from './componentTree';
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { BINDING_PATTERNS, hasCompleteBinding } from './nodeBindings';
import { pousserLocalise } from './localisation';

/**
 * Trouve le calque qui porte les dimensions. On compte, pour chaque calque
 * du sous-arbre, combien de propriétés de layout (gap, paddings, radius)
 * sont liées à une variable : celui qui en porte le plus est notre
 * « conteneur de layout ». À défaut, on retombe sur la racine.
 *
 * Le résultat dépend de la racine reçue : le score maximal d'un sous-arbre
 * n'est pas celui de son parent. Cette fonction vit donc dans le module qui
 * tranche cette racine, et n'est appelée que par les deux élections
 * ci-dessous : aucune extraction ne choisit le calque qu'elle décrit.
 */
export function findLayoutNode(
  root: SceneNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): SceneNode {
  const dimensions = [
    BINDING_PATTERNS.gap,
    BINDING_PATTERNS.paddingX,
    BINDING_PATTERNS.paddingY,
    BINDING_PATTERNS.radius,
  ];
  const candidates = getAllNodes(root, warnings, composed)
    // `getAllNodes` conserve l'instance d'un composant unifié pour que la
    // structure puisse la décrire comme un slot. Elle porte évidemment ses
    // propres dimensions, et la laisser concourir la ferait élire : le contrat
    // décrirait alors un arbre dont `assignSlots` ne tire aucun slot, puisque
    // le parcours d'une dépendance s'arrête à elle. `structure.children`
    // deviendrait vide, en silence. C'est la garde qu'appliquent déjà
    // `matchingWrapperInstance` et `findWrapperReference`.
    .filter((node) => !composed.has(node.id))
    .map((node) => ({
      node,
      score: dimensions.reduce(
        (total, alternatives) => total + (hasCompleteBinding(node, alternatives) ? 1 : 0),
        0,
      ),
    }));
  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.score ? candidates[0].node : root;
}

/**
 * Node de layout retenu pour chaque variant, indexé par le composant lui-même.
 *
 * La clé est le node, et non son id : un composant absent de la matrice — les
 * variants d'un wrapper, par exemple — doit rendre `undefined` et élire le sien,
 * ce qu'un id manquant ou répété ferait échouer en silence.
 */
export type VariantLayoutNodes = ReadonlyMap<ComponentNode, SceneNode>;

/** Le variant que `structure.children` décrit, et le wrapper déjà trouvé pour lui. */
export type ReferenceVariant = {
  component: ComponentNode;
  wrapper: WrapperReference | null;
};

/**
 * Identité du composant instancié : son component set quand il en a un, sinon
 * lui-même. Un wrapper exposant un axe de tailles change de variant maître d'un
 * variant à l'autre (`Size=Big`, `Size=Small`) ; c'est le SET qui l'identifie.
 */
async function instanceOwnerId(instance: InstanceNode): Promise<string | null> {
  // `getMainComponentAsync` lève sur une instance orpheline : un node cassé ne
  // doit pas faire échouer l'export entier.
  try {
    const main = await instance.getMainComponentAsync();
    if (!main) return null;
    return main.parent?.type === 'COMPONENT_SET' ? main.parent.id : main.id;
  } catch {
    return null;
  }
}

/** L'instance du même composant que le wrapper de référence, dans ce variant. */
async function matchingWrapperInstance(
  variant: ComponentNode,
  wrapperOwnerId: string,
  composed: ComposedInstances,
): Promise<InstanceNode | null> {
  const instances = getAllNodes(variant, [], composed).filter(
    (node): node is InstanceNode => node.type === 'INSTANCE' && !composed.has(node.id),
  );
  const owners = await Promise.all(instances.map(instanceOwnerId));
  const index = owners.indexOf(wrapperOwnerId);
  return index === -1 ? null : instances[index];
}

/**
 * Élit le node de layout de chaque variant avec la MÊME règle : depuis le
 * wrapper de dimensions quand le composant en possède un, sinon depuis le
 * variant lui-même.
 *
 * Le wrapper n'est cherché qu'une fois, sur la référence ; les autres variants
 * retrouvent leur propre instance du même composant. Rescorer un wrapper par
 * variant coûterait un parcours complet du sous-arbre pour chaque instance, et
 * pourrait élire deux wrappers différents — la divergence deviendrait
 * invisible là où les signatures existent justement pour la montrer.
 *
 * Un variant sans cette instance n'est pas rattrapé en silence : sa structure
 * diffère réellement de la référence, et le designer doit l'apprendre.
 */
export async function electVariantLayoutNodes(
  variants: readonly ComponentNode[],
  reference: ReferenceVariant | null,
  warnings: string[],
  composed: ComposedInstances = new Map(),
): Promise<VariantLayoutNodes> {
  const nodes = new Map<ComponentNode, SceneNode>();
  const wrapperInstance = reference?.wrapper?.instance ?? null;
  const wrapperOwnerId = wrapperInstance
    ? reference?.wrapper?.componentSet?.id ?? (await instanceOwnerId(wrapperInstance))
    : null;
  // Un wrapper qu'on ne saura pas retrouver ailleurs ne peut pas non plus servir
  // de racine à la référence. Sans cet id, `matchingWrapperInstance` n'a rien à
  // comparer : les autres variants éliraient depuis eux-mêmes pendant que la
  // référence élirait depuis le wrapper, et l'avertissement plus bas resterait
  // muet, sa garde tombant avec l'id. La référence décrirait alors un arbre que
  // plus aucun variant ne décrit — la divergence même que ce module existe pour
  // empêcher. `scoreWrapper` écarte déjà ce candidat à la source ; ceci tient la
  // propriété pour un appelant qui construirait la référence autrement.
  const racineDeLaReference = wrapperOwnerId ? wrapperInstance : null;

  for (const variant of variants) {
    // Le variant de référence part du wrapper déjà trouvé pour lui.
    if (variant === reference?.component) {
      nodes.set(variant, findLayoutNode(racineDeLaReference ?? variant, warnings, composed));
      continue;
    }

    const instance = wrapperOwnerId
      ? await matchingWrapperInstance(variant, wrapperOwnerId, composed)
      : null;
    if (wrapperOwnerId && !instance) {
      pousserLocalise(warnings, 'Variant', variant,
        ` : il ne contient pas le composant imbriqué qui porte les ` +
          `dimensions des autres variants. Ses dimensions et ses slots sont lus sur un autre ` +
          `layer, et peuvent décrire autre chose. Ajoutez-y ce composant, puis réexportez.`,
      );
    }
    // Les avertissements de parcours (calques masqués) ne sont relevés que sur
    // la référence : les autres variants les produiront de nouveau pendant
    // l'extraction de leurs tokens, et deux relevés feraient des doublons.
    nodes.set(variant, findLayoutNode(instance ?? variant, [], composed));
  }

  return nodes;
}

/**
 * Complète une élection pour des variants qui n'appartiennent pas à la matrice
 * — ceux du wrapper de dimensions, quand c'est lui qui porte l'axe de tailles.
 *
 * Ces variants-là vivent dans un autre arbre : aucun wrapper ne s'intercale, ils
 * élisent depuis eux-mêmes. Ceux qui figurent DÉJÀ dans `elected` gardent en
 * revanche l'élection de la matrice — c'est le cas quand l'axe de tailles vit
 * sur le set sélectionné, et les réélire ferait décrire à `sizes` un arbre que
 * `structure.children` ne décrit pas.
 *
 * L'appelant ne passe que les variants dont il lira réellement les dimensions :
 * élire au-delà ferait remonter les avertissements de parcours de calques que
 * le contrat n'ouvre jamais.
 */
export function electSizeVariantLayoutNodes(
  components: Iterable<ComponentNode>,
  elected: VariantLayoutNodes,
  warnings: string[],
  composed: ComposedInstances = new Map(),
): VariantLayoutNodes {
  const nodes = new Map(elected);
  for (const component of components) {
    if (nodes.has(component)) continue;
    nodes.set(component, findLayoutNode(component, warnings, composed));
  }
  return nodes;
}
