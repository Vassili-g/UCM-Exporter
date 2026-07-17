/**
 * Assemblage de la « structure » du contrat : layout de référence,
 * dimensions par taille, slots enfants et arbre des tokens de variantes.
 * C'est l'orchestrateur des extractions de la Partie 1.
 */
import { VariableNameResolver } from '../variables';
import type { VariantMatrix, WrapperReference } from './componentTree';
import { extractLayout } from './extractLayout';
import { extractSizeDimensions } from './extractSizes';
import { extractVariantTokens, getSlotTokens } from './extractVariantTokens';
import type { ContractStructure } from './types';

export async function extractStructure(
  matrix: VariantMatrix,
  matrixWarnings: string[],
  wrapper: WrapperReference | null,
  referenceComponent: ComponentNode | null,
): Promise<{ structure: ContractStructure; tokensUsed: string[]; warnings: string[] }> {
  // Le resolver met en cache les résolutions id → nom de token ;
  // tokenNames accumule tous les tokens rencontrés pour la liste `tokensUsed`.
  const resolver = new VariableNameResolver();
  const tokenNames = new Set<string>();
  const warnings = [...matrixWarnings];
  const { variantTokens, variantStrokes } = await extractVariantTokens(matrix, resolver, tokenNames, warnings);

  // Le layout vit sur le wrapper imbriqué quand il existe, sinon directement
  // sur le composant. Un composant « plat » est donc géré sans blocage.
  const layoutRoot = wrapper?.instance ?? referenceComponent;
  const layout = layoutRoot
    ? await extractLayout(layoutRoot, resolver, tokenNames, warnings)
    : { layout: 'flex-row' as const, gap: null, padding: { x: null, y: null }, radius: null, children: [] };

  if (!layoutRoot) {
    warnings.push('Aucun node de layout trouvé ; structure de dimensions vide.');
  }

  // Dimensions par taille : on les lit sur le component set qui porte l'axe
  // de tailles (le wrapper en général), pour couvrir big/medium/small — pas
  // seulement la taille instanciée par défaut.
  const sizes = wrapper?.componentSet
    ? await extractSizeDimensions(wrapper.componentSet, resolver, tokenNames, warnings)
    : null;

  // Le slot texte reprend la couleur `foreground` du variant de référence,
  // pour qu'un agent sache colorer le label sans chercher dans variantTokens.
  const referenceSlot = referenceComponent
    ? await getSlotTokens(referenceComponent, resolver)
    : { paints: {}, strokes: {} };
  const label = layout.children.find((child) => child.typography !== undefined);
  const foregroundToken = referenceSlot.paints.foreground;
  if (label && foregroundToken) label.color = foregroundToken;

  const structure: ContractStructure = {
    ...layout,
    variantAxes: matrix.axes,
    variantTokens,
    variantStrokes,
  };
  if (sizes) structure.sizes = sizes;

  return {
    structure,
    tokensUsed: Array.from(tokenNames).sort(),
    warnings,
  };
}
