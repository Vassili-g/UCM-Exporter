/**
 * Extraction du layout (dimensions + slots enfants) d'un composant.
 *
 * On part d'un « node racine » (le wrapper de dimensions s'il existe, sinon
 * le composant lui-même) et on relève les tokens liés : gap, paddings,
 * border-radius et tailles d'icônes. La typographie est extraite séparément
 * sur toute la matrice par `extractVariantTypography`.
 *
 * La descente est UNE seule fonction récursive, `describeNode`, qui ne connaît
 * ni profondeur ni nature de composant : un auto layout dans une grille dans un
 * cadre de dépendances se décrit avec la même règle à chaque étage.
 * `structureTree.ts` décide qui est un conteneur et qui est une feuille ; ce
 * module se contente de suivre cette décision et de résoudre les tokens.
 */
import { firstVariableAlias } from '../variables';
import type { TokenResolver } from '../variables';
import { getAllNodes, textNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import {
  BINDING_PATTERNS,
  fieldLabel,
  exposesAnyField,
  gapLabel,
  getBinding,
  hasCornerRadiusProperty,
  resolveContainerSizing,
  resolveField,
  resolveRowGap,
  resolveSidedField,
  resolveSizeBounds,
  gridStructuralSize,
  resolveSlotSize,
  SIDE_KEYS,
} from './nodeBindings';
import { normalizePropKey } from './parsers';
import { isIconLayer } from './slotNames';
import { composedSlotDependencies, nestedSlotVisibility } from './slotRelations';
import {
  depthLimitWarning,
  publishedSlots,
  publishesChildren,
} from './structureTree';
import { unsupportedPropertyWarnings } from './unsupportedProperties';
import {
  containerSizing,
  fixedDimensions,
  flexContainerProperties,
  flexItemProperties,
  gridTrackCounts,
  gridTrackSizes,
  isGridAutoLayout,
  isLinearAutoLayout,
  SIZE_BOUND_FIELDS,
  sizeBoundFields,
} from './flexLayout';
import type {
  ChildStructure,
  ComposedDependency,
  ContractStructure,
  LayoutDirection,
  PaddingX,
  PaddingY,
  Radius,
} from './types';

/**
 * Les dépendances que l'arbre place, indexées par le slot qui les rend.
 *
 * `composes` s'en dérive en parcourant `structure.children` dans l'ordre — donc
 * dans l'ordre des calques Figma, celui-là même que le consommateur recompte
 * pour vérifier la parité du code. Un relevé tenu dans l'ordre d'INSERTION
 * dépendrait de l'ordonnancement des `await` de l'extraction : deux cadres
 * frères pourraient se doubler, et le contrat serait refusé sans qu'aucun
 * design n'ait changé.
 */
export type PlacedDependencies = Map<ChildStructure, ComposedDependency>;
/** Chemin exact de chaque node publié, collecté pendant l'unique descente de l'arbre. */
export type PublishedNodePaths = Map<string, string[]>;

/**
 * Dépendances réellement publiées par un arbre, dans l'ordre de ses calques.
 * Cette fonction est l'unique pont entre le scan Figma et les listes `composes`.
 */
export function placedDependenciesFromTree(
  children: readonly ChildStructure[],
  placed: PlacedDependencies,
): ComposedDependency[] {
  const dependencies: ComposedDependency[] = [];
  for (const child of children) {
    const dependency = placed.get(child);
    if (dependency) dependencies.push(dependency);
    if (child.children) dependencies.push(...placedDependenciesFromTree(child.children, placed));
  }
  return dependencies;
}

/** La partie « layout » de la structure (sans les tokens de variantes). */
type LayoutStructure = Omit<
  ContractStructure,
  'sizes' | 'variantAxes' | 'variantTokens' | 'variantStrokes' | 'variantTypography'
>;

/**
 * Disposition d'un node, sans valeur inventée pour un frame qui n'en a pas.
 *
 * La grille en fait partie : Figma y expose deux gaps liables à une variable et
 * le nombre de ses pistes, soit tout ce que le contrat sait porter. La décrire
 * comme une rangée serait un repli, pas une lecture.
 */
function autoLayoutDirection(node: SceneNode): LayoutDirection | null {
  if (isGridAutoLayout(node)) return 'grid';
  if (!isLinearAutoLayout(node)) return null;
  const mode = (node as unknown as Record<string, unknown>).layoutMode;
  if (mode === 'HORIZONTAL') return 'flex-row';
  if (mode === 'VERTICAL') return 'flex-column';
  return null;
}

/**
 * Sens du conteneur racine. La forme du contrat rend ce champ obligatoire et
 * conserve `flex-row` comme repli. La récursion n'utilise jamais ce repli :
 * elle omet le layout non applicable et avertit.
 */
function layoutDirection(node: SceneNode): LayoutDirection {
  return autoLayoutDirection(node) ?? 'flex-row';
}

/**
 * Signale ce qu'un calque PUBLIÉ porte et que le schéma ne sait pas écrire.
 *
 * L'appel vit dans l'extraction, et non dans un balayage à part, parce que la
 * règle du projet est « on n'avertit que sur ce qu'on publie » : un second
 * parcours crierait sur les entrailles des icônes et sur les calques d'une
 * dépendance, que ce contrat-ci ne décrit pas.
 */
function warnUnsupportedProperties(node: SceneNode, warnings: string[]): void {
  warnings.push(...unsupportedPropertyWarnings(node));
}

/**
 * Écrit sur un slot tout ce que Figma dit de sa taille : sa dimension figée et
 * ses bornes.
 *
 * Les deux vont ensemble partout où un calque occupe une place dans le flux —
 * slot direct, part interne, cadre de dépendance — et répondent à deux
 * questions distinctes : quelle place il prend, jusqu'où cette place peut
 * aller. Les séparer en appels recopiés laisserait un jour l'un d'eux sans
 * bornes.
 */
async function applySizing(
  entry: ChildStructure,
  parent: SceneNode,
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
  infos: string[],
  suppressedSizeNodeIds: ReadonlySet<string>,
): Promise<void> {
  const supprimee = suppressedSizeNodeIds.has(node.id);
  const [size, bounds] = await Promise.all([
    supprimee ? null : resolveSlotSize(node, resolver, warnings, parent),
    resolveSizeBounds(node, resolver, warnings),
  ]);
  if (size) entry.size = size;
  if (bounds) entry.bounds = bounds;
  // La mesure d'une piste qui hug suit le sort de `size` : ce que `sizes`
  // republiera par taille n'est ni relevé ici, ni signalé.
  if (supprimee) return;
  const structural = gridStructuralSize(node, parent, infos);
  if (structural) entry.structuralSize = structural;
}

/**
 * Écrit sur un conteneur sa disposition et ses dimensions propres.
 *
 * C'est le même relevé qu'à la racine, appliqué à n'importe quelle profondeur :
 * un auto layout imbriqué a son gap, ses paddings et son rayon exactement comme
 * le composant. Les taire ferait perdre la moitié d'un design à trois étages.
 * Sonder le padding n'avertit pas pour autant sur tout design correct : une
 * valeur neutre effectivement fournie par Figma reste absente SANS
 * avertissement (`IMPLICIT_DEFAULTS`).
 *
 * Le padding et le gap ne sont sondés que sous un auto layout, où Figma les
 * applique réellement ; le rayon l'est partout, car un frame sans auto layout a
 * des coins comme un autre.
 */
async function applyContainerProperties(
  entry: ChildStructure,
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
  infos: string[],
  childCount: number,
  dependencies: readonly ComposedDependency[],
): Promise<void> {
  const direction = autoLayoutDirection(node);
  if (!direction) {
    // Un conteneur à un seul enfant n'a d'ordinaire aucune disposition à
    // décrire — le réclamer enverrait le designer régler ce qui ne se voit
    // pas. Un cadre de dépendance fait exception : c'est lui qui place le
    // composant qu'il enveloppe, et sa disposition manque même autour d'un seul.
    if (childCount > 1) {
      warnings.push(
        `Layer « ${node.name} » : il range ${childCount} layers mais n'utilise pas d'auto ` +
          `layout. Le contrat exporte leurs tokens et leurs visibilités, mais pas leur ` +
          `disposition : le développeur les placera autrement que dans Figma. Appliquez un auto ` +
          `layout à ce layer, puis réexportez.`,
      );
    } else if (dependencies.length > 0) {
      warnings.push(
        `Layer « ${node.name} » : il enveloppe ${nommerDependances(dependencies)} mais ` +
          `n'utilise pas d'auto layout. Le contrat publie la dépendance sans la disposition ` +
          `de ce calque, et le développeur la rendra sans ce cadre. Appliquez un auto layout ` +
          `à ce layer, puis réexportez.`,
      );
    }
    return;
  }

  entry.layout = direction;
  if (direction === 'grid') {
    Object.assign(entry, gridTrackCounts(node), gridTrackSizes(node, warnings, infos));
    const [columnGap, rowGap] = await Promise.all([
      resolveField(node, BINDING_PATTERNS.gridColumnGap, 'column gap', resolver, warnings),
      resolveField(node, BINDING_PATTERNS.gridRowGap, 'row gap', resolver, warnings),
    ]);
    if (columnGap) entry.columnGap = columnGap;
    if (rowGap) entry.rowGap = rowGap;
  } else {
    Object.assign(entry, flexContainerProperties(node, warnings));
    // `gap` décrit l'espace ENTRE des enfants : un conteneur qui n'en range
    // qu'un n'espace rien, et réclamer une variable pour lui enverrait le
    // designer relier une valeur qui ne se voit pas.
    if (childCount > 1) {
      const gap = await resolveField(
        node,
        BINDING_PATTERNS.gap,
        gapLabel(node),
        resolver,
        warnings,
      );
      if (gap) entry.gap = gap;
      const rowGap = await resolveRowGap(node, resolver, warnings);
      if (rowGap) entry.rowGap = rowGap;
    }
  }

  // Un layer dont Figma n'expose pas le padding n'en a pas : ce n'est ni une
  // valeur neutre, ni un nombre écrit à la main.
  const [paddingX, paddingY] = exposesAnyField(node, BINDING_PATTERNS.paddingX)
    || exposesAnyField(node, BINDING_PATTERNS.paddingY)
    ? await resolvePaddings(node, resolver, warnings)
    : [null, null];
  if (paddingX || paddingY) entry.padding = { x: paddingX, y: paddingY };
}

/**
 * Les deux paddings d'un conteneur, chacun réduit à une référence quand ses deux
 * côtés partagent leur variable, et détaillé sinon.
 *
 * Une seule fonction pour la racine et pour chaque conteneur imbriqué : deux
 * appels recopiés finiraient par publier deux formes différentes du même champ.
 */
function resolvePaddings(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<[PaddingX | null, PaddingY | null]> {
  return Promise.all([
    resolveSidedField(
      node, BINDING_PATTERNS.paddingX, SIDE_KEYS.paddingX,
      'horizontal padding', resolver, warnings,
    ),
    resolveSidedField(
      node, BINDING_PATTERNS.paddingY, SIDE_KEYS.paddingY,
      'vertical padding', resolver, warnings,
    ),
  ]);
}

/** Le rayon d'un node, sous la même règle : une référence, ou les quatre coins. */
function resolveRadius(
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<Radius | null> {
  return resolveSidedField(
    node, BINDING_PATTERNS.radius, SIDE_KEYS.radius,
    'corner radius', resolver, warnings,
  );
}

/** Le rayon d'un calque publié, feuille ou conteneur. */
async function applyNodeRadius(
  entry: ChildStructure,
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<void> {
  // Un GROUP n'a pas de coins : lui réclamer une variable enverrait le
  // designer chercher un champ que son panneau ne montre pas.
  if (!hasCornerRadiusProperty(node)) return;
  const radius = await resolveRadius(node, resolver, warnings);
  if (radius) entry.radius = radius;
}

/** « le composant « A » » ou « les composants « A », « B » », pour un message. */
function nommerDependances(dependencies: readonly ComposedDependency[]): string {
  const noms = dependencies.map((dependency) => `« ${dependency.component} »`);
  return noms.length === 1 ? `le composant ${noms[0]}` : `les composants ${noms.join(', ')}`;
}

/**
 * Les nodes dont la visibilité sera portée par un enfant publié, à sa place
 * exacte. Les retirer de `visibilityTargets` évite qu'un même fait ait deux
 * propriétaires.
 */
function delegatedTargetIds(
  node: SceneNode,
  composed: ComposedInstances,
  iconNames: ReadonlySet<string>,
  warnings: string[],
): Set<string> {
  const delegated = new Set<string>();
  for (const { child } of publishedSlots(node, iconNames, composed, warnings)) {
    for (const descendant of getAllNodes(child, [], composed)) delegated.add(descendant.id);
  }
  return delegated;
}

/**
 * Décrit UN calque publié, à quelque profondeur qu'il vive.
 *
 * Fonction unique et récursive : un slot de premier niveau, une part textuelle,
 * un cadre de dépendances et un auto layout imbriqué sont le même cas, traité
 * par le même code. Quatre fonctions séparées ne se répondraient qu'à peu près,
 * et « à peu près » publie un chemin de slots que `structure.children` ne
 * contient pas.
 */
async function describeNode(
  parent: SceneNode,
  child: SceneNode,
  // Décidé par `slotNames.assignSlots` : le déduire ici en ferait une seconde
  // définition, libre de diverger de celle que les icônes citent.
  slot: string,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances,
  // Nécessaire pour nommer les parts internes avec la MÊME règle que les slots
  // de premier niveau ; sans lui, une icône imbriquée perdrait son rôle.
  iconNames: ReadonlySet<string>,
  // Les dépendances que l'arbre place réellement. `composes` s'en dérive : les
  // deux champs ne peuvent pas diverger s'ils n'ont qu'une source.
  placed: PlacedDependencies,
  depth: number,
  // Visibilité déjà publiée par le slot qui contient celui-ci. La republier à
  // l'identique donnerait deux propriétaires au même fait ; une prop DIFFÉRENTE
  // reste publiée, c'est une seconde condition que le composant doit lire.
  parentVisibilityProp?: string,
  suppressedSizeNodeIds: ReadonlySet<string> = new Set(),
  infos: string[] = warnings,
  path: readonly string[] = [slot],
  publishedNodePaths: PublishedNodePaths = new Map(),
): Promise<ChildStructure> {
  const entry: ChildStructure = { slot, ...flexItemProperties(parent, child, warnings) };
  publishedNodePaths.set(child.id, [...path]);
  if (slot !== child.name) entry.figmaLayer = child.name;

  const dependencies = composedSlotDependencies(child, composed);
  const estUneDependance = composed.has(child.id);
  // Un calque qui EST une dépendance porte les propriétés de son propre
  // contrat : c'est à lui de s'en plaindre, pas à celui-ci.
  if (!estUneDependance) warnUnsupportedProperties(child, warnings);

  const describesChildren = publishesChildren(child, iconNames, composed, depth);
  // La borne de profondeur se dit ici, et non dans une branche : un calque coupé
  // peut porter des textes comme des dessins, et le contrat perd son contenu
  // dans les deux cas.
  if (!describesChildren && !estUneDependance) {
    const coupe = depthLimitWarning(child, iconNames, composed, depth);
    if (coupe) warnings.push(coupe);
  }

  // Une peinture posée SOUS une feuille appartient à cette feuille. Le contrat
  // ne descend volontairement pas dans les tracés d'une icône, mais leur couleur
  // entre bien dans `variants[].tokens` : sans chemin, `paintPlacements`
  // publierait une clé sans aucune cible et le consommateur, à qui l'on interdit
  // de déduire la cible du nom de la clé, ne peindrait plus aucune icône. Le
  // calque publié qui les porte est leur chemin — c'est de toute façon là que le
  // rendu applique la couleur, `color` et `fill` cascadant du slot vers le
  // dessin. Vaut pour toute feuille, y compris celle qu'a coupée la borne de
  // profondeur.
  if (!describesChildren) {
    for (const descendant of getAllNodes(child, [], composed)) {
      publishedNodePaths.set(descendant.id, [...path]);
    }
  }

  // ---- Visibilités -------------------------------------------------------
  const directVisibility = child.componentPropertyReferences?.visible;
  // Une seule dépendance peut prêter sa visibilité au slot. À plusieurs, la
  // retenir en masquerait les autres : chaque branche publie alors la sienne.
  const dependencyVisibility = dependencies.length === 1
    ? dependencies[0].visibilityProp
    : undefined;
  if (directVisibility) {
    for (const dependency of dependencies) {
      if (!dependency.visibilityProp) continue;
      if (normalizePropKey(directVisibility) === dependency.visibilityProp) continue;
      warnings.push(
        `Layer « ${child.name} » : sa visibilité et celle du composant ` +
          `« ${dependency.component} » qu'il contient dépendent de deux component ` +
          `properties différentes. Seule celle du layer est exportée. Utilisez la même pour ` +
          `les deux.`,
      );
    }
  }
  const slotIsOptional = Boolean(directVisibility || dependencyVisibility);
  // Les visibilités portées plus bas appartiennent aux enfants publiés, qui les
  // décrivent à leur place exacte. Les laisser aussi dans `visibilityTargets`
  // leur donnerait deux propriétaires.
  const representedTargets = describesChildren
    ? delegatedTargetIds(child, composed, iconNames, [])
    : new Set<string>();
  const nestedVisibility = estUneDependance
    ? {}
    : nestedSlotVisibility(child, composed, slotIsOptional, representedTargets);
  const visibilityReference = directVisibility
    ? normalizePropKey(directVisibility)
    : dependencyVisibility ?? nestedVisibility.visibilityProp;
  if (visibilityReference && visibilityReference !== parentVisibilityProp) {
    entry.visibilityProp = visibilityReference;
    entry.optional = true;
  }
  if (nestedVisibility.visibilityTargets) {
    entry.visibilityTargets = nestedVisibility.visibilityTargets;
  }

  // ---- Une dépendance : le contrat la nomme, et s'arrête là --------------
  if (estUneDependance) {
    entry.figmaLayer = child.name;
    const dependency = dependencies[0] ?? composed.get(child.id);
    if (dependency) {
      entry.composes = dependency.component;
      placed.set(entry, dependency);
    }
    return entry;
  }

  // Le rayon appartient au calque qui le porte, même lorsqu'il s'agit d'une
  // feuille graphique sans enfants publiés (les extrémités de ScaleWrap).
  await applyNodeRadius(entry, child, resolver, warnings);

  // ---- Un cadre dont aucune branche rendable ne mène à sa dépendance ------
  if (dependencies.length > 0 && !describesChildren) {
    if (dependencies.length === 1) {
      entry.composes = dependencies[0].component;
      placed.set(entry, dependencies[0]);
    }
    const plusieurs = dependencies.length > 1;
    warnings.push(
      `Layer « ${child.name} » : il enveloppe ${nommerDependances(dependencies)} mais aucun ` +
        `de ses calques exportables n'y mène. ${plusieurs
          ? 'Le contrat ne peut placer aucune de ces dépendances. Un slot ne porte qu’un ' +
            'composant, donc le développeur ne les rendra pas. Rendez visibles les calques qui ' +
            'portent les instances'
          : 'Le contrat nomme la dépendance sans la disposition de ce calque, et le développeur ' +
            'rendra le composant sans son cadre. Rendez visible le calque qui porte l’instance'}, ` +
        `puis réexportez.`,
    );
    await applySizing(entry, parent, child, resolver, warnings, infos, suppressedSizeNodeIds);
    return entry;
  }

  // ---- Un conteneur : sa disposition, ses dimensions, puis ses enfants ----
  if (describesChildren) {
    const assignments = publishedSlots(child, iconNames, composed, warnings);
    await applyContainerProperties(
      entry,
      child,
      resolver,
      warnings,
      infos,
      assignments.length,
      dependencies,
    );
    entry.children = await Promise.all(
      assignments.map(({ child: branch, slot: branchSlot }) =>
        describeNode(
          child,
          branch,
          branchSlot,
          resolver,
          warnings,
          composed,
          iconNames,
          placed,
          depth + 1,
          entry.visibilityProp,
          suppressedSizeNodeIds,
          infos,
          [...path, branchSlot],
          publishedNodePaths,
        )),
    );
  } else if (dependencies.length === 0 && textNodes(child, warnings, composed).length === 0) {
    // Le nom du calque est gardé même quand il s'agit d'un placeholder d'icône.
    // Une règle `@icons` peut ensuite qualifier cette icône par son nom Figma.
    entry.figmaLayer = child.name;
    entry.optional = true;
  }

  // Relevé sur TOUS les slots dont ce contrat possède les dimensions, texte
  // compris : un calque de texte peut être figé comme une icône, et le taire
  // ferait dire à son absence « hug » alors que Figma impose une largeur.
  await applySizing(entry, parent, child, resolver, warnings, infos, suppressedSizeNodeIds);
  return entry;
}

/**
 * Signature déterministe de l'arbre publié et de son flux.
 *
 * Elle couvre tout ce que le contrat publie, à toute profondeur — même règle
 * de descente que l'arbre, donc même autorité.
 *
 * Elle ne contient aucun token résolu : elle sert uniquement à comparer la
 * structure des variants avant de publier celle du variant de référence.
 * L'arbre descendant partout, elle descend partout aussi — sans quoi deux
 * variants dont seul un cadre intérieur diffère passeraient pour identiques.
 */
export function structureSignature(
  layoutNode: SceneNode,
  iconNames: ReadonlySet<string> = new Set(),
  composed: ComposedInstances = new Map(),
): string {
  const branchSignature = (
    parent: SceneNode,
    node: SceneNode,
    slot: string,
    depth: number,
  ): unknown => {
    const common = {
      slot,
      // Une icône reconnue change normalement de calque entre variants. Son
      // slot stable et la vue exacte portent déjà son identité :
      // comparer ici `circle-info` à `circle-check` inventerait une divergence
      // structurelle alors que seul le dessin interchangeable change.
      ...(iconNames.has(node.name) ? {} : { figmaLayer: node.name }),
      composes: composed.get(node.id)?.component ?? null,
      visibilityProp: node.componentPropertyReferences?.visible
        ? normalizePropKey(node.componentPropertyReferences.visible)
        : null,
      ...flexItemProperties(parent, node),
    };
    if (!publishesChildren(node, iconNames, composed, depth)) {
      return { ...common, type: node.type === 'TEXT' ? 'text' : 'leaf' };
    }
    return {
      ...common,
      type: 'container',
      layout: autoLayoutDirection(node),
      ...gridTrackCounts(node),
      ...gridTrackSizes(node),
      ...flexContainerProperties(node),
      dimensions: containerDimensionsSignature(node),
      children: publishedSlots(node, iconNames, composed).map(({ child, slot: childSlot }) =>
        branchSignature(node, child, childSlot, depth + 1)),
    };
  };

  return JSON.stringify(
    publishedSlots(layoutNode, iconNames, composed)
      .map(({ child, slot }) => branchSignature(layoutNode, child, slot, 1)),
  );
}

/**
 * Dimensions d'un conteneur, réduites aux variables citées.
 *
 * La comparaison porte sur l'IDENTIFIANT de la variable, jamais sur le nom
 * résolu : les signatures restent synchrones. Sans elle, un cadre imbriqué dont
 * le padding change d'un variant à l'autre publierait celui de la référence en
 * silence.
 */
function containerDimensionsSignature(node: SceneNode): object {
  const variable = (field: string) => firstVariableAlias(getBinding(node, field))?.id ?? null;
  return {
    gap: variable('itemSpacing'),
    rowGap: variable('counterAxisSpacing'),
    gridRowGap: variable('gridRowGap'),
    gridColumnGap: variable('gridColumnGap'),
    paddingLeft: variable('paddingLeft'),
    paddingRight: variable('paddingRight'),
    paddingTop: variable('paddingTop'),
    paddingBottom: variable('paddingBottom'),
    // Les quatre coins comptent autant que le rayon uniforme : depuis qu'ils
    // peuvent citer quatre variables, un variant dont un seul coin change
    // publierait sinon celui de la référence en silence.
    radius: variable('cornerRadius'),
    topLeftRadius: variable('topLeftRadius'),
    topRightRadius: variable('topRightRadius'),
    bottomRightRadius: variable('bottomRightRadius'),
    bottomLeftRadius: variable('bottomLeftRadius'),
  };
}

/**
 * Signature du flux direct du composant, indépendamment des tokens.
 *
 * `structure.children` ne décrit qu'un variant de référence : tout écart de
 * direction, d'alignement ou de remplissage sur un autre variant doit donc
 * avertir plutôt que d'être transcrit comme s'il était universel.
 */
export function flexLayoutSignature(
  layoutNode: SceneNode,
  iconNames: ReadonlySet<string> = new Set(),
  composed: ComposedInstances = new Map(),
  // Le dimensionnement appartient au composant, pas au wrapper qui porte son
  // auto-layout : c'est le variant qu'on instancie, et lui seul.
  component: SceneNode = layoutNode,
): string {
  return JSON.stringify({
    layout: autoLayoutDirection(layoutNode),
    ...gridTrackCounts(layoutNode),
    ...gridTrackSizes(layoutNode),
    sizing: containerSizingSignature(component),
    ...flexContainerProperties(layoutNode),
    children: publishedSlots(layoutNode, iconNames, composed).map(({ child, slot }) => ({
      slot,
      ...flexItemProperties(layoutNode, child),
      ...slotSizeSignature(child, iconNames),
    })),
  });
}

/**
 * Dimensionnement du composant, sous la forme que la signature sait comparer.
 *
 * `structure.sizing` ne décrit que le variant de référence, et publie un token
 * quand un axe figé en cite un. La signature reste synchrone : elle compare
 * l'IDENTIFIANT de la variable, pas le nom résolu.
 */
function containerSizingSignature(component: SceneNode): object {
  const menu = containerSizing(component);
  const fixed = fixedDimensions(component);
  const axis = (field: 'width' | 'height') => ({
    css: menu[field],
    variable: fixed[field]
      ? firstVariableAlias(getBinding(component, field))?.id ?? null
      : null,
  });
  return {
    width: axis('width'),
    height: axis('height'),
    bounds: sizeBoundsSignature(component),
  };
}

/**
 * Bornes d'un node, sous la forme que la signature sait comparer.
 *
 * On compare la PRÉSENCE de la borne autant que la variable citée : un variant
 * qui retire son `max width` publierait sinon celui de la référence.
 */
function sizeBoundsSignature(node: SceneNode): object {
  const posees = sizeBoundFields(node);
  return Object.fromEntries(
    SIZE_BOUND_FIELDS.map((field) => [
      field,
      posees.includes(field)
        ? firstVariableAlias(getBinding(node, field))?.id ?? 'sans-variable'
        : null,
    ]),
  );
}

/**
 * Dimensions figées et bornes d'un slot, réduites aux liaisons que Figma porte.
 *
 * Les calques d'icônes sont exclus de la seule `size` : `icons.*.size` compare
 * déjà leur taille sur toute la matrice, et deux messages diraient la même
 * chose. Leurs bornes, elles, restent comparées.
 */
function slotSizeSignature(node: SceneNode, iconNames: ReadonlySet<string>): object {
  const bounds = { bounds: sizeBoundsSignature(node) };
  if (isIconLayer(node, iconNames)) return bounds;

  const fixed = fixedDimensions(node);
  const boundVariableId = (field: string) =>
    firstVariableAlias(getBinding(node, field))?.id ?? null;
  return {
    ...bounds,
    size: {
      width: fixed.width ? boundVariableId('width') : null,
      height: fixed.height ? boundVariableId('height') : null,
    },
  };
}

/**
 * Calques que l'élection du node de layout laisse hors du contrat.
 *
 * `structure.children` ne décrit que les enfants directs du node élu. Ce qui
 * vit à côté du chemin qui y mène — un badge, un liseré, un second bloc — n'a
 * donc ni slot, ni typographie, ni visibilité, alors que ses couleurs entrent
 * bien dans `variantTokens`, relevé sur le variant entier.
 *
 * Exporté parce que ce relevé couvre TOUTE la matrice, là où
 * `structure.children` ne décrit que la référence : un calque écarté dans un
 * autre variant apporte ses couleurs exactement de la même façon.
 */
export function warnLayersOutsideLayoutNode(
  component: SceneNode,
  layoutNode: SceneNode,
  warnings: string[],
  composed: ComposedInstances,
): void {
  if (component === layoutNode) return;

  const exportable = new Set(getAllNodes(component, [], composed).map((node) => node.id));
  let current: BaseNode | null | undefined = layoutNode;
  while (current && current !== component) {
    const parent: BaseNode | null | undefined = current.parent;
    if (parent && 'children' in parent) {
      for (const sibling of parent.children) {
        if (sibling.id === current.id || !exportable.has(sibling.id)) continue;
        warnings.push(
          `Layer « ${sibling.name} » : il est posé à côté de l'auto layout frame qui porte le ` +
            `gap et le padding, pas dedans. Le contrat ne lui donne ni slot, ni typographie, ni ` +
            `visibilité : le développeur ne le rendra pas. Déplacez-le dans cet auto layout ` +
            `frame, puis réexportez.`,
        );
      }
    }
    current = parent;
  }
}

/**
 * Bornes posées sur un calque intermédiaire, entre le composant et ses slots.
 *
 * Le contrat n'a que deux propriétaires de bornes : le composant et un slot.
 * Un wrapper de layout n'est ni l'un ni l'autre — il prête son flux au
 * composant sans jamais apparaître comme un node — et le `max width` qu'il
 * porte n'a donc aucun endroit où vivre.
 */
function warnIntermediateBounds(
  component: SceneNode,
  layoutNode: SceneNode,
  warnings: string[],
): void {
  let current: SceneNode | null = layoutNode;
  while (current && current !== component) {
    const bornes = sizeBoundFields(current);
    if (bornes.length > 0) {
      warnings.push(
        `Layer « ${current.name} » : il fixe ${bornes.map(fieldLabel).join(', ')}, mais il ` +
          `s'intercale entre le composant et ses slots. Le contrat publie les bornes du ` +
          `composant et celles de chaque slot, jamais celles d'un layer intermédiaire : le ` +
          `développeur rendra ce layer sans elles. Portez ces bornes sur le composant ou sur le ` +
          `slot concerné, puis réexportez.`,
      );
    }
    const parent: BaseNode | null = current.parent;
    current = parent && 'type' in parent ? (parent as SceneNode) : null;
  }
}

/**
 * `structure.layout` est obligatoire dans la forme du contrat, et `flex-row`
 * en est le repli. Un frame sans auto layout serait donc décrit comme une
 * rangée horizontale sans que rien ne le dise. Une grille, elle, est décrite
 * pour ce qu'elle est.
 */
function warnMissingDirection(layoutNode: SceneNode, warnings: string[]): void {
  if (autoLayoutDirection(layoutNode)) return;
  warnings.push(
    `Layer « ${layoutNode.name} » : il n'utilise pas d'auto layout. Le ` +
      `contrat annonce malgré tout une disposition horizontale, la seule qu'il sache écrire par ` +
      `défaut, et le développeur placera donc ses layers autrement que dans Figma. Appliquez un ` +
      `auto layout à ce layer, puis réexportez.`,
  );
}

/**
 * Point d'entrée du module : relève les dimensions du conteneur (gap,
 * paddings, radius) puis construit les slots enfants. Tout est exprimé en
 * noms de tokens ; une propriété non liée produit un warning, jamais une
 * valeur brute.
 *
 * `layoutNode` est déjà élu par `layoutNodes.ts` : ce module ne choisit pas le
 * calque qu'il décrit, il le reçoit.
 */
export async function extractLayout(
  layoutNode: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances = new Map(),
  // Noms de calques désignés par les règles `@icons` : ils donnent au slot son
  // rôle `icon`, stable quand l'icône change d'un variant à l'autre.
  iconNames: ReadonlySet<string> = new Set(),
  // Le composant lui-même, quand un wrapper de layout s'intercale entre lui et
  // ses slots. C'est son comportement que le contrat publie.
  component: SceneNode = layoutNode,
  // Faux quand un axe de tailles existe : `sizes` porte alors gap, paddings et
  // radius, et `extractStructure` jette ceux-ci.
  publishDimensions = true,
  // Reçoit les dépendances que l'arbre place réellement. `composes` s'en dérive
  // au lieu d'être scanné à part.
  placed: PlacedDependencies = new Map(),
  suppressedSizeNodeIds: ReadonlySet<string> = new Set(),
  layoutElectionWarnings: string[] = warnings,
  // Constats que l'export publie sans rien perdre et sans rien demander : le
  // designer n'a aucun geste à faire. Par défaut ils rejoignent `warnings` ;
  // `extractStructure` leur donne leur propre liste, que la pull request
  // présente à part des points à corriger.
  infos: string[] = warnings,
  publishedNodePaths: PublishedNodePaths = new Map(),
): Promise<LayoutStructure> {
  warnLayersOutsideLayoutNode(component, layoutNode, layoutElectionWarnings, composed);
  warnIntermediateBounds(component, layoutNode, warnings);
  warnMissingDirection(layoutNode, warnings);
  warnUnsupportedProperties(layoutNode, warnings);
  publishedNodePaths.set(component.id, []);
  publishedNodePaths.set(layoutNode.id, []);

  const grille = isGridAutoLayout(layoutNode);
  const [gap, rowGap, columnGap, paddings, radius] = publishDimensions
    ? await Promise.all([
      grille
        ? null
        : resolveField(layoutNode, BINDING_PATTERNS.gap, gapLabel(layoutNode), resolver, warnings),
      grille
        ? resolveField(layoutNode, BINDING_PATTERNS.gridRowGap, 'row gap', resolver, warnings)
        : resolveRowGap(layoutNode, resolver, warnings),
      grille
        ? resolveField(layoutNode, BINDING_PATTERNS.gridColumnGap, 'column gap', resolver, warnings)
        : null,
      resolvePaddings(layoutNode, resolver, warnings),
      resolveRadius(layoutNode, resolver, warnings),
    ])
    : [null, null, null, [null, null] as [PaddingX | null, PaddingY | null], null];
  const [paddingX, paddingY] = paddings;

  // Lus sur le composant même quand `sizes` porte les dimensions : la taille du
  // composant n'est pas une dimension parmi d'autres, c'est la première
  // décision de qui l'intègre, et `structure.sizing` est toujours publié.
  const [sizing, bounds] = await Promise.all([
    resolveContainerSizing(component, resolver, warnings),
    resolveSizeBounds(component, resolver, warnings),
  ]);

  const children = await Promise.all(
    publishedSlots(layoutNode, iconNames, composed, warnings).map(({ child, slot }) =>
      describeNode(
        layoutNode,
        child,
        slot,
        resolver,
        warnings,
        composed,
        iconNames,
        placed,
        1,
        undefined,
        suppressedSizeNodeIds,
        infos,
        [slot],
        publishedNodePaths,
      )),
  );

  return {
    layout: layoutDirection(layoutNode),
    ...gridTrackCounts(layoutNode),
    ...gridTrackSizes(layoutNode, warnings, infos),
    sizing,
    ...(bounds ? { bounds } : {}),
    ...flexContainerProperties(layoutNode, warnings),
    gap,
    rowGap,
    columnGap,
    padding: { x: paddingX, y: paddingY },
    radius,
    children,
  };
}
