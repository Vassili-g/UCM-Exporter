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
import { getAllNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { BINDING_PATTERNS, getBinding, resolveField } from './nodeBindings';
import { normalizePropKey } from './parsers';
import { semanticSlotName } from './semantics';
import type { ChildStructure, ContractStructure, TypographyTokens } from './types';

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
  const fields = [
    'itemSpacing',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'cornerRadius',
  ];
  const candidates = getAllNodes(root, warnings, composed).map((node) => ({
    node,
    score: fields.reduce((total, field) => total + (getBinding(node, field) ? 1 : 0), 0),
  }));
  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.score ? candidates[0].node : root;
}

/**
 * Renvoie le premier calque TEXTE d'un sous-arbre, ou null s'il n'y en a pas.
 * Le libellé d'un composant embarqué n'en est pas un : sans l'élagage, une
 * Alert emprunterait la typographie du bouton qu'elle contient.
 */
export function firstTextNode(
  node: SceneNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): TextNode | null {
  if (node.type === 'TEXT') return node;
  const text = getAllNodes(node, warnings, composed).find((child) => child.type === 'TEXT');
  return (text as TextNode | undefined) ?? null;
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
/**
 * Nom du composant unifié rendu à cet emplacement — que le slot SOIT
 * l'instance ou qu'il l'enveloppe. Une Alert range son bouton dans un calque
 * « Action » : sans ce second cas, le slot ne dirait pas quoi rendre, et un
 * conteneur sans texte serait pris pour un placeholder d'icône.
 */
function composedSlotName(
  child: SceneNode,
  composed: ComposedInstances,
): string | undefined {
  const direct = composed.get(child.id);
  if (direct) return direct;
  if (composed.size === 0 || !('findAll' in child)) return undefined;

  // Ordre du document : le plus englobant d'abord, donc la dépendance la plus
  // haute du slot — celles qu'elle contient relèvent de SON contrat.
  for (const node of child.findAll(() => true)) {
    const name = composed.get(node.id);
    if (name) return name;
  }
  return undefined;
}

async function extractChild(
  child: SceneNode,
  resolver: TokenResolver,
  tokenNames: Set<string>,
  warnings: string[],
  composed: ComposedInstances,
): Promise<ChildStructure> {
  const layerName = normalizeName(child.name).replace(/\./g, '-') || 'unnamed';
  const composedName = composedSlotName(child, composed);
  const textNode = composedName ? null : firstTextNode(child, warnings, composed);
  const semantic = semanticSlotName(Boolean(textNode));

  const entry: ChildStructure = { slot: semantic ?? layerName };
  if (semantic && semantic !== child.name) entry.figmaLayer = child.name;

  // Relevé sur TOUS les slots, pas seulement les calques graphiques : sans la
  // liaison d'un label masquable (bouton à icône seule), le contrat exposerait
  // une prop booléenne sans dire ce qu'elle montre ou cache. Un slot que l'on
  // peut masquer est optionnel par construction.
  const visibilityReference = child.componentPropertyReferences?.visible;
  if (visibilityReference) {
    entry.visibilityProp = normalizePropKey(visibilityReference);
    entry.optional = true;
  }

  // Un composant unifié occupe la place d'un slot, mais rien de ce qu'il porte
  // ne se relève ici : sa taille et sa typographie appartiennent à son contrat.
  // Le nommer suffit à dire au consommateur quoi rendre à cet emplacement.
  if (composedName) {
    entry.figmaLayer = child.name;
    entry.composes = composedName;
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
 * Garantit des noms de slots uniques : si deux calques donnent le même slot,
 * on suffixe les suivants (`label`, `label-2`, …).
 */
function dedupeSlots(children: ChildStructure[]): void {
  const seen = new Map<string, number>();
  for (const child of children) {
    const count = seen.get(child.slot) ?? 0;
    seen.set(child.slot, count + 1);
    if (count > 0) child.slot = `${child.slot}-${count + 1}`;
  }
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

  const exportableNodes = new Set(getAllNodes(layoutNode, warnings, composed));
  const directChildren = 'children' in layoutNode
    ? layoutNode.children.filter((child) => exportableNodes.has(child))
    : [];
  const children = await Promise.all(
    directChildren.map((child) => extractChild(child, resolver, tokenNames, warnings, composed)),
  );
  dedupeSlots(children);

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
