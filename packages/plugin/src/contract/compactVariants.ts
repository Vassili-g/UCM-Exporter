/**
 * Normalisation lossless des vues exactes et des liaisons de variants.
 *
 * Les ids courts sont attribués dans l'ordre de la matrice : deux exports du
 * même document produisent donc le même JSON, sans hash opaque ni héritage.
 */
import { elideNeutrals, isNeutral } from './elideNeutrals';
import type {
  ComposedDependency,
  ContractSample,
  ContractVariant,
  ContractVariantView,
  ExpandedVariantView,
  ExtractedContractVariant,
  ExtractedPropertyBinding,
  PropertyBindingDefinition,
  TextStyleUse,
  VariantIconPlacement,
  VariantPaintPlacements,
  VariantPropertyBinding,
  VariantStructure,
} from '@ucm-kit/core/format';

type CompactedVariants = {
  variants: ContractVariant[];
  variantViews: Record<string, ContractVariantView>;
  viewStructures: Record<string, VariantStructure>;
  viewTypographies: Record<string, TextStyleUse[]>;
  viewComposes: Record<string, ComposedDependency[]>;
  viewIcons: Record<string, Record<string, VariantIconPlacement>>;
  viewPaintPlacements: Record<string, VariantPaintPlacements>;
  propertyBindingDefinitions: Record<string, PropertyBindingDefinition>;
  samples: Record<string, ContractSample>;
};

/**
 * Signature d'égalité d'un bloc : son JSON, clés triées à toute profondeur.
 *
 * L'ordre des clés n'est pas une donnée — deux objets qui portent les mêmes
 * paires disent la même chose — et deux extractions du même arbre peuvent le
 * produire dans un ordre différent : la projection de référence range ses
 * dimensions après ses slots, une vue exacte les range où l'auto layout les a
 * lues. Comparer le texte brut ferait cataloguer deux fois un bloc identique.
 *
 * La règle de partage ne s'en trouve pas relâchée : deux blocs qui diffèrent
 * par une valeur, une clé ou un ordre de TABLEAU gardent des signatures
 * distinctes. Seul l'ordre des clés cesse de compter.
 */
export function signature(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(signature).join(',')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => (a < b ? -1 : 1),
  );
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${signature(item)}`).join(',')}}`;
}

/** Catalogue une valeur JSON exacte et retourne sa clé courte et déterministe. */
export function intern<T>(
  value: T,
  prefix: string,
  idsBySignature: Map<string, string>,
  catalog: Record<string, T>,
): string {
  const key = signature(value);
  const known = idsBySignature.get(key);
  if (known) return known;
  const id = `${prefix}${idsBySignature.size + 1}`;
  idsBySignature.set(key, id);
  Object.defineProperty(catalog, id, {
    value, enumerable: true, writable: true, configurable: true,
  });
  return id;
}

/** Un catalogue et sa table de signatures, pour une partie de vue. */
type Catalogue<T> = {
  prefix: string;
  /**
   * Où cette partie vivra dans le contrat publié.
   *
   * `elideNeutrals` en a besoin : c'est ce chemin qui lui dit si une valeur vide
   * est un silence à retirer ou une entrée de dictionnaire à garder. Le `*`
   * tient la place de la clé, qui n'est pas encore attribuée.
   */
  chemin: string;
  ids: Map<string, string>;
  entries: Record<string, T>;
};

function catalogue<T>(prefix: string, chemin: string): Catalogue<T> {
  return { prefix, chemin, ids: new Map(), entries: {} };
}

/**
 * Range une partie de vue dans son catalogue et rend son renvoi.
 *
 * La valeur est d'abord débarrassée de ses neutres : la passe finale qui
 * nettoie le contrat entier ne doit jamais pouvoir vider une entrée déjà
 * référencée. Une partie qui n'est QUE du vide n'est pas cataloguée du tout —
 * son renvoi reste absent, à la règle commune.
 */
function ranger<T>(cat: Catalogue<T>, value: T | undefined): string | undefined {
  if (value === undefined) return undefined;
  const propre = elideNeutrals(value, cat.chemin);
  if (isNeutral(propre)) return undefined;
  return intern(propre, cat.prefix, cat.ids, cat.entries);
}

/**
 * Fin d'identifiant qui appartient à la DÉFINITION et non au variant.
 *
 * Figma écrit l'identifiant d'un calque atteint dans une instance
 * « I<chaîne d'instances>;<id du calque dans le maître> ». Seul le segment qui
 * suit le DERNIER point-virgule est l'id dans le maître : il ne dépend que de
 * la définition. Deux bornes le prouvent avant de le hisser — au moins deux
 * occurrences, et la même fin sur toutes. Une définition qui ne vise pas un
 * calque d'instance n'en a pas, et ses `nodeId` restent écrits en entier.
 */
function finCommune(nodeIds: readonly string[]): string | undefined {
  if (nodeIds.length < 2) return undefined;
  let commune: string | undefined;
  for (const nodeId of nodeIds) {
    const separator = nodeId.lastIndexOf(';');
    if (separator === -1) return undefined;
    const fin = nodeId.slice(separator);
    if (commune === undefined) commune = fin;
    else if (commune !== fin) return undefined;
  }
  return commune;
}

/**
 * Déduplique chaque PARTIE de vue séparément.
 *
 * La règle de partage ne change pas — égalité stricte du bloc JSON, aucun
 * merge, aucun défaut, aucun héritage — seule sa granularité change. Résoudre
 * les cinq renvois d'une vue redonne la vue exacte, au bit près ; deux vues qui
 * ne diffèrent que par leurs peintures cessent simplement de republier tout leur
 * arbre de slots, et leur divergence se lit sur le renvoi qui diffère.
 */
export function compactVariants(
  expandedVariants: readonly ExtractedContractVariant[],
  expandedBindings: readonly ExtractedPropertyBinding[],
): CompactedVariants {
  const structures = catalogue<VariantStructure>('st', 'viewStructures.*');
  const typographies = catalogue<TextStyleUse[]>('ty', 'viewTypographies.*');
  const composes = catalogue<ComposedDependency[]>('cp', 'viewComposes.*');
  const icons = catalogue<Record<string, VariantIconPlacement>>('ic', 'viewIcons.*');
  const paintPlacements = catalogue<VariantPaintPlacements>('pp', 'viewPaintPlacements.*');

  const variantViews: Record<string, ContractVariantView> = {};
  const propertyBindingDefinitions: Record<string, PropertyBindingDefinition> = {};
  const samples: Record<string, ContractSample> = {};
  const viewIds = new Map<string, string>();
  const bindingIds = new Map<string, string>();
  // Chaque catalogue a SA table de signatures : `intern` numérote sur la taille
  // de celle qu'on lui passe, et une table commune donnerait des identifiants
  // troués (« s3 » sans « s1 ») selon l'ordre des appels.
  const sampleIds = new Map<string, string>();
  const nodeIdsByDefinition = new Map<string, string[]>();
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
    const seen = nodeIdsByDefinition.get(definitionId) ?? [];
    seen.push(nodeId);
    nodeIdsByDefinition.set(definitionId, seen);
  }

  // La part du maître, hissée. La forme reste un TABLEAU : `extractPropertyBindings`
  // pousse une liaison par NODE et `figmaPath` se construit sur les NOMS de
  // calques, si bien que deux calques homonymes liés à la même prop partagent
  // leur définition dans un même variant. Un dictionnaire indexé par définition
  // n'en garderait qu'une, et le calque perdu resterait visible.
  const suffixByDefinition = new Map<string, string>();
  for (const [definitionId, nodeIds] of nodeIdsByDefinition) {
    const fin = finCommune(nodeIds);
    if (!fin) continue;
    suffixByDefinition.set(definitionId, fin);
    propertyBindingDefinitions[definitionId].nodeSuffix = fin;
  }
  const raccourcir = (placement: VariantPropertyBinding): VariantPropertyBinding => {
    const fin = suffixByDefinition.get(placement.definition);
    if (!fin) return placement;
    return {
      definition: placement.definition,
      nodeId: placement.nodeId.slice(0, placement.nodeId.length - fin.length),
    };
  };

  const variants = expandedVariants.map((variant): ContractVariant => {
    const {
      structure, typography, composes: composed, icons: iconPlacements, paintPlacements: paints,
      sample, tokens, strokes, ...identity
    } = variant;
    const vue: ContractVariantView = { structure: '' };
    const parts: ExpandedVariantView = {
      structure, typography, composes: composed, icons: iconPlacements, paintPlacements: paints,
    };
    vue.structure = ranger(structures, parts.structure) ?? '';
    vue.typography = ranger(typographies, parts.typography);
    vue.composes = ranger(composes, parts.composes);
    vue.icons = ranger(icons, parts.icons);
    vue.paintPlacements = ranger(paintPlacements, parts.paintPlacements);
    // La VUE reste dédupliquée elle aussi : deux variants qui rendent la même
    // chose partagent un jeu de renvois identique, donc une seule entrée.
    const view = intern(elideNeutrals(vue), 'v', viewIds, variantViews);
    // `sample` est déstructuré à part et catalogué à part : le laisser dans la
    // vue ferait diverger deux variants au rendu identique dès que leur contenu
    // de maquette diffère, et le laisser dans le reste le recopierait en clair
    // sur chaque variant.
    const bindings = bindingsByVariant.get(variant.nodeId);
    const sampleId = sample && Object.keys(sample).length > 0
      ? intern(sample, 's', sampleIds, samples)
      : null;
    return {
      ...identity,
      ...(tokens && Object.keys(tokens).length > 0 ? { tokens } : {}),
      ...(strokes && Object.keys(strokes).length > 0 ? { strokes } : {}),
      view,
      ...(bindings && bindings.length > 0 ? { bindings: bindings.map(raccourcir) } : {}),
      ...(sampleId ? { sample: sampleId } : {}),
    };
  });

  return {
    variants,
    variantViews,
    viewStructures: structures.entries,
    viewTypographies: typographies.entries,
    viewComposes: composes.entries,
    viewIcons: icons.entries,
    viewPaintPlacements: paintPlacements.entries,
    propertyBindingDefinitions,
    samples,
  };
}
