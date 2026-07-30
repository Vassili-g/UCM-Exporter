/**
 * Reconnaissance des composants unifiés imbriqués — le socle de la composition.
 *
 * Un composé (une Alert et son bouton d'action) embarque des INSTANCES de
 * composants qui possèdent déjà leur propre contrat. Descendre dans leurs
 * calques ferait décrire au composé les internes d'un autre : ses slots, ses
 * dimensions, jusqu'à ses props. Un composé ne liste donc que SES tokens, et
 * déclare les autres comme dépendances.
 *
 * Le critère de reconnaissance est celui que le plugin s'applique déjà à
 * lui-même pour autoriser un export : un composant est unifié s'il possède un
 * conteneur « <Nom>-Rules » sur la page (cf. `extractRules`). Aucune liste de
 * noms n'est tenue nulle part, donc aucune règle liée à un composant précis.
 */
import { compactName, RULES_CONTAINER_TYPES, RULES_SECTION_SUFFIX } from './extractRules';
import { getAllNodes, hasAncestorIn } from './exportableNodes';
import { normalizePropKey } from './parsers';
import type { ComposedDependency } from './types';

/** Noms compactés des composants qui possèdent leur propre contrat. */
export type ContractedNames = ReadonlySet<string>;

/** Ce que le parcours d'un composé apprend sur ses dépendances. */
export type ComposedScan = {
  /** Les dépendances directes, dans l'ordre des calques. */
  composes: ComposedDependency[];
  /**
   * TOUTES les instances contractées rencontrées, y compris imbriquées les
   * unes dans les autres : c'est ce relevé qui sert à élaguer le parcours.
   */
  composed: Map<string, string>;
};

/**
 * Relève en UNE fois les composants contractés de la page.
 *
 * `extractRules` balaye la page entière pour un seul nom ; refaire ce balayage
 * à chaque instance imbriquée serait quadratique. L'index est donc construit
 * une fois, et l'appartenance se teste ensuite en temps constant.
 *
 * @example indexContractedNames(page) // page portant « Button-Rules »
 * // → Set { 'button' }
 */
export function indexContractedNames(page: PageNode): Set<string> {
  const containers = page.findAll(
    (node) =>
      RULES_CONTAINER_TYPES.includes(node.type) && node.name.trim().endsWith(RULES_SECTION_SUFFIX),
  );

  const names = new Set<string>();
  for (const container of containers) {
    const compacted = compactName(container.name.trim().slice(0, -RULES_SECTION_SUFFIX.length));
    if (compacted) names.add(compacted);
  }
  return names;
}

/**
 * Nom du composant unifié dont une instance est une occurrence, ou null.
 * Un variant appartient à son Component Set : c'est le SET qui porte le nom
 * contracté, jamais le variant (« Size=Big ») pris isolément.
 */
async function contractedOwnerName(
  instance: InstanceNode,
  contracted: ContractedNames,
): Promise<string | null> {
  // `getMainComponentAsync` lève sur une instance orpheline : un node cassé ne
  // doit pas faire échouer l'export entier.
  const main = await instance.getMainComponentAsync().catch(() => null);
  if (!main) return null;

  const owner = main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
  return contracted.has(compactName(owner.name)) ? owner.name : null;
}

/**
 * Sépare, dans un variant, ce qui lui appartient de ce qui appartient aux
 * composants qu'il embarque.
 *
 * Chaque instance donne SA propre entrée, sans regroupement par nom de
 * composant : deux boutons d'un même Card ont des calques et des props de
 * visibilité distincts, et les fondre en une ligne en perdrait un.
 *
 * L'élagage ne produit aucun avertissement : rien n'est perdu, et `composes`
 * en est déjà la trace écrite dans le contrat.
 */
export async function scanComposedInstances(
  root: SceneNode,
  contracted: ContractedNames,
): Promise<ComposedScan> {
  // Le parcours passe par `getAllNodes` comme toutes les autres extractions :
  // un sous-arbre statiquement masqué ne fournit ni tokens, ni slots, ni
  // wrapper — il ne fournit pas non plus de dépendance. Ses avertissements
  // sont jetés ici, car les extractions suivantes les produiront sur le même
  // arbre ; les collecter deux fois ne ferait que des doublons.
  // `getAllNodes` renvoie aussi la racine : un composant ne se déclare pas
  // comme sa propre dépendance.
  const instances = getAllNodes(root, []).filter(
    (node): node is InstanceNode => node !== root && node.type === 'INSTANCE',
  );

  // Deux passes : savoir si une instance est imbriquée dans une autre suppose
  // de connaître d'abord toutes les dépendances du sous-arbre.
  const ownerByInstance = new Map<InstanceNode, string>();
  for (const instance of instances) {
    const owner = await contractedOwnerName(instance, contracted);
    if (owner) ownerByInstance.set(instance, owner);
  }

  const composed = new Map(
    Array.from(ownerByInstance, ([instance, component]) => [instance.id, component] as const),
  );
  const composes: ComposedDependency[] = [];

  for (const [instance, component] of ownerByInstance) {
    // Une dépendance d'une dépendance relève du contrat de cette dernière.
    if (hasAncestorIn(instance, root, composed)) continue;

    const dependency: ComposedDependency = { component, figmaLayer: instance.name };
    const visibility = instance.componentPropertyReferences?.visible;
    if (visibility) dependency.visibilityProp = normalizePropKey(visibility);
    composes.push(dependency);
  }

  return { composes, composed };
}

/**
 * Étend le relevé à TOUS les variants du Component Set.
 *
 * Chaque variant porte ses propres instances, avec leurs propres ids : élaguer
 * d'après le seul variant de référence ne protégerait que celui-là, et les
 * autres continueraient d'aspirer les couleurs du composant embarqué. Les
 * dépendances déclarées viennent en revanche du variant de référence seul —
 * elles ne changent pas d'un variant à l'autre, et les répéter ferait autant
 * d'entrées `composes` que de variants.
 */
export async function scanComposedMatrix(
  variants: readonly SceneNode[],
  reference: SceneNode | null,
  contracted: ContractedNames,
): Promise<ComposedScan> {
  const roots = reference && !variants.includes(reference) ? [reference, ...variants] : variants;
  const scans = await Promise.all(roots.map((root) => scanComposedInstances(root, contracted)));

  const composed = new Map<string, string>();
  for (const scan of scans) {
    for (const [id, component] of scan.composed) composed.set(id, component);
  }

  const referenceIndex = reference ? roots.indexOf(reference) : -1;
  return {
    composes: referenceIndex >= 0 ? scans[referenceIndex].composes : [],
    composed,
  };
}
