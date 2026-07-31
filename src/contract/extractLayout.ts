/**
 * Extraction du layout (dimensions + slots enfants) d'un composant.
 *
 * On part d'un « node racine » (le wrapper de dimensions s'il existe, sinon
 * le composant lui-même) et on relève les tokens liés : gap, paddings,
 * border-radius, typographie du texte, tailles d'icônes.
 */
import normalizeName from '../utils';
import { firstVariableAlias, toRef } from '../variables';
import type { TokenResolver } from '../variables';
import { firstTextNode, getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import {
  BINDING_PATTERNS,
  getBinding,
  hasCompleteBinding,
  resolveField,
} from './nodeBindings';
import { normalizePropKey } from './parsers';
import { assignSlots } from './slotNames';
import { composedSlotDependencies, nestedSlotVisibility } from './slotRelations';
import type {
  ChildStructure,
  ContractStructure,
  TypographyTokens,
} from './types';

/** La partie « layout » de la structure (sans les tokens de variantes). */
type LayoutStructure = Omit<
  ContractStructure,
  'sizes' | 'variantAxes' | 'variantTokens' | 'variantStrokes'
>;

/** Node de départ accepté : une instance (wrapper) ou un composant direct. */
export type LayoutRoot = InstanceNode | ComponentNode;

/**
 * Trouve le calque qui porte les dimensions. On compte, pour chaque calque
 * du sous-arbre, combien de propriétés de layout (gap, paddings, radius)
 * sont liées à une variable : celui qui en porte le plus est notre
 * « conteneur de layout ». À défaut, on retombe sur la racine.
 */
export function findLayoutNode(
  root: LayoutRoot,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): SceneNode {
  const dimensions = [
    BINDING_PATTERNS.gap,
    BINDING_PATTERNS.paddingX,
    BINDING_PATTERNS.paddingY,
    BINDING_PATTERNS.radius,
  ];
  const candidates = getAllNodes(root, warnings, composed).map((node) => ({
    node,
    score: dimensions.reduce(
      (total, alternatives) => total + (hasCompleteBinding(node, alternatives) ? 1 : 0),
      0,
    ),
  }));
  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.score ? candidates[0].node : root;
}

/**
 * Extrait la typographie d'un calque texte, en NOMS de tokens.
 * Deux cas, dans l'ordre :
 * 1. le calque utilise un style de texte Figma → on exporte son nom ;
 * 2. sinon on relève chaque variable liée (fontSize, fontWeight…).
 * Particularité Figma : fontWeight est parfois lié via le champ « fontStyle »,
 * d'où le double essai.
 */
async function extractTypography(
  textNode: TextNode,
  resolver: TokenResolver,
  tokenNames: Set<string>,
  warnings: string[],
): Promise<string | TypographyTokens | undefined> {
  if (typeof textNode.textStyleId === 'string' && textNode.textStyleId) {
    const style = await figma.getStyleByIdAsync(textNode.textStyleId).catch(() => null);
    if (style?.name) {
      // Un style de texte Figma n'est PAS un token : on renvoie son nom tel
      // quel (sans accolades) et on ne l'ajoute pas à `tokensUsed`, qui ne
      // liste que des références de tokens résolvables dans tokens.json.
      return normalizeName(style.name);
    }
  }

  const fields: Array<[keyof TypographyTokens, string[]]> = [
    ['fontSize', ['fontSize']],
    ['fontWeight', ['fontWeight', 'fontStyle']],
    ['lineHeight', ['lineHeight']],
    ['fontFamily', ['fontFamily']],
  ];
  const typography: TypographyTokens = {};

  for (const [contractField, figmaFields] of fields) {
    // On essaie chaque champ Figma possible jusqu'à trouver un token lié.
    let token: string | null = null;
    for (const figmaField of figmaFields) {
      token = await resolver.resolve(firstVariableAlias(getBinding(textNode, figmaField)), {
        nodeName: textNode.name,
        field: `${contractField} / ${figmaField}`,
      });
      if (token) break;
    }

    if (token) {
      const ref = toRef(token);
      typography[contractField] = ref;
      tokenNames.add(ref);
    } else {
      warnings.push(
        `Calque « ${textNode.name} » : ${contractField} sans variable liée (valeur brute ignorée).`,
      );
    }
  }

  return Object.keys(typography).length > 0 ? typography : undefined;
}

/**
 * Transforme un enfant direct du conteneur en « slot » du contrat :
 * - un calque texte devient le slot sémantique `label` (son vrai nom Figma
 *   est gardé dans `figmaLayer` pour la traçabilité) ;
 * - un calque graphique (icône…) garde son nom dans `figmaLayer`, est marqué
 *   optionnel, et on relève son token de taille s'il existe. Une règle `@icons`
 *   peut ensuite le qualifier par son nom Figma, sans modifier son slot.
 */
async function extractChild(
  child: SceneNode,
  // Décidé par `slotNames.assignSlots` : le déduire ici en ferait une seconde
  // définition, libre de diverger de celle que les icônes citent.
  slot: string,
  resolver: TokenResolver,
  tokenNames: Set<string>,
  warnings: string[],
  composed: ComposedInstances,
): Promise<ChildStructure> {
  const layerName = normalizeName(child.name).replace(/\./g, '-') || 'unnamed';
  const dependencies = composedSlotDependencies(child, composed);
  const composedDependency = dependencies.length === 1 ? dependencies[0] : undefined;
  if (dependencies.length > 1) {
    warnings.push(
      `Slot « ${child.name} » : ${dependencies.length} composants unifiés directs ` +
        `(${dependencies.map((dependency) => dependency.component).join(', ')}) ; ` +
        'le champ children[].composes ne peut en nommer qu’un.',
    );
  }
  const textNode = composedDependency ? null : firstTextNode(child, warnings, composed);

  const entry: ChildStructure = { slot };
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
      `Slot « ${child.name} » : sa visibilité et celle du composant ` +
        `« ${composedDependency.component} » dépendent de props différentes ; ` +
        'la visibilité du slot reste prioritaire.',
    );
  }
  // Le slot déjà masquable ne peut pas voir une visibilité plus profonde
  // devenir la sienne — ce serait en élargir la portée. Elle reste malgré tout
  // relevée : la taire perdrait en silence une prop que le composant doit lire.
  const slotIsOptional = Boolean(directVisibility || dependencyVisibility);
  const nestedVisibility = nestedSlotVisibility(child, composed, slotIsOptional);
  const visibilityReference = directVisibility
    ? normalizePropKey(directVisibility)
    : dependencyVisibility ?? nestedVisibility.visibilityProp;
  if (visibilityReference) {
    entry.visibilityProp = visibilityReference;
    entry.optional = true;
  }
  if (nestedVisibility.visibilityTargets) {
    entry.visibilityTargets = nestedVisibility.visibilityTargets;
  }

  // Un composant unifié occupe la place d'un slot, mais rien de ce qu'il porte
  // ne se relève ici : sa taille et sa typographie appartiennent à son contrat.
  // Le nommer suffit à dire au consommateur quoi rendre à cet emplacement.
  if (composedDependency) {
    entry.figmaLayer = child.name;
    entry.composes = composedDependency.component;
    return entry;
  }

  if (textNode) {
    const typography = await extractTypography(textNode, resolver, tokenNames, warnings);
    if (typography) entry.typography = typography;
  } else {
    // Le nom du calque est gardé même quand il s'agit d'un placeholder d'icône.
    // Une règle `@icons` peut ensuite qualifier cette icône par son nom Figma.
    entry.figmaLayer = child.name;
    entry.optional = true;
    const size = await resolveField(
      child,
      BINDING_PATTERNS.slotSize,
      `${layerName}-size`,
      resolver,
      tokenNames,
      warnings,
    );
    if (size) entry.size = size;
  }

  return entry;
}

/**
 * Point d'entrée du module : relève les dimensions du conteneur (gap,
 * paddings, radius) puis construit les slots enfants. Tout est exprimé en
 * noms de tokens ; une propriété non liée produit un warning, jamais une
 * valeur brute.
 */
export async function extractLayout(
  root: LayoutRoot,
  resolver: TokenResolver,
  tokenNames: Set<string>,
  warnings: string[],
  composed: ComposedInstances = new Map(),
  // Noms de calques désignés par les règles `@icons` : ils donnent au slot son
  // rôle `icon`, stable quand l'icône change d'un variant à l'autre.
  iconNames: ReadonlySet<string> = new Set(),
): Promise<LayoutStructure> {
  const layoutNode = findLayoutNode(root, warnings, composed);
  const [gap, paddingX, paddingY, radius] = await Promise.all([
    resolveField(layoutNode, BINDING_PATTERNS.gap, 'gap', resolver, tokenNames, warnings),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingX,
      'padding-x',
      resolver,
      tokenNames,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingY,
      'padding-y',
      resolver,
      tokenNames,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.radius,
      'border-radius',
      resolver,
      tokenNames,
      warnings,
    ),
  ]);

  const children = await Promise.all(
    assignSlots(layoutNode, iconNames, warnings, composed).map(({ child, slot }) =>
      extractChild(child, slot, resolver, tokenNames, warnings, composed)),
  );

  // layoutMode vient de l'auto-layout Figma ; on le traduit en vocabulaire CSS.
  const layoutMode = 'layoutMode' in layoutNode ? layoutNode.layoutMode : 'HORIZONTAL';
  return {
    layout: layoutMode === 'VERTICAL' ? 'flex-column' : 'flex-row',
    gap,
    padding: { x: paddingX, y: paddingY },
    radius,
    children,
  };
}
