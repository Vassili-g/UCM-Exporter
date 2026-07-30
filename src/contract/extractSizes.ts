/**
 * Extraction des dimensions PAR taille (big / medium / small…).
 *
 * Le contrat ne doit pas décrire une seule taille : si le composant expose un
 * axe de tailles (souvent porté par le wrapper de dimensions), chaque valeur
 * de cet axe a ses propres tokens de gap/padding/radius/font-size. On les
 * relève ici, taille par taille, pour que le contrat couvre tout.
 */
import type { TokenResolver } from '../variables';
import { getVariantAxes, getVariantValues } from './componentTree';
import { findLayoutNode, firstTextNode } from './extractLayout';
import { BINDING_PATTERNS, resolveField } from './nodeBindings';
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
  tokenNames: Set<string>,
  warnings: string[],
): Promise<SizeDimensions> {
  const layoutNode = findLayoutNode(component, warnings);
  const textNode = firstTextNode(component, warnings);
  // Le libellé passé à resolveField sert aux warnings : on précise la taille
  // pour qu'un token manquant soit localisable (ex. « gap (small) »).
  const [gap, paddingX, paddingY, radius, fontSize] = await Promise.all([
    resolveField(
      layoutNode,
      BINDING_PATTERNS.gap,
      `gap (${sizeValue})`,
      resolver,
      tokenNames,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingX,
      `padding-x (${sizeValue})`,
      resolver,
      tokenNames,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.paddingY,
      `padding-y (${sizeValue})`,
      resolver,
      tokenNames,
      warnings,
    ),
    resolveField(
      layoutNode,
      BINDING_PATTERNS.radius,
      `border-radius (${sizeValue})`,
      resolver,
      tokenNames,
      warnings,
    ),
    textNode
      ? resolveField(
        textNode,
        BINDING_PATTERNS.fontSize,
        `font-size (${sizeValue})`,
        resolver,
        tokenNames,
        warnings,
      )
      : Promise.resolve(null),
  ]);

  const dimensions: SizeDimensions = { gap, padding: { x: paddingX, y: paddingY }, radius };
  if (fontSize) dimensions.fontSize = fontSize;
  return dimensions;
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
  tokenNames: Set<string>,
  warnings: string[],
): Promise<Record<string, SizeDimensions> | null> {
  const components = componentSet.children.filter(
    (node): node is ComponentNode => node.type === 'COMPONENT',
  );
  const sizeAxis = findSizeAxis(componentSet, components);
  if (!sizeAxis) return null;

  // Un représentant par valeur de taille suffit : les dimensions ne varient
  // pas selon les autres axes (iconLeft/iconRight ne changent pas le padding).
  const representatives = new Map<string, ComponentNode>();
  for (const component of components) {
    const value = getVariantValues(component)[sizeAxis];
    if (value && !representatives.has(value)) representatives.set(value, component);
  }

  const sizes: Record<string, SizeDimensions> = {};
  for (const [value, component] of representatives) {
    sizes[value] = await extractDimensions(component, value, resolver, tokenNames, warnings);
  }
  return sizes;
}
