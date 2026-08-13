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
import {
  extractLayout,
  findLayoutNode,
  flexLayoutSignature,
  textStructureSignature,
} from './extractLayout';
import { extractSizeDimensions } from './extractSizes';
import { extractVariantTokens } from './extractVariantTokens';
import { extractVariantTypography, textSlots } from './extractVariantTypography';
import { variantRoleWarnings } from './semantics';
import type { ContractStructure, SizeDimensions, TextStyleDefinition } from './types';

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
  textStyles: Record<string, TextStyleDefinition>;
  iconLayers: IconLayerSummary[];
  warnings: string[];
}> {
  const warnings = [...matrixWarnings];
  const { variantTokens, variantStrokes } = await extractVariantTokens(
    matrix,
    resolver,
    warnings,
    composed,
  );

  // Les rôles se relisent sur les arbres terminés, pas pendant l'extraction :
  // un seul message par rôle fautif au lieu d'un par variante, et la
  // vérification reste une fonction pure, testable sans runtime Figma.
  warnings.push(...variantRoleWarnings(variantTokens, variantStrokes));

  // Le layout vit sur le wrapper imbriqué quand il existe, sinon directement
  // sur le composant. Un composant « plat » est donc géré sans blocage.
  const layoutRoot = wrapper?.instance ?? referenceComponent;
  // Le node de layout du variant de référence est élu ICI, une fois, et servira
  // aux deux extractions. `findLayoutNode` élit au score : le relancer depuis
  // une autre racine — le variant plutôt que le wrapper — peut désigner un
  // autre node, et les slots des icônes cesseraient de décrire ceux du contrat.
  const referenceLayout = layoutRoot && referenceComponent
    ? { component: referenceComponent, layoutNode: findLayoutNode(layoutRoot, warnings, composed) }
    : null;

  // L'inventaire des icônes précède les slots : il couvre TOUTE la matrice,
  // là où le layout ne décrit que le variant de référence. C'est lui qui relève
  // les icônes que ce variant ne contient pas, et qui nomme leur slot.
  const iconLayers = await extractIconLayers(
    matrix,
    iconNames,
    resolver,
    warnings,
    composed,
    referenceLayout,
  );
  const targetedLayers = new Set(iconLayers.map((layer) => layer.figmaLayer));

  // `structure.children` décrit le variant de référence. Une récursion
  // textuelle différente ailleurs dans la matrice ne peut donc pas être
  // fusionnée silencieusement dans cet arbre unique.
  if (referenceLayout) {
    const referenceSignature = textStructureSignature(
      referenceLayout.layoutNode,
      targetedLayers,
      composed,
    );
    const divergentVariants = matrix.variants.filter(({ component }) => {
      const layoutNode = component === referenceLayout.component
        ? referenceLayout.layoutNode
        : findLayoutNode(component, [], composed);
      return textStructureSignature(layoutNode, targetedLayers, composed) !== referenceSignature;
    });
    if (divergentVariants.length > 0) {
      const examples = divergentVariants
        .slice(0, 3)
        .map(({ component }) => `« ${component.name} »`)
        .join(', ');
      const remaining = divergentVariants.length - 3;
      warnings.push(
        `Parties texte différentes sur ${divergentVariants.length} variant(s), ex. ${examples}` +
          `${remaining > 0 ? ` (+${remaining})` : ''} : l'export décrit le variant de ` +
          `référence « ${referenceLayout.component.name} ». L'ordre ou la disposition des autres ` +
          `variants ne sera pas représenté. Alignez leurs layers de texte dans Figma ; si la ` +
          `différence est intentionnelle, conservez-la et signalez cette limite du schéma.`,
      );
    }

    const referenceFlexSignature = flexLayoutSignature(
      referenceLayout.layoutNode,
      targetedLayers,
      composed,
      referenceLayout.component,
    );
    const flexDivergentVariants = matrix.variants.filter(({ component }) => {
      const layoutNode = component === referenceLayout.component
        ? referenceLayout.layoutNode
        : findLayoutNode(component, [], composed);
      return flexLayoutSignature(layoutNode, targetedLayers, composed, component)
        !== referenceFlexSignature;
    });
    if (flexDivergentVariants.length > 0) {
      const examples = flexDivergentVariants
        .slice(0, 3)
        .map(({ component }) => `« ${component.name} »`)
        .join(', ');
      const remaining = flexDivergentVariants.length - 3;
      warnings.push(
        `Auto layout différent sur ${flexDivergentVariants.length} variant(s), ex. ${examples}` +
          `${remaining > 0 ? ` (+${remaining})` : ''} : l'export décrit le variant de ` +
          `référence « ${referenceLayout.component.name} ». Son alignement ou le remplissage ` +
          `de ses layers ne représentera pas les autres variants. Alignez les auto layouts dans ` +
          `Figma ; si la différence est intentionnelle, conservez-la et signalez cette limite du schéma.`,
      );
    }
  }

  const layout = layoutRoot
    ? await extractLayout(
      layoutRoot,
      resolver,
      warnings,
      composed,
      targetedLayers,
      referenceComponent ?? layoutRoot,
    )
    // Sans composant à interroger, le contrat retient le comportement par
    // défaut plutôt que d'inventer un hug que rien ne montre.
    : {
      layout: 'flex-row' as const,
      sizing: { width: 'stretch' as const, height: 'stretch' as const },
      gap: null,
      padding: { x: null, y: null },
      radius: null,
      children: [],
    };

  if (!layoutRoot) {
    warnings.push(
      'Aucun auto layout frame trouvé dans le composant : ni gap, ni padding, ni corner ' +
        'radius ne sont exportés.',
    );
  }

  const referenceTextSlotPaths = new Set(
    referenceLayout
      ? textSlots(referenceLayout.layoutNode, targetedLayers, composed)
        .map(({ slotPath }) => JSON.stringify(slotPath))
      : [],
  );
  const typography = await extractVariantTypography(
    matrix,
    resolver,
    warnings,
    composed,
    targetedLayers,
    referenceTextSlotPaths,
  );

  // Dimensions par taille, pour couvrir big/medium/small et pas seulement la
  // taille instanciée par défaut. L'axe de tailles vit d'ordinaire sur le
  // wrapper de dimensions, mais rien ne l'y oblige : il peut rester sur le set
  // sélectionné pendant que le wrapper porte ses propres axes. On interroge
  // donc les deux propriétaires possibles et on garde le premier qui rend des
  // dimensions. Élire le propriétaire sur le TYPE du node ferait disparaître
  // `sizes` en silence dès que le wrapper n'a pas d'axe de tailles, alors que
  // `props.size` continuerait d'annoncer ses valeurs au consommateur.
  const ownSet = referenceComponent?.parent;
  const sizeAxisOwners = [
    wrapper?.componentSet,
    ownSet?.type === 'COMPONENT_SET' ? ownSet : null,
  ].filter((owner): owner is ComponentSetNode => Boolean(owner));

  let sizes: Record<string, SizeDimensions> | null = null;
  for (const owner of sizeAxisOwners) {
    // `extractSizeDimensions` rend null sans rien signaler quand le set n'a pas
    // d'axe de tailles : passer au suivant ne produit donc aucun bruit.
    sizes = await extractSizeDimensions(owner, resolver, warnings, composed);
    if (sizes) break;
  }

  // Les dimensions géométriques ne vivent qu'à UN endroit : `sizes` les porte
  // toutes dès qu'un axe de tailles existe, sinon elles restent au niveau haut.
  // La typographie a son propre catalogue et son arbre complet de variants.
  const { gap, padding, radius, ...slots } = layout;
  const dimensions = sizes ? { sizes } : { gap, padding, radius };

  const structure: ContractStructure = {
    ...slots,
    ...dimensions,
    variantAxes: matrix.axes,
    variantTokens,
    variantStrokes,
    variantTypography: typography.variantTypography,
  };

  return { structure, textStyles: typography.textStyles, iconLayers, warnings };
}
