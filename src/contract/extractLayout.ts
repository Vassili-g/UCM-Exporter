/**
 * Extraction du layout (dimensions + slots enfants) d'un composant.
 *
 * On part d'un « node racine » (le wrapper de dimensions s'il existe, sinon
 * le composant lui-même) et on relève les tokens liés : gap, paddings,
 * border-radius et tailles d'icônes. La typographie est extraite séparément
 * sur toute la matrice par `extractVariantTypography`.
 */
import { firstVariableAlias } from '../variables';
import type { TokenResolver } from '../variables';
import { getAllNodes, textNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import {
  BINDING_PATTERNS,
  getBinding,
  resolveField,
  resolveSlotSize,
} from './nodeBindings';
import { normalizePropKey } from './parsers';
import { assignSlots, isIconLayer } from './slotNames';
import { composedSlotDependencies, nestedSlotVisibility } from './slotRelations';
import {
  containerSizing,
  fixedDimensions,
  flexContainerProperties,
  flexItemProperties,
  isLinearAutoLayout,
} from './flexLayout';
import type {
  ChildStructure,
  ComposedDependency,
  ContractStructure,
  SlotSize,
} from './types';

/** La partie « layout » de la structure (sans les tokens de variantes). */
type LayoutStructure = Omit<
  ContractStructure,
  'sizes' | 'variantAxes' | 'variantTokens' | 'variantStrokes' | 'variantTypography'
>;

/** Sens d'un auto-layout Figma applicable, sans valeur inventée pour `NONE` ou `GRID`. */
function autoLayoutDirection(node: SceneNode): 'flex-row' | 'flex-column' | null {
  if (!isLinearAutoLayout(node)) return null;
  const mode = (node as unknown as Record<string, unknown>).layoutMode;
  if (mode === 'HORIZONTAL') return 'flex-row';
  if (mode === 'VERTICAL') return 'flex-column';
  return null;
}

/**
 * Sens du conteneur racine. La forme historique du contrat rend ce champ
 * obligatoire et conserve `flex-row` comme repli. La récursion 4.3 n'utilise
 * jamais ce repli : elle omet le layout non applicable et avertit.
 */
function layoutDirection(node: SceneNode): 'flex-row' | 'flex-column' {
  return autoLayoutDirection(node) ?? 'flex-row';
}

/**
 * Nodes qui relient un conteneur à ses calques texte, textes compris.
 *
 * Cette frontière empêche la récursion 4.3 de devenir une copie générale de
 * Figma : une icône ou une instance composée voisine n'est pas sur un chemin
 * de texte et ne devient donc jamais une part du slot.
 */
function textBranchNodeIds(root: SceneNode, texts: readonly TextNode[]): Set<string> {
  const ids = new Set<string>();
  for (const text of texts) {
    let current: BaseNode | null | undefined = text;
    while (current && current !== root) {
      if ('id' in current) ids.add(current.id);
      current = current.parent;
    }
  }
  return ids;
}

/**
 * Cibles dont la visibilité sera décrite par un enfant récursif plus précis.
 *
 * Tout le sous-arbre d'une branche textuelle directe est délégué à cette
 * branche. Une cible graphique qui lui appartient y gardera son
 * `visibilityTargets`; un dessin directement voisin des branches reste au
 * contraire la responsabilité du conteneur courant.
 */
function delegatedTextTargetIds(
  root: SceneNode,
  texts: readonly TextNode[],
  composed: ComposedInstances,
): Set<string> {
  const branchIds = textBranchNodeIds(root, texts);
  const delegated = new Set<string>();
  if (!('children' in root)) return delegated;

  for (const child of root.children) {
    if (!branchIds.has(child.id)) continue;
    for (const node of getAllNodes(child, [], composed)) delegated.add(node.id);
  }
  return delegated;
}

/** Applique la visibilité native d'un node à la part exacte qui la porte. */
function applyDirectVisibility(entry: ChildStructure, node: SceneNode): boolean {
  const reference = node.componentPropertyReferences?.visible;
  if (!reference) return false;
  entry.visibilityProp = normalizePropKey(reference);
  entry.optional = true;
  return true;
}

/**
 * Décrit les enfants textuels d'un conteneur déjà créé.
 *
 * Seules les branches menant à un `TEXT` survivent. `layout` et `gap` ne sont
 * applicables que lorsque plusieurs branches sont réellement disposées par un
 * auto-layout horizontal ou vertical.
 */
async function extractTextChildren(
  node: SceneNode,
  texts: readonly TextNode[],
  entry: ChildStructure,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances,
  iconNames: ReadonlySet<string>,
): Promise<void> {
  const branchIds = textBranchNodeIds(node, texts);
  const assignments = assignSlots(node, iconNames, warnings, composed)
    .filter(({ child }) => branchIds.has(child.id));
  const children = (await Promise.all(
    assignments.map(({ child, slot }) =>
      extractTextBranch(node, child, slot, resolver, warnings, composed, iconNames)),
  )).filter((child): child is ChildStructure => Boolean(child));

  entry.children = children;
  if (children.length < 2) return;

  const direction = autoLayoutDirection(node);
  if (!direction) {
    warnings.push(
      `Layer « ${node.name} » : il contient plusieurs branches de texte mais n'utilise pas ` +
        `un auto layout horizontal ou vertical. Le contrat exporte leurs typographies et ` +
        `visibilités, mais pas leur disposition. Appliquez un auto layout au layer si cette ` +
        `disposition doit être contractuelle, puis réexportez.`,
    );
    return;
  }

  entry.layout = direction;
  Object.assign(entry, flexContainerProperties(node, warnings));
  const gap = await resolveField(node, BINDING_PATTERNS.gap, 'gap', resolver, warnings);
  if (gap) entry.gap = gap;
}

/** Une branche de l'arbre textuel 4.3, jusqu'au vrai calque `TEXT`. */
async function extractTextBranch(
  parent: SceneNode,
  node: SceneNode,
  slot: string,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances,
  iconNames: ReadonlySet<string>,
): Promise<ChildStructure | null> {
  const texts = textNodes(node, warnings, composed);
  if (texts.length === 0) return null;

  const entry: ChildStructure = { slot, ...flexItemProperties(parent, node, warnings) };
  if (slot !== node.name) entry.figmaLayer = node.name;
  const isOptional = applyDirectVisibility(entry, node);

  // Une part est un élément du flux comme un autre : sa dimension figée se
  // relève ici, sinon un titre à largeur imposée passerait pour un hug.
  const size = await resolveSlotSize(node, resolver, warnings);
  if (size) entry.size = size;

  if (node.type === 'TEXT') {
    return entry;
  }

  const representedTargets = delegatedTextTargetIds(node, texts, composed);
  const nestedVisibility = nestedSlotVisibility(
    node,
    composed,
    isOptional,
    representedTargets,
  );
  if (nestedVisibility.visibilityProp && !entry.visibilityProp) {
    entry.visibilityProp = nestedVisibility.visibilityProp;
    entry.optional = true;
  }
  if (nestedVisibility.visibilityTargets) {
    entry.visibilityTargets = nestedVisibility.visibilityTargets;
  }

  await extractTextChildren(
    node,
    texts,
    entry,
    resolver,
    warnings,
    composed,
    iconNames,
  );
  return entry;
}

/**
 * Cadre qui enveloppe un composant unifié, décrit comme le conteneur qu'il est.
 *
 * Ce calque appartient à CE contrat. Il publie donc son flux, puis la dépendance dans
 * `children`, exactement comme un slot à parts. Porter `composes` sur le cadre
 * lui-même le ferait passer pour le composant : son `alignSelf` atterrirait sur
 * un composant qui publie déjà son propre `structure.sizing`, où une taille
 * explicite neutralise l'étirement. Le cadre disparaîtrait avec son alignement.
 *
 * `gap` reste tu : seules les branches menant à la dépendance sont publiées, et
 * un espacement décrirait des enfants absents du contrat.
 */
async function describeComposedWrapper(
  entry: ChildStructure,
  wrapper: SceneNode,
  dependency: ComposedDependency,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances,
  iconNames: ReadonlySet<string>,
): Promise<void> {
  const assignments = assignSlots(wrapper, iconNames, warnings, composed);
  const branches = assignments
    .filter(({ child }) => composedSlotDependencies(child, composed).length > 0);

  // La dépendance est là — `composedSlotDependencies` l'a trouvée — mais aucune
  // branche exportable n'y mène : elle est rangée sous un calque masqué. Publier
  // un conteneur vide donnerait un contrat que le consommateur refuse ; on
  // revient à la forme du slot-instance, et on dit ce qui manquera.
  if (branches.length === 0) {
    entry.composes = dependency.component;
    warnings.push(
      `Layer « ${wrapper.name} » : il enveloppe le composant « ${dependency.component} » mais ` +
        `aucun de ses calques exportables n'y mène. Le contrat nomme la dépendance sans la ` +
        `disposition de ce calque, et le développeur rendra le composant sans son cadre. ` +
        `Rendez visible le calque qui porte l'instance, puis réexportez.`,
    );
    return;
  }

  const direction = autoLayoutDirection(wrapper);
  if (direction) {
    entry.layout = direction;
    Object.assign(entry, flexContainerProperties(wrapper, warnings));
  } else {
    warnings.push(
      `Layer « ${wrapper.name} » : il enveloppe le composant « ${dependency.component} » mais ` +
        `n'utilise pas un auto layout horizontal ou vertical. Le contrat publie la dépendance ` +
        `sans la disposition de ce calque, et le développeur rendra le composant sans son ` +
        `cadre. Appliquez un auto layout à ce layer, puis réexportez.`,
    );
  }

  // Seule la branche qui mène à la dépendance est publiée. Ce qui l'accompagne
  // dans ce cadre n'a donc ni slot, ni typographie, ni visibilité, alors que
  // ses couleurs entrent bien dans `variantTokens` : sans ce message, le
  // développeur ne saurait pas qu'un calque a disparu.
  for (const { child } of assignments) {
    if (branches.some((branch) => branch.child === child)) continue;
    warnings.push(
      `Layer « ${child.name} » : il partage le layer « ${wrapper.name} » avec le composant ` +
        `« ${dependency.component} », dont le contrat ne décrit que la branche. Ni son slot, ni ` +
        `sa typographie, ni sa visibilité ne sont exportés : le développeur ne le rendra pas. ` +
        `Sortez-le de ce layer, puis réexportez.`,
    );
  }

  // Le cadre est un élément du flux comme un autre : sa dimension figée lui
  // appartient. Seule celle de l'INSTANCE reste hors de ce contrat.
  const size = await resolveSlotSize(wrapper, resolver, warnings);
  if (size) entry.size = size;

  entry.children = await Promise.all(
    branches.map(({ child, slot }) =>
      extractComposedBranch(wrapper, child, slot, resolver, warnings, composed, iconNames)),
  );
}

/** Une branche qui mène à un composant unifié : la dépendance, ou un cadre de plus. */
async function extractComposedBranch(
  parent: SceneNode,
  node: SceneNode,
  slot: string,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances,
  iconNames: ReadonlySet<string>,
): Promise<ChildStructure> {
  const entry: ChildStructure = { slot, ...flexItemProperties(parent, node, warnings) };
  entry.figmaLayer = node.name;

  const direct = composed.get(node.id);
  if (direct) {
    entry.composes = direct.component;
    return entry;
  }

  // La visibilité de la branche est déjà publiée par le slot de premier niveau,
  // qui reprend celle du calque comme celle de l'instance. La répéter ici
  // laisserait croire à deux conditions distinctes.
  const dependency = composedSlotDependencies(node, composed)[0];
  if (dependency) {
    await describeComposedWrapper(
      entry,
      node,
      dependency,
      resolver,
      warnings,
      composed,
      iconNames,
    );
  }
  return entry;
}

/**
 * Transforme un enfant direct du conteneur en « slot » du contrat :
 * - un calque texte devient le slot sémantique `label` (son vrai nom Figma
 *   est gardé dans `figmaLayer` pour la traçabilité) ;
 * - un calque qui contient PLUSIEURS textes décrit ses enfants dans `children`,
 *   récursivement : une typographie unique y écraserait celle de la description
 *   par celle du titre ;
 * - un calque graphique (icône…) garde son nom dans `figmaLayer`, est marqué
 *   optionnel, et on relève son token de taille s'il existe. Une règle `@icons`
 *   peut ensuite le qualifier par son nom Figma, sans modifier son slot.
 */
async function extractChild(
  child: SceneNode,
  // Décidé par `slotNames.assignSlots` : le déduire ici en ferait une seconde
  // définition, libre de diverger de celle que les icônes citent.
  slot: string,
  parent: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances,
  // Nécessaire pour nommer les parts internes avec la MÊME règle que les slots
  // de premier niveau ; sans lui, une icône imbriquée perdrait son rôle.
  iconNames: ReadonlySet<string>,
): Promise<ChildStructure> {
  const dependencies = composedSlotDependencies(child, composed);
  const composedDependency = dependencies.length === 1 ? dependencies[0] : undefined;
  if (dependencies.length > 1) {
    warnings.push(
      `Layer « ${child.name} » : il contient ${dependencies.length} composants qui ont ` +
        `leur propre contrat (${dependencies.map((dependency) => dependency.component).join(', ')}). ` +
        `Le contrat n'en déclare qu'un par emplacement. Placez-les dans des layers distincts.`,
    );
  }
  const texts = composedDependency ? [] : textNodes(child, warnings, composed);
  // Le slot décrit ses parts dès qu'il porte plus d'un texte. La décision est
  // prise ici, avant toute écriture, parce qu'elle change le PROPRIÉTAIRE de la
  // typographie et des visibilités internes : les parts, et non plus le slot.
  const describesParts = texts.length > 1;

  const entry: ChildStructure = { slot, ...flexItemProperties(parent, child, warnings) };
  // Traçabilité : la couche sémantique et la déduplication renomment le slot,
  // le nom Figma d'origine ne doit pas disparaître pour autant.
  if (slot !== child.name) entry.figmaLayer = child.name;

  // Relevé sur TOUS les slots, pas seulement les calques graphiques : sans la
  // liaison d'un label masquable (bouton à icône seule), le contrat exposerait
  // une prop booléenne sans dire ce qu'elle montre ou cache. Un slot que l'on
  // peut masquer est optionnel par construction.
  const directVisibility = child.componentPropertyReferences?.visible;
  const dependencyVisibility = composedDependency?.visibilityProp;
  if (
    directVisibility
    && dependencyVisibility
    && normalizePropKey(directVisibility) !== dependencyVisibility
  ) {
    warnings.push(
      `Layer « ${child.name} » : sa visibilité et celle du composant ` +
        `« ${composedDependency.component} » qu'il contient dépendent de deux component ` +
        `properties différentes. Seule celle du layer est exportée. Utilisez la même pour ` +
        `les deux.`,
    );
  }
  // Le slot déjà masquable ne peut pas voir une visibilité plus profonde
  // devenir la sienne — ce serait en élargir la portée. Elle reste malgré tout
  // relevée : la taire perdrait en silence une prop que le composant doit lire.
  const slotIsOptional = Boolean(directVisibility || dependencyVisibility);
  const representedTargets = describesParts
    ? delegatedTextTargetIds(child, texts, composed)
    : new Set<string>();
  const nestedVisibility = nestedSlotVisibility(
    child,
    composed,
    slotIsOptional,
    representedTargets,
  );
  const visibilityReference = directVisibility
    ? normalizePropKey(directVisibility)
    : dependencyVisibility ?? nestedVisibility.visibilityProp;
  if (visibilityReference) {
    entry.visibilityProp = visibilityReference;
    entry.optional = true;
  }
  // Les cibles de l'arbre textuel ont été retirées par `representedTargets` :
  // leurs parts les portent. Une cible graphique voisine reste ici pour ne pas
  // disparaître sous prétexte que le slot contient aussi plusieurs textes.
  if (nestedVisibility.visibilityTargets) {
    entry.visibilityTargets = nestedVisibility.visibilityTargets;
  }

  if (composedDependency) {
    entry.figmaLayer = child.name;
    // Un composant unifié occupe la place d'un slot, mais rien de ce qu'il
    // porte ne se relève ici : sa taille et sa typographie appartiennent à son
    // contrat. Le nommer suffit à dire quoi rendre à cet emplacement.
    if (composed.has(child.id)) {
      entry.composes = composedDependency.component;
      return entry;
    }
    await describeComposedWrapper(
      entry,
      child,
      composedDependency,
      resolver,
      warnings,
      composed,
      iconNames,
    );
    return entry;
  }

  if (describesParts) {
    await extractTextChildren(
      child,
      texts,
      entry,
      resolver,
      warnings,
      composed,
      iconNames,
    );
  } else if (!texts[0]) {
    // Le nom du calque est gardé même quand il s'agit d'un placeholder d'icône.
    // Une règle `@icons` peut ensuite qualifier cette icône par son nom Figma.
    entry.figmaLayer = child.name;
    entry.optional = true;
  }

  // Relevé sur TOUS les slots dont ce contrat possède les dimensions, texte
  // compris : un calque de texte peut être figé comme une icône, et le taire
  // ferait dire à son absence « hug » alors que Figma impose une largeur.
  // Seule la dépendance composée en est exclue, plus haut : sa taille
  // appartient à son propre contrat.
  const size = await resolveSlotSize(child, resolver, warnings);
  if (size) entry.size = size;

  return entry;
}

/**
 * Signature déterministe de l'arbre textuel 4.3 et de son flux Flex 4.4.
 *
 * Elle ne contient aucun token : elle sert uniquement à comparer la structure
 * des variants avant de publier celle du variant de référence.
 */
export function textStructureSignature(
  layoutNode: SceneNode,
  iconNames: ReadonlySet<string> = new Set(),
  composed: ComposedInstances = new Map(),
): string {
  const branchSignature = (
    parent: SceneNode,
    node: SceneNode,
    slot: string,
  ): unknown | null => {
    const texts = textNodes(node, [], composed);
    if (texts.length === 0) return null;

    const common = {
      slot,
      figmaLayer: node.name,
      visibilityProp: node.componentPropertyReferences?.visible
        ? normalizePropKey(node.componentPropertyReferences.visible)
        : null,
      ...flexItemProperties(parent, node),
    };
    if (node.type === 'TEXT') return { ...common, type: 'text' };

    const branchIds = textBranchNodeIds(node, texts);
    const children = assignSlots(node, iconNames, [], composed)
      .filter(({ child }) => branchIds.has(child.id))
      .map(({ child, slot: childSlot }) => branchSignature(node, child, childSlot))
      .filter((child): child is NonNullable<typeof child> => Boolean(child));
    return {
      ...common,
      type: 'container',
      layout: autoLayoutDirection(node),
      ...flexContainerProperties(node),
      children,
    };
  };

  const trees = assignSlots(layoutNode, iconNames, [], composed).flatMap(({ child, slot }) => {
    if (textNodes(child, [], composed).length < 2) return [];
    const signature = branchSignature(layoutNode, child, slot);
    return signature ? [signature] : [];
  });
  return JSON.stringify(trees);
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
    sizing: containerSizing(component),
    ...flexContainerProperties(layoutNode),
    children: assignSlots(layoutNode, iconNames, [], composed).map(({ child, slot }) => ({
      slot,
      ...flexItemProperties(layoutNode, child),
      // Le cadre d'une dépendance publie désormais son propre flux : sans lui
      // dans la signature, deux variants qui centrent leur bouton différemment
      // passeraient pour identiques et le contrat publierait celui de la
      // référence.
      ...composedWrapperSignature(child, iconNames, composed),
      ...fixedSizeSignature(child, iconNames),
    })),
  });
}

/**
 * Flux du cadre qui enveloppe une dépendance, vide pour tout autre slot.
 *
 * `extractComposedBranch` descend de cadre en cadre jusqu'à l'instance : la
 * signature suit la même récursion, sinon deux variants dont seul le cadre
 * intérieur diffère passeraient pour identiques.
 */
function composedWrapperSignature(
  child: SceneNode,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
): object {
  if (composed.has(child.id) || composedSlotDependencies(child, composed).length === 0) {
    return {};
  }
  return {
    wrapper: {
      layout: autoLayoutDirection(child),
      ...flexContainerProperties(child),
      children: assignSlots(child, iconNames, [], composed)
        .filter(({ child: branch }) => composedSlotDependencies(branch, composed).length > 0)
        .map(({ child: branch, slot }) => ({
          slot,
          composes: composed.get(branch.id)?.component ?? null,
          ...flexItemProperties(child, branch),
          ...composedWrapperSignature(branch, iconNames, composed),
        })),
    },
  };
}

/**
 * Dimensions figées d'un slot, réduites aux liaisons que Figma porte.
 *
 * `structure.children[].size` ne décrit que le variant de référence : une
 * largeur figée qui change ailleurs dans la matrice n'a aucun endroit où vivre
 * dans le schéma. Sans elle dans la signature, le contrat publierait celle de
 * la référence en silence. Les calques d'icônes en sont exclus : `icons.*.size`
 * compare déjà leur taille sur toute la matrice, et deux messages diraient la
 * même chose.
 */
function fixedSizeSignature(node: SceneNode, iconNames: ReadonlySet<string>): object {
  if (isIconLayer(node, iconNames)) return {};

  const fixed = fixedDimensions(node);
  const boundVariableId = (field: string) =>
    firstVariableAlias(getBinding(node, field))?.id ?? null;
  return {
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
 * bien dans `variantTokens`, relevé sur le variant entier. Sans ce message, le
 * contrat annoncerait un rôle que plus aucun calque ne porte.
 */
function warnLayersOutsideLayoutNode(
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
 * `structure.layout` est obligatoire dans la forme du contrat, et `flex-row`
 * en est le repli. Une grille ou un frame sans auto layout seraient donc
 * décrits comme une rangée horizontale sans que rien ne le dise.
 */
function warnMissingDirection(layoutNode: SceneNode, warnings: string[]): void {
  if (autoLayoutDirection(layoutNode)) return;
  warnings.push(
    `Layer « ${layoutNode.name} » : il n'utilise pas d'auto layout horizontal ou vertical. Le ` +
      `contrat annonce malgré tout une disposition horizontale, la seule qu'il sache écrire, et ` +
      `le développeur placera donc ses layers autrement que dans Figma. Appliquez un auto ` +
      `layout horizontal ou vertical à ce layer, puis réexportez.`,
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
  // ses slots. C'est son comportement que le contrat publie : un wrapper décrit
  // comment il se place DANS le composant, pas comment le composant s'intègre.
  component: SceneNode = layoutNode,
): Promise<LayoutStructure> {
  warnLayersOutsideLayoutNode(component, layoutNode, warnings, composed);
  warnMissingDirection(layoutNode, warnings);
  const [gap, paddingX, paddingY, radius] = await Promise.all([
    resolveField(layoutNode, BINDING_PATTERNS.gap, 'gap', resolver, warnings),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingX,
      'horizontal padding',
      resolver,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingY,
      'vertical padding',
      resolver,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.radius,
      'corner radius',
      resolver,
      warnings,
    ),
  ]);

  const children = await Promise.all(
    assignSlots(layoutNode, iconNames, warnings, composed).map(({ child, slot }) =>
      extractChild(child, slot, layoutNode, resolver, warnings, composed, iconNames)),
  );

  return {
    layout: layoutDirection(layoutNode),
    sizing: containerSizing(component),
    ...flexContainerProperties(layoutNode, warnings),
    gap,
    padding: { x: paddingX, y: paddingY },
    radius,
    children,
  };
}
