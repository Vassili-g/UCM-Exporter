/**
 * Reconnaissance des composants unifiés imbriqués — le socle de la composition.
 *
 * Un composé (une Alert et son bouton d'action) embarque des INSTANCES de
 * composants qui possèdent déjà leur propre contrat. Descendre dans leurs
 * calques ferait décrire au composé les internes d'un autre : ses slots, ses
 * dimensions, jusqu'à ses props. Un composé ne liste donc que SES tokens, et
 * déclare les autres comme dépendances.
 *
 * Tout COMPONENT ou COMPONENT_SET peut être exporté depuis la 8.0, mais cela
 * ne suffit pas à en faire une dépendance UCM. Le conteneur `<Nom>-Rules` reste
 * le marqueur documentaire qui dit qu'un contrat autonome existe : sans lui,
 * un component set peut n'être qu'un wrapper ou un détail d'implémentation du
 * composant parent.
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
  /**
   * Ce que le parcours n'a pas su lire, et qui coûte au contrat. Une seule
   * chose entre ici : une instance dont le composant maître est illisible,
   * donc qu'aucun relevé ne peut reconnaître comme dépendance.
   */
  warnings: string[];
};

/** Relevé de toute la matrice, avec ses éventuels écarts entre variants. */
export type ComposedMatrixScan = ComposedInstancesScan & {
  /**
   * Écarts entre variants que le schéma courant ne doit jamais taire.
   *
   * Ce sont des NOTES, pas des avertissements : le texte dit lui-même que les
   * arbres exacts conservent ces compositions et que `composes` en publie
   * l'union. Rien ne manque, aucun geste n'est demandé, et les ranger dans le
   * canal des points à corriger produirait un titre que leur propre phrase
   * dément.
   */
  infos: string[];
};

/**
 * Relève en UNE fois les composants unifiés déclarés sur la page.
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
 * Indexe les contrats du document entier, pas seulement la page courante.
 *
 * En chargement dynamique Figma, les autres pages doivent être chargées avant
 * leur parcours. Le repli sur `currentPage` garde les tests et les anciens
 * runtimes fonctionnels sans réduire la portée dans un document moderne.
 */
export async function indexContractedNamesInDocument(): Promise<Set<string>> {
  if (typeof figma.loadAllPagesAsync === 'function') await figma.loadAllPagesAsync();
  const pages = (figma.root.children ?? []).filter(
    (node): node is PageNode => node.type === 'PAGE',
  );
  if (pages.length === 0) pages.push(figma.currentPage);

  const names = new Set<string>();
  for (const page of pages) {
    for (const name of indexContractedNames(page)) names.add(name);
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
  warnings: string[],
): Promise<string | null> {
  // `getMainComponentAsync` lève sur une instance orpheline : un node cassé ne
  // doit pas faire échouer l'export entier. Il ne doit pas non plus disparaître.
  // Sans ce nom, l'instance n'entre pas dans `composed` ; `getAllNodes` cesse
  // alors de l'élaguer, et le contrat publie les internes du voisin comme les
  // siens — ses calques en slots, ses couleurs dans ses tokens — pendant que la
  // dépendance manque à `composes`. Le relevé ne l'ayant jamais trouvée, même
  // l'avertissement « dépendance non située » ne peut pas partir : c'est ici,
  // ou nulle part.
  const main = await instance.getMainComponentAsync().catch(() => null);
  if (!main) {
    warnings.push(
      `Layer « ${instance.name} » : le composant qu'il instancie est introuvable. `
        + `L'export ne peut pas reconnaître une dépendance derrière ce layer. Si ce `
        + `composant a son propre contrat, le contrat en cours publiera ses layers parmi `
        + `ses propres slots et ses couleurs parmi ses propres tokens, sans le déclarer `
        + `dans « composes ». Restaurez le composant principal de cette instance, puis `
        + `réexportez.`,
    );
    return null;
  }

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
  // `getMainComponentAsync` est un aller-retour par instance. Les enchaîner en
  // série coûtait, sur un set de trente variants portant chacun ses instances,
  // autant d'allers-retours consécutifs — et l'UI du plugin est mono-thread.
  // Les lancer ensemble ne change RIEN au résultat : l'ordre de `composes`
  // vient de `instances`, qui reste l'ordre du document.
  // Chaque lecture écrit dans SA propre liste : `Promise.all` ne garantit aucun
  // ordre d'exécution, et un tableau partagé rendrait l'ordre des messages
  // dépendant de la latence du réseau. Les listes sont ensuite concaténées dans
  // l'ordre de `instances`, qui est celui du document.
  const lectures = await Promise.all(
    instances.map(async (instance) => {
      const warnings: string[] = [];
      const owner = await contractedOwnerName(instance, contracted, warnings);
      return { owner, warnings };
    }),
  );
  const owners = lectures.map((lecture) => lecture.owner);
  const warnings = lectures.flatMap((lecture) => lecture.warnings);
  const ownerByInstance = new Map<InstanceNode, string>();
  instances.forEach((instance, index) => {
    const owner = owners[index];
    if (owner) ownerByInstance.set(instance, owner);
  });

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

  return { composes, composed, warnings };
}

/**
 * Étend le relevé à TOUS les variants du Component Set.
 *
 * Chaque variant porte ses propres instances, avec leurs propres ids : élaguer
 * d'après le seul variant de référence ne protégerait que celui-là, et les
 * autres continueraient d'aspirer les couleurs du composant embarqué.
 *
 * `structure.children` décrit le variant de référence ; chaque entrée de
 * `variants` porte son arbre et ses dépendances exactes.
 * Une composition différente produit donc une notice de compatibilité ; le
 * champ global `composes` sera ensuite agrégé depuis ces vues exactes.
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
  const infos = divergentVariants.length > 0
    ? [
      `Composition différente sur ${divergentVariants.length} variant(s), ex. ${examples}` +
        `${remaining > 0 ? ` (+${remaining})` : ''} : le contrat décrit le variant de ` +
        `référence « ${roots[0]?.name ?? 'inconnu'} ». Les arbres exacts de « variants » ` +
        `conservent ces compositions différentes ; le champ global « composes » en publie ` +
        `l'union ordonnée, tandis que « structure » reste la vue historique de référence.`,
    ]
    : [];

  // Une instance orpheline vit dans TOUS les variants du set, et chaque scan la
  // relève avec le même texte. Le message porte le nom du layer, jamais celui
  // du variant : le dédoublonnage rend donc exactement un constat par layer.
  const warnings = Array.from(new Set(scans.flatMap((scan) => scan.warnings)));

  return { composes: scans[0]?.composes ?? [], composed, warnings, infos };
}
