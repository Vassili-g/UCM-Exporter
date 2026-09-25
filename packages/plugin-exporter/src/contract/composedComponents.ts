/**
 * Reconnaissance des composants unifiés imbriqués : le socle de la composition.
 *
 * Un composé (une Alert et son bouton d'action) embarque des instances de
 * composants qui possèdent déjà leur propre contrat. Descendre dans leurs
 * calques ferait décrire au composé les internes d'un autre : ses slots, ses
 * dimensions, jusqu'à ses props. Un composé ne liste donc que ses tokens, et
 * déclare les autres comme dépendances.
 *
 * Tout COMPONENT ou COMPONENT_SET peut être exporté depuis la 8.0, mais cela
 * ne suffit pas à en faire une dépendance UCM. Une instance de
 * `.componentRules` qui écrit son nom reste le marqueur documentaire qui dit
 * qu'un contrat autonome existe : sans elle, un component set peut n'être qu'un
 * wrapper ou un détail d'implémentation du composant parent.
 */
import {
  COMPONENT_NAME_LAYER,
  compactName,
  porteLeMarqueur,
  porteLeNom,
  rulesContainerOwner,
} from './extractRules';
import { findWrapperReference } from './componentTree';
import { getAllNodes, hasAncestorIn } from './exportableNodes';
import { normalizePropKey } from './parsers';
import { buildContractPropertySurface } from './propertySurface';
import type { ContractPropertySurface } from './propertySurface';
import type { ComposedDependency } from '@ucm-kit/core/format';
import { pousserLocalise, reporterLocalisations } from './localisation';
import { compter } from './mesure';
import { maitreDe, respirerSiBesoin } from './porteeDAnalyse';

/** Noms compactés des composants qui possèdent leur propre contrat. */
export type ContractedNames = ReadonlySet<string>;

/** Ce que le parcours d'un variant apprend sur ses dépendances. */
type ComposedInstancesScan = {
  /** Les dépendances directes, dans l'ordre des calques. */
  composes: ComposedDependency[];
  /**
   * Toutes les instances contractées rencontrées, y compris imbriquées les
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
   * Composant maître de chaque instance rencontrée, contractée ou non.
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
 * Le chemin d'index est la clé, jamais le nom : Figma interdit d'ajouter, de
 * retirer ou de réordonner un calque dans une instance, si bien que la position
 * y est isomorphe à celle du maître, alors que le nom, lui, suit le composant
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
   * l'échantillon reconnaisse un remplacement sans refaire d'aller-retour
   * asynchrone. Cf. `MasterInstanceDefaults`.
   */
  swapDefaults: SwapDefaults;
  /** Même surface publique que lors de l'export autonome de chaque dépendance. */
  propertySurfaces: DependencyPropertySurfaces;
};

/**
 * Les noms que les conteneurs de règles d'une page écrivent.
 *
 * `extractRules` balaye la page entière pour un seul nom ; refaire ce balayage
 * à chaque instance imbriquée serait quadratique. La page est donc relevée une
 * fois, et l'appartenance se teste ensuite en temps constant.
 *
 * Le relevé ne descend pas dans les calques masqués d'une instance (D4) : un
 * calque `component-name` masqué dans une instance ne déclare rien. Le drapeau
 * reprend sa valeur d'avant, et le relevé est synchrone de bout en bout :
 * `calquesDeNomDeComposant` et `proprietaireDuCalque` n'attendent rien.
 *
 * La page doit être chargée avant l'appel.
 *
 * @example nomsDeLaPage(page) // page où un `.componentRules` dit « Button »
 * // → Set { 'button' }
 */
export function nomsDeLaPage(page: PageNode): Set<string> {
  const avant = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = true;
  try {
    const names = new Set<string>();
    for (const calque of calquesDeNomDeComposant(page)) {
      const owner = proprietaireDuCalque(calque);
      if (owner) names.add(owner);
    }
    return names;
  } finally {
    figma.skipInvisibleInstanceChildren = avant;
  }
}

/**
 * Les calques « component-name » de la page.
 *
 * Le filtre par type est natif, et il remplace un prédicat JavaScript évalué
 * sur chaque node. Le repli garde les tests et les runtimes qui ne servent pas
 * `findAllWithCriteria`.
 */
function calquesDeNomDeComposant(page: PageNode): TextNode[] {
  const parCriteres = (page as Partial<PageNode>).findAllWithCriteria;
  if (typeof parCriteres === 'function') compter('appelsFindAllWithCriteria');
  const textes = typeof parCriteres === 'function'
    ? (parCriteres.call(page, { types: ['TEXT'] }) as TextNode[])
    : (page.findAll((node) => node.type === 'TEXT') as TextNode[]);
  return textes.filter((calque) => porteLeNom(calque, COMPONENT_NAME_LAYER));
}

/**
 * Nom compacté du composant qu'un calque « component-name » documente, ou null.
 *
 * Le calque doit vivre dans une instance. Le maître `.componentRules` porte le
 * même calque, pré-rempli avec le nom du composant qui a servi de modèle, et
 * revendiquerait les règles d'un composant qu'il ne documente pas : le premier
 * ancêtre qui tranche gagne, et un maître l'emporte donc sur rien.
 *
 * Partir du calque plutôt que de l'instance évite le parcours complet du
 * sous-arbre de chaque instance de la page, que le prédicat d'un `findAll`
 * imposait. Le résultat est le même : dans une instance imbriquée, le calque
 * remonte à l'instance la plus proche, qui écrit le même nom que celle du
 * dessus.
 */
function proprietaireDuCalque(calque: TextNode): string | null {
  try {
    // La remontée s'arrête à la page : Figma interdit un `COMPONENT` dans une
    // instance, donc un calque qui atteint la page sans rencontrer d'instance
    // appartient au maître, ou à un dessin quelconque.
    let parent: BaseNode | null = calque.parent;
    while (parent && parent.type !== 'INSTANCE' && parent.type !== 'PAGE') parent = parent.parent;
    if (parent?.type !== 'INSTANCE') return null;
    const nom = calque.characters;
    if (porteLeMarqueur(nom)) return null;
    return compactName(nom) || null;
  } catch {
    // Figma annonce des nodes qu'il ne sert plus : un calque illisible ne
    // déclare aucune dépendance, et n'emporte pas l'index de la page.
    return null;
  }
}

/** Ce que l'index garde d'une page balayée. */
type EntreeDePage = { noms: ReadonlySet<string>; sale: boolean; ecoutee: boolean };

/**
 * Les pages balayées pendant la session, par id de page.
 *
 * Une entrée n'est reprise que propre et écoutée. Un `nodechange` de sa page
 * la salit, et une page dont l'abonnement est refusé se rebalaye à chaque
 * calcul : mieux vaut rebalayer que servir des noms périmés.
 */
let pagesGardees = new Map<unknown, EntreeDePage>();

/** Le dernier calcul lancé : le suivant l'attend, puis relit la mémoire des pages. */
let calculEnVol: Promise<unknown> = Promise.resolve();

export type OptionsDeLIndex = {
  /** Attendu avant de charger et de balayer une page. */
  avantChaquePage?: () => Promise<void>;
  /** `analyse` quand un designer attend le résultat, `fond` pour un préchauffage. */
  priorite?: 'fond' | 'analyse';
};

/**
 * Les noms compactés des composants contractés que les variants rencontrent.
 *
 * Un propriétaire, component set ou composant seul, est contracté s'il est
 * local et qu'un conteneur de sa propre page écrit son nom (D1). Un
 * propriétaire distant ne l'est jamais : ses règles vivent dans le fichier de
 * sa bibliothèque.
 *
 * Le calcul part des instances, jamais du document, et procède par tours : les
 * instances rendues des variants, puis, pour chaque propriétaire contracté,
 * toutes les instances de son maître et les instances rendues de son variant
 * représentatif, que `indexMasterInstances` et `indexDependencyPropertySurfaces`
 * parcourront. Il s'arrête quand un tour n'ajoute aucun propriétaire. Seules
 * les pages des propriétaires sont chargées.
 *
 * Le résultat reste indexé par nom : deux composants homonymes sur deux pages
 * partagent leur verdict. Un seul calcul court à la fois ; un appel qui arrive
 * pendant un calcul l'attend, puis rebalaye les pages salies entre-temps.
 * Un `loadAsync` qui lève fait échouer le calcul : une page ignorée en silence
 * retirerait des noms de l'index.
 */
export function indexContractedNames(
  variants: readonly SceneNode[],
  options: OptionsDeLIndex = {},
): Promise<Set<string>> {
  const calcul = calculEnVol
    .catch(() => undefined)
    .then(() => calculerLIndex(variants, options));
  calculEnVol = calcul;
  return calcul;
}

type Proprietaire = ComponentNode | ComponentSetNode;

async function calculerLIndex(
  variants: readonly SceneNode[],
  options: OptionsDeLIndex,
): Promise<Set<string>> {
  const contractes = new Set<string>();
  const juges = new Set<unknown>();
  const nomsParPage = new Map<unknown, ReadonlySet<string>>();
  let instances = variants.flatMap(instancesRendues);
  while (instances.length > 0) {
    const maitres = await Promise.all(instances.map(maitreDe));
    const nouveaux: Array<{ proprietaire: Proprietaire; maitre: ComponentNode }> = [];
    for (const maitre of maitres) {
      if (!maitre) continue;
      const proprietaire = componentOwner(maitre);
      const cle = typeof proprietaire.id === 'string' ? proprietaire.id : proprietaire;
      if (juges.has(cle)) continue;
      juges.add(cle);
      nouveaux.push({ proprietaire, maitre });
    }

    instances = [];
    for (const { proprietaire, maitre } of nouveaux) {
      if (proprietaire.remote === true || maitre.remote === true) continue;
      const page = pageDe(proprietaire);
      if (!page) continue;
      const cleDePage = cleDeLaPage(page);
      let noms = nomsParPage.get(cleDePage);
      if (!noms) {
        noms = await nomsGardesDeLaPage(page, options);
        nomsParPage.set(cleDePage, noms);
      }
      const nom = compactName(proprietaire.name);
      if (!noms.has(nom)) continue;
      contractes.add(nom);
      instances.push(...toutesLesInstances(maitre));
      const representatif = proprietaire.type === 'COMPONENT_SET'
        ? proprietaire.defaultVariant ?? maitre
        : proprietaire;
      if (representatif !== maitre) instances.push(...instancesRendues(representatif));
    }
  }
  compter('tailleIndex', contractes.size);
  return contractes;
}

/** Les instances qu'un parcours du contrat rencontre sous la racine. */
function instancesRendues(racine: SceneNode): InstanceNode[] {
  return getAllNodes(racine).filter(
    (node): node is InstanceNode => node !== racine && node.type === 'INSTANCE',
  );
}

/** Toutes les instances sous la racine, masquées comprises. */
function toutesLesInstances(racine: SceneNode): InstanceNode[] {
  if (!('findAll' in racine)) return [];
  const parCriteres = (racine as Partial<ChildrenMixin>).findAllWithCriteria;
  if (typeof parCriteres === 'function') {
    compter('appelsFindAllWithCriteria');
    return parCriteres.call(racine, { types: ['INSTANCE'] }) as InstanceNode[];
  }
  return racine.findAll((node) => node.type === 'INSTANCE') as InstanceNode[];
}

/**
 * La page qui porte ce node, par ses parents, ou null.
 *
 * La remontée ne charge rien. La sonde S6 vérifie qu'elle aboutit quand la page
 * du maître n'est pas chargée.
 */
function pageDe(node: BaseNode): PageNode | null {
  try {
    let courant: BaseNode | null = node;
    while (courant && courant.type !== 'PAGE') courant = courant.parent;
    return courant?.type === 'PAGE' ? courant : null;
  } catch {
    // Figma annonce des nodes qu'il ne sert plus : un maître illisible n'a pas
    // de page, et son propriétaire n'est pas contracté.
    return null;
  }
}

function cleDeLaPage(page: PageNode): unknown {
  return typeof page.id === 'string' ? page.id : page;
}

/** Les noms d'une page, repris de la mémoire quand elle est propre et écoutée. */
async function nomsGardesDeLaPage(
  page: PageNode,
  options: OptionsDeLIndex,
): Promise<ReadonlySet<string>> {
  const cle = cleDeLaPage(page);
  const gardee = pagesGardees.get(cle);
  if (gardee && gardee.ecoutee && !gardee.sale) {
    compter('pagesReutilisees');
    return gardee.noms;
  }
  if (options.priorite === 'analyse') await respirerSiBesoin();
  await options.avantChaquePage?.();
  if (typeof page.loadAsync === 'function') {
    await page.loadAsync();
    compter('pagesChargees');
  }
  const entree: EntreeDePage = gardee ?? { noms: new Set(), sale: true, ecoutee: false };
  if (!entree.ecoutee) entree.ecoutee = ecouter(page, entree);
  // Le balayage est synchrone : un `nodechange` arrive avant lui ou après lui,
  // jamais pendant, et une entrée marquée propre ici ne manque aucun geste.
  entree.sale = false;
  entree.noms = nomsDeLaPage(page);
  compter('pagesBalayees');
  pagesGardees.set(cle, entree);
  return entree.noms;
}

/** Abonne l'entrée aux changements de sa page, et dit si l'abonnement tient. */
function ecouter(page: PageNode, entree: EntreeDePage): boolean {
  if (typeof page.on !== 'function') return false;
  try {
    page.on('nodechange', () => {
      entree.sale = true;
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Oublie ce que l'index garde d'une page.
 *
 * `nodechange` arrive par lots, et non à chaque geste : une écriture que le
 * plugin vient de faire doit donc salir sa page elle-même, sans attendre
 * l'événement qu'elle déclenchera.
 */
export function oublierLaPage(page: PageNode): void {
  const gardee = pagesGardees.get(cleDeLaPage(page));
  if (gardee) gardee.sale = true;
}

/** Oublie toutes les pages gardées ; les tests s'en servent entre deux documents simulés. */
export function oublierLIndexDuDocument(): void {
  pagesGardees = new Map();
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
  // doit ni faire échouer l'export entier, ni disparaître. Sans ce nom,
  // l'instance n'entre pas dans `composed`, `getAllNodes` cesse de l'élaguer,
  // et le contrat publie les internes du voisin comme les siens pendant que la
  // dépendance manque à `composes`. Le relevé ne l'ayant jamais trouvée, même
  // l'avertissement « dépendance non située » ne peut pas partir : c'est ici,
  // ou nulle part.
  const main = await maitreDe(instance);
  if (!main) {
    pousserLocalise(warnings, 'Layer', instance, {
      manque: `le composant principal de cette instance est introuvable.`,
      impact: `Si ce composant a son propre contrat, le développeur recopiera son contenu `
        + `au lieu de réutiliser le composant.`,
      action: `Utilisez « Restore main component » sur cette instance, ou remplacez-la, puis `
        + `réexportez.`,
    });
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
 * Toutes les instances d'un sous-arbre, avec leur chemin d'index et leur chemin
 * de noms, dans l'ordre du document.
 *
 * Le parcours descend par `children` plutôt que par `findAll` parce que c'est
 * la position qui l'intéresse : `findAll` aplatit l'arbre et perdrait l'indice
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
    // Le contenu d'un slot est libre : il n'est pas isomorphe au maître et ne
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
        undefined,
        wrapper?.componentSet?.name,
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
 * dépendance contient appartient à son contrat, et le comparer ici rangerait
 * une trouvaille sous un propriétaire qui ne la porte pas.
 */
export async function indexMasterInstances(
  master: ComponentNode,
  contracted: ContractedNames,
): Promise<MasterInstanceDefaults> {
  const releves = masterInstances(master);
  const mains = await Promise.all(
    releves.map((releve) => maitreDe(releve.instance)),
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
 * Chaque instance donne sa propre entrée, sans regroupement par nom de
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
  // wrapper, il ne fournit pas non plus de dépendance. Ses avertissements
  // sont jetés ici, car les extractions suivantes les produiront sur le même
  // arbre ; les collecter deux fois ne ferait que des doublons.
  // `getAllNodes` renvoie aussi la racine : un composant ne se déclare pas
  // comme sa propre dépendance.
  const instances = getAllNodes(root, []).filter(
    (node): node is InstanceNode => node !== root && node.type === 'INSTANCE',
  );

  // Deux passes : savoir si une instance est imbriquée dans une autre suppose
  // de connaître d'abord toutes les dépendances du sous-arbre.
  // `getMainComponentAsync` est un aller-retour par instance, et l'UI du plugin
  // est mono-thread : les lancer ensemble ne change rien au résultat, l'ordre
  // de `composes` venant de `instances`, qui est celui du document.
  // Chaque lecture écrit dans sa propre liste : `Promise.all` ne garantit aucun
  // ordre d'exécution, et un tableau partagé rendrait l'ordre des messages
  // dépendant de la latence du réseau.
  const lectures = await Promise.all(
    instances.map(async (instance) => {
      const warnings: string[] = [];
      const { name, main } = await contractedOwner(instance, contracted, warnings);
      return { owner: name, main, warnings };
    }),
  );
  const owners = lectures.map((lecture) => lecture.owner);
  const warnings = lectures.flatMap((lecture) => lecture.warnings);
  for (const lecture of lectures) reporterLocalisations(lecture.warnings, warnings);
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

/** Variants relevés ensemble avant que l'analyse puisse rendre la main. */
const TRANCHE_DE_VARIANTS = 16;

/**
 * Étend le relevé à tous les variants du Component Set.
 *
 * Chaque variant porte ses propres instances, avec leurs propres ids : élaguer
 * d'après le seul variant de référence laisserait les autres aspirer les
 * couleurs du composant embarqué.
 *
 * `structure.children` décrit le variant de référence ; chaque entrée de
 * `variants` porte son arbre et ses dépendances exactes. Une composition
 * différente produit une notice de compatibilité, et le champ global `composes`
 * est ensuite agrégé depuis ces vues exactes.
 */
export async function scanComposedMatrix(
  variants: readonly SceneNode[],
  reference: SceneNode | null,
  contracted: ContractedNames,
): Promise<ComposedMatrixScan> {
  const roots = reference
    ? [reference, ...variants.filter((variant) => variant !== reference)]
    : variants;
  // Les variants se relèvent par tranches, et l'analyse rend la main entre deux
  // tranches si son budget est écoulé. L'ordre des relevés reste celui de
  // `roots`.
  const scans: ComposedInstancesScan[] = [];
  for (let debut = 0; debut < roots.length; debut += TRANCHE_DE_VARIANTS) {
    if (debut > 0) await respirerSiBesoin();
    const tranche = roots.slice(debut, debut + TRANCHE_DE_VARIANTS);
    scans.push(...await Promise.all(tranche.map((root) => scanComposedInstances(root, contracted))));
  }

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
  // parcours. C'est aussi ce qui garde `extractSamples` synchrone : un module
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

  // Une instance orpheline vit dans tous les variants du set, et chaque scan la
  // relève avec le même texte. Le message porte le nom du layer, jamais celui
  // du variant : le dédoublonnage rend donc exactement un constat par layer, et
  // ce constat garde l'instance de chaque variant.
  const warnings = Array.from(new Set(scans.flatMap((scan) => scan.warnings)));
  for (const scan of scans) reporterLocalisations(scan.warnings, warnings);

  return {
    composes: scans[0]?.composes ?? [],
    composed,
    warnings,
    mainByInstanceId,
    swapDefaults,
    propertySurfaces,
  };
}
