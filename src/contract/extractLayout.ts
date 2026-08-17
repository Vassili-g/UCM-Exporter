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
  fieldLabel,
  gapLabel,
  getBinding,
  resolveContainerSizing,
  resolveField,
  resolveRowGap,
  resolveSizeBounds,
  resolveSlotSize,
} from './nodeBindings';
import { normalizePropKey } from './parsers';
import { assignSlots, composedWrapperSlots, isIconLayer } from './slotNames';
import { composedSlotDependencies, nestedSlotVisibility } from './slotRelations';
import {
  containerSizing,
  fixedDimensions,
  flexContainerProperties,
  flexItemProperties,
  isLinearAutoLayout,
  SIZE_BOUND_FIELDS,
  sizeBoundFields,
} from './flexLayout';
import type {
  ChildStructure,
  ComposedDependency,
  ContractStructure,
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

/**
 * Nodes délégués aux enfants qu'un cadre de dépendances publie.
 *
 * Depuis que ce cadre décrit TOUS ses calques, chaque visibilité plus profonde
 * a un propriétaire : la branche qui la porte, à sa place exacte. Le cadre qui
 * n'a su placer aucune dépendance ne publie rien, en revanche, et garde donc
 * ses cibles — sans quoi la prop disparaîtrait des deux côtés à la fois.
 *
 * Vide pour tout autre slot : un slot ordinaire décrit ses cibles lui-même.
 */
function delegatedWrapperTargetIds(
  child: SceneNode,
  composed: ComposedInstances,
  iconNames: ReadonlySet<string>,
): Set<string> {
  const delegated = new Set<string>();
  if (composedSlotDependencies(child, composed).length === 0) return delegated;
  for (const branch of composedWrapperSlots(assignSlots(child, iconNames, [], composed), composed)) {
    for (const node of getAllNodes(branch.child, [], composed)) delegated.add(node.id);
  }
  return delegated;
}

/**
 * Écrit sur un slot tout ce que Figma dit de sa taille : sa dimension figée et
 * ses bornes.
 *
 * Les deux vont ensemble partout où un calque occupe une place dans le flux —
 * slot direct, part textuelle, cadre de dépendance — et répondent à deux
 * questions distinctes : quelle place il prend, jusqu'où cette place peut
 * aller. Les séparer en trois appels recopiés laisserait un jour l'un des trois
 * sans bornes.
 */
async function applySizing(
  entry: ChildStructure,
  node: SceneNode,
  resolver: TokenResolver,
  warnings: string[],
): Promise<void> {
  const [size, bounds] = await Promise.all([
    resolveSlotSize(node, resolver, warnings),
    resolveSizeBounds(node, resolver, warnings),
  ]);
  if (size) entry.size = size;
  if (bounds) entry.bounds = bounds;
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
  const gap = await resolveField(node, BINDING_PATTERNS.gap, gapLabel(node), resolver, warnings);
  if (gap) entry.gap = gap;
  const rowGap = await resolveRowGap(node, resolver, warnings);
  if (rowGap) entry.rowGap = rowGap;
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
  await applySizing(entry, node, resolver, warnings);

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

/** « le composant « A » » ou « les composants « A », « B » », pour un message. */
function nommerDependances(dependencies: readonly ComposedDependency[]): string {
  const noms = dependencies.map((dependency) => `« ${dependency.component} »`);
  return noms.length === 1 ? `le composant ${noms[0]}` : `les composants ${noms.join(', ')}`;
}

/**
 * Cadre qui enveloppe un ou plusieurs composants unifiés, décrit comme le
 * conteneur qu'il est.
 *
 * Ce calque appartient à CE contrat. Il publie donc son flux, puis ses enfants
 * dans `children`, exactement comme un slot à parts. Porter `composes` sur le
 * cadre lui-même le ferait passer pour le composant : son `alignSelf`
 * atterrirait sur un composant qui publie déjà son propre `structure.sizing`,
 * où une taille explicite neutralise l'étirement. Le cadre disparaîtrait avec
 * son alignement.
 *
 * Leur NOMBRE ne change pas la règle : un cadre qui range trois liens en publie
 * trois. Le contrat ne saurait sinon ni où ils vont, ni combien il en faut —
 * alors que `composes` continuerait de les déclarer, et le consommateur refuse
 * un contrat dont les deux champs ne décrivent pas la même séquence.
 *
 * Ce que le cadre range À CÔTÉ de ses dépendances lui appartient tout autant :
 * un tag, un texte, un dessin y sont des calques de ce contrat-ci, décrits par
 * la règle commune. Ne publier que les branches de dépendance les faisait
 * disparaître avec leur slot, leur typographie et leur visibilité, alors que
 * leurs couleurs entraient bien dans `variantTokens` — le contrat annonçait des
 * couleurs que plus aucun calque ne portait.
 */
async function describeComposedWrapper(
  entry: ChildStructure,
  wrapper: SceneNode,
  dependencies: readonly ComposedDependency[],
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances,
  iconNames: ReadonlySet<string>,
  placed: PlacedDependencies,
  // Vrai quand le slot de ce cadre publie déjà une visibilité. Les branches se
  // taisent alors, pour ne pas laisser croire à deux conditions distinctes.
  parentPublishesVisibility: boolean,
): Promise<void> {
  const assignments = assignSlots(wrapper, iconNames, warnings, composed);
  const published = composedWrapperSlots(assignments, composed);
  // Les messages s'adressent au designer : ils nomment ce qu'il voit, donc au
  // pluriel quand son calque range plusieurs composants.
  const plusieurs = dependencies.length > 1;

  // Les dépendances sont là — `composedSlotDependencies` les a trouvées — mais
  // aucune branche exportable n'y mène : elles sont rangées sous un calque
  // masqué. Publier un conteneur vide donnerait un contrat que le consommateur
  // refuse ; on revient à la forme du slot-instance quand une seule dépendance
  // est en jeu, et on dit dans tous les cas ce qui manquera. Un slot ne portant
  // qu'un `composes`, plusieurs dépendances ne peuvent pas s'y replier : elles
  // sortent alors du contrat, `composes` compris.
  if (published.length === 0) {
    if (dependencies.length === 1) {
      entry.composes = dependencies[0].component;
      placed.set(entry, dependencies[0]);
    }
    warnings.push(
      `Layer « ${wrapper.name} » : il enveloppe ${nommerDependances(dependencies)} mais aucun ` +
        `de ses calques exportables n'y mène. ${plusieurs
          ? 'Le contrat ne peut placer aucune de ces dépendances — un slot ne porte qu’un ' +
            'composant — et le développeur ne les rendra pas. Rendez visibles les calques qui ' +
            'portent les instances'
          : 'Le contrat nomme la dépendance sans la disposition de ce calque, et le développeur ' +
            'rendra le composant sans son cadre. Rendez visible le calque qui porte l’instance'}, ` +
        `puis réexportez.`,
    );
    return;
  }

  const direction = autoLayoutDirection(wrapper);
  if (direction) {
    entry.layout = direction;
    Object.assign(entry, flexContainerProperties(wrapper, warnings));
  } else {
    warnings.push(
      `Layer « ${wrapper.name} » : il enveloppe ${nommerDependances(dependencies)} mais ` +
        `n'utilise pas un auto layout horizontal ou vertical. Le contrat publie ` +
        `${plusieurs ? 'les dépendances' : 'la dépendance'} sans la disposition de ce calque, ` +
        `et le développeur ${plusieurs ? 'les rendra' : 'le rendra'} sans ce cadre. ` +
        `Appliquez un auto layout à ce layer, puis réexportez.`,
    );
  }

  // Le cadre est un élément du flux comme un autre : sa dimension figée et ses
  // bornes lui appartiennent. Seules celles de l'INSTANCE restent hors de ce
  // contrat.
  await applySizing(entry, wrapper, resolver, warnings);

  // `gap` décrit l'espace ENTRE des enfants : le cadre le publie dès qu'il en
  // range plusieurs. Un cadre à une seule dépendance n'espace rien — réclamer
  // une variable pour lui enverrait le designer relier une valeur qui ne se
  // voit pas. La réserve d'autrefois — « et qu'ils sont TOUS dans le contrat »
  // — est désormais vraie par construction : le cadre les décrit tous.
  if (published.length > 1) {
    const gap = await resolveField(
      wrapper,
      BINDING_PATTERNS.gap,
      gapLabel(wrapper),
      resolver,
      warnings,
    );
    if (gap) entry.gap = gap;
    const rowGap = await resolveRowGap(wrapper, resolver, warnings);
    if (rowGap) entry.rowGap = rowGap;
  }

  entry.children = await Promise.all(
    published.map(({ child, slot }) =>
      (composedSlotDependencies(child, composed).length > 0
        ? extractComposedBranch(
          wrapper,
          child,
          slot,
          resolver,
          warnings,
          composed,
          iconNames,
          placed,
          parentPublishesVisibility,
        )
        // Ce qui accompagne les dépendances est un calque de ce contrat, décrit
        // par la règle commune. La visibilité déjà publiée par le cadre lui est
        // passée pour qu'un même fait n'ait jamais deux propriétaires.
        : extractChild(
          child,
          slot,
          wrapper,
          resolver,
          warnings,
          composed,
          iconNames,
          placed,
          entry.visibilityProp,
        ))),
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
  placed: PlacedDependencies,
  parentPublishesVisibility: boolean,
): Promise<ChildStructure> {
  const entry: ChildStructure = { slot, ...flexItemProperties(parent, node, warnings) };
  entry.figmaLayer = node.name;

  // Le slot de premier niveau ne peut reprendre qu'UNE visibilité : celle d'une
  // dépendance unique. Dès qu'un cadre en range plusieurs, il n'en prend aucune
  // — la sienne masquerait les autres — et chaque branche porte donc la sienne.
  // Sans cela, un cadre à deux boutons masquables les rendrait tous les deux
  // inconditionnellement, alors que Figma les montre séparément.
  if (!parentPublishesVisibility) applyDirectVisibility(entry, node);

  const direct = composed.get(node.id);
  if (direct) {
    entry.composes = direct.component;
    placed.set(entry, direct);
    return entry;
  }

  const dependencies = composedSlotDependencies(node, composed);
  if (dependencies.length > 0) {
    await describeComposedWrapper(
      entry,
      node,
      dependencies,
      resolver,
      warnings,
      composed,
      iconNames,
      placed,
      parentPublishesVisibility || Boolean(entry.visibilityProp),
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
  // Les dépendances que l'arbre place réellement. `composes` s'en dérive : les
  // deux champs ne peuvent pas diverger s'ils n'ont qu'une source.
  placed: PlacedDependencies,
  // Visibilité déjà publiée par le slot qui contient celui-ci, quand un cadre
  // de dépendances décrit ses calques. La republier à l'identique donnerait
  // deux propriétaires au même fait ; une prop DIFFÉRENTE reste publiée, c'est
  // une seconde condition que le composant doit lire.
  parentVisibilityProp?: string,
): Promise<ChildStructure> {
  const dependencies = composedSlotDependencies(child, composed);
  const composedDependency = dependencies[0];
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
  // Le slot déjà masquable ne peut pas voir une visibilité plus profonde
  // devenir la sienne — ce serait en élargir la portée. Elle reste malgré tout
  // relevée : la taire perdrait en silence une prop que le composant doit lire.
  const slotIsOptional = Boolean(directVisibility || dependencyVisibility);
  // Les visibilités portées plus bas appartiennent aux structures qui les
  // décrivent : les parts d'un slot textuel, et désormais les enfants d'un
  // cadre de dépendances. Les laisser aussi dans `visibilityTargets` leur
  // donnerait deux propriétaires.
  const representedTargets = describesParts
    ? delegatedTextTargetIds(child, texts, composed)
    : delegatedWrapperTargetIds(child, composed, iconNames);
  const nestedVisibility = nestedSlotVisibility(
    child,
    composed,
    slotIsOptional,
    representedTargets,
  );
  const visibilityReference = directVisibility
    ? normalizePropKey(directVisibility)
    : dependencyVisibility ?? nestedVisibility.visibilityProp;
  if (visibilityReference && visibilityReference !== parentVisibilityProp) {
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
      placed.set(entry, composedDependency);
      return entry;
    }
    await describeComposedWrapper(
      entry,
      child,
      dependencies,
      resolver,
      warnings,
      composed,
      iconNames,
      placed,
      Boolean(entry.visibilityProp),
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
  await applySizing(entry, child, resolver, warnings);

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

  /**
   * Un slot publié, à quelque profondeur qu'il vive. Un cadre de dépendances
   * décrit désormais ses propres calques : ses parts textuelles se comparent
   * donc comme les autres, sans quoi une différence entre variants y resterait
   * muette. L'instance, elle, appartient à son contrat.
   */
  const slotSignature = (parent: SceneNode, child: SceneNode, slot: string): unknown[] => {
    if (composed.has(child.id)) return [];
    if (composedSlotDependencies(child, composed).length > 0) {
      return composedWrapperSlots(assignSlots(child, iconNames, [], composed), composed)
        .flatMap(({ child: branch, slot: branchSlot }) => slotSignature(child, branch, branchSlot));
    }
    if (textNodes(child, [], composed).length < 2) return [];
    const signature = branchSignature(parent, child, slot);
    return signature ? [signature] : [];
  };

  const trees = assignSlots(layoutNode, iconNames, [], composed)
    .flatMap(({ child, slot }) => slotSignature(layoutNode, child, slot));
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
    sizing: containerSizingSignature(component),
    ...flexContainerProperties(layoutNode),
    children: assignSlots(layoutNode, iconNames, [], composed).map(({ child, slot }) => ({
      slot,
      ...flexItemProperties(layoutNode, child),
      // Le cadre d'une dépendance publie désormais son propre flux : sans lui
      // dans la signature, deux variants qui centrent leur bouton différemment
      // passeraient pour identiques et le contrat publierait celui de la
      // référence.
      ...composedWrapperSignature(child, iconNames, composed),
      ...slotSizeSignature(child, iconNames),
    })),
  });
}

/**
 * Dimensionnement du composant, sous la forme que la signature sait comparer.
 *
 * `structure.sizing` ne décrit que le variant de référence, et publie désormais
 * un token quand un axe figé en cite un. La signature reste synchrone : elle
 * compare l'IDENTIFIANT de la variable, pas le nom résolu, comme
 * `fixedSizeSignature` le fait pour les slots. Sans lui, deux variants dont
 * seule la taille tokenisée diffère passeraient pour identiques et le contrat
 * publierait celle de la référence en silence.
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
 * qui retire son `max width` publierait sinon celui de la référence, et un
 * variant qui le relie ailleurs passerait pour identique. La comparaison porte
 * sur l'identifiant, comme partout dans les signatures, qui restent synchrones.
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
 * Flux du cadre qui enveloppe une dépendance, vide pour tout autre slot.
 *
 * `extractComposedBranch` descend de cadre en cadre jusqu'à l'instance : la
 * signature suit la même récursion, sinon deux variants dont seul le cadre
 * intérieur diffère passeraient pour identiques. Elle couvre TOUS les enfants
 * du cadre, comme l'arbre publié, et leur dimension figée avec eux — celle de
 * l'instance seule reste hors du contrat.
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
      children: composedWrapperSlots(assignSlots(child, iconNames, [], composed), composed)
        .map(({ child: branch, slot }) => ({
          slot,
          composes: composed.get(branch.id)?.component ?? null,
          ...flexItemProperties(child, branch),
          ...(composed.has(branch.id) ? {} : slotSizeSignature(branch, iconNames)),
          ...composedWrapperSignature(branch, iconNames, composed),
        })),
    },
  };
}

/**
 * Dimensions figées et bornes d'un slot, réduites aux liaisons que Figma porte.
 *
 * `structure.children[].size` et `.bounds` ne décrivent que le variant de
 * référence : une largeur figée ou une borne qui change ailleurs dans la
 * matrice n'a aucun endroit où vivre dans le schéma. Sans elles dans la
 * signature, le contrat publierait celles de la référence en silence.
 *
 * Les calques d'icônes sont exclus de la seule `size` : `icons.*.size` compare
 * déjà leur taille sur toute la matrice, et deux messages diraient la même
 * chose. Leurs bornes, elles, restent comparées — aucun champ d'`icons` ne les
 * porte, et l'exclusion les rendrait muettes.
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
 * Bornes posées sur un calque intermédiaire, entre le composant et ses slots.
 *
 * Le contrat n'a que deux propriétaires de bornes : le composant et un slot.
 * Un wrapper de layout n'est ni l'un ni l'autre — il prête son flux au
 * composant sans jamais apparaître comme un node — et le `max width` qu'il
 * porte n'a donc aucun endroit où vivre. Le publier sur le composant serait
 * pire que le taire : la borne du wrapper retient le CONTENU, pas le cadre.
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
  // Faux quand un axe de tailles existe : `sizes` porte alors gap, paddings et
  // radius, et `extractStructure` jette ceux-ci. Les relever quand même ferait
  // avertir le designer sur une valeur que le contrat ne publiera pas — il
  // relierait une variable sans que rien ne change, et le nom de calque cité
  // désigne le même layer dans tous les variants du set.
  publishDimensions = true,
  // Reçoit les dépendances que l'arbre place réellement. `composes` s'en dérive
  // au lieu d'être scanné à part : deux relevés indépendants de la même
  // information finiraient par se contredire, et le consommateur refuse un
  // contrat dont les deux champs ne décrivent pas la même séquence.
  placed: PlacedDependencies = new Map(),
): Promise<LayoutStructure> {
  warnLayersOutsideLayoutNode(component, layoutNode, warnings, composed);
  warnIntermediateBounds(component, layoutNode, warnings);
  warnMissingDirection(layoutNode, warnings);
  const [gap, rowGap, paddingX, paddingY, radius] = publishDimensions
    ? await Promise.all([
      resolveField(layoutNode, BINDING_PATTERNS.gap, gapLabel(layoutNode), resolver, warnings),
      resolveRowGap(layoutNode, resolver, warnings),
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
    ])
    : [null, null, null, null, null];

  // Lus sur le composant même quand `sizes` porte les dimensions : la taille du
  // composant n'est pas une dimension parmi d'autres, c'est la première
  // décision de qui l'intègre, et `structure.sizing` est toujours publié. Ses
  // bornes disent jusqu'où ce comportement va, et le taire ferait affirmer au
  // contrat un `stretch` que la maquette retient.
  const [sizing, bounds] = await Promise.all([
    resolveContainerSizing(component, resolver, warnings),
    resolveSizeBounds(component, resolver, warnings),
  ]);

  const children = await Promise.all(
    assignSlots(layoutNode, iconNames, warnings, composed).map(({ child, slot }) =>
      extractChild(child, slot, layoutNode, resolver, warnings, composed, iconNames, placed)),
  );

  return {
    layout: layoutDirection(layoutNode),
    sizing,
    ...(bounds ? { bounds } : {}),
    ...flexContainerProperties(layoutNode, warnings),
    gap,
    rowGap,
    padding: { x: paddingX, y: paddingY },
    radius,
    children,
  };
}
