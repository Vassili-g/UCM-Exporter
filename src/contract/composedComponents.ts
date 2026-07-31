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
import { compactName, rulesContainerOwner } from './extractRules';
import { getAllNodes, hasAncestorIn } from './exportableNodes';
import { normalizePropKey } from './parsers';
import type { ComposedDependency } from './types';

/** Noms compactés des composants qui possèdent leur propre contrat. */
export type ContractedNames = ReadonlySet<string>;

/** Ce que le parcours d'un variant apprend sur ses dépendances. */
type ComposedInstancesScan = {
  /** Les dépendances directes, dans l'ordre des calques. */
  composes: ComposedDependency[];
  /**
   * TOUTES les instances contractées rencontrées, y compris imbriquées les
   * unes dans les autres : c'est ce relevé qui sert à élaguer le parcours.
  */
  composed: Map<string, ComposedDependency>;
};

/** Relevé de toute la matrice, avec ses éventuels écarts entre variants. */
export type ComposedMatrixScan = ComposedInstancesScan & {
  /** Écarts entre variants que le schéma courant ne doit jamais taire. */
  warnings: string[];
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
  const names = new Set<string>();
  for (const container of page.findAll((node) => rulesContainerOwner(node) !== null)) {
    const owner = rulesContainerOwner(container);
    if (owner) names.add(owner);
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
): Promise<ComposedInstancesScan> {
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

  const dependencyByInstance = new Map<InstanceNode, ComposedDependency>();
  for (const [instance, component] of ownerByInstance) {
    const dependency: ComposedDependency = { component, figmaLayer: instance.name };
    const visibility = instance.componentPropertyReferences?.visible;
    if (visibility) dependency.visibilityProp = normalizePropKey(visibility);
    dependencyByInstance.set(instance, dependency);
  }

  const composed = new Map(
    Array.from(dependencyByInstance, ([instance, dependency]) => [instance.id, dependency] as const),
  );
  const composes: ComposedDependency[] = [];
  for (const [instance, dependency] of dependencyByInstance) {
    // Une dépendance d'une dépendance relève du contrat de cette dernière.
    if (hasAncestorIn(instance, root, composed)) continue;
    composes.push(dependency);
  }

  return { composes, composed };
}

/**
 * Étend le relevé à TOUS les variants du Component Set.
 *
 * Chaque variant porte ses propres instances, avec leurs propres ids : élaguer
 * d'après le seul variant de référence ne protégerait que celui-là, et les
 * autres continueraient d'aspirer les couleurs du composant embarqué.
 *
 * `structure.children` décrit le variant de référence. `composes` doit donc
 * décrire exactement le même variant pour que les deux champs ne se
 * contredisent jamais. Une composition différente ailleurs dans la matrice
 * produit un warning : le schéma courant ne sait pas représenter un slot
 * composé qui apparaît ou disparaît selon un axe.
 */
export async function scanComposedMatrix(
  variants: readonly SceneNode[],
  reference: SceneNode | null,
  contracted: ContractedNames,
): Promise<ComposedMatrixScan> {
  const roots = reference
    ? [reference, ...variants.filter((variant) => variant !== reference)]
    : variants;
  const scans = await Promise.all(roots.map((root) => scanComposedInstances(root, contracted)));

  const composed = new Map<string, ComposedDependency>();
  for (const scan of scans) {
    for (const [id, dependency] of scan.composed) composed.set(id, dependency);
  }

  const signature = (dependency: ComposedDependency) =>
    [dependency.component, dependency.figmaLayer, dependency.visibilityProp ?? ''].join('\u0000');
  const sequences = scans.map((scan) => scan.composes.map(signature));
  const referenceSequence = JSON.stringify(sequences[0] ?? []);
  const divergentVariants = roots.filter(
    (_, index) => JSON.stringify(sequences[index]) !== referenceSequence,
  );
  const examples = divergentVariants
    .slice(0, 3)
    .map((root) => `« ${root.name} »`)
    .join(', ');
  const remaining = divergentVariants.length - 3;
  const warnings = divergentVariants.length > 0
    ? [
      `Composition différente sur ${divergentVariants.length} variant(s), ex. ${examples}` +
        `${remaining > 0 ? ` (+${remaining})` : ''} : le contrat décrit le variant de ` +
        `référence « ${roots[0]?.name ?? 'inconnu'} ». Harmonisez la composition Figma ` +
        'entre les variants ou séparez-les en composants distincts.',
    ]
    : [];

  return { composes: scans[0]?.composes ?? [], composed, warnings };
}
