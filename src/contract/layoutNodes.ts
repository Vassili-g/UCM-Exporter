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
import { findLayoutNode } from './extractLayout';

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

  for (const variant of variants) {
    // Le variant de référence part du wrapper déjà trouvé pour lui.
    if (variant === reference?.component) {
      nodes.set(variant, findLayoutNode(wrapperInstance ?? variant, warnings, composed));
      continue;
    }

    const instance = wrapperOwnerId
      ? await matchingWrapperInstance(variant, wrapperOwnerId, composed)
      : null;
    if (wrapperOwnerId && !instance) {
      warnings.push(
        `Variant « ${variant.name} » : il ne contient pas le composant imbriqué qui porte les ` +
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
