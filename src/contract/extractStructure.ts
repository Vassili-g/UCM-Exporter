/**
 * Assemblage de la « structure » du contrat : layout de référence,
 * dimensions par taille, slots enfants et arbre des tokens de variantes.
 * C'est l'orchestrateur des extractions de la Partie 1.
 */
import { VariableNameResolver } from '../variables';
import type { TokenResolver } from '../variables';
import type { VariantMatrix, WrapperReference } from './componentTree';
import { extractLayout } from './extractLayout';
import { extractSizeDimensions } from './extractSizes';
import { extractVariantTokens, getSlotTokens } from './extractVariantTokens';
import { variantRoleWarnings } from './semantics';
import type { ContractStructure } from './types';

export async function extractStructure(
  matrix: VariantMatrix,
  matrixWarnings: string[],
  wrapper: WrapperReference | null,
  referenceComponent: ComponentNode | null,
  // Injectable pour que l'extraction soit vérifiable hors du runtime Figma ;
  // en production, l'appelant laisse le résolveur mis en cache par défaut.
  resolver: TokenResolver = new VariableNameResolver(),
): Promise<{ structure: ContractStructure; tokensUsed: string[]; warnings: string[] }> {
  // Le resolver met en cache les résolutions id → nom de token ;
  // tokenNames accumule tous les tokens rencontrés pour la liste `tokensUsed`.
  const tokenNames = new Set<string>();
  const warnings = [...matrixWarnings];
  const { variantTokens, variantStrokes } = await extractVariantTokens(matrix, resolver, tokenNames, warnings);

  // Les rôles se relisent sur les arbres terminés, pas pendant l'extraction :
  // un seul message par rôle fautif au lieu d'un par variante, et la
  // vérification reste une fonction pure, testable sans runtime Figma.
  warnings.push(...variantRoleWarnings(variantTokens, variantStrokes));

  // Le layout vit sur le wrapper imbriqué quand il existe, sinon directement
  // sur le composant. Un composant « plat » est donc géré sans blocage.
  const layoutRoot = wrapper?.instance ?? referenceComponent;
  const layout = layoutRoot
    ? await extractLayout(layoutRoot, resolver, tokenNames, warnings)
    : { layout: 'flex-row' as const, gap: null, padding: { x: null, y: null }, radius: null, children: [] };

  if (!layoutRoot) {
    warnings.push('Aucun node de layout trouvé ; structure de dimensions vide.');
  }

  // Dimensions par taille, pour couvrir big/medium/small et pas seulement la
  // taille instanciée par défaut. L'axe de tailles vit d'ordinaire sur le
  // wrapper de dimensions ; un composant PLAT le porte directement sur son
  // propre set, qui est le parent du variant de référence. On lit donc celui
  // qui existe — `findSizeAxis` rend null si aucun axe n'est un axe de
  // tailles, si bien qu'un composant à taille unique reste sans `sizes`.
  const ownSet = referenceComponent?.parent;
  const sizeAxisOwner = wrapper?.componentSet
    ?? (ownSet?.type === 'COMPONENT_SET' ? ownSet : null);
  const sizes = sizeAxisOwner
    ? await extractSizeDimensions(sizeAxisOwner, resolver, tokenNames, warnings)
    : null;

  // Le slot texte reprend la couleur `foreground` du variant de référence,
  // pour qu'un agent sache colorer le label sans chercher dans variantTokens.
  // Aucun tableau de warnings ici, volontairement : le variant de référence
  // est l'un des variants déjà parcourus par extractVariantTokens, donc ses
  // avertissements ont tous été collectés — les reprendre ne ferait que des
  // doublons.
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
