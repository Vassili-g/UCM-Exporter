/**
 * Normalisation lossless des vues exactes et des liaisons de variants.
 *
 * Les ids courts sont attribués dans l'ordre de la matrice : deux exports du
 * même document produisent donc le même JSON, sans hash opaque ni héritage.
 */
import type {
  ContractSample,
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
  samples: Record<string, ContractSample>;
};

/** Catalogue une valeur JSON exacte et retourne sa clé courte et déterministe. */
export function intern<T>(
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
  const samples: Record<string, ContractSample> = {};
  const viewIds = new Map<string, string>();
  const bindingIds = new Map<string, string>();
  // Chaque catalogue a SA table de signatures : `intern` numérote sur la taille
  // de celle qu'on lui passe, et une table commune donnerait des identifiants
  // troués (« s3 » sans « s1 ») selon l'ordre des appels.
  const sampleIds = new Map<string, string>();
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
    const {
      structure, typography, composes, icons, paintPlacements, sample, ...identityAndLeaves
    } = variant;
    const view = intern(
      { structure, typography, composes, icons, paintPlacements },
      'v',
      viewIds,
      variantViews,
    );
    // `sample` est déstructuré à part et catalogué à part : le laisser dans la
    // vue ferait diverger deux variants au rendu identique dès que leur contenu
    // de maquette diffère, et le laisser dans le reste le recopierait en clair
    // sur chaque variant.
    const bindings = bindingsByVariant.get(variant.nodeId);
    const sampleId = sample && Object.keys(sample).length > 0
      ? intern(sample, 's', sampleIds, samples)
      : null;
    return {
      ...identityAndLeaves,
      view,
      ...(bindings && bindings.length > 0 ? { bindings } : {}),
      ...(sampleId ? { sample: sampleId } : {}),
    };
  });

  return { variants, variantViews, propertyBindingDefinitions, samples };
}
