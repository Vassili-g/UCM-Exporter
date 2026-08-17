/**
 * Extraction des dimensions PAR taille (big / medium / small…).
 *
 * Le contrat ne doit pas décrire une seule taille : si le composant expose un
 * axe de tailles (souvent porté par le wrapper de dimensions), chaque valeur
 * de cet axe a ses propres tokens géométriques de gap/padding/radius. On les
 * relève ici, taille par taille, pour que le contrat couvre tout. La
 * typographie est extraite depuis les styles de texte pour chaque variant.
 */
import type { TokenResolver } from '../variables';
import { getVariantAxes, getVariantValues } from './componentTree';
import type { ComposedInstances } from './exportableNodes';
import type { VariantLayoutNodes } from './layoutNodes';
import { BINDING_PATTERNS, gapLabel, resolveField, resolveRowGap } from './nodeBindings';
import { isGridAutoLayout } from './flexLayout';
import { semanticEnumName } from './semantics';
import type { SizeDimensions } from './types';

/**
 * Repère l'axe « taille » d'un component set : c'est l'axe dont TOUTES les
 * valeurs appartiennent au vocabulaire des tailles (big, medium, sm, xl…).
 * On réutilise la même détection que pour la prop `size` — aucune règle
 * spécifique à un composant. Renvoie null si aucun axe ne correspond.
 */
function findSizeAxis(componentSet: ComponentSetNode, components: ComponentNode[]): string | null {
  for (const axis of getVariantAxes(componentSet)) {
    const values = new Set<string>();
    for (const component of components) {
      const value = getVariantValues(component)[axis];
      if (value) values.add(value);
    }
    if (values.size > 0 && semanticEnumName(Array.from(values)) === 'size') return axis;
  }
  return null;
}

/** Relève les dimensions d'UN variant de taille (mêmes règles que le layout de référence). */
async function extractDimensions(
  component: ComponentNode,
  sizeValue: string,
  resolver: TokenResolver,
  warnings: string[],
  layoutNodes: VariantLayoutNodes,
): Promise<SizeDimensions> {
  // Ce module ne choisit pas le calque dont il lit les dimensions : il le
  // reçoit. `layoutNodes.ts` a élu pour tous les représentants de tailles, avec
  // la même règle que pour la matrice. Le repli n'existe que pour le typage.
  const layoutNode = layoutNodes.get(component) ?? component;
  // Le libellé passé à resolveField sert aux warnings : on précise la taille
  // pour qu'un token manquant soit localisable (ex. « gap (small) »).
  // Une grille espace ses enfants par ses deux gaps propres ; un auto layout
  // linéaire par son gap et, sous le wrap, celui de ses lignes. La même taille
  // se lit donc sur des champs différents selon la disposition du calque.
  const grille = isGridAutoLayout(layoutNode);
  const [gap, rowGap, columnGap, paddingX, paddingY, radius] = await Promise.all([
    grille ? null : resolveField(
      layoutNode,
      BINDING_PATTERNS.gap,
      `${gapLabel(layoutNode)} (variant « ${sizeValue} »)`,
      resolver,
      warnings,
    ),
    grille
      ? resolveField(layoutNode, BINDING_PATTERNS.gridRowGap, `row gap (variant « ${sizeValue} »)`, resolver, warnings)
      : resolveRowGap(layoutNode, resolver, warnings),
    grille
      ? resolveField(layoutNode, BINDING_PATTERNS.gridColumnGap, `column gap (variant « ${sizeValue} »)`, resolver, warnings)
      : null,
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingX,
      `horizontal padding (variant « ${sizeValue} »)`,
      resolver,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingY,
      `vertical padding (variant « ${sizeValue} »)`,
      resolver,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.radius,
      `corner radius (variant « ${sizeValue} »)`,
      resolver,
      warnings,
    ),
  ]);

  return { gap, rowGap, columnGap, padding: { x: paddingX, y: paddingY }, radius };
}

/**
 * Les variants dont le contrat lira les dimensions : un représentant par valeur
 * de l'axe de tailles. Renvoie null si le set n'a pas d'axe de tailles.
 *
 * Un représentant suffit : les dimensions ne varient pas selon les autres axes
 * (iconLeft/iconRight ne changent pas le padding).
 *
 * Exporté parce que l'élection du node de layout appartient à `layoutNodes.ts`,
 * qui doit savoir POUR QUI élire — et seulement pour eux : élire au-delà ferait
 * remonter des avertissements sur des variants que le contrat n'ouvre jamais.
 */
export function findSizeRepresentatives(
  componentSet: ComponentSetNode,
): Map<string, ComponentNode> | null {
  const components = componentSet.children.filter(
    (node): node is ComponentNode => node.type === 'COMPONENT',
  );
  const sizeAxis = findSizeAxis(componentSet, components);
  if (!sizeAxis) return null;

  const representatives = new Map<string, ComponentNode>();
  for (const component of components) {
    const value = getVariantValues(component)[sizeAxis];
    if (value && !representatives.has(value)) representatives.set(value, component);
  }
  return representatives;
}

/**
 * Point d'entrée : construit la carte `{ taille → dimensions }` à partir du
 * component set qui porte l'axe de tailles. Renvoie null si cet axe n'existe
 * pas (composant à taille unique) — dans ce cas le contrat garde seulement
 * les dimensions de référence.
 */
export async function extractSizeDimensions(
  componentSet: ComponentSetNode,
  resolver: TokenResolver,
  warnings: string[],
  // Nodes de layout élus par `layoutNodes.ts` pour ces représentants. Sans
  // valeur par défaut : un appelant qui l'oublierait ferait lire les dimensions
  // sur la racine du variant, et `sizes` décrirait un autre calque que
  // `structure.children`.
  layoutNodes: VariantLayoutNodes,
): Promise<Record<string, SizeDimensions> | null> {
  const representatives = findSizeRepresentatives(componentSet);
  if (!representatives) return null;

  const sizes: Record<string, SizeDimensions> = {};
  for (const [value, component] of representatives) {
    sizes[value] = await extractDimensions(component, value, resolver, warnings, layoutNodes);
  }
  return sizes;
}
