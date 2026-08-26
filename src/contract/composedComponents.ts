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
import { findWrapperReference } from './componentTree';
import { getAllNodes, hasAncestorIn } from './exportableNodes';
import { normalizePropKey } from './parsers';
import { buildContractPropertySurface } from './propertySurface';
import type { ContractPropertySurface } from './propertySurface';
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
  /**
   * Composant maître de CHAQUE instance rencontrée, contractée ou non.
   *
   * `contractedOwner` interroge déjà `getMainComponentAsync` sur toutes les
   * instances du sous-arbre ; jeter le node pour n'en garder qu'un nom
   * obligerait tout autre lecteur à refaire les mêmes allers-retours, sur le
   * fil unique de l'UI. Cette carte reste interne : rien n'en sort dans le
   * contrat.
   */
  mainByInstanceId: Map<string, ComponentNode>;
};

/**
 * Ce qu'un composant maître place à chaque position de son propre arbre :
 * chemin d'index (« 0.2.1 ») → nom du calque dans le maître et composant qui
 * s'y trouve par défaut.
 *
 * Le chemin d'INDEX est la clé, jamais le nom : Figma interdit d'ajouter, de
 * retirer ou de réordonner un calque dans une instance, si bien que la position
 * y est isomorphe à celle du maître — alors que le nom, lui, suit le composant
 * dès qu'on remplace une instance, c'est-à-dire exactement dans le cas qu'on
 * cherche à reconnaître.
 */
export type MasterInstanceDefaults = ReadonlyMap<
  string,
  { masterPath: string[]; component: string }
>;

/** Relevé des maîtres, indexé par l'id du composant maître d'une dépendance. */
export type SwapDefaults = ReadonlyMap<string, MasterInstanceDefaults>;

/** Surface publique d'un owner contracté, avec la source wrapper autorisée. */
export type DependencyPropertySurface = ContractPropertySurface & {
  /** Owner Figma du seul wrapper élu ; absent quand le composant est plat. */
  wrapperOwnerId?: string;
};

/** Surfaces indexées par l'id du Component ou Component Set propriétaire. */
export type DependencyPropertySurfaces = ReadonlyMap<string, DependencyPropertySurface>;

/** Relevé de toute la matrice, avec ses éventuels écarts entre variants. */
export type ComposedMatrixScan = ComposedInstancesScan & {
  /**
   * Ce que chaque composant maître de dépendance contient par défaut, pour que
   * l'échantillon reconnaisse un remplacement SANS refaire d'aller-retour
   * asynchrone. Cf. `MasterInstanceDefaults`.
   */
  swapDefaults: SwapDefaults;
  /** Même surface publique que lors de l'export autonome de chaque dépendance. */
  propertySurfaces: DependencyPropertySurfaces;
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
async function contractedOwner(
  instance: InstanceNode,
  contracted: ContractedNames,
  warnings: string[],
): Promise<{ name: string | null; main: ComponentNode | null }> {
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
    return { name: null, main: null };
  }

  const owner = main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
  return { name: contracted.has(compactName(owner.name)) ? owner.name : null, main };
}

/** Nom du composant unifié derrière un maître : celui du SET quand il existe. */
export function ownerComponentName(main: ComponentNode): string {
  return main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name;
}

/** Une instance rencontrée dans un maître, avec sa position et son nom de calque. */
type MasterInstance = { indexPath: string; masterPath: string[]; instance: InstanceNode };

/**
 * Toutes les instances d'un sous-arbre, avec leur chemin d'index ET leur chemin
 * de noms, dans l'ordre du document.
 *
 * Le parcours descend par `children` plutôt que par `findAll` parce que c'est
 * la POSITION qui l'intéresse : `findAll` aplatit l'arbre et perdrait l'indice
 * de chaque enfant, seule clé qu'une instance et son maître partagent.
 */
function masterInstances(root: SceneNode): MasterInstance[] {
  const found: MasterInstance[] = [];
  const stack: Array<{
    node: SceneNode;
    indexes: readonly number[];
    names: readonly string[];
  }> = [{ node: root, indexes: [], names: [] }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    if (current.node !== root && current.node.type === 'INSTANCE') {
      found.push({
        indexPath: current.indexes.join('.'),
        masterPath: [...current.names],
        instance: current.node,
      });
    }
    // Le contenu d'un SLOT est libre : il n'est pas isomorphe au maître et ne
    // peut donc participer à aucune comparaison positionnelle fiable.
    if (current.node.type === 'SLOT') continue;
    const children = 'children' in current.node ? current.node.children : [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      stack.push({
        node: child,
        indexes: [...current.indexes, index],
        names: [...current.names, child.name],
      });
    }
  }
  return found;
}

/** Le Component ou Component Set qui possède l'API publique d'un maître. */
function componentOwner(main: ComponentNode): ComponentNode | ComponentSetNode {
  return main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
}

/**
 * Construit une surface par owner, depuis son variant de référence.
 *
 * Trente occurrences ou variants d'une même dépendance ne relancent donc ni
 * l'élection du wrapper ni la construction du modèle. Les avertissements sont
 * volontairement jetés : ils appartiennent à l'export autonome de cet owner.
 */
async function indexDependencyPropertySurfaces(
  mains: readonly ComponentNode[],
  contracted: ContractedNames,
): Promise<Map<string, DependencyPropertySurface>> {
  const representatives = new Map<string, {
    owner: ComponentNode | ComponentSetNode;
    component: ComponentNode;
  }>();
  for (const main of mains) {
    const owner = componentOwner(main);
    if (representatives.has(owner.id)) continue;
    const component = owner.type === 'COMPONENT_SET'
      ? owner.defaultVariant ?? main
      : owner;
    representatives.set(owner.id, { owner, component });
  }

  const entries = await Promise.all(Array.from(representatives, async ([ownerId, entry]) => {
    const nested = await scanComposedInstances(entry.component, contracted);
    const wrapper = await findWrapperReference(entry.component, [], nested.composed);
    const surface: DependencyPropertySurface = {
      ...buildContractPropertySurface(
        entry.owner.componentPropertyDefinitions ?? {},
        wrapper?.componentSet?.componentPropertyDefinitions,
        [],
      ),
      ...(wrapper?.componentSet ? { wrapperOwnerId: wrapper.componentSet.id } : {}),
    };
    return [ownerId, surface] as const;
  }));
  return new Map(entries);
}

/**
 * Ce qu'un composant maître place à chaque position, dépendances exclues.
 *
 * Le relevé s'arrête sur une instance contractée, exactement comme
 * `getAllNodes` élague le parcours du contrat : ce qu'une dépendance de la
 * dépendance contient appartient à SON contrat, et le comparer ici rangerait
 * une trouvaille sous un propriétaire qui ne la porte pas.
 */
export async function indexMasterInstances(
  master: ComponentNode,
  contracted: ContractedNames,
): Promise<MasterInstanceDefaults> {
  const releves = masterInstances(master);
  const mains = await Promise.all(
    releves.map((releve) => releve.instance.getMainComponentAsync().catch(() => null)),
  );

  const defauts = new Map<string, { masterPath: string[]; component: string }>();
  const frontieres = new Set<string>();
  releves.forEach((releve, index) => {
    const segments = releve.indexPath.split('.');
    let prefix = segments[0] ?? '';
    for (let depth = 1; depth < segments.length; depth += 1) {
      if (frontieres.has(prefix)) return;
      prefix += `.${segments[depth]}`;
    }
    const main = mains[index];
    // Un maître illisible est déjà signalé là où il compte, sur le document
    // exporté. Ici son absence retire seulement une position du relevé : aucune
    // comparaison ne s'y fera, donc aucun remplacement ne sera inventé.
    if (!main) return;
    const component = ownerComponentName(main);
    if (contracted.has(compactName(component))) {
      frontieres.add(releve.indexPath);
      return;
    }
    defauts.set(releve.indexPath, { masterPath: releve.masterPath, component });
  });
  return defauts;
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
      const { name, main } = await contractedOwner(instance, contracted, warnings);
      return { owner: name, main, warnings };
    }),
  );
  const owners = lectures.map((lecture) => lecture.owner);
  const warnings = lectures.flatMap((lecture) => lecture.warnings);
  const mainByInstanceId = new Map<string, ComponentNode>();
  instances.forEach((instance, index) => {
    const main = lectures[index]?.main;
    if (main) mainByInstanceId.set(instance.id, main);
  });
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

  return { composes, composed, warnings, mainByInstanceId };
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
  const mainByInstanceId = new Map<string, ComponentNode>();
  for (const scan of scans) {
    for (const [id, dependency] of scan.composed) composed.set(id, dependency);
    // Les ids de node sont uniques par variant : la fusion ne peut pas écraser
    // la lecture d'un autre variant par celle d'un homonyme.
    for (const [id, main] of scan.mainByInstanceId) mainByInstanceId.set(id, main);
  }

  // Les maîtres se relèvent une fois pour toute la matrice, et une seule fois
  // par maître : trente variants qui embarquent le même Button ne coûtent qu'un
  // parcours. C'est aussi ce qui garde `extractSamples` synchrone — un module
  // pur qui n'attend rien ne peut pas ordonner ses trouvailles au hasard des
  // allers-retours.
  const maitres = new Map<string, ComponentNode>();
  for (const id of composed.keys()) {
    const main = mainByInstanceId.get(id);
    if (main) maitres.set(main.id, main);
  }
  const relevesMaitres = await Promise.all(
    Array.from(maitres.values(), async (main) => [
      main.id,
      await indexMasterInstances(main, contracted),
    ] as const),
  );
  const swapDefaults = new Map(relevesMaitres);
  const propertySurfaces = await indexDependencyPropertySurfaces(
    Array.from(maitres.values()),
    contracted,
  );

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
      `Composition différente sur ${divergentVariants.length} `
      + `variant${divergentVariants.length > 1 ? 's' : ''}, ex. ${examples}` +
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

  return {
    composes: scans[0]?.composes ?? [],
    composed,
    warnings,
    infos,
    mainByInstanceId,
    swapDefaults,
    propertySurfaces,
  };
}
