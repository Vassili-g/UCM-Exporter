/**
 * Assemblage de la « structure » du contrat : layout de référence,
 * dimensions par taille, slots enfants et arbre des tokens de variantes.
 * C'est l'orchestrateur des extractions de la Partie 1.
 */
import { VariableNameResolver } from '../variables';
import type { TokenResolver } from '../variables';
import type { VariantMatrix, WrapperReference } from './componentTree';
import type { ComposedInstances } from './exportableNodes';
import { extractIconLayers } from './extractIconLayers';
import type { IconLayerSummary } from './extractIconLayers';
import { extractLayout } from './extractLayout';
import { extractSizeDimensions } from './extractSizes';
import { extractVariantTokens } from './extractVariantTokens';
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
  // Instances des composants unifiés embarqués, et le nom de chacun.
  composed: ComposedInstances = new Map(),
  // Calques désignés par les règles `@icons`, relevés avant les slots : c'est
  // leur inventaire qui donne son rôle `icon` au slot correspondant.
  iconNames: readonly string[] = [],
): Promise<{
  structure: ContractStructure;
  iconLayers: IconLayerSummary[];
  tokensUsed: string[];
  warnings: string[];
}> {
  // Le resolver met en cache les résolutions id → nom de token ;
  // tokenNames accumule tous les tokens rencontrés pour la liste `tokensUsed`.
  const tokenNames = new Set<string>();
  const warnings = [...matrixWarnings];
  const { variantTokens, variantStrokes } = await extractVariantTokens(
    matrix,
    resolver,
    tokenNames,
    warnings,
    composed,
  );

  // Les rôles se relisent sur les arbres terminés, pas pendant l'extraction :
  // un seul message par rôle fautif au lieu d'un par variante, et la
  // vérification reste une fonction pure, testable sans runtime Figma.
  warnings.push(...variantRoleWarnings(variantTokens, variantStrokes));

  // L'inventaire des icônes précède les slots : il couvre TOUTE la matrice,
  // là où le layout ne décrit que le variant de référence. C'est lui qui relève
  // les icônes que ce variant ne contient pas, et qui nomme leur slot.
  const iconLayers = await extractIconLayers(
    matrix,
    iconNames,
    resolver,
    tokenNames,
    warnings,
    composed,
  );
  const targetedLayers = new Set(iconLayers.map((layer) => layer.figmaLayer));

  // Le layout vit sur le wrapper imbriqué quand il existe, sinon directement
  // sur le composant. Un composant « plat » est donc géré sans blocage.
  const layoutRoot = wrapper?.instance ?? referenceComponent;
  const layout = layoutRoot
    ? await extractLayout(layoutRoot, resolver, tokenNames, warnings, composed, targetedLayers)
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
    ? await extractSizeDimensions(sizeAxisOwner, resolver, tokenNames, warnings, composed)
    : null;

  // Les dimensions ne vivent qu'à UN endroit : `sizes` les porte toutes dès
  // qu'un axe de tailles existe, sinon elles restent au niveau haut. Les
  // publier aux deux endroits reviendrait à recopier la taille de référence,
  // et une recopie finit toujours par diverger de son original.
  const { gap, padding, radius, ...slots } = layout;
  const dimensions = sizes ? { sizes } : { gap, padding, radius };

  const structure: ContractStructure = {
    ...slots,
    ...dimensions,
    variantAxes: matrix.axes,
    variantTokens,
    variantStrokes,
  };

  return {
    structure,
    iconLayers,
    tokensUsed: Array.from(tokenNames).sort(),
    warnings,
  };
}
