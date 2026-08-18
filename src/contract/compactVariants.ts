/**
 * Normalisation lossless des vues exactes et des liaisons de variants.
 *
 * Les ids courts sont attribués dans l'ordre de la matrice : deux exports du
 * même document produisent donc le même JSON, sans hash opaque ni héritage.
 */
import type {
  ContractVariant,
  ContractVariantView,
  ExtractedContractVariant,
  ExtractedPropertyBinding,
  PropertyBindingDefinition,
  VariantPropertyBinding,
} from './types';

type CompactedVariants = {
  variants: ContractVariant[];
  variantViews: Record<string, ContractVariantView>;
  propertyBindingDefinitions: Record<string, PropertyBindingDefinition>;
};

/** Catalogue une valeur JSON exacte et retourne sa clé courte et déterministe. */
function intern<T>(
  value: T,
  prefix: string,
  idsBySignature: Map<string, string>,
  catalog: Record<string, T>,
): string {
  const signature = JSON.stringify(value);
  const known = idsBySignature.get(signature);
  if (known) return known;
  const id = `${prefix}${idsBySignature.size + 1}`;
  idsBySignature.set(signature, id);
  catalog[id] = value;
  return id;
}

/**
 * Déduplique uniquement des blocs complets : résoudre une référence restitue
 * la vue exacte, sans merge, défaut implicite ni produit cartésien.
 */
export function compactVariants(
  expandedVariants: readonly ExtractedContractVariant[],
  expandedBindings: readonly ExtractedPropertyBinding[],
): CompactedVariants {
  const variantViews: Record<string, ContractVariantView> = {};
  const propertyBindingDefinitions: Record<string, PropertyBindingDefinition> = {};
  const viewIds = new Map<string, string>();
  const bindingIds = new Map<string, string>();
  const bindingsByVariant = new Map<string, VariantPropertyBinding[]>();

  for (const binding of expandedBindings) {
    const { nodeId, variantNodeId, ...definition } = binding;
    const definitionId = intern(
      definition,
      'b',
      bindingIds,
      propertyBindingDefinitions,
    );
    const placements = bindingsByVariant.get(variantNodeId) ?? [];
    placements.push({ definition: definitionId, nodeId });
    bindingsByVariant.set(variantNodeId, placements);
  }

  const variants = expandedVariants.map((variant): ContractVariant => {
    const { structure, typography, composes, icons, ...identityAndLeaves } = variant;
    const view = intern(
      { structure, typography, composes, icons },
      'v',
      viewIds,
      variantViews,
    );
    const bindings = bindingsByVariant.get(variant.nodeId);
    return {
      ...identityAndLeaves,
      view,
      ...(bindings && bindings.length > 0 ? { bindings } : {}),
    };
  });

  return { variants, variantViews, propertyBindingDefinitions };
}
